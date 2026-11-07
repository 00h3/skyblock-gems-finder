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
  distance?: number;
};

/** DDA voxel raycast from an origin along a direction with boundary safety. */
export function raycastVoxel(
  world: World,
  origin: THREE.Vector3,
  dir: THREE.Vector3,
  maxDist = 6,
): Hit | null {
  let x = Math.floor(origin.x);
  let y = Math.floor(origin.y);
  let z = Math.floor(origin.z);

  // If ray origin is already inside a solid block
  const startId = world.get(x, y, z);
  if (startId !== 0 && startId !== 50 && startId !== 62) {
    return {
      x,
      y,
      z,
      nx: -Math.sign(dir.x) || 0,
      ny: -Math.sign(dir.y) || 0,
      nz: -Math.sign(dir.z) || 0,
      id: startId,
      distance: 0,
    };
  }

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
    // Liquids are see-through for targeting (water 50, lava 62)
    if (id !== 0 && id !== 50 && id !== 62) {
      return { x, y, z, nx, ny, nz, id, distance: t };
    }
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

/** Clean, high-visibility block highlight with crisp wireframe outline and translucent targeting. */
export function createHighlight() {
  const group = new THREE.Group();

  const boxGeo = new THREE.BoxGeometry(1.006, 1.006, 1.006);
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(boxGeo),
    new THREE.LineBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.72,
      depthTest: true,
      depthWrite: false,
    }),
  );
  edges.renderOrder = 4;
  group.add(edges);

  // Subtle translucent face box to accentuate the selected voxel
  const fillMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.08,
    depthWrite: false,
    depthTest: true,
  });
  const fillMesh = new THREE.Mesh(boxGeo, fillMat);
  fillMesh.renderOrder = 3;
  group.add(fillMesh);

  // Active face highlight plane (shows targeted face clearly)
  const faceGeo = new THREE.PlaneGeometry(1.008, 1.008);
  const faceMat = new THREE.MeshBasicMaterial({
    color: 0xf97316,
    transparent: true,
    opacity: 0.16,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const faceMesh = new THREE.Mesh(faceGeo, faceMat);
  faceMesh.name = "highlight-face";
  faceMesh.visible = false;
  faceMesh.renderOrder = 5;
  group.add(faceMesh);

  group.visible = false;
  return group;
}

/** Updates the face highlight plane on the selection box based on hit normal. */
export function updateHighlightFace(
  highlight: THREE.Object3D,
  hit: Hit | null,
) {
  const face = highlight.getObjectByName("highlight-face") as THREE.Mesh | null;
  if (!face) return;
  if (!hit || (hit.nx === 0 && hit.ny === 0 && hit.nz === 0)) {
    face.visible = false;
    return;
  }
  face.visible = true;
  face.position.set(hit.nx * 0.505, hit.ny * 0.505, hit.nz * 0.505);
  if (hit.ny !== 0) {
    face.rotation.set(Math.PI / 2, 0, 0);
  } else if (hit.nx !== 0) {
    face.rotation.set(0, Math.PI / 2, 0);
  } else {
    face.rotation.set(0, 0, 0);
  }
}

/** Short-lived block animations with zero-allocation object pooling & progressive chipping. */
export class BlockFx {
  readonly group = new THREE.Group();
  private items: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; t: number; life: number; kind: "place" | "break"; active: boolean }[] = [];
  private particles: { mesh: THREE.Mesh; vx: number; vy: number; vz: number; t: number; life: number; active: boolean }[] = [];

  private static readonly cube = new THREE.BoxGeometry(1, 1, 1);
  private static readonly chip = new THREE.BoxGeometry(0.12, 0.12, 0.12);
  private static readonly smallChip = new THREE.BoxGeometry(0.08, 0.08, 0.08);
  private readonly tileMats = new Map<string, THREE.MeshBasicMaterial>();

  // Object pools
  private readonly itemPool: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial }[] = [];
  private readonly particlePool: THREE.Mesh[] = [];

  constructor(private atlas: Atlas) {
    // Pre-populate pool
    for (let i = 0; i < 20; i++) {
      const mat = new THREE.MeshBasicMaterial({ transparent: true });
      const mesh = new THREE.Mesh(BlockFx.cube, mat);
      mesh.visible = false;
      this.group.add(mesh);
      this.itemPool.push({ mesh, mat });
    }
    for (let i = 0; i < 128; i++) {
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

  /** Emits small chipping particles while a block is actively being mined. */
  spawnChips(pos: THREE.Vector3, normal: THREE.Vector3, tile: string, count = 4) {
    const shared = this.materialFor(tile);
    const chipCount = Math.min(count, 8);

    for (let i = 0; i < chipCount; i++) {
      let pMesh = this.particlePool.pop();
      if (!pMesh) {
        pMesh = new THREE.Mesh(BlockFx.smallChip, shared);
        this.group.add(pMesh);
      } else {
        pMesh.geometry = BlockFx.smallChip;
        pMesh.material = shared;
      }

      // Position along the hit face with slight random jitter
      pMesh.position.set(
        pos.x + 0.5 + normal.x * 0.52 + (Math.random() - 0.5) * 0.6,
        pos.y + 0.5 + normal.y * 0.52 + (Math.random() - 0.5) * 0.6,
        pos.z + 0.5 + normal.z * 0.52 + (Math.random() - 0.5) * 0.6,
      );
      pMesh.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      pMesh.scale.setScalar(0.7 + Math.random() * 0.5);
      pMesh.visible = true;

      // Burst outward away from the face normal + slight upward arc
      this.particles.push({
        mesh: pMesh,
        vx: normal.x * 1.8 + (Math.random() - 0.5) * 1.8,
        vy: Math.max(0.6, normal.y * 1.5 + Math.random() * 2.0),
        vz: normal.z * 1.8 + (Math.random() - 0.5) * 1.8,
        t: 0,
        life: 0.38 + Math.random() * 0.2,
        active: true,
      });
    }
  }

  spawn(kind: "place" | "break", pos: THREE.Vector3, tile: string, chips = 18) {
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
      const count = Math.min(chips, 24);
      for (let i = 0; i < count; i++) {
        let pMesh = this.particlePool.pop();
        if (!pMesh) {
          pMesh = new THREE.Mesh(BlockFx.chip, shared);
          this.group.add(pMesh);
        } else {
          pMesh.geometry = BlockFx.chip;
          pMesh.material = shared;
        }
        pMesh.position.set(
          pos.x + 0.5 + (Math.random() - 0.5) * 0.5,
          pos.y + 0.5 + (Math.random() - 0.5) * 0.5,
          pos.z + 0.5 + (Math.random() - 0.5) * 0.5,
        );
        pMesh.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
        pMesh.scale.setScalar(0.85 + Math.random() * 0.45);
        pMesh.visible = true;

        this.particles.push({
          mesh: pMesh,
          vx: (Math.random() - 0.5) * 5.2,
          vy: Math.random() * 4.2 + 1.5,
          vz: (Math.random() - 0.5) * 5.2,
          t: 0,
          life: 0.65,
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
