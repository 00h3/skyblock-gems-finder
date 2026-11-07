import * as THREE from "three";
import type { World } from "./world";
import { raycastVoxel } from "./interact";

/**
 * Mobile-tuned FOV: base 66°-70° for comfortable over-the-shoulder framing,
 * with subtle aspect adaptation so neither wide phones nor tablets feel distorted.
 */
export function fovForAspect(aspect: number, _horizontalDeg = 90, baseTargetFov = 62): number {
  const target = Number.isFinite(baseTargetFov) && baseTargetFov >= 50 && baseTargetFov <= 95
    ? baseTargetFov
    : 62;
  const userScale = THREE.MathUtils.clamp(target / 62, 0.85, 1.35);

  if (aspect <= 0 || !Number.isFinite(aspect)) {
    return THREE.MathUtils.clamp(62 * userScale, 56, 72);
  }

  if (aspect >= 1.0) {
    const wideBoost = aspect >= 1.9 ? 2.0 : aspect >= 1.6 ? 1.0 : 0.0;
    const landscapeFov = (61 + wideBoost) * userScale;
    return THREE.MathUtils.clamp(landscapeFov, 58, 72);
  }

  const portraitExpansion = (1.0 - Math.max(0.4, aspect)) * 5;
  const portraitFov = (62 + portraitExpansion) * userScale;
  return THREE.MathUtils.clamp(portraitFov, 60, 74);
}

/**
 * Tactical Close-Proximity Third Person Rig:
 * - Tight distance (~2.25m) so blocks, voxel builds and avatar are close to the camera
 * - Centered framing with responsive vertical/horizontal tracking
 * - 8-point SphereCast block clipping prevention & smooth ease-out
 */
export class ThirdPersonRig {
  /** Target distance behind the player: 2.25m (blocks closer to camera) */
  distance = 2.25;
  minDistance = 0.50;
  /** Lateral offset: centered directly behind player */
  lateralOffset = 0.0;

  /** Player model opacity fade factor: 1.0 (fully opaque) to 0.0 (transparent) */
  playerAlpha = 1.0;

  private pivot = new THREE.Vector3();
  private initialized = false;
  private currentDistance = 2.0;
  private _back = new THREE.Vector3();
  private _right = new THREE.Vector3();
  private _up = new THREE.Vector3();
  private _rayOrigin = new THREE.Vector3();
  private _wall = new THREE.Vector3();
  private _shoulder = new THREE.Vector3();
  private _probeOffsets: THREE.Vector3[] = Array.from({ length: 8 }, () => new THREE.Vector3());

  snap(target: THREE.Vector3) {
    this.pivot.copy(target);
    this.currentDistance = this.distance;
    this.initialized = true;
  }

