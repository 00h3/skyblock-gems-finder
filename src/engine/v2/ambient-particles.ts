import * as THREE from "three";

/**
 * One pooled THREE.Points cloud around the camera. Particles wrap inside a
 * box that follows the player, so the count is fixed (no allocations) and it
 * costs a single draw call. Modes switch the look/motion for world events.
 */

export type ParticleMode = "motes" | "sparks" | "off";

function makeSprite() {
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.35, "rgba(255,255,255,0.6)");
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
  private half = 18;
  private t = 0;

  constructor(private count = 160) {
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
      size: 0.14,
      map: makeSprite(),
      transparent: true,
      depthWrite: false,
      opacity: 0.55,
      color: new THREE.Color("#fff6d8"),
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
    } else {
      this.mat.color.set("#fff6d8");
      this.mat.size = 0.14;
      this.mat.opacity = 0.55;
    }
  }

  update(dt: number, center: THREE.Vector3) {
    if (this.mode === "off") return;
    this.t += dt;
    const p = this.positions;
    const h = this.half;
    const fall = this.mode === "sparks" ? 7 : 0.25;
    for (let i = 0; i < this.count; i++) {
      const s = this.seeds[i];
      const ix = i * 3;
      p[ix] += Math.sin(this.t * 0.4 + s) * 0.25 * dt + (this.mode === "sparks" ? 2.5 * dt : 0);
      p[ix + 1] += (Math.sin(this.t * 0.7 + s * 1.3) * 0.2 - fall) * dt;
      p[ix + 2] += Math.cos(this.t * 0.35 + s) * 0.25 * dt;
      if (p[ix + 1] < -4) p[ix + 1] += h + 4;
      if (p[ix] > h) p[ix] -= h * 2;
      else if (p[ix] < -h) p[ix] += h * 2;
    }
    this.points.position.set(center.x, center.y - 4, center.z);
    (this.points.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  dispose() {
    this.points.geometry.dispose();
    this.mat.map?.dispose();
    this.mat.dispose();
  }
}
