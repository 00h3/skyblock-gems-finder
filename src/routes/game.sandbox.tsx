import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkinnedModel } from "three/examples/jsm/utils/SkeletonUtils.js";
import { buildAtlas, type Atlas } from "@/engine/textures";
import { World, BLOCKS } from "@/engine/world";
import { Player } from "@/engine/player";
import { Controls } from "@/engine/controls";
import { BlockFx, createHighlight, raycastVoxel } from "@/engine/interact";
import { Sky } from "@/engine/sky";
import { Avatar } from "@/engine/avatar";
import { CRACK_STAGES } from "@/engine/textures";
import { Link } from "@tanstack/react-router";
import { SandboxChat } from "@/components/SandboxChat";
import { openFragments } from "@/lib/fragments-ui";
import { SandboxSettings } from "@/components/SandboxSettings";
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
 * Hypixel-style SkyBlock starting island:
 * A fairly large organic floating L-shaped island floating high in the sky.
 * Top grass surface at Y = 16.
 * Contains ONLY:
 * - A floating grass island (dirt core, stone/cobble bedrock tapered bottom)
 * - Exactly ONE tree (oak log + leaves)
 * - Exactly ONE chest (with starter supplies)
 * Nothing else (no NPCs, mobs, shops, or extra buildings).
 */
function buildSkyblockIsland(world: World) {
  const surfaceY = 16;
  const bottomTipY = 6;

  // Fairly large, spacious island footprint (~24 x 20 blocks)
  for (let x = -13; x <= 14; x++) {
    for (let z = -13; z <= 14; z++) {
      const dMain = Math.hypot(x, z);
      const dExt = Math.hypot(x - 6, z - 5);
      const inIsland = dMain <= 9.4 || dExt <= 6.5 || (x >= -2 && x <= 8 && z >= -2 && z <= 7);
      if (!inIsland) continue;

      // Distance from edge: determines island depth tapering towards the center
      const edgeDist = Math.max(9.4 - dMain, 6.5 - dExt, 0);
      const islandDepth = Math.round(2 + edgeDist * 1.15);
      const bottomY = Math.max(bottomTipY, surfaceY - islandDepth);

      for (let y = bottomY; y <= surfaceY; y++) {
        let blockId = 2; // Dirt
        if (y === surfaceY) {
          blockId = 1; // Grass
        } else if (y === bottomY) {
          blockId = edgeDist > 5 ? 12 : 3; // Bedrock core or stone tip
        } else if (y < surfaceY - 2) {
          blockId = (x + y + z) % 3 === 0 ? 4 : 3; // Cobblestone & stone underside
        }
        world.set(x, y, z, blockId);
      }
    }
  }

  // Exactly ONE Tree at (-4, 16, -4):
  // 6-block tall Oak Log trunk (id: 7)
  for (let y = 17; y <= 22; y++) {
    world.set(-4, y, -4, 7);
  }
  // Full lush canopy of Oak Leaves (id: 9)
  for (let dy = 0; dy <= 3; dy++) {
    const y = 20 + dy;
    const r = dy < 2 ? 2 : 1;
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        if (Math.abs(dx) === r && Math.abs(dz) === r && dy !== 0) continue;
        if (world.get(-4 + dx, y, -4 + dz) === 0) {
          world.set(-4 + dx, y, -4 + dz, 9);
        }
      }
    }
  }
  // Top tip of tree
  world.set(-4, 24, -4, 9);

  // Decorative Starter Island Accents
  world.set(1, 16, 1, 4); // Cobblestone
  world.set(1, 16, 2, 14); // Mossy Cobblestone
  world.set(2, 16, 1, 4); // Cobblestone
  world.set(-1, 17, 4, 26); // Starter Pumpkin
  world.set(5, 16, 2, 17); // Starter Ice Block
  world.set(-4, 25, -4, 18); // Tree-top Glowstone Lantern
}

export const BLOCK_FALL_PLATFORM_LEVELS = [36, 29, 22, 15, 8] as const;

export const BLOCK_FALL_BOT_CONFIGS: { name: string; color: string }[] = [];

