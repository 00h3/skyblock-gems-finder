import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { createHpBar } from "@/engine-sandbox/shared/hpbar";

export const DRAGON_MODEL_URL = "/skyblock/dragon.glb";
export const DRAGON_MAX_HP = 1000;
const WINGSPAN = 11;
const BODY_RADIUS = 3.6;

export interface DragonHud {
  hp: number;
  max: number;
  /** True once the dragon has been hit and is hunting the player. */
  engaged: boolean;
}

export interface RedDragonOptions {
  scene: THREE.Scene;
  arena: { x: number; y: number; z: number; radius: number };
  player: () => { position: THREE.Vector3; dead: boolean };
  damagePlayer: (dmg: number, from: THREE.Vector3) => void;
  onHud: (hud: DragonHud) => void;
  onDefeated: () => void;
  burst: (at: THREE.Vector3, big: boolean) => void;
  hitFx: (at: THREE.Vector3, dmg: number) => void;
  sound: (name: string) => void;
}

interface DragonFireball {
  group: THREE.Group;
  vel: THREE.Vector3;
  life: number;
}

/**
 * The Red Dragon: 1000 HP, circles its arena peacefully and only turns on the
 * player once it has been hurt. Fireball volleys, swoops, and an enrage phase.
 */
export class RedDragon {
  readonly center = new THREE.Vector3();
  alive = true;
  hp = DRAGON_MAX_HP;
  private engaged = false;
  private root = new THREE.Group();
  private model: THREE.Object3D | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private tint: { mat: THREE.MeshStandardMaterial; color: THREE.Color; emissive: THREE.Color }[] = [];
  private hurtT = 0;
  private bar = createHpBar("Red Dragon", DRAGON_MAX_HP);
  private t = 0;
  private fireCd = 3;
  private swoopCd = 9;
  private swoop: { dir: THREE.Vector3; t: number } | null = null;
  private idleAngle = 0;
  private respawnIn = 0;
  private quietFor = 0;
  private fireballs: DragonFireball[] = [];
  private fireGeo = new THREE.BoxGeometry(0.42, 0.42, 0.42);
  private fireMats = [0xff2200, 0xff6a00, 0xffb300].map((c) => new THREE.MeshBasicMaterial({ color: c, toneMapped: false }));
  private disposed = false;
  private lastHudHp = -1;

