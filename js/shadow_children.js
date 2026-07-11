import * as THREE from 'three';
import { CONFIG } from './config.js';
import { SeededRandom, dist2D, vec3 } from './utils.js';

export class ShadowChildren {
  constructor(scene, audioManager) {
    this.scene = scene;
    this.audio = audioManager;
    this.children = [];
    this.active = false;
    this.rng = new SeededRandom(999);
    this.whisperTimer = 0;
    this.spawnTimer = 0;
  }

  activate() {
    this.active = true;
    for (let i = 0; i < CONFIG.shadowChildren.count; i++) {
      this.children.push(this._createChild(i));
    }
  }

  _createChild(index) {
    const group = new THREE.Group();

    const bodyGeo = new THREE.CylinderGeometry(0.12, 0.15, 0.8, 6);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x0a0a0a,
      roughness: 1,
      metalness: 0,
      transparent: true,
      opacity: 0.7,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.4;
    body.castShadow = true;
    group.add(body);

    const headGeo = new THREE.SphereGeometry(0.15, 8, 8);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0x0a0a0a,
      roughness: 1,
      metalness: 0,
      transparent: true,
      opacity: 0.7,
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 0.95;
    head.castShadow = true;
    group.add(head);

    const eyeGeo = new THREE.SphereGeometry(0.02, 6, 6);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.05, 0.97, 0.12);
    group.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.05, 0.97, 0.12);
    group.add(rightEye);

    group.visible = false;
    group.position.set(0, 0, -100);
    this.scene.add(group);

    return {
      mesh: group,
      visible: false,
      stareTimer: 0,
      position: vec3(0, 0, -100),
      index,
      whisperCooldown: 0,
    };
  }

  update(dt, playerPos, playerForward, sanity) {
    if (!this.active) return;

    this.spawnTimer += dt;
    this.whisperTimer += dt;

    let activeCount = this.children.filter(c => c.visible).length;

    for (const child of this.children) {
      if (child.visible) {
        child.stareTimer -= dt;
        child.whisperCooldown -= dt;

        const dist = dist2D(child.position, playerPos);
        const dirToChild = vec3(child.position.x - playerPos.x, 0, child.position.z - playerPos.z).normalize();
        const dot = playerForward.x * dirToChild.x + playerForward.z * dirToChild.z;
        const inView = dot > 0.3 && dist < CONFIG.shadowChildren.disappearDistance;

        if (child.stareTimer <= 0 || (inView && dist < 3)) {
          this._hideChild(child);
          continue;
        }

        if (child.whisperCooldown <= 0 && dist < 10) {
          child.whisperCooldown = CONFIG.shadowChildren.whisperInterval;
          this.audio.playWhisper(child.position, 'help me');
        }

        child.mesh.lookAt(playerPos.x, child.position.y + 0.95, playerPos.z);
      } else {
        if (activeCount < CONFIG.shadowChildren.maxActive && this.spawnTimer > 3) {
          if (sanity < CONFIG.shadowChildren.hallucinationSanityThreshold || this.rng.bool(0.3)) {
            this._spawnChildNearPlayer(child, playerPos, playerForward);
            activeCount++;
          }
        }
      }
    }

    if (this.spawnTimer > 3) this.spawnTimer = 0;
  }

  _spawnChildNearPlayer(child, playerPos, playerForward) {
    const angle = (this.rng.next() - 0.5) * Math.PI * 1.2;
    const dist = CONFIG.shadowChildren.appearDistance * (0.6 + this.rng.next() * 0.4);

    const forward = vec3(playerForward.x, 0, playerForward.z).normalize();
    const right = vec3(-forward.z, 0, forward.x);

    const spawnPos = vec3(
      playerPos.x + forward.x * dist * 0.5 + right.x * Math.sin(angle) * dist,
      0,
      playerPos.z + forward.z * dist * 0.5 + right.z * Math.sin(angle) * dist
    );

    child.position.copy(spawnPos);
    child.mesh.position.copy(spawnPos);
    child.mesh.visible = true;
    child.visible = true;
    child.stareTimer = CONFIG.shadowChildren.stareDuration + this.rng.range(0, 3);
  }

  _hideChild(child) {
    child.mesh.visible = false;
    child.visible = false;
    child.position.set(0, 0, -100);
    child.mesh.position.copy(child.position);
  }

  triggerAmbushScare(playerPos) {
    const candidates = this.children.filter(c => c.visible && dist2D(c.position, playerPos) < 6);
    if (candidates.length > 0) {
      const child = candidates[0];
      this._hideChild(child);
      return child.position.clone();
    }
    return null;
  }

  getAllPositions() {
    return this.children.filter(c => c.visible).map(c => c.position.clone());
  }

  dispose() {
    for (const child of this.children) {
      this.scene.remove(child.mesh);
      child.mesh.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      });
    }
    this.children = [];
  }
}
