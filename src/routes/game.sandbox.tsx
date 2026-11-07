import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkinnedModel } from "three/examples/jsm/utils/SkeletonUtils.js";
import { buildAtlas, type Atlas } from "@/engine-sandbox/shared/textures";
import { World, BLOCKS, WATER_ID, WIND, SNOW } from "@/engine-sandbox/shared/world";
import { Features, UTILITY_ITEMS, NEW_BACKPACK_ITEMS } from "@/engine-sandbox/shared/features";
import { utilityIconUrl } from "@/engine-sandbox/shared/item-icons";
import { FeatureDock, RadialWheel, QuickBuyPanel } from "@/components/v2/FeatureDock";
import {
  createVoxelLantern,
  createCrystalCluster,
  type VoxelPropHandle,
} from "@/engine-sandbox/shared/voxel-props";
import { GrassField } from "@/engine-sandbox/shared/grass-field";
import { CinematicPost } from "@/engine-sandbox/shared/cinematic-post";
import { CombatFx } from "@/engine-sandbox/shared/combat-fx";
import { Nature, type SeedCounts, type Species } from "@/engine-sandbox/skyblock/nature";
import { SeedPouch } from "@/components/v2/SeedPouch";
import { GRAPHICS_V2_EVENT, isGraphicsV2 } from "@/lib/graphics-v2";
import {
  BEDWARS_LOBBY_BOUNDS,
  BEDWARS_LOBBY_SPAWN,
  BEDWARS_MATCHMAKER_POS,
  buildBedwarsLobby,
} from "@/engine-sandbox/bedwars/bedwars-lobby";
import { loadBedwarsLobby } from "@/engine-sandbox/bedwars/bedwars-lobby-model";
import { Player } from "@/engine-sandbox/shared/player";
import { Controls } from "@/engine-sandbox/shared/controls";
import { BlockFx, createHighlight, raycastVoxel, updateHighlightFace } from "@/engine-sandbox/shared/interact";
import { Sky } from "@/engine-sandbox/shared/sky";
import { Avatar } from "@/engine-sandbox/shared/avatar";
import { CYBERPUNK_DEV_MODEL, isIraHrUser } from "@/engine-sandbox/shared/avatar-model";
import { DroppedItemManager } from "@/engine-sandbox/shared/dropped-items";
import { CRACK_STAGES } from "@/engine-sandbox/shared/textures";
import {
  getToolDefinition,
  getBlockPreferredTool,
  getBlockSoundMaterial,
  getBlockDrop,
  calculateMiningSpeed,
} from "@/engine-sandbox/shared/mining-tools";
import { Link } from "@tanstack/react-router";
import { SandboxChat, ChatPreview } from "@/components/SandboxChat";
import { openFragments } from "@/lib/fragments-ui";
import { FlatSquareSettingsModal } from "@/components/FlatSquareSettingsModal";
import { UserSquareCardModal, type UserSquareCardData } from "@/components/UserSquareCardModal";
import { getTargetDpr } from "@/lib/rendering";
import { GameChatIcon } from "@/components/game-icons";
import { BedwarsHud, type MovementMode } from "@/components/BedwarsHud";
import { GameControls } from "@/components/GameControls";
import { AdvancedInventoryModal } from "@/components/AdvancedInventoryModal";
import { triggerHaptic } from "@/lib/haptics";
import { ChestModal, type ChestItem } from "@/components/ChestModal";
import { Backpack, Loader2, Users, Clock, Volume2, VolumeX, Home, LogIn, UserPlus, MessageSquare, Settings } from "lucide-react";
import { playFootstep, playSound } from "@/lib/sfx";
import { BmgoAudio } from "@/lib/bmgo-audio";
import { RemotePlayers } from "@/engine-sandbox/shared/remote-players";
import { createHpBar } from "@/engine-sandbox/shared/hpbar";
import { NameTag } from "@/engine-sandbox/shared/nametag";
import { RuneTimerTag } from "@/engine-sandbox/shared/rune-timer";
import { SandboxSocket, type MultiplayerRoom } from "@/lib/websocket-sync";
import { useAuth } from "@/lib/auth-context";
import { badgeUrlsFor } from "@/lib/user-style";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  setDoc,
  limitToLast,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { loadSandboxBlocks, writeSandboxBlock } from "@/lib/sandbox-world-sync";
import {
  getOrCreateIsland,
  saveIslandBlockDelta,
  subscribeToIslandPlayers,
  updatePlayerPresence,
  clearPlayerPresence,
  subscribeToIslandBlocks,
} from "@/lib/skyblock-multiplayer";
import { subscribeToSandboxPlayers, updateSandboxPresence } from "@/lib/sandbox-presence";
import { loadBlockFallBlocks, writeBlockFallBlock } from "@/lib/blockfall-world-sync";
import { getShadowMapSize, readQualityPref } from "@/lib/rendering";
import { COMPETITIVE_PHYSICS } from "@/engine-sandbox/shared/player";
import { CameraController, MovementFacing, ThirdPersonRig, fovForAspect } from "@/engine-sandbox/shared/camera-rig";
import { MatchController, now as matchNow } from "@/engine-sandbox/blockfall/match";
import { Progression } from "@/engine-sandbox/skyblock/progression";
import { WorldEvents } from "@/engine-sandbox/skyblock/world-events";
import { AmbientParticles } from "@/engine-sandbox/shared/ambient-particles";
import { SkyblockEnvironment } from "@/engine-sandbox/skyblock/skyblock-environment";
import { CosmicSky } from "@/engine-sandbox/shared/cosmic-sky";
import { BlockmanInventory } from "@/components/v2/BlockmanInventory";
import { SkyblockCutscene } from "@/components/SkyblockIntro";
import { BlockGravity } from "@/engine-sandbox/shared/block-physics";

import { MineTeleportButton, useWeather } from "@/components/SkyblockExtras";
import { buildMiningArea, DRAGON_ARENA, type MiningArea } from "@/engine-sandbox/skyblock/mining-area";
import { RewardChests } from "@/engine-sandbox/skyblock/reward-chests";
import { RedDragon, type DragonHud } from "@/engine-sandbox/skyblock/red-dragon";
import { FireLavaFx } from "@/engine-sandbox/skyblock/fire-lava-fx";
import {
  ChestHint,
  ChestRewardModal,
  DragonBossBar,
  HurtVignette,
  MissionCompleteToast,
  NpcDialogue,
  SkyblockHudColumn,
  TeleportCinematic,
} from "@/components/SkyblockOverlays";
import {
  MISSION_DONE_EVENT,
  bumpMission,
  collectReward,
  grantStaff,
  hasStaff,
  rollReward,
  useMissions,
  type MissionDef,
  type Reward,
} from "@/lib/skyblock-missions";
import { WEATHER_EVENT, WEATHER_ORDER, WEATHER_PRESETS, readWeather, setWeather, type Weather } from "@/lib/weather";

const CUTSCENE_SECONDS = 9;
const MINE_TELEPORT_EVENT = "qb-mine-teleport";
import { announce } from "@/engine-sandbox/shared/announcer";
import { useStore } from "@/engine-sandbox/shared/store";
import { V2GameHud, UI as HUD_UI, type HudAction } from "@/components/v2/V2GameHud";
import { BlockFallOverlays, BlockFallStatus } from "@/components/v2/BlockFallV2";
import { CinematicVignette, Crosshair, MilestoneTracker, SkyblockStatus, V2Hotbar } from "@/components/v2/SkyblockV2";
import { V2ClickToPlay, V2ConfirmDialog, V2LoadingScreen, V2Veil } from "@/components/v2/V2Screens";
import { getPermanentPlayerId, loadSkyblockProfile, saveSkyblockProfile } from "@/lib/skyblock-profile";
import { TntRunStatus, TntRunCountdownOverlay } from "@/components/v2/TntRunHud";
import { TntRunLeaderboardModal } from "@/components/v2/TntRunLeaderboardModal";
import { BlockfortSkyblockUi } from "@/components/skyblock/BlockfortSkyblockUi";



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

  // Compact island footprint expanded 3% (radius ~7.0 blocks)
  for (let x = -8; x <= 8; x++) {
    for (let z = -8; z <= 8; z++) {
      const dMain = Math.hypot(x, z);
      const dExt = Math.hypot(x - 3, z - 3);
      const inIsland = dMain <= 7.0 || dExt <= 5.0 || (x >= -4 && x <= 4 && z >= -4 && z <= 4);
      if (!inIsland) continue;

      // Distance from edge: determines island depth tapering towards the center
      const edgeDist = Math.max(7.0 - dMain, 5.0 - dExt, 0);
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
          // Ore veins: deterministic hash so the island layout is stable for every player
          const h = Math.abs((x * 73856093) ^ (y * 19349663) ^ (z * 83492791)) % 100;
          if (h < 2 && y <= surfaceY - 4) blockId = 48; // Diamond Ore (deep, rare)
          else if (h < 7) blockId = 47; // Iron Ore
          else if (h < 14) blockId = 36; // Coal Ore
        }
        world.set(x, y, z, blockId);
      }
    }
  }

  // ── Majestic Fantasy World Tree ──
  // Anchored at (-4, -3) with organic twisting trunk, sprawling root flares, and cascading canopy
  const tx = -4;
  const tz = -3;

  // 1. Sprawling Root Buttresses flaring into the island grass
  const roots = [
    [-4, 16, -1], [-4, 17, -2],
    [-4, 16, -5], [-4, 17, -4],
    [-2, 16, -3], [-3, 17, -3],
    [-6, 16, -3], [-5, 17, -3],
    [-2, 16, -2], [-5, 16, -5],
    [-6, 16, -4], [-3, 16, -5],
  ];
  for (const [rx, ry, rz] of roots) {
    world.set(rx, ry, rz, 7); // Oak Log roots
  }

  // 2. Thick 2x2 Twisted Trunk (y = 16..21)
  for (let ty = 16; ty <= 19; ty++) {
    world.set(tx, ty, tz, 7);
    world.set(tx - 1, ty, tz, 7);
    world.set(tx, ty, tz - 1, 7);
    world.set(tx - 1, ty, tz - 1, 7);
  }
  // Trunk twisting as it ascends
  world.set(tx, 20, tz, 7);
  world.set(tx, 20, tz - 1, 7);
  world.set(tx + 1, 20, tz, 7);
  world.set(tx, 21, tz, 7);
  world.set(tx + 1, 21, tz, 7);
  world.set(tx, 21, tz + 1, 7);

  // 3. Multi-fork Fantasy Boughs (y = 22..25)
  // East Bough (reaching gracefully toward spawn and pond)
  world.set(-2, 22, -3, 7);
  world.set(-1, 22, -3, 7);
  world.set(0, 23, -3, 7);
  world.set(1, 23, -3, 7);

  // South Bough
  world.set(-4, 22, -1, 7);
  world.set(-4, 22, 0, 7);
  world.set(-3, 23, 1, 7);

  // North Bough
  world.set(-4, 22, -5, 7);
  world.set(-5, 23, -6, 7);
  world.set(-5, 24, -7, 7);

  // High Crown Spire
  world.set(-3, 22, -2, 7);
  world.set(-3, 23, -2, 7);
  world.set(-3, 24, -2, 7);
  world.set(-3, 25, -2, 7);

  // 4. Cascading Layered Fantasy Foliage Canopy
  const canopyNodes: [number, number, number, number][] = [
    [-3, 25, -2, 4.2],  // Top Crown
    [0, 23, -3, 3.4],   // East Bough
    [-3, 23, 1, 3.2],   // South Bough
    [-5, 24, -6, 3.3],  // North Bough
    [-4, 21, -3, 3.6],  // Lower Main Fork
  ];

  for (const [cx, cy, cz, rad] of canopyNodes) {
    const irad = Math.ceil(rad);
    for (let lx = -irad; lx <= irad; lx++) {
      for (let lz = -irad; lz <= irad; lz++) {
        for (let ly = -irad + 1; ly <= irad; ly++) {
          const dist = Math.hypot(lx, ly * 1.25, lz);
          if (dist <= rad) {
            const wx = cx + lx;
            const wy = cy + ly;
            const wz = cz + lz;
            if (world.get(wx, wy, wz) === 0) {
              world.set(wx, wy, wz, 9); // Oak Leaves
            }
          }
        }
      }
    }
  }

  // 5. Embedded Fairy Fruits & Glow inside canopy
  world.set(-4, 24, -3, 18); // Glowstone fruit
  world.set(1, 22, -3, 18);  // Glowstone
  world.set(-5, 24, -5, 18); // Glowstone

  // 6. Weeping Vines / Leaves hanging from under-boughs
  world.set(1, 21, -3, 9);
  world.set(1, 20, -3, 9);
  world.set(-3, 21, 2, 9);
  world.set(-3, 20, 2, 9);
  world.set(-6, 22, -6, 9);
  world.set(-6, 21, -6, 9);
  world.set(-1, 21, -4, 9);

  // 7. Hanging Fantasy Lanterns suspended under the world tree branches
  world.set(-1, 21, -3, 7);  // Branch wooden strut
  world.set(-1, 20, -3, 18); // Hanging warm Glowstone lantern

  // Starter Island Accents
  world.set(0, 16, 0, 4); // Cobblestone
  world.set(0, 16, 1, 14); // Mossy Cobblestone
  world.set(1, 16, 0, 14);
  world.set(-1, 16, 0, 4);
  world.set(0, 16, -1, 14);
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
  world.set(1, 16, 2, 14); // Mossy Cobble rim
  world.set(4, 16, 2, 14);
  world.set(1, 16, 3, 4);
  world.set(4, 16, 3, 4);
  world.set(2, 16, 4, 14);
  world.set(3, 16, 4, 14);

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

  // ── 4 Distant Floating Fantasy Archipelago Islands (Far in the Void) ──
  // Placed 42–46 blocks away across the open sky, framing the majestic horizon!

  const buildFloatingIsland = (
    cx: number,
    cy: number,
    cz: number,
    radius: number,
    depth: number,
  ) => {
    for (let x = -radius; x <= radius; x++) {
      for (let z = -radius; z <= radius; z++) {
        const d = Math.hypot(x, z);
        if (d > radius + 0.3) continue;
        const edge = radius - d;
        const colDepth = Math.max(1, Math.round(1 + edge * (depth / radius)));

        for (let y = cy - colDepth; y <= cy; y++) {
          let id = 2; // Dirt
          if (y === cy) id = 1; // Grass
          else if (y === cy - colDepth) id = 3; // Stone underside tip
          else if (y < cy - 1) id = (x + y + z) % 2 === 0 ? 3 : 4;
          world.set(cx + x, y, cz + z, id);
        }
      }
    }
  };

  // 1. North Sky (~42 blocks away) — The Celestial Amethyst Spire Island
  buildFloatingIsland(0, 20, -42, 3, 6);
  for (let sy = 21; sy <= 25; sy++) {
    world.set(0, sy, -42, 23); // Amethyst
  }
  world.set(0, 26, -42, 18);   // Glowing Starlight Beacon (Glowstone)
  world.set(1, 21, -42, 23);
  world.set(-1, 21, -42, 23);
  world.set(0, 21, -41, 23);
  world.set(0, 21, -43, 23);
  world.set(1, 22, -42, 18);

  // 2. South Sky (~44 blocks away) — The Sacred Weeping Grove Island
  buildFloatingIsland(2, 21, 44, 3, 6);
  world.set(2, 22, 44, 7);
  world.set(2, 23, 44, 7);
  world.set(3, 23, 44, 7);
  world.set(3, 24, 44, 7);
  for (let dx = -2; dx <= 2; dx++) {
    for (let dz = -2; dz <= 2; dz++) {
      if (Math.hypot(dx, dz) <= 2.2) {
        world.set(3 + dx, 25, 44 + dz, 9);
        world.set(3 + dx, 24, 44 + dz, 9);
      }
    }
  }
  world.set(3, 23, 46, 9); // Weeping leaves
  world.set(1, 23, 44, 9);
  world.set(3, 22, 45, 18); // Hanging grove lantern
  world.set(1, 22, 43, 0); // Traveler's chest is now a 3D prop
  world.set(2, 22, 43, 14); // Mossy stone

  // 3. West Sky (~46 blocks away) — The Golden Vein Mineral Island
  buildFloatingIsland(-46, 19, 0, 3, 6);
  world.set(-46, 20, 0, 19);  // Gold Block
  world.set(-45, 20, 0, 19);  // Gold Block
  world.set(-46, 20, 1, 21);  // Emerald Block
  world.set(-47, 20, -1, 48); // Diamond Ore
  world.set(-45, 21, 0, 18);  // Glowstone
  world.set(-46, 20, -1, 14); // Mossy Cobble

  // 4. East Sky (~44 blocks away) — The Starlight Ruins Island
  buildFloatingIsland(44, 22, 6, 3, 6);
  world.set(43, 23, 5, 5);  // Stone Bricks pillar
  world.set(43, 24, 5, 5);
  world.set(43, 25, 5, 18); // Lantern
  world.set(45, 23, 7, 5);  // Stone Bricks pillar
  world.set(45, 24, 7, 5);
  world.set(45, 25, 7, 18); // Lantern
  world.set(44, 23, 6, 22); // Lapis Block altar
  world.set(44, 24, 6, 0); // Ancient chest is now a 3D prop
  world.set(45, 23, 5, 14); // Mossy Cobblestone
}

function buildBaseplateWorld(world: World) {
  const surfaceY = 16;
  const bottomY = 12;
  const radius = 32;

  // Expansive lush green grass baseplate with bedrock foundation & dirt sublayer
  for (let x = -radius; x <= radius; x++) {
    for (let z = -radius; z <= radius; z++) {
      for (let y = bottomY; y <= surfaceY; y++) {
        let blockId = 2; // Dirt
        if (y === surfaceY) {
          blockId = 1; // Grass
        } else if (y === bottomY) {
          blockId = 12; // Bedrock
        } else {
          blockId = 2; // Dirt
        }
        world.set(x, y, z, blockId);
      }
    }
  }

  // Center spawn cobblestone cross
  world.set(0, 16, 0, 4);
  world.set(1, 16, 0, 4);
  world.set(-1, 16, 0, 4);
  world.set(0, 16, 1, 4);
  world.set(0, 16, -1, 4);
}

