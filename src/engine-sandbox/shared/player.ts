import * as THREE from "three";
import { BLOCK_BY_ID, World, WORLD_H } from "./world";

const WIDTH = 0.6;
const HEIGHT = 1.8;
const EYE = 1.62;
const COYOTE = 0.12;
const JUMP_BUFFER = 0.14;
const STEP_HEIGHT = 0.6;
const TERMINAL_V = -48;
const SLIDE_HEIGHT = 0.9;
const SLIDE_TIME = 0.65;

/** Identical collision/hit volume for every player, whatever skin or armor they wear. */
export const HITBOX = { radius: WIDTH / 2, height: HEIGHT } as const;

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
  jumpV: 9.5,
  walk: 4.85,
  sprint: 6.60,
  crouch: 2.40,
  accel: 145.0,
  groundDamp: 24.0,
  airDamp: 0.65,
  airControl: 0.62,
  sprintJumpBoost: 1.15,
};

/** Smooth, responsive and agile — built for silky Block Fall rounds. */
export const COMPETITIVE_PHYSICS: PhysicsProfile = {
  gravity: 28.8,
  fallGravityMul: 1.2,
  jumpV: 9.2,
  walk: 4.85,
  sprint: 6.60,
  crouch: 2.40,
  accel: 130.0,
  groundDamp: 22.0,
  airDamp: 0.65,
  airControl: 0.60,
  sprintJumpBoost: 1.10,
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
  /** Set by the feature layer each frame when overlapping a ladder. */
  onLadder = false;
  /** Remaining sprint-slide time; the hitbox shrinks to fit 1-block gaps. */
  slideT = 0;
  private slideDirX = 0;
  private slideDirZ = 0;
  private wasCrouchInput = false;
  private coyote = 0;
  private jumpBuffer = 0;
  private mantleReady = false;
  private _next = new THREE.Vector3();
  private _probe = new THREE.Vector3();

  constructor(private world: World) {}

  get eyeY() {
    if (this.slideT > 0) return this.position.y + SLIDE_HEIGHT - 0.2;
    return this.position.y + (this.isCrouching ? EYE - 0.28 : EYE);
  }

  get hitHeight() {
    return this.slideT > 0 ? SLIDE_HEIGHT : HEIGHT;
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
    this.resolveStuck();
  }

  /** External impulse handler for knockback physics (combat attacks, mobs, explosions). */
  addKnockback(impulse: THREE.Vector3) {
    if (!impulse || typeof impulse.x !== "number") return;
    this.velocity.add(impulse);
    if (impulse.y > 0.4) {
      this.onGround = false;
      this.coyote = 0;
    }
  }

  /** Soft entity collision: repulses local player from remote players / mobs so entities do not overlap like ghosts. */
  pushEntity(otherPos: THREE.Vector3, radius = 0.65) {
    if (!otherPos) return;
    const dx = this.position.x - otherPos.x;
    const dz = this.position.z - otherPos.z;
    const distSq = dx * dx + dz * dz;
    if (distSq > 0.0001 && distSq < radius * radius) {
      const dist = Math.sqrt(distSq);
      const overlap = (radius - dist) / dist;
      const pushForce = overlap * 7.5;
      this.velocity.x += dx * pushForce;
      this.velocity.z += dz * pushForce;
    }
  }

  pushEntities(positions: THREE.Vector3[], radius = 0.65) {
    for (const pos of positions) {
      this.pushEntity(pos, radius);
    }
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

    // Sub-step physics (60Hz fixed step rate) for 100% frame-rate independence across 30-240 FPS
    const maxSubStep = 1 / 60;
    let remaining = Math.min(dt, 0.15); // cap at 150ms to prevent lag spiral
    while (remaining > 0) {
      const step = Math.min(remaining, maxSubStep);
      this.stepPhysics(step, input);
      remaining -= step;
    }
  }

  /** De-penetration & anti-stuck resolver: pushes player outward if embedded inside solid voxels. */
  private resolveStuck() {
    if (!this.collides(this.position)) return;

    // 1. Try upward de-penetration first (player stepped into a block or block placed below feet)
    const probe = this._probe.copy(this.position);
    for (let dy = 0.05; dy <= 2.1; dy += 0.1) {
      probe.y = this.position.y + dy;
      if (!this.collides(probe)) {
        this.position.y = probe.y;
        if (this.velocity.y < 0) this.velocity.y = 0;
        this.onGround = true;
        return;
      }
    }

    // 2. Try horizontal de-penetration if ceiling is blocked
    const steps = 8;
    const radius = 0.35;
    for (let r = 0.1; r <= radius; r += 0.1) {
      for (let i = 0; i < steps; i++) {
        const ang = (i / steps) * Math.PI * 2;
        probe.set(
          this.position.x + Math.cos(ang) * r,
          this.position.y,
          this.position.z + Math.sin(ang) * r,
        );
        if (!this.collides(probe)) {
          this.position.copy(probe);
          return;
        }
      }
    }
  }

  private stepPhysics(dt: number, input: MoveInput) {
    this.resolveStuck();
    const P = this.profile;
    const forward = this.frozen ? 0 : input.forward;
    const strafe = this.frozen ? 0 : input.strafe;
    const wantsJump = !this.frozen && input.jump;

    this.mantleReady = wantsJump && !this.onGround && this.velocity.y <= 1.5;
    this.isCrouching = Boolean(input.crouch) && !this.frozen;

    // Surface block friction & special terrain properties
    const footX = Math.floor(this.position.x);
    const footY = Math.floor(this.position.y - 0.08);
    const footZ = Math.floor(this.position.z);
    const blockUnderId = this.world.get(footX, footY, footZ);
    const blockUnderDef = BLOCK_BY_ID.get(blockUnderId);

    let activeGroundDamp = P.groundDamp;
    let speedMult = 1.0;

    if (blockUnderDef && this.onGround) {
      const bName = blockUnderDef.name.toLowerCase();
      if (bName.includes("ice")) {
        // Slippery Ice physics: low deceleration momentum retention
        activeGroundDamp = P.groundDamp * 0.18;
      } else if (blockUnderId === 63 || bName.includes("slime")) {
        // Slime block elastic bounce
        if (this.landedImpact > 2.5) {
          this.velocity.y = Math.min(16, this.landedImpact * 0.78);
          this.onGround = false;
        }
      } else if (bName.includes("soul") || bName.includes("mud")) {
        // Soul Sand / Mud slowdown
        speedMult = 0.55;
        activeGroundDamp = P.groundDamp * 1.8;
      }
    }

    const baseSpeed = this.isCrouching ? P.crouch : input.sprint ? P.sprint : P.walk;
    const speed = baseSpeed * speedMult;

    const crouchPressed = Boolean(input.crouch) && !this.wasCrouchInput;
    this.wasCrouchInput = Boolean(input.crouch);
    const planarSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    if (crouchPressed && this.slideT <= 0 && this.onGround && !this.frozen && planarSpeed > P.walk * 1.05) {
      this.slideT = SLIDE_TIME;
      this.slideDirX = this.velocity.x / planarSpeed;
      this.slideDirZ = this.velocity.z / planarSpeed;
      const boost = Math.max(planarSpeed * 1.3, P.sprint * 1.4);
      this.velocity.x = this.slideDirX * boost;
      this.velocity.z = this.slideDirZ * boost;
    }
    if (this.slideT > 0) {
      this.slideT -= dt;
      if (!this.onGround || wantsJump) this.slideT = Math.min(this.slideT, 0);
      if (this.slideT <= 0 && this.collidesAt(this.position, HEIGHT)) this.slideT = 0.05;
    }
    const sliding = this.slideT > 0;
    if (sliding) this.isCrouching = true;

    // Camera-relative wish direction. Unit-circle normalized for uniform diagonal movement speed
    const sin = Math.sin(input.yaw);
    const cos = Math.cos(input.yaw);
    let dx = strafe * cos - forward * sin;
    let dz = -strafe * sin - forward * cos;
    const len = Math.hypot(dx, dz);
    if (len > 1.0) {
      dx /= len;
      dz /= len;
    }

    const currentSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    const isReversing = len > 0.01 && currentSpeed > 0.5 && (dx * this.velocity.x + dz * this.velocity.z) < 0;

    let control = this.onGround ? P.accel : P.accel * P.airControl;
    if (isReversing && this.onGround) {
      // Direction-reversal active braking for instant snappy turning without sliding
      control *= 2.4;
    }

    if (sliding) {
      const glide = Math.exp(-1.7 * dt);
      this.velocity.x *= glide;
      this.velocity.z *= glide;
    } else if (len > 0.01) {
      const targetX = dx * speed;
      const targetZ = dz * speed;
      this.velocity.x += THREE.MathUtils.clamp(targetX - this.velocity.x, -control * dt, control * dt);
      this.velocity.z += THREE.MathUtils.clamp(targetZ - this.velocity.z, -control * dt, control * dt);
    } else {
      const damp = Math.exp(-(this.onGround ? activeGroundDamp : P.airDamp) * dt);
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

    // Short hop: cut upward momentum early if jump button is released mid-ascent
    if (!wantsJump && this.velocity.y > 2.2 && !this.onGround) {
      this.velocity.y *= Math.exp(-12 * dt);
    }

    const curFootX = Math.floor(this.position.x);
    const curFootY = Math.floor(this.position.y);
    const curEyeY = Math.floor(this.position.y + EYE);
    const curFootZ = Math.floor(this.position.z);
    const isFeetLiquid = this.world.isLiquid(curFootX, curFootY, curFootZ);
    const isHeadLiquid = this.world.isLiquid(curFootX, curEyeY, curFootZ);
    const inWater = isFeetLiquid || isHeadLiquid;

    if (inWater) {
      // Smooth 3D liquid swimming & buoyancy
      if (wantsJump) {
        // Water exit leap when reaching surface
        if (!isHeadLiquid && isFeetLiquid && this.velocity.y > 0) {
          this.velocity.y = P.jumpV * 0.72;
          this.onGround = false;
        } else {
          this.velocity.y = Math.min(this.velocity.y + 18 * dt, 4.8);
        }
      } else if (input.crouch) {
        this.velocity.y = Math.max(this.velocity.y - 16 * dt, -4.2);
      } else {
        // Neutral buoyant float
        this.velocity.y *= Math.exp(-4.5 * dt);
      }
      this.velocity.x *= Math.exp(-3.5 * dt);
      this.velocity.z *= Math.exp(-3.5 * dt);
    } else if (this.onLadder) {
      if (wantsJump || forward > 0.2) this.velocity.y = 3.4;
      else if (input.crouch) this.velocity.y = 0;
      else this.velocity.y = -1.8;
      this.velocity.x *= Math.exp(-6 * dt);
      this.velocity.z *= Math.exp(-6 * dt);
    } else {
      let g = this.velocity.y < 0 ? P.gravity * P.fallGravityMul : P.gravity;
      // Soft apex hang reads as weight rather than float
      if (!this.onGround && Math.abs(this.velocity.y) < 1.4) g *= 0.72;
      this.velocity.y -= g * dt;
      if (this.velocity.y < TERMINAL_V) this.velocity.y = TERMINAL_V;
    }

    const wasGround = this.onGround;
    const fallSpeed = -this.velocity.y;
    this.moveAxis(0, this.velocity.x * dt);
    this.moveAxis(1, this.velocity.y * dt);
    this.moveAxis(2, this.velocity.z * dt);
    if (!wasGround && this.onGround && fallSpeed > 1.8) this.landedImpact = fallSpeed;

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
    if (this.onGround && horizontal > 0.6) this.bob += dt * horizontal * 1.8;
    else this.bob *= Math.exp(-8 * dt);
  }

  private collides(pos: THREE.Vector3) {
    return this.collidesAt(pos, this.hitHeight);
  }

  private collidesAt(pos: THREE.Vector3, height: number) {
    const half = WIDTH / 2;
    const playerMinX = pos.x - half;
    const playerMaxX = pos.x + half;
    const playerMinY = pos.y;
    const playerMaxY = pos.y + height - 0.0001;
    const playerMinZ = pos.z - half;
    const playerMaxZ = pos.z + half;

    const minX = Math.floor(playerMinX);
    const maxX = Math.floor(playerMaxX);
    const minY = Math.floor(playerMinY);
    const maxY = Math.floor(playerMaxY);
    const minZ = Math.floor(playerMinZ);
    const maxZ = Math.floor(playerMaxZ);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          if (y >= WORLD_H || y < 0) continue;
          const id = this.world.get(x, y, z);
          if (id === 0) continue;
          const def = BLOCK_BY_ID.get(id);
          if (!def || def.passable || def.liquid) continue;

          // Sub-voxel shape bounds check for slabs and partial blocks
          let blockMinY = y;
          let blockMaxY = y + 1.0;

          if (def.shape === "slab") {
            blockMaxY = y + 0.5;
          }

          if (playerMaxY > blockMinY && playerMinY < blockMaxY) {
            return true;
          }
        }
      }
    }
    return false;
  }

  private hasGroundUnder(pos: THREE.Vector3): boolean {
    const half = (WIDTH - 0.04) / 2;
    const minY = Math.floor(pos.y - 0.05);
    if (minY < 0) return false;
    const probes = [
      { x: pos.x - half, z: pos.z - half },
      { x: pos.x + half, z: pos.z - half },
      { x: pos.x - half, z: pos.z + half },
      { x: pos.x + half, z: pos.z + half },
    ];
    for (const p of probes) {
      if (this.world.solid(Math.floor(p.x), minY, Math.floor(p.z))) return true;
    }
    return false;
  }

  private moveAxis(axis: 0 | 1 | 2, amount: number) {
    if (amount === 0) return;
    const key = axis === 0 ? "x" : axis === 1 ? "y" : "z";
    const next = this._next.copy(this.position);
    next[key] += amount;

    // Minecraft Sneak / Crouch Lock Edge Guard:
    // When crouching on solid ground, prevent walking off ledges into empty air
    if (axis !== 1 && this.isCrouching && this.onGround && !this.onLadder) {
      if (!this.hasGroundUnder(next)) {
        this.velocity[key] = 0;
        return;
      }
    }

    if (!this.collides(next)) {
      this.position.copy(next);
      if (axis === 1) this.onGround = false;
      return;
    }

    const mantling = axis !== 1 && this.mantleReady && !this.onGround && this.coyote <= 0;
    const inAirStep = axis !== 1 && !this.onGround && this.velocity.y > -3.0;
    if (axis !== 1 && (((this.onGround || this.coyote > 0) && this.velocity.y <= 0.01) || mantling || inAirStep)) {
      // Stair & slab step-up: smooth stair-climbing for lips up to STEP_HEIGHT
      const ahead = BLOCK_BY_ID.get(
        this.world.get(Math.floor(next.x), Math.floor(this.position.y + 0.05), Math.floor(next.z)),
      );
      const maxLift = mantling || inAirStep ? 1.15 : ahead?.shape ? 1.0 : STEP_HEIGHT;
      for (let lift = 0.15; lift <= maxLift + 0.001; lift += 0.15) {
        const stepped = this._probe.copy(this.position);
        stepped.y += lift;
        stepped[key] += amount;
        if (!this.collides(stepped)) {
          const headroom = this._next.copy(this.position);
          headroom.y += lift;
          if (!this.collides(headroom)) {
            this.position.copy(stepped);
            this.onGround = true;
            if (mantling) this.velocity.y = 0;
            return;
          }
        }
      }
    }

    // Fast binary search bisection to find exact point of contact without linear loop stalls
    let min = 0;
    let max = amount;
    for (let i = 0; i < 5; i++) {
      const mid = (min + max) * 0.5;
      const probe = this._probe.copy(this.position);
      probe[key] += mid;
      if (this.collides(probe)) {
        max = mid;
      } else {
        min = mid;
      }
    }
    this.position[key] += min;
    if (axis === 1) {
      if (amount < 0) this.onGround = true;
      this.velocity.y = 0;
    } else {
      this.velocity[key] = 0;
    }
  }
}

export const PLAYER_DIMS = { WIDTH, HEIGHT, EYE };
