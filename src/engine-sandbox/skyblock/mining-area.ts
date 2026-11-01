import type { World } from "@/engine-sandbox/shared/world";

/**
 * Deep Dungeon: A vast, handcrafted ancient fantasy subterranean kingdom.
 * Architectural zones:
 * - Grand Colonnade Antechamber (entrance hall, central pillars, arched vaults)
 * - The Ancient Crypt of Fallen Kings (south catacombs, sarcophagi, skeleton guardians)
 * - The Royal Gilded Treasury (west vault, golden dais, emerald pilasters)
 * - The Grand Crystal Chasm & Great Mine (north-west quarry, catwalks, towering geodes, rich veins)
 * - The Subterranean Sunken Lagoon (north-east flooded cavern, mooring wharves, berthed submarine)
 * - The Dragon Arena (east volcanic amphitheater)
 */
export const MINE_ORIGIN = { x: 384, z: 0 };
export const MINE_FLOOR = 12;
export const DRAGON_ARENA = { x: MINE_ORIGIN.x + 44, z: MINE_ORIGIN.z, y: MINE_FLOOR, radius: 19, height: 26 };

const X_MIN = -84;
const X_MAX = 84;
const Z_MIN = -92;
const Z_MAX = 70;
const Y_MAX = 44;

const B = {
  stone: 3,
  cobble: 4,
  bricks: 5,
  mossy: 14,
  gravel: 15,
  glowstone: 18,
  gold: 19,
  diamondBlock: 20,
  emerald: 21,
  lapis: 22,
  amethyst: 23,
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
  water: 50,
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
  [B.bricks, 32],
  [B.cobble, 24],
  [B.stone, 20],
  [B.mossy, 14],
  [B.gravel, 6],
  [B.smooth, 4],
] as const;

const VAULT_FLOOR = [
  [B.stone, 32],
  [B.darkOak, 24],
  [B.bricks, 24],
  [B.gold, 10],
  [B.terracotta, 10],
] as const;

const CRYPT_FLOOR = [
  [B.cobble, 36],
  [B.mossy, 30],
  [B.gravel, 18],
  [B.bricks, 10],
  [B.stone, 6],
] as const;

const MINE_FLOOR_PALETTE = [
  [B.stone, 35],
  [B.cobble, 25],
  [B.mossy, 18],
  [B.gravel, 14],
  [B.lapis, 4],
  [B.glowstone, 4],
] as const;