  update(
    dt: number,
    camera: THREE.PerspectiveCamera,
    target: THREE.Vector3,
    world: World,
  ) {
    if (!this.initialized) this.snap(target);

    // Large teleport or respawn distance check (> 6m): snap pivot immediately without stretching
    if (this.pivot.distanceToSquared(target) > 36) {
      this.pivot.copy(target);
      this.currentDistance = this.distance;
    } else {
      // Responsive spring position damping so camera moves crisply without floaty lag
      const followXZ = 1 - Math.exp(-38 * dt);
      const followY = 1 - Math.exp(-32 * dt);
      this.pivot.x += (target.x - this.pivot.x) * followXZ;
      this.pivot.z += (target.z - this.pivot.z) * followXZ;
      this.pivot.y += (target.y - this.pivot.y) * followY;
    }

    // Direction vectors from camera quaternion
    const back = this._back.set(0, 0, 1).applyQuaternion(camera.quaternion);
    const right = this._right.set(1, 0, 0).applyQuaternion(camera.quaternion);
    const up = this._up.set(0, 1, 0).applyQuaternion(camera.quaternion);

    // Pitch-based height and distance adjustment:
    // When looking down (bridging, placing blocks beneath feet), lerp camera forward and up
    const pitch = camera.rotation.x;
    const lookDownFactor = Math.max(0, -pitch / 1.35); // 0 at horizon, up to ~1 when looking down
    const targetDist = Math.max(1.25, this.distance - lookDownFactor * 0.40);
    const verticalLift = lookDownFactor * 0.28;

    // Shift pivot over shoulder and apply vertical lift
    // Reused scratch vectors: this runs every frame, and allocating ~15 vectors
    // per frame made garbage-collection hitches. Same math, zero allocations.
    const shoulderPivot = this._shoulder
      .copy(this.pivot)
      .addScaledVector(right, this.lateralOffset * (1 - lookDownFactor * 0.4));
    shoulderPivot.y += verticalLift;

    // Multi-sample 8-point SphereCast collision (~0.18m radius):
    const sphereRadius = 0.18;
    const diag = sphereRadius * 0.7;
    const testOffsets = this._probeOffsets;
    testOffsets[0].set(0, 0, 0);
    testOffsets[1].copy(right).multiplyScalar(sphereRadius);
    testOffsets[2].copy(right).multiplyScalar(-sphereRadius);
    testOffsets[3].copy(up).multiplyScalar(sphereRadius);
    testOffsets[4].copy(up).multiplyScalar(-sphereRadius);
    testOffsets[5].copy(right).add(up).multiplyScalar(diag);
    testOffsets[6].copy(right).sub(up).multiplyScalar(diag);
    testOffsets[7].copy(up).sub(right).multiplyScalar(diag);

    let minHitDist = targetDist + 0.22;
    for (let probe = 0; probe < testOffsets.length; probe++) {
      const off = testOffsets[probe];
      this._rayOrigin.copy(shoulderPivot).add(off);
      const hit = raycastVoxel(world, this._rayOrigin, back, targetDist + 0.22);
      if (hit) {
        this._wall.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
        const dist = this._rayOrigin.distanceTo(this._wall) - 0.38;
        if (dist < minHitDist) {
          minHitDist = dist;
        }
      }
    }

    const wanted = THREE.MathUtils.clamp(minHitDist, this.minDistance, targetDist);

    // Pull camera in instantly on collision; ease out smoothly when leaving walls
    if (wanted < this.currentDistance) {
      this.currentDistance = wanted;
    } else {
      this.currentDistance += (wanted - this.currentDistance) * (1 - Math.exp(-22 * dt));
    }

    // Dither / Alpha Fade: When pushed closer than 0.75m to the player, fade avatar mesh
    if (this.currentDistance < 0.75) {
      this.playerAlpha = THREE.MathUtils.clamp((this.currentDistance - 0.35) / 0.40, 0.05, 1.0);
    } else {
      this.playerAlpha = 1.0;
    }

    camera.position.copy(shoulderPivot).addScaledVector(back, this.currentDistance);
  }
}

/**
 * Character heading controller supporting:
 * - Movement-based facing during regular traversal
 * - Combat / Reticle Mode: torso and head lock to camera yaw when attacking / placing
 * - Free-Look Mode: 360° camera orbit while character body stays locked to its previous heading
 */
export class MovementFacing {
  heading = 0;
  private lockedHeading = 0;

  update(
    vx: number,
    vz: number,
    cameraYaw: number,
    isCombatOrPlacing = false,
    isFreeLook = false,
    initialized = true,
  ) {
    // Combat / Reticle Mode: always face camera aim direction
    if (isCombatOrPlacing) {
      this.heading = cameraYaw;
      this.lockedHeading = this.heading;
      return this.heading;
    }

    // Free-Look Mode: keep previous body heading while camera turns 360°
    if (isFreeLook) {
      if (Math.hypot(vx, vz) > 0.35) {
        this.heading = Math.atan2(vx, vz);
        this.lockedHeading = this.heading;
      }
      return this.heading;
    }

    // Standard movement facing
    if (Math.hypot(vx, vz) > 0.35) {
      this.heading = Math.atan2(vx, vz);
      this.lockedHeading = this.heading;
    } else if (!initialized) {
      this.heading = cameraYaw;
      this.lockedHeading = cameraYaw;
    }

    return this.heading;
  }
}

/**
 * Complete Camera Controller Pipeline
 * Handles rotation smoothing, eye-height jitter filtering, subtle head bobbing,
 * sprint FOV feedback, landing recoil dips, underwater transitions, and respawn snaps.
 */
export class CameraController {
  rig = new ThirdPersonRig();
  facing = new MovementFacing();

  // Settings
  enableBobbing = true;
  enableFovKick = true;
  enableLandingDip = true;

  smoothEyeY = -100;
  landDip = 0;
  underwaterAlpha = 0;
  smoothFov = 62;
  smoothYaw = 0;
  smoothPitch = 0;

  private _eye = new THREE.Vector3();
  private _pivot = new THREE.Vector3();
  private _euler = new THREE.Euler(0, 0, 0, "YXZ");

  snap(target: THREE.Vector3, yaw = 0, pitch = 0) {
    this.rig.snap(target);
    this.smoothEyeY = target.y + 1.62;
    this.landDip = 0;
    this.smoothYaw = yaw;
    this.smoothPitch = pitch;
  }

