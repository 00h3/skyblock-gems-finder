import * as THREE from "three";
import type { Atlas } from "./textures";

/**
 * High-performance chunked and sub-chunked voxel world engine for QBLOCK V2.
 * Bloxd.io & Vectaria.io inspired architecture:
 * - 16x16x16 sub-chunk vertical partitioning (cuts empty air draw calls & meshing work by ~70%)
 * - Aggressive hidden-face culling (never creates interior geometry between solid blocks)
 * - Greedy meshing for coplanar adjacent faces with seamless atlas repeating shader
 * - Zero-allocation meshing using shared pre-allocated Float32/Uint32 typed buffer pools
 * - Pre-computed static ambient occlusion offset tables (eliminates GC spikes)
 * - Fast numeric spatial chunk key mapping with single-element pointer cache
 * - Player-centric prioritized sub-chunk meshing queue with frame budgeting
 * - Sub-chunk frustum culling and distance-based LOD & shadow update optimizations
 */

export const CHUNK = 16;
export const WORLD_H = 48;
export const SUB_H = 16;
export const SUB_CHUNKS = 3; // 48 / 16 = 3 sub-chunks per vertical column

export type BlockDef = {
  id: number;
  name: string;
  top: string;
  side: string;
  bottom: string;
  transparent?: boolean;
  liquid?: boolean;
  shape?: "stairs" | "slab" | "vslab" | "quarter";
  /** Walk-through: no collision (ladders, open doors, lava). */
  passable?: boolean;
  /** Player can climb while overlapping this block. */
  climb?: boolean;
  /** Seconds to break by hand (Minecraft-like). 0 = instant, -1 = unbreakable. */
  hardness?: number;
  /** Light emitted (0..1) — used for a subtle emissive glow. */
  glow?: number;
};

export const WATER_ID = 50;
export const LAVA_ID = 62;
export const BLOCK_ID = {
  ironOre: 47,
  diamondOre: 48,
  woodDoor: 51,
  woodDoorOpen: 52,
  ironDoor: 53,
  ironDoorOpen: 54,
  chest: 55,
  trappedChest: 56,
  tnt: 57,
  blastGlass: 58,
  ladder: 59,
  bed: 60,
  anchor: 61,
  lava: 62,
  slime: 63,
  oakSlab: 64,
  stoneSlab: 65,
  oakVSlab: 66,
  brickQuarter: 67,
  brickVSlab: 68,
  doorButton: 69,
} as const;

/** Shared wind clock for foliage shaders; advance `uTime` once per frame. */
export const WIND = {
  uTime: { value: 0 },
  uStrength: { value: 1 },
};

/** Snow cover on upward faces (0..1); eased by the snowfall system. */
export const SNOW = {
  uSnow: { value: 0 },
};

/** Liquid level byte: 0 = source, 1..7 = flow distance, FALLING = vertical column. */
export const LIQUID_FALLING = 8;
const WATER_TICK_MS = 200;
const LAVA_TICK_MS = 650;
const LIQUID_TICK_BUDGET = 160;
const COBBLESTONE_ID = 4;
const STONE_ID = 3;
const OBSIDIAN_ID = 11;

export type LiquidReaction = "cobblestone" | "obsidian" | "stone";

const liquidKey = (x: number, y: number, z: number) =>
  ((x + 32768) * 65536 + (z + 32768)) * 64 + y;

const NEIGHBOR_DIRS: readonly (readonly [number, number, number])[] = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];
/** Horizontal flow directions (dx, dz) and the index of each one's opposite. */
const FLOW_DIRS: readonly (readonly [number, number])[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
const OPPOSITE_DIR = [1, 0, 3, 2, -1];

export const BLOCKS: BlockDef[] = [
  { id: 0, name: "Air", top: "", side: "", bottom: "", hardness: 0 },
  {
    id: WATER_ID,
    name: "Water",
    top: "water",
    side: "water",
    bottom: "water",
    transparent: true,
    liquid: true,
    hardness: -1,
  },
  {
    id: 1,
    name: "Grass",
    top: "grass_block_top",
    side: "grass_block_side",
    bottom: "dirt",
    hardness: 0.9,
  },
  { id: 2, name: "Dirt", top: "dirt", side: "dirt", bottom: "dirt", hardness: 0.75 },
  { id: 3, name: "Stone", top: "stone", side: "stone", bottom: "stone", hardness: 2.2 },
  {
    id: 4,
    name: "Cobblestone",
    top: "cobblestone",
    side: "cobblestone",
    bottom: "cobblestone",
    hardness: 2.5,
  },
  {
    id: 5,
    name: "Stone Bricks",
    top: "stone_bricks",
    side: "stone_bricks",
    bottom: "stone_bricks",
    hardness: 2.5,
  },
  { id: 6, name: "Sand", top: "sand", side: "sand", bottom: "sand", hardness: 0.75 },
  {
    id: 7,
    name: "Oak Log",
    top: "oak_log_top",
    side: "oak_log",
    bottom: "oak_log_top",
    hardness: 1.5,
  },
  {
    id: 8,
    name: "Birch Log",
    top: "birch_log_top",
    side: "birch_log",
    bottom: "birch_log_top",
    hardness: 1.5,
  },
  {
    id: 9,
    name: "Leaves",
    top: "jungle_leaves",
    side: "jungle_leaves",
    bottom: "jungle_leaves",
    transparent: true,
    hardness: 0.3,
  },
  {
    id: 10,
    name: "Glass",
    top: "glass",
    side: "glass",
    bottom: "glass",
    transparent: true,
    hardness: 0.4,
  },
  { id: 11, name: "Obsidian", top: "obsidian", side: "obsidian", bottom: "obsidian", hardness: 9 },
  { id: 12, name: "Bedrock", top: "bedrock", side: "bedrock", bottom: "bedrock", hardness: -1 },
  {
    id: 13,
    name: "Oak Planks",
    top: "oak_planks",
    side: "oak_planks",
    bottom: "oak_planks",
    hardness: 1.5,
  },
  {
    id: 14,
    name: "Mossy Cobble",
    top: "mossy_cobblestone",
    side: "mossy_cobblestone",
    bottom: "mossy_cobblestone",
    hardness: 2.5,
  },
  { id: 15, name: "Gravel", top: "gravel", side: "gravel", bottom: "gravel", hardness: 0.8 },
  { id: 16, name: "Snow", top: "snow", side: "snow", bottom: "snow", hardness: 0.5 },
  { id: 17, name: "Ice", top: "ice", side: "ice", bottom: "ice", hardness: 0.6 },
  {
    id: 18,
    name: "Glowstone",
    top: "glowstone",
    side: "glowstone",
    bottom: "glowstone",
    hardness: 0.6,
    glow: 0.95,
  },
  {
    id: 19,
    name: "Gold Block",
    top: "gold_block",
    side: "gold_block",
    bottom: "gold_block",
    hardness: 3,
  },
  {
    id: 20,
    name: "Diamond Block",
    top: "diamond_block",
    side: "diamond_block",
    bottom: "diamond_block",
    hardness: 3.5,
    glow: 0.65,
  },
  {
    id: 21,
    name: "Emerald Block",
    top: "emerald_block",
    side: "emerald_block",
    bottom: "emerald_block",
    hardness: 3.5,
    glow: 0.72,
  },
  {
    id: 22,
    name: "Lapis Block",
    top: "lapis_block",
    side: "lapis_block",
    bottom: "lapis_block",
    hardness: 2.5,
    glow: 0.55,
  },
  {
    id: 23,
    name: "Amethyst",
    top: "amethyst_block",
    side: "amethyst_block",
    bottom: "amethyst_block",
    hardness: 2,
    glow: 0.88,
  },
  {
    id: 24,
    name: "Bookshelf",
    top: "oak_planks",
    side: "bookshelf",
    bottom: "oak_planks",
    hardness: 1.5,
  },
  {
    id: 25,
    name: "Hay Bale",
    top: "hay_block_top",
    side: "hay_block_side",
    bottom: "hay_block_top",
    hardness: 0.6,
  },
  {
    id: 26,
    name: "Pumpkin",
    top: "pumpkin_top",
    side: "pumpkin_side",
    bottom: "pumpkin_top",
    hardness: 1,
  },
  { id: 27, name: "Melon", top: "melon_top", side: "melon_side", bottom: "melon_top", hardness: 1 },
  { id: 28, name: "TNT", top: "tnt_top", side: "tnt_side", bottom: "tnt_top", hardness: 0.2 },
  {
    id: 29,
    name: "White Wool",
    top: "white_wool",
    side: "white_wool",
    bottom: "white_wool",
    hardness: 0.8,
  },
  {
    id: 30,
    name: "Red Wool",
    top: "red_wool",
    side: "red_wool",
    bottom: "red_wool",
    hardness: 0.8,
  },
  {
    id: 31,
    name: "Blue Wool",
    top: "blue_wool",
    side: "blue_wool",
    bottom: "blue_wool",
    hardness: 0.8,
  },
  {
    id: 32,
    name: "Green Wool",
    top: "green_wool",
    side: "green_wool",
    bottom: "green_wool",
    hardness: 0.8,
  },
  {
    id: 33,
    name: "Yellow Wool",
    top: "yellow_wool",
    side: "yellow_wool",
    bottom: "yellow_wool",
    hardness: 0.8,
  },
  {
    id: 43,
    name: "Pink Wool",
    top: "pink_wool",
    side: "pink_wool",
    bottom: "pink_wool",
    hardness: 0.8,
  },
  {
    id: 49,
    name: "Pink Block",
    top: "pink_block",
    side: "pink_block",
    bottom: "pink_block",
    hardness: 3,
    glow: 0.6,
  },
  {
    id: 34,
    name: "Terracotta",
    top: "terracotta",
    side: "terracotta",
    bottom: "terracotta",
    hardness: 2,
  },
  {
    id: 35,
    name: "Nether Bricks",
    top: "nether_bricks",
    side: "nether_bricks",
    bottom: "nether_bricks",
    hardness: 2.5,
  },
  { id: 36, name: "Coal Ore", top: "coal_ore", side: "coal_ore", bottom: "coal_ore", hardness: 3 },
  {
    id: 37,
    name: "Redstone Ore",
    top: "redstone_ore",
    side: "redstone_ore",
    bottom: "redstone_ore",
    hardness: 3,
    glow: 0.82,
  },
  {
    id: 38,
    name: "Spruce Log",
    top: "spruce_log_top",
    side: "spruce_log",
    bottom: "spruce_log_top",
    hardness: 1.5,
  },
  {
    id: 39,
    name: "Dark Oak Log",
    top: "dark_oak_log_top",
    side: "dark_oak_log",
    bottom: "dark_oak_log_top",
    hardness: 1.5,
  },
  {
    id: 40,
    name: "Spruce Leaves",
    top: "spruce_leaves",
    side: "spruce_leaves",
    bottom: "spruce_leaves",
    transparent: true,
    hardness: 0.3,
  },
  {
    id: 41,
    name: "Path",
    top: "dirt_path_top",
    side: "dirt_path_side",
    bottom: "dirt",
    hardness: 0.7,
  },
  {
    id: 42,
    name: "Smooth Stone",
    top: "smooth_stone",
    side: "smooth_stone",
    bottom: "smooth_stone",
    hardness: 2.2,
  },
  {
    id: 44,
    name: "Oak Stairs",
    top: "oak_planks",
    side: "oak_planks",
    bottom: "oak_planks",
    shape: "stairs",
    hardness: 1.5,
  },
  {
    id: 45,
    name: "Cobblestone Stairs",
    top: "cobblestone",
    side: "cobblestone",
    bottom: "cobblestone",
    shape: "stairs",
    hardness: 2.5,
  },
  {
    id: 46,
    name: "Stone Brick Stairs",
    top: "stone_bricks",
    side: "stone_bricks",
    bottom: "stone_bricks",
    shape: "stairs",
    hardness: 2.5,
  },
  { id: 47, name: "Iron Ore", top: "iron_ore", side: "iron_ore", bottom: "iron_ore", hardness: 3 },
  { id: 48, name: "Diamond Ore", top: "diamond_ore", side: "diamond_ore", bottom: "diamond_ore", hardness: 3.5 },
  { id: 51, name: "Wooden Door", top: "oak_door", side: "oak_door", bottom: "oak_door", hardness: 1.2 },
  { id: 52, name: "Wooden Door (Open)", top: "oak_door_open", side: "oak_door_open", bottom: "oak_door_open", transparent: true, passable: true, hardness: 1.2 },
  { id: 53, name: "Iron Door", top: "iron_door", side: "iron_door", bottom: "iron_door", hardness: 4 },
  { id: 54, name: "Iron Door (Open)", top: "iron_door_open", side: "iron_door_open", bottom: "iron_door_open", transparent: true, passable: true, hardness: 4 },
  { id: 55, name: "Chest", top: "oak_planks", side: "chest", bottom: "oak_planks", hardness: 1.5 },
  { id: 56, name: "Trapped Chest", top: "oak_planks", side: "trapped_chest", bottom: "oak_planks", hardness: 1.5 },
  { id: 57, name: "TNT", top: "tnt_top", side: "tnt_side", bottom: "tnt_top", hardness: 0.1 },
  { id: 58, name: "Blast-Proof Glass", top: "blast_glass", side: "blast_glass", bottom: "blast_glass", transparent: true, hardness: 1.2 },
  { id: 59, name: "Ladder", top: "ladder", side: "ladder", bottom: "ladder", transparent: true, passable: true, climb: true, hardness: 0.4 },
  { id: 60, name: "Bed", top: "bed_top", side: "bed_side", bottom: "oak_planks", hardness: 0.6 },
  { id: 61, name: "Respawn Anchor", top: "respawn_anchor_top", side: "respawn_anchor", bottom: "respawn_anchor_top", hardness: 5, glow: 0.6 },
  { id: 62, name: "Lava", top: "lava", side: "lava", bottom: "lava", transparent: true, liquid: true, passable: true, hardness: 0.2, glow: 1 },
  { id: 63, name: "Slime Block", top: "slime_block", side: "slime_block", bottom: "slime_block", hardness: 0.4 },
  { id: 64, name: "Oak Slab", top: "oak_planks", side: "oak_planks", bottom: "oak_planks", shape: "slab", hardness: 1.5 },
  { id: 65, name: "Stone Slab", top: "smooth_stone", side: "smooth_stone", bottom: "smooth_stone", shape: "slab", hardness: 2.2 },
  { id: 66, name: "Oak Vertical Slab", top: "oak_planks", side: "oak_planks", bottom: "oak_planks", shape: "vslab", hardness: 1.5 },
  { id: 67, name: "Brick Quarter Block", top: "stone_bricks", side: "stone_bricks", bottom: "stone_bricks", shape: "quarter", hardness: 2.5 },
  { id: 68, name: "Brick Vertical Slab", top: "stone_bricks", side: "stone_bricks", bottom: "stone_bricks", shape: "vslab", hardness: 2.5 },
  { id: 69, name: "Door Button", top: "door_button", side: "door_button", bottom: "door_button", hardness: 1 },
];

export const BLOCK_BY_ID = new Map(BLOCKS.map((b) => [b.id, b]));

export function hardnessOf(id: number) {
  const h = BLOCK_BY_ID.get(id)?.hardness;
  return h === undefined ? 1 : h;
}

const TINTS: Record<string, [number, number, number]> = {
  grass_block_top: [0.41, 1.0, 0.055],
  oak_leaves: [0.35, 0.65, 0.25],
  birch_leaves: [0.4, 0.7, 0.35],
  spruce_leaves: [0.3, 0.5, 0.3],
  jungle_leaves: [0.35, 0.75, 0.25],
  acacia_leaves: [0.45, 0.7, 0.3],
  water: [0.32, 0.78, 1.0],
};

type FaceInfo = {
  dir: [number, number, number];
  corners: [number, number, number][];
  uvs: [number, number][];
  light: number;
  flip?: boolean;
};

const FACES: FaceInfo[] = [
  {
    // +X (East)
    dir: [1, 0, 0],
    corners: [
      [1, 0, 1],
      [1, 1, 1],
      [1, 1, 0],
      [1, 0, 0],
    ],
    uvs: [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 0],
    ],
    light: 0.9,
    flip: true,
  },
  {
    // -X (West)
    dir: [-1, 0, 0],
    corners: [
      [0, 0, 0],
      [0, 1, 0],
      [0, 1, 1],
      [0, 0, 1],
    ],
    uvs: [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 0],
    ],
    light: 0.84,
    flip: true,
  },
  {
    // +Y (Top)
    dir: [0, 1, 0],
    corners: [
      [0, 1, 1],
      [1, 1, 1],
      [1, 1, 0],
      [0, 1, 0],
    ],
    uvs: [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ],
    light: 1.0,
  },
  {
    // -Y (Bottom)
    dir: [0, -1, 0],
    corners: [
      [0, 0, 0],
      [1, 0, 0],
      [1, 0, 1],
      [0, 0, 1],
    ],
    uvs: [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ],
    light: 0.7,
  },
  {
    // +Z (South)
    dir: [0, 0, 1],
    corners: [
      [0, 0, 1],
      [0, 1, 1],
      [1, 1, 1],
      [1, 0, 1],
    ],
    uvs: [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 0],
    ],
    light: 0.9,
    flip: true,
  },
  {
    // -Z (North)
    dir: [0, 0, -1],
    corners: [
      [1, 0, 0],
      [1, 1, 0],
      [0, 1, 0],
      [0, 0, 0],
    ],
    uvs: [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 0],
    ],
    light: 0.8,
    flip: true,
  },
];

