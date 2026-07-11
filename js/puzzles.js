import { CONFIG } from './config.js';

export class PuzzleManager {
  constructor(world, player, storyManager, eventBus) {
    this.world = world;
    this.player = player;
    this.story = storyManager;
    this.eventBus = eventBus;
    this.solvedPuzzles = new Set();
    this.ritualItemsPlaced = new Set();
    this.breakerActivated = false;
    this.powerRestored = false;
  }

  update(dt) {
    this._checkPowerState();
    this._checkRitualState();
  }

  tryUnlockDoor(doorObj) {
    const data = doorObj.userData;
    if (!data.locked) return true;

    if (data.key === 'hale_key') {
      if (this.player.hasItem('hale_key')) {
        this.world.unlockDoor('hale_key');
        this.player.removeItem('hale_key');
        this.eventBus.emit('doorUnlocked', 'hale_quarters');
        return true;
      }
      return false;
    }

    if (data.key === 'ritual_key') {
      if (this.player.hasItem('ritual_key')) {
        this.world.unlockDoor('ritual_key');
        this.player.removeItem('ritual_key');
        this.eventBus.emit('doorUnlocked', 'ritual_chamber');
        return true;
      }
      return false;
    }

    return false;
  }

  tryOpenSafe(safeObj) {
    const data = safeObj.userData;
    if (data.opened) return false;

    const code = prompt('Enter safe code (4 digits):');
    if (code === '1953') {
      data.opened = true;
      this.solvedPuzzles.add('safe');
      this.player.addItem('ritual_item_1');
      this.story.findRitualItem('ritual_item_1');
      this.eventBus.emit('puzzleSolved', 'safe');
      this.eventBus.emit('showSubtitle', 'Found: Ritual Dagger');
      return true;
    } else if (code !== null) {
      this.eventBus.emit('showSubtitle', 'Wrong code');
    }
    return false;
  }

  tryActivateBreaker(breakerObj) {
    const data = breakerObj.userData;
    if (data.activated) return false;

    data.activated = true;
    this.breakerActivated = true;
    this.powerRestored = true;
    this.world.powerOn = true;
    this.solvedPuzzles.add('breaker');
    this.story.trigger('restore_power');
    this.eventBus.emit('puzzleSolved', 'breaker');
    this.eventBus.emit('showSubtitle', 'Power restored');
    return true;
  }

  tryPlaceRitualItem(itemId) {
    if (this.ritualItemsPlaced.has(itemId)) return false;
    if (!this.player.hasItem(itemId)) return false;

    this.ritualItemsPlaced.add(itemId);
    this.player.removeItem(itemId);
    this.eventBus.emit('ritualItemPlaced', itemId);

    if (this.ritualItemsPlaced.size >= 5) {
      this.eventBus.emit('ritualComplete');
    }

    return true;
  }

  tryCompleteRitual() {
    if (this.ritualItemsPlaced.size < 5) {
      const remaining = 5 - this.ritualItemsPlaced.size;
      this.eventBus.emit('showSubtitle', `Need ${remaining} more ritual items`);
      return false;
    }

    this.story.trigger('begin_ritual');
    this.eventBus.emit('ritualStarted');
    return true;
  }

  collectRitualItem(itemId, itemName) {
    if (this.player.hasItem(itemId)) return false;

    this.player.addItem(itemId);
    this.story.findRitualItem(itemId);
    this.eventBus.emit('ritualItemCollected', { id: itemId, name: itemName });
    this.eventBus.emit('showSubtitle', `Found: ${itemName}`);
    return true;
  }

  collectKey(keyId, keyName) {
    if (this.player.hasItem(keyId)) return false;

    this.player.addItem(keyId);
    this.eventBus.emit('keyCollected', { id: keyId, name: keyName });
    this.eventBus.emit('showSubtitle', `Found: ${keyName}`);
    return true;
  }

  collectNote(noteId) {
    if (this.story.hasFoundNote(noteId)) return false;

    this.story.findNote(noteId);
    this.eventBus.emit('noteCollected', noteId);
    return true;
  }

  isPuzzleSolved(puzzleId) {
    return this.solvedPuzzles.has(puzzleId);
  }

  isRitualItemPlaced(itemId) {
    return this.ritualItemsPlaced.has(itemId);
  }

  isRitualComplete() {
    return this.ritualItemsPlaced.size >= 5;
  }

  isPowerRestored() {
    return this.powerRestored;
  }

  _checkPowerState() {
    if (this.powerRestored && !this.story.hasTriggered('restore_power')) {
      this.story.trigger('restore_power');
    }
  }

  _checkRitualState() {
    if (this.isRitualComplete() && !this.story.hasTriggered('find_all_ritual_items')) {
      this.story.trigger('find_all_ritual_items');
    }
  }

  getGameState() {
    return {
      solvedPuzzles: Array.from(this.solvedPuzzles),
      ritualItemsPlaced: Array.from(this.ritualItemsPlaced),
      breakerActivated: this.breakerActivated,
      powerRestored: this.powerRestored,
    };
  }

  loadGameState(state) {
    if (!state) return;
    this.solvedPuzzles = new Set(state.solvedPuzzles || []);
    this.ritualItemsPlaced = new Set(state.ritualItemsPlaced || []);
    this.breakerActivated = state.breakerActivated || false;
    this.powerRestored = state.powerRestored || false;
    this.world.powerOn = this.powerRestored;
  }

  reset() {
    this.solvedPuzzles.clear();
    this.ritualItemsPlaced.clear();
    this.breakerActivated = false;
    this.powerRestored = false;
  }
}

export const RITUAL_ITEMS = {
  ritual_item_1: { name: 'Ritual Dagger', location: 'Safe in Dr. Hale\'s Quarters' },
  ritual_item_2: { name: 'Silver Chalice', location: 'Dining Hall' },
  ritual_item_3: { name: 'Black Candle', location: 'Dormitory B' },
  ritual_item_4: { name: 'Ancient Book', location: 'Classroom' },
  ritual_item_5: { name: 'Iron Key', location: 'Infirmary' },
};

export const KEYS = {
  hale_key: { name: 'Hale\'s Office Key', location: 'Reception desk' },
  ritual_key: { name: 'Ritual Chamber Key', location: 'Boiler Room' },
  basement_key: { name: 'Basement Key', location: 'Kitchen cabinet' },
};