const SKYBLOCK_DECORATION_ASSETS = [
  {
    urls: [
      "https://file.garden/alGOOylwpAfCa6qP/rusty_submarine_low_poly_and_pixelated.glb",
      "/rusty-submarine.glb",
    ],
    position: new THREE.Vector3(410, 13.5, -44), // Berthed in subterranean fantasy lagoon
    height: 4.8,
    rotationY: 0.42,
  },
  {
    urls: [
      "https://file.garden/alGOOylwpAfCa6qP/skeleton.glb",
      "/skeleton.glb",
    ],
    position: new THREE.Vector3(362, 13.2, -42), // Guiding lantern post in deep fantasy cavern
    height: 2.2,
    rotationY: 0.8,
  },
] as const;

async function loadSkyblockDecorations(scene: THREE.Scene, isDisposed: () => boolean) {
  const loader = new GLTFLoader();
  await Promise.all(
    SKYBLOCK_DECORATION_ASSETS.map(async ({ urls, position, height, rotationY }) => {
      let gltf: any = null;
      for (const url of urls) {
        try {
          gltf = await loader.loadAsync(url);
          if (gltf) break;
        } catch {
          // try next fallback url
        }
      }
      if (!gltf || isDisposed()) return;
      try {
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const scale = height / Math.max(size.y, 0.01);
        model.scale.setScalar(scale);
        const fitted = new THREE.Box3().setFromObject(model);
        model.position.sub(fitted.getCenter(new THREE.Vector3()));
        model.position.y = height / 2;
        model.rotation.y = rotationY;
        model.traverse((object) => {
          const mesh = object as THREE.Mesh;
          if (!mesh.isMesh) return;
          mesh.castShadow = false;
          mesh.receiveShadow = true;
          mesh.frustumCulled = true;
        });
        const group = new THREE.Group();
        group.position.copy(position);
        group.add(model);
        scene.add(group);
      } catch (error) {
        console.warn("[v0] Optional Skyblock decoration instantiation failed:", error);
      }
    }),
  );
}

async function loadCell99Map(scene: THREE.Scene): Promise<THREE.Group | null> {
  const loader = new GLTFLoader();
  const remoteUrl = "https://file.garden/alGOOylwpAfCA6qP/scene.gltf";
  let gltf;
  try {
    gltf = await loader.loadAsync(remoteUrl);
  } catch (e) {
    console.warn("Could not load remote scene.gltf, loading shrine-island fallback map:", e);
    try {
      gltf = await loader.loadAsync("/maps/shrine-island/scene.gltf");
    } catch (err) {
      console.error("Map GLTF load failed:", err);
      return null;
    }
  }

  if (!gltf?.scene) return null;
  const model = gltf.scene;

  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 0.01);
  const scale = 54.0 / maxDim;
  model.scale.setScalar(scale);

  const center = box.getCenter(new THREE.Vector3());
  model.position.sub(center.multiplyScalar(scale));
  model.position.y += 16.2;

  model.traverse((node) => {
    if ((node as THREE.Mesh).isMesh) {
      const mesh = node as THREE.Mesh;
      // Keep the GLTF's authored materials and textures. The voxel atlas uses
      // different UVs; replacing the map here is what caused black/mis-sampled
      // surfaces on Cell 99.
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((material) => {
        material.needsUpdate = true;
      });
    }
  });

  scene.add(model);
  return model;
}

export type VerityCharacterHandle = {
  group: THREE.Group;
  mixer: THREE.AnimationMixer | null;
  update: (dt: number, cameraPosition: THREE.Vector3) => void;
};

