import * as THREE from 'three';

// ===== SEEDED RANDOM NUMBER GENERATOR =====
export class SeededRandom {
  constructor(seed = Date.now()) {
    this.seed = seed;
    this.state = seed;
  }
  next() {
    this.state = (this.state * 1664525 + 1013904223) % 4294967296;
    return this.state / 4294967296;
  }
  range(min, max) { return min + this.next() * (max - min); }
  int(min, max) { return Math.floor(this.range(min, max + 1)); }
  bool(chance = 0.5) { return this.next() < chance; }
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
  shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  gauss(mean = 0, std = 1) {
    const u1 = this.next() || 0.0001;
    const u2 = this.next();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z * std;
  }
}

// ===== MATH UTILITIES =====
export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const inverseLerp = (a, b, v) => (v - a) / (b - a);
export const remap = (v, inMin, inMax, outMin, outMax) =>
  lerp(outMin, outMax, clamp(inverseLerp(inMin, inMax, v), 0, 1));
export const smoothstep = (edge0, edge1, x) => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};
export const damp = (current, target, lambda, dt) =>
  lerp(current, target, 1 - Math.exp(-lambda * dt));
export const mod = (a, b) => ((a % b) + b) % b;
export const deg2rad = (d) => (d * Math.PI) / 180;
export const rad2deg = (r) => (r * 180) / Math.PI;

// ===== VECTOR UTILITIES =====
export const vec3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const dist2D = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export const dist3D = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
export const angleBetween = (a, b) => Math.atan2(b.z - a.z, b.x - a.x);
export const lerpVec3 = (a, b, t) =>
  new THREE.Vector3(lerp(a.x, b.x, t), lerp(a.y, b.y, t), lerp(a.z, b.z, t));

// ===== ANGLE UTILITIES =====
export const angleDiff = (a, b) => {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
};
export const lerpAngle = (a, b, t) => a + angleDiff(a, b) * t;
export const rotateTowards = (current, target, maxDelta) => {
  const diff = angleDiff(current, target);
  if (Math.abs(diff) <= maxDelta) return target;
  return current + Math.sign(diff) * maxDelta;
};

