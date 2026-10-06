import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkinnedModel } from "three/examples/jsm/utils/SkeletonUtils.js";
import { buildAtlas, type Atlas } from "@/engine/textures";
import { World, BLOCKS, WATER_ID, WIND } from "@/engine/world";
import { Features, UTILITY_ITEMS, NEW_BACKPACK_ITEMS } from "@/engine/features";
import { utilityIconUrl } from "@/engine/item-icons";
import { FeatureDock, RadialWheel, QuickBuyPanel } from "@/components/v2/FeatureDock";
import { createVoxelLantern, createCrystalCluster, type VoxelPropHandle } from "@/engine/v2/voxel-props";
import { GrassField } from "@/engine/v2/grass-field";
import { CinematicPost } from "@/engine/v2/cinematic-post";
import { CombatFx } from "@/engine/v2/combat-fx";
import { Nature, type SeedCounts, type Species } from "@/engine/v2/nature";
import { SeedPouch } from "@/components/v2/SeedPouch";
import { GRAPHICS_V2_EVENT, isGraphicsV2 } from "@/lib/graphics-v2";
import {
  BEDWARS_LOBBY_BOUNDS,
  BEDWARS_LOBBY_SPAWN,
  BEDWARS_MATCHMAKER_POS,
  buildBedwarsLobby,
} from "@/engine/v2/bedwars-lobby";
import { Player } from "@/engine/player";
import { Controls } from "@/engine/controls";
import { BlockFx, createHighlight, raycastVoxel } from "@/engine/interact";
import { Sky } from "@/engine/sky";
import { Avatar } from "@/engine/avatar";
import { CRACK_STAGES } from "@/engine/textures";
import { Link } from "@tanstack/react-router";
import { SandboxChat } from "@/components/SandboxChat";
import { openFragments } from "@/lib/fragments-ui";
import { FlatSquareSettingsModal } from "@/components/FlatSquareSettingsModal";
import { UserSquareCardModal, type UserSquareCardData } from "@/components/UserSquareCardModal";
import { getTargetDpr } from "@/lib/rendering";
import { GameChatIcon } from "@/components/game-icons";
import { BedwarsHud, type MovementMode } from "@/components/BedwarsHud";
import { GameControls } from "@/components/GameControls";
import { AdvancedInventoryModal } from "@/components/AdvancedInventoryModal";
import { ChestModal, type ChestItem } from "@/components/ChestModal";
import { Backpack, Loader2, Users, Clock, Volume2, VolumeX, Home, LogIn, UserPlus, MessageSquare, Settings } from "lucide-react";
import { playFootstep, playSound } from "@/lib/sfx";
import { BmgoAudio } from "@/lib/bmgo-audio";
import { RemotePlayers } from "@/engine/remote-players";
import { createHpBar } from "@/engine/hpbar";
import { NameTag } from "@/engine/nametag";
import { RuneTimerTag } from "@/engine/rune-timer";
import {
  clearSandboxPresence,
  subscribeToSandboxPlayers,
  updateSandboxPresence,
} from "@/lib/sandbox-presence";
import {
  clearBlockFallPresence,
  subscribeToBlockFallPlayers,
  updateBlockFallPresence,
} from "@/lib/blockfall-presence";
import { useAuth } from "@/lib/auth-context";
import { badgeUrlsFor } from "@/lib/user-style";
import {
  addDoc,
  collection,
  limitToLast,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { subscribeSandboxBlocks, writeSandboxBlock } from "@/lib/sandbox-world-sync";
import { subscribeBlockFallBlocks, writeBlockFallBlock } from "@/lib/blockfall-world-sync";
import { getShadowMapSize, readQualityPref } from "@/lib/rendering";
import { COMPETITIVE_PHYSICS } from "@/engine/player";
import { MovementFacing, ThirdPersonRig, fovForAspect } from "@/engine/v2/camera-rig";
import { MatchController, now as matchNow } from "@/engine/v2/match";
import { Progression } from "@/engine/v2/progression";
import { WorldEvents } from "@/engine/v2/world-events";
import { AmbientParticles } from "@/engine/v2/ambient-particles";
import { SkyblockEnvironment } from "@/engine/v2/skyblock-environment";
import { CosmicSky } from "@/engine/v2/cosmic-sky";
import { BlockmanInventory } from "@/components/v2/BlockmanInventory";
import { announce } from "@/engine/v2/announcer";
import { useStore } from "@/engine/v2/store";
import { V2GameHud, UI as HUD_UI, type HudAction } from "@/components/v2/V2GameHud";
import { BlockFallOverlays, BlockFallStatus } from "@/components/v2/BlockFallV2";
import { CinematicVignette, Crosshair, MilestoneTracker, SkyblockStatus, V2Hotbar } from "@/components/v2/SkyblockV2";
import { V2ClickToPlay, V2ConfirmDialog, V2LoadingScreen, V2Veil } from "@/components/v2/V2Screens";
import { getPermanentPlayerId, loadSkyblockProfile, saveSkyblockProfile } from "@/lib/skyblock-profile";



export const Route = createFileRoute("/game/sandbox")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sandbox — Build & Explore | QBlock" },
      {
        name: "description",
        content:
          "A first-person voxel sandbox: walk, sprint, jump, and break or place blocks in a fresh flat world.",
      },
      { property: "og:title", content: "Sandbox — Build & Explore | QBlock" },
      {
        property: "og:description",
        content:
          "A first-person voxel sandbox: walk, sprint, jump, and break or place blocks in a fresh flat world.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SandboxGame,
  errorComponent: SandboxErrorFallback,
});

const GROUND = 8;

type ArenaBase = {
  x: number;
  z: number;
};

const ARENA_BASES: ArenaBase[] = [
  { x: 0, z: -220 },
  { x: 220, z: 0 },
  { x: 0, z: 220 },
  { x: -220, z: 0 },
];

const BED_SIDE_OFFSETS = [
  [9, 0],
  [0, 9],
  [-9, 0],
  [0, -9],
] as const;

const ARENA_BEDS = ARENA_BASES.map((base, index) => ({
  x: base.x + BED_SIDE_OFFSETS[index][0],
  z: base.z + BED_SIDE_OFFSETS[index][1],
}));

function createOwnBedIndicator() {
  const texture = new THREE.TextureLoader().load("/bedwars-own-icon.png");
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    }),
  );
  sprite.scale.set(2.7, 2.7, 1);
  sprite.renderOrder = 25;
  return sprite;
}

function fillIsland(world: World, cx: number, cz: number, radius: number, surface = 8) {
  for (let x = -radius; x <= radius; x++) {
    for (let z = -radius; z <= radius; z++) {
      const distance = Math.hypot(x, z);
      if (distance > radius) continue;
      for (let y = 0; y <= surface; y++) {
        const block = y === 0 ? 12 : y === surface ? 1 : y > surface - 3 ? 2 : 3;
        world.set(cx + x, y, cz + z, block);
      }
    }
  }
}

function fillLayeredIsland(
  world: World,
  cx: number,
  cz: number,
  coreRadius: number,
  outerRadius: number,
  surface = 8,
) {
  fillIsland(world, cx, cz, coreRadius, surface);
  for (let x = -outerRadius; x <= outerRadius; x++) {
    for (let z = -outerRadius; z <= outerRadius; z++) {
      const distance = Math.hypot(x, z);
      if (distance <= coreRadius || distance > outerRadius) continue;
      const shelf = Math.ceil((distance - coreRadius) / 2);
      const top = Math.max(4, surface - shelf);
      for (let y = 0; y <= top; y++) {
        const block = y === 0 ? 12 : y === top ? 1 : y > top - 3 ? 2 : 3;
        world.set(cx + x, y, cz + z, block);
      }
    }
  }
}

function addTree(world: World, x: number, z: number, height = 8, canopyRadius = 4) {
  const style = Math.abs(x * 7 + z * 11) % 3;
  let trunkX = x;
  let trunkZ = z;
  const top = 9 + height;
  for (let y = 9; y <= top; y++) {
    if (style === 1 && y === 12) trunkX += 1;
    if (style === 2 && y === 13) trunkZ -= 1;
    world.set(trunkX, y, trunkZ, 39);
    if (style > 0 && y >= top - 3 && y % 2 === 0) {
      const branchX = style === 1 ? trunkX - 2 : trunkX + 2;
      const branchZ = style === 2 ? trunkZ - 2 : trunkZ + 2;
      world.set(branchX, y, branchZ, 39);
      world.set(branchX, y + 1, branchZ, 40);
    }
  }

  const lobes =
    style === 0
      ? [
          [0, 0, 0],
          [-2, 0, 1],
          [2, 0, -1],
          [0, 1, 2],
        ]
      : style === 1
        ? [
            [-2, 0, 0],
            [1, 0, 1],
            [3, 1, 0],
            [0, 1, -2],
          ]
        : [
            [0, 0, -2],
            [1, 0, 1],
            [-2, 1, 1],
            [2, 1, 2],
          ];
  for (const [ox, oy, oz] of lobes) {
    const radius = Math.max(2, canopyRadius - (oy > 0 ? 1 : 0));
    const centerX = trunkX + ox;
    const centerY = top - 1 + oy;
    const centerZ = trunkZ + oz;
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (Math.hypot(dx, dz) + Math.abs(dy) * 0.8 > radius + 0.5) continue;
          world.set(centerX + dx, centerY + dy, centerZ + dz, 40);
        }
      }
    }
  }
  // Keep the trunk visible through the canopy.
  world.set(trunkX, top, trunkZ, 39);
}

function addTerrace(world: World, x: number, z: number, radius = 7, height = 11) {
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dz = -radius; dz <= radius; dz++) {
      const distance = Math.hypot(dx, dz);
      if (distance > radius) continue;
      const top = height - Math.max(0, Math.ceil((distance - radius + 3) / 2));
      for (let y = 9; y <= top; y++) {
        world.set(x + dx, y, z + dz, y === top ? (distance < radius - 2 ? 41 : 5) : 3);
      }
    }
  }
}

function addRuins(world: World, x: number, z: number) {
  for (const [dx, dz, height] of [
    [-4, -3, 3],
    [4, -2, 4],
    [-3, 4, 2],
    [3, 4, 3],
  ] as const) {
    for (let y = 9; y <= 9 + height; y++) world.set(x + dx, y, z + dz, 14);
    world.set(x + dx + (dx > 0 ? -1 : 1), 9 + height, z + dz, 5);
  }
}

function addGrottoPillar(world: World, x: number, z: number, height = 7, radius = 2) {
  for (let y = 9; y <= 9 + height; y++) {
    const taper = y > 9 + height - 2 ? Math.max(1, radius - 1) : radius;
    for (let dx = -taper; dx <= taper; dx++) {
      for (let dz = -taper; dz <= taper; dz++) {
        if (Math.hypot(dx, dz) > taper + 0.35) continue;
        world.set(x + dx, y, z + dz, y % 3 === 0 ? 14 : 3);
      }
    }
  }
  world.set(x, 9 + height, z, 5);
}

function addOpenGrottoArch(world: World, x: number, z: number, axis: "x" | "z") {
  for (let offset = -11; offset <= 11; offset++) {
    const rise = 4 + Math.round((1 - Math.abs(offset) / 11) * 5);
    for (let depth = -1; depth <= 1; depth++) {
      const px = axis === "x" ? x + offset : x + depth;
      const pz = axis === "x" ? z + depth : z + offset;
      world.set(px, 9 + rise, pz, offset % 4 === 0 ? 14 : 5);
      if (Math.abs(offset) >= 9) {
        for (let y = 9; y < 9 + rise; y++) {
          world.set(px, y, pz, y % 3 === 0 ? 14 : 3);
        }
      }
    }
  }
}

function buildForestArena(world: World) {
  // Grotto Wilds uses the exact Sandbox atlas: grass, dirt, stone,
  // stone-brick/mossy cavework, path blocks, dark oak, spruce leaves,
  // glowstone, emerald, diamond, and breakable white wool.
  fillLayeredIsland(world, 0, 0, 48, 62);
  for (const [x, z] of [
    [-27, -27],
    [27, -27],
    [-27, 27],
    [27, 27],
  ] as const) {
    addGrottoPillar(world, x, z, 8, 3);
  }
  addGrottoPillar(world, -21, 0, 10, 3);
  addGrottoPillar(world, 21, 0, 8, 3);
  addTerrace(world, -30, -2, 8, 12);
  addTerrace(world, 30, 2, 8, 13);
  addTerrace(world, -2, 30, 8, 12);
  addTerrace(world, 2, -30, 8, 13);
  addOpenGrottoArch(world, -24, -22, "x");
  addOpenGrottoArch(world, 24, 22, "x");
  addOpenGrottoArch(world, -22, 24, "z");
  addOpenGrottoArch(world, 22, -24, "z");

  // The center is a readable open plaza for the animated NPC showcase.
  for (let x = -10; x <= 10; x++) {
    for (let z = -10; z <= 10; z++) {
      if (Math.hypot(x, z) > 10) continue;
      world.set(x, 9, z, Math.hypot(x, z) > 8 ? 5 : 42);
    }
  }
  for (const [x, z] of [
    [-4, -4],
    [4, -4],
    [-4, 4],
    [4, 4],
  ] as const) {
    world.set(x, 10, z, 21);
    world.set(x, 11, z, 18);
  }
  for (let x = -17; x <= -12; x++) {
    for (let z = -2; z <= 2; z++) world.set(x, 9, z, 42);
  }
  for (const base of ARENA_BASES) {
    fillLayeredIsland(world, base.x, base.z, 25, 33);

    const baseIndex = ARENA_BASES.indexOf(base);
    const bed = ARENA_BEDS[baseIndex];
    // Beds are intentionally not protected: only breakable wool is placed.
    // The black outline is a visual line frame, added outside the voxel world.
    world.set(bed.x - 1, 9, bed.z, 29);
    world.set(bed.x, 9, bed.z, 29);
    world.set(bed.x + 1, 9, bed.z, 29);
    world.set(bed.x, 10, bed.z, 13);

    const towardCenterX = Math.sign(-base.x);
    const towardCenterZ = Math.sign(-base.z);
    addTree(world, base.x + 15, base.z + 10, 8, 4);
    addTree(world, base.x - 14, base.z - 11, 7, 4);
    addGrottoPillar(world, base.x + 8, base.z - 13, 6, 2);
    addRuins(world, base.x - 2, base.z + 13);
    world.set(base.x + towardCenterX * 7, 9, base.z + towardCenterZ * 7, 18);
  }

  // Diamond islands sit far diagonally between bases and stay open for PvP.
  const diamondIslands = [
    [-132, -132],
    [132, -132],
    [132, 132],
    [-132, 132],
  ] as const;
  for (const [x, z] of diamondIslands) {
    fillLayeredIsland(world, x, z, 15, 22, 7);
    for (let dx = -3; dx <= 3; dx++) {
      for (let dz = -3; dz <= 3; dz++) {
        if (Math.hypot(dx, dz) <= 3.5) world.set(x + dx, 8, z + dz, 41);
      }
    }
    world.set(x, 9, z, 5);
    world.set(x, 10, z, 20);
    addGrottoPillar(world, x + 7, z - 5, 5, 2);
    addTree(world, x - 6, z + 5, 5, 3);
  }
}

/**
 * SkyBlock starting island:
 * Sized a little bit smaller and tighter per user request (~15x15 compact organic footprint).
 * Contains:
 * - A floating grass island (dirt core, stone/cobble bedrock tapered bottom)
 * - Exactly ONE oak tree (oak log + oak leaves canopy)
 * - Water source pool (more liquid & expanding)
 * - Lava source pool (enclosed in cobblestone so player can make obsidian / cobblestone generator!)
 * - Accents (cobblestone, mossy cobble, pumpkin)
 */
function buildSkyblockIsland(world: World) {
  const surfaceY = 16;
  const bottomTipY = 9;

  // Smaller, compact island footprint (radius ~6.8 blocks)
  for (let x = -8; x <= 8; x++) {
    for (let z = -8; z <= 8; z++) {
      const dMain = Math.hypot(x, z);
      const dExt = Math.hypot(x - 3, z - 3);
      const inIsland = dMain <= 6.8 || dExt <= 4.8 || (x >= -4 && x <= 4 && z >= -4 && z <= 4);
      if (!inIsland) continue;

      // Distance from edge: determines island depth tapering towards the center
      const edgeDist = Math.max(6.8 - dMain, 4.8 - dExt, 0);
      const islandDepth = Math.round(2 + edgeDist * 1.05);
      const bottomY = Math.max(bottomTipY, surfaceY - islandDepth);

      for (let y = bottomY; y <= surfaceY; y++) {
        let blockId = 2; // Dirt
        if (y === surfaceY) {
          blockId = 1; // Grass
        } else if (y === bottomY) {
          blockId = edgeDist > 3 ? 12 : 3; // Bedrock core or stone tip
        } else if (y < surfaceY - 1) {
          blockId = (x + y + z) % 3 === 0 ? 4 : 3; // Cobblestone & stone underside
        }
        world.set(x, y, z, blockId);
      }
    }
  }

  // Starter Tree (Oak wood trunk + leaf canopy)
  const treeX = -3;
  const treeZ = -3;
  for (let ty = 17; ty <= 21; ty++) {
    world.set(treeX, ty, treeZ, 5); // Oak Log
  }
  // Leaves canopy
  for (let lx = -2; lx <= 2; lx++) {
    for (let lz = -2; lz <= 2; lz++) {
      for (let ly = 20; ly <= 22; ly++) {
        if (Math.abs(lx) + Math.abs(lz) <= 3 && !(lx === 0 && lz === 0 && ly < 22)) {
          if (world.get(treeX + lx, ly, treeZ + lz) === 0) {
            world.set(treeX + lx, ly, treeZ + lz, 9); // Oak Leaves
          }
        }
      }
    }
  }

  // Starter Island Accents
  world.set(0, 16, 0, 4); // Cobblestone
  world.set(0, 16, 1, 14); // Mossy Cobblestone
  world.set(-1, 17, 3, 26); // Starter Pumpkin

  // Water spring pond (contained in grass/dirt basin)
  world.set(2, 16, 2, 0);
  world.set(3, 16, 2, 0);
  world.set(2, 16, 3, 0);
  world.set(3, 16, 3, 0);
  world.set(2, 15, 2, 6); // Water block
  world.set(3, 15, 2, 6); // Water block
  world.set(2, 15, 3, 6); // Water block
  world.set(3, 15, 3, 6); // Water block

  // Lava pool (contained in cobblestone/stone basin so player has lava for obsidian/cobblestone)
  world.set(3, 16, -3, 0);
  world.set(4, 16, -3, 0);
  world.set(3, 15, -3, 62); // Lava source block
  world.set(4, 15, -3, 62); // Lava source block
  world.set(2, 16, -3, 4);  // Cobblestone border
  world.set(5, 16, -3, 4);  // Cobblestone border
  world.set(3, 16, -4, 4);  // Cobblestone border
  world.set(4, 16, -4, 4);  // Cobblestone border
  world.set(3, 16, -2, 4);  // Cobblestone border
  world.set(4, 16, -2, 4);  // Cobblestone border
}

const SKYBLOCK_POND = { x: 2.5, z: 2.5, radius: 1.8 };
/** Water plane: fits cleanly inside pond basin */
const SKYBLOCK_POND_SURFACE = { x: SKYBLOCK_POND.x, y: 15.88, z: SKYBLOCK_POND.z, size: 3.5 };

export const BLOCK_FALL_PLATFORM_LEVELS = [36, 29, 22, 15, 8] as const;

export const BLOCK_FALL_BOT_CONFIGS: { name: string; color: string }[] = [];

// Wide-format arena: the long axis runs left-right (X) so the whole floor
// reads at a glance from the spawn camera instead of stretching away.
const BLOCK_FALL_HALF_X = 30;
const BLOCK_FALL_HALF_Z = 15;

