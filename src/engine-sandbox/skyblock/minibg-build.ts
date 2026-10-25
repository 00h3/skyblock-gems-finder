import { WATER_ID, type World } from "../shared/world";

/**
 * Minibg Realm: a detached royal landmass 2048 blocks east of the Skyblock
 * island, far beyond fog and camera range so it reads as a separate world.
 * West half is a four-tier quarry (the Mines), east half is a royal colosseum
 * (the Arena), joined by a grand plaza where players arrive.
 */

const B = {
  grass: 1,
  dirt: 2,
  stone: 3,
  cobble: 4,
  bricks: 5,
  sand: 6,
  oakLog: 7,
  leaves: 9,
  obsidian: 11,
  bedrock: 12,
  planks: 13,
  mossy: 14,
  gravel: 15,
  snow: 16,
  glowstone: 18,
  gold: 19,
  diamond: 20,
  emerald: 21,
  lapis: 22,
  amethyst: 23,
  hay: 25,
  tnt: 28,
  redWool: 30,
  blueWool: 31,
  yellowWool: 33,
  netherBricks: 35,
  coal: 36,
  redstone: 37,
  darkOak: 39,
  path: 41,
  smooth: 42,
  cobbleStairs: 45,
  brickStairs: 46,
} as const;

export const REALM_OX = 2048;
export const REALM_TOP = 30;
export const REALM_BOUNDS = { minX: REALM_OX - 84, maxX: REALM_OX + 83, minZ: -84, maxZ: 83 };
export const REALM_SPAWN = { x: REALM_OX + 0.5, y: REALM_TOP + 1.02, z: 64.5 };

export const MINE = { minX: REALM_OX - 78, maxX: REALM_OX - 10, minZ: -76, maxZ: 22 };
const RIM = 5;
const STEP = 7;
/** Tier floors, top → bottom. */
export const MINE_FLOORS = [23, 16, 9, 2];
export const MINE_TIERS = [
  { name: "Tier I · Coal Quarry", level: 1 },
  { name: "Tier II · Gold Veins", level: 3 },
  { name: "Tier III · Crystal Depths", level: 6 },
  { name: "Tier IV · Obsidian Core", level: 11 },
];

export const ARENA = { cx: REALM_OX + 45, cz: -30, r: 26 };

const SOUTH_RAMP = { x0: REALM_OX - 47, x1: REALM_OX - 41 };
const EAST_RAMP = { z0: -30, z1: -24 };

export function inRealm(x: number) {
  return x > REALM_OX - 200;
}

export function inMine(x: number, z: number) {
  return x >= MINE.minX && x <= MINE.maxX && z >= MINE.minZ && z <= MINE.maxZ;
}

export function mineTierAtY(y: number) {
  if (y >= 23) return 0;
  if (y >= 16) return 1;
  if (y >= 9) return 2;
  return 3;
}

function hash(x: number, z: number, s = 0) {
  const v = Math.sin(x * 127.1 + z * 311.7 + s * 74.7) * 43758.5453;
  return v - Math.floor(v);
}

function hash3(x: number, y: number, z: number) {
  return hash(x + y * 57.3, z - y * 21.9, y);
}

function fill(world: World, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, id: number) {
  for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++)
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++)
      for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) world.set(x, y, z, id);
}

const GLYPHS: Record<string, string[]> = {
  A: [".111.", "1...1", "1...1", "11111", "1...1", "1...1", "1...1"],
  B: ["1111.", "1...1", "1...1", "1111.", "1...1", "1...1", "1111."],
  E: ["11111", "1....", "1....", "1111.", "1....", "1....", "11111"],
  G: [".111.", "1...1", "1....", "1.111", "1...1", "1...1", ".111."],
  I: ["11111", "..1..", "..1..", "..1..", "..1..", "..1..", "11111"],
  M: ["1...1", "11.11", "1.1.1", "1.1.1", "1...1", "1...1", "1...1"],
  N: ["1...1", "11..1", "1.1.1", "1.1.1", "1..11", "1...1", "1...1"],
  R: ["1111.", "1...1", "1...1", "1111.", "1.1..", "1..1.", "1...1"],
  S: [".1111", "1....", "1....", ".111.", "....1", "....1", "1111."],
};

