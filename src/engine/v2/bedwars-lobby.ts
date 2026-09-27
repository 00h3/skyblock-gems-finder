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
  obsidian: 11,
  bedrock: 12,
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
export const BEDWARS_LOBBY_SPAWN = { x: 0.5, y: 17.5, z: 6.5 };
export const BEDWARS_MATCHMAKER_POS = { x: 0.5, y: 17, z: -8.5 };
export const BEDWARS_LOBBY_BOUNDS = { minX: -48, maxX: 48, minZ: -48, maxZ: 48, minY: 2, maxY: 42 };

function hash(x: number, z: number) {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function fill(world: World, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, id: number) {
  for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++)
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++)
      for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) world.set(x, y, z, id);
}

/**
 * Amino-Style Grand Floating Base:
 * A wide, expansive floating arena with an organic tapered underside,
 * clean open walkways, central sparring courtyard, 4 team wings,
 * and ZERO buildings — pure open sky with full panoramic sightlines.
 */
function buildAminoFloatingIsland(world: World, y: number) {
  const R_BASE = 44;

  for (let x = -R_BASE; x <= R_BASE; x++) {
    for (let z = -R_BASE; z <= R_BASE; z++) {
      const distCenter = Math.hypot(x, z);

      // Wide expansive Amino base geometry: grand central disc + 4 extended team wings + 4 viewing pavilions
      const inCircle = distCenter <= 30;
      const inCross = (Math.abs(x) <= 11 && Math.abs(z) <= 42) || (Math.abs(z) <= 11 && Math.abs(x) <= 42);
      const inCornerPad =
        Math.abs(x) >= 20 && Math.abs(x) <= 34 && Math.abs(z) >= 20 && Math.abs(z) <= 34 && distCenter <= 42;

      if (!inCircle && !inCross && !inCornerPad) continue;

      // Distance to perimeter for natural floating island tapered underside
      const edgeFactor = Math.max(
        0,
        Math.min(
          30 - distCenter,
          inCross ? 11 - Math.min(Math.abs(x), Math.abs(z)) : 0,
          inCross ? 42 - Math.max(Math.abs(x), Math.abs(z)) : 0,
        ),
      );

      // Organic tapered depth: deep core in center (down to y=3), sloping to shallow rim
      const depth = Math.round(2 + Math.min(14, edgeFactor * 1.3 + hash(x, z) * 2.5));
      const bottomY = Math.max(3, y - depth);

      for (let yy = bottomY; yy < y; yy++) {
        let blockId: number;
        if (yy === bottomY && depth > 6) {
          blockId = B.bedrock;
        } else if (yy < y - 3) {
          blockId = (x + yy + z) % 3 === 0 ? B.cobble : B.stone;
        } else if (yy < y - 1) {
          blockId = B.dirt;
        } else {
          blockId = B.dirt;
        }
        world.set(x, yy, z, blockId);
      }

      // Top Surface Flooring - Amino Modern Minimalist Style (Zero Buildings)
      let topBlock = B.grass;

      if (distCenter <= 12) {
        // Inner sparring circle: sleek white quartz/snow & smooth stone checker
        const checker = (Math.floor((x + 100) / 2) + Math.floor((z + 100) / 2)) % 2 === 0;
        topBlock = checker ? B.snow : B.smooth;
      } else if (distCenter <= 16) {
        // Concentric walkway ring
        topBlock = B.bricks;
      } else if (inCross) {
        // 4 Team Cardinal Wings with team color accents
        const isNorth = z < -16; // Red
        const isSouth = z > 16; // Blue
        const isEast = x > 16; // Green
        const isWest = x < -16; // Yellow

        const isCenterPath = Math.abs(x) <= 3 || Math.abs(z) <= 3;
        if (isCenterPath) {
          topBlock = B.smooth;
        } else if (Math.abs(x) === 9 || Math.abs(z) === 9) {
          topBlock = B.bricks; // border line
        } else {
          if (isNorth) topBlock = (Math.abs(x) + Math.abs(z)) % 4 === 0 ? B.redWool : B.snow;
          else if (isSouth) topBlock = (Math.abs(x) + Math.abs(z)) % 4 === 0 ? B.blueWool : B.snow;
          else if (isEast) topBlock = (Math.abs(x) + Math.abs(z)) % 4 === 0 ? B.greenWool : B.snow;
          else if (isWest) topBlock = (Math.abs(x) + Math.abs(z)) % 4 === 0 ? B.yellowWool : B.snow;
          else topBlock = B.snow;
        }
      } else if (inCornerPad) {
        // Corner viewing terraces
        const isEdge = distCenter > 38;
        topBlock = isEdge ? B.bricks : (x + z) % 5 === 0 ? B.snow : B.grass;
      }

      world.set(x, y, z, topBlock);
    }
  }

  // Low 1-block perimeter curb along wing boundaries (open, no sightline obstruction)
  for (let d = 17; d <= 41; d++) {
    // North & South wing borders
    world.set(-10, y + 1, -d, B.bricks);
    world.set(10, y + 1, -d, B.bricks);
    world.set(-10, y + 1, d, B.bricks);
    world.set(10, y + 1, d, B.bricks);

    // East & West wing borders
    world.set(-d, y + 1, -10, B.bricks);
    world.set(-d, y + 1, 10, B.bricks);
    world.set(d, y + 1, -10, B.bricks);
    world.set(d, y + 1, 10, B.bricks);
  }

  // End cap curbs for the 4 wings
  for (let w = -10; w <= 10; w++) {
    world.set(w, y + 1, -42, B.bricks);
    world.set(w, y + 1, 42, B.bricks);
    world.set(-42, y + 1, w, B.bricks);
    world.set(42, y + 1, w, B.bricks);
  }
}

