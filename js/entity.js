import * as THREE from 'three';
import { CONFIG } from './config.js';
import { StateMachine, Timer, clamp, lerp, damp, dist2D, angleBetween, rotateTowards } from './utils.js';

const ENTITY_STATES = {
  IDLE: 'idle',
  PATROL: 'patrol',
  INVESTIGATE: 'investigate',
  CHASE: 'chase',
  SEARCH: 'search',
  ATTACK: 'attack',
  TELEPORT: 'teleport',
};

export class HollowOne {
  constructor(scene, world, audioManager) {
    this.scene = scene;
    this.world = world;
    this.audio = audioManager;
    this.active = false;
    this.visible = false;
    this.position = new THREE.Vector3(0, 0, -50);
    this.targetPosition = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.rotation = 0;
    this.currentSpeed = 0;
    this.targetSpeed = 0;
    this.act = 1;
    this.mesh = null;
    this.path = [];
    this.pathIndex = 0;
    this.lastKnownPlayerPos = new THREE.Vector3();
    this.investigationPoint = new THREE.Vector3();
    this.patrolPoints = [];
    this.patrolIndex = 0;
    this.footstepTimer = 0;
    this.boneCrackTimer = 0;
    this.whisperTimer = 0;
    this.teleportCooldown = new Timer(CONFIG.entity.teleportCooldown);
    this.loseSightTimer = new Timer(CONFIG.entity.loseSightTime);
    this.investigationTimer = new Timer(CONFIG.entity.investigationTime);
    this.searchTimer = new Timer(CONFIG.entity.searchTime);
    this.attackCooldown = new Timer(CONFIG.entity.attackCooldown);

    this._buildMesh();
    this._setupStateMachine();
    this._setupPatrolPoints();
  }

  _buildMesh() {
    this.mesh = new THREE.Group();

    const bodyGeo = new THREE.CylinderGeometry(0.15, 0.2, 2.2, 8);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x8a8a8a,
      roughness: 0.9,
      metalness: 0.05,
      transparent: true,
      opacity: 0.95,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.1;
    body.castShadow = true;
    this.mesh.add(body);

    const headGeo = new THREE.SphereGeometry(0.22, 12, 12);
    headGeo.scale(1, 1.3, 0.9);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0x9a9a9a,
      roughness: 0.85,
      metalness: 0.05,
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 2.45;
    head.castShadow = true;
    this.mesh.add(head);

    const faceGeo = new THREE.SphereGeometry(0.18, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const faceMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 1,
      metalness: 0,
      side: THREE.BackSide,
    });
    const face = new THREE.Mesh(faceGeo, faceMat);
    face.position.set(0, 2.45, 0.05);
    face.rotation.x = Math.PI;
    this.mesh.add(face);

    const armGeo = new THREE.CylinderGeometry(0.04, 0.06, 1.8, 6);
    const armMat = new THREE.MeshStandardMaterial({
      color: 0x7a7a7a,
      roughness: 0.9,
    });

    const leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.position.set(-0.3, 1.2, 0);
    leftArm.rotation.z = 0.15;
    leftArm.castShadow = true;
    this.mesh.add(leftArm);
    this.leftArm = leftArm;

    const rightArm = new THREE.Mesh(armGeo, armMat);
    rightArm.position.set(0.3, 1.2, 0);
    rightArm.rotation.z = -0.15;
    rightArm.castShadow = true;
    this.mesh.add(rightArm);
    this.rightArm = rightArm;

    const fingerGeo = new THREE.CylinderGeometry(0.01, 0.02, 0.35, 4);
    for (let side = -1; side <= 1; side += 2) {
      for (let f = 0; f < 5; f++) {
        const finger = new THREE.Mesh(fingerGeo, armMat);
        finger.position.set(side * 0.3 + (f - 2) * 0.025, 0.15, 0);
        finger.rotation.z = side * 0.1;
        (side === -1 ? leftArm : rightArm).add(finger);
      }
    }

    const legGeo = new THREE.CylinderGeometry(0.06, 0.08, 1.0, 6);
    const leftLeg = new THREE.Mesh(legGeo, armMat);
    leftLeg.position.set(-0.12, 0.5, 0);
    leftLeg.castShadow = true;
    this.mesh.add(leftLeg);
    this.leftLeg = leftLeg;

    const rightLeg = new THREE.Mesh(legGeo, armMat);
    rightLeg.position.set(0.12, 0.5, 0);
    rightLeg.castShadow = true;
    this.mesh.add(rightLeg);
    this.rightLeg = rightLeg;

