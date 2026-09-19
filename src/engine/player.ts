import * as THREE from "three";
import { World, WORLD_H } from "./world";

/** Feel constants — tune these, not the maths. */
const WIDTH = 0.6;
const HEIGHT = 1.8;
const EYE = 1.62;
/**
 * Blockman GO / mobile-voxel feel:
 * ~1.4 block jump, soft floaty fall, snappy ground accel, weak air control,
 * a small sprint-jump boost and automatic 0.6 block step-up so bridging,
 * stairs and block-clutch movement never snag on an edge.
 */
const GRAVITY = 28.5;
const JUMP_V = 8.5;
const WALK = 4.31;
const SPRINT = 5.61;
const CROUCH = 2.15;
const ACCEL = 64;
const AIR_CONTROL = 0.26;
const SPRINT_JUMP_BOOST = 1.22;
const GROUND_DAMP = 14.5;
const AIR_DAMP = 0.55;
const COYOTE = 0.12;
const JUMP_BUFFER = 0.14;
const STEP_HEIGHT = 0.6;
const TERMINAL_V = -48;

export type MoveInput = {
  forward: number; // -1..1
  strafe: number; // -1..1
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
  onDie?: () => void;
  private coyote = 0;
  private jumpBuffer = 0;

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
    if (this.isDying) {
      this.velocity.x *= Math.exp(-6 * dt);
      this.velocity.z *= Math.exp(-6 * dt);
      this.velocity.y = Math.max(-1.5, this.velocity.y - 2 * dt);
      this.position.y += this.velocity.y * dt;
      return;
    }

    this.isCrouching = Boolean(input.crouch);
    const speed = input.crouch ? CROUCH : input.sprint ? SPRINT : WALK;

    // camera-relative desired direction
    const sin = Math.sin(input.yaw);
    const cos = Math.cos(input.yaw);
    let dx = input.strafe * cos - input.forward * sin;
    let dz = -input.strafe * sin - input.forward * cos;
    const len = Math.hypot(dx, dz);
    if (len > 1) {
      dx /= len;
      dz /= len;
    }

    const targetX = dx * speed;
    const targetZ = dz * speed;
    const control = this.onGround ? ACCEL : ACCEL * AIR_CONTROL;
    this.velocity.x += THREE.MathUtils.clamp(
      targetX - this.velocity.x,
      -control * dt,
      control * dt,
    );
    this.velocity.z += THREE.MathUtils.clamp(
      targetZ - this.velocity.z,
      -control * dt,
      control * dt,
    );

    if (len < 0.01) {
      const damp = Math.exp(-(this.onGround ? GROUND_DAMP : AIR_DAMP) * dt);
      this.velocity.x *= damp;
      this.velocity.z *= damp;
    }

    this.coyote = this.onGround ? COYOTE : Math.max(0, this.coyote - dt);
    this.jumpBuffer = input.jump ? JUMP_BUFFER : Math.max(0, this.jumpBuffer - dt);
    if (this.jumpBuffer > 0 && this.coyote > 0) {
      this.velocity.y = JUMP_V;
      if (input.sprint && len > 0.01) {
        this.velocity.x += dx * SPRINT_JUMP_BOOST;
        this.velocity.z += dz * SPRINT_JUMP_BOOST;
      }
      this.coyote = 0;
      this.jumpBuffer = 0;
      this.onGround = false;
    }

    if (this.isDying) {
      // Float gently and damp horizontal movement during angel death animation
      this.velocity.x *= Math.exp(-8 * dt);
      this.velocity.z *= Math.exp(-8 * dt);
      this.velocity.y = 0.25;
      this.moveAxis(1, this.velocity.y * dt);
      return;
    }

    this.velocity.y -= GRAVITY * dt;
    if (this.velocity.y < TERMINAL_V) this.velocity.y = TERMINAL_V;

    this.moveAxis(0, this.velocity.x * dt);
    this.moveAxis(1, this.velocity.y * dt);
    this.moveAxis(2, this.velocity.z * dt);

    // Safe respawn with angel death sequence when falling into the void
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

    // head bob
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
    const next = this.position.clone();
    const key = axis === 0 ? "x" : axis === 1 ? "y" : "z";
    next[key] += amount;
    if (!this.collides(next)) {
      this.position.copy(next);
      if (axis === 1) this.onGround = false;
      return;
    }
    // auto step-up: walk straight onto a one-block ledge instead of stopping
    if (axis !== 1 && (this.onGround || this.coyote > 0) && this.velocity.y <= 0.01) {
      for (let lift = 0.2; lift <= STEP_HEIGHT + 0.001; lift += 0.2) {
        const stepped = this.position.clone();
        stepped.y += lift;
        stepped[key] += amount;
        if (!this.collides(stepped)) {
          const headroom = this.position.clone();
          headroom.y += lift;
          if (!this.collides(headroom)) {
            this.position.copy(stepped);
            this.onGround = true;
            return;
          }
        }
      }
    }

    // step back to contact
    const step = Math.sign(amount) * 0.01;
    let moved = 0;
    while (Math.abs(moved) < Math.abs(amount)) {
      const probe = this.position.clone();
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