/** Block letters on the XY plane at depth `z`; `facing` +1 reads from +Z, -1 reads from -Z. */
function writeText(world: World, text: string, left: number, top: number, z: number, block: number, facing: 1 | -1 = 1) {
  let x = left;
  for (const ch of text) {
    const glyph = GLYPHS[ch];
    if (glyph) {
      glyph.forEach((row, r) => {
        for (let c = 0; c < row.length; c++) {
          if (row[c] === "1") world.set(x + c * facing, top - r, z, block);
        }
      });
    }
    x += 6 * facing;
  }
}

function signBoard(world: World, text: string, cx: number, top: number, z: number, facing: 1 | -1) {
  const w = text.length * 6 + 3;
  const x0 = cx - Math.floor(w / 2);
  fill(world, x0, top - 8, z, x0 + w - 1, top, z, B.lapis);
  fill(world, x0, top - 8, z, x0, top, z, B.gold);
  fill(world, x0 + w - 1, top - 8, z, x0 + w - 1, top, z, B.gold);
  fill(world, x0, top, z, x0 + w - 1, top, z, B.gold);
  fill(world, x0, top - 8, z, x0 + w - 1, top - 8, z, B.gold);
  const tz = z + facing;
  if (facing === 1) writeText(world, text, x0 + 2, top - 1, tz, B.gold, 1);
  else writeText(world, text, x0 + w - 3, top - 1, tz, B.gold, -1);
  for (const px of [x0 + 2, x0 + w - 3]) fill(world, px, REALM_TOP + 1, z, px, top - 9, z, B.bricks);
}

function tree(world: World, x: number, y: number, z: number, seed: number) {
  const h = 5 + Math.floor(hash(x, z, seed) * 3);
  const log = hash(z, x, seed) < 0.3 ? B.darkOak : B.oakLog;
  for (let i = 1; i <= h; i++) world.set(x, y + i, z, log);
  for (let dx = -2; dx <= 2; dx++)
    for (let dz = -2; dz <= 2; dz++)
      for (let dy = -1; dy <= 2; dy++) {
        if (Math.abs(dx) + Math.abs(dz) + Math.max(0, dy) > 3) continue;
        const yy = y + h + dy;
        if (world.get(x + dx, yy, z + dz) === 0) world.set(x + dx, yy, z + dz, B.leaves);
      }
}

function lampPost(world: World, x: number, z: number, h = 4) {
  fill(world, x, REALM_TOP + 1, z, x, REALM_TOP + h, z, B.darkOak);
  world.set(x, REALM_TOP + h + 1, z, B.glowstone);
}

// ── Mine ─────────────────────────────────────────────────────────────────

const TIER_ORES: [number, number][][] = [
  [[B.stone, 0.5], [B.coal, 0.3], [B.cobble, 0.12], [B.gravel, 0.08]],
  [[B.stone, 0.4], [B.coal, 0.14], [B.redstone, 0.26], [B.gold, 0.2]],
  [[B.stone, 0.38], [B.mossy, 0.12], [B.lapis, 0.24], [B.diamond, 0.16], [B.emerald, 0.1]],
  [[B.obsidian, 0.34], [B.netherBricks, 0.26], [B.glowstone, 0.18], [B.amethyst, 0.22]],
];

function pickOre(tier: number, roll: number) {
  let acc = 0;
  for (const [id, p] of TIER_ORES[tier]) {
    acc += p;
    if (roll < acc) return id;
  }
  return TIER_ORES[tier][0][0];
}

function mineDepth(x: number, z: number) {
  return Math.min(x - MINE.minX, MINE.maxX - x, z - MINE.minZ, MINE.maxZ - z);
}

/** Surface height of a mine column, including the two descending stair causeways. */
function mineHeight(x: number, z: number) {
  const d = mineDepth(x, z);
  if (d < RIM) return REALM_TOP;
  const k = Math.min(3, Math.floor((d - RIM) / STEP));
  const floor = MINE_FLOORS[k];
  const ramp = (depth: number) => Math.max(floor, REALM_TOP - (depth - RIM + 1));
  if (x >= SOUTH_RAMP.x0 && x <= SOUTH_RAMP.x1) return ramp(MINE.maxZ - z);
  if (z >= EAST_RAMP.z0 && z <= EAST_RAMP.z1) return ramp(MINE.maxX - x);
  return floor;
}

function isRampColumn(x: number, z: number) {
  const inStrip = (x >= SOUTH_RAMP.x0 && x <= SOUTH_RAMP.x1) || (z >= EAST_RAMP.z0 && z <= EAST_RAMP.z1);
  return inStrip && mineDepth(x, z) >= RIM && mineHeight(x, z) > MINE_FLOORS[3];
}

