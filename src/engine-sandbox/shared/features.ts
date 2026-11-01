import * as THREE from "three";
import { BLOCK_BY_ID, BLOCK_ID, LAVA_ID, WATER_ID, type World } from "./world";
import { HITBOX, type Player } from "./player";
import type { Hit } from "./interact";

export type ItemId = number | string;

export const UTILITY_ITEMS = [
  "water_bucket",
  "lava_bucket",
  "flint_steel",
  "fire_charge",
  "ender_pearl",
  "golden_apple",
  "shield",
  "wind_charge",
  "speed_potion",
  "slime_ball",
  "magic_stick",
] as const;

export const UTILITY_INFO: Record<string, { name: string; desc: string }> = {
  water_bucket: { name: "Water Bucket", desc: "Clutch a fall or cool lava into cobblestone." },
  lava_bucket: { name: "Lava Bucket", desc: "Island defense trap and cobble generator fuel." },
  flint_steel: { name: "Flint & Steel", desc: "Ignites TNT. Aim at a TNT block and use." },
  fire_charge: { name: "Fire Charge", desc: "Throw to blast a small crater. Lights TNT." },
  ender_pearl: { name: "Ender Pearl", desc: "Throw and teleport to where it lands." },
  golden_apple: { name: "Golden Apple", desc: "Restores health. Great from the off-hand." },
  shield: { name: "Shield", desc: "Raise just before a hit to parry. Hold it in the off-hand." },
  wind_charge: { name: "Wind Charge", desc: "Launch compressed air! Propels you high into the sky on impact." },
  speed_potion: { name: "Swiftness Potion", desc: "Drink for an agile +50% speed boost and bouncy strides for 15s." },
  slime_ball: { name: "Slime Ball", desc: "Bouncy gel blob. Throw to launch yourself or trigger a mega-bounce." },
  magic_stick: { name: "Magic Building Stick", desc: "Enchanted builder's wand inspired by Minecraft: cast bridges, walls, platforms, and fills!" },
};

export const NEW_BLOCK_IDS: number[] = [
  BLOCK_ID.ironOre,
  BLOCK_ID.diamondOre,
  BLOCK_ID.woodDoor,
  BLOCK_ID.ironDoor,
  BLOCK_ID.doorButton,
  BLOCK_ID.chest,
  BLOCK_ID.trappedChest,
  BLOCK_ID.tnt,
  BLOCK_ID.blastGlass,
  BLOCK_ID.ladder,
  BLOCK_ID.bed,
  BLOCK_ID.anchor,
  BLOCK_ID.lava,
  BLOCK_ID.slime,
  BLOCK_ID.oakSlab,
  BLOCK_ID.stoneSlab,
  BLOCK_ID.oakVSlab,
  BLOCK_ID.brickQuarter,
  BLOCK_ID.brickVSlab,
];

export const NEW_BACKPACK_ITEMS: ItemId[] = [...UTILITY_ITEMS, ...NEW_BLOCK_IDS];

export const QUICK_BUY_PRESETS: { name: string; blurb: string; items: ItemId[] }[] = [
  {
    name: "Rusher",
    blurb: "Fast bridge, pearl, and wind charge to escape",
    items: ["iron_sword", 5, 13, 10, "ender_pearl", "wind_charge", "speed_potion", "golden_apple", 59, 63],
  },
  {
    name: "Defender",
    blurb: "Walls, shield and bed guard",
    items: ["short_sword", 58, 5, 68, 67, "shield", "golden_apple", 60, 53],
  },
  {
    name: "Raider",
    blurb: "TNT, igniters, wind burst and a diamond blade",
    items: ["diamond_sword", 57, "flint_steel", "fire_charge", "wind_charge", "ender_pearl", 5, "water_bucket", "golden_apple", 59],
  },
];

const THROWABLE = new Set(["ender_pearl", "fire_charge", "wind_charge", "slime_ball"]);
const THROW_SPEED = 22;
const MAX_HP = 20;

