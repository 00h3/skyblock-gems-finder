import * as THREE from "three";
import { createHpBar, type HpBar } from "@/engine/hpbar";
import type { Player } from "@/engine/player";
import type { World } from "@/engine/world";
import { announce } from "./announcer";
import {
  ARENA,
  MINE_TIERS,
  REALM_BOUNDS,
  REALM_SPAWN,
  REALM_TOP,
  buildMinibgRealm,
  inMine,
  inRealm,
  mineTierAtY,
} from "./minibg-build";

export type SkillInfo = { level: number; into: number; need: number; perk: string };
export type RealmSnapshot = {
  inside: boolean;
  zone: string;
  hp: number;
  maxHp: number;
  hurtAt: number;
  mining: SkillInfo;
  combat: SkillInfo;
};

const MAX_LEVEL = 30;
const SAVE_KEY = "qb_minibg_skills_v1";
const PLACEHOLDER = 12;

const xpToReach = (level: number) => Math.round(40 * Math.pow(level - 1, 1.6));
function levelFor(xp: number) {
  let l = 1;
  while (l < MAX_LEVEL && xp >= xpToReach(l + 1)) l++;
  return l;
}

/** Breakable mine nodes: skill XP, required Mining level, regrow seconds. */
const NODES = new Map<number, { xp: number; level: number; regrow: number; name: string }>([
  [3, { xp: 1, level: 1, regrow: 4, name: "Stone" }],
  [4, { xp: 1, level: 1, regrow: 4, name: "Cobblestone" }],
  [15, { xp: 1, level: 1, regrow: 4, name: "Gravel" }],
  [36, { xp: 3, level: 1, regrow: 5, name: "Coal" }],
  [37, { xp: 6, level: 3, regrow: 6, name: "Redstone" }],
  [19, { xp: 8, level: 4, regrow: 7, name: "Gold" }],
  [14, { xp: 2, level: 5, regrow: 6, name: "Mossy Stone" }],
  [22, { xp: 10, level: 6, regrow: 8, name: "Lapis" }],
  [20, { xp: 16, level: 8, regrow: 10, name: "Diamond" }],
  [21, { xp: 20, level: 9, regrow: 11, name: "Emerald" }],
  [11, { xp: 25, level: 11, regrow: 12, name: "Obsidian" }],
  [35, { xp: 12, level: 11, regrow: 10, name: "Nether Brick" }],
  [18, { xp: 22, level: 12, regrow: 12, name: "Glowstone" }],
  [23, { xp: 35, level: 14, regrow: 14, name: "Amethyst" }],
]);

type MobKind = {
  name: string;
  level: number;
  hp: number;
  dmg: number;
  speed: number;
  xp: number;
  scale: number;
  aggro: number;
  respawn: number;
  skin: number;
  shirt: number;
  pants: number;
  accent?: number;
  boss?: boolean;
};

const KINDS: Record<string, MobKind> = {
  zombie: { name: "Zombie", level: 1, hp: 30, dmg: 2, speed: 2.3, xp: 10, scale: 1, aggro: 9, respawn: 8, skin: 0x5d9b4a, shirt: 0x2f8f9d, pants: 0x3b3f8f },
  brute: { name: "Skeleton Brute", level: 5, hp: 80, dmg: 4, speed: 2.6, xp: 30, scale: 1.1, aggro: 10, respawn: 12, skin: 0xe8e4d6, shirt: 0xbfb9a6, pants: 0x8a8577 },
  knight: { name: "Royal Knight", level: 10, hp: 180, dmg: 6, speed: 3, xp: 70, scale: 1.15, aggro: 11, respawn: 18, skin: 0xd9a57a, shirt: 0x9aa3ad, pants: 0x5c636b, accent: 0xf2c94c },
  golem: { name: "Golem King", level: 20, hp: 900, dmg: 11, speed: 1.9, xp: 500, scale: 2.3, aggro: 15, respawn: 60, skin: 0x8e8a86, shirt: 0x6f6b67, pants: 0x55514d, accent: 0xb07cf0, boss: true },
};

