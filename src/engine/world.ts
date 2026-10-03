import * as THREE from "three";
import type { Atlas } from "./textures";

/**
 * Flat chunked voxel world with face-culled chunk meshes sharing one atlas
 * material. Chunks re-mesh only when their contents change.
 */

export const CHUNK = 16;
export const WORLD_H = 48;

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
    glow: 0.85,
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
  },
  {
    id: 21,
    name: "Emerald Block",
    top: "emerald_block",
    side: "emerald_block",
    bottom: "emerald_block",
    hardness: 3.5,
  },
  {
    id: 22,
    name: "Lapis Block",
    top: "lapis_block",
    side: "lapis_block",
    bottom: "lapis_block",
    hardness: 2.5,
  },
  {
    id: 23,
    name: "Amethyst",
    top: "amethyst_block",
    side: "amethyst_block",
    bottom: "amethyst_block",
    hardness: 2,
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
  { id: 62, name: "Lava", top: "lava", side: "lava", bottom: "lava", passable: true, hardness: 0.2, glow: 1 },
  { id: 63, name: "Slime Block", top: "slime_block", side: "slime_block", bottom: "slime_block", hardness: 0.4 },
  { id: 64, name: "Oak Slab", top: "oak_planks", side: "oak_planks", bottom: "oak_planks", shape: "slab", hardness: 1.5 },
  { id: 65, name: "Stone Slab", top: "smooth_stone", side: "smooth_stone", bottom: "smooth_stone", shape: "slab", hardness: 2.2 },
  { id: 66, name: "Oak Vertical Slab", top: "oak_planks", side: "oak_planks", bottom: "oak_planks", shape: "vslab", hardness: 1.5 },
  { id: 67, name: "Brick Quarter Block", top: "stone_bricks", side: "stone_bricks", bottom: "stone_bricks", shape: "quarter", hardness: 2.5 },
  { id: 68, name: "Brick Vertical Slab", top: "stone_bricks", side: "stone_bricks", bottom: "stone_bricks", shape: "vslab", hardness: 2.5 },
  { id: 69, name: "Door Button", top: "door_button", side: "door_button", bottom: "door_button", hardness: 1 },
];

export const BLOCK_BY_ID = new Map(BLOCKS.map((b) => [b.id, b]));

/** Seconds a block takes to mine by hand; -1 means indestructible. */
export function hardnessOf(id: number) {
  const h = BLOCK_BY_ID.get(id)?.hardness;
  return h === undefined ? 1 : h;
}

/**
 * Biome tints. The Skyblock pack ships pre-coloured foliage, so tints stay
 * subtle — just enough variation between leaf types.
 */
const TINTS: Record<string, [number, number, number]> = {
  // Matched to user RGB: R(31..43), G(72..104), B(4..6) with saturated deep olive grass tone
  grass_block_top: [0.41, 1.0, 0.055],
  oak_leaves: [0.35, 0.65, 0.25],
  birch_leaves: [0.4, 0.7, 0.35],
  spruce_leaves: [0.3, 0.5, 0.3],
  jungle_leaves: [0.35, 0.75, 0.25],
  acacia_leaves: [0.45, 0.7, 0.3],
  water: [0.32, 0.78, 1.0],
};

type Face = {
  dir: [number, number, number];
  corners: [number, number, number][];
  uvs: [number, number][];
  light: number;
  /** Winding fix: side faces are wound clockwise, so their indices flip. */
  flip?: boolean;
};

