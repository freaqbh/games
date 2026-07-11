import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { CONFIG } from './config.js';
import { clamp, lerp, damp, vec3 } from './utils.js';

export class Player {
  constructor(camera, scene, world, eventBus = null) {
    this.camera = camera;
    this.scene = scene;
    this.world = world;
    this.eventBus = eventBus;
    this.controls = new PointerLockControls(camera, document.body);
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    this.position = vec3(0, CONFIG.player.eyeHeight, 0);
    this.isRunning = false;
    this.isCrouching = false;
    this.isHiding = false;
    this.stamina = CONFIG.player.sprintStaminaMax;
    this.sanity = CONFIG.sanity.startVal;
    this.flashlightOn = true;
    this.flashlightBattery = CONFIG.flashlight.batteryMax;
    this.inventory = [];
    this.keys = { w: false, a: false, s: false, d: false, shift: false, c: false };
    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;
    this.canJump = false;
    this.headBobTime = 0;
    this.breathingTime = 0;
    this.footstepTimer = 0;
    this.interactionRaycaster = new THREE.Raycaster();
    this.interactionRaycaster.far = CONFIG.player.interactionDistance;
    this.currentInteractable = null;
    this.hidingSpot = null;
    this.sanityRecoveryTimer = 0;
    this.lastSafeRoom = null;

    this._setupControls();
    this._setupFlashlight();
    this._setupEventListeners();
  }

  _setupControls() {
    this.controls.addEventListener('lock', () => {
      document.getElementById('hud').classList.add('active');
    });
    this.controls.addEventListener('unlock', () => {
      document.getElementById('hud').classList.remove('active');
    });
  }

  _setupFlashlight() {
    this.flashlight = new THREE.SpotLight(
      0xffffee,
      CONFIG.flashlight.intensity,
      CONFIG.flashlight.distance,
      CONFIG.flashlight.angle,
      CONFIG.flashlight.penumbra,
      CONFIG.flashlight.decay
    );
    this.flashlight.castShadow = true;
    this.flashlight.shadow.mapSize.set(1024, 1024);
    this.camera.add(this.flashlight);
    this.flashlight.position.set(0, 0, 0);
    this.flashlight.target.position.set(0, 0, -1);
    this.camera.add(this.flashlight.target);
    this.scene.add(this.camera);
  }

  _setupEventListeners() {
    document.addEventListener('keydown', (e) => this._onKeyDown(e));
    document.addEventListener('keyup', (e) => this._onKeyUp(e));
    document.addEventListener('mousedown', (e) => this._onMouseDown(e));
  }

  _onKeyDown(e) {
    if (e.code === 'Escape') { this._togglePause(); return; }
    if (this.isHiding) {
      if (e.code === 'KeyE') { this._hide(this.hidingSpot); }
      return;
    }
    switch (e.code) {
      case 'KeyW': this.keys.w = true; this.moveForward = true; break;
      case 'KeyA': this.keys.a = true; this.moveLeft = true; break;
      case 'KeyS': this.keys.s = true; this.moveBackward = true; break;
      case 'KeyD': this.keys.d = true; this.moveRight = true; break;
      case 'ShiftLeft': case 'ShiftRight': this.keys.shift = true; break;
      case 'KeyC': this.keys.c = true; this.isCrouching = !this.isCrouching; break;
      case 'KeyF': this._toggleFlashlight(); break;
      case 'KeyE': this._interact(); break;
      case 'Tab': e.preventDefault(); this._toggleInventory(); break;
      case 'Escape': this._togglePause(); break;
    }
  }

  _onKeyUp(e) {
    switch (e.code) {
      case 'KeyW': this.keys.w = false; this.moveForward = false; break;
      case 'KeyA': this.keys.a = false; this.moveLeft = false; break;
      case 'KeyS': this.keys.s = false; this.moveBackward = false; break;
      case 'KeyD': this.keys.d = false; this.moveRight = false; break;
      case 'ShiftLeft': case 'ShiftRight': this.keys.shift = false; break;
    }
  }

  _onMouseDown(e) {
    if (e.button === 0 && this.controls.isLocked) {
      this._interact();
    }
  }

  _toggleFlashlight() {
    if (this.flashlightBattery > 0) {
      this.flashlightOn = !this.flashlightOn;
      this.flashlight.visible = this.flashlightOn;
    }
  }

