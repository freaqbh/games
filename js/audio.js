import { CONFIG } from './config.js';

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.ambientGain = null;
    this.musicGain = null;
    this.foleyGain = null;
    this.entityGain = null;
    this.stingerGain = null;
    this.heartbeatGain = null;
    this.listener = null;
    this.initialized = false;
    this.musicState = 'calm';
    this.heartbeatInterval = null;
    this.heartbeatRate = 60;
    this.ambientNodes = [];
    this.entityNodes = [];
  }

  async init() {
    if (this.initialized) return;

    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.listener = this.ctx.listener;

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = CONFIG.audio.masterVolume;
    this.masterGain.connect(this.ctx.destination);

    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.value = CONFIG.audio.ambientGain;
    this.ambientGain.connect(this.masterGain);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = CONFIG.audio.musicGain;
    this.musicGain.connect(this.masterGain);

    this.foleyGain = this.ctx.createGain();
    this.foleyGain.gain.value = CONFIG.audio.foleyGain;
    this.foleyGain.connect(this.masterGain);

    this.entityGain = this.ctx.createGain();
    this.entityGain.gain.value = CONFIG.audio.entityGain;
    this.entityGain.connect(this.masterGain);

    this.stingerGain = this.ctx.createGain();
    this.stingerGain.gain.value = CONFIG.audio.stingerGain;
    this.stingerGain.connect(this.masterGain);

    this.heartbeatGain = this.ctx.createGain();
    this.heartbeatGain.gain.value = CONFIG.audio.heartbeatGain;
    this.heartbeatGain.connect(this.masterGain);

    this._startAmbient();
    this.initialized = true;
  }

  _startAmbient() {
    this._createWindAmbient();
    this._createDroneAmbient();
    this._createCreakAmbient();
  }

  _createWindAmbient() {
    const bufferSize = 2 * this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    const gain = this.ctx.createGain();
    gain.gain.value = 0.15;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ambientGain);
    noise.start();

    this.ambientNodes.push(noise, filter, gain);

    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.1;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 100;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();
    this.ambientNodes.push(lfo, lfoGain);
  }

  _createDroneAmbient() {
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = 55;

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 57;

    const gain = this.ctx.createGain();
    gain.gain.value = 0.08;

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ambientGain);

    osc1.start();
    osc2.start();

    this.ambientNodes.push(osc1, osc2, gain);
  }

  _createCreakAmbient() {
    const playCreak = () => {
      if (!this.initialized) return;

      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = 80 + Math.random() * 40;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 200 + Math.random() * 100;
      filter.Q.value = 8;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.1, this.ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ambientGain);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.3);

      setTimeout(playCreak, 5000 + Math.random() * 10000);
    };

    setTimeout(playCreak, 3000);
  }

  setListenerPosition(position, forward, up) {
    if (!this.initialized) return;
    this.listener.positionX.value = position.x;
    this.listener.positionY.value = position.y;
    this.listener.positionZ.value = position.z;
    this.listener.forwardX.value = forward.x;
    this.listener.forwardY.value = forward.y;
    this.listener.forwardZ.value = forward.z;
    this.listener.upX.value = up.x;
    this.listener.upY.value = up.y;
    this.listener.upZ.value = up.z;
  }

  playFootstep(surface = 'wood') {
    if (!this.initialized) return;

    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.1, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / this.ctx.sampleRate;
      const env = Math.exp(-t * 30);
      data[i] = (Math.random() * 2 - 1) * env;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = surface === 'wood' ? 800 : 1200;

    const gain = this.ctx.createGain();
    gain.gain.value = 0.3;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.foleyGain);

    source.start();
  }

  playDoorCreak() {
    if (!this.initialized) return;

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 100;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 300;
    filter.Q.value = 10;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, this.ctx.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.8);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.foleyGain);

    osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.8);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.8);
  }

  playItemPickup() {
    if (!this.initialized) return;

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 800;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(this.foleyGain);

    osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.1);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  playEntityFootstep(position) {
    if (!this.initialized) return;

    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.15, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / this.ctx.sampleRate;
      const env = Math.exp(-t * 20);
      data[i] = (Math.random() * 2 - 1) * env * 0.5;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 600;

    const panner = this.ctx.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = CONFIG.audio.refDistance;
    panner.maxDistance = CONFIG.audio.maxDistance;
    panner.rolloffFactor = CONFIG.audio.rolloff;
    panner.positionX.value = position.x;
    panner.positionY.value = position.y;
    panner.positionZ.value = position.z;

    const gain = this.ctx.createGain();
    gain.gain.value = 0.4;

    source.connect(filter);
    filter.connect(panner);
    panner.connect(gain);
    gain.connect(this.entityGain);

    source.start();
  }

  playEntityBreathing(position) {
    if (!this.initialized) return;

    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const t = i / this.ctx.sampleRate;
      const breath = Math.sin(t * Math.PI * 0.5) * 0.5 + 0.5;
      data[i] = (Math.random() * 2 - 1) * breath * 0.3;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 400;
    filter.Q.value = 2;

    const panner = this.ctx.createPanner();
    panner.panningModel = 'HRTF';
    panner.positionX.value = position.x;
    panner.positionY.value = position.y;
    panner.positionZ.value = position.z;

    const gain = this.ctx.createGain();
    gain.gain.value = 0.3;

    source.connect(filter);
    filter.connect(panner);
    panner.connect(gain);
    gain.connect(this.entityGain);

    source.start();
    source.stop(this.ctx.currentTime + 2);
  }

  playEntityGrowl(position) {
    if (!this.initialized) return;

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 60;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200;

    const panner = this.ctx.createPanner();
    panner.panningModel = 'HRTF';
    panner.positionX.value = position.x;
    panner.positionY.value = position.y;
    panner.positionZ.value = position.z;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.4, this.ctx.currentTime + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.5);

    osc.connect(filter);
    filter.connect(panner);
    panner.connect(gain);
    gain.connect(this.entityGain);

    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 1.5);

    osc.start();
    osc.stop(this.ctx.currentTime + 1.5);
  }

  playWhisper(position, text = '') {
    if (!this.initialized) return;

    const bufferSize = this.ctx.sampleRate * 1.5;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const t = i / this.ctx.sampleRate;
      const env = Math.sin(t * Math.PI / 1.5);
      data[i] = (Math.random() * 2 - 1) * env * 0.2;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2000;
    filter.Q.value = 5;

    const panner = this.ctx.createPanner();
    panner.panningModel = 'HRTF';
    panner.positionX.value = position.x;
    panner.positionY.value = position.y;
    panner.positionZ.value = position.z;

    const gain = this.ctx.createGain();
    gain.gain.value = 0.25;

    source.connect(filter);
    filter.connect(panner);
    panner.connect(gain);
    gain.connect(this.entityGain);

    source.start();
  }

  playJumpscareStinger() {
    if (!this.initialized) return;

    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.value = 100;

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'square';
    osc2.frequency.value = 150;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.6, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.8);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.stingerGain);

    osc1.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.8);
    osc2.frequency.exponentialRampToValueAtTime(75, this.ctx.currentTime + 0.8);

    osc1.start();
    osc2.start();
    osc1.stop(this.ctx.currentTime + 0.8);
    osc2.stop(this.ctx.currentTime + 0.8);
  }

  playHeartbeat(rate = 60) {
    if (!this.initialized) return;

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatRate = rate;
    const interval = 60000 / rate;

    this.heartbeatInterval = setInterval(() => {
      this._playHeartbeatBeat();
    }, interval);
  }

  _playHeartbeatBeat() {
    if (!this.initialized) return;

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 60;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(this.heartbeatGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);

    setTimeout(() => {
      const osc2 = this.ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.value = 50;

      const gain2 = this.ctx.createGain();
      gain2.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);

      osc2.connect(gain2);
      gain2.connect(this.heartbeatGain);

      osc2.start();
      osc2.stop(this.ctx.currentTime + 0.1);
    }, 100);
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  setMusicState(state) {
    if (this.musicState === state) return;
    this.musicState = state;

    if (state === 'chase') {
      this._startChaseMusic();
    } else if (state === 'tense') {
      this._startTenseMusic();
    } else {
      this._stopMusic();
    }
  }

  _startChaseMusic() {
    this._stopMusic();

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 80;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 300;

    const gain = this.ctx.createGain();
    gain.gain.value = 0.25;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start();

    this.musicNodes = [osc, filter, gain];
  }

  _startTenseMusic() {
    this._stopMusic();

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 110;

    const gain = this.ctx.createGain();
    gain.gain.value = 0.15;

    osc.connect(gain);
    gain.connect(this.musicGain);

    osc.start();

    this.musicNodes = [osc, gain];
  }

  _stopMusic() {
    if (this.musicNodes) {
      for (const node of this.musicNodes) {
        if (node.stop) node.stop();
        node.disconnect();
      }
      this.musicNodes = null;
    }
  }

  setMasterVolume(volume) {
    if (this.masterGain) {
      this.masterGain.gain.value = volume;
    }
  }

  dispose() {
    this.stopHeartbeat();
    this._stopMusic();

    for (const node of this.ambientNodes) {
      if (node.stop) node.stop();
      node.disconnect();
    }

    if (this.ctx) {
      this.ctx.close();
    }

    this.initialized = false;
  }
}
