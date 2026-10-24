import type { World } from "@/engine-sandbox/shared/world";
import { WATER_ID } from "@/engine-sandbox/shared/world";

/** Deep Mines: a huge underground cavern far from the island, reached by teleport. */
export const MINE_ORIGIN = { x: 384, z: 0 };
export const MINE_FLOOR = 12;
const R = 46;
const Y_MAX = 46;

const B = {
  stone: 3,
  cobble: 4,
  bricks: 5,
  plankOak: 13,
  mossy: 14,
  gravel: 15,
  glowstone: 18,
  gold: 19,
  emerald: 21,
  lapis: 22,
  amethyst: 23,
  bookshelf: 24,
  terracotta: 34,
  netherBricks: 35,
  coal: 36,
  redstone: 37,
  darkOak: 39,
  path: 41,
  smooth: 42,
  iron: 47,
  diamond: 48,
  chest: 55,
  obsidian: 11,
  bedrock: 12,
  glass: 10,
  lava: 62,
  oakSlab: 64,
  stoneSlab: 65,
  water: WATER_ID,
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

const inChasm = (x: number, z: number) => x >= 15 && x <= 23 && z >= -38 && z <= 38;

export interface MiningArea {
  spawn: { x: number; y: number; z: number };
  lights: { x: number; y: number; z: number; color: number; intensity: number; distance: number }[];
  contains: (x: number, z: number) => boolean;
}

/** Writes the full cavern into the world with raw (non-simulated) block writes. */
export function buildMiningArea(world: World): MiningArea {
  const OX = MINE_ORIGIN.x;
  const OZ = MINE_ORIGIN.z;
  const set = (x: number, y: number, z: number, id: number) => world.setRaw(OX + x, y, OZ + z, id);

  // 1. Carve mask for the cavern shell.
  const W = R * 2 + 1;
  const H = Y_MAX + 1;
  const idx = (x: number, y: number, z: number) => ((y * W + (z + R)) * W + (x + R));
  const cave = new Uint8Array(W * W * H);
  for (let y = 1; y <= Y_MAX; y++) {
    for (let z = -R; z <= R; z++) {
      for (let x = -R; x <= R; x++) {
        const wobble = (valueNoise(x / 9, y / 7, z / 9, 7) - 0.5) * 0.5 + (valueNoise(x / 4, y / 4, z / 4, 3) - 0.5) * 0.18;
        const nx = x / 40;
        const nz = z / 40;
        const ny = (y - 27) / 17;
        let open = nx * nx + ny * ny + nz * nz < 1 + wobble && y > MINE_FLOOR;
        if (inChasm(x, z) && y >= 2 && y <= MINE_FLOOR && Math.abs(z) < 36 - (MINE_FLOOR - y) * 0.4) open = true;
        // Side tunnel heading off into the dark (like the rail line in the reference).
        if (z >= -3 && z <= 3 && x > 24 && x < R - 1 && y > MINE_FLOOR && y <= MINE_FLOOR + 5) open = true;
        if (open) cave[idx(x, y, z)] = 1;
      }
    }
  }
  const isCave = (x: number, y: number, z: number) =>
    x >= -R && x <= R && z >= -R && z <= R && y >= 0 && y <= Y_MAX && cave[idx(x, y, z)] === 1;

  // 2. Fill rock, with rich ore exposed on cavern walls.
  for (let y = 0; y <= Y_MAX + 1; y++) {
    for (let z = -R; z <= R; z++) {
      for (let x = -R; x <= R; x++) {
        if (y <= Y_MAX && isCave(x, y, z)) continue;
        if (y === 0 || y === Y_MAX + 1) {
          set(x, y, z, B.bedrock);
          continue;
        }
        const exposed =
          isCave(x + 1, y, z) || isCave(x - 1, y, z) || isCave(x, y + 1, z) ||
          isCave(x, y - 1, z) || isCave(x, y, z + 1) || isCave(x, y, z - 1);
        const r = hash3(x, y, z, 11);
        const vein = valueNoise(x / 3, y / 3, z / 3, 21);
        let id: number = B.stone;
        const tone = valueNoise(x / 6, y / 5, z / 6, 5);
        if (tone > 0.68) id = B.cobble;
        else if (tone < 0.22) id = B.smooth;
        if (y < 6 && tone > 0.5) id = B.gravel;
        if (exposed && isCave(x, y + 1, z) === false && isCave(x, y - 1, z) && tone > 0.6) id = B.mossy;
        const oreChance = exposed ? 1.6 : 0.6;
        if (vein > 0.8) {
          if (r < 0.05 * oreChance) id = B.diamond;
          else if (r < 0.1 * oreChance && y < 24) id = B.redstone;
          else if (r < 0.16 * oreChance) id = B.lapis;
          else if (r < 0.2 * oreChance && y < 18) id = B.emerald;
          else if (r < 0.28 * oreChance) id = B.gold;
          else if (r < 0.5 * oreChance) id = B.iron;
          else id = B.coal;
        } else if (r < 0.025 * oreChance) {
          id = B.coal;
        } else if (r < 0.035 * oreChance) {
          id = B.iron;
        }
        if (exposed && r > 0.996 && y > MINE_FLOOR + 6) id = B.amethyst;
        set(x, y, z, id);
      }
    }
  }

  // 3. Stalactites & stalagmites.
  for (let z = -R + 2; z <= R - 2; z += 1) {
    for (let x = -R + 2; x <= R - 2; x += 1) {
      const r = hash3(x, 0, z, 41);
      if (r > 0.035) continue;
      let ceil = -1;
      for (let y = Y_MAX - 1; y > MINE_FLOOR + 2; y--) {
        if (isCave(x, y, z) && !isCave(x, y + 1, z)) {
          ceil = y;
          break;
        }
      }
      if (ceil < 0) continue;
      const len = 2 + Math.floor(hash3(x, 1, z, 42) * (r < 0.012 ? 11 : 5));
      for (let i = 0; i < len; i++) {
        const y = ceil - i;
        if (y <= MINE_FLOOR + 3) break;
        set(x, y, z, i < 2 ? B.cobble : B.stone);
        if (r < 0.012 && i < len * 0.45) {
          set(x + 1, y, z, B.stone);
          set(x, y, z + 1, B.stone);
          set(x - 1, y, z, B.cobble);
        }
      }
      if (hash3(x, 2, z, 43) < 0.18) set(x, ceil + 1, z, B.glowstone);
    }
  }
  for (let z = -R + 2; z <= R - 2; z++) {
    for (let x = -R + 2; x <= R - 2; x++) {
      if (Math.hypot(x, z) < 30 || inChasm(x, z)) continue;
      if (hash3(x, 3, z, 51) > 0.03) continue;
      if (!isCave(x, MINE_FLOOR + 1, z)) continue;
      const len = 1 + Math.floor(hash3(x, 4, z, 52) * 5);
      for (let i = 1; i <= len; i++) set(x, MINE_FLOOR + i, z, i === len ? B.cobble : B.stone);
    }
  }

  // Ceiling glow clusters so the cavern reads like the reference shots.
  for (let n = 0; n < 34; n++) {
    const cx = Math.floor((hash3(n, 5, 0, 61) - 0.5) * 70);
    const cz = Math.floor((hash3(n, 6, 0, 62) - 0.5) * 70);
    for (let y = Y_MAX - 1; y > MINE_FLOOR + 4; y--) {
      if (isCave(cx, y, cz) && !isCave(cx, y + 1, cz)) {
        set(cx, y + 1, cz, B.glowstone);
        set(cx + 1, y + 1, cz, B.glowstone);
        set(cx, y + 1, cz + 1, B.glowstone);
        break;
      }
    }
  }

  const F = MINE_FLOOR;
  const box = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, id: number) => {
    for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) set(x, y, z, id);
  };
  const clear = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => box(x0, y0, z0, x1, y1, z1, 0);
  const lantern = (x: number, z: number, h = 2) => {
    for (let i = 1; i <= h; i++) set(x, F + i, z, B.darkOak);
    set(x, F + h + 1, z, B.glowstone);
  };

  // 4. Spawn plaza + return portal.
  for (let z = -8; z <= 8; z++) {
    for (let x = -8; x <= 8; x++) {
      const d = Math.hypot(x, z);
      if (d > 8.4) continue;
      set(x, F, z, d < 3 ? B.smooth : (x + z) % 2 === 0 ? B.bricks : B.cobble);
      clear(x, F + 1, z, x, F + 6, z);
    }
  }
  box(-2, F + 1, 7, 2, F + 5, 7, B.obsidian);
  clear(-1, F + 2, 7, 1, F + 4, 7);
  box(-1, F + 2, 7, 1, F + 4, 7, B.amethyst);
  set(5, F + 1, 5, B.chest);
  set(-5, F + 1, 5, B.chest);
  lantern(6, -6);
  lantern(-6, -6);
  lantern(6, 6);
  lantern(-6, 6);

  // 5. Rail line: path strip with plank sleepers, across the bridge into the side tunnel.
  for (let x = -34; x <= R - 2; x++) {
    if (inChasm(x, 0)) continue;
    if (Math.hypot(x, 0) < 8.4) continue;
    for (let z = -1; z <= 1; z++) {
      set(x, F, z, z === 0 ? B.path : x % 2 === 0 ? B.plankOak : B.gravel);
      clear(x, F + 1, z, x, F + 4, z);
    }
    if (x % 8 === 0 && x > 24) {
      lantern(x, 3);
      lantern(x, -3);
    }
  }

  // 6. Chasm bridge with dark oak pillars and lava at the bottom.
  for (let z = -36; z <= 36; z++) for (let x = 15; x <= 23; x++) if (isCave(x, 2, z)) set(x, 2, z, B.lava);
  for (let x = 14; x <= 24; x++) {
    for (let z = -2; z <= 2; z++) set(x, F, z, Math.abs(z) === 2 ? B.darkOak : B.plankOak);
    set(x, F + 1, -2, B.oakSlab);
    set(x, F + 1, 2, B.oakSlab);
  }
  for (const px of [15, 19, 23]) for (const pz of [-2, 2]) for (let y = 3; y < F; y++) set(px, y, pz, B.darkOak);

  // 7. Lava fall pouring from the ceiling into a brick-rimmed pool.
  const LX = -27;
  const LZ = -20;
  for (let z = LZ - 4; z <= LZ + 4; z++) {
    for (let x = LX - 4; x <= LX + 4; x++) {
      const rim = Math.abs(x - LX) === 4 || Math.abs(z - LZ) === 4;
      set(x, F - 1, z, B.netherBricks);
      set(x, F, z, rim ? B.bricks : B.lava);
      clear(x, F + 1, z, x, F + 3, z);
      if (rim) set(x, F + 1, z, B.netherBricks);
    }
  }
  let lavaTop = F + 1;
  for (let y = F + 1; y < Y_MAX; y++) {
    if (!isCave(LX, y, LZ)) break;
    lavaTop = y;
  }
  for (let y = F + 1; y <= lavaTop + 1; y++) {
    set(LX, y, LZ, B.lava);
    if (y > F + 6) set(LX + 1, y, LZ, B.lava);
  }

  // 8. Two-storey forge: stone bricks below, dark oak frame above, three smelters.
  const fx0 = -16;
  const fz0 = -28;
  const fx1 = -4;
  const fz1 = -16;
  box(fx0, F, fz0, fx1, F, fz1, B.smooth);
  clear(fx0, F + 1, fz0, fx1, F + 12, fz1);
  for (let y = F + 1; y <= F + 10; y++) {
    for (let z = fz0; z <= fz1; z++) {
      for (let x = fx0; x <= fx1; x++) {
        const edgeX = x === fx0 || x === fx1;
        const edgeZ = z === fz0 || z === fz1;
        if (!edgeX && !edgeZ) continue;
        const corner = edgeX && edgeZ;
        const upper = y > F + 5;
        let id: number = upper ? B.plankOak : B.bricks;
        if (corner || y === F + 5 || y === F + 10) id = B.darkOak;
        if (!corner && (y === F + 3 || y === F + 8) && ((x + z) % 3 === 0)) id = B.glass;
        set(x, y, z, id);
      }
    }
  }
  clear(-11, F + 1, fz1, -9, F + 3, fz1);
  box(fx0 + 1, F + 5, fz0 + 1, fx1 - 1, F + 5, fz1 - 1, B.plankOak);
  clear(fx1 - 3, F + 5, fz1 - 3, fx1 - 1, F + 5, fz1 - 1);
  for (let i = 0; i <= 6; i++) {
    const y = F + 11 + i;
    if (fx0 + i > fx1 - i || fz0 + i > fz1 - i) break;
    for (let z = fz0 + i; z <= fz1 - i; z++) for (let x = fx0 + i; x <= fx1 - i; x++) {
      const edge = x === fx0 + i || x === fx1 - i || z === fz0 + i || z === fz1 - i;
      if (edge) set(x, y, z, i % 2 === 0 ? B.stoneSlab : B.bricks);
    }
  }
  for (const sx of [-14, -10, -6]) {
    box(sx - 1, F + 1, fz0 + 1, sx + 1, F + 3, fz0 + 2, B.cobble);
    set(sx, F + 1, fz0 + 2, B.lava);
    set(sx, F + 2, fz0 + 2, B.glowstone);
  }
  set(-12, F + 1, -19, B.chest);
  for (let y = F + 11; y <= Math.min(Y_MAX - 3, F + 26); y++) {
    set(-15, y, -27, y > F + 24 ? B.terracotta : B.netherBricks);
    set(-14, y, -27, y > F + 24 ? B.terracotta : B.netherBricks);
  }
  set(-15, F + 27, -27, B.glowstone);

  // 9. Copper workshop with terracotta pipes and chimneys beside a water channel.
  const wx0 = -18;
  const wz0 = 14;
  const wx1 = -4;
  const wz1 = 26;
  box(wx0, F, wz0, wx1, F, wz1, B.plankOak);
  clear(wx0, F + 1, wz0, wx1, F + 12, wz1);
  for (let y = F + 1; y <= F + 7; y++) {
    for (let z = wz0; z <= wz1; z++) {
      for (let x = wx0; x <= wx1; x++) {
        const edgeX = x === wx0 || x === wx1;
        const edgeZ = z === wz0 || z === wz1;
        if (!edgeX && !edgeZ) continue;
        const corner = edgeX && edgeZ;
        let id: number = y <= F + 2 ? B.cobble : B.plankOak;
        if (corner || y === F + 7) id = B.darkOak;
        if (!corner && y === F + 4 && (x + z) % 2 === 0) id = B.glass;
        set(x, y, z, id);
      }
    }
  }
  clear(-12, F + 1, wz0, -10, F + 3, wz0);
  for (let i = 0; i <= 4; i++) {
    for (let x = wx0 - 1; x <= wx1 + 1; x++) {
      set(x, F + 8 + i, wz0 + i, B.darkOak);
      set(x, F + 8 + i, wz1 - i, B.darkOak);
    }
  }
  for (let x = wx0 - 1; x <= wx1 + 1; x++) for (let z = wz0 + 5; z <= wz1 - 5; z++) set(x, F + 12, z, B.terracotta);
  for (let x = wx0; x <= wx1; x++) set(x, F + 8, wz0 - 1, B.terracotta);
  for (const [cx, cz] of [[-16, 24], [-6, 24], [-11, 16]] as const) {
    for (let y = F + 8; y <= F + 20; y++) set(cx, y, cz, y > F + 18 ? B.terracotta : B.netherBricks);
    set(cx, F + 21, cz, B.glowstone);
  }
  for (let y = F + 1; y <= F + 8; y++) set(wx1 + 1, y, 20, B.terracotta);
  for (let x = wx1 + 1; x <= wx1 + 4; x++) set(x, F + 8, 20, B.terracotta);
  box(-16, F + 1, 24, -14, F + 2, 24, B.bookshelf);
  set(-8, F + 1, 24, B.chest);
  box(-14, F + 1, 18, -12, F + 1, 18, B.cobble);
  set(-13, F + 2, 18, B.lava);
  lantern(-3, 13);
  lantern(-19, 13);

  // Water channel running from the far wall to a waterfall into the chasm.
  for (let x = -40; x <= 14; x++) {
    for (let z = 9; z <= 11; z++) {
      if (!isCave(x, F + 1, z) && x < -30) continue;
      set(x, F - 1, z, B.bricks);
      set(x, F, z, z === 10 ? B.water : B.bricks);
      clear(x, F + 1, z, x, F + 3, z);
    }
    if (x % 7 === 0) {
      set(x, F, 10, B.plankOak);
    }
  }
  for (let y = 3; y < F; y++) set(15, y, 10, B.water);

  const spawn = { x: OX + 0.5, y: F + 1.2, z: OZ + 0.5 };
  return {
    spawn,
    contains: (x: number, z: number) => Math.abs(x - OX) <= R + 8 && Math.abs(z - OZ) <= R + 8,
    lights: [
      { x: OX + LX + 0.5, y: F + 3, z: OZ + LZ + 0.5, color: 0xff7a1a, intensity: 7, distance: 26 },
      { x: OX - 10, y: F + 3, z: OZ + fz0 + 3, color: 0xff9a3c, intensity: 5, distance: 18 },
      { x: OX - 11, y: F + 4, z: OZ + 20, color: 0xffb86b, intensity: 4.5, distance: 18 },
      { x: OX + 19, y: 5, z: OZ, color: 0xff5a10, intensity: 6, distance: 22 },
    ],
  };
}