  _interact() {
    if (!this.currentInteractable) return;
    const obj = this.currentInteractable;
    const data = obj.userData;

    if (data.collected) return;

    if (data.type === 'note') {
      data.collected = true;
      this.world.removeInteractable(obj);
      if (this.eventBus) this.eventBus.emit('noteCollected', data.noteId);
      if (this.audio) this.audio.playItemPickup();
    } else if (data.type === 'key') {
      data.collected = true;
      this.world.removeInteractable(obj);
      this.addItem(data.keyId);
      if (this.eventBus) this.eventBus.emit('keyCollected', { id: data.keyId, name: data.keyName });
      this._showSubtitle(`Found: ${data.keyName}`);
      if (this.audio) this.audio.playItemPickup();
    } else if (data.type === 'ritual_item') {
      data.collected = true;
      this.world.removeInteractable(obj);
      this.addItem(data.itemId);
      if (this.eventBus) this.eventBus.emit('ritualItemCollected', { id: data.itemId, name: data.itemName });
      this._showSubtitle(`Found: ${data.itemName}`);
      if (this.audio) this.audio.playItemPickup();
    } else if (data.type === 'door' && data.locked) {
      if (this.inventory.includes(data.key)) {
        this.world.unlockDoor(data.key);
        this.inventory = this.inventory.filter(k => k !== data.key);
        this._showSubtitle('Door unlocked');
        if (this.audio) this.audio.playDoorCreak();
        if (this.eventBus) this.eventBus.emit('doorUnlocked', data.room);
      } else {
        this._showSubtitle('Locked. Need a key.');
      }
    } else if (data.type === 'cabinet' || data.type === 'bed') {
      this._hide(obj);
    } else if (data.type === 'safe') {
      if (this.eventBus) {
        this.eventBus.emit('tryOpenSafe', obj);
      } else {
        if (!data.opened) {
          this._showSubtitle('The safe requires a 4-digit code');
          if (this.eventBus) this.eventBus.emit('showSafeCodeEntry', obj);
        } else {
          this._showSubtitle('The safe is empty');
        }
      }
    } else if (data.type === 'breaker') {
      if (!data.activated) {
        data.activated = true;
        this.world.powerOn = true;
        this._showSubtitle('Power restored');
        if (this.eventBus) this.eventBus.emit('powerRestored');
      } else {
        this._showSubtitle('The breaker is already on');
      }
    } else if (data.type === 'ritual_circle') {
      this._interactRitual();
    }
  }

  _hide(spot) {
    if (this.isHiding) {
      this.isHiding = false;
      this.hidingSpot = null;
      this.controls.lock();
      this._showSubtitle('');
    } else {
      this.isHiding = true;
      this.hidingSpot = spot;
      this.controls.unlock();
      this._showSubtitle('Press E to exit hiding spot');
    }
  }

  _interactRitual() {
    const ritualItems = this.inventory.filter(i => i.startsWith('ritual_item'));
    if (ritualItems.length >= 5) {
      this._showSubtitle('All ritual items placed. Begin the incantation.');
    } else {
      this._showSubtitle(`Need ${5 - ritualItems.length} more ritual items`);
    }
  }

  _toggleInventory() {
    const invBar = document.getElementById('inventoryBar');
    invBar.classList.toggle('active');
  }

  _togglePause() {
    const pauseMenu = document.getElementById('pauseMenu');
    if (pauseMenu.classList.contains('active')) {
      pauseMenu.classList.remove('active');
      this.controls.lock();
    } else {
      pauseMenu.classList.add('active');
      this.controls.unlock();
    }
  }

  _showSubtitle(text) {
    const sub = document.getElementById('subtitles');
    sub.textContent = text;
    sub.classList.add('visible');
    setTimeout(() => sub.classList.remove('visible'), 3000);
  }

  update(dt) {
    if (!this.controls.isLocked || this.isHiding) return;

    this._updateMovement(dt);
    this._updateStamina(dt);
    this._updateFlashlight(dt);
    this._updateSanity(dt);
    this._updateInteraction();
    this._updateHeadBob(dt);
    this._updateBreathing(dt);
    this._updateFootsteps(dt);
    this._checkRoomSafety();
  }

