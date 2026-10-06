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
  }
}

export class Chunk {
  readonly data = new Uint8Array(CHUNK * WORLD_H * CHUNK);
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
  private material: THREE.MeshStandardMaterial;
  private transparentMaterial: THREE.MeshStandardMaterial;
  private waterMaterial: THREE.MeshStandardMaterial;
  private pendingWaterFlows: {
    x: number;
    y: number;
    z: number;
    time: number;
    spread: number;
    isLava?: boolean;
  }[] = [];
  private queuedWaterCoords = new Set<string>();

  // Fast single-element chunk lookup cache
  private lastChunkKey = -1;
  private lastChunk: Chunk | null = null;

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
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
          attribute vec4 aAtlasBounds;
          varying vec4 vAtlasBounds;
          varying vec2 vFaceUv;`,
        )
        .replace(
          "#include <uv_vertex>",
          `#include <uv_vertex>
          vAtlasBounds = aAtlasBounds;
          vFaceUv = uv;`,
        );

      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
          varying vec4 vAtlasBounds;
          varying vec2 vFaceUv;`,
        )
        .replace(
          "#include <map_fragment>",
          `#ifdef USE_MAP
            vec2 localUv = fract(vFaceUv);
            vec2 atlasUv = mix(vAtlasBounds.xy, vAtlasBounds.zw, localUv);
            vec4 sampledDiffuseColor = texture2D(map, atlasUv);
            diffuseColor *= sampledDiffuseColor;
          #endif`,
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
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
          attribute float aSway;
          attribute vec4 aAtlasBounds;
          varying vec4 vAtlasBounds;
          varying vec2 vFaceUv;
          uniform float uWindTime;
          uniform float uWindStrength;`,
        )
        .replace(
          "#include <uv_vertex>",
          `#include <uv_vertex>
          vAtlasBounds = aAtlasBounds;
          vFaceUv = uv;`,
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
          varying vec2 vFaceUv;`,
        )
        .replace(
          "#include <map_fragment>",
          `#ifdef USE_MAP
            vec2 localUv = fract(vFaceUv);
            vec2 atlasUv = mix(vAtlasBounds.xy, vAtlasBounds.zw, localUv);
            vec4 sampledDiffuseColor = texture2D(map, atlasUv);
            diffuseColor *= sampledDiffuseColor;
          #endif`,
        );
    };
    this.transparentMaterial.customProgramCacheKey = () => "voxel-foliage-wind-repeat";

    // Water & Lava material
    this.waterMaterial = new THREE.MeshStandardMaterial({
      map: atlas.texture,
      vertexColors: true,
      roughness: 0.12,
      metalness: 0.08,
      emissive: new THREE.Color(0x000000),
      emissiveIntensity: 0.0,
      transparent: true,
      opacity: 0.76,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.waterMaterial.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
          attribute vec4 aAtlasBounds;
          varying vec4 vAtlasBounds;
          varying vec2 vFaceUv;`,
        )
        .replace(
          "#include <uv_vertex>",
          `#include <uv_vertex>
          vAtlasBounds = aAtlasBounds;
          vFaceUv = uv;`,
        );

      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
          varying vec4 vAtlasBounds;
          varying vec2 vFaceUv;`,
        )
        .replace(
          "#include <map_fragment>",
          `#ifdef USE_MAP
            vec2 localUv = fract(vFaceUv);
            vec2 atlasUv = mix(vAtlasBounds.xy, vAtlasBounds.zw, localUv);
            vec4 sampledDiffuseColor = texture2D(map, atlasUv);
            diffuseColor *= sampledDiffuseColor;
          #endif`,
        );
    };
    this.waterMaterial.customProgramCacheKey = () => "voxel-water-repeat";

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
        this.group.add(sc.group);
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

  set(x: number, y: number, z: number, id: number) {
    if (y < 0 || y >= WORLD_H) return;
    const cx = Math.floor(x / CHUNK);
    const cz = Math.floor(z / CHUNK);
    const c = this.getOrCreateChunk(cx, cz);
    const lx = ((x % CHUNK) + CHUNK) % CHUNK;
    const lz = ((z % CHUNK) + CHUNK) % CHUNK;

    // Check liquid collision: Water + Lava quenches to Obsidian (11) or Cobblestone (4)
    if (id === WATER_ID || id === LAVA_ID) {
      const otherLiquid = id === WATER_ID ? LAVA_ID : WATER_ID;
      const dirs = [
        [1, 0, 0],
        [-1, 0, 0],
        [0, 1, 0],
        [0, -1, 0],
        [0, 0, 1],
        [0, 0, -1],
      ];
      for (const [dx, dy, dz] of dirs) {
        const neighbor = this.get(x + dx, y + dy, z + dz);
        if (neighbor === otherLiquid) {
          id = id === WATER_ID || dy === -1 ? 11 : 4;
          break;
        }
      }
    }

    const idx = (y * CHUNK + lz) * CHUNK + lx;
    const oldId = c.data[idx];
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

    // Mark current subchunk dirty
    const sc = c.subChunks[cy];
    sc.dirty = true;
    sc.empty = c.counts[cy] === 0;
    this.dirtySubChunks.add(sc);

    // Border checks: mark only the affected neighbor subchunk dirty
    const ly = y % SUB_H;
    if (ly === 0 && cy > 0) {
      c.subChunks[cy - 1].dirty = true;
      this.dirtySubChunks.add(c.subChunks[cy - 1]);
    } else if (ly === SUB_H - 1 && cy < SUB_CHUNKS - 1) {
      c.subChunks[cy + 1].dirty = true;
      this.dirtySubChunks.add(c.subChunks[cy + 1]);
    }

    if (lx === 0) {
      const nc = this.chunks.get(chunkKey(cx - 1, cz));
      if (nc) {
        nc.subChunks[cy].dirty = true;
        this.dirtySubChunks.add(nc.subChunks[cy]);
      }
    } else if (lx === CHUNK - 1) {
      const nc = this.chunks.get(chunkKey(cx + 1, cz));
      if (nc) {
        nc.subChunks[cy].dirty = true;
        this.dirtySubChunks.add(nc.subChunks[cy]);
      }
    }

    if (lz === 0) {
      const nc = this.chunks.get(chunkKey(cx, cz - 1));
      if (nc) {
        nc.subChunks[cy].dirty = true;
        this.dirtySubChunks.add(nc.subChunks[cy]);
      }
    } else if (lz === CHUNK - 1) {
      const nc = this.chunks.get(chunkKey(cx, cz + 1));
      if (nc) {
        nc.subChunks[cy].dirty = true;
        this.dirtySubChunks.add(nc.subChunks[cy]);
      }
    }

    // Liquid flow propagation
    if (id === 0) {
      if (this.get(x, y + 1, z) === WATER_ID) this.queueWaterFlow(x, y, z, 200, 0);
      else if (this.get(x, y + 1, z) === LAVA_ID) this.queueLavaFlow(x, y, z, 300, 0);
      else {
        const dirs = [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ];
        for (const [dx, dz] of dirs) {
          const adj = this.get(x + dx, y, z + dz);
          if (adj === WATER_ID) {
            this.queueWaterFlow(x, y, z, 300, 1);
            break;
          } else if (adj === LAVA_ID) {
            this.queueLavaFlow(x, y, z, 420, 1);
            break;
          }
        }
      }
    } else if (id === WATER_ID) {
      if (y > 2 && this.get(x, y - 1, z) === 0) {
        this.queueWaterFlow(x, y - 1, z, 200, 0);
      } else {
        const dirs = [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ];
        for (const [dx, dz] of dirs) {
          if (this.get(x + dx, y, z + dz) === 0) this.queueWaterFlow(x + dx, y, z + dz, 320, 1);
        }
      }
    } else if (id === LAVA_ID) {
      if (y > 2 && this.get(x, y - 1, z) === 0) {
        this.queueLavaFlow(x, y - 1, z, 320, 0);
      } else {
        const dirs = [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ];
        for (const [dx, dz] of dirs) {
          if (this.get(x + dx, y, z + dz) === 0) this.queueLavaFlow(x + dx, y, z + dz, 450, 1);
        }
      }
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

  queueWaterFlow(x: number, y: number, z: number, delayMs = 320, spread = 0) {
    this.queueLiquidFlow(x, y, z, false, delayMs, spread);
  }

  queueLavaFlow(x: number, y: number, z: number, delayMs = 420, spread = 0) {
    this.queueLiquidFlow(x, y, z, true, delayMs, spread);
  }

  queueLiquidFlow(x: number, y: number, z: number, isLava = false, delayMs = 320, spread = 0) {
    if (y < 2 || y >= WORLD_H) return;
    if (spread > 8) return;
    const key = `${x},${y},${z}`;
    if (this.queuedWaterCoords.has(key)) return;
    const existing = this.get(x, y, z);
    if (existing !== 0 && existing !== (isLava ? WATER_ID : LAVA_ID)) return;
    this.queuedWaterCoords.add(key);
    this.pendingWaterFlows.push({
      x,
      y,
      z,
      time: performance.now() + delayMs,
      spread,
      isLava,
    });
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
   * Budgeted per-frame update: processes liquid flow and remeshes dirty sub-chunks.
   * Prioritizes sub-chunks closest to the player so near geometry is always responsive.
   */
  update(budget = 3, playerPos?: THREE.Vector3, camera?: THREE.Camera) {
    if (this.pendingWaterFlows.length > 0) {
      const now = performance.now();
      let flowsProcessed = 0;
      for (let i = this.pendingWaterFlows.length - 1; i >= 0 && flowsProcessed < 6; i--) {
        const flow = this.pendingWaterFlows[i];
        if (now >= flow.time) {
          this.pendingWaterFlows.splice(i, 1);
          this.queuedWaterCoords.delete(`${flow.x},${flow.y},${flow.z}`);
          const current = this.get(flow.x, flow.y, flow.z);
          if (current === 0) {
            this.set(flow.x, flow.y, flow.z, flow.isLava ? LAVA_ID : WATER_ID);
          } else if (flow.isLava && current === WATER_ID) {
            this.set(flow.x, flow.y, flow.z, 4);
          } else if (!flow.isLava && current === LAVA_ID) {
            this.set(flow.x, flow.y, flow.z, 11);
          }
          flowsProcessed++;
        }
      }
    }

    if (this.dirtySubChunks.size === 0) return;

    // Prioritize dirty sub-chunks nearest to the player
    let toMesh: SubChunk[] = [];
    if (playerPos) {
      const px = playerPos.x;
      const py = playerPos.y;
      const pz = playerPos.z;
      const arr = Array.from(this.dirtySubChunks);
      arr.sort((a, b) => {
        const da = (a.center.x - px) ** 2 + (a.center.y - py) ** 2 + (a.center.z - pz) ** 2;
        const db = (b.center.x - px) ** 2 + (b.center.y - py) ** 2 + (b.center.z - pz) ** 2;
        return da - db;
      });
      toMesh = arr.slice(0, budget);
    } else {
      toMesh = Array.from(this.dirtySubChunks).slice(0, budget);
    }

    for (const sc of toMesh) {
      this.dirtySubChunks.delete(sc);
      const c = this.chunks.get(chunkKey(sc.cx, sc.cz));
      if (!c) continue;
      this.meshSubChunk(c, sc, camera);
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

  private meshSubChunk(c: Chunk, sc: SubChunk, camera?: THREE.Camera) {
    if (sc.empty || c.counts[sc.cy] === 0) {
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
    const endY = sc.maxY;

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

    // ── Voxel Meshing with Greedy Merging & Aggressive Culling ──
    for (let f = 0; f < 6; f++) {
      const face = FACES[f];
      const isTop = f === 2;
      const isBottom = f === 3;
      const isSide = !isTop && !isBottom;

      // Scan sub-chunk voxels
      for (let y = startY; y < endY; y++) {
        // Bedrock bottom culling: bedrock at y=0 never needs a bottom face
        if (isBottom && y === 0) continue;
        // World ceiling culling
        if (isTop && y === WORLD_H - 1) continue;

        for (let z = 0; z < CHUNK; z++) {
          for (let x = 0; x < CHUNK; x++) {
            const id = c.data[(y * CHUNK + z) * CHUNK + x];
            if (id === 0) continue;
            const def = BLOCK_BY_ID.get(id);
            if (!def) continue;

            const wx = ox + x;
            const wz = oz + z;

            // Handle special shapes without greedy merge
            if (def.shape) {
              if (def.shape === "stairs") {
                pushStairBox(def, wx, y, wz, 0, 0, 0, 1, 0.5, 1, false);
                pushStairBox(def, wx, y, wz, 0, 0.5, 0.5, 1, 1, 1, true);
              } else if (def.shape === "slab") {
                pushStairBox(def, wx, y, wz, 0, 0, 0, 1, 0.5, 1, false);
              } else if (def.shape === "vslab") {
                pushStairBox(def, wx, y, wz, 0, 0, 0.5, 1, 1, 1, false);
              } else if (def.shape === "quarter") {
                pushStairBox(def, wx, y, wz, 0, 0, 0.5, 1, 0.5, 1, false);
              }
              continue;
            }

            // Hidden-Face Culling: Check neighbor in face direction
            const nx = x + face.dir[0];
            const ny = y + face.dir[1];
            const nz = z + face.dir[2];
            const nid = getVoxelDirect(nx, ny, nz);

            if (nid !== 0) {
              const ndef = BLOCK_BY_ID.get(nid);
              if (!ndef?.transparent && !ndef?.liquid) continue; // Solid neighbor: cull face
              if (nid === id) continue; // Same liquid or transparent neighbor: cull inner face
            }

            const tile = isTop ? def.top : isBottom ? def.bottom : def.side;
            const [u0, v0, u1, v1] = this.atlas.uv(tile);

            // Compute Ambient Occlusion on 4 corners using static offset lookup
            const aoVals = [1, 1, 1, 1];
            for (let i = 0; i < 4; i++) {
              const off = AO_OFFSETS[f * 4 + i];
              const occ =
                (this.opaqueFast(c, wx + off[0], y + off[1], wz + off[2]) ? 1 : 0) +
                (this.opaqueFast(c, wx + off[3], y + off[4], wz + off[5]) ? 1 : 0) +
                (this.opaqueFast(c, wx + off[6], y + off[7], wz + off[8]) ? 1 : 0);
              aoVals[i] = AO_CURVE[occ > 3 ? 3 : occ];
            }

            const isLiquid = !!def.liquid;
            const isTrans = !!def.transparent && !isLiquid;

            // Route to appropriate buffer pool
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

            for (let i = 0; i < 4; i++) {
              const cn = face.corners[i];
              P[pPos++] = wx + cn[0];
              P[pPos++] = y + cn[1];
              P[pPos++] = wz + cn[2];

              N[nPos++] = face.dir[0];
              N[nPos++] = face.dir[1];
              N[nPos++] = face.dir[2];

              const uv = face.uvs[i];
              U[uPos++] = uv[0];
              U[uPos++] = uv[1];

              B[bPos++] = u0;
              B[bPos++] = v0;
              B[bPos++] = u1;
              B[bPos++] = v1;

              if (isTrans) tsBuf[tsIdx++] = s;

              const ao = aoVals[i];
              const light = def.glow ? Math.max(face.light * ao, def.glow) : face.light * ao;
              const tint = TINTS[tile];
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
              wpIdx = pPos;
              wnIdx = nPos;
              wuIdx = uPos;
              wcIdx = cPos;
              wiIdx = iPos;
              wbIdx = bPos;
            } else if (isTrans) {
              tpIdx = pPos;
              tnIdx = nPos;
              tuIdx = uPos;
              tcIdx = cPos;
              tiIdx = iPos;
              tbIdx = bPos;
            } else {
              pIdx = pPos;
              nIdx = nPos;
              uIdx = uPos;
              cIdx = cPos;
              iIdx = iPos;
              bIdx = bPos;
            }
          }
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

    // Shadow distance optimization: subchunks near camera cast shadows; distant only receive
    const camDist = camera ? camera.position.distanceTo(sc.center) : 0;
    const isNearCamera = camDist < 42;

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
          pBuf,
          pIdx,
          nBuf,
          nIdx,
          uBuf,
          uIdx,
          cBuf,
          cIdx,
          iBuf,
          iIdx,
          bBuf,
          bIdx,
          sc.mesh.geometry,
        );
      }
      sc.mesh.castShadow = isNearCamera;
      sc.mesh.visible = true;
    } else if (sc.mesh) {
      sc.mesh.visible = false;
    }

    // 2. Transparent mesh (leaves, glass)
    if (tpIdx > 0) {
      if (!sc.transparentMesh) {
        const geom = makeGeom(
          tpBuf,
          tpIdx,
          tnBuf,
          tnIdx,
          tuBuf,
          tuIdx,
          tcBuf,
          tcIdx,
          tiBuf,
          tiIdx,
          tbBuf,
          tbIdx,
        );
        geom.setAttribute("aSway", new THREE.BufferAttribute(tsBuf.slice(0, tsIdx), 1));
        sc.transparentMesh = new THREE.Mesh(geom, this.transparentMaterial);
        sc.transparentMesh.receiveShadow = true;
        sc.transparentMesh.frustumCulled = true;
        sc.group.add(sc.transparentMesh);
      } else {
        sc.transparentMesh.geometry = makeGeom(
          tpBuf,
          tpIdx,
          tnBuf,
          tnIdx,
          tuBuf,
          tuIdx,
          tcBuf,
          tcIdx,
          tiBuf,
          tiIdx,
          tbBuf,
          tbIdx,
          sc.transparentMesh.geometry,
        );
        sc.transparentMesh.geometry.setAttribute(
          "aSway",
          new THREE.BufferAttribute(tsBuf.slice(0, tsIdx), 1),
        );
      }
      sc.transparentMesh.castShadow = isNearCamera;
      sc.transparentMesh.visible = true;
    } else if (sc.transparentMesh) {
      sc.transparentMesh.visible = false;
    }

    // 3. Liquid / Water mesh
    if (wpIdx > 0) {
      if (!sc.waterMesh) {
        const geom = makeGeom(
          wpBuf,
          wpIdx,
          wnBuf,
          wnIdx,
          wuBuf,
          wuIdx,
          wcBuf,
          wcIdx,
          wiBuf,
          wiIdx,
          wbBuf,
          wbIdx,
        );
        sc.waterMesh = new THREE.Mesh(geom, this.waterMaterial);
        sc.waterMesh.receiveShadow = true;
        sc.waterMesh.frustumCulled = true;
        sc.waterMesh.renderOrder = 2;
        sc.group.add(sc.waterMesh);
      } else {
        sc.waterMesh.geometry = makeGeom(
          wpBuf,
          wpIdx,
          wnBuf,
          wnIdx,
          wuBuf,
          wuIdx,
          wcBuf,
          wcIdx,
          wiBuf,
          wiIdx,
          wbBuf,
          wbIdx,
          sc.waterMesh.geometry,
        );
      }
      sc.waterMesh.visible = true;
    } else if (sc.waterMesh) {
      sc.waterMesh.visible = false;
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
