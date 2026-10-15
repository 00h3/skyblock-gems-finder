import * as THREE from "three";

/**
 * Instant, readable melee feedback: voxel impact chips (one instanced draw
 * call), an expanding shock ring, floating damage numbers and a short camera
 * kick. Everything spawns on the same frame as the hit, so combat never
 * feels delayed.
 */
const CHIPS = 96;
const RINGS = 4;
const NUMBERS = 6;

type Num = { sprite: THREE.Sprite; t: number; vy: number };

export class CombatFx {
  readonly group = new THREE.Group();
  private readonly chips: THREE.InstancedMesh;
  private readonly pos = new Float32Array(CHIPS * 3);
  private readonly vel = new Float32Array(CHIPS * 3);
  private readonly life = new Float32Array(CHIPS);
  private readonly maxLife = new Float32Array(CHIPS);
  private cursor = 0;
  private readonly rings: { mesh: THREE.Mesh; t: number }[] = [];
  private ringCursor = 0;
  private readonly numbers: Num[] = [];
  private numCursor = 0;
  private readonly numTextures = new Map<string, THREE.CanvasTexture>();
  private shakeT = 0;
  private shakeAmp = 0;
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly s = new THREE.Vector3();
  private readonly p = new THREE.Vector3();
  private readonly color = new THREE.Color();
  private readonly shakeEuler = new THREE.Euler();
  private readonly shakeQuat = new THREE.Quaternion();

