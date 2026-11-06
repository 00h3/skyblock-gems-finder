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
 * - SphereCast block clipping prevention
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

    // Responsive spring position damping so camera moves crisply without floaty lag
    const followXZ = 1 - Math.exp(-38 * dt);
    const followY = 1 - Math.exp(-32 * dt);
    this.pivot.x += (target.x - this.pivot.x) * followXZ;
    this.pivot.z += (target.z - this.pivot.z) * followXZ;
    this.pivot.y += (target.y - this.pivot.y) * followY;

    if (this.pivot.distanceToSquared(target) > 16) {
      this.pivot.copy(target);
    }

    // Direction vectors from camera quaternion
    const back = this._back.set(0, 0, 1).applyQuaternion(camera.quaternion);
    const right = this._right.set(1, 0, 0).applyQuaternion(camera.quaternion);
    const up = this._up.set(0, 1, 0).applyQuaternion(camera.quaternion);

    // Pitch-based height and distance adjustment:
    // When looking down (bridging, placing blocks beneath feet), lerp camera forward and up
    const pitch = camera.rotation.x;
    const lookDownFactor = Math.max(0, -pitch / 1.35); // 0 at horizon, up to ~1 when looking down
    const targetDist = Math.max(1.3, this.distance - lookDownFactor * 0.40);
    const verticalLift = lookDownFactor * 0.28;

    // Shift pivot over right shoulder and apply vertical lift
    const shoulderPivot = this.pivot.clone()
      .addScaledVector(right, this.lateralOffset * (1 - lookDownFactor * 0.4))
      .add(new THREE.Vector3(0, verticalLift, 0));

    // Multi-sample SphereCast collision (~0.18m radius):
    const sphereRadius = 0.18;
    const testOffsets = [
      new THREE.Vector3(0, 0, 0),
      right.clone().multiplyScalar(sphereRadius),
      right.clone().multiplyScalar(-sphereRadius),
      up.clone().multiplyScalar(sphereRadius),
      up.clone().multiplyScalar(-sphereRadius),
    ];

    let minHitDist = targetDist + 0.25;
    for (const off of testOffsets) {
      this._rayOrigin.copy(shoulderPivot).add(off);
      const hit = raycastVoxel(world, this._rayOrigin, back, targetDist + 0.25);
      if (hit) {
        this._wall.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
        const dist = this._rayOrigin.distanceTo(this._wall) - 0.40;
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