  _updateMovement(dt) {
    const speed = this.isCrouching ? CONFIG.player.crouchSpeed :
                  (this.isRunning && this.stamina > CONFIG.player.sprintStaminaMin) ? CONFIG.player.runSpeed :
                  CONFIG.player.walkSpeed;

    this.isRunning = this.keys.shift && !this.isCrouching && this.stamina > CONFIG.player.sprintStaminaMin;

    this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
    this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
    this.direction.normalize();

    const accel = CONFIG.player.acceleration;
    const decel = CONFIG.player.deceleration;

    if (this.moveForward || this.moveBackward) {
      this.velocity.z = damp(this.velocity.z, this.direction.z * speed, accel, dt);
    } else {
      this.velocity.z = damp(this.velocity.z, 0, decel, dt);
    }

    if (this.moveLeft || this.moveRight) {
      this.velocity.x = damp(this.velocity.x, this.direction.x * speed, accel, dt);
    } else {
      this.velocity.x = damp(this.velocity.x, 0, decel, dt);
    }

    this.controls.moveRight(this.velocity.x * dt);
    this.controls.moveForward(this.velocity.z * dt);

    const eyeHeight = this.isCrouching ? CONFIG.player.crouchHeight : CONFIG.player.eyeHeight;
    this.camera.position.y = damp(this.camera.position.y, eyeHeight, 10, dt);
  }

  _updateStamina(dt) {
    if (this.isRunning && (this.moveForward || this.moveBackward || this.moveLeft || this.moveRight)) {
      this.stamina = clamp(this.stamina - CONFIG.player.sprintStaminaDrain * dt, 0, CONFIG.player.sprintStaminaMax);
    } else {
      this.stamina = clamp(this.stamina + CONFIG.player.sprintStaminaRegen * dt, 0, CONFIG.player.sprintStaminaMax);
    }
  }

  _updateFlashlight(dt) {
    if (this.flashlightOn) {
      this.flashlightBattery = clamp(this.flashlightBattery - CONFIG.flashlight.batteryDrainPerSec * dt, 0, CONFIG.flashlight.batteryMax);

      if (this.flashlightBattery <= 0) {
        this.flashlightOn = false;
        this.flashlight.visible = false;
      } else if (this.flashlightBattery < CONFIG.flashlight.batteryLowThreshold) {
        this.flashlight.intensity = CONFIG.flashlight.intensityLowBattery;
        if (Math.random() < CONFIG.flashlight.flickerChance) {
          this.flashlight.visible = false;
          setTimeout(() => { if (this.flashlightOn) this.flashlight.visible = true; }, CONFIG.flashlight.flickerDuration * 1000);
        }
      } else {
        this.flashlight.intensity = CONFIG.flashlight.intensity;
      }

      const fill = document.getElementById('batteryFill');
      const text = document.getElementById('batteryText');
      const indicator = document.getElementById('batteryIndicator');
      fill.style.width = `${this.flashlightBattery}%`;
      text.textContent = `${Math.round(this.flashlightBattery)}%`;
      indicator.classList.toggle('low', this.flashlightBattery < CONFIG.flashlight.batteryLowThreshold);

      if (this.flashlightBattery < 30) {
        fill.style.background = '#8b0000';
      } else {
        fill.style.background = 'var(--bone)';
      }
    }
  }

  _updateSanity(dt) {
    const currentRoom = this.world.getRoomAt(this.camera.position.x, this.camera.position.z, Math.floor(this.camera.position.y / CONFIG.world.wallHeight));
    const inLight = this.flashlightOn || (currentRoom && currentRoom.hasFlickeringLight);
    const inSafeRoom = currentRoom && currentRoom.isSafe;

    if (!inLight) {
      this.sanity = clamp(this.sanity - CONFIG.sanity.drainInDarkness * dt, 0, CONFIG.sanity.max);
    }

    if (inLight && !inSafeRoom) {
      this.sanityRecoveryTimer += dt;
      if (this.sanityRecoveryTimer > CONFIG.sanity.recoveryDelay) {
        this.sanity = clamp(this.sanity + CONFIG.sanity.regenInLight * dt, 0, CONFIG.sanity.max);
      }
    }

    if (inSafeRoom) {
      this.sanity = clamp(this.sanity + CONFIG.sanity.regenSafeRoom * dt, 0, CONFIG.sanity.max);
    }

    const overlay = document.getElementById('sanityOverlay');
    const sanityFactor = 1 - (this.sanity / CONFIG.sanity.max);
    overlay.style.opacity = sanityFactor * 0.7;
  }

