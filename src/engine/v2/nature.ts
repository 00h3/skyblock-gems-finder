import * as THREE from "three";
import { BLOCKS, type World } from "@/engine/world";
import type { BlockFx } from "@/engine/interact";

/**
 * Living nature: grass and leaves drop seeds, seeds grow into saplings and
 * then real voxel trees, and chopping two logs of a tree fells it with a
 * rigid-body style topple (gravity-driven angular acceleration, ground
 * bounce, then it shatters into debris).
 */

export type Species = "oak" | "birch" | "spruce";

export const SPECIES: Record<Species, { label: string; log: number; leaves: number; growSec: number; tint: string }> = {
  oak: { label: "Oak", log: 7, leaves: 9, growSec: 35, tint: "#4f9a37" },
  birch: { label: "Birch", log: 8, leaves: 9, growSec: 45, tint: "#8cc04a" },
  spruce: { label: "Spruce", log: 7, leaves: 9, growSec: 55, tint: "#2f6b3a" },
};

const LOGS = new Set([7, 8]);
const LEAVES = 9;
const SOIL = new Set([1, 2]);
const GRASS = 1;

type Sapling = { x: number; y: number; z: number; species: Species; t: number; mesh: THREE.Group };
type Falling = {
  group: THREE.Group;
  axis: THREE.Vector3;
  angle: number;
  omega: number;
  length: number;
  landed: number;
  bounced: boolean;
  blocks: { x: number; y: number; z: number; id: number }[];
};

export type SeedCounts = Record<Species, number>;

export class Nature {
  readonly group = new THREE.Group();
  readonly seeds: SeedCounts = { oak: 0, birch: 0, spruce: 0 };
  onSeedsChange?: (seeds: SeedCounts) => void;
  onNotice?: (title: string, detail?: string) => void;
  onSound?: (kind: "pop" | "break" | "place") => void;

  private saplings: Sapling[] = [];
  private falling: Falling[] = [];
  private chopCounters = new Map<string, { n: number }>();
  private readonly saplingTextures = new Map<Species, THREE.CanvasTexture>();
  private readonly cube = new THREE.BoxGeometry(1, 1, 1);
  private readonly quad = new THREE.PlaneGeometry(0.9, 0.9);
  private readonly tmpQuat = new THREE.Quaternion();

  constructor(
    private readonly world: World,
    private readonly fx: BlockFx,
    private readonly writeBlock: (x: number, y: number, z: number, id: number) => void,
  ) {}

  private emitSeeds() {
    this.onSeedsChange?.({ ...this.seeds });
  }

  /** Grass and leaves sometimes drop a seed of a random species. */
  rollDrop(blockId: number) {
    const chance = blockId === GRASS ? 0.4 : blockId === LEAVES ? 0.25 : 0;
    if (Math.random() >= chance) return null;
    const r = Math.random();
    const species: Species = r < 0.5 ? "oak" : r < 0.8 ? "birch" : "spruce";
    this.seeds[species]++;
    this.emitSeeds();
    this.onNotice?.(`+1 ${SPECIES[species].label} Seed`, "Plant it on grass or dirt");
    this.onSound?.("pop");
    return species;
  }

  canPlant(x: number, y: number, z: number) {
    return SOIL.has(this.world.get(x, y - 1, z)) && this.world.get(x, y, z) === 0 && !this.saplings.some((s) => s.x === x && s.y === y && s.z === z);
  }

  plant(x: number, y: number, z: number, species: Species) {
    if (this.seeds[species] <= 0 || !this.canPlant(x, y, z)) return false;
    this.seeds[species]--;
    this.emitSeeds();
    const mesh = this.buildSaplingMesh(species);
    mesh.position.set(x + 0.5, y, z + 0.5);
    mesh.scale.setScalar(0.35);
    this.group.add(mesh);
    this.saplings.push({ x, y, z, species, t: 0, mesh });
    this.onSound?.("place");
    this.onNotice?.(`${SPECIES[species].label} sapling planted`, `Grows into a tree in ~${SPECIES[species].growSec}s`);
    return true;
  }

  private saplingTexture(species: Species) {
    let tex = this.saplingTextures.get(species);
    if (tex) return tex;
    const c = document.createElement("canvas");
    c.width = c.height = 32;
    const g = c.getContext("2d")!;
    g.imageSmoothingEnabled = false;
    g.fillStyle = species === "birch" ? "#e9e4d4" : "#6b4a2b";
    g.fillRect(15, 14, 2, 18);
    g.fillStyle = SPECIES[species].tint;
    const leaf = species === "spruce"
      ? [[12, 4, 8, 4], [10, 8, 12, 4], [8, 12, 16, 4]]
      : [[10, 4, 12, 6], [6, 8, 8, 6], [18, 8, 8, 6], [11, 11, 10, 5]];
    for (const [x, y, w, h] of leaf) g.fillRect(x, y, w, h);
    g.fillStyle = "rgba(255,255,255,0.18)";
    g.fillRect(12, 5, 3, 2);
    tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    this.saplingTextures.set(species, tex);
    return tex;
  }