// Pre-computed AO offset arrays for the 6 faces and 4 corners:
// Each entry holds: [dx1, dy1, dz1, dx2, dy2, dz2, dxc, dyc, dzc]
const AO_OFFSETS: Int8Array[] = (() => {
  const result: Int8Array[] = [];
  const AO_AXES = [
    { ax: 0, t1: 1, t2: 2 }, // +X
    { ax: 0, t1: 1, t2: 2 }, // -X
    { ax: 1, t1: 2, t2: 0 }, // +Y
    { ax: 1, t1: 2, t2: 0 }, // -Y
    { ax: 2, t1: 0, t2: 1 }, // +Z
    { ax: 2, t1: 0, t2: 1 }, // -Z
  ];
  for (let f = 0; f < 6; f++) {
    const face = FACES[f];
    const { t1, t2 } = AO_AXES[f];
    for (let c = 0; c < 4; c++) {
      const cn = face.corners[c];
      const d1 = cn[t1] ? 1 : -1;
      const d2 = cn[t2] ? 1 : -1;
      const arr = new Int8Array(9);
      // s1
      arr[0] = face.dir[0];
      arr[1] = face.dir[1];
      arr[2] = face.dir[2];
      arr[t1] += d1;
      // s2
      arr[3] = face.dir[0];
      arr[4] = face.dir[1];
      arr[5] = face.dir[2];
      arr[t2] += d2;
      // cr
      arr[6] = face.dir[0];
      arr[7] = face.dir[1];
      arr[8] = face.dir[2];
      arr[t1] += d1;
      arr[t2] += d2;
      result.push(arr);
    }
  }
  return result;
})();

const AO_CURVE = [1.0, 0.82, 0.64, 0.44];

// Fast numeric hash key for chunk (cx, cz)
export function chunkKey(cx: number, cz: number): number {
  return ((cx + 2048) << 12) | (cz + 2048);
}

// ── Shared typed buffer pools for zero-allocation meshing ──
const MAX_VERTS = 49152;
const pBuf = new Float32Array(MAX_VERTS * 3);
const nBuf = new Float32Array(MAX_VERTS * 3);
const uBuf = new Float32Array(MAX_VERTS * 2);
const cBuf = new Float32Array(MAX_VERTS * 3);
const iBuf = new Uint32Array(MAX_VERTS * 6);
const bBuf = new Float32Array(MAX_VERTS * 4); // aAtlasBounds (u0, v0, u1, v1)

const tpBuf = new Float32Array(MAX_VERTS * 3);
const tnBuf = new Float32Array(MAX_VERTS * 3);
const tuBuf = new Float32Array(MAX_VERTS * 2);
const tcBuf = new Float32Array(MAX_VERTS * 3);
const tiBuf = new Uint32Array(MAX_VERTS * 6);
const tsBuf = new Float32Array(MAX_VERTS); // aSway
const tbBuf = new Float32Array(MAX_VERTS * 4);

const wpBuf = new Float32Array(MAX_VERTS * 3);
const wnBuf = new Float32Array(MAX_VERTS * 3);
const wuBuf = new Float32Array(MAX_VERTS * 2);
const wcBuf = new Float32Array(MAX_VERTS * 3);
const wiBuf = new Uint32Array(MAX_VERTS * 6);
const wbBuf = new Float32Array(MAX_VERTS * 4);
const wfBuf = new Float32Array(MAX_VERTS * 3); // aFlow (uv flow x, uv flow y, isLava)

const LIQUID_SURFACE = 8 / 9;
const liquidHeightFor = (level: number) =>
  level === 0 || level >= LIQUID_FALLING ? LIQUID_SURFACE : (8 - level) / 9;

// Reusable 2D slice buffers for high-speed greedy meshing
const sliceMask = new Int32Array(CHUNK * CHUNK);
const sliceVisited = new Uint8Array(CHUNK * CHUNK);

export class SubChunk {
  mesh: THREE.Mesh | null = null;
  transparentMesh: THREE.Mesh | null = null;
  waterMesh: THREE.Mesh | null = null;
  group: THREE.Group;
  dirty = true;
  empty = true;
  readonly minY: number;
  readonly maxY: number;
  readonly boundingBox: THREE.Box3;
  readonly cullingBox: THREE.Box3;
  readonly boundingSphere: THREE.Sphere;
  readonly center: THREE.Vector3;

  constructor(
    readonly cx: number,
    readonly cy: number,
    readonly cz: number,
  ) {
    this.minY = cy * SUB_H;
    this.maxY = (cy + 1) * SUB_H;
    const minX = cx * CHUNK;
    const minZ = cz * CHUNK;
    this.boundingBox = new THREE.Box3(
      new THREE.Vector3(minX, this.minY, minZ),
      new THREE.Vector3(minX + CHUNK, this.maxY, minZ + CHUNK),
    );
    this.cullingBox = this.boundingBox.clone().expandByScalar(3.0);
    this.center = new THREE.Vector3(minX + CHUNK / 2, this.minY + SUB_H / 2, minZ + CHUNK / 2);
    this.boundingSphere = new THREE.Sphere(this.center, Math.sqrt(3 * (8 * 8)));
    this.group = new THREE.Group();
    this.group.matrixAutoUpdate = false;
  }

  dispose() {
    if (this.mesh) {
      this.mesh.geometry.dispose();
      this.mesh = null;
    }
    if (this.transparentMesh) {
      this.transparentMesh.geometry.dispose();
      this.transparentMesh = null;
    }
    if (this.waterMesh) {
      this.waterMesh.geometry.dispose();
      this.waterMesh = null;
    }
    this.group.clear();
    this.group.removeFromParent();
  }
}

export class Chunk {
  readonly data = new Uint8Array(CHUNK * WORLD_H * CHUNK);
  readonly levels = new Uint8Array(CHUNK * WORLD_H * CHUNK);
  readonly subChunks: SubChunk[];
  dirty = true;
  readonly counts = new Uint16Array(SUB_CHUNKS); // non-air blocks in subchunks 0..2
  readonly transparentCounts = new Uint16Array(SUB_CHUNKS);
  readonly liquidCounts = new Uint16Array(SUB_CHUNKS);

  constructor(
    readonly cx: number,
    readonly cz: number,
  ) {
    this.subChunks = [
      new SubChunk(cx, 0, cz),
      new SubChunk(cx, 1, cz),
      new SubChunk(cx, 2, cz),
    ];
  }

  idx(x: number, y: number, z: number) {
    return (y * CHUNK + z) * CHUNK + x;
  }
}

export class World {
  readonly group = new THREE.Group();
  private chunks = new Map<number, Chunk>();
  private activeChunks = new Set<Chunk>();
  private dirtySubChunks = new Set<SubChunk>();
  private dirtySubChunkArray: SubChunk[] = [];
  private frustum = new THREE.Frustum();
  private projScreenMatrix = new THREE.Matrix4();
  private frustumCheckTick = 0;
  private material: THREE.MeshStandardMaterial;
  private transparentMaterial: THREE.MeshStandardMaterial;
  private waterMaterial: THREE.MeshStandardMaterial;
  private liquidTicks = new Map<number, { x: number; y: number; z: number; due: number }>();