    this.mesh.position.copy(this.position);
    this.mesh.visible = false;
    this.scene.add(this.mesh);
  }

  _setupStateMachine() {
    this.fsm = new StateMachine(ENTITY_STATES.IDLE, {
      [ENTITY_STATES.IDLE]: {
        onEnter: () => {
          this.targetSpeed = 0;
          this.mesh.visible = false;
          this.visible = false;
        },
        onUpdate: (dt) => {
          if (this.act >= 2) {
            this.fsm.changeState(ENTITY_STATES.PATROL);
          }
        },
      },
      [ENTITY_STATES.PATROL]: {
        onEnter: () => {
          this.targetSpeed = CONFIG.entity.walkSpeed[`act${this.act}`] || 2;
          this.mesh.visible = true;
          this.visible = true;
          this._setNextPatrolPoint();
        },
        onUpdate: (dt) => {
          this._followPath(dt);
          if (this._canSeePlayer() || this._canHearPlayer()) {
            this.fsm.changeState(ENTITY_STATES.CHASE);
            return;
          }
          if (this._reachedWaypoint()) {
            this._setNextPatrolPoint();
          }
        },
      },
      [ENTITY_STATES.INVESTIGATE]: {
        onEnter: (data) => {
          this.investigationPoint.copy(data.point || this.lastKnownPlayerPos);
          this.targetSpeed = CONFIG.entity.walkSpeed[`act${this.act}`] || 2;
          this.investigationTimer.start(CONFIG.entity.investigationTime);
          this.path = [];
        },
        onUpdate: (dt) => {
          if (this._canSeePlayer()) {
            this.fsm.changeState(ENTITY_STATES.CHASE);
            return;
          }
          const dist = dist2D(this.position, this.investigationPoint);
          if (dist > 1.5) {
            this._moveTowards(this.investigationPoint, dt);
          } else {
            this.investigationTimer.update(dt);
            if (this.investigationTimer.isDone) {
              this.fsm.changeState(ENTITY_STATES.PATROL);
            }
          }
        },
      },
      [ENTITY_STATES.CHASE]: {
        onEnter: () => {
          this.targetSpeed = CONFIG.entity.runSpeed[`act${this.act}`] || 4;
          this.mesh.visible = true;
          this.visible = true;
          this.audio.setMusicState('chase');
        },
        onExit: () => {
          this.audio.setMusicState('calm');
        },
        onUpdate: (dt) => {
          this.lastKnownPlayerPos.copy(this._getPlayerPos());

          if (this._canSeePlayer()) {
            this.loseSightTimer.start(CONFIG.entity.loseSightTime);
            this._moveTowards(this._getPlayerPos(), dt);
          } else {
            this.loseSightTimer.update(dt);
            if (this.loseSightTimer.isDone) {
              this.fsm.changeState(ENTITY_STATES.SEARCH);
              return;
            }
            this._moveTowards(this.lastKnownPlayerPos, dt);
          }

          const dist = dist2D(this.position, this._getPlayerPos());
          if (dist < CONFIG.entity.attackRange) {
            this.fsm.changeState(ENTITY_STATES.ATTACK);
          }
        },
      },
      [ENTITY_STATES.SEARCH]: {
        onEnter: () => {
          this.targetSpeed = CONFIG.entity.walkSpeed[`act${this.act}`] || 2;
          this.searchTimer.start(CONFIG.entity.searchTime);
        },
        onUpdate: (dt) => {
          if (this._canSeePlayer() || this._canHearPlayer()) {
            this.fsm.changeState(ENTITY_STATES.CHASE);
            return;
          }
          this.searchTimer.update(dt);
          if (this.searchTimer.isDone) {
            this.fsm.changeState(ENTITY_STATES.PATROL);
          } else {
            const searchRadius = 5;
            const angle = Date.now() * 0.001;
            const searchPoint = new THREE.Vector3(
              this.lastKnownPlayerPos.x + Math.cos(angle) * searchRadius,
              this.lastKnownPlayerPos.y,
              this.lastKnownPlayerPos.z + Math.sin(angle) * searchRadius
            );
            this._moveTowards(searchPoint, dt);
          }
        },
      },
      [ENTITY_STATES.ATTACK]: {
        onEnter: () => {
          this.targetSpeed = 0;
          this.attackCooldown.start(CONFIG.entity.attackCooldown);
        },
        onUpdate: (dt) => {
          this.attackCooldown.update(dt);
          if (this.attackCooldown.isDone) {
            this.fsm.changeState(ENTITY_STATES.CHASE);
          }
        },
      },
      [ENTITY_STATES.TELEPORT]: {
        onEnter: (data) => {
          this.mesh.visible = false;
          this.visible = false;
          this.position.copy(data.target);
          this.mesh.position.copy(this.position);
          setTimeout(() => {
            this.mesh.visible = true;
            this.visible = true;
            this.fsm.changeState(ENTITY_STATES.CHASE);
          }, 500);
        },
      },
    });
  }

  _setupPatrolPoints() {
    this.patrolPoints = [];
    for (const room of this.world.rooms) {
      if (room.isSafe) continue;
      this.patrolPoints.push(room.center.clone());
    }
  }

  _setNextPatrolPoint() {
    if (this.patrolPoints.length === 0) return;
    this.patrolIndex = (this.patrolIndex + 1) % this.patrolPoints.length;
    this.targetPosition.copy(this.patrolPoints[this.patrolIndex]);
    this.path = [];
    this.pathIndex = 0;
  }

  _followPath(dt) {
    if (this.path.length === 0) {
      this._moveTowards(this.targetPosition, dt);
    } else {
      if (this.pathIndex < this.path.length) {
        const waypoint = this.path[this.pathIndex];
        const worldPos = new THREE.Vector3(waypoint.x, this.position.y, waypoint.z);
        this._moveTowards(worldPos, dt);
        if (dist2D(this.position, worldPos) < CONFIG.entity.waypointReachedDist) {
          this.pathIndex++;
        }
      } else {
        this.path = [];
      }
    }
  }

  _moveTowards(target, dt) {
    this.currentSpeed = damp(this.currentSpeed, this.targetSpeed, CONFIG.entity.speedRampUp * 5, dt);

    const dir = new THREE.Vector3(target.x - this.position.x, 0, target.z - this.position.z);
    const dist = dir.length();
    if (dist < 0.1) return;

    dir.normalize();
    const targetAngle = Math.atan2(dir.x, dir.z);
    this.rotation = rotateTowards(this.rotation, targetAngle, 3 * dt);

    const moveX = Math.sin(this.rotation) * this.currentSpeed * dt;
    const moveZ = Math.cos(this.rotation) * this.currentSpeed * dt;

    this.position.x += moveX;
    this.position.z += moveZ;

    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.rotation;

    this._animateWalk(dt);
  }

  _animateWalk(dt) {
    const walkCycle = Date.now() * 0.005 * (this.currentSpeed / 3);
    const legSwing = Math.sin(walkCycle) * 0.3;
    const armSwing = Math.sin(walkCycle) * 0.2;

    this.leftLeg.rotation.x = legSwing;
    this.rightLeg.rotation.x = -legSwing;
    this.leftArm.rotation.x = -armSwing;
    this.rightArm.rotation.x = armSwing;

    const headTilt = Math.sin(walkCycle * 0.5) * 0.1;
    this.mesh.children[1].rotation.z = headTilt;
  }

  _canSeePlayer() {
    const playerPos = this._getPlayerPos();
    const dist = dist2D(this.position, playerPos);
    if (dist > CONFIG.entity.visionRange) return false;

    const dirToPlayer = new THREE.Vector3(playerPos.x - this.position.x, 0, playerPos.z - this.position.z).normalize();
    const forward = new THREE.Vector3(Math.sin(this.rotation), 0, Math.cos(this.rotation));
    const angle = forward.angleTo(dirToPlayer);

    return angle < CONFIG.entity.visionConeAngle / 2;
  }

  _canHearPlayer() {
    const playerPos = this._getPlayerPos();
    const dist = dist2D(this.position, playerPos);
    return dist < CONFIG.entity.hearingRange;
  }

  _getPlayerPos() {
    return this.world._playerRef ? this.world._playerRef.getPosition() : new THREE.Vector3();
  }

  _reachedWaypoint() {
    return dist2D(this.position, this.targetPosition) < CONFIG.entity.waypointReachedDist;
  }

  activate(act = 2) {
    this.act = act;
    this.active = true;
    if (act >= 2) {
      this.fsm.changeState(ENTITY_STATES.PATROL);
    }
  }

  setPlayerRef(player) {
    this.world._playerRef = player;
  }

  update(dt, playerPos) {
    if (!this.active) return;

    this.teleportCooldown.update(dt);
    this.fsm.update(dt, { playerPos });

    this.footstepTimer += dt;
    if (this.footstepTimer > 0.6 && this.currentSpeed > 0.5) {
      this.footstepTimer = 0;
      this.audio.playEntityFootstep(this.position);
    }

    this.boneCrackTimer += dt;
    if (this.boneCrackTimer > CONFIG.entity.boneCrackInterval) {
      this.boneCrackTimer = 0;
      if (dist2D(this.position, playerPos) < CONFIG.entity.whisperRange) {
        this.audio.playWhisper(this.position);
      }
    }

    if (this.fsm.currentState === ENTITY_STATES.ATTACK) {
      return 'attack';
    }

    return null;
  }

  getDistanceToPlayer(playerPos) {
    return dist2D(this.position, playerPos);
  }

  isNearPlayer(playerPos, range = 8) {
    return dist2D(this.position, playerPos) < range;
  }

  isChasing() {
    return this.fsm.currentState === ENTITY_STATES.CHASE;
  }

  teleportTo(position) {
    if (this.teleportCooldown.isDone) {
      this.fsm.changeState(ENTITY_STATES.TELEPORT, { target: position });
      this.teleportCooldown.start(CONFIG.entity.teleportCooldown);
    }
  }

  teleportNearPlayer(playerPos) {
    const angle = Math.random() * Math.PI * 2;
    const dist = CONFIG.jumpscare.entityTeleportDist;
    const teleportPos = new THREE.Vector3(
      playerPos.x + Math.cos(angle) * dist,
      playerPos.y,
      playerPos.z + Math.sin(angle) * dist
    );
    this.teleportTo(teleportPos);
  }

  setAct(act) {
    this.act = act;
  }

  getPosition() {
    return this.position.clone();
  }

  dispose() {
    this.scene.remove(this.mesh);
    this.mesh.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });
  }
}