// ===== PERLIN NOISE (2D) =====
const perm = new Uint8Array(512);
(() => {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
})();
const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const grad = (hash, x, y) => {
  const h = hash & 7;
  const u = h < 4 ? x : y;
  const v = h < 4 ? y : x;
  return ((h & 1) ? -u : u) + ((h & 2) ? -2 * v : 2 * v);
};
export const perlin2 = (x, y) => {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);
  const u = fade(xf);
  const v = fade(yf);
  const aa = perm[perm[X] + Y];
  const ab = perm[perm[X] + Y + 1];
  const ba = perm[perm[X + 1] + Y];
  const bb = perm[perm[X + 1] + Y + 1];
  const x1 = lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u);
  const x2 = lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u);
  return lerp(x1, x2, v);
};
export const fbm = (x, y, octaves = 4, lacunarity = 2, gain = 0.5) => {
  let sum = 0, amp = 1, freq = 1, max = 0;
  for (let i = 0; i < octaves; i++) {
    sum += perlin2(x * freq, y * freq) * amp;
    max += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / max;
};

// ===== AABB COLLISION =====
export class AABB {
  constructor(min, max) {
    this.min = min.clone();
    this.max = max.clone();
  }
  contains(point) {
    return point.x >= this.min.x && point.x <= this.max.x &&
      point.y >= this.min.y && point.y <= this.max.y &&
      point.z >= this.min.z && point.z <= this.max.z;
  }
  intersects(other) {
    return this.min.x <= other.max.x && this.max.x >= other.min.x &&
      this.min.y <= other.max.y && this.max.y >= other.min.y &&
      this.min.z <= other.max.z && this.max.z >= other.min.z;
  }
  expand(amount) {
    return new AABB(
      new THREE.Vector3(this.min.x - amount, this.min.y - amount, this.min.z - amount),
      new THREE.Vector3(this.max.x + amount, this.max.y + amount, this.max.z + amount)
    );
  }
  getCenter() {
    return new THREE.Vector3(
      (this.min.x + this.max.x) / 2,
      (this.min.y + this.max.y) / 2,
      (this.min.z + this.max.z) / 2
    );
  }
  getSize() {
    return new THREE.Vector3(
      this.max.x - this.min.x,
      this.max.y - this.min.y,
      this.max.z - this.min.z
    );
  }
}

// ===== GRID UTILITY (for room/pathfinding) =====
export class Grid {
  constructor(width, depth, cellSize = 1) {
    this.width = width;
    this.depth = depth;
    this.cellSize = cellSize;
    this.cells = new Uint8Array(width * depth); // 0 = walkable, 1 = blocked
  }
  index(x, z) { return z * this.width + x; }
  inBounds(x, z) { return x >= 0 && x < this.width && z >= 0 && z < this.depth; }
  isWalkable(x, z) { return this.inBounds(x, z) && this.cells[this.index(x, z)] === 0; }
  setBlocked(x, z, blocked = true) { if (this.inBounds(x, z)) this.cells[this.index(x, z)] = blocked ? 1 : 0; }
  worldToGrid(pos) {
    return {
      x: Math.floor(pos.x / this.cellSize),
      z: Math.floor(pos.z / this.cellSize),
    };
  }
  gridToWorld(x, z) {
    return new THREE.Vector3(
      (x + 0.5) * this.cellSize,
      0,
      (z + 0.5) * this.cellSize
    );
  }
}

// ===== A* PATHFINDING =====
export function findPath(grid, startX, startZ, endX, endZ) {
  if (!grid.inBounds(startX, startZ) || !grid.inBounds(endX, endZ)) return null;
  if (!grid.isWalkable(endX, endZ)) return null;

  const heuristic = (x1, z1, x2, z2) => Math.hypot(x1 - x2, z1 - z2);
  const open = [];
  const closed = new Set();
  const cameFrom = new Map();
  const gScore = new Map();
  const fScore = new Map();
  const startKey = `${startX},${startZ}`;
  const endKey = `${endX},${endZ}`;

  gScore.set(startKey, 0);
  fScore.set(startKey, heuristic(startX, startZ, endX, endZ));
  open.push({ x: startX, z: startZ, f: fScore.get(startKey) });

  let iterations = 0;
  const maxIter = 2000;

  while (open.length > 0 && iterations < maxIter) {
    iterations++;
    open.sort((a, b) => a.f - b.f);
    const current = open.shift();
    const currentKey = `${current.x},${current.z}`;

    if (currentKey === endKey) {
      const path = [];
      let key = currentKey;
      while (key) {
        const [px, pz] = key.split(',').map(Number);
        path.unshift({ x: px, z: pz });
        key = cameFrom.get(key);
      }
      return path;
    }

    closed.add(currentKey);

    const neighbors = [
      { x: current.x + 1, z: current.z }, { x: current.x - 1, z: current.z },
      { x: current.x, z: current.z + 1 }, { x: current.x, z: current.z - 1 },
      { x: current.x + 1, z: current.z + 1 }, { x: current.x - 1, z: current.z - 1 },
      { x: current.x + 1, z: current.z - 1 }, { x: current.x - 1, z: current.z + 1 },
    ];

    for (const n of neighbors) {
      if (!grid.inBounds(n.x, n.z) || !grid.isWalkable(n.x, n.z)) continue;
      const nKey = `${n.x},${n.z}`;
      if (closed.has(nKey)) continue;

      // Prevent diagonal corner cutting
      if (n.x !== current.x && n.z !== current.z) {
        if (!grid.isWalkable(current.x, n.z) || !grid.isWalkable(n.x, current.z)) continue;
      }

      const isDiagonal = n.x !== current.x && n.z !== current.z;
      const moveCost = isDiagonal ? 1.414 : 1;
      const tentativeG = gScore.get(currentKey) + moveCost;

      if (!gScore.has(nKey) || tentativeG < gScore.get(nKey)) {
        cameFrom.set(nKey, currentKey);
        gScore.set(nKey, tentativeG);
        const f = tentativeG + heuristic(n.x, n.z, endX, endZ);
        fScore.set(nKey, f);
        const existing = open.find(o => o.x === n.x && o.z === n.z);
        if (existing) {
          existing.f = f;
        } else {
          open.push({ x: n.x, z: n.z, f });
        }
      }
    }
  }
  return null;
}

// ===== TIMER =====
export class Timer {
  constructor(duration = 0, autoStart = false) {
    this.duration = duration;
    this.elapsed = 0;
    this.running = autoStart;
  }
  start(duration) {
    if (duration !== undefined) this.duration = duration;
    this.elapsed = 0;
    this.running = true;
  }
  update(dt) {
    if (!this.running) return false;
    this.elapsed += dt;
    if (this.elapsed >= this.duration) {
      this.running = false;
      return true;
    }
    return false;
  }
  get progress() { return clamp(this.elapsed / this.duration, 0, 1); }
  get remaining() { return Math.max(0, this.duration - this.elapsed); }
  get isDone() { return !this.running && this.elapsed >= this.duration; }
  stop() { this.running = false; }
  reset() { this.elapsed = 0; this.running = false; }
}

// ===== EVENT SYSTEM =====
export class EventBus {
  constructor() { this.listeners = new Map(); }
  on(event, callback) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event).push(callback);
    return () => this.off(event, callback);
  }
  off(event, callback) {
    const arr = this.listeners.get(event);
    if (arr) {
      const idx = arr.indexOf(callback);
      if (idx >= 0) arr.splice(idx, 1);
    }
  }
  emit(event, ...args) {
    const arr = this.listeners.get(event);
    if (arr) for (const cb of [...arr]) cb(...args);
  }
}

