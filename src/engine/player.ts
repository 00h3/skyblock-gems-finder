import * as THREE from "three";
import { World, WORLD_H } from "./world";

const WIDTH = 0.6;
const HEIGHT = 1.8;
const EYE = 1.62;
const COYOTE = 0.12;
const JUMP_BUFFER = 0.14;
const STEP_HEIGHT = 0.6;
const TERMINAL_V = -48;

/**
 * Tunable movement feel. Each game mode picks a profile instead of forking
 * the physics code, so Skyblock and Block Fall share one collision solver.
 */
export type PhysicsProfile = {
  gravity: number;
  /** Extra gravity while descending — removes the floaty "moon" fall. */
  fallGravityMul: number;
  jumpV: number;
  walk: number;
  sprint: number;
  crouch: number;
  accel: number;
  /** Deceleration applied when there is no input on the ground. */
  groundDamp: number;
  airDamp: number;
  airControl: number;
  sprintJumpBoost: number;
};

export const SANDBOX_PHYSICS: PhysicsProfile = {
  gravity: 28.5,
  fallGravityMul: 1.18,
  jumpV: 8.5,
  walk: 4.31,
  sprint: 5.61,
  crouch: 2.15,
  accel: 64,
  groundDamp: 14.5,
  airDamp: 0.55,
  airControl: 0.3,
  sprintJumpBoost: 1.22,
};

/** Snappier, heavier and more predictable — built for Block Fall rounds. */
export const COMPETITIVE_PHYSICS: PhysicsProfile = {
  gravity: 30,
  fallGravityMul: 1.32,
  jumpV: 8.9,
  walk: 4.7,
  sprint: 6.1,
  crouch: 2.3,
  accel: 82,
  groundDamp: 18,
  airDamp: 0.8,
  airControl: 0.45,
  sprintJumpBoost: 1.0,
};

export type MoveInput = {
  forward: number;
  strafe: number;
  jump: boolean;
  sprint: boolean;
  crouch?: boolean;
  yaw: number;
};

export class Player {
  position = new THREE.Vector3(0.5, 17.5, 0.5);
  spawnPoint = new THREE.Vector3(0.5, 17.5, 0.5);
  velocity = new THREE.Vector3();
  onGround = false;
  bob = 0;
  isCrouching = false;
  isDying = false;
  /** When true, input is ignored (countdowns, results) but gravity still applies. */
  frozen = false;
  /** Set for one frame when the player lands; value is the impact speed. */
  landedImpact = 0;
  profile: PhysicsProfile = SANDBOX_PHYSICS;
  onDie?: () => void;
  private coyote = 0;
  private jumpBuffer = 0;
  private _next = new THREE.Vector3();
  private _probe = new THREE.Vector3();

  constructor(private world: World) {}

  get eyeY() {
    return this.position.y + (this.isCrouching ? EYE - 0.28 : EYE);
  }

  setSpawnPoint(x: number | THREE.Vector3, y?: number, z?: number) {
    if (typeof x === "object") {
      this.spawnPoint.copy(x);
    } else if (y !== undefined && z !== undefined) {
      this.spawnPoint.set(x, y, z);
    }
  }

  respawn(customSpawn?: THREE.Vector3 | number) {
    this.isDying = false;
    if (customSpawn instanceof THREE.Vector3) {
      this.position.copy(customSpawn);
    } else if (typeof customSpawn === "number") {
      this.position.set(this.spawnPoint.x, customSpawn + 1.5, this.spawnPoint.z);
    } else {
      this.position.copy(this.spawnPoint);
    }
    this.velocity.set(0, 0, 0);
    this.onGround = true;
    this.coyote = 0;
    this.jumpBuffer = 0;
  }