  private buildSaplingMesh(species: Species) {
    const mat = new THREE.MeshLambertMaterial({ map: this.saplingTexture(species), alphaTest: 0.4, side: THREE.DoubleSide });
    const group = new THREE.Group();
    for (let i = 0; i < 2; i++) {
      const q = new THREE.Mesh(this.quad, mat);
      q.position.y = 0.45;
      q.rotation.y = Math.PI / 4 + (i * Math.PI) / 2;
      group.add(q);
    }
    return group;
  }

  private growTree(s: Sapling) {
    const def = SPECIES[s.species];
    const h = s.species === "spruce" ? 6 : 4 + Math.floor(Math.random() * 2);
    const placed: [number, number, number, number][] = [];
    const put = (x: number, y: number, z: number, id: number) => {
      if (this.world.get(x, y, z) !== 0) return;
      this.world.set(x, y, z, id);
      placed.push([x, y, z, id]);
    };
    for (let i = 0; i < h; i++) put(s.x, s.y + i, s.z, def.log);
    const top = s.y + h;
    if (s.species === "spruce") {
      for (let layer = 0; layer < 4; layer++) {
        const r = layer === 0 ? 0 : layer === 1 ? 1 : 2 - (layer % 2);
        const y = top - layer;
        for (let dx = -r; dx <= r; dx++)
          for (let dz = -r; dz <= r; dz++) if (Math.abs(dx) + Math.abs(dz) <= r + 1 && !(dx === 0 && dz === 0 && layer > 0)) put(s.x + dx, y, s.z + dz, def.leaves);
      }
      put(s.x, top + 1, s.z, def.leaves);
    } else {
      for (let y = top - 2; y <= top + 1; y++) {
        const r = y >= top ? 1 : 2;
        for (let dx = -r; dx <= r; dx++)
          for (let dz = -r; dz <= r; dz++) {
            if (Math.abs(dx) === r && Math.abs(dz) === r && (y >= top || Math.random() < 0.5)) continue;
            put(s.x + dx, y, s.z + dz, def.leaves);
          }
      }
    }
    placed.forEach(([x, y, z, id]) => this.writeBlock(x, y, z, id));
    this.fx.spawn("place", new THREE.Vector3(s.x, s.y, s.z), BLOCKS.find((b) => b.id === def.log)!.side, 0);
    this.onSound?.("place");
    this.onNotice?.(`Your ${def.label} tree has grown!`, "Chop 2 logs to fell it");
  }