export function buildBlockFallArena(world: World) {
  const minX = -BLOCK_FALL_HALF_X;
  const maxX = BLOCK_FALL_HALF_X;
  const minZ = -BLOCK_FALL_HALF_Z;
  const maxZ = BLOCK_FALL_HALF_Z;
  const minY = 2;
  const maxY = 42;

  // 1. Bedrock base and glowing hazard stripes at minY (2)
  for (let x = minX; x <= maxX; x++) {
    for (let z = minZ; z <= maxZ; z++) {
      if (Math.abs(x) === maxX || Math.abs(z) === maxZ) {
        world.set(x, minY, z, 18); // Glowstone edge
      } else if ((Math.abs(x) + Math.abs(z)) % 2 === 0) {
        world.set(x, minY, z, 30); // Red wool
      } else {
        world.set(x, minY, z, 12); // Bedrock
      }
    }
  }

  // 2. Glass bottom floor at Y = 3
  for (let x = minX; x <= maxX; x++) {
    for (let z = minZ; z <= maxZ; z++) {
      world.set(x, 3, z, 10); // Glass
    }
  }

  // 3. Glass outer walls on all 4 sides from Y = 3 to 42
  for (let y = 3; y <= maxY; y++) {
    for (let z = minZ; z <= maxZ; z++) {
      world.set(minX, y, z, 10);
      world.set(maxX, y, z, 10);
    }
    for (let x = minX + 1; x < maxX; x++) {
      world.set(x, y, minZ, 10);
      world.set(x, y, maxZ, 10);
    }
  }

  // 4. Glass ceiling with glowstone chandeliers at maxY (42)
  for (let x = minX; x <= maxX; x++) {
    for (let z = minZ; z <= maxZ; z++) {
      if (x === 0 && z % 4 === 0) {
        world.set(x, maxY, z, 18); // Glowstone
      } else {
        world.set(x, maxY, z, 10); // Glass
      }
    }
  }

  // 5. Build 5 platform levels inside
  rebuildBlockFallPlatforms(world);
}

export function rebuildBlockFallPlatforms(world: World) {
  const pMinX = -(BLOCK_FALL_HALF_X - 2);
  const pMaxX = BLOCK_FALL_HALF_X - 2;
  const pMinZ = -(BLOCK_FALL_HALF_Z - 2);
  const pMaxZ = BLOCK_FALL_HALF_Z - 2;

  for (let x = pMinX; x <= pMaxX; x++) {
    for (let z = pMinZ; z <= pMaxZ; z++) {
      // Level 1: Emerald & Green Wool & Grass (Y = 36)
      const l1 = (x + z) % 3 === 0 ? 21 : (x + z) % 2 === 0 ? 32 : 1;
      world.set(x, 36, z, l1);

      // Level 2: Gold & Yellow Wool & Sand (Y = 29)
      const l2 = (x + z) % 3 === 0 ? 19 : (x + z) % 2 === 0 ? 33 : 6;
      world.set(x, 29, z, l2);

      // Level 3: Diamond & Blue Wool & Lapis (Y = 22)
      const l3 = (x + z) % 3 === 0 ? 20 : (x + z) % 2 === 0 ? 31 : 22;
      world.set(x, 22, z, l3);

      // Level 4: Red Wool & Terracotta & TNT (Y = 15)
      const l4 = (x + z) % 4 === 0 ? 28 : (x + z) % 2 === 0 ? 30 : 34;
      world.set(x, 15, z, l4);

      // Level 5: Obsidian & Amethyst & Glowstone (Y = 8)
      const l5 = (x + z) % 5 === 0 ? 18 : (x + z) % 2 === 0 ? 23 : 11;
      world.set(x, 8, z, l5);
    }
  }
}

export function createBotRunnerMesh(color: string): THREE.Group {
  const group = new THREE.Group();
  const c = new THREE.Color(color);
  const headMat = new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, metalness: 0.1 });
  const bodyMat = new THREE.MeshStandardMaterial({ color: c.clone().offsetHSL(0, -0.15, -0.1), roughness: 0.7 });
  const legMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });

  // Head
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 0.38), headMat);
  head.position.y = 1.15;
  head.castShadow = true;
  group.add(head);

  // Body
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.52, 0.24), bodyMat);
  body.position.y = 0.72;
  body.castShadow = true;
  group.add(body);

  // Legs
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.44, 0.2), legMat);
  legL.position.set(-0.11, 0.22, 0);
  legL.castShadow = true;
  group.add(legL);

  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.44, 0.2), legMat);
  legR.position.set(0.11, 0.22, 0);
  legR.castShadow = true;
  group.add(legR);

  return group;
}

export type VoxelTorchHandle = {
  group: THREE.Group;
  light: THREE.PointLight;
  flame: THREE.Mesh;
  update: (time: number) => void;
};

export function createVoxelTorch(x: number, y: number, z: number): VoxelTorchHandle {
  const group = new THREE.Group();
  group.position.set(x, y, z);

  // 1. Wooden torch stick (voxel rectangular prism)
  const stickGeo = new THREE.BoxGeometry(0.12, 0.58, 0.12);
  const stickMat = new THREE.MeshStandardMaterial({
    color: 0x82542a,
    roughness: 0.85,
    metalness: 0.05,
  });
  const stick = new THREE.Mesh(stickGeo, stickMat);
  stick.position.y = 0.29;
  stick.castShadow = true;
  stick.receiveShadow = true;
  group.add(stick);

  // 2. Charcoal base head
  const headGeo = new THREE.BoxGeometry(0.14, 0.1, 0.14);
  const headMat = new THREE.MeshStandardMaterial({
    color: 0x221c18,
    roughness: 0.9,
  });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 0.52;
  group.add(head);

  // 3. Glowing flame voxel
  const flameGeo = new THREE.BoxGeometry(0.16, 0.22, 0.16);
  const flameMat = new THREE.MeshStandardMaterial({
    color: 0xffaa22,
    emissive: 0xff6600,
    emissiveIntensity: 2.2,
    roughness: 0.2,
  });
  const flame = new THREE.Mesh(flameGeo, flameMat);
  flame.position.y = 0.65;
  group.add(flame);

  // 4. Hot flame inner core (bright yellow-white)
  const coreGeo = new THREE.BoxGeometry(0.09, 0.14, 0.09);
  const coreMat = new THREE.MeshBasicMaterial({ color: 0xfff4b0 });
  const core = new THREE.Mesh(coreGeo, coreMat);
  core.position.y = 0.65;
  group.add(core);

  // 5. Realistic dynamic point light with natural warm flame temperature
  // Range: 22 blocks with realistic cubic/quadratic attenuation
  const light = new THREE.PointLight(0xff9433, 2.9, 22, 1.3);
  light.position.set(0, 0.75, 0);
  light.castShadow = false;
  group.add(light);

  return {
    group,
    light,
    flame,
    update: (time: number) => {
      // Natural organic fire flicker (multi-frequency wave)
      const flicker =
        Math.sin(time * 19.3) * 0.24 + Math.sin(time * 37.7) * 0.14 + Math.cos(time * 11.2) * 0.12;
      light.intensity = Math.max(1.8, 2.9 + flicker);
      flame.scale.y = 1.0 + flicker * 0.18;
      flame.scale.x = 1.0 - flicker * 0.08;
      flame.scale.z = 1.0 - flicker * 0.08;
    },
  };
}

type ChestHandle = {
  group: THREE.Group;
  setOpen: (open: boolean) => void;
  update: (dt: number) => void;
};

function createChestMesh(): ChestHandle {
  const group = new THREE.Group();

  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x9b5f2e,
    roughness: 0.72,
    metalness: 0.04,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x1f1f23,
    roughness: 0.82,
    metalness: 0.15,
  });
  const latchMat = new THREE.MeshStandardMaterial({
    color: 0xd8dde4,
    roughness: 0.35,
    metalness: 0.75,
  });

  // Base box (0.86 wide, 0.65 high, 0.86 deep)
  const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.65, 0.86), woodMat);
  baseMesh.position.y = 0.325;
  baseMesh.castShadow = true;
  baseMesh.receiveShadow = true;
  group.add(baseMesh);

  // Black bottom & middle iron trims
  const band1 = new THREE.Mesh(new THREE.BoxGeometry(0.87, 0.05, 0.87), trimMat);
  band1.position.y = 0.025;
  group.add(band1);

  const band2 = new THREE.Mesh(new THREE.BoxGeometry(0.87, 0.05, 0.87), trimMat);
  band2.position.y = 0.625;
  group.add(band2);

  // Hinged lid assembly (pivot at the upper-back edge: y = 0.65, z = -0.43)
  const hinge = new THREE.Group();
  hinge.position.set(0, 0.65, -0.43);

  // Lid box offset from hinge: center y = +0.09, center z = +0.43
  const lidMesh = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.18, 0.86), woodMat);
  lidMesh.position.set(0, 0.09, 0.43);
  lidMesh.castShadow = true;
  lidMesh.receiveShadow = true;
  hinge.add(lidMesh);

  const lidTrim = new THREE.Mesh(new THREE.BoxGeometry(0.87, 0.04, 0.87), trimMat);
  lidTrim.position.set(0, 0.09, 0.43);
  hinge.add(lidTrim);

  // Silver latch mounted to the front face of the lid
  const latchMesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.07), latchMat);
  latchMesh.position.set(0, -0.01, 0.86 + 0.035);
  latchMesh.castShadow = true;
  hinge.add(latchMesh);

  group.add(hinge);

  let targetAngle = 0;
  let currentAngle = 0;

  return {
    group,
    setOpen: (open: boolean) => {
      targetAngle = open ? -Math.PI * 0.42 : 0;
    },
    update: (dt: number) => {
      currentAngle = THREE.MathUtils.lerp(currentAngle, targetAngle, Math.min(1, dt * 14));
      hinge.rotation.x = currentAngle;
    },
  };
}

function createSunDustParticles(count = 100) {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const vels = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 32;
    positions[i * 3 + 1] = 15 + Math.random() * 8;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 32;
    vels[i * 3] = (Math.random() - 0.5) * 0.35;
    vels[i * 3 + 1] = 0.15 + Math.random() * 0.25;
    vels[i * 3 + 2] = (Math.random() - 0.5) * 0.35;
  }

  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const canvas = document.createElement("canvas");
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    g.addColorStop(0, "rgba(255, 235, 175, 0.95)");
    g.addColorStop(0.35, "rgba(255, 175, 80, 0.4)");
    g.addColorStop(1, "rgba(255, 120, 40, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 16, 16);
  }
  const tex = new THREE.CanvasTexture(canvas);

  const mat = new THREE.PointsMaterial({
    color: 0xffd28e,
    size: 0.36,
    map: tex,
    transparent: true,
    opacity: 0.62,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const points = new THREE.Points(geo, mat);
  return {
    group: points,
    update: (dt: number, center: THREE.Vector3) => {
      const pos = geo.attributes.position.array as Float32Array;
      for (let i = 0; i < count; i++) {
        pos[i * 3] += vels[i * 3] * dt;
        pos[i * 3 + 1] += vels[i * 3 + 1] * dt;
        pos[i * 3 + 2] += vels[i * 3 + 2] * dt;

        if (pos[i * 3 + 1] > center.y + 12) pos[i * 3 + 1] = center.y - 3;
        if (Math.abs(pos[i * 3] - center.x) > 20)
          pos[i * 3] = center.x + (Math.random() - 0.5) * 18;
        if (Math.abs(pos[i * 3 + 2] - center.z) > 20)
          pos[i * 3 + 2] = center.z + (Math.random() - 0.5) * 18;
      }
      geo.attributes.position.needsUpdate = true;
    },
  };
}

const CRAFTED_KEY = "qb_skyblock_crafted";
const STARTER_BACKPACK: (number | string)[] = ["gold_sword", 7, 9, 2, 4, 6, 13, 1, 3, 5, 38, 40, 42];

type SwordStats = { damage: number; knockback: number; cooldown: number; reach: number; slash: number };

const SWORD_MODELS: Record<string, string> = {
  short_sword: "https://file.garden/alGOOylwpAfCa6qP/wooden_sword.glb",
  gold_sword: "https://file.garden/alGOOylwpAfCa6qP/sword_oro.glb",
  iron_sword: "https://file.garden/alGOOylwpAfCa6qP/sword_ferro.glb",
  diamond_sword: "https://file.garden/alGOOylwpAfCa6qP/sword_diamante.glb",
};

export const SWORD_STATS: Record<string, SwordStats> = {
  fist: { damage: 1, knockback: 3.2, cooldown: 0.3, reach: 3.4, slash: 0xffffff },
  short_sword: { damage: 4, knockback: 4.6, cooldown: 0.5, reach: 4.2, slash: 0xe8d3a8 },
  gold_sword: { damage: 5, knockback: 5.4, cooldown: 0.36, reach: 4.3, slash: 0xffc94a },
  iron_sword: { damage: 6, knockback: 6.2, cooldown: 0.46, reach: 4.5, slash: 0xdfe8f2 },
  diamond_sword: { damage: 7, knockback: 7.2, cooldown: 0.52, reach: 4.7, slash: 0x5ff2ff },
};

function normalizeShowcaseModel(model: THREE.Object3D, targetHeight: number) {
  model.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((material) => {
      const mat = material as THREE.MeshStandardMaterial;
      if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;
      if ("envMapIntensity" in mat) mat.envMapIntensity = 0.15;
      if ("roughness" in mat) mat.roughness = 0.82;
      mat.needsUpdate = true;
    });
  });
  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  model.scale.setScalar(targetHeight / Math.max(size.y, 0.001));
  const fitted = new THREE.Box3().setFromObject(model);
  const center = fitted.getCenter(new THREE.Vector3());
  model.position.x -= center.x;
  model.position.z -= center.z;
  model.position.y -= fitted.min.y;
}

const PLAYER_ISLAND_COLORS = [0xef476f, 0x29b6f6, 0x7bdc65, 0xffc857];

function createIslandGradientOutline(x: number, z: number, teamColor: number): THREE.Group {
  const group = new THREE.Group();
  const base = new THREE.Color(teamColor);
  const highlight = base.clone().lerp(new THREE.Color(0xffffff), 0.42);

  // A subtle team-color wash makes each player island readable without
  // changing the voxel collision or supplied cartoon block textures.
  const fillGeometry = new THREE.PlaneGeometry(48, 48);
  const fillColors = new Float32Array(fillGeometry.attributes.position.count * 3);
  for (let i = 0; i < fillGeometry.attributes.position.count; i++) {
    (i % 2 === 0 ? base : highlight).toArray(fillColors, i * 3);
  }
  fillGeometry.setAttribute("color", new THREE.Float32BufferAttribute(fillColors, 3));
  const fill = new THREE.Mesh(
    fillGeometry,
    new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.055,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  fill.rotation.x = -Math.PI / 2;
  fill.position.y = 0.08;
  group.add(fill);

  // The outline uses the same two team colors as the gradient wash.
  const outlineGeometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(50, 0.08, 50));
  const outlineColors = new Float32Array(outlineGeometry.attributes.position.count * 3);
  for (let i = 0; i < outlineGeometry.attributes.position.count; i++) {
    (i % 4 < 2 ? base : highlight).toArray(outlineColors, i * 3);
  }
  outlineGeometry.setAttribute("color", new THREE.Float32BufferAttribute(outlineColors, 3));
  const outline = new THREE.LineSegments(
    outlineGeometry,
    new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    }),
  );
  outline.position.y = 0.12;
  group.add(outline);
  group.position.set(x + 0.5, 8.95, z + 0.5);
  return group;
}

function multiplayerErrorMessage(error: unknown, resource: "players" | "world") {
  const code = (error as { code?: string } | null)?.code;
  if (code === "permission-denied" || code === "unauthenticated") {
    return "";
  }
  return "";
}

