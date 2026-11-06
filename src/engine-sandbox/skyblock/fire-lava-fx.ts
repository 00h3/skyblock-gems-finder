import * as THREE from "three";
import { LAVA_ID, type World } from "@/engine-sandbox/shared/world";

/**
 * Cinematic fire + lava for Skyblock.
 *
 * - One shared lava PointLight that glides to the nearest exposed lava and
 *   flickers, so lava actually lights the blocks around it. The light always
 *   exists (intensity 0 when no lava is near) so the scene's light count never
 *   changes at runtime — that would force every material to recompile.
 * - GPU-animated ember clouds (one draw call each, no per-frame CPU work per
 *   particle) rising off lava and torch flames. Additive HDR colour so they
 *   pick up the existing bloom pass on high quality.
 * - Soft additive glow sprites behind flames for a warm halo.
 *
 * Nothing here changes resolution, shadows or any existing quality setting.
 */

const EMBER_VERT = /* glsl */ `
attribute vec4 aSeed; // x phase, y speed, z radius, w size
uniform float uTime;
uniform vec3 uCenter;
uniform float uSpread;
uniform float uRise;
uniform float uSize;
uniform float uViewScale;
varying float vLife;
varying float vSeed;
void main() {
  float t = fract(uTime * aSeed.y + aSeed.x);
  float ang = aSeed.x * 6.2831853 + aSeed.z * 17.0;
  float r = aSeed.z * uSpread;
  vec3 p = uCenter;
  p.x += cos(ang) * r + sin(uTime * 1.3 + aSeed.x * 40.0) * 0.22 * t;
  p.z += sin(ang) * r + cos(uTime * 1.1 + aSeed.x * 31.0) * 0.22 * t;
  p.y += t * uRise * (0.6 + aSeed.w * 0.8);
  vLife = t;
  vSeed = aSeed.x;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float fade = smoothstep(0.0, 0.08, t) * (1.0 - smoothstep(0.7, 1.0, t));
  float px = uSize * (0.5 + aSeed.w) * uViewScale / max(-mv.z, 0.5) * (0.35 + fade);
  gl_PointSize = clamp(px, 1.0, 48.0);
}
`;

const EMBER_FRAG = /* glsl */ `
uniform float uAlpha;
varying float vLife;
varying float vSeed;
void main() {
  vec2 c = gl_PointCoord - vec2(0.5);
  float d = length(c) * 2.0;
  if (d > 1.0) discard;
  float soft = pow(1.0 - d, 1.6);
  vec3 hot = vec3(1.0, 0.86, 0.45);
  vec3 mid = vec3(1.0, 0.42, 0.08);
  vec3 cool = vec3(0.55, 0.08, 0.02);
  vec3 col = mix(hot, mid, smoothstep(0.0, 0.35, vLife));
  col = mix(col, cool, smoothstep(0.35, 1.0, vLife));
  float fade = smoothstep(0.0, 0.08, vLife) * (1.0 - smoothstep(0.65, 1.0, vLife));
  float flick = 0.75 + 0.25 * sin(vSeed * 91.0 + vLife * 30.0);
  gl_FragColor = vec4(col * 1.6, soft * fade * flick * uAlpha);
  #include <colorspace_fragment>
}
`;

function makeGlowTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,240,200,1)");
  grad.addColorStop(0.25, "rgba(255,170,70,0.75)");
  grad.addColorStop(0.6, "rgba(255,90,20,0.22)");
  grad.addColorStop(1, "rgba(255,60,0,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

type EmberOptions = { count: number; spread: number; rise: number; size: number; alpha: number };

/** A fixed-size cloud of embers animated entirely in the vertex shader. */
class EmberEmitter {
  readonly points: THREE.Points;
  private readonly mat: THREE.ShaderMaterial;

  constructor(opts: EmberOptions) {
    const { count } = opts;
    const seeds = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      seeds[i * 4] = Math.random(); // phase
      seeds[i * 4 + 1] = 0.18 + Math.random() * 0.32; // speed (cycles/s)
      seeds[i * 4 + 2] = Math.sqrt(Math.random()); // radius (uniform over a disk)
      seeds[i * 4 + 3] = Math.random(); // size
    }
    const geo = new THREE.BufferGeometry();
    // three needs a position attribute to know the vertex count; the real
    // placement happens in the shader from aSeed.
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 4));
    this.mat = new THREE.ShaderMaterial({
      vertexShader: EMBER_VERT,
      fragmentShader: EMBER_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uCenter: { value: new THREE.Vector3() },
        uSpread: { value: opts.spread },
        uRise: { value: opts.rise },
        uSize: { value: opts.size },
        uViewScale: { value: 500 },
        uAlpha: { value: opts.alpha },
      },
    });
    this.points = new THREE.Points(geo, this.mat);
    this.points.frustumCulled = false;
  }

  setCenter(x: number, y: number, z: number) {
    (this.mat.uniforms.uCenter.value as THREE.Vector3).set(x, y, z);
  }

  setSpread(spread: number) {
    this.mat.uniforms.uSpread.value = spread;
  }

  setAlpha(alpha: number) {
    this.mat.uniforms.uAlpha.value = alpha;
    this.points.visible = alpha > 0.01;
  }

  update(time: number, viewScale: number) {
    this.mat.uniforms.uTime.value = time;
    this.mat.uniforms.uViewScale.value = viewScale;
  }

  dispose() {
    this.points.removeFromParent();
    this.points.geometry.dispose();
    this.mat.dispose();
  }
}