  /** Flood-fill the logs + leaves still connected to a chopped block. */
  private collectTree(x: number, y: number, z: number) {
    const seen = new Set<string>();
    const out: { x: number; y: number; z: number; id: number }[] = [];
    const queue: [number, number, number][] = [];
    const dirs = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    for (const [dx, dy, dz] of dirs) queue.push([x + dx, y + dy, z + dz]);
    while (queue.length && out.length < 180) {
      const [cx, cy, cz] = queue.shift()!;
      const key = `${cx},${cy},${cz}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (Math.abs(cx - x) > 4 || Math.abs(cz - z) > 4 || cy < y || cy > y + 12) continue;
      const id = this.world.get(cx, cy, cz);
      if (!LOGS.has(id) && id !== LEAVES) continue;
      out.push({ x: cx, y: cy, z: cz, id });
      for (const [dx, dy, dz] of dirs) queue.push([cx + dx, cy + dy, cz + dz]);
    }
    return out;
  }

  /**
   * Call after a log was mined. Returns true when the tree came down.
   * `from` is the player's position so the tree falls away from them.
   */
  onLogMined(x: number, y: number, z: number, id: number, from: THREE.Vector3) {
    if (!LOGS.has(id)) return false;
    const tree = this.collectTree(x, y, z);
    const logs = tree.filter((b) => LOGS.has(b.id));
    // Leaves are what distinguish a tree from a log-built house.
    if (logs.length === 0 || tree.length - logs.length < 3) return false;
    let counter: { n: number } | undefined;
    for (const l of logs) {
      counter = this.chopCounters.get(`${l.x},${l.y},${l.z}`);
      if (counter) break;
    }
    if (!counter) {
      counter = { n: 1 };
      for (const l of logs) this.chopCounters.set(`${l.x},${l.y},${l.z}`, counter);
      this.onNotice?.("Timber!", "Chop one more log to fell the tree");
      return false;
    }
    counter.n++;
    if (counter.n < 2) return false;
    for (const l of logs) this.chopCounters.delete(`${l.x},${l.y},${l.z}`);
    this.fell(tree, x, y, z, from);
    return true;
  }

  private fell(tree: { x: number; y: number; z: number; id: number }[], x: number, y: number, z: number, from: THREE.Vector3) {
    const pivot = new THREE.Vector3(x + 0.5, y, z + 0.5);
    const dir = new THREE.Vector3(pivot.x - from.x, 0, pivot.z - from.z);
    if (dir.lengthSq() < 1e-4) dir.set(1, 0, 0);
    dir.normalize();
    const axis = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), dir).normalize();

    const group = new THREE.Group();
    group.position.copy(pivot);
    let maxY = y;
    for (const b of tree) {
      const tile = BLOCKS.find((d) => d.id === b.id)?.side ?? "oak_log";
      const mesh = new THREE.Mesh(this.cube, this.fx.materialFor(tile));
      mesh.position.set(b.x + 0.5 - pivot.x, b.y + 0.5 - pivot.y, b.z + 0.5 - pivot.z);
      mesh.castShadow = true;
      group.add(mesh);
      this.world.set(b.x, b.y, b.z, 0);
      this.writeBlock(b.x, b.y, b.z, 0);
      maxY = Math.max(maxY, b.y + 1);
    }
    this.group.add(group);
    this.falling.push({ group, axis, angle: 0.03, omega: 0.25, length: Math.max(2, maxY - y), landed: 0, bounced: false, blocks: tree });
    this.onSound?.("break");
    this.onNotice?.("TIMBER!", "The tree is coming down");
  }

  update(dt: number, elapsed: number) {
    for (let i = this.saplings.length - 1; i >= 0; i--) {
      const s = this.saplings[i];
      s.t += dt;
      const p = Math.min(1, s.t / SPECIES[s.species].growSec);
      s.mesh.scale.setScalar(0.35 + p * 0.75);
      s.mesh.rotation.z = Math.sin(elapsed * 1.6 + s.x) * 0.05;
      if (this.world.get(s.x, s.y - 1, s.z) === 0) {
        this.removeSapling(i);
        continue;
      }
      if (p >= 1) {
        this.removeSapling(i);
        this.growTree(s);
      }
    }

    for (let i = this.falling.length - 1; i >= 0; i--) {
      const f = this.falling[i];
      if (f.landed === 0) {
        // Rigid rod pivoting at its base: alpha = (3g / 2L) * sin(theta).
        const alpha = ((3 * 22) / (2 * f.length)) * Math.sin(f.angle);
        f.omega += alpha * dt;
        f.angle += f.omega * dt;
        if (f.angle >= Math.PI / 2 - 0.04) {
          f.angle = Math.PI / 2 - 0.04;
          if (!f.bounced) {
            f.bounced = true;
            f.omega = -f.omega * 0.22;
            this.onSound?.("break");
          } else {
            f.landed = 0.0001;
          }
        }
      } else {
        f.landed += dt;
        if (f.landed > 0.55) {
          const k = Math.max(0, 1 - (f.landed - 0.55) / 0.35);
          f.group.children.forEach((c) => c.scale.setScalar(k));
        }
        if (f.landed > 0.9) {
          this.shatter(f);
          this.falling.splice(i, 1);
          continue;
        }
      }
      f.group.quaternion.copy(this.tmpQuat.setFromAxisAngle(f.axis, f.angle));
    }
  }

  private shatter(f: Falling) {
    const world = new THREE.Vector3();
    for (let n = 0; n < f.group.children.length; n += 3) {
      const child = f.group.children[n];
      child.getWorldPosition(world);
      const b = f.blocks[n];
      const side = BLOCKS.find((d) => d.id === b.id)?.side ?? "oak_log";
      this.fx.spawn("break", world.clone().subScalar(0.5), side, 4);
    }
    let seedRolls = 0;
    for (const b of f.blocks) if (b.id === LEAVES && seedRolls < 3 && this.rollDrop(LEAVES)) seedRolls++;
    this.group.remove(f.group);
    this.onSound?.("pop");
  }

  private removeSapling(i: number) {
    const s = this.saplings[i];
    this.group.remove(s.mesh);
    s.mesh.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) (m.material as THREE.Material).dispose();
    });
    this.saplings.splice(i, 1);
  }

  dispose() {
    for (let i = this.saplings.length - 1; i >= 0; i--) this.removeSapling(i);
    this.falling.forEach((f) => this.group.remove(f.group));
    this.falling = [];
    this.saplingTextures.forEach((t) => t.dispose());
    this.cube.dispose();
    this.quad.dispose();
    this.group.clear();
  }
}