function buildMine(world: World) {
  for (let x = MINE.minX; x <= MINE.maxX; x++) {
    for (let z = MINE.minZ; z <= MINE.maxZ; z++) {
      const top = mineHeight(x, z);
      const d = mineDepth(x, z);
      const ramp = isRampColumn(x, z);
      world.set(x, 0, z, B.bedrock);
      for (let y = 1; y <= top; y++) {
        let id: number;
        if (d < RIM && y >= REALM_TOP - 1) id = y === REALM_TOP ? (d === 0 ? B.bricks : B.path) : B.stone;
        else if (ramp && y >= top - 1) id = y === top ? B.cobbleStairs : B.cobble;
        else {
          const tier = mineTierAtY(y);
          id = pickOre(tier, hash3(Math.floor(x / 2), Math.floor(y / 2), Math.floor(z / 2)));
        }
        world.set(x, y, z, id);
      }
    }
  }

  // Rim parapet with gaps for the two causeways, plus rim lamp posts.
  for (let x = MINE.minX; x <= MINE.maxX; x++) {
    for (let z = MINE.minZ; z <= MINE.maxZ; z++) {
      const d = mineDepth(x, z);
      const onRamp = (x >= SOUTH_RAMP.x0 - 1 && x <= SOUTH_RAMP.x1 + 1) || (z >= EAST_RAMP.z0 - 1 && z <= EAST_RAMP.z1 + 1);
      if (d === RIM - 1 && !onRamp) world.set(x, REALM_TOP + 1, z, (x + z) % 6 === 0 ? B.gold : B.bricks);
      if (d === 1 && (x + z) % 12 === 0 && !onRamp) lampPost(world, x, z, 3);
    }
  }

  // Tier supports: log posts with glowstone lanterns against every terrace wall.
  for (let k = 0; k < 4; k++) {
    const ring = RIM + STEP * k;
    const floor = MINE_FLOORS[k];
    for (let x = MINE.minX; x <= MINE.maxX; x++) {
      for (let z = MINE.minZ; z <= MINE.maxZ; z++) {
        if (mineDepth(x, z) !== ring || isRampColumn(x, z)) continue;
        const along = x + z;
        if (along % 8 === 0) {
          fill(world, x, floor + 1, z, x, floor + 4, z, B.oakLog);
          world.set(x, floor + 5, z, B.glowstone);
        } else if (along % 8 === 1 || along % 8 === 7) {
          world.set(x, floor + 5, z, B.planks);
        }
      }
    }
    // Crates, TNT barrels and gravel piles on the terrace, plus standing ore nodes.
    for (let x = MINE.minX; x <= MINE.maxX; x++) {
      for (let z = MINE.minZ; z <= MINE.maxZ; z++) {
        const d = mineDepth(x, z);
        if (isRampColumn(x, z) || mineHeight(x, z) !== floor) continue;
        const r = hash(x, z, 9 + k);
        if (d === ring + 1 && r < 0.06) {
          const pick = hash(z, x, 3);
          world.set(x, floor + 1, z, pick < 0.4 ? B.planks : pick < 0.7 ? B.hay : B.tnt);
          if (pick < 0.25) world.set(x, floor + 2, z, B.planks);
        } else if (d >= ring + 3 && d <= ring + 5 && r < 0.035) {
          const h = 1 + Math.floor(hash(x, z, 5) * 2);
          for (let dx = 0; dx <= 1; dx++)
            for (let dz = 0; dz <= 1; dz++)
              for (let y = 1; y <= h; y++) {
                if (mineHeight(x + dx, z + dz) !== floor) continue;
                world.set(x + dx, floor + y, z + dz, pickOre(k, hash3(x + dx, y, z + dz) * 0.999 + 0.0005));
              }
        } else if (k < 3 && d === ring + 2 && r > 0.985) {
          world.set(x, floor + 1, z, B.gravel);
        }
      }
    }
  }

  // Underground spring on the crystal terrace.
  const px = MINE.minX + RIM + STEP * 2 + 1;
  const pz = MINE.minZ + RIM + STEP * 2 + 1;
  fill(world, px - 1, MINE_FLOORS[2], pz - 1, px + 5, MINE_FLOORS[2], pz + 5, B.mossy);
  fill(world, px, MINE_FLOORS[2], pz, px + 4, MINE_FLOORS[2], pz + 4, WATER_ID);

  // Magma-lit core floor: glowstone seams framed by nether bricks.
  const cx = Math.round((MINE.minX + MINE.maxX) / 2);
  const cz = Math.round((MINE.minZ + MINE.maxZ) / 2);
  for (let x = MINE.minX; x <= MINE.maxX; x++) {
    for (let z = MINE.minZ; z <= MINE.maxZ; z++) {
      if (mineHeight(x, z) !== MINE_FLOORS[3] || isRampColumn(x, z)) continue;
      if (x === cx || z === cz) world.set(x, MINE_FLOORS[3], z, B.glowstone);
      else if (Math.abs(x - cx) === 1 || Math.abs(z - cz) === 1) world.set(x, MINE_FLOORS[3], z, B.netherBricks);
    }
  }

  signBoard(world, "MINES", SOUTH_RAMP.x0 + 3, REALM_TOP + 16, MINE.maxZ + 2, 1);
}