/** Central sleek fountain & water reflecting pool (Amino minimalist style, low height). */
function buildCentralFountain(world: World, y: number) {
  const R = 5;
  for (let x = -R; x <= R; x++) {
    for (let z = -R; z <= R; z++) {
      const d = Math.hypot(x, z);
      if (d > R) continue;
      if (d > R - 1) {
        world.set(x, y + 1, z, B.bricks);
      } else {
        world.set(x, y, z, WATER_ID);
        world.set(x, y - 1, z, B.smooth);
      }
    }
  }
  // Low luminous center fountain core
  world.set(0, y + 1, 0, B.smooth);
  world.set(0, y + 2, 0, B.gold);
  world.set(0, y + 3, 0, B.glowstone);
}

/** 4 Cardinal Team Generator & Staging Stations (Low aesthetic pads, no buildings!). */
function buildTeamStations(world: World, y: number) {
  const stations: Array<{ x: number; z: number; wool: number; ore: number }> = [
    { x: 0, z: -34, wool: B.redWool, ore: B.gold }, // North: Red
    { x: 0, z: 34, wool: B.blueWool, ore: B.diamond }, // South: Blue
    { x: 34, z: 0, wool: B.greenWool, ore: B.emerald }, // East: Green
    { x: -34, z: 0, wool: B.yellowWool, ore: B.amethyst }, // West: Yellow
  ];

  for (const { x, z, wool, ore } of stations) {
    // 7x7 sleek generator pad
    for (let dx = -3; dx <= 3; dx++) {
      for (let dz = -3; dz <= 3; dz++) {
        const isBorder = Math.abs(dx) === 3 || Math.abs(dz) === 3;
        world.set(x + dx, y, z + dz, isBorder ? B.smooth : wool);
        if (isBorder && Math.abs(dx) === 3 && Math.abs(dz) === 3) {
          // Corner low beacon pillar
          world.set(x + dx, y + 1, z + dz, B.bricks);
          world.set(x + dx, y + 2, z + dz, B.glowstone);
        }
      }
    }
    // Center generator pedestal
    world.set(x, y + 1, z, ore);
  }
}

/** Corner viewing platforms and low aesthetic garden accents (strictly no buildings). */
function buildCornerGardens(world: World, y: number) {
  const corners: Array<[number, number]> = [
    [-27, -27],
    [27, -27],
    [-27, 27],
    [27, 27],
  ];

  for (const [cx, cz] of corners) {
    // Small bonsai tree
    fill(world, cx, y + 1, cz, cx, y + 4, cz, B.oakLog);
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (Math.abs(dx) + Math.abs(dz) + Math.abs(dy) <= 3) {
            world.set(cx + dx, y + 4 + dy, cz + dz, B.leaves);
          }
        }
      }
    }
    world.set(cx, y + 6, cz, B.leaves);

    // Subtle corner flower tufts
    world.set(cx + 3, y + 1, cz, B.redWool);
    world.set(cx - 3, y + 1, cz, B.yellowWool);
    world.set(cx, y + 1, cz + 3, B.blueWool);
    world.set(cx, y + 1, cz - 3, B.whiteWool);

    // Low lantern post
    world.set(cx + 4, y + 1, cz + 4, B.bricks);
    world.set(cx + 4, y + 2, cz + 4, B.glowstone);
  }
}

/** Clean voxel clouds drifting high above the open arena. */
function buildOpenClouds(world: World) {
  const clouds = [
    [-55, 52, 16, 14, 7],
    [50, 56, -22, 12, 6],
    [-35, 48, -50, 16, 8],
    [52, 54, 42, 13, 7],
    [-60, 46, 48, 11, 6],
    [20, 58, 55, 15, 7],
    [25, 59, -58, 13, 6],
    [-15, 52, 70, 10, 5],
  ];
  for (const [cx, cy, cz, rx, rz] of clouds) {
    for (let x = -rx; x <= rx; x++) {
      for (let z = -rz; z <= rz; z++) {
        const d = Math.hypot(x / rx, z / rz);
        if (d <= 1 && hash(Math.floor((cx + x) / 2), Math.floor((cz + z) / 2)) > 0.16) {
          world.set(cx + x, cy, cz + z, B.whiteWool);
        }
      }
    }
  }
}

/**
 * Bedwars Extended Floating Base (Amino Style):
 * - Wide and expansive floating island
 * - Absolutely NO buildings (no shops, no towers, no obstructive walls)
 * - Clean unobstructed sightlines and full 360-degree open sky views!
 */
export function buildBedwarsLobby(world: World) {
  const y = BEDWARS_LOBBY_SURFACE_Y;
  buildAminoFloatingIsland(world, y);
  buildCentralFountain(world, y);
  buildTeamStations(world, y);
  buildCornerGardens(world, y);
  buildOpenClouds(world);
}