type Mob = {
  kind: MobKind;
  root: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  mats: THREE.MeshStandardMaterial[];
  bar: HpBar;
  hp: number;
  home: THREE.Vector3;
  pos: THREE.Vector3;
  knock: THREE.Vector3;
  yaw: number;
  atkCd: number;
  swing: number;
  walk: number;
  flash: number;
  dead: number;
  respawnIn: number;
};

const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
const GEO = {
  head: box(0.5, 0.5, 0.5),
  body: box(0.5, 0.72, 0.28),
  limb: box(0.22, 0.72, 0.22),
  crown: box(0.12, 0.16, 0.12),
  visor: box(0.52, 0.1, 0.1),
  eye: box(0.1, 0.08, 0.04),
};

function limb(geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number) {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, 0);
  const m = new THREE.Mesh(geo, mat);
  m.position.y = -0.36;
  m.castShadow = true;
  pivot.add(m);
  return pivot;
}

function makeMob(kind: MobKind, home: THREE.Vector3): Mob {
  const mat = (c: number) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, emissive: 0x000000 });
  const skin = mat(kind.skin);
  const shirt = mat(kind.shirt);
  const pants = mat(kind.pants);
  const root = new THREE.Group();
  const head = new THREE.Mesh(GEO.head, skin);
  head.position.y = 1.69;
  head.castShadow = true;
  const body = new THREE.Mesh(GEO.body, shirt);
  body.position.y = 1.08;
  body.castShadow = true;
  const armL = limb(GEO.limb, kind.boss ? shirt : skin, -0.36, 1.42);
  const armR = limb(GEO.limb, kind.boss ? shirt : skin, 0.36, 1.42);
  const legL = limb(GEO.limb, pants, -0.13, 0.72);
  const legR = limb(GEO.limb, pants, 0.13, 0.72);
  root.add(head, body, armL, armR, legL, legR);
  const mats = [skin, shirt, pants];
  if (kind.accent !== undefined) {
    const accent = new THREE.MeshStandardMaterial({ color: kind.accent, emissive: kind.accent, emissiveIntensity: kind.boss ? 0.9 : 0.15, roughness: 0.4, metalness: 0.5 });
    mats.push(accent);
    if (kind.boss) {
      for (const x of [-0.12, 0.12]) {
        const eye = new THREE.Mesh(GEO.eye, accent);
        eye.position.set(x, 1.73, -0.26);
        root.add(eye);
      }
      for (const [x, z] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19], [0, -0.19], [0, 0.19]]) {
        const c = new THREE.Mesh(GEO.crown, accent);
        c.position.set(x, 2.02, z);
        root.add(c);
      }
    } else {
      const visor = new THREE.Mesh(GEO.visor, accent);
      visor.position.set(0, 1.74, -0.22);
      root.add(visor);
    }
  }
  root.scale.setScalar(kind.scale);
  const bar = createHpBar(`[Lv${kind.level}] ${kind.name}`, kind.hp);
  if (kind.boss) bar.sprite.scale.multiplyScalar(1.6);
  return {
    kind, root, armL, armR, legL, legR, mats, bar,
    hp: kind.hp,
    home: home.clone(),
    pos: home.clone(),
    knock: new THREE.Vector3(),
    yaw: Math.random() * Math.PI * 2,
    atkCd: 0, swing: 0, walk: 0, flash: 0, dead: 0, respawnIn: 0,
  };
}

const FOG_DEEP = new THREE.Color(0x17120d);
const FOG_CORE = new THREE.Color(0x3a1409);
const _v = new THREE.Vector3();
const _c = new THREE.Color();

