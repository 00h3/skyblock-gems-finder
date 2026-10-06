import * as THREE from "three";
import type { World } from "../world";
import { raycastVoxel } from "../interact";

/**
 * Dynamic FOV calculation that guarantees spacious, comfortable perspective
 * across all mobile devices (Samsung, iPhone, iPad) and desktop displays,
 * in both landscape and portrait orientations.
 *
 * In landscape (especially modern mobile devices with 19.5:9 or 20:9 aspect ratios):
 * Keeps vertical FOV generously open (~72°-76°) so the view is never cramped or zoomed in.
 *
 * In portrait:
 * Slightly expands vertical FOV so the narrow width still provides adequate peripheral view.
 */
export function fovForAspect(aspect: number, _horizontalDeg = 90, baseTargetFov = 72): number {
  const target = Number.isFinite(baseTargetFov) && baseTargetFov >= 50 && baseTargetFov <= 100
    ? baseTargetFov
    : 72;
  const userScale = THREE.MathUtils.clamp(target / 70, 0.85, 1.35);

  if (aspect <= 0 || !Number.isFinite(aspect)) {
    return THREE.MathUtils.clamp(72 * userScale, 65, 85);
  }

  if (aspect >= 1.0) {
    // Landscape orientation:
    // On wide phone screens (Samsung Galaxy 20:9 ~ 2.22, iPhone 19.5:9 ~ 2.16),
    // provide a generous vertical FOV so first and third person never look overly zoomed in.
    const wideBoost = aspect >= 1.9 ? 3.0 : aspect >= 1.6 ? 2.0 : 0.5;
    const landscapeFov = (72 + wideBoost) * userScale;
    return THREE.MathUtils.clamp(landscapeFov, 68, 86);
  }

  // Portrait mode (phones held vertically, aspect < 1.0):
  // Expand vertical FOV to maintain horizontal vision.
  const portraitExpansion = (1.0 - Math.max(0.4, aspect)) * 9;
  const portraitFov = (72 + portraitExpansion) * userScale;
  return THREE.MathUtils.clamp(portraitFov, 72, 88);
}

/**
 * Smoothed third-person camera: the pivot eases toward the player (hides
 * step-up pops), collision pulls the camera in instantly and eases back out smoothly.
 * Distance is pulled back comfortably (4.1m - 4.4m) so the character does not dominate
 * the viewport on mobile or in landscape.
 */
export class ThirdPersonRig {
  distance = 4.1;
  minDistance = 1.2;
  private pivot = new THREE.Vector3();
  private initialized = false;
  private currentDistance = 4.1;
  private _back = new THREE.Vector3();
  private _wall = new THREE.Vector3();

  snap(target: THREE.Vector3) {
    this.pivot.copy(target);
    this.initialized = true;
  }

  update(
    dt: number,
    camera: THREE.PerspectiveCamera,
    target: THREE.Vector3,
    world: World,
  ) {
    if (!this.initialized) this.snap(target);
    const follow = 1 - Math.exp(-24 * dt);
    this.pivot.x += (target.x - this.pivot.x) * follow;
    this.pivot.z += (target.z - this.pivot.z) * follow;
    // Vertical follows smoothly so step-ups and landings feel grounded.
    this.pivot.y += (target.y - this.pivot.y) * (1 - Math.exp(-18 * dt));
    // Never let the pivot trail far behind (teleports, respawns).
    if (this.pivot.distanceToSquared(target) > 16) this.pivot.copy(target);

    // On landscape screens (especially mobile landscape), pull back slightly more
    // so the character doesn't fill the vertical space
    const isLandscape = camera.aspect >= 1.2;
    const targetDist = isLandscape ? Math.max(this.distance, 4.35) : this.distance;

    const back = this._back.set(0, 0, 1).applyQuaternion(camera.quaternion);
    let wanted = targetDist;
    const hit = raycastVoxel(world, this.pivot, back, targetDist + 0.35);
    if (hit) {
      this._wall.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
      wanted = Math.max(this.minDistance, this._wall.distanceTo(this.pivot) - 0.7);
    }
    if (wanted < this.currentDistance) {
      this.currentDistance = wanted;
    } else {
      this.currentDistance += (wanted - this.currentDistance) * (1 - Math.exp(-14 * dt));
    }

    camera.position.copy(this.pivot).addScaledVector(back, this.currentDistance);
  }
}

/**
 * Character heading derived from actual horizontal velocity, so the model
 * always faces where it is moving (not where the camera looks).
 */
export class MovementFacing {
  heading = 0;

  update(vx: number, vz: number, fallbackYaw: number, initialized = true) {
    if (Math.hypot(vx, vz) > 0.35) {
      this.heading = Math.atan2(vx, vz);
    } else if (!initialized) {
      this.heading = fallbackYaw;
    }
    return this.heading;
  }
}