const FACES: Face[] = [
  {
    // +X
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
    // -X
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
    // +Y
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
    light: 1,
  },
  {
    // -Y
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
    // +Z
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
    // -Z
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

class Chunk {
  data = new Uint8Array(CHUNK * WORLD_H * CHUNK);
  mesh: THREE.Mesh | null = null;
  dirty = true;
  constructor(
    readonly cx: number,
    readonly cz: number,
  ) {}
  idx(x: number, y: number, z: number) {
    return (y * CHUNK + z) * CHUNK + x;
  }
}

export class World {
  readonly group = new THREE.Group();
  private chunks = new Map<string, Chunk>();
  private activeChunks = new Set<string>();
  private material: THREE.Material;
  private transparentMaterial: THREE.Material;
  private waterMaterial: THREE.Material;
  private pendingWaterFlows: { x: number; y: number; z: number; time: number; spread: number }[] = [];
  private queuedWaterCoords = new Set<string>();

  constructor(
    private atlas: Atlas,
    readonly radius = 5,
  ) {
    this.material = new THREE.MeshStandardMaterial({
      map: atlas.texture,
      vertexColors: true,
      roughness: 0.78,
      metalness: 0.02,
      emissive: new THREE.Color(0x26313b),
      emissiveIntensity: 0.16,
    });
    this.transparentMaterial = new THREE.MeshStandardMaterial({
      map: atlas.texture,
      vertexColors: true,
      roughness: 0.78,
      metalness: 0.02,
      emissive: new THREE.Color(0x26313b),
      emissiveIntensity: 0.13,
      transparent: true,
      alphaTest: 0.35,
      depthWrite: true,
      side: THREE.DoubleSide,
    });
    // Leaves sway in the wind: per-vertex `aSway` marks foliage so glass stays still.
    this.transparentMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.uWindTime = WIND.uTime;
      shader.uniforms.uWindStrength = WIND.uStrength;
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          "#include <common>\nattribute float aSway;\nuniform float uWindTime;\nuniform float uWindStrength;",
        )
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
          if (aSway > 0.5) {
            float ph = position.x * 0.55 + position.z * 0.45 + position.y * 0.3;
            // Travelling gust front + fast leaf flutter on top of the slow sway.
            float front = sin(uWindTime * 0.45 - (position.x + position.z) * 0.08);
            float gust = 0.55 + 0.45 * front * front;
            float flutter = sin(uWindTime * 7.3 + ph * 3.1) * 0.012;
            transformed.x += (sin(uWindTime * 1.6 + ph) * 0.055 * gust + flutter) * uWindStrength;
            transformed.z += (cos(uWindTime * 1.25 + ph * 1.3) * 0.045 * gust + flutter * 0.7) * uWindStrength;
            transformed.y += sin(uWindTime * 2.1 + ph * 0.8) * 0.016 * uWindStrength;
          }`,
        );
    };
    this.transparentMaterial.customProgramCacheKey = () => "voxel-foliage-wind";
    this.waterMaterial = new THREE.MeshStandardMaterial({
      map: atlas.texture,
      vertexColors: true,
      roughness: 0.12,
      metalness: 0.08,
      emissive: new THREE.Color(0x113a5c),
      emissiveIntensity: 0.22,
      transparent: true,
      opacity: 0.76,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    for (let cx = -radius; cx <= radius; cx++) {
      for (let cz = -radius; cz <= radius; cz++) {
        this.chunks.set(`${cx},${cz}`, new Chunk(cx, cz));
      }
    }
  }

  /** Allocates empty chunks covering a block-space rectangle (used for detached realms far from spawn). */
  ensureChunks(minX: number, minZ: number, maxX: number, maxZ: number) {
    for (let cx = Math.floor(minX / CHUNK); cx <= Math.floor(maxX / CHUNK); cx++) {
      for (let cz = Math.floor(minZ / CHUNK); cz <= Math.floor(maxZ / CHUNK); cz++) {
        const key = `${cx},${cz}`;
        if (!this.chunks.has(key)) this.chunks.set(key, new Chunk(cx, cz));
      }
    }
  }

  private chunkAt(x: number, z: number) {
    return this.chunks.get(`${Math.floor(x / CHUNK)},${Math.floor(z / CHUNK)}`);
  }

  get(x: number, y: number, z: number): number {
    if (y < 0 || y >= WORLD_H) return 0;
    const c = this.chunkAt(x, z);
    if (!c) return 0;
    const lx = ((x % CHUNK) + CHUNK) % CHUNK;
    const lz = ((z % CHUNK) + CHUNK) % CHUNK;
    return c.data[c.idx(lx, y, lz)];
  }

  queueWaterFlow(x: number, y: number, z: number, delayMs = 320, spread = 0) {
    if (y < 2 || y >= WORLD_H) return;
    if (spread > 5) return;
    const key = `${x},${y},${z}`;
    if (this.queuedWaterCoords.has(key)) return;
    if (this.get(x, y, z) !== 0) return;
    this.queuedWaterCoords.add(key);
    this.pendingWaterFlows.push({
      x,
      y,
      z,
      time: performance.now() + delayMs,
      spread,
    });
  }

  set(x: number, y: number, z: number, id: number) {
    if (y < 0 || y >= WORLD_H) return;
    const c = this.chunkAt(x, z);
    if (!c) return;
    const lx = ((x % CHUNK) + CHUNK) % CHUNK;
    const lz = ((z % CHUNK) + CHUNK) % CHUNK;
    c.data[c.idx(lx, y, lz)] = id;
    if (id !== 0) this.activeChunks.add(`${c.cx},${c.cz}`);
    c.dirty = true;
    // neighbours on the border need a re-mesh too
    if (lx === 0) this.markDirty(x - 1, z);
    if (lx === CHUNK - 1) this.markDirty(x + 1, z);
    if (lz === 0) this.markDirty(x, z - 1);
    if (lz === CHUNK - 1) this.markDirty(x, z + 1);

    // Liquid flow simulation: if a block was removed (became air), check if adjacent water should flow into it slowly
    if (id === 0) {
      if (this.get(x, y + 1, z) === WATER_ID) {
        this.queueWaterFlow(x, y, z, 220, 0);
      } else {
        const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        for (const [dx, dz] of dirs) {
          if (this.get(x + dx, y, z + dz) === WATER_ID) {
            this.queueWaterFlow(x, y, z, 340, 1);
            break;
          }
        }
      }
    } else if (id === WATER_ID) {
      // Flow downward first if air below
      if (y > 2 && this.get(x, y - 1, z) === 0) {
        this.queueWaterFlow(x, y - 1, z, 240, 0);
      } else {
        const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        for (const [dx, dz] of dirs) {
          if (this.get(x + dx, y, z + dz) === 0) {
            this.queueWaterFlow(x + dx, y, z + dz, 380, 1);
          }
        }
      }
    }
  }

  private markDirty(x: number, z: number) {
    const c = this.chunkAt(x, z);
    if (c) c.dirty = true;
  }

  solid(x: number, y: number, z: number) {
    const id = this.get(x, y, z);
    return id !== 0 && id !== WATER_ID && !BLOCK_BY_ID.get(id)?.passable;
  }

  isLiquid(x: number, y: number, z: number) {
    const id = this.get(x, y, z);
    return id === WATER_ID || id === LAVA_ID;
  }

  /** Solid and not see-through — used for ambient occlusion. */
  opaque(x: number, y: number, z: number) {
    const id = this.get(x, y, z);
    if (id === 0 || id === WATER_ID) return false;
    return !BLOCK_BY_ID.get(id)?.transparent;
  }

  /** Flat world: bedrock, dirt, grass surface at y = GROUND. */
  generate(ground = 8) {
    for (const c of this.chunks.values()) {
      for (let x = 0; x < CHUNK; x++) {
        for (let z = 0; z < CHUNK; z++) {
          for (let y = 0; y <= ground; y++) {
            const id = y === 0 ? 12 : y === ground ? 1 : y > ground - 3 ? 2 : 3;
            c.data[c.idx(x, y, z)] = id;
          }
        }
      }
      this.activeChunks.add(`${c.cx},${c.cz}`);
      c.dirty = true;
    }
    this.decorate(ground);
  }

  /** A few scattered trees + rock clusters so the flat plain isn't empty. */
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

  /** Re-meshes dirty chunks (budgeted per frame) and processes slow liquid flow. */
  update(budget = 2) {
    if (this.pendingWaterFlows.length > 0) {
      const now = performance.now();
      for (let i = this.pendingWaterFlows.length - 1; i >= 0; i--) {
        const flow = this.pendingWaterFlows[i];
        if (now >= flow.time) {
          this.pendingWaterFlows.splice(i, 1);
          this.queuedWaterCoords.delete(`${flow.x},${flow.y},${flow.z}`);
          if (this.get(flow.x, flow.y, flow.z) === 0) {
            this.set(flow.x, flow.y, flow.z, WATER_ID);
          }
        }
      }
    }

    let done = 0;
    for (const key of this.activeChunks) {
      const c = this.chunks.get(key);
      if (!c) continue;
      if (!c.dirty) continue;
      this.mesh(c);
      c.dirty = false;
      if (++done >= budget) break;
    }
  }

  meshAll() {
    for (const key of this.activeChunks) {
      const c = this.chunks.get(key);
      if (!c) continue;
      if (c.dirty) {
        this.mesh(c);
        c.dirty = false;
      }
    }
  }

  private mesh(c: Chunk) {
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    const tPositions: number[] = [];
    const tNormals: number[] = [];
    const tUvs: number[] = [];
    const tColors: number[] = [];
    const tIndices: number[] = [];
    const tSway: number[] = [];
    const pushSway = (def: BlockDef, tile: string) => {
      if (!def.transparent || def.liquid) return;
      const s = tile.includes("leaves") ? 1 : 0;
      tSway.push(s, s, s, s);
    };

    const wPositions: number[] = [];
    const wNormals: number[] = [];
    const wUvs: number[] = [];
    const wColors: number[] = [];
    const wIndices: number[] = [];

    const ox = c.cx * CHUNK;
    const oz = c.cz * CHUNK;

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
      const P = def.transparent ? tPositions : positions;
      const N = def.transparent ? tNormals : normals;
      const U = def.transparent ? tUvs : uvs;
      const C = def.transparent ? tColors : colors;
      const I = def.transparent ? tIndices : indices;
      const sizeX = maxX - minX;
      const sizeY = maxY - minY;
      const sizeZ = maxZ - minZ;

      for (const f of FACES) {
        if (skipBottom && f.dir[1] === -1) continue;
        const nx = wx + (minX + maxX) / 2 + f.dir[0] * (sizeX / 2 + 0.01);
        const ny = y + (minY + maxY) / 2 + f.dir[1] * (sizeY / 2 + 0.01);
        const nz = wz + (minZ + maxZ) / 2 + f.dir[2] * (sizeZ / 2 + 0.01);
        const nid = this.get(Math.floor(nx), Math.floor(ny), Math.floor(nz));
        if (nid !== 0 && nid !== def.id && !BLOCK_BY_ID.get(nid)?.transparent) continue;

        const tile = f.dir[1] === 1 ? def.top : f.dir[1] === -1 ? def.bottom : def.side;
        const [u0, v0, u1, v1] = this.atlas.uv(tile);
        const base = P.length / 3;
        pushSway(def, tile);
        for (let i = 0; i < 4; i++) {
          const cn = f.corners[i];
          P.push(wx + minX + cn[0] * sizeX, y + minY + cn[1] * sizeY, wz + minZ + cn[2] * sizeZ);
          N.push(f.dir[0], f.dir[1], f.dir[2]);
          const uv = f.uvs[i];
          U.push(uv[0] ? u1 : u0, uv[1] ? v1 : v0);
          const light = f.light * 0.98;
          const tint = TINTS[tile];
          if (tint) C.push(light * tint[0], light * tint[1], light * tint[2]);
          else C.push(light, light, light);
        }
        if (f.flip) I.push(base, base + 2, base + 1, base, base + 3, base + 2);
        else I.push(base, base + 1, base + 2, base, base + 2, base + 3);
      }
    };

    for (let x = 0; x < CHUNK; x++) {
      for (let z = 0; z < CHUNK; z++) {
        for (let y = 0; y < WORLD_H; y++) {
          const id = c.data[c.idx(x, y, z)];
          if (id === 0) continue;
          const def = BLOCK_BY_ID.get(id)!;
          const wx = ox + x;
          const wz = oz + z;
          if (def.shape === "stairs") {
            // Two joined half-blocks create a readable Minecraft-style step.
            pushStairBox(def, wx, y, wz, 0, 0, 0, 1, 0.5, 1, false);
            pushStairBox(def, wx, y, wz, 0, 0.5, 0.5, 1, 1, 1, true);
            continue;
          }
          if (def.shape === "slab") {
            pushStairBox(def, wx, y, wz, 0, 0, 0, 1, 0.5, 1, false);
            continue;
          }
          if (def.shape === "vslab") {
            pushStairBox(def, wx, y, wz, 0, 0, 0.5, 1, 1, 1, false);
            continue;
          }
          if (def.shape === "quarter") {
            pushStairBox(def, wx, y, wz, 0, 0, 0.5, 1, 0.5, 1, false);
            continue;
          }
          for (const f of FACES) {
            const nx = wx + f.dir[0];
            const ny = y + f.dir[1];
            const nz = wz + f.dir[2];
            const nid = this.get(nx, ny, nz);
            if (nid !== 0) {
              const ndef = BLOCK_BY_ID.get(nid);
              if (!ndef?.transparent && !ndef?.liquid) continue;
              if (nid === id) continue; // cull shared inner faces between identical liquid/transparent blocks
            }
            const tile = f.dir[1] === 1 ? def.top : f.dir[1] === -1 ? def.bottom : def.side;
            const [u0, v0, u1, v1] = this.atlas.uv(tile);
            const P = def.liquid ? wPositions : def.transparent ? tPositions : positions;
            const N = def.liquid ? wNormals : def.transparent ? tNormals : normals;
            const U = def.liquid ? wUvs : def.transparent ? tUvs : uvs;
            const C = def.liquid ? wColors : def.transparent ? tColors : colors;
            const I = def.liquid ? wIndices : def.transparent ? tIndices : indices;
            const base = P.length / 3;
            pushSway(def, tile);
            // tangent axes of this face (the two axes where dir === 0)
            const ax = f.dir[0] !== 0 ? 0 : f.dir[1] !== 0 ? 1 : 2;
            const t1 = (ax + 1) % 3;
            const t2 = (ax + 2) % 3;
            for (let i = 0; i < 4; i++) {
              const cn = f.corners[i];
              P.push(wx + cn[0], y + cn[1], wz + cn[2]);
              N.push(f.dir[0], f.dir[1], f.dir[2]);
              const uv = f.uvs[i];
              U.push(uv[0] ? u1 : u0, uv[1] ? v1 : v0);
              // ambient occlusion from the three neighbours around this corner
              const o: [number, number, number] = [wx + f.dir[0], y + f.dir[1], wz + f.dir[2]];
              const s1: [number, number, number] = [...o];
              const s2: [number, number, number] = [...o];
              const cr: [number, number, number] = [...o];
              const d1 = cn[t1] ? 1 : -1;
              const d2 = cn[t2] ? 1 : -1;
              s1[t1] += d1;
              s2[t2] += d2;
              cr[t1] += d1;
              cr[t2] += d2;
              const occ =
                (this.opaque(s1[0], s1[1], s1[2]) ? 1 : 0) +
                (this.opaque(s2[0], s2[1], s2[2]) ? 1 : 0) +
                (this.opaque(cr[0], cr[1], cr[2]) ? 1 : 0);
              const ao = 1 - Math.min(occ, 3) * 0.1;
              const l = f.light * ao;
              const t = TINTS[tile];
              if (t) C.push(l * t[0], l * t[1], l * t[2]);
              else C.push(l, l, l);
            }
            if (f.flip) I.push(base, base + 2, base + 1, base, base + 3, base + 2);
            else I.push(base, base + 1, base + 2, base, base + 2, base + 3);
          }
        }
      }
    }

    if (c.mesh) {
      this.group.remove(c.mesh);
      c.mesh.geometry.dispose();
      (c.mesh.children as THREE.Mesh[]).forEach((m) => m.geometry?.dispose());
      c.mesh = null;
    }

    const makeGeom = (P: number[], N: number[], U: number[], C: number[], I: number[]) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
      g.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3));
      g.setAttribute("uv", new THREE.Float32BufferAttribute(U, 2));
      g.setAttribute("color", new THREE.Float32BufferAttribute(C, 3));
      g.setIndex(I);
      g.computeBoundingSphere();
      g.computeBoundingBox();
      return g;
    };

    const mesh = new THREE.Mesh(makeGeom(positions, normals, uvs, colors, indices), this.material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    if (tPositions.length) {
      const tm = new THREE.Mesh(
        makeGeom(tPositions, tNormals, tUvs, tColors, tIndices),
        this.transparentMaterial,
      );
      tm.geometry.setAttribute("aSway", new THREE.Float32BufferAttribute(tSway, 1));
      tm.castShadow = true;
      tm.receiveShadow = true;
      tm.frustumCulled = false;
      mesh.add(tm);
    }
    if (wPositions.length) {
      const wm = new THREE.Mesh(
        makeGeom(wPositions, wNormals, wUvs, wColors, wIndices),
        this.waterMaterial,
      );
      wm.receiveShadow = true;
      wm.frustumCulled = false;
      wm.renderOrder = 2;
      mesh.add(wm);
    }
    c.mesh = mesh;
    this.group.add(mesh);
  }

  dispose() {
    for (const c of this.chunks.values()) {
      if (c.mesh) {
        c.mesh.geometry.dispose();
        (c.mesh.children as THREE.Mesh[]).forEach((m) => m.geometry?.dispose());
      }
    }
    this.material.dispose();
    this.transparentMaterial.dispose();
    this.waterMaterial.dispose();
    this.chunks.clear();
    this.activeChunks.clear();
  }
}