async function loadVerityCharacter(scene: THREE.Scene): Promise<VerityCharacterHandle | null> {
  const loader = new GLTFLoader();
  const url = "https://file.garden/alGOOylwpAfCa6qP/verity_full_model.glb";
  try {
    const gltf = await loader.loadAsync(url);
    if (!gltf || !gltf.scene) return null;

    const model = gltf.scene;
    normalizeShowcaseModel(model, 2.2);

    const group = new THREE.Group();
    group.add(model);
    group.position.set(3.5, 16.0, -2.5);
    scene.add(group);

    let mixer: THREE.AnimationMixer | null = null;
    if (gltf.animations && gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(model);
      gltf.animations.forEach((clip) => {
        const action = mixer!.clipAction(clip);
        action.setLoop(THREE.LoopRepeat, Infinity);
        action.play();
      });
    }

    const tag = new NameTag("Verity", 2.4, [], "#38bdf8");
    tag.group.position.set(0, 0, 0);
    group.add(tag.group);

    let targetRotation = 0;
    let rotationTimer = 0;

    return {
      group,
      mixer,
      update: (dt: number, cameraPosition: THREE.Vector3) => {
        if (mixer) mixer.update(dt);

        rotationTimer += dt;
        if (rotationTimer > 3.5 + Math.random() * 2.5) {
          rotationTimer = 0;
          targetRotation = (Math.random() - 0.5) * Math.PI * 2;
        }

        group.rotation.y = THREE.MathUtils.lerp(
          group.rotation.y,
          targetRotation,
          Math.min(1, dt * 2.8),
        );

        tag.update(cameraPosition);
      },
    };
  } catch (err) {
    console.warn("Could not load Verity character model:", err);
    return null;
  }
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

  // 1. Circus Candy Peppermint Void Floor at minY (2)
  for (let x = minX; x <= maxX; x++) {
    for (let z = minZ; z <= maxZ; z++) {
      if (Math.abs(x) === maxX || Math.abs(z) === maxZ) {
        world.set(x, minY, z, 23); // Amethyst glowing perimeter
      } else {
        const pattern = (Math.abs(x) + Math.abs(z)) % 4;
        const candyId = pattern === 0 ? 30 : pattern === 1 ? 29 : pattern === 2 ? 43 : 29; // Red, White, Pink Peppermint
        world.set(x, minY, z, candyId);
      }
    }
  }

  // 2. Sugar Glass bottom floor at Y = 3
  for (let x = minX; x <= maxX; x++) {
    for (let z = minZ; z <= maxZ; z++) {
      world.set(x, 3, z, 10); // Glass
    }
  }

  // Helper for circus candy striped pillars & panoramic sugar glass windows:
  // - Candy cane corner towers
  // - Vertical striped circus candy columns every 6 blocks
  // - Expansive sugar glass observation windows from Y = 6 to 39
  // - Candy arches & circus canopy trim
  const getWallBlock = (x: number, y: number, z: number, isCorner: boolean, isPillar: boolean) => {
    // Corner towers: Candy cane spiral
    if (isCorner) {
      const step = Math.floor((y + (x + z)) / 2) % 3;
      return step === 0 ? 30 : step === 1 ? 29 : 43; // Red, White, Pink candy cane
    }
    // Vertical circus candy pillars
    if (isPillar) {
      if (y === 22 || y === 29 || y === 36) return 18; // Glowstone candy lamp
      const step = y % 3;
      return step === 0 ? 43 : step === 1 ? 29 : 33; // Pink, White, Yellow candy stripe
    }
    // Top circus valance/arch
    if (y >= 40) {
      return (x + z) % 2 === 0 ? 30 : 29; // Red and White circus tent trim
    }
    // Bottom circus wainscot
    if (y <= 5) {
      return y === 4 ? 43 : 33; // Pink and Yellow sweet base
    }
    // Panoramic sugar glass windows to watch the candy cruiser outside!
    return 10;
  };

  // 3. Walls along X and Z with circus pillars and panoramic sugar glass windows
  for (let y = 3; y <= maxY; y++) {
    for (let z = minZ; z <= maxZ; z++) {
      const isCorner = z === minZ || z === maxZ;
      const isPillar = z % 6 === 0;
      world.set(minX, y, z, getWallBlock(minX, y, z, isCorner, isPillar));
      world.set(maxX, y, z, getWallBlock(maxX, y, z, isCorner, isPillar));
    }
    for (let x = minX + 1; x < maxX; x++) {
      const isPillar = x % 6 === 0;
      world.set(x, y, minZ, getWallBlock(x, y, minZ, false, isPillar));
      world.set(x, y, maxZ, getWallBlock(x, y, maxZ, false, isPillar));
    }
  }

  // 4. Circus Tent Big-Top Canopy Ceiling at maxY (42) with hanging candy chandeliers
  for (let x = minX; x <= maxX; x++) {
    for (let z = minZ; z <= maxZ; z++) {
      const distFromCenter = Math.hypot(x, z * 1.8);
      const ring = Math.floor(distFromCenter / 3) % 4;
      if (Math.abs(x) < 3 && Math.abs(z) < 3) {
        // Grand Central Sugar Chandelier
        world.set(x, maxY, z, 23); // Amethyst
        world.set(x, maxY - 1, z, 18); // Glowstone
      } else if (Math.abs(x) % 12 === 0 && Math.abs(z) % 6 === 0) {
        // Secondary candy chandeliers
        world.set(x, maxY, z, 19); // Gold
        world.set(x, maxY - 1, z, 18); // Glowstone
      } else {
        // Striped circus big-top canopy with sugar glass skylights
        if ((x + z) % 7 === 0) {
          world.set(x, maxY, z, 10); // Glass skylight
        } else {
          const tentBlock = ring === 0 ? 30 : ring === 1 ? 29 : ring === 2 ? 43 : 33; // Red, White, Pink, Yellow
          world.set(x, maxY, z, tentBlock);
        }
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
      // Level 1: Cotton Candy & Marshmallow Swirl (Y = 36)
      // Pink wool (43), White wool (29), Snow icing (16), Amethyst sparkle (23)
      const swirl1 = (Math.abs(x) + Math.abs(z)) % 4;
      const l1 = swirl1 === 0 ? 43 : swirl1 === 1 ? 29 : swirl1 === 2 ? 16 : 23;
      world.set(x, 36, z, l1);

      // Level 2: Lemon Drops & Honey Taffy (Y = 29)
      // Yellow wool (33), Gold block (19), White wool (29), Glowstone sparkle (18)
      const swirl2 = (x * 2 + z) % 5;
      const l2 = swirl2 === 0 ? 33 : swirl2 === 1 ? 19 : swirl2 === 2 ? 29 : swirl2 === 3 ? 33 : 18;
      world.set(x, 29, z, l2);

      // Level 3: Blue Raspberry & Mint Frosting (Y = 22)
      // Blue wool (31), Diamond block (20), Pink wool (43), Emerald sour candy (21)
      const swirl3 = (x + z * 2) % 4;
      const l3 = swirl3 === 0 ? 31 : swirl3 === 1 ? 20 : swirl3 === 2 ? 43 : 21;
      world.set(x, 22, z, l3);

      // Level 4: Strawberry Licorice & Circus Ribbon (Y = 15)
      // Red wool (30), Pink wool (43), White wool (29), Redstone candy (37)
      const swirl4 = Math.abs(x % 4);
      const l4 = swirl4 === 0 ? 30 : swirl4 === 1 ? 43 : swirl4 === 2 ? 29 : 37;
      world.set(x, 15, z, l4);

      // Level 5: Grape Gummy & Obsidian Sugar Crystals (Y = 8)
      // Amethyst crystal (23), Gold block (19), Glowstone (18), Obsidian licorice (11), Pink wool (43)
      const swirl5 = (x + z) % 5;
      const l5 = swirl5 === 0 ? 23 : swirl5 === 1 ? 19 : swirl5 === 2 ? 18 : swirl5 === 3 ? 43 : 11;
      world.set(x, 8, z, l5);
    }
  }
}

export const TNT_RUN_HALF = 16;
export const TNT_RUN_LEVELS = [46, 39, 32, 25, 18, 11, 4];

export function buildTntRunArena(world: World) {
  const minX = -TNT_RUN_HALF;
  const maxX = TNT_RUN_HALF;
  const minZ = -TNT_RUN_HALF;
  const maxZ = TNT_RUN_HALF;
  const minY = 2;
  const maxY = 51;

  // 1. Rainbow wool & glowstone perimeter void floor at minY (2)
  for (let x = minX; x <= maxX; x++) {
    for (let z = minZ; z <= maxZ; z++) {
      if (Math.abs(x) === maxX || Math.abs(z) === maxZ) {
        world.set(x, minY, z, 23); // Amethyst glowing perimeter
      } else {
        const pattern = (Math.abs(x) + Math.abs(z)) % 3;
        const woolId = pattern === 0 ? 32 : pattern === 1 ? 43 : 29; // Green, Pink, White wool
        world.set(x, minY, z, woolId);
      }
    }
  }

  // 2. Sugar glass catch floor at Y = 3
  for (let x = minX; x <= maxX; x++) {
    for (let z = minZ; z <= maxZ; z++) {
      world.set(x, 3, z, 10); // Glass
    }
  }

  // 3. Walls along X and Z with striped wool corner pillars and panoramic glass windows
  const getWallBlock = (x: number, y: number, z: number, isCorner: boolean, isPillar: boolean) => {
    if (isCorner) {
      // Corner columns: Green, Pink, White spiral
      const step = Math.floor((y + (x + z)) / 2) % 3;
      return step === 0 ? 32 : step === 1 ? 43 : 29;
    }
    if (isPillar) {
      if (y === 12 || y === 19 || y === 26 || y === 33 || y === 40 || y === 47) return 18; // Glowstone
      const step = Math.floor(y / 2) % 2;
      return step === 0 ? 32 : 29; // Green & White wool
    }
    if (y >= 49) {
      return (x + z) % 2 === 0 ? 43 : 29; // Pink and White trim
    }
    if (y <= 5) {
      return y === 4 ? 32 : 43; // Green & Pink base
    }
    return 10; // Observation glass
  };

  for (let y = 3; y <= maxY; y++) {
    for (let z = minZ; z <= maxZ; z++) {
      const isCorner = z === minZ || z === maxZ;
      const isPillar = z % 5 === 0;
      world.set(minX, y, z, getWallBlock(minX, y, z, isCorner, isPillar));
      world.set(maxX, y, z, getWallBlock(maxX, y, z, isCorner, isPillar));
    }
    for (let x = minX + 1; x < maxX; x++) {
      const isPillar = x % 5 === 0;
      world.set(x, y, minZ, getWallBlock(x, y, minZ, false, isPillar));
      world.set(x, y, maxZ, getWallBlock(x, y, maxZ, false, isPillar));
    }
  }

  // 4. Canopy ceiling at maxY (51) with chandeliers
  for (let x = minX; x <= maxX; x++) {
    for (let z = minZ; z <= maxZ; z++) {
      if (Math.abs(x) < 3 && Math.abs(z) < 3) {
        world.set(x, maxY, z, 19); // Gold
        world.set(x, maxY - 1, z, 18); // Glowstone
      } else if (Math.abs(x) % 8 === 0 && Math.abs(z) % 8 === 0) {
        world.set(x, maxY, z, 23); // Amethyst
        world.set(x, maxY - 1, z, 18); // Glowstone
      } else {
        const stripe = (Math.abs(x) + Math.abs(z)) % 2 === 0 ? 32 : 29; // Green & White wool
        world.set(x, maxY, z, stripe);
      }
    }
  }

  // 5. Build 7 platform levels inside
  rebuildTntRunPlatforms(world);
}

export function rebuildTntRunPlatforms(world: World) {
  const pMin = -(TNT_RUN_HALF - 2);
  const pMax = TNT_RUN_HALF - 2;

  for (let x = pMin; x <= pMax; x++) {
    for (let z = pMin; z <= pMax; z++) {
      // Level 7: Green & White wool stripes (Y = 46)
      const l7 = Math.floor((x + 16) / 2) % 2 === 0 ? 32 : 29; // Green wool (32), White wool (29)
      world.set(x, 46, z, l7);

      // Level 6: Pink & White wool stripes (Y = 39)
      const l6 = Math.floor((z + 16) / 2) % 2 === 0 ? 43 : 29; // Pink wool (43), White wool (29)
      world.set(x, 39, z, l6);

      // Level 5: Red & White wool diagonal stripes (Y = 32)
      const l5 = Math.floor((x + z + 32) / 2) % 2 === 0 ? 30 : 29; // Red wool (30), White wool (29)
      world.set(x, 32, z, l5);

      // Level 4: Blue & White wool stripes (Y = 25)
      const l4 = Math.floor((x + 16) / 2) % 2 === 0 ? 31 : 29; // Blue wool (31), White wool (29)
      world.set(x, 25, z, l4);

      // Level 3: Yellow & Pink wool stripes (Y = 18)
      const l3 = Math.floor((z + 16) / 2) % 2 === 0 ? 33 : 43; // Yellow wool (33), Pink wool (43)
      world.set(x, 18, z, l3);

      // Level 2: Green, Pink & White wool rainbow stripes (Y = 11)
      const rem = Math.floor((x + 16) / 2) % 3;
      const l2 = rem === 0 ? 32 : rem === 1 ? 43 : 29;
      world.set(x, 11, z, l2);

      // Level 1: Red & Yellow wool hazard stripes (Y = 4)
      const l1 = Math.floor((x + z + 32) / 2) % 2 === 0 ? 30 : 33; // Red wool (30), Yellow wool (33)
      world.set(x, 4, z, l1);
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

const STAFF_FIRE_SFX = "https://file.garden/alGOOylwpAfCa6qP/Sounds/fire.mp3";
const WIN_SFX = "/skyblock/win.mp3";
const BOSS_LASER_SFX = "https://file.garden/alGOOylwpAfCa6qP/Sounds/gun_jiguangbu.mp3";

function playAudioUrl(url: string, volume = 0.8) {
  try {
    const a = new Audio(url);
    a.volume = volume;
    void a.play().catch(() => {});
  } catch {}
}

const SWORD_MODELS: Record<string, string> = {
  short_sword: "https://file.garden/alGOOylwpAfCa6qP/wooden_sword.glb",
  gold_sword: "https://file.garden/alGOOylwpAfCa6qP/sword_oro.glb",
  iron_sword: "https://file.garden/alGOOylwpAfCa6qP/sword_ferro.glb",
  diamond_sword: "https://file.garden/alGOOylwpAfCa6qP/sword_diamante.glb",
  dark_magic_staff: "https://file.garden/alGOOylwpAfCa6qP/Qblock2/dark_magic_sickle_staff_-_wow_inspired_weapon..glb",
};

export const SWORD_STATS: Record<string, SwordStats> = {
  fist: { damage: 1, knockback: 3.2, cooldown: 0.20, reach: 3.6, slash: 0xffffff },
  short_sword: { damage: 4, knockback: 4.6, cooldown: 0.25, reach: 4.2, slash: 0xe8d3a8 },
  gold_sword: { damage: 5, knockback: 5.4, cooldown: 0.22, reach: 4.3, slash: 0xffc94a },
  iron_sword: { damage: 6, knockback: 6.2, cooldown: 0.26, reach: 4.5, slash: 0xdfe8f2 },
  diamond_sword: { damage: 7, knockback: 7.2, cooldown: 0.28, reach: 4.7, slash: 0x5ff2ff },
  dark_magic_staff: { damage: 8, knockback: 5.5, cooldown: 0.28, reach: 24, slash: 0xff5500 },
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
    return `You are not authorized to sync ${resource}. Please sign in again and retry.`;
  }
  return `Could not sync ${resource}. Check your connection and retry.`;
}

export function SandboxGame({
  goldenDays = false,
  skyblock = false,
  blockFall = false,
  bedwars = false,
  baseplate = false,
}: {
  goldenDays?: boolean;
  skyblock?: boolean;
  blockFall?: boolean;
  bedwars?: boolean;
  baseplate?: boolean;
} = {}) {
  const isSkyblockLike = skyblock || baseplate;
  const mountRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<Controls | null>(null);
  const slotRef = useRef(0);
  const [slot, setSlot] = useState(0);
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [engineReady, setEngineReady] = useState(false);
  const [loadingDismissed, setLoadingDismissed] = useState(false);
  const [locked, setLocked] = useState(false);
  const [hotbar, setHotbar] = useState<(number | string)[]>(
    goldenDays
      ? ["short_sword", 1, 2, 3, 4, 44, 45, 46, 18, 21]
      : isSkyblockLike
        ? [19, 19, 0, 0, 0, 0, 0, 0, 0]
        : blockFall
          ? []
          : bedwars
            ? ["short_sword", 5, 13, 10, "ender_pearl", "water_bucket", "golden_apple", "flint_steel", 57]
            : [1, 2, 3, 4, 5, 6, 7, 9, 10],
  );
  const hotbarRef = useRef(hotbar);
  hotbarRef.current = hotbar;

  const [hotbarCounts, setHotbarCounts] = useState<number[]>(() => {
    if (goldenDays) return [1, 64, 64, 64, 64, 64, 64, 64, 64, 64];
    if (isSkyblockLike) return [64, 64, 0, 0, 0, 0, 0, 0, 0];
    if (blockFall) return [];
    if (bedwars) return [1, 64, 64, 64, 16, 1, 1, 1, 64];
    return [64, 64, 64, 64, 64, 64, 64, 64, 64];
  });
  const hotbarCountsRef = useRef(hotbarCounts);
  hotbarCountsRef.current = hotbarCounts;

  const [controlsScale, setControlsScale] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("qb_controls_scale");
      return saved ? Number(saved) : 1.0;
    } catch {
      return 1.0;
    }
  });
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
  const [freeLook, setFreeLook] = useState(false);
  const freeLookRef = useRef(false);
  const avatarInstanceRef = useRef<Avatar | null>(null);
  const droppedItemsRef = useRef<DroppedItemManager | null>(null);
  const thirdRef = useRef(true);
  
  // Update thirdRef whenever thirdPerson changes
  useEffect(() => {
    thirdRef.current = thirdPerson;
  }, [thirdPerson]);

  useEffect(() => {
    freeLookRef.current = freeLook;
  }, [freeLook]);

  const toggleFreeLook = () => {
    const next = !freeLookRef.current;
    freeLookRef.current = next;
    setFreeLook(next);
    announce(
      next ? "Free-Look Enabled" : "Free-Look Disabled",
      next ? "Camera orbits 360° around player" : "Standard facing restored",
    );
  };
  
  // Listen for the custom event from settings
  useEffect(() => {
    const handleToggle = (e: any) => {
      setThirdPerson(!e.detail);
    };
    window.addEventListener("bm-first-person", handleToggle);
    return () => window.removeEventListener("bm-first-person", handleToggle);
  }, []);

  const mineBarRef = useRef<HTMLDivElement>(null);
  const [miningProgress, setMiningProgress] = useState(0);
  const [miningBlockInfo, setMiningBlockInfo] = useState<{
    name: string;
    hardness: number;
    toolSpeed: number;
    toolName: string;
  } | null>(null);

  const [toolDurabilities, setToolDurabilities] = useState<Record<number, { current: number; max: number }>>(() => {
    const initial: Record<number, { current: number; max: number }> = {};
    hotbar.forEach((item, idx) => {
      const tool = getToolDefinition(item);
      if (tool) {
        initial[idx] = { current: tool.durability, max: tool.durability };
      }
    });
    return initial;
  });
  const toolDurabilitiesRef = useRef(toolDurabilities);
  toolDurabilitiesRef.current = toolDurabilities;

  // Sync tool durability entries when hotbar contents change
  useEffect(() => {
    setToolDurabilities((prev) => {
      let changed = false;
      const next = { ...prev };
      hotbar.forEach((item, idx) => {
        const tool = getToolDefinition(item);
        if (tool) {
          if (!next[idx] || next[idx].max !== tool.durability) {
            next[idx] = { current: tool.durability, max: tool.durability };
            changed = true;
          }
        } else if (next[idx]) {
          delete next[idx];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [hotbar]);

  const [chatOpen, setChatOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showQuitDialog, setShowQuitDialog] = useState(false);
  const [multiplayerError, setMultiplayerError] = useState("");
  const [multiplayerConnected, setMultiplayerConnected] = useState(false);
  const [cutsceneOn, setCutsceneOn] = useState(false);
  const weather = useWeather();
  const [inMine, setInMine] = useState(false);
  const [staffOwned, setStaffOwned] = useState(() => hasStaff());
  const [rewardChest, setRewardChest] = useState<Reward | null>(null);
  const [chestNear, setChestNear] = useState(false);
  const [dragonHud, setDragonHud] = useState<DragonHud>({ hp: 1000, max: 1000, engaged: false });
  const [tpCine, setTpCine] = useState<"mine" | "island" | null>(null);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [missionToast, setMissionToast] = useState<MissionDef | null>(null);
  const missionState = useMissions();
  const wasCutsceneRef = useRef(false);
  const cutsceneRef = useRef({ active: false, t: 0 });

  useEffect(() => {
    if (!skyblock) return;
    if (wasCutsceneRef.current && !cutsceneOn) {
      try {
        if (localStorage.getItem("qb_skyblock_welcome_seen") !== "1") setWelcomeOpen(true);
      } catch {
        setWelcomeOpen(true);
      }
    }
    wasCutsceneRef.current = cutsceneOn;
  }, [cutsceneOn, skyblock]);

  useEffect(() => {
    if (!skyblock) return;
    let timer = 0;
    const onDone = (e: Event) => {
      setMissionToast((e as CustomEvent<MissionDef>).detail);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setMissionToast(null), 3600);
    };
    window.addEventListener(MISSION_DONE_EVENT, onDone);
    return () => {
      window.removeEventListener(MISSION_DONE_EVENT, onDone);
      window.clearTimeout(timer);
    };
  }, [skyblock]);

  const requestTeleport = useCallback(() => {
    if (tpCine || cutsceneRef.current.active) return;
    setTpCine(inMine ? "island" : "mine");
    window.setTimeout(() => window.dispatchEvent(new Event(MINE_TELEPORT_EVENT)), 950);
    window.setTimeout(() => setTpCine(null), 3300);
  }, [tpCine, inMine]);

  const closeWelcome = useCallback(() => {
    try {
      localStorage.setItem("qb_skyblock_welcome_seen", "1");
    } catch {
      // Ignore storage failures; dialogue just shows again next visit.
    }
    setWelcomeOpen(false);
  }, []);
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
  const wombatModelRef = useRef<THREE.Group | null>(null);
  const wombatMixerRef = useRef<THREE.AnimationMixer | null>(null);
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
    if (!isSkyblockLike || !skyRef.current) return;
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
      if (fogMode === "dense") skyRef.current.setRange(15, 75);
      else if (fogMode === "subtle") skyRef.current.setRange(35, 340);
      else if (fogMode === "off") skyRef.current.setRange(90, 600);
      else skyRef.current.setRange(25, 240);
      if (celestialSunRef.current) celestialSunRef.current.visible = true;
      if (celestialMoonRef.current) celestialMoonRef.current.visible = false;
      if (auroraGroupRef.current) auroraGroupRef.current.visible = false;
      if (phoenixModelRef.current) phoenixModelRef.current.visible = true;
    }
  }, [celestialNight, isSkyblockLike]);

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

  const currentVisitParam =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("visit")
      : null;
  const isVisiting = Boolean(currentVisitParam && currentVisitParam !== meRef.current.uid);
  const [visitingOwnerName, setVisitingOwnerName] = useState<string>("");

  useEffect(() => {
    if (!skyblock || !currentVisitParam) return;
    const targetIslandId = `island_v2_${currentVisitParam}`;
    let isCurrent = true;
    void getDoc(doc(db, "islands", targetIslandId))
      .then((snap) => {
        if (!isCurrent) return;
        if (snap.exists()) {
          const data = snap.data();
          if (data?.ownerName) {
            setVisitingOwnerName(data.ownerName);
          }
        }
      })
      .catch(() => {});
    return () => {
      isCurrent = false;
    };
  }, [skyblock, currentVisitParam]);

  // ── Persistent Island Progression (Saved By Person Forever in Firestore & LocalStorage) ──
  useEffect(() => {
    if (!isSkyblockLike || isVisiting) return;
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
  }, [isSkyblockLike, isVisiting, qbUser?.uid, progression]);

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
    // Hoisted to effect scope so cleanup can always release its WebGL context.
    let iconRenderer: THREE.WebGLRenderer | null = null;
    let controls: Controls | null = null;
    let sky: Sky | null = null;
    let avatar: Avatar | null = null;
    let bedDecorations: THREE.Group | null = null;
    let cell99Model: THREE.Group | null = null;
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
    let candyCruiser: THREE.Group | null = null;
    let candyCruiserMixer: THREE.AnimationMixer | null = null;
    let bedwarsLobbyMixer: THREE.AnimationMixer | null = null;
    let candyCruiserAngle = 0;
    let remotes: RemotePlayers | null = null;
    let socket: SandboxSocket | null = null;
    let selfTag: NameTag | null = null;
    let matchmaker: Avatar | null = null;
    let matchmakerTag: NameTag | null = null;
    const matchmakerPos = new THREE.Vector3(BEDWARS_MATCHMAKER_POS.x, BEDWARS_MATCHMAKER_POS.y, BEDWARS_MATCHMAKER_POS.z);
    let unsubPresence: (() => void) | null = null;
    let unsubFirestorePresence: (() => void) | null = null;
    let verityChar: VerityCharacterHandle | null = null;
    let unsubWorld: (() => void) | null = null;
    let unsubSocketStatus: (() => void) | null = null;
    let unsubSocketError: (() => void) | null = null;
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

        const isMobileUA = typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        const isChinesePhoneBrand = typeof navigator !== "undefined" && /vivo|realme|xiaomi|redmi|oppo|poco|iqoo|infinix|tecno/i.test(navigator.userAgent);
        const qualityPref = readQualityPref();
        try {
          renderer = new THREE.WebGLRenderer({
            // Preserve crisp Retina render path while utilizing native 16-bit FP ALU pipelines
            // on Vivo, Realme, Xiaomi (Mali & mobile Adreno) devices to eliminate shader register stalls.
            antialias: true,
            powerPreference: "high-performance",
            precision: (isMobileUA || isChinesePhoneBrand) ? "mediump" : "highp",
            depth: true,
            stencil: false,
          });
        } catch {
          try {
            renderer = new THREE.WebGLRenderer({
              antialias: false,
              powerPreference: "default",
            });
          } catch (error) {
            setGraphicsError(
              "Couldn't start 3D graphics. Your browser may have too many 3D tabs open or WebGL turned off. Close other game tabs and tap Try again.",
            );
            console.error("Could not create the sandbox WebGL renderer:", error);
            return;
          }
        }
      let isMaliOrMobileGpu = isChinesePhoneBrand || isMobileUA;
      try {
        const gl = renderer.getContext();
        const dbg = gl?.getExtension?.("WEBGL_debug_renderer_info");
        if (dbg) {
          const unmasked = ((gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) as string) || "").toLowerCase();
          if (/mali|powervr|adreno 5|adreno 61|adreno 62|adreno 63|ge8320|img bx|rogue/.test(unmasked)) {
            isMaliOrMobileGpu = true;
          }
        }
      } catch {
        // Fallback to UA detection
      }
      renderer.setPixelRatio(getTargetDpr(qualityPref));
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.LinearToneMapping;
      renderer.toneMappingExposure = 1.15;
      const enableShadows = isMobileUA ? (qualityPref === "high" || qualityPref === "uhd") : qualityPref !== "low";
      renderer.shadowMap.enabled = enableShadows;
      renderer.shadowMap.type = isMobileUA ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
      // Keep the full-resolution shadow map, but honor the explicit update
      // scheduling below instead of regenerating it unconditionally per frame.
      renderer.shadowMap.autoUpdate = false;
      renderer.shadowMap.needsUpdate = true;

      // Anisotropic filtering capped at 2x on mobile/Mali to prevent memory bus saturation on UMA architectures
      const maxAniso = renderer.capabilities.getMaxAnisotropy();
      atlas.texture.anisotropy = (isMobileUA || isMaliOrMobileGpu) ? Math.min(maxAniso, 2) : maxAniso;
      atlas.texture.magFilter = THREE.NearestFilter;
      atlas.texture.minFilter = THREE.NearestMipmapLinearFilter;
      atlas.texture.generateMipmaps = true;
      atlas.texture.needsUpdate = true;

      mount.appendChild(renderer.domElement);
      renderer.domElement.style.display = "block";
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      renderer.domElement.style.touchAction = "none";
      renderer.domElement.style.transform = "translateZ(0)";
      (renderer.domElement.style as any).webkitTransform = "translateZ(0)";
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
        dayLength: isSkyblockLike ? 720 : 600,
        shadowMapSize: getShadowMapSize(qualityPref),
        cloudOctaves: qualityPref === "low" ? 3 : 5,
      });
      skyRef.current = sky;
      let initialAtm = "day";
      try {
        initialAtm = localStorage.getItem("qb_atmosphere") || "day";
      } catch {}
      sky.setPreset(initialAtm);

      let initialFogMode = "realistic";
      try {
        initialFogMode = localStorage.getItem("qb_fog_mode") || "realistic";
      } catch {}

      const applyFogMode = (mode: string) => {
        if (!sky) return;
        if (mode === "dense") {
          sky.setRange(15, 75);
        } else if (mode === "subtle") {
          sky.setRange(35, 340);
        } else if (mode === "off") {
          sky.setRange(90, 600);
        } else {
          // "realistic" (default) — extended atmospheric depth so blocks never disappear
          sky.setRange(25, blockFall ? 160 : 240);
        }
      };

      applyFogMode(initialFogMode);

      const onAtmosphereChange = (e: Event) => {
        const atm = (e as CustomEvent<string>).detail;
        if (sky && atm) {
          sky.setPreset(atm);
          if (cosmicSkyRef.current) {
            cosmicSkyRef.current.setNight(atm === "night" || atm === "aurora" || atm === "blood_moon");
          }
          if (renderer) renderer.shadowMap.needsUpdate = true;
        }
      };
      window.addEventListener("bm-atmosphere-change", onAtmosphereChange);
      window.addEventListener("bm-sky-time", onAtmosphereChange);

      if (blockFall) {
        sky.paused = true;
        sky.setCloudCover(0.35);
        renderer.toneMappingExposure = 1.0;
      }

      // Chunk render distance: tuned per mode for rock-solid performance
      if (bedwars) {
        sky.setPurpleNight();
        sky.paused = true;
        sky.setCloudCover(0.24);
        sky.setRange(25, 240);
        renderer.toneMappingExposure = 1.05;
      }

      world = new World(atlas, goldenDays ? 16 : isSkyblockLike || bedwars ? 10 : blockFall ? 6 : 8);

      if (bedwars) {
        buildBedwarsLobby(world);
        void loadBedwarsLobby(scene).then(({ model, mixer }) => {
          bedwarsLobbyMixer = mixer;
          if (renderer) renderer.shadowMap.needsUpdate = true;
        }).catch((err) => {
          console.error("Failed to load Bedwars lobby model:", err);
        });
      } else if (blockFall) {
        buildBlockFallArena(world);
      } else if (goldenDays) {
        buildForestArena(world);
      } else if (baseplate) {
        buildBaseplateWorld(world);
        void loadCell99Map(scene).then((model) => {
          if (disposed || !model) {
            model?.traverse((object) => {
              const mesh = object as THREE.Mesh;
              if (!mesh.isMesh) return;
              mesh.geometry?.dispose();
              const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
              materials.forEach((material) => material.dispose());
            });
            return;
          }
          cell99Model = model;
        }).catch((err) => console.warn("Cell 99 GLTF map load:", err));
        void loadVerityCharacter(scene).then((v) => {
          if (!disposed) verityChar = v;
        });
      } else if (skyblock) {
        buildSkyblockIsland(world);
      } else {
        world.generate(GROUND);
      }
      const mineArea: MiningArea | null = skyblock ? buildMiningArea(world) : null;
      if (!bedwars) {
        world.meshAll();
        scene.add(world.group);
      }
      if (skyblock) {
        void loadSkyblockDecorations(scene, () => disposed);
      }

      const skyEnv = isSkyblockLike
        ? new SkyblockEnvironment(scene, { pond: SKYBLOCK_POND_SURFACE, lowQuality: qualityPref === "low" })
        : null;
      if (isSkyblockLike) {
        renderer.toneMappingExposure = 1.0;
        sky.setCloudCover(0.35);
      }

      const grassField =
        skyblock && qualityPref !== "low"
          ? new GrassField(
              world,
              { minX: -15, maxX: 16, minZ: -15, maxZ: 16, minY: 4, maxY: 40 },
            )
          : null;
      if (grassField) scene.add(grassField.mesh);
      // High-performance rendering: use direct GPU rendering by default for 60fps responsiveness;
      // post-processing only if high quality is explicitly requested and on non-mobile GPUs
      const cinematicPost =
        (isSkyblockLike || blockFall || bedwars) && qualityPref === "high" && !isMaliOrMobileGpu
          ? new CinematicPost(renderer, scene, camera, 0.12)
          : null;
      const applyGraphicsV2 = (on: boolean) => {
        sky?.setGraphicsV2(on);
        cinematicPost?.setGraphicsV2(on);
        if (renderer) renderer.shadowMap.needsUpdate = true;
      };
      applyGraphicsV2(isGraphicsV2());
      const onGraphicsV2 = (e: Event) => applyGraphicsV2((e as CustomEvent<boolean>).detail);
      window.addEventListener(GRAPHICS_V2_EVENT, onGraphicsV2);
      const cosmicSky = isSkyblockLike || bedwars ? new CosmicSky(scene, qualityPref === "low") : null;
      cosmicSkyRef.current = cosmicSky;
      cosmicSky?.setNight(bedwars || celestialNightRef.current || initialAtm === "night");

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

        // ── 4. Animated Wombat Companion next to World Tree ──
        try {
          const wLoader = new GLTFLoader();
          wLoader.load(
            "https://file.garden/alGOOylwpAfCa6qP/blockbench_wombat.glb",
            (wAsset) => {
              if (disposed) return;
              const wModel = wAsset.scene;
              // Position next to the main tree on Skyblock island
              wModel.position.set(-2.6, 16.0, -3.2);
              wModel.rotation.y = 0.6;
              wModel.scale.setScalar(0.9);

              wModel.traverse((node) => {
                if ((node as THREE.Mesh).isMesh) {
                  const mesh = node as THREE.Mesh;
                  mesh.castShadow = true;
                  mesh.receiveShadow = true;
                  if (mesh.material) {
                    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                    mats.forEach((m) => {
                      const mat = m as THREE.MeshStandardMaterial;
                      if (mat.map) {
                        mat.map.magFilter = THREE.NearestFilter;
                        mat.map.minFilter = THREE.NearestMipmapLinearFilter;
                        mat.map.generateMipmaps = true;
                        mat.map.needsUpdate = true;
                      }
                      mat.needsUpdate = true;
                    });
                  }
                }
              });

              scene.add(wModel);
              wombatModelRef.current = wModel;

              if (wAsset.animations && wAsset.animations.length > 0) {
                const wMixer = new THREE.AnimationMixer(wModel);
                wAsset.animations.forEach((clip) => {
                  const action = wMixer.clipAction(clip);
                  action.setLoop(THREE.LoopRepeat, Infinity);
                  action.play();
                });
                wombatMixerRef.current = wMixer;
              }
            },
            undefined,
            (err) => console.warn("Could not load animated wombat:", err),
          );
        } catch (err) {
          console.warn("Wombat loading error:", err);
        }

        // ── 5. Realistic Voxel Torch with Dynamic Lighting on Starter Island ──
        const starterTorch = createVoxelTorch(1.5, 17.0, 1.5);
        scene.add(starterTorch.group);
        voxelTorchRef.current = starterTorch;

        // Cozy lantern on iron stand near camp (Reference Image 3)
        const campLantern = createVoxelLantern(-2.8, 16.0, -3.0);
        scene.add(campLantern.group);

        voxelPropsRef.current = [campLantern];

        // ── 6. Fantasy Skyblock Atmosphere: Warm campsite lanterns ──
        const campLantern2 = createVoxelLantern(2.5, 16.0, -1.0);
        scene.add(campLantern2.group);
        voxelPropsRef.current = [campLantern, campLantern2];
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

      if (blockFall) {
        try {
          const cruiserAsset = await new GLTFLoader().loadAsync(
            "https://file.garden/alGOOylwpAfCa6qP/the_candy_cruiser.glb",
          );
          if (!disposed) {
            candyCruiser = new THREE.Group();
            const model = cruiserAsset.scene;
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z, 0.01);
            const scale = 8.8 / maxDim; // Beautiful cruiser ship scaled to be prominently visible outside windows
            model.scale.setScalar(scale);

            // Center model inside group
            const center = box.getCenter(new THREE.Vector3());
            model.position.sub(center.multiplyScalar(scale));
            candyCruiser.add(model);

            if (cruiserAsset.animations && cruiserAsset.animations.length > 0) {
              candyCruiserMixer = new THREE.AnimationMixer(model);
              cruiserAsset.animations.forEach((clip) => {
                candyCruiserMixer!.clipAction(clip).play();
              });
            }

            candyCruiser.position.set(48, 25.5, 0);
            scene.add(candyCruiser);
          }
        } catch (err) {
          console.warn("Could not load the candy cruiser model:", err);
        }
      }

      fx = new BlockFx(atlas);
      scene.add(fx.group);

      const combatFx = new CombatFx();
      scene.add(combatFx.group);
      const syncBlock = (x: number, y: number, z: number, id: number) => {
        socket?.sendBlockUpdate({ x, y, z, id });
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
      } else if (skyblock || baseplate) {
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
      let staffMixer: THREE.AnimationMixer | null = null;
      const swordLoader = new GLTFLoader();
      for (const [sid, url] of Object.entries(SWORD_MODELS)) {
        swordLoader
          .loadAsync(url)
          .then((g) => {
            if (disposed) return;
            const m = g.scene;
            normalizeShowcaseModel(m, 0.46); // scaled slightly bigger in hand per user request
            m.traverse((o) => {
              const mesh = o as THREE.Mesh;
              if (mesh.isMesh) mesh.castShadow = false;
            });
            m.rotation.set(0.05, -0.22, -0.08);
            m.visible = false;
            heldRig.add(m);
            heldSwords.set(sid, m);

            if (sid === "dark_magic_staff" && g.animations && g.animations.length > 0) {
              staffMixer = new THREE.AnimationMixer(m);
              g.animations.forEach((clip) => {
                staffMixer!.clipAction(clip).play();
              });
            }

            const icon = renderSwordIcon(m);
            if (icon) setTileUrls((prev) => ({ ...prev, [sid]: icon }));
            if (heldItemId === sid) setHeldTile(sid);
          })
          .catch((err) => console.warn(`Sword model ${sid} failed to load:`, err))
          .finally(() => {
            iconsPending -= 1;
            if (iconsPending <= 0 && iconRenderer) {
              iconRenderer.dispose();
              iconRenderer.forceContextLoss();
              iconRenderer = null;
            }
          });
      }

      // First-person block hand with fair/white-ish skin tone (bigger and shifted more to the right per user request):
      const heldHand = new THREE.Group();
      const handTex = new THREE.TextureLoader().load("/ui/hand-2d.png");
      handTex.colorSpace = THREE.SRGBColorSpace;
      handTex.anisotropy = 4;
      const handSprite = new THREE.Mesh(
        new THREE.PlaneGeometry(0.55, 0.55 * (1081 / 1372)),
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
      // Made bigger (0.55) per user request
      heldItemHolder.scale.set(0.55, 0.55, 0.55);

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

      // Right hand shifted more to the right per user request (0.45)
      heldHand.position.set(0.45, -0.28, -0.46);
      heldHand.rotation.set(-0.1, -0.15, -0.05);
      heldHand.visible = false;
      heldRig.add(heldHand);

      camera.add(heldRig);
      scene.add(camera);
      const heldBasePose = {
        hand: { px: 0.40, py: -0.24, pz: -0.38, rx: -0.24, ry: 0.35, rz: -0.10 },
        block: { px: 0.32, py: -0.20, pz: -0.40, rx: -0.25, ry: 0.6, rz: 0.15 },
        item: { px: 0.28, py: -0.24, pz: -0.30, rx: -0.12, ry: 0.18, rz: 0.08 },
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
        try {
          window.dispatchEvent(new CustomEvent("qb-held-item", { detail: id }));
        } catch {}
        avatarInstanceRef.current?.setHeldItem(id);
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
          heldRig.scale.set(1.36, 1.36, 1.36);
        } else if (id === 0) {
          // Empty / bare hand (bigger size per user request)
          meleeDamage = 1;
          held.visible = false;
          if (heldSword) heldSword.visible = false;
          heldHand.visible = true;
          heldItemHolder.visible = false;
          heldRig.scale.set(1.22, 1.22, 1.22);
        } else {
          meleeDamage = 1;
          held.visible = true;
          if (heldSword) heldSword.visible = false;
          heldHand.visible = false;
          heldItemHolder.visible = false;
          heldRig.scale.set(1.15, 1.15, 1.15);

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

      const onMagicUndo = () => {
        import("@/engine-sandbox/shared/magic-stick").then(({ undoMagicStick }) => {
          if (world) {
            undoMagicStick({ world, setBlock: setBlockSynced, announce });
          }
        });
      };
      window.addEventListener("qb-magic-stick-trigger-undo", onMagicUndo);

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
      const isIraHrLocal = isIraHrUser(meRef.current.name) || isIraHrUser(qbUser?.displayName) || isIraHrUser(qbUser?.username) || isIraHrUser(qbUser?.email);
      avatar.load(2.28, isIraHrLocal ? CYBERPUNK_DEV_MODEL : undefined).then(() => {
        if (disposed || !avatar) return;
        setAvatarReady(true);
        if (heldItemId) avatar.setHeldItem(heldItemId);
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

      // ── Combat practice target (invisible dummy for parry physics) ──
      const hitMe = new Avatar();
      hitMe.idleStill = true;
      const hitMeHome = new THREE.Vector3(player.position.x + 2.5, player.position.y, player.position.z + 2);
      hitMe.group.position.copy(hitMeHome);
      hitMe.group.visible = false;
      const hitMeVel = new THREE.Vector3();
      const hitMeBar = createHpBar("", 20);
      hitMeBar.sprite.visible = false;
      const arrowGroup = new THREE.Group();
      arrowGroup.visible = false;
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

      // ── Dark Magic Staff: glowing pixellated fire projectiles ──
      interface StaffFireball {
        group: THREE.Group;
        pos: THREE.Vector3;
        vel: THREE.Vector3;
        life: number;
      }
      const staffFireballs: StaffFireball[] = [];

      const spawnFireExplosion = (at: THREE.Vector3) => {
        const chipGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
        const chipColors = [0xff2200, 0xff6600, 0xffaa00, 0xffff44];
        for (let i = 0; i < 10; i++) {
          const mat = new THREE.MeshBasicMaterial({
            color: chipColors[i % chipColors.length],
            toneMapped: false,
          });
          const chip = new THREE.Mesh(chipGeo, mat);
          chip.position.copy(at);
          scene.add(chip);
          const vel = new THREE.Vector3(
            (Math.random() - 0.5) * 7,
            Math.random() * 5 + 1.5,
            (Math.random() - 0.5) * 7,
          );
          let t = 0.45;
          const tick = () => {
            t -= 0.035;
            vel.y -= 0.35;
            chip.position.addScaledVector(vel, 0.035);
            chip.scale.setScalar(Math.max(0.01, t / 0.45));
            if (t > 0) {
              requestAnimationFrame(tick);
            } else {
              scene.remove(chip);
              chip.geometry.dispose();
              mat.dispose();
            }
          };
          requestAnimationFrame(tick);
        }
      };

      const spawnStaffFireball = (from: THREE.Vector3, dir: THREE.Vector3) => {
        playAudioUrl(STAFF_FIRE_SFX, 0.85);
        const grp = new THREE.Group();

        // Pixelated glowing fire blocks cluster
        const cubeGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
        const fireColors = [0xff2200, 0xff5500, 0xff9900, 0xffff22, 0xff3700];
        const pixelOffsets = [
          [0, 0, 0],
          [0.08, 0.06, -0.04],
          [-0.07, -0.05, 0.04],
          [0.04, -0.08, -0.05],
          [-0.05, 0.07, 0.05],
          [0, 0.1, -0.07],
        ];
        pixelOffsets.forEach(([ox, oy, oz], i) => {
          const mat = new THREE.MeshBasicMaterial({
            color: fireColors[i % fireColors.length],
            toneMapped: false,
          });
          const c = new THREE.Mesh(cubeGeo, mat);
          c.position.set(ox, oy, oz);
          grp.add(c);
        });

        const pLight = new THREE.PointLight(0xff6600, 2.8, 6);
        grp.add(pLight);

        const start = from.clone().addScaledVector(dir, 0.7);
        grp.position.copy(start);
        scene.add(grp);

        staffFireballs.push({
          group: grp,
          pos: start,
          vel: dir.clone().multiplyScalar(32),
          life: 3.5,
        });
      };

      // ── 3 Golden Forger Boss NPCs (BOSS_001 首领) ─���������
      interface BossEnemy {
        id: number;
        name: string;
        group: THREE.Group;
        home: THREE.Vector3;
        pos: THREE.Vector3;
        vel: THREE.Vector3;
        hp: number;
        maxHp: number;
        bar: ReturnType<typeof createHpBar>;
        mixer: THREE.AnimationMixer | null;
        redT: number;
        shootTimer: number;
        respawnTimer: number;
        alive: boolean;
        tintMats: { mat: THREE.MeshStandardMaterial; color: THREE.Color; emissive: THREE.Color }[];
      }

      const bossEnemies: BossEnemy[] = [];
      // Skeletons guarding the ancient crypt and vast fantasy mining cavern
      const SKELETON_SPAWN_DEFS = [
        { pos: new THREE.Vector3(394.5, 13, 8.5), name: "Crypt Skeleton Guard", hp: 35 },
        { pos: new THREE.Vector3(374.5, 13, 8.5), name: "Skeleton Warrior", hp: 35 },
        { pos: new THREE.Vector3(384.5, 13, 16.5), name: "Crypt Archer", hp: 30 },
        { pos: new THREE.Vector3(366.5, 13, -38.5), name: "Cavern Skeleton Miner", hp: 40 },
        { pos: new THREE.Vector3(406.5, 13, -36.5), name: "Lagoon Sentry", hp: 40 },
      ];

      interface BossLaser {
        group: THREE.Group;
        pos: THREE.Vector3;
        vel: THREE.Vector3;
        life: number;
      }
      const bossLasers: BossLaser[] = [];

      const spawnBossLaser = (from: THREE.Vector3, to: THREE.Vector3) => {
        playAudioUrl(BOSS_LASER_SFX, 0.8);
        const grp = new THREE.Group();

        // Pixellated yellow glowing projectile
        const cubeGeo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
        const yellowColors = [0xffff00, 0xffea00, 0xfff066, 0xffd700];
        const offsets = [
          [0, 0, 0],
          [0.08, 0, -0.05],
          [-0.08, 0, -0.05],
          [0, 0.08, -0.05],
          [0, -0.08, -0.05],
          [0, 0, -0.12],
        ];
        offsets.forEach(([ox, oy, oz], i) => {
          const mat = new THREE.MeshBasicMaterial({
            color: yellowColors[i % yellowColors.length],
            toneMapped: false,
          });
          const c = new THREE.Mesh(cubeGeo, mat);
          c.position.set(ox, oy, oz);
          grp.add(c);
        });

        const pLight = new THREE.PointLight(0xffea00, 2.2, 5);
        grp.add(pLight);

        const dir = to.clone().sub(from).normalize();
        grp.position.copy(from);
        scene.add(grp);

        bossLasers.push({
          group: grp,
          pos: from.clone(),
          vel: dir.multiplyScalar(20),
          life: 4.0,
        });
      };

      const bossDamage = (boss: BossEnemy, dmg: number, hitDir: THREE.Vector3) => {
        if (!boss.alive) return;
        boss.hp = Math.max(0, boss.hp - dmg);
        boss.bar.set(boss.hp);
        boss.redT = 0.45;
        boss.vel.addScaledVector(hitDir, 4.5);
        boss.vel.y = 3.2;
        const bCenter = boss.group.position.clone().add(new THREE.Vector3(0, 1.2, 0));
        spawnHitFx(bCenter, dmg, true);
        playSound("hurt");
        playSound("sword_hit");

        if (boss.hp <= 0) {
          boss.alive = false;
          boss.group.visible = false;
          boss.bar.sprite.visible = false;
          boss.respawnTimer = 6.0;
          announce(`${boss.name} Defeated!`, "The crypt guardian returns in 6 seconds...");
          bumpMission("forgerKills", 1);
          spawnFireExplosion(bCenter);
        }
      };

      const damagePlayer = (dmg: number, fromPos: THREE.Vector3) => {
        if (player.isDying) return;
        playSound("hurt");
        setPlayerHp((prev) => {
          const next = Math.max(0, prev - dmg);
          if (next <= 0) {
            player.isDying = true;
            player.velocity.set(0, 0.4, 0);
            player.onDie?.();
            setTimeout(() => {
              player.isDying = false;
              player.respawn();
              setPlayerHp(20);
            }, 1500);
          }
          return next;
        });
        const away = player.position.clone().sub(fromPos).normalize();
        away.y = 0.35;
        player.velocity.addScaledVector(away, 5.0);
      };

      // ── Red Dragon: 1000 HP boss in its own arena, hostile only once hit ──
      const redDragon: RedDragon | null = skyblock
        ? new RedDragon({
            scene,
            arena: DRAGON_ARENA,
            player: () => ({ position: player.position, dead: player.isDying }),
            damagePlayer,
            onHud: (hud) => setDragonHud(hud),
            onDefeated: () => {
              grantStaff();
              setStaffOwned(true);
              setHotbar((prev) => (prev.includes("dark_magic_staff") ? prev : ["dark_magic_staff", ...prev]));
              announce("Red Dragon Defeated!", "You earned the Dark Magic Staff", "reward");
              playAudioUrl(WIN_SFX, 0.9);
              progression.grantXp(1500);
              bumpMission("dragonKills", 1);
            },
            burst: (at, big) => {
              spawnFireExplosion(at);
              if (big) for (let i = 0; i < 4; i++) spawnFireExplosion(at.clone().add(new THREE.Vector3((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 6)));
            },
            hitFx: (at, dmg) => {
              spawnHitFx(at, dmg, true);
              playSound("hurt");
            },
            sound: (name) => playSound(name as Parameters<typeof playSound>[0]),
          })
        : null;

      // Skeletons in the crypt and vast mining cavern
      const skeletonUrls = [
        "https://file.garden/alGOOylwpAfCa6qP/skeleton.glb",
        "/skeleton.glb",
      ];
      const bossLoader = new GLTFLoader();
      const loadSkeletons = async () => {
        let gltf: any = null;
        for (const url of skeletonUrls) {
          try {
            gltf = await bossLoader.loadAsync(url);
            if (gltf) break;
          } catch {
            // try fallback
          }
        }
        if (!gltf || disposed) return;
        const templateScene = gltf.scene;
        normalizeShowcaseModel(templateScene, 2.0);

        SKELETON_SPAWN_DEFS.forEach((spawnDef, idx) => {
          const homePos = spawnDef.pos;
          const bossGrp = new THREE.Group();
          const clonedModel = cloneSkinnedModel(templateScene);
          clonedModel.position.set(0, 0, 0);
          bossGrp.add(clonedModel);
          bossGrp.position.copy(homePos);
          scene.add(bossGrp);

          let mixer: THREE.AnimationMixer | null = null;
          if (gltf.animations && gltf.animations.length > 0) {
            mixer = new THREE.AnimationMixer(clonedModel);
            gltf.animations.forEach((clip: any) => {
              const act = mixer!.clipAction(clip);
              act.play();
              act.time = idx * 0.7;
            });
          }

          const bar = createHpBar(spawnDef.name, spawnDef.hp);
          bar.sprite.position.set(homePos.x, homePos.y + 2.7, homePos.z);
          scene.add(bar.sprite);

          const tintMats: { mat: THREE.MeshStandardMaterial; color: THREE.Color; emissive: THREE.Color }[] = [];
          clonedModel.traverse((o) => {
            const mesh = o as THREE.Mesh;
            if (mesh.isMesh) {
              const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
              mats.forEach((m) => {
                const mat = m as THREE.MeshStandardMaterial;
                if (mat && mat.color) {
                  tintMats.push({
                    mat,
                    color: mat.color.clone(),
                    emissive: mat.emissive ? mat.emissive.clone() : new THREE.Color(0, 0, 0),
                  });
                }
              });
            }
          });

          bossEnemies.push({
            id: idx,
            name: spawnDef.name,
            group: bossGrp,
            home: homePos.clone(),
            pos: homePos.clone(),
            vel: new THREE.Vector3(),
            hp: spawnDef.hp,
            maxHp: spawnDef.hp,
            bar,
            mixer,
            redT: 0,
            shootTimer: 2.0 + idx * 1.3,
            respawnTimer: 0,
            alive: true,
            tintMats,
          });
        });
      };
      if (skyblock) {
        void loadSkeletons();
      }

      const updateBossSystem = (dt: number) => {
        if (playerInMine) redDragon?.update(dt);
        // 1. Staff Fireballs update
        for (let i = staffFireballs.length - 1; i >= 0; i--) {
          const fb = staffFireballs[i];
          fb.life -= dt;
          fb.pos.addScaledVector(fb.vel, dt);
          fb.group.position.copy(fb.pos);
          fb.group.rotation.x += dt * 8;
          fb.group.rotation.y += dt * 10;

          let hitTarget = false;
          if (redDragon?.contains(fb.pos, 0.5)) {
            hitTarget = true;
            redDragon.hurt(12);
          }
          for (const boss of bossEnemies) {
            if (hitTarget) break;
            if (!boss.alive) continue;
            const bPos = boss.group.position.clone().add(new THREE.Vector3(0, 1.0, 0));
            if (fb.pos.distanceTo(bPos) < 1.4) {
              hitTarget = true;
              bossDamage(boss, 10, fb.vel.clone().normalize());
              break;
            }
          }

          const solidHit =
            world &&
            world.solid(
              Math.floor(fb.pos.x),
              Math.floor(fb.pos.y),
              Math.floor(fb.pos.z),
            );

          if (hitTarget || solidHit || fb.life <= 0) {
            spawnFireExplosion(fb.pos);
            scene.remove(fb.group);
            fb.group.traverse((o) => {
              const m = o as THREE.Mesh;
              if (m.isMesh) {
                m.geometry.dispose();
                if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
                else m.material.dispose();
              }
            });
            staffFireballs.splice(i, 1);
          }
        }

        // 2. Boss NPCs update
        const _bossRed = new THREE.Color(0xff1818);
        for (const boss of bossEnemies) {
          if (!boss.alive) {
            boss.respawnTimer -= dt;
            if (boss.respawnTimer <= 0) {
              boss.alive = true;
              boss.hp = boss.maxHp;
              boss.bar.set(boss.maxHp);
              boss.pos.copy(boss.home);
              boss.group.position.copy(boss.home);
              boss.vel.set(0, 0, 0);
              boss.group.visible = true;
              boss.bar.sprite.visible = true;
              boss.shootTimer = 2.0;
              spawnFireExplosion(boss.home);
            }
            continue;
          }

          // Physics & ground collision
          const p = boss.group.position;
          boss.vel.y -= 26 * dt;
          p.addScaledVector(boss.vel, dt);
          const fx0 = Math.floor(p.x);
          const fz0 = Math.floor(p.z);
          const below = Math.floor(p.y - 0.02);
          if (boss.vel.y <= 0 && world && world.solid(fx0, below, fz0)) {
            p.y = below + 1;
            boss.vel.y = 0;
          }
          const friction = Math.exp(-7 * dt);
          boss.vel.x *= friction;
          boss.vel.z *= friction;
          if (p.y < boss.home.y - 20) {
            p.copy(boss.home);
            boss.vel.set(0, 0, 0);
          }

          // Face player when in mining area
          if (playerInMine) {
            const faceYaw = Math.atan2(player.position.x - p.x, player.position.z - p.z);
            boss.group.rotation.y = faceYaw;
          }
          boss.bar.sprite.position.set(p.x, p.y + 2.7, p.z);

          // Update animation mixer
          if (boss.mixer) {
            boss.mixer.update(dt);
          } else {
            const t = clock.getElapsedTime();
            boss.group.position.y = p.y + Math.sin(t * 3.0 + boss.id) * 0.04;
          }

          // Red hurt tint
          if (boss.redT > 0) {
            boss.redT = Math.max(0, boss.redT - dt);
            const k = Math.min(1, boss.redT / 0.25);
            for (const t of boss.tintMats) {
              t.mat.color.copy(t.color).lerp(_bossRed, 0.85 * k);
              if (t.mat.emissive) t.mat.emissive.copy(t.emissive).lerp(_bossRed, 0.85 * k);
            }
            if (boss.redT === 0) {
              for (const t of boss.tintMats) {
                t.mat.color.copy(t.color);
                if (t.mat.emissive) t.mat.emissive.copy(t.emissive);
              }
            }
          }

          // Shooting at player (mining area only)
          boss.shootTimer -= dt;
          const distToPlayer = p.distanceTo(player.position);
          if (playerInMine && boss.shootTimer <= 0 && distToPlayer < 24 && !player.isDying) {
            boss.shootTimer = 3.2 + Math.random() * 0.8;
            const spawnAt = p.clone().add(new THREE.Vector3(0, 1.4, 0));
            const targetPt = player.position.clone().add(new THREE.Vector3(0, 1.1, 0));
            spawnBossLaser(spawnAt, targetPt);
          }
        }

        // 3. Boss Yellow Lasers update
        for (let i = bossLasers.length - 1; i >= 0; i--) {
          const lz = bossLasers[i];
          lz.life -= dt;
          lz.pos.addScaledVector(lz.vel, dt);
          lz.group.position.copy(lz.pos);
          lz.group.rotation.z += dt * 10;

          // Check hit against player
          const pCenter = player.position.clone().add(new THREE.Vector3(0, 1.0, 0));
          let hitPlayer = false;
          if (lz.pos.distanceTo(pCenter) < 0.95) {
            hitPlayer = true;
            damagePlayer(2, lz.pos);
          }

          const solidHit =
            world &&
            world.solid(
              Math.floor(lz.pos.x),
              Math.floor(lz.pos.y),
              Math.floor(lz.pos.z),
            );

          if (hitPlayer || solidHit || lz.life <= 0) {
            spawnFireExplosion(lz.pos);
            scene.remove(lz.group);
            lz.group.traverse((o) => {
              const m = o as THREE.Mesh;
              if (m.isMesh) {
                m.geometry.dispose();
                if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
                else m.material.dispose();
              }
            });
            bossLasers.splice(i, 1);
          }
        }
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
      const skyblockPlayerId = meRef.current.uid || getPermanentPlayerId(qbUser);
      const activeSkyblockIslandId = currentVisitParam
        ? `island_v2_${currentVisitParam}`
        : `island_v2_${skyblockPlayerId}`;

      const roomId: MultiplayerRoom = goldenDays
        ? "golden-days"
        : blockFall
          ? "blockfall"
          : bedwars
            ? "bedwars"
            : isSkyblockLike
              ? (`skyblock_${activeSkyblockIslandId}` as MultiplayerRoom)
              : "sandbox";
      socket = new SandboxSocket();
      unsubPresence = socket.onPlayers((list) => {
        for (const p of list) names.set(p.uid, p.name || "Player");
        remotes?.sync(list);
      });
      unsubWorld = socket.onBlock(({ x, y, z, id }) => {
        if (!disposed) world?.set(x, y, z, id);
      });
      unsubSocketStatus = socket.onStatus((status) => {
        setMultiplayerConnected(status === "connected");
        if (status === "connected") setMultiplayerError("");
      });
      unsubSocketError = socket.onError((error) => {
        console.warn("Sandbox WebSocket unavailable, playing offline:", error);
      });
      socket.connect(roomId, {
        uid: meRef.current.uid,
        name: meRef.current.name,
        photo: meRef.current.photo,
        frame: meRef.current.frame,
        badges: meRef.current.badges,
        x: player.position.x,
        y: player.position.y,
        z: player.position.z,
        rotY: 0,
      });

      let unsubIslandBlocks: (() => void) | null = null;
      if (skyblock) {
        unsubFirestorePresence = subscribeToIslandPlayers(
          activeSkyblockIslandId,
          meRef.current.uid,
          (players) => {
            const mappedList = players.map((p) => ({
              uid: p.uid,
              name: p.name || p.username || "Player",
              photo: p.profilePhoto || undefined,
              x: p.x,
              y: p.y,
              z: p.z,
              rotY: p.rotY,
            }));
            for (const p of mappedList) {
              names.set(p.uid, p.name || "Player");
            }
            remotes?.sync(mappedList);
          },
        );

        unsubIslandBlocks = subscribeToIslandBlocks(
          activeSkyblockIslandId,
          (bx, by, bz, bId) => {
            if (!disposed && world) {
              world.set(bx, by, bz, bId === null ? 0 : bId);
            }
          },
        );
      } else if (!blockFall && !bedwars) {
        unsubFirestorePresence = subscribeToSandboxPlayers(
          meRef.current.uid,
          (list) => {
            for (const p of list) names.set(p.uid, p.name || "Player");
            remotes?.sync(list);
          },
          (err) => console.warn("Firestore presence error:", err),
        );
      }

      const onSavedWorldError = (error: Error) => {
        if (disposed) return;
        console.warn("Saved world unavailable, playing offline:", multiplayerErrorMessage(error, "world"));
      };

      if (blockFall) {
        void loadBlockFallBlocks(
          ({ x, y, z, id }) => {
            if (!disposed) world?.set(x, y, z, id);
          },
          onSavedWorldError,
        );
      } else if (skyblock) {
        // Each account loads only its own isolated, pristine Skyblock island
        void getOrCreateIsland(activeSkyblockIslandId, meRef.current.name).then((island) => {
          if (disposed || !world) return;
          if (island && island.deltaBlocks) {
            for (const [coordKey, val] of Object.entries(island.deltaBlocks)) {
              const [bx, by, bz] = coordKey.split(",").map(Number);
              if ([bx, by, bz].every(Number.isFinite)) {
                world.set(bx, by, bz, val === -1 ? 0 : val);
              }
            }
            world.meshAll();
          }
        }).catch((err) => {
          console.warn("Could not load island delta blocks:", err);
        });
      } else {
        void loadSandboxBlocks(
          ({ x, y, z, id }) => {
            if (!disposed) world?.set(x, y, z, id);
          },
          onSavedWorldError,
        );
      }

      // Skyblock Island Reset handler — wipes island deltas and restores fresh starter sanctuary
      const onResetIsland = async () => {
        if (!skyblock || !world) return;
        try {
          if (typeof window !== "undefined") {
            localStorage.removeItem(`sb_island_${activeSkyblockIslandId}`);
          }
          const islandRef = doc(db, "islands", activeSkyblockIslandId);
          await setDoc(islandRef, { deltaBlocks: {}, lastModified: Date.now() }, { merge: true });
        } catch (err) {
          console.warn("Reset island error:", err);
        }
        world.clear();
        buildSkyblockIsland(world);
        world.meshAll();
        player.position.set(0, 18, 0);
        player.velocity.set(0, 0, 0);
        announce("Island Reset", "Welcome back to your fresh starter sanctuary!");
      };
      window.addEventListener("qb-reset-island", onResetIsland);

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
            // Silently log sandbox chat listener error without showing an intrusive popup
            console.warn("Sandbox chat listener:", err);
          },
        );
      } catch (err) {
        console.warn("Sandbox chat subscribe error:", err);
      }

      heldRig.visible = !thirdRef.current;

      // ── Dropped Items system (Minecraft style Q-drop, physics, floating, magnetic pickup) ──
      const droppedItems = new DroppedItemManager(scene, world!, atlas!);
      droppedItemsRef.current = droppedItems;

      const dropCurrentHeldItem = () => {
        const currentSlot = slotRef.current;
        const currentItem = hotbarRef.current[currentSlot];
        if (!currentItem || currentItem === 0) return;

        const throwDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        const spawnPos = new THREE.Vector3(player.position.x, player.eyeY - 0.25, player.position.z).addScaledVector(throwDir, 0.45);

        droppedItems.drop(currentItem, 1, spawnPos, throwDir);

        setHotbar((prev) => {
          const next = [...prev];
          next[currentSlot] = 0;
          return next;
        });
        setHeldTile(0);

        const blockDef = BLOCKS.find((b) => b.id === currentItem);
        const name = blockDef?.name || (typeof currentItem === "string" ? currentItem.replace(/_/g, " ") : "Item");
        announce("Dropped item", `Dropped ${name}`);
        playSound("pop");
      };

      const handlePickupItem = (itemId: number | string, count: number) => {
        setHotbar((prev) => {
          const next = [...prev];
          const emptyIndex = next.findIndex((slot) => !slot || slot === 0);
          if (emptyIndex !== -1) {
            next[emptyIndex] = itemId;
            if (slotRef.current === emptyIndex) {
              setHeldTile(itemId);
            }
          } else if (next.length < 9) {
            next.push(itemId);
          }
          return next;
        });

        const blockDef = BLOCKS.find((b) => b.id === itemId);
        const name = blockDef?.name || (typeof itemId === "string" ? itemId.replace(/_/g, " ") : "Item");
        announce("Picked up", `+${count} ${name}`);
        playSound("pop");
      };

      controls = new Controls(renderer.domElement);
      controlsRef.current = controls;
      controls.onDrop = () => {
        dropCurrentHeldItem();
      };
      if (isSkyblockLike) {
        BmgoAudio.startSkyblockBgm();
      }
      controls.onLockChange = (isLocked) => {
        setLocked(isLocked);
        if (isLocked) {
          BmgoAudio.unlock();
          if (isSkyblockLike) BmgoAudio.startSkyblockBgm();
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
        // Project block-selection raycast directly from the camera center into the world,
        // not from the character's chest, so the block highlight always matches exactly where the reticle points.
        _cachedOrigin.copy(camera.position);
        const camDistanceToPlayer = camera.position.distanceTo(player.position);
        const maxRange = 6.5 + (thirdRef.current ? camDistanceToPlayer : 0);
        const hit = raycastVoxel(world, _cachedOrigin, aimDir(), maxRange);
        if (hit) {
          // Verify reach distance from player
          const reachDist = Math.hypot(
            hit.x + 0.5 - player.position.x,
            hit.y + 0.5 - player.eyeY,
            hit.z + 0.5 - player.position.z,
          );
          if (reachDist <= 7.2) {
            return hit;
          }
        }
        return null;
      };

      const gravity = new BlockGravity(world!, (gx, gy, gz, gid) => {
        syncBlock(gx, gy, gz, gid);
        if (renderer) renderer.shadowMap.needsUpdate = true;
      });

      // ── Gameplay features: items, TNT, fall damage, shield, bridge assist ──
      const setBlockSynced = (x: number, y: number, z: number, id: number) => {
        if (!world) return;
        const previous = world.get(x, y, z);
        world.set(x, y, z, id);
        socket?.sendBlockUpdate({ x, y, z, id });
        if (renderer) renderer.shadowMap.needsUpdate = true;
        gravity.notify(x, y, z);
        // Offline play keeps the local change; the server copy simply isn't updated.
        const rollback = (error: unknown) => {
          void previous;
          console.warn("Block saved locally only (offline):", error);
        };
        if (blockFall) void writeBlockFallBlock({ x, y, z, id }).catch(rollback);
        else if (skyblock) void saveIslandBlockDelta(activeSkyblockIslandId, x, y, z, id === 0 ? null : id);
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
      features.permanentLiquids = true;
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

        if (redDragon && heldItemId !== "dark_magic_staff") {
          const dDist = redDragon.rayHit(eye, dir, stats.reach);
          if (dDist >= 0) {
            redDragon.hurt(landDamage());
            return true;
          }
        }

        // Hit test against the 3 Golden Forger BOSS_001 NPCs
        for (const boss of bossEnemies) {
          if (!boss.alive) continue;
          const bDist = features.rayHitsPlayer(eye, dir, boss.group.position, stats.reach + 0.6);
          if (bDist >= 0) {
            announce("Golden Forger hit", `${Math.max(0, Math.round(boss.hp))} HP remaining`);
            const damage = landDamage();
            const kb = features.knockback(hitDir, stats.knockback, sprinting, chargeMul);
            bossDamage(boss, damage, kb.normalize());
            return true;
          }
        }

        if (!remotes) return false;
        let best: { uid: string; center: THREE.Vector3; d: number } | null = null;
        for (const [uid, e] of remotes.list()) {
          const center = e.current.clone().add(new THREE.Vector3(0, 0.95, 0));
          const d = features.rayHitsPlayer(eye, dir, e.current, stats.reach);
          if (d < 0) continue;
          if (!best || d < best.d) best = { uid, center, d };
        }
        if (!best) return false;
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

      const decrementCurrentSlotCount = () => {
        const currentSlot = slotRef.current;
        const count = hotbarCountsRef.current[currentSlot] ?? 0;
        if (count > 0) {
          const nextCount = count - 1;
          setHotbarCounts((prev) => {
            const next = [...prev];
            next[currentSlot] = nextCount;
            return next;
          });
          if (nextCount <= 0) {
            setHotbar((prev) => {
              const next = [...prev];
              next[currentSlot] = 0;
              return next;
            });
            setHeldTile(0);
            announce("Item Depleted", "Stack finished.");
            playSound("pop");
          }
        }
      };

      /** One sword/staff/fist swing: animation, slash arc, whoosh, fireball and hit test. */
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

        // Dark magic staff shoots glowing pixellated fire projectile with fire.mp3
        if (heldItemId === "dark_magic_staff") {
          const eye = player.position.clone().add(new THREE.Vector3(0, player.eyeY - 0.1, 0));
          spawnStaffFireball(eye, dir);
        }

        const landed = tryMelee();
        if (!landed && heldItemId !== "dark_magic_staff") {
          playSound(typeof heldItemId === "string" ? "air_whoosh" : "air_dig");
        }
        return landed;
      };

      const doPlace = (overrideId?: number | string) => {
        if (!world || !fx) return;
        if (!consumeBedwarsAction()) return;
        if (skyblock && isVisiting) {
          announce("Visiting Mode", "You cannot place blocks on another player's island.");
          return;
        }

        if (skyblock && chestHandleRef.current) {
          // Chest removed
        }

        const id = overrideId ?? hotbarRef.current[slotRef.current];
        if (id === undefined) return;
        // Any swing tries to hit an entity first — with a weapon in hand you
        // never place blocks.
        if (typeof id === "string") {
          if (id === "dark_magic_staff") {
            attack();
            return;
          }
          if ((UTILITY_ITEMS as readonly string[]).includes(id)) {
            swing = 1;
            features.useItem(id, castHit());
            decrementCurrentSlotCount();
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
        socket?.sendBlockUpdate({ x: px, y: py, z: pz, id });
        gravity.notify(px, py, pz);
        if (blockFall) {
          void writeBlockFallBlock({ x: px, py: py, z: pz, id }).catch((error) => {
            console.warn("BlockFall block saved locally only:", error);
          });
        } else if (skyblock) {
          if (!isVisiting) {
            saveIslandBlockDelta(activeSkyblockIslandId, px, py, pz, id);
          }
        } else {
          void writeSandboxBlock({ x: px, y: py, z: pz, id }).catch((error) => {
            console.warn("Sandbox block saved locally only:", error);
          });
        }
        playSound("place");
        if (renderer) renderer.shadowMap.needsUpdate = true;
        fx.spawn("place", new THREE.Vector3(px, py, pz), BLOCKS.find((b) => b.id === id)!.side);
        placePulse = 1;
        if (skyblock && !isVisiting) progression.recordPlace(py);
        decrementCurrentSlotCount();
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
        dropItem: () => void;
      };
      (mount as HTMLDivElement & { __api?: Api }).__api = {
        place: () => doPlace(),
        dropItem: () => dropCurrentHeldItem(),
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
          if (skyblock && isVisiting) {
            announce("Visiting Mode", "You cannot plant seeds on another player's island.");
            return false;
          }
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

      const onFogModeEvt = (e: Event) => {
        const mode = (e as CustomEvent<string>).detail;
        if (mode) applyFogMode(mode);
      };
      window.addEventListener("bm-fog-mode", onFogModeEvt);

      const onQualityEvt = (e: Event) => {
        const q = (e as CustomEvent<RenderQuality | string>).detail as string;
        if (!q) return;
        const targetDpr = getTargetDpr(q);
        renderer.setPixelRatio(targetDpr);
        const w = Math.max(1, mount.clientWidth || window.innerWidth);
        const h = Math.max(1, mount.clientHeight || window.innerHeight);
        renderer.setSize(w, h, false);
        cinematicPost?.setSize(w, h, targetDpr);

        const isLite = q === "lite" || q === "low";
        renderer.shadowMap.enabled = !isLite;
        renderer.shadowMap.needsUpdate = true;

        scene.traverse((obj) => {
          const mesh = obj as THREE.Mesh;
          if (mesh.material) {
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((m) => {
                m.needsUpdate = true;
              });
            } else {
              mesh.material.needsUpdate = true;
            }
          }
        });
      };
      window.addEventListener("bm-quality", onQualityEvt);

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
      // Weather + Deep Mines state. Mine visits override weather with cave embers.
      let currentWeather: Weather = isSkyblockLike ? readWeather() : "clear";
      let playerInMine = false;
      const ambientMode = () => {
        if (!isSkyblockLike) return "off" as const;
        if (playerInMine) return "embers" as const;
        return WEATHER_PRESETS[currentWeather].particles;
      };
      const applyWeather = () => {
        const preset = WEATHER_PRESETS[currentWeather];
        particles.setMode(ambientMode());
        particles.wind = playerInMine ? 0 : preset.drift;
        particles.fallScale = playerInMine ? 1 : preset.fall;
        if (isSkyblockLike) sky?.setCloudCover(preset.cloud);
      };
      applyWeather();
      scene.add(particles.points);
      // Cinematic fire + lava: glowing lava light, rising embers, flame halos.
      // Skyblock only; skipped entirely on the "low" quality preset.
      const fireLavaFx = isSkyblockLike
        ? new FireLavaFx({ scene, world: world!, lowQuality: qualityPref === "low", lightweight: isMaliOrMobileGpu })
        : null;
      if (skyblock) fireLavaFx?.addFlame(1.5, 17.65, 1.5); // starter-island torch
      const onWeather = (e: Event) => {
        currentWeather = (e as CustomEvent<Weather>).detail;
        applyWeather();
      };
      window.addEventListener(WEATHER_EVENT, onWeather);

      const onWindMode = (e: Event) => {
        const mode = (e as CustomEvent<string>).detail as Weather;
        if (mode === "clear" || mode === "windy" || mode === "snow" || mode === "blizzard") {
          currentWeather = mode;
          setWeather(mode);
          applyWeather();
        }
      };
      window.addEventListener("bm-windmode", onWindMode);

      const applyAtmosphere = (mode: string) => {
        if (bedwars) {
          sky.setPurpleNight();
          return;
        }
        sky.setPreset(mode);
        if (!playerInMine) {
          const m = (mode || "").toLowerCase();
          if (m === "tempesta" || m === "storm") {
            particles.setMode("rain");
            particles.wind = 4.5;
            particles.fallScale = 2.2;
          } else if (m === "christmas" || m === "striking_christmas" || m === "natale") {
            particles.setMode("snow");
            particles.wind = 1.0;
            particles.fallScale = 1.0;
          } else if (m === "blood_moon" || m === "bloodmoon") {
            particles.setMode("embers");
            particles.wind = 0.4;
            particles.fallScale = 0.7;
          } else if (m === "aurora" || m === "aurora_borealis") {
            particles.setMode("sparks");
            particles.wind = 0.8;
            particles.fallScale = 0.5;
          } else if (m === "solar_eclipse" || m === "eclipse") {
            particles.setMode("spores");
            particles.wind = 0.3;
            particles.fallScale = 0.4;
          } else if (m === "cinematic" || m === "mystic") {
            particles.setMode("spores");
            particles.wind = 0.2;
            particles.fallScale = 0.5;
          } else if (isSkyblockLike) {
            applyWeather();
          } else if (m === "night") {
            particles.setMode("sparks");
            particles.wind = 0.5;
            particles.fallScale = 0.4;
          } else {
            particles.setMode("off");
          }
        }
      };

      const onAtmosphereEvt = (e: Event) => {
        const mode = (e as CustomEvent<string>).detail;
        applyAtmosphere(mode);
      };
      window.addEventListener("bm-atmosphere", onAtmosphereEvt);
      if (initialAtm && initialAtm !== "day" && initialAtm !== "normal") {
        applyAtmosphere(initialAtm);
      }

      // Dynamic lighting: warm handheld-lantern glow around the player that
      // fades in as night falls, so caves and night islands keep readable depth.
      const playerGlow = new THREE.PointLight(0xffb86b, 0, 13, 1.6);
      scene.add(playerGlow);

      // Dedicated radiant mine ambient light (Hemisphere) to banish cavern darkness
      const mineAmbientLight = new THREE.HemisphereLight(0xfff3e0, 0x6e523e, 0);
      scene.add(mineAmbientLight);

      const mineLights: THREE.PointLight[] = [];
      for (const l of mineArea?.lights ?? []) {
        const light = new THREE.PointLight(l.color, l.intensity, l.distance, 1.4);
        light.castShadow = false;
        light.position.set(l.x, l.y, l.z);
        light.visible = false;
        scene.add(light);
        mineLights.push(light);
      }
      const rewardChests: RewardChests | null = skyblock
        ? new RewardChests({
            scene,
            camera,
            canvas: renderer.domElement,
            playerPosition: () => player.position,
            onNear: (near) => setChestNear(near),
            onOpened: () => {
              document.exitPointerLock?.();
              playAudioUrl(WIN_SFX, 0.9);
              const reward = rollReward();
              collectReward(reward);
              if (reward.itemId) {
                const itemId = reward.itemId;
                setHotbar((prev) => (prev.includes(itemId) ? prev : [...prev, itemId]));
              }
              setRewardChest(reward);
            },
          })
        : null;
      if (rewardChests && world) {
        const chestWorld = world;
        const groundAt = (x: number, z: number) => {
          for (let y = 60; y > 4; y--) if (chestWorld.solid(Math.floor(x), y, Math.floor(z))) return y + 1;
          return null;
        };
        for (const [x, z] of [[1.5, 43.5], [44.5, 6.5]] as const) {
          const y = groundAt(x, z);
          if (y !== null) rewardChests.add(x, y, z, Math.random() * Math.PI * 2);
        }
        // Main island: first two clear grass spots around the spawn.
        let placed = 0;
        for (const [x, z] of [[-5.5, 4.5], [5.5, 5.5], [-4.5, -4.5], [6.5, -6.5], [-7.5, 0.5], [0.5, 7.5], [0.5, -7.5]] as const) {
          if (placed >= 2) break;
          const y = groundAt(x, z);
          if (y === null || y < 14 || y > 22) continue;
          if (world.solid(Math.floor(x), y, Math.floor(z)) || world.solid(Math.floor(x), y + 1, Math.floor(z))) continue;
          rewardChests.add(x, y, z, Math.atan2(-x, -z));
          placed++;
        }
        for (const spot of mineArea?.chestSpots ?? []) rewardChests.add(spot.x, spot.y, spot.z, Math.random() * Math.PI * 2);
      }
      const caveFogColor = new THREE.Color("#382b22");
      let savedFog: { near: number; far: number; color?: THREE.Color } | null = null;
      let islandSpawn: THREE.Vector3 | null = null;
      const setMineState = (next: boolean) => {
        if (next === playerInMine) return;
        playerInMine = next;
        setInMine(next);
        for (const l of mineLights) l.visible = next;
        mineAmbientLight.intensity = next ? 1.4 : 0;
        const fog = scene.fog as THREE.Fog | null;
        if (fog) {
          if (next) {
            savedFog = { near: fog.near, far: fog.far, color: fog.color.clone() };
            fog.color.copy(caveFogColor);
            sky?.setRange(35, 180);
          } else if (savedFog) {
            sky?.setRange(savedFog.near, savedFog.far);
            if (savedFog.color) fog.color.copy(savedFog.color);
            savedFog = null;
          }
        }
        applyWeather();
      };
      const onMineTeleport = () => {
        if (!mineArea || cutsceneRef.current.active) return;
        if (!playerInMine) {
          islandSpawn = player.spawnPoint.clone();
          player.setSpawnPoint(mineArea.spawn.x, mineArea.spawn.y, mineArea.spawn.z);
          setMineState(true);
          announce("Deep Dungeon", "Rich ore lines the walls. The Red Dragon sleeps in the east.", "reward");
          bumpMission("dungeonVisits", 1);
        } else {
          player.setSpawnPoint(islandSpawn ?? new THREE.Vector3(0.5, 17.5, 0.5));
          setMineState(false);
        }
        player.respawn();
        avatar?.resetDeath();
        rig.snap(new THREE.Vector3(player.position.x, player.eyeY + 0.54, player.position.z));
        setVeilToken((v) => v + 1);
        playSound("pop");
        if (renderer) renderer.shadowMap.needsUpdate = true;
        player.frozen = true;
        window.setTimeout(() => {
          if (!cutsceneRef.current.active) player.frozen = false;
        }, 2200);
      };
      window.addEventListener(MINE_TELEPORT_EVENT, onMineTeleport);
      const onMissionDone = (e: Event) => {
        const m = (e as CustomEvent<MissionDef>).detail;
        progression.grantXp(m.xp);
        playAudioUrl(WIN_SFX, 0.7);
      };
      window.addEventListener(MISSION_DONE_EVENT, onMissionDone);

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
          sky?.setTint("#ffffff", 0);
          applyWeather();
          progression.recordEvent(ev.completionXp);
          announce(`${ev.name} ended`, `+${ev.completionXp} XP for taking part`, "reward");
        };
      }
      const camController = new CameraController();
      const rig = camController.rig;
      const facing = camController.facing;
      facing.heading = controls.state.yaw + Math.PI;
      let lastNotice = 0;

      setEngineReady(true);
      setReady(true);
      const csRigPos = new THREE.Vector3();
      const csLook = new THREE.Vector3();
      const csRigQuat = new THREE.Quaternion();
      const finishCutscene = () => {
        if (!cutsceneRef.current.active) return;
        cutsceneRef.current.active = false;
        player.frozen = false;
        setCutsceneOn(false);
      };
      const onSkipCutscene = () => finishCutscene();
      window.addEventListener("qb-skip-cutscene", onSkipCutscene);
      if (skyblock) {
        cutsceneRef.current = { active: true, t: 0 };
        player.frozen = true;
        setCutsceneOn(true);
      }
      setVeilToken((v) => v + 1);
      announce(
        baseplate ? "Welcome to Baseplate" : skyblock ? "Welcome to Skyblock" : blockFall ? "Welcome to Block Fall" : bedwars ? "Welcome to Bedwars" : "Welcome to QBlock",
        baseplate ? "Creative voxel canvas ready" : skyblock ? "Build your island, reach new levels" : blockFall ? "Last one standing wins the round" : undefined,
      );

      const clock = new THREE.Clock();
      let acc = 0;
      let statusAcc = 0;
      let presenceAcc = 0;
      let shadowAcc = 0;
      let visualAcc = 0;
      let frames = 0;
      let footstepT = 0.12;
      let smoothDt = 1 / 60;
      const euler = new THREE.Euler(0, 0, 0, "YXZ");
      // Pre-allocated scratch vectors to eliminate garbage collection stutters on mobile
      const _eye = new THREE.Vector3();
      const _pivot = new THREE.Vector3();
      const _scratchBreakVec = new THREE.Vector3();
      const _scratchChipPos = new THREE.Vector3();
      const _scratchChipNormal = new THREE.Vector3();

      const loop = () => {
        raf = requestAnimationFrame(loop);
        const raw = clock.getDelta();

        // Render every browser frame. High-precision display refresh rate delta (butter-smooth 60/120fps motion)
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
        } else if (isSkyblockLike) {
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
        if (player.landedImpact > 1.8) {
          camController.addLandImpact(player.landedImpact);
          if (player.landedImpact > 9) playSound("place");
        }
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
            if (isSkyblockLike && distToPond < SKYBLOCK_POND.radius + 0.8 && Math.abs(player.position.y - SKYBLOCK_POND_SURFACE.y) < 1.1) {
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
          if (isSkyblockLike && distToPond < SKYBLOCK_POND.radius + 0.8) {
            BmgoAudio.playWaterSplash(0.52);
          } else {
            playSound("jump");
          }
        }

        // Camera Controller Pipeline: rotation smoothing, eye jitter filtering, head bobbing,
        // landing recoil dips, underwater transitions, sprint FOV kick, and voxel spherecast collision.
        const waterSurfaceY = isSkyblockLike ? SKYBLOCK_POND_SURFACE.y + 0.5 : null;
        camController.update(
          dt,
          camera,
          player.position,
          player.eyeY,
          input.yaw,
          input.pitch,
          player.onGround,
          input.sprint,
          input.crouch,
          horizontalSpeed,
          player.bob,
          world,
          thirdRef.current,
          baseFov,
          waterSurfaceY,
        );

        const bobY =
          camController.enableBobbing && player.onGround && !input.crouch && horizontalSpeed > 0.4
            ? Math.sin(player.bob * 2) * (input.sprint ? 0.042 : 0.032) * Math.min(1, horizontalSpeed / 4.5)
            : 0;

        // Skyblock intro: smooth sweeping orbit that descends onto the island
        if (cutsceneRef.current.active) {
          const cs = cutsceneRef.current;
          cs.t += dt;
          csRigPos.copy(camera.position);
          csRigQuat.copy(camera.quaternion);
          const smooth = (v: number) => v * v * (3 - 2 * v);
          const k = Math.min(1, cs.t / CUTSCENE_SECONDS);
          const orbit = smooth(Math.min(1, k / 0.82));
          const ang = -0.6 + orbit * Math.PI * 1.35;
          const radius = 48 - orbit * 28;
          camera.position.set(
            Math.cos(ang) * radius,
            40 - orbit * 18 + Math.sin(cs.t * 0.5) * 0.4,
            Math.sin(ang) * radius,
          );

          csLook.set(0, 17, 0);
          camera.lookAt(csLook);

          const land = smooth(Math.max(0, (k - 0.82) / 0.18));
          if (land > 0) {
            camera.position.lerp(csRigPos, land);
            camera.quaternion.slerp(csRigQuat, land);
          }
          if (k >= 1) finishCutscene();
        }

        if (mineArea) {
          const insideMine = mineArea.contains(player.position.x, player.position.z);
          if (insideMine !== playerInMine) setMineState(insideMine);
        }
        if (isSkyblockLike) {
          const preset = WEATHER_PRESETS[currentWeather];
          const ease = 1 - Math.exp(-dt * 0.6);
          SNOW.uSnow.value += ((playerInMine ? 0 : preset.snowCover) - SNOW.uSnow.value) * ease;
          WIND.uStrength.value += ((playerInMine ? 0.2 : preset.wind) - WIND.uStrength.value) * (1 - Math.exp(-dt * 2));
          if (!playerInMine) particles.wind = preset.drift * (0.7 + Math.sin(clock.elapsedTime * 0.35) * 0.3);
        }

        if (sky) {
          const night = sky.nightAmount;
          playerGlow.intensity = playerInMine ? 9.5 : night * 2.4;
          playerGlow.distance = playerInMine ? 40 : 13;
          playerGlow.color.setHex(playerInMine ? 0xffe6b0 : 0xffb86b);
          playerGlow.visible = playerInMine || night > 0.05;
          if (playerGlow.visible) playerGlow.position.set(player.position.x, player.position.y + 1.6, player.position.z);
        }

        // Combat / Reticle Mode: Character torso and head always lock to the camera yaw when swinging weapons or placing blocks.
        // Idle / Free-look Option: Lets the player rotate camera 360° around character without rotating the character body.
        const isCombatOrPlacing = swing > 0.05 || (mining || controls!.holding.break) || controls!.holding.place;
        const heading = facing.update(
          player.velocity.x,
          player.velocity.z,
          input.yaw + Math.PI,
          isCombatOrPlacing,
          freeLookRef.current,
        );
        if (avatar?.loaded) {
          _avatarPos.set(player.position.x, player.position.y, player.position.z);
          const isSneaking = controls?.touch?.crouch || movementModeRef.current === "crouch";
          avatar.setAlpha(thirdRef.current ? rig.playerAlpha : 1.0);
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

        // ── Block Fall Mechanics ────────────────────��──────────────────────
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
                socket?.sendBlockUpdate({ x: b.x, y: b.y, z: b.z, id: 0 });
                void writeBlockFallBlock({ x: b.x, y: b.y, z: b.z, id: 0 }).catch((error) => {
                  world?.set(b.x, b.y, b.z, b.blockId);
                  socket?.sendBlockUpdate({ x: b.x, y: b.y, z: b.z, id: b.blockId });
                  setMultiplayerError("That block could not be synchronized. Your change was reverted.");
                  console.error("Could not sync BlockFall crumble:", error);
                });
                const blockDef = BLOCKS.find((bl) => bl.id === b.blockId);
                fx?.spawn("break", _scratchBreakVec.set(b.x, b.y, b.z), blockDef?.side || "dirt");
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
        if (verityChar) verityChar.update(dt, camera.position);
        if (remotes) {
          remotes.update(dt, camera.position);
          // Keep every HP bar pinned above its entity; dead ones heal back. Apply entity repulsion.
          for (const [uid, e] of remotes.list()) {
            player.pushEntity(e.current, 0.65);
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
        presenceAcc += dt;
        if (presenceAcc >= 0.05) {
          presenceAcc %= 0.05;
          socket?.updatePresence({
            x: player.position.x,
            y: player.position.y,
            z: player.position.z,
            rotY: heading,
          });
          if (skyblock) {
            void updatePlayerPresence({
              uid: meRef.current.uid,
              name: meRef.current.name,
              username: meRef.current.name,
              profilePhoto: meRef.current.photo,
              x: player.position.x,
              y: player.position.y,
              z: player.position.z,
              rotY: heading,
              islandId: activeSkyblockIslandId,
            });
          } else if (!blockFall && !bedwars) {
            void updateSandboxPresence({
              uid: meRef.current.uid,
              name: meRef.current.name,
              photo: meRef.current.photo,
              frame: meRef.current.frame,
              badges: meRef.current.badges,
              x: player.position.x,
              y: player.position.y,
              z: player.position.z,
              rotY: heading,
            });
          }
        }

        // Refresh shadow map smoothly: at ~8-12fps while moving and periodically when stationary.
        // Prevents heavy GPU depth-pass stalls that cause lag spikes while preserving crisp full-resolution shadows.
        shadowAcc += dt;
        const isMoving = player.velocity.lengthSq() > 0.04;
        const shadowInterval = isMaliOrMobileGpu ? 0.12 : 0.08;
        if ((isMoving && shadowAcc >= shadowInterval) || shadowAcc >= 0.45) {
          shadowAcc = 0;
          if (renderer) renderer.shadowMap.needsUpdate = true;
        }

        // held block placement + swing
        swing = Math.max(0, swing - dt * (heldSword?.visible ? 7.2 : 6.0));
        attackCd = Math.max(0, attackCd - dt);
        updateHitMe(dt);
        updateSwordFx(dt);
        if (staffMixer) staffMixer.update(dt);
        updateBossSystem(dt);
        rewardChests?.update(dt);
        droppedItems.update(dt, player.position, (itemId, count) => {
          handlePickupItem(itemId, count);
        });

        if (heldItemId === "dark_magic_staff") {
          const staffObj = heldSwords.get("dark_magic_staff");
          if (staffObj) {
            staffObj.rotation.y = -0.22 + Math.sin(clock.getElapsedTime() * 3.5) * 0.08;
            staffObj.position.y = Math.sin(clock.getElapsedTime() * 2.8) * 0.012;
          }
        }
        const sw = Math.sin(swing * Math.PI);
        const bp = heldSword?.visible
          ? heldBasePose.item
          : heldHand.visible
            ? heldBasePose.hand
            : heldBasePose.block;

        if (heldHand.visible) {
          // Punching hit animation for bare block hand
          heldRig.position.set(
            bp.px - sw * 0.12,
            bp.py + sw * 0.08 + bobY * 0.5,
            bp.pz - sw * 0.22,
          );
          heldRig.rotation.set(bp.rx - sw * 0.85, bp.ry - sw * 0.35, bp.rz + sw * 0.45);
        } else if (heldSword?.visible) {
          // Responsive diagonal slash with punchy forward thrust
          const arc = swing > 0 ? 1 - swing : 0;
          const cut = Math.sin(arc * Math.PI);
          heldRig.position.set(bp.px - cut * 0.24, bp.py + (swing > 0.7 ? sw * 0.10 : -cut * 0.14) + bobY * 0.5, bp.pz - cut * 0.18);
          heldRig.rotation.set(bp.rx - cut * 1.25, bp.ry + cut * 0.65, bp.rz + cut * 1.05);
        } else {
          heldRig.position.set(bp.px - sw * 0.05, bp.py - sw * 0.1 + bobY * 0.5, bp.pz + sw * 0.08);
          heldRig.rotation.set(bp.rx - sw * 0.7, bp.ry, bp.rz + sw * 0.4);
        }

        // sky (owns fog + lighting)
        sky!.follow(camera.position);
        particles.update(dt, camera.position);
        visualAcc += dt;
        const updateVisualSystems = visualAcc >= 1 / 30;
        if (updateVisualSystems) visualAcc = 0;
        if (updateVisualSystems) sky!.update(dt);
        if (playerInMine) {
          sky!.sunLight.intensity *= 0.12;
          sky!.hemi.intensity *= 0.28;
          sky!.ambient.intensity *= 0.5;
          (scene.fog as THREE.Fog | null)?.color.copy(caveFogColor);
        }
        if (updateVisualSystems) {
          skyEnv?.update(dt, camera, sky!, scene);
          cosmicSky?.update(dt, camera);
        }

        // ── SkyBlock / Baseplate: Animate Wombat Companion & Voxel Props ──
        if (isSkyblockLike) {
          const tNow = clock.getElapsedTime();
          if (wombatMixerRef.current) wombatMixerRef.current.update(dt);

          if (voxelTorchRef.current) {
            voxelTorchRef.current.update(tNow);
          }
          voxelPropsRef.current.forEach((p) => p.update?.(tNow));
          fireLavaFx?.update(dt, tNow, camera, renderer);

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

        // Orbiting Candy Cruiser outside Block Fall stadium windows
        if (candyCruiser) {
          candyCruiserAngle += dt * 0.28;
          // Smooth orbital trajectory ("tragitto") around the arena perimeter outside windows
          const orbitRx = 48; // arena is X: ±30
          const orbitRz = 32; // arena is Z: ±15
          const cx = Math.cos(candyCruiserAngle) * orbitRx;
          const cz = Math.sin(candyCruiserAngle) * orbitRz;
          const cy = 25.5 + Math.sin(candyCruiserAngle * 2.0) * 2.8;
          candyCruiser.position.set(cx, cy, cz);

          // Face tangent to the orbital trajectory path with gentle banking
          const tx = -Math.sin(candyCruiserAngle) * orbitRx;
          const tz = Math.cos(candyCruiserAngle) * orbitRz;
          candyCruiser.rotation.y = Math.atan2(-tz, tx) + Math.PI / 2;
          candyCruiser.rotation.z = Math.sin(candyCruiserAngle * 2.0) * 0.12; // Bank into turn
          candyCruiser.rotation.x = Math.cos(candyCruiserAngle * 2.0) * 0.04;

          if (candyCruiserMixer) {
            candyCruiserMixer.update(dt);
          }

          if (bedwarsLobbyMixer) {
            bedwarsLobbyMixer.update(dt);
          }
        }

        // target highlight
        const hit = castHit();
        let isAimingChest = false;

        if (isAimingChest) {
          highlight.visible = true;
          highlight.position.set(3.0, 16.5, 3.0);
          updateHighlightFace(highlight, null);
        } else if (hit) {
          highlight.visible = true;
          highlight.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
          placePulse = Math.max(0, placePulse - dt * 6);
          highlight.scale.setScalar(1 + placePulse * 0.1);
          updateHighlightFace(highlight, hit);
        } else {
          highlight.visible = false;
          updateHighlightFace(highlight, null);
        }

        // ── hold-to-mine or chest interaction ──────────────
        const wantMine = mining || controls!.holding.break;
        if (!wantMine && features.chargeT > 0) {
          chargeMul = features.releaseCharge();
          attack();
          chargeMul = 0;
          if (mineBarRef.current) mineBarRef.current.style.width = "0%";
          setMiningProgress(0);
          setMiningBlockInfo(null);
        }

        if (isAimingChest && (wantMine || controls!.holding.place)) {
          setChestOpen(true);
          controls!.holding.break = false;
          controls!.holding.place = false;
          mineKey = null;
          mineT = 0;
          crackMesh.visible = false;
          if (mineBarRef.current) mineBarRef.current.style.width = "0%";
          setMiningProgress(0);
          setMiningBlockInfo(null);
        } else if (wantMine && !hit) {
          // Empty air: swords charge/strike; other tools attack; bare hand punches air
          if (typeof heldItemId === "string") {
            if (SWORD_STATS[heldItemId]) {
              const charge = features.charging(dt);
              if (mineBarRef.current) mineBarRef.current.style.width = `${charge * 100}%`;
            } else {
              attack();
            }
          } else {
            if (swing < 0.25) {
              swing = 1;
              playSound("air_dig");
            }
          }
          mineKey = null;
          mineT = 0;
          crackMesh.visible = false;
          if (mineBarRef.current) mineBarRef.current.style.width = "0%";
          setMiningProgress(0);
          setMiningBlockInfo(null);
        } else if (wantMine && hit) {
          const def = BLOCKS.find((b) => b.id === hit.id);
          const hardness = def?.hardness ?? 1;

          if (hardness < 0) {
            crackMesh.visible = false;
            setMiningProgress(0);
            setMiningBlockInfo(null);
          } else if (skyblock && isVisiting) {
            announce("Visiting Mode", "You cannot break blocks on another player's island.");
            mining = false;
            if (controls) controls.holding.break = false;
            crackMesh.visible = false;
            setMiningProgress(0);
            setMiningBlockInfo(null);
          } else {
            // Target cancellation: if aim changed to a new block coordinate, reset progress
            const key = `${hit.x},${hit.y},${hit.z}`;
            if (key !== mineKey) {
              mineKey = key;
              mineT = 0;
            }

            // Tool speeds and hardness mechanics
            const currentSlot = slotRef.current;
            const heldItem = hotbarRef.current[currentSlot];
            const toolDef = getToolDefinition(heldItem);
            const preferredCategory = getBlockPreferredTool(hit.id, def?.name ?? "");
            const speedMultiplier = calculateMiningSpeed(toolDef, preferredCategory);

            // Responsive break time calculation
            const baseTime = Math.max(0.18, hardness * 0.7);
            const breakTime = Math.max(0.08, baseTime / speedMultiplier);

            const oldP = Math.min(1, mineT / breakTime);
            mineT += dt;
            const p = Math.min(1, mineT / breakTime);

            // Progressive breaking stages & sound/particles feedback
            const oldStage = Math.floor(oldP * CRACK_STAGES);
            const newStage = Math.floor(p * CRACK_STAGES);
            const soundMat = getBlockSoundMaterial(hit.id, def?.name ?? "");

            if (newStage > oldStage && p < 1) {
              playSound("mine_tick", soundMat);
              // Face-aligned chip particles
              _scratchChipPos.set(hit.x, hit.y, hit.z);
              _scratchChipNormal.set(hit.nx, hit.ny, hit.nz);
              fx!.spawnChips(_scratchChipPos, _scratchChipNormal, def?.side || "stone", 4);
              if (typeof navigator !== "undefined" && navigator.vibrate) {
                try {
                  navigator.vibrate(10);
                } catch {}
              }
            }

            if (swing < 0.35) swing = 1;

            crackMesh.visible = p > 0.03;
            crackMesh.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
            // Subtle stress shake
            const shake = Math.sin(mineT * 48) * 0.015 * p;
            crackMesh.position.x += shake;
            crackMesh.position.z += Math.cos(mineT * 42) * 0.015 * p;
            crackMesh.scale.setScalar(1 + p * 0.04);
            crackTex.offset.x = Math.min(CRACK_STAGES - 1, newStage) / CRACK_STAGES;

            if (mineBarRef.current) mineBarRef.current.style.width = `${p * 100}%`;
            setMiningProgress(p);
            setMiningBlockInfo({
              name: def?.name || "Block",
              hardness,
              toolSpeed: speedMultiplier,
              toolName: toolDef?.name || "Bare Hand",
            });

            // Block successfully mined
            if (p >= 1) {
              const oldId = world!.get(hit.x, hit.y, hit.z);
              playSound("break", soundMat);
              fx!.spawn("break", _scratchBreakVec.set(hit.x, hit.y, hit.z), def?.side || "stone", 24);
              world!.set(hit.x, hit.y, hit.z, 0);
              socket?.sendBlockUpdate({ x: hit.x, y: hit.y, z: hit.z, id: 0 });
              gravity.notify(hit.x, hit.y, hit.z);
              features.forgetMining();

              // Correct 3D item drops
              const dropId = getBlockDrop(oldId);
              if (dropId !== null && droppedItemsRef.current) {
                const dropPos = new THREE.Vector3(hit.x + 0.5, hit.y + 0.45, hit.z + 0.5);
                const popVel = new THREE.Vector3(
                  (Math.random() - 0.5) * 1.6,
                  2.5,
                  (Math.random() - 0.5) * 1.6
                );
                droppedItemsRef.current.drop(dropId, 1, dropPos, popVel);
              }

              // Tool durability integration
              if (toolDef) {
                const slotIdx = currentSlot;
                const currentDur = toolDurabilitiesRef.current[slotIdx];
                if (currentDur) {
                  const nextVal = currentDur.current - 1;
                  if (nextVal <= 0) {
                    playSound("tool_break");
                    announce("Tool Shattered!", `Your ${toolDef.name} broke from exhaustion.`);
                    setHotbar((prev) => {
                      const next = [...prev];
                      next[slotIdx] = 0;
                      return next;
                    });
                    setHeldTile(0);
                    setToolDurabilities((prev) => {
                      const copy = { ...prev };
                      delete copy[slotIdx];
                      return copy;
                    });
                  } else {
                    setToolDurabilities((prev) => ({
                      ...prev,
                      [slotIdx]: { ...currentDur, current: nextVal },
                    }));
                  }
                }
              }

              if (isSkyblockLike && !isVisiting) progression.recordMine();
              if (isSkyblockLike && !isVisiting) nature.rollDrop(oldId);
              if (!blockFall) nature.onLogMined(hit.x, hit.y, hit.z, oldId, player.position);
              if (renderer) renderer.shadowMap.needsUpdate = true;

              if (blockFall) {
                void writeBlockFallBlock({ x: hit.x, y: hit.y, z: hit.z, id: 0 }).catch((error) => {
                  console.warn("Could not sync mined block:", error);
                });
              } else if (skyblock) {
                if (!isVisiting) {
                  saveIslandBlockDelta(activeSkyblockIslandId, hit.x, hit.y, hit.z, null);
                }
              } else {
                void writeSandboxBlock({ x: hit.x, y: hit.y, z: hit.z, id: 0 }).catch((error) => {
                  console.warn("Could not sync mined block:", error);
                });
              }

              mineKey = null;
              mineT = 0;
              crackMesh.visible = false;
              if (mineBarRef.current) mineBarRef.current.style.width = "0%";
              setMiningProgress(0);
              setMiningBlockInfo(null);
            }
          }
        } else {
          mineKey = null;
          mineT = 0;
          crackMesh.visible = false;
          if (mineBarRef.current) mineBarRef.current.style.width = "0%";
          setMiningProgress(0);
          setMiningBlockInfo(null);
        }

        chestHandleRef.current?.update(dt);

        // ── place with a cooldown so held input doesn't spam ──────────────
        placeCd = Math.max(0, placeCd - dt);
        if (controls!.holding.place && placeCd === 0) {
          doPlace();
          placeCd = 0.18;
        }

        fx!.update(dt);
        gravity.tick(dt);
        world!.update(blockFall ? 2 : 3, player.position, camera);
        WIND.uTime.value += dt;
        if (updateVisualSystems) grassField?.update(dt);
        if (matchmaker && matchmakerTag) {
          const toPlayer = Math.atan2(player.position.x - matchmakerPos.x, player.position.z - matchmakerPos.z);
          matchmaker.update(dt, matchmakerPos, toPlayer, 0, true, false);
          matchmakerTag.update(camera.position);
        }
        combatFx.update(dt);
        if (updateVisualSystems) nature.update(dt, clock.elapsedTime);
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
        window.removeEventListener(WEATHER_EVENT, onWeather);
        window.removeEventListener(MINE_TELEPORT_EVENT, onMineTeleport);
        window.removeEventListener(MISSION_DONE_EVENT, onMissionDone);
        rewardChests?.dispose();
        droppedItems.dispose();
        droppedItemsRef.current = null;
        if (verityChar) {
          scene.remove(verityChar.group);
          verityChar.group.traverse((o) => {
            const m = o as THREE.Mesh;
            if (m.isMesh) {
              m.geometry.dispose();
              if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
              else m.material.dispose();
            }
          });
        }
        redDragon?.dispose();
        for (const l of mineLights) l.dispose();
        mineAmbientLight.dispose();
        SNOW.uSnow.value = 0;
        WIND.uStrength.value = 1;
        window.removeEventListener("qb-skip-cutscene", onSkipCutscene);
        cutsceneRef.current.active = false;
        playerGlow.dispose();
        window.removeEventListener("bm-fov", onFovEvt);
        window.removeEventListener("bm-atmosphere", onAtmosphereEvt);
        window.removeEventListener("bm-fog-mode", onFogModeEvt);
        window.removeEventListener("bm-quality", onQualityEvt);
        if (stopWaterAudio) stopWaterAudio();
        features.dispose();
        featuresRef.current = null;
        particles.dispose();
        fireLavaFx?.dispose();
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
        if (disposed) return;
        console.error("Sandbox engine initialization error:", err);
        setGraphicsError(
          err instanceof Error
            ? err.message
            : "Failed to initialize game world. Please try refreshing.",
        );
      }
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      (mount as HTMLDivElement & { __cleanup?: () => void }).__cleanup?.();
      controls?.dispose();
      unsubPresence?.();
      unsubFirestorePresence?.();
      unsubWorld?.();
      unsubSocketStatus?.();
      unsubSocketError?.();
      socket?.disconnect();
      if (skyblock) {
        void clearPlayerPresence(meRef.current.uid);
      }
      unsubChat?.();
      remotes?.dispose();
      selfSayCleanup?.();
      selfTag?.dispose();
      avatar?.dispose();
      avatarInstanceRef.current = null;
      droppedItemsRef.current?.dispose();
      droppedItemsRef.current = null;
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
      if (bedwarsLobbyMixer) {
        bedwarsLobbyMixer.stopAllAction();
        bedwarsLobbyMixer = null;
      }
      if (candyCruiser) {
        candyCruiserMixer?.stopAllAction();
        candyCruiserMixer = null;
        scene.remove(candyCruiser);
        candyCruiser.traverse((child) => {
          const m = child as THREE.Mesh;
          if (m.isMesh) {
            m.geometry?.dispose();
            if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
            else m.material?.dispose();
          }
        });
        candyCruiser = null;
      }
      if (cell99Model) {
        scene.remove(cell99Model);
        cell99Model.traverse((object) => {
          const mesh = object as THREE.Mesh;
          if (!mesh.isMesh) return;
          mesh.geometry?.dispose();
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materials.forEach((material) => material.dispose());
        });
        cell99Model = null;
      }
      window.removeEventListener("qb-reset-island", onResetIsland);
      world?.dispose();
      BmgoAudio.stopBgm();
      // The icon renderer is a second WebGL context. Release it here too in case
      // this effect is torn down before every sword icon has finished rendering.
      if (iconRenderer) {
        iconRenderer.dispose();
        iconRenderer.forceContextLoss();
        iconRenderer = null;
      }
      if (renderer) {
        renderer.dispose();
        // dispose() frees GPU resources but NOT the browser's WebGL context.
        // Browsers cap live contexts (especially on phones), so without this the
        // game fails to start after a few launches ("Sandbox unavailable").
        renderer.forceContextLoss();
        renderer.domElement.remove();
      }
    };
  }, [qbUser?.uid, goldenDays, skyblock, baseplate, blockFall]);

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
            dropItem: () => void;
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
        controlsRef.current.sensitivity = 0.0032 * (v / 50);
    };
    const onCamSens = (e: Event) => {
      const v = Number((e as CustomEvent).detail);
      if (controlsRef.current && Number.isFinite(v) && v > 0)
        controlsRef.current.sensitivity = 0.0032 * v;
    };
    const onHud = (e: Event) => setShowHud(Boolean((e as CustomEvent).detail));
    window.addEventListener("bm-sensitivity", onSens);
    window.addEventListener("bm-cam-sensitivity", onCamSens);
    window.addEventListener("bm-hud", onHud);
    return () => {
      window.removeEventListener("bm-sensitivity", onSens);
      window.removeEventListener("bm-cam-sensitivity", onCamSens);
      window.removeEventListener("bm-hud", onHud);
    };
  }, []);

  // Broadcast modal active state so D-pad and ActionCluster automatically hide
  useEffect(() => {
    const anyOpen = inventoryOpen || settingsOpen || chatOpen || chestOpen || wheelOpen || quickBuyOpen || showQuitDialog;
    window.dispatchEvent(new CustomEvent("bm-modal-active", { detail: { open: anyOpen } }));
  }, [inventoryOpen, settingsOpen, chatOpen, chestOpen, wheelOpen, quickBuyOpen, showQuitDialog]);

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
  const TAP_SLOP = 24;
  const TAP_MS = 200;
  const isTouchMiningRef = useRef(false);

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
    isTouchMiningRef.current = false;
    holdTimer.current = window.setTimeout(() => {
      isTouchMiningRef.current = true;
      api()?.setMining(true);
    }, 220);
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
        // Only cancel if hold timer hasn't fired yet
        if (!isTouchMiningRef.current) {
          clearHold();
        }
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
    isTouchMiningRef.current = false;
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

  const isV2 = isSkyblockLike || blockFall || bedwars;
  const matchState = useStore(match.store);
  const progressState = useStore(progression.store);
  const backpack: (number | string)[] = isSkyblockLike
    ? [...(skyblock && !staffOwned ? [] : ["dark_magic_staff"]), ...STARTER_BACKPACK, ...progressState.unlockedBlocks, ...crafted, ...NEW_BACKPACK_ITEMS]
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

  // Unified Action Button: Hold = break/attack, Tap = build, Double-tap = drop item
  const actionPressTimeRef = useRef(0);
  const actionHoldingMiningRef = useRef(false);
  const actionLastTapTimeRef = useRef(0);
  const actionHoldTimerRef = useRef<number | null>(null);

  const handleSmartAction = useCallback((down: boolean) => {
    if (down) {
      actionPressTimeRef.current = Date.now();
      actionHoldingMiningRef.current = false;
      if (actionHoldTimerRef.current) window.clearTimeout(actionHoldTimerRef.current);
      actionHoldTimerRef.current = window.setTimeout(() => {
        actionHoldingMiningRef.current = true;
        handleMine(true);
      }, 220);
    } else {
      if (actionHoldTimerRef.current) {
        window.clearTimeout(actionHoldTimerRef.current);
        actionHoldTimerRef.current = null;
      }
      if (actionHoldingMiningRef.current) {
        actionHoldingMiningRef.current = false;
        handleMine(false);
      } else {
        const now = Date.now();
        const sinceLastTap = now - actionLastTapTimeRef.current;
        if (sinceLastTap < 340) {
          actionLastTapTimeRef.current = 0;
          api()?.dropItem();
        } else {
          actionLastTapTimeRef.current = now;
          handleBuild();
        }
      }
    }
  }, [handleMine, handleBuild, api]);

  useEffect(() => {
    const onDropActive = () => {
      api()?.dropItem();
    };
    window.addEventListener("qb-drop-active-item", onDropActive);
    return () => window.removeEventListener("qb-drop-active-item", onDropActive);
  }, [api]);

  const totalSeeds = seeds.oak + seeds.birch + seeds.spruce;
  const v2Actions: HudAction[] = blockFall
    ? [{ id: "jump", label: "Jump", kind: "hold", primary: true, icon: HUD_UI.jump, onPress: setJump }]
    : [
        { id: "jump", label: "Jump", kind: "hold", primary: true, icon: HUD_UI.jump, onPress: setJump },
        {
          id: "action",
          label: isMiningActive ? "Break" : "Action",
          kind: "hold",
          onPress: handleSmartAction,
        },
        ...(isSkyblockLike && totalSeeds > 0
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



      {skyblock && <HurtVignette hp={playerHp} />}
      {skyblock && ready && loadingDismissed && !cutsceneOn && !showClickToPlay && (
        <SkyblockHudColumn hp={playerHp} state={missionState} />
      )}
      {skyblock && ready && loadingDismissed && !showClickToPlay && inMine && dragonHud.engaged && (
        <DragonBossBar hp={dragonHud.hp} max={dragonHud.max} />
      )}
      {skyblock && ready && loadingDismissed && !showClickToPlay && chestNear && !rewardChest && !cutsceneOn && (
        <ChestHint />
      )}
      {skyblock && ready && loadingDismissed && !showClickToPlay && missionToast && (
        <MissionCompleteToast mission={missionToast} />
      )}
      {skyblock && tpCine && <TeleportCinematic to={tpCine} />}
      {skyblock && rewardChest && <ChestRewardModal reward={rewardChest} onClose={() => setRewardChest(null)} />}
      {skyblock && welcomeOpen && !cutsceneOn && !showClickToPlay && <NpcDialogue onDone={closeWelcome} />}

      {cutsceneOn && (
        <SkyblockCutscene
          onSkip={() => window.dispatchEvent(new Event("qb-skip-cutscene"))}
        />
      )}

      {/* ── FLOATING TOP BAR (Filled Icons + Translucent Login / Sign Up) ── */}
      {ready && !skyblock && !blockFall && !bedwars && !baseplate && (
        <header className="fixed top-[max(12px,calc(env(safe-area-inset-top)+8px))] inset-x-3 z-[200] pointer-events-none flex items-center justify-between">
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
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  controlsRef.current?.exitLock();
                  setChatOpen(true);
                }}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setChatOpen(true);
                }}
                className="pointer-events-auto h-9 w-9 touch-manipulation rounded-xl flex items-center justify-center text-white/90 hover:text-white hover:bg-white/15 active:scale-95 transition"
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
      {ready && isV2 && loadingDismissed && !cutsceneOn && (
        <V2GameHud
          isTouch={isTouch}
          running={movementMode === "run"}
          thirdPerson={thirdPerson}
          muted={bgmMuted}
          hasHotbar={(isSkyblockLike || bedwars) && hotbar.length > 0}
          actions={v2Actions}
          topCenter={
            blockFall ? (
              <BlockFallStatus match={match} />
            ) : bedwars ? null : skyblock ? (
              <SkyblockStatus
                progression={progression}
                events={worldEvents}
                isVisiting={isVisiting}
                visitingOwnerName={visitingOwnerName}
                playerName={meRef.current.name}
              />
            ) : null
          }
          menuExtra={
            isSkyblockLike
              ? [
                  ...(isVisiting
                    ? [
                        {
                          label: "Return to My Island",
                          onSelect: () => {
                            const url = new URL(window.location.href);
                            url.searchParams.delete("visit");
                            window.location.href = url.toString();
                          },
                        },
                      ]
                    : []),
                  { label: baseplate ? "Respawn in Cell 99" : "Respawn on island", onSelect: () => window.dispatchEvent(new Event("qb-menu-respawn")) },
                  {
                    label: `Weather: ${WEATHER_PRESETS[weather].label}`,
                    onSelect: () => setWeather(WEATHER_ORDER[(WEATHER_ORDER.indexOf(weather) + 1) % WEATHER_ORDER.length]),
                  },
                  ...(skyblock
                    ? [{ label: inMine ? "Return to island" : "Teleport to Deep Dungeon", onSelect: requestTeleport }]
                    : []),
                ]
              : []
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
          freeLook={freeLook}
          onToggleFreeLook={toggleFreeLook}
          onLeave={() => {
            controlsRef.current?.exitLock();
            setShowQuitDialog(true);
          }}
          onMenuChange={(open) => {
            setPauseMenuOpen(open);
            if (open) controlsRef.current?.exitLock();
          }}
        >
          {(isSkyblockLike || bedwars) && (
            <>
              <CinematicVignette />
              {totalSeeds > 0 && (
                <SeedPouch seeds={seeds} selected={seedSpecies} onSelect={setSeedSpecies} />
              )}
              {isSkyblockLike && (
                <BlockfortSkyblockUi
                  hideHudButtons={baseplate}
                  hotbar={hotbar}
                  tileUrls={tileUrls}
                  currentVisitingId={typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("visit") : null}
                  onVisitIsland={(targetId) => {
                    const url = new URL(window.location.href);
                    url.searchParams.set("visit", targetId);
                    window.location.href = url.toString();
                  }}
                  onReturnHome={() => {
                    const url = new URL(window.location.href);
                    url.searchParams.delete("visit");
                    window.location.href = url.toString();
                  }}
                  onEquipHotbar={(b) => {
                    const currentSlot = slotRef.current;
                    setHotbar((prev) => {
                      const next = [...prev];
                      next[currentSlot] = b;
                      return next;
                    });
                    setHotbarCounts((prev) => {
                      const next = [...prev];
                      next[currentSlot] = typeof b === "number" ? 64 : ((UTILITY_ITEMS as readonly string[]).includes(b) ? 16 : 1);
                      return next;
                    });
                    api()?.setHeldTile(b);
                  }}
                  onOpenSettings={() => {
                    controlsRef.current?.exitLock();
                    setSettingsOpen(true);
                  }}
                />
              )}
              <V2Hotbar
                hotbar={hotbar}
                counts={hotbarCounts}
                durabilities={toolDurabilities}
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

      {/* ── Active Mining Target Card & Progress Bar ── */}
      {miningBlockInfo && miningProgress > 0 && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed left-1/2 bottom-[115px] -translate-x-1/2 z-[150] flex flex-col items-center gap-1.5 px-4 py-2 rounded-2xl bg-black/75 backdrop-blur-md border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.6)] animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-white">
            <span className="text-amber-400 font-extrabold">{miningBlockInfo.name}</span>
            <span className="text-white/40">•</span>
            <span className="text-emerald-300 font-mono text-[11px] flex items-center gap-1">
              <span>⛏️</span>
              <span>{miningBlockInfo.toolName} ({miningBlockInfo.toolSpeed.toFixed(1)}x)</span>
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-48 h-2 rounded-full bg-white/15 overflow-hidden p-[1px]">
            <div
              ref={mineBarRef}
              className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-400 shadow-[0_0_10px_rgba(245,158,11,0.8)] transition-all duration-75"
              style={{ width: `${Math.round(miningProgress * 100)}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-white/60">
            {Math.round(miningProgress * 100)}%
          </span>
        </div>
      )}

      {/* ── Central Aim Reticle & Circular Progress Ring ── */}
      {ready && !cutsceneOn && (
        <Crosshair progress={miningProgress} visible={!pauseMenuOpen && !chatOpen && !settingsOpen} />
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
      {ready && blockFall && loadingDismissed && (
        <BlockFallOverlays
          match={match}
          onLeave={() => setShowQuitDialog(true)}
        />
      )}
      {ready && isV2 && veilToken > 0 && loadingDismissed && <V2Veil token={veilToken} />}
      {showClickToPlay && loadingDismissed && !cutsceneOn && (
        <V2ClickToPlay
          title={baseplate ? "Cell 99" : skyblock ? "Skyblock" : bedwars ? "Bedwars" : "Block Fall"}
          hint={
            baseplate
              ? "Build, experiment and explore freely in Cell 99"
              : skyblock
                ? "Build, mine and grow your island"
                : bedwars
                  ? "Explore the lobby and meet the Matchmaker"
                  : "Stay on the platforms longer than everyone else"
          }
          onPlay={() => controlsRef.current?.requestLock()}
        />
      )}

      {/* ── Bedwars HUD (Main HUD) ── */}
      {ready && !isV2 && !cutsceneOn && (
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
      {!loadingDismissed && !graphicsError && isV2 && (
        <V2LoadingScreen
          progress={progress}
          isAssetsLoaded={engineReady}
          onFinished={() => setLoadingDismissed(true)}
        />
      )}
      {!ready && !graphicsError && !isV2 && (
        <div className="fixed inset-0 z-[95] grid place-items-center bg-white">
          <div className="flex flex-col items-center">
            <p className="mb-16 text-[24px] font-extrabold tracking-tight text-[#16181d]">
              Connecting…
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
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 mr-2 inline-flex h-10 items-center justify-center rounded-full bg-[#16181d] px-5 text-[12px] font-extrabold text-white"
            >
              Try again
            </button>
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
      {!chatOpen && showHud && (
        <div className="pointer-events-auto fixed left-[10px] top-[6px] z-[90]">
          <ChatPreview onOpen={() => setChatOpen(true)} />
        </div>
      )}
      {chatOpen && (
        <div className="pointer-events-auto fixed inset-0 z-[100001]">
          <SandboxChat onClose={() => setChatOpen(false)} />
        </div>
      )}
      {inspectUser && (
        <UserSquareCardModal
          user={inspectUser}
          onClose={() => setInspectUser(null)}
          onVisit={() => {
            const targetUid = inspectUser.uid;
            setInspectUser(null);
            if (targetUid) {
              const url = new URL(window.location.href);
              url.searchParams.set("visit", targetUid);
              window.location.href = url.toString();
            }
          }}
        />
      )}

      {settingsOpen && (
        <FlatSquareSettingsModal
          onClose={() => setSettingsOpen(false)}
          controlsScale={controlsScale}
          onControlsScaleChange={setControlsScale}
          showWeather={isSkyblockLike}
        />
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
