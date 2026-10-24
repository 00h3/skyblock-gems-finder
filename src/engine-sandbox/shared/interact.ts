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
    // Liquids are see-through for targeting (water 50, lava 62): you aim at the block behind.
    if (id !== 0 && id !== 50 && id !== 62) return { x, y, z, nx, ny, nz, id };
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

/** Short-lived block animations (pop-in on place, shrink+crack on break) with zero-allocation object pooling. */
export class BlockFx {
  readonly group = new THREE.Group();
  private items: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; t: number; life: number; kind: "place" | "break"; active: boolean }[] = [];
  private particles: { mesh: THREE.Mesh; vx: number; vy: number; vz: number; t: number; life: number; active: boolean }[] = [];

  private static readonly cube = new THREE.BoxGeometry(1, 1, 1);
  private static readonly chip = new THREE.BoxGeometry(0.14, 0.14, 0.14);
  private readonly tileMats = new Map<string, THREE.MeshBasicMaterial>();

  // Object pools
  private readonly itemPool: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial }[] = [];
  private readonly particlePool: THREE.Mesh[] = [];

  constructor(private atlas: Atlas) {
    // Pre-populate pool
    for (let i = 0; i < 16; i++) {
      const mat = new THREE.MeshBasicMaterial({ transparent: true });
      const mesh = new THREE.Mesh(BlockFx.cube, mat);
      mesh.visible = false;
      this.group.add(mesh);
      this.itemPool.push({ mesh, mat });
    }
    for (let i = 0; i < 64; i++) {
      const mesh = new THREE.Mesh(BlockFx.chip, new THREE.MeshBasicMaterial());
      mesh.visible = false;
      this.group.add(mesh);
      this.particlePool.push(mesh);
    }
  }

  materialFor(tile: string) {
    let mat = this.tileMats.get(tile);
    if (!mat) {
      const [u0, v0, u1, v1] = this.atlas.uv(tile);
      const tex = this.atlas.texture.clone();
      tex.needsUpdate = true;
      tex.repeat.set(u1 - u0, v1 - v0);
      tex.offset.set(u0, v0);
      mat = new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.2 });
      this.tileMats.set(tile, mat);
    }
    return mat;
  }

  spawn(kind: "place" | "break", pos: THREE.Vector3, tile: string, chips = 10) {
    const shared = this.materialFor(tile);

    // Reuse from pool or allocate if pool exhausted
    let item = this.itemPool.pop();
    if (!item) {
      const mat = new THREE.MeshBasicMaterial({ transparent: true });
      const mesh = new THREE.Mesh(BlockFx.cube, mat);
      this.group.add(mesh);
      item = { mesh, mat };
    }
    item.mat.map = shared.map;
    item.mat.opacity = 1.0;
    item.mat.needsUpdate = true;
    item.mesh.position.set(pos.x + 0.5, pos.y + 0.5, pos.z + 0.5);
    item.mesh.rotation.set(0, 0, 0);
    item.mesh.scale.set(1, 1, 1);
    item.mesh.visible = true;
    this.items.push({
      mesh: item.mesh,
      mat: item.mat,
      t: 0,
      life: kind === "place" ? 0.22 : 0.26,
      kind,
      active: true,
    });

    if (kind === "break") {
      const count = Math.min(chips, 12);
      for (let i = 0; i < count; i++) {
        let pMesh = this.particlePool.pop();
        if (!pMesh) {
          pMesh = new THREE.Mesh(BlockFx.chip, shared);
          this.group.add(pMesh);
        } else {
          pMesh.material = shared;
        }
        pMesh.position.set(pos.x + 0.5, pos.y + 0.5, pos.z + 0.5);
        pMesh.rotation.set(Math.random() * 3, Math.random() * 3, 0);
        pMesh.scale.set(1, 1, 1);
        pMesh.visible = true;

        this.particles.push({
          mesh: pMesh,
          vx: (Math.random() - 0.5) * 4,
          vy: Math.random() * 3.5 + 1.2,
          vz: (Math.random() - 0.5) * 4,
          t: 0,
          life: 0.55,
          active: true,
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
        it.mat.opacity = 1 - p;
      } else {
        it.mesh.scale.setScalar(1 - p);
        it.mesh.rotation.y = p * 1.2;
        it.mat.opacity = 1 - p;
      }
      if (p >= 1) {
        it.mesh.visible = false;
        this.itemPool.push({ mesh: it.mesh, mat: it.mat });
        this.items.splice(i, 1);
      }
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.t += dt;
      p.vy -= 18 * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      p.mesh.rotation.x += dt * 6;
      p.mesh.scale.setScalar(Math.max(0.01, 1 - p.t / p.life));
      if (p.t >= p.life) {
        p.mesh.visible = false;
        this.particlePool.push(p.mesh);
        this.particles.splice(i, 1);
      }
    }
  }

  dispose() {
    this.itemPool.forEach((it) => {
      it.mat.dispose();
      it.mesh.geometry.dispose();
    });
    this.particlePool.forEach((m) => {
      m.geometry.dispose();
    });
    this.tileMats.forEach((m) => {
      m.map?.dispose();
      m.dispose();
    });
    this.itemPool.length = 0;
    this.particlePool.length = 0;
    this.items.length = 0;
    this.particles.length = 0;
    this.tileMats.clear();
    this.group.clear();
  }
}