type Flame = { sprite: THREE.Sprite; embers: EmberEmitter | null; base: number; seed: number };

export type FireLavaFxOptions = {
  scene: THREE.Scene;
  world: World;
  /** "low" quality: skip all of it. */
  lowQuality?: boolean;
  /** Weak GPUs (mobile / Mali): fewer embers, same look. */
  lightweight?: boolean;
};

const SCAN_R = 12;
const SCAN_RY = 6;
const SCAN_EVERY = 0.75; // seconds
const LIGHT_BASE = 7.5;

export class FireLavaFx {
  private readonly scene: THREE.Scene;
  private readonly world: World;
  private readonly enabled: boolean;
  private readonly lightweight: boolean;
  private readonly light: THREE.PointLight | null;
  private readonly lavaEmbers: EmberEmitter | null;
  private readonly glowTex: THREE.CanvasTexture | null;
  private readonly flames: Flame[] = [];
  private readonly size = new THREE.Vector2();
  private scanT = 0;
  private targetPos = new THREE.Vector3();
  private targetIntensity = 0;
  private targetSpread = 1;
  private lavaStrength = 0;

  constructor(opts: FireLavaFxOptions) {
    this.scene = opts.scene;
    this.world = opts.world;
    this.enabled = !opts.lowQuality;
    this.lightweight = !!opts.lightweight;
    if (!this.enabled) {
      this.light = null;
      this.lavaEmbers = null;
      this.glowTex = null;
      return;
    }
    this.glowTex = makeGlowTexture();

    this.light = new THREE.PointLight(0xff5a14, 0, 20, 1.5);
    this.light.castShadow = false;
    this.scene.add(this.light);

    this.lavaEmbers = new EmberEmitter({
      count: this.lightweight ? 40 : 72,
      spread: 1.2,
      rise: 2.8,
      size: 0.1,
      alpha: 0,
    });
    this.scene.add(this.lavaEmbers.points);
  }

