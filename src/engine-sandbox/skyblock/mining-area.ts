import type { World } from "@/engine-sandbox/shared/world";

/**
 * Deep Dungeon: a stone-brick dungeon far from the island, reached by teleport.
 * Rooms: entrance hall (Golden Forgers), west treasure vault, south crypt,
 * north ore mine, and the east Dragon Arena.
 */
export const MINE_ORIGIN = { x: 384, z: 0 };
export const MINE_FLOOR = 12;
export const DRAGON_ARENA = { x: MINE_ORIGIN.x + 44, z: MINE_ORIGIN.z, y: MINE_FLOOR, radius: 19, height: 26 };

const X_MIN = -58;
const X_MAX = 66;
const Z_MIN = -56;
const Z_MAX = 52;
const Y_MAX = 42;

const B = {
  stone: 3,
  cobble: 4,
  bricks: 5,
  mossy: 14,
  gravel: 15,
  glowstone: 18,
  gold: 19,
  emerald: 21,
  lapis: 22,
  terracotta: 34,
  netherBricks: 35,
  coal: 36,
  redstone: 37,
  darkOak: 39,
  smooth: 42,
  iron: 47,
  diamond: 48,
  obsidian: 11,
  bedrock: 12,
} as const;

const hash3 = (x: number, y: number, z: number, seed = 0) => {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647 + seed * 144665) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const fade = (t: number) => t * t * (3 - 2 * t);

function valueNoise(x: number, y: number, z: number, seed: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const tx = fade(x - xi);
  const ty = fade(y - yi);
  const tz = fade(z - zi);
  const c = (dx: number, dy: number, dz: number) => hash3(xi + dx, yi + dy, zi + dz, seed);
  return lerp(
    lerp(lerp(c(0, 0, 0), c(1, 0, 0), tx), lerp(c(0, 1, 0), c(1, 1, 0), tx), ty),
    lerp(lerp(c(0, 0, 1), c(1, 0, 1), tx), lerp(c(0, 1, 1), c(1, 1, 1), tx), ty),
    tz,
  );
}

/** Weighted pick from a palette using a 0..1 roll. */
function pick(palette: readonly (readonly [number, number])[], roll: number) {
  let total = 0;
  for (const [, w] of palette) total += w;
  let acc = 0;
  const target = roll * total;
  for (const [id, w] of palette) {
    acc += w;
    if (target <= acc) return id;
  }
  return palette[0][0];
}

const WALL_PALETTE = [
  [B.bricks, 46],
  [B.cobble, 18],
  [B.mossy, 14],
  [B.smooth, 10],
  [B.stone, 8],
  [B.netherBricks, 4],
] as const;
const CEIL_PALETTE = [
  [B.bricks, 40],
  [B.cobble, 26],
  [B.stone, 18],
  [B.mossy, 10],
  [B.smooth, 6],
] as const;
const HALL_FLOOR = [
  [B.bricks, 30],
  [B.cobble, 26],
  [B.stone, 18],
  [B.mossy, 14],
  [B.gravel, 8],
  [B.stone, 4],
] as const;
const VAULT_FLOOR = [
  [B.stone, 34],
  [B.darkOak, 22],
  [B.bricks, 24],
  [B.terracotta, 10],
  [B.cobble, 6],
] as const;
const CRYPT_FLOOR = [
  [B.cobble, 36],
  [B.mossy, 28],
  [B.gravel, 16],
  [B.bricks, 14],
  [B.stone, 6],
] as const;
const MINE_FLOOR_PALETTE = [
  [B.stone, 40],
  [B.cobble, 30],
  [B.gravel, 20],
  [B.mossy, 10],
] as const;
const ARENA_WALL = [
  [B.obsidian, 36],
  [B.netherBricks, 34],
  [B.smooth, 12],
  [B.bricks, 12],
  [B.glowstone, 2],
  [B.terracotta, 4],
] as const;

export interface MiningArea {
  spawn: { x: number; y: number; z: number };
  lights: { x: number; y: number; z: number; color: number; intensity: number; distance: number }[];
  chestSpots: { x: number; y: number; z: number }[];
  contains: (x: number, z: number) => boolean;
}

type Region = { kind: "hall" | "vault" | "crypt" | "mine" | "arena" | "link"; open: (x: number, z: number, up: number) => boolean };

