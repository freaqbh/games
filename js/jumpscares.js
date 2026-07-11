import * as THREE from 'three';
import { CONFIG } from './config.js';
import { Timer, clamp } from './utils.js';

export class JumpscareManager {
  constructor(scene, camera, audioManager, postProcessor, entity) {
    this.scene = scene;
    this.camera = camera;
    this.audio = audioManager;
    this.post = postProcessor;
    this.entity = entity;
    this.active = false;
    this.cooldown = new Timer(8);
    this.scareQueue = [];
    this.currentScare = null;
    this.scareTimer = new Timer();
    this.triggeredScares = new Set();
    this.flashOverlay = document.getElementById('jumpscareFlash');
    this.damageOverlay = document.getElementById('damageOverlay');
    this.faceMesh = null;
    this.faceVisible = false;
    this.faceTimer = new Timer();
    this.playerRef = null;
    this.nearEntityScareTimer = 0;
    this.lastScareTime = 0;
  }

  setPlayerRef(player) {
    this.playerRef = player;
  }

  queueScare(scareId, options = {}) {
    if (!CONFIG.jumpscare.enabled) return;
    if (this.triggeredScares.has(scareId) && !options.repeatable) return;
    this.scareQueue.push({ id: scareId, options, priority: options.priority || 0 });
    this.scareQueue.sort((a, b) => b.priority - a.priority);
  }

  update(dt, playerPos) {
    this.cooldown.update(dt);

    if (this.currentScare) {
      this._updateCurrentScare(dt);
      return;
    }

    if (this.faceVisible) {
      this.faceTimer.update(dt);
      if (this.faceTimer.isDone) {
        this._hideFace();
      }
    }

    if (this.scareQueue.length > 0 && this.cooldown.isDone) {
      const scare = this.scareQueue.shift();
      this._executeScare(scare);
    }

    if (this.entity && this.entity.active && this.entity.isNearPlayer(playerPos, 6)) {
      this.nearEntityScareTimer += dt;
      if (this.nearEntityScareTimer > 5 && this.cooldown.isDone && !this.entity.isChasing()) {
        this.nearEntityScareTimer = 0;
        this._proceduralNearScare(playerPos);
      }
    } else {
      this.nearEntityScareTimer = 0;
    }
  }

  _executeScare(scare) {
    this.currentScare = scare;
    this.triggeredScares.add(scare.id);
    this.cooldown.start(10);
    this.active = true;

    switch (scare.id) {
      case 'cabinet_burst': this._scareCabinetBurst(scare.options); break;
      case 'mirror_reflection': this._scareMirrorReflection(scare.options); break;
      case 'lights_out_face': this._scareLightsOutFace(scare.options); break;
      case 'door_slam_whisper': this._scareDoorSlamWhisper(scare.options); break;
      case 'under_bed_grab': this._scareUnderBedGrab(scare.options); break;
      case 'elevator_entity': this._scareElevatorEntity(scare.options); break;
      case 'painting_scream': this._scarePaintingScream(scare.options); break;
      case 'vent_entity': this._scareVentEntity(scare.options); break;
      case 'flashlight_die': this._scareFlashlightDie(scare.options); break;
      case 'window_morph': this._scareWindowMorph(scare.options); break;
      case 'corner_appear': this._scareCornerAppear(scare.options); break;
      case 'behind_you': this._scareBehindYou(scare.options); break;
      case 'ceiling_drop': this._scareCeilingDrop(scare.options); break;
      case 'hallway_rush': this._scareHallwayRush(scare.options); break;
      case 'ritual_frenzy': this._scareRitualFrenzy(scare.options); break;
      default: this._scareGeneric(scare.options); break;
    }
  }

  _scareCabinetBurst(options) {
    this.audio.playDoorCreak();
    this.post.shake(0.01, 0.3);
    this.scareTimer.start(2);
    this.scareTimer.onComplete = () => this._endScare();
  }

  _scareMirrorReflection(options) {
    this._showFace(1.5);
    this.audio.playJumpscareStinger();
    this.post.shake(CONFIG.jumpscare.screenShakeIntensity, CONFIG.jumpscare.screenShakeDuration);
    this._flashScreen();
    if (this.playerRef) this.playerRef.damageSanity(CONFIG.sanity.drainOnJumpscare);
    this.scareTimer.start(2);
    this.scareTimer.onComplete = () => this._endScare();
  }

  _scareLightsOutFace(options) {
    if (this.playerRef) {
      this.playerRef.flashlightOn = false;
      this.playerRef.flashlight.visible = false;
    }
    setTimeout(() => {
      this._showFace(0.8);
      this.audio.playJumpscareStinger();
      this.post.shake(CONFIG.jumpscare.screenShakeIntensity * 1.5, CONFIG.jumpscare.screenShakeDuration);
      this._flashScreen();
      if (this.playerRef) {
        this.playerRef.damageSanity(CONFIG.sanity.drainOnJumpscare * 1.5);
        this.playerRef.flashlightOn = true;
        this.playerRef.flashlight.visible = true;
      }
    }, 1500);
    this.scareTimer.start(3);
    this.scareTimer.onComplete = () => this._endScare();
  }