  addLandImpact(impactVel: number) {
    if (!this.enableLandingDip) return;
    if (impactVel > 1.8) {
      const extraDip = Math.min(0.16, impactVel * 0.012);
      this.landDip = Math.max(this.landDip, extraDip);
    }
  }

  update(
    dt: number,
    camera: THREE.PerspectiveCamera,
    playerPos: THREE.Vector3,
    targetEyeY: number,
    rawYaw: number,
    rawPitch: number,
    isGrounded: boolean,
    isSprinting: boolean,
    isCrouching: boolean,
    horizontalSpeed: number,
    bobPhase: number,
    world: World | null,
    isThirdPerson = false,
    baseFov = 62,
    waterLevel: number | null = null,
  ) {
    // 1. Rotation damping & pitch clamping
    const rotSpeed = 34;
    const rotAlpha = 1 - Math.exp(-rotSpeed * dt);
    let yawDiff = (rawYaw - this.smoothYaw) % (Math.PI * 2);
    if (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
    if (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
    this.smoothYaw += yawDiff * rotAlpha;

    const clampedPitch = THREE.MathUtils.clamp(rawPitch, -Math.PI / 2 + 0.001, Math.PI / 2 - 0.001);
    this.smoothPitch += (clampedPitch - this.smoothPitch) * rotAlpha;

    this._euler.set(this.smoothPitch, this.smoothYaw, 0);
    camera.quaternion.setFromEuler(this._euler);

    // 2. Eye height smoothing (absorbs micro-step physics jitter)
    if (this.smoothEyeY < -50 || Math.abs(targetEyeY - this.smoothEyeY) > 5.0) {
      this.smoothEyeY = targetEyeY;
    } else {
      const eyeRate = isGrounded ? 28 : 36;
      this.smoothEyeY += (targetEyeY - this.smoothEyeY) * (1 - Math.exp(-eyeRate * dt));
    }

    // 3. Head bobbing (rhythmic, speed-dependent)
    let bobY = 0;
    let bobX = 0;
    if (this.enableBobbing && isGrounded && !isCrouching && horizontalSpeed > 0.4) {
      const bobMult = Math.min(1.0, horizontalSpeed / 4.5);
      bobY = Math.sin(bobPhase * 2) * (isSprinting ? 0.042 : 0.032) * bobMult;
      bobX = Math.cos(bobPhase) * (isSprinting ? 0.026 : 0.018) * bobMult;
    }

    // 4. Landing dip recoil decay
    if (this.landDip > 0.001) {
      this.landDip *= Math.exp(-15 * dt);
    } else {
      this.landDip = 0;
    }

    // 5. Smooth underwater transition
    const isUnderwater = waterLevel !== null && (this.smoothEyeY < waterLevel);
    const targetSubmerged = isUnderwater ? 1.0 : 0.0;
    this.underwaterAlpha += (targetSubmerged - this.underwaterAlpha) * (1 - Math.exp(-16 * dt));
    const waterBob = this.underwaterAlpha > 0.01 ? Math.sin(Date.now() * 0.0025) * 0.04 * this.underwaterAlpha : 0;

    // 6. Camera positioning
    if (!isThirdPerson) {
      this._eye.set(
        playerPos.x + bobX * 0.25,
        this.smoothEyeY + bobY - this.landDip + waterBob,
        playerPos.z,
      );
      camera.position.copy(this._eye);
    } else if (world) {
      this._pivot.set(
        playerPos.x,
        playerPos.y + 1.45 + bobY * 0.5 - this.landDip * 0.5 + waterBob,
        playerPos.z,
      );
      this.rig.update(dt, camera, this._pivot, world);
    }

    // 7. Dynamic FOV expansion (sprint & underwater)
    if (this.smoothFov <= 0) this.smoothFov = baseFov;
    let fovBoost = 0;
    if (this.enableFovKick && isSprinting && horizontalSpeed > 4.2) {
      fovBoost += 3.5;
    }
    if (this.underwaterAlpha > 0.01) {
      fovBoost -= 2.0 * this.underwaterAlpha;
    }
    const targetFov = fovForAspect(camera.aspect, 90, baseFov) + fovBoost;
    if (Math.abs(camera.fov - targetFov) > 0.04) {
      this.smoothFov += (targetFov - this.smoothFov) * (1 - Math.exp(-12 * dt));
      camera.fov = this.smoothFov;
      camera.updateProjectionMatrix();
    }
  }
}
