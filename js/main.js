import * as THREE from 'three';
import { CONFIG } from './config.js';
import { EventBus } from './utils.js';
import { TextureManager } from './textures.js';
import { PostProcessor, ParticleSystem, HallucinationSystem } from './effects.js';
import { World } from './world.js';
import { Player } from './player.js';
import { HollowOne } from './entity.js';
import { ShadowChildren } from './shadow_children.js';
import { AudioManager } from './audio.js';
import { StoryManager } from './story.js';
import { PuzzleManager } from './puzzles.js';
import { JumpscareManager } from './jumpscares.js';
import { UIManager } from './ui.js';

const GAME_STATES = {
  LOADING: 'loading',
  MENU: 'menu',
  PLAYING: 'playing',
  PAUSED: 'paused',
  CUTSCENE: 'cutscene',
  DEAD: 'dead',
  ENDING: 'ending',
};

class Game {
  constructor() {
    this.state = GAME_STATES.LOADING;
    this.clock = new THREE.Clock();
    this.eventBus = new EventBus();
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.textures = null;
    this.world = null;
    this.player = null;
    this.entity = null;
    this.shadowChildren = null;
    this.audio = null;
    this.postProcessor = null;
    this.particles = null;
    this.hallucinations = null;
    this.story = null;
    this.puzzles = null;
    this.jumpscares = null;
    this.ui = null;
    this.jumpscareActive = false;
    this.deathCooldown = 0;
    this.autoSaveTimer = 0;

    this._init();
  }

  async _init() {
    this._setupRenderer();
    this._setupScene();
    this.ui = new UIManager(this.eventBus);
    this._setupMenuButtons();
    this._setupEventHandlers();

    this.ui.showLoadingProgress(10, 'Initializing renderer...');
    await this._delay(100);

    this.textures = new TextureManager();
    this.ui.showLoadingProgress(20, 'Generating textures...');
    await this._delay(100);
    this.textures.loadAll();

    this.ui.showLoadingProgress(40, 'Building world...');
    await this._delay(100);
    this.world = new World(this.scene, this.textures);
    this.world.build();

    this.ui.showLoadingProgress(60, 'Setting up audio...');
    await this._delay(100);
    this.audio = new AudioManager();

    this.ui.showLoadingProgress(70, 'Creating entities...');
    await this._delay(100);
    this.entity = new HollowOne(this.scene, this.world, this.audio);
    this.shadowChildren = new ShadowChildren(this.scene, this.audio);

    this.ui.showLoadingProgress(80, 'Initializing effects...');
    await this._delay(100);
    this.postProcessor = new PostProcessor(this.renderer, this.scene, this.camera);
    this.particles = new ParticleSystem(this.scene);
    this.hallucinations = new HallucinationSystem(this.scene, this.camera);

    this.ui.showLoadingProgress(90, 'Preparing story...');
    await this._delay(100);
    this.story = new StoryManager(this.eventBus);
    this.puzzles = new PuzzleManager(this.world, null, this.story, this.eventBus);
    this.jumpscares = new JumpscareManager(this.scene, this.camera, this.audio, this.postProcessor, this.entity);

    this.ui.showLoadingProgress(100, 'Ready');
    await this._delay(500);

    this.ui.showMainMenu();
    this.state = GAME_STATES.MENU;
    this._startRenderLoop();
  }

