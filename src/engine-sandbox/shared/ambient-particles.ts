import * as THREE from "three";

/**
 * One pooled THREE.Points cloud around the camera. Particles wrap inside a
 * box that follows the player, so the count is fixed (no allocations) and it
 * costs a single draw call. Modes switch the look/motion for world events.
 */

export type ParticleMode = "motes" | "sparks" | "spores" | "embers" | "snow" | "off";

function makeSprite() {
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.25, "rgba(255,255,255,0.85)");
  grad.addColorStop(0.55, "rgba(255,255,255,0.35)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 32);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class AmbientParticles {
  readonly points: THREE.Points;
  private positions: Float32Array;
  private seeds: Float32Array;
  private mat: THREE.PointsMaterial;
  private mode: ParticleMode = "motes";
  private half = 22;
  private t = 0;
  private acc = 0;
  public ultra = false;

  constructor(private count = 220) {
    this.positions = new Float32Array(count * 3);
    this.seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      this.positions[i * 3] = (Math.random() * 2 - 1) * this.half;
      this.positions[i * 3 + 1] = Math.random() * this.half;
      this.positions[i * 3 + 2] = (Math.random() * 2 - 1) * this.half;
      this.seeds[i] = Math.random() * 100;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
    this.mat = new THREE.PointsMaterial({
      size: 0.18,
      map: makeSprite(),
      transparent: true,
      depthWrite: false,
      opacity: 0.65,
      color: new THREE.Color("#fff4ce"),
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    this.points = new THREE.Points(geo, this.mat);
    this.points.frustumCulled = false;
  }

  setMode(mode: ParticleMode) {
    this.mode = mode;
    this.points.visible = mode !== "off";
    if (mode === "sparks") {
      this.mat.color.set("#bcd4ff");
      this.mat.size = 0.22;
      this.mat.opacity = 0.85;
    } else if (mode === "spores") {
      // Mystical glowing purple/magenta forest spores (Hytale image 6)
      this.mat.color.set("#e085ff");
      this.mat.size = 0.28;
      this.mat.opacity = 0.80;
    } else if (mode === "snow") {
      this.mat.color.set("#ffffff");
      this.mat.size = 0.16;
      this.mat.opacity = 0.9;
      this.mat.blending = THREE.NormalBlending;
      this.mat.needsUpdate = true;
      return;
    } else if (mode === "embers") {
      // Warm glowing forge & torch embers (Hytale image 2)
      this.mat.color.set("#ff8822");
      this.mat.size = 0.22;
      this.mat.opacity = 0.85;
    } else {
      // Golden sunlight pollen motes (Hytale image 1 & 3)
      this.mat.color.set("#ffeeb0");
      this.mat.size = 0.18;
      this.mat.opacity = 0.68;
    }
    if (this.mat.blending !== THREE.AdditiveBlending) {
      this.mat.blending = THREE.AdditiveBlending;
      this.mat.needsUpdate = true;
    }
  }

  /** Sideways drift in blocks/second (weather wind). */
  wind = 0;
  /** Multiplier on fall speed (heavier snow in blizzards). */
  fallScale = 1;

  update(dt: number, center: THREE.Vector3) {
    if (this.mode === "off") return;
    this.points.position.set(center.x, center.y - 2, center.z);
    this.acc += dt;
    if (!this.ultra && this.acc < 0.033) return;
    const simDt = this.ultra ? dt : this.acc;
    this.acc = 0;
    this.t += simDt;
    const p = this.positions;
    const h = this.half;
    const isUpward = this.mode === "spores" || this.mode === "embers";
    const snow = this.mode === "snow";
    const fall = (this.mode === "sparks" ? 7 : snow ? 1.3 : isUpward ? -0.45 : 0.18) * this.fallScale;
    const sway = snow ? 0.9 : 0.35;
    const gust = this.wind * (0.75 + Math.sin(this.t * 0.6) * 0.25);
    for (let i = 0; i < this.count; i++) {
      const s = this.seeds[i];
      const ix = i * 3;
      p[ix] += Math.sin(this.t * 0.45 + s) * sway * simDt + (this.mode === "sparks" ? 2.5 * simDt : snow ? 0.4 * simDt : 0) + gust * simDt;
      p[ix + 1] += (Math.sin(this.t * 0.75 + s * 1.3) * 0.25 - fall) * simDt;
      p[ix + 2] += Math.cos(this.t * 0.4 + s) * 0.35 * simDt;
      if (p[ix + 1] < -4) p[ix + 1] += h + 4;
      else if (p[ix + 1] > h + 4) p[ix + 1] = -4;
      if (p[ix] > h) p[ix] -= h * 2;
      else if (p[ix] < -h) p[ix] += h * 2;
      if (p[ix + 2] > h) p[ix + 2] -= h * 2;
      else if (p[ix + 2] < -h) p[ix + 2] += h * 2;
    }
    (this.points.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  dispose() {
    this.points.geometry.dispose();
    this.mat.map?.dispose();
    this.mat.dispose();
  }
}