export function buildBlockFallArena(world: World) {
  const minX = -10;
  const maxX = 10;
  const minZ = -26;
  const maxZ = 26;
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
  const pMinX = -8;
  const pMaxX = 8;
  const pMinZ = -24;
  const pMaxZ = 24;

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
  light.castShadow = true;
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
}: {
  goldenDays?: boolean;
  skyblock?: boolean;
  blockFall?: boolean;
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
        ? [7, 9, 2, 4, 6, 13, 1, 3]
        : blockFall
          ? []
          : [1, 2, 3, 4, 5, 6, 7, 9, 10],
  );
  const [blockFallState, setBlockFallState] = useState<"waiting" | "playing" | "eliminated">(
    blockFall ? "playing" : "waiting",
  );
  const blockFallStateRef = useRef<"waiting" | "playing" | "eliminated">(
    blockFall ? "playing" : "waiting",
  );
  blockFallStateRef.current = blockFallState;
  const [countdown, setCountdown] = useState(10);
  const [currentLevel, setCurrentLevel] = useState(1);
  const currentLevelRef = useRef(1);
  const [survivalTime, setSurvivalTime] = useState(0);
  const [deepestFloor, setDeepestFloor] = useState(1);
  const [aliveBotsCount, setAliveBotsCount] = useState(0);
  const [bgmMuted, setBgmMuted] = useState(false);
  const restartBlockFallRef = useRef<(() => void) | null>(null);

  // Countdown timer for Waiting for Players lobby
  useEffect(() => {
    if (!blockFall || blockFallState !== "waiting") return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setBlockFallState("playing");
          blockFallStateRef.current = "playing";
          BmgoAudio.unlock();
          BmgoAudio.startBlockFallBgm();
          BmgoAudio.playGameStart();
          return 0;
        }
        playSound("pop");
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [blockFall, blockFallState]);

  // Survival timer during match
  useEffect(() => {
    if (!blockFall || blockFallState !== "playing") return;
    const timer = setInterval(() => {
      setSurvivalTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [blockFall, blockFallState]);

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
  const [playerHunger, setPlayerHunger] = useState(20);
  const [runesTimeLeft, setRunesTimeLeft] = useState(600);
  const [hud, setHud] = useState({ fps: 0, x: 0, y: 0, z: 0 });
  const [showHud, setShowHud] = useState(true);
  const [tileUrls, setTileUrls] = useState<Record<number | string, string>>({});
  const touchLook = useRef<{ id: number; x: number; y: number } | null>(null);
  const joyRef = useRef<HTMLDivElement>(null);
  const [joyNub, setJoyNub] = useState({ x: 0, y: 0 });
  const [thirdPerson, setThirdPerson] = useState(true);
  const [avatarReady, setAvatarReady] = useState(false);
  const thirdRef = useRef(true);

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

  useEffect(() => {
    if (!skyblock || !skyRef.current) return;
    if (celestialNight) {
      skyRef.current.setNight();
      if (celestialSunRef.current) celestialSunRef.current.visible = false;
      if (celestialMoonRef.current) celestialMoonRef.current.visible = true;
      if (auroraGroupRef.current) auroraGroupRef.current.visible = true;
      // Glowing phoenix remains soaring as a fiery celestial beacon at night
      if (phoenixModelRef.current) phoenixModelRef.current.visible = true;
    } else {
      skyRef.current.setNormalDay();
      skyRef.current.setRange(10, 350);
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
    let guestId = "guest";
    if (typeof window !== "undefined") {
      guestId = window.sessionStorage.getItem("qb_guest_uid") || "";
      if (!guestId) {
        guestId = "guest_" + Math.random().toString(36).slice(2, 8);
        try {
          window.sessionStorage.setItem("qb_guest_uid", guestId);
        } catch {}
      }
    }
    meRef.current = {
      uid: qbUser?.uid || guestId,
      name: qbUser?.displayName || qbUser?.username || (qbUser?.uid ? "Player" : "Guest Player"),
      photo: qbUser?.profilePhoto ?? "",
      frame: qbUser?.avatarSnapshot?.frameId ?? "none",
      badges: badgeUrlsFor(qbUser),
    };
  }, [qbUser]);

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
              if (typeof id === "string") return [id, ""];
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
      // Ultra-crisp High-DPI resolution without pixelation, capped at 1.5 for silky-smooth 60fps
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      renderer.setPixelRatio(dpr);
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.18;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.shadowMap.autoUpdate = true;

      // GPU anisotropic filtering (8x) and Linear filtering keep textures sharp with zero pixelation
      const maxAniso = renderer.capabilities.getMaxAnisotropy();
      atlas.texture.anisotropy = Math.min(8, maxAniso);
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
      const camera = new THREE.PerspectiveCamera(
        88,
        mount.clientWidth / mount.clientHeight,
        0.05,
        8000,
      );

      // Skyblock sky dome (owns the lighting + fog — no second lighting rig).
      sky = new Sky(scene);
      skyRef.current = sky;
      if (skyblock || blockFall) {
        sky.setNormalDay();
        sky.setRange(10, 380);
      } else {
        // Fog pushed to the very edge so far chunks render at full quality.
        sky.setRange(10, goldenDays ? 640 : 120);
      }

      // Chunk render distance: tuned per mode for rock-solid performance
      world = new World(atlas, goldenDays ? 16 : skyblock ? 10 : blockFall ? 6 : 8);

      if (blockFall) {
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

      if (skyblock) {
        // Chest completely removed per user request

        // ── 1. Radiant Celestial Sun Light ──
        const sunGroup = new THREE.Group();
        sunGroup.position.set(68, 88, 42);

        // Circular sun sphere and corona mesh removed per user request
        const sunLight = new THREE.PointLight(0xffbe30, 3.8, 350, 0.85);
        sunGroup.add(sunLight);
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

        // ── 3. Shimmering Aurora Borealis Ribbons ──
        const aGroup = new THREE.Group();
        aGroup.position.set(0, 95, -110);
        aGroup.visible = false;

        const ribbonCount = 3;
        for (let r = 0; r < ribbonCount; r++) {
          const segs = 64;
          const ribbonGeo = new THREE.PlaneGeometry(280, 42, segs, 8);
          const pos = ribbonGeo.attributes.position;
          const colors = new Float32Array(pos.count * 3);
          const color1 = new THREE.Color(0x10b981); // Emerald
          const color2 = new THREE.Color(0x06b6d4); // Cyan
          const color3 = new THREE.Color(0xa855f7); // Violet

          for (let i = 0; i < pos.count; i++) {
            const u = (pos.getX(i) + 140) / 280;
            const c =
              u < 0.5
                ? color1.clone().lerp(color2, u * 2)
                : color2.clone().lerp(color3, (u - 0.5) * 2);
            colors[i * 3] = c.r;
            colors[i * 3 + 1] = c.g;
            colors[i * 3 + 2] = c.b;
          }
          ribbonGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

          const ribbonMat = new THREE.MeshBasicMaterial({
            vertexColors: true,
            transparent: true,
            opacity: 0.55 - r * 0.1,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          });
          const ribbonMesh = new THREE.Mesh(ribbonGeo, ribbonMat);
          ribbonMesh.position.set(r * 18 - 18, r * 8, -r * 25);
          ribbonMesh.rotation.x = 0.18 + r * 0.05;
          aGroup.add(ribbonMesh);
        }
        scene.add(aGroup);
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
                        mat.map.anisotropy = 16;
                        mat.map.needsUpdate = true;
                      }
                      mat.emissive = new THREE.Color(0xff6600);
                      mat.emissiveIntensity = 0.85;
                      mat.needsUpdate = true;
                    });
                  }
                }
              });

              // Glowing radiant fire point light attached to phoenix
              const pFireLight = new THREE.PointLight(0xff6600, 3.2, 35, 1.2);
              pModel.add(pFireLight);

              // Luminous aura corona
              const auraGeo = new THREE.SphereGeometry(1.6, 16, 16);
              const auraMat = new THREE.MeshBasicMaterial({
                color: 0xffaa22,
                transparent: true,
                opacity: 0.38,
                blending: THREE.AdditiveBlending,
              });
              pModel.add(new THREE.Mesh(auraGeo, auraMat));

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
          const [runesAsset, workbenchAsset, swordAsset] = await Promise.all([
            loader.loadAsync("/runes-ghast.glb"),
            loader.loadAsync("/workbench.glb"),
            loader.loadAsync(skyblock ? "/biblically_accurate_sword.glb" : "/short-sword.glb"),
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
            heldSwordSource = swordAsset.scene;
            if (swordAsset.animations && swordAsset.animations.length > 0) {
              heldSwordSource.userData.animations = swordAsset.animations;
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
        player.setSpawnPoint(0.5, 37.8, 0.5);
        player.respawn();
      } else if (goldenDays) {
        player.setSpawnPoint(0.5, 15, -219.5);
        player.respawn();
      } else if (skyblock) {
        player.setSpawnPoint(0.5, 17.5, 0.5);
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
      heldSword = heldSwordSource?.clone(true) ?? null;
      if (heldSword && heldSwordSource?.userData?.animations) {
        heldSwordMixer = new THREE.AnimationMixer(heldSword);
        heldSwordSource.userData.animations.forEach((clip) => {
          const action = heldSwordMixer.clipAction(clip);
          action.setLoop(THREE.LoopRepeat, Infinity);
          action.play();
        });
      }
      if (heldSword) {
        normalizeShowcaseModel(heldSword, 1.05);
        // Keep the sword upright, readable, and slightly away from the
        // camera instead of presenting it as a flat horizontal prop.
        heldSword.rotation.set(0.05, -0.22, -0.08);
        heldSword.visible = false;
        heldRig.add(heldSword);
      }

      // First-person block hand with fair/white-ish skin tone per user request:
      const heldHand = new THREE.Group();
      const sleeveMat = new THREE.MeshStandardMaterial({
        color: 0x3d70b2,
        roughness: 0.82,
      });
      const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.22, 0.13), sleeveMat);
      sleeve.position.set(0, -0.16, -0.06);
      heldHand.add(sleeve);

      const skinMat = new THREE.MeshStandardMaterial({
        color: 0xf5d3b8, // Whitish fair skin tone
        roughness: 0.8,
        metalness: 0.02,
      });
      const hand = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.26, 0.12), skinMat);
      hand.position.set(0, 0.04, 0);
      heldHand.add(hand);

      const thumb = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.06), skinMat);
      thumb.position.set(-0.065, 0.08, 0.02);
      heldHand.add(thumb);

      heldHand.position.set(0.32, -0.28, -0.46);
      heldHand.rotation.set(-0.25, 0.35, -0.12);
      heldHand.visible = false;
      heldRig.add(heldHand);

      camera.add(heldRig);
      scene.add(camera);
      const heldBasePose = {
        hand: { px: 0.32, py: -0.28, pz: -0.46, rx: -0.25, ry: 0.35, rz: -0.12 },
        block: { px: 0.3, py: -0.26, pz: -0.62, rx: -0.25, ry: 0.6, rz: 0.15 },
        item: { px: 0.24, py: -0.2, pz: -0.43, rx: -0.12, ry: 0.2, rz: 0.08 },
      };
      let swing = 0;

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
        if (typeof id === "string") {
          meleeDamage = damageForItem(id);
          held.visible = false;
          heldHand.visible = false;
          if (heldSword) heldSword.visible = id === "short_sword";
          heldRig.scale.set(1.22, 1.22, 1.22);
        } else if (id === 0) {
          // Empty / bare hand
          meleeDamage = 1;
          held.visible = false;
          if (heldSword) heldSword.visible = false;
          heldHand.visible = true;
          heldRig.scale.set(1, 1, 1);
        } else {
          meleeDamage = 1;
          held.visible = true;
          if (heldSword) heldSword.visible = false;
          heldHand.visible = false;
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
      setHeldTile(hotbar[0]);

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
      if (!blockFall) {
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
      controls.onLockChange = (isLocked) => {
        setLocked(isLocked);
        if (isLocked) {
          BmgoAudio.unlock();
          if (skyblock) BmgoAudio.startBgm();
          if (blockFall && blockFallStateRef.current === "playing") BmgoAudio.startBlockFallBgm();
        }
      };
      controls.onSlot = (i) => {
        if (i < hotbar.length) {
          slotRef.current = i;
          setSlot(i);
          setHeldTile(hotbar[i]);
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

      const aimDir = () =>
        aim
          ? new THREE.Vector3(aim.x, aim.y, 0.5).unproject(camera).sub(camera.position).normalize()
          : new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);

      const castHit = () => {
        if (!world) return null;
        const origin = new THREE.Vector3(player.position.x, player.eyeY, player.position.z);
        return raycastVoxel(world, origin, aimDir(), 7);
      };

      // ── Melee: swing at whoever is in front of you ────────────────────────
      // Returns true when a hit landed, so a swing never falls through to
      // placing a block.
      const tryMelee = () => {
        if (!remotes) return false;
        const eye = new THREE.Vector3(player.position.x, player.eyeY, player.position.z);
        const dir = aimDir();
        let best: { uid: string; name: string; d: number } | null = null;
        for (const [uid, e] of remotes.list()) {
          const center = e.current.clone().add(new THREE.Vector3(0, 0.95, 0));
          const to = center.clone().sub(eye);
          const d = to.length();
          if (d > 4.2) continue;
          if (to.normalize().dot(dir) < 0.82) continue;
          if (!best || d < best.d) best = { uid, name: uid, d };
        }
        if (!best) return false;
        const state = hpFor(best.uid);
        if (state.hp <= 0) return true;
        state.hp = Math.max(0, state.hp - meleeDamage);
        state.bar.set(state.hp);
        // Play Girl Hurt sound when hitting someone per user request:
        playSound("hurt");
        if (state.hp === 0) {
          state.respawnIn = 3;
        }
        return true;
      };

      const doPlace = () => {
        if (!world || !fx) return;
        if (!consumeBedwarsAction()) return;

        if (skyblock && chestHandleRef.current) {
          // Chest removed
        }

        const id = hotbar[slotRef.current];
        // Any swing tries to hit an entity first — with a weapon in hand you
        // never place blocks.
        const landed = tryMelee();
        if (typeof id === "string" || landed) {
          swing = 1;
          if (!landed) playSound("air_dig");
          return;
        }

        const hit = castHit();
        if (!hit) {
          // Clicked air / empty void ("vuoto")
          swing = 1;
          playSound("air_dig");
          return;
        }
        const px = hit.x + hit.nx;
        const py = hit.y + hit.ny;
        const pz = hit.z + hit.nz;

        const dx = Math.abs(px + 0.5 - player.position.x);
        const dz = Math.abs(pz + 0.5 - player.position.z);
        const overlapY = py + 1 > player.position.y && py < player.position.y + 1.8;
        if (dx < 0.85 && dz < 0.85 && overlapY) return;

        if (world.get(px, py, pz) !== 0) return;

        swing = 1;
        world.set(px, py, pz, id);
        if (!blockFall) {
          void writeSandboxBlock({ x: px, y: py, z: pz, id }).catch((error) => {
            world?.set(px, py, pz, 0);
            setMultiplayerError("That block could not be synchronized. Your change was reverted.");
            console.error("Could not sync placed block:", error);
          });
        }
        playSound("place");
        if (renderer) renderer.shadowMap.needsUpdate = true;
        fx.spawn("place", new THREE.Vector3(px, py, pz), BLOCKS.find((b) => b.id === id)!.side);
      };

      type Api = {
        place: () => void;
        setMining: (v: boolean) => void;
        setAim: (n: { x: number; y: number } | null) => void;
        setThird: (v: boolean) => void;
        setHeldTile: (id: number | string) => void;
        getAtlasUrl: (id: number | string) => string;
      };
      (mount as HTMLDivElement & { __api?: Api }).__api = {
        place: doPlace,
        setMining: (v) => {
          mining = v;
          if (!v) {
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
        getAtlasUrl: (id) => {
          if (typeof id === "string") return "";
          const block = BLOCKS.find((b) => b.id === id);
          return block ? atlas!.url(block.side) : "";
        },
      };

      const onResize = () => {
        if (!renderer) return;
        camera.aspect = mount.clientWidth / mount.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(mount.clientWidth, mount.clientHeight);
      };
      window.addEventListener("resize", onResize);

      const onRespawn = () => {
        player.respawn();
        avatar?.resetDeath();
      };
      window.addEventListener("qb-menu-respawn", onRespawn);

      // ── Block Fall State & Bot Runners ───────────────────────────────────
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
          setSurvivalTime(0);
          setCurrentLevel(1);
          setDeepestFloor(1);
          setAliveBotsCount(0);
          setCountdown(10);
          blockFallStateRef.current = "waiting";
          setBlockFallState("waiting");
        };
      }

      setReady(true);

      const clock = new THREE.Clock();
      let acc = 0;
      let statusAcc = 0;
      let presenceAcc = 0;
      let shadowAcc = 0;
      let frames = 0;
      let footstepT = 0.12;
      const euler = new THREE.Euler(0, 0, 0, "YXZ");
      // Pre-allocated scratch vectors to eliminate garbage collection stutters on mobile
      const _eye = new THREE.Vector3();
      const _back = new THREE.Vector3();
      const _pivot = new THREE.Vector3();
      const _distV = new THREE.Vector3();
      const _avatarPos = new THREE.Vector3();
      const _upOffset = new THREE.Vector3(0, 0.54, 0);

      const loop = () => {
        raf = requestAnimationFrame(loop);
        const raw = clock.getDelta();

        // Render every browser frame. The previous fixed 60 Hz accumulator
        // intentionally skipped frames on high-refresh displays and made
        // camera motion feel uneven.
        const dt = Math.min(raw, 0.05);

        const input = controls!.read();

        const wasOnGround = player.onGround;
        player.update(dt, { ...input, yaw: input.yaw });
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
            playFootstep(surface);
            footstepT = input.sprint ? 0.31 : 0.43;
          }
        } else {
          footstepT = Math.min(footstepT, 0.08);
        }
        if (wasOnGround && !player.onGround && player.velocity.y > 0) {
          playSound("jump");
        }

        euler.set(input.pitch, input.yaw, 0);
        camera.quaternion.setFromEuler(euler);
        const bobY = Math.sin(player.bob * 2) * 0.045;
        const bobX = Math.cos(player.bob) * 0.03;
        _eye.set(player.position.x + bobX * 0.3, player.eyeY + bobY, player.position.z);
        camera.position.copy(_eye);

        // Third-person orbit: character stays centred in frame.
        if (thirdRef.current) {
          _back.set(0, 0, 1).applyQuaternion(camera.quaternion);
          // pivot sits on the player's own axis (centred), just above the head
          _pivot.copy(_eye).add(_upOffset);
          // Zoomed in comfortably so the character fills the frame nicely against blocks.
          let dist = 2.9;
          const wall = raycastVoxel(world!, _pivot, _back, dist + 0.5);
          if (wall) {
            _distV.set(wall.x + 0.5, wall.y + 0.5, wall.z + 0.5);
            const d = _distV.distanceTo(_pivot);
            dist = Math.max(2.0, d - 0.8);
          }
          camera.position.copy(_pivot).addScaledVector(_back, dist);
        }

        // 3D character
        if (avatar?.loaded) {
          const hs = horizontalSpeed;
          _avatarPos.set(player.position.x, player.position.y, player.position.z);
          const isSneaking = controls?.touch?.crouch || movementModeRef.current === "crouch";
          avatar.update(
            dt,
            _avatarPos,
            input.yaw + Math.PI,
            hs,
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
          if (blockFallStateRef.current === "playing") {
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
                    crumblingBlocks.set(key, { x: bx, y: footY, z: bz, timer: 0.42, blockId: bId });
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

            if (lvl > 0 && lvl !== currentLevelRef.current) {
              currentLevelRef.current = lvl;
              setCurrentLevel(lvl);
              setDeepestFloor((prev) => Math.max(prev, lvl));
            }

            // 5. Player fall reset in Block Fall (smooth respawn without intrusive overlay)
            if (py < 5.2 && blockFallStateRef.current === "playing") {
              BmgoAudio.playDefeat();
              if (avatar?.loaded) {
                avatar.triggerDeath(() => {
                  player.respawn();
                  restartBlockFallRef.current?.();
                  avatar.resetDeath();
                });
              } else {
                player.respawn();
                restartBlockFallRef.current?.();
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
              rotY: input.yaw + Math.PI,
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
        swing = Math.max(0, swing - dt * 4);
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
        } else {
          heldRig.position.set(bp.px - sw * 0.05, bp.py - sw * 0.1 + bobY * 0.5, bp.pz + sw * 0.08);
          heldRig.rotation.set(bp.rx - sw * 0.7, bp.ry, bp.rz + sw * 0.4);
        }

        // sky (owns fog + lighting)
        sky!.follow(camera.position);
        sky!.update(dt);

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

          if (auroraGroupRef.current && auroraGroupRef.current.visible) {
            auroraGroupRef.current.children.forEach((child, idx) => {
              if (child instanceof THREE.Mesh) {
                const pos = child.geometry.attributes.position;
                for (let i = 0; i < pos.count; i++) {
                  const x = pos.getX(i);
                  const waveY =
                    Math.sin(tNow * 1.8 + x * 0.04 + idx * 1.5) * 5.5 +
                    Math.cos(tNow * 0.9 + x * 0.02) * 3.0;
                  pos.setY(i, (i % 9) * 4.6 - 21 + waveY);
                }
                pos.needsUpdate = true;
              }
            });
          }
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
        } else {
          highlight.visible = false;
        }

        // ── hold-to-mine or chest interaction ──────────────
        const wantMine = mining || controls!.holding.break;
        if (isAimingChest && (wantMine || controls!.holding.place)) {
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
              mineKey = key;
              mineT = 0;
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
              if (renderer) renderer.shadowMap.needsUpdate = true;
              void writeSandboxBlock({ x: hit.x, y: hit.y, z: hit.z, id: 0 }).catch((error) => {
                world?.set(hit.x, hit.y, hit.z, oldId);
                setMultiplayerError(
                  "That block could not be synchronized. Your change was reverted.",
                );
                console.error("Could not sync mined block:", error);
              });
              mineKey = null;
              mineT = 0;
              crackMesh.visible = false;
              if (mineBarRef.current) mineBarRef.current.style.width = "0%";
            }
          } else {
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
        world!.update(3);
        renderer!.render(scene, camera);

        frames++;
        acc += dt;
        statusAcc += dt;
        if (statusAcc >= 0.5) {
          setPlayerHunger(Math.round(hungerRef.current * 10) / 10);
          setRunesTimeLeft(Math.ceil(runesTimeRef.current));
          statusAcc = 0;
        }
        if (acc >= 0.5) {
          const fps = Math.round(frames / acc);
          setHud({
            fps,
            x: Math.floor(player.position.x),
            y: Math.floor(player.position.y),
            z: Math.floor(player.position.z),
          });
          // Max-quality mode: stay at full device resolution. Only drop a
          // little (never below 1.5x) if the frame rate really collapses.
          frames = 0;
          acc = 0;
        }
      };
      loop();

      (mount as HTMLDivElement & { __cleanup?: () => void }).__cleanup = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", onResize);
        window.removeEventListener("qb-menu-respawn", onRespawn);
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
        void clearSandboxPresence(meRef.current.uid).catch((error) => {
          console.error("Could not clear sandbox presence:", error);
        });
      }
      avatar?.dispose();
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
            setMining: (v: boolean) => void;
            setAim: (n: { x: number; y: number } | null) => void;
            setThird: (v: boolean) => void;
            setHeldTile: (id: number | string) => void;
            getAtlasUrl: (id: number | string) => string;
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
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleThird]);

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
      c.touch.y = dy;
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

              {/* In Block Fall: Compact floor & survival time chips */}
              {blockFall && blockFallState === "playing" && (
                <div className="flex items-center gap-2 pl-2 pr-2.5 border-l border-white/15 text-xs font-black">
                  <span className="px-2 py-0.5 rounded-lg bg-amber-500/25 border border-amber-400/40 text-amber-300">
                    FL {currentLevel}/5
                  </span>
                  <div className="flex items-center gap-1 font-mono text-white/90">
                    <Clock className="w-3.5 h-3.5 fill-white text-white" />
                    <span>{survivalTime}s</span>
                  </div>
                </div>
              )}
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

      {/* ── Settings Overlay ── */}
      {settingsOpen && (
        <div
          className="fixed inset-0 z-[500] bg-white p-6 flex flex-col items-center justify-center"
          onClick={() => setSettingsOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-black">Game Settings</h2>
              <button onClick={() => setSettingsOpen(false)} className="p-2">
                <X className="w-8 h-8" />
              </button>
            </div>
            <div className="space-y-4">
              <button
                className="w-full text-left p-4 bg-gray-50 rounded-xl font-bold text-lg hover:bg-gray-100"
                onClick={() => {
                  toggleThird();
                  setSettingsOpen(false);
                }}
              >
                Toggle Camera Mode
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Leave Dialog ── */}
      {showQuitDialog && (
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

      {/* ── Bedwars HUD (Main HUD) ── */}
      {ready && (
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
              controlsRef.current.touch.y = -y;
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

      {inventoryOpen && (
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
      {ready && !locked && !isTouch && !skyblock && !blockFall && (
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
      {!ready && !graphicsError && (
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

      {settingsOpen && (
        <SandboxSettings
          onClose={() => setSettingsOpen(false)}
          camMode={thirdPerson ? "third" : "first"}
          onCamMode={(m) => {
            if ((m === "third") !== thirdPerson) toggleThird();
          }}
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