export function SandboxGame({
  goldenDays = false,
  skyblock = false,
  blockFall = false,
  bedwars = false,
}: {
  goldenDays?: boolean;
  skyblock?: boolean;
  blockFall?: boolean;
  bedwars?: boolean;
} = {}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<Controls | null>(null);
  const slotRef = useRef(0);
  const [slot, setSlot] = useState(0);
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [locked, setLocked] = useState(false);
  const [hotbar, setHotbar] = useState<(number | string)[]>(
    goldenDays
      ? ["short_sword", 1, 2, 3, 4, 44, 45, 46, 18, 21]
      : skyblock
        ? ["gold_sword", 7, 9, 2, 4, 6, 13, 1, 3]
        : blockFall
          ? []
          : bedwars
            ? ["short_sword", 5, 13, 10, "ender_pearl", "water_bucket", "golden_apple", "flint_steel", 57]
            : [1, 2, 3, 4, 5, 6, 7, 9, 10],
  );
  const hotbarRef = useRef(hotbar);
  hotbarRef.current = hotbar;
  const [crafted, setCrafted] = useState<(number | string)[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = JSON.parse(localStorage.getItem(CRAFTED_KEY) || "[]");
      return Array.isArray(raw) ? raw.filter((v) => typeof v === "number" || typeof v === "string") : [];
    } catch {
      return [];
    }
  });
  const [bgmMuted, setBgmMuted] = useState(false);
  const restartBlockFallRef = useRef<(() => void) | null>(null);

  // V2 game systems — created once per mounted game, ticked by the render loop.
  const [match] = useState(() => new MatchController(3));
  const [progression] = useState(() => new Progression());
  const [worldEvents] = useState(() => new WorldEvents());
  const [veilToken, setVeilToken] = useState(0);
  const [seeds, setSeeds] = useState<SeedCounts>({ oak: 0, birch: 0, spruce: 0 });
  const [seedSpecies, setSeedSpecies] = useState<Species>("oak");
  const [pauseMenuOpen, setPauseMenuOpen] = useState(false);

  // Cleanup BGM on unmount
  useEffect(() => {
    return () => {
      if (blockFall) {
        BmgoAudio.stopBgm();
      }
    };
  }, [blockFall]);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [chestOpen, setChestOpen] = useState(false);
  const chestHandleRef = useRef<ChestHandle | null>(null);
  const [nearChest, setNearChest] = useState(false);
  const nearChestRef = useRef(false);

  useEffect(() => {
    chestHandleRef.current?.setOpen(chestOpen);
  }, [chestOpen]);
  const [playerHp, setPlayerHp] = useState(20);
  const featuresRef = useRef<Features | null>(null);
  const [offhand, setOffhand] = useState<number | string | null>(null);
  const [bridgeAssist, setBridgeAssist] = useState(true);
  const [wheelOpen, setWheelOpen] = useState(false);
  const [quickBuyOpen, setQuickBuyOpen] = useState(false);
  const [playerHunger, setPlayerHunger] = useState(20);
  const [runesTimeLeft, setRunesTimeLeft] = useState(600);
  const [inspectUser, setInspectUser] = useState<UserSquareCardData | null>(null);
  const inspectUserRef = useRef<((data: UserSquareCardData) => void) | null>(null);
  const [showHud, setShowHud] = useState(true);
  const [tileUrls, setTileUrls] = useState<Record<number | string, string>>({});
  const touchLook = useRef<{ id: number; x: number; y: number } | null>(null);
  const joyRef = useRef<HTMLDivElement>(null);
  const [joyNub, setJoyNub] = useState({ x: 0, y: 0 });
  const [thirdPerson, setThirdPerson] = useState(() => {
    try {
      const stored = localStorage.getItem("qb_first_person");
      // If stored is "true" (meaning first person ON), thirdPerson should be false
      if (stored === "true") return false;
      if (stored === "false") return true;
    } catch {}
    return true;
  });
  const [avatarReady, setAvatarReady] = useState(false);
  const [emoting, setEmoting] = useState(false);
  const emotingRef = useRef(false);
  const avatarInstanceRef = useRef<Avatar | null>(null);
  const thirdRef = useRef(true);
  
  // Update thirdRef whenever thirdPerson changes
  useEffect(() => {
    thirdRef.current = thirdPerson;
  }, [thirdPerson]);
  
  // Listen for the custom event from settings
  useEffect(() => {
    const handleToggle = (e: any) => {
      setThirdPerson(!e.detail);
    };
    window.addEventListener("bm-first-person", handleToggle);
    return () => window.removeEventListener("bm-first-person", handleToggle);
  }, []);

  const mineBarRef = useRef<HTMLDivElement>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showQuitDialog, setShowQuitDialog] = useState(false);
  const [multiplayerError, setMultiplayerError] = useState("");
  const [graphicsError, setGraphicsError] = useState("");
  const hungerRef = useRef(20);
  const runesTimeRef = useRef(600);

  // Celestial Sky & Atmosphere (Day: Sun + Phoenix, Night: Moon + Aurora Borealis)
  const [celestialNight, setCelestialNight] = useState(false);
  const celestialNightRef = useRef(false);
  celestialNightRef.current = celestialNight;
  const skyRef = useRef<Sky | null>(null);
  const celestialSunRef = useRef<THREE.Group | null>(null);
  const celestialMoonRef = useRef<THREE.Group | null>(null);
  const auroraGroupRef = useRef<THREE.Group | null>(null);
  const phoenixModelRef = useRef<THREE.Group | null>(null);
  const phoenixMixerRef = useRef<THREE.AnimationMixer | null>(null);
  const voxelTorchRef = useRef<VoxelTorchHandle | null>(null);
  const voxelPropsRef = useRef<VoxelPropHandle[]>([]);
  const gltfTreesRef = useRef<
    {
      group: THREE.Group;
      foliage: THREE.Mesh[];
      baseRotZ: number;
      baseRotX: number;
      seed: number;
    }[]
  >([]);
  const cosmicSkyRef = useRef<CosmicSky | null>(null);

  useEffect(() => {
    if (!skyblock || !skyRef.current) return;
    cosmicSkyRef.current?.setNight(celestialNight);
    if (celestialNight) {
      skyRef.current.setNight();
      if (celestialSunRef.current) celestialSunRef.current.visible = false;
      if (celestialMoonRef.current) celestialMoonRef.current.visible = true;
      if (auroraGroupRef.current) auroraGroupRef.current.visible = false;
      // Glowing phoenix remains soaring as a fiery celestial beacon at night
      if (phoenixModelRef.current) phoenixModelRef.current.visible = true;
    } else {
      skyRef.current.setNormalDay();
      let fogMode = "realistic";
      try {
        fogMode = localStorage.getItem("qb_fog_mode") || "realistic";
      } catch {}
      if (fogMode === "dense") skyRef.current.setRange(5, 34);
      else if (fogMode === "subtle") skyRef.current.setRange(18, 90);
      else if (fogMode === "off") skyRef.current.setRange(90, 450);
      else skyRef.current.setRange(10, 64);
      if (celestialSunRef.current) celestialSunRef.current.visible = true;
      if (celestialMoonRef.current) celestialMoonRef.current.visible = false;
      if (auroraGroupRef.current) auroraGroupRef.current.visible = false;
      if (phoenixModelRef.current) phoenixModelRef.current.visible = true;
    }
  }, [celestialNight, skyblock]);

  // Local identity used for multiplayer presence + name tags.
  const { qbUser } = useAuth();
  const getInitialGuestId = () => {
    if (typeof window === "undefined") return "guest";
    try {
      let g = window.sessionStorage?.getItem("qb_guest_uid");
      if (!g) {
        g = "guest_" + Math.random().toString(36).slice(2, 8);
        window.sessionStorage?.setItem("qb_guest_uid", g);
      }
      return g;
    } catch {
      return "guest";
    }
  };

  const meRef = useRef<{
    uid: string;
    name: string;
    photo: string;
    frame: string;
    badges: string[];
  }>({ uid: getInitialGuestId(), name: "Player", photo: "", frame: "none", badges: [] });

  useEffect(() => {
    const permanentUid = getPermanentPlayerId(qbUser);
    meRef.current = {
      uid: permanentUid,
      name: qbUser?.displayName || qbUser?.username || (qbUser?.uid ? "Player" : "Guest Player"),
      photo: qbUser?.profilePhoto ?? "",
      frame: qbUser?.avatarSnapshot?.frameId ?? "none",
      badges: badgeUrlsFor(qbUser),
    };
  }, [qbUser]);

  // ── Persistent Island Progression (Saved By Person Forever in Firestore & LocalStorage) ──
  useEffect(() => {
    if (!skyblock) return;
    const playerUid = getPermanentPlayerId(qbUser);
    let isMounted = true;

    // Load saved progression & hotbar on mount or when user identity changes
    void loadSkyblockProfile(playerUid).then((profile) => {
      if (!isMounted || !profile) return;
      if (profile.progression) {
        progression.hydrate(profile.progression);
      }
      if (profile.hotbar && Array.isArray(profile.hotbar) && profile.hotbar.length > 0) {
        setHotbar(profile.hotbar);
      }
    });

    // Debounced autosave
    let saveTimer: ReturnType<typeof setTimeout> | null = null;
    const triggerSave = () => {
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        const toSave = progression.toSave();
        void saveSkyblockProfile(playerUid, {
          progression: toSave,
          hotbar: hotbarRef.current,
        });
      }, 500);
    };

    // Auto-save on every state change (mining, placing, XP, quest progress)
    const unsub = progression.store.subscribe(() => {
      triggerSave();
    });

    // Immediate save when a milestone or quest is completed
    progression.onMilestone = () => {
      const toSave = progression.toSave();
      void saveSkyblockProfile(playerUid, {
        progression: toSave,
        hotbar: hotbarRef.current,
      });
    };

    const handleBeforeUnload = () => {
      const toSave = progression.toSave();
      void saveSkyblockProfile(playerUid, {
        progression: toSave,
        hotbar: hotbarRef.current,
      });
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      isMounted = false;
      unsub();
      if (saveTimer) clearTimeout(saveTimer);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      const toSave = progression.toSave();
      void saveSkyblockProfile(playerUid, {
        progression: toSave,
        hotbar: hotbarRef.current,
      });
    };
  }, [skyblock, qbUser?.uid, progression]);

  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    setIsTouch(typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches);
  }, []);

  const [movementMode, setMovementMode] = useState<MovementMode>("walk");
  const movementModeRef = useRef<MovementMode>("walk");
  const handleMovementModeChange = (mode: MovementMode) => {
    setMovementMode(mode);
    movementModeRef.current = mode;
    if (controlsRef.current) {
      controlsRef.current.touch.sprint = mode === "run";
      controlsRef.current.touch.crouch = mode === "crouch";
    }
  };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    setGraphicsError("");
    let disposed = false;
    let raf = 0;
    let atlas: Atlas | null = null;
    let world: World | null = null;
    let fx: BlockFx | null = null;
    let renderer: THREE.WebGLRenderer | null = null;
    let controls: Controls | null = null;
    let sky: Sky | null = null;
    let avatar: Avatar | null = null;
    let bedDecorations: THREE.Group | null = null;
    let ownBedIndicator: THREE.Sprite | null = null;
    let runesSource: THREE.Object3D | null = null;
    let runesModels: THREE.Object3D[] = [];
    let runesTags: NameTag[] = [];
    let runesTimers: RuneTimerTag[] = [];
    let runesMixers: THREE.AnimationMixer[] = [];
    let heldSwordSource: THREE.Object3D | null = null;
    let heldSword: THREE.Object3D | null = null;
    let heldSwordMixer: THREE.AnimationMixer | null = null;
    let workbenchModels: THREE.Object3D[] = [];
    let workbenchTags: NameTag[] = [];
    let remotes: RemotePlayers | null = null;
    let selfTag: NameTag | null = null;
    let matchmaker: Avatar | null = null;
    let matchmakerTag: NameTag | null = null;
    const matchmakerPos = new THREE.Vector3(BEDWARS_MATCHMAKER_POS.x, BEDWARS_MATCHMAKER_POS.y, BEDWARS_MATCHMAKER_POS.z);
    let unsubPresence: (() => void) | null = null;
    let unsubWorld: (() => void) | null = null;
    let unsubChat: (() => void) | null = null;
    let selfSayCleanup: (() => void) | null = null;
    hungerRef.current = 20;
    runesTimeRef.current = 600;
    setPlayerHunger(20);
    setRunesTimeLeft(600);

    (async () => {
      try {
        atlas = await buildAtlas((loaded, total) => setProgress(Math.round((loaded / total) * 100)));
        if (disposed) return;

        setTileUrls(
          Object.fromEntries(
            hotbar.map((id) => {
              if (typeof id === "string") return [id, utilityIconUrl(id)];
              const block = BLOCKS.find((b) => b.id === id);
              return [id, block ? atlas!.url(block.side) : ""];
            }),
          ) as Record<number | string, string>,
        );

        try {
          renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: "high-performance",
          });
        } catch {
          try {
            renderer = new THREE.WebGLRenderer({
              antialias: false,
              powerPreference: "default",
            });
          } catch (error) {
            setGraphicsError(
              "3D graphics are unavailable in this preview. Open the game in a browser with WebGL enabled.",
            );
            console.error("Could not create the sandbox WebGL renderer:", error);
            return;
          }
        }
      const qualityPref = readQualityPref();
      renderer.setPixelRatio(getTargetDpr(qualityPref));
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.25;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.shadowMap.autoUpdate = false;
      renderer.shadowMap.needsUpdate = true;

      // Full anisotropic filtering keeps grazing-angle (distant floor) texels
      // crisp instead of smearing into blocky mip levels.
      const maxAniso = renderer.capabilities.getMaxAnisotropy();
      atlas.texture.anisotropy = maxAniso;
      atlas.texture.magFilter = THREE.LinearFilter;
      atlas.texture.minFilter = THREE.LinearMipmapLinearFilter;
      atlas.texture.generateMipmaps = true;
      atlas.texture.needsUpdate = true;

      mount.appendChild(renderer.domElement);
      renderer.domElement.style.display = "block";
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      renderer.domElement.style.imageRendering = "auto";
      renderer.domElement.addEventListener("contextmenu", (e) => e.preventDefault());

      const scene = new THREE.Scene();
      scene.background = new THREE.Color("#cfe6fb");

      // Wider FOV = zoomed out, you see much more of the world at once.
      // Far plane must sit well beyond the sky dome, otherwise the dome gets
      // clipped and shows up as a giant pale circle in the sky.
      // Near/far kept tight for depth precision (the old 0.05..8000 range
      // caused distant z-fighting shimmer). The sky dome renders at the far
      // plane in its shader, so it never needs a huge far distance.
      const aspect0 = mount.clientWidth / Math.max(1, mount.clientHeight);
      let userFov = 72;
      try {
        const savedFov = localStorage.getItem("qb_camera_fov");
        if (savedFov) {
          const parsed = Number(savedFov);
          if (!isNaN(parsed) && parsed >= 50 && parsed <= 100) userFov = parsed;
        }
      } catch {}
      const camera = new THREE.PerspectiveCamera(fovForAspect(aspect0, 90, userFov), aspect0, 0.1, 900);
      let baseFov = camera.fov;

      sky = new Sky(scene, {
        dayLength: skyblock ? 720 : 600,
        shadowMapSize: getShadowMapSize(qualityPref),
        cloudOctaves: qualityPref === "low" ? 3 : 5,
      });
      skyRef.current = sky;
      let initialAtm = "day";
      try {
        initialAtm = localStorage.getItem("qb_atmosphere") || "day";
      } catch {}
      if (initialAtm === "golden") {
        sky.setGoldenHour();
      } else if (initialAtm === "night") {
        sky.setNight();
      } else {
        sky.setNormalDay();
      }

      let initialFogMode = "realistic";
      try {
        initialFogMode = localStorage.getItem("qb_fog_mode") || "realistic";
      } catch {}

      const applyFogMode = (mode: string) => {
        if (!sky) return;
        if (mode === "dense") {
          sky.setRange(5, 34);
        } else if (mode === "subtle") {
          sky.setRange(18, 90);
        } else if (mode === "off") {
          sky.setRange(90, 450);
        } else {
          // "realistic" (default) — close atmospheric fog with rich depth
          sky.setRange(10, blockFall ? 50 : 64);
        }
      };

      applyFogMode(initialFogMode);

      if (blockFall) {
        sky.paused = true;
        sky.setCloudCover(0.35);
        renderer.toneMappingExposure = 1.2;
      }

      // Chunk render distance: tuned per mode for rock-solid performance
      if (bedwars) {
        sky.setGoldenHour();
        sky.paused = true;
        sky.setCloudCover(0.34);
        renderer.toneMappingExposure = 1.18;
      }

      world = new World(atlas, goldenDays ? 16 : skyblock || bedwars ? 10 : blockFall ? 6 : 8);

      if (bedwars) {
        buildBedwarsLobby(world);
      } else if (blockFall) {
        buildBlockFallArena(world);
      } else if (goldenDays) {
        buildForestArena(world);
      } else if (skyblock) {
        buildSkyblockIsland(world);
      } else {
        world.generate(GROUND);
      }
      world.meshAll();
      scene.add(world.group);

      const skyEnv = skyblock
        ? new SkyblockEnvironment(scene, { pond: SKYBLOCK_POND_SURFACE, lowQuality: qualityPref === "low" })
        : null;
      if (skyblock) {
        renderer.toneMappingExposure = 1.18;
        sky.setCloudCover(0.42);
      }

      const grassField =
        (skyblock || bedwars) && qualityPref !== "low"
          ? new GrassField(
              world,
              bedwars ? BEDWARS_LOBBY_BOUNDS : { minX: -15, maxX: 16, minZ: -15, maxZ: 16, minY: 4, maxY: 40 },
            )
          : null;
      if (grassField) scene.add(grassField.mesh);
      const cinematicPost =
        (skyblock || blockFall || bedwars) && qualityPref !== "low"
          ? new CinematicPost(renderer, scene, camera, 0.18)
          : null;
      const applyGraphicsV2 = (on: boolean) => {
        sky?.setGraphicsV2(on);
        cinematicPost?.setGraphicsV2(on);
        if (renderer) renderer.shadowMap.needsUpdate = true;
      };
      applyGraphicsV2(isGraphicsV2());
      const onGraphicsV2 = (e: Event) => applyGraphicsV2((e as CustomEvent<boolean>).detail);
      window.addEventListener(GRAPHICS_V2_EVENT, onGraphicsV2);
      const cosmicSky = skyblock ? new CosmicSky(scene, qualityPref === "low") : null;
      cosmicSkyRef.current = cosmicSky;
      cosmicSky?.setNight(celestialNightRef.current || initialAtm === "night");

      if (skyblock) {
        // Chest completely removed per user request

        // ── 1. Celestial Sun Reference Marker (for Phoenix orbit) ──
        const sunGroup = new THREE.Group();
        sunGroup.position.set(68, 88, 42);
        scene.add(sunGroup);
        celestialSunRef.current = sunGroup;

        // ── 2. Luminous Celestial Moon Light ──
        const moonGroup = new THREE.Group();
        moonGroup.position.set(-68, 78, -42);
        moonGroup.visible = false;

        // Circular moon sphere and halo removed per user request
        const moonLight = new THREE.PointLight(0x7dd3fc, 2.5, 300, 0.9);
        moonGroup.add(moonLight);
        scene.add(moonGroup);
        celestialMoonRef.current = moonGroup;

        // ── 3. Shimmering Aurora Ribbons (Removed per user request to eliminate spectrum of light) ──
        const aGroup = new THREE.Group();
        aGroup.visible = false;
        auroraGroupRef.current = aGroup;

        // ── 4. Soaring Phoenix Companion (Near Radiant Sun) ──
        try {
          const pLoader = new GLTFLoader();
          pLoader.load(
            "https://file.garden/alGOOylwpAfCa6qP/phoenix_on_fire_update.glb",
            (pAsset) => {
              if (disposed) return;
              const pModel = pAsset.scene;
              // Make phoenix even smaller per user request
              pModel.scale.setScalar(0.08);
              pModel.position.set(75, 95, 48);

              // Traverse and set material properties for smooth, glowing textures
              pModel.traverse((node) => {
                if ((node as THREE.Mesh).isMesh) {
                  const mesh = node as THREE.Mesh;
                  if (mesh.material) {
                    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                    mats.forEach((m) => {
                      const mat = m as THREE.MeshStandardMaterial;
                      if (mat.map) {
                        mat.map.magFilter = THREE.LinearFilter;
                        mat.map.minFilter = THREE.LinearMipmapLinearFilter;
                        mat.map.generateMipmaps = true;
                        mat.map.anisotropy = 8;
                        mat.map.needsUpdate = true;
                      }
                      mat.emissive = new THREE.Color(0xff6a10);
                      if (mat.map && !mat.emissiveMap) mat.emissiveMap = mat.map;
                      mat.emissiveIntensity = 2.4;
                      mat.needsUpdate = true;
                    });
                  }
                }
              });

              // Layered additive corona: hot inner core + wide soft halo.
              const auraCore = new THREE.Mesh(
                new THREE.SphereGeometry(1.4, 16, 16),
                new THREE.MeshBasicMaterial({
                  color: new THREE.Color(2.2, 1.1, 0.3),
                  transparent: true,
                  opacity: 0.45,
                  blending: THREE.AdditiveBlending,
                  depthWrite: false,
                }),
              );
              const auraHalo = new THREE.Mesh(
                new THREE.SphereGeometry(3.2, 16, 16),
                new THREE.MeshBasicMaterial({
                  color: 0xff7a1a,
                  transparent: true,
                  opacity: 0.16,
                  blending: THREE.AdditiveBlending,
                  depthWrite: false,
                }),
              );
              pModel.add(auraCore, auraHalo);

              scene.add(pModel);
              phoenixModelRef.current = pModel;

              if (pAsset.animations && pAsset.animations.length > 0) {
                const pMixer = new THREE.AnimationMixer(pModel);
                pAsset.animations.forEach((clip) => {
                  const action = pMixer.clipAction(clip);
                  action.setLoop(THREE.LoopRepeat, Infinity);
                  action.play();
                });
                phoenixMixerRef.current = pMixer;
              }
            },
            undefined,
            (err) => console.warn("Could not load soaring phoenix:", err),
          );
        } catch (err) {
          console.warn("Phoenix loading error:", err);
        }

        // ── 5. Realistic Voxel Torch with Dynamic Lighting on Starter Island ──
        const starterTorch = createVoxelTorch(1.5, 17.0, 1.5);
        scene.add(starterTorch.group);
        voxelTorchRef.current = starterTorch;

        // Cozy lantern on iron stand near camp (Reference Image 3)
        const campLantern = createVoxelLantern(-2.8, 16.0, -3.0);
        scene.add(campLantern.group);

        voxelPropsRef.current = [campLantern];

        // ── 6. High-Fidelity 3D Stylized Tree (Upright & Grounded) ──
        try {
          const treeLoader = new GLTFLoader();
          const treeAsset = await treeLoader.loadAsync("/nuovo_progetto_20.gltf").catch(() =>
            treeLoader.loadAsync("https://file.garden/alGOOylwpAfCa6qP/Nuovo%20Progetto%2020.gltf"),
          );
          if (!disposed && treeAsset?.scene) {
            // Strip any unintended lights (Faretto, Direzionale) and default blender cubes
            const unwanted: THREE.Object3D[] = [];
            treeAsset.scene.traverse((obj) => {
              if (
                (obj as THREE.Light).isLight ||
                obj.name === "Faretto" ||
                obj.name === "Direzionale" ||
                obj.name.startsWith("Cubo")
              ) {
                unwanted.push(obj);
              }
            });
            unwanted.forEach((obj) => obj.removeFromParent());

            // Extract tree model (low_poly_tree node)
            const templateTree = treeAsset.scene.getObjectByName("low_poly_tree") || treeAsset.scene;

            // Placements for upright trees on the island
            const placements = [
              { x: -4.0, y: 16.0, z: -4.0, scale: 0.58, rotY: 0.35, seed: 1.2 },
            ];

            const createdTrees: {
              group: THREE.Group;
              foliage: THREE.Mesh[];
              baseRotZ: number;
              baseRotX: number;
              seed: number;
            }[] = [];

            placements.forEach((p) => {
              const treeClone = templateTree.clone(true) as THREE.Group;

              // Stand tree upright (compensate for tilted Blender scene export)
              treeClone.rotation.set(105 * Math.PI / 180, 0, -80 * Math.PI / 180);
              treeClone.scale.setScalar(p.scale);

              const pivot = new THREE.Group();
              pivot.rotation.y = p.rotY;
              pivot.add(treeClone);
              pivot.updateMatrixWorld(true);

              const trunkObj = treeClone.getObjectByName("Plane1065_Material002_0") || treeClone;
              const trunkBox = new THREE.Box3().setFromObject(trunkObj);
              const center = trunkBox.getCenter(new THREE.Vector3());

              // Ground trunk base exactly at island grass (p.y = 16.0) and center at (p.x, p.z)
              treeClone.position.x += (p.x - center.x);
              treeClone.position.y += (p.y - trunkBox.min.y);
              treeClone.position.z += (p.z - center.z);
              pivot.updateMatrixWorld(true);

              const foliage: THREE.Mesh[] = [];
              treeClone.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                  const m = child as THREE.Mesh;
                  m.castShadow = true;
                  m.receiveShadow = true;
                  if (m.material) {
                    const mat = m.material as THREE.MeshStandardMaterial;
                    if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;
                    mat.side = THREE.DoubleSide;
                    mat.alphaTest = 0.25;
                    mat.needsUpdate = true;
                  }
                  if (m.name.includes("Plane") || m.name.includes("Material")) {
                    m.userData.baseRotY = m.rotation.y;
                    foliage.push(m);
                  }
                }
              });

              scene.add(pivot);

              createdTrees.push({
                group: pivot,
                foliage,
                baseRotZ: 0,
                baseRotX: 0,
                seed: p.seed,
              });
            });

            gltfTreesRef.current = createdTrees;
          }
        } catch (treeLoadErr) {
          console.warn("Could not load stylized GLTF trees:", treeLoadErr);
        }
      }

      if (goldenDays) {
        bedDecorations = new THREE.Group();
        scene.add(bedDecorations);
        ARENA_BASES.forEach((base, index) => {
          bedDecorations?.add(
            createIslandGradientOutline(base.x, base.z, PLAYER_ISLAND_COLORS[index]),
          );
        });
        ownBedIndicator = createOwnBedIndicator();
        const ownBed = ARENA_BEDS[0];
        ownBedIndicator.position.set(ownBed.x + 0.5, 13, ownBed.z + 0.5);
        scene.add(ownBedIndicator);

        try {
          const bedAsset = await new GLTFLoader().loadAsync("/bedwars-bed.glb");
          if (!disposed) {
            const source = bedAsset.scene;
            const sourceBounds = new THREE.Box3().setFromObject(source);
            const sourceSize = sourceBounds.getSize(new THREE.Vector3());
            const sourceMax = Math.max(sourceSize.x, sourceSize.y, sourceSize.z, 0.01);
            const sourceScale = 2.7 / sourceMax;

            ARENA_BEDS.forEach((bed, index) => {
              const model = source.clone(true);
              model.scale.setScalar(sourceScale);
              model.rotation.y = index * Math.PI * 0.5;
              const bounds = new THREE.Box3().setFromObject(model);
              const center = bounds.getCenter(new THREE.Vector3());
              model.position.x += bed.x + 0.5 - center.x;
              model.position.y += 9 - bounds.min.y;
              model.position.z += bed.z + 0.5 - center.z;
              bedDecorations?.add(model);
            });
          }
        } catch (error) {
          console.error("Could not load the BedWars bed model:", error);
        }

        // Each player island gets its own Workbench and Runes showcase. The
        // center stays open for movement and PvP instead of being a shop hub.
        for (const base of ARENA_BASES) {
          const tag = new NameTag("Workbench", 3.8, [], "#f1d39b");
          tag.group.position.set(base.x - 11, 13.1, base.z + 8);
          scene.add(tag.group);
          workbenchTags.push(tag);
        }

        try {
          const loader = new GLTFLoader();
          const [runesAsset, workbenchAsset] = await Promise.all([
            loader.loadAsync("/runes-ghast.glb"),
            loader.loadAsync("/workbench.glb"),
          ]);

          if (!disposed) {
            runesSource = runesAsset.scene;
            normalizeShowcaseModel(runesSource, 4.6);
            for (const [index, base] of ARENA_BASES.entries()) {
              const runes = cloneSkinnedModel(runesSource);
              runes.position.set(base.x + 11, 9, base.z - 8);
              scene.add(runes);
              runesModels.push(runes);

              const tag = new NameTag(
                "Runes",
                3.6,
                [],
                `#${PLAYER_ISLAND_COLORS[index].toString(16)}`,
              );
              tag.group.position.set(base.x + 11, 14.25, base.z - 8);
              scene.add(tag.group);
              runesTags.push(tag);

              const timer = new RuneTimerTag();
              timer.group.position.set(base.x + 11, 15.05, base.z - 8);
              scene.add(timer.group);
              runesTimers.push(timer);

              if (runesAsset.animations.length) {
                const mixer = new THREE.AnimationMixer(runes);
                runesAsset.animations.forEach((clip) => {
                  const action = mixer.clipAction(clip);
                  action.setLoop(THREE.LoopRepeat, Infinity);
                  action.play();
                });
                runesMixers.push(mixer);
              }
            }
            normalizeShowcaseModel(workbenchAsset.scene, 3.1);
            for (const [index, base] of ARENA_BASES.entries()) {
              const workbench = workbenchAsset.scene.clone(true);
              workbench.position.set(base.x - 11, 9, base.z + 8);
              workbench.rotation.y = index * Math.PI * 0.5;
              scene.add(workbench);
              workbenchModels.push(workbench);
            }
          }
        } catch (error) {
          console.error("Could not load the center showcase assets:", error);
        }
      }

      fx = new BlockFx(atlas);
      scene.add(fx.group);

      const combatFx = new CombatFx();
      scene.add(combatFx.group);
      const syncBlock = (x: number, y: number, z: number, id: number) => {
        const write = blockFall ? writeBlockFallBlock : writeSandboxBlock;
        void write({ x, y, z, id }).catch((error) => console.error("Could not sync nature block:", error));
      };
      const nature = new Nature(world!, fx, syncBlock);
      scene.add(nature.group);
      nature.onSeedsChange = (s) => setSeeds(s);
      nature.onNotice = (title, detail) => announce(title, detail, "reward");
      nature.onSound = (kind) => {
        playSound(kind);
        if (renderer) renderer.shadowMap.needsUpdate = true;
      };

      const highlight = createHighlight();
      scene.add(highlight);

      const player = new Player(world);
      player.onDie = () => {
        if (avatar?.loaded) {
          avatar.triggerDeath(() => {
            player.respawn();
            avatar.resetDeath();
          });
        } else {
          setTimeout(() => {
            player.respawn();
          }, 1500);
        }
      };
      if (blockFall) {
        player.profile = COMPETITIVE_PHYSICS;
        player.setSpawnPoint(0.5, 37.8, 0.5);
        player.respawn();
      } else if (goldenDays) {
        player.setSpawnPoint(0.5, 15, -219.5);
        player.respawn();
      } else if (skyblock) {
        player.setSpawnPoint(0.5, 17.5, 0.5);
        player.respawn();
      } else if (bedwars) {
        player.setSpawnPoint(BEDWARS_LOBBY_SPAWN.x, BEDWARS_LOBBY_SPAWN.y, BEDWARS_LOBBY_SPAWN.z);
        player.respawn();
      } else {
        player.setSpawnPoint(0.5, GROUND + 2, 0.5);
        player.respawn();
      }

      // first-person held block — a real cube with top / side / bottom faces
      const faceTex = () => {
        const t = atlas!.texture.clone();
        t.needsUpdate = true;
        return t;
      };
      const texSide = faceTex();
      const texTop = faceTex();
      const texBottom = faceTex();
      // BoxGeometry material order: +x, -x, +y, -y, +z, -z
      const heldMats = [texSide, texSide, texTop, texBottom, texSide, texSide].map(
        (map) => new THREE.MeshLambertMaterial({ map }),
      );
      const held = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.24), heldMats);
      const heldRig = new THREE.Group();
      heldRig.add(held);
      // The supplied short sword is a real GLB in the hand, not a flat legacy
      // item card. It stays hidden whenever a voxel block is selected.
      // Each sword tier has its own GLB. They stream in independently and
      // attach to the hand rig; `heldSword` always points at the visible one.
      const heldSwords = new Map<string, THREE.Object3D>();
      let heldItemId: number | string = 0;
      let iconRenderer: THREE.WebGLRenderer | null = null;
      let iconsPending = Object.keys(SWORD_MODELS).length;
      const renderSwordIcon = (model: THREE.Object3D) => {
        try {
          if (!iconRenderer) {
            iconRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
            iconRenderer.setSize(96, 96, false);
            iconRenderer.outputColorSpace = THREE.SRGBColorSpace;
          }
          const s = new THREE.Scene();
          s.add(new THREE.AmbientLight(0xffffff, 1.5));
          const key = new THREE.DirectionalLight(0xffffff, 2.4);
          key.position.set(2, 3, 4);
          s.add(key);
          const clone = model.clone(true);
          clone.visible = true;
          clone.position.set(0, 0, 0);
          clone.rotation.set(0, Math.PI / 2, -Math.PI / 4);
          const box = new THREE.Box3().setFromObject(clone);
          clone.position.sub(box.getCenter(new THREE.Vector3()));
          s.add(clone);
          const size = box.getSize(new THREE.Vector3()).length();
          const cam = new THREE.PerspectiveCamera(30, 1, 0.01, 100);
          cam.position.set(0, 0, size * 1.95);
          cam.lookAt(0, 0, 0);
          iconRenderer.render(s, cam);
          return iconRenderer.domElement.toDataURL("image/png");
        } catch {
          return "";
        }
      };
      const swordLoader = new GLTFLoader();
      for (const [sid, url] of Object.entries(SWORD_MODELS)) {
        swordLoader
          .loadAsync(url)
          .then((g) => {
            if (disposed) return;
            const m = g.scene;
            normalizeShowcaseModel(m, 0.4073); // made 27% smaller per user request (0.558 * 0.73)
            m.traverse((o) => {
              const mesh = o as THREE.Mesh;
              if (mesh.isMesh) mesh.castShadow = false;
            });
            m.rotation.set(0.05, -0.22, -0.08);
            m.visible = false;
            heldRig.add(m);
            heldSwords.set(sid, m);
            const icon = renderSwordIcon(m);
            if (icon) setTileUrls((prev) => ({ ...prev, [sid]: icon }));
            if (heldItemId === sid) setHeldTile(sid);
          })
          .catch((err) => console.warn(`Sword model ${sid} failed to load:`, err))
          .finally(() => {
            iconsPending -= 1;
            if (iconsPending <= 0 && iconRenderer) {
              iconRenderer.dispose();
              iconRenderer = null;
            }
          });
      }

      // First-person block hand with fair/white-ish skin tone per user request:
      const heldHand = new THREE.Group();
      const handTex = new THREE.TextureLoader().load("/ui/hand-2d.png");
      handTex.colorSpace = THREE.SRGBColorSpace;
      handTex.anisotropy = 4;
      const handSprite = new THREE.Mesh(
        new THREE.PlaneGeometry(0.46, 0.46 * (1081 / 1372)),
        new THREE.MeshBasicMaterial({ map: handTex, transparent: true, side: THREE.DoubleSide, toneMapped: false }),
      );
      handSprite.position.set(0, 0.02, 0);
      handSprite.rotation.set(0, 0, 0.18);
      heldHand.add(handSprite);

      // 2D-but-3D Minecraft style held item in right hand
      const heldItemHolder = new THREE.Group();
      heldItemHolder.name = "heldItemHolder";
      // Positioned right in the grasp of the hand's fingers
      heldItemHolder.position.set(-0.06, 0.10, 0.04);
      // Minecraft 3D isometric item angle in first-person
      heldItemHolder.rotation.set(-0.16, 0.42, -0.22);
      // Made big (0.48) per user request
      heldItemHolder.scale.set(0.48, 0.48, 0.48);

      const itemTexLoader = new THREE.TextureLoader();
      const itemFrontMat = new THREE.MeshBasicMaterial({
        transparent: true,
        side: THREE.DoubleSide,
        alphaTest: 0.05,
        toneMapped: false,
      });
      const itemBackMat = new THREE.MeshBasicMaterial({
        transparent: true,
        side: THREE.DoubleSide,
        alphaTest: 0.05,
        color: 0x999999, // shaded back face for depth
        toneMapped: false,
      });
      const itemEdgeMat = new THREE.MeshBasicMaterial({
        transparent: true,
        side: THREE.DoubleSide,
        alphaTest: 0.05,
        color: 0x444444, // dark extruded voxel edges for 3D thickness
        toneMapped: false,
      });

      const itemGeo = new THREE.PlaneGeometry(1, 1);
      const frontMesh = new THREE.Mesh(itemGeo, itemFrontMat);
      frontMesh.position.set(0, 0, 0.012);

      const backMesh = new THREE.Mesh(itemGeo, itemBackMat);
      backMesh.position.set(0, 0, -0.012);

      const edgeMesh1 = new THREE.Mesh(itemGeo, itemEdgeMat);
      edgeMesh1.position.set(0.005, 0.005, 0);
      const edgeMesh2 = new THREE.Mesh(itemGeo, itemEdgeMat);
      edgeMesh2.position.set(-0.005, -0.005, 0);

      heldItemHolder.add(frontMesh, backMesh, edgeMesh1, edgeMesh2);
      heldItemHolder.visible = false;
      heldHand.add(heldItemHolder);

      // Right hand shifted 10% more to the right per user request (0.32 -> 0.352)
      heldHand.position.set(0.352, -0.28, -0.46);
      heldHand.rotation.set(-0.1, -0.15, -0.05);
      heldHand.visible = false;
      heldRig.add(heldHand);

      camera.add(heldRig);
      scene.add(camera);
      const heldBasePose = {
        hand: { px: 0.352, py: -0.28, pz: -0.46, rx: -0.25, ry: 0.35, rz: -0.12 },
        block: { px: 0.33, py: -0.26, pz: -0.62, rx: -0.25, ry: 0.6, rz: 0.15 },
        item: { px: 0.264, py: -0.38, pz: -0.44, rx: -0.12, ry: 0.2, rz: 0.08 },
      };
      let swing = 0;
      let placePulse = 0;

      // Melee damage of whatever is in hand (bare hand / block = 1).
      let meleeDamage = 1;
      const damageForItem = (id: string) => {
        const p = id.toLowerCase();
        if (p.includes("netherite")) return p.includes("axe") ? 9 : 8;
        if (p.includes("diamond")) return p.includes("axe") ? 8 : p.includes("sword") ? 7 : 4;
        if (p.includes("iron")) return p.includes("sword") ? 6 : 3;
        if (p.includes("gold")) return p.includes("sword") ? 4 : 3;
        if (p.includes("stone")) return p.includes("sword") ? 5 : 3;
        if (p.includes("wood")) return p.includes("sword") ? 4 : 2;
        if (p.includes("sword")) return 5;
        if (p.includes("axe") || p.includes("shovel")) return 3;
        return 1;
      };

      const applyTile = (tex: THREE.Texture, tile: string) => {
        const [u0, v0, u1, v1] = atlas!.uv(tile);
        tex.repeat.set(u1 - u0, v1 - v0);
        tex.offset.set(u0, v0);
        tex.needsUpdate = true;
      };
      const setHeldTile = (id: number | string) => {
        if (!atlas) return;
        heldItemId = id;
        featuresRef.current?.setHeld(id);
        heldSwords.forEach((m) => (m.visible = false));
        heldSword = typeof id === "string" ? (heldSwords.get(id) ?? null) : null;
        if (typeof id === "string") {
          meleeDamage = SWORD_STATS[id]?.damage ?? damageForItem(id);
          held.visible = false;
          if (heldSword) {
            heldSword.visible = true;
            heldHand.visible = false;
            heldItemHolder.visible = false;
          } else {
            // Utility items (slime balls, ender pearls, wind charges, etc.) shown in right hand
            heldHand.visible = true;
            heldItemHolder.visible = true;
            const url = utilityIconUrl(id) || `/items/${id}.png`;
            if (url) {
              itemTexLoader.load(url, (tex) => {
                tex.colorSpace = THREE.SRGBColorSpace;
                tex.magFilter = THREE.NearestFilter;
                tex.minFilter = THREE.NearestFilter;
                tex.generateMipmaps = false;
                itemFrontMat.map = tex;
                itemBackMat.map = tex;
                itemEdgeMat.map = tex;
                itemFrontMat.needsUpdate = true;
                itemBackMat.needsUpdate = true;
                itemEdgeMat.needsUpdate = true;
              });
            }
          }
          heldRig.scale.set(1.22, 1.22, 1.22);
        } else if (id === 0) {
          // Empty / bare hand
          meleeDamage = 1;
          held.visible = false;
          if (heldSword) heldSword.visible = false;
          heldHand.visible = true;
          heldItemHolder.visible = false;
          heldRig.scale.set(1, 1, 1);
        } else {
          meleeDamage = 1;
          held.visible = true;
          if (heldSword) heldSword.visible = false;
          heldHand.visible = false;
          heldItemHolder.visible = false;
          heldRig.scale.set(1, 1, 1);

          const def = BLOCKS.find((b) => b.id === id);
          if (!def) return;
          applyTile(texSide, def.side);
          applyTile(texTop, def.top || def.side);
          applyTile(texBottom, def.bottom || def.side);
          // restore the per-face atlas maps (they may have been cleared by an item)
          const faceMaps = [texSide, texSide, texTop, texBottom, texSide, texSide];
          heldMats.forEach((m, i) => {
            m.map = faceMaps[i];
            m.needsUpdate = true;
          });
        }
      };
      setHeldTile(hotbarRef.current[0] ?? 0);

      // block-breaking crack overlay
      const crackTex = atlas.crack.clone();
      crackTex.needsUpdate = true;
      const crackMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.006, 1.006, 1.006),
        new THREE.MeshBasicMaterial({
          map: crackTex,
          transparent: true,
          depthWrite: false,
          opacity: 0.95,
        }),
      );
      crackMesh.visible = false;
      crackMesh.renderOrder = 3;
      scene.add(crackMesh);

      // third-person QBLOCK character (bigger, Roblox-style presence)
      avatar = new Avatar();
      avatarInstanceRef.current = avatar;
      if (emotingRef.current) avatar.setEmote(true);
      scene.add(avatar.group);
      avatar.setVisible(thirdRef.current);
      avatar.load(2.28).then(() => {
        if (disposed || !avatar) return;
        setAvatarReady(true);
      }).catch((err) => {
        console.warn("Avatar model load notice:", err);
      });
      // ── Multiplayer: real players, shared world, name tags, chat bubbles ──
      remotes = new RemotePlayers(scene);
      selfTag = new NameTag(meRef.current.name, 2.05, meRef.current.badges);
      scene.add(selfTag.group);

      if (bedwars) {
        matchmaker = new Avatar();
        matchmakerTag = new NameTag("Matchmaker", 2.55, [], "#ffd76a");
        const { x, y, z } = BEDWARS_MATCHMAKER_POS;
        matchmakerTag.group.position.set(x, y, z);
        scene.add(matchmaker.group, matchmakerTag.group);
        matchmaker.load(2.28).catch(() => {});
      }

      // ── "Tutorial" NPC: takes knockback, flashes red, heals back ──
      const hitMe = new Avatar();
      hitMe.idleStill = true;
      const hitMeHome = new THREE.Vector3(player.position.x + 2.5, player.position.y, player.position.z + 2);
      hitMe.group.position.copy(hitMeHome);
      hitMe.group.visible = false;
      hitMe.load(2.28).catch(() => {});
      const hitMeVel = new THREE.Vector3();
      const hitMeBar = createHpBar("Tutorial", 20);
      scene.add(hitMeBar.sprite);

      // ── Floating animated indicator arrow upper the Tutorial NPC ──
      const arrowGroup = new THREE.Group();
      const arrowConeGeo = new THREE.ConeGeometry(0.26, 0.52, 8);
      arrowConeGeo.rotateX(Math.PI); // Point down towards NPC
      const arrowMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
      const arrowCone = new THREE.Mesh(arrowConeGeo, arrowMat);
      arrowGroup.add(arrowCone);
      const arrowStemGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.38, 8);
      const arrowStem = new THREE.Mesh(arrowStemGeo, arrowMat);
      arrowStem.position.y = 0.38;
      arrowGroup.add(arrowStem);
      scene.add(arrowGroup);
      let hitMeHp = 20;
      let hitMeRedT = 0;
      let hitMeHealT = 0;
      let hitMeOnGround = false;
      const hitMeTint: { mat: THREE.MeshStandardMaterial; color: THREE.Color; emissive: THREE.Color }[] = [];
      const collectHitMeMats = () => {
        hitMe.group.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (!mesh.isMesh) return;
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((m) => {
            const mat = m as THREE.MeshStandardMaterial;
            if (mat && mat.color && !hitMeTint.some((t) => t.mat === mat)) {
              hitMeTint.push({
                mat,
                color: mat.color.clone(),
                emissive: mat.emissive ? mat.emissive.clone() : new THREE.Color(0, 0, 0),
              });
            }
          });
        });
      };
      const _red = new THREE.Color(0xff1818);
      const updateHitMe = (dt: number) => {
        const p = hitMe.group.position;
        hitMeVel.y -= 26 * dt;
        p.addScaledVector(hitMeVel, dt);
        const fx0 = Math.floor(p.x);
        const fz0 = Math.floor(p.z);
        const below = Math.floor(p.y - 0.02);
        hitMeOnGround = false;
        if (hitMeVel.y <= 0 && world && world.solid(fx0, below, fz0)) {
          p.y = below + 1;
          hitMeVel.y = 0;
          hitMeOnGround = true;
        }
        if (world && world.solid(fx0, Math.floor(p.y + 0.5), fz0)) {
          // Knocked into a wall — stop horizontal motion.
          p.x -= hitMeVel.x * dt;
          p.z -= hitMeVel.z * dt;
          hitMeVel.x = 0;
          hitMeVel.z = 0;
        }
        const friction = Math.exp(-(hitMeOnGround ? 7 : 0.8) * dt);
        hitMeVel.x *= friction;
        hitMeVel.z *= friction;
        if (p.y < hitMeHome.y - 24) {
          p.copy(hitMeHome);
          hitMeVel.set(0, 0, 0);
          hitMeHp = 20;
          hitMeBar.set(20);
        }
        const faceYaw = Math.atan2(player.position.x - p.x, player.position.z - p.z);
        hitMe.update(dt, p, faceYaw, Math.hypot(hitMeVel.x, hitMeVel.z), hitMeOnGround, false, hitMeVel.y);
        hitMeBar.sprite.position.set(p.x, p.y + 2.7, p.z);
        // Float & bounce the indicator arrow above Tutorial NPC
        const arrowBounce = Math.sin(clock.getElapsedTime() * 4.2) * 0.16;
        arrowGroup.position.set(p.x, p.y + 3.45 + arrowBounce, p.z);
        arrowGroup.rotation.y += dt * 2.5;

        if (hitMeRedT > 0) {
          collectHitMeMats();
          hitMeRedT = Math.max(0, hitMeRedT - dt);
          const k = Math.min(1, hitMeRedT / 0.25);
          for (const t of hitMeTint) {
            t.mat.color.copy(t.color).lerp(_red, 0.85 * k);
            if (t.mat.emissive) t.mat.emissive.copy(t.emissive).lerp(_red, 0.85 * k);
          }
          if (hitMeRedT === 0) {
            for (const t of hitMeTint) {
              t.mat.color.copy(t.color);
              if (t.mat.emissive) t.mat.emissive.copy(t.emissive);
            }
          }
        }
        hitMeHealT -= dt;
        if (hitMeHealT <= 0 && hitMeHp < 20) {
          hitMeHp = Math.min(20, hitMeHp + 1);
          hitMeBar.set(hitMeHp);
          hitMeHealT = 0.35;
        }
      };

      // ── Sword FX: world-space slash arc + pooled hit sparks ──
      const slashMat = new THREE.MeshBasicMaterial({
        color: 0xef4444, // Red tinted slash, no white glare
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const slash = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.78, 32, 1, -0.2, Math.PI * 0.9), slashMat);
      slash.visible = false;
      slash.renderOrder = 5;
      scene.add(slash);
      let slashT = 0;
      const SPARKS = 48;
      const sparkPos = new Float32Array(SPARKS * 3);
      const sparkVel = new Float32Array(SPARKS * 3);
      const sparkLife = new Float32Array(SPARKS);
      const sparkGeo = new THREE.BufferGeometry();
      sparkGeo.setAttribute("position", new THREE.BufferAttribute(sparkPos, 3));
      const sparkMat = new THREE.PointsMaterial({
        color: 0xdc2626, // Vivid red, no white
        size: 0.13,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const sparks = new THREE.Points(sparkGeo, sparkMat);
      sparks.frustumCulled = false;
      sparks.visible = false;
      // Old additive point sparks read as laggy smears on mobile; CombatFx
      // renders crisp voxel chips, a shock ring and damage numbers instead.
      const spawnHitFx = (at: THREE.Vector3, damage: number, crit: boolean) => {
        combatFx.hit(at, camera, damage, crit);
      };
      const updateSwordFx = (dt: number) => {
        for (let k = 0; k < SPARKS; k++) {
          if (sparkLife[k] <= 0) {
            sparkPos[k * 3 + 1] = -9999;
            continue;
          }
          sparkLife[k] -= dt;
          sparkVel[k * 3 + 1] -= 14 * dt;
          sparkPos[k * 3] += sparkVel[k * 3] * dt;
          sparkPos[k * 3 + 1] += sparkVel[k * 3 + 1] * dt;
          sparkPos[k * 3 + 2] += sparkVel[k * 3 + 2] * dt;
        }
        sparkGeo.attributes.position.needsUpdate = true;
        if (slashT > 0) {
          slashT = Math.max(0, slashT - dt);
          const k = slashT / 0.22;
          slashMat.opacity = Math.sin(k * Math.PI) * 0.85;
          slash.rotateZ(-dt * 9);
          slash.visible = slashT > 0;
        }
      };

      // ── Floating HP bars (20/20) above every hittable entity ─────────────
      const names = new Map<string, string>();
      const hpBars = new Map<
        string,
        { hp: number; bar: ReturnType<typeof createHpBar>; respawnIn: number }
      >();
      const hpFor = (uid: string) => {
        let s = hpBars.get(uid);
        if (!s) {
          const bar = createHpBar(names.get(uid) || "Player", 20);
          scene.add(bar.sprite);
          s = { hp: 20, bar, respawnIn: 0 };
          hpBars.set(uid, s);
        }
        return s;
      };
      if (blockFall) {
        try {
          unsubPresence = subscribeToBlockFallPlayers(
            meRef.current.uid,
            (list) => {
              for (const p of list) names.set(p.uid, p.name || "Player");
              remotes?.sync(list);
            },
            (error) => {
              setMultiplayerError(multiplayerErrorMessage(error, "players"));
              console.error("BlockFall presence listener failed:", error);
            },
            () => {
              setMultiplayerError("");
            },
          );
        } catch (e) {
          console.warn("BlockFall presence subscribe error:", e);
        }

        try {
          unsubWorld = subscribeBlockFallBlocks(
            ({ x, y, z, id }) => world?.set(x, y, z, id),
            (error) => {
              setMultiplayerError(multiplayerErrorMessage(error, "world"));
              console.error("BlockFall world listener failed:", error);
            },
            () => setMultiplayerError(""),
          );
        } catch (e) {
          console.warn("BlockFall world subscribe error:", e);
        }
      } else {
        try {
          unsubPresence = subscribeToSandboxPlayers(
            meRef.current.uid,
            (list) => {
              for (const p of list) names.set(p.uid, p.name || "Player");
              remotes?.sync(list);
            },
            (error) => {
              setMultiplayerError(multiplayerErrorMessage(error, "players"));
              console.error("Sandbox presence listener failed:", error);
            },
            () => {
              setMultiplayerError("");
            },
          );
        } catch (e) {
          console.warn("Sandbox presence subscribe error:", e);
        }

        try {
          unsubWorld = subscribeSandboxBlocks(
            ({ x, y, z, id }) => world?.set(x, y, z, id),
            (error) => {
              setMultiplayerError(multiplayerErrorMessage(error, "world"));
              console.error("Sandbox world listener failed:", error);
            },
            () => setMultiplayerError(""),
          );
        } catch (e) {
          console.warn("Sandbox world subscribe error:", e);
        }
      }

      // Instant local echo: your own bubble pops the moment you hit send,
      // without waiting for the Firestore round-trip.
      const onSelfSay = (e: Event) => {
        const text = (e as CustomEvent<string>).detail;
        if (text) selfTag?.say(text);
      };
      window.addEventListener("qb-self-say", onSelfSay);
      selfSayCleanup = () => window.removeEventListener("qb-self-say", onSelfSay);

      // Chat -> floating bubbles above the sender's head.
      const joinedAt = Date.now();
      try {
        unsubChat = onSnapshot(
          query(collection(db, "sandboxChat"), orderBy("at"), limitToLast(20)),
          (snap) => {
            snap.docChanges().forEach((ch) => {
              if (ch.type !== "added") return;
              const d = ch.doc.data() as {
                uid?: string;
                text?: string;
                at?: { toMillis?: () => number };
              };
              const at = d.at?.toMillis?.() ?? Date.now();
              if (at < joinedAt - 2000 || !d.text) return;
              if (d.uid && d.uid === meRef.current.uid) selfTag?.say(d.text);
              else if (d.uid) remotes?.say(d.uid, d.text);
            });
          },
          (err) => {
            setMultiplayerError("Sandbox chat is unavailable.");
            console.error("Sandbox chat listener failed:", err);
          },
        );
      } catch (err) {
        console.warn("Sandbox chat subscribe error:", err);
      }

      heldRig.visible = !thirdRef.current;

      controls = new Controls(renderer.domElement);
      controlsRef.current = controls;
      if (skyblock) {
        BmgoAudio.startSkyblockBgm();
      }
      controls.onLockChange = (isLocked) => {
        setLocked(isLocked);
        if (isLocked) {
          BmgoAudio.unlock();
          if (skyblock) BmgoAudio.startSkyblockBgm();
          if (blockFall) BmgoAudio.startBlockFallBgm();
        }
      };
      controls.onSlot = (i) => {
        const bar = hotbarRef.current;
        if (i < bar.length) {
          slotRef.current = i;
          setSlot(i);
          setHeldTile(bar[i]);
        }
      };

      // ── aiming / mining state ────────────────────────────────────────────
      let aim: { x: number; y: number } | null = null; // touch aim in NDC
      let mining = false;
      let mineKey: string | null = null;
      let mineT = 0;
      let placeCd = 0;
      const actionTimes: number[] = [];
      const consumeBedwarsAction = () => {
        if (!goldenDays) return true;
        const now = performance.now();
        while (actionTimes.length && now - actionTimes[0] >= 5000) actionTimes.shift();
        if (actionTimes.length >= 25) return false;
        actionTimes.push(now);
        return true;
      };

      const _cachedAimDir = new THREE.Vector3();
      const _cachedOrigin = new THREE.Vector3();
      const _forwardVec = new THREE.Vector3(0, 0, -1);
      const aimDir = () => {
        if (aim) {
          return _cachedAimDir.set(aim.x, aim.y, 0.5).unproject(camera).sub(camera.position).normalize();
        }
        return _cachedAimDir.copy(_forwardVec).applyQuaternion(camera.quaternion);
      };

      const castHit = () => {
        if (!world) return null;
        _cachedOrigin.set(player.position.x, player.eyeY, player.position.z);
        return raycastVoxel(world, _cachedOrigin, aimDir(), 7);
      };

      // ── Gameplay features: items, TNT, fall damage, shield, bridge assist ──
      const setBlockSynced = (x: number, y: number, z: number, id: number) => {
        if (!world) return;
        const previous = world.get(x, y, z);
        world.set(x, y, z, id);
        if (renderer) renderer.shadowMap.needsUpdate = true;
        const rollback = (error: unknown) => {
          world?.set(x, y, z, previous);
          setMultiplayerError("That block could not be synchronized. Your change was reverted.");
          console.error("Could not sync block change:", error);
        };
        if (blockFall) void writeBlockFallBlock({ x, y, z, id }).catch(rollback);
        else void writeSandboxBlock({ x, y, z, id }).catch(rollback);
      };
      const featureOrigin = new THREE.Vector3();
      const features = new Features({
        world: world!,
        player,
        scene,
        setBlock: setBlockSynced,
        breakFx: (x, y, z, id) => {
          const side = BLOCKS.find((b) => b.id === id)?.side ?? "stone";
          fx?.spawn("break", new THREE.Vector3(x, y, z), side);
        },
        aim: () => ({
          origin: featureOrigin.set(player.position.x, player.eyeY, player.position.z),
          dir: aimDir(),
        }),
        announce: (title, detail) => announce(title, detail),
        openChest: () => setChestOpen(true),
        sound: (name) => playSound(name as Parameters<typeof playSound>[0]),
        onHp: (hp) => setPlayerHp(hp),
        onDeath: () => {
          if (player.isDying) return;
          player.isDying = true;
          player.velocity.set(0, 0.4, 0);
          player.onDie?.();
        },
        onParry: () => {
          const away = hitMe.group.position.clone().sub(player.position);
          if (away.length() > 6) return;
          away.y = 0;
          away.normalize().multiplyScalar(7);
          hitMeVel.set(away.x, 5, away.z);
          hitMeRedT = 0.4;
        },
        onOffhand: (item) => setOffhand(item),
      });
      features.survival = !blockFall;
      features.bridgeAssist = true;
      features.setHeld(heldItemId);
      featuresRef.current = features;

      // ── Melee: swing at whoever is in front of you ────────────────────────
      // Returns true when a hit landed, so a swing never falls through to
      // placing a block.
      let attackCd = 0;
      let chargeMul = 0;
      const currentStats = () =>
        (typeof heldItemId === "string" && SWORD_STATS[heldItemId]) || SWORD_STATS.fist;
      const tryMelee = () => {
        const stats = currentStats();
        const eye = new THREE.Vector3(player.position.x, player.eyeY, player.position.z);
        const dir = aimDir();
        const hitDir = new THREE.Vector3(dir.x, 0, dir.z).normalize();
        const crit = !player.onGround && player.velocity.y < 0;
        const baseDamage = crit ? Math.round(stats.damage * 1.5) : stats.damage;
        const landDamage = () =>
          Math.round(baseDamage * features.comboHit(stats.cooldown).mul * (1 + chargeMul * 0.6));
        const sprinting = Math.hypot(player.velocity.x, player.velocity.z) > 5;

        const npcCenter = hitMe.group.position.clone().add(new THREE.Vector3(0, 1.1, 0));
        const npcDist = features.rayHitsPlayer(eye, dir, hitMe.group.position, stats.reach + 0.4);
        /*
        if (npcDist >= 0) {
          setInspectUser({
            name: "Tutorial",
            isNpc: true,
            photo: "https://maxwell.z3ki.dev/bot/_files/goggle-character/goggle_character.png",
          });
          const damage = landDamage();
          const kb = features.knockback(hitDir, stats.knockback, sprinting, chargeMul);
          hitMeVel.set(kb.x, kb.y, kb.z);
          hitMeRedT = 0.5;
          hitMeHp = Math.max(0, hitMeHp - damage);
          hitMeBar.set(hitMeHp);
          hitMeHealT = 1.5; // Regenerates after brief delay
          spawnHitFx(npcCenter, damage, crit);
          playSound("hurt");
          playSound("sword_hit");
          return true;
        }
        */


        if (!remotes) return false;
        let best: { uid: string; center: THREE.Vector3; d: number } | null = null;
        for (const [uid, e] of remotes.list()) {
          const center = e.current.clone().add(new THREE.Vector3(0, 0.95, 0));
          const d = features.rayHitsPlayer(eye, dir, e.current, stats.reach);
          if (d < 0) continue;
          if (!best || d < best.d) best = { uid, center, d };
        }
        if (!best) return false;
        const targetPlayerName = names.get(best.uid) || "Player";
        setInspectUser({
          name: targetPlayerName,
          uid: best.uid,
          isNpc: false,
        });
        const damage = landDamage();
        const s = hpFor(best.uid);
        if (s.respawnIn <= 0) {
          s.hp = Math.max(0, s.hp - damage);
          s.bar.set(s.hp);
          if (s.hp <= 0) s.respawnIn = 3;
        }
        spawnHitFx(best.center, damage, crit);
        playSound("hurt");
        playSound("sword_hit");
        return true;
      };

      /** One sword/fist swing: animation, slash arc, whoosh and hit test. */
      const attack = () => {
        if (attackCd > 0) return false;
        const stats = currentStats();
        attackCd = stats.cooldown;
        swing = 1;
        const dir = aimDir();
        slash.position.set(player.position.x, player.eyeY - 0.15, player.position.z).addScaledVector(dir, 1.25);
        slash.quaternion.copy(camera.quaternion);
        slash.rotateZ(Math.random() * 0.8 - 0.4 + Math.PI * 0.35);
        slashMat.color.setHex(stats.slash);
        slashT = typeof heldItemId === "string" ? 0.22 : 0;
        slash.visible = slashT > 0;
        const landed = tryMelee();
        if (!landed) playSound(typeof heldItemId === "string" ? "air_whoosh" : "air_dig");
        return landed;
      };

      const doPlace = (overrideId?: number | string) => {
        if (!world || !fx) return;
        if (!consumeBedwarsAction()) return;

        if (skyblock && chestHandleRef.current) {
          // Chest removed
        }

        const id = overrideId ?? hotbarRef.current[slotRef.current];
        if (id === undefined) return;
        // Any swing tries to hit an entity first — with a weapon in hand you
        // never place blocks.
        if (typeof id === "string") {
          if ((UTILITY_ITEMS as readonly string[]).includes(id)) {
            swing = 1;
            features.useItem(id, castHit());
            return;
          }
          attack();
          return;
        }
        if (tryMelee()) {
          swing = 1;
          return;
        }

        const snap = id !== 0 ? features.bridgeSnapTarget() : null;
        const hit = snap ? null : castHit();
        if (!snap && !hit) {
          // Clicked air / empty void ("vuoto")
          swing = 1;
          playSound("air_dig");
          return;
        }
        if (hit && features.interact(hit, player.isCrouching)) {
          swing = 1;
          return;
        }
        const px = snap ? snap.x : hit!.x + hit!.nx;
        const py = snap ? snap.y : hit!.y + hit!.ny;
        const pz = snap ? snap.z : hit!.z + hit!.nz;

        const dx = Math.abs(px + 0.5 - player.position.x);
        const dz = Math.abs(pz + 0.5 - player.position.z);
        const overlapY = py + 1 > player.position.y && py < player.position.y + 1.8;
        if (dx < 0.85 && dz < 0.85 && overlapY) return;

        if (world.get(px, py, pz) !== 0) return;

        swing = 1;
        world.set(px, py, pz, id);
        if (blockFall) {
          void writeBlockFallBlock({ x: px, y: py, z: pz, id }).catch((error) => {
            world?.set(px, py, pz, 0);
            setMultiplayerError("That block could not be synchronized. Your change was reverted.");
            console.error("Could not sync placed block:", error);
          });
        } else {
          void writeSandboxBlock({ x: px, y: py, z: pz, id }).catch((error) => {
            world?.set(px, py, pz, 0);
            setMultiplayerError("That block could not be synchronized. Your change was reverted.");
            console.error("Could not sync placed block:", error);
          });
        }
        playSound("place");
        if (renderer) renderer.shadowMap.needsUpdate = true;
        fx.spawn("place", new THREE.Vector3(px, py, pz), BLOCKS.find((b) => b.id === id)!.side);
        placePulse = 1;
        if (skyblock) progression.recordPlace(py);
      };

      const iconUrlFor = (id: number | string) => {
        if (typeof id === "string") return utilityIconUrl(id);
        const block = BLOCKS.find((b) => b.id === id);
        return block ? atlas!.url(block.side) : "";
      };

      type Api = {
        place: () => void;
        swapOffhand: () => void;
        useOffhand: () => void;
        setMining: (v: boolean) => void;
        setAim: (n: { x: number; y: number } | null) => void;
        setThird: (v: boolean) => void;
        setHeldTile: (id: number | string) => void;
        getAtlasUrl: (id: number | string) => string;
        plant: (species: Species) => boolean;
      };
      (mount as HTMLDivElement & { __api?: Api }).__api = {
        place: () => doPlace(),
        swapOffhand: () => {
          const index = slotRef.current;
          const current = hotbarRef.current[index] ?? 0;
          const incoming = features.offhand ?? 0;
          features.offhand = current === 0 ? null : current;
          setOffhand(features.offhand);
          setHotbar((prev) => {
            const next = [...prev];
            while (next.length <= index) next.push(0);
            next[index] = incoming;
            return next;
          });
          setTileUrls((prev) => {
            const next = { ...prev };
            for (const item of [current, incoming]) if (item !== 0) next[item] = iconUrlFor(item);
            return next;
          });
          setHeldTile(incoming);
          announce("Off-hand", features.offhand === null ? "Empty" : "Item swapped");
        },
        useOffhand: () => {
          const item = features.offhand;
          if (item === null) {
            announce("Off-hand empty", "Swap an item into your off-hand");
            return;
          }
          doPlace(item);
        },
        plant: (species) => {
          const hit = castHit();
          if (!hit || hit.ny !== 1) {
            announce("Aim at grass or dirt", "Look at the top of a block to plant");
            return false;
          }
          const ok = nature.plant(hit.x, hit.y + 1, hit.z, species);
          if (ok) swing = 1;
          else if (nature.seeds[species] > 0) announce("Can't plant here", "Seeds need grass or dirt with open space above");
          return ok;
        },
        setMining: (v) => {
          mining = v;
          if (!v) {
            if (mineKey) features.rememberMining(mineKey, mineT);
            mineKey = null;
            mineT = 0;
          }
        },
        setAim: (n) => {
          aim = n;
        },
        setThird: (v) => {
          avatar?.setVisible(v);
          heldRig.visible = !v;
        },
        setHeldTile,
        getAtlasUrl: (id) => iconUrlFor(id),
      };

      // ResizeObserver catches orientation changes after layout settles.
      // A plain window "resize" can fire with the old portrait size, leaving
      // a portrait-resolution canvas stretched across a landscape screen —
      // the root cause of the blurry/pixelated horizon in landscape.
      const onResize = () => {
        if (!renderer) return;
        const w = Math.max(1, mount.clientWidth || window.innerWidth);
        const h = Math.max(1, mount.clientHeight || window.innerHeight);
        camera.aspect = w / h;
        baseFov = fovForAspect(camera.aspect, 90, userFov);
        camera.fov = baseFov;
        camera.updateProjectionMatrix();
        const dpr = getTargetDpr(readQualityPref());
        renderer.setPixelRatio(dpr);
        renderer.setSize(w, h, false);
        cinematicPost?.setSize(w, h, dpr);
        renderer.domElement.style.width = "100%";
        renderer.domElement.style.height = "100%";
        renderer.domElement.style.imageRendering = "auto";
      };
      const resizeObserver = new ResizeObserver(onResize);
      resizeObserver.observe(mount);
      const onOrientation = () => {
        setTimeout(onResize, 40);
        setTimeout(onResize, 160);
        setTimeout(onResize, 320);
      };
      window.addEventListener("orientationchange", onOrientation);
      window.addEventListener("resize", onResize);
      screen.orientation?.addEventListener?.("change", onOrientation);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      renderer.domElement.style.imageRendering = "auto";

      const onFovEvt = (e: Event) => {
        const val = (e as CustomEvent<number>).detail;
        if (typeof val === "number" && val >= 50 && val <= 100) {
          userFov = val;
          baseFov = fovForAspect(camera.aspect, 90, userFov);
          camera.fov = baseFov;
          camera.updateProjectionMatrix();
        }
      };
      window.addEventListener("bm-fov", onFovEvt);

      const onAtmosphereEvt = (e: Event) => {
        const mode = (e as CustomEvent<string>).detail;
        if (mode === "golden") sky.setGoldenHour();
        else if (mode === "night") sky.setNight();
        else sky.setNormalDay();
      };
      window.addEventListener("bm-atmosphere", onAtmosphereEvt);

      const onFogModeEvt = (e: Event) => {
        const mode = (e as CustomEvent<string>).detail;
        if (mode) applyFogMode(mode);
      };
      window.addEventListener("bm-fog-mode", onFogModeEvt);

      const onRespawn = () => {
        player.respawn();
        avatar?.resetDeath();
        rig.snap(new THREE.Vector3(player.position.x, player.eyeY + 0.54, player.position.z));
        setVeilToken((v) => v + 1);
      };
      window.addEventListener("qb-menu-respawn", onRespawn);

      // ── Block Fall round flow ────────────────────────────────────────────
      const crumblingBlocks = new Map<string, { x: number; y: number; z: number; timer: number; blockId: number }>();
      if (blockFall) {
        restartBlockFallRef.current = () => {
          if (!world) return;
          rebuildBlockFallPlatforms(world);
          world.meshAll();
          crumblingBlocks.clear();
          player.setSpawnPoint(0.5, 37.8, 0.5);
          player.respawn();
          avatar?.resetDeath();
          rig.snap(new THREE.Vector3(player.position.x, player.eyeY + 0.54, player.position.z));
          setVeilToken((v) => v + 1);
        };
        match.onPhaseChange = (phase, state) => {
          if (phase === "lobby") restartBlockFallRef.current?.();
          else if (phase === "countdown") playSound("pop");
          else if (phase === "playing") {
            BmgoAudio.unlock();
            BmgoAudio.startBlockFallBgm();
            BmgoAudio.playGameStart();
          } else if (phase === "roundEnd" && state.lastRound?.survived) {
            BmgoAudio.playGameStart();
          }
        };
      }

      // Ambient particles — white motes removed per user request
      const particles = new AmbientParticles(qualityPref === "low" ? 80 : 160);
      particles.setMode("off");
      scene.add(particles.points);

      // Realistic ambient water sound when near Skyblock pond
      let stopWaterAudio: (() => void) | null = null;
      if (skyblock) {
        const pondCenter = new THREE.Vector3(SKYBLOCK_POND_SURFACE.x, SKYBLOCK_POND_SURFACE.y, SKYBLOCK_POND_SURFACE.z);
        stopWaterAudio = BmgoAudio.startWaterAmbient(() => player.position.distanceTo(pondCenter));
      }

      if (skyblock) {
        progression.onUnlockBlock = (blockId) => {
          setHotbar((prev) => (prev.includes(blockId) ? prev : [...prev, blockId]));
          const def = BLOCKS.find((b) => b.id === blockId);
          if (def && atlas) {
            const url = atlas.url(def.side);
            setTileUrls((prev) => ({ ...prev, [blockId]: url }));
          }
        };
        worldEvents.onStart = (ev) => {
          progression.xpMultiplier = ev.xpMultiplier;
          sky?.setCloudCover(ev.cloudCover);
          if (ev.tint) sky?.setTint(ev.tint, ev.tintAmount ?? 0.4);
          particles.setMode("off");
          announce(ev.name, ev.description, "event");
          playSound("pop");
        };
        worldEvents.onEnd = (ev) => {
          progression.xpMultiplier = 1;
          sky?.setCloudCover(0.5);
          sky?.setTint("#ffffff", 0);
          particles.setMode("motes");
          progression.recordEvent(ev.completionXp);
          announce(`${ev.name} ended`, `+${ev.completionXp} XP for taking part`, "reward");
        };
      }
      const rig = new ThirdPersonRig();
      const facing = new MovementFacing();
      facing.heading = controls.state.yaw + Math.PI;
      let lastNotice = 0;
      let sprintFov = 0;

      setReady(true);
      setVeilToken((v) => v + 1);
      announce(
        skyblock ? "Welcome to Skyblock" : blockFall ? "Welcome to Block Fall" : bedwars ? "Welcome to Bedwars" : "Welcome to QBlock",
        skyblock ? "Build your island, reach new levels" : blockFall ? "Last one standing wins the round" : undefined,
      );

      const clock = new THREE.Clock();
      let acc = 0;
      let statusAcc = 0;
      let presenceAcc = 0;
      let shadowAcc = 0;
      let frames = 0;
      let footstepT = 0.12;
      let smoothDt = 1 / 60;
      const euler = new THREE.Euler(0, 0, 0, "YXZ");
      // Pre-allocated scratch vectors to eliminate garbage collection stutters on mobile
      const _eye = new THREE.Vector3();
      const _pivot = new THREE.Vector3();
      const _avatarPos = new THREE.Vector3();
      const _upOffset = new THREE.Vector3(0, 0.22, 0);

      const loop = () => {
        raf = requestAnimationFrame(loop);
        const raw = clock.getDelta();

        // Render every browser frame. The previous fixed 60 Hz accumulator
        // intentionally skipped frames on high-refresh displays and made
        // camera motion feel uneven.
        // Mobile browsers deliver jittery rAF timestamps (e.g. 12ms, 21ms,
        // 15ms at a steady 60Hz). Feeding that noise into movement makes the
        // camera micro-stutter, so we blend toward the raw delta; real frame
        // drops (>1.6x the average) pass through immediately.
        // High-precision display refresh rate delta (butter-smooth 60/120fps motion)
        const dt = Math.min(Math.max(raw, 0.001), 0.05);

        const input = controls!.read();
        const tNow = matchNow();

        if (blockFall) {
          let alive = 0;
          let total = 1;
          if (remotes) {
            for (const [, e] of remotes.list()) {
              total++;
              if (e.current.y > 5.2) alive++;
            }
          }
          match.tick(tNow, { total, alive: alive + (match.state.eliminated ? 0 : 1) });
          player.frozen = !match.canMove;
        } else if (skyblock) {
          worldEvents.tick(tNow);
          const notice = progression.state.notice;
          if (notice && notice.id !== lastNotice) {
            lastNotice = notice.id;
            announce(notice.title, notice.detail, "reward");
            playSound("pop");
          }
        }

        const wasOnGround = player.onGround;
        features.beforePlayerUpdate();
        player.update(dt, input);
        features.afterPlayerUpdate(dt);
        features.update(dt);
        if (player.landedImpact > 9) playSound("place");
        const horizontalSpeed = Math.hypot(player.velocity.x, player.velocity.z);
        if (goldenDays && horizontalSpeed > 0.15) {
          const drainRate = input.sprint ? 0.0038 : 0.0022;
          hungerRef.current = Math.max(0, hungerRef.current - horizontalSpeed * dt * drainRate);
        }
        if (goldenDays) {
          runesTimeRef.current = Math.max(0, runesTimeRef.current - dt);
          runesMixers.forEach((mixer) => mixer.update(dt));
          if (heldSwordMixer) heldSwordMixer.update(dt);
        }
        if (player.onGround && horizontalSpeed > 0.65) {
          footstepT -= dt;
          if (footstepT <= 0) {
            const footX = Math.floor(player.position.x);
            const footY = Math.max(0, Math.floor(player.position.y - 0.06));
            const footZ = Math.floor(player.position.z);
            const surfaceId = world!.get(footX, footY, footZ);
            const surface = BLOCKS.find((block) => block.id === surfaceId)?.name ?? "Stone";
            const distToPond = Math.hypot(player.position.x - SKYBLOCK_POND_SURFACE.x, player.position.z - SKYBLOCK_POND_SURFACE.z);
            if (skyblock && distToPond < SKYBLOCK_POND.radius + 0.8 && Math.abs(player.position.y - SKYBLOCK_POND_SURFACE.y) < 1.1) {
              BmgoAudio.playWaterSplash(0.32);
            } else {
              playFootstep(surface);
            }
            footstepT = input.sprint ? 0.31 : 0.43;
          }
        } else {
          footstepT = Math.min(footstepT, 0.08);
        }
        if (wasOnGround && !player.onGround && player.velocity.y > 0) {
          const distToPond = Math.hypot(player.position.x - SKYBLOCK_POND_SURFACE.x, player.position.z - SKYBLOCK_POND_SURFACE.z);
          if (skyblock && distToPond < SKYBLOCK_POND.radius + 0.8) {
            BmgoAudio.playWaterSplash(0.52);
          } else {
            playSound("jump");
          }
        }

        euler.set(input.pitch, input.yaw, 0);
        camera.quaternion.setFromEuler(euler);
        const bobY = Math.sin(player.bob * 2) * 0.045;
        const bobX = Math.cos(player.bob) * 0.03;
        _eye.set(player.position.x + bobX * 0.3, player.eyeY + bobY, player.position.z);
        camera.position.copy(_eye);

        // Third-person: smoothed orbit rig with collision.
        if (thirdRef.current) {
          _pivot.set(player.position.x, player.eyeY, player.position.z).add(_upOffset);
          rig.update(dt, camera, _pivot, world!);
        }

        // Subtle sprint FOV kick for speed feel with deadband to avoid matrix recalculation
        const sprinting = input.sprint && horizontalSpeed > 4.5 && !player.frozen;
        sprintFov += ((sprinting ? 3.5 : 0) - sprintFov) * (1 - Math.exp(-8 * dt));
        const targetFov = baseFov + sprintFov;
        if (Math.abs(camera.fov - targetFov) > 0.12) {
          camera.fov = targetFov;
          camera.updateProjectionMatrix();
        }

        // Character faces the direction it is actually moving, never the camera.
        const heading = facing.update(player.velocity.x, player.velocity.z, input.yaw + Math.PI);
        if (avatar?.loaded) {
          _avatarPos.set(player.position.x, player.position.y, player.position.z);
          const isSneaking = controls?.touch?.crouch || movementModeRef.current === "crouch";
          avatar.update(
            dt,
            _avatarPos,
            heading,
            horizontalSpeed,
            player.onGround,
            isSneaking,
            player.velocity.y,
          );
        }

        // Chest removed per user request
        if (nearChestRef.current) {
          nearChestRef.current = false;
          setNearChest(false);
        }

        // ── Block Fall Mechanics ───────────────────────────────────────────
        if (blockFall && world) {
          if (match.canMove) {
            // 1. Detect player foot on platform blocks
            const footY = Math.floor(player.position.y - 0.08);
            if (footY === 36 || footY === 29 || footY === 22 || footY === 15 || footY === 8) {
              const offsets = [
                [0, 0],
                [-0.24, 0],
                [0.24, 0],
                [0, -0.24],
                [0, 0.24],
              ];
              for (const [dx, dz] of offsets) {
                const bx = Math.floor(player.position.x + dx);
                const bz = Math.floor(player.position.z + dz);
                const bId = world.get(bx, footY, bz);
                if (bId !== 0 && bId !== 10) { // not air, not glass
                  const key = `${bx},${footY},${bz}`;
                  if (!crumblingBlocks.has(key)) {
                    crumblingBlocks.set(key, { x: bx, y: footY, z: bz, timer: 0.55, blockId: bId });
                    playSound("pop");
                  }
                }
              }
            }

            // 2. Update crumbling blocks
            for (const [key, b] of crumblingBlocks.entries()) {
              b.timer -= dt;
              if (b.timer <= 0) {
                crumblingBlocks.delete(key);
                world.set(b.x, b.y, b.z, 0);
                const blockDef = BLOCKS.find((bl) => bl.id === b.blockId);
                fx?.spawn("break", new THREE.Vector3(b.x, b.y, b.z), blockDef?.side || "dirt");
                playSound("pop");
              }
            }

            // 3. Update level & floor calculation
            const py = player.position.y;
            let lvl = 1;
            if (py >= 32) lvl = 1;
            else if (py >= 25) lvl = 2;
            else if (py >= 18) lvl = 3;
            else if (py >= 11) lvl = 4;
            else if (py >= 6) lvl = 5;
            else lvl = 0;

            if (lvl > 0) match.setFloor(lvl);

            // Eliminated: fell past the last floor. Placement is decided by
            // how many other players are still standing.
            if (py < 5.2) {
              BmgoAudio.playDefeat();
              const othersAlive = Math.max(0, match.state.playersAlive - 1);
              match.eliminate(tNow, othersAlive);
              if (avatar?.loaded) {
                avatar.triggerDeath(() => {
                  player.respawn();
                  avatar.resetDeath();
                });
              } else {
                player.respawn();
              }
            }
          }
        }

        // ── Multiplayer tick ───────────────────────────────────────────────
        if (selfTag) {
          selfTag.group.position.set(player.position.x, player.position.y, player.position.z);
          // In first person the name plate is hidden, but your own chat panel
          // still pops above you so you can see what you just sent.
          selfTag.group.visible = thirdRef.current || selfTag.hasBubble;
          selfTag.setNameVisible(thirdRef.current);
          selfTag.update(camera.position);
        }
        runesTags.forEach((tag) => tag.update(camera.position));
        runesTimers.forEach((timer) => timer.update(camera.position, runesTimeRef.current));
        workbenchTags.forEach((tag) => tag.update(camera.position));
        if (remotes) {
          remotes.update(dt, camera.position);
          // Keep every HP bar pinned above its entity; dead ones heal back.
          for (const [uid, e] of remotes.list()) {
            const s = hpFor(uid);
            s.bar.sprite.position.set(e.current.x, e.current.y + 2.45, e.current.z);
            if (s.respawnIn > 0) {
              s.respawnIn -= dt;
              if (s.respawnIn <= 0) {
                s.hp = 20;
                s.bar.set(20);
              }
            }
          }
        }
        // Throttled presence update to eliminate mobile network/render stutter
        presenceAcc += dt;
        if (presenceAcc >= 0.25) {
          presenceAcc = 0;
          if (!blockFall && meRef.current.uid && !meRef.current.uid.startsWith("guest")) {
            void updateSandboxPresence({
              uid: meRef.current.uid,
              name: meRef.current.name,
              x: player.position.x,
              y: player.position.y,
              z: player.position.z,
              rotY: heading,
              photo: meRef.current.photo,
              frame: meRef.current.frame,
              badges: meRef.current.badges,
            }).catch(() => {
              // Silently ignore transient network drops for presence
            });
          } else if (blockFall && meRef.current.uid && !meRef.current.uid.startsWith("guest")) {
            void updateBlockFallPresence({
              uid: meRef.current.uid,
              name: meRef.current.name,
              x: player.position.x,
              y: player.position.y,
              z: player.position.z,
              rotY: heading,
              photo: meRef.current.photo,
              frame: meRef.current.frame,
              badges: meRef.current.badges,
            }).catch(() => {
              // Silently ignore transient network drops for presence
            });
          }
        }

        // Periodic light/shadow update (every 1.5s rather than every single frame)
        shadowAcc += dt;
        if (shadowAcc >= 1.5) {
          shadowAcc = 0;
          if (renderer) renderer.shadowMap.needsUpdate = true;
        }

        // held block placement + swing
        swing = Math.max(0, swing - dt * (heldSword?.visible ? 5 : 4));
        attackCd = Math.max(0, attackCd - dt);
        updateHitMe(dt);
        updateSwordFx(dt);
        const sw = Math.sin(swing * Math.PI);
        const bp = heldSword?.visible
          ? heldBasePose.item
          : heldHand.visible
            ? heldBasePose.hand
            : heldBasePose.block;

        if (heldHand.visible) {
          // Punching hit animation for bare block hand per user request
          heldRig.position.set(
            bp.px - sw * 0.12,
            bp.py + sw * 0.08 + bobY * 0.5,
            bp.pz - sw * 0.22,
          );
          heldRig.rotation.set(bp.rx - sw * 0.85, bp.ry - sw * 0.35, bp.rz + sw * 0.45);
        } else if (heldSword?.visible) {
          // Diagonal slash: wind up high-right, cut down across to the left.
          const arc = swing > 0 ? 1 - swing : 0;
          const cut = Math.sin(arc * Math.PI);
          heldRig.position.set(bp.px - cut * 0.22, bp.py + (swing > 0.7 ? sw * 0.08 : -cut * 0.12) + bobY * 0.5, bp.pz - cut * 0.12);
          heldRig.rotation.set(bp.rx - cut * 1.15, bp.ry + cut * 0.55, bp.rz + cut * 0.9);
        } else {
          heldRig.position.set(bp.px - sw * 0.05, bp.py - sw * 0.1 + bobY * 0.5, bp.pz + sw * 0.08);
          heldRig.rotation.set(bp.rx - sw * 0.7, bp.ry, bp.rz + sw * 0.4);
        }

        // sky (owns fog + lighting)
        sky!.follow(camera.position);
        particles.update(dt, camera.position);
        sky!.update(dt);
        skyEnv?.update(dt, camera, sky!, scene);
        cosmicSky?.update(dt, camera);

        // ── SkyBlock: Animate Soaring Phoenix, Voxel Torch & Undulating Aurora Borealis ──
        if (skyblock) {
          const tNow = clock.getElapsedTime();
          if (phoenixMixerRef.current) phoenixMixerRef.current.update(dt);
          if (phoenixModelRef.current && celestialSunRef.current) {
            // Farther soaring flight orbit per user request
            const orbitRadius = 65.0;
            const orbitSpeed = 0.24;
            const angle = tNow * orbitSpeed;
            const px = celestialSunRef.current.position.x + Math.cos(angle) * orbitRadius;
            const pz = celestialSunRef.current.position.z + Math.sin(angle) * (orbitRadius * 0.75);
            const py = celestialSunRef.current.position.y + 12.0 + Math.sin(angle * 2.0) * 10.0;
            phoenixModelRef.current.position.set(px, py, pz);

            const nextAngle = angle + 0.05;
            const nextX = celestialSunRef.current.position.x + Math.cos(nextAngle) * orbitRadius;
            const nextZ =
              celestialSunRef.current.position.z + Math.sin(nextAngle) * (orbitRadius * 0.75);
            const nextY =
              celestialSunRef.current.position.y + 12.0 + Math.sin(nextAngle * 2.0) * 10.0;
            phoenixModelRef.current.lookAt(nextX, nextY, nextZ);
            phoenixModelRef.current.rotateZ(-0.25);
          }

          if (voxelTorchRef.current) {
            voxelTorchRef.current.update(tNow);
          }
          voxelPropsRef.current.forEach((p) => p.update?.(tNow));

          // Natural organic wind sway on stylized trees (gentle upright breeze sway)
          gltfTreesRef.current.forEach((t) => {
            const swayZ = Math.sin(tNow * 1.25 + t.seed) * 0.012;
            const swayX = Math.cos(tNow * 0.95 + t.seed * 1.3) * 0.010;
            t.group.rotation.z = t.baseRotZ + swayZ;
            t.group.rotation.x = t.baseRotX + swayX;
            t.foliage.forEach((f, idx) => {
              f.rotation.y = (f.userData.baseRotY ?? 0) + Math.sin(tNow * 2.0 + idx * 0.4 + t.seed) * 0.015;
            });
          });
        }

        // target highlight
        const hit = castHit();
        let isAimingChest = false;

        if (isAimingChest) {
          highlight.visible = true;
          highlight.position.set(3.0, 16.5, 3.0);
        } else if (hit) {
          highlight.visible = true;
          highlight.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
          placePulse = Math.max(0, placePulse - dt * 6);
          highlight.scale.setScalar(1 + placePulse * 0.1);
        } else {
          highlight.visible = false;
        }

        // ── hold-to-mine or chest interaction ──────────────
        const wantMine = mining || controls!.holding.break;
        if (!wantMine && features.chargeT > 0) {
          chargeMul = features.releaseCharge();
          attack();
          chargeMul = 0;
          if (mineBarRef.current) mineBarRef.current.style.width = "0%";
        }
        if (wantMine && typeof heldItemId === "string") {
          // Swords wind up while held and strike on release; other items swing on hold.
          if (SWORD_STATS[heldItemId]) {
            const charge = features.charging(dt);
            if (mineBarRef.current) mineBarRef.current.style.width = `${charge * 100}%`;
          } else {
            attack();
          }
          mineKey = null;
          mineT = 0;
          crackMesh.visible = false;
        } else if (isAimingChest && (wantMine || controls!.holding.place)) {
          setChestOpen(true);
          controls!.holding.break = false;
          controls!.holding.place = false;
          mineKey = null;
          mineT = 0;
          crackMesh.visible = false;
          if (mineBarRef.current) mineBarRef.current.style.width = "0%";
        } else {
          const def = hit ? BLOCKS.find((b) => b.id === hit.id) : undefined;
          const hardness = def?.hardness ?? 1;
          if (wantMine && !hit) {
            // Mining empty air/void ("vuoto"): snappy punch animation and air dig sound
            if (swing < 0.25) {
              swing = 1;
              playSound("air_dig");
            }
          } else if (wantMine && hit && hardness >= 0) {
            const key = `${hit.x},${hit.y},${hit.z}`;
            if (key !== mineKey) {
              if (mineKey) features.rememberMining(mineKey, mineT);
              mineKey = key;
              mineT = features.recallMining(key);
            }

            const oldP = Math.min(1, mineT / Math.max(0.25, hardness * 0.6));
            mineT += dt;
            const newP = Math.min(1, mineT / Math.max(0.25, hardness * 0.6));
            if (Math.floor(newP * 4) > Math.floor(oldP * 4)) {
              playSound("mine_tick", def?.name || "stone");
            }

            if (swing < 0.35) swing = 1;
            const need = Math.max(0.25, hardness * 0.6);
            const p = Math.min(1, mineT / need);
            crackMesh.visible = p > 0.04;
            crackMesh.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
            // Better breaking animation: subtle shake and scale increase
            const shake = Math.sin(mineT * 50) * 0.02 * p;
            crackMesh.position.x += shake;
            crackMesh.position.z += Math.cos(mineT * 45) * 0.02 * p;
            crackMesh.scale.setScalar(1 + p * 0.05);
            crackTex.offset.x =
              Math.min(CRACK_STAGES - 1, Math.floor(p * CRACK_STAGES)) / CRACK_STAGES;
            if (mineBarRef.current) mineBarRef.current.style.width = `${p * 100}%`;
            if (p >= 1) {
              const oldId = world!.get(hit.x, hit.y, hit.z);
              playSound("break");
              fx!.spawn("break", new THREE.Vector3(hit.x, hit.y, hit.z), def!.side);
              world!.set(hit.x, hit.y, hit.z, 0);
              features.forgetMining();
              if (skyblock) progression.recordMine();
              if (skyblock) nature.rollDrop(oldId);
              if (!blockFall) nature.onLogMined(hit.x, hit.y, hit.z, oldId, player.position);
              if (renderer) renderer.shadowMap.needsUpdate = true;
              if (blockFall) {
                void writeBlockFallBlock({ x: hit.x, y: hit.y, z: hit.z, id: 0 }).catch((error) => {
                  world?.set(hit.x, hit.y, hit.z, oldId);
                  setMultiplayerError(
                    "That block could not be synchronized. Your change was reverted.",
                  );
                  console.error("Could not sync mined block:", error);
                });
              } else {
                void writeSandboxBlock({ x: hit.x, y: hit.y, z: hit.z, id: 0 }).catch((error) => {
                  world?.set(hit.x, hit.y, hit.z, oldId);
                  setMultiplayerError(
                    "That block could not be synchronized. Your change was reverted.",
                  );
                  console.error("Could not sync mined block:", error);
                });
              }
              mineKey = null;
              mineT = 0;
              crackMesh.visible = false;
              if (mineBarRef.current) mineBarRef.current.style.width = "0%";
            }
          } else {
            if (mineKey) features.rememberMining(mineKey, mineT);
            mineKey = null;
            mineT = 0;
            crackMesh.visible = false;
            if (mineBarRef.current) mineBarRef.current.style.width = "0%";
          }
        }

        chestHandleRef.current?.update(dt);

        // ── place with a cooldown so held input doesn't spam ──────────────
        placeCd = Math.max(0, placeCd - dt);
        if (controls!.holding.place && placeCd === 0) {
          doPlace();
          placeCd = 0.2;
        }

        fx!.update(dt);
        world!.update(blockFall ? 6 : 3);
        WIND.uTime.value += dt;
        grassField?.update(dt);
        if (matchmaker && matchmakerTag) {
          const toPlayer = Math.atan2(player.position.x - matchmakerPos.x, player.position.z - matchmakerPos.z);
          matchmaker.update(dt, matchmakerPos, toPlayer, 0, true, false);
          matchmakerTag.update(camera.position);
        }
        combatFx.update(dt);
        nature.update(dt, clock.elapsedTime);
        const shaking = combatFx.beginShake(camera);
        if (cinematicPost) cinematicPost.render(dt);
        else renderer!.render(scene, camera);
        if (shaking) combatFx.endShake(camera);

        frames++;
        acc += dt;
        statusAcc += dt;
        if (statusAcc >= 0.5) {
          setPlayerHunger(Math.round(hungerRef.current * 10) / 10);
          setRunesTimeLeft(Math.ceil(runesTimeRef.current));
          statusAcc = 0;
        }
        if (acc >= 0.5) {
          frames = 0;
          acc = 0;
        }
      };
      loop();

      (mount as HTMLDivElement & { __cleanup?: () => void }).__cleanup = () => {
        cancelAnimationFrame(raf);
        resizeObserver.disconnect();
        window.removeEventListener("orientationchange", onResize);
        window.removeEventListener("resize", onResize);
        screen.orientation?.removeEventListener?.("change", onResize);
        window.removeEventListener("qb-menu-respawn", onRespawn);
        window.removeEventListener("bm-fov", onFovEvt);
        window.removeEventListener("bm-atmosphere", onAtmosphereEvt);
        window.removeEventListener("bm-fog-mode", onFogModeEvt);
        if (stopWaterAudio) stopWaterAudio();
        features.dispose();
        featuresRef.current = null;
        particles.dispose();
        skyEnv?.dispose();
        cosmicSky?.dispose();
        cosmicSkyRef.current = null;
        grassField?.dispose();
        matchmaker?.dispose();
        matchmakerTag?.dispose();
        cinematicPost?.dispose();
        window.removeEventListener(GRAPHICS_V2_EVENT, onGraphicsV2);
        combatFx.dispose();
        nature.dispose();
        match.onPhaseChange = undefined;
        worldEvents.onStart = undefined;
        worldEvents.onEnd = undefined;
        progression.onUnlockBlock = undefined;
      };
      } catch (err) {
        console.error("Sandbox engine initialization error:", err);
        setGraphicsError("Failed to initialize game world. Please try refreshing.");
      }
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      (mount as HTMLDivElement & { __cleanup?: () => void }).__cleanup?.();
      controls?.dispose();
      unsubPresence?.();
      unsubWorld?.();
      unsubChat?.();
      remotes?.dispose();
      selfSayCleanup?.();
      selfTag?.dispose();
      if (meRef.current.uid) {
        if (blockFall) {
          void clearBlockFallPresence(meRef.current.uid).catch((error) => {
            console.error("Could not clear BlockFall presence:", error);
          });
        } else {
          void clearSandboxPresence(meRef.current.uid).catch((error) => {
            console.error("Could not clear sandbox presence:", error);
          });
        }
      }
      avatar?.dispose();
      avatarInstanceRef.current = null;
      sky?.dispose();
      fx?.dispose();
      ownBedIndicator?.material.map?.dispose();
      ownBedIndicator?.material.dispose();
      bedDecorations?.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      });
      bedDecorations?.clear();
      workbenchTags.forEach((tag) => tag.dispose());
      runesTags.forEach((tag) => tag.dispose());
      runesTimers.forEach((timer) => timer.dispose());
      voxelPropsRef.current.forEach((p) => p.dispose());
      voxelPropsRef.current = [];
      gltfTreesRef.current.forEach((t) => {
        t.group.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            const m = obj as THREE.Mesh;
            m.geometry?.dispose();
            if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
            else m.material?.dispose();
          }
        });
        t.group.removeFromParent();
      });
      gltfTreesRef.current = [];
      runesMixers.forEach((mixer) => mixer.stopAllAction());
      [...runesModels, heldSword].forEach((model) =>
        model?.traverse((object) => {
          const mesh = object as THREE.Mesh;
          if (!mesh.isMesh) return;
          mesh.geometry.dispose();
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materials.forEach((material) => material.dispose());
        }),
      );
      if (chestHandleRef.current) {
        chestHandleRef.current.group.traverse((object) => {
          const mesh = object as THREE.Mesh;
          if (!mesh.isMesh) return;
          mesh.geometry.dispose();
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materials.forEach((material) => material.dispose());
        });
        chestHandleRef.current = null;
      }
      workbenchModels.forEach((model) =>
        model.traverse((object) => {
          const mesh = object as THREE.Mesh;
          if (!mesh.isMesh) return;
          mesh.geometry.dispose();
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materials.forEach((material) => material.dispose());
        }),
      );
      world?.dispose();
      BmgoAudio.stopBgm();
      if (renderer) {
        renderer.dispose();
        renderer.domElement.remove();
      }
    };
  }, [qbUser?.uid, goldenDays, skyblock, blockFall]);

  const api = useCallback(() => {
    const mount = mountRef.current as
      | (HTMLDivElement & {
          __api?: {
            place: () => void;
            swapOffhand: () => void;
            useOffhand: () => void;
            setMining: (v: boolean) => void;
            setAim: (n: { x: number; y: number } | null) => void;
            setThird: (v: boolean) => void;
            setHeldTile: (id: number | string) => void;
            getAtlasUrl: (id: number | string) => string;
            plant: (species: Species) => boolean;
          };
        })
      | null;
    return mount?.__api;
  }, []);

  const selectSlot = (i: number) => {
    slotRef.current = i;
    setSlot(i);
    controlsRef.current?.onSlot?.(i);
  };

  const toggleBridgeAssist = useCallback(() => {
    const features = featuresRef.current;
    if (!features) return;
    features.bridgeAssist = !features.bridgeAssist;
    setBridgeAssist(features.bridgeAssist);
    announce("Bridge assist", features.bridgeAssist ? "On: look down and place to snap" : "Off");
  }, []);

  const applyQuickBuy = (items: (number | string)[], name: string) => {
    const bar = items.slice(0, 9);
    setHotbar(bar);
    setTileUrls((prev) => {
      const next = { ...prev };
      for (const id of bar) next[id] = api()?.getAtlasUrl(id) ?? "";
      return next;
    });
    slotRef.current = 0;
    setSlot(0);
    api()?.setHeldTile(bar[0] ?? 0);
    announce(`${name} kit`, "Equipped to your hotbar");
    playSound("pop");
  };

  const toggleThird = useCallback(() => {
    setThirdPerson((v) => {
      const next = !v;
      thirdRef.current = next;
      api()?.setThird(next);
      return next;
    });
  }, [api]);

  // F5 / V toggles camera view; E toggles inventory/chest; Escape closes modals
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "F5" || e.code === "KeyV") {
        e.preventDefault();
        toggleThird();
      } else if (e.code === "KeyE") {
        e.preventDefault();
        setChestOpen((open) => {
          if (open) return false;
          if (nearChestRef.current) return true;
          setInventoryOpen((inv) => !inv);
          return false;
        });
      } else if (e.code === "Escape") {
        setChestOpen(false);
        setInventoryOpen(false);
        setWheelOpen(false);
        setQuickBuyOpen(false);
      } else if (!e.repeat && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        if (e.code === "KeyB") toggleBridgeAssist();
        else if (e.code === "KeyF") api()?.swapOffhand();
        else if (e.code === "KeyR") api()?.useOffhand();
        else if (e.code === "KeyG") {
          controlsRef.current?.exitLock();
          setWheelOpen((open) => !open);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleThird, toggleBridgeAssist, api]);

  // settings → engine wiring (shared event names with the Skyblock game)
  useEffect(() => {
    const onSens = (e: Event) => {
      const v = Number((e as CustomEvent).detail);
      if (controlsRef.current && Number.isFinite(v))
        controlsRef.current.sensitivity = 0.0022 * (v / 50);
    };
    const onHud = (e: Event) => setShowHud(Boolean((e as CustomEvent).detail));
    window.addEventListener("bm-sensitivity", onSens);
    window.addEventListener("bm-hud", onHud);
    return () => {
      window.removeEventListener("bm-sensitivity", onSens);
      window.removeEventListener("bm-hud", onHud);
    };
  }, []);

  // touch: tap to place, hold to mine, drag to look
  const holdTimer = useRef<number | null>(null);
  const tapInfo = useRef<{
    t: number;
    moved: boolean;
    ndc: { x: number; y: number };
    ox: number;
    oy: number;
  } | null>(null);
  const clearHold = () => {
    if (holdTimer.current !== null) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    api()?.setMining(false);
    api()?.setAim(null);
  };

  // A tap only counts as "place" if the finger stayed within this many pixels
  // of where it landed — otherwise a look-drag would drop blocks at random.
  const TAP_SLOP = 8;
  const TAP_MS = 200;

  const onTouchStart = (e: React.PointerEvent) => {
    if (!isTouch) return;
    if (e.clientX < window.innerWidth * 0.4) return;
    touchLook.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    const ndc = {
      x: (e.clientX / window.innerWidth) * 2 - 1,
      y: -(e.clientY / window.innerHeight) * 2 + 1,
    };
    tapInfo.current = { t: performance.now(), moved: false, ndc, ox: e.clientX, oy: e.clientY };
    api()?.setAim(ndc);
    holdTimer.current = window.setTimeout(() => api()?.setMining(true), 260);
  };
  const onTouchMove = (e: React.PointerEvent) => {
    const t = touchLook.current;
    if (!t || t.id !== e.pointerId) return;
    const dx = e.clientX - t.x;
    const dy = e.clientY - t.y;
    const tap = tapInfo.current;
    if (tap) {
      // distance from the ORIGINAL touch point, not the last frame
      const drift = Math.hypot(e.clientX - tap.ox, e.clientY - tap.oy);
      if (drift > TAP_SLOP && !tap.moved) {
        tap.moved = true;
        clearHold(); // it's a look drag, not a mine or a place
      }
    }
    controlsRef.current?.look(dx, dy);
    t.x = e.clientX;
    t.y = e.clientY;
  };
  const onTouchEnd = (e: React.PointerEvent) => {
    if (touchLook.current?.id === e.pointerId) touchLook.current = null;
    const tap = tapInfo.current;
    tapInfo.current = null;
    // quick, stationary tap = place a block
    const still = tap ? Math.hypot(e.clientX - tap.ox, e.clientY - tap.oy) <= TAP_SLOP : false;
    if (tap && !tap.moved && still && performance.now() - tap.t < TAP_MS) {
      if (holdTimer.current !== null) {
        window.clearTimeout(holdTimer.current);
        holdTimer.current = null;
      }
      api()?.setAim(tap.ndc);
      api()?.place();
    }
    clearHold();
  };

  // joystick
  const joyPointer = useRef<number | null>(null);
  const onJoyDown = (e: React.PointerEvent) => {
    joyPointer.current = e.pointerId;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    moveJoy(e);
  };
  const moveJoy = (e: React.PointerEvent) => {
    const el = joyRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    let dx = (e.clientX - cx) / (r.width / 2);
    let dy = (e.clientY - cy) / (r.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > 1) {
      dx /= len;
      dy /= len;
    }
    setJoyNub({ x: dx, y: dy });
    const c = controlsRef.current;
    if (c) {
      c.touch.x = dx;
      c.touch.y = -dy;
      c.touch.sprint = len > 0.85;
    }
  };
  const onJoyMove = (e: React.PointerEvent) => {
    if (joyPointer.current !== e.pointerId) return;
    moveJoy(e);
  };
  const onJoyUp = () => {
    joyPointer.current = null;
    setJoyNub({ x: 0, y: 0 });
    const c = controlsRef.current;
    if (c) {
      c.touch.x = 0;
      c.touch.y = 0;
      c.touch.sprint = false;
    }
  };

  const isV2 = skyblock || blockFall || bedwars;
  const matchState = useStore(match.store);
  const progressState = useStore(progression.store);
  const backpack: (number | string)[] = skyblock
    ? [...STARTER_BACKPACK, ...progressState.unlockedBlocks, ...crafted, ...NEW_BACKPACK_ITEMS]
    : bedwars
      ? ["short_sword", "iron_sword", "diamond_sword", ...crafted, ...NEW_BACKPACK_ITEMS]
      : [];

  useEffect(() => {
    if (inventoryOpen) controlsRef.current?.exitLock();
  }, [inventoryOpen]);
  const setMoveVector = (x: number, y: number) => {
    const c = controlsRef.current;
    if (!c) return;
    c.touch.x = x;
    c.touch.y = y;
  };
  const setJump = (down: boolean) => {
    if (controlsRef.current) controlsRef.current.touch.jump = down;
  };
  const toggleMute = () => {
    const next = !bgmMuted;
    setBgmMuted(next);
    BmgoAudio.setMuted(next);
  };
  const [isMiningActive, setIsMiningActive] = useState(false);

  const handleMine = useCallback((down: boolean) => {
    setIsMiningActive(down);
    api()?.setAim(null);
    api()?.setMining(down);
  }, [api]);

  const handleBuild = useCallback(() => {
    api()?.setAim(null);
    api()?.place();
  }, [api]);

  const totalSeeds = seeds.oak + seeds.birch + seeds.spruce;
  const v2Actions: HudAction[] = blockFall
    ? [{ id: "jump", label: "Jump", kind: "hold", primary: true, icon: HUD_UI.jump, onPress: setJump }]
    : [
        { id: "jump", label: "Jump", kind: "hold", primary: true, icon: HUD_UI.jump, onPress: setJump },
        {
          id: "mine",
          label: "Mine",
          kind: "hold",
          onPress: handleMine,
        },
        {
          id: "build",
          label: "Build",
          kind: "tap",
          onPress: handleBuild,
        },
        ...(skyblock && totalSeeds > 0
          ? [
              {
                id: "plant",
                label: "Plant",
                kind: "tap" as const,
                onPress: (down: boolean) => {
                  if (!down) return;
                  api()?.setAim(null);
                  const species = seeds[seedSpecies] > 0 ? seedSpecies : (Object.keys(seeds) as Species[]).find((s) => seeds[s] > 0);
                  if (species) api()?.plant(species);
                },
              },
            ]
          : []),
      ];

  useEffect(() => {
    if (blockFall && matchState.phase === "results") controlsRef.current?.exitLock();
  }, [blockFall, matchState.phase]);

  const showClickToPlay =
    ready &&
    isV2 &&
    !isTouch &&
    !locked &&
    !pauseMenuOpen &&
    !chatOpen &&
    !settingsOpen &&
    !showQuitDialog &&
    !(blockFall && matchState.phase === "results");

  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-[#0d1117]">
      <div
        ref={mountRef}
        className="absolute inset-0 touch-none"
        onPointerDown={onTouchStart}
        onPointerMove={onTouchMove}
        onPointerUp={onTouchEnd}
        onPointerCancel={onTouchEnd}
      />

      {/* ── FLOATING TOP BAR (Filled Icons + Translucent Login / Sign Up) ── */}
      {ready && !skyblock && !blockFall && (
        <header className="fixed top-[max(12px,calc(env(safe-area-inset-top)+8px))] inset-x-3 z-[95] pointer-events-none flex items-center justify-between">
          {/* Top-Left: Sleek Translucent Controls with Filled Icons */}
          <div className="pointer-events-auto flex items-center gap-2">
            <div className="flex items-center gap-1 p-1 rounded-2xl bg-black/45 backdrop-blur-xl border border-white/15 shadow-[0_6px_24px_rgba(0,0,0,0.35)] text-white">
              {/* Exit to Home */}
              <Link
                to="/"
                className="h-9 w-9 rounded-xl flex items-center justify-center text-white/90 hover:text-white hover:bg-white/15 active:scale-95 transition"
                title="Exit to Home"
                aria-label="Home"
              >
                <Home className="w-4 h-4 fill-white text-white" />
              </Link>

              {/* Chat Button */}
              <button
                type="button"
                onClick={() => setChatOpen(true)}
                className="h-9 w-9 rounded-xl flex items-center justify-center text-white/90 hover:text-white hover:bg-white/15 active:scale-95 transition"
                title="Chat"
                aria-label="Chat"
              >
                <MessageSquare className="w-4 h-4 fill-white text-white" />
              </button>

              {/* Audio / Mute */}
              <button
                type="button"
                onClick={() => {
                  const next = !bgmMuted;
                  setBgmMuted(next);
                  BmgoAudio.setMuted(next);
                }}
                className="h-9 w-9 rounded-xl flex items-center justify-center text-white/90 hover:text-white hover:bg-white/15 active:scale-95 transition"
                title={bgmMuted ? "Unmute Sound" : "Mute Sound"}
                aria-label="Toggle Sound"
              >
                {bgmMuted ? (
                  <VolumeX className="w-4 h-4 fill-red-400 text-red-400" />
                ) : (
                  <Volume2 className="w-4 h-4 fill-emerald-400 text-emerald-400" />
                )}
              </button>

            </div>
          </div>

          {/* Top-Right: Translucent Login & Signup Buttons */}
          <div className="pointer-events-auto flex items-center gap-2">
            {!qbUser?.uid ? (
              <>
                <Link
                  to="/login"
                  search={{ screen: "login" } as never}
                  className="h-9 px-3.5 rounded-2xl flex items-center gap-1.5 text-xs font-bold text-white bg-black/45 hover:bg-black/65 active:scale-95 backdrop-blur-xl border border-white/20 shadow-[0_4px_18px_rgba(0,0,0,0.3)] transition cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5 fill-white text-white" />
                  <span>Log In</span>
                </Link>
                <Link
                  to="/login"
                  search={{ screen: "signup" } as never}
                  className="h-9 px-3.5 rounded-2xl flex items-center gap-1.5 text-xs font-extrabold text-white bg-amber-500/35 hover:bg-amber-500/50 active:scale-95 backdrop-blur-xl border border-amber-400/50 shadow-[0_4px_18px_rgba(245,158,11,0.25)] transition cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                  <span>Sign Up</span>
                </Link>
              </>
            ) : (
              <div className="h-9 px-3 rounded-2xl flex items-center gap-2 text-xs font-bold text-white bg-black/45 backdrop-blur-xl border border-white/15 shadow-[0_4px_18px_rgba(0,0,0,0.3)]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="truncate max-w-[100px] text-white/95">{qbUser.displayName || qbUser.username || "Player"}</span>
              </div>
            )}
          </div>
        </header>
      )}

      {/* ── Leave Dialog ── */}
      {showQuitDialog && isV2 && (
        <V2ConfirmDialog
          title="Leave this game?"
          onCancel={() => setShowQuitDialog(false)}
          onConfirm={() => {
            setShowQuitDialog(false);
            window.location.href = "/";
          }}
        />
      )}
      {showQuitDialog && !isV2 && (
        <div
          className="fixed inset-0 z-[600] bg-black/75 flex items-center justify-center p-4 backdrop-blur-[2px]"
          onClick={() => setShowQuitDialog(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[320px] bg-[#242424] text-white rounded-[4px] p-6 shadow-2xl border border-white/10 font-sans select-none"
          >
            <p className="text-[17px] font-normal leading-relaxed text-zinc-100 mb-7">
              Do you wish to quit this game?
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowQuitDialog(false)}
                className="px-4 py-2 text-[14px] font-bold tracking-wider text-white hover:bg-white/10 rounded-[2px] transition uppercase"
              >
                NO
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowQuitDialog(false);
                  window.location.href = "/";
                }}
                className="px-4 py-2 text-[14px] font-bold tracking-wider text-white hover:bg-white/10 rounded-[2px] transition uppercase"
              >
                YES
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── V2 HUD (Skyblock + Block Fall) ── */}
      {ready && isV2 && (
        <V2GameHud
          isTouch={isTouch}
          running={movementMode === "run"}
          thirdPerson={thirdPerson}
          muted={bgmMuted}
          hasHotbar={(skyblock || bedwars) && hotbar.length > 0}
          actions={v2Actions}
          topCenter={
            blockFall ? (
              <BlockFallStatus match={match} />
            ) : bedwars ? (
              <span className="rounded-md bg-black/35 px-3 py-1 text-[13px] font-black tracking-wide text-[#ffd76a] [text-shadow:0_1px_0_rgba(0,0,0,.6)]">
                BEDWARS LOBBY
              </span>
            ) : (
              <SkyblockStatus progression={progression} events={worldEvents} />
            )
          }
          menuExtra={
            skyblock ? [{ label: "Respawn on island", onSelect: () => window.dispatchEvent(new Event("qb-menu-respawn")) }] : []
          }
          onMove={setMoveVector}
          onToggleRun={() => handleMovementModeChange(movementMode === "run" ? "walk" : "run")}
          sneaking={movementMode === "crouch"}
          onToggleSneak={() => handleMovementModeChange(movementMode === "crouch" ? "walk" : "crouch")}
          onOpenChat={() => {
            controlsRef.current?.exitLock();
            setChatOpen(true);
          }}
          onOpenSettings={() => {
            controlsRef.current?.exitLock();
            setSettingsOpen(true);
          }}
          onToggleCamera={toggleThird}
          onToggleMute={toggleMute}
          emoting={emoting}
          onEmote={() => {
            const next = !emotingRef.current;
            emotingRef.current = next;
            setEmoting(next);
            avatarInstanceRef.current?.setEmote(next);
            if (next) {
              if (!thirdRef.current) {
                toggleThird();
              }
              announce("Dance Mode", "Looping dance with sparkling purple aura! Click icon again to stop.");
            } else {
              announce("Dance Stopped", "Normal posture restored.");
            }
          }}
          onLeave={() => {
            controlsRef.current?.exitLock();
            setShowQuitDialog(true);
          }}
          onMenuChange={(open) => {
            setPauseMenuOpen(open);
            if (open) controlsRef.current?.exitLock();
          }}
        >
          {(skyblock || bedwars) && (
            <>
              <CinematicVignette />
              {totalSeeds > 0 && (
                <SeedPouch seeds={seeds} selected={seedSpecies} onSelect={setSeedSpecies} />
              )}
              <V2Hotbar
                hotbar={hotbar}
                tileUrls={tileUrls}
                slot={slot}
                onSelect={selectSlot}
                isTouch={isTouch}
                onOpenInventory={() => setInventoryOpen(true)}
              />
              {/* FeatureDock side buttons hidden per user request; builder helper is already on */}
            </>
          )}
        </V2GameHud>
      )}
      {wheelOpen && (
        <RadialWheel
          items={hotbar}
          selected={slot}
          iconOf={(id) => tileUrls[id] || (api()?.getAtlasUrl(id) ?? "")}
          onPick={selectSlot}
          onClose={() => setWheelOpen(false)}
        />
      )}
      {quickBuyOpen && <QuickBuyPanel onApply={applyQuickBuy} onClose={() => setQuickBuyOpen(false)} />}
      {ready && blockFall && (
        <BlockFallOverlays
          match={match}
          onLeave={() => setShowQuitDialog(true)}
        />
      )}
      {ready && isV2 && veilToken > 0 && <V2Veil token={veilToken} />}
      {showClickToPlay && (
        <V2ClickToPlay
          title={skyblock ? "Skyblock" : bedwars ? "Bedwars" : "Block Fall"}
          hint={
            skyblock
              ? "Build, mine and grow your island"
              : bedwars
                ? "Explore the lobby and meet the Matchmaker"
                : "Stay on the platforms longer than everyone else"
          }
          onPlay={() => controlsRef.current?.requestLock()}
        />
      )}

      {/* ── Bedwars HUD (Main HUD) ── */}
      {ready && !isV2 && (
        <BedwarsHud
          runesTimeLeft={runesTimeLeft}
          hotbar={hotbar}
          tileUrls={tileUrls}
          slot={slot}
          isTouch={isTouch}
          thirdPerson={thirdPerson}
          isSkyblock={skyblock}
          isBlockFall={blockFall}
          nearChest={nearChestRef.current}
          onRequestQuit={() => setShowQuitDialog(true)}
          celestialNight={celestialNight}
          onToggleCelestialNight={() => setCelestialNight((prev) => !prev)}
          onLeave={() => setShowQuitDialog(true)}
          onOpenChest={nearChestRef.current ? () => setChestOpen(true) : undefined}
          joyRef={joyRef}
          joyNub={joyNub}
          onSelectSlot={selectSlot}
          onOpenInventory={skyblock || blockFall ? undefined : () => setInventoryOpen(true)}
          onOpenChat={() => setChatOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
          onToggleCamera={toggleThird}
          movementMode={movementMode}
          onMovementModeChange={handleMovementModeChange}
          onJoyVector={(x, y) => {
            if (controlsRef.current) {
              controlsRef.current.touch.x = x;
              controlsRef.current.touch.y = y;
            }
          }}
          onJump={(down) => {
            if (controlsRef.current) controlsRef.current.touch.jump = down;
          }}
        />
      )}

      {chestOpen && (
        <div className="fixed inset-0 z-[100]">
          <ChestModal
            onClose={() => setChestOpen(false)}
            onTakeItem={(item) => {
              if (item.blockType) {
                setHotbar((prev) => {
                  if (prev.includes(item.blockType!)) return prev;
                  const next = [...prev];
                  const emptyIdx = next.findIndex((x) => x === 0 || x === null || x === undefined);
                  if (emptyIdx !== -1) {
                    next[emptyIdx] = item.blockType!;
                  } else if (next.length < 9) {
                    next.push(item.blockType!);
                  }
                  return next;
                });
              }
            }}
          />
        </div>
      )}
      {ready && multiplayerError && (
        <div
          role="alert"
          className="fixed left-1/2 top-[max(12px,calc(env(safe-area-inset-top)+58px))] z-[82] -translate-x-1/2 overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-lg backdrop-blur-md"
        >
          <div className="flex items-center gap-2.5 px-4 py-2.5 text-slate-800">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" />
            </span>
            <div className="text-left">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Multiplayer & Blocks Sync
              </p>
              <p className="text-[12px] font-bold text-slate-700">{multiplayerError}</p>
            </div>
          </div>
        </div>
      )}

      {inventoryOpen && isV2 && (
        <BlockmanInventory
          hotbar={hotbar}
          tileUrls={tileUrls}
          slot={slot}
          backpack={backpack}
          level={progressState.level}
          playerName={meRef.current.name}
          blockUrl={(id) => api()?.getAtlasUrl(id) ?? ""}
          onSelect={selectSlot}
          onEquip={(item, target) => {
            setHotbar((prev) => {
              const next = [...prev];
              while (next.length <= target) next.push(0);
              next[target] = item;
              return next;
            });
            const url = api()?.getAtlasUrl(item) ?? "";
            if (url) setTileUrls((prev) => ({ ...prev, [item]: url }));
            if (target === slotRef.current) api()?.setHeldTile(item);
          }}
          onCraft={
            skyblock
              ? (item) => {
                  setCrafted((prev) => {
                    if (prev.includes(item)) return prev;
                    const next = [...prev, item];
                    try {
                      localStorage.setItem(CRAFTED_KEY, JSON.stringify(next));
                    } catch {}
                    return next;
                  });
                  playSound("place");
                }
              : undefined
          }
          onClose={() => setInventoryOpen(false)}
        />
      )}

      {inventoryOpen && !isV2 && (
        <div className="fixed inset-0 z-[100]">
          <AdvancedInventoryModal
            onClose={() => setInventoryOpen(false)}
            onEquip={(item, targetSlot = slot) => {
              const newBar = [...hotbar];
              const newValue =
                typeof item.blockType === "string" ? item.blockType : item.blockType!;
              newBar[targetSlot] = newValue;
              setHotbar(newBar);

              const myApi = api();
              if (myApi) {
                myApi.setHeldTile(newValue);
                setTileUrls((prev) => {
                  if (typeof newValue === "string") {
                    return { ...prev, [newValue]: "" };
                  } else {
                    return { ...prev, [newValue]: myApi.getAtlasUrl(newValue) };
                  }
                });
              }
            }}
          />
        </div>
      )}

      {/* New menu (shown before play, and whenever the pointer is unlocked) */}
      {ready && !locked && !isTouch && !isV2 && (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-white/95 backdrop-blur-sm">
          <div className="w-full max-w-[360px] px-6 text-center text-[#16181d]">
            <p className="text-[26px] font-extrabold tracking-tight">
              {goldenDays ? "Grotto Wilds" : skyblock ? "SkyBlock" : "QBlock Sandbox"}
            </p>
            <p className="mt-1 text-[12px] uppercase tracking-[0.18em] text-black/40">
              {goldenDays
                ? "Open grotto arena"
                : skyblock
                  ? "Floating Island Survival"
                  : "Build & explore"}
            </p>
            <div className="mt-7 flex justify-center">
              <button
                type="button"
                onClick={() => controlsRef.current?.requestLock()}
                className="custom-btn btn-white"
              >
                {goldenDays ? "Enter grotto" : skyblock ? "Play SkyBlock" : "Sandbox"}
              </button>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-1 text-left text-[11px] text-black/60">
              <span className="font-semibold text-black/80">WASD</span>
              <span>Move</span>
              <span className="font-semibold text-black/80">Space</span>
              <span>Jump</span>
              <span className="font-semibold text-black/80">Shift</span>
              <span>Sprint</span>
              <span className="font-semibold text-black/80">Left click</span>
              <span>Hold to mine</span>
              <span className="font-semibold text-black/80">Right click</span>
              <span>Place block</span>
              <span className="font-semibold text-black/80">1–9</span>
              <span>Pick block</span>
              <span className="font-semibold text-black/80">V / F5</span>
              <span>1st / 3rd person</span>
            </div>
          </div>
        </div>
      )}

      {/* Loading menu */}
      {!ready && !graphicsError && isV2 && (
        <V2LoadingScreen
          title={skyblock ? "Skyblock" : bedwars ? "Bedwars" : "Block Fall"}
          subtitle={skyblock ? "Loading your island" : bedwars ? "Entering the lobby" : "Preparing the arena"}
          progress={progress}
        />
      )}
      {!ready && !graphicsError && !isV2 && (
        <div className="fixed inset-0 z-[95] grid place-items-center bg-white">
          <div className="flex flex-col items-center">
            <p className="mb-16 text-[24px] font-extrabold tracking-tight text-[#16181d]">
              {goldenDays ? "Grotto Wilds" : skyblock ? "SkyBlock" : "QBlock Sandbox"}
            </p>
            <div className="boxes">
              <div className="box">
                <div />
                <div />
                <div />
                <div />
              </div>
              <div className="box">
                <div />
                <div />
                <div />
                <div />
              </div>
              <div className="box">
                <div />
                <div />
                <div />
                <div />
              </div>
              <div className="box">
                <div />
                <div />
                <div />
                <div />
              </div>
            </div>
            <p className="mt-14 text-[11px] font-semibold uppercase tracking-[0.2em] text-black/35">
              {progress}%
            </p>
          </div>
        </div>
      )}
      {graphicsError && (
        <div className="fixed inset-0 z-[95] grid place-items-center bg-white px-6 text-center">
          <div className="max-w-[360px]">
            <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-[22px] bg-[#eef2f6] text-3xl">
              ◇
            </div>
            <h1 className="text-[22px] font-extrabold tracking-tight text-[#16181d]">
              Sandbox unavailable
            </h1>
            <p className="mt-2 text-[13px] font-medium leading-relaxed text-black/55">
              {graphicsError}
            </p>
            {!qbUser && !authLoading && (
              <Link
                to="/login"
                className="mt-5 inline-flex h-10 items-center justify-center rounded-full bg-[#f4b400] px-5 text-[12px] font-extrabold text-white shadow-[0_5px_0_rgba(180,125,0,.25)]"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      )}
      {chatOpen && <SandboxChat onClose={() => setChatOpen(false)} />}
      {inspectUser && (
        <UserSquareCardModal
          user={inspectUser}
          onClose={() => setInspectUser(null)}
          onVisit={() => {
            setInspectUser(null);
            console.log("Visiting:", inspectUser);
          }}
        />
      )}

      {settingsOpen && (
        <FlatSquareSettingsModal onClose={() => setSettingsOpen(false)} />
      )}
    </div>
  );
}

/** Small isometric cube glyph used for the in-game menu button. */
function CubeGlyph() {
  return (
    <svg viewBox="0 0 64 64" className="h-[22px] w-[22px]" fill="none" aria-hidden="true">
      <path d="M32 6L56 20L32 34L8 20Z" fill="url(#cbTop)" />
      <path d="M8 20L32 34L32 58L8 44Z" fill="url(#cbLeft)" />
      <path d="M56 20L32 34L32 58L56 44Z" fill="url(#cbRight)" />
      <path d="M32 6L56 20L48 25L24 11Z" fill="rgba(255,255,255,0.30)" />
      <defs>
        <linearGradient id="cbTop" x1="32" y1="6" x2="32" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFE840" />
          <stop offset="1" stopColor="#F4C430" />
        </linearGradient>
        <linearGradient id="cbLeft" x1="8" y1="20" x2="32" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#C08000" />
          <stop offset="1" stopColor="#8A5C00" />
        </linearGradient>
        <linearGradient id="cbRight" x1="56" y1="20" x2="32" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#D4A000" />
          <stop offset="1" stopColor="#A07800" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function SandboxErrorFallback({ error, reset }: { error?: unknown; reset?: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0d1117] px-6 text-center text-white">
      <div className="w-full max-w-[420px] rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl shadow-2xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/20 text-2xl text-amber-400">
          🎮
        </div>
        <h2 className="text-xl font-black text-white">Sandbox Encountered an Issue</h2>
        <p className="mt-2 text-sm text-slate-300 leading-relaxed">
          {error instanceof Error ? error.message : "The 3D sandbox encountered a temporary glitch."}
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => {
              if (reset) reset();
              else window.location.reload();
            }}
            className="h-11 w-full rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-sm transition cursor-pointer"
          >
            Reload Sandbox
          </button>
          <Link
            to="/discover"
            className="h-11 w-full flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm transition"
          >
            Back to Games
          </Link>
        </div>
      </div>
    </div>
  );
}

// EOF