  _scareDoorSlamWhisper(options) {
    this.audio.playDoorCreak();
    this.post.shake(0.02, 0.4);
    setTimeout(() => {
      const pos = this.camera.position.clone();
      pos.x += (Math.random() - 0.5) * 4;
      pos.z += (Math.random() - 0.5) * 4;
      this.audio.playWhisper(pos, 'get out');
    }, 800);
    if (this.playerRef) this.playerRef.damageSanity(CONFIG.sanity.drainOnScare);
    this.scareTimer.start(2.5);
    this.scareTimer.onComplete = () => this._endScare();
  }

  _scareUnderBedGrab(options) {
    this.audio.playJumpscareStinger();
    this.post.shake(CONFIG.jumpscare.screenShakeIntensity, CONFIG.jumpscare.screenShakeDuration);
    this._flashScreen();
    if (this.playerRef) this.playerRef.damageSanity(CONFIG.sanity.drainOnJumpscare);
    this.scareTimer.start(2);
    this.scareTimer.onComplete = () => this._endScare();
  }

  _scareElevatorEntity(options) {
    this._showFace(1.2);
    this.audio.playJumpscareStinger();
    this.post.shake(CONFIG.jumpscare.screenShakeIntensity * 1.2, CONFIG.jumpscare.screenShakeDuration);
    this._flashScreen();
    if (this.playerRef) this.playerRef.damageSanity(CONFIG.sanity.drainOnJumpscare);
    this.scareTimer.start(2.5);
    this.scareTimer.onComplete = () => this._endScare();
  }

  _scarePaintingScream(options) {
    this.audio.playJumpscareStinger();
    this.post.shake(CONFIG.jumpscare.screenShakeIntensity, CONFIG.jumpscare.screenShakeDuration);
    this._flashScreen();
    if (this.playerRef) this.playerRef.damageSanity(CONFIG.sanity.drainOnScare);
    this.scareTimer.start(2);
    this.scareTimer.onComplete = () => this._endScare();
  }

  _scareVentEntity(options) {
    this._showFace(1.0);
    this.audio.playJumpscareStinger();
    this.post.shake(CONFIG.jumpscare.screenShakeIntensity * 1.5, CONFIG.jumpscare.screenShakeDuration);
    this._flashScreen();
    if (this.playerRef) this.playerRef.damageSanity(CONFIG.sanity.drainOnJumpscare);
    this.scareTimer.start(2);
    this.scareTimer.onComplete = () => this._endScare();
  }

  _scareFlashlightDie(options) {
    if (this.playerRef) {
      this.playerRef.flashlightOn = false;
      this.playerRef.flashlight.visible = false;
    }
    setTimeout(() => {
      const entityPos = this.entity ? this.entity.getPosition() : this.camera.position.clone();
      this.audio.playEntityBreathing(entityPos);
    }, 1000);
    setTimeout(() => {
      this._showFace(0.6);
      this.audio.playJumpscareStinger();
      this.post.shake(CONFIG.jumpscare.screenShakeIntensity, CONFIG.jumpscare.screenShakeDuration);
      this._flashScreen();
      if (this.playerRef) {
        this.playerRef.damageSanity(CONFIG.sanity.drainOnJumpscare);
        this.playerRef.flashlightOn = true;
        this.playerRef.flashlight.visible = true;
      }
    }, 2500);
    this.scareTimer.start(3.5);
    this.scareTimer.onComplete = () => this._endScare();
  }

  _scareWindowMorph(options) {
    this.post.shake(0.01, 0.5);
    if (this.playerRef) this.playerRef.damageSanity(CONFIG.sanity.drainOnScare);
    this.scareTimer.start(2);
    this.scareTimer.onComplete = () => this._endScare();
  }

  _scareCornerAppear(options) {
    if (this.entity) {
      this.entity.teleportNearPlayer(this.camera.position);
    }
    this.audio.playEntityGrowl(this.camera.position);
    this.post.shake(0.015, 0.4);
    if (this.playerRef) this.playerRef.damageSanity(CONFIG.sanity.drainOnScare);
    this.scareTimer.start(2);
    this.scareTimer.onComplete = () => this._endScare();
  }

  _scareBehindYou(options) {
    this.audio.playEntityBreathing(this.camera.position);
    setTimeout(() => {
      this._showFace(0.5);
      this.audio.playJumpscareStinger();
      this.post.shake(CONFIG.jumpscare.screenShakeIntensity * 2, CONFIG.jumpscare.screenShakeDuration);
      this._flashScreen();
      if (this.playerRef) this.playerRef.damageSanity(CONFIG.sanity.drainOnJumpscare * 1.5);
    }, 2000);
    this.scareTimer.start(3);
    this.scareTimer.onComplete = () => this._endScare();
  }