  constructor(private readonly opts: RedDragonOptions) {
    this.root.visible = false;
    this.bar.sprite.scale.set(4.2, 1.55, 1);
    this.bar.sprite.visible = false;
    opts.scene.add(this.root, this.bar.sprite);
    this.resetToIdle();
    new GLTFLoader().load(
      DRAGON_MODEL_URL,
      (gltf) => {
        if (this.disposed) return;
        const model = gltf.scene;
        model.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (!mesh.isMesh) return;
          mesh.frustumCulled = false;
          mesh.castShadow = false;
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          for (const m of mats) {
            const mat = m as THREE.MeshStandardMaterial;
            if (!mat?.color) continue;
            this.tint.push({
              mat,
              color: mat.color.clone(),
              emissive: mat.emissive ? mat.emissive.clone() : new THREE.Color(0, 0, 0),
            });
          }
        });
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        model.scale.setScalar(WINGSPAN / Math.max(size.x, size.z, 0.001));
        const fitted = new THREE.Box3().setFromObject(model);
        const c = fitted.getCenter(new THREE.Vector3());
        model.position.sub(c);
        this.root.add(model);
        this.model = model;
        if (gltf.animations.length) {
          this.mixer = new THREE.AnimationMixer(model);
          for (const clip of gltf.animations) this.mixer.clipAction(clip).play();
        }
        this.root.visible = true;
        this.bar.sprite.visible = true;
        this.bar.set(this.hp);
        this.pushHud(true);
      },
      undefined,
      (err) => console.warn("Failed to load dragon model:", err),
    );
  }

  private resetToIdle() {
    const { arena } = this.opts;
    this.engaged = false;
    this.swoop = null;
    this.idleAngle = 0;
    this.center.set(arena.x + 8, arena.y + 8, arena.z);
    this.root.position.copy(this.center);
  }

  private pushHud(force = false) {
    const hp = Math.ceil(this.hp);
    if (!force && hp === this.lastHudHp) return;
    this.lastHudHp = hp;
    this.opts.onHud({ hp, max: DRAGON_MAX_HP, engaged: this.engaged && this.alive });
  }

  /** Distance along a ray to the dragon's body, or -1 when it is missed. */
  rayHit(origin: THREE.Vector3, dir: THREE.Vector3, reach: number) {
    if (!this.alive || !this.root.visible) return -1;
    const to = this.center.clone().sub(origin);
    const along = to.dot(dir);
    if (along < 0 || along > reach + BODY_RADIUS) return -1;
    const miss = to.addScaledVector(dir, -along).length();
    return miss <= BODY_RADIUS ? along : -1;
  }

  /** True when a projectile at `at` is inside the dragon. */
  contains(at: THREE.Vector3, pad = 0) {
    return this.alive && this.root.visible && at.distanceTo(this.center) < BODY_RADIUS + pad;
  }

  hurt(dmg: number) {
    if (!this.alive) return;
    this.hp = Math.max(0, this.hp - dmg);
    this.hurtT = 0.35;
    this.quietFor = 0;
    if (!this.engaged) {
      this.engaged = true;
      this.fireCd = 1.2;
      this.swoopCd = 6;
    }
    this.opts.hitFx(this.center.clone().add(new THREE.Vector3(0, 1, 0)), dmg);
    this.bar.set(this.hp);
    if (this.hp <= 0) {
      this.alive = false;
      this.engaged = false;
      this.root.visible = false;
      this.bar.sprite.visible = false;
      this.respawnIn = 240;
      this.clearFireballs();
      this.opts.burst(this.center, true);
      this.opts.onDefeated();
    }
    this.pushHud(true);
  }

  private shoot(at: THREE.Vector3, spread: number) {
    const from = this.center.clone().add(new THREE.Vector3(0, 0.6, 0));
    const dir = at.clone().sub(from).normalize();
    dir.x += (Math.random() - 0.5) * spread;
    dir.y += (Math.random() - 0.5) * spread * 0.4;
    dir.z += (Math.random() - 0.5) * spread;
    dir.normalize();
    const group = new THREE.Group();
    const offsets = [[0, 0, 0], [0.22, 0, 0], [-0.22, 0, 0], [0, 0.22, 0], [0, -0.22, 0], [0, 0, 0.3]];
    offsets.forEach(([x, y, z], i) => {
      const m = new THREE.Mesh(this.fireGeo, this.fireMats[i % 3]);
      m.position.set(x, y, z);
      group.add(m);
    });
    group.position.copy(from);
    this.opts.scene.add(group);
    this.fireballs.push({ group, vel: dir.multiplyScalar(17), life: 5 });
    this.opts.sound("fire");
  }

  private clearFireballs() {
    for (const f of this.fireballs) this.opts.scene.remove(f.group);
    this.fireballs = [];
  }

  update(dt: number) {
    this.t += dt;
    this.mixer?.update(dt);

    if (!this.alive) {
      this.respawnIn -= dt;
      if (this.respawnIn <= 0) {
        this.alive = true;
        this.hp = DRAGON_MAX_HP;
        this.resetToIdle();
        this.root.visible = !!this.model;
        this.bar.sprite.visible = !!this.model;
        this.bar.set(this.hp);
        this.pushHud(true);
      }
      return;
    }

    const { arena } = this.opts;
    const p = this.opts.player();
    const playerInArena =
      !p.dead && Math.hypot(p.position.x - arena.x, p.position.z - arena.z) < arena.radius + 4 && p.position.y < arena.y + 30;
    const enrage = this.hp < DRAGON_MAX_HP * 0.4;
    const target = new THREE.Vector3();

    if (this.engaged && !playerInArena) {
      this.quietFor += dt;
      if (this.quietFor > 6) {
        this.engaged = false;
        this.swoop = null;
      }
    }
    if (!this.engaged && this.hp < DRAGON_MAX_HP) {
      this.hp = Math.min(DRAGON_MAX_HP, this.hp + 45 * dt);
      this.bar.set(this.hp);
    }

    if (this.swoop) {
      this.swoop.t -= dt;
      this.center.addScaledVector(this.swoop.dir, 21 * dt);
      if (!p.dead && this.center.distanceTo(p.position.clone().add(new THREE.Vector3(0, 1, 0))) < BODY_RADIUS + 0.9) {
        this.opts.damagePlayer(5, this.center);
        this.swoop.t = 0;
      }
      if (this.swoop.t <= 0) this.swoop = null;
    } else if (this.engaged && playerInArena) {
      const away = this.center.clone().sub(p.position);
      away.y = 0;
      if (away.lengthSq() < 0.01) away.set(1, 0, 0);
      away.normalize();
      target.copy(p.position).addScaledVector(away, 6.2);
      target.y = arena.y + 4.4 + Math.sin(this.t * 1.7) * 0.9;
      const k = 1 - Math.exp(-(enrage ? 2.2 : 1.5) * dt);
      this.center.lerp(target, k);

      this.fireCd -= dt;
      if (this.fireCd <= 0 && this.center.distanceTo(p.position) < 40) {
        const aim = p.position.clone().add(new THREE.Vector3(0, 1.1, 0));
        const volley = enrage ? 3 : 1;
        for (let i = 0; i < volley; i++) this.shoot(aim, volley > 1 ? 0.22 : 0.04);
        this.fireCd = enrage ? 1.7 : 2.6;
      }
      this.swoopCd -= dt;
      if (this.swoopCd <= 0) {
        const aim = p.position.clone().add(new THREE.Vector3(0, 1, 0));
        this.swoop = { dir: aim.sub(this.center).normalize(), t: 1.1 };
        this.swoopCd = enrage ? 6 : 9;
        this.opts.sound("hurt");
      }
    } else {
      this.idleAngle += dt * 0.32;
      target.set(
        arena.x + Math.cos(this.idleAngle) * 9,
        arena.y + 8 + Math.sin(this.idleAngle * 2) * 1.2,
        arena.z + Math.sin(this.idleAngle) * 9,
      );
      this.center.lerp(target, 1 - Math.exp(-2 * dt));
    }

    // Keep the dragon inside its dome.
    const dx = this.center.x - arena.x;
    const dz = this.center.z - arena.z;
    const rr = Math.hypot(dx, dz);
    const maxR = arena.radius - 5;
    if (rr > maxR) {
      this.center.x = arena.x + (dx / rr) * maxR;
      this.center.z = arena.z + (dz / rr) * maxR;
    }
    this.center.y = Math.min(arena.y + 17, Math.max(arena.y + 3.5, this.center.y));

    this.root.position.copy(this.center);
    const look = this.swoop ? this.swoop.dir : this.engaged ? p.position.clone().sub(this.center) : new THREE.Vector3(-Math.sin(this.idleAngle), 0, Math.cos(this.idleAngle));
    const yaw = Math.atan2(look.x, look.z);
    let diff = yaw - this.root.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    this.root.rotation.y += diff * (1 - Math.exp(-4 * dt));
    this.root.rotation.z = THREE.MathUtils.lerp(this.root.rotation.z, this.swoop ? 0.3 : Math.sin(this.t * 1.2) * 0.08, 0.1);
    this.bar.sprite.position.set(this.center.x, this.center.y + 5.6, this.center.z);

    if (this.hurtT > 0) {
      this.hurtT = Math.max(0, this.hurtT - dt);
      const k = this.hurtT / 0.35;
      const red = new THREE.Color(0xff1818);
      for (const t of this.tint) {
        t.mat.color.copy(t.color).lerp(red, 0.75 * k);
        if (t.mat.emissive) t.mat.emissive.copy(t.emissive).lerp(red, 0.75 * k);
      }
    }

    for (let i = this.fireballs.length - 1; i >= 0; i--) {
      const f = this.fireballs[i];
      f.life -= dt;
      f.group.position.addScaledVector(f.vel, dt);
      f.group.rotation.x += dt * 7;
      f.group.rotation.y += dt * 9;
      const hitPlayer =
        !p.dead && f.group.position.distanceTo(p.position.clone().add(new THREE.Vector3(0, 1, 0))) < 1.1;
      const wall = Math.hypot(f.group.position.x - arena.x, f.group.position.z - arena.z) > arena.radius + 1 || f.group.position.y < arena.y;
      if (hitPlayer || wall || f.life <= 0) {
        if (hitPlayer) this.opts.damagePlayer(enrage ? 4 : 3, f.group.position);
        this.opts.burst(f.group.position, false);
        this.opts.scene.remove(f.group);
        this.fireballs.splice(i, 1);
      }
    }
    this.pushHud();
  }

  dispose() {
    this.disposed = true;
    this.clearFireballs();
    this.opts.scene.remove(this.root, this.bar.sprite);
    this.fireGeo.dispose();
    for (const m of this.fireMats) m.dispose();
  }
}