const LAGOON_FLOOR_PALETTE = [
  [B.cobble, 30],
  [B.mossy, 30],
  [B.gravel, 25],
  [B.darkOak, 15],
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

type Region = {
  kind: "hall" | "vault" | "crypt" | "mine" | "lagoon" | "arena" | "garden" | "cargo" | "link";
  open: (x: number, z: number, up: number) => boolean;
};

const rect = (x0: number, x1: number, z0: number, z1: number, h: number) => (x: number, z: number, up: number) =>
  x >= x0 && x <= x1 && z >= z0 && z <= z1 && up >= 1 && up <= h;

const ARENA_CX = 44;

const REGIONS: Region[] = [
  // 1. Grand Colonnade Antechamber (entrance hub with towering double colonnade)
  { kind: "hall", open: rect(-18, 18, -14, 24, 10) },

  // 2. West arched corridor to the Royal Treasury
  { kind: "link", open: rect(-28, -17, -3, 3, 5) },
  // 3. Royal Gilded Treasury & Alchemical Sanctuary
  { kind: "vault", open: rect(-64, -26, -14, 14, 8) },
  // Hidden Treasury Vault alcove
  { kind: "vault", open: rect(-76, -63, -6, 6, 6) },

  // 4. East corridor to the Dragon Arena
  { kind: "link", open: rect(17, 28, -3, 3, 6) },
  // 5. Dragon Gate & Arena
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

  // 6. South portcullis passage to the Ancient Crypt
  { kind: "link", open: rect(-3, 3, 23, 29, 6) },
  // 7. Ancient Crypt of the Fallen Kings (expansive catacombs)
  { kind: "crypt", open: rect(-20, 20, 28, 64, 8) },
  // Deep crypt burial chambers (East & West wings)
  { kind: "crypt", open: rect(-34, -19, 36, 56, 7) },
  { kind: "crypt", open: rect(19, 34, 36, 56, 7) },

  // 8. Broad North gateway into vast fantasy mining cavern
  { kind: "link", open: rect(-6, 6, -24, -13, 7) },

  // 9. Vast Grand Crystal Chasm & Ore Cavern (multi-tiered quarry)
  { kind: "mine", open: rect(-76, 4, -88, -22, 15) },

  // 10. Subterranean Sunken Lagoon & Submarine Drydock
  { kind: "lagoon", open: rect(6, 64, -88, -20, 14) },

  // 11. Grand natural archway connecting Mine to Lagoon
  { kind: "link", open: rect(0, 10, -60, -32, 9) },

  // 12. Hidden Luminous Geode Grotto (glowing crystals, rare ores)
  { kind: "garden", open: rect(-80, -56, -60, -32, 9) },

  // 13. Lagoon Wharf, Timber Boardwalks & Cargo Staging
  { kind: "cargo", open: rect(8, 44, -34, -20, 9) },
];

const regionAt = (x: number, z: number, up: number): Region["kind"] | null => {
  for (const r of REGIONS) if (r.open(x, z, up)) return r.kind;
  return null;
};

/** Handcrafts the full ancient fantasy dungeon with raw block writes. */
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
    const probes: [number, number, number][] = [
      [1, 0, 0],
      [-1, 0, 0],
      [0, 0, 1],
      [0, 0, -1],
      [0, 1, 0],
      [0, -1, 0],
    ];
    for (const [dx, dy, dz] of probes) {
      if (isOpen(x + dx, y + dy, z + dz)) return regionAt(x + dx, z + dz, y + dy - F) ?? "hall";
    }
    return "hall";
  };

  // 1. Carve and voxelize dungeon structure
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
            // Distinct thematic flooring per room
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
            else if (kind === "lagoon") id = pick(LAGOON_FLOOR_PALETTE, roll);
            else id = (x + z) % 2 === 0 ? B.cobble : pick(HALL_FLOOR, roll);
          } else if (below) {
            id = kind === "arena" ? pick(ARENA_WALL, roll) : pick(CEIL_PALETTE, roll);
            // Glowing stalactites and crystal ceiling clusters
            if ((kind === "mine" || kind === "lagoon") && roll > 0.86) {
              id = roll > 0.95 ? B.glowstone : roll > 0.91 ? B.lapis : B.diamond;
            }
          } else {
            id = kind === "arena" ? pick(ARENA_WALL, roll) : pick(WALL_PALETTE, roll);
            const rich = kind === "mine" ? 0.36 : kind === "lagoon" ? 0.24 : kind === "vault" ? 0.12 : 0.03;
            if (kind !== "arena" && roll > 1 - rich) {
              const o = hash3(x, y, z, 77);
              id = o < 0.14 ? B.diamond : o < 0.28 ? B.gold : o < 0.42 ? B.lapis : o < 0.54 ? B.redstone : o < 0.65 ? B.emerald : o < 0.82 ? B.iron : B.coal;
            }
            // Torches and stone lantern sconces along corridors
            if (y === F + 4 && (x + z) % 6 === 0 && roll > 0.22 && kind !== "link") {
              id = kind === "lagoon" ? B.lapis : B.glowstone;
            }
          }
        } else {
          // Solid underground rock strata with rich veins
          const tone = valueNoise(x / 6, y / 5, z / 6, 5);
          if (tone > 0.66) id = B.cobble;
          else if (tone < 0.24) id = B.smooth;
          else if (tone > 0.5 && roll > 0.8) id = B.mossy;
          const vein = valueNoise(x / 3, y / 3, z / 3, 21);
          if (vein > 0.76) {
            if (roll < 0.10) id = B.diamond;
            else if (roll < 0.20 && y < 24) id = B.redstone;
            else if (roll < 0.30) id = B.lapis;
            else if (roll < 0.38 && y < 20) id = B.emerald;
            else if (roll < 0.50) id = B.gold;
            else if (roll < 0.72) id = B.iron;
            else id = B.coal;
          } else if (roll < 0.04) id = B.coal;
          else if (roll < 0.05) id = B.iron;
        }
        set(x, y, z, id);
      }
    }
  }

  // 2. Handcrafted Architectural Monolithic Columns in Grand Antechamber
  // Symmetrical double colonnade at x = ±10, z = -8, 0, 8, 16
  const pillarZs = [-8, 0, 8, 16];
  for (const pz of pillarZs) {
    for (const px of [-10, 10]) {
      for (let py = F + 1; py <= F + 9; py++) {
        if (py === F + 1 || py === F + 8) {
          set(px, py, pz, B.bricks);
        } else if (py === F + 7) {
          set(px, py, pz, B.glowstone); // Integrated warm pillar sconce
        } else {
          set(px, py, pz, B.smooth);
        }
      }
      // Vaulted cross-rib arches connecting pillars
      for (let ax = -9; ax <= 9; ax++) {
        set(ax, F + 10, pz, B.bricks);
      }
    }
  }

  // 3. Ancient Crypt of Kings: Carved Sarcophagi & Relic Altars
  const sarcophagi = [
    [-12, 34], [12, 34],
    [-12, 44], [12, 44],
    [-12, 54], [12, 54],
    [0, 58], // Royal King Sarcophagus at the crypt terminus
  ];
  for (const [sx, sz] of sarcophagi) {
    set(sx, F + 1, sz, B.bricks);
    set(sx, F + 1, sz + 1, B.bricks);
    set(sx, F + 2, sz, sx === 0 ? B.gold : B.smooth);
    set(sx, F + 2, sz + 1, sx === 0 ? B.gold : B.smooth);
    // Torches/Braziers flanking tombs
    set(sx - 1, F + 1, sz, B.cobble);
    set(sx - 1, F + 2, sz, B.glowstone);
    set(sx + 1, F + 1, sz, B.cobble);
    set(sx + 1, F + 2, sz, B.glowstone);
  }

  // 4. Royal Gilded Treasury: Stepped Gold Dais with Emerald Columns
  // Raised altar at x = -56..-46, z = -5..5
  for (let vx = -58; vx <= -44; vx++) {
    for (let vz = -6; vz <= 6; vz++) {
      set(vx, F + 1, vz, B.bricks);
      if (vx >= -56 && vx <= -46 && vz >= -4 && vz <= 4) {
        set(vx, F + 2, vz, B.smooth);
      }
      if (vx >= -54 && vx <= -48 && vz >= -2 && vz <= 2) {
        set(vx, F + 3, vz, B.gold); // New gold block texture on the royal altar!
      }
    }
  }
  // Gilded vault corner pillars
  for (const vx of [-58, -44]) {
    for (const vz of [-6, 6]) {
      set(vx, F + 1, vz, B.emerald);
      set(vx, F + 2, vz, B.emerald);
      set(vx, F + 3, vz, B.glowstone);
    }
  }

  // 5. Subterranean Sunken Lagoon: Deep Basin & Mooring Boardwalks
  // Submarine berthed at (x: 26, z: -44)
  for (let z = -78; z <= -26; z++) {
    for (let x = 12; x <= 56; x++) {
      // Clear lagoon water basin: depth 2 blocks (F and F-1)
      set(x, F - 1, z, (x + z) % 3 === 0 ? B.gravel : B.cobble);
      set(x, F, z, B.water);
      set(x, F + 1, z, B.water);

      // Perimeter timber mooring docks
      if (x === 12 || x === 56 || z === -26 || z === -78) {
        set(x, F + 1, z, B.darkOak);
      }
      // Glowing mooring lanterns along the edges
      if ((x === 12 || x === 56) && z % 8 === 0) {
        set(x, F + 2, z, B.darkOak);
        set(x, F + 3, z, B.glowstone);
      }
    }
  }

  // Main docking pier extending out to the berthed rusty submarine at (26, -44)
  for (let px = 12; px <= 32; px++) {
    for (let pz = -46; pz <= -42; pz++) {
      set(px, F + 1, pz, B.darkOak);
      set(px, F + 2, pz, (px === 32 || pz === -46 || pz === -42) && px % 4 === 0 ? B.glowstone : 0);
    }
  }

  // 6. Grand Crystal Cavern: Towering Geode Spires & Suspended Catwalks
  const geodes = [
    [-24, -40],
    [-48, -60],
    [-18, -72],
    [-58, -34],
    [-68, -50],
  ];
  for (const [gx, gz] of geodes) {
    set(gx, F + 1, gz, B.obsidian);
    set(gx + 1, F + 1, gz, B.obsidian);
    set(gx, F + 1, gz + 1, B.obsidian);
    set(gx + 1, F + 1, gz + 1, B.obsidian);

    set(gx, F + 2, gz, B.amethyst);
    set(gx + 1, F + 2, gz, B.diamondBlock);
    set(gx, F + 2, gz + 1, B.gold); // Rich gold block node
    set(gx + 1, F + 2, gz + 1, B.lapis);

    set(gx, F + 3, gz, B.glowstone);
    set(gx + 1, F + 3, gz, B.amethyst);
    set(gx, F + 4, gz, B.diamondBlock);
    set(gx, F + 5, gz, B.glowstone);
  }

  // Suspended Timber Catwalk in Great Cavern (y = F + 5)
  for (let bx = -50; bx <= 2; bx++) {
    set(bx, F + 5, -50, B.darkOak);
    if (bx % 6 === 0) {
      set(bx, F + 6, -50, B.glowstone); // Hanging lanterns along the bridge
    }
  }

  // Chest treasure spots distributed intentionally across districts
  const chestSpots = [
    { x: OX + 21.5, y: F + 1, z: OZ + 2.5 },
    { x: OX + 14.5, y: F + 1, z: OZ - 9.5 },
    { x: OX - 14.5, y: F + 1, z: OZ + 19.5 },
    { x: OX - 51.5, y: F + 4, z: OZ + 0.5 }, // Altar Dais in Treasury
    { x: OX - 68.5, y: F + 1, z: OZ + 0.5 }, // Secret Treasury Vault
    { x: OX + 0.5, y: F + 2, z: OZ + 60.5 }, // Royal Crypt Sarcophagus
    { x: OX + 28.5, y: F + 2, z: OZ - 44.5 }, // Submarine Pier Chest
    { x: OX - 42.5, y: F + 1, z: OZ - 56.5 }, // Crystal Cavern Deep Vein
    { x: OX - 68.5, y: F + 1, z: OZ - 46.5 }, // Luminous Geode Grotto
  ];

  return {
    spawn: { x: OX + 24.5, y: F + 1.2, z: OZ + 0.5 },
    contains: (x: number, z: number) =>
      x >= OX + X_MIN - 6 && x <= OX + X_MAX + 6 && z >= OZ + Z_MIN - 6 && z <= OZ + Z_MAX + 6,
    chestSpots,
    lights: [
      // Grand Antechamber warm ambient glow
      { x: OX + 0.5, y: F + 7, z: OZ + 0.5, color: 0xffe4a0, intensity: 3.5, distance: 32 },
      { x: OX, y: F + 7, z: OZ + 14, color: 0xffd270, intensity: 3.2, distance: 30 },
      // Royal Treasury golden amber
      { x: OX - 50, y: F + 6, z: OZ, color: 0xfbbf24, intensity: 3.8, distance: 34 },
      // Ancient Crypt emerald-teal mystical glow
      { x: OX, y: F + 6, z: OZ + 42, color: 0x6ee7b7, intensity: 3.2, distance: 30 },
      { x: OX, y: F + 6, z: OZ + 58, color: 0x34d399, intensity: 3.4, distance: 28 },
      // Subterranean Lagoon deep cyan bioluminescence
      { x: OX + 26, y: F + 7, z: OZ - 44, color: 0x38bdf8, intensity: 4.8, distance: 44 },
      { x: OX + 44, y: F + 7, z: OZ - 60, color: 0x0284c7, intensity: 4.2, distance: 38 },
      // Vast Mining Cavern crystal radiance
      { x: OX - 32, y: F + 8, z: OZ - 48, color: 0xffeedd, intensity: 4.2, distance: 40 },
      { x: OX - 60, y: F + 7, z: OZ - 44, color: 0xc084fc, intensity: 3.8, distance: 32 },
      // Dragon Arena volcanic fire
      { x: OX + 44, y: F + 10, z: OZ, color: 0xff5a2a, intensity: 5.2, distance: 48 },
    ],
  };
}