  _setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: CONFIG.render.antialias,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, CONFIG.render.pixelRatioMax));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.4;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    document.body.appendChild(this.renderer.domElement);

    window.addEventListener('resize', () => this._onResize());
  }

  _setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(CONFIG.fog.color);
    this.scene.fog = new THREE.FogExp2(CONFIG.fog.color, 0.04);

    // Global ambient — brighter for physical lighting
    const ambient = new THREE.AmbientLight(0x222230, 2.5);
    this.scene.add(ambient);

    // Subtle hemisphere light (cold ceiling / warm floor) for depth
    const hemi = new THREE.HemisphereLight(0x2a2a3e, 0x1d1d2d, 1.5);
    this.scene.add(hemi);

    this.camera = new THREE.PerspectiveCamera(
      CONFIG.render.fov,
      window.innerWidth / window.innerHeight,
      CONFIG.render.near,
      CONFIG.render.far
    );
  }

  _setupMenuButtons() {
    document.getElementById('btnNewGame').addEventListener('click', () => this._startNewGame());
    document.getElementById('btnContinue').addEventListener('click', () => this._continueGame());
    document.getElementById('btnSettings').addEventListener('click', () => this.ui.showSettings());
    document.getElementById('btnCredits').addEventListener('click', () => {
      this.ui.showSubtitle('ASHGROVE: The Last Visit - A Horror Experience');
    });
    document.getElementById('btnResume').addEventListener('click', () => this._resumeGame());
    document.getElementById('btnSettingsPause').addEventListener('click', () => this.ui.showSettings());
    document.getElementById('btnQuit').addEventListener('click', () => this._quitToMenu());
    document.getElementById('btnSettingsBack').addEventListener('click', () => this.ui.hideSettings());

    document.getElementById('sensitivitySlider').addEventListener('input', (e) => {
      document.getElementById('sensitivityValue').textContent = parseFloat(e.target.value).toFixed(1);
    });
    document.getElementById('volumeSlider').addEventListener('input', (e) => {
      const vol = parseFloat(e.target.value);
      document.getElementById('volumeValue').textContent = `${Math.round(vol * 100)}%`;
      if (this.audio) this.audio.setMasterVolume(vol);
    });
  }

  _setupEventHandlers() {
    this.eventBus.on('actChange', (act) => this._onActChange(act));
    this.eventBus.on('cutscene', (data) => this._onCutscene(data));
    this.eventBus.on('cutsceneEnded', () => this._onCutsceneEnded());
    this.eventBus.on('respawn', () => this._respawn());
    this.eventBus.on('returnToMenu', () => this._quitToMenu());
    this.eventBus.on('ritualStarted', () => this._startRitualSequence());
    this.eventBus.on('ritualComplete', () => this._triggerEnding('good'));
    this.eventBus.on('showSubtitle', (text) => this.ui.showSubtitle(text));

    this.eventBus.on('noteCollected', (noteId) => this._onNoteCollected(noteId));
    this.eventBus.on('keyCollected', (data) => this._onKeyCollected(data));
    this.eventBus.on('ritualItemCollected', (data) => this._onRitualItemCollected(data));
    this.eventBus.on('powerRestored', () => this._onPowerRestored());
    this.eventBus.on('tryOpenSafe', (obj) => this._showSafeCodeEntry(obj));
    this.eventBus.on('doorUnlocked', (roomId) => this.ui.showSubtitle('Door unlocked'));

    document.getElementById('btnSafeSubmit').addEventListener('click', () => this._submitSafeCode());
    document.getElementById('btnSafeCancel').addEventListener('click', () => this._hideSafeCodeEntry());

    const digits = document.querySelectorAll('.code-digit');
    digits.forEach((d, i) => {
      d.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
        if (e.target.value && i < digits.length - 1) digits[i + 1].focus();
      });
      d.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !e.target.value && i > 0) digits[i - 1].focus();
        if (e.key === 'Enter') this._submitSafeCode();
      });
    });
  }

  async _startNewGame() {
    this.ui.hideMainMenu();
    this.ui.showLoadingProgress(0, 'Entering Ashgrove...');

    if (this.audio && !this.audio.initialized) {
      await this.audio.init();
    }

    this.player = new Player(this.camera, this.scene, this.world, this.eventBus);
    this.player.audio = this.audio;
    this.puzzles.player = this.player;
    this.entity.setPlayerRef(this.player);
    this.jumpscares.setPlayerRef(this.player);

    this.camera.position.set(0, CONFIG.player.eyeHeight, 0);

    this.world.placeAllCollectibles();

    this.particles.createDustMotes(new THREE.Vector3(0, 1, 0), 150, 10);
    this.particles.createFog(new THREE.Vector3(0, 0, 0), 80, 15);

    this.story.reset();
    this.puzzles.reset();

    this._introCutscene();
  }

  _introCutscene() {
    this.state = GAME_STATES.CUTSCENE;
    this.ui.showCutscene({
      title: 'ASHGROVE',
      text: "Emily, if you're reading this, I'm sorry.\nI should have come sooner.\n\nThe door is ajar. You enter.\nThe door slams behind you.\n\nYou're trapped.",
    });

    setTimeout(() => {
      this.player.lock();
      this.ui.showHUD();
      this.state = GAME_STATES.PLAYING;
      this.story.trigger('enter_entrance');
    }, 7000);
  }

  _continueGame() {
    const save = localStorage.getItem(CONFIG.saveKey);
    if (!save) {
      this._startNewGame();
      return;
    }

    try {
      const data = JSON.parse(save);
      (async () => {
        await this._startNewGame();
        this.camera.position.set(data.pos.x, data.pos.y, data.pos.z);
        this.player.sanity = data.sanity || CONFIG.sanity.startVal;
        this.player.flashlightBattery = data.battery || CONFIG.flashlight.batteryMax;
        this.player.inventory = data.inventory || [];
        this.story.currentAct = data.act || 1;
        this.puzzles.loadGameState(data.puzzles);

        if (data.act && data.act >= 2) {
          this.entity.activate(data.act);
          this.shadowChildren.activate();
        }
      })();
    } catch (e) {
      this._startNewGame();
    }
  }

  _onNoteCollected(noteId) {
    this.puzzles.collectNote(noteId);
    this.ui.showNote(noteId);
  }

  _onKeyCollected(data) {
    this.player.addItem(data.id);
    this.ui.showSubtitle(`Found: ${data.name}`);
    if (this.audio) this.audio.playItemPickup();
  }

  _onRitualItemCollected(data) {
    this.player.addItem(data.id);
    this.story.findRitualItem(data.id);
    this.ui.updateInventory(this.player.inventory);
    this.ui.showSubtitle(`Found: ${data.name}`);
    if (this.audio) this.audio.playItemPickup();

    if (this.story.getRitualItemsCount() >= 5) {
      this.story.trigger('find_all_ritual_items');
    }
  }

  _onPowerRestored() {
    this.world.powerOn = true;
    this.puzzles.powerRestored = true;
    this.story.trigger('restore_power');
    this.story.trigger('first_entity_sighting');
    this.entity.activate(2);
    this.entity.teleportNearPlayer(this.player.getPosition());
  }

  _showSafeCodeEntry(safeObj) {
    this._currentSafe = safeObj;
    this.player.unlock();
    document.getElementById('safeCodeOverlay').style.display = 'flex';
    document.getElementById('safeCodeError').style.opacity = '0';
    const digits = document.querySelectorAll('.code-digit');
    digits.forEach(d => d.value = '');
    if (digits[0]) digits[0].focus();
  }

  _hideSafeCodeEntry() {
    document.getElementById('safeCodeOverlay').style.display = 'none';
    this._currentSafe = null;
    if (this.player) this.player.lock();
  }

  _submitSafeCode() {
    const digits = document.querySelectorAll('.code-digit');
    let code = '';
    digits.forEach(d => code += d.value);
    if (code === '1953') {
      if (this._currentSafe) {
        this._currentSafe.userData.opened = true;
        this.player.addItem('ritual_item_1');
        this.story.findRitualItem('ritual_item_1');
        this.story.trigger('first_entity_sighting');
        this.ui.showSubtitle('Found: Ritual Dagger');
        if (this.audio) this.audio.playItemPickup();
        this.ui.updateInventory(this.player.inventory);
      }
      this._hideSafeCodeEntry();
    } else {
      document.getElementById('safeCodeError').style.opacity = '1';
      digits.forEach(d => d.value = '');
      if (digits[0]) digits[0].focus();
    }
  }

  _resumeGame() {
    this.ui.hidePauseMenu();
    this.player.lock();
    this.state = GAME_STATES.PLAYING;
  }

  _quitToMenu() {
    this.ui.hidePauseMenu();
    this.ui.hideDeathScreen();
    this.ui.hideEnding();
    this.ui.hideHUD();
    if (this.player) this.player.unlock();
    this.state = GAME_STATES.MENU;
    this.ui.showMainMenu();
  }

  _onActChange(act) {
    this.entity.setAct(act);
    if (act >= 2 && !this.entity.active) {
      this.entity.activate(act);
    }
    if (act >= 2) {
      this.shadowChildren.activate();
    }
  }

  _onCutscene(data) {
    this.state = GAME_STATES.CUTSCENE;
    if (this.player) this.player.unlock();
  }

  _onCutsceneEnded() {
    if (this.state === GAME_STATES.CUTSCENE) {
      this.state = GAME_STATES.PLAYING;
      if (this.player) this.player.lock();
    }
  }

  _respawn() {
    this.ui.hideDeathScreen();
    this.player.sanity = CONFIG.sanity.startVal;
    this.player.flashlightBattery = CONFIG.flashlight.batteryMax;
    this.player.flashlightOn = true;
    this.player.flashlight.visible = true;

    const safeRoom = this.player.lastSafeRoom || this.world.rooms[0];
    this.camera.position.copy(safeRoom.center);
    this.camera.position.y = CONFIG.player.eyeHeight;

    this.state = GAME_STATES.PLAYING;
    this.player.lock();
    this.ui.showHUD();
  }

  _startRitualSequence() {
    this.entity.setAct(4);
    this.entity.activate(4);
    this.jumpscares.queueScare('ritual_frenzy', { priority: 100 });

    setTimeout(() => {
      this._triggerEnding('good');
    }, 15000);
  }

  _triggerEnding(endingId) {
    this.state = GAME_STATES.ENDING;
    if (this.player) this.player.unlock();
    this.ui.showEnding(endingId);
    localStorage.removeItem(CONFIG.saveKey);
  }

  _playerDeath() {
    if (this.state === GAME_STATES.DEAD) return;
    this.state = GAME_STATES.DEAD;
    this.jumpscares.triggerDeathScare();
    if (this.player) this.player.unlock();
    setTimeout(() => {
      this.ui.showDeathScreen();
    }, 2000);
  }

  _autoSave() {
    if (!this.player || this.state !== GAME_STATES.PLAYING) return;
    const data = {
      pos: { x: this.camera.position.x, y: this.camera.position.y, z: this.camera.position.z },
      sanity: this.player.sanity,
      battery: this.player.flashlightBattery,
      inventory: this.player.inventory,
      act: this.story.getCurrentAct(),
      puzzles: this.puzzles.getGameState(),
    };
    localStorage.setItem(CONFIG.saveKey, JSON.stringify(data));
  }

  _onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    if (this.postProcessor) this.postProcessor.resize(w, h);
  }

  _startRenderLoop() {
    const animate = () => {
      requestAnimationFrame(animate);
      const dt = Math.min(this.clock.getDelta(), 0.1);
      this._update(dt);
      this._render();
    };
    animate();
  }

  _updateGameplay(dt) {
    const playerPos = this.player.getPosition();

    this.player.update(dt);
    this.world.update(dt, playerPos);
    this.puzzles.update(dt);

    const entityResult = this.entity.update(dt, playerPos);
    if (entityResult === 'attack') {
      this._playerDeath();
      return;
    }

    this.shadowChildren.update(dt, playerPos, this.player.getForward(), this.player.sanity);
    this.particles.update(dt);
    this.hallucinations.update(dt, this.player.sanity);

    const nearEntity = this.entity.isNearPlayer(playerPos, 8);
    const chasing = this.entity.isChasing();
    this.jumpscareActive = this.jumpscares.isActive();

    this.jumpscares.update(dt, playerPos);

    if (nearEntity) {
      this.player.damageSanity(CONFIG.sanity.drainNearEntity * dt);
    }
    if (chasing) {
      this.player.damageSanity(CONFIG.sanity.drainDuringChase * dt);
    }

    if (this.player.sanity < CONFIG.sanity.heartbeatThreshold) {
      const rate = 60 + (1 - this.player.sanity / CONFIG.sanity.heartbeatThreshold) * 80;
      this.audio.playHeartbeat(rate);
    } else {
      this.audio.stopHeartbeat();
    }

    if (chasing) {
      this.audio.setMusicState('chase');
    } else if (nearEntity) {
      this.audio.setMusicState('tense');
    } else {
      this.audio.setMusicState('calm');
    }

    const forward = this.player.getForward();
    const up = new THREE.Vector3(0, 1, 0);
    this.audio.setListenerPosition(playerPos, forward, up);

    this.postProcessor.update(dt, this.player.sanity, nearEntity, chasing, this.jumpscareActive);
    this.ui.updateSanityOverlay(this.player.sanity);

    this.autoSaveTimer += dt;
    if (this.autoSaveTimer > CONFIG.game.autoSaveInterval) {
      this.autoSaveTimer = 0;
      this._autoSave();
    }

    this._checkStoryTriggers(playerPos);
  }

  _checkStoryTriggers(playerPos) {
    const currentRoom = this.world.getRoomAt(playerPos.x, playerPos.z, Math.floor(playerPos.y / CONFIG.world.wallHeight));
    if (!currentRoom) return;

    if (currentRoom.id === 'entrance' && !this.story.hasTriggered('enter_entrance')) {
      this.story.trigger('enter_entrance');
    }
    if (currentRoom.floor === -1 && !this.story.hasTriggered('enter_basement')) {
      this.story.trigger('enter_basement');
    }
    if (currentRoom.floor === 1 && !this.story.hasTriggered('enter_upper_floor')) {
      this.story.trigger('enter_upper_floor');
    }
  }

  _render() {
    if (this.state === GAME_STATES.MENU) return;

    if (this.postProcessor) {
      this.postProcessor.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  _update(dt) {
    if (this.state === GAME_STATES.PLAYING) {
      this._updateGameplay(dt);
    } else if (this.state === GAME_STATES.CUTSCENE || this.state === GAME_STATES.MENU) {
      if (this.particles) this.particles.update(dt);
      if (this.world) this.world.update(dt, this.camera ? this.camera.position : new THREE.Vector3());
    }
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

const game = new Game();
window.game = game; // Exposed for testing jumpscares