type Primed = { mesh: THREE.Mesh; t: number; fuse: number; power: number; x: number; y: number; z: number };
type Projectile = {
  mesh: THREE.Mesh;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  kind: "ender_pearl" | "fire_charge" | "wind_charge" | "slime_ball";
  life: number;
};
type Timed = { x: number; y: number; z: number; id: number; t: number };

export type FeatureCtx = {
  world: World;
  player: Player;
  scene: THREE.Scene;
  setBlock: (x: number, y: number, z: number, id: number) => void;
  breakFx: (x: number, y: number, z: number, id: number) => void;
  aim: () => { origin: THREE.Vector3; dir: THREE.Vector3 };
  announce: (title: string, detail?: string) => void;
  openChest: () => void;
  sound: (name: string) => void;
  onHp: (hp: number, max: number) => void;
  onDeath: () => void;
  onParry: (from?: THREE.Vector3) => void;
  onOffhand: (item: ItemId | null) => void;
};

export class Features {
  hp = MAX_HP;
  survival = true;
  bridgeAssist = true;
  /** Skyblock keeps placed water/lava forever (generators); BedWars clears them. */
  permanentLiquids = false;
  offhand: ItemId | null = null;
  heldId: ItemId = 0;
  chargeT = 0;
  shieldT = 0;
  shieldUp = false;
  speedBoostTimer = 0;

  private ctx: FeatureCtx;
  private primed: Primed[] = [];
  private projectiles: Projectile[] = [];
  private timed: Timed[] = [];
  private doorTimers: { x: number; y: number; z: number; t: number }[] = [];
  private cooldowns = new Map<string, number>();
  private comboCount = 0;
  private lastHitAt = -10;
  private peakY = 0;
  private lavaTick = 0;
  private sinceHurt = 10;
  private regenAcc = 0;
  private memory: { key: string; t: number; left: number } | null = null;
  private arc: THREE.Line;
  private arcMarker: THREE.Mesh;
  private tmpA = new THREE.Vector3();
  private tmpB = new THREE.Vector3();