const rect = (x0: number, x1: number, z0: number, z1: number, h: number) => (x: number, z: number, up: number) =>
  x >= x0 && x <= x1 && z >= z0 && z <= z1 && up >= 1 && up <= h;

const ARENA_CX = 44;

const REGIONS: Region[] = [
  { kind: "hall", open: rect(-18, 18, -12, 22, 9) },
  { kind: "link", open: rect(-26, -17, -2, 2, 4) },
  { kind: "vault", open: rect(-46, -25, -10, 10, 7) },
  { kind: "link", open: rect(17, 26, -3, 3, 5) },
  {
    kind: "arena",
    open: (x, z, up) => {
      if (up < 1) return false;
      const d = Math.hypot(x - ARENA_CX, z);
      const dx = d / DRAGON_ARENA.radius;
      const dy = up / DRAGON_ARENA.height;
      return dx * dx + dy * dy < 1;
    },
  },
  { kind: "link", open: rect(-2, 2, 21, 29, 5) },
  { kind: "crypt", open: rect(-15, 15, 28, 46, 7) },
  { kind: "link", open: rect(-2, 2, -42, -11, 4) },
  { kind: "mine", open: rect(-12, 12, -52, -40, 6) },
];

const regionAt = (x: number, z: number, up: number): Region["kind"] | null => {
  for (const r of REGIONS) if (r.open(x, z, up)) return r.kind;
  return null;
};

