import { WATER_ID, type World } from "@/engine/world";

const B = {
  grass: 1,
  dirt: 2,
  stone: 3,
  cobble: 4,
  bricks: 5,
  oakLog: 7,
  leaves: 9,
  glass: 10,
  planks: 13,
  snow: 16,
  glowstone: 18,
  gold: 19,
  diamond: 20,
  emerald: 21,
  lapis: 22,
  amethyst: 23,
  whiteWool: 29,
  redWool: 30,
  blueWool: 31,
  greenWool: 32,
  yellowWool: 33,
  terracotta: 34,
  smooth: 42,
} as const;

export const BEDWARS_LOBBY_SURFACE_Y = 16;
export const BEDWARS_LOBBY_SPAWN = { x: 0.5, y: 17.5, z: 8.5 };
export const BEDWARS_MATCHMAKER_POS = { x: 0.5, y: 17, z: -7.5 };
export const BEDWARS_LOBBY_BOUNDS = { minX: -16, maxX: 16, minZ: -16, maxZ: 16, minY: 10, maxY: 20 };

const PLAZA = 12;
const CURB = 13;

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

function fill(world: World, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, id: number) {
  for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++)
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++)
      for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) world.set(x, y, z, id);
}

/** Square floating plaza: white tile checker, stone-brick curb, grass garden ring. */
function buildPlaza(world: World, y: number) {
  for (let x = -16; x <= 16; x++) {
    for (let z = -16; z <= 16; z++) {
      const cheb = Math.max(Math.abs(x), Math.abs(z));
      const corner = Math.abs(x) + Math.abs(z) > 29;
      if (corner) continue;
      const depth = Math.round(3 + (16 - cheb) * 0.7 + hash(x, z) * 3);
      for (let yy = y - depth; yy < y; yy++) {
        world.set(x, yy, z, yy >= y - 2 ? B.dirt : (x + yy + z) % 3 === 0 ? B.cobble : B.stone);
      }
      let top: number;
      if (cheb <= PLAZA) {
        const tile = (Math.floor((x + 32) / 2) + Math.floor((z + 32) / 2)) % 2 === 0;
        top = tile ? B.snow : B.smooth;
        if (Math.abs(x) <= 1 || Math.abs(z) <= 1) top = B.smooth;
      } else if (cheb === CURB) {
        top = B.bricks;
      } else {
        top = B.grass;
      }
      world.set(x, y, z, top);
    }
  }

  // Raised stone-brick curb with gaps at the four entrances.
  for (let i = -CURB; i <= CURB; i++) {
    for (const [x, z] of [
      [i, -CURB],
      [i, CURB],
      [-CURB, i],
      [CURB, i],
    ]) {
      const entrance = Math.abs(x) <= 1 || Math.abs(z) <= 1;
      if (!entrance) world.set(x, y + 1, z, B.bricks);
    }
  }
}

function buildFountain(world: World, y: number) {
  for (let x = -3; x <= 3; x++) {
    for (let z = -3; z <= 3; z++) {
      const d = Math.hypot(x, z);
      if (d > 3.2) continue;
      if (d > 2.3) {
        world.set(x, y + 1, z, B.bricks);
      } else {
        world.set(x, y - 1, z, B.bricks);
        world.set(x, y, z, WATER_ID);
      }
    }
  }
  fill(world, 0, y, 0, 0, y + 2, 0, B.smooth);
  world.set(0, y + 3, 0, B.gold);
  world.set(0, y + 4, 0, B.glowstone);
}

function lamp(world: World, x: number, y: number, z: number) {
  world.set(x, y + 1, z, B.cobble);
  fill(world, x, y + 2, z, x, y + 4, z, B.oakLog);
  world.set(x, y + 5, z, B.glowstone);
}

