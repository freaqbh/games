import { NOTES, ENDINGS } from './story.js';
import { CONFIG } from './config.js';

export class UIManager {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.journalOpen = false;
    this.inventoryOpen = false;
    this.currentNote = null;
    this.subtitleTimer = null;
    this._setupEventListeners();
  }

  _setupEventListeners() {
    this.eventBus.on('showSubtitle', (text) => this.showSubtitle(text));
    this.eventBus.on('objectiveUpdate', (text) => this.updateObjective(text));
    this.eventBus.on('cutscene', (data) => this.showCutscene(data));
    this.eventBus.on('noteCollected', (noteId) => this.showNote(noteId));
    this.eventBus.on('showDeath', (message) => this.showDeathScreen(message));
    this.eventBus.on('showEnding', (endingId) => this.showEnding(endingId));
    this.eventBus.on('hideHUD', () => this.hideHUD());
    this.eventBus.on('showHUD', () => this.showHUD());

    document.getElementById('journalClose').addEventListener('click', () => this.closeJournal());
    document.getElementById('btnRespawn').addEventListener('click', () => this.eventBus.emit('respawn'));
    document.getElementById('btnEndingMenu').addEventListener('click', () => this.eventBus.emit('returnToMenu'));
  }

  showMainMenu() {
    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('mainMenu').classList.add('active');
    const save = localStorage.getItem(CONFIG.saveKey);
    document.getElementById('btnContinue').style.display = save ? 'block' : 'none';
  }

  hideMainMenu() {
    document.getElementById('mainMenu').classList.remove('active');
  }

  showHUD() {
    document.getElementById('hud').classList.add('active');
  }

  hideHUD() {
    document.getElementById('hud').classList.remove('active');
  }

  updateObjective(text) {
    const obj = document.getElementById('objectiveText');
    obj.innerHTML = `<span class="label">Objective</span>${text}`;
  }

  showSubtitle(text, duration = 3000) {
    const sub = document.getElementById('subtitles');
    sub.textContent = text;
    sub.classList.add('visible');

    if (this.subtitleTimer) clearTimeout(this.subtitleTimer);
    this.subtitleTimer = setTimeout(() => {
      sub.classList.remove('visible');
    }, duration);
  }

  showNote(noteId) {
    const note = NOTES[noteId];
    if (!note) return;

    this.currentNote = noteId;
    this.journalOpen = true;

    document.getElementById('journalTitle').textContent = note.title;
    document.getElementById('journalBody').textContent = note.body;
    document.getElementById('journalOverlay').classList.add('active');

    this.eventBus.emit('journalOpened');
  }

  closeJournal() {
    this.journalOpen = false;
    this.currentNote = null;
    document.getElementById('journalOverlay').classList.remove('active');
    this.eventBus.emit('journalClosed');
  }

  showCutscene(data) {
    const overlay = document.getElementById('cutsceneOverlay');
    const title = document.getElementById('cutsceneTitle');
    const text = document.getElementById('cutsceneText');

    title.textContent = data.title || '';
    text.textContent = data.text || '';

    overlay.style.display = 'flex';
    setTimeout(() => { overlay.style.opacity = '1'; }, 50);

    this.eventBus.emit('cutsceneStarted');

    setTimeout(() => {
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.style.display = 'none';
        this.eventBus.emit('cutsceneEnded');
      }, 2000);
    }, 5000);
  }

  showDeathScreen(message) {
    const screen = document.getElementById('deathScreen');
    const msg = document.getElementById('deathMessage');

    const messages = [
      "The darkness claims another soul.",
      "You should have run when you had the chance.",
      "The Hollow One feeds on your fear.",
      "Ashgrove has claimed you.",
      "You are now one of the shadows.",
      "The children whisper your name.",
      "There is no escape from Ashgrove.",
      "The ritual remains incomplete.",
      "Your sister waits for you in the dark.",
      "The door was always locked from the inside.",
      "Some places should remain forgotten.",
      "The Hollow One smiles... if it had a face.",
    ];

    msg.textContent = message || messages[Math.floor(Math.random() * messages.length)];
    screen.classList.add('active');
    this.hideHUD();
  }

  hideDeathScreen() {
    document.getElementById('deathScreen').classList.remove('active');
  }

  showEnding(endingId) {
    const ending = ENDINGS[endingId];
    if (!ending) return;

    const screen = document.getElementById('endingScreen');
    document.getElementById('endingTitle').textContent = ending.title;
    document.getElementById('endingBody').textContent = ending.text;
    screen.classList.add('active');
    this.hideHUD();
  }

  hideEnding() {
    document.getElementById('endingScreen').classList.remove('active');
  }

  showPauseMenu() {
    document.getElementById('pauseMenu').classList.add('active');
  }

  hidePauseMenu() {
    document.getElementById('pauseMenu').classList.remove('active');
  }

  showSettings() {
    document.getElementById('settingsPanel').style.display = 'flex';
  }

  hideSettings() {
    document.getElementById('settingsPanel').style.display = 'none';
  }

  updateInventory(items) {
    const bar = document.getElementById('inventoryBar');
    bar.innerHTML = '';

    for (const item of items) {
      const slot = document.createElement('div');
      slot.className = 'inv-slot has-item';
      slot.innerHTML = `<span class="slot-name">${item.replace(/_/g, ' ')}</span>`;
      bar.appendChild(slot);
    }
  }

  toggleInventory() {
    this.inventoryOpen = !this.inventoryOpen;
    const bar = document.getElementById('inventoryBar');
    bar.classList.toggle('active', this.inventoryOpen);
  }

  updateBattery(percent, isLow) {
    const fill = document.getElementById('batteryFill');
    const text = document.getElementById('batteryText');
    const indicator = document.getElementById('batteryIndicator');

    fill.style.width = `${percent}%`;
    text.textContent = `${Math.round(percent)}%`;
    indicator.classList.toggle('low', isLow);
    fill.style.background = percent < 30 ? '#8b0000' : 'var(--bone)';
  }

  updateSanityOverlay(sanity) {
    const overlay = document.getElementById('sanityOverlay');
    const factor = 1 - (sanity / CONFIG.sanity.max);
    overlay.style.opacity = factor * 0.7;
  }

  showLoadingProgress(percent, text) {
    document.getElementById('loadingFill').style.width = `${percent}%`;
    document.getElementById('loadingText').textContent = text;
  }

  isJournalOpen() {
    return this.journalOpen;
  }

  isInventoryOpen() {
    return this.inventoryOpen;
  }
}