  constructor(ctx: FeatureCtx) {
    this.ctx = ctx;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(48 * 3), 3));
    this.arc = new THREE.Line(
      geo,
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthTest: false }),
    );
    this.arc.frustumCulled = false;
    this.arc.renderOrder = 6;
    this.arc.visible = false;
    this.arcMarker = new THREE.Mesh(
      new THREE.RingGeometry(0.18, 0.28, 20),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthTest: false, side: THREE.DoubleSide }),
    );
    this.arcMarker.rotation.x = -Math.PI / 2;
    this.arcMarker.renderOrder = 6;
    this.arcMarker.visible = false;
    ctx.scene.add(this.arc, this.arcMarker);
  }

  dispose() {
    this.ctx.scene.remove(this.arc, this.arcMarker);
    for (const p of this.primed) this.ctx.scene.remove(p.mesh);
    for (const p of this.projectiles) this.ctx.scene.remove(p.mesh);
    this.primed = [];
    this.projectiles = [];
  }

  /* ── Health / damage ─────────────────────────────────────────────── */

  heal(amount: number) {
    this.hp = Math.min(MAX_HP, this.hp + amount);
    this.ctx.onHp(this.hp, MAX_HP);
  }

  resetHealth() {
    this.hp = MAX_HP;
    this.ctx.onHp(this.hp, MAX_HP);
  }

  /** Every damage source goes through here so the shield can block and parry. */
  hurt(amount: number, from?: THREE.Vector3) {
    if (!this.survival || amount <= 0 || this.ctx.player.isDying) return;
    let dmg = amount;
    if (this.shieldUp) {
      if (this.shieldT < 0.3) {
        this.ctx.announce("Parry!", "Attacker stunned");
        this.ctx.onParry(from);
        this.ctx.sound("pop");
        return;
      }
      dmg *= 0.25;
    }
    this.hp = Math.max(0, this.hp - dmg);
    this.sinceHurt = 0;
    this.ctx.onHp(this.hp, MAX_HP);
    this.ctx.sound("hurt");
    if (this.hp <= 0) {
      this.hp = MAX_HP;
      this.ctx.onHp(this.hp, MAX_HP);
      this.ctx.onDeath();
    }
  }

  raiseShield() {
    if (this.shieldUp) return;
    this.shieldUp = true;
    this.shieldT = 0;
  }

  /* ── Player physics hooks ────────────────────────────────────────── */

  beforePlayerUpdate() {
    const { player, world } = this.ctx;
    const x = Math.floor(player.position.x);
    const z = Math.floor(player.position.z);
    const y = Math.floor(player.position.y + 0.3);
    const climb = (yy: number) => BLOCK_BY_ID.get(world.get(x, yy, z))?.climb === true;
    player.onLadder = climb(y) || climb(y + 1);
  }

  afterPlayerUpdate(dt: number) {
    const { player, world } = this.ctx;
    if (player.isDying) return;
    const x = Math.floor(player.position.x);
    const z = Math.floor(player.position.z);
    const feetY = Math.floor(player.position.y + 0.1);
    const inLiquid = world.isLiquid(x, feetY, z) || world.isLiquid(x, feetY + 1, z);

    if (!player.onGround && !inLiquid && !player.onLadder) {
      this.peakY = Math.max(this.peakY, player.position.y);
    } else {
      if (player.landedImpact > 0) this.resolveLanding();
      this.peakY = player.position.y;
    }

    if (world.get(x, feetY, z) === LAVA_ID || world.get(x, feetY + 1, z) === LAVA_ID) {
      this.lavaTick -= dt;
      if (this.lavaTick <= 0) {
        this.lavaTick = 0.5;
        this.hurt(3);
      }
    } else {
      this.lavaTick = 0;
    }

    this.sinceHurt += dt;
    if (this.survival && this.hp < MAX_HP && this.sinceHurt > 4) {
      this.regenAcc += dt;
      if (this.regenAcc >= 1.2) {
        this.regenAcc = 0;
        this.heal(1);
      }
    }
  }

  private resolveLanding() {
    const { player, world } = this.ctx;
    const x = Math.floor(player.position.x);
    const z = Math.floor(player.position.z);
    const below = world.get(x, Math.floor(player.position.y - 0.05), z);
    const impact = player.landedImpact;
    if (below === BLOCK_ID.slime && !player.isCrouching) {
      player.velocity.y = Math.min(16, impact * 0.8);
      player.onGround = false;
      this.peakY = player.position.y;
      this.ctx.sound("pop");
      return;
    }
    const fall = this.peakY - player.position.y;
    const dmg = Math.floor(fall - 3.2);
    if (dmg > 0) this.hurt(dmg);
  }

  /* ── Combat ──────────────────────────────────────────────────────── */

  /** Consecutive timed swings build to a finisher worth 1.5x damage. */
  comboHit(cooldown: number): { mul: number; finisher: boolean } {
    const now = performance.now() / 1000;
    const gap = now - this.lastHitAt;
    this.comboCount = gap < Math.max(1.1, cooldown * 2.2) ? this.comboCount + 1 : 1;
    this.lastHitAt = now;
    if (this.comboCount >= 3) {
      this.comboCount = 0;
      this.ctx.announce("Combo finisher!", "x1.5 damage");
      return { mul: 1.5, finisher: true };
    }
    return { mul: 1, finisher: false };
  }

  charging(dt: number) {
    this.chargeT = Math.min(1, this.chargeT + dt);
    return this.chargeT;
  }

  /** Returns 0 for a normal tap or the charge level 0..1 for a wound-up hit. */
  releaseCharge() {
    const c = this.chargeT;
    this.chargeT = 0;
    return c < 0.18 ? 0 : c;
  }

  /** One fixed launch arc: speed-scaled, never random. */
  knockback(dir: THREE.Vector3, base: number, sprinting: boolean, charge: number) {
    const horizontal = base * (sprinting ? 1.2 : 1) * (1 + charge * 1.4);
    return { x: dir.x * horizontal, z: dir.z * horizontal, y: 4.2 + base * 0.15 + charge * 2 };
  }

  /** Same capsule for every player: distance along the ray, or -1 on a miss. */
  rayHitsPlayer(origin: THREE.Vector3, dir: THREE.Vector3, feet: THREE.Vector3, reach: number) {
    let best = -1;
    for (const h of [0.3, 0.9, 1.5]) {
      const to = this.tmpA.set(feet.x, feet.y + h * (HITBOX.height / 1.8), feet.z).sub(origin);
      const along = to.dot(dir);
      if (along < 0 || along > reach) continue;
      const perp = this.tmpB.copy(dir).multiplyScalar(along).sub(to).length();
      if (perp <= HITBOX.radius + 0.28 && (best < 0 || along < best)) best = along;
    }
    return best;
  }

  /* ── Break progress memory ───────────────────────────────────────── */

  rememberMining(key: string, t: number) {
    if (t > 0.05) this.memory = { key, t, left: 2 };
  }

  recallMining(key: string) {
    const m = this.memory;
    if (m && m.key === key && m.left > 0) {
      this.memory = null;
      return m.t;
    }
    return 0;
  }

  forgetMining() {
    this.memory = null;
  }

  /* ── Bridge snap assist ──────────────────────────────────────────── */

  bridgeSnapTarget(): { x: number; y: number; z: number } | null {
    if (!this.bridgeAssist) return null;
    const { player, world } = this.ctx;
    const { dir } = this.ctx.aim();
    if (dir.y > -0.22 || !player.onGround) return null;
    const horizontal = Math.hypot(dir.x, dir.z);
    if (horizontal < 0.05) return null;
    const sx = Math.abs(dir.x) >= Math.abs(dir.z) ? Math.sign(dir.x) : 0;
    const sz = sx === 0 ? Math.sign(dir.z) : 0;
    const bx = Math.floor(player.position.x);
    const by = Math.floor(player.position.y - 0.05);
    const bz = Math.floor(player.position.z);
    for (let k = 1; k <= 3; k++) {
      const tx = bx + sx * k;
      const tz = bz + sz * k;
      if (world.get(tx, by, tz) !== 0 && world.get(tx, by, tz) !== WATER_ID) continue;
      const behind = world.solid(tx - sx, by, tz - sz);
      return behind ? { x: tx, y: by, z: tz } : null;
    }
    return null;
  }

  /* ── Items ───────────────────────────────────────────────────────── */

  setHeld(id: ItemId) {
    this.heldId = id;
  }

  private ready(key: string, cooldown: number) {
    if ((this.cooldowns.get(key) ?? 0) > 0) return false;
    this.cooldowns.set(key, cooldown);
    return true;
  }

  useItem(id: string, hit: Hit | null): boolean {
    const { world, player } = this.ctx;
    switch (id) {
      case "water_bucket":
      case "lava_bucket": {
        if (!hit) {
          if (this.ready("bucket_hint", 2)) this.ctx.announce("Aim at a block", "Buckets need a surface");
          return true;
        }
        if (!this.ready(id, 0.25)) return true;
        const liquid = id === "water_bucket" ? WATER_ID : LAVA_ID;
        const targetIsLava = hit.id === LAVA_ID;
        const tx = targetIsLava ? hit.x : hit.x + hit.nx;
        const ty = targetIsLava ? hit.y : hit.y + hit.ny;
        const tz = targetIsLava ? hit.z : hit.z + hit.nz;
        const here = world.get(tx, ty, tz);
        if (here !== 0 && here !== WATER_ID && here !== LAVA_ID) return true;
        this.placeLiquid(tx, ty, tz, liquid);
        return true;
      }
      case "flint_steel": {
        if (hit && hit.id === BLOCK_ID.tnt) {
          this.prime(hit.x, hit.y, hit.z, 2.2, 2.5);
          this.ctx.sound("pop");
        } else {
          if (this.ready("flint_hint", 2)) this.ctx.announce("Flint & Steel", "Aim at a TNT block");
        }
        return true;
      }
      case "fire_charge":
        if (hit && hit.id === BLOCK_ID.tnt && this.tmpA.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5).distanceTo(player.position) < 5) {
          this.prime(hit.x, hit.y, hit.z, 1.2, 2.5);
          return true;
        }
        if (this.ready(id, 0.8)) this.throwProjectile("fire_charge");
        return true;
      case "ender_pearl":
        if (this.ready(id, 1.0)) this.throwProjectile("ender_pearl");
        return true;
      case "wind_charge":
        if (this.ready(id, 0.8)) this.throwProjectile("wind_charge");
        return true;
      case "slime_ball":
        if (this.ready(id, 0.8)) this.throwProjectile("slime_ball");
        return true;
      case "speed_potion":
        if (this.ready(id, 3.0)) {
          this.speedBoostTimer = 15;
          this.ctx.announce("Swiftness II", "+50% Movement Speed for 15s!");
          this.ctx.sound("pop");
        }
        return true;
      case "golden_apple":
        if (this.hp >= MAX_HP) {
          if (this.ready("apple_full", 2)) this.ctx.announce("Already full health");
        } else if (this.ready(id, 6)) {
          this.heal(8);
          this.ctx.announce("Golden Apple", "+8 health");
          this.ctx.sound("pop");
        }
        return true;
      case "shield":
        this.raiseShield();
        return true;
      case "magic_stick": {
        if (!this.ready(id, 0.25)) return true;
        const aimInfo = this.ctx.aim();
        import("./magic-stick").then(({ castMagicStick }) => {
          castMagicStick({
            world,
            hit,
            playerPos: player.position,
            aimDir: aimInfo.dir,
            setBlock: this.ctx.setBlock,
            announce: this.ctx.announce,
          });
        });
        return true;
      }
      default:
        return false;
    }
  }

  private placeLiquid(x: number, y: number, z: number, liquid: number) {
    const { world } = this.ctx;
    const opposite = liquid === WATER_ID ? LAVA_ID : WATER_ID;
    if (world.get(x, y, z) === opposite) {
      // Pouring straight onto the other liquid: a lava source quenches to
      // obsidian, everything else to cobblestone.
      const hardened = opposite === LAVA_ID && world.isLiquidSource(x, y, z) ? 11 : 4;
      this.ctx.setBlock(x, y, z, hardened);
      this.ctx.breakFx(x, y, z, hardened);
      this.ctx.sound("fizz");
      return;
    }
    // The world simulation handles flow and lava/water reactions from here.
    this.ctx.setBlock(x, y, z, liquid);
    if (!this.permanentLiquids) this.timed.push({ x, y, z, id: liquid, t: liquid === WATER_ID ? 14 : 30 });
    this.ctx.sound("place");
  }

  /** Right-click on a functional block. Returns true when the click was consumed. */
  interact(hit: Hit, sneaking: boolean): boolean {
    if (sneaking) return false;
    const { player } = this.ctx;
    switch (hit.id) {
      case BLOCK_ID.woodDoor:
        this.ctx.setBlock(hit.x, hit.y, hit.z, BLOCK_ID.woodDoorOpen);
        this.ctx.sound("place");
        return true;
      case BLOCK_ID.woodDoorOpen:
        if (!this.insidePlayer(hit.x, hit.y, hit.z)) this.ctx.setBlock(hit.x, hit.y, hit.z, BLOCK_ID.woodDoor);
        this.ctx.sound("place");
        return true;
      case BLOCK_ID.ironDoor:
      case BLOCK_ID.ironDoorOpen:
        this.ctx.announce("Iron door", "Press a door button to open it");
        return true;
      case BLOCK_ID.doorButton: {
        let opened = 0;
        for (let dx = -5; dx <= 5; dx++)
          for (let dy = -3; dy <= 3; dy++)
            for (let dz = -5; dz <= 5; dz++) {
              const x = hit.x + dx;
              const y = hit.y + dy;
              const z = hit.z + dz;
              if (this.ctx.world.get(x, y, z) === BLOCK_ID.ironDoor) {
                this.ctx.setBlock(x, y, z, BLOCK_ID.ironDoorOpen);
                this.doorTimers.push({ x, y, z, t: 3.5 });
                opened++;
              }
            }
        this.ctx.announce(opened ? "Iron doors open" : "No iron door nearby", opened ? "Closing in a few seconds" : undefined);
        this.ctx.sound("pop");
        return true;
      }
      case BLOCK_ID.chest:
        this.ctx.openChest();
        return true;
      case BLOCK_ID.trappedChest:
        this.ctx.announce("Trapped!", "Get clear");
        this.prime(hit.x, hit.y, hit.z, 0.9, 2);
        return true;
      case BLOCK_ID.bed:
      case BLOCK_ID.anchor:
        player.setSpawnPoint(hit.x + 0.5, hit.y + 1, hit.z + 0.5);
        this.ctx.announce("Spawn point set", hit.id === BLOCK_ID.bed ? "You will respawn at this bed" : "Respawn anchor charged");
        this.ctx.sound("pop");
        return true;
      default:
        return false;
    }
  }

  private insidePlayer(x: number, y: number, z: number) {
    const p = this.ctx.player.position;
    return Math.abs(p.x - (x + 0.5)) < 0.7 && Math.abs(p.z - (z + 0.5)) < 0.7 && y + 1 > p.y && y < p.y + 1.8;
  }

  /* ── TNT, explosions, projectiles ────────────────────────────────── */

  prime(x: number, y: number, z: number, fuse: number, power: number) {
    if (this.primed.some((p) => p.x === x && p.y === y && p.z === z)) return;
    this.ctx.setBlock(x, y, z, 0);
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.98, 0.98, 0.98),
      new THREE.MeshBasicMaterial({ color: 0xff5a3c }),
    );
    mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
    this.ctx.scene.add(mesh);
    this.primed.push({ mesh, t: 0, fuse, power, x, y, z });
  }

  private explode(center: THREE.Vector3, radius: number) {
    const { world, player } = this.ctx;
    const r = Math.ceil(radius);
    let fxLeft = 22;
    for (let dx = -r; dx <= r; dx++)
      for (let dy = -r; dy <= r; dy++)
        for (let dz = -r; dz <= r; dz++) {
          if (dx * dx + dy * dy + dz * dz > radius * radius) continue;
          const x = Math.floor(center.x) + dx;
          const y = Math.floor(center.y) + dy;
          const z = Math.floor(center.z) + dz;
          const id = world.get(x, y, z);
          if (id === 0 || id === WATER_ID) continue;
          const def = BLOCK_BY_ID.get(id);
          if (!def || (def.hardness ?? 1) < 0 || id === 11 || id === BLOCK_ID.blastGlass) continue;
          if (id === BLOCK_ID.tnt) {
            this.prime(x, y, z, 0.35, 2.5);
            continue;
          }
          if (fxLeft-- > 0) this.ctx.breakFx(x, y, z, id);
          this.ctx.setBlock(x, y, z, 0);
        }
    this.ctx.sound("break");
    const reach = radius * 2.2;
    const to = this.tmpA.set(player.position.x, player.position.y + 0.9, player.position.z).sub(center);
    const d = to.length();
    if (d < reach) {
      const k = 1 - d / reach;
      to.normalize();
      player.velocity.x += to.x * 9 * k;
      player.velocity.z += to.z * 9 * k;
      player.velocity.y = Math.max(player.velocity.y, 5 + 5 * k);
      player.onGround = false;
      this.hurt(Math.round(2 + k * 10), center);
    }
  }

  private throwProjectile(kind: "ender_pearl" | "fire_charge" | "wind_charge" | "slime_ball") {
    const { origin, dir } = this.ctx.aim();
    const color =
      kind === "ender_pearl"
        ? 0x2cd5b0
        : kind === "wind_charge"
          ? 0xd8f5ff
          : kind === "slime_ball"
            ? 0x72e438
            : 0xff8a2a;
    const radius =
      kind === "ender_pearl" ? 0.18 : kind === "wind_charge" ? 0.22 : kind === "slime_ball" ? 0.18 : 0.2;
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 12, 10),
      new THREE.MeshBasicMaterial({ color }),
    );
    const pos = origin.clone().addScaledVector(dir, 0.6);
    mesh.position.copy(pos);
    this.ctx.scene.add(mesh);
    this.projectiles.push({ mesh, pos, vel: dir.clone().multiplyScalar(THROW_SPEED), kind, life: 6 });
    this.ctx.sound("air_whoosh");
  }

  private gravityFor(kind: string) {
    if (kind === "wind_charge") return 8;
    if (kind === "slime_ball") return 18;
    return kind === "ender_pearl" ? 20 : 6;
  }

  /* ── Per-frame update ────────────────────────────────────────────── */

  update(dt: number) {
    const { world, player } = this.ctx;

    for (const [k, v] of this.cooldowns) this.cooldowns.set(k, Math.max(0, v - dt));
    if (this.memory) {
      this.memory.left -= dt;
      if (this.memory.left <= 0) this.memory = null;
    }
    if (this.shieldUp) {
      this.shieldT += dt;
      if (this.shieldT > 0.9) this.shieldUp = false;
    }

    if (this.speedBoostTimer > 0) {
      this.speedBoostTimer -= dt;
      player.profile.walk = 6.4;
      player.profile.sprint = 8.6;
      if (this.speedBoostTimer <= 0) {
        this.speedBoostTimer = 0;
        player.profile.walk = 4.31;
        player.profile.sprint = 5.61;
      }
    }

    for (let i = this.timed.length - 1; i >= 0; i--) {
      const t = this.timed[i];
      t.t -= dt;
      if (t.t > 0) continue;
      if (world.get(t.x, t.y, t.z) === t.id) this.ctx.setBlock(t.x, t.y, t.z, 0);
      this.timed.splice(i, 1);
    }

    for (let i = this.doorTimers.length - 1; i >= 0; i--) {
      const d = this.doorTimers[i];
      d.t -= dt;
      if (d.t > 0 || this.insidePlayer(d.x, d.y, d.z)) continue;
      if (world.get(d.x, d.y, d.z) === BLOCK_ID.ironDoorOpen) this.ctx.setBlock(d.x, d.y, d.z, BLOCK_ID.ironDoor);
      this.doorTimers.splice(i, 1);
    }

    for (let i = this.primed.length - 1; i >= 0; i--) {
      const p = this.primed[i];
      p.t += dt;
      const flash = Math.floor(p.t * 6) % 2 === 0;
      (p.mesh.material as THREE.MeshBasicMaterial).color.setHex(flash ? 0xffffff : 0xff4a30);
      p.mesh.scale.setScalar(1 + Math.sin(p.t * 18) * 0.05 + (p.t / p.fuse) * 0.12);
      if (p.t < p.fuse) continue;
      this.ctx.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
      this.primed.splice(i, 1);
      this.explode(new THREE.Vector3(p.x + 0.5, p.y + 0.5, p.z + 0.5), p.power);
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      pr.life -= dt;
      let landed = false;
      const steps = 3;
      for (let s = 0; s < steps && !landed; s++) {
        const h = dt / steps;
        pr.vel.y -= this.gravityFor(pr.kind) * h;
        const next = this.tmpA.copy(pr.pos).addScaledVector(pr.vel, h);
        if (world.solid(Math.floor(next.x), Math.floor(next.y), Math.floor(next.z))) landed = true;
        else pr.pos.copy(next);
      }
      pr.mesh.position.copy(pr.pos);
      if (!landed && pr.life > 0 && pr.pos.y > -20) continue;
      this.ctx.scene.remove(pr.mesh);
      pr.mesh.geometry.dispose();
      (pr.mesh.material as THREE.Material).dispose();
      this.projectiles.splice(i, 1);
      if (!landed) continue;
      if (pr.kind === "ender_pearl") {
        this.teleportTo(pr.pos);
      } else if (pr.kind === "wind_charge") {
        this.windBurst(pr.pos);
      } else if (pr.kind === "slime_ball") {
        this.slimeBounce(pr.pos);
      } else {
        this.explode(pr.pos, 1.8);
      }
    }

    this.updateArc();
  }

  private windBurst(at: THREE.Vector3) {
    const { player, sound, announce } = this.ctx;
    sound("air_whoosh");
    const d = player.position.distanceTo(at);
    if (d < 6.0) {
      player.velocity.y = Math.max(player.velocity.y + 13, 14.5);
      const dx = player.position.x - at.x;
      const dz = player.position.z - at.z;
      const distH = Math.hypot(dx, dz);
      if (distH > 0.05) {
        player.velocity.x += (dx / distH) * Math.min(10, (6 - d) * 2.2);
        player.velocity.z += (dz / distH) * Math.min(10, (6 - d) * 2.2);
      }
      player.onGround = false;
      this.peakY = player.position.y;
      announce("Wind Burst!", "Rocket jump launched!");
    }
  }

  private slimeBounce(at: THREE.Vector3) {
    const { player, sound, announce } = this.ctx;
    sound("pop");
    const d = player.position.distanceTo(at);
    if (d < 5.0) {
      player.velocity.y = Math.max(player.velocity.y + 14, 15);
      player.onGround = false;
      this.peakY = player.position.y;
      announce("Super Bounce!", "Spring loaded!");
    }
  }

  private teleportTo(at: THREE.Vector3) {
    const { world, player } = this.ctx;
    const x = Math.floor(at.x);
    const z = Math.floor(at.z);
    const baseY = Math.floor(at.y);
    for (const y of [baseY, baseY - 1, baseY + 1]) {
      if (!world.solid(x, y, z) && !world.solid(x, y + 1, z)) {
        player.position.set(x + 0.5, y + 0.01, z + 0.5);
        player.velocity.set(0, 0, 0);
        this.peakY = player.position.y;
        this.ctx.sound("pop");
        this.hurt(2);
        return;
      }
    }
  }

  private updateArc() {
    const held = this.heldId;
    if (typeof held !== "string" || !THROWABLE.has(held)) {
      this.arc.visible = false;
      this.arcMarker.visible = false;
      return;
    }
    const kind = held;
    const { world } = this.ctx;
    const { origin, dir } = this.ctx.aim();
    const pos = this.tmpA.copy(origin).addScaledVector(dir, 0.6);
    const vel = this.tmpB.copy(dir).multiplyScalar(THROW_SPEED);
    const attr = this.arc.geometry.getAttribute("position") as THREE.BufferAttribute;
    const g = this.gravityFor(kind);
    const h = 0.05;
    let count = 0;
    for (let i = 0; i < 48; i++) {
      attr.setXYZ(i, pos.x, pos.y, pos.z);
      count = i + 1;
      vel.y -= g * h;
      pos.addScaledVector(vel, h);
      if (world.solid(Math.floor(pos.x), Math.floor(pos.y), Math.floor(pos.z)) || pos.y < -10) break;
    }
    for (let i = count; i < 48; i++) attr.setXYZ(i, pos.x, pos.y, pos.z);
    attr.needsUpdate = true;
    this.arc.geometry.setDrawRange(0, count);
    this.arc.visible = true;
    this.arcMarker.position.set(pos.x, pos.y + 0.05, pos.z);
    this.arcMarker.visible = true;
    const arcColor =
      kind === "ender_pearl"
        ? 0x2cd5b0
        : kind === "wind_charge"
          ? 0x8be5ff
          : kind === "slime_ball"
            ? 0x76db40
            : 0xffc27a;
    (this.arc.material as THREE.LineBasicMaterial).color.setHex(arcColor);
  }
}