  /**
   * Called when lava meets water. Return a block id to override the result
   * (e.g. Skyblock's ore generator), or nothing to keep the default.
   */
  onLiquidReaction: ((x: number, y: number, z: number, kind: LiquidReaction) => number | void) | null = null;

  // Fast single-element chunk lookup cache
  private lastChunkKey = -1;
  private lastChunk: Chunk | null = null;
  private greedyMeshing = true;

  get isGreedyMeshing(): boolean {
    return this.greedyMeshing;
  }

  setGreedyMeshing(enabled: boolean) {
    if (this.greedyMeshing === enabled) return;
    this.greedyMeshing = enabled;
    for (const c of this.activeChunks) {
      c.subChunks.forEach((sc) => {
        sc.dirty = true;
        this.dirtySubChunks.add(sc);
      });
    }
  }

  constructor(
    private atlas: Atlas,
    readonly radius = 5,
  ) {
    this.group.matrixAutoUpdate = false;

    // Standard voxel material with seamless atlas repeating support
    this.material = new THREE.MeshStandardMaterial({
      map: atlas.texture,
      vertexColors: true,
      roughness: 0.7,
      metalness: 0.04,
      emissive: new THREE.Color(0x18222b),
      emissiveIntensity: 0.12,
    });
    this.material.onBeforeCompile = (shader) => {
      shader.uniforms.uSnow = SNOW.uSnow;
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
          attribute vec4 aAtlasBounds;
          varying vec4 vAtlasBounds;
          varying vec2 vFaceUv;
          varying float vUpN;`,
        )
        .replace(
          "#include <uv_vertex>",
          `#include <uv_vertex>
          vAtlasBounds = aAtlasBounds;
          vFaceUv = uv;
          vUpN = normal.y;`,
        );

      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
          varying vec4 vAtlasBounds;
          varying vec2 vFaceUv;
          varying float vUpN;
          uniform float uSnow;`,
        )
        .replace(
          "#include <map_fragment>",
          `#ifdef USE_MAP
            vec2 localUv = fract(vFaceUv);
            vec2 atlasUv = mix(vAtlasBounds.xy, vAtlasBounds.zw, localUv);
            vec4 sampledDiffuseColor = texture2D(map, atlasUv);
            diffuseColor *= sampledDiffuseColor;
          #endif
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.93, 0.96, 1.0), uSnow * smoothstep(0.6, 0.95, vUpN) * 0.9);`,
        );
    };
    this.material.customProgramCacheKey = () => "qblock-voxel-atlas-repeat";