/** Writes the full dungeon into the world with raw (non-simulated) block writes. */
export function buildMiningArea(world: World): MiningArea {
  const OX = MINE_ORIGIN.x;
  const OZ = MINE_ORIGIN.z;
  const F = MINE_FLOOR;
  const set = (x: number, y: number, z: number, id: number) => world.setRaw(OX + x, y, OZ + z, id);

  const W = X_MAX - X_MIN + 1;
  const D = Z_MAX - Z_MIN + 1;
  const idx = (x: number, y: number, z: number) => (y * D + (z - Z_MIN)) * W + (x - X_MIN);
  const open = new Uint8Array(W * D * (Y_MAX + 2));
  for (let y = F + 1; y < Y_MAX; y++) {
    for (let z = Z_MIN; z <= Z_MAX; z++) {
      for (let x = X_MIN; x <= X_MAX; x++) {
        if (regionAt(x, z, y - F)) open[idx(x, y, z)] = 1;
      }
    }
  }
  const isOpen = (x: number, y: number, z: number) =>
    x >= X_MIN && x <= X_MAX && z >= Z_MIN && z <= Z_MAX && y >= 0 && y <= Y_MAX && open[idx(x, y, z)] === 1;

  const kindNear = (x: number, y: number, z: number): Region["kind"] => {
    const probes: [number, number, number][] = [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0], [0, -1, 0]];
    for (const [dx, dy, dz] of probes) {
      if (isOpen(x + dx, y + dy, z + dz)) return regionAt(x + dx, z + dz, y + dy - F) ?? "hall";
    }
    return "hall";
  };

  for (let y = 0; y <= Y_MAX + 1; y++) {
    for (let z = Z_MIN; z <= Z_MAX; z++) {
      for (let x = X_MIN; x <= X_MAX; x++) {
        if (y <= Y_MAX && isOpen(x, y, z)) continue;
        if (y === 0 || y === Y_MAX + 1) {
          set(x, y, z, B.bedrock);
          continue;
        }
        const above = isOpen(x, y + 1, z);
        const below = isOpen(x, y - 1, z);
        const side =
          isOpen(x + 1, y, z) || isOpen(x - 1, y, z) || isOpen(x, y, z + 1) || isOpen(x, y, z - 1);
        const exposed = above || below || side;
        const roll = hash3(x, y, z, 11);
        let id: number = B.stone;

        if (exposed) {
          const kind = kindNear(x, y, z);
          if (above) {
            // Dungeon floors, each room with its own mix.
            if (kind === "arena") {
              const d = Math.hypot(x - ARENA_CX, z);
              if (d < 5) id = B.obsidian;
              else if (d < 7) id = B.netherBricks;
              else if (d > 16 && d < 17.5) id = B.glowstone;
              else id = pick([[B.smooth, 30], [B.obsidian, 30], [B.netherBricks, 24], [B.cobble, 16]], roll);
            } else if (kind === "hall") {
              const d = Math.hypot(x, z);
              if (d < 3.2) id = (x + z) % 2 === 0 ? B.stone : B.cobble;
              else if (Math.abs(d - 7) < 0.75) id = B.darkOak;
              else if (Math.abs(x) < 1 || Math.abs(z - 5) < 1) id = (x + z) % 2 === 0 ? B.stone : B.bricks;
              else id = pick(HALL_FLOOR, roll);
            } else if (kind === "vault") id = pick(VAULT_FLOOR, roll);
            else if (kind === "crypt") id = pick(CRYPT_FLOOR, roll);
            else if (kind === "mine") id = pick(MINE_FLOOR_PALETTE, roll);
            else id = (x + z) % 2 === 0 ? B.cobble : pick(HALL_FLOOR, roll);
          } else if (below) {
            id = kind === "arena" ? pick(ARENA_WALL, roll) : pick(CEIL_PALETTE, roll);
          } else {
            id = kind === "arena" ? pick(ARENA_WALL, roll) : pick(WALL_PALETTE, roll);
            const rich = kind === "mine" ? 0.22 : kind === "vault" ? 0.06 : 0.025;
            if (kind !== "arena" && roll > 1 - rich) {
              const o = hash3(x, y, z, 77);
              id = o < 0.1 ? B.diamond : o < 0.2 ? B.gold : o < 0.3 ? B.lapis : o < 0.4 ? B.redstone : o < 0.46 ? B.emerald : o < 0.75 ? B.iron : B.coal;
            }
            // Wall braziers in the stone: a lit block every few steps.
            if (y === F + 4 && (x + z) % 6 === 0 && roll > 0.25 && kind !== "link") id = B.glowstone;
          }
        } else {
          const tone = valueNoise(x / 6, y / 5, z / 6, 5);
          if (tone > 0.66) id = B.cobble;
          else if (tone < 0.24) id = B.smooth;
          else if (tone > 0.5 && roll > 0.8) id = B.mossy;
          const vein = valueNoise(x / 3, y / 3, z / 3, 21);
          if (vein > 0.8) {
            if (roll < 0.05) id = B.diamond;
            else if (roll < 0.1 && y < 24) id = B.redstone;
            else if (roll < 0.16) id = B.lapis;
            else if (roll < 0.2 && y < 18) id = B.emerald;
            else if (roll < 0.28) id = B.gold;
            else if (roll < 0.5) id = B.iron;
            else id = B.coal;
          } else if (roll < 0.025) id = B.coal;
          else if (roll < 0.035) id = B.iron;
        }
        set(x, y, z, id);
      }
    }
  }

  const chestSpots = [
    { x: OX + 21.5, y: F + 1, z: OZ + 2.5 },
    { x: OX + 14.5, y: F + 1, z: OZ - 9.5 },
    { x: OX + -14.5, y: F + 1, z: OZ + 19.5 },
    { x: OX + -43.5, y: F + 1, z: OZ + 0.5 },
    { x: OX + -39.5, y: F + 1, z: OZ + -7.5 },
    { x: OX + 0.5, y: F + 1, z: OZ + 44.5 },
    { x: OX + 0.5, y: F + 1, z: OZ + -50.5 },
  ];

  return {
    spawn: { x: OX + 24.5, y: F + 1.2, z: OZ + 0.5 },
    contains: (x: number, z: number) =>
      x >= OX + X_MIN - 8 && x <= OX + X_MAX + 8 && z >= OZ + Z_MIN - 8 && z <= OZ + Z_MAX + 8,
    chestSpots,
    lights: [
      { x: OX + 0.5, y: F + 6, z: OZ + 0.5, color: 0xffe4a0, intensity: 3.4, distance: 30 },
      { x: OX, y: F + 6, z: OZ + 14, color: 0xffd270, intensity: 3.0, distance: 28 },
      { x: OX - 36, y: F + 5, z: OZ, color: 0xffc860, intensity: 3.0, distance: 28 },
      { x: OX + 44, y: F + 10, z: OZ, color: 0xff5a2a, intensity: 5.0, distance: 46 },
      { x: OX, y: F + 5, z: OZ + 37, color: 0x8fc8a0, intensity: 2.6, distance: 24 },
      { x: OX, y: F + 4, z: OZ - 46, color: 0xffd8a0, intensity: 2.6, distance: 24 },
    ],
  };
}