// ── Arena ────────────────────────────────────────────────────────────────

function buildArena(world: World) {
  const { cx, cz, r: R } = ARENA;
  for (let x = cx - 34; x <= cx + 34; x++) {
    for (let z = cz - 34; z <= cz + 34; z++) {
      const r = Math.hypot(x - cx, z - cz);
      if (r > 32) continue;
      const gate = z > cz && Math.abs(x - cx) <= 3;
      if (r <= R) {
        let id: number = B.sand;
        if (r < 6) id = (x + z) % 2 === 0 ? B.smooth : B.snow;
        else if (r < 7) id = B.gold;
        else if (r < 15.5) id = (Math.floor(x / 2) + Math.floor(z / 2)) % 2 === 0 ? B.smooth : B.bricks;
        else if (r < 16.5) id = B.gold;
        world.set(x, REALM_TOP, z, id);
        if (r < 6) world.set(x, REALM_TOP + 1, z, r > 5 ? B.gold : id);
        continue;
      }
      if (gate) {
        world.set(x, REALM_TOP, z, B.path);
        continue;
      }
      const tier = Math.min(4, Math.floor((r - R) * 1.1));
      const h = REALM_TOP + 1 + tier * 2;
      fill(world, x, REALM_TOP, z, x, h, z, B.bricks);
      if (tier >= 4) {
        world.set(x, h + 1, z, B.bricks);
        world.set(x, h + 2, z, (Math.round(Math.atan2(z - cz, x - cx) * 20) & 1) === 0 ? B.gold : B.bricks);
      } else {
        world.set(x, h, z, tier % 2 === 0 ? B.brickStairs : B.redWool);
      }
    }
  }

  // Floor lanterns around the central arena circle
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    world.set(Math.round(cx + Math.cos(a) * 23), REALM_TOP, Math.round(cz + Math.sin(a) * 23), B.glowstone);
  }

  // Towers around the rim, skipping the gate.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    if (Math.abs(a - Math.PI / 2) < 0.1) continue;
    const tx = Math.round(cx + Math.cos(a) * 31);
    const tz = Math.round(cz + Math.sin(a) * 31);
    fill(world, tx - 1, REALM_TOP, tz - 1, tx + 1, REALM_TOP + 15, tz + 1, B.bricks);
    fill(world, tx - 1, REALM_TOP + 16, tz - 1, tx + 1, REALM_TOP + 16, tz + 1, B.gold);
    world.set(tx, REALM_TOP + 17, tz, B.glowstone);
    const ox = Math.round(Math.cos(a) * 2);
    const oz = Math.round(Math.sin(a) * 2);
    fill(world, tx + ox, REALM_TOP + 8, tz + oz, tx + ox, REALM_TOP + 13, tz + oz, i % 2 === 0 ? B.redWool : B.blueWool);
    world.set(tx + ox, REALM_TOP + 14, tz + oz, B.yellowWool);
  }

  // Grand gate arch.
  const gz0 = cz + R + 1;
  for (const gx of [cx - 4, cx + 4]) fill(world, gx, REALM_TOP + 1, gz0, gx, REALM_TOP + 11, gz0 + 5, B.bricks);
  fill(world, cx - 4, REALM_TOP + 10, gz0, cx + 4, REALM_TOP + 11, gz0 + 5, B.gold);
  fill(world, cx - 3, REALM_TOP + 9, gz0 + 5, cx + 3, REALM_TOP + 9, gz0 + 5, B.redWool);

  signBoard(world, "ARENA", cx, REALM_TOP + 17, cz + R + 9, 1);
}

