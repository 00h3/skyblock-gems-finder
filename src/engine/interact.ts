import * as THREE from "three";
import { World } from "./world";
import type { Atlas } from "./textures";

export type Hit = {
  x: number;
  y: number;
  z: number;
  nx: number;
  ny: number;
  nz: number;
  id: number;
};

/** DDA voxel raycast from an origin along a direction. */
export function raycastVoxel(
  world: World,
  origin: THREE.Vector3,
  dir: THREE.Vector3,
  maxDist = 6,
): Hit | null {
  let x = Math.floor(origin.x);
  let y = Math.floor(origin.y);
  let z = Math.floor(origin.z);
  const stepX = Math.sign(dir.x) || 1;
  const stepY = Math.sign(dir.y) || 1;
  const stepZ = Math.sign(dir.z) || 1;
  const tDeltaX = Math.abs(1 / (dir.x || 1e-8));
  const tDeltaY = Math.abs(1 / (dir.y || 1e-8));
  const tDeltaZ = Math.abs(1 / (dir.z || 1e-8));
  const boundary = (o: number, i: number, step: number) => (step > 0 ? i + 1 - o : o - i);
  let tMaxX = boundary(origin.x, x, stepX) * tDeltaX;
  let tMaxY = boundary(origin.y, y, stepY) * tDeltaY;
  let tMaxZ = boundary(origin.z, z, stepZ) * tDeltaZ;
  let nx = 0;
  let ny = 0;
  let nz = 0;
  let t = 0;

  for (let i = 0; i < 256 && t <= maxDist; i++) {
    const id = world.get(x, y, z);
    if (id !== 0) return { x, y, z, nx, ny, nz, id };
    if (tMaxX < tMaxY && tMaxX < tMaxZ) {
      x += stepX;
      t = tMaxX;
      tMaxX += tDeltaX;
      nx = -stepX;
      ny = 0;
      nz = 0;
    } else if (tMaxY < tMaxZ) {
      y += stepY;
      t = tMaxY;
      tMaxY += tDeltaY;
      nx = 0;
      ny = -stepY;
      nz = 0;
    } else {
      z += stepZ;
      t = tMaxZ;
      tMaxZ += tDeltaZ;
      nx = 0;
      ny = 0;
      nz = -stepZ;
    }
  }
  return null;
}

/** Clean Minecraft-accurate black wireframe outline around targeted block. */
export function createHighlight() {
  const geo = new THREE.BoxGeometry(1.002, 1.002, 1.002);
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geo),
    new THREE.LineBasicMaterial({
      color: 0x111111,
      transparent: true,
      opacity: 0.48,
    }),
  );
  edges.visible = false;
  edges.renderOrder = 2;
  return edges;
}

/** Short-lived block animations (pop-in on place, shrink+crack on break). */
export class BlockFx {
  readonly group = new THREE.Group();
  private items: { mesh: THREE.Mesh; t: number; life: number; kind: "place" | "break" }[] = [];
  private particles: { mesh: THREE.Mesh; v: THREE.Vector3; t: number; life: number }[] = [];

  constructor(private atlas: Atlas) {}

  private materialFor(tile: string) {
    const [u0, v0, u1, v1] = this.atlas.uv(tile);
    const tex = this.atlas.texture.clone();
    tex.needsUpdate = true;
    tex.repeat.set(u1 - u0, v1 - v0);
    tex.offset.set(u0, v0);
    return new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  }

  spawn(kind: "place" | "break", pos: THREE.Vector3, tile: string) {
    const mat = this.materialFor(tile);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat);
    mesh.position.copy(pos).addScalar(0.5);
    this.group.add(mesh);
    this.items.push({ mesh, t: 0, life: kind === "place" ? 0.22 : 0.26, kind });

    if (kind === "break") {
      for (let i = 0; i < 10; i++) {
        const p = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.14), mat);
        p.position.copy(pos).addScalar(0.5);
        this.group.add(p);
        this.particles.push({
          mesh: p,
          v: new THREE.Vector3(
            (Math.random() - 0.5) * 4,
            Math.random() * 4 + 1,
            (Math.random() - 0.5) * 4,
          ),
          t: 0,
          life: 0.6,
        });
      }
    }
  }

  update(dt: number) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.t += dt;
      const p = Math.min(1, it.t / it.life);
      if (it.kind === "place") {
        const s = 1 + Math.sin(p * Math.PI) * 0.22;
        it.mesh.scale.setScalar(s * (0.4 + 0.6 * p));
        (it.mesh.material as THREE.Material).opacity = 1 - p;
      } else {
        it.mesh.scale.setScalar(1 - p);
        it.mesh.rotation.y = p * 1.2;
        (it.mesh.material as THREE.Material).opacity = 1 - p;
      }
      if (p >= 1) {
        this.group.remove(it.mesh);
        it.mesh.geometry.dispose();
        this.items.splice(i, 1);
      }
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.t += dt;
      p.v.y -= 18 * dt;
      p.mesh.position.addScaledVector(p.v, dt);
      p.mesh.rotation.x += dt * 6;
      p.mesh.scale.setScalar(Math.max(0.01, 1 - p.t / p.life));
      if (p.t >= p.life) {
        this.group.remove(p.mesh);
        p.mesh.geometry.dispose();
        this.particles.splice(i, 1);
      }
    }
  }

  dispose() {
    this.group.clear();
    this.items = [];
    this.particles = [];
  }
}