function tree(world: World, x: number, y: number, z: number, h: number) {
  fill(world, x, y + 1, z, x, y + h, z, B.oakLog);
  for (let dx = -2; dx <= 2; dx++)
    for (let dz = -2; dz <= 2; dz++)
      for (let dy = -1; dy <= 1; dy++) {
        const r = Math.abs(dx) + Math.abs(dz) + Math.abs(dy) * 1.5;
        if (r <= 3 && hash(x + dx * 7, z + dz * 3 + dy) > 0.08) world.set(x + dx, y + h + dy, z + dz, B.leaves);
      }
  world.set(x, y + h + 2, z, B.leaves);
}

function buildGarden(world: World, y: number) {
  const trees: [number, number, number][] = [
    [-15, -15, 5],
    [15, -15, 5],
    [-15, 15, 4],
    [15, 15, 5],
    [-15, -6, 4],
    [15, -7, 5],
    [-15, 7, 5],
    [15, 6, 4],
    [-7, 15, 5],
    [7, 15, 4],
  ];
  for (const [x, z, h] of trees) tree(world, x, y, z, h);

  // Flower-bed bushes along the garden ring.
  for (let x = -16; x <= 16; x++) {
    for (let z = -16; z <= 16; z++) {
      const cheb = Math.max(Math.abs(x), Math.abs(z));
      if (cheb < 14 || Math.abs(x) + Math.abs(z) > 29) continue;
      const r = hash(x * 3.1, z * 1.7);
      if (r > 0.9) world.set(x, y + 1, z, B.leaves);
      else if (r > 0.86) world.set(x, y + 1, z, B.redWool);
      else if (r > 0.83) world.set(x, y + 1, z, B.yellowWool);
    }
  }

  for (const [x, z] of [
    [-11, -11],
    [11, -11],
    [-11, 11],
    [11, 11],
    [-3, 11],
    [4, 11],
  ])
    lamp(world, x, y, z);
}

/** Four team portals on the north side, behind the matchmaker ("Start game"). */
function buildPortals(world: World, y: number) {
  const z = -11;
  const teams = [B.redWool, B.blueWool, B.greenWool, B.yellowWool];
  // Stepped stone base the portals stand on.
  fill(world, -11, y + 1, z - 1, 11, y + 1, z, B.smooth);
  fill(world, -11, y + 1, z + 1, 11, y + 1, z + 1, B.bricks);
  teams.forEach((wool, i) => {
    const cx = -7.5 + i * 5;
    const x0 = Math.round(cx - 2);
    const x1 = x0 + 4;
    for (let x = x0; x <= x1; x++) {
      for (let yy = y + 2; yy <= y + 8; yy++) {
        const frame = x === x0 || x === x1 || yy === y + 8;
        world.set(x, yy, z, frame ? B.snow : wool);
      }
    }
    // Crenellated cap.
    world.set(x0, y + 9, z, B.snow);
    world.set(x1, y + 9, z, B.snow);
    world.set(x0 + 2, y + 9, z, B.gold);
    world.set(x0 + 2, y + 10, z, B.glowstone);
  });
}

/** Warm timber shop on the west side. */
function buildShop(world: World, y: number) {
  const x0 = -12;
  const x1 = -7;
  const z0 = -6;
  const z1 = 1;
  fill(world, x0, y + 1, z0, x1, y + 1, z1, B.bricks);
  for (let yy = y + 2; yy <= y + 6; yy++) {
    for (let x = x0; x <= x1; x++) {
      for (let z = z0; z <= z1; z++) {
        const edgeX = x === x0 || x === x1;
        const edgeZ = z === z0 || z === z1;
        if (!edgeX && !edgeZ) continue;
        const corner = edgeX && edgeZ;
        const window = x === x1 && (yy === y + 3 || yy === y + 4) && z !== z0 && z !== z1 && z !== -2;
        const door = x === x1 && z === -2 && yy <= y + 3;
        if (door) continue;
        world.set(x, yy, z, corner ? B.oakLog : window ? B.glass : B.planks);
      }
    }
  }
  // Overhanging awning + stepped roof.
  fill(world, x1 + 1, y + 5, z0, x1 + 1, y + 5, z1, B.terracotta);
  for (let s = 0; s <= 2; s++) fill(world, x0 + s, y + 7 + s, z0, x1 - s, y + 7 + s, z1, s === 2 ? B.gold : B.terracotta);
  world.set(x1 + 1, y + 4, -4, B.glowstone);
  world.set(x1 + 1, y + 4, 0, B.glowstone);
}

