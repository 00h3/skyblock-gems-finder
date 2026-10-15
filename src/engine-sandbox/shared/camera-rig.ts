import * as THREE from "three";
import type { World } from "./world";
import { raycastVoxel } from "./interact";

/**
 * Mobile-tuned FOV: base 66°-70° for comfortable over-the-shoulder framing,
 * with subtle aspect adaptation so neither wide phones nor tablets feel distorted.
 */
export function fovForAspect(aspect: number, _horizontalDeg = 90, baseTargetFov = 68): number {
  const target = Number.isFinite(baseTargetFov) && baseTargetFov >= 50 && baseTargetFov <= 95
    ? baseTargetFov
    : 68;
  const userScale = THREE.MathUtils.clamp(target / 68, 0.85, 1.35);

  if (aspect <= 0 || !Number.isFinite(aspect)) {
    return THREE.MathUtils.clamp(68 * userScale, 60, 75);
  }

  if (aspect >= 1.0) {
    const wideBoost = aspect >= 1.9 ? 2.5 : aspect >= 1.6 ? 1.5 : 0.5;
    const landscapeFov = (67 + wideBoost) * userScale;
    return THREE.MathUtils.clamp(landscapeFov, 65, 75);
  }

  const portraitExpansion = (1.0 - Math.max(0.4, aspect)) * 6;
  const portraitFov = (68 + portraitExpansion) * userScale;
  return THREE.MathUtils.clamp(portraitFov, 66, 78);
}

/**
 * Blockman GO style Over-The-Shoulder Third Person Rig:
 * - Tight distance (2.2m - 2.6m) so avatar skins and feet are clearly visible
 * - Lateral right-shoulder offset (+0.38m) keeping reticle line-of-sight clear
 * - Pitch-based lift and forward lerp when looking down (bridging assist)
 * - Multi-ray SphereCast clipping (radius ~0.18m) preventing wall clipping
 * - Alpha fade factor when camera is pushed closer than 0.85m to character
 * - Snappy rotation with spring-damped position translation
 */
export class ThirdPersonRig {
  /** Target distance behind the player (Blockman GO signature: 2.3m - 2.5m) */
  distance = 2.4;
  minDistance = 0.55;
  /** Lateral right-shoulder offset (units) */
  lateralOffset = 0.38;

  /** Player model opacity fade factor: 1.0 (fully opaque) to 0.0 (transparent) */
  playerAlpha = 1.0;

  private pivot = new THREE.Vector3();
  private initialized = false;
  private currentDistance = 2.4;
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

    // Spring position damping for translation so jumps don't violently jerk the screen
    const followXZ = 1 - Math.exp(-24 * dt);
    const followY = 1 - Math.exp(-15 * dt);
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
    // so the character's head doesn't block the viewport or clip
    const pitch = camera.rotation.x;
    const lookDownFactor = Math.max(0, -pitch / 1.35); // 0 at horizon, up to ~1 when looking down
    const targetDist = Math.max(1.5, this.distance - lookDownFactor * 0.45);
    const verticalLift = lookDownFactor * 0.32;

    // Shift pivot over right shoulder and apply vertical lift
    const shoulderPivot = this.pivot.clone()
      .addScaledVector(right, this.lateralOffset * (1 - lookDownFactor * 0.4))
      .add(new THREE.Vector3(0, verticalLift, 0));

    // Multi-sample SphereCast collision (~0.18m radius):
    // Cast center ray and 4 surrounding perimeter rays to prevent block clipping
    const sphereRadius = 0.18;
    const testOffsets = [
      new THREE.Vector3(0, 0, 0),
      right.clone().multiplyScalar(sphereRadius),
      right.clone().multiplyScalar(-sphereRadius),
      up.clone().multiplyScalar(sphereRadius),
      up.clone().multiplyScalar(-sphereRadius),
    ];

    let minHitDist = targetDist + 0.3;
    for (const off of testOffsets) {
      this._rayOrigin.copy(shoulderPivot).add(off);
      const hit = raycastVoxel(world, this._rayOrigin, back, targetDist + 0.3);
      if (hit) {
        this._wall.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
        const dist = this._rayOrigin.distanceTo(this._wall) - 0.45;
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
      this.currentDistance += (wanted - this.currentDistance) * (1 - Math.exp(-16 * dt));
    }

    // Dither / Alpha Fade: When pushed closer than 0.85m to the player, fade avatar mesh
    if (this.currentDistance < 0.85) {
      this.playerAlpha = THREE.MathUtils.clamp((this.currentDistance - 0.4) / 0.45, 0.05, 1.0);
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