    // Foliage & Transparent material with wind sway
    this.transparentMaterial = new THREE.MeshStandardMaterial({
      map: atlas.texture,
      vertexColors: true,
      roughness: 0.7,
      metalness: 0.04,
      emissive: new THREE.Color(0x18222b),
      emissiveIntensity: 0.11,
      transparent: true,
      alphaTest: 0.35,
      depthWrite: true,
      side: THREE.DoubleSide,
    });
    this.transparentMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.uWindTime = WIND.uTime;
      shader.uniforms.uWindStrength = WIND.uStrength;
      shader.uniforms.uSnow = SNOW.uSnow;
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
          attribute float aSway;
          attribute vec4 aAtlasBounds;
          varying vec4 vAtlasBounds;
          varying vec2 vFaceUv;
          uniform float uWindTime;
          uniform float uWindStrength;
          varying float vUpN;`,
        )
        .replace(
          "#include <uv_vertex>",
          `#include <uv_vertex>
          vAtlasBounds = aAtlasBounds;
          vFaceUv = uv;
          vUpN = normal.y;`,
        )
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
          if (aSway > 0.5) {
            float ph = position.x * 0.55 + position.z * 0.45 + position.y * 0.3;
            float front = sin(uWindTime * 0.45 - (position.x + position.z) * 0.08);
            float gust = 0.55 + 0.45 * front * front;
            float flutter = sin(uWindTime * 7.3 + ph * 3.1) * 0.012;
            transformed.x += (sin(uWindTime * 1.6 + ph) * 0.055 * gust + flutter) * uWindStrength;
            transformed.z += (cos(uWindTime * 1.25 + ph * 1.3) * 0.045 * gust + flutter * 0.7) * uWindStrength;
            transformed.y += sin(uWindTime * 2.1 + ph * 0.8) * 0.016 * uWindStrength;
          }`,
        );

      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
          varying vec4 vAtlasBounds;
          varying vec2 vFaceUv;
          varying float vUpN;
          uniform float uSnow;`,
        )
        .replace(
          "#include <map_fragment>",
          `#ifdef USE_MAP
            vec2 localUv = fract(vFaceUv);
            vec2 atlasUv = mix(vAtlasBounds.xy, vAtlasBounds.zw, localUv);
            vec4 sampledDiffuseColor = texture2D(map, atlasUv);
            diffuseColor *= sampledDiffuseColor;
          #endif
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.92, 0.95, 1.0), uSnow * smoothstep(0.5, 0.95, vUpN) * 0.75);`,
        );
    };
    this.transparentMaterial.customProgramCacheKey = () => "voxel-foliage-wind-repeat";

    // Water & Lava material
    // Water & lava share one material; aFlow.z switches the lava look.
    this.waterMaterial = new THREE.MeshStandardMaterial({
      map: atlas.texture,
      vertexColors: true,
      roughness: 0.08,
      metalness: 0.1,
      emissive: new THREE.Color(0x000000),
      emissiveIntensity: 0.0,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.waterMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.uLiquidTime = WIND.uTime;
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
          attribute vec4 aAtlasBounds;
          attribute vec3 aFlow;
          varying vec4 vAtlasBounds;
          varying vec2 vFaceUv;
          varying vec3 vFlow;
          uniform float uLiquidTime;`,
        )
        .replace(
          "#include <uv_vertex>",
          `#include <uv_vertex>
          vAtlasBounds = aAtlasBounds;
          vFaceUv = uv;
          vFlow = aFlow;`,
        )
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
          // Surface vertices sit at fractional heights; displacement is a pure
          // function of position so shared corners never crack apart.
          if (fract(position.y) > 0.02) {
            float speed = mix(1.0, 0.35, aFlow.z);
            float amp = mix(0.03, 0.018, aFlow.z);
            float w1 = sin(uLiquidTime * 1.7 * speed + position.x * 1.31 + position.z * 0.87);
            float w2 = sin(uLiquidTime * 2.3 * speed - position.x * 0.71 + position.z * 1.63);
            transformed.y += (w1 * 0.6 + w2 * 0.4) * amp - amp;
          }`,
        );

      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
          varying vec4 vAtlasBounds;
          varying vec2 vFaceUv;
          varying vec3 vFlow;
          uniform float uLiquidTime;`,
        )
        .replace(
          "#include <map_fragment>",
          `#ifdef USE_MAP
            float flowSpeed = mix(0.55, 0.16, vFlow.z);
            vec2 drift = vec2(0.035, 0.022) * uLiquidTime * mix(1.0, 0.4, vFlow.z);
            vec2 localUv = fract(vFaceUv - vFlow.xy * uLiquidTime * flowSpeed + drift * step(length(vFlow.xy), 0.01));
            vec2 atlasUv = mix(vAtlasBounds.xy, vAtlasBounds.zw, localUv);
            vec4 sampledDiffuseColor = texture2D(map, atlasUv);
            diffuseColor *= sampledDiffuseColor;
          #endif`,
        )
        .replace(
          "#include <roughnessmap_fragment>",
          `#include <roughnessmap_fragment>
          roughnessFactor = mix(roughnessFactor, 0.85, vFlow.z);`,
        )
        .replace(
          "#include <normal_fragment_maps>",
          `#include <normal_fragment_maps>
          float fresnel = pow(1.0 - clamp(abs(dot(normalize(vViewPosition), normal)), 0.0, 1.0), 3.0);
          float waterAlpha = clamp(diffuseColor.a * (0.8 + fresnel * 0.55), 0.0, 0.95);
          diffuseColor.a = mix(waterAlpha, 1.0, vFlow.z);
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.82, 0.95, 1.08) + vec3(0.02, 0.05, 0.08) * fresnel, 1.0 - vFlow.z);`,
        )
        .replace(
          "#include <emissivemap_fragment>",
          `#include <emissivemap_fragment>
          float lavaPulse = 1.25 + 0.3 * sin(uLiquidTime * 1.4 + vFaceUv.x * 5.0 + vFaceUv.y * 3.0);
          totalEmissiveRadiance += diffuseColor.rgb * vFlow.z * lavaPulse;`,
        );
    };
    this.waterMaterial.customProgramCacheKey = () => "voxel-liquid-flow-v2";

    // Allocate chunks for the requested radius
    for (let cx = -radius; cx <= radius; cx++) {
      for (let cz = -radius; cz <= radius; cz++) {
        this.getOrCreateChunk(cx, cz);
      }
    }
  }

  getOrCreateChunk(cx: number, cz: number): Chunk {
    const key = chunkKey(cx, cz);
    let c = this.chunks.get(key);
    if (!c) {
      c = new Chunk(cx, cz);
      this.chunks.set(key, c);
      this.activeChunks.add(c);
      c.subChunks.forEach((sc) => {
        this.dirtySubChunks.add(sc);
      });
    }
    return c;
  }

  ensureChunks(minX: number, minZ: number, maxX: number, maxZ: number) {
    const minCx = Math.floor(minX / CHUNK);
    const maxCx = Math.floor(maxX / CHUNK);
    const minCz = Math.floor(minZ / CHUNK);
    const maxCz = Math.floor(maxZ / CHUNK);
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cz = minCz; cz <= maxCz; cz++) {
        this.getOrCreateChunk(cx, cz);
      }
    }
  }

  private chunkAt(x: number, z: number): Chunk | undefined {
    const cx = Math.floor(x / CHUNK);
    const cz = Math.floor(z / CHUNK);
    const key = chunkKey(cx, cz);
    if (key === this.lastChunkKey) return this.lastChunk ?? undefined;
    const c = this.chunks.get(key);
    this.lastChunkKey = key;
    this.lastChunk = c ?? null;
    return c;
  }

  get(x: number, y: number, z: number): number {
    if (y < 0 || y >= WORLD_H) return 0;
    const c = this.chunkAt(x, z);
    if (!c) return 0;
    const lx = ((x % CHUNK) + CHUNK) % CHUNK;
    const lz = ((z % CHUNK) + CHUNK) % CHUNK;
    return c.data[(y * CHUNK + lz) * CHUNK + lx];
  }

  setRaw(x: number, y: number, z: number, id: number) {
    if (y < 0 || y >= WORLD_H) return;
    const c = this.getOrCreateChunk(Math.floor(x / CHUNK), Math.floor(z / CHUNK));
    const lx = ((x % CHUNK) + CHUNK) % CHUNK;
    const lz = ((z % CHUNK) + CHUNK) % CHUNK;
    const idx = (y * CHUNK + lz) * CHUNK + lx;
    const oldId = c.data[idx];
    c.levels[idx] = 0;
    if (oldId === id) return;

    const cy = Math.floor(y / SUB_H);
    const def = BLOCK_BY_ID.get(id);
    const oldDef = BLOCK_BY_ID.get(oldId);

    if (oldId !== 0) c.counts[cy]--;
    if (id !== 0) c.counts[cy]++;

    if (oldDef?.transparent && !oldDef?.liquid) c.transparentCounts[cy]--;
    if (def?.transparent && !def?.liquid) c.transparentCounts[cy]++;

    if (oldDef?.liquid) c.liquidCounts[cy]--;
    if (def?.liquid) c.liquidCounts[cy]++;

    c.data[idx] = id;
    c.dirty = true;
    const sc = c.subChunks[cy];
    sc.dirty = true;
    sc.empty = c.counts[cy] === 0;
    this.dirtySubChunks.add(sc);
  }

  /**
   * Public block write. Placing a liquid creates a source block; any change
   * wakes neighbouring liquids so they flow into holes or dry up.
   */
  set(x: number, y: number, z: number, id: number) {
    if (y < 0 || y >= WORLD_H) return;
    this.writeBlock(x, y, z, id, 0);
    if (id === LAVA_ID && this.lavaReacts(x, y, z)) return;
    if (id === WATER_ID || id === LAVA_ID) this.scheduleLiquid(x, y, z, id);
    this.wakeNeighbors(x, y, z);
  }

  getLiquidLevel(x: number, y: number, z: number): number {
    if (y < 0 || y >= WORLD_H) return 0;
    const c = this.chunkAt(x, z);
    if (!c) return 0;
    const lx = ((x % CHUNK) + CHUNK) % CHUNK;
    const lz = ((z % CHUNK) + CHUNK) % CHUNK;
    return c.levels[(y * CHUNK + lz) * CHUNK + lx];
  }

  isLiquidSource(x: number, y: number, z: number): boolean {
    return this.isLiquid(x, y, z) && this.getLiquidLevel(x, y, z) === 0;
  }

  /** Raw voxel + level write with mesh invalidation; no liquid side effects. */
  private writeBlock(x: number, y: number, z: number, id: number, level: number) {
    const cx = Math.floor(x / CHUNK);
    const cz = Math.floor(z / CHUNK);
    const c = this.getOrCreateChunk(cx, cz);
    const lx = ((x % CHUNK) + CHUNK) % CHUNK;
    const lz = ((z % CHUNK) + CHUNK) % CHUNK;
    const idx = (y * CHUNK + lz) * CHUNK + lx;
    const oldId = c.data[idx];
    const nextLevel = id === WATER_ID || id === LAVA_ID ? level : 0;
    if (oldId === id && c.levels[idx] === nextLevel) return;
    c.levels[idx] = nextLevel;

    const cy = Math.floor(y / SUB_H);
    if (oldId !== id) {
      const def = BLOCK_BY_ID.get(id);
      const oldDef = BLOCK_BY_ID.get(oldId);

      if (oldId !== 0) c.counts[cy]--;
      if (id !== 0) c.counts[cy]++;

      if (oldDef?.transparent && !oldDef?.liquid) c.transparentCounts[cy]--;
      if (def?.transparent && !def?.liquid) c.transparentCounts[cy]++;

      if (oldDef?.liquid) c.liquidCounts[cy]--;
      if (def?.liquid) c.liquidCounts[cy]++;

      c.data[idx] = id;
    }
    c.dirty = true;

    const sc = c.subChunks[cy];
    sc.dirty = true;
    sc.empty = c.counts[cy] === 0;
    this.dirtySubChunks.add(sc);

    const ly = y % SUB_H;
    if (ly === 0 && cy > 0) {
      c.subChunks[cy - 1].dirty = true;
      this.dirtySubChunks.add(c.subChunks[cy - 1]);
    } else if (ly === SUB_H - 1 && cy < SUB_CHUNKS - 1) {
      c.subChunks[cy + 1].dirty = true;
      this.dirtySubChunks.add(c.subChunks[cy + 1]);
    }

    const markNeighbor = (ncx: number, ncz: number) => {
      const nc = this.chunks.get(chunkKey(ncx, ncz));
      if (!nc) return;
      nc.subChunks[cy].dirty = true;
      this.dirtySubChunks.add(nc.subChunks[cy]);
    };
    if (lx === 0) markNeighbor(cx - 1, cz);
    else if (lx === CHUNK - 1) markNeighbor(cx + 1, cz);
    if (lz === 0) markNeighbor(cx, cz - 1);
    else if (lz === CHUNK - 1) markNeighbor(cx, cz + 1);
  }

  /* ── Liquid simulation ───────────────────────────────────────────────
   * Minecraft-style cellular flow: sources (level 0) feed flowing cells
   * whose level is their distance from the nearest feeder. Water spreads 7
   * blocks, lava 3; both prefer the shortest path to a drop. Lava touching
   * water hardens: source -> obsidian, flowing -> cobblestone, and lava
   * falling onto water -> stone. That makes a classic cobble generator work.
   */

  private scheduleLiquid(x: number, y: number, z: number, id: number, delayMs?: number) {
    if (y < 0 || y >= WORLD_H) return;
    const key = liquidKey(x, y, z);
    const due = performance.now() + (delayMs ?? (id === LAVA_ID ? LAVA_TICK_MS : WATER_TICK_MS));
    const existing = this.liquidTicks.get(key);
    if (existing && existing.due <= due) return;
    this.liquidTicks.set(key, { x, y, z, due });
  }

  private wakeNeighbors(x: number, y: number, z: number) {
    for (let i = 0; i < 6; i++) {
      const nx = x + NEIGHBOR_DIRS[i][0];
      const ny = y + NEIGHBOR_DIRS[i][1];
      const nz = z + NEIGHBOR_DIRS[i][2];
      const n = this.get(nx, ny, nz);
      if (n === LAVA_ID) {
        if (!this.lavaReacts(nx, ny, nz)) this.scheduleLiquid(nx, ny, nz, n);
      } else if (n === WATER_ID) {
        this.scheduleLiquid(nx, ny, nz, n);
      }
    }
  }

  /** Lava next to water (sides or above) hardens in place. Returns true if it did. */
  private lavaReacts(x: number, y: number, z: number): boolean {
    if (this.get(x, y, z) !== LAVA_ID) return false;
    let touchesWater = false;
    for (let i = 0; i < 6; i++) {
      if (NEIGHBOR_DIRS[i][1] === -1) continue;
      if (this.get(x + NEIGHBOR_DIRS[i][0], y + NEIGHBOR_DIRS[i][1], z + NEIGHBOR_DIRS[i][2]) === WATER_ID) {
        touchesWater = true;
        break;
      }
    }
    if (!touchesWater) return false;
    const kind: LiquidReaction = this.getLiquidLevel(x, y, z) === 0 ? "obsidian" : "cobblestone";
    this.harden(x, y, z, kind);
    return true;
  }

  private harden(x: number, y: number, z: number, kind: LiquidReaction) {
    const fallback = kind === "obsidian" ? OBSIDIAN_ID : kind === "stone" ? STONE_ID : COBBLESTONE_ID;
    const override = this.onLiquidReaction?.(x, y, z, kind);
    this.writeBlock(x, y, z, typeof override === "number" ? override : fallback, 0);
    this.wakeNeighbors(x, y, z);
  }

  private flowLevelOf(id: number, x: number, y: number, z: number): number {
    if (this.get(x, y, z) !== id) return -1;
    const l = this.getLiquidLevel(x, y, z);
    return l >= LIQUID_FALLING ? 0 : l;
  }

  /** Air (or a thinner flow of the same liquid) that this liquid may move into. */
  private canFlowInto(id: number, x: number, y: number, z: number, level: number): boolean {
    if (y < 0 || y >= WORLD_H) return false;
    const t = this.get(x, y, z);
    if (t === 0) return true;
    if (t !== id) return false;
    const l = this.getLiquidLevel(x, y, z);
    if (l === 0) return false;
    if (level === LIQUID_FALLING) return l !== LIQUID_FALLING;
    return l !== LIQUID_FALLING && l > level;
  }

  private holeDistance(id: number, x: number, y: number, z: number, depth: number, max: number, from: number): number {
    let best = 1000;
    for (let i = 0; i < 4; i++) {
      if (i === OPPOSITE_DIR[from]) continue;
      const nx = x + FLOW_DIRS[i][0];
      const nz = z + FLOW_DIRS[i][1];
      const t = this.get(nx, y, nz);
      if (t !== 0 && !(t === id && this.getLiquidLevel(nx, y, nz) !== 0)) continue;
      if (this.canFlowInto(id, nx, y - 1, nz, LIQUID_FALLING)) return depth;
      if (depth < max) best = Math.min(best, this.holeDistance(id, nx, y, nz, depth + 1, max, i));
    }
    return best;
  }

  private tickLiquid(x: number, y: number, z: number) {
    const id = this.get(x, y, z);
    if (id !== WATER_ID && id !== LAVA_ID) return;
    const lava = id === LAVA_ID;
    if (lava && this.lavaReacts(x, y, z)) return;
    const step = lava ? 2 : 1;
    let level = this.getLiquidLevel(x, y, z);

    if (level !== 0) {
      let next: number;
      if (this.get(x, y + 1, z) === id) {
        next = LIQUID_FALLING;
      } else {
        let min = 99;
        let sources = 0;
        for (let i = 0; i < 4; i++) {
          const nx = x + FLOW_DIRS[i][0];
          const nz = z + FLOW_DIRS[i][1];
          const nl = this.flowLevelOf(id, nx, y, nz);
          if (nl < 0) continue;
          if (this.getLiquidLevel(nx, y, nz) === 0) sources++;
          if (nl < min) min = nl;
        }
        next = min + step;
        if (!lava && sources >= 2) {
          const below = this.get(x, y - 1, z);
          if ((below !== 0 && below !== WATER_ID && below !== LAVA_ID) || this.isLiquidSource(x, y - 1, z)) next = 0;
        }
      }
      if (next !== LIQUID_FALLING && next > 7) {
        this.writeBlock(x, y, z, 0, 0);
        this.wakeNeighbors(x, y, z);
        return;
      }
      if (next !== level) {
        this.writeBlock(x, y, z, id, next);
        this.wakeNeighbors(x, y, z);
        level = next;
      }
    }

    if (lava && this.get(x, y - 1, z) === WATER_ID) {
      this.harden(x, y - 1, z, "stone");
      return;
    }
    if (this.canFlowInto(id, x, y - 1, z, LIQUID_FALLING)) {
      this.spreadTo(id, x, y - 1, z, LIQUID_FALLING);
      return;
    }

    const distance = level >= LIQUID_FALLING ? 0 : level;
    const next = distance + step;
    if (next > 7) return;

    let bestCost = 1000;
    const costs = [1000, 1000, 1000, 1000];
    const open = [false, false, false, false];
    const searchDepth = lava ? 2 : 4;
    for (let i = 0; i < 4; i++) {
      const nx = x + FLOW_DIRS[i][0];
      const nz = z + FLOW_DIRS[i][1];
      if (!this.canFlowInto(id, nx, y, nz, next)) continue;
      open[i] = true;
      costs[i] = this.canFlowInto(id, nx, y - 1, nz, LIQUID_FALLING)
        ? 0
        : this.holeDistance(id, nx, y, nz, 1, searchDepth, i);
      if (costs[i] < bestCost) bestCost = costs[i];
    }
    for (let i = 0; i < 4; i++) {
      if (!open[i] || costs[i] !== bestCost) continue;
      this.spreadTo(id, x + FLOW_DIRS[i][0], y, z + FLOW_DIRS[i][1], next);
    }
  }

  private spreadTo(id: number, x: number, y: number, z: number, level: number) {
    this.writeBlock(x, y, z, id, level);
    if (id === LAVA_ID && this.lavaReacts(x, y, z)) return;
    this.scheduleLiquid(x, y, z, id);
    this.wakeNeighbors(x, y, z);
  }

  private processLiquids() {
    if (this.liquidTicks.size === 0) return;
    const now = performance.now();
    let processed = 0;
    for (const [key, tick] of this.liquidTicks) {
      if (tick.due > now) continue;
      this.liquidTicks.delete(key);
      this.tickLiquid(tick.x, tick.y, tick.z);
      if (++processed >= LIQUID_TICK_BUDGET) break;
    }
  }

  solid(x: number, y: number, z: number): boolean {
    const id = this.get(x, y, z);
    return id !== 0 && id !== WATER_ID && !BLOCK_BY_ID.get(id)?.passable;
  }

  isLiquid(x: number, y: number, z: number): boolean {
    const id = this.get(x, y, z);
    return id === WATER_ID || id === LAVA_ID;
  }

  opaque(x: number, y: number, z: number): boolean {
    const id = this.get(x, y, z);
    if (id === 0 || id === WATER_ID) return false;
    return !BLOCK_BY_ID.get(id)?.transparent;
  }

  // Fast direct opaque lookup (avoids coordinate math if in same chunk)
  private opaqueFast(c: Chunk, x: number, y: number, z: number): boolean {
    if (y < 0 || y >= WORLD_H) return false;
    const lx = x - c.cx * CHUNK;
    const lz = z - c.cz * CHUNK;
    let id = 0;
    if (lx >= 0 && lx < CHUNK && lz >= 0 && lz < CHUNK) {
      id = c.data[(y * CHUNK + lz) * CHUNK + lx];
    } else {
      id = this.get(x, y, z);
    }
    if (id === 0 || id === WATER_ID) return false;
    return !BLOCK_BY_ID.get(id)?.transparent;
  }

  /** Legacy helpers: place a source that then flows naturally. */
  queueWaterFlow(x: number, y: number, z: number) {
    if (this.get(x, y, z) === 0) this.set(x, y, z, WATER_ID);
  }

  queueLavaFlow(x: number, y: number, z: number) {
    if (this.get(x, y, z) === 0) this.set(x, y, z, LAVA_ID);
  }

  generate(ground = 8) {
    for (const c of this.activeChunks) {
      for (let x = 0; x < CHUNK; x++) {
        for (let z = 0; z < CHUNK; z++) {
          for (let y = 0; y <= ground; y++) {
            const id = y === 0 ? 12 : y === ground ? 1 : y > ground - 3 ? 2 : 3;
            const idx = (y * CHUNK + z) * CHUNK + x;
            c.data[idx] = id;
            const cy = Math.floor(y / SUB_H);
            c.counts[cy]++;
          }
        }
      }
      c.dirty = true;
      c.subChunks.forEach((sc) => {
        sc.empty = c.counts[sc.cy] === 0;
        sc.dirty = true;
        this.dirtySubChunks.add(sc);
      });
    }
    this.decorate(ground);
  }

  async generateAsync(ground = 8, onProgress?: (p: number) => void): Promise<void> {
    const chunkList = Array.from(this.activeChunks);
    const total = chunkList.length;
    for (let i = 0; i < total; i++) {
      const c = chunkList[i];
      for (let x = 0; x < CHUNK; x++) {
        for (let z = 0; z < CHUNK; z++) {
          for (let y = 0; y <= ground; y++) {
            const id = y === 0 ? 12 : y === ground ? 1 : y > ground - 3 ? 2 : 3;
            const idx = (y * CHUNK + z) * CHUNK + x;
            c.data[idx] = id;
            const cy = Math.floor(y / SUB_H);
            c.counts[cy]++;
          }
        }
      }
      c.dirty = true;
      c.subChunks.forEach((sc) => {
        sc.empty = c.counts[sc.cy] === 0;
        sc.dirty = true;
        this.dirtySubChunks.add(sc);
      });
      if (i % 4 === 0) {
        onProgress?.((i + 1) / total);
        await new Promise((r) => setTimeout(r, 0));
      }
    }
    this.decorate(ground);
    this.meshAll();
  }

  private decorate(ground: number) {
    let seed = 1337;
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0xffffffff;
    };
    const span = this.radius * CHUNK - 4;
    for (let i = 0; i < 26; i++) {
      const x = Math.floor((rnd() * 2 - 1) * span);
      const z = Math.floor((rnd() * 2 - 1) * span);
      if (Math.abs(x) < 6 && Math.abs(z) < 6) continue;
      if (rnd() < 0.72) {
        const h = 4 + Math.floor(rnd() * 3);
        const log = rnd() < 0.5 ? 7 : 8;
        for (let y = 1; y <= h; y++) this.set(x, ground + y, z, log);
        for (let dx = -2; dx <= 2; dx++)
          for (let dz = -2; dz <= 2; dz++)
            for (let dy = 0; dy <= 2; dy++) {
              const d = Math.abs(dx) + Math.abs(dz) + dy;
              if (d > 3) continue;
              const yy = ground + h - 1 + dy;
              if (this.get(x + dx, yy, z + dz) === 0) this.set(x + dx, yy, z + dz, 9);
            }
      } else {
        for (let dx = -1; dx <= 1; dx++)
          for (let dz = -1; dz <= 1; dz++) {
            if (rnd() < 0.4) continue;
            this.set(x + dx, ground + 1, z + dz, rnd() < 0.5 ? 3 : 4);
          }
      }
    }
  }

  /**
   * Budgeted per-frame update: processes liquid flow, updates frustum visibility,
   * and remeshes dirty sub-chunks nearest to the player with zero GC allocations.
   */
  update(budget = 3, playerPos?: THREE.Vector3, camera?: THREE.Camera) {
    this.processLiquids();

    // High-performance frustum culling on sub-chunk bounding boxes
    this.frustumCheckTick++;
    if (camera && this.frustumCheckTick % 2 === 0) {
      camera.updateMatrixWorld();
      this.projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      this.frustum.setFromProjectionMatrix(this.projScreenMatrix);
      const px = playerPos?.x ?? 0;
      const pz = playerPos?.z ?? 0;
      for (const c of this.activeChunks) {
        for (let i = 0; i < SUB_CHUNKS; i++) {
          const sc = c.subChunks[i];
          if (sc.empty || (!sc.mesh && !sc.transparentMesh && !sc.waterMesh)) continue;
          const visible = this.frustum.intersectsBox(sc.cullingBox);
          sc.group.visible = visible;
          if (visible && playerPos) {
            const distSq = (sc.center.x - px) ** 2 + (sc.center.z - pz) ** 2;
            const isNear = distSq < (36 * 36);
            if (sc.mesh && sc.mesh.castShadow !== isNear) sc.mesh.castShadow = isNear;
            if (sc.transparentMesh && sc.transparentMesh.castShadow !== isNear) sc.transparentMesh.castShadow = isNear;
          }
        }
      }
    }

    if (this.dirtySubChunks.size === 0) return;

    // Zero-allocation player-prioritized subchunk queue
    this.dirtySubChunkArray.length = 0;
    for (const sc of this.dirtySubChunks) {
      this.dirtySubChunkArray.push(sc);
    }
    const count = Math.min(budget, this.dirtySubChunkArray.length);

    // Only select the nearest chunks that fit this frame's budget. Sorting the
    // entire dirty set every frame made a small edit expensive when many
    // sub-chunks were queued; selection keeps the same nearest-first behavior
    // with work proportional to the small per-frame budget.
    if (playerPos && count > 0 && this.dirtySubChunkArray.length > count) {
      const px = playerPos.x;
      const py = playerPos.y;
      const pz = playerPos.z;
      for (let i = 0; i < count; i++) {
        let nearestIndex = i;
        const first = this.dirtySubChunkArray[i];
        let nearestDistance =
          (first.center.x - px) ** 2 +
          (first.center.y - py) ** 2 +
          (first.center.z - pz) ** 2;

        for (let j = i + 1; j < this.dirtySubChunkArray.length; j++) {
          const candidate = this.dirtySubChunkArray[j];
          const dx = candidate.center.x - px;
          const dy = candidate.center.y - py;
          const dz = candidate.center.z - pz;
          const distance = dx * dx + dy * dy + dz * dz;
          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestIndex = j;
          }
        }

        if (nearestIndex !== i) {
          const nearest = this.dirtySubChunkArray[nearestIndex];
          for (let j = nearestIndex; j > i; j--) {
            this.dirtySubChunkArray[j] = this.dirtySubChunkArray[j - 1];
          }
          this.dirtySubChunkArray[i] = nearest;
        }
      }
    }

    for (let i = 0; i < count; i++) {
      const sc = this.dirtySubChunkArray[i];
      this.dirtySubChunks.delete(sc);
      const c = this.chunks.get(chunkKey(sc.cx, sc.cz));
      if (c) this.meshSubChunk(c, sc, camera);
      sc.dirty = false;
    }
  }

  meshAll() {
    for (const sc of this.dirtySubChunks) {
      const c = this.chunks.get(chunkKey(sc.cx, sc.cz));
      if (!c) continue;
      this.meshSubChunk(c, sc);
      sc.dirty = false;
    }
    this.dirtySubChunks.clear();
  }

  private getVertexAO(c: Chunk, bx: number, by: number, bz: number, f: number, cornerIdx: number): number {
    const off = AO_OFFSETS[f * 4 + cornerIdx];
    const occ =
      (this.opaqueFast(c, bx + off[0], by + off[1], bz + off[2]) ? 1 : 0) +
      (this.opaqueFast(c, bx + off[3], by + off[4], bz + off[5]) ? 1 : 0) +
      (this.opaqueFast(c, bx + off[6], by + off[7], bz + off[8]) ? 1 : 0);
    return AO_CURVE[occ > 3 ? 3 : occ];
  }

  private meshSubChunk(c: Chunk, sc: SubChunk, camera?: THREE.Camera) {
    if (c.counts[sc.cy] === 0) {
      sc.empty = true;
      sc.dispose();
      return;
    }

    let pIdx = 0;
    let nIdx = 0;
    let uIdx = 0;
    let cIdx = 0;
    let iIdx = 0;
    let bIdx = 0;

    let tpIdx = 0;
    let tnIdx = 0;
    let tuIdx = 0;
    let tcIdx = 0;
    let tiIdx = 0;
    let tsIdx = 0;
    let tbIdx = 0;

    let wpIdx = 0;
    let wnIdx = 0;
    let wuIdx = 0;
    let wcIdx = 0;
    let wiIdx = 0;
    let wbIdx = 0;

    const ox = sc.cx * CHUNK;
    const oz = sc.cz * CHUNK;
    const startY = sc.minY;

    // Cache neighboring chunks for fast boundary reads
    const eastChunk = this.chunks.get(chunkKey(sc.cx + 1, sc.cz));
    const westChunk = this.chunks.get(chunkKey(sc.cx - 1, sc.cz));
    const southChunk = this.chunks.get(chunkKey(sc.cx, sc.cz + 1));
    const northChunk = this.chunks.get(chunkKey(sc.cx, sc.cz - 1));

    const getVoxelDirect = (x: number, y: number, z: number): number => {
      if (y < 0 || y >= WORLD_H) return 0;
      if (x >= 0 && x < CHUNK && z >= 0 && z < CHUNK) {
        return c.data[(y * CHUNK + z) * CHUNK + x];
      }
      if (x >= CHUNK) {
        return eastChunk ? eastChunk.data[(y * CHUNK + z) * CHUNK + (x - CHUNK)] : 0;
      }
      if (x < 0) {
        return westChunk ? westChunk.data[(y * CHUNK + z) * CHUNK + (x + CHUNK)] : 0;
      }
      if (z >= CHUNK) {
        return southChunk ? southChunk.data[(y * CHUNK + (z - CHUNK)) * CHUNK + x] : 0;
      }
      if (z < 0) {
        return northChunk ? northChunk.data[(y * CHUNK + (z + CHUNK)) * CHUNK + x] : 0;
      }
      return 0;
    };

    // Helper for stairs, slabs, and quarter blocks
    const pushStairBox = (
      def: BlockDef,
      wx: number,
      y: number,
      wz: number,
      minX: number,
      minY: number,
      minZ: number,
      maxX: number,
      maxY: number,
      maxZ: number,
      skipBottom: boolean,
    ) => {
      const isTrans = !!def.transparent;
      const sizeX = maxX - minX;
      const sizeY = maxY - minY;
      const sizeZ = maxZ - minZ;

      for (let f = 0; f < 6; f++) {
        const face = FACES[f];
        if (skipBottom && face.dir[1] === -1) continue;

        const nx = wx + (minX + maxX) / 2 + face.dir[0] * (sizeX / 2 + 0.01);
        const ny = y + (minY + maxY) / 2 + face.dir[1] * (sizeY / 2 + 0.01);
        const nz = wz + (minZ + maxZ) / 2 + face.dir[2] * (sizeZ / 2 + 0.01);
        const nid = this.get(Math.floor(nx), Math.floor(ny), Math.floor(nz));
        if (nid !== 0 && nid !== def.id && !BLOCK_BY_ID.get(nid)?.transparent) continue;

        const tile =
          face.dir[1] === 1 ? def.top : face.dir[1] === -1 ? def.bottom : def.side;
        const [u0, v0, u1, v1] = this.atlas.uv(tile);

        if (isTrans) {
          const base = tpIdx / 3;
          const s = tile.includes("leaves") ? 1 : 0;
          for (let i = 0; i < 4; i++) {
            const cn = face.corners[i];
            tpBuf[tpIdx++] = wx + minX + cn[0] * sizeX;
            tpBuf[tpIdx++] = y + minY + cn[1] * sizeY;
            tpBuf[tpIdx++] = wz + minZ + cn[2] * sizeZ;
            tnBuf[tnIdx++] = face.dir[0];
            tnBuf[tnIdx++] = face.dir[1];
            tnBuf[tnIdx++] = face.dir[2];
            const uv = face.uvs[i];
            tuBuf[tuIdx++] = uv[0];
            tuBuf[tuIdx++] = uv[1];
            tbBuf[tbIdx++] = u0;
            tbBuf[tbIdx++] = v0;
            tbBuf[tbIdx++] = u1;
            tbBuf[tbIdx++] = v1;
            tsBuf[tsIdx++] = s;
            const light = def.glow ? Math.max(face.light * 0.98, def.glow) : face.light * 0.98;
            const tint = TINTS[tile];
            if (tint) {
              tcBuf[tcIdx++] = light * tint[0];
              tcBuf[tcIdx++] = light * tint[1];
              tcBuf[tcIdx++] = light * tint[2];
            } else {
              tcBuf[tcIdx++] = light;
              tcBuf[tcIdx++] = light;
              tcBuf[tcIdx++] = light;
            }
          }
          if (face.flip) {
            tiBuf[tiIdx++] = base;
            tiBuf[tiIdx++] = base + 2;
            tiBuf[tiIdx++] = base + 1;
            tiBuf[tiIdx++] = base;
            tiBuf[tiIdx++] = base + 3;
            tiBuf[tiIdx++] = base + 2;
          } else {
            tiBuf[tiIdx++] = base;
            tiBuf[tiIdx++] = base + 1;
            tiBuf[tiIdx++] = base + 2;
            tiBuf[tiIdx++] = base;
            tiBuf[tiIdx++] = base + 2;
            tiBuf[tiIdx++] = base + 3;
          }
        } else {
          const base = pIdx / 3;
          for (let i = 0; i < 4; i++) {
            const cn = face.corners[i];
            pBuf[pIdx++] = wx + minX + cn[0] * sizeX;
            pBuf[pIdx++] = y + minY + cn[1] * sizeY;
            pBuf[pIdx++] = wz + minZ + cn[2] * sizeZ;
            nBuf[nIdx++] = face.dir[0];
            nBuf[nIdx++] = face.dir[1];
            nBuf[nIdx++] = face.dir[2];
            const uv = face.uvs[i];
            uBuf[uIdx++] = uv[0];
            uBuf[uIdx++] = uv[1];
            bBuf[bIdx++] = u0;
            bBuf[bIdx++] = v0;
            bBuf[bIdx++] = u1;
            bBuf[bIdx++] = v1;
            const light = def.glow ? Math.max(face.light * 0.98, def.glow) : face.light * 0.98;
            const tint = TINTS[tile];
            if (tint) {
              cBuf[cIdx++] = light * tint[0];
              cBuf[cIdx++] = light * tint[1];
              cBuf[cIdx++] = light * tint[2];
            } else {
              cBuf[cIdx++] = light;
              cBuf[cIdx++] = light;
              cBuf[cIdx++] = light;
            }
          }
          if (face.flip) {
            iBuf[iIdx++] = base;
            iBuf[iIdx++] = base + 2;
            iBuf[iIdx++] = base + 1;
            iBuf[iIdx++] = base;
            iBuf[iIdx++] = base + 3;
            iBuf[iIdx++] = base + 2;
          } else {
            iBuf[iIdx++] = base;
            iBuf[iIdx++] = base + 1;
            iBuf[iIdx++] = base + 2;
            iBuf[iIdx++] = base;
            iBuf[iIdx++] = base + 2;
            iBuf[iIdx++] = base + 3;
          }
        }
      }
    };

    // ── Liquids: per-voxel surfaces whose corner heights follow the flow level ──
    let wfIdx = 0;
    if (c.liquidCounts[sc.cy] > 0) {
      const blocksLiquidFace = (id: number) => {
        if (id === 0) return false;
        const d = BLOCK_BY_ID.get(id);
        return !!d && !d.transparent && !d.liquid && !d.shape;
      };
      const cellHeight = (x: number, y: number, z: number, id: number) => {
        if (this.get(x, y, z) !== id) return -1;
        if (this.get(x, y + 1, z) === id) return 1;
        return liquidHeightFor(this.getLiquidLevel(x, y, z));
      };
      // Weighted average of the four cells sharing a corner, like Minecraft:
      // sources dominate so pools stay flat, open air pulls edges down.
      const cornerHeight = (x: number, y: number, z: number, id: number, cx: number, cz: number) => {
        let sum = 0;
        let weight = 0;
        for (let ax = x + cx - 1; ax <= x + cx; ax++) {
          for (let az = z + cz - 1; az <= z + cz; az++) {
            const h = cellHeight(ax, y, az, id);
            if (h >= 1) return 1;
            if (h >= 0) {
              const w = h >= LIQUID_SURFACE - 0.001 ? 4 : 1;
              sum += h * w;
              weight += w;
            } else if (!blocksLiquidFace(this.get(ax, y, az))) {
              weight += 1;
            }
          }
        }
        return weight > 0 ? sum / weight : LIQUID_SURFACE;
      };

      for (let y = 0; y < SUB_H; y++) {
        const wy = startY + y;
        for (let z = 0; z < CHUNK; z++) {
          for (let x = 0; x < CHUNK; x++) {
            const id = c.data[(wy * CHUNK + z) * CHUNK + x];
            if (id !== WATER_ID && id !== LAVA_ID) continue;
            const def = BLOCK_BY_ID.get(id);
            if (!def) continue;
            const wx = ox + x;
            const wz = oz + z;
            const h00 = cornerHeight(wx, wy, wz, id, 0, 0);
            const h10 = cornerHeight(wx, wy, wz, id, 1, 0);
            const h01 = cornerHeight(wx, wy, wz, id, 0, 1);
            const h11 = cornerHeight(wx, wy, wz, id, 1, 1);
            // Surface gradient -> flow direction in top-face UV space (u = +x, v = -z).
            const gx = h00 + h01 - (h10 + h11);
            const gz = h00 + h10 - (h01 + h11);
            const isLava = id === LAVA_ID ? 1 : 0;

            for (let f = 0; f < 6; f++) {
              const face = FACES[f];
              const [dx, dy, dz] = face.dir;
              const n = this.get(wx + dx, wy + dy, wz + dz);
              if (n === id || blocksLiquidFace(n)) continue;

              const tile = dy === 1 ? def.top : dy === -1 ? def.bottom : def.side;
              const [u0, v0, u1, v1] = this.atlas.uv(tile);
              const tint = TINTS[tile];
              const base = wpIdx / 3;
              const flowU = dy === 1 ? gx * 0.9 : 0;
              const flowV = dy === 1 ? -gz * 0.9 : dy === 0 ? -1 : 0;

              for (let i = 0; i < 4; i++) {
                const cn = face.corners[i];
                const hy = cn[1] === 1 ? (cn[0] ? (cn[2] ? h11 : h10) : cn[2] ? h01 : h00) : 0;
                wpBuf[wpIdx++] = wx + cn[0];
                wpBuf[wpIdx++] = wy + hy;
                wpBuf[wpIdx++] = wz + cn[2];
                wnBuf[wnIdx++] = dx;
                wnBuf[wnIdx++] = dy;
                wnBuf[wnIdx++] = dz;
                const uv = face.uvs[i];
                wuBuf[wuIdx++] = uv[0];
                wuBuf[wuIdx++] = dy === 0 ? (cn[1] === 1 ? hy : 0) : uv[1];
                wbBuf[wbIdx++] = u0;
                wbBuf[wbIdx++] = v0;
                wbBuf[wbIdx++] = u1;
                wbBuf[wbIdx++] = v1;
                wfBuf[wfIdx++] = flowU;
                wfBuf[wfIdx++] = flowV;
                wfBuf[wfIdx++] = isLava;
                const light = def.glow ? Math.max(face.light, def.glow) : face.light;
                wcBuf[wcIdx++] = tint ? light * tint[0] : light;
                wcBuf[wcIdx++] = tint ? light * tint[1] : light;
                wcBuf[wcIdx++] = tint ? light * tint[2] : light;
              }
              if (face.flip) {
                wiBuf[wiIdx++] = base;
                wiBuf[wiIdx++] = base + 2;
                wiBuf[wiIdx++] = base + 1;
                wiBuf[wiIdx++] = base;
                wiBuf[wiIdx++] = base + 3;
                wiBuf[wiIdx++] = base + 2;
              } else {
                wiBuf[wiIdx++] = base;
                wiBuf[wiIdx++] = base + 1;
                wiBuf[wiIdx++] = base + 2;
                wiBuf[wiIdx++] = base;
                wiBuf[wiIdx++] = base + 2;
                wiBuf[wiIdx++] = base + 3;
              }
            }
          }
        }
      }
    }

    // Special shaped blocks (stairs, slabs) handled directly
    for (let y = 0; y < SUB_H; y++) {
      const wy = startY + y;
      for (let z = 0; z < CHUNK; z++) {
        for (let x = 0; x < CHUNK; x++) {
          const id = c.data[(wy * CHUNK + z) * CHUNK + x];
          if (id === 0) continue;
          const def = BLOCK_BY_ID.get(id);
          if (!def?.shape) continue;
          const wx = ox + x;
          const wz = oz + z;
          if (def.shape === "stairs") {
            pushStairBox(def, wx, wy, wz, 0, 0, 0, 1, 0.5, 1, false);
            pushStairBox(def, wx, wy, wz, 0, 0.5, 0.5, 1, 1, 1, true);
          } else if (def.shape === "slab") {
            pushStairBox(def, wx, wy, wz, 0, 0, 0, 1, 0.5, 1, false);
          } else if (def.shape === "vslab") {
            pushStairBox(def, wx, wy, wz, 0, 0, 0.5, 1, 1, 1, false);
          } else if (def.shape === "quarter") {
            pushStairBox(def, wx, wy, wz, 0, 0, 0.5, 1, 0.5, 1, false);
          }
        }
      }
    }

    // ── Helper to emit a single greedy-merged quad ──
    const emitQuad = (
      def: BlockDef,
      f: number,
      tile: string,
      c0: [number, number, number],
      c1: [number, number, number],
      c2: [number, number, number],
      c3: [number, number, number],
      uv0: [number, number],
      uv1: [number, number],
      uv2: [number, number],
      uv3: [number, number],
      bx0: number, by0: number, bz0: number,
      bx1: number, by1: number, bz1: number,
      bx2: number, by2: number, bz2: number,
      bx3: number, by3: number, bz3: number,
    ) => {
      const face = FACES[f];
      const isLiquid = !!def.liquid;
      const isTrans = !!def.transparent && !isLiquid;
      const [u0, v0, u1, v1] = this.atlas.uv(tile);

      const P = isLiquid ? wpBuf : isTrans ? tpBuf : pBuf;
      const N = isLiquid ? wnBuf : isTrans ? tnBuf : nBuf;
      const U = isLiquid ? wuBuf : isTrans ? tuBuf : uBuf;
      const C = isLiquid ? wcBuf : isTrans ? tcBuf : cBuf;
      const I = isLiquid ? wiBuf : isTrans ? tiBuf : iBuf;
      const B = isLiquid ? wbBuf : isTrans ? tbBuf : bBuf;

      let pPos = isLiquid ? wpIdx : isTrans ? tpIdx : pIdx;
      let nPos = isLiquid ? wnIdx : isTrans ? tnIdx : nIdx;
      let uPos = isLiquid ? wuIdx : isTrans ? tuIdx : uIdx;
      let cPos = isLiquid ? wcIdx : isTrans ? tcIdx : cIdx;
      let iPos = isLiquid ? wiIdx : isTrans ? tiIdx : iIdx;
      let bPos = isLiquid ? wbIdx : isTrans ? tbIdx : bIdx;

      const base = pPos / 3;
      const s = isTrans && tile.includes("leaves") ? 1 : 0;
      const tint = TINTS[tile];

      const corners = [c0, c1, c2, c3];
      const uvs = [uv0, uv1, uv2, uv3];
      const voxels = [
        [bx0, by0, bz0],
        [bx1, by1, bz1],
        [bx2, by2, bz2],
        [bx3, by3, bz3],
      ];

      for (let i = 0; i < 4; i++) {
        const cn = corners[i];
        P[pPos++] = cn[0];
        P[pPos++] = cn[1];
        P[pPos++] = cn[2];

        N[nPos++] = face.dir[0];
        N[nPos++] = face.dir[1];
        N[nPos++] = face.dir[2];

        const uv = uvs[i];
        U[uPos++] = uv[0];
        U[uPos++] = uv[1];

        B[bPos++] = u0;
        B[bPos++] = v0;
        B[bPos++] = u1;
        B[bPos++] = v1;

        if (isTrans) tsBuf[tsIdx++] = s;

        const vBlock = voxels[i];
        const ao = this.getVertexAO(c, vBlock[0], vBlock[1], vBlock[2], f, i);
        const light = def.glow ? Math.max(face.light * ao, def.glow) : face.light * ao;

        if (tint) {
          C[cPos++] = light * tint[0];
          C[cPos++] = light * tint[1];
          C[cPos++] = light * tint[2];
        } else {
          C[cPos++] = light;
          C[cPos++] = light;
          C[cPos++] = light;
        }
      }

      if (face.flip) {
        I[iPos++] = base;
        I[iPos++] = base + 2;
        I[iPos++] = base + 1;
        I[iPos++] = base;
        I[iPos++] = base + 3;
        I[iPos++] = base + 2;
      } else {
        I[iPos++] = base;
        I[iPos++] = base + 1;
        I[iPos++] = base + 2;
        I[iPos++] = base;
        I[iPos++] = base + 2;
        I[iPos++] = base + 3;
      }

      if (isLiquid) {
        wpIdx = pPos; wnIdx = nPos; wuIdx = uPos; wcIdx = cPos; wiIdx = iPos; wbIdx = bPos;
      } else if (isTrans) {
        tpIdx = pPos; tnIdx = nPos; tuIdx = uPos; tcIdx = cPos; tiIdx = iPos; tbIdx = bPos;
      } else {
        pIdx = pPos; nIdx = nPos; uIdx = uPos; cIdx = cPos; iIdx = iPos; bIdx = bPos;
      }
    };

    // ── 2D Slice Greedy Meshing Across All 6 Faces ──
    const greedy = this.greedyMeshing;

    // 1. Face 2: +Y (Top)
    for (let y = 0; y < SUB_H; y++) {
      const wy = startY + y;
      if (wy >= WORLD_H - 1) continue;
      sliceMask.fill(0);
      sliceVisited.fill(0);
      let count = 0;
      for (let v = 0; v < CHUNK; v++) {
        for (let u = 0; u < CHUNK; u++) {
          const id = c.data[(wy * CHUNK + v) * CHUNK + u];
          if (id === 0) continue;
          const def = BLOCK_BY_ID.get(id);
          if (!def || def.shape || def.liquid) continue;
          const nid = getVoxelDirect(u, wy + 1, v);
          if (nid !== 0) {
            const ndef = BLOCK_BY_ID.get(nid);
            if (!ndef?.transparent && !ndef?.liquid) continue;
            if (nid === id) continue;
          }
          sliceMask[v * 16 + u] = id;
          count++;
        }
      }
      if (count === 0) continue;
      for (let v = 0; v < CHUNK; v++) {
        for (let u = 0; u < CHUNK; u++) {
          const idx = v * 16 + u;
          if (sliceVisited[idx] || sliceMask[idx] === 0) continue;
          const id = sliceMask[idx];
          const def = BLOCK_BY_ID.get(id)!;
          let w = 1;
          let d = 1;
          if (greedy) {
            while (u + w < CHUNK && !sliceVisited[v * 16 + (u + w)] && sliceMask[v * 16 + (u + w)] === id) w++;
            let canExpand = true;
            while (v + d < CHUNK) {
              for (let k = 0; k < w; k++) {
                const checkIdx = (v + d) * 16 + (u + k);
                if (sliceVisited[checkIdx] || sliceMask[checkIdx] !== id) { canExpand = false; break; }
              }
              if (!canExpand) break;
              d++;
            }
          }
          for (let dv = 0; dv < d; dv++) {
            for (let du = 0; du < w; du++) sliceVisited[(v + dv) * 16 + (u + du)] = 1;
          }
          const wx = ox + u;
          const wz = oz + v;
          const topY = wy + 1;
          emitQuad(
            def, 2, def.top,
            [wx, topY, wz + d],
            [wx + w, topY, wz + d],
            [wx + w, topY, wz],
            [wx, topY, wz],
            [0, 0], [w, 0], [w, d], [0, d],
            wx, wy, wz + d - 1,
            wx + w - 1, wy, wz + d - 1,
            wx + w - 1, wy, wz,
            wx, wy, wz,
          );
        }
      }
    }

    // 2. Face 3: -Y (Bottom)
    for (let y = 0; y < SUB_H; y++) {
      const wy = startY + y;
      if (wy === 0) continue; // Bedrock bottom culled
      sliceMask.fill(0);
      sliceVisited.fill(0);
      let count = 0;
      for (let v = 0; v < CHUNK; v++) {
        for (let u = 0; u < CHUNK; u++) {
          const id = c.data[(wy * CHUNK + v) * CHUNK + u];
          if (id === 0) continue;
          const def = BLOCK_BY_ID.get(id);
          if (!def || def.shape || def.liquid) continue;
          const nid = getVoxelDirect(u, wy - 1, v);
          if (nid !== 0) {
            const ndef = BLOCK_BY_ID.get(nid);
            if (!ndef?.transparent && !ndef?.liquid) continue;
            if (nid === id) continue;
          }
          sliceMask[v * 16 + u] = id;
          count++;
        }
      }
      if (count === 0) continue;
      for (let v = 0; v < CHUNK; v++) {
        for (let u = 0; u < CHUNK; u++) {
          const idx = v * 16 + u;
          if (sliceVisited[idx] || sliceMask[idx] === 0) continue;
          const id = sliceMask[idx];
          const def = BLOCK_BY_ID.get(id)!;
          let w = 1;
          let d = 1;
          if (greedy) {
            while (u + w < CHUNK && !sliceVisited[v * 16 + (u + w)] && sliceMask[v * 16 + (u + w)] === id) w++;
            let canExpand = true;
            while (v + d < CHUNK) {
              for (let k = 0; k < w; k++) {
                const checkIdx = (v + d) * 16 + (u + k);
                if (sliceVisited[checkIdx] || sliceMask[checkIdx] !== id) { canExpand = false; break; }
              }
              if (!canExpand) break;
              d++;
            }
          }
          for (let dv = 0; dv < d; dv++) {
            for (let du = 0; du < w; du++) sliceVisited[(v + dv) * 16 + (u + du)] = 1;
          }
          const wx = ox + u;
          const wz = oz + v;
          emitQuad(
            def, 3, def.bottom,
            [wx, wy, wz],
            [wx + w, wy, wz],
            [wx + w, wy, wz + d],
            [wx, wy, wz + d],
            [0, 0], [w, 0], [w, d], [0, d],
            wx, wy, wz,
            wx + w - 1, wy, wz,
            wx + w - 1, wy, wz + d - 1,
            wx, wy, wz + d - 1,
          );
        }
      }
    }

    // 3. Face 4: +Z (South)
    for (let z = 0; z < CHUNK; z++) {
      sliceMask.fill(0);
      sliceVisited.fill(0);
      let count = 0;
      for (let y = 0; y < SUB_H; y++) {
        const wy = startY + y;
        for (let u = 0; u < CHUNK; u++) {
          const id = c.data[(wy * CHUNK + z) * CHUNK + u];
          if (id === 0) continue;
          const def = BLOCK_BY_ID.get(id);
          if (!def || def.shape || def.liquid) continue;
          const nid = getVoxelDirect(u, wy, z + 1);
          if (nid !== 0) {
            const ndef = BLOCK_BY_ID.get(nid);
            if (!ndef?.transparent && !ndef?.liquid) continue;
            if (nid === id) continue;
          }
          sliceMask[y * 16 + u] = id;
          count++;
        }
      }
      if (count === 0) continue;
      for (let y = 0; y < SUB_H; y++) {
        for (let u = 0; u < CHUNK; u++) {
          const idx = y * 16 + u;
          if (sliceVisited[idx] || sliceMask[idx] === 0) continue;
          const id = sliceMask[idx];
          const def = BLOCK_BY_ID.get(id)!;
          let w = 1;
          let h = 1;
          if (greedy) {
            while (u + w < CHUNK && !sliceVisited[y * 16 + (u + w)] && sliceMask[y * 16 + (u + w)] === id) w++;
            let canExpand = true;
            while (y + h < SUB_H) {
              for (let k = 0; k < w; k++) {
                const checkIdx = (y + h) * 16 + (u + k);
                if (sliceVisited[checkIdx] || sliceMask[checkIdx] !== id) { canExpand = false; break; }
              }
              if (!canExpand) break;
              h++;
            }
          }
          for (let dy = 0; dy < h; dy++) {
            for (let du = 0; du < w; du++) sliceVisited[(y + dy) * 16 + (u + du)] = 1;
          }
          const wx = ox + u;
          const wy = startY + y;
          const southZ = oz + z + 1;
          emitQuad(
            def, 4, def.side,
            [wx, wy, southZ],
            [wx, wy + h, southZ],
            [wx + w, wy + h, southZ],
            [wx + w, wy, southZ],
            [0, 0], [0, h], [w, h], [w, 0],
            wx, wy, oz + z,
            wx, wy + h - 1, oz + z,
            wx + w - 1, wy + h - 1, oz + z,
            wx + w - 1, wy, oz + z,
          );
        }
      }
    }

    // 4. Face 5: -Z (North)
    for (let z = 0; z < CHUNK; z++) {
      sliceMask.fill(0);
      sliceVisited.fill(0);
      let count = 0;
      for (let y = 0; y < SUB_H; y++) {
        const wy = startY + y;
        for (let u = 0; u < CHUNK; u++) {
          const id = c.data[(wy * CHUNK + z) * CHUNK + u];
          if (id === 0) continue;
          const def = BLOCK_BY_ID.get(id);
          if (!def || def.shape || def.liquid) continue;
          const nid = getVoxelDirect(u, wy, z - 1);
          if (nid !== 0) {
            const ndef = BLOCK_BY_ID.get(nid);
            if (!ndef?.transparent && !ndef?.liquid) continue;
            if (nid === id) continue;
          }
          sliceMask[y * 16 + u] = id;
          count++;
        }
      }
      if (count === 0) continue;
      for (let y = 0; y < SUB_H; y++) {
        for (let u = 0; u < CHUNK; u++) {
          const idx = y * 16 + u;
          if (sliceVisited[idx] || sliceMask[idx] === 0) continue;
          const id = sliceMask[idx];
          const def = BLOCK_BY_ID.get(id)!;
          let w = 1;
          let h = 1;
          if (greedy) {
            while (u + w < CHUNK && !sliceVisited[y * 16 + (u + w)] && sliceMask[y * 16 + (u + w)] === id) w++;
            let canExpand = true;
            while (y + h < SUB_H) {
              for (let k = 0; k < w; k++) {
                const checkIdx = (y + h) * 16 + (u + k);
                if (sliceVisited[checkIdx] || sliceMask[checkIdx] !== id) { canExpand = false; break; }
              }
              if (!canExpand) break;
              h++;
            }
          }
          for (let dy = 0; dy < h; dy++) {
            for (let du = 0; du < w; du++) sliceVisited[(y + dy) * 16 + (u + du)] = 1;
          }
          const wx = ox + u;
          const wy = startY + y;
          const northZ = oz + z;
          emitQuad(
            def, 5, def.side,
            [wx + w, wy, northZ],
            [wx + w, wy + h, northZ],
            [wx, wy + h, northZ],
            [wx, wy, northZ],
            [0, 0], [0, h], [w, h], [w, 0],
            wx + w - 1, wy, oz + z,
            wx + w - 1, wy + h - 1, oz + z,
            wx, wy + h - 1, oz + z,
            wx, wy, oz + z,
          );
        }
      }
    }

    // 5. Face 0: +X (East)
    for (let x = 0; x < CHUNK; x++) {
      sliceMask.fill(0);
      sliceVisited.fill(0);
      let count = 0;
      for (let y = 0; y < SUB_H; y++) {
        const wy = startY + y;
        for (let u = 0; u < CHUNK; u++) {
          const id = c.data[(wy * CHUNK + u) * CHUNK + x];
          if (id === 0) continue;
          const def = BLOCK_BY_ID.get(id);
          if (!def || def.shape || def.liquid) continue;
          const nid = getVoxelDirect(x + 1, wy, u);
          if (nid !== 0) {
            const ndef = BLOCK_BY_ID.get(nid);
            if (!ndef?.transparent && !ndef?.liquid) continue;
            if (nid === id) continue;
          }
          sliceMask[y * 16 + u] = id;
          count++;
        }
      }
      if (count === 0) continue;
      for (let y = 0; y < SUB_H; y++) {
        for (let u = 0; u < CHUNK; u++) {
          const idx = y * 16 + u;
          if (sliceVisited[idx] || sliceMask[idx] === 0) continue;
          const id = sliceMask[idx];
          const def = BLOCK_BY_ID.get(id)!;
          let d = 1;
          let h = 1;
          if (greedy) {
            while (u + d < CHUNK && !sliceVisited[y * 16 + (u + d)] && sliceMask[y * 16 + (u + d)] === id) d++;
            let canExpand = true;
            while (y + h < SUB_H) {
              for (let k = 0; k < d; k++) {
                const checkIdx = (y + h) * 16 + (u + k);
                if (sliceVisited[checkIdx] || sliceMask[checkIdx] !== id) { canExpand = false; break; }
              }
              if (!canExpand) break;
              h++;
            }
          }
          for (let dy = 0; dy < h; dy++) {
            for (let du = 0; du < d; du++) sliceVisited[(y + dy) * 16 + (u + du)] = 1;
          }
          const wx = ox + x + 1;
          const wy = startY + y;
          const wz = oz + u;
          emitQuad(
            def, 0, def.side,
            [wx, wy, wz + d],
            [wx, wy + h, wz + d],
            [wx, wy + h, wz],
            [wx, wy, wz],
            [0, 0], [0, h], [d, h], [d, 0],
            ox + x, wy, wz + d - 1,
            ox + x, wy + h - 1, wz + d - 1,
            ox + x, wy + h - 1, wz,
            ox + x, wy, wz,
          );
        }
      }
    }

    // 6. Face 1: -X (West)
    for (let x = 0; x < CHUNK; x++) {
      sliceMask.fill(0);
      sliceVisited.fill(0);
      let count = 0;
      for (let y = 0; y < SUB_H; y++) {
        const wy = startY + y;
        for (let u = 0; u < CHUNK; u++) {
          const id = c.data[(wy * CHUNK + u) * CHUNK + x];
          if (id === 0) continue;
          const def = BLOCK_BY_ID.get(id);
          if (!def || def.shape || def.liquid) continue;
          const nid = getVoxelDirect(x - 1, wy, u);
          if (nid !== 0) {
            const ndef = BLOCK_BY_ID.get(nid);
            if (!ndef?.transparent && !ndef?.liquid) continue;
            if (nid === id) continue;
          }
          sliceMask[y * 16 + u] = id;
          count++;
        }
      }
      if (count === 0) continue;
      for (let y = 0; y < SUB_H; y++) {
        for (let u = 0; u < CHUNK; u++) {
          const idx = y * 16 + u;
          if (sliceVisited[idx] || sliceMask[idx] === 0) continue;
          const id = sliceMask[idx];
          const def = BLOCK_BY_ID.get(id)!;
          let d = 1;
          let h = 1;
          if (greedy) {
            while (u + d < CHUNK && !sliceVisited[y * 16 + (u + d)] && sliceMask[y * 16 + (u + d)] === id) d++;
            let canExpand = true;
            while (y + h < SUB_H) {
              for (let k = 0; k < d; k++) {
                const checkIdx = (y + h) * 16 + (u + k);
                if (sliceVisited[checkIdx] || sliceMask[checkIdx] !== id) { canExpand = false; break; }
              }
              if (!canExpand) break;
              h++;
            }
          }
          for (let dy = 0; dy < h; dy++) {
            for (let du = 0; du < d; du++) sliceVisited[(y + dy) * 16 + (u + du)] = 1;
          }
          const wx = ox + x;
          const wy = startY + y;
          const wz = oz + u;
          emitQuad(
            def, 1, def.side,
            [wx, wy, wz],
            [wx, wy + h, wz],
            [wx, wy + h, wz + d],
            [wx, wy, wz + d],
            [0, 0], [0, h], [d, h], [d, 0],
            ox + x, wy, wz,
            ox + x, wy + h - 1, wz,
            ox + x, wy + h - 1, wz + d - 1,
            ox + x, wy, wz + d - 1,
          );
        }
      }
    }

    // Helper to build/reuse GPU BufferGeometry
    const makeGeom = (
      P: Float32Array,
      pCount: number,
      N: Float32Array,
      nCount: number,
      U: Float32Array,
      uCount: number,
      C: Float32Array,
      cCount: number,
      I: Uint32Array,
      iCount: number,
      B: Float32Array,
      bCount: number,
      existing?: THREE.BufferGeometry | null,
    ) => {
      let g = existing;
      if (!g) {
        g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.BufferAttribute(P.slice(0, pCount), 3));
        g.setAttribute("normal", new THREE.BufferAttribute(N.slice(0, nCount), 3));
        g.setAttribute("uv", new THREE.BufferAttribute(U.slice(0, uCount), 2));
        g.setAttribute("color", new THREE.BufferAttribute(C.slice(0, cCount), 3));
        g.setAttribute("aAtlasBounds", new THREE.BufferAttribute(B.slice(0, bCount), 4));
        g.setIndex(new THREE.BufferAttribute(I.slice(0, iCount), 1));
      } else {
        const posAttr = g.attributes.position as THREE.BufferAttribute;
        if (posAttr && posAttr.array.length >= pCount) {
          (posAttr.array as Float32Array).set(P.subarray(0, pCount));
          posAttr.needsUpdate = true;
          const normAttr = g.attributes.normal as THREE.BufferAttribute;
          (normAttr.array as Float32Array).set(N.subarray(0, nCount));
          normAttr.needsUpdate = true;
          const uvAttr = g.attributes.uv as THREE.BufferAttribute;
          (uvAttr.array as Float32Array).set(U.subarray(0, uCount));
          uvAttr.needsUpdate = true;
          const colAttr = g.attributes.color as THREE.BufferAttribute;
          (colAttr.array as Float32Array).set(C.subarray(0, cCount));
          colAttr.needsUpdate = true;
          const bAttr = g.attributes.aAtlasBounds as THREE.BufferAttribute;
          (bAttr.array as Float32Array).set(B.subarray(0, bCount));
          bAttr.needsUpdate = true;
          const idxAttr = g.index as THREE.BufferAttribute;
          (idxAttr.array as Uint32Array).set(I.subarray(0, iCount));
          idxAttr.needsUpdate = true;
          g.setDrawRange(0, iCount);
        } else {
          g.dispose();
          g = new THREE.BufferGeometry();
          g.setAttribute("position", new THREE.BufferAttribute(P.slice(0, pCount), 3));
          g.setAttribute("normal", new THREE.BufferAttribute(N.slice(0, nCount), 3));
          g.setAttribute("uv", new THREE.BufferAttribute(U.slice(0, uCount), 2));
          g.setAttribute("color", new THREE.BufferAttribute(C.slice(0, cCount), 3));
          g.setAttribute("aAtlasBounds", new THREE.BufferAttribute(B.slice(0, bCount), 4));
          g.setIndex(new THREE.BufferAttribute(I.slice(0, iCount), 1));
        }
      }
      g.computeBoundingSphere();
      g.computeBoundingBox();
      return g;
    };

    const camDist = camera ? camera.position.distanceTo(sc.center) : 0;
    const isNearCamera = camDist < 36;

    // 1. Opaque mesh
    if (pIdx > 0) {
      if (!sc.mesh) {
        const geom = makeGeom(pBuf, pIdx, nBuf, nIdx, uBuf, uIdx, cBuf, cIdx, iBuf, iIdx, bBuf, bIdx);
        sc.mesh = new THREE.Mesh(geom, this.material);
        sc.mesh.receiveShadow = true;
        sc.mesh.frustumCulled = true;
        sc.group.add(sc.mesh);
      } else {
        sc.mesh.geometry = makeGeom(
          pBuf, pIdx, nBuf, nIdx, uBuf, uIdx, cBuf, cIdx, iBuf, iIdx, bBuf, bIdx,
          sc.mesh.geometry,
        );
      }
      if (sc.mesh.castShadow !== isNearCamera) sc.mesh.castShadow = isNearCamera;
      sc.mesh.visible = true;
    } else if (sc.mesh) {
      sc.mesh.visible = false;
    }

    // 2. Transparent mesh (leaves, glass)
    if (tpIdx > 0) {
      if (!sc.transparentMesh) {
        const geom = makeGeom(
          tpBuf, tpIdx, tnBuf, tnIdx, tuBuf, tuIdx, tcBuf, tcIdx, tiBuf, tiIdx, tbBuf, tbIdx,
        );
        geom.setAttribute("aSway", new THREE.BufferAttribute(tsBuf.slice(0, tsIdx), 1));
        sc.transparentMesh = new THREE.Mesh(geom, this.transparentMaterial);
        sc.transparentMesh.receiveShadow = true;
        sc.transparentMesh.frustumCulled = true;
        sc.group.add(sc.transparentMesh);
      } else {
        sc.transparentMesh.geometry = makeGeom(
          tpBuf, tpIdx, tnBuf, tnIdx, tuBuf, tuIdx, tcBuf, tcIdx, tiBuf, tiIdx, tbBuf, tbIdx,
          sc.transparentMesh.geometry,
        );
        sc.transparentMesh.geometry.setAttribute(
          "aSway",
          new THREE.BufferAttribute(tsBuf.slice(0, tsIdx), 1),
        );
      }
      if (sc.transparentMesh.castShadow !== isNearCamera) sc.transparentMesh.castShadow = isNearCamera;
      sc.transparentMesh.visible = true;
    } else if (sc.transparentMesh) {
      sc.transparentMesh.visible = false;
    }

    // 3. Liquid / Water mesh
    if (wpIdx > 0) {
      if (!sc.waterMesh) {
        const geom = makeGeom(
          wpBuf, wpIdx, wnBuf, wnIdx, wuBuf, wuIdx, wcBuf, wcIdx, wiBuf, wiIdx, wbBuf, wbIdx,
        );
        sc.waterMesh = new THREE.Mesh(geom, this.waterMaterial);
        sc.waterMesh.receiveShadow = true;
        sc.waterMesh.frustumCulled = true;
        sc.waterMesh.renderOrder = 2;
        sc.group.add(sc.waterMesh);
      } else {
        sc.waterMesh.geometry = makeGeom(
          wpBuf, wpIdx, wnBuf, wnIdx, wuBuf, wuIdx, wcBuf, wcIdx, wiBuf, wiIdx, wbBuf, wbIdx,
          sc.waterMesh.geometry,
        );
      }
      sc.waterMesh.geometry.setAttribute("aFlow", new THREE.BufferAttribute(wfBuf.slice(0, wfIdx), 3));
      sc.waterMesh.visible = true;
    } else if (sc.waterMesh) {
      sc.waterMesh.visible = false;
    }

    // Dynamic scene-graph attachment: Only keep subchunks with geometry in this.group
    const hasAnyMesh = pIdx > 0 || tpIdx > 0 || wpIdx > 0;
    if (hasAnyMesh) {
      sc.empty = false;
      if (sc.group.parent !== this.group) {
        this.group.add(sc.group);
      }
    } else {
      sc.empty = true;
      if (sc.group.parent === this.group) {
        this.group.remove(sc.group);
      }
    }
  }

  dispose() {
    for (const c of this.chunks.values()) {
      c.subChunks.forEach((sc) => sc.dispose());
    }
    this.material.dispose();
    this.transparentMaterial.dispose();
    this.waterMaterial.dispose();
    this.chunks.clear();
    this.activeChunks.clear();
    this.dirtySubChunks.clear();
    this.group.clear();
  }
}