  update(dt: number, input: MoveInput) {
    this.landedImpact = 0;
    if (this.isDying) {
      this.velocity.x *= Math.exp(-6 * dt);
      this.velocity.z *= Math.exp(-6 * dt);
      this.velocity.y = Math.max(-1.5, this.velocity.y - 2 * dt);
      this.position.y += this.velocity.y * dt;
      return;
    }

    const P = this.profile;
    const forward = this.frozen ? 0 : input.forward;
    const strafe = this.frozen ? 0 : input.strafe;
    const wantsJump = !this.frozen && input.jump;

    this.isCrouching = Boolean(input.crouch) && !this.frozen;
    const speed = this.isCrouching ? P.crouch : input.sprint ? P.sprint : P.walk;

    // Camera-relative wish direction. Three.js cameras look down -Z, so at
    // yaw 0 "forward" is (0, -1) and "right" is (1, 0).
    const sin = Math.sin(input.yaw);
    const cos = Math.cos(input.yaw);
    let dx = strafe * cos - forward * sin;
    let dz = -strafe * sin - forward * cos;
    const len = Math.hypot(dx, dz);
    if (len > 1) {
      dx /= len;
      dz /= len;
    }

    const control = this.onGround ? P.accel : P.accel * P.airControl;
    if (len > 0.01) {
      const targetX = dx * speed;
      const targetZ = dz * speed;
      this.velocity.x += THREE.MathUtils.clamp(targetX - this.velocity.x, -control * dt, control * dt);
      this.velocity.z += THREE.MathUtils.clamp(targetZ - this.velocity.z, -control * dt, control * dt);
    } else {
      const damp = Math.exp(-(this.onGround ? P.groundDamp : P.airDamp) * dt);
      this.velocity.x *= damp;
      this.velocity.z *= damp;
    }

    this.coyote = this.onGround ? COYOTE : Math.max(0, this.coyote - dt);
    this.jumpBuffer = wantsJump ? JUMP_BUFFER : Math.max(0, this.jumpBuffer - dt);
    if (this.jumpBuffer > 0 && this.coyote > 0) {
      this.velocity.y = P.jumpV;
      if (input.sprint && len > 0.01) {
        this.velocity.x += dx * P.sprintJumpBoost;
        this.velocity.z += dz * P.sprintJumpBoost;
      }
      this.coyote = 0;
      this.jumpBuffer = 0;
      this.onGround = false;
    }

    const g = this.velocity.y < 0 ? P.gravity * P.fallGravityMul : P.gravity;
    this.velocity.y -= g * dt;
    if (this.velocity.y < TERMINAL_V) this.velocity.y = TERMINAL_V;

    const wasGround = this.onGround;
    const fallSpeed = -this.velocity.y;
    this.moveAxis(0, this.velocity.x * dt);
    this.moveAxis(1, this.velocity.y * dt);
    this.moveAxis(2, this.velocity.z * dt);
    if (!wasGround && this.onGround && fallSpeed > 2) this.landedImpact = fallSpeed;

    const voidY = Math.min(this.spawnPoint.y - 18, -4);
    if (this.position.y < voidY && !this.isDying) {
      if (this.onDie) {
        this.isDying = true;
        this.velocity.set(0, 0.4, 0);
        this.onDie();
      } else {
        this.respawn();
      }
    }

    const horizontal = Math.hypot(this.velocity.x, this.velocity.z);
    if (this.onGround && horizontal > 0.6) this.bob += dt * horizontal * 1.5;
    else this.bob *= Math.exp(-8 * dt);
  }

  private collides(pos: THREE.Vector3) {
    const half = WIDTH / 2;
    const minX = Math.floor(pos.x - half);
    const maxX = Math.floor(pos.x + half);
    const minY = Math.floor(pos.y);
    const maxY = Math.floor(pos.y + HEIGHT - 0.0001);
    const minZ = Math.floor(pos.z - half);
    const maxZ = Math.floor(pos.z + half);
    for (let x = minX; x <= maxX; x++)
      for (let y = minY; y <= maxY; y++)
        for (let z = minZ; z <= maxZ; z++) {
          if (y >= WORLD_H) continue;
          if (this.world.solid(x, y, z)) return true;
        }
    return false;
  }

  private moveAxis(axis: 0 | 1 | 2, amount: number) {
    if (amount === 0) return;
    const key = axis === 0 ? "x" : axis === 1 ? "y" : "z";
    const next = this._next.copy(this.position);
    next[key] += amount;
    if (!this.collides(next)) {
      this.position.copy(next);
      if (axis === 1) this.onGround = false;
      return;
    }
    if (axis !== 1 && (this.onGround || this.coyote > 0) && this.velocity.y <= 0.01) {
      for (let lift = 0.2; lift <= STEP_HEIGHT + 0.001; lift += 0.2) {
        const stepped = this._probe.copy(this.position);
        stepped.y += lift;
        stepped[key] += amount;
        if (!this.collides(stepped)) {
          const headroom = this._next.copy(this.position);
          headroom.y += lift;
          if (!this.collides(headroom)) {
            this.position.copy(stepped);
            this.onGround = true;
            return;
          }
        }
      }
    }

    const step = Math.sign(amount) * 0.01;
    let moved = 0;
    while (Math.abs(moved) < Math.abs(amount)) {
      const probe = this._probe.copy(this.position);
      probe[key] += step;
      if (this.collides(probe)) break;
      this.position.copy(probe);
      moved += step;
    }
    if (axis === 1) {
      if (amount < 0) this.onGround = true;
      this.velocity.y = 0;
    } else {
      this.velocity[key] = 0;
    }
  }
}

export const PLAYER_DIMS = { WIDTH, HEIGHT, EYE };
