import * as THREE from "three";
import type { World } from "../world";
import { raycastVoxel } from "../interact";

/**
 * Vertical FOV that keeps a consistent ~100° horizontal view. A fixed wide
 * vertical FOV in landscape stretches the view past 130° horizontally, which
 * shrinks distant geometry to a few pixels and makes it shimmer.
 */
export function fovForAspect(aspect: number, horizontalDeg = 100): number {
  const h = THREE.MathUtils.degToRad(horizontalDeg);
  const v = 2 * Math.atan(Math.tan(h / 2) / Math.max(0.2, aspect));
  return THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(v), 58, 80);
}

/**
 * Smoothed third-person camera: the pivot eases toward the player (hides
 * step-up pops), collision pulls the camera in instantly and eases back out.
 */
export class ThirdPersonRig {
  distance = 3.3;
  minDistance = 1.1;
  private pivot = new THREE.Vector3();
  private initialized = false;
  private currentDistance = 3.3;
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
    const follow = 1 - Math.exp(-22 * dt);
    this.pivot.x += (target.x - this.pivot.x) * follow;
    this.pivot.z += (target.z - this.pivot.z) * follow;
    // Vertical follows slightly softer so step-ups and landings feel grounded.
    this.pivot.y += (target.y - this.pivot.y) * (1 - Math.exp(-14 * dt));
    // Never let the pivot trail far behind (teleports, respawns).
    if (this.pivot.distanceToSquared(target) > 16) this.pivot.copy(target);

    const back = this._back.set(0, 0, 1).applyQuaternion(camera.quaternion);
    let wanted = this.distance;
    const hit = raycastVoxel(world, this.pivot, back, this.distance + 0.4);
    if (hit) {
      this._wall.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
      wanted = Math.max(this.minDistance, this._wall.distanceTo(this.pivot) - 0.75);
    }
    if (wanted < this.currentDistance) this.currentDistance = wanted;
    else this.currentDistance += (wanted - this.currentDistance) * (1 - Math.exp(-5 * dt));

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