  _scareCeilingDrop(options) {
    this.audio.playJumpscareStinger();
    this.post.shake(CONFIG.jumpscare.screenShakeIntensity * 2, CONFIG.jumpscare.screenShakeDuration * 1.5);
    this._flashScreen();
    this._showFace(1.0);
    if (this.playerRef) this.playerRef.damageSanity(CONFIG.sanity.drainOnJumpscare * 1.5);
    this.scareTimer.start(2.5);
    this.scareTimer.onComplete = () => this._endScare();
  }

  _scareHallwayRush(options) {
    if (this.entity) {
      this.entity.activate(4);
    }
    this.audio.setMusicState('chase');
    this.audio.playJumpscareStinger();
    this.post.shake(CONFIG.jumpscare.screenShakeIntensity, CONFIG.jumpscare.screenShakeDuration);
    this._flashScreen();
    if (this.playerRef) this.playerRef.damageSanity(CONFIG.sanity.drainOnJumpscare);
    this.scareTimer.start(2);
    this.scareTimer.onComplete = () => this._endScare();
  }

  _scareRitualFrenzy(options) {
    const scareSequence = ['corner_appear', 'lights_out_face', 'behind_you', 'ceiling_drop'];
    let delay = 0;
    for (const scareId of scareSequence) {
      setTimeout(() => {
        this.queueScare(scareId, { repeatable: true, priority: 10 });
      }, delay);
      delay += 3000;
    }
    this.scareTimer.start(1);
    this.scareTimer.onComplete = () => this._endScare();
  }

  _scareGeneric(options) {
    this.audio.playJumpscareStinger();
    this.post.shake(0.01, 0.3);
    if (this.playerRef) this.playerRef.damageSanity(CONFIG.sanity.drainOnScare);
    this.scareTimer.start(1.5);
    this.scareTimer.onComplete = () => this._endScare();
  }

  _proceduralNearScare(playerPos) {
    if (!this.cooldown.isDone) return;

    const scareTypes = ['door_slam_whisper', 'corner_appear', 'painting_scream'];
    const randomScare = scareTypes[Math.floor(Math.random() * scareTypes.length)];
    this.queueScare(randomScare, { repeatable: true });
  }

  _updateCurrentScare(dt) {
    this.scareTimer.update(dt);
    if (this.scareTimer.isDone && this.scareTimer.onComplete) {
      this.scareTimer.onComplete();
    }
  }

  _endScare() {
    this.currentScare = null;
    this.active = false;
    this.cooldown.start(8);
  }

  _showFace(duration = 1.0) {
    if (!this.faceMesh) {
      this._createFaceMesh();
    }
    this.faceMesh.visible = true;
    this.faceMesh.position.copy(this.camera.position);
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    this.faceMesh.position.add(forward.multiplyScalar(0.8));
    this.faceMesh.lookAt(this.camera.position);
    this.faceVisible = true;
    this.faceTimer.start(duration);
  }

  _hideFace() {
    if (this.faceMesh) {
      this.faceMesh.visible = false;
    }
    this.faceVisible = false;
  }

  _createFaceMesh() {
    const group = new THREE.Group();

    const headGeo = new THREE.SphereGeometry(0.35, 16, 16);
    headGeo.scale(1, 1.3, 0.8);
    const headMat = new THREE.MeshBasicMaterial({ color: 0x8a8a8a });
    const head = new THREE.Mesh(headGeo, headMat);
    group.add(head);

    const faceGeo = new THREE.SphereGeometry(0.3, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const faceMat = new THREE.MeshBasicMaterial({ color: 0x0a0a0a, side: THREE.BackSide });
    const face = new THREE.Mesh(faceGeo, faceMat);
    face.rotation.x = Math.PI;
    face.position.z = 0.05;
    group.add(face);

    group.renderOrder = 999;
    group.visible = false;
    this.scene.add(group);
    this.faceMesh = group;
  }

  _flashScreen() {
    this.flashOverlay.style.opacity = '1';
    setTimeout(() => {
      this.flashOverlay.style.opacity = '0';
    }, CONFIG.jumpscare.flashDuration * 1000);
  }

  showDamageOverlay(duration = 0.5) {
    this.damageOverlay.style.opacity = '0.6';
    setTimeout(() => {
      this.damageOverlay.style.opacity = '0';
    }, duration * 1000);
  }

  triggerDeathScare() {
    this._showFace(2.0);
    this.audio.playJumpscareStinger();
    this.post.shake(0.05, 1.0);
    this._flashScreen();
    this.showDamageOverlay(3);
  }

  isActive() {
    return this.active;
  }

  dispose() {
    if (this.faceMesh) {
      this.scene.remove(this.faceMesh);
      this.faceMesh.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      });
    }
  }
}