  /** Warm halo + rising embers on a flame (torch, brazier). */
  addFlame(x: number, y: number, z: number, scale = 1) {
    if (!this.enabled || !this.glowTex) return;
    const mat = new THREE.SpriteMaterial({
      map: this.glowTex,
      color: 0xffffff,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(x, y, z);
    sprite.scale.setScalar(1.4 * scale);
    this.scene.add(sprite);

    const embers = new EmberEmitter({
      count: this.lightweight ? 10 : 18,
      spread: 0.12 * scale,
      rise: 1.5 * scale,
      size: 0.07 * scale,
      alpha: 0.9,
    });
    embers.setCenter(x, y + 0.05, z);
    this.scene.add(embers.points);
    this.flames.push({ sprite, embers, base: 1.4 * scale, seed: Math.random() * 100 });
  }

  /** Find the best nearby cluster of exposed lava and aim the light/embers at it. */
  private scan(px: number, py: number, pz: number) {
    const x0 = Math.floor(px);
    const y0 = Math.floor(py);
    const z0 = Math.floor(pz);
    const buckets = new Map<number, { n: number; sx: number; sy: number; sz: number }>();
    for (let x = x0 - SCAN_R; x <= x0 + SCAN_R; x++) {
      for (let z = z0 - SCAN_R; z <= z0 + SCAN_R; z++) {
        for (let y = y0 - SCAN_RY; y <= y0 + SCAN_RY; y++) {
          if (this.world.get(x, y, z) !== LAVA_ID) continue;
          // Only lava with open air above it actually glows into the scene.
          if (this.world.get(x, y + 1, z) !== 0) continue;
          const key = ((x >> 2) + 256) * 65536 + ((z >> 2) + 256) * 64 + ((y >> 2) + 32);
          let b = buckets.get(key);
          if (!b) {
            b = { n: 0, sx: 0, sy: 0, sz: 0 };
            buckets.set(key, b);
          }
          b.n++;
          b.sx += x + 0.5;
          b.sy += y + 0.88; // surface of a liquid cell
          b.sz += z + 0.5;
        }
      }
    }

    let best: { n: number; sx: number; sy: number; sz: number } | null = null;
    let bestScore = 0;
    for (const b of buckets.values()) {
      const cx = b.sx / b.n;
      const cy = b.sy / b.n;
      const cz = b.sz / b.n;
      const d2 = (cx - px) * (cx - px) + (cy - py) * (cy - py) + (cz - pz) * (cz - pz);
      const score = b.n / (1 + d2 / 100);
      if (score > bestScore) {
        bestScore = score;
        best = b;
      }
    }

    if (!best) {
      this.targetIntensity = 0;
      return;
    }
    const cx = best.sx / best.n;
    const cy = best.sy / best.n;
    const cz = best.sz / best.n;
    // Hover just above the surface so nearby block tops catch the light.
    this.targetPos.set(cx, cy + 1.1, cz);
    this.targetIntensity = LIGHT_BASE * Math.min(1, 0.35 + best.n / 8);
    this.targetSpread = Math.min(3, Math.max(0.6, Math.sqrt(best.n) * 0.5));
    this.lavaEmbers?.setCenter(cx, cy + 0.1, cz);
    this.lavaEmbers?.setSpread(this.targetSpread);
  }

  update(dt: number, time: number, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer) {
    if (!this.enabled || !this.light) return;

    this.scanT -= dt;
    if (this.scanT <= 0) {
      this.scanT = SCAN_EVERY;
      this.scan(camera.position.x, camera.position.y, camera.position.z);
    }

    // Smooth the light toward its target so switching pools never pops.
    const k = 1 - Math.exp(-dt * 4);
    const wasOff = this.light.intensity < 0.05;
    if (wasOff && this.targetIntensity > 0) this.light.position.copy(this.targetPos);
    else this.light.position.lerp(this.targetPos, k);

    // Layered flicker: fast crackle + medium shimmer + slow breathing.
    const f =
      0.5 * Math.sin(time * 7.1) + 0.3 * Math.sin(time * 13.7 + 1.3) + 0.2 * Math.sin(time * 23.9 + 2.1);
    const flicker = 1 + f * 0.18 + 0.08 * Math.sin(time * 1.7);
    const current = this.light.intensity / Math.max(0.001, flicker);
    const eased = current + (this.targetIntensity - current) * k;
    this.light.intensity = Math.max(0, eased * flicker);

    this.lavaStrength = Math.min(1, this.lavaStrength + (this.targetIntensity > 0 ? dt : -dt) * 1.5);
    this.lavaStrength = Math.max(0, this.lavaStrength);

    renderer.getDrawingBufferSize(this.size);
    const viewScale = (this.size.y * 0.5) / Math.tan(THREE.MathUtils.degToRad(camera.fov) * 0.5);
    if (this.lavaEmbers) {
      this.lavaEmbers.setAlpha(this.lavaStrength);
      this.lavaEmbers.update(time, viewScale);
    }

    for (const fl of this.flames) {
      const pulse = 1 + 0.16 * Math.sin(time * 17.0 + fl.seed) + 0.1 * Math.sin(time * 29.0 + fl.seed * 1.7);
      fl.sprite.scale.setScalar(fl.base * pulse);
      (fl.sprite.material as THREE.SpriteMaterial).opacity = 0.75 + 0.25 * Math.sin(time * 11.0 + fl.seed);
      fl.embers?.update(time, viewScale);
    }
  }

  dispose() {
    this.light?.removeFromParent();
    this.light?.dispose();
    this.lavaEmbers?.dispose();
    for (const fl of this.flames) {
      fl.sprite.removeFromParent();
      (fl.sprite.material as THREE.SpriteMaterial).dispose();
      fl.embers?.dispose();
    }
    this.flames.length = 0;
    this.glowTex?.dispose();
  }
}