/** White tower with blue banding on the east side. */
function buildTower(world: World, y: number) {
  const x0 = 8;
  const x1 = 12;
  const z0 = 1;
  const z1 = 6;
  for (let yy = y + 1; yy <= y + 11; yy++) {
    const band = yy === y + 4 || yy === y + 8;
    for (let x = x0; x <= x1; x++) {
      for (let z = z0; z <= z1; z++) {
        const edgeX = x === x0 || x === x1;
        const edgeZ = z === z0 || z === z1;
        if (!edgeX && !edgeZ) continue;
        const window = x === x0 && !band && (yy === y + 6 || yy === y + 10) && z > z0 && z < z1;
        const door = x === x0 && (z === 3 || z === 4) && yy <= y + 3;
        if (door) continue;
        world.set(x, yy, z, band ? B.blueWool : window ? B.glass : B.snow);
      }
    }
  }
  fill(world, x0 - 1, y + 12, z0 - 1, x1 + 1, y + 12, z1 + 1, B.lapis);
  fill(world, x0, y + 13, z0, x1, y + 13, z1, B.snow);
  world.set(10, y + 14, 3, B.gold);
  world.set(10, y + 15, 3, B.glowstone);
}

/** Trophy pedestals flanking the spawn walkway. */
function buildPedestals(world: World, y: number) {
  const items: [number, number, number][] = [
    [-7, 7, B.diamond],
    [-7, 10, B.emerald],
    [7, 9, B.gold],
    [5, -4, B.amethyst],
    [-5, -4, B.lapis],
  ];
  for (const [x, z, block] of items) {
    fill(world, x - 1, y + 1, z - 1, x + 1, y + 1, z + 1, B.smooth);
    world.set(x, y + 2, z, B.snow);
    world.set(x, y + 3, z, block);
  }
}

/** Big "BEDWARS" billboard in gold on lapis, framed in snow. */
function buildSign(world: World) {
  const z = -18;
  const left = -21;
  const right = 21;
  const bottom = 24;
  const top = 34;
  for (let x = left; x <= right; x++) {
    for (let y = bottom; y <= top; y++) {
      const border = x === left || x === right || y === bottom || y === top;
      world.set(x, y, z, border ? B.snow : B.lapis);
    }
  }
  writeText(world, "BEDWARS", left + 1, top - 2, z + 1, B.gold);
}

/** Flat Blockman-style voxel clouds drifting high above. */
function buildClouds(world: World) {
  const clouds = [
    [-34, 44, 6, 9, 5],
    [30, 42, -6, 7, 4],
    [-22, 48, -38, 11, 5],
    [34, 46, 24, 8, 6],
    [-40, 40, 30, 7, 4],
    [8, 50, 40, 10, 5],
    [12, 52, -44, 9, 4],
    [-6, 47, 58, 6, 3],
  ];
  for (const [cx, cy, cz, rx, rz] of clouds) {
    for (let x = -rx; x <= rx; x++) {
      for (let z = -rz; z <= rz; z++) {
        const d = Math.hypot(x / rx, z / rz);
        if (d <= 1 && hash(Math.floor((cx + x) / 2), Math.floor((cz + z) / 2)) > 0.18) {
          world.set(cx + x, cy, cz + z, B.whiteWool);
        }
      }
    }
  }
}

/** Bright Blockman GO-style hub plaza for Bedwars. */
export function buildBedwarsLobby(world: World) {
  const y = BEDWARS_LOBBY_SURFACE_Y;
  buildPlaza(world, y);
  buildFountain(world, y);
  buildGarden(world, y);
  buildPortals(world, y);
  buildShop(world, y);
  buildTower(world, y);
  buildPedestals(world, y);
  buildSign(world);
  buildClouds(world);
}