// ── Plaza & road ─────────────────────────────────────────────────────────

const PLAZA = { minX: REALM_OX - 30, maxX: REALM_OX + 30, minZ: 36, maxZ: 78 };

function buildPlaza(world: World) {
  const { minX, maxX, minZ, maxZ } = PLAZA;
  for (let x = minX; x <= maxX; x++) {
    for (let z = minZ; z <= maxZ; z++) {
      const edge = Math.min(x - minX, maxX - x, z - minZ, maxZ - z);
      let id: number = (Math.floor(x / 2) + Math.floor(z / 2)) % 2 === 0 ? B.snow : B.smooth;
      if (x === REALM_OX || z === 54) id = B.gold;
      if (edge <= 1) id = B.bricks;
      world.set(x, REALM_TOP, z, id);
      const northGap = z === minZ || z === minZ + 1 ? Math.abs(x - REALM_OX) <= 8 : false;
      if (edge <= 1 && !northGap) world.set(x, REALM_TOP + 1, z, edge === 0 ? B.bricks : B.brickStairs);
    }
  }

  // Border pillars with lanterns and alternating royal banners.
  let n = 0;
  for (let x = minX; x <= maxX; x += 10) {
    for (const z of [minZ, maxZ]) {
      if (z === minZ && Math.abs(x - REALM_OX) <= 8) continue;
      fill(world, x, REALM_TOP + 1, z, x, REALM_TOP + 7, z, B.bricks);
      world.set(x, REALM_TOP + 8, z, B.gold);
      world.set(x, REALM_TOP + 9, z, B.glowstone);
      const inward = z === minZ ? 1 : -1;
      fill(world, x, REALM_TOP + 4, z + inward, x, REALM_TOP + 6, z + inward, n++ % 2 === 0 ? B.redWool : B.blueWool);
    }
  }
  for (let z = minZ + 10; z < maxZ; z += 10) {
    for (const x of [minX, maxX]) {
      fill(world, x, REALM_TOP + 1, z, x, REALM_TOP + 7, z, B.bricks);
      world.set(x, REALM_TOP + 8, z, B.gold);
      world.set(x, REALM_TOP + 9, z, B.glowstone);
      const inward = x === minX ? 1 : -1;
      fill(world, x + inward, REALM_TOP + 4, z, x + inward, REALM_TOP + 6, z, n++ % 2 === 0 ? B.redWool : B.blueWool);
    }
  }

  // Fountain.
  const fx = REALM_OX;
  const fz = 50;
  for (let x = fx - 5; x <= fx + 5; x++) {
    for (let z = fz - 5; z <= fz + 5; z++) {
      const r = Math.hypot(x - fx, z - fz);
      if (r > 5) continue;
      if (r >= 4) world.set(x, REALM_TOP + 1, z, B.bricks);
      else if (r >= 1.2) world.set(x, REALM_TOP, z, WATER_ID);
    }
  }
  fill(world, fx, REALM_TOP + 1, fz, fx, REALM_TOP + 4, fz, B.bricks);
  world.set(fx, REALM_TOP + 5, fz, B.gold);
  world.set(fx, REALM_TOP + 6, fz, B.glowstone);

  // Gold knight statues.
  for (const [sx, sz] of [[REALM_OX - 18, 46], [REALM_OX + 18, 46], [REALM_OX - 18, 64], [REALM_OX + 18, 64]]) {
    fill(world, sx - 1, REALM_TOP + 1, sz - 1, sx + 1, REALM_TOP + 1, sz + 1, B.smooth);
    fill(world, sx, REALM_TOP + 2, sz, sx, REALM_TOP + 4, sz, B.gold);
    world.set(sx - 1, REALM_TOP + 4, sz, B.gold);
    world.set(sx + 1, REALM_TOP + 4, sz, B.gold);
    world.set(sx, REALM_TOP + 5, sz, B.diamond);
  }

  // Island portal (decorative) with the realm name above, readable from spawn.
  const pz = 74;
  fill(world, REALM_OX - 4, REALM_TOP + 1, pz, REALM_OX + 4, REALM_TOP + 10, pz, B.obsidian);
  fill(world, REALM_OX - 3, REALM_TOP + 1, pz, REALM_OX + 3, REALM_TOP + 9, pz, B.amethyst);
  const w = 6 * 6 + 3;
  const x0 = REALM_OX - Math.floor(w / 2);
  fill(world, x0, REALM_TOP + 11, pz + 1, x0 + w - 1, REALM_TOP + 17, pz + 1, B.lapis);
  fill(world, x0, REALM_TOP + 11, pz + 1, x0 + w - 1, REALM_TOP + 11, pz + 1, B.gold);
  fill(world, x0, REALM_TOP + 17, pz + 1, x0 + w - 1, REALM_TOP + 17, pz + 1, B.gold);
  writeText(world, "MINIBG", x0 + w - 3, REALM_TOP + 16, pz, B.gold, -1);
  world.set(REALM_OX - 4, REALM_TOP + 11, pz, B.glowstone);
  world.set(REALM_OX + 4, REALM_TOP + 11, pz, B.glowstone);
}

