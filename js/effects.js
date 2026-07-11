import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { CONFIG } from './config.js';
import { lerp, clamp, damp } from './utils.js';

const HorrorShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    vignetteIntensity: { value: CONFIG.post.vignetteBase },
    grainIntensity: { value: CONFIG.post.grainBase },
    chromaticAberration: { value: CONFIG.post.chromaticBase },
    desaturation: { value: CONFIG.post.desaturateBase },
    shakeIntensity: { value: 0 },
    shakeOffset: { value: new THREE.Vector2(0, 0) },
    redTint: { value: 0 },
    flashIntensity: { value: 0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform float vignetteIntensity;
    uniform float grainIntensity;
    uniform float chromaticAberration;
    uniform float desaturation;
    uniform float shakeIntensity;
    uniform vec2 shakeOffset;
    uniform float redTint;
    uniform float flashIntensity;
    varying vec2 vUv;

    float random(vec2 co) {
      return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec2 uv = vUv + shakeOffset * shakeIntensity;
      vec2 offset = vec2(chromaticAberration, 0.0);
      float r = texture2D(tDiffuse, uv + offset).r;
      float g = texture2D(tDiffuse, uv).g;
      float b = texture2D(tDiffuse, uv - offset).b;
      vec3 color = vec3(r, g, b);

      float gray = dot(color, vec3(0.299, 0.587, 0.114));
      color = mix(color, vec3(gray), desaturation);
      color = mix(color, vec3(color.r * 1.3, color.g * 0.7, color.b * 0.6), redTint);

      vec2 center = vec2(0.5, 0.5);
      float dist = distance(uv, center);
      float vignette = smoothstep(0.5, 1.0, dist);
      color *= 1.0 - vignette * vignetteIntensity;

      float grain = random(uv * time) * 2.0 - 1.0;
      color += grain * grainIntensity;
      color = mix(color, vec3(1.0), flashIntensity);

      gl_FragColor = vec4(color, 1.0);
    }
  `,
};

export class PostProcessor {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.composer = new EffectComposer(renderer);
    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);
    this.horrorPass = new ShaderPass(HorrorShader);
    this.composer.addPass(this.horrorPass);
    this.shakeTimer = 0;
    this.shakeIntensity = 0;
  }

  update(dt, sanity, nearEntity, chasing, jumpscareActive) {
    const u = this.horrorPass.uniforms;
    u.time.value += dt;
    const sf = 1 - (sanity / CONFIG.sanity.max);
    u.vignetteIntensity.value = damp(u.vignetteIntensity.value, lerp(CONFIG.post.vignetteBase, CONFIG.post.vignetteMax, sf), 3, dt);
    u.grainIntensity.value = damp(u.grainIntensity.value, lerp(CONFIG.post.grainBase, CONFIG.post.grainMax, sf), 3, dt);
    const chroma = nearEntity ? lerp(CONFIG.post.chromaticBase, CONFIG.post.chromaticMax, 0.6) : CONFIG.post.chromaticBase;
    u.chromaticAberration.value = damp(u.chromaticAberration.value, chroma, 4, dt);
    const desat = sf > 0.6 ? lerp(CONFIG.post.desaturateBase, CONFIG.post.desaturateMax, (sf - 0.6) / 0.4) : CONFIG.post.desaturateBase;
    u.desaturation.value = damp(u.desaturation.value, desat, 2, dt);
    u.redTint.value = damp(u.redTint.value, chasing ? 0.4 : (nearEntity ? 0.15 : 0), 3, dt);
    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
      u.shakeOffset.value.set((Math.random() - 0.5) * this.shakeIntensity * 2, (Math.random() - 0.5) * this.shakeIntensity * 2);
    } else {
      u.shakeOffset.value.set(0, 0);
    }
    u.flashIntensity.value = damp(u.flashIntensity.value, jumpscareActive ? 1 : 0, jumpscareActive ? 20 : 10, dt);
  }

  shake(intensity, duration) {
    this.shakeIntensity = intensity;
    this.shakeTimer = duration;
  }

  render() { this.composer.render(); }
  resize(w, h) { this.composer.setSize(w, h); }
}

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.systems = [];
  }

  createDustMotes(position, count = 200, radius = 8) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      pos[i3] = position.x + (Math.random() - 0.5) * radius;
      pos[i3 + 1] = position.y + Math.random() * 3;
      pos[i3 + 2] = position.z + (Math.random() - 0.5) * radius;
      vel[i3] = (Math.random() - 0.5) * 0.2;
      vel[i3 + 1] = Math.random() * 0.1;
      vel[i3 + 2] = (Math.random() - 0.5) * 0.2;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ size: 0.04, color: 0x888877, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false });
    const pts = new THREE.Points(geo, mat);
    this.scene.add(pts);
    this.systems.push({ type: 'dust', points: pts, velocities: vel, position, radius });
    return pts;
  }

  createFog(position, count = 100, radius = 12) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      pos[i3] = position.x + (Math.random() - 0.5) * radius;
      pos[i3 + 1] = position.y + Math.random() * 0.5;
      pos[i3 + 2] = position.z + (Math.random() - 0.5) * radius;
      vel[i3] = (Math.random() - 0.5) * 0.4;
      vel[i3 + 1] = 0;
      vel[i3 + 2] = (Math.random() - 0.5) * 0.4;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ size: 0.8, color: 0x444444, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending, depthWrite: false });
    const pts = new THREE.Points(geo, mat);
    this.scene.add(pts);
    this.systems.push({ type: 'fog', points: pts, velocities: vel, position, radius });
    return pts;
  }

  createBloodSpray(position, count = 50) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    const life = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      pos[i3] = position.x; pos[i3 + 1] = position.y; pos[i3 + 2] = position.z;
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      vel[i3] = Math.cos(angle) * speed;
      vel[i3 + 1] = Math.random() * 2;
      vel[i3 + 2] = Math.sin(angle) * speed;
      life[i] = Math.random() * 2 + 1;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ size: 0.08, color: 0x8b0000, transparent: true, opacity: 0.8, depthWrite: false });
    const pts = new THREE.Points(geo, mat);
    this.scene.add(pts);
    this.systems.push({ type: 'blood', points: pts, velocities: vel, lifetimes: life, active: true });
    return pts;
  }

  update(dt) {
    for (const sys of this.systems) {
      const p = sys.points.geometry.attributes.position.array;
      if (sys.type === 'dust') {
        for (let i = 0; i < p.length; i += 3) {
          p[i] += sys.velocities[i] * dt;
          p[i + 1] += sys.velocities[i + 1] * dt;
          p[i + 2] += sys.velocities[i + 2] * dt;
          if (Math.hypot(p[i] - sys.position.x, p[i + 2] - sys.position.z) > sys.radius) {
            p[i] = sys.position.x + (Math.random() - 0.5) * sys.radius * 0.5;
            p[i + 2] = sys.position.z + (Math.random() - 0.5) * sys.radius * 0.5;
          }
          if (p[i + 1] > sys.position.y + 3) p[i + 1] = sys.position.y;
        }
      } else if (sys.type === 'fog') {
        for (let i = 0; i < p.length; i += 3) {
          p[i] += sys.velocities[i] * dt;
          p[i + 2] += sys.velocities[i + 2] * dt;
          if (Math.hypot(p[i] - sys.position.x, p[i + 2] - sys.position.z) > sys.radius) {
            p[i] = sys.position.x + (Math.random() - 0.5) * sys.radius * 0.3;
            p[i + 2] = sys.position.z + (Math.random() - 0.5) * sys.radius * 0.3;
            sys.velocities[i] = (Math.random() - 0.5) * 0.4;
            sys.velocities[i + 2] = (Math.random() - 0.5) * 0.4;
          }
        }
      } else if (sys.type === 'blood' && sys.active) {
        let allDead = true;
        for (let i = 0; i < sys.lifetimes.length; i++) {
          if (sys.lifetimes[i] > 0) {
            allDead = false;
            const i3 = i * 3;
            p[i3] += sys.velocities[i3] * dt;
            p[i3 + 1] += sys.velocities[i3 + 1] * dt;
            p[i3 + 2] += sys.velocities[i3 + 2] * dt;
            sys.velocities[i3 + 1] -= 9.8 * dt;
            sys.lifetimes[i] -= dt;
            if (sys.lifetimes[i] <= 0) p[i3 + 1] = -1000;
          }
        }
        if (allDead) { sys.active = false; this.scene.remove(sys.points); }
      }
      sys.points.geometry.attributes.position.needsUpdate = true;
    }
  }

  dispose() {
    for (const s of this.systems) { s.points.geometry.dispose(); s.points.material.dispose(); this.scene.remove(s.points); }
    this.systems = [];
  }
}

export class HallucinationSystem {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.hallucinations = [];
    this.active = false;
  }

  update(dt, sanity) {
    this.active = sanity < CONFIG.sanity.hallucinationThreshold;
    if (!this.active) { this.clearAll(); return; }
    if (sanity < CONFIG.sanity.severeHallucinationThreshold && Math.random() < 0.005) this.spawnFakeEntity();
    for (let i = this.hallucinations.length - 1; i >= 0; i--) {
      const h = this.hallucinations[i];
      h.lifetime -= dt;
      if (h.lifetime <= 0) {
        this.scene.remove(h.mesh); h.mesh.geometry.dispose(); h.mesh.material.dispose();
        this.hallucinations.splice(i, 1);
      } else {
        h.mesh.material.opacity = 0.3 + Math.sin(Date.now() * 0.01) * 0.2;
      }
    }
  }

  spawnFakeEntity() {
    const angle = Math.random() * Math.PI * 2;
    const dist = 8 + Math.random() * 5;
    const pos = new THREE.Vector3(
      this.camera.position.x + Math.cos(angle) * dist, 1.25,
      this.camera.position.z + Math.sin(angle) * dist
    );
    const geo = new THREE.CylinderGeometry(0.3, 0.3, 2.5, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a, transparent: true, opacity: 0.5, depthWrite: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    mesh.lookAt(this.camera.position);
    this.scene.add(mesh);
    this.hallucinations.push({ mesh, lifetime: 3 + Math.random() * 2 });
  }

  clearAll() {
    for (const h of this.hallucinations) { this.scene.remove(h.mesh); h.mesh.geometry.dispose(); h.mesh.material.dispose(); }
    this.hallucinations = [];
  }

  dispose() { this.clearAll(); }
}
