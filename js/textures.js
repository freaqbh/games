import * as THREE from 'three';
import { SeededRandom, fbm, clamp, lerp } from './utils.js';

// ============================================================
// PROCEDURAL TEXTURE GENERATION
// All textures are generated via Canvas 2D API — no external assets
// ============================================================

const TEX_SIZE = 512;

function createCanvas(size = TEX_SIZE) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  return canvas;
}

function canvasToTexture(canvas, repeatX = 1, repeatY = 1) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = 8;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// ===== DAMAGED PLASTER WALL =====
export function makeWallPlaster(seed = 1) {
  const rng = new SeededRandom(seed);
  const canvas = createCanvas();
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  const img = ctx.createImageData(size, size);
  const d = img.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const n = fbm(x * 0.015, y * 0.015, 5, 2, 0.55);
      const baseGray = 95 + n * 40;
      const noise = (rng.next() - 0.5) * 20;

      // Mold patches
      const mold = fbm(x * 0.008 + 50, y * 0.008 + 50, 4);
      const moldFactor = clamp(mold * 1.5 + 0.3, 0, 1);

      // Cracks
      const crack = fbm(x * 0.05, y * 0.05, 3) > 0.35 && fbm(x * 0.1, y * 0.1, 2) > 0.3 ? 1 : 0;

      let r = baseGray + noise;
      let g = baseGray * 0.96 + noise;
      let b = baseGray * 0.92 + noise;

      if (moldFactor > 0.55) {
        const m = (moldFactor - 0.55) * 2.2;
        r = lerp(r, r * 0.45, m);
        g = lerp(g, g * 0.52, m);
        b = lerp(b, b * 0.38, m);
      }

      if (crack) { r *= 0.3; g *= 0.3; b *= 0.3; }

      // Water stains near bottom
      const waterLine = (y / size) > 0.7;
      if (waterLine) {
        const wp = (y / size - 0.7) / 0.3;
        const wn = fbm(x * 0.01, y * 0.01, 4);
        if (wn > 0.1) {
          r = lerp(r, r * 0.6, wp * 0.7);
          g = lerp(g, g * 0.55, wp * 0.7);
          b = lerp(b, b * 0.45, wp * 0.7);
        }
      }

      d[i] = clamp(r, 0, 255);
      d[i+1] = clamp(g, 0, 255);
      d[i+2] = clamp(b, 0, 255);
      d[i+3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  // Add peeling paint patches
  for (let i = 0; i < 8; i++) {
    const px = rng.range(0, size);
    const py = rng.range(0, size);
    const w = rng.range(40, 120);
    const h = rng.range(30, 80);
    ctx.fillStyle = `rgba(${rng.int(70,100)}, ${rng.int(65,90)}, ${rng.int(55,75)}, ${rng.range(0.15, 0.35)})`;
    ctx.beginPath();
    ctx.ellipse(px, py, w, h, rng.range(0, Math.PI), 0, Math.PI * 2);
    ctx.fill();
  }

  return canvasToTexture(canvas, 2, 1);
}

// ===== WOODEN FLOORBOARDS =====
export function makeFloorWood(seed = 2) {
  const rng = new SeededRandom(seed);
  const canvas = createCanvas();
  const ctx = canvas.getContext('2d');
  const size = canvas.width;

  ctx.fillStyle = '#3a2a1a';
  ctx.fillRect(0, 0, size, size);

  const plankCount = 7;
  const plankH = size / plankCount;

  for (let p = 0; p < plankCount; p++) {
    const y = p * plankH;
    const baseR = rng.int(45, 70);
    const baseG = rng.int(30, 48);
    const baseB = rng.int(18, 30);
    ctx.fillStyle = `rgb(${baseR},${baseG},${baseB})`;
    ctx.fillRect(0, y, size, plankH);

    // Wood grain
    for (let i = 0; i < 60; i++) {
      const gx = rng.range(0, size);
      const gy = y + rng.range(2, plankH - 2);
      const len = rng.range(30, 150);
      const darkness = rng.range(0.3, 0.7);
      ctx.strokeStyle = `rgba(${Math.floor(baseR * darkness)},${Math.floor(baseG * darkness)},${Math.floor(baseB * darkness)},0.5)`;
      ctx.lineWidth = rng.range(0.5, 1.5);
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.bezierCurveTo(gx + len*0.3, gy + rng.range(-3,3), gx + len*0.6, gy + rng.range(-3,3), gx + len, gy);
      ctx.stroke();
    }

    // Gaps between planks
    ctx.fillStyle = '#15(8,4)';
    ctx.fillStyle = '#150804';
    ctx.fillRect(0, y, size, 2);

    // Random knots
    if (rng.bool(0.4)) {
      const kx = rng.range(20, size - 20);
      const ky = y + plankH * 0.5;
      const kr = rng.range(5, 12);
      const grad = ctx.createRadialGradient(kx, ky, 0, kx, ky, kr);
      grad.addColorStop(0, `rgb(${Math.floor(baseR*0.3)},${Math.floor(baseG*0.3)},${Math.floor(baseB*0.3)})`);
      grad.addColorStop(1, `rgba(${baseR},${baseG},${baseB},0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(kx, ky, kr, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Dust and grime overlay
  for (let i = 0; i < 300; i++) {
    const x = rng.range(0, size);
    const y = rng.range(0, size);
    ctx.fillStyle = `rgba(40,35,25,${rng.range(0.05, 0.15)})`;
    ctx.fillRect(x, y, rng.range(1,4), rng.range(1,4));
  }

  // Scuff marks
  for (let i = 0; i < 12; i++) {
    const x = rng.range(0, size);
    const y = rng.range(0, size);
    ctx.strokeStyle = `rgba(20,15,10,${rng.range(0.1,0.3)})`;
    ctx.lineWidth = rng.range(1, 3);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + rng.range(-30,30), y + rng.range(-15,15));
    ctx.stroke();
  }

  return canvasToTexture(canvas, 3, 3);
}

// ===== CRACKED TILES =====
export function makeFloorTiles(seed = 3) {
  const rng = new SeededRandom(seed);
  const canvas = createCanvas();
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  const tileSize = 64;
  const count = size / tileSize;

  for (let ty = 0; ty < count; ty++) {
    for (let tx = 0; tx < count; tx++) {
      const x = tx * tileSize;
      const y = ty * tileSize;
      const shade = rng.int(55, 80);
      ctx.fillStyle = `rgb(${shade},${shade+3},${shade+1})`;
      ctx.fillRect(x, y, tileSize, tileSize);

      // Grout
      ctx.fillStyle = '#1a1a18';
      ctx.fillRect(x, y, tileSize, 2);
      ctx.fillRect(x, y, 2, tileSize);

      // Stains
      if (rng.bool(0.3)) {
        ctx.fillStyle = `rgba(40,30,20,${rng.range(0.1,0.3)})`;
        ctx.beginPath();
        ctx.arc(x + rng.range(5, tileSize-5), y + rng.range(5, tileSize-5),
                rng.range(3, 12), 0, Math.PI*2);
        ctx.fill();
      }

      // Cracks
      if (rng.bool(0.2)) {
        ctx.strokeStyle = `rgba(20,15,10,0.6)`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        const sx = x + rng.range(5, tileSize-5);
        const sy = y + rng.range(5, tileSize-5);
        ctx.moveTo(sx, sy);
        for (let s = 0; s < 3; s++) {
          ctx.lineTo(sx + rng.range(-15,15), sy + rng.range(-15,15));
        }
        ctx.stroke();
      }

      // Missing tile piece
      if (rng.bool(0.08)) {
        ctx.fillStyle = '#0a0808';
        ctx.beginPath();
        ctx.arc(x + rng.range(10, tileSize-10), y + rng.range(10, tileSize-10),
                rng.range(4, 10), 0, Math.PI*2);
        ctx.fill();
      }
    }
  }

  // Grime overlay
  for (let i = 0; i < 200; i++) {
    ctx.fillStyle = `rgba(30,25,15,${rng.range(0.03,0.1)})`;
    ctx.fillRect(rng.range(0,size), rng.range(0,size), rng.range(2,6), rng.range(2,6));
  }

  return canvasToTexture(canvas, 2, 2);
}

// ===== CEILING =====
export function makeCeiling(seed = 4) {
  const rng = new SeededRandom(seed);
  const canvas = createCanvas();
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  const img = ctx.createImageData(size, size);
  const d = img.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const n = fbm(x * 0.02, y * 0.02, 5);
      const base = 70 + n * 30 + (rng.next() - 0.5) * 15;

      // Water stains
      const stain1 = fbm(x * 0.006 + 100, y * 0.006 + 100, 4);
      const stain2 = fbm(x * 0.01 + 200, y * 0.01 + 200, 3);
      let r = base, g = base * 0.97, b = base * 0.93;

      if (stain1 > 0.2) {
        const s = (stain1 - 0.2) * 1.8;
        r = lerp(r, r * 0.5, s);
        g = lerp(g, g * 0.45, s);
        b = lerp(b, b * 0.38, s);
      }
      if (stain2 > 0.3) {
        const s = (stain2 - 0.3) * 1.5;
        r = lerp(r, r * 0.6, s * 0.5);
        g = lerp(g, g * 0.55, s * 0.5);
      }

      d[i] = clamp(r, 0, 255);
      d[i+1] = clamp(g, 0, 255);
      d[i+2] = clamp(b, 0, 255);
      d[i+3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  // Cracks
  for (let i = 0; i < 15; i++) {
    ctx.strokeStyle = `rgba(15,12,8,${rng.range(0.3,0.6)})`;
    ctx.lineWidth = rng.range(0.5, 1.5);
    ctx.beginPath();
    let x = rng.range(0, size);
    let y = rng.range(0, size);
    ctx.moveTo(x, y);
    for (let s = 0; s < rng.int(4, 10); s++) {
      x += rng.range(-30, 30);
      y += rng.range(-30, 30);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  return canvasToTexture(canvas, 2, 2);
}

// ===== BLOOD STAIN (overlay) =====
export function makeBloodStain(seed = 5) {
  const rng = new SeededRandom(seed);
  const canvas = createCanvas(256);
  const ctx = canvas.getContext('2d');
  const size = canvas.width;

  ctx.clearRect(0, 0, size, size);

  // Main splatter
  const cx = rng.range(60, size-60);
  const cy = rng.range(60, size-60);

  for (let i = 0; i < 5; i++) {
    const r = rng.range(30, 70);
    const x = cx + rng.range(-20, 20);
    const y = cy + rng.range(-20, 20);
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `rgba(${rng.int(60,90)},0,0,0.85)`);
    grad.addColorStop(0.6, `rgba(${rng.int(40,60)},0,0,0.5)`);
    grad.addColorStop(1, 'rgba(30,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI*2);
    ctx.fill();
  }

  // Droplets
  for (let i = 0; i < 30; i++) {
    const angle = rng.range(0, Math.PI*2);
    const dist = rng.range(20, 100);
    const x = cx + Math.cos(angle) * dist;
    const y = cy + Math.sin(angle) * dist;
    const r = rng.range(2, 8);
    ctx.fillStyle = `rgba(${rng.int(50,80)},0,0,${rng.range(0.4,0.8)})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI*2);
    ctx.fill();
  }

  // Smears
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = `rgba(${rng.int(50,70)},5,5,${rng.range(0.3,0.5)})`;
    ctx.lineWidth = rng.range(3, 8);
    ctx.beginPath();
    const sx = cx + rng.range(-30,30);
    const sy = cy + rng.range(-30,30);
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + rng.range(-50,50), sy + rng.range(20,80));
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ===== CHILDREN'S DRAWING =====
export function makeChildDrawing(seed = 6, variant = 0) {
  const rng = new SeededRandom(seed + variant * 100);
  const canvas = createCanvas(384);
  const ctx = canvas.getContext('2d');
  const size = canvas.width;

  // Aged paper background
  ctx.fillStyle = '#c9b88f';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 200; i++) {
    ctx.fillStyle = `rgba(${rng.int(100,140)},${rng.int(80,110)},${rng.int(50,70)},${rng.range(0.05,0.15)})`;
    ctx.fillRect(rng.range(0,size), rng.range(0,size), rng.range(2,8), rng.range(2,8));
  }
  // Torn edges
  ctx.strokeStyle = '#8a7a55';
  ctx.lineWidth = 2;
  ctx.strokeRect(5, 5, size-10, size-10);

  ctx.strokeStyle = '#2a1a10';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';

  const cx = size / 2;
  const cy = size / 2;

  if (variant === 0) {
    // Stick figure family with a dark figure
    const figures = [
      { x: cx - 90, y: cy + 30, color: '#2a1a10', h: 70 },
      { x: cx - 30, y: cy + 30, color: '#2a1a10', h: 60 },
      { x: cx + 30, y: cy + 30, color: '#2a1a10', h: 55 },
      { x: cx + 100, y: cy + 30, color: '#1a0a0a', h: 90 }, // Tall dark figure
    ];
    for (const f of figures) {
      ctx.strokeStyle = f.color;
      // Head
      ctx.beginPath();
      ctx.arc(f.x, f.y - f.h, f.h * 0.2, 0, Math.PI*2);
      ctx.stroke();
      // For the dark figure, fill the head solid
      if (f.color === '#1a0a0a') {
        ctx.fillStyle = '#1a0a0a';
        ctx.fill();
      }
      // Body
      ctx.beginPath();
      ctx.moveTo(f.x, f.y - f.h * 0.8);
      ctx.lineTo(f.x, f.y - f.h * 0.3);
      ctx.stroke();
      // Arms
      ctx.beginPath();
      ctx.moveTo(f.x - f.h*0.3, f.y - f.h * 0.55);
      ctx.lineTo(f.x + f.h*0.3, f.y - f.h * 0.55);
      ctx.stroke();
      // Legs
      ctx.beginPath();
      ctx.moveTo(f.x, f.y - f.h * 0.3);
      ctx.lineTo(f.x - f.h*0.2, f.y);
      ctx.moveTo(f.x, f.y - f.h * 0.3);
      ctx.lineTo(f.x + f.h*0.2, f.y);
      ctx.stroke();
      // Long arms for dark figure
      if (f.color === '#1a0a0a') {
        ctx.beginPath();
        ctx.moveTo(f.x - f.h*0.3, f.y - f.h * 0.55);
        ctx.lineTo(f.x - f.h*0.6, f.y + 5);
        ctx.moveTo(f.x + f.h*0.3, f.y - f.h * 0.55);
        ctx.lineTo(f.x + f.h*0.6, f.y + 5);
        ctx.stroke();
      }
    }
    // Scribbled "HELP" at top
    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#3a1a0a';
    ctx.fillText('HELP', cx - 25, 50);
  } else if (variant === 1) {
    // House with dark windows
    ctx.strokeStyle = '#2a1a10';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.rect(cx - 80, cy - 30, 160, 100);
    ctx.moveTo(cx - 80, cy - 30);
    ctx.lineTo(cx, cy - 90);
    ctx.lineTo(cx + 80, cy - 30);
    ctx.stroke();
    // Windows (dark/ominous)
    ctx.fillStyle = '#0a0500';
    ctx.fillRect(cx - 50, cy - 10, 35, 35);
    ctx.fillRect(cx + 15, cy - 10, 35, 35);
    // Eyes in windows
    ctx.fillStyle = '#c9b88f';
    ctx.beginPath();
    ctx.arc(cx - 38, cy + 5, 3, 0, Math.PI*2);
    ctx.arc(cx + 32, cy + 5, 3, 0, Math.PI*2);
    ctx.fill();
    // Door
    ctx.fillStyle = '#1a0a00';
    ctx.fillRect(cx - 12, cy + 20, 24, 50);
    // Scribbles around
    ctx.strokeStyle = '#5a2a0a';
    ctx.lineWidth = 1;
    for (let i = 0; i < 15; i++) {
      ctx.beginPath();
      const x = rng.range(20, size-20);
      const y = rng.range(20, size-20);
      ctx.moveTo(x, y);
      for (let s = 0; s < 4; s++) {
        ctx.lineTo(x + rng.range(-15,15), y + rng.range(-15,15));
      }
      ctx.stroke();
    }
  } else {
    // Repeating figure getting closer
    ctx.strokeStyle = '#2a1a10';
    for (let i = 0; i < 5; i++) {
      const scale = 0.3 + i * 0.18;
      const x = 50 + i * 65;
      const y = size - 40;
      const h = 40 * scale;
      ctx.lineWidth = 1 + i * 0.5;
      ctx.beginPath();
      ctx.arc(x, y - h, h * 0.3, 0, Math.PI*2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y - h*0.7);
      ctx.lineTo(x, y - h*0.2);
      ctx.moveTo(x - h*0.3, y - h*0.5);
      ctx.lineTo(x + h*0.3, y - h*0.5);
      ctx.moveTo(x, y - h*0.2);
      ctx.lineTo(x - h*0.2, y);
      ctx.moveTo(x, y - h*0.2);
      ctx.lineTo(x + h*0.2, y);
      ctx.stroke();
    }
    // The last one is dark/red
    ctx.strokeStyle = '#5a0a0a';
    ctx.fillStyle = '#3a0000';
    ctx.lineWidth = 2.5;
    const x = size - 30;
    const y = size - 40;
    const h = 40;
    ctx.beginPath();
    ctx.arc(x, y - h, h * 0.3, 0, Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, y - h*0.7);
    ctx.lineTo(x, y - h*0.2);
    ctx.moveTo(x - h*0.4, y - h*0.5);
    ctx.lineTo(x + h*0.4, y - h*0.5);
    ctx.moveTo(x, y - h*0.2);
    ctx.lineTo(x - h*0.25, y);
    ctx.moveTo(x, y - h*0.2);
    ctx.lineTo(x + h*0.25, y);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ===== RUST METAL =====
export function makeRustMetal(seed = 7) {
  const rng = new SeededRandom(seed);
  const canvas = createCanvas();
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  const img = ctx.createImageData(size, size);
  const d = img.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const n = fbm(x * 0.03, y * 0.03, 5, 2.2, 0.55);
      const rust = fbm(x * 0.015 + 30, y * 0.015 + 30, 4);
      const noise = (rng.next() - 0.5) * 15;

      let r = 70 + n * 30 + noise;
      let g = 65 + n * 25 + noise;
      let b = 60 + n * 20 + noise;

      if (rust > 0.1) {
        const rF = clamp((rust - 0.1) * 2, 0, 1);
        r = lerp(r, 110, rF * 0.6);
        g = lerp(g, 55, rF * 0.6);
        b = lerp(b, 25, rF * 0.6);
      }
      if (rust > 0.35) {
        const rF = clamp((rust - 0.35) * 2.5, 0, 1);
        r = lerp(r, 140, rF * 0.5);
        g = lerp(g, 65, rF * 0.5);
        b = lerp(b, 30, rF * 0.5);
      }

      d[i] = clamp(r, 0, 255);
      d[i+1] = clamp(g, 0, 255);
      d[i+2] = clamp(b, 0, 255);
      d[i+3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvasToTexture(canvas, 1, 1);
}

// ===== WALLPAPER (faded Victorian) =====
export function makeWallpaper(seed = 8) {
  const rng = new SeededRandom(seed);
  const canvas = createCanvas();
  const ctx = canvas.getContext('2d');
  const size = canvas.width;

  // Base color - faded
  ctx.fillStyle = '#4a4038';
  ctx.fillRect(0, 0, size, size);

  // Damask pattern
  const patternSize = 128;
  for (let py = 0; py < size; py += patternSize) {
    for (let px = 0; px < size; px += patternSize) {
      ctx.save();
      ctx.translate(px + patternSize/2, py + patternSize/2);
      ctx.strokeStyle = `rgba(70,55,40,0.4)`;
      ctx.lineWidth = 1.5;
      // Floral motif
      for (let a = 0; a < 4; a++) {
        ctx.save();
        ctx.rotate(a * Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(15, -10, 30, 0);
        ctx.quadraticCurveTo(15, 10, 0, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(25, 0, 4, 0, Math.PI*2);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }
  }

  // Peeling and water damage
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const damage = fbm(x * 0.008, y * 0.008, 4);
      if (damage > 0.15) {
        const f = clamp((damage - 0.15) * 1.5, 0, 1);
        d[i] = lerp(d[i], d[i] * 0.4, f);
        d[i+1] = lerp(d[i+1], d[i+1] * 0.38, f);
        d[i+2] = lerp(d[i+2], d[i+2] * 0.35, f);
      }
      // Noise
      const n = (rng.next() - 0.5) * 12;
      d[i] = clamp(d[i] + n, 0, 255);
      d[i+1] = clamp(d[i+1] + n, 0, 255);
      d[i+2] = clamp(d[i+2] + n, 0, 255);
    }
  }
  ctx.putImageData(img, 0, 0);

  return canvasToTexture(canvas, 2, 1);
}

// ===== DOOR TEXTURE =====
export function makeDoorTexture(seed = 9) {
  const rng = new SeededRandom(seed);
  const canvas = createCanvas(256);
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  // Dark wood door
  ctx.fillStyle = '#2a1a0e';
  ctx.fillRect(0, 0, w, h);

  // Wood grain
  for (let i = 0; i < 100; i++) {
    const x = rng.range(0, w);
    ctx.strokeStyle = `rgba(${rng.int(20,40)},${rng.int(10,25)},${rng.int(5,12)},0.5)`;
    ctx.lineWidth = rng.range(0.5, 1.5);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + rng.range(-5,5), h*0.3, x + rng.range(-5,5), h*0.6, x + rng.range(-3,3), h);
    ctx.stroke();
  }

  // Panels
  ctx.strokeStyle = '#150a04';
  ctx.lineWidth = 3;
  for (let p = 0; p < 2; p++) {
    const py = 30 + p * 110;
    ctx.strokeRect(20, py, w - 40, 90);
  }

  // Peeling paint
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = `rgba(${rng.int(60,90)},${rng.int(55,75)},${rng.int(45,60)},${rng.range(0.1,0.25)})`;
    ctx.beginPath();
    ctx.ellipse(rng.range(0,w), rng.range(0,h), rng.range(20,50), rng.range(15,40), rng.range(0,Math.PI), 0, Math.PI*2);
    ctx.fill();
  }

  // Grime
  for (let i = 0; i < 100; i++) {
    ctx.fillStyle = `rgba(15,10,5,${rng.range(0.05,0.15)})`;
    ctx.fillRect(rng.range(0,w), rng.range(0,h), rng.range(2,5), rng.range(2,5));
  }

  return canvasToTexture(canvas, 1, 1);
}

// ===== CONCRETE (basement walls) =====
export function makeConcrete(seed = 10) {
  const rng = new SeededRandom(seed);
  const canvas = createCanvas();
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  const img = ctx.createImageData(size, size);
  const d = img.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const n = fbm(x * 0.025, y * 0.025, 5, 2, 0.55);
      const noise = (rng.next() - 0.5) * 18;
      const base = 55 + n * 35 + noise;

      // Moisture (darker lower)
      const moist = (y / size);
      let r = base * (1 - moist * 0.3);
      let g = base * 0.97 * (1 - moist * 0.32);
      let b = base * 0.93 * (1 - moist * 0.35);

      // Mold patches
      const mold = fbm(x * 0.006 + 200, y * 0.006 + 200, 4);
      if (mold > 0.2) {
        const m = (mold - 0.2) * 2;
        r = lerp(r, r * 0.4, m);
        g = lerp(g, g * 0.5, m);
        b = lerp(b, b * 0.35, m);
      }

      d[i] = clamp(r, 0, 255);
      d[i+1] = clamp(g, 0, 255);
      d[i+2] = clamp(b, 0, 255);
      d[i+3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  // Cracks
  for (let i = 0; i < 10; i++) {
    ctx.strokeStyle = `rgba(10,8,5,${rng.range(0.4,0.7)})`;
    ctx.lineWidth = rng.range(0.8, 2);
    ctx.beginPath();
    let x = rng.range(0, size), y = rng.range(0, size);
    ctx.moveTo(x, y);
    for (let s = 0; s < rng.int(3, 8); s++) {
      x += rng.range(-25, 25);
      y += rng.range(-25, 25);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  return canvasToTexture(canvas, 2, 1);
}

// ===== GRAVEYARD DIRT =====
export function makeDirt(seed = 11) {
  const rng = new SeededRandom(seed);
  const canvas = createCanvas();
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  const img = ctx.createImageData(size, size);
  const d = img.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const n = fbm(x * 0.04, y * 0.04, 5, 2.2, 0.6);
      const fine = fbm(x * 0.2, y * 0.2, 2);
      const noise = (rng.next() - 0.5) * 15;
      const base = 40 + n * 25 + fine * 10 + noise;
      d[i] = clamp(base * 0.9, 0, 255);
      d[i+1] = clamp(base * 0.7, 0, 255);
      d[i+2] = clamp(base * 0.5, 0, 255);
      d[i+3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  // Small stones
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(${rng.int(70,100)},${rng.int(65,90)},${rng.int(55,75)},0.7)`;
    ctx.beginPath();
    ctx.arc(rng.range(0,size), rng.range(0,size), rng.range(2,6), 0, Math.PI*2);
    ctx.fill();
  }

  return canvasToTexture(canvas, 3, 3);
}

// ===== NORMAL MAP GENERATOR (simple bump from heightmap) =====
export function generateNormalMap(heightCanvas, strength = 1) {
  const size = heightCanvas.width;
  const ctx = heightCanvas.getContext('2d');
  const src = ctx.getImageData(0, 0, size, size).data;
  const normalCanvas = createCanvas(size);
  const nctx = normalCanvas.getContext('2d');
  const out = nctx.createImageData(size, size);
  const d = out.data;

  const getHeight = (x, y) => {
    x = Math.max(0, Math.min(size-1, x));
    y = Math.max(0, Math.min(size-1, y));
    const i = (y * size + x) * 4;
    return (src[i] + src[i+1] + src[i+2]) / (3 * 255);
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const hx = getHeight(x+1, y) - getHeight(x-1, y);
      const hy = getHeight(x, y+1) - getHeight(x, y-1);
      d[i] = clamp(128 + hx * 255 * strength, 0, 255);
      d[i+1] = clamp(128 - hy * 255 * strength, 0, 255);
      d[i+2] = 255;
      d[i+3] = 255;
    }
  }
  nctx.putImageData(out, 0, 0);
  const tex = new THREE.CanvasTexture(normalCanvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// ===== TEXTURE CACHE / MANAGER =====
export class TextureManager {
  constructor() {
    this.textures = {};
    this.loaded = false;
  }

  loadAll() {
    this.textures.wallPlaster = makeWallPlaster(1);
    this.textures.wallPlaster2 = makeWallPlaster(42);
    this.textures.wallpaper = makeWallpaper(8);
    this.textures.concrete = makeConcrete(10);
    this.textures.floorWood = makeFloorWood(2);
    this.textures.floorTiles = makeFloorTiles(3);
    this.textures.ceiling = makeCeiling(4);
    this.textures.rustMetal = makeRustMetal(7);
    this.textures.dirt = makeDirt(11);
    this.textures.door = makeDoorTexture(9);

    // Blood stains (multiple variants)
    this.textures.blood1 = makeBloodStain(5);
    this.textures.blood2 = makeBloodStain(77);
    this.textures.blood3 = makeBloodStain(333);

    // Children's drawings
    this.textures.drawing1 = makeChildDrawing(6, 0);
    this.textures.drawing2 = makeChildDrawing(6, 1);
    this.textures.drawing3 = makeChildDrawing(6, 2);

    // Generate normal maps for key textures
    this.textures.floorWoodNormal = this._makeNormalFromCanvas(this.textures.floorWood);
    this.textures.wallPlasterNormal = this._makeNormalFromCanvas(this.textures.wallPlaster);

    this.loaded = true;
  }

  _makeNormalFromCanvas(texture) {
    const canvas = texture.image;
    return generateNormalMap(canvas, 2);
  }

  get(name) { return this.textures[name]; }
  clone(name, repeatX, repeatY) {
    const src = this.textures[name];
    if (!src) return null;
    const tex = src.clone();
    tex.needsUpdate = true;
    tex.repeat.set(repeatX, repeatY);
    return tex;
  }

  dispose() {
    for (const key in this.textures) {
      this.textures[key].dispose();
    }
    this.textures = {};
    this.loaded = false;
  }
}