  _updateInteraction() {
    this.interactionRaycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const intersects = this.interactionRaycaster.intersectObjects(this.world.interactables, true);

    const crosshair = document.getElementById('crosshair');
    const prompt = document.getElementById('interactionPrompt');

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      let obj = hit;
      while (obj && (!obj.userData || !obj.userData.type) && obj.parent) {
        obj = obj.parent;
      }
      if (obj && obj.userData && obj.userData.type) {
        this.currentInteractable = obj;
        crosshair.classList.add('interactive');

        const data = obj.userData;
        let text = '';
        if (data.type === 'note') text = '[E] Read Note';
        else if (data.type === 'key') text = `[E] Pick up ${data.keyName || 'Key'}`;
        else if (data.type === 'ritual_item') text = `[E] Pick up ${data.itemName || 'Item'}`;
        else if (data.type === 'door') text = data.locked ? '[E] Locked Door' : '[E] Open';
        else if (data.type === 'cabinet') text = '[E] Hide';
        else if (data.type === 'bed') text = '[E] Hide Under Bed';
        else if (data.type === 'safe') text = data.opened ? '[E] Empty Safe' : '[E] Open Safe';
        else if (data.type === 'breaker') text = data.activated ? 'Breaker (Active)' : '[E] Activate Breaker';
        else if (data.type === 'ritual_circle') text = '[E] Ritual Circle';

        prompt.innerHTML = text;
        prompt.classList.add('visible');
      } else {
        this.currentInteractable = null;
        crosshair.classList.remove('interactive');
        prompt.classList.remove('visible');
      }
    } else {
      this.currentInteractable = null;
      crosshair.classList.remove('interactive');
      prompt.classList.remove('visible');
    }
  }

  _updateHeadBob(dt) {
    const isMoving = this.moveForward || this.moveBackward || this.moveLeft || this.moveRight;
    if (isMoving && !this.isCrouching) {
      const freq = this.isRunning ? CONFIG.player.headBobFrequency * 1.3 : CONFIG.player.headBobFrequency;
      const amp = this.isRunning ? CONFIG.player.headBobRunAmplitude : CONFIG.player.headBobAmplitude;
      this.headBobTime += dt * freq;
      const bob = Math.sin(this.headBobTime) * amp;
      this.camera.position.y += bob;
    } else {
      this.headBobTime = 0;
    }
  }

  _updateBreathing(dt) {
    this.breathingTime += dt * CONFIG.player.breathingFrequency;
    const breath = Math.sin(this.breathingTime) * CONFIG.player.breathingAmplitude;
    this.camera.position.y += breath;
  }

  _updateFootsteps(dt) {
    const isMoving = this.moveForward || this.moveBackward || this.moveLeft || this.moveRight;
    if (isMoving) {
      const interval = this.isRunning ? CONFIG.player.footstepRunInterval : CONFIG.player.footstepInterval;
      this.footstepTimer += dt;
      if (this.footstepTimer >= interval) {
        this.footstepTimer = 0;
      }
    } else {
      this.footstepTimer = 0;
    }
  }

  _checkRoomSafety() {
    const currentRoom = this.world.getRoomAt(this.camera.position.x, this.camera.position.z, Math.floor(this.camera.position.y / CONFIG.world.wallHeight));
    if (currentRoom && currentRoom.isSafe) {
      this.lastSafeRoom = currentRoom;
    }
  }

  damageSanity(amount) {
    this.sanity = clamp(this.sanity - amount, 0, CONFIG.sanity.max);
    this.sanityRecoveryTimer = 0;
  }

  addItem(item) {
    if (!this.inventory.includes(item)) {
      this.inventory.push(item);
      this._updateInventoryUI();
    }
  }

  hasItem(item) {
    return this.inventory.includes(item);
  }

  removeItem(item) {
    this.inventory = this.inventory.filter(i => i !== item);
    this._updateInventoryUI();
  }

  _updateInventoryUI() {
    const invBar = document.getElementById('inventoryBar');
    invBar.innerHTML = '';
    for (const item of this.inventory) {
      const slot = document.createElement('div');
      slot.className = 'inv-slot has-item';
      slot.innerHTML = `<span class="slot-name">${item.replace('_', ' ')}</span>`;
      invBar.appendChild(slot);
    }
  }

  getPosition() {
    return this.camera.position.clone();
  }

  getForward() {
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    return forward;
  }

  lock() {
    this.controls.lock();
  }

  unlock() {
    this.controls.unlock();
  }

  isLocked() {
    return this.controls.isLocked;
  }

  dispose() {
    this.controls.dispose();
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup', this._onKeyUp);
    document.removeEventListener('mousedown', this._onMouseDown);
  }
}