function buildRoad(world: World) {
  for (let x = REALM_OX - 66; x <= REALM_OX + 66; x++) {
    for (let z = 26; z <= 35; z++) {
      const edge = z === 26 || z === 35;
      world.set(x, REALM_TOP, z, edge ? B.bricks : (x + z) % 7 === 0 ? B.gravel : B.path);
      if (edge && x % 12 === 0) lampPost(world, x, z);
    }
  }
  // Avenue from the road to the arena gate.
  for (let z = ARENA.cz + ARENA.r + 1; z < 26; z++)
    for (let x = ARENA.cx - 3; x <= ARENA.cx + 3; x++)
      world.set(x, REALM_TOP, z, Math.abs(x - ARENA.cx) === 3 ? B.bricks : B.path);
}

// ── Terrain ──────────────────────────────────────────────────────────────

function inShape(x: number, z: number) {
  const { minX, maxX, minZ, maxZ } = REALM_BOUNDS;
  const e = Math.min(x - minX, maxX - x, z - minZ, maxZ - z);
  return e + (hash(Math.floor(x / 5), Math.floor(z / 5), 2) - 0.5) * 8 > 2;
}

function buildTerrain(world: World) {
  const { minX, maxX, minZ, maxZ } = REALM_BOUNDS;
  for (let x = minX; x <= maxX; x++) {
    for (let z = minZ; z <= maxZ; z++) {
      if (inMine(x, z) || !inShape(x, z)) continue;
      const e = Math.min(x - minX, maxX - x, z - minZ, maxZ - z);
      const depth = Math.min(28, 5 + e * 0.45 + hash(x, z, 4) * 5);
      const bottom = Math.max(1, Math.round(REALM_TOP - depth));
      for (let y = bottom; y <= REALM_TOP; y++) {
        world.set(x, y, z, y === REALM_TOP ? B.grass : y > REALM_TOP - 3 ? B.dirt : B.stone);
      }
    }
  }
}

function inStructure(x: number, z: number) {
  if (inMine(x, z)) return true;
  if (Math.hypot(x - ARENA.cx, z - ARENA.cz) < 36) return true;
  if (x >= PLAZA.minX - 2 && x <= PLAZA.maxX + 2 && z >= PLAZA.minZ - 2 && z <= PLAZA.maxZ + 2) return true;
  if (z >= 24 && z <= 37) return true;
  if (z >= ARENA.cz + ARENA.r && z < 26 && Math.abs(x - ARENA.cx) <= 6) return true;
  return false;
}

function buildGardens(world: World) {
  const { minX, maxX, minZ, maxZ } = REALM_BOUNDS;
  for (let x = minX + 4; x <= maxX - 4; x += 6) {
    for (let z = minZ + 4; z <= maxZ - 4; z += 6) {
      const jx = x + Math.floor(hash(x, z, 7) * 4) - 2;
      const jz = z + Math.floor(hash(z, x, 7) * 4) - 2;
      if (inStructure(jx, jz) || !inShape(jx, jz) || world.get(jx, REALM_TOP, jz) !== B.grass) continue;
      const r = hash(jx, jz, 8);
      if (r < 0.45) tree(world, jx, REALM_TOP, jz, 1);
      else if (r < 0.6) world.set(jx, REALM_TOP + 1, jz, B.leaves);
    }
  }
}

export function buildMinibgRealm(world: World) {
  const { minX, maxX, minZ, maxZ } = REALM_BOUNDS;
  world.ensureChunks(minX, minZ, maxX, maxZ);
  buildTerrain(world);
  buildMine(world);
  buildRoad(world);
  buildPlaza(world);
  buildArena(world);
  buildGardens(world);
}