// ===== STATE MACHINE =====
export class StateMachine {
  constructor(initialState, states = {}) {
    this.currentState = initialState;
    this.states = states;
    this.stateData = {};
    this.timeInState = 0;
  }
  addState(name, config) { this.states[name] = config; }
  changeState(newState, data = {}) {
    if (this.currentState === newState) return;
    if (this.states[this.currentState]?.onExit) {
      this.states[this.currentState].onExit(this.stateData);
    }
    this.currentState = newState;
    this.stateData = data;
    this.timeInState = 0;
    if (this.states[newState]?.onEnter) {
      this.states[newState].onEnter(this.stateData);
    }
  }
  update(dt, context) {
    this.timeInState += dt;
    if (this.states[this.currentState]?.onUpdate) {
      this.states[this.currentState].onUpdate(dt, this.stateData, context);
    }
  }
}

// ===== DEBOUNCE =====
export const debounce = (fn, delay) => {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

// ===== COLOR UTILITIES =====
export const hexToRgb = (hex) => ({
  r: (hex >> 16) & 255,
  g: (hex >> 8) & 255,
  b: hex & 255,
});
export const mixColors = (c1, c2, t) => {
  const a = hexToRgb(c1);
  const b = hexToRgb(c2);
  return ((Math.round(lerp(a.r, b.r, t)) << 16) |
    (Math.round(lerp(a.g, b.g, t)) << 8) |
    Math.round(lerp(a.b, b.b, t)));
};

// ===== FORMAT HELPERS =====
export const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

// ===== HSL TO RGB for color manipulation =====
export function hslToHex(h, s, l) {
  h /= 360; s /= 100; l /= 100;
  let r, g, b;
  if (s === 0) { r = g = b = l; }
  else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return (Math.round(r * 255) << 16) | (Math.round(g * 255) << 8) | Math.round(b * 255);
}