export class MinibgRealm {
  inside = false;
  private built = false;
  private group = new THREE.Group();
  private mobs: Mob[] = [];
  private regrow: { x: number; y: number; z: number; id: number; t: number }[] = [];
  private miningXp = 0;
  private combatXp = 0;
  private hp = 20;
  private hurtAt = 0;
  private lastHurt = -99;
  private attackCd = 0;
  private islandSpawn = new THREE.Vector3();
  private fogBase: { near: number; far: number } | null = null;
  private depthMix = 0;
  private emitT = 0;
  private lastSnap = "";
  private clock = 0;
  onSnapshot?: (s: RealmSnapshot) => void;
  onPlayerHit?: () => void;
  onMobHit?: () => void;

  constructor(
    private scene: THREE.Scene,
    private world: World,
  ) {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const s = JSON.parse(raw) as { mining?: number; combat?: number };
        this.miningXp = Math.max(0, Number(s.mining) || 0);
        this.combatXp = Math.max(0, Number(s.combat) || 0);
      }
    } catch {
      /* corrupt save: start fresh */
    }
    this.hp = this.maxHp;
    this.group.visible = false;
    scene.add(this.group);
  }

  get miningLevel() {
    return levelFor(this.miningXp);
  }
  get combatLevel() {
    return levelFor(this.combatXp);
  }
  get maxHp() {
    return 20 + (this.combatLevel - 1) * 4;
  }
  /** Multiplier applied to break time inside the realm. */
  get mineTimeMul() {
    return 1 / (1 + 0.07 * (this.miningLevel - 1));
  }

  contains(x: number) {
    return inRealm(x);
  }

  private save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ mining: this.miningXp, combat: this.combatXp }));
    } catch {
      /* storage full or unavailable */
    }
  }

  private addXp(skill: "mining" | "combat", xp: number) {
    const before = skill === "mining" ? this.miningLevel : this.combatLevel;
    if (skill === "mining") this.miningXp += xp;
    else this.combatXp += xp;
    const after = skill === "mining" ? this.miningLevel : this.combatLevel;
    if (after > before) {
      if (skill === "mining") announce(`Mining Level ${after}`, `Mining speed +${Math.round(7 * (after - 1))}%`, "reward");
      else {
        this.hp = this.maxHp;
        announce(`Combat Level ${after}`, `+${Math.round(8 * (after - 1))}% damage · ${this.maxHp} HP`, "reward");
      }
    }
    this.save();
  }

  private spawnMobs() {
    const { cx, cz } = ARENA;
    const ring = (count: number, r0: number, r1: number, kind: MobKind) => {
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + r0 * 0.1;
        const r = r0 + ((i * 7) % 5) * ((r1 - r0) / 5);
        this.addMob(kind, new THREE.Vector3(cx + Math.cos(a) * r, REALM_TOP + 1, cz + Math.sin(a) * r));
      }
    };
    ring(7, 18, 24, KINDS.zombie);
    ring(4, 11, 15, KINDS.brute);
    ring(3, 11.5, 14, KINDS.knight);
    this.addMob(KINDS.golem, new THREE.Vector3(cx, REALM_TOP + 2, cz));
  }

  private addMob(kind: MobKind, home: THREE.Vector3) {
    const mob = makeMob(kind, home);
    this.group.add(mob.root, mob.bar.sprite);
    this.mobs.push(mob);
  }

  enter(player: Player) {
    if (!this.built) {
      buildMinibgRealm(this.world);
      this.world.meshAll();
      this.spawnMobs();
      this.built = true;
    }
    if (!this.inside) this.islandSpawn.copy(player.spawnPoint);
    const spawn = new THREE.Vector3(REALM_SPAWN.x, REALM_SPAWN.y, REALM_SPAWN.z);
    player.setSpawnPoint(spawn);
    player.respawn(spawn);
    this.inside = true;
    this.group.visible = true;
    this.hp = this.maxHp;
    const fog = this.scene.fog as THREE.Fog | null;
    if (fog && !this.fogBase) this.fogBase = { near: fog.near, far: fog.far };
    announce("Minibg Realm", "Mines to the west · Royal Arena to the east", "event");
    this.emit(true);
  }

  exit(player: Player) {
    if (!this.inside) return;
    player.setSpawnPoint(this.islandSpawn);
    player.respawn(this.islandSpawn.clone());
    this.inside = false;
    this.group.visible = false;
    this.restoreFog();
    this.emit(true);
  }

  private restoreFog() {
    const fog = this.scene.fog as THREE.Fog | null;
    if (fog && this.fogBase) {
      fog.near = this.fogBase.near;
      fog.far = this.fogBase.far;
    }
    this.fogBase = null;
    this.depthMix = 0;
  }

  /** Called before a realm block breaks. Returns false (and explains why) when it must stay. */
  canMine(id: number, x: number, z: number) {
    if (!inMine(x, z)) return false;
    const node = NODES.get(id);
    if (!node) return false;
    if (this.miningLevel < node.level) {
      announce(`Mining Level ${node.level} required`, `${node.name} needs a stronger miner`, "info");
      return false;
    }
    return true;
  }

  /** Called after a realm node breaks: grants XP and leaves bedrock until it regrows. */
  onMined(id: number, x: number, y: number, z: number) {
    const node = NODES.get(id);
    if (!node) return;
    this.world.set(x, y, z, PLACEHOLDER);
    this.regrow.push({ x, y, z, id, t: node.regrow });
    this.addXp("mining", node.xp);
  }

  /** Swing at the mob under the crosshair. Returns true when a mob is aimed at (so the swing never mines). */
  tryAttack(eye: THREE.Vector3, dir: THREE.Vector3, weaponDamage: number) {
    if (!this.inside) return false;
    let best: Mob | null = null;
    let bestT = Infinity;
    for (const m of this.mobs) {
      if (m.dead > 0) continue;
      const s = m.kind.scale;
      _v.set(m.pos.x, m.pos.y + 1.0 * s, m.pos.z).sub(eye);
      const t = _v.dot(dir);
      if (t < 0 || t > 3.4 + 0.5 * s) continue;
      const perp = _v.addScaledVector(dir, -t).length();
      if (perp < 0.45 * s + 0.3 && t < bestT) {
        best = m;
        bestT = t;
      }
    }
    if (!best) return false;
    if (this.attackCd > 0) return true;
    this.attackCd = 0.42;
    const crit = Math.random() < 0.15;
    const dmg = Math.max(1, weaponDamage) * 4 * (1 + 0.08 * (this.combatLevel - 1)) * (crit ? 1.75 : 1);
    best.hp = Math.max(0, best.hp - dmg);
    best.bar.set(Math.ceil(best.hp));
    best.flash = 1;
    best.knock.set(dir.x, 0, dir.z).normalize().multiplyScalar(best.kind.boss ? 1.2 : 6);
    this.onMobHit?.();
    if (best.hp <= 0) {
      best.dead = 0.001;
      best.respawnIn = best.kind.respawn;
      this.addXp("combat", best.kind.xp);
      if (best.kind.boss) announce("Golem King defeated", `+${best.kind.xp} Combat XP`, "reward");
    }
    return true;
  }

  private hurtPlayer(player: Player, mob: Mob) {
    this.hp = Math.max(0, this.hp - mob.kind.dmg);
    this.hurtAt = this.clock;
    this.lastHurt = this.clock;
    _v.set(player.position.x - mob.pos.x, 0, player.position.z - mob.pos.z).normalize();
    player.velocity.x += _v.x * (mob.kind.boss ? 9 : 5);
    player.velocity.z += _v.z * (mob.kind.boss ? 9 : 5);
    player.velocity.y = Math.max(player.velocity.y, mob.kind.boss ? 6 : 3.5);
    this.onPlayerHit?.();
    if (this.hp <= 0) {
      announce("You were slain", `by ${mob.kind.name} · back to the Royal Plaza`, "event");
      player.respawn(new THREE.Vector3(REALM_SPAWN.x, REALM_SPAWN.y, REALM_SPAWN.z));
      this.hp = this.maxHp;
    }
  }

  private groundAt(x: number, z: number, fromY: number) {
    const top = Math.min(47, Math.floor(fromY + 1.2));
    for (let y = top; y > 0; y--) if (this.world.solid(Math.floor(x), y, Math.floor(z))) return y + 1;
    return 0;
  }

  update(dt: number, player: Player, camera: THREE.Camera, attacking: boolean, eye: THREE.Vector3, dir: THREE.Vector3, weaponDamage: number) {
    this.clock += dt;
    for (let i = this.regrow.length - 1; i >= 0; i--) {
      const r = this.regrow[i];
      r.t -= dt;
      if (r.t <= 0) {
        if (this.world.get(r.x, r.y, r.z) === PLACEHOLDER) this.world.set(r.x, r.y, r.z, r.id);
        this.regrow.splice(i, 1);
      }
    }

    if (this.inside) {
      this.attackCd = Math.max(0, this.attackCd - dt);
      if (attacking) this.tryAttack(eye, dir, weaponDamage);
      if (this.clock - this.lastHurt > 4 && this.hp < this.maxHp) this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.05 * dt);
      this.updateMobs(dt, player, camera);
      this.updateAtmosphere(dt, player);
    }

    this.emitT -= dt;
    if (this.emitT <= 0) {
      this.emitT = 0.2;
      this.emit(false, player);
    }
  }

  private updateMobs(dt: number, player: Player, camera: THREE.Camera) {
    const p = player.position;
    const playerInArena = Math.hypot(p.x - ARENA.cx, p.z - ARENA.cz) < ARENA.r + 3 && Math.abs(p.y - REALM_TOP) < 6;
    for (const m of this.mobs) {
      const k = m.kind;
      if (m.dead > 0) {
        m.dead += dt;
        m.root.rotation.z = Math.min(Math.PI / 2, m.dead * 5);
        m.root.position.y = m.pos.y - Math.max(0, m.dead - 0.6) * 1.5;
        m.bar.sprite.visible = false;
        if (m.dead > 1.4) m.root.visible = false;
        m.respawnIn -= dt;
        if (m.respawnIn <= 0) {
          m.dead = 0;
          m.hp = k.hp;
          m.bar.set(k.hp);
          m.pos.copy(m.home);
          m.root.rotation.z = 0;
          m.root.visible = true;
        }
        continue;
      }

      const dx = p.x - m.pos.x;
      const dz = p.z - m.pos.z;
      const dist = Math.hypot(dx, dz);
      const chase = playerInArena && dist < k.aggro;
      let mx = 0;
      let mz = 0;
      let speed = 0;
      if (chase) {
        mx = dx / (dist || 1);
        mz = dz / (dist || 1);
        speed = dist > 1.2 * k.scale ? k.speed : 0;
      } else {
        const hx = m.home.x - m.pos.x;
        const hz = m.home.z - m.pos.z;
        const hd = Math.hypot(hx, hz);
        if (hd > 1) {
          mx = hx / hd;
          mz = hz / hd;
          speed = k.speed * 0.55;
        }
      }
      if (speed > 0) m.yaw = Math.atan2(-mx, -mz);

      m.knock.multiplyScalar(Math.exp(-8 * dt));
      const nx = m.pos.x + (mx * speed + m.knock.x) * dt;
      const nz = m.pos.z + (mz * speed + m.knock.z) * dt;
      const ground = this.groundAt(nx, nz, m.pos.y);
      if (ground - m.pos.y < 1.1 && Math.hypot(nx - ARENA.cx, nz - ARENA.cz) < ARENA.r - 0.8) {
        m.pos.x = nx;
        m.pos.z = nz;
      }
      const g = this.groundAt(m.pos.x, m.pos.z, m.pos.y);
      m.pos.y = g < m.pos.y ? Math.max(g, m.pos.y - 9 * dt) : g;

      m.atkCd = Math.max(0, m.atkCd - dt);
      if (chase && dist < 1.7 * k.scale && Math.abs(p.y - m.pos.y) < 2 * k.scale && m.atkCd <= 0) {
        m.atkCd = k.boss ? 1.6 : 1.1;
        m.swing = 1;
        this.hurtPlayer(player, m);
      }

      const moving = speed > 0 ? 1 : 0;
      m.walk += dt * (speed + 0.01) * 3.2;
      const s = Math.sin(m.walk) * 0.75 * moving;
      m.swing = Math.max(0, m.swing - dt * 3);
      m.legL.rotation.x = s;
      m.legR.rotation.x = -s;
      m.armL.rotation.x = -s * 0.8 - m.swing * 1.6;
      m.armR.rotation.x = s * 0.8 - m.swing * 1.6;

      m.flash = Math.max(0, m.flash - dt * 5);
      for (const mat of m.mats.slice(0, 3)) {
        mat.emissive.setRGB(m.flash * 0.9, 0, 0);
      }

      m.root.position.copy(m.pos);
      m.root.rotation.y = m.yaw;
      m.bar.sprite.position.set(m.pos.x, m.pos.y + 2.35 * k.scale + (k.boss ? 0.4 : 0), m.pos.z);
      m.bar.sprite.visible = camera.position.distanceToSquared(m.pos) < (k.boss ? 1600 : 576);
    }
  }

  private updateAtmosphere(dt: number, player: Player) {
    const fog = this.scene.fog as THREE.Fog | null;
    if (!fog || !this.fogBase) return;
    const p = player.position;
    const target = inMine(Math.floor(p.x), Math.floor(p.z)) ? THREE.MathUtils.clamp((REALM_TOP - p.y) / 26, 0, 1) : 0;
    this.depthMix += (target - this.depthMix) * Math.min(1, dt * 2.5);
    const d = this.depthMix;
    fog.near = THREE.MathUtils.lerp(this.fogBase.near, 4, d);
    fog.far = THREE.MathUtils.lerp(this.fogBase.far, 58, d);
    _c.copy(FOG_DEEP).lerp(FOG_CORE, THREE.MathUtils.clamp((d - 0.7) / 0.3, 0, 1));
    fog.color.lerp(_c, d * 0.85);
    if (this.scene.background instanceof THREE.Color) this.scene.background.lerp(_c, d * 0.85);
  }

  private zoneName(player?: Player) {
    if (!this.inside || !player) return "Private Island";
    const p = player.position;
    if (inMine(Math.floor(p.x), Math.floor(p.z))) {
      const t = MINE_TIERS[mineTierAtY(Math.floor(p.y))];
      return `The Mines · ${t.name}`;
    }
    if (Math.hypot(p.x - ARENA.cx, p.z - ARENA.cz) < ARENA.r + 6) return "Royal Arena";
    return p.z > 34 ? "Royal Plaza" : "Minibg Realm";
  }

  private skill(xp: number, perk: string): SkillInfo {
    const level = levelFor(xp);
    const base = xpToReach(level);
    const next = level >= MAX_LEVEL ? base : xpToReach(level + 1);
    return { level, into: xp - base, need: Math.max(1, next - base), perk };
  }

  private emit(force: boolean, player?: Player) {
    if (!this.onSnapshot) return;
    const snap: RealmSnapshot = {
      inside: this.inside,
      zone: this.zoneName(player),
      hp: Math.ceil(this.hp),
      maxHp: this.maxHp,
      hurtAt: this.hurtAt,
      mining: this.skill(this.miningXp, `+${Math.round(7 * (this.miningLevel - 1))}% mining speed`),
      combat: this.skill(this.combatXp, `+${Math.round(8 * (this.combatLevel - 1))}% damage · ${this.maxHp} HP`),
    };
    const key = JSON.stringify(snap);
    if (!force && key === this.lastSnap) return;
    this.lastSnap = key;
    this.onSnapshot(snap);
  }

  dispose() {
    this.restoreFog();
    for (const m of this.mobs) {
      m.bar.dispose();
      m.mats.forEach((mat) => mat.dispose());
    }
    this.scene.remove(this.group);
    this.group.clear();
    this.mobs = [];
  }
}

export { REALM_BOUNDS };
