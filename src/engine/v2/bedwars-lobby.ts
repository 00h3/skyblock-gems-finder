import { WATER_ID, type World } from "@/engine/world";

const B = {
  grass: 1,
  dirt: 2,
  stone: 3,
  cobble: 4,
  bricks: 5,
  leaves: 9,
  glass: 10,
  gold: 19,
  lapis: 22,
  glowstone: 18,
  whiteWool: 29,
  smooth: 42,
  quartzLike: 16,
} as const;

export const BEDWARS_LOBBY_SURFACE_Y = 16;
export const BEDWARS_LOBBY_SPAWN = { x: 0.5, y: 17.5, z: 8.5 };
export const BEDWARS_MATCHMAKER_POS = { x: 6.5, y: 17, z: -4.5 };
export const BEDWARS_LOBBY_BOUNDS = { minX: -16, maxX: 16, minZ: -16, maxZ: 16, minY: 10, maxY: 20 };

/** 5x7 block glyphs, rows top → bottom. */
const GLYPHS: Record<string, string[]> = {
  B: ["1111.", "1...1", "1...1", "1111.", "1...1", "1...1", "1111."],
  E: ["11111", "1....", "1....", "1111.", "1....", "1....", "11111"],
  D: ["1111.", "1...1", "1...1", "1...1", "1...1", "1...1", "1111."],
  W: ["1...1", "1...1", "1...1", "1.1.1", "1.1.1", "11.11", "1...1"],
  A: [".111.", "1...1", "1...1", "11111", "1...1", "1...1", "1...1"],
  R: ["1111.", "1...1", "1...1", "1111.", "1.1..", "1..1.", "1...1"],
  S: [".1111", "1....", "1....", ".111.", "....1", "....1", "1111."],
};

/** Writes block letters on the XY plane at depth `z`, reading left → right along +X. */
function writeText(world: World, text: string, left: number, top: number, z: number, block: number) {
  let x = left;
  for (const ch of text) {
    const glyph = GLYPHS[ch];
    if (glyph) {
      glyph.forEach((row, r) => {
        for (let c = 0; c < row.length; c++) {
          if (row[c] === "1") world.set(x + c, top - r, z, block);
        }
      });
    }
    x += 6;
  }
}

function hash(x: number, z: number) {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function buildIsland(world: World, surfaceY: number) {
  const R = 15.5;
  for (let x = -16; x <= 16; x++) {
    for (let z = -16; z <= 16; z++) {
      const d = Math.hypot(x, z);
      if (d > R) continue;
      const depth = Math.round(2 + (R - d) * 0.75 + hash(x, z) * 2);
      const bottom = surfaceY - depth;
      for (let y = bottom; y < surfaceY; y++) {
        world.set(x, y, z, y === surfaceY - 1 ? B.dirt : (x + y + z) % 3 === 0 ? B.cobble : B.stone);
      }
      let top: number = B.smooth;
      if (d > 11.2 && d <= 13.6) top = B.grass;
      else if (d > 13.6) top = B.bricks;
      else if (d > 10.4) top = B.gold;
      else if (Math.abs(x) <= 1 || Math.abs(z) <= 1) top = B.whiteWool;
      else if (Math.round(d) % 4 === 0) top = B.quartzLike;
      world.set(x, surfaceY, z, top);
    }
  }
}

function buildFountain(world: World, y: number) {
  for (let x = -3; x <= 3; x++) {
    for (let z = -3; z <= 3; z++) {
      const d = Math.hypot(x, z);
      if (d > 3.3) continue;
      if (d > 2.4) {
        world.set(x, y + 1, z, B.bricks);
        world.set(x, y, z, B.bricks);
      } else {
        world.set(x, y - 1, z, B.bricks);
        world.set(x, y, z, WATER_ID);
      }
    }
  }
  for (let h = 0; h <= 3; h++) world.set(0, y + h, 0, h === 3 ? B.glowstone : B.gold);
}

function buildPillars(world: World, y: number) {
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const x = Math.round(Math.cos(a) * 12.4);
    const z = Math.round(Math.sin(a) * 12.4);
    for (let h = 1; h <= 5; h++) world.set(x, y + h, z, B.whiteWool);
    world.set(x, y + 6, z, B.gold);
    world.set(x, y + 7, z, B.glowstone);
  }
}

function buildGarden(world: World, y: number) {
  for (let x = -14; x <= 14; x++) {
    for (let z = -14; z <= 14; z++) {
      const d = Math.hypot(x, z);
      if (d <= 11.6 || d > 13.4) continue;
      if (hash(x * 3.1, z * 1.7) > 0.82) world.set(x, y + 1, z, B.leaves);
    }
  }
}

/** Big halo'd sign with angel wings: "BEDWARS" in gold on lapis. */
function buildSign(world: World) {
  const z = -18;
  const left = -21;
  const right = 21;
  const bottom = 21;
  const top = 31;
  for (let x = left; x <= right; x++) {
    for (let y = bottom; y <= top; y++) {
      const border = x === left || x === right || y === bottom || y === top;
      world.set(x, y, z, border ? B.gold : B.lapis);
    }
  }
  writeText(world, "BEDWARS", left + 1, top - 2, z + 1, B.gold);

  // Wings flare out from both sides, feathers stepping down.
  for (const side of [-1, 1]) {
    const edge = side < 0 ? left : right;
    for (let dx = 1; dx <= 12; dx++) {
      const yTop = top + 3 - Math.floor(dx / 3);
      const yBot = bottom + 1 + Math.floor(dx * 0.62);
      for (let y = yBot; y <= yTop; y++) {
        const notch = dx % 3 === 0 && y === yBot;
        if (!notch) world.set(edge + side * dx, y, z, y === yTop ? B.quartzLike : B.whiteWool);
      }
    }
  }

  // Floating golden halo above the sign.
  const hy = top + 5;
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    world.set(Math.round(Math.cos(a) * 6), hy, z + Math.round(Math.sin(a) * 2.2), B.gold);
  }
}

function buildClouds(world: World) {
  const clouds = [
    [-26, 26, 6],
    [24, 23, -2],
    [-20, 30, -30],
    [30, 28, 18],
    [-30, 20, 22],
    [10, 34, 28],
  ];
  for (const [cx, cy, cz] of clouds) {
    for (let x = -4; x <= 4; x++) {
      for (let z = -2; z <= 2; z++) {
        for (let y = 0; y <= 1; y++) {
          const d = Math.hypot(x / 4.2, z / 2.3, y / 1.4);
          if (d <= 1 && hash(cx + x, cz + z + y) > 0.12) world.set(cx + x, cy + y, cz + z, B.whiteWool);
        }
      }
    }
  }
}

/** Golden-hour angel sanctuary lobby for Bedwars. */
export function buildBedwarsLobby(world: World) {
  const y = BEDWARS_LOBBY_SURFACE_Y;
  buildIsland(world, y);
  buildFountain(world, y);
  buildPillars(world, y);
  buildGarden(world, y);
  buildSign(world);
  buildClouds(world);
}