  constructor() {
    const mat = new THREE.MeshBasicMaterial({ toneMapped: false });
    this.chips = new THREE.InstancedMesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), mat, CHIPS);
    this.chips.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.chips.frustumCulled = false;
    this.m.makeScale(0, 0, 0);
    for (let i = 0; i < CHIPS; i++) {
      this.chips.setMatrixAt(i, this.m);
      this.chips.setColorAt(i, this.color.set(0xffffff));
    }
    this.group.add(this.chips);

    const ringGeo = new THREE.RingGeometry(0.28, 0.4, 28);
    for (let i = 0; i < RINGS; i++) {
      const mesh = new THREE.Mesh(
        ringGeo,
        new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          side: THREE.DoubleSide,
          toneMapped: false,
        }),
      );
      mesh.visible = false;
      mesh.renderOrder = 6;
      this.group.add(mesh);
      this.rings.push({ mesh, t: 1 });
    }

    for (let i = 0; i < NUMBERS; i++) {
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ transparent: true, depthTest: false, depthWrite: false, toneMapped: false }),
      );
      sprite.visible = false;
      sprite.renderOrder = 10;
      this.group.add(sprite);
      this.numbers.push({ sprite, t: 1, vy: 0 });
    }
  }

  private numberTexture(text: string, crit: boolean) {
    const key = `${text}:${crit}`;
    let tex = this.numTextures.get(key);
    if (tex) return tex;
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 64;
    const g = c.getContext("2d")!;
    g.font = `900 ${crit ? 46 : 40}px system-ui, sans-serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.lineWidth = 8;
    g.strokeStyle = "rgba(20,8,8,0.9)";
    g.strokeText(text, 64, 34);
    g.fillStyle = crit ? "#ffd23f" : "#ffffff";
    g.fillText(text, 64, 34);
    tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.numTextures.set(key, tex);
    return tex;
  }

  hit(at: THREE.Vector3, camera: THREE.Camera, damage: number, crit = false) {
    const count = crit ? 18 : 12;
    for (let n = 0; n < count; n++) {
      const k = this.cursor++ % CHIPS;
      this.pos[k * 3] = at.x;
      this.pos[k * 3 + 1] = at.y;
      this.pos[k * 3 + 2] = at.z;
      const a = Math.random() * Math.PI * 2;
      const sp = 2.5 + Math.random() * 3.5;
      this.vel[k * 3] = Math.cos(a) * sp;
      this.vel[k * 3 + 1] = 1.5 + Math.random() * 4;
      this.vel[k * 3 + 2] = Math.sin(a) * sp;
      this.maxLife[k] = this.life[k] = 0.32 + Math.random() * 0.22;
      const r = Math.random();
      this.chips.setColorAt(k, this.color.set(r < 0.55 ? 0xe11d2e : r < 0.85 ? 0x8f0f1c : crit ? 0xffd23f : 0xffffff));
    }
    if (this.chips.instanceColor) this.chips.instanceColor.needsUpdate = true;

    const ring = this.rings[this.ringCursor++ % RINGS];
    ring.t = 0;
    ring.mesh.visible = true;
    ring.mesh.position.copy(at);
    ring.mesh.quaternion.copy(camera.quaternion);
    (ring.mesh.material as THREE.MeshBasicMaterial).color.set(crit ? 0xffd23f : 0xffffff);

    const num = this.numbers[this.numCursor++ % NUMBERS];
    num.t = 0;
    num.vy = 1.6;
    num.sprite.visible = true;
    num.sprite.position.set(at.x + (Math.random() - 0.5) * 0.4, at.y + 0.6, at.z + (Math.random() - 0.5) * 0.4);
    (num.sprite.material as THREE.SpriteMaterial).map = this.numberTexture(crit ? `${damage}!` : String(damage), crit);
    (num.sprite.material as THREE.SpriteMaterial).needsUpdate = true;

    this.shakeT = crit ? 0.16 : 0.11;
    this.shakeAmp = crit ? 0.022 : 0.013;
  }

  update(dt: number) {
    let any = false;
    for (let k = 0; k < CHIPS; k++) {
      if (this.life[k] <= 0) continue;
      any = true;
      this.life[k] -= dt;
      if (this.life[k] <= 0) {
        this.m.makeScale(0, 0, 0);
        this.chips.setMatrixAt(k, this.m);
        continue;
      }
      this.vel[k * 3 + 1] -= 16 * dt;
      this.vel[k * 3] *= 1 - 2.2 * dt;
      this.vel[k * 3 + 2] *= 1 - 2.2 * dt;
      this.pos[k * 3] += this.vel[k * 3] * dt;
      this.pos[k * 3 + 1] += this.vel[k * 3 + 1] * dt;
      this.pos[k * 3 + 2] += this.vel[k * 3 + 2] * dt;
      const sc = Math.max(0.05, this.life[k] / this.maxLife[k]);
      this.p.set(this.pos[k * 3], this.pos[k * 3 + 1], this.pos[k * 3 + 2]);
      this.q.setFromAxisAngle(this.s.set(0.5, 1, 0.3).normalize(), this.life[k] * 12);
      this.m.compose(this.p, this.q, this.s.setScalar(sc));
      this.chips.setMatrixAt(k, this.m);
    }
    if (any) this.chips.instanceMatrix.needsUpdate = true;

    for (const r of this.rings) {
      if (r.t >= 1) continue;
      r.t = Math.min(1, r.t + dt / 0.16);
      const e = 1 - (1 - r.t) * (1 - r.t);
      r.mesh.scale.setScalar(0.4 + e * 2.1);
      (r.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - r.t) * 0.85;
      if (r.t >= 1) r.mesh.visible = false;
    }

    for (const n of this.numbers) {
      if (n.t >= 1) continue;
      n.t = Math.min(1, n.t + dt / 0.7);
      n.vy -= 3 * dt;
      n.sprite.position.y += n.vy * dt;
      const pop = n.t < 0.12 ? 0.5 + (n.t / 0.12) * 0.7 : 1.2 - (n.t - 0.12) * 0.35;
      n.sprite.scale.set(0.9 * pop, 0.45 * pop, 1);
      (n.sprite.material as THREE.SpriteMaterial).opacity = n.t > 0.65 ? 1 - (n.t - 0.65) / 0.35 : 1;
      if (n.t >= 1) n.sprite.visible = false;
    }

    this.shakeT = Math.max(0, this.shakeT - dt);
  }

  /** Apply the hit kick right before rendering; call `endShake` after rendering. */
  beginShake(camera: THREE.Camera) {
    if (this.shakeT <= 0) return false;
    const a = this.shakeAmp * (this.shakeT / 0.16);
    this.shakeEuler.set((Math.random() - 0.5) * a, (Math.random() - 0.5) * a, (Math.random() - 0.5) * a * 0.6);
    this.shakeQuat.setFromEuler(this.shakeEuler);
    camera.quaternion.multiply(this.shakeQuat);
    return true;
  }

  endShake(camera: THREE.Camera) {
    camera.quaternion.multiply(this.shakeQuat.invert());
  }

  dispose() {
    this.chips.geometry.dispose();
    (this.chips.material as THREE.Material).dispose();
    this.rings[0]?.mesh.geometry.dispose();
    this.rings.forEach((r) => (r.mesh.material as THREE.Material).dispose());
    this.numbers.forEach((n) => (n.sprite.material as THREE.Material).dispose());
    this.numTextures.forEach((t) => t.dispose());
    this.group.clear();
  }
}
