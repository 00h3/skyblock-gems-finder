import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { SANDBOX_AVATAR_MODEL } from "@/engine/avatar-model";
import { playFootstep, playSound } from "@/lib/sfx";

export type GameMode = "skyblock" | "blockfall";
export type CamMode = "third" | "first" | "front";
export type Phase = "loading" | "countdown" | "playing" | "won" | "lost";

export type HudState = {
  phase: Phase;
  countdown: number;
  gems: number;
  alive: number;
  total: number;
  time: number;
  mining: number;
  inMine: boolean;
  feed: string[];
};

type BlockDef = { tex: [string, string, string]; hardness: number; gems: number; fall?: boolean };

const T = (a: string, b = a, c = a): [string, string, string] => [a, b, c];

export const BLOCKS: Record<number, BlockDef> = {
  1: { tex: T("grass_block_top", "grass_block_side", "dirt"), hardness: 0.5, gems: 0 },
  2: { tex: T("dirt"), hardness: 0.45, gems: 0 },
  3: { tex: T("stone"), hardness: 1, gems: 0 },
  4: { tex: T("cobblestone"), hardness: 1, gems: 0 },
  5: { tex: T("oak_log_top", "oak_log", "oak_log_top"), hardness: 0.9, gems: 0 },
  6: { tex: T("oak_leaves"), hardness: 0.2, gems: 0 },
  7: { tex: T("oak_planks"), hardness: 0.8, gems: 0 },
  8: { tex: T("coal_ore"), hardness: 1.3, gems: 1 },
  9: { tex: T("redstone_ore"), hardness: 1.5, gems: 3 },
  10: { tex: T("lapis_block"), hardness: 1.6, gems: 4 },
  11: { tex: T("gold_block"), hardness: 1.8, gems: 6 },
  12: { tex: T("emerald_block"), hardness: 2, gems: 10 },
  13: { tex: T("diamond_block"), hardness: 2.3, gems: 15 },
  14: { tex: T("amethyst_block"), hardness: 1.9, gems: 8 },
  15: { tex: T("bedrock"), hardness: Infinity, gems: 0 },
  16: { tex: T("smooth_stone"), hardness: Infinity, gems: 0 },
  17: { tex: T("green_wool"), hardness: 0.3, gems: 0, fall: true },
  18: { tex: T("yellow_wool"), hardness: 0.3, gems: 0, fall: true },
  19: { tex: T("blue_wool"), hardness: 0.3, gems: 0, fall: true },
  20: { tex: T("pink_wool"), hardness: 0.3, gems: 0, fall: true },
  21: { tex: T("white_wool"), hardness: 0.3, gems: 0, fall: true },
  22: { tex: T("red_wool"), hardness: 0.3, gems: 0 },
  23: { tex: T("glowstone"), hardness: Infinity, gems: 0 },
};
const WARN_ID = 22;
const ORE_TABLE: [number, number][] = [
  [3, 50], [8, 16], [9, 9], [10, 7], [11, 6], [14, 5], [12, 4], [13, 3],
];

const BOT_NAMES = ["Nelly", "BlockBoi", "Pixie", "Zed", "Mochi", "Kiro", "Luna"];
const W = 0.3;
const H = 1.8;
const GRAVITY = 30;
const JUMP = 9.6;
const SPEED = 5.2;
const REACH = 6;

const key = (x: number, y: number, z: number) => `${x},${y},${z}`;

type Character = {
  name: string;
  root: THREE.Group;
  model: THREE.Object3D;
  mixer?: THREE.AnimationMixer;
  walk?: THREE.AnimationAction;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  onGround: boolean;
  yaw: number;
  alive: boolean;
  bot: boolean;
  aiTarget?: THREE.Vector3;
  aiTimer: number;
  stepTimer: number;
  bubble?: THREE.Sprite;
  bubbleUntil: number;
};

type Falling = { mesh: THREE.Mesh; vel: number; spin: THREE.Vector3; life: number };
type Particle = { mesh: THREE.Mesh; vel: THREE.Vector3; life: number };

function barsTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  g.clearRect(0, 0, 64, 64);
  g.fillStyle = "#2b2622";
  g.fillRect(0, 0, 64, 6);
  g.fillRect(0, 0, 6, 64);
  g.fillStyle = "#5b524a";
  g.fillRect(0, 1, 64, 2);
  g.fillRect(1, 0, 2, 64);
  g.fillStyle = "#9aa0a6";
  g.fillRect(0, 0, 8, 8);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function textSprite(text: string, opts: { bg?: string; color?: string; size?: number } = {}) {
  const size = opts.size ?? 48;
  const c = document.createElement("canvas");
  const g = c.getContext("2d")!;
  g.font = `${size}px "Lilita One", sans-serif`;
  const w = Math.ceil(g.measureText(text).width) + size;
  c.width = w;
  c.height = size * 1.6;
  g.font = `${size}px "Lilita One", sans-serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  if (opts.bg) {
    g.fillStyle = opts.bg;
    g.beginPath();
    g.roundRect(0, 0, c.width, c.height, size * 0.4);
    g.fill();
  }
  g.lineWidth = size * 0.16;
  g.strokeStyle = opts.bg ? "transparent" : "rgba(0,0,0,0.75)";
  if (!opts.bg) g.strokeText(text, c.width / 2, c.height / 2);
  g.fillStyle = opts.color ?? "#ffffff";
  g.fillText(text, c.width / 2, c.height / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  const h = 0.32 * (size / 48);
  s.scale.set((h * c.width) / c.height, h, 1);
  s.renderOrder = 10;
  return s;
}

export class QblockEngine {
  readonly mode: GameMode;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(70, 1, 0.1, 400);
  private blocks = new Map<string, number>();
  private meshes = new Map<number, THREE.InstancedMesh>();
  private instanceKeys = new Map<number, string[]>();
  private dirty = new Set<number>();
  private materials = new Map<number, THREE.Material[]>();
  private geo = new THREE.BoxGeometry(1, 1, 1);
  private loader = new THREE.TextureLoader();
  private texCache = new Map<string, THREE.Texture>();
  private chars: Character[] = [];
  private player!: Character;
  private template: { scene: THREE.Object3D; clips: THREE.AnimationClip[]; scale: number } | null = null;
  private falling: Falling[] = [];
  private particles: Particle[] = [];
  private triggered = new Map<string, number>();
  private highlight: THREE.LineSegments;
  private sun = new THREE.DirectionalLight(0xffffff, 2.4);
  private clock = new THREE.Clock();
  private raf = 0;
  private disposed = false;
  private listeners: (() => void)[] = [];

  input = { f: 0, b: 0, l: 0, r: 0, jump: false, mine: false };
  camMode: CamMode = "third";
  private yaw = Math.PI;
  private pitch = 0.32;
  private camDist = 5.5;

  private phase: Phase = "loading";
  private countdown = 3;
  private roundTime = 0;
  private gems = 0;
  private feed: string[] = [];
  private mineTarget: string | null = null;
  private mineProgress = 0;
  private pointerMine: { x: number; y: number } | null = null;
  private mineRegen = 0;
  private mineBounds = { x0: 18, x1: 30, y0: 2, y1: 9, z0: -6, z1: 6 };
  private lastHud = 0;

  onHud: (s: HudState) => void = () => {};
  onRoundEnd: (r: { won: boolean; time: number; place: number }) => void = () => {};
  onGems: (gems: number) => void = () => {};

  constructor(
    private canvas: HTMLCanvasElement,
    mode: GameMode,
    private playerName: string,
    startGems = 0,
  ) {
    this.mode = mode;
    this.gems = startGems;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene.background = this.skyTexture();
    this.scene.fog = new THREE.Fog(0xa8d8ff, 60, 170);
    this.scene.add(new THREE.HemisphereLight(0xcfe8ff, 0x6b5a3a, 1.3));
    this.sun.position.set(30, 60, 20);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    const sc = this.sun.shadow.camera;
    sc.left = sc.bottom = -30;
    sc.right = sc.top = 30;
    sc.far = 160;
    this.sun.shadow.bias = -0.0006;
    this.scene.add(this.sun, this.sun.target);

    const hg = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.004, 1.004, 1.004));
    this.highlight = new THREE.LineSegments(hg, new THREE.LineBasicMaterial({ color: 0x111111 }));
    this.highlight.visible = false;
    this.scene.add(this.highlight);

    if (mode === "skyblock") this.buildSkyblock();
    else this.buildBlockFall();

    this.bindInput();
    this.resize();
    this.init();
  }

  private async init() {
    await document.fonts?.load('48px "Lilita One"').catch(() => undefined);
    await this.loadTemplate();
    const spawn = this.mode === "skyblock" ? new THREE.Vector3(0.5, 8, 0.5) : new THREE.Vector3(10.5, 32, 10.5);
    this.player = this.spawnCharacter(this.playerName, spawn, false);
    if (this.mode === "blockfall") {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        this.spawnCharacter(BOT_NAMES[i], new THREE.Vector3(10.5 + Math.cos(a) * 6, 32, 10.5 + Math.sin(a) * 6), true);
      }
      this.phase = "countdown";
      this.countdown = 3;
    } else {
      this.phase = "playing";
    }
    this.clock.start();
    this.loop();
  }

  private skyTexture() {
    const c = document.createElement("canvas");
    c.width = 2;
    c.height = 256;
    const g = c.getContext("2d")!;
    const grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, "#1f6fe0");
    grad.addColorStop(0.55, "#5fb2ff");
    grad.addColorStop(1, "#d6efff");
    g.fillStyle = grad;
    g.fillRect(0, 0, 2, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  private tex(name: string) {
    let t = this.texCache.get(name);
    if (!t) {
      t = this.loader.load(`/textures/blocks/${name}.png`);
      t.magFilter = THREE.NearestFilter;
      t.minFilter = THREE.NearestMipmapLinearFilter;
      t.colorSpace = THREE.SRGBColorSpace;
      this.texCache.set(name, t);
    }
    return t;
  }

  private material(id: number) {
    let m = this.materials.get(id);
    if (!m) {
      const [top, side, bottom] = BLOCKS[id].tex;
      const leaves = id === 6;
      const mk = (n: string) =>
        new THREE.MeshLambertMaterial({
          map: this.tex(n),
          alphaTest: leaves ? 0.5 : 0,
          transparent: false,
          color: leaves ? 0x6fbf4a : top === "grass_block_top" && n === top ? 0x8fd16a : 0xffffff,
          emissive: id === 23 ? 0xffd27a : 0x000000,
          emissiveIntensity: id === 23 ? 0.6 : 0,
        });
      const s = mk(side);
      m = [s, s, mk(top), mk(bottom), s, s];
      this.materials.set(id, m);
    }
    return m;
  }

  set(x: number, y: number, z: number, id: number) {
    const k = key(x, y, z);
    const prev = this.blocks.get(k);
    if (prev === id) return;
    if (prev !== undefined) this.dirty.add(prev);
    if (id === 0) this.blocks.delete(k);
    else {
      this.blocks.set(k, id);
      this.dirty.add(id);
    }
  }
  get(x: number, y: number, z: number) {
    return this.blocks.get(key(x, y, z)) ?? 0;
  }

  private rebuild() {
    if (!this.dirty.size) return;
    const groups = new Map<number, string[]>();
    for (const id of this.dirty) groups.set(id, []);
    for (const [k, id] of this.blocks) groups.get(id)?.push(k);
    const m4 = new THREE.Matrix4();
    for (const [id, keys] of groups) {
      let mesh = this.meshes.get(id);
      if (!mesh || mesh.instanceMatrix.count < keys.length) {
        if (mesh) {
          this.scene.remove(mesh);
          mesh.dispose();
        }
        mesh = new THREE.InstancedMesh(this.geo, this.material(id), Math.max(16, Math.ceil(keys.length * 1.25)));
        mesh.castShadow = mesh.receiveShadow = true;
        mesh.userData.blockId = id;
        this.meshes.set(id, mesh);
        this.scene.add(mesh);
      }
      keys.forEach((k, i) => {
        const [x, y, z] = k.split(",").map(Number);
        m4.makeTranslation(x + 0.5, y + 0.5, z + 0.5);
        mesh!.setMatrixAt(i, m4);
      });
      mesh.count = keys.length;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      this.instanceKeys.set(id, keys);
    }
    this.dirty.clear();
  }

  private addCage(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) {
    const t = barsTexture();
    const w = x1 - x0;
    const h = y1 - y0;
    const d = z1 - z0;
    const mk = (rx: number, ry: number) => {
      const tt = t.clone();
      tt.repeat.set(rx, ry);
      tt.needsUpdate = true;
      return new THREE.MeshLambertMaterial({ map: tt, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide });
    };
    const sides = mk(d, h);
    const fronts = mk(w, h);
    const tops = mk(w, d);
    const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [sides, sides, tops, tops, fronts, fronts]);
    box.position.set(x0 + w / 2, y0 + h / 2, z0 + d / 2);
    this.scene.add(box);
  }

  private addLabel(text: string, x: number, y: number, z: number, bg = "#5b3fd6") {
    const s = textSprite(text, { bg, size: 64 });
    s.scale.multiplyScalar(4);
    s.position.set(x, y, z);
    s.material.depthTest = true;
    this.scene.add(s);
  }

  private buildSkyblock() {
    for (let x = -5; x <= 5; x++)
      for (let z = -5; z <= 5; z++) {
        const r = Math.hypot(x, z);
        if (r > 5.6) continue;
        this.set(x, 6, z, 1);
        const depth = Math.max(1, Math.round(5 - r));
        for (let y = 6 - depth; y < 6; y++) this.set(x, y, z, y < 3 ? 3 : 2);
      }
    for (let y = 7; y < 11; y++) this.set(-3, y, -3, 5);
    for (let x = -5; x <= -1; x++)
      for (let z = -5; z <= -1; z++)
        for (let y = 10; y <= 12; y++) {
          if (Math.abs(x + 3) + Math.abs(z + 3) + (y - 10) > 4) continue;
          if (x === -3 && z === -3 && y === 10) continue;
          this.set(x, y, z, 6);
        }
    this.set(3, 7, 3, 23);
    for (let x = 6; x < 18; x++) for (const z of [0, 1]) this.set(x, 6, z, 7);
    this.fillMine(true);
    const b = this.mineBounds;
    for (let x = b.x0 - 1; x <= b.x1 + 1; x++)
      for (let z = b.z0 - 1; z <= b.z1 + 1; z++) this.set(x, b.y0 - 1, z, 15);
    for (let x = b.x0 - 1; x <= b.x1 + 1; x++)
      for (let z = b.z0 - 1; z <= b.z1 + 1; z++) {
        const edge = x === b.x0 - 1 || x === b.x1 + 1 || z === b.z0 - 1 || z === b.z1 + 1;
        if (edge && !(x === b.x0 - 1 && (z === 0 || z === 1))) this.set(x, b.y1 + 1, z, 16);
      }
    for (const z of [0, 1]) this.set(b.x0 - 1, b.y1 + 1, z, 7);
    this.addCage(b.x0 - 1, b.y1 + 2, b.z0 - 1, b.x1 + 2, b.y1 + 9, b.z1 + 2);
    this.addLabel("MINING AREA", (b.x0 + b.x1) / 2 + 0.5, b.y1 + 11, 0.5);
    this.addLabel("SKYBLOCK", 0.5, 15, 0.5, "#1f9d55");
    this.rebuild();
  }

  private randomOre() {
    const total = ORE_TABLE.reduce((s, [, w]) => s + w, 0);
    let r = Math.random() * total;
    for (const [id, w] of ORE_TABLE) if ((r -= w) <= 0) return id;
    return 3;
  }

  private fillMine(initial = false) {
    const b = this.mineBounds;
    let refilled = 0;
    for (let x = b.x0; x <= b.x1; x++)
      for (let z = b.z0; z <= b.z1; z++)
        for (let y = b.y0; y <= b.y1; y++) {
          if (this.get(x, y, z)) continue;
          if (!initial && this.player && this.overlapsBlock(this.player.pos, x, y, z)) continue;
          this.set(x, y, z, this.randomOre());
          refilled++;
        }
    if (!initial && refilled) this.pushFeed("The mine has been refilled!");
  }

  private buildBlockFall() {
    const palette = [17, 18, 19, 20, 21];
    [28, 18, 8].forEach((y, layer) => {
      for (let x = 0; x < 21; x++)
        for (let z = 0; z < 21; z++) this.set(x, y, z, palette[(Math.floor(x / 3) + Math.floor(z / 3) + layer) % palette.length]);
    });
    for (let x = -1; x <= 21; x++)
      for (let z = -1; z <= 21; z++) if (x === -1 || z === -1 || x === 21 || z === 21) this.set(x, 36, z, 16);
    this.addCage(-1, 0, -1, 22, 36, 22);
    this.addLabel("BLOCK FALL", 10.5, 42, 10.5, "#d6453f");
    this.rebuild();
  }

  private async loadTemplate() {
    try {
      const gltf = await new GLTFLoader().loadAsync(SANDBOX_AVATAR_MODEL);
      const box = new THREE.Box3().setFromObject(gltf.scene);
      const h = box.max.y - box.min.y || 1;
      this.template = { scene: gltf.scene, clips: gltf.animations, scale: 1.8 / h };
    } catch {
      this.template = null;
    }
  }

  private fallbackModel() {
    const g = new THREE.Group();
    const part = (w: number, h: number, d: number, color: number, y: number, x = 0) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));
      m.position.set(x, y, 0);
      m.castShadow = true;
      g.add(m);
    };
    part(0.5, 0.5, 0.5, 0xf2c79b, 1.55);
    part(0.52, 0.2, 0.52, 0xf0c442, 1.78);
    part(0.5, 0.6, 0.28, 0xe0492e, 1.0);
    part(0.22, 0.7, 0.26, 0xd13e26, 0.35, -0.13);
    part(0.22, 0.7, 0.26, 0xd13e26, 0.35, 0.13);
    return g;
  }

  private spawnCharacter(name: string, pos: THREE.Vector3, bot: boolean): Character {
    const root = new THREE.Group();
    let model: THREE.Object3D;
    let mixer: THREE.AnimationMixer | undefined;
    let walk: THREE.AnimationAction | undefined;
    if (this.template) {
      model = cloneSkinned(this.template.scene);
      model.scale.setScalar(this.template.scale);
      const box = new THREE.Box3().setFromObject(model);
      model.position.y = -box.min.y;
      model.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) {
          o.castShadow = true;
          o.frustumCulled = false;
        }
      });
      mixer = new THREE.AnimationMixer(model);
      const clip = this.template.clips.find((c) => /walk|run/i.test(c.name)) ?? this.template.clips[0];
      if (clip) {
        walk = mixer.clipAction(clip);
        walk.play();
        walk.weight = 0;
      }
    } else model = this.fallbackModel();
    root.add(model);
    const tag = textSprite(name, { size: 40 });
    tag.position.y = 2.2;
    root.add(tag);
    root.position.copy(pos);
    this.scene.add(root);
    const c: Character = {
      name, root, model, mixer, walk, pos: pos.clone(), vel: new THREE.Vector3(), onGround: false,
      yaw: 0, alive: true, bot, aiTimer: 0, stepTimer: 0, bubbleUntil: 0,
    };
    this.chars.push(c);
    return c;
  }

  private overlapsBlock(p: THREE.Vector3, bx: number, by: number, bz: number) {
    return p.x + W > bx && p.x - W < bx + 1 && p.y + H > by && p.y < by + 1 && p.z + W > bz && p.z - W < bz + 1;
  }

  private collides(p: THREE.Vector3) {
    for (let x = Math.floor(p.x - W); x <= Math.floor(p.x + W - 1e-4); x++)
      for (let y = Math.floor(p.y); y <= Math.floor(p.y + H - 1e-4); y++)
        for (let z = Math.floor(p.z - W); z <= Math.floor(p.z + W - 1e-4); z++) if (this.get(x, y, z)) return true;
    return false;
  }

  private physics(c: Character, dt: number) {
    c.vel.y = Math.max(c.vel.y - GRAVITY * dt, -40);
    const steps = Math.ceil((c.vel.length() * dt) / 0.2) || 1;
    const sdt = dt / steps;
    const wasGround = c.onGround;
    c.onGround = false;
    for (let i = 0; i < steps; i++) {
      c.pos.x += c.vel.x * sdt;
      if (this.collides(c.pos)) {
        c.pos.x -= c.vel.x * sdt;
        c.vel.x = 0;
      }
      c.pos.z += c.vel.z * sdt;
      if (this.collides(c.pos)) {
        c.pos.z -= c.vel.z * sdt;
        c.vel.z = 0;
      }
      c.pos.y += c.vel.y * sdt;
      if (this.collides(c.pos)) {
        if (c.vel.y < 0) {
          c.pos.y = Math.floor(c.pos.y) + 1;
          c.onGround = true;
        } else c.pos.y = Math.floor(c.pos.y + H) - H - 1e-3;
        c.vel.y = 0;
      }
    }
    if (c.onGround && !wasGround && c === this.player) playSound("land");
    if (this.mode === "blockfall") {
      c.pos.x = THREE.MathUtils.clamp(c.pos.x, -0.7, 21.7);
      c.pos.z = THREE.MathUtils.clamp(c.pos.z, -0.7, 21.7);
    }
  }

  private moveCharacter(c: Character, dx: number, dz: number, jump: boolean, dt: number) {
    const len = Math.hypot(dx, dz);
    const accel = c.onGround ? 14 : 5;
    const tx = len ? (dx / len) * SPEED : 0;
    const tz = len ? (dz / len) * SPEED : 0;
    c.vel.x += (tx - c.vel.x) * Math.min(1, accel * dt);
    c.vel.z += (tz - c.vel.z) * Math.min(1, accel * dt);
    if (jump && c.onGround) {
      c.vel.y = JUMP;
      c.onGround = false;
      if (c === this.player) playSound("jump");
    }
    this.physics(c, dt);
    const speed = Math.hypot(c.vel.x, c.vel.z);
    if (speed > 0.4) {
      const target = Math.atan2(c.vel.x, c.vel.z);
      let diff = target - c.yaw;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      c.yaw += diff * Math.min(1, 12 * dt);
    }
    c.root.position.copy(c.pos);
    c.model.rotation.y = c.yaw;
    if (c.walk) {
      const w = c.onGround ? Math.min(1, speed / SPEED) : 0.3;
      c.walk.weight += (w - c.walk.weight) * Math.min(1, 10 * dt);
      c.walk.timeScale = 0.6 + speed / SPEED;
    } else {
      c.model.position.y = c.onGround && speed > 0.5 ? Math.abs(Math.sin(performance.now() / 110)) * 0.08 : 0;
    }
    c.mixer?.update(dt);
    if (c === this.player && c.onGround && speed > 1) {
      c.stepTimer -= dt;
      if (c.stepTimer <= 0) {
        c.stepTimer = 0.34;
        const under = this.get(Math.floor(c.pos.x), Math.floor(c.pos.y - 0.1), Math.floor(c.pos.z));
        playFootstep(under === 1 || under === 2 ? "grass" : under >= 17 && under <= 22 ? "wool" : under === 7 ? "wood" : "stone");
      }
    }
  }

  private botThink(c: Character, dt: number) {
    c.aiTimer -= dt;
    if (!c.aiTarget || c.aiTimer <= 0 || c.pos.distanceTo(c.aiTarget) < 0.8) {
      c.aiTimer = 0.8 + Math.random() * 1.6;
      const y = Math.floor(c.pos.y - 0.1);
      let best: THREE.Vector3 | null = null;
      for (let i = 0; i < 12; i++) {
        const x = Math.floor(c.pos.x + (Math.random() - 0.5) * 10);
        const z = Math.floor(c.pos.z + (Math.random() - 0.5) * 10);
        const id = this.get(x, y, z);
        if (id && BLOCKS[id].fall && !this.triggered.has(key(x, y, z))) {
          best = new THREE.Vector3(x + 0.5, c.pos.y, z + 0.5);
          break;
        }
      }
      c.aiTarget = best ?? new THREE.Vector3(10.5, c.pos.y, 10.5);
    }
    const dx = c.aiTarget.x - c.pos.x;
    const dz = c.aiTarget.z - c.pos.z;
    const ahead = this.get(Math.floor(c.pos.x + Math.sign(dx) * 0.8), Math.floor(c.pos.y - 0.1), Math.floor(c.pos.z + Math.sign(dz) * 0.8));
    const jump = c.onGround && (!ahead || Math.random() < 0.01);
    this.moveCharacter(c, dx, dz, jump, dt);
  }

  private triggerUnder(c: Character, now: number) {
    if (!c.onGround) return;
    const y = Math.floor(c.pos.y - 0.1);
    for (const [ox, oz] of [[-W, -W], [W, -W], [-W, W], [W, W]]) {
      const x = Math.floor(c.pos.x + ox * 0.9);
      const z = Math.floor(c.pos.z + oz * 0.9);
      const k = key(x, y, z);
      const id = this.get(x, y, z);
      if (id && BLOCKS[id].fall && !this.triggered.has(k)) {
        this.triggered.set(k, now);
        this.set(x, y, z, WARN_ID);
      }
    }
  }

  private updateTriggered(now: number) {
    for (const [k, t] of this.triggered) {
      if (now - t < 0.55) continue;
      this.triggered.delete(k);
      const [x, y, z] = k.split(",").map(Number);
      if (this.get(x, y, z) !== WARN_ID) continue;
      this.set(x, y, z, 0);
      const mesh = new THREE.Mesh(this.geo, this.material(WARN_ID));
      mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
      this.scene.add(mesh);
      this.falling.push({
        mesh, vel: 0, life: 2,
        spin: new THREE.Vector3((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4),
      });
    }
  }

  private burst(id: number, x: number, y: number, z: number) {
    const mat = this.material(id);
    for (let i = 0; i < 10; i++) {
      const m = new THREE.Mesh(this.geo, mat);
      m.scale.setScalar(0.18);
      m.position.set(x + 0.2 + Math.random() * 0.6, y + 0.2 + Math.random() * 0.6, z + 0.2 + Math.random() * 0.6);
      this.scene.add(m);
      this.particles.push({
        mesh: m, life: 0.7,
        vel: new THREE.Vector3((Math.random() - 0.5) * 4, 2 + Math.random() * 3, (Math.random() - 0.5) * 4),
      });
    }
  }

  private pickAt(clientX: number, clientY: number): string | null {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    ray.far = 40;
    const hits = ray.intersectObjects([...this.meshes.values()], false);
    for (const h of hits) {
      const mesh = h.object as THREE.InstancedMesh;
      const k = this.instanceKeys.get(mesh.userData.blockId)?.[h.instanceId ?? -1];
      if (!k) continue;
      const [x, y, z] = k.split(",").map(Number);
      if (this.player.pos.distanceTo(new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5)) > REACH) return null;
      return k;
    }
    return null;
  }

  private frontTarget(): string | null {
    const p = this.player.pos;
    const fx = Math.sin(this.player.yaw);
    const fz = Math.cos(this.player.yaw);
    for (const dy of [0.5, 1.5, -0.5]) {
      for (const d of [0.8, 1.4]) {
        const x = Math.floor(p.x + fx * d);
        const y = Math.floor(p.y + dy);
        const z = Math.floor(p.z + fz * d);
        const id = this.get(x, y, z);
        if (id && BLOCKS[id].hardness !== Infinity) return key(x, y, z);
      }
    }
    return null;
  }

  private updateMining(dt: number) {
    let target: string | null = null;
    if (this.pointerMine) target = this.pickAt(this.pointerMine.x, this.pointerMine.y);
    else if (this.input.mine) target = this.frontTarget();
    if (target) {
      const [x, y, z] = target.split(",").map(Number);
      const id = this.get(x, y, z);
      if (!id || BLOCKS[id].hardness === Infinity || BLOCKS[id].fall || id === WARN_ID) target = null;
    }
    if (target !== this.mineTarget) {
      this.mineTarget = target;
      this.mineProgress = 0;
    }
    if (!target) {
      this.highlight.visible = false;
      return;
    }
    const [x, y, z] = target.split(",").map(Number);
    const id = this.get(x, y, z);
    this.highlight.visible = true;
    this.highlight.position.set(x + 0.5, y + 0.5, z + 0.5);
    const prev = this.mineProgress;
    this.mineProgress += dt / BLOCKS[id].hardness;
    if (Math.floor(prev * 4) !== Math.floor(this.mineProgress * 4)) playSound("mine_tick");
    const dx = x + 0.5 - this.player.pos.x;
    const dz = z + 0.5 - this.player.pos.z;
    this.player.yaw = Math.atan2(dx, dz);
    if (this.mineProgress >= 1) {
      this.set(x, y, z, 0);
      this.burst(id, x, y, z);
      playSound("break");
      const g = BLOCKS[id].gems;
      if (g) {
        this.gems += g;
        this.onGems(this.gems);
        this.pushFeed(`+${g} gems`);
        playSound("pop");
      }
      this.mineTarget = null;
      this.mineProgress = 0;
    }
  }

  private pushFeed(msg: string) {
    this.feed = [msg, ...this.feed].slice(0, 4);
  }

  say(text: string) {
    const c = this.player;
    if (!c) return;
    if (c.bubble) c.root.remove(c.bubble);
    c.bubble = textSprite(text.slice(0, 60), { bg: "rgba(255,255,255,0.95)", color: "#1b1b2f", size: 40 });
    c.bubble.position.y = 2.75;
    c.root.add(c.bubble);
    c.bubbleUntil = performance.now() + 5000;
  }

  emote(kind: "jump" | "spin" | "wave") {
    const c = this.player;
    if (!c) return;
    if (kind === "jump" && c.onGround) c.vel.y = JUMP * 1.1;
    if (kind === "spin") c.yaw += Math.PI * 2 - 0.01;
    this.say(kind === "wave" ? "Hi everyone!" : kind === "spin" ? "Wheee!" : "Yay!");
  }

  cycleCamera() {
    this.camMode = this.camMode === "third" ? "first" : this.camMode === "first" ? "front" : "third";
    return this.camMode;
  }

  restart() {
    if (this.mode !== "blockfall") {
      this.player.pos.set(0.5, 8, 0.5);
      this.player.vel.set(0, 0, 0);
      return;
    }
    for (const c of this.chars) this.scene.remove(c.root);
    this.chars = [];
    for (const f of this.falling) this.scene.remove(f.mesh);
    this.falling = [];
    this.triggered.clear();
    for (const k of [...this.blocks.keys()]) {
      const [x, y, z] = k.split(",").map(Number);
      this.set(x, y, z, 0);
    }
    this.buildBlockFall();
    this.player = this.spawnCharacter(this.playerName, new THREE.Vector3(10.5, 32, 10.5), false);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      this.spawnCharacter(BOT_NAMES[i], new THREE.Vector3(10.5 + Math.cos(a) * 6, 32, 10.5 + Math.sin(a) * 6), true);
    }
    this.feed = [];
    this.roundTime = 0;
    this.countdown = 3;
    this.phase = "countdown";
  }

  private bindInput() {
    const keys: Record<string, keyof QblockEngine["input"]> = {
      KeyW: "f", ArrowUp: "f", KeyS: "b", ArrowDown: "b", KeyA: "l", ArrowLeft: "l", KeyD: "r", ArrowRight: "r",
      Space: "jump", KeyE: "mine",
    };
    const onKey = (down: boolean) => (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
      const k = keys[e.code];
      if (!k) return;
      e.preventDefault();
      if (k === "jump" || k === "mine") this.input[k] = down;
      else this.input[k] = down ? 1 : 0;
    };
    const kd = onKey(true);
    const ku = onKey(false);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);

    let drag: { id: number; x: number; y: number; sx: number; sy: number; moved: boolean } | null = null;
    const down = (e: PointerEvent) => {
      if (drag) return;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false };
      this.canvas.setPointerCapture(e.pointerId);
      if (this.mode === "skyblock") this.pointerMine = { x: e.clientX, y: e.clientY };
    };
    const move = (e: PointerEvent) => {
      if (!drag || drag.id !== e.pointerId) return;
      if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 10) {
        drag.moved = true;
        this.pointerMine = null;
      }
      if (drag.moved) {
        this.yaw -= (e.clientX - drag.x) * 0.006;
        this.pitch = THREE.MathUtils.clamp(this.pitch + (e.clientY - drag.y) * 0.005, -0.9, 1.2);
      }
      drag.x = e.clientX;
      drag.y = e.clientY;
    };
    const up = (e: PointerEvent) => {
      if (!drag || drag.id !== e.pointerId) return;
      drag = null;
      this.pointerMine = null;
    };
    const wheel = (e: WheelEvent) => {
      this.camDist = THREE.MathUtils.clamp(this.camDist + e.deltaY * 0.01, 2.5, 12);
    };
    const resize = () => this.resize();
    this.canvas.addEventListener("pointerdown", down);
    this.canvas.addEventListener("pointermove", move);
    this.canvas.addEventListener("pointerup", up);
    this.canvas.addEventListener("pointercancel", up);
    this.canvas.addEventListener("wheel", wheel, { passive: true });
    window.addEventListener("resize", resize);
    this.listeners.push(() => {
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      window.removeEventListener("resize", resize);
      this.canvas.removeEventListener("pointerdown", down);
      this.canvas.removeEventListener("pointermove", move);
      this.canvas.removeEventListener("pointerup", up);
      this.canvas.removeEventListener("pointercancel", up);
      this.canvas.removeEventListener("wheel", wheel);
    });
  }

  private resize() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = w < h ? 80 : 70;
    this.camera.updateProjectionMatrix();
  }

  private updateCamera() {
    const p = this.player;
    const head = new THREE.Vector3(p.pos.x, p.pos.y + 1.55, p.pos.z);
    p.model.visible = this.camMode !== "first";
    if (this.camMode === "first") {
      this.camera.position.copy(head);
      this.camera.rotation.set(-this.pitch * 0.8, this.yaw, 0, "YXZ");
      return;
    }
    const front = this.camMode === "front";
    const yaw = front ? p.yaw : this.yaw;
    const pitch = front ? 0.15 : this.pitch;
    const dist = front ? 3.2 : this.camDist;
    const cp = Math.cos(pitch);
    const offset = new THREE.Vector3(Math.sin(yaw) * cp, Math.sin(pitch), Math.cos(yaw) * cp).multiplyScalar(dist);
    const desired = head.clone().add(offset);
    this.camera.position.lerp(desired, 0.35);
    this.camera.lookAt(head);
  }

  private loop = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const now = this.clock.elapsedTime;

    if (this.phase === "countdown") {
      this.countdown -= dt;
      if (this.countdown <= 0) {
        this.phase = "playing";
        this.pushFeed("GO! Don't fall!");
      }
    } else if (this.phase === "playing" && this.mode === "blockfall") this.roundTime += dt;

    const canMove = this.phase === "playing" || this.mode === "skyblock" || this.phase === "countdown";
    const fwd = this.input.f - this.input.b;
    const side = this.input.r - this.input.l;
    const fx = -Math.sin(this.yaw);
    const fz = -Math.cos(this.yaw);
    const dx = fx * fwd - fz * side;
    const dz = fz * fwd + fx * side;
    if (this.player.alive) {
      if (this.camMode === "first" && (dx || dz)) this.player.yaw = Math.atan2(dx, dz);
      this.moveCharacter(this.player, canMove ? dx : 0, canMove ? dz : 0, canMove && this.input.jump, dt);
    }

    for (const c of this.chars) {
      if (!c.bot || !c.alive) continue;
      if (this.phase === "playing") this.botThink(c, dt);
      else this.moveCharacter(c, 0, 0, false, dt);
    }

    if (this.mode === "blockfall" && this.phase === "playing") {
      for (const c of this.chars) if (c.alive) this.triggerUnder(c, now);
      this.updateTriggered(now);
      for (const c of this.chars) {
        if (!c.alive || c.pos.y > 1) continue;
        c.alive = false;
        c.root.visible = false;
        this.pushFeed(`${c.name} fell!`);
        playSound("pop");
      }
      const alive = this.chars.filter((c) => c.alive);
      if (!this.player.alive || (alive.length === 1 && alive[0] === this.player)) {
        const won = this.player.alive;
        this.phase = won ? "won" : "lost";
        const place = won ? 1 : alive.length + 1;
        this.onRoundEnd({ won, time: Math.round(this.roundTime * 10) / 10, place });
      }
    }
    if (this.mode === "skyblock") {
      this.updateMining(dt);
      this.mineRegen += dt;
      if (this.mineRegen > 60) {
        this.mineRegen = 0;
        this.fillMine();
      }
      if (this.player.pos.y < -20) {
        this.player.pos.set(0.5, 8, 0.5);
        this.player.vel.set(0, 0, 0);
        this.pushFeed("Oops! You fell into the void");
      }
    }

    for (let i = this.falling.length - 1; i >= 0; i--) {
      const f = this.falling[i];
      f.vel -= GRAVITY * 0.6 * dt;
      f.mesh.position.y += f.vel * dt;
      f.mesh.rotation.x += f.spin.x * dt;
      f.mesh.rotation.z += f.spin.z * dt;
      f.life -= dt;
      if (f.life <= 0) {
        this.scene.remove(f.mesh);
        this.falling.splice(i, 1);
      }
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.vel.y -= GRAVITY * 0.7 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.life -= dt;
      p.mesh.scale.setScalar(Math.max(0.01, 0.18 * (p.life / 0.7)));
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
      }
    }
    if (this.player.bubble && performance.now() > this.player.bubbleUntil) {
      this.player.root.remove(this.player.bubble);
      this.player.bubble = undefined;
    }

    this.rebuild();
    this.updateCamera();
    this.sun.position.set(this.player.pos.x + 30, this.player.pos.y + 60, this.player.pos.z + 20);
    this.sun.target.position.copy(this.player.pos);
    this.renderer.render(this.scene, this.camera);

    if (now - this.lastHud > 0.1) {
      this.lastHud = now;
      const b = this.mineBounds;
      const p = this.player.pos;
      this.onHud({
        phase: this.phase,
        countdown: Math.ceil(this.countdown),
        gems: this.gems,
        alive: this.chars.filter((c) => c.alive).length,
        total: this.chars.length,
        time: Math.floor(this.roundTime),
        mining: this.mineTarget ? this.mineProgress : 0,
        inMine: p.x > b.x0 - 1 && p.x < b.x1 + 2 && p.z > b.z0 - 1 && p.z < b.z1 + 2,
        feed: this.feed,
      });
    }
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.listeners.forEach((l) => l());
    this.renderer.dispose();
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose?.();
    });
    this.texCache.forEach((t) => t.dispose());
  }
}
