import {
  GearboxLoader,
  PrivateServerBadge,
  GameCubeBubbleMenu,
  JoystickVisual,
  SkyblockTutorial,
  GameSettingsModal,
  SkyblockShopModal,
  SkyblockRuleBookModal,
} from "@/components/game-hud-parts";
import { QblockScreenControls, HUD_ASSETS } from "@/components/QblockNewHudControls";
import { IsometricGridLoader } from "@/components/ui/IsometricGridLoader";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import {
  doc,
  getDoc,
  updateDoc,
  increment,
  collection,
  query,
  where,
  getDocs,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { ProfileSheet, type ProfileUser } from "@/components/ProfileSheet";
import {
  getOrCreateIsland,
  persistBlockChange,
  subscribeToIslandBlocks,
  updatePlayerPresence,
  subscribeToIslandPlayers,
  clearPlayerPresence,
  toggleIslandLike,
  subscribeToIslandLikes,
  sendSkyblockChatMessage,
  subscribeToSkyblockChat,
  type LiveSkyblockPlayer,
  type SkyblockChatMessage,
} from "@/lib/skyblock-multiplayer";
import { getPermanentPlayerId } from "@/lib/skyblock-profile";
import { GameUiChrome } from "@/components/GameUiChrome";
import { RobloxInGameServerBar } from "@/components/RobloxInGameServerBar";
import { getTargetDpr } from "@/lib/rendering";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { createHpBar, type HpBar } from "@/engine-sandbox/shared/hpbar";
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import qblockGameLoaderUrl from "../assets/imported/IMG_6930_1786893754942.png?url";
const goldTokenIcon = "https://file.garden/alGOOylwpAfCa6qP/file_000000008f8481f49405d6c7b6fcbb5a.png";
const newGenIcon = "https://file.garden/alGOOylwpAfCa6qP/file_000000007ea881f4a21aac7088884509.png";
import magicCubeUrl from "../assets/skyblock/treasure-coins-chest.glb?url";
const phoenixUrl = "https://file.garden/alGOOylwpAfCa6qP/phoenix_on_fire_update.glb";
const himmelStatueUrl = "/himmel_statue.glb";
const himmelStatueRemoteUrl = "https://file.garden/alGOOylwpAfCa6qP/himmel_statue.glb";
import islandHouseArt from "../assets/skyblock/sky-pass-placeholder.png?url";
import miningEntranceArt from "../assets/skyblock/sky-pass-placeholder.png?url";
import grandMiningArea from "../assets/skyblock-grand-mining-area.json";
import skyblockMenuIcon from "../assets/ui/home.svg?url";
import skyblockBoxIcon from "../assets/ui/discover.svg?url";
const magicSwordUrl = "https://file.garden/alGOOylwpAfCa6qP/biblically_accurate_sword.glb";
const skyblockUniversalModelUrl =
  "/Avatar_Walk_LegsOnly.glb";
const skyblockUniversalModelRemoteUrl =
  "https://file.garden/alGOOylwpAfCa6qP/Avatar_Walk_LegsOnly.glb";
const skyblockNedModelUrl = skyblockUniversalModelUrl;
const skyblockNellyModelUrl = skyblockUniversalModelUrl;
const skyblockQblockModelUrl = skyblockUniversalModelUrl;
import escapeBackroomsUrl from "../assets/imported/wing_379_1786180191578.glb?url";
import escapeScpUrl from "../assets/imported/wing_379_1786180191578.glb?url";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { SSAOPass } from "three/examples/jsm/postprocessing/SSAOPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { MotionBlurShader } from "../lib/motion-blur-shader";
import {
  ChevronLeft,
  MessageCircle,
  Settings as SettingsIcon,
  Plus,
  Footprints,
  X,
  Send,
  Sliders,
  Eye,
  Volume2,
  Crosshair,
  Vibrate,
  ChevronsUp,
  Backpack,
  Trophy,
  Users,
  Check,
  Archive,
  Sparkles,
  Timer,
  Zap,
  Star,
  Home,
  Share2,
  Camera,
  Egg as EggIcon,
  Heart as HeartIcon,
  Skull,
  UserRound,
  ShoppingBag,
  Coins,
  Sword,
  Package,
  Gem,
  BookOpen,
  Box,
  Settings,
  MessageSquare,
  LogOut,
  RefreshCw,
  LogIn,
  UserPlus,
} from "lucide-react";
import { createAvatarModel } from "@/components/RigPreview";
import { QblockCharacter } from "@/components/QblockCharacter";
import { GlbAvatar } from "@/components/GlbAvatar";
import { GlossyAvatar, isIraAccount } from "@/components/GlossyAvatar";
import { incrementSkyblockTime } from "@/lib/daily-events";
import { GameAudio } from "@/lib/game-audio";
import { AdvancedInventoryModal } from "@/components/AdvancedInventoryModal";
import { BedwarsGoldenDays } from "@/components/BedwarsGoldenDays";
import { BlockFall } from "@/components/BlockFall";
import { SandboxGame } from "@/routes/game.sandbox";
import { ChestModal } from "@/components/ChestModal";
import { V2LoadingScreen } from "@/components/v2/V2Screens";
// Blocky Plaza: real minigames-hub map, voxelised from a Minecraft world
// export (Mineways OBJ → glTF → nearest-block-type voxel grid) instead of
// being hand-authored — see glb-to-voxels-mc.mjs at the repo root. Every
// entry already carries one of OUR engine block `type` ids, so it renders
// with our own textures, not the original Minecraft texture atlas.
// Grid size used for the conversion was 150 → the model was centred in a
// [0,150)^3 voxel cube, so shift by -75 on X/Z to centre it at the world
// origin (Y is left alone: 0 is already the map's floor level).
const BLOCKYPLAZA_OFFSET = 75;
// The source export is a complete 150³ hub (207k blocks), but a browser
// client only needs the playable hub around spawn. Keeping the bounded view
// as references into the source array avoids duplicating the block objects
// while preventing a full-map allocation, occlusion scan, and draw upload.
const BLOCKYPLAZA_LOAD_RADIUS = 32;
import { GoldCoin, GemCoin, BuyModal } from "@/components/CurrencyModal";
import {
  AVATAR_COLORS,
  setAvatarColor,
  useAvatarColor,
  useEquippedSkin,
  useEquippedItems,
  useEquippedPants,
  useFaceId,
  useGender,
  useBandana,
  applyAvatarSnapshot,
} from "@/lib/avatar";
import { useCurrency, spendCurrency } from "@/lib/currency";
import {
  GameChatIcon,
  GameBackpackIcon,
  GameHeartIcon,
  GameGearIcon,
  GameTrophyIcon,
  GameFriendsIcon,
  GameLeaveIcon,
  GameRunIcon,
  GameJumpIcon,
} from "@/components/game-icons";

// The rig's FOV was tuned looking at it on a landscape-ish preview. On a
// real phone in portrait, a fixed *vertical* FOV makes the horizontal field
// of view much narrower (aspect < 1), which reads as "zoomed in like crazy".
// Keep the horizontal FOV constant at a 16:9 reference instead, so portrait
// phones see the same width of the world, just cropped top/bottom.
const FOV_REF_ASPECT = 16 / 9;
function fovForAspect(baseFovDeg: number, aspect: number): number {
  if (aspect <= 0 || !Number.isFinite(aspect)) return baseFovDeg;
  // Standardize base FOV to at least 72 for comfortable modern gameplay
  const effectiveBase = Math.max(70, Number.isFinite(baseFovDeg) ? baseFovDeg : 72);
  if (aspect >= 1.0) {
    // Landscape orientation (including wide Samsung/iPhone displays 19.5:9, 20:9, 21:9):
    // Never squeeze vertical FOV down on wide screens — that causes extreme zoom-in on mobile phones.
    // Instead, give a generous, comfortable vertical FOV (72° - 76°) so landscape feels wide and open.
    const wideBoost = aspect >= 1.9 ? 3.0 : aspect >= 1.6 ? 2.0 : 0.5;
    return Math.min(84, effectiveBase + wideBoost);
  }
  // Portrait orientation (aspect < 1.0, e.g. phones held vertically 9:16, 9:19.5):
  // Gently expand vertical FOV so horizontal sightlines aren't too narrow.
  const portraitExpansion = (1.0 - Math.max(0.4, aspect)) * 9;
  return Math.min(86, Math.max(effectiveBase, effectiveBase + portraitExpansion));
}

function getCleanName(user: any): string {
  if (!user) return "Player";
  if (
    user.email === "mammaettahiri@gmail.com" ||
    user.username?.toLowerCase() === "mammaettahiri" ||
    user.displayName?.toLowerCase() === "mammaettahiri"
  )
    return "IRA";
  const raw = user.username || user.displayName || user.n || user.name;
  if (!raw) return user.email ? user.email.split("@")[0] : "Player";
  if (typeof raw === "string" && raw.includes("@")) return raw.split("@")[0];
  return raw;
}

export const Route = createFileRoute("/game/$id")({
  head: () => ({ meta: [{ title: "World — QBLOCK" }] }),
  component: GamePage,
});

function QblockGameLoadingScreen({ title = "Loading Experience" }: { title?: string }) {
  return (
    <V2LoadingScreen
      title={title}
      subtitle="Connecting to server"
      progress={100}
      isAssetsLoaded={true}
    />
  );
}

// Index in this array doubles as the numeric block `type` used everywhere
// (matForType, addBlock, particle tint) — keep new entries appended, never
// reordered. Only the first HOTBAR_COUNT show in the quick-access hotbar;
// the rest are reachable via the Backpack inventory (see BackpackModal),
// which already renders the full list in a scrolling grid.
export const BLOCKS = [
  // ── Original (0–20) ─────────────────────────────────────
  { name: "grass", color: 0x8eb86f }, // 0
  { name: "dirt", color: 0x9a7855 }, // 1
  { name: "stone", color: 0xbfbfbf }, // 2
  { name: "oak log", color: 0xb4895e }, // 3
  { name: "sand", color: 0xdcc69d }, // 4
  { name: "oak leaves", color: 0x3f8f3a }, // 5
  { name: "water", color: 0x4aa8e8 }, // 6
  { name: "glass", color: 0xbfe9ff }, // 7
  { name: "mossy cobble", color: 0x5a9c34 }, // 8
  { name: "coarse dirt", color: 0x4a3420 }, // 9
  { name: "clay", color: 0xc8a888 }, // 10
  { name: "stone bricks", color: 0x9a9aa0 }, // 11
  { name: "diorite", color: 0xe8e8ec }, // 12
  { name: "basalt", color: 0x3a3a40 }, // 13
  { name: "glow block", color: 0xffcc44 }, // 14
  { name: "cobblestone", color: 0x9a9aa0 }, // 15
  { name: "smooth stone", color: 0xc4c4ca }, // 16
  { name: "ice", color: 0xbde4f5 }, // 17
  { name: "dark oak log", color: 0x5a3420 }, // 18
  { name: "slime block", color: 0x7bd63a }, // 19
  { name: "lava", color: 0xff4500 }, // 20
  // ── New blocks (21–55) ──────────────────────────────────
  { name: "gravel", color: 0xa09090 }, // 21
  { name: "oak planks", color: 0xc8a864 }, // 22
  { name: "birch log", color: 0xd4cfa0 }, // 23
  { name: "spruce log", color: 0x6b4c32 }, // 24
  { name: "acacia log", color: 0xc87040 }, // 25
  { name: "jungle log", color: 0x7a6040 }, // 26
  { name: "granite", color: 0xc47050 }, // 27
  { name: "andesite", color: 0x888888 }, // 28
  { name: "obsidian", color: 0x1a1028 }, // 29
  { name: "gold block", color: 0xf5c400 }, // 30
  { name: "diamond block", color: 0x5be6e0 }, // 31
  { name: "iron block", color: 0xd8dde0 }, // 32
  { name: "emerald block", color: 0x17dd62 }, // 33
  { name: "lapis block", color: 0x1a4abf }, // 34
  { name: "netherrack", color: 0x8a2222 }, // 35
  { name: "nether bricks", color: 0x3a1822 }, // 36
  { name: "terracotta", color: 0xb86030 }, // 37
  { name: "red sand", color: 0xc86020 }, // 38
  { name: "pumpkin", color: 0xe07820 }, // 39
  { name: "melon", color: 0x78a830 }, // 40
  { name: "white wool", color: 0xeeeeee }, // 41
  { name: "red wool", color: 0xcc2222 }, // 42
  { name: "blue wool", color: 0x2244cc }, // 43
  { name: "green wool", color: 0x228822 }, // 44
  { name: "yellow wool", color: 0xddcc22 }, // 45
  { name: "glowstone", color: 0xffdd88 }, // 46
  { name: "amethyst", color: 0x8844cc }, // 47
  { name: "hay block", color: 0xd4b820 }, // 48
  { name: "coal ore", color: 0x606060 }, // 49
  { name: "redstone ore", color: 0xcc2222 }, // 50
  { name: "crying obsidian", color: 0x4a1880 }, // 51
  { name: "TNT", color: 0xcc3322 }, // 52
  { name: "bookshelf", color: 0xc8a864 }, // 53
  { name: "chiseled stone", color: 0xb8b8b8 }, // 54
  { name: "dirt path", color: 0xa08050 }, // 55
];
const HOTBAR_COUNT = 8;

// Shovel tiers shown in the inventory. Only the diamond one is actually
// wired into gameplay today (it's the equipped Spleef item); the rest are
// browsable/cosmetic so the full tier ladder reads correctly in the UI.
export const SHOVEL_TIERS = [
  {
    name: "Bronze Shovel",
    color: "#a8702f",
    hex: 0xa8702f,
    emissive: 0x000000,
    emissiveIntensity: 0,
    roughness: 0.7,
    metalness: 0.3,
  },
  {
    name: "Stone Shovel",
    color: "#9aa0a6",
    hex: 0x9aa0a6,
    emissive: 0x000000,
    emissiveIntensity: 0,
    roughness: 0.9,
    metalness: 0.0,
  },
  {
    name: "Iron Shovel",
    color: "#dfe3e8",
    hex: 0xdfe3e8,
    emissive: 0x000000,
    emissiveIntensity: 0,
    roughness: 0.3,
    metalness: 0.7,
  },
  {
    name: "Gold Shovel",
    color: "#f6c343",
    hex: 0xf6c343,
    emissive: 0x221100,
    emissiveIntensity: 0.1,
    roughness: 0.2,
    metalness: 0.9,
  },
  {
    name: "Diamond Shovel",
    color: "#5fe0ee",
    hex: 0x5fe6e0,
    emissive: 0x0f5f5a,
    emissiveIntensity: 0.15,
    roughness: 0.25,
    metalness: 0.3,
  },
];

const _blockIconCache: Record<string, string> = {};
const _shovelIconCache: Record<string, string> = {};

// High-fidelity isometric 3D voxel block icon generator for inventory & hotbar.
// Renders sunlit top face, shaded left/right sides, bevel highlights, and
// material textures (grass foliage, ores, crystal glass, rings) on a 64x64 canvas.
export function getBlockIcon(name: string, color: number): string {
  if (typeof document === "undefined") return "";
  const cached = _blockIconCache[name];
  if (cached) return cached;
  const S = 64;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const ctx = c.getContext("2d")!;
  const hex = `#${color.toString(16).padStart(6, "0")}`;

  const shade = (h: string, amt: number) => {
    const n = parseInt(h.slice(1), 16);
    const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt));
    const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
    const b = Math.max(0, Math.min(255, (n & 255) + amt));
    return `rgb(${r},${g},${b})`;
  };

  const drawPoly = (pts: [number, number][], fill: string, stroke = "rgba(0,0,0,0.4)") => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  };

  // Isometric 3D Cube Vertices
  const topFace: [number, number][] = [
    [32, 10],
    [54, 22],
    [32, 34],
    [10, 22],
  ];
  const leftFace: [number, number][] = [
    [10, 22],
    [32, 34],
    [32, 54],
    [10, 42],
  ];
  const rightFace: [number, number][] = [
    [32, 34],
    [54, 22],
    [54, 42],
    [32, 54],
  ];

  const isGrass = name.includes("grass");
  const isWood = name.includes("wood") || name.includes("log") || name.includes("plank");
  const isGlass = name.includes("glass") || name.includes("water") || name.includes("ice");
  const isOre =
    name.includes("ore") ||
    name.includes("diamond") ||
    name.includes("gold") ||
    name.includes("emerald") ||
    name.includes("lapis") ||
    name.includes("amethyst");
  const isLeaves = name.includes("leaves");
  const isObsidian = name.includes("obsidian");
  const isStone = name.includes("stone") || name.includes("cobble") || name.includes("brick");

  // Top face (Sunlit with subtle gradient)
  const topColor = isGrass ? "#5bb328" : isObsidian ? "#2a1538" : shade(hex, 36);
  drawPoly(topFace, topColor);

  // Left face (Neutral)
  const leftColor = isGrass ? "#6b4728" : isObsidian ? "#190b22" : shade(hex, -10);
  drawPoly(leftFace, leftColor);

  // Right face (Shadow)
  const rightColor = isGrass ? "#4e321a" : isObsidian ? "#100618" : shade(hex, -36);
  drawPoly(rightFace, rightColor);

  // Material Details
  if (isGrass) {
    // Green grass overhang fringe on left face
    ctx.fillStyle = "#5bb328";
    ctx.beginPath();
    ctx.moveTo(10, 22);
    ctx.lineTo(32, 34);
    ctx.lineTo(32, 42);
    ctx.lineTo(27, 37);
    ctx.lineTo(23, 43);
    ctx.lineTo(17, 37);
    ctx.lineTo(10, 31);
    ctx.closePath();
    ctx.fill();

    // Grass overhang fringe on right face
    ctx.beginPath();
    ctx.moveTo(32, 34);
    ctx.lineTo(54, 22);
    ctx.lineTo(54, 30);
    ctx.lineTo(49, 37);
    ctx.lineTo(43, 36);
    ctx.lineTo(38, 42);
    ctx.lineTo(32, 39);
    ctx.closePath();
    ctx.fill();

    // Dirt pebble specks
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(18, 45, 3, 2);
    ctx.fillRect(24, 48, 2, 2);
    ctx.fillRect(40, 46, 3, 2);
  } else if (isGlass) {
    // Glass reflection highlights
    ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
    ctx.beginPath();
    ctx.moveTo(22, 16);
    ctx.lineTo(38, 25);
    ctx.lineTo(36, 28);
    ctx.lineTo(20, 19);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.fillRect(16, 28, 2, 8);
    ctx.fillRect(42, 32, 2, 8);
  } else if (isOre) {
    // Mineral crystal flecks
    const oreColor = name.includes("diamond")
      ? "#5be6e0"
      : name.includes("gold")
        ? "#ffd700"
        : name.includes("emerald")
          ? "#17dd62"
          : name.includes("redstone")
            ? "#ff2222"
            : name.includes("lapis")
              ? "#2563eb"
              : name.includes("amethyst")
                ? "#c084fc"
                : "#e2e8f0";
    ctx.fillStyle = oreColor;
    ctx.fillRect(28, 19, 5, 4);
    ctx.fillRect(37, 24, 4, 3);
    ctx.fillRect(17, 30, 5, 5);
    ctx.fillRect(24, 41, 5, 4);
    ctx.fillRect(38, 35, 5, 5);
    ctx.fillRect(45, 42, 4, 4);

    // Gem glint shine
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(29, 20, 2, 2);
    ctx.fillRect(18, 31, 2, 2);
    ctx.fillRect(39, 36, 2, 2);
  } else if (isObsidian) {
    // Purple rune veins
    ctx.fillStyle = "#a855f7";
    ctx.fillRect(26, 18, 4, 3);
    ctx.fillRect(36, 25, 4, 3);
    ctx.fillRect(20, 32, 3, 5);
    ctx.fillRect(40, 38, 4, 4);
    ctx.fillStyle = "#c084fc";
    ctx.fillRect(27, 19, 2, 2);
    ctx.fillRect(41, 39, 2, 2);
  } else if (isWood) {
    // Tree ring on top
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(32, 22, 10, 5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(32, 22, 5, 2.5, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (isLeaves) {
    // Leaf speckle pattern
    ctx.fillStyle = "#1e4c16";
    for (let i = 0; i < 18; i++) {
      ctx.fillRect(14 + ((i * 7) % 36), 14 + ((i * 9) % 34), 2, 2);
    }
  } else if (isStone) {
    // Stone / Cobble fissures
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(18, 28);
    ctx.lineTo(26, 32);
    ctx.lineTo(24, 42);
    ctx.moveTo(38, 36);
    ctx.lineTo(46, 33);
    ctx.lineTo(48, 44);
    ctx.stroke();
  }

  // Top face crisp specular highlight edge
  ctx.strokeStyle = "rgba(255, 255, 255, 0.70)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(10, 22);
  ctx.lineTo(32, 10);
  ctx.lineTo(54, 22);
  ctx.stroke();

  // Subtle outer edge stroke for 3D pop
  ctx.strokeStyle = "rgba(0, 0, 0, 0.55)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(32, 10);
  ctx.lineTo(54, 22);
  ctx.lineTo(54, 42);
  ctx.lineTo(32, 54);
  ctx.lineTo(10, 42);
  ctx.lineTo(10, 22);
  ctx.closePath();
  ctx.stroke();

  const url = c.toDataURL();
  _blockIconCache[name] = url;
  return url;
}

export function getShovelIcon(tint: string): string {
  if (typeof document === "undefined") return "";
  const cached = _shovelIconCache[tint];
  if (cached) return cached;
  const S = 32;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, S, S);
  ctx.save();
  ctx.translate(S / 2, S / 2);
  ctx.rotate(-0.55);
  // Handle
  ctx.fillStyle = "#8b6a3f";
  ctx.fillRect(-2, -13, 4, 18);
  // Blade
  ctx.fillStyle = tint;
  ctx.beginPath();
  ctx.moveTo(-6, 3);
  ctx.lineTo(6, 3);
  ctx.lineTo(4, 13);
  ctx.lineTo(-4, 13);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
  const url = c.toDataURL();
  _shovelIconCache[tint] = url;
  return url;
}

// Procedural progressive break crack textures (10 distinct stages)
// Generated directly into CanvasTextures so Three.js renders realistic breaking fractures.
export function generateCrackTextures(): THREE.CanvasTexture[] {
  const textures: THREE.CanvasTexture[] = [];
  if (typeof document === "undefined") return textures;

  const branches = [
    [
      [18, 10],
      [28, 24],
      [22, 38],
      [12, 48],
      [8, 58],
    ],
    [
      [28, 24],
      [42, 20],
      [54, 32],
      [58, 48],
    ],
    [
      [42, 20],
      [48, 10],
      [56, 4],
    ],
    [
      [22, 38],
      [34, 44],
      [48, 46],
      [60, 54],
    ],
    [
      [34, 44],
      [36, 56],
      [40, 62],
    ],
    [
      [28, 24],
      [26, 14],
      [30, 6],
    ],
    [
      [12, 48],
      [6, 42],
      [2, 38],
    ],
    [
      [54, 32],
      [62, 28],
    ],
    [
      [48, 46],
      [52, 58],
    ],
    [
      [18, 10],
      [6, 14],
      [2, 16],
    ],
  ];

  for (let stage = 0; stage < 10; stage++) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, 64, 64);

    const activeCount = Math.min(branches.length, Math.floor((stage + 1) * 1.05) + 1);

    // Primary fracture lines (dark high-contrast)
    ctx.strokeStyle = "rgba(18, 18, 22, 0.96)";
    ctx.lineWidth = stage > 6 ? 3.6 : stage > 3 ? 2.6 : 1.8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (let b = 0; b < activeCount; b++) {
      const pts = branches[b];
      const maxPts = Math.min(pts.length, 2 + Math.floor((stage / 9) * (pts.length - 1)));
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let p = 1; p < maxPts; p++) {
        ctx.lineTo(pts[p][0], pts[p][1]);
      }
      ctx.stroke();
    }

    // Highlighting white edge for crisp visibility against dark and light blocks
    ctx.strokeStyle = "rgba(255, 255, 255, 0.70)";
    ctx.lineWidth = 1.0;
    for (let b = 0; b < activeCount; b++) {
      const pts = branches[b];
      const maxPts = Math.min(pts.length, 2 + Math.floor((stage / 9) * (pts.length - 1)));
      ctx.beginPath();
      ctx.moveTo(pts[0][0] + 1, pts[0][1] + 1);
      for (let p = 1; p < maxPts; p++) {
        ctx.lineTo(pts[p][0] + 1, pts[p][1] + 1);
      }
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    textures.push(tex);
  }

  return textures;
}

type Joy = { active: boolean; cx: number; cy: number; dx: number; dy: number; id: number };
type ChatMsg = { id: number; from: string; text: string; me?: boolean; special?: "ladybug" };

// Spleef is solo — you join straight from the game card/play popup and
// practice on the arena. No NPCs, no elimination-based match state.
type SpleefPhase = "countdown" | "playing";

// BedWars game state machine
type BedwarsPhase = "lobby" | "countdown" | "match" | "victory";
type BedwarsTeam = { bedAlive: boolean; playerAlive: boolean };
type BedwarsState = {
  phase: BedwarsPhase;
  countdown: number;
  redTeam: BedwarsTeam;
  blueTeam: BedwarsTeam;
  iron: number;
  gold: number;
  emerald: number;
};

type EggwarsPhase = "lobby" | "countdown" | "match" | "victory" | "defeat";
type EggwarsTeam = {
  id: "ruby" | "azure" | "jade" | "gold";
  label: string;
  color: string;
  eggAlive: boolean;
  playerAlive: boolean;
};
type EggwarsState = {
  phase: EggwarsPhase;
  countdown: number;
  time: number;
  iron: number;
  gold: number;
  diamond: number;
  teams: EggwarsTeam[];
  generatorLevel: number;
  toast: string | null;
};

// Block Party: same solo-practice model. "show" = color called, timer
// Procedural block textures/materials — generating these is ~13 canvas
// paints at 256x256 (thousands of per-pixel fillRect calls each), which was
// costly enough to be a visible load stutter if redone on every mount. They
// don't depend on world/session state, so they're built once per app
// lifetime and cached at module scope; every game mount after the first
// reuses the same GPU-uploadable textures/materials instead of repainting.
function buildProceduralAssets(renderer: THREE.WebGLRenderer) {
  // ---------- Procedural textures ----------
  // 256 px textures, fully smooth-filtered: bilinear magnification plus
  // mip + anisotropic minification so no individual pixels are ever
  // visible, near or far.
  function pixelTex(paint: (ctx: CanvasRenderingContext2D, S: number) => void, S = 256) {
    const c = document.createElement("canvas");
    c.width = c.height = S;
    const ctx = c.getContext("2d")!;
    paint(ctx, S);
    const t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.anisotropy = Math.max(1, renderer.capabilities.getMaxAnisotropy());
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  // Multi-layer speckle noise for richer texture depth
  function speckle(ctx: CanvasRenderingContext2D, S: number, colors: string[], density = 0.5) {
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        if (Math.random() < density) {
          ctx.fillStyle = colors[(Math.random() * colors.length) | 0];
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
  }
  // Smooth value noise — adds large-scale variation to textures
  function valueNoise(x: number, y: number, scale: number) {
    const xi = (x * scale) | 0,
      yi = (y * scale) | 0;
    const xf = (x * scale) % 1,
      yf = (y * scale) % 1;
    const h = (a: number, b: number) => Math.sin(a * 127.1 + b * 311.7) * 0.5 + 0.5;
    const v00 = h(xi, yi),
      v10 = h(xi + 1, yi),
      v01 = h(xi, yi + 1),
      v11 = h(xi + 1, yi + 1);
    const ux = xf * xf * (3 - 2 * xf),
      uy = yf * yf * (3 - 2 * yf);
    return v00 * (1 - ux) * (1 - uy) + v10 * ux * (1 - uy) + v01 * (1 - ux) * uy + v11 * ux * uy;
  }

  // ── HD texture loader (VividHD 128× pack) ─────────────────────────────
  // Textures load async; Three.js renders them the moment they arrive.
  // Until then blocks show white — imperceptible on modern connections.
  const _hdAniso = Math.max(1, renderer.capabilities.getMaxAnisotropy());
  const _hdLoader = new THREE.TextureLoader();
  function loadHD(url: string) {
    const t = _hdLoader.load(url);
    // LinearFilter smooths textures — no visible pixels.
    // A 0.4 px CSS blur on the renderer canvas (set below) barely softens
    // the hard pixel edges globally — imperceptible as blur, but removes
    // the "jagged web game" look without going blurry.
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.anisotropy = _hdAniso;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  const T = (name: string) => loadHD(`/textures/blocks/${name}.png`);

  // ── Existing block textures (updated to new pack) ─────────────────────
  const grassTop = T("grass_block_top");
  const grassSide = T("grass_block_side");
  const dirtTex = T("dirt");
  const stoneTex = T("stone");
  const woodSide = T("oak_log");
  const woodTop = T("oak_log_top");
  const sandTex = T("sand");
  const leavesTex = T("jungle_leaves"); // bushier foliage look
  const glassTex = T("glass");

  // ── New block textures (21–55) ────────────────────────────────────────
  const gravelTex = T("gravel");
  const oakPlanksTex = T("oak_planks");
  const birchSideTex = T("birch_log");
  const birchTopTex = T("birch_log_top");
  const birchLeavesTex = T("birch_leaves");
  const spruceSideTex = T("spruce_log");
  const spruceTopTex = T("spruce_log_top");
  const spruceLeavesTex = T("spruce_leaves");
  const acaciaSideTex = T("acacia_log");
  const acaciaTopTex = T("acacia_log_top");
  const acaciaLeavesTex = T("acacia_leaves");
  const jungleSideTex = T("jungle_log");
  const jungleTopTex = T("jungle_log_top");
  const jungleLeavesTex = T("jungle_leaves");
  const graniteTex = T("granite");
  const andesiteTex = T("andesite");
  const obsidianTex = T("obsidian");
  const goldBlockTex = T("gold_block");
  const diamondBlockTex = T("diamond_block");
  const ironBlockTex = T("iron_block");
  const emeraldBlockTex = T("emerald_block");
  const lapisBlockTex = T("lapis_block");
  const netherRackTex = T("netherrack");
  const netherBricksTex = T("nether_bricks");
  const terracottaTex = T("terracotta");
  const redSandTex = T("red_sand");
  const pumpkinSideTex = T("pumpkin_side");
  const pumpkinTopTex = T("pumpkin_top");
  const melonSideTex = T("melon_side");
  const melonTopTex = T("melon_top");
  const whiteWoolTex = T("white_wool");
  const redWoolTex = T("red_wool");
  const blueWoolTex = T("blue_wool");
  const greenWoolTex = T("green_wool");
  const yellowWoolTex = T("yellow_wool");
  const glowstoneTex = T("glowstone");
  const amethystTex = T("amethyst_block");
  const haySideTex = T("hay_block_side");
  const hayTopTex = T("hay_block_top");
  const coalOreTex = T("coal_ore");
  const redstoneOreTex = T("redstone_ore");
  const cryingObsTex = T("crying_obsidian");
  const tntSideTex = T("tnt_side");
  const tntTopTex = T("tnt_top");
  const bookshelfTex = T("bookshelf");
  const chiseledTex = T("chiseled_stone_bricks");
  const pathTopTex = T("dirt_path_top");
  const pathSideTex = T("dirt_path_side");

  // PBR Materials — MeshStandardMaterial for realistic shading under directional lights
  // Minecraft grass/leaf textures are stored as greyscale bitmaps intended
  // to be multiplied by the engine's biome colormap at runtime. Setting
  // `color` on the material recreates that tint in Three.js (color × map).
  // MeshLambertMaterial for matte/diffuse blocks — same visual result as
  // MeshStandardMaterial with roughness≈1/metalness=0 but 2-3× cheaper to
  // shade because Lambert skips the PBR GGX microfacet BRDF entirely.
  // We keep MeshStandardMaterial only for shiny/metallic/transparent blocks.
  const mGrassTop = new THREE.MeshLambertMaterial({ map: grassTop, color: 0x56d410 });
  const mGrassSide = new THREE.MeshLambertMaterial({ map: grassSide, color: 0x68e018 });
  const mGrassBottom = new THREE.MeshLambertMaterial({ map: dirtTex });
  const grassFaces = [mGrassSide, mGrassSide, mGrassTop, mGrassBottom, mGrassSide, mGrassSide];
  const mDirt = new THREE.MeshLambertMaterial({ map: dirtTex });
  const mStone = new THREE.MeshLambertMaterial({ map: stoneTex });
  const mWoodSide = new THREE.MeshLambertMaterial({ map: woodSide });
  const mWoodTop = new THREE.MeshLambertMaterial({ map: woodTop });
  const woodFaces = [mWoodSide, mWoodSide, mWoodTop, mWoodTop, mWoodSide, mWoodSide];
  const mSand = new THREE.MeshLambertMaterial({ map: sandTex });
  const mLeaves = new THREE.MeshLambertMaterial({
    map: leavesTex,
    color: 0x2ed410,
    transparent: true,
    alphaTest: 0.15,
  });
  const mWater = new THREE.MeshStandardMaterial({
    color: 0x1a5f9a,
    roughness: 0.18,
    metalness: 0.05,
    transparent: true,
    opacity: 0.8,
  });
  const mGlass = new THREE.MeshStandardMaterial({
    map: glassTex,
    roughness: 0.24,
    metalness: 0.0,
    transparent: true,
    opacity: 0.45,
  });

  // ── Snow textures (Spleef arena) — icy PBR ────────────────────────────
  const snowTex = pixelTex((ctx, S) => {
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const n = valueNoise(x / S, y / S, 5) * 0.35 + valueNoise(x / S, y / S, 11) * 0.15;
        const brightness = 0.88 + n * 0.25;
        const r = Math.round(220 * brightness),
          g = Math.round(235 * brightness),
          b = Math.round(255 * brightness);
        ctx.fillStyle = `rgb(${Math.min(255, r)},${Math.min(255, g)},${Math.min(255, b)})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    speckle(ctx, S, ["rgba(255,255,255,0.8)", "rgba(180,220,250,0.5)"], 0.12);
  });
  const packedSnowTex = pixelTex((ctx, S) => {
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const n = valueNoise(x / S, y / S, 4) * 0.4 + valueNoise(x / S, y / S, 9) * 0.2;
        const brightness = 0.72 + n * 0.38;
        const r = Math.round(150 * brightness),
          g = Math.round(185 * brightness),
          b = Math.round(215 * brightness);
        ctx.fillStyle = `rgb(${Math.min(255, r)},${Math.min(255, g)},${Math.min(255, b)})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    // crystalline crack lines
    ctx.strokeStyle = "rgba(200,230,255,0.6)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo((Math.random() * S) | 0, (Math.random() * S) | 0);
      ctx.lineTo((Math.random() * S) | 0, (Math.random() * S) | 0);
      ctx.stroke();
    }
  });
  const icePillarTex = pixelTex((ctx, S) => {
    const g = ctx.createLinearGradient(0, 0, S, S);
    g.addColorStop(0, "rgba(140,200,240,0.85)");
    g.addColorStop(0.5, "rgba(200,240,255,0.65)");
    g.addColorStop(1, "rgba(100,170,220,0.85)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    // interior crystal reflections
    for (let i = 0; i < 6; i++) {
      const x = (Math.random() * S) | 0,
        y = (Math.random() * S) | 0;
      const glow = ctx.createRadialGradient(x, y, 0, x, y, 6 + Math.random() * 8);
      glow.addColorStop(0, "rgba(255,255,255,0.5)");
      glow.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, S, S);
    }
    ctx.strokeStyle = "rgba(220,245,255,0.8)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(1, 1, S - 2, S - 2);
  });
  const mSnow = new THREE.MeshLambertMaterial({ map: snowTex });
  const mPackedSnow = new THREE.MeshLambertMaterial({ map: packedSnowTex });
  const mIcePillar = new THREE.MeshStandardMaterial({
    map: icePillarTex,
    roughness: 0.22,
    metalness: 0.05,
    transparent: true,
    opacity: 0.82,
  });

  // ── Existing special block textures ──────────────────────────────────
  const mossTex = T("mossy_cobblestone");
  const mudTex = T("coarse_dirt");
  // Clay: smooth pale grey-tan with fine mineral speckle
  const clayTex = pixelTex((ctx, S) => {
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const n = valueNoise(x / S, y / S, 5) * 0.3 + valueNoise(x / S, y / S, 11) * 0.15;
        const brightness = 0.85 + n * 0.3;
        const r = Math.round(190 * brightness),
          g = Math.round(165 * brightness),
          b = Math.round(135 * brightness);
        ctx.fillStyle = `rgb(${Math.min(255, r)},${Math.min(255, g)},${Math.min(255, b)})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    speckle(ctx, S, ["#b89878", "#d8b898", "#a08060"], 0.1);
  });
  const bricksTex = T("stone_bricks");
  const marbleTex = T("diorite");
  const basaltSideTex = T("basalt_side");
  const basaltTopTex = T("basalt_top");
  // Glow block: warm luminous core, driven by an emissive map
  const glowTex = pixelTex((ctx, S) => {
    const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, "#fff6c8");
    g.addColorStop(0.55, "#ffd24a");
    g.addColorStop(1, "#e08a10");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    speckle(ctx, S, ["rgba(255,255,255,0.25)", "rgba(255,200,0,0.15)"], 0.15);
  });
  const crackedStoneTex = T("cobblestone");
  const polishedStoneTex = T("smooth_stone");
  // Ice: frosty opaque block (distinct from the decorative ice pillar)
  const iceTex = pixelTex((ctx, S) => {
    const g = ctx.createLinearGradient(0, 0, S, S);
    g.addColorStop(0, "#dff3ff");
    g.addColorStop(1, "#a8d8f0");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    speckle(ctx, S, ["rgba(255,255,255,0.35)", "rgba(150,200,230,0.25)"], 0.1);
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo((Math.random() * S) | 0, (Math.random() * S) | 0);
      ctx.lineTo((Math.random() * S) | 0, (Math.random() * S) | 0);
      ctx.stroke();
    }
  });
  const darkWoodSideTex = T("dark_oak_log");
  const darkWoodTopTex = T("dark_oak_log_top");
  // Slime: glossy jelly-green — kept opaque (still instanced) so bounce
  // pads don't pay the per-mesh transparency cost that leaves/glass do.
  const slimeTex = pixelTex((ctx, S) => {
    const g = ctx.createRadialGradient(S * 0.3, S * 0.3, 0, S * 0.5, S * 0.5, S * 0.75);
    g.addColorStop(0, "#c4f76a");
    g.addColorStop(0.6, "#7bd63a");
    g.addColorStop(1, "#4fa622");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 5; i++) {
      const x = Math.random() * S,
        y = Math.random() * S,
        r = 6 + Math.random() * 10;
      const glow = ctx.createRadialGradient(x, y, 0, x, y, r);
      glow.addColorStop(0, "rgba(255,255,255,0.35)");
      glow.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, S, S);
    }
  });

  const mMoss = new THREE.MeshLambertMaterial({ map: mossTex });
  const mMud = new THREE.MeshLambertMaterial({ map: mudTex });
  const mClay = new THREE.MeshLambertMaterial({ map: clayTex });
  const mBricks = new THREE.MeshLambertMaterial({ map: bricksTex });
  const mMarble = new THREE.MeshStandardMaterial({
    map: marbleTex,
    roughness: 0.55,
    metalness: 0.0,
  });
  const mBasaltSide = new THREE.MeshStandardMaterial({
    map: basaltSideTex,
    roughness: 0.85,
    metalness: 0.1,
  });
  const mBasaltTop = new THREE.MeshStandardMaterial({
    map: basaltTopTex,
    roughness: 0.8,
    metalness: 0.1,
  });
  const basaltFaces = [mBasaltSide, mBasaltSide, mBasaltTop, mBasaltTop, mBasaltSide, mBasaltSide];
  const mGlow = new THREE.MeshStandardMaterial({
    map: glowTex,
    emissiveMap: glowTex,
    emissive: 0xffb020,
    emissiveIntensity: 0.9,
    roughness: 0.78,
    metalness: 0.0,
  });
  const mCrackedStone = new THREE.MeshLambertMaterial({ map: crackedStoneTex });
  const mPolishedStone = new THREE.MeshStandardMaterial({
    map: polishedStoneTex,
    roughness: 0.55,
    metalness: 0.0,
  });
  const mIce = new THREE.MeshStandardMaterial({ map: iceTex, roughness: 0.35, metalness: 0.0 });
  const mDarkWoodSide = new THREE.MeshLambertMaterial({ map: darkWoodSideTex });
  const mDarkWoodTop = new THREE.MeshLambertMaterial({ map: darkWoodTopTex });
  const darkWoodFaces = [
    mDarkWoodSide,
    mDarkWoodSide,
    mDarkWoodTop,
    mDarkWoodTop,
    mDarkWoodSide,
    mDarkWoodSide,
  ];
  const mSlime = new THREE.MeshStandardMaterial({ map: slimeTex, roughness: 0.35, metalness: 0.0 });

  // ── New block materials (21–55) ──────────────────────────────────────
  const mGravel = new THREE.MeshLambertMaterial({ map: gravelTex });
  const mOakPlanks = new THREE.MeshLambertMaterial({ map: oakPlanksTex });
  const mBirchSide = new THREE.MeshLambertMaterial({ map: birchSideTex });
  const mBirchTop = new THREE.MeshLambertMaterial({ map: birchTopTex });
  const birchFaces = [mBirchSide, mBirchSide, mBirchTop, mBirchTop, mBirchSide, mBirchSide];
  const mBirchLeaves = new THREE.MeshLambertMaterial({
    map: birchLeavesTex,
    color: 0x8de030,
    transparent: true,
    alphaTest: 0.15,
  });
  const mSpruceSide = new THREE.MeshLambertMaterial({ map: spruceSideTex });
  const mSpruceTop = new THREE.MeshLambertMaterial({ map: spruceTopTex });
  const spruceFaces = [mSpruceSide, mSpruceSide, mSpruceTop, mSpruceTop, mSpruceSide, mSpruceSide];
  const mSpruceLeaves = new THREE.MeshLambertMaterial({
    map: spruceLeavesTex,
    color: 0x208028,
    transparent: true,
    alphaTest: 0.15,
  });
  const mAcaciaSide = new THREE.MeshLambertMaterial({ map: acaciaSideTex });
  const mAcaciaTop = new THREE.MeshLambertMaterial({ map: acaciaTopTex });
  const acaciaFaces = [mAcaciaSide, mAcaciaSide, mAcaciaTop, mAcaciaTop, mAcaciaSide, mAcaciaSide];
  const mAcaciaLeaves = new THREE.MeshLambertMaterial({
    map: acaciaLeavesTex,
    color: 0x58c018,
    transparent: true,
    alphaTest: 0.15,
  });
  const mJungleSide = new THREE.MeshLambertMaterial({ map: jungleSideTex });
  const mJungleTop = new THREE.MeshLambertMaterial({ map: jungleTopTex });
  const jungleFaces = [mJungleSide, mJungleSide, mJungleTop, mJungleTop, mJungleSide, mJungleSide];
  const mJungleLeaves = new THREE.MeshLambertMaterial({
    map: jungleLeavesTex,
    color: 0x28d412,
    transparent: true,
    alphaTest: 0.15,
  });
  const mGranite = new THREE.MeshLambertMaterial({ map: graniteTex });
  const mAndesite = new THREE.MeshLambertMaterial({ map: andesiteTex });
  const mObsidian = new THREE.MeshStandardMaterial({
    map: obsidianTex,
    roughness: 0.3,
    metalness: 0.3,
  });
  const mGoldBlock = new THREE.MeshStandardMaterial({
    map: goldBlockTex,
    roughness: 0.2,
    metalness: 0.9,
  });
  const mDiamondBlock = new THREE.MeshStandardMaterial({
    map: diamondBlockTex,
    roughness: 0.1,
    metalness: 0.6,
    color: 0x5be6e0,
  });
  const mIronBlock = new THREE.MeshStandardMaterial({
    map: ironBlockTex,
    roughness: 0.25,
    metalness: 0.8,
  });
  const mEmeraldBlock = new THREE.MeshStandardMaterial({
    map: emeraldBlockTex,
    roughness: 0.2,
    metalness: 0.5,
    color: 0x17dd62,
  });
  const mLapisBlock = new THREE.MeshStandardMaterial({
    map: lapisBlockTex,
    roughness: 0.4,
    metalness: 0.2,
    color: 0x1a4abf,
  });
  const mNetherRack = new THREE.MeshLambertMaterial({ map: netherRackTex });
  const mNetherBricks = new THREE.MeshLambertMaterial({ map: netherBricksTex });
  const mTerracotta = new THREE.MeshLambertMaterial({ map: terracottaTex });
  const mRedSand = new THREE.MeshLambertMaterial({ map: redSandTex });
  const mPumpkinSide = new THREE.MeshLambertMaterial({ map: pumpkinSideTex });
  const mPumpkinTop = new THREE.MeshLambertMaterial({ map: pumpkinTopTex });
  const pumpkinFaces = [
    mPumpkinSide,
    mPumpkinSide,
    mPumpkinTop,
    mPumpkinTop,
    mPumpkinSide,
    mPumpkinSide,
  ];
  const mMelonSide = new THREE.MeshLambertMaterial({ map: melonSideTex });
  const mMelonTop = new THREE.MeshLambertMaterial({ map: melonTopTex });
  const melonFaces = [mMelonSide, mMelonSide, mMelonTop, mMelonTop, mMelonSide, mMelonSide];
  const mWhiteWool = new THREE.MeshLambertMaterial({ map: whiteWoolTex });
  const mRedWool = new THREE.MeshLambertMaterial({ map: redWoolTex });
  const mBlueWool = new THREE.MeshLambertMaterial({ map: blueWoolTex });
  const mGreenWool = new THREE.MeshLambertMaterial({ map: greenWoolTex });
  const mYellowWool = new THREE.MeshLambertMaterial({ map: yellowWoolTex });
  // Block Party arena colors — no source PNGs for these 4, so they're
  // painted procedurally (flat tint + light speckle) to match the wool
  // look instead of loading extra texture assets.
  function partyTex(hex: string) {
    return pixelTex((ctx, S) => {
      ctx.fillStyle = hex;
      ctx.fillRect(0, 0, S, S);
      speckle(ctx, S, ["rgba(255,255,255,0.10)", "rgba(0,0,0,0.08)"], 0.35);
    });
  }
  const mOrangeWool = new THREE.MeshLambertMaterial({ map: partyTex("#f97316") });
  const mPurpleWool = new THREE.MeshLambertMaterial({ map: partyTex("#a855f7") });
  const mCyanWool = new THREE.MeshLambertMaterial({ map: partyTex("#22d3ee") });
  const mPinkWool = new THREE.MeshLambertMaterial({ map: partyTex("#ec4899") });
  const mGlowstone = new THREE.MeshStandardMaterial({
    map: glowstoneTex,
    emissiveMap: glowstoneTex,
    emissive: 0xffee88,
    emissiveIntensity: 1.2,
    roughness: 0.7,
    metalness: 0.0,
  });
  const mAmethyst = new THREE.MeshStandardMaterial({
    map: amethystTex,
    roughness: 0.15,
    metalness: 0.3,
    color: 0x9966dd,
  });
  const mHaySide = new THREE.MeshLambertMaterial({ map: haySideTex });
  const mHayTop = new THREE.MeshLambertMaterial({ map: hayTopTex });
  const hayFaces = [mHaySide, mHaySide, mHayTop, mHayTop, mHaySide, mHaySide];
  const mCoalOre = new THREE.MeshLambertMaterial({ map: coalOreTex });
  const mRedstoneOre = new THREE.MeshStandardMaterial({
    map: redstoneOreTex,
    roughness: 0.85,
    metalness: 0.1,
    emissive: 0x660000,
    emissiveIntensity: 0.3,
  });
  const mCryingObs = new THREE.MeshStandardMaterial({
    map: cryingObsTex,
    emissiveMap: cryingObsTex,
    emissive: new THREE.Color(0.18, 0.05, 0.65),
    emissiveIntensity: 1.0,
    roughness: 0.3,
    metalness: 0.2,
  });
  const mTNTSide = new THREE.MeshLambertMaterial({ map: tntSideTex });
  const mTNTTop = new THREE.MeshLambertMaterial({ map: tntTopTex });
  const tntFaces = [mTNTSide, mTNTSide, mTNTTop, mTNTTop, mTNTSide, mTNTSide];
  const mBookshelf = new THREE.MeshLambertMaterial({ map: bookshelfTex });
  const mChiseled = new THREE.MeshLambertMaterial({ map: chiseledTex });
  const mPathSide = new THREE.MeshLambertMaterial({ map: pathSideTex });
  const mPathTop = new THREE.MeshLambertMaterial({ map: pathTopTex });
  const pathFaces = [mPathSide, mPathSide, mPathTop, mPathTop, mPathSide, mPathSide];

  // Lava: glowing crust — procedural (no lava.png in pack)
  const lavaTex = pixelTex((ctx, S) => {
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const n1 = valueNoise(x / S, y / S, 4) * 0.5 + valueNoise(x / S, y / S, 8) * 0.3;
        const n2 = valueNoise(x / S + 1.7, y / S + 0.9, 6) * 0.4;
        const crust = n1 * 0.6 + n2 * 0.4;
        if (crust > 0.5) {
          const v = Math.round(10 + (crust - 0.5) * 60);
          ctx.fillStyle = `rgb(${v + 4},${v},${v})`;
        } else {
          const heat = 1.0 - crust / 0.5;
          const r = Math.min(255, Math.round(200 + heat * 55));
          const g = Math.min(255, Math.round(heat * 110));
          ctx.fillStyle = `rgb(${r},${g},0)`;
        }
        ctx.fillRect(x, y, 1, 1);
      }
    }
    // Hot bright spots / gas bubbles
    for (let i = 0; i < 8; i++) {
      const hx = Math.random() * S,
        hy = Math.random() * S,
        hr = 3 + Math.random() * 9;
      const hg = ctx.createRadialGradient(hx, hy, 0, hx, hy, hr);
      hg.addColorStop(0, "rgba(255,220,70,0.95)");
      hg.addColorStop(0.5, "rgba(255,100,0,0.55)");
      hg.addColorStop(1, "rgba(200,20,0,0)");
      ctx.fillStyle = hg;
      ctx.fillRect(0, 0, S, S);
    }
  }, 128);
  const mLava = new THREE.MeshStandardMaterial({
    map: lavaTex,
    emissiveMap: lavaTex,
    emissive: new THREE.Color(1.0, 0.28, 0.0),
    emissiveIntensity: 1.6,
    roughness: 0.95,
    metalness: 0.0,
  });

  function matForType(type: number): THREE.Material | THREE.Material[] {
    switch (type) {
      case 0:
        return grassFaces;
      case 1:
        return mDirt;
      case 2:
        return mStone;
      case 3:
        return woodFaces;
      case 4:
        return mSand;
      case 5:
        return mLeaves;
      case 6:
        return mWater;
      case 7:
        return mGlass;
      case 8:
        return mMoss;
      case 9:
        return mMud;
      case 10:
        return mClay;
      case 11:
        return mBricks;
      case 12:
        return mMarble;
      case 13:
        return basaltFaces;
      case 14:
        return mGlow;
      case 15:
        return mCrackedStone;
      case 16:
        return mPolishedStone;
      case 17:
        return mIce;
      case 18:
        return darkWoodFaces;
      case 19:
        return mSlime;
      case 20:
        return mLava;
      // ── New blocks 21–55 ────────────────────────────────────────────
      case 21:
        return mGravel;
      case 22:
        return mOakPlanks;
      case 23:
        return birchFaces;
      case 24:
        return spruceFaces;
      case 25:
        return acaciaFaces;
      case 26:
        return jungleFaces;
      case 27:
        return mGranite;
      case 28:
        return mAndesite;
      case 29:
        return mObsidian;
      case 30:
        return mGoldBlock;
      case 31:
        return mDiamondBlock;
      case 32:
        return mIronBlock;
      case 33:
        return mEmeraldBlock;
      case 34:
        return mLapisBlock;
      case 35:
        return mNetherRack;
      case 36:
        return mNetherBricks;
      case 37:
        return mTerracotta;
      case 38:
        return mRedSand;
      case 39:
        return pumpkinFaces;
      case 40:
        return melonFaces;
      case 41:
        return mWhiteWool;
      case 42:
        return mRedWool;
      case 43:
        return mBlueWool;
      case 44:
        return mGreenWool;
      case 45:
        return mYellowWool;
      case 46:
        return mGlowstone;
      case 47:
        return mAmethyst;
      case 48:
        return hayFaces;
      case 49:
        return mCoalOre;
      case 50:
        return mRedstoneOre;
      case 51:
        return mCryingObs;
      case 52:
        return tntFaces;
      case 53:
        return mBookshelf;
      case 54:
        return mChiseled;
      case 55:
        return pathFaces;
      // ── Terrain-only leaf types (biome trees, not in hotbar) ────────
      case 200:
        return mBirchLeaves;
      case 201:
        return mSpruceLeaves;
      case 202:
        return mAcaciaLeaves;
      case 203:
        return mJungleLeaves;
      // ── Spleef-only arena types ──────────────────────────────────────
      case 100:
        return mSnow;
      case 101:
        return mPackedSnow;
      // ── Block Party arena colors ──────────────────────────────────────
      case 210:
        return mRedWool;
      case 211:
        return mBlueWool;
      case 212:
        return mGreenWool;
      case 213:
        return mYellowWool;
      case 214:
        return mOrangeWool;
      case 215:
        return mPurpleWool;
      case 216:
        return mCyanWool;
      case 217:
        return mPinkWool;
    }
    return mDirt;
  }

  return {
    grassTop,
    grassSide,
    dirtTex,
    stoneTex,
    woodSide,
    woodTop,
    sandTex,
    leavesTex,
    glassTex,
    mGrassTop,
    mGrassSide,
    mGrassBottom,
    grassFaces,
    mDirt,
    mStone,
    mWoodSide,
    mWoodTop,
    woodFaces,
    mSand,
    mLeaves,
    mWater,
    mGlass,
    snowTex,
    packedSnowTex,
    icePillarTex,
    mSnow,
    mPackedSnow,
    mIcePillar,
    mMoss,
    mMud,
    mClay,
    mBricks,
    mMarble,
    basaltFaces,
    mGlow,
    mCrackedStone,
    mPolishedStone,
    mIce,
    darkWoodFaces,
    mSlime,
    mLava,
    // new 21–55
    mGravel,
    mOakPlanks,
    birchFaces,
    mBirchLeaves,
    spruceFaces,
    mSpruceLeaves,
    acaciaFaces,
    mAcaciaLeaves,
    jungleFaces,
    mJungleLeaves,
    mGranite,
    mAndesite,
    mObsidian,
    mGoldBlock,
    mDiamondBlock,
    mIronBlock,
    mEmeraldBlock,
    mLapisBlock,
    mNetherRack,
    mNetherBricks,
    mTerracotta,
    mRedSand,
    pumpkinFaces,
    melonFaces,
    mWhiteWool,
    mRedWool,
    mBlueWool,
    mGreenWool,
    mYellowWool,
    mOrangeWool,
    mPurpleWool,
    mCyanWool,
    mPinkWool,
    mGlowstone,
    mAmethyst,
    hayFaces,
    mCoalOre,
    mRedstoneOre,
    mCryingObs,
    tntFaces,
    mBookshelf,
    mChiseled,
    pathFaces,
    matForType,
  };
}

// Cache intentionally reset when texture quality settings change.
let _proceduralAssetsCache: ReturnType<typeof buildProceduralAssets> | null = null;
// Force rebuild on next mount so LinearFilter + saturation colour changes take effect.
_proceduralAssetsCache = null;
function getProceduralAssets(renderer: THREE.WebGLRenderer) {
  if (!_proceduralAssetsCache) {
    _proceduralAssetsCache = buildProceduralAssets(renderer);
  } else {
    // Anisotropy is tied to the renderer/GPU that created it, not the
    // texture data — refresh it cheaply against the current renderer
    // instead of repainting on every mount.
    const aniso = Math.max(1, renderer.capabilities.getMaxAnisotropy());
    for (const t of [
      _proceduralAssetsCache.grassTop,
      _proceduralAssetsCache.grassSide,
      _proceduralAssetsCache.dirtTex,
      _proceduralAssetsCache.stoneTex,
      _proceduralAssetsCache.woodSide,
      _proceduralAssetsCache.woodTop,
      _proceduralAssetsCache.sandTex,
      _proceduralAssetsCache.leavesTex,
      _proceduralAssetsCache.glassTex,
      _proceduralAssetsCache.snowTex,
      _proceduralAssetsCache.packedSnowTex,
      _proceduralAssetsCache.icePillarTex,
    ])
      t.anisotropy = aniso;
  }
  return _proceduralAssetsCache;
}

function GamePage() {
  const { id } = Route.useParams();
  const [currentServerId, setCurrentServerId] = useState<string>(() => {
    if (typeof window === "undefined") return `${id}-server-1`;
    const params = new URLSearchParams(window.location.search);
    return params.get("server") || `${id}-server-1`;
  });

  const handleServerChange = (newServerId: string) => {
    setCurrentServerId(newServerId);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("server", newServerId);
      window.history.replaceState({}, "", url.toString());
      // Trigger smooth reload or state sync if needed
    }
  };

  const [privateServer] = useState(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    if (params.get("private") !== "1") return null;
    return {
      privacy: (params.get("privacy") === "friends" ? "friends" : "global") as "global" | "friends",
    };
  });
  return (
    <>
      {/* Roblox-style Server & Matchmaking Bar with 16 Player presence */}
      <RobloxInGameServerBar
        gameId={id}
        currentServerId={currentServerId}
        onServerChange={handleServerChange}
      />

      {id === "bedwars-golden-days" ? (
        <BedwarsGoldenDays />
      ) : id === "bedwars" ? (
        <SandboxGame bedwars />
      ) : id === "skyblock" || id.startsWith("skyblock") ? (
        <SandboxGame skyblock />
      ) : id === "block-fall" || id.startsWith("block-fall") ? (
        <SandboxGame blockFall />
      ) : id === "sandbox" ? (
        <SandboxGame />
      ) : (
        <>
          <EngineGame
            key={`${id}-${currentServerId}`}
            isSpleef={id === "spleef"}
            isBedwars={false}
            isEggwars={id === "egg-wars" || id === "eggwars"}
            isSkyblock={id === "escape-scp-069" || id === "skyblock"}
            isEscape={id === "escape-scp-069"}
            isTntRush={id === "tnt-rush"}
            isSkyWars={id === "skywars"}
            isBlockFall={id === "block-fall"}
            isBlockParty={id === "block-party"}
            isBlockyplaza={id === "blockyplaza"}
            isBaseplate={id === "baseplate"}
            privateServer={privateServer}
          />
          {/* Blocky Plaza has its own compact in-world bar, so avoid duplicating
              the global chrome on top of the hub controls. */}
          {id !== "blockyplaza" && id !== "skyblock" && id !== "block-fall" && id !== "escape-scp-069" && (
            <GameUiChrome
              key={`chrome-${id}`}
              title={id === "egg-wars" || id === "eggwars" ? "EggWars" : id}
            />
          )}
        </>
      )}
    </>
  );
}

// Visual joystick base is fixed bottom-left; the knob travels up to this
// many px from center. Kept as a shared constant so the touch logic (which
// normalizes drag distance) and the visual (which renders the knob offset)
// never drift out of sync with each other.
const JOY_KNOB_TRAVEL = 40;

// ── Engine v5: Animal entity ──────────────────────────────────────────────────
interface AnimalEntity {
  group: THREE.Group;
  head: THREE.Object3D;
  legs: THREE.Object3D[];
  walkPhase: number;
  wanderDir: number;
  wanderTimer: number;
  isMoving: boolean;
  home: THREE.Vector3;
}

function EngineGame({
  isSpleef = false,
  isBedwars = false,
  isEggwars = false,
  isSkyblock = false,
  isEscape = false,
  isTntRush = false,
  isSkyWars = false,
  isBlockParty = false,
  isBlockyplaza = false,
  isBaseplate = false,
  isBlockFall = false,
  privateServer = null,
}: {
  isSpleef?: boolean;
  isBedwars?: boolean;
  isEggwars?: boolean;
  isSkyblock?: boolean;
  isEscape?: boolean;
  isTntRush?: boolean;
  isSkyWars?: boolean;
  isBlockParty?: boolean;
  isBlockyplaza?: boolean;
  isBaseplate?: boolean;
  isBlockFall?: boolean;
  privateServer?: { privacy: "global" | "friends" } | null;
}) {
  const [gameState, setGameState] = useState<"lobby" | "countdown" | "playing">("lobby");

  const nav = useNavigate();
  const { qbUser } = useAuth();
  const avatarColor = useAvatarColor();
  const mountRef = useRef<HTMLDivElement | null>(null);
  const joyBaseRef = useRef<HTMLDivElement | null>(null);
  const joyKnobRef = useRef<HTMLDivElement | null>(null);
  // Outer wrapper positioned imperatively to the touch point each time
  const joyContainerRef = useRef<HTMLDivElement | null>(null);
  // BedWars nameplates — positioned imperatively every frame by
  // projecting world positions to screen space (same as the joystick above).
  const bwNameplateRef = useRef<HTMLDivElement | null>(null);
  const bwBotNameplateRef = useRef<HTMLDivElement | null>(null);
  const [slot, setSlot] = useState(0);
  const [running, setRunning] = useState(false);
  const holdProgressRef = useRef<HTMLDivElement | null>(null);
  const holdCircleRef = useRef<SVGCircleElement | null>(null);
  const updateHoldProgress = (pct: number) => {
    if (!holdProgressRef.current || !holdCircleRef.current) return;
    if (pct <= 0) {
      holdProgressRef.current.style.display = "none";
    } else {
      holdProgressRef.current.style.display = "block";
      const circ = 2 * Math.PI * 18;
      holdCircleRef.current.style.strokeDashoffset = `${(1 - pct) * circ}px`;
    }
  };
  const [worldReady, setWorldReady] = useState(false);
  const [skyblockLoadingDone, setSkyblockLoadingDone] = useState(true);
  const [engineError, setEngineError] = useState(false);
  const [hp, setHp] = useState(20);
  const [chatOpen, setChatOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [invOpen, setInvOpen] = useState(false);
  const [skyPassOpen, setSkyPassOpen] = useState(false);
  const [skyblockArea, setSkyblockArea] = useState<"home" | "mining">("home");
  const [skyblockTeleporting, setSkyblockTeleporting] = useState<"home" | "mining" | null>(null);
  const [nearPhoenixNest, setNearPhoenixNest] = useState(false);
  const [ridingPhoenix, setRidingPhoenix] = useState(false);

  // Left cube menu dropdown & plain Android quit confirmation dialog
  const [cubeMenuOpen, setCubeMenuOpen] = useState(false);
  const [showQuitDialog, setShowQuitDialog] = useState(false);

  // Intercept phone back button to trigger the Android quit dialog
  useEffect(() => {
    try {
      window.history.pushState({ inGame: true }, "");
    } catch {}

    const handlePopState = () => {
      try {
        window.history.pushState({ inGame: true }, "");
      } catch {}
      setShowQuitDialog(true);
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  // Night Mode (Moon & Aurora Borealis) state & ref
  const [nightMode, setNightMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("bm-nightmode") === "true";
  });
  const nightModeRef = useRef(nightMode);
  useEffect(() => {
    nightModeRef.current = nightMode;
    try {
      localStorage.setItem("bm-nightmode", String(nightMode));
    } catch {}
  }, [nightMode]);

  // Joystick Inversion controls (fixed inverted movement)
  const [invertJoyY, setInvertJoyY] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("bm-invert-joy-y") === "true";
  });
  const invertJoyYRef = useRef(invertJoyY);
  useEffect(() => {
    invertJoyYRef.current = invertJoyY;
    try {
      localStorage.setItem("bm-invert-joy-y", String(invertJoyY));
    } catch {}
  }, [invertJoyY]);

  const [invertJoyX, setInvertJoyX] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("bm-invert-joy-x") === "true";
  });
  const invertJoyXRef = useRef(invertJoyX);
  useEffect(() => {
    invertJoyXRef.current = invertJoyX;
    try {
      localStorage.setItem("bm-invert-joy-x", String(invertJoyX));
    } catch {}
  }, [invertJoyX]);

  const [qualityPrefState, setQualityPrefState] = useState<"low" | "medium" | "high" | "uhd">(() => {
    if (typeof window === "undefined") return "uhd";
    return (localStorage.getItem("bm-quality") || "uhd") as "low" | "medium" | "high" | "uhd";
  });
  const [motionBlurState, setMotionBlurState] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem("bm-motion-blur");
    return stored === null ? false : stored === "true";
  });
  const [visitingUserId, setVisitingUserId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("visit");
  });
  const [visitingHostName, setVisitingHostName] = useState<string | null>(null);

  useEffect(() => {
    if (!visitingUserId) return;
    getDoc(doc(db, "users", visitingUserId))
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const name = (data.displayName as string) || (data.username as string) || "Friend";
          setVisitingHostName(name);
        }
      })
      .catch(() => {});
  }, [visitingUserId]);

  useEffect(() => {
    if (!isSkyblock) return;
    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        incrementSkyblockTime(1);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isSkyblock]);

  useEffect(() => {
    const handleNear = (e: Event) => {
      setNearPhoenixNest((e as CustomEvent<boolean>).detail);
    };
    const handleRiding = (e: Event) => {
      setRidingPhoenix((e as CustomEvent<boolean>).detail);
    };
    window.addEventListener("bm-phoenix-near", handleNear as EventListener);
    window.addEventListener("bm-phoenix-riding", handleRiding as EventListener);
    return () => {
      window.removeEventListener("bm-phoenix-near", handleNear as EventListener);
      window.removeEventListener("bm-phoenix-riding", handleRiding as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!isSkyblock) {
      setSkyblockLoadingDone(true);
      return;
    }
    const isVisiting = !!visitingUserId && visitingUserId !== qbUser?.uid;
    if (isVisiting) {
      const timer = setTimeout(() => {
        setSkyblockLoadingDone(true);
      }, 1200);
      return () => clearTimeout(timer);
    } else {
      setSkyblockLoadingDone(true);
    }
  }, [isSkyblock, visitingUserId, qbUser?.uid]);

  // Guaranteed fallback dismiss for all game modes so world never hangs on loading screen
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      setWorldReady(true);
      setSkyblockLoadingDone(true);
    }, 1500);
    return () => clearTimeout(safetyTimer);
  }, []);
  const [sbTutorialStep, setSbTutorialStep] = useState(() =>
    isSkyblock && typeof window !== "undefined" && !localStorage.getItem("sb-tutorial-done")
      ? 0
      : -1,
  );
  const sbTutorialDone = () => {
    setSbTutorialStep(-1);
    if (typeof window !== "undefined") localStorage.setItem("sb-tutorial-done", "1");
  };
  // Which shovel tier is visually shown in the hotbar (null = block equipped)
  const [heldShovelIdx, setHeldShovelIdx] = useState<number | null>(null);
  // Hotbar icons are generated on a <canvas> (client-only). Rendering their
  // data URLs during the initial pass would mismatch the server-rendered
  // markup, so they start empty (flat color fallback) and fill in once
  // mounted — after hydration, so React never has to reconcile a mismatch.
  const [blockIcons, setBlockIcons] = useState<Record<string, string>>({});
  useEffect(() => {
    const icons: Record<string, string> = {};
    for (const b of BLOCKS) icons[b.name] = getBlockIcon(b.name, b.color);
    setBlockIcons(icons);
  }, []);
  const [chatVal, setChatVal] = useState("");
  const [chatFocused, setChatFocused] = useState(false);
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([]);

  const [showRotateMsg, setShowRotateMsg] = useState(false);
  const slotRef = useRef(slot);
  const runRef = useRef(running);
  slotRef.current = slot;
  runRef.current = running;
  const [flyMode, setFlyMode] = useState(false);
  const flyRef = useRef(false);
  flyRef.current = flyMode;

  type MovementMode = "crouch" | "walk" | "run";
  const [movementMode, setMovementMode] = useState<MovementMode>("walk");
  const crouchRef = useRef(false);
  const cycleMovementMode = () => {
    // Crouch -> Walk -> Run -> repeat
    const next: MovementMode =
      movementMode === "crouch" ? "walk" : movementMode === "walk" ? "run" : "crouch";
    setMovementMode(next);
    setRunning(next === "run");
    runRef.current = next === "run";
    crouchRef.current = next === "crouch";
  };
  const toggleCrouch = () => {
    const next: MovementMode = movementMode === "crouch" ? "walk" : "crouch";
    setMovementMode(next);
    setRunning(false);
    runRef.current = false;
    crouchRef.current = next === "crouch";
  };
  const toggleRun = () => {
    const next: MovementMode = movementMode === "run" ? "walk" : "run";
    setMovementMode(next);
    setRunning(next === "run");
    runRef.current = next === "run";
    crouchRef.current = false;
  };
  const setWalk = () => {
    setMovementMode("walk");
    setRunning(false);
    runRef.current = false;
    crouchRef.current = false;
  };
  const setRun = () => {
    setMovementMode("run");
    setRunning(true);
    runRef.current = true;
    crouchRef.current = false;
  };

  // Camera mode: first-person (default), third-person orbit, or top-down
  const [camMode, setCamMode] = useState<"first" | "third" | "top">(() => {
    try {
      const stored = localStorage.getItem("qb_first_person");
      if (stored === "true") return "first";
      if (stored === "false") return "third";
    } catch {}
    return isSkyblock || isBlockFall ? "third" : "first";
  });
  const camModeRef = useRef<"first" | "third" | "top">(isSkyblock || isBlockFall ? "third" : "first");
  camModeRef.current = camMode;
  
  // Listen for the custom event from settings
  useEffect(() => {
    const handleToggle = (e: any) => {
      const nextMode = e.detail ? "first" : "third";
      setCamMode(nextMode);
    };
    window.addEventListener("bm-first-person", handleToggle);
    return () => window.removeEventListener("bm-first-person", handleToggle);
  }, []);
  
  const cycleCamMode = () =>
    setCamMode((m) => (m === "first" ? "third" : m === "third" ? "top" : "first"));

  // Skyblock currency purchase modal
  const [sbBuyType, setSbBuyType] = useState<"gold" | "gem" | null>(null);

  // Skyblock real-time multiplayer chat sync
  useEffect(() => {
    if (!isSkyblock) return;
    const effectiveIslandId = visitingUserId || qbUser?.islandId || qbUser?.uid || "my_island";
    const unsub = subscribeToSkyblockChat(effectiveIslandId, (latest) => {
      if (!latest) return;
      if (latest.senderId && latest.senderId === qbUser?.uid) return;
      setChatMsgs((prev) => {
        if (
          prev.some(
            (m) =>
              m.id === latest.createdAt || (m.from === latest.senderName && m.text === latest.text),
          )
        ) {
          return prev;
        }
        return [
          ...prev,
          {
            id: latest.createdAt || Date.now(),
            from: latest.senderName,
            text: latest.text,
            special: latest.tag === "ladybug" ? ("ladybug" as const) : undefined,
          },
        ];
      });
      setChatBubble({ text: latest.text, sender: latest.senderName, time: Date.now() });
      GameAudio.playChatChime();
      window.setTimeout(() => setChatBubble(null), 5500);
    });
    return () => unsub();
  }, [isSkyblock, visitingUserId, qbUser?.islandId, qbUser?.uid]);

  // Blocky Plaza / Skyblock: collectible token coins + toast
  const bpCoinMeshesRef = useRef<THREE.Mesh[]>([]);
  const [bpCoinToast, setBpCoinToast] = useState<string | null>(null);
  const bpGold = useCurrency("gold");
  const bpGems = useCurrency("gems");
  const bpPink = useCurrency("pinkCube");
  const equippedItemIds = useEquippedItems();
  const equippedPants = useEquippedPants();
  const equippedSkin = useEquippedSkin();
  const equippedFace = useFaceId();
  const equippedGender = useGender();
  const hasBandana = useBandana();
  const profileAvatar = qbUser?.avatarSnapshot;
  const gameAvatarColor = profileAvatar?.color ?? avatarColor;
  const gameSkin = profileAvatar?.skinId ?? equippedSkin;
  const gameFace = profileAvatar?.faceId ?? equippedFace;
  const gameGender = profileAvatar?.gender ?? equippedGender;
  const gameBandana = profileAvatar?.showBandana ?? hasBandana;
  const gameItems = profileAvatar?.equippedItemIds ?? [...equippedItemIds];
  const gamePants = profileAvatar?.equippedPants ?? equippedPants;

  useEffect(() => {
    if (profileAvatar) applyAvatarSnapshot(profileAvatar);
  }, [profileAvatar]);

  // Floating grey chat popup bubble with 3D avatar & item collection toast
  const [chatBubble, setChatBubble] = useState<{
    text: string;
    sender: string;
    time: number;
  } | null>(null);
  const [itemToast, setItemToast] = useState<{ name: string; icon: string; count: number } | null>(
    null,
  );

  useEffect(() => {
    const onCollected = (e: Event) => {
      const detail = (e as CustomEvent<{ name: string; qty: number }>).detail;
      if (!detail) return;
      const icon = getBlockIcon(detail.name, 0x888888);
      setItemToast({ name: detail.name, icon, count: detail.qty });
      window.setTimeout(() => setItemToast(null), 2400);
    };
    window.addEventListener("bm-item-collected", onCollected);
    return () => window.removeEventListener("bm-item-collected", onCollected);
  }, []);

  // ── Spleef-only state ──────────────────────────────────────────────────
  const [sphase, setSphase] = useState<SpleefPhase>("countdown");
  const [scountdown, setScountdown] = useState(3);
  const [selapsed, setSelapsed] = useState(0);
  const [sovertime, setSovertime] = useState(false);
  const [slastElim, setSlastElim] = useState<string | null>(null);
  const sfrozenRef = useRef(true);
  const sphaseRef = useRef<SpleefPhase>("countdown");
  const selapsedRef = useRef(0);
  const sblocksRef = useRef(0);

  // Block Party is deliberately state-light: the shared voxel engine owns
  // the round transition, while React only renders the HUD.
  const [partyRound, setPartyRound] = useState(1);
  const [partyTime, setPartyTime] = useState(8);
  const [partyColor, setPartyColor] = useState("Red");
  const [partyMessage, setPartyMessage] = useState("Find the called color");
  const [partyStatus, setPartyStatus] = useState<
    "countdown" | "search" | "showdown" | "won" | "out"
  >("countdown");

  // ── BedWars-only state ─────────────────────────────────────────────────
  const [bwState, setBwState] = useState<BedwarsState>({
    phase: "lobby",
    countdown: 3,
    redTeam: { bedAlive: true, playerAlive: true },
    blueTeam: { bedAlive: true, playerAlive: true },
    iron: 0,
    gold: 0,
    emerald: 0,
  });
  const bwStateRef = useRef(bwState);
  bwStateRef.current = bwState;
  const [bwNpcPrompt, setBwNpcPrompt] = useState(false);
  const [bwNpcModal, setBwNpcModal] = useState(false);
  const [bwToast, setBwToast] = useState<string | null>(null);
  const [bwVictory, setBwVictory] = useState(false);
  const [bwDefeat, setBwDefeat] = useState(false);
  const [bwMatchLoading, setBwMatchLoading] = useState(false);
  // Ref to cancel the previous toast timer before scheduling a new one —
  // prevents stacking when the player hits the bot multiple times rapidly.
  const bwToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  function showBwToast(msg: string, ms = 1500) {
    if (bwToastTimerRef.current) clearTimeout(bwToastTimerRef.current);
    setBwToast(msg);
    bwToastTimerRef.current = setTimeout(() => {
      setBwToast(null);
      bwToastTimerRef.current = null;
    }, ms);
  }
  // ── EggWars-only state ─────────────────────────────────────����─────────────
  const EGG_TEAMS: EggwarsTeam[] = [
    { id: "ruby", label: "Ruby", color: "#ef4444", eggAlive: true, playerAlive: true },
    { id: "azure", label: "Azure", color: "#38bdf8", eggAlive: true, playerAlive: true },
    { id: "jade", label: "Jade", color: "#34d399", eggAlive: true, playerAlive: true },
    { id: "gold", label: "Gold", color: "#fbbf24", eggAlive: true, playerAlive: true },
  ];
  const [eggState, setEggState] = useState<EggwarsState>({
    phase: "lobby",
    countdown: 3,
    time: 0,
    iron: 0,
    gold: 0,
    diamond: 0,
    teams: EGG_TEAMS,
    generatorLevel: 1,
    toast: null,
  });
  const eggStateRef = useRef(eggState);
  eggStateRef.current = eggState;
  const eggCountdownStartedRef = useRef(false);
  const [eggMatchLoading, setEggMatchLoading] = useState(false);
  const eggToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  function showEggToast(msg: string, ms = 1800) {
    if (eggToastTimerRef.current) clearTimeout(eggToastTimerRef.current);
    setEggState((s) => ({ ...s, toast: msg }));
    eggToastTimerRef.current = setTimeout(() => {
      setEggState((s) => ({ ...s, toast: null }));
      eggToastTimerRef.current = null;
    }, ms);
  }
  // ref callbacks into 3D scene from React
  const bwSceneRef = useRef<{
    teleportLobby: () => void;
    teleportMatch: () => void;
    resetMatch: () => void;
  } | null>(null);
  const eggSceneRef = useRef<{
    startMatch: () => void;
    resetMatch: () => void;
  } | null>(null);
  // Skyblock: home / shop island teleport callbacks
  const sbSceneRef = useRef<{
    teleportHome: () => void;
    teleportShop: () => void;
    teleportMining: () => void;
  } | null>(null);
  const teleportSkyblock = (area: "home" | "mining") => {
    if (!isSkyblock || skyblockTeleporting) return;
    const teleport =
      area === "mining" ? sbSceneRef.current?.teleportMining : sbSceneRef.current?.teleportHome;
    if (!teleport) return;
    setSkyblockTeleporting(area);
    teleport();
    setSkyblockArea(area);
    window.setTimeout(() => setSkyblockTeleporting(null), 220);
  };
  const [shopModalOpen, setShopModalOpen] = useState(false);
  const [ruleBookModalOpen, setRuleBookModalOpen] = useState(false);
  const [chestOpen, setChestOpen] = useState(false);
  const [skyblockHotbarSlots, setSkyblockHotbarSlots] = useState<number[]>([0, 1, 2, 3, 15]);
  // Detect if running inside an iframe embed — icons hidden when embedded
  const isEmbed =
    typeof window !== "undefined" &&
    (() => {
      try {
        return window.self !== window.top;
      } catch {
        return true;
      }
    })();
  // Lobby dressing objects the per-frame tick needs to animate — populated
  // by bwBuildLobby, read by the animation loop below.
  const bwCloudsRef = useRef<THREE.Object3D[]>([]);
  const bwAmbientRef = useRef<THREE.Points | null>(null);
  const bwBirdsRef = useRef<THREE.Mesh[]>([]);
  // Skyblock ambient atmosphere particles (cherry petals, golden dust, fireflies)
  const sbPetalsRef = useRef<THREE.Points | null>(null);
  const sbDustRef = useRef<THREE.Points | null>(null);
  const sbFirefliesRef = useRef<THREE.Points | null>(null);

  // Skyblock toast notification (discovery messages, quest updates, etc.)
  const [sbToast, setSbToast] = useState<string | null>(null);
  const sbToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  function showSbToast(msg: string, ms = 2800) {
    if (sbToastTimerRef.current) clearTimeout(sbToastTimerRef.current);
    setSbToast(msg);
    sbToastTimerRef.current = setTimeout(() => {
      setSbToast(null);
      sbToastTimerRef.current = null;
    }, ms);
  }
  // Show a welcome toast when the world loads in
  const sbWelcomedRef = useRef(false);

  // ── Skyblock XP earning — grant 25 XP every 2 minutes of active play ──────
  useEffect(() => {
    if (!isSkyblock || !qbUser) return;
    const interval = setInterval(async () => {
      try {
        await updateDoc(doc(db, "users", qbUser.uid), { xp: increment(25) });
      } catch {
        /* non-critical */
      }
    }, 120_000); // every 2 minutes
    return () => clearInterval(interval);
  }, [isSkyblock, qbUser]);

  // ── Skyblock welcome toast — fires once when the world finishes loading ─────
  useEffect(() => {
    if (!isSkyblock || !worldReady || sbWelcomedRef.current) return;
    sbWelcomedRef.current = true;
    const t = setTimeout(() => {
      const playerName = qbUser?.displayName || qbUser?.username || "Player";
      showSbToast(`👋 Welcome ${playerName} Island`, 4200);
    }, 900);
    return () => clearTimeout(t);
  }, [isSkyblock, worldReady, qbUser]);

  useEffect(() => {
    const mount = mountRef.current!;
    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();

    // Base FOV loaded from user setting or standard comfortable 72° (never clamped narrow)
    let userFovSetting = 72;
    try {
      const saved = localStorage.getItem("qb_camera_fov");
      if (saved) {
        const parsed = Number(saved);
        if (!isNaN(parsed) && parsed >= 50 && parsed <= 100) {
          userFovSetting = parsed;
        }
      }
    } catch {}
    let BASE_FOV = userFovSetting;
    const isMobileUA =
      typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const camera = new THREE.PerspectiveCamera(
      fovForAspect(BASE_FOV, width / height),
      width / height,
      0.1,
      isSkyblock ? 850 : 220,
    );

    // Some devices/webviews have WebGL disabled or unavailable (very old
    // hardware, locked-down embedded browsers, this sandbox's own preview).
    // Without a guard, the constructor throws and crashes the whole route to
    // a generic error screen instead of a scoped, recoverable message.
    // Safari (desktop + iOS) is stricter about WebGL context creation:
    // "high-performance" can silently fail on integrated GPUs, and antialias
    // adds overhead that pushes iOS over its context memory budget.
    const isSafariBrowser =
      typeof navigator !== "undefined" &&
      /Safari/.test(navigator.userAgent) &&
      !/Chrome/.test(navigator.userAgent);
    // Only fall back to the conservative renderer path where it is actually
    // needed (Safari's tighter WebGL context budget). Skyblock and mobile now
    // render at full resolution — the low render scale was what made the world
    // look blurry / pixellated.
    const conservative3D = isSafariBrowser;

    // Read persistent graphics quality and FPS cap (set via in-game settings)
    const qualityPref = (localStorage.getItem("bm-quality") || "uhd") as "low" | "medium" | "high" | "uhd";
    const fpsPrefInit = localStorage.getItem("bm-fpscap") || "60";

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        // Antialiasing: skip on Low quality or Safari (context budget)
        antialias: qualityPref !== "low" && !isSafariBrowser && !conservative3D,
        powerPreference: isSafariBrowser || conservative3D ? "default" : "high-performance",
        stencil: false,
      });
    } catch {
      // First attempt failed; retry with the most conservative possible settings
      // before giving up — covers edge cases on old iOS / locked-down browsers.
      try {
        renderer = new THREE.WebGLRenderer({ antialias: false, stencil: false });
      } catch (err) {
        console.warn("WebGL context unavailable — engine disabled.");
        setEngineError(true);
        return;
      }
    }

    // Broad guard: any Three.js failure after renderer creation (material
    // build, terrain gen, asset load, etc.) is caught here so the error stays
    // scoped to this component instead of escaping to the root error boundary.
    try {
      renderer.sortObjects = false;
      // Shader material refs — declared here (before sky/water sections) to avoid TDZ
      let waterMatRef: THREE.ShaderMaterial | null = null;
      let skyMatRef: THREE.ShaderMaterial | null = null;
      // Quality tier sets the base render scale and DPR cap. Dynamic resolution
      // scaling inside tick() will further adjust curScale based on live FPS.
      const MAX_DPR = isMobileUA ? 2.0 : 2.0;
      const RENDER_SCALE = 1.0;
      let curScale = RENDER_SCALE;
      const baseDpr = getTargetDpr(qualityPref);

      renderer.setPixelRatio(baseDpr * curScale);
      renderer.setSize(width, height);
      // ACESFilmic tone mapping — compresses highlights and lifts shadows slightly,
      // giving the scene a cinematic, realistic look instead of a raw linear output.
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      // Bright daytime sky background — also set as the actual WebGL clear
      // color (not just a CSS fallback) so if the sky dome/skybox is ever
      // clipped or still loading, the canvas never flashes solid black.
      const skyBg = isSpleef ? "#cbeeff" : isSkyblock ? "#55bff2" : "#a8d8f0";
      renderer.domElement.style.background = skyBg;
      renderer.setClearColor(new THREE.Color(skyBg), 1);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.autoUpdate = false;
      renderer.shadowMap.needsUpdate = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      // ACES's filmic curve crushes saturation (that's what it's for in film/
      // photoreal work) — wrong call for a bright, punchy voxel game. Linear
      // tone mapping just scales by exposure, keeping colors vivid.
      renderer.toneMapping = THREE.LinearToneMapping;
      renderer.toneMappingExposure = isSpleef ? 1.25 : isSkyblock ? 1.08 : 1.22;
      renderer.domElement.style.touchAction = "none";
      renderer.domElement.style.userSelect = "none";
      renderer.domElement.style.webkitUserSelect = "none";
      renderer.domElement.style.outline = "none";
      renderer.domElement.style.transform = "translateZ(0)";
      (renderer.domElement.style as any).webkitTransform = "translateZ(0)";
      mount.appendChild(renderer.domElement);
      // Clean native WebGL presentation without compositor filter overhead
      renderer.domElement.style.filter = "none";

      // ── Post-processing: SSAO + Bloom ────────────────────────────────────────
      // Bloom:  UnrealBloomPass adds HDR glow on bright/emissive surfaces
      //         (glowstone, lava, diamonds, coins) — the highest-impact single
      //         visual change toward an "RTX ON" look. Threshold 0.72 only
      //         catches truly bright pixels; strength 0.35 is subtle enough
      //         that normal blocks stay crisp, but emissive ones glow.
      // SSAO:   contact shadows in corners between blocks — gated to high+desktop
      //         because it requires a full depth/normal prepass.
      // Both passes run together when quality is high + desktop; only bloom
      // runs on medium + desktop/mobile for broader RTX feel without the SSAO
      // cost. Low quality skips the composer entirely (direct render).
      // EggWars is a generated, compact arena. Keep the match path conservative
      // even when the global quality preference is high: post-processing creates
      // extra render targets and is a common source of mobile WebGL loss during
      // match entry, while it adds little to this small arena.
      const bloomEnabled = qualityPref !== "low" && !isEggwars && !conservative3D;
      const ssaoEnabled = (qualityPref === "high" || qualityPref === "uhd") && !isMobileUA && !isEggwars && !conservative3D;
      const motionBlurStored = localStorage.getItem("bm-motion-blur");
      const motionBlurEnabled =
        (motionBlurStored === null || motionBlurStored === "true") && !isEggwars && !conservative3D;
      let composer: EffectComposer | null = null;
      let ssaoPass: SSAOPass | null = null;
      let motionBlurPass: ShaderPass | null = null;
      if (bloomEnabled || ssaoEnabled || motionBlurEnabled) {
        const composerDpr = renderer.getPixelRatio() || 1;
        const targetW = Math.max(64, Math.round(width * composerDpr));
        const targetH = Math.max(64, Math.round(height * composerDpr));
        const composerTarget = new THREE.WebGLRenderTarget(targetW, targetH, {
          type: THREE.HalfFloatType,
          samples: isMobileUA ? 0 : 2,
          minFilter: THREE.LinearFilter,
          magFilter: THREE.LinearFilter,
        });
        composer = new EffectComposer(renderer, composerTarget);
        composer.setPixelRatio(composerDpr);
        composer.setSize(width, height);
        composer.addPass(new RenderPass(scene, camera));
        // SSAO — high+desktop only
        if (ssaoEnabled) {
          ssaoPass = new SSAOPass(scene, camera, width, height);
          ssaoPass.kernelRadius = 0.5;
          ssaoPass.minDistance = 0.0015;
          ssaoPass.maxDistance = 0.05;
          composer.addPass(ssaoPass);
        }
        // Bloom — medium+ (mobile-friendly low strength)
        if (bloomEnabled) {
          const bloomStrength = isMobileUA ? 0.16 : 0.22;
          const bloom = new UnrealBloomPass(
            new THREE.Vector2(Math.max(64, Math.round(width / 3)), Math.max(64, Math.round(height / 3))),
            bloomStrength, // strength
            0.52, // radius — how far the glow spreads
            0.68, // threshold — only pixels brighter than this glow
          );
          composer.addPass(bloom);
        }
        // AAA Game Motion Blur ShaderPass
        if (!isEggwars && !conservative3D) {
          motionBlurPass = new ShaderPass(MotionBlurShader);
          motionBlurPass.uniforms.uResolution.value.set(width, height);
          motionBlurPass.uniforms.uEnabled.value = motionBlurEnabled ? 1.0 : 0.0;
          composer.addPass(motionBlurPass);
        }
        // OutputPass performs tone mapping + color space conversion required
        // whenever an EffectComposer is used.
        composer.addPass(new OutputPass());
      }

      // Mobile GPUs reclaim WebGL contexts far more aggressively than desktop
      // (backgrounding, memory pressure, thermal throttling). Without handling
      // this, a reclaimed context leaves the canvas permanently blank/white
      // until a full reload — calling preventDefault() on "webglcontextlost"
      // is required for the browser to actually attempt automatic restoration.
      const onContextLost = (e: Event) => {
        e.preventDefault();
      };
      const onContextRestored = () => {
        renderer.setPixelRatio(Math.min(baseDpr, MAX_DPR) * curScale);
        renderer.setSize(mount.clientWidth, mount.clientHeight);
        composer?.setSize(mount.clientWidth, mount.clientHeight);
        if (renderer.shadowMap.enabled) {
          renderer.shadowMap.needsUpdate = true;
        }
      };
      renderer.domElement.addEventListener("webglcontextlost", onContextLost, false);
      renderer.domElement.addEventListener("webglcontextrestored", onContextRestored, false);

      // Fog — atmospheric depth haze; Skyblock uses a richer sky-blue for depth
      const FOG_COLOR = isSpleef
        ? 0xd8f0ff
        : isTntRush
          ? 0xd4956a
          : isSkyWars
            ? 0x9ec8f0
            : isSkyblock
              ? 0x9bdef7
              : 0x87ceeb;
      const FOG_DENSITY = isSpleef ? 0.007 : isTntRush ? 0.018 : isSkyblock ? 0.0075 : 0.012;
      scene.fog = new THREE.FogExp2(FOG_COLOR, FOG_DENSITY);
      let fogOn = true;
      let renderDistPct = 70;
      const fogHandler = (e: Event) => {
        fogOn = (e as CustomEvent<boolean>).detail;
        scene.fog = fogOn
          ? new THREE.FogExp2(FOG_COLOR, FOG_DENSITY * (100 / renderDistPct))
          : null;
      };
      window.addEventListener("bm-fog", fogHandler);
      // Render Distance setting: this world is a small fixed-size arena, not a
      // streamed/explored one, so there's no chunk-loading radius to widen —
      // the meaningful analog is how far you can see before fog swallows
      // things. Lower % raises effective fog density (see sooner), higher %
      // lowers it (see further), scaled around the tuned baseline at 70%.
      const renderDistHandler = (e: Event) => {
        renderDistPct = (e as CustomEvent<number>).detail;
        if (fogOn) scene.fog = new THREE.FogExp2(FOG_COLOR, FOG_DENSITY * (100 / renderDistPct));
      };
      window.addEventListener("bm-renderdist", renderDistHandler);
      // Shadows toggle: turning this off both skips the shadow-map render
      // pass (real perf win on low-end phones) and stops the sun casting.
      const shadowsHandler = (e: Event) => {
        const on = (e as CustomEvent<boolean>).detail;
        renderer.shadowMap.enabled = on;
        sun.castShadow = on;
      };
      window.addEventListener("bm-shadows", shadowsHandler);
      // Look sensitivity: 50% is the original tuned baseline (1.0×); the
      // slider scales linearly around it.
      let lookSens = 1;
      const sensHandler = (e: Event) => {
        lookSens = (e as CustomEvent<number>).detail / 50;
      };
      window.addEventListener("bm-sensitivity", sensHandler);
      // Haptics: gate every navigator.vibrate() call in this scene behind
      // this flag so the setting actually does something instead of just
      // toggling silently.
      let hapticsOn = true;
      const hapticsHandler = (e: Event) => {
        hapticsOn = (e as CustomEvent<boolean>).detail;
      };
      window.addEventListener("bm-haptics", hapticsHandler);
      function haptic(ms: number | number[]) {
        if (hapticsOn && typeof navigator !== "undefined" && navigator.vibrate)
          navigator.vibrate(ms);
      }

      // Sky dome — beautiful daylight gradient: deep blue zenith → pale horizon.
      // Radius is 150 — safely inside the camera far plane (160). (Was
      // previously 600, far outside the far plane, so the entire dome was
      // clipped and the WebGL canvas's default black clear color showed
      // through instead — that was the "black sky" bug.) The sky mesh is kept
      // centered on the camera every tick so it never drifts out of view
      // regardless of how far the player moves.
      let skyMesh: THREE.Mesh;
      let skyMat: THREE.ShaderMaterial;
      {
        const skyGeo = new THREE.SphereGeometry(isSkyblock ? 650 : 180, 32, 20);
        // ── Engine v5: atmospheric sky — gradient + sun disc + horizon glow ────
        skyMat = new THREE.ShaderMaterial({
          side: THREE.BackSide,
          depthWrite: false,
          uniforms: {
            top: { value: new THREE.Color(isSpleef ? 0x3ab5f5 : isSkyblock ? 0x126fbe : 0x1565c0) },
            mid: { value: new THREE.Color(isSpleef ? 0x7acef7 : isSkyblock ? 0x42b9f3 : 0x42a5f5) },
            bottom: {
              value: new THREE.Color(isSpleef ? 0xd8f0ff : isSkyblock ? 0xb9edff : 0x90caf9),
            },
            uSunDir: { value: new THREE.Vector3(0.55, 0.72, 0.42).normalize() },
            uTime: { value: 0 },
          },
          vertexShader: `
          varying float vY;
          varying vec3  vDir;
          void main(){
            vY   = normalize(position).y;
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
          }`,
          fragmentShader: `
          varying float vY;
          varying vec3  vDir;
          uniform vec3  top, mid, bottom;
          uniform vec3  uSunDir;
          uniform float uTime;

          // Smooth hash for cloud noise
          float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
          float noise2(vec2 p){
            vec2 i=floor(p); vec2 f=fract(p); f=f*f*(3.0-2.0*f);
            return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),
                       mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
          }
          float fbm(vec2 p){
            return noise2(p)*0.50+noise2(p*2.1)*0.25+noise2(p*4.3)*0.125+noise2(p*8.7)*0.0625;
          }

          void main(){
            float t = clamp(vY,-1.0,1.0);
            float above = step(0.0,t);
            float tPos  = max(t,0.001);
            // Rayleigh-style sky: power curve makes upper sky deeper blue
            vec3 c = mix(mix(bottom,mid,t+1.0), mix(mid,top,pow(tPos,0.55)), above);
            // A small sun-warmed horizon lift keeps the blue sky dimensional.
            float horiz = exp(-abs(vY)*5.2);
            c = mix(c, vec3(1.0,0.84,0.60), horiz*0.14);
            c = mix(c, vec3(1.0,0.94,0.84), horiz*horiz*0.10);
            // Subtle procedural cloud wisps (only above horizon)
            if(vY > 0.04){
              vec2 cloudUv = vDir.xz / max(vDir.y, 0.05) * 0.28 + vec2(uTime*0.004, 0.0);
              float cloud = smoothstep(0.52, 0.72, fbm(cloudUv));
              c = mix(c, vec3(1.0,1.0,1.0), cloud * min(1.0,(vY-0.04)*8.0) * 0.38);
            }
            // Smooth, soft natural daylight warmth without blinding disc
            float sd      = dot(normalize(vDir), uSunDir);
            float warmth  = pow(max(0.0,sd), 16.0) * 0.18;
            c += vec3(1.0, 0.92, 0.78) * warmth;
            gl_FragColor = vec4(c, 1.0);
          }`,
        });
        skyMesh = new THREE.Mesh(skyGeo, skyMat);
        skyMesh.frustumCulled = false; // always draw regardless of position
        scene.add(skyMesh);
        skyMatRef = skyMat;
      }
      // Load the cosmic galaxy equirectangular skybox for a vibrant, immersive world
      let cosmicSkyboxTex: THREE.Texture | null = null;
      new THREE.TextureLoader().load("/skybox-cosmic.jpg", (tex) => {
        tex.mapping = THREE.EquirectangularReflectionMapping;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = false;
        cosmicSkyboxTex = tex;
        scene.background = tex;
        scene.environment = tex;
        if ("backgroundIntensity" in scene)
          (scene as unknown as { backgroundIntensity: number }).backgroundIntensity = 1.1;
        if (skyMesh) skyMesh.visible = false;
      });

      // Hemisphere: vibrant sky blue top, rich lush ground bounce — makes everything look vibrantly sunlit
      const hemi = new THREE.HemisphereLight(
        0xd5ecff,
        0x558045,
        isSpleef ? 1.4 : isSkyblock ? 1.25 : 1.35,
      );
      scene.add(hemi);

      // Raised ambient so blocks and shadow faces stay rich, colorful, and vibrant
      scene.add(new THREE.AmbientLight(0xffffff, isSpleef ? 0.7 : isSkyblock ? 0.75 : 0.8));

      // Primary sun — vibrant warm golden light
      const sun = new THREE.DirectionalLight(0xfff8e8, isSpleef ? 1.4 : isSkyblock ? 1.35 : 1.45);
      // Skyblock: golden-hour angle — sun lower on the horizon for warm long shadows
      sun.position.set(isSkyblock ? 28 : 34, isSkyblock ? 45 : 60, isSkyblock ? 18 : 22);
      // On mobile low-quality, shadows are disabled by default — they're the
      // single biggest GPU cost on phones. User can re-enable in settings.
      const mobileLow = isMobileUA && qualityPref === "low";
      sun.castShadow = !mobileLow;
      renderer.shadowMap.enabled = !mobileLow;
      // Shadow map: 2048 on desktop and 1024 on mobile devices (512 on mobile low).
      const shadowMapSize = isMobileUA
        ? (qualityPref === "low" ? 512 : 1024)
        : (qualityPref === "low" ? 1024 : 2048);
      sun.shadow.mapSize.set(shadowMapSize, shadowMapSize);
      sun.shadow.camera.near = 1;
      sun.shadow.camera.far = isSkyblock ? 180 : isSpleef ? 70 : 90;
      sun.shadow.camera.left = isSkyblock ? -48 : isSpleef ? -28 : -34;
      sun.shadow.camera.right = isSkyblock ? 48 : isSpleef ? 28 : 34;
      sun.shadow.camera.top = isSkyblock ? 48 : isSpleef ? 28 : 34;
      sun.shadow.camera.bottom = isSkyblock ? -48 : isSpleef ? -28 : -34;
      // Tighter bias: shadow acne is gone with VSM but self-shadow on steep
      // surfaces still needs a small push. normalBias compensates for surface
      // curvature aliasing without the visible peter-panning of a large bias.
      sun.shadow.bias = -0.0003;
      sun.shadow.normalBias = 0.25;
      sun.shadow.radius = qualityPref === "high" ? 3 : 2; // VSM blur radius — wider = softer edge
      scene.add(sun);
      scene.add(sun.target);

      // Soft sky fill from opposite side — fills shadow areas with cool sky color
      {
        const fill = new THREE.DirectionalLight(
          isSpleef ? 0xa8d8ff : 0x88c4f0,
          isSpleef ? 0.3 : 0.2,
        );
        fill.position.set(-30, 10, -20);
        scene.add(fill);
        // Subtle warm ground bounce
        const bounce = new THREE.DirectionalLight(0xf0e8c8, 0.15);
        bounce.position.set(0, -10, 0);
        scene.add(bounce);
      }

      // ── CELESTIAL SUN, MOON & AURORA BOREALIS (SKYBLOCK) ─────────────────
      let celestialSunGroup: THREE.Group | null = null;
      let celestialMoonGroup: THREE.Group | null = null;
      let auroraRibbonMesh: THREE.Mesh | null = null;
      let auroraLight: THREE.DirectionalLight | null = null;
      let moonLight: THREE.DirectionalLight | null = null;
      const celestialSunPos = new THREE.Vector3(68, 88, 42);

      if (isSkyblock) {
        // 1. Radiant Sun Light (Skyblock illumination)
        celestialSunGroup = new THREE.Group();
        celestialSunGroup.position.copy(celestialSunPos);

        // Celestial sun position marker (directional sun handles scene illumination)
        scene.add(celestialSunGroup);

        // 2. Luminous Moonlight (Night Mode)
        celestialMoonGroup = new THREE.Group();
        celestialMoonGroup.position.set(-68, 78, -42);

        // Circular moon sphere and halo removed per user request
        moonLight = new THREE.DirectionalLight(0x7dd3fc, 0.85);
        moonLight.position.set(-68, 78, -42);
        celestialMoonGroup.add(moonLight);
        scene.add(celestialMoonGroup);

        // 3. Shimmering Aurora Borealis Ribbons
        const numSegments = 64;
        const ribbonWidth = 24;
        const auroraGeo = new THREE.BufferGeometry();
        const positions: number[] = [];
        const colors: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];

        for (let i = 0; i <= numSegments; i++) {
          const t = i / numSegments;
          const angle = (t - 0.5) * Math.PI * 1.35;
          const rad = 210;
          const cx = Math.sin(angle) * rad;
          const cz = Math.cos(angle) * rad - 45;
          const baseY = 95 + Math.sin(t * Math.PI * 3.0) * 14;

          positions.push(cx, baseY, cz);
          positions.push(cx, baseY + ribbonWidth, cz);

          // Ethereal gradient: emerald green (#10b981) to cyan (#06b6d4) to violet (#a855f7)
          const r = 0.06 + 0.14 * Math.sin(t * 8.0);
          const g = 0.72 + 0.28 * Math.cos(t * 6.0);
          const b = 0.58 + 0.38 * Math.sin(t * 4.0);

          colors.push(r, g, b);
          colors.push(r * 0.4, g * 0.75, b * 1.25);

          uvs.push(t, 0);
          uvs.push(t, 1);

          if (i < numSegments) {
            const baseIdx = i * 2;
            indices.push(baseIdx, baseIdx + 1, baseIdx + 2);
            indices.push(baseIdx + 1, baseIdx + 3, baseIdx + 2);
          }
        }

        auroraGeo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
        auroraGeo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
        auroraGeo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
        auroraGeo.setIndex(indices);

        const auroraMat = new THREE.MeshBasicMaterial({
          vertexColors: true,
          transparent: true,
          opacity: 0.65,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        auroraRibbonMesh = new THREE.Mesh(auroraGeo, auroraMat);
        scene.add(auroraRibbonMesh);

        // Aurora magical emerald lighting cast on islands
        auroraLight = new THREE.DirectionalLight(0x10b981, 0.45);
        auroraLight.position.set(0, 80, -30);
        scene.add(auroraLight);
      }

      // Quality preset: update DPR + shadow map size at runtime. Antialiasing
      // and RENDER_SCALE take effect on next game mount (requires renderer recreation).
      const qualityHandler = (e: Event) => {
        const q = (e as CustomEvent<string>).detail as "low" | "medium" | "high";
        const dpr = getTargetDpr(q);
        curScale = q === "low" ? 0.85 : 1.0;
        renderer.setPixelRatio(dpr * curScale);
        const shadowMapSz = isMobileUA
          ? (q === "low" ? 512 : 1024)
          : (q === "low" ? 1024 : 2048);
        sun.shadow.mapSize.set(shadowMapSz, shadowMapSz);
        renderer.shadowMap.needsUpdate = true;
      };
      window.addEventListener("bm-quality", qualityHandler);

      const SIZE = 80;
      // Water level hoisted so the tick function can detect when the player is submerged
      const WORLD_WATER_LEVEL = 0;
      // Blocks are either:
      //  { type, index }    — an active slot in the type's InstancedMesh
      //  { type, mesh }     — an individually-owned transparent mesh (glass)
      //  { type, hidden }   — an occluded block: exists logically but not rendered
      //  { type }           — water/lava sentinel (no visual object)
      const blocks = new Map<
        string,
        | { type: number; index: number }
        | { type: number; mesh: THREE.Mesh }
        | { type: number; hidden: true }
        | { type: number }
      >();
      const key = (x: number, y: number, z: number) => `${x},${y},${z}`;
      const blockGeo = new THREE.BoxGeometry(1, 1, 1);
      // Low-poly rounded "clump" geometry for leaf-type blocks (oak/birch/
      // spruce/acacia/jungle) — swaps the hard cube silhouette for a softer,
      // more organic canopy shape. Radius 0.62 slightly overlaps neighbouring
      // leaf instances (like the cube did) so canopies still read as solid.
      const leafGeo = new THREE.BoxGeometry(1, 1, 1);
      // Decorative grass-tuft/flower meshes built once after world-gen — see
      // the population pass near the end of this effect. Tracked here so the
      // cleanup function below can dispose them on unmount.
      const decorMeshes: THREE.InstancedMesh[] = [];
      const decorGeos: THREE.BufferGeometry[] = [];
      const decorMats: THREE.Material[] = [];
      const sbPondObjects: THREE.Object3D[] = [];
      // Keep one phoenix in the scene: fully interactive, mountable, and rideable
      let skyPhoenix: THREE.Object3D | null = null;
      let phoenixMixer: THREE.AnimationMixer | null = null;
      const phoenixNestPos = new THREE.Vector3(-34, 11, 24);
      const phoenixCenter = new THREE.Vector3(-34, 11, 24);
      let isRidingPhoenix = false;
      const phoenixVel = new THREE.Vector3(0, 0, 0);
      let phoenixAscend = false;
      let phoenixDescend = false;
      let himmelStatueObj: THREE.Object3D | null = null;
      let magicCubeTemplate: THREE.Object3D | null = null;
      type MagicCubeProjectile = {
        mesh: THREE.Object3D;
        vel: THREE.Vector3;
        life: number;
        age: number;
      };
      const magicCubeProjectiles: MagicCubeProjectile[] = [];
      // Shared break-particle geometry, plus the pool of currently-animating
      // particles. Break particles used to spawn a brand-new geometry, a
      // cloned material, AND their own independent requestAnimationFrame
      // chain PER PARTICLE (6 per break) — under rapid breaking (Spleef) that
      // was dozens of live rAF closures and thrown-away GPU resources at
      // once. Now geometry is shared, one material is shared per burst (all
      // 6 particles in a burst fade together anyway), and motion is advanced
      // once per frame from inside tick() instead of parallel rAF loops.
      const particleGeo = new THREE.BoxGeometry(0.18, 0.18, 0.18);
      type LiveParticle = {
        mesh: THREE.Mesh;
        material: THREE.MeshBasicMaterial;
        vx: number;
        vy: number;
        vz: number;
        born: number;
      };
      const liveParticles: LiveParticle[] = [];

      // Glass and water stay as individual meshes instead of joining an
      // InstancedMesh. WebGL doesn't depth-sort triangles *within* a single
      // draw call, so overlapping *smoothly blended* transparent instances in
      // one InstancedMesh blend in arbitrary order — glass uses real alpha
      // blending (opacity 0.45, no cutoff), so it needs that per-object sort.
      //
      // Leaves are NOT in this bucket even though they're "transparent": they
      // render with alphaTest (a hard cutout, not blended edges), which is
      // depth-test-safe regardless of draw order — so they can be instanced
      // just like opaque blocks. They used to be kept as individual meshes
      // "to be safe," but with ~320 trees averaging 60-70 leaf blocks each,
      // that was 15,000-20,000 separate draw calls every frame — by far the
      // single biggest lag source in the whole scene, dwarfing every other
      // optimization (instancing, shadows, water shader, tone mapping)
      // combined. Instancing them collapses that to ~8 draw calls (one per
      // leaf variant).
      // Six cardinal neighbours for occlusion & face-exposure checks
      const DIRS6 = [
        [1, 0, 0],
        [-1, 0, 0],
        [0, 1, 0],
        [0, -1, 0],
        [0, 0, 1],
        [0, 0, -1],
      ] as const;

      function isLeafType(type: number) {
        return type === 5 || type === 200 || type === 201 || type === 202 || type === 203;
      }
      // Flat-shaded solid-tint materials for the leaf clump geometry above —
      // deliberately new/separate from the textured mLeaves/mBirchLeaves/etc.
      // (used elsewhere for hotbar icons and held-item previews) so this purely
      // visual world-rendering change can't touch those. Tints match the
      // existing per-species leaf colors for continuity.
      function leafClumpMat(color: number) {
        return new THREE.MeshLambertMaterial({ color, flatShading: true });
      }
      const mLeafClumpOak = leafClumpMat(0x2ed410);
      const mLeafClumpBirch = leafClumpMat(0x8de030);
      const mLeafClumpSpruce = leafClumpMat(0x208028);
      const mLeafClumpAcacia = leafClumpMat(0x58c018);
      const mLeafClumpJungle = leafClumpMat(0x28d412);
      function leafClumpMatForType(type: number): THREE.MeshLambertMaterial {
        switch (type) {
          case 200:
            return mLeafClumpBirch;
          case 201:
            return mLeafClumpSpruce;
          case 202:
            return mLeafClumpAcacia;
          case 203:
            return mLeafClumpJungle;
          default:
            return mLeafClumpOak; // type 5 — oak + dark-oak/swamp reuse
        }
      }
      function isTransparentType(type: number) {
        // water (6), glass (7) — real alpha blending, needs individual meshes
        return type === 6 || type === 7;
      }
      // A block "occludes" if it is solid-opaque on all faces — i.e. completely
      // hides whatever is behind it. Transparent + leaf types don't qualify.
      function isOccluder(type: number): boolean {
        return type !== 6 && !isTransparentType(type) && !isLeafType(type);
      }
      // Returns true when every one of the 6 face-neighbours is an occluder,
      // meaning this block's faces are never visible → safe to skip rendering.
      function isFullyOccluded(x: number, y: number, z: number): boolean {
        for (const [dx, dy, dz] of DIRS6) {
          const nb = blocks.get(key(x + dx, y + dy, z + dz));
          if (!nb || !isOccluder(nb.type)) return false;
        }
        return true;
      }
      // Flag that suppresses per-add occlusion work during world gen.
      // The one-shot post-gen pass is far cheaper than checking every block
      // while neighbours are still being placed.
      let _worldGenPhase = true;
      const transparentMeshes = new Set<THREE.Mesh>();

      // ---------- Instanced block rendering ----------
      // Every voxel used to be its own THREE.Mesh (its own draw call). On a
      // few-thousand-block world that's a few-thousand draw calls per frame —
      // the single biggest cause of "laggy, not app-smooth" rendering compared
      // to competitors. Grouping same-type opaque blocks into one InstancedMesh
      // per type collapses that to a handful of draw calls (one per block type
      // present, ~20-30 total), independent of world size.
      //
      // A previous version of this file also split each type's mesh spatially
      // into 20-block chunks to get real frustum culling. That backfired hard:
      // it multiplied the draw call count by the number of occupied chunks
      // (dozens), taking the scene from ~30 draw calls to 500-1500+, which is
      // far more expensive than the overdraw it was trying to avoid — draw
      // call/state-change overhead dominates on mobile GPUs, more so than
      // rasterizing a few extra hidden triangles. Reverted to one mesh per
      // type; fog + render distance bound the actual overdraw well enough
      // without the chunking tax. If real spatial culling is worth revisiting
      // later, the correct tool is greedy meshing (merge faces into one
      // textured-atlas mesh per chunk) rather than more InstancedMesh splits.
      type BlockGroup = {
        mesh: THREE.InstancedMesh;
        capacity: number;
        count: number;
        posToIndex: Map<string, number>;
        indexToPos: Map<number, string>;
      };
      const groups = new Map<number, BlockGroup>();
      const dummyObj = new THREE.Object3D();
      const scratchMatrix = new THREE.Matrix4();
      const currentSkyblockIslandId =
        visitingUserId || qbUser?.islandId || qbUser?.uid || getPermanentPlayerId(qbUser);

      function makeGroupMesh(type: number, capacity: number) {
        const leaf = isLeafType(type);
        const mesh = new THREE.InstancedMesh(leaf ? leafGeo : blockGeo, matForType(type), capacity);
        mesh.count = 0;
        mesh.castShadow = type !== 6 && !isLeafType(type);
        mesh.receiveShadow = true;
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        scene.add(mesh);
        return mesh;
      }
      function ensureGroup(type: number): BlockGroup {
        let g = groups.get(type);
        if (g) return g;
        g = {
          mesh: makeGroupMesh(type, 4096),
          capacity: 4096,
          count: 0,
          posToIndex: new Map(),
          indexToPos: new Map(),
        };
        groups.set(type, g);
        return g;
      }
      function growGroup(g: BlockGroup, type: number) {
        const newCapacity = g.capacity * 2;
        const newMesh = makeGroupMesh(type, newCapacity);
        for (let i = 0; i < g.count; i++) {
          g.mesh.getMatrixAt(i, scratchMatrix);
          newMesh.setMatrixAt(i, scratchMatrix);
        }
        newMesh.count = g.count;
        newMesh.instanceMatrix.needsUpdate = true;
        scene.remove(g.mesh);
        g.mesh = newMesh;
        g.capacity = newCapacity;
      }

      const {
        grassTop,
        grassSide,
        dirtTex,
        stoneTex,
        woodSide,
        woodTop,
        sandTex,
        leavesTex,
        glassTex,
        mGrassTop,
        mGrassSide,
        mGrassBottom,
        grassFaces,
        mDirt,
        mStone,
        mWoodSide,
        mWoodTop,
        woodFaces,
        mSand,
        mLeaves,
        mWater,
        mGlass,
        snowTex,
        packedSnowTex,
        icePillarTex,
        mSnow,
        mPackedSnow,
        mIcePillar,
        mLava,
        matForType,
        mMoss,
        mBricks,
        // new blocks
        mGravel,
        mOakPlanks,
        birchFaces,
        mBirchLeaves,
        spruceFaces,
        mSpruceLeaves,
        acaciaFaces,
        mAcaciaLeaves,
        jungleFaces,
        mJungleLeaves,
        mGranite,
        mAndesite,
        mObsidian,
        mGoldBlock,
        mDiamondBlock,
        mIronBlock,
        mEmeraldBlock,
        mLapisBlock,
        mNetherRack,
        mNetherBricks,
        mTerracotta,
        mRedSand,
        pumpkinFaces,
        melonFaces,
        mWhiteWool,
        mRedWool,
        mBlueWool,
        mGreenWool,
        mYellowWool,
        mOrangeWool,
        mPurpleWool,
        mCyanWool,
        mPinkWool,
        mGlowstone,
        mAmethyst,
        hayFaces,
        mCoalOre,
        mRedstoneOre,
        mCryingObs,
        tntFaces,
        mBookshelf,
        mChiseled,
        pathFaces,
      } = getProceduralAssets(renderer);

      // Tell Three.js the shadow map is stale — called whenever the world changes
      // or the sun moves. With autoUpdate=false this is the only way shadows
      // refresh, which means zero shadow-map GPU cost on static frames.
      function _invalidateShadows() {
        renderer.shadowMap.needsUpdate = true;
      }

      const remotePlayerMeshes = new Map<string, THREE.Group>();
      const remotePlayersTarget = new Map<
        string,
        { x: number; y: number; z: number; rotY: number; walkPhase: number }
      >();

      function createPlayerRig(name: string, photoUrl?: string) {
        const group = new THREE.Group();

        // Body
        const bodyGeo = new THREE.BoxGeometry(0.65, 0.9, 0.35);
        const bodyMat = new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          roughness: 0.8,
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 1.05;
        body.castShadow = true;
        group.add(body);

        // Head
        const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const headMat = new THREE.MeshStandardMaterial({
          color: 0xfde047,
          roughness: 0.8,
        });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 1.75;
        head.castShadow = true;
        group.add(head);

        // Arms
        const armGeo = new THREE.BoxGeometry(0.22, 0.75, 0.22);
        const armMat = new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          roughness: 0.8,
        });

        const leftArm = new THREE.Mesh(armGeo, armMat);
        leftArm.name = "leftArm";
        leftArm.position.set(-0.48, 1.05, 0);
        leftArm.castShadow = true;
        group.add(leftArm);

        const rightArm = new THREE.Mesh(armGeo, armMat);
        rightArm.name = "rightArm";
        rightArm.position.set(0.48, 1.05, 0);
        rightArm.castShadow = true;
        group.add(rightArm);

        // Legs
        const legGeo = new THREE.BoxGeometry(0.24, 0.8, 0.25);
        const legMat = new THREE.MeshStandardMaterial({
          color: 0x1e293b,
          roughness: 0.8,
        });

        const leftLeg = new THREE.Mesh(legGeo, legMat);
        leftLeg.name = "leftLeg";
        leftLeg.position.set(-0.16, 0.4, 0);
        leftLeg.castShadow = true;
        group.add(leftLeg);

        const rightLeg = new THREE.Mesh(legGeo, legMat);
        rightLeg.name = "rightLeg";
        rightLeg.position.set(0.16, 0.4, 0);
        rightLeg.castShadow = true;
        group.add(rightLeg);

        // Name tag billboard — Inter, hi-res, with the player's profile photo
        // drawn as a circular avatar directly above their name.
        const canvas = document.createElement("canvas");
        canvas.width = 512;
        canvas.height = 256;
        const ctx = canvas.getContext("2d")!;

        const drawTag = (photo?: HTMLImageElement) => {
          ctx.clearRect(0, 0, 512, 256);
          // Avatar bubble
          const cx = 256;
          const cy = 88;
          const r = 56;
          ctx.save();
          ctx.beginPath();
          ctx.arc(cx, cy, r + 5, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255,255,255,0.95)";
          ctx.fill();
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          if (photo) {
            ctx.drawImage(photo, cx - r, cy - r, r * 2, r * 2);
          } else {
            ctx.fillStyle = "#38bdf8";
            ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
            ctx.fillStyle = "#ffffff";
            ctx.font = "600 56px Inter, system-ui, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText((name[0] || "?").toUpperCase(), cx, cy + 2);
          }
          ctx.restore();

          // Name plate
          ctx.fillStyle = "rgba(15, 23, 42, 0.82)";
          ctx.beginPath();
          ctx.roundRect(56, 164, 400, 68, 22);
          ctx.fill();
          ctx.fillStyle = "#ffffff";
          ctx.font = "600 40px Inter, system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(name.slice(0, 16), 256, 200);
        };

        drawTag();

        const tagTexture = new THREE.CanvasTexture(canvas);
        tagTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        if (photoUrl) {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            drawTag(img);
            tagTexture.needsUpdate = true;
          };
          img.src = photoUrl;
        }
        const tagMat = new THREE.SpriteMaterial({
          map: tagTexture,
          transparent: true,
          depthTest: false,
        });
        tagMat.toneMapped = false;
        const tagSprite = new THREE.Sprite(tagMat);
        tagSprite.renderOrder = 999;
        tagSprite.scale.set(2.2, 1.1, 1);
        tagSprite.position.y = 2.6;
        group.add(tagSprite);

        return group;
      }

      function syncRemotePlayers(livePlayers: LiveSkyblockPlayer[]) {
        const activeUids = new Set<string>();
        for (const p of livePlayers) {
          activeUids.add(p.uid);
          let mesh = remotePlayerMeshes.get(p.uid);
          if (!mesh) {
            mesh = createPlayerRig(p.name, p.profilePhoto);
            mesh.position.set(p.x, p.y, p.z);
            mesh.rotation.y = p.rotY;
            scene.add(mesh);
            remotePlayerMeshes.set(p.uid, mesh);
          }
          remotePlayersTarget.set(p.uid, {
            x: p.x,
            y: p.y,
            z: p.z,
            rotY: p.rotY,
            walkPhase: remotePlayersTarget.get(p.uid)?.walkPhase || 0,
          });
        }

        for (const [pUid, mesh] of remotePlayerMeshes) {
          if (!activeUids.has(pUid)) {
            scene.remove(mesh);
            remotePlayerMeshes.delete(pUid);
            remotePlayersTarget.delete(pUid);
          }
        }
      }

      let unsubIslandBlocks: (() => void) | null = null;
      let unsubIslandPlayers: (() => void) | null = null;

      if (isSkyblock) {
        unsubIslandBlocks = subscribeToIslandBlocks(
          currentSkyblockIslandId,
          (bx, by, bz, bType) => {
            if (bType === null) {
              removeBlock(bx, by, bz);
            } else {
              addBlock(bx, by, bz, bType);
            }
          },
        );

        unsubIslandPlayers = subscribeToIslandPlayers(
          currentSkyblockIslandId,
          qbUser?.uid || "guest_" + Math.random().toString(36).slice(2, 6),
          (livePlayers) => {
            syncRemotePlayers(livePlayers);
          },
        );
      }

      // Remove an instanced block from its InstancedMesh but keep it in `blocks`
      // as a hidden sentinel — used when a block becomes fully occluded.
      function _hideInstancedBlock(x: number, y: number, z: number) {
        const k = key(x, y, z);
        const b = blocks.get(k);
        if (!b || !("index" in b)) return;
        const g = groups.get(b.type)!;
        const idx = b.index;
        const lastIdx = g.count - 1;
        if (idx !== lastIdx) {
          g.mesh.getMatrixAt(lastIdx, scratchMatrix);
          g.mesh.setMatrixAt(idx, scratchMatrix);
          const lastKey = g.indexToPos.get(lastIdx)!;
          g.posToIndex.set(lastKey, idx);
          g.indexToPos.set(idx, lastKey);
          const movedBlock = blocks.get(lastKey);
          if (movedBlock && "index" in movedBlock) movedBlock.index = idx;
        }
        g.posToIndex.delete(k);
        g.indexToPos.delete(lastIdx);
        g.count = lastIdx;
        g.mesh.count = lastIdx;
        g.mesh.instanceMatrix.needsUpdate = true;
        // Mark as hidden (still occupies logical space, just not rendered)
        (b as unknown as { type: number; hidden: true }).hidden = true;
        delete (b as Record<string, unknown>).index;
      }

      // Restore a previously hidden block into its InstancedMesh.
      function _showHiddenBlock(x: number, y: number, z: number) {
        const k = key(x, y, z);
        const b = blocks.get(k);
        if (!b || !("hidden" in b)) return;
        const type = b.type;
        const g = ensureGroup(type);
        if (g.count >= g.capacity) growGroup(g, type);
        const idx = g.count;
        dummyObj.position.set(x, y, z);
        dummyObj.updateMatrix();
        g.mesh.setMatrixAt(idx, dummyObj.matrix);
        g.mesh.count = idx + 1;
        g.mesh.instanceMatrix.needsUpdate = true;
        g.posToIndex.set(k, idx);
        g.indexToPos.set(idx, k);
        g.count = idx + 1;
        // Replace sentinel with a live entry
        const entry = b as Record<string, unknown>;
        entry.index = idx;
        delete entry.hidden;
      }

      // After any block add/remove, check if a neighbour needs to appear or hide.
      function checkOcclusion(x: number, y: number, z: number) {
        const k = key(x, y, z);
        const b = blocks.get(k);
        if (!b || !isOccluder(b.type)) return;
        const isHidden = "hidden" in b;
        const isVisible = "index" in b;
        if (isFullyOccluded(x, y, z)) {
          if (isVisible) _hideInstancedBlock(x, y, z);
        } else {
          if (isHidden) _showHiddenBlock(x, y, z);
        }
      }

      function addBlock(x: number, y: number, z: number, type: number) {
        const k = key(x, y, z);
        if (blocks.has(k)) return;
        if (type === 6) {
          // Water: no mesh — shader plane handles it visually.
          blocks.set(k, { type });
          return;
        }
        if (isTransparentType(type)) {
          const mesh = new THREE.Mesh(blockGeo, matForType(type));
          mesh.position.set(x, y, z);
          mesh.castShadow = false;
          mesh.receiveShadow = true;
          scene.add(mesh);
          transparentMeshes.add(mesh);
          blocks.set(k, { type, mesh });
          if (!_worldGenPhase) {
            // Transparent blocks can occlude neighbours (they are solid for culling)
            for (const [dx, dy, dz] of DIRS6) checkOcclusion(x + dx, y + dy, z + dz);
            _invalidateShadows();
          }
          return;
        }
        // Occlusion culling: if this solid block is already fully surrounded,
        // record it as hidden — don't waste an InstancedMesh slot on it.
        if (!_worldGenPhase && isOccluder(type) && isFullyOccluded(x, y, z)) {
          blocks.set(k, { type, hidden: true } as { type: number; hidden: true });
          // This new block may cause its neighbours to become occluded too
          for (const [dx, dy, dz] of DIRS6) checkOcclusion(x + dx, y + dy, z + dz);
          _invalidateShadows();
          return;
        }
        const g = ensureGroup(type);
        if (g.count >= g.capacity) growGroup(g, type);
        const idx = g.count;
        dummyObj.position.set(x, y, z);
        dummyObj.rotation.set(0, 0, 0);
        dummyObj.scale.setScalar(1);
        dummyObj.updateMatrix();
        g.mesh.setMatrixAt(idx, dummyObj.matrix);
        g.mesh.count = idx + 1;
        g.mesh.instanceMatrix.needsUpdate = true;
        g.posToIndex.set(k, idx);
        g.indexToPos.set(idx, k);
        g.count = idx + 1;
        blocks.set(k, { type, index: idx });
        if (!_worldGenPhase) {
          // New solid block may push neighbours into being fully occluded
          if (isOccluder(type)) {
            for (const [dx, dy, dz] of DIRS6) checkOcclusion(x + dx, y + dy, z + dz);
          }
          _invalidateShadows();
          if (isSkyblock) {
            persistBlockChange(currentSkyblockIslandId, x, y, z, type);
          }
        }
      }
      function spawnParticles(x: number, y: number, z: number, blockType?: number) {
        // Particles are tinted to match the broken block (falls back to the
        // original warm ember-orange, or icy blue in Spleef, when no type is
        // given — e.g. legacy call sites). One material per burst — shared by
        // all 6 particles in it, since they fade in lockstep anyway — instead
        // of 6 material clones.
        const tint =
          blockType !== undefined && BLOCKS[blockType] !== undefined
            ? BLOCKS[blockType].color
            : isSpleef
              ? 0x88ccff
              : 0xff8822;
        const pm = new THREE.MeshBasicMaterial({ color: tint, transparent: true });
        const born = performance.now();
        for (let i = 0; i < 6; i++) {
          const p = new THREE.Mesh(particleGeo, pm);
          p.position.set(x + 0.5 - Math.random(), y + 0.5 - Math.random(), z + 0.5 - Math.random());
          scene.add(p);
          liveParticles.push({
            mesh: p,
            material: pm,
            vy: 0.15 + Math.random() * 0.1,
            vx: (Math.random() - 0.5) * 0.2,
            vz: (Math.random() - 0.5) * 0.2,
            born,
          });
        }
      }
      // Advances every live break particle by one frame — called once per
      // tick() instead of each particle running its own rAF chain.
      function updateParticles(now: number) {
        for (let i = liveParticles.length - 1; i >= 0; i--) {
          const pt = liveParticles[i];
          const t = (now - pt.born) / 450;
          if (t > 1) {
            scene.remove(pt.mesh);
            pt.material.dispose();
            liveParticles.splice(i, 1);
            continue;
          }
          pt.material.opacity = 1 - t;
          pt.mesh.position.x += pt.vx;
          pt.mesh.position.z += pt.vz;
          pt.mesh.position.y += pt.vy - t * 0.4;
        }
      }
      function removeBlock(x: number, y: number, z: number) {
        const k = key(x, y, z);
        const b = blocks.get(k);
        if (!b) return;
        if (isSkyblock && !_worldGenPhase) {
          persistBlockChange(currentSkyblockIslandId, x, y, z, null);
        }
        if ("mesh" in b) {
          scene.remove(b.mesh);
          transparentMeshes.delete(b.mesh);
          blocks.delete(k);
          spawnParticles(x, y, z, b.type);
          // Removing a transparent block can expose previously-hidden neighbours
          for (const [dx, dy, dz] of DIRS6) checkOcclusion(x + dx, y + dy, z + dz);
          _invalidateShadows();
          return;
        }
        if (!("index" in b) && !("hidden" in b)) {
          // Water/lava sentinel — no mesh/instance to clean up.
          blocks.delete(k);
          return;
        }
        if ("hidden" in b) {
          // Block was occluded (no InstancedMesh slot) — just delete and expose neighbours.
          blocks.delete(k);
          for (const [dx, dy, dz] of DIRS6) checkOcclusion(x + dx, y + dy, z + dz);
          return;
        }
        // Normal instanced-block removal (swap-remove pattern)
        const g = groups.get(b.type)!;
        const idx = (b as { type: number; index: number }).index;
        const lastIdx = g.count - 1;
        if (idx !== lastIdx) {
          g.mesh.getMatrixAt(lastIdx, scratchMatrix);
          g.mesh.setMatrixAt(idx, scratchMatrix);
          const lastKey = g.indexToPos.get(lastIdx)!;
          g.posToIndex.set(lastKey, idx);
          g.indexToPos.set(idx, lastKey);
          const movedBlock = blocks.get(lastKey);
          if (movedBlock && "index" in movedBlock) movedBlock.index = idx;
        }
        g.posToIndex.delete(k);
        g.indexToPos.delete(lastIdx);
        g.count = lastIdx;
        g.mesh.count = lastIdx;
        g.mesh.instanceMatrix.needsUpdate = true;
        blocks.delete(k);
        spawnParticles(x, y, z, b.type);
        // This block was solid — removing it exposes neighbours that may have been hidden
        for (const [dx, dy, dz] of DIRS6) checkOcclusion(x + dx, y + dy, z + dz);
        _invalidateShadows();
      }

      // ---------- World generation ----------
      // Engine v5: wave water ShaderMaterial — ref already declared above.
      // Engine v5: animal entities animated every tick.
      const animalEntities: AnimalEntity[] = [];
      // Computed by the spawn-hub builder below (engine-test mode) so the
      // spawnPoint declared later in this function always lands the player on
      // solid ground instead of a hardcoded guess. The old fixed y=6 spawn was
      // *below* the real terrain height at (0,0) — deterministic noise, not
      // random, so every single game load spawned the player buried inside the
      // hillside there. That's the "stuck on blocks" bug.
      let engineSpawnY = 6;

      // ── Block Party round state ───────────────────────────────────────────
      // Kept inside the engine effect so tile transitions never allocate a
      // second renderer or depend on React timing.
      const partyTypes = [210, 211, 212, 213, 214, 215, 216, 217];
      const partyLabels = ["Red", "Blue", "Green", "Yellow", "Orange", "Purple", "Cyan", "Pink"];
      const partyTiles: Array<{ x: number; z: number; type: number }> = [];
      let rebuildPartyFloor: (() => void) | null = null;
      let partyPhase: "countdown" | "search" | "showdown" | "won" | "out" = "countdown";
      let partyRoundLocal = 1;
      let partyTimeLocal = 3;
      let partyTargetIndex = 0;
      const partyShowdownTimer = 0;
      let partySecondShown = -1;
      let partyStartTimer: ReturnType<typeof setTimeout> | null = null;

      // ── BedWars world objects (shared across lobby/match states) ────────────
      // These are populated/cleared by teleportLobby / teleportMatch helpers.
      const bwObjects: THREE.Object3D[] = []; // non-block scene objects to clear on state switch
      let bwNpcMesh: THREE.Group | null = null;
      let bwBlueBedMesh: THREE.Object3D | null = null;
      let bwRedBedMesh: THREE.Object3D | null = null;
      let bwRedGenMesh: THREE.Mesh | null = null;
      let bwBlueGenMesh: THREE.Mesh | null = null;
      let bwBotMesh: THREE.Group | null = null;
      let bwBotHpBar: HpBar | null = null;

      // ── EggWars arena objects and match state ─────────────────────────────
      const eggObjects: THREE.Object3D[] = [];
      const eggMeshes = new Map<EggwarsTeam["id"], THREE.Group>();
      const eggGeneratorMeshes: THREE.Mesh[] = [];
      let eggBotMesh: THREE.Group | null = null;
      let eggBotHpBar: HpBar | null = null;
      const eggBotPos = new THREE.Vector3(22, 4, 0);
      const eggBotVel = new THREE.Vector3();
      let eggBotHp = 20;
      let eggBotAlive = true;
      let eggBotRespawnTimer = 0;
      let eggMatchActive = false;
      let eggIronTimer = 0;
      let eggGoldTimer = 0;
      let eggDiamondTimer = 0;
      let eggSecondTimer = 0;
      let eggBotAttackTimer = 0;
      let eggMapLoaded = false;

      // Bot state
      const botPos = new THREE.Vector3(30, 2, 0);
      const botVel = new THREE.Vector3();
      let botHp = 20;
      let botState: "idle" | "chase" | "attack" | "dead" = "idle";
      let botRespawnTimer = 0;
      let botAttackCooldown = 0;
      // SCP escape state lives in the shared engine loop so sight detection,
      // pursuit, collision, and animation remain frame-synchronised.
      const escapeScpPos = new THREE.Vector3(0, 1.2, -18);
      const escapeScpVel = new THREE.Vector3();
      let escapeScpMesh: THREE.Group | null = null;
      let escapeScpMixer: THREE.AnimationMixer | null = null;
      let escapeScpAlerted = false;
      let escapeScpDamageCooldown = 0;

      // BedWars resource timers
      let bwIronTimer = 0;
      let bwMatchActive = false;
      // Cache for the voxelized hub lobby map — fetched once, reused on rebuilds
      const _bwLobbyMapCache: Uint16Array | null = null;
      // Cache for the voxelized match map
      let _bwMatchMapCache: Uint16Array | null = null;

      // Track which blocks are "bed blocks" by position string
      const bwRedBedPos = { x: -114, y: 10, z: 0 };
      const bwBlueBedPos = { x: 114, y: 10, z: 0 };
      let bwRedBedAlive = true;
      let bwBlueBedAlive = true;
      let bwPlayerHitCooldown = 0;
      // Tracks last NPC-in-range value so we only call setBwNpcPrompt when it
      // actually changes — prevents 60 setState calls/second when standing still.
      let _bwNpcWasInRange = false;

      // Wipe every voxel block from the scene — used before rebuilding the
      // BedWars lobby or match so blocks from the previous phase don't ghost.
      // Resets the InstancedMesh counts, the blocks Map, and all transparent
      // individual meshes; leaves group InstancedMesh objects in the scene
      // (they're reused with count=0) so we don't leak them.
      function clearAllBlocks() {
        _worldGenPhase = true;
        // Remove transparent (glass/water) individual meshes
        for (const m of transparentMeshes) scene.remove(m);
        transparentMeshes.clear();
        // Reset every InstancedMesh to empty
        for (const g of groups.values()) {
          g.mesh.count = 0;
          g.count = 0;
          g.posToIndex.clear();
          g.indexToPos.clear();
          g.mesh.instanceMatrix.needsUpdate = true;
        }
        blocks.clear();
      }

      // After a batch block-place (lobby or match rebuild), run the same
      // one-shot occlusion pass that the initial world-gen uses, then flip
      // _worldGenPhase off so incremental add/remove works normally again.
      function runOcclusionPass() {
        _worldGenPhase = false;
        const toHide: [number, number, number][] = [];
        for (const [k, b] of blocks) {
          if (!("index" in b) || !isOccluder(b.type)) continue;
          const [xs, ys, zs] = k.split(",");
          if (isFullyOccluded(+xs, +ys, +zs)) toHide.push([+xs, +ys, +zs]);
        }
        for (const [bx, by, bz] of toHide) _hideInstancedBlock(bx, by, bz);
        _invalidateShadows();
      }

      function bwClearScene() {
        for (const obj of bwObjects) scene.remove(obj);
        bwObjects.length = 0;
        bwNpcMesh = null;
        bwBlueBedMesh = null;
        bwRedBedMesh = null;
        bwRedGenMesh = null;
        bwBlueGenMesh = null;
        bwBotMesh = null;
        clearAllBlocks();
      }

      function eggClearScene() {
        for (const obj of eggObjects) scene.remove(obj);
        eggObjects.length = 0;
        eggMeshes.clear();
        eggGeneratorMeshes.length = 0;
        eggBotMesh = null;
        clearAllBlocks();
      }

      let eggBuildInProgress = false;
      function eggBuildMatch() {
        if (eggBuildInProgress) return;
        eggBuildInProgress = true;
        eggClearScene();
        eggMatchActive = false;
        eggMapLoaded = false;
        setEggMatchLoading(true);
        eggBotAlive = true;
        eggBotHp = 20;
        eggBotRespawnTimer = 0;
        eggBotPos.set(23, 2.5, 0);
        eggBotVel.set(0, 0, 0);
        eggIronTimer = 0;
        eggGoldTimer = 0;
        eggDiamondTimer = 0;
        eggSecondTimer = 0;
        const teams: Array<{ id: EggwarsTeam["id"]; x: number; z: number; type: number }> = [
          { id: "ruby", x: -24, z: 0, type: 42 },
          { id: "azure", x: 24, z: 0, type: 43 },
          { id: "jade", x: 0, z: -24, type: 44 },
          { id: "gold", x: 0, z: 24, type: 45 },
        ];

        // Four compact islands connected to a diamond mid. The EggWars arena
        // intentionally uses the same voxel blocks/collision map as the rest
        // of the engine, rather than a second mesh-only minigame scene.
        for (const team of teams) {
          for (let x = -8; x <= 8; x++) {
            for (let z = -8; z <= 8; z++) {
              if (x * x + z * z <= 70) {
                addBlock(team.x + x, 0, team.z + z, 2);
                if (x * x + z * z <= 45) addBlock(team.x + x, 1, team.z + z, team.type);
              }
            }
          }
          for (let i = -2; i <= 2; i++) {
            addBlock(
              team.x + (team.x === 0 ? i : 0),
              2,
              team.z + (team.z === 0 ? i : 0),
              team.type,
            );
          }
        }
        // Straight three-block-wide bridges make the bot and player route
        // readable while keeping the void meaningful around the arena.
        for (let i = -24; i <= 24; i++) {
          for (let w = -1; w <= 1; w++) {
            addBlock(i, 0, w, 41);
            addBlock(w, 0, i, 41);
          }
        }
        for (let x = -6; x <= 6; x++) {
          for (let z = -6; z <= 6; z++) {
            if (x * x + z * z <= 42) {
              addBlock(x, 0, z, 15);
              if (x * x + z * z <= 24) addBlock(x, 1, z, 12);
            }
          }
        }

        const eggPositions: Record<EggwarsTeam["id"], [number, number, number]> = {
          ruby: [-24, 2.25, 0],
          azure: [24, 2.25, 0],
          jade: [0, 2.25, -24],
          gold: [0, 2.25, 24],
        };
        const eggMaterials: Record<EggwarsTeam["id"], number> = {
          ruby: 0xef4444,
          azure: 0x38bdf8,
          jade: 0x34d399,
          gold: 0xfbbf24,
        };
        for (const team of teams) {
          const group = new THREE.Group();
          const shell = new THREE.Mesh(
            new THREE.SphereGeometry(0.72, 12, 8),
            new THREE.MeshStandardMaterial({
              color: 0xfff8e7,
              roughness: 0.56,
              emissive: eggMaterials[team.id],
              emissiveIntensity: 0.24,
            }),
          );
          shell.scale.set(0.82, 1.18, 0.82);
          const band = new THREE.Mesh(
            new THREE.TorusGeometry(0.58, 0.065, 6, 16),
            new THREE.MeshBasicMaterial({ color: eggMaterials[team.id] }),
          );
          band.rotation.x = Math.PI / 2;
          group.add(shell, band);
          group.position.set(...eggPositions[team.id]);
          group.userData.teamId = team.id;
          scene.add(group);
          eggObjects.push(group);
          eggMeshes.set(team.id, group);
        }

        const genPositions: Array<[number, number, number, number]> = [
          [-24, 2.2, -4, 0xd7e3ed],
          [24, 2.2, 4, 0xd7e3ed],
          [0, 2.2, -24, 0xd7e3ed],
          [0, 2.2, 24, 0xd7e3ed],
          [0, 2.4, 0, 0x6ee7f7],
        ];
        for (const [x, y, z, color] of genPositions) {
          const mesh = new THREE.Mesh(
            new THREE.OctahedronGeometry(0.48, 0),
            new THREE.MeshStandardMaterial({
              color,
              emissive: color,
              emissiveIntensity: 0.35,
              roughness: 0.3,
            }),
          );
          mesh.position.set(x, y, z);
          scene.add(mesh);
          eggObjects.push(mesh);
          eggGeneratorMeshes.push(mesh);
        }

        // A lightweight procedural bot is enough to make the first match feel
        // alive while preserving the existing reusable rig/physics systems.
        const bot = new THREE.Group();
        const botBody = new THREE.Mesh(
          new THREE.BoxGeometry(0.72, 1.15, 0.52),
          new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.75 }),
        );
        botBody.position.y = 0.6;
        const botHead = new THREE.Mesh(
          new THREE.BoxGeometry(0.62, 0.62, 0.62),
          new THREE.MeshStandardMaterial({ color: 0xf2c7a5, roughness: 0.8 }),
        );
        botHead.position.y = 1.48;
        bot.add(botBody, botHead);
        bot.position.copy(eggBotPos);
        scene.add(bot);
        eggObjects.push(bot);
        eggBotMesh = bot;
        eggBotHpBar = createHpBar("Azure", 20);
        eggBotHpBar.sprite.position.set(0, 2.3, 0);
        bot.add(eggBotHpBar.sprite);

        // The generated arena above is the authoritative EggWars map. The old
        // implementation parsed a large optional GLB here and remapped its
        // triangles into blocks after the match had already been built. That
        // created a second expensive startup path on Android and could throw
        // asynchronously after the engine boundary had finished. Keep the GLB
        // as an art asset, not a gameplay dependency: the match is ready as
        // soon as its instanced arena is ready.
        eggMapLoaded = true;
        mapLoaded = true;
        setEggMatchLoading(false);
        runOcclusionPass();
        rebuildRaycastTargets();
        eggBuildInProgress = false;
      }

      function eggStartMatch() {
        eggMatchActive = true;
        eggSecondTimer = 0;
        eggIronTimer = 0;
        eggGoldTimer = 0;
        eggDiamondTimer = 0;
        eggBotAttackTimer = 0;
        setEggState((s) => ({
          ...s,
          phase: "match",
          time: 0,
          toast: "Protect your egg. Break Azure's egg!",
        }));
        playerPos.set(-24, 3, 0);
        playerVel.set(0, 0, 0);
        curHp = 20;
        setHp(20);
      }

      function destroyEgg(teamId: EggwarsTeam["id"]) {
        const team = eggStateRef.current.teams.find((t) => t.id === teamId);
        if (!team?.eggAlive) return;
        const mesh = eggMeshes.get(teamId);
        if (mesh) {
          mesh.visible = false;
          spawnParticles(mesh.position.x, mesh.position.y, mesh.position.z, 47);
        }
        setEggState((s) => ({
          ...s,
          teams: s.teams.map((t) => (t.id === teamId ? { ...t, eggAlive: false } : t)),
        }));
        showEggToast(`${team.label} egg destroyed!`);
        playBreak();
        haptic([50, 20, 50]);
        if (teamId === "azure" && !eggBotAlive) {
          eggMatchActive = false;
          setEggState((s) => ({ ...s, phase: "victory" }));
          showEggToast("Victory! Azure has been eliminated.", 3000);
        }
      }

      // ── Held item for BedWars (sword / bow / wool / etc.) ───────────────────
      // Set from React via the "bm-bwHeld" CustomEvent; the engine reads it in
      // tapAction to decide whether to place a block or use the item instead.
      let bwHeldItem: string = "sword";
      window.addEventListener("bm-bwHeld", (e) => {
        bwHeldItem = (e as CustomEvent<string>).detail;
        // Mirror the held sprite so the player can see what they're holding
        if (isBedwars) {
          const sprites: Record<string, string> = {
            sword: "/short-sword.svg",
            bow: "/items/bow.png",
            wool: "/textures/blocks/white_wool.png",
            tnt: "/textures/blocks/tnt_side.png",
          };
          buildHeldSprite(sprites[bwHeldItem] ?? "/short-sword.svg");
        }
      });

      // ── Arrow / projectile system ────────────────────────────────────────────
      interface BwArrow {
        mesh: THREE.Mesh;
        vel: THREE.Vector3;
        life: number;
      }
      const bwArrows: BwArrow[] = [];

      // ── TNT Rush: projectile + storm fog ────────────────────────────────────
      interface TntProjectile {
        mesh: THREE.Mesh;
        vel: THREE.Vector3;
        life: number;
        fuse: number;
      }
      const tntProjectiles: TntProjectile[] = [];
      let tntStormTimer = 30 + Math.random() * 40; // first storm after 30-70s
      let tntStormActive = false;
      let tntStormDuration = 0;
      const TNT_STORM_FOG_COLOR = new THREE.Color(0xc8a800); // dark yellow storm
      const TNT_STORM_FOG_DENSITY = 0.055;
      const TNT_STORM_DURATION_MIN = 8;
      const TNT_STORM_DURATION_MAX = 14;
      function tickTntRush(dt: number) {
        if (!isTntRush) return;
        // Storm fog cycle
        tntStormTimer -= dt;
        if (!tntStormActive && tntStormTimer <= 0) {
          tntStormActive = true;
          tntStormDuration =
            TNT_STORM_DURATION_MIN +
            Math.random() * (TNT_STORM_DURATION_MAX - TNT_STORM_DURATION_MIN);
          scene.fog = new THREE.FogExp2(TNT_STORM_FOG_COLOR.getHex(), TNT_STORM_FOG_DENSITY);
          // Reset timer for next clear spell
          tntStormTimer = 30 + Math.random() * 40;
        }
        if (tntStormActive) {
          tntStormDuration -= dt;
          if (tntStormDuration <= 0) {
            tntStormActive = false;
            scene.fog = new THREE.FogExp2(0xd4956a, 0.014);
          }
        }
        // TNT projectile physics + explosion
        for (let i = tntProjectiles.length - 1; i >= 0; i--) {
          const p = tntProjectiles[i];
          p.life -= dt;
          p.fuse -= dt;
          if (p.life <= 0) {
            scene.remove(p.mesh);
            tntProjectiles.splice(i, 1);
            continue;
          }
          p.vel.y -= 18 * dt;
          p.mesh.position.addScaledVector(p.vel, dt);
          p.mesh.rotation.x += dt * 4;
          p.mesh.rotation.z += dt * 3;
          // Bounce off world floor
          if (p.mesh.position.y < 1) {
            p.mesh.position.y = 1;
            p.vel.y = Math.abs(p.vel.y) * 0.45;
            p.vel.x *= 0.7;
            p.vel.z *= 0.7;
          }
          // Explode when fuse runs out
          if (p.fuse <= 0) {
            const ex = p.mesh.position.x,
              ey = p.mesh.position.y,
              ez = p.mesh.position.z;
            // Big orange particle burst
            spawnParticles(ex, ey, ez, 27); // orange wool color
            spawnParticles(ex + 0.5, ey + 0.5, ez, 27);
            spawnParticles(ex - 0.5, ey + 0.5, ez + 0.5, 27);
            // Screen flash: briefly boost exposure
            renderer.toneMappingExposure = 2.2;
            setTimeout(() => {
              renderer.toneMappingExposure = isSkyblock ? 1.08 : 1.22;
            }, 120);
            haptic([30, 10, 30]);
            scene.remove(p.mesh);
            tntProjectiles.splice(i, 1);
          }
        }
      }

      // Skyblock's magic cube is a small, cheap projectile. The GLB is loaded
      // once and cloned per shot so firing never recompiles geometry or materials.
      function fireMagicCube() {
        if (!isSkyblock || !magicCubeTemplate || disposed) return;
        const dir = new THREE.Vector3(0, 0, -1)
          .applyEuler(new THREE.Euler(camPitch, camYaw, 0, "YXZ"))
          .normalize();
        const mesh = magicCubeTemplate.clone(true);
        mesh.scale.setScalar(0.28);
        mesh.position
          .copy(playerPos)
          .add(new THREE.Vector3(0, 1.35, 0))
          .addScaledVector(dir, 0.75);
        mesh.rotation.set(0, camYaw, 0);
        scene.add(mesh);
        magicCubeProjectiles.push({
          mesh,
          vel: dir.multiplyScalar(18).setY(dir.y * 18 + 1.2),
          life: 2.2,
          age: 0,
        });
        haptic([10, 5, 8]);
      }

      function tickMagicCubes(dt: number) {
        if (!isSkyblock) return;
        for (let i = magicCubeProjectiles.length - 1; i >= 0; i--) {
          const projectile = magicCubeProjectiles[i];
          projectile.age += dt;
          projectile.life -= dt;
          if (projectile.life <= 0) {
            scene.remove(projectile.mesh);
            magicCubeProjectiles.splice(i, 1);
            continue;
          }
          projectile.vel.y -= 3.4 * dt;
          projectile.mesh.position.addScaledVector(projectile.vel, dt);
          projectile.mesh.rotation.x += dt * 5.4;
          projectile.mesh.rotation.y += dt * 7.2;
          // A subtle swoop keeps the cube feeling alive without adding particles.
          projectile.mesh.position.y += Math.sin(projectile.age * 10) * dt * 0.08;
          if (projectile.mesh.position.y < -2) {
            scene.remove(projectile.mesh);
            magicCubeProjectiles.splice(i, 1);
          }
        }
      }
      const _arrowGeo = new THREE.BoxGeometry(0.07, 0.07, 0.5);
      const _arrowMat = new THREE.MeshLambertMaterial({ color: 0xc8a030 });
      const _arrowTipMat = new THREE.MeshLambertMaterial({ color: 0xc0c0c0 });

      function shootBwArrow() {
        // Direction the camera is looking
        const dir = new THREE.Vector3(0, 0, -1).applyEuler(
          new THREE.Euler(camPitch, camYaw, 0, "YXZ"),
        );
        const shaft = new THREE.Mesh(_arrowGeo, _arrowMat);
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 5), _arrowTipMat);
        tip.rotation.x = Math.PI / 2;
        tip.position.z = -0.34;
        const grp = new THREE.Group();
        grp.add(shaft, tip);
        grp.position.copy(playerPos).add(new THREE.Vector3(0, 1.55, 0));
        scene.add(grp);
        haptic([15]);
        bwArrows.push({
          mesh: grp as unknown as THREE.Mesh,
          vel: dir
            .clone()
            .multiplyScalar(24)
            .setY(dir.y * 24 + 2.5),
          life: 4,
        });
      }

      function tickBwArrows(dt: number) {
        for (let i = bwArrows.length - 1; i >= 0; i--) {
          const ar = bwArrows[i];
          ar.life -= dt;
          if (ar.life <= 0) {
            scene.remove(ar.mesh);
            bwArrows.splice(i, 1);
            continue;
          }
          ar.vel.y -= 18 * dt;
          ar.mesh.position.addScaledVector(ar.vel, dt);
          // Point arrow in velocity direction
          if (ar.vel.lengthSq() > 0.01) ar.mesh.lookAt(ar.mesh.position.clone().add(ar.vel));
          // Hit block?
          const ax = Math.round(ar.mesh.position.x);
          const ay = Math.round(ar.mesh.position.y);
          const az = Math.round(ar.mesh.position.z);
          if (blocks.has(`${ax},${ay},${az}`)) {
            scene.remove(ar.mesh);
            bwArrows.splice(i, 1);
            continue;
          }
          // Hit bot?
          if (
            bwMatchActive &&
            bwBotMesh &&
            botState !== "dead" &&
            ar.mesh.position.distanceTo(botPos) < 1.3
          ) {
            botHp -= 4;
            bwBotHpBar?.set(Math.max(0, botHp), 20);
            spawnParticles(botPos.x, botPos.y + 0.8, botPos.z, 42);
            haptic([10, 5, 10]);
            if (botHp <= 0) {
              botHp = 0;
              botState = "dead";
              botRespawnTimer = 5;
              bwBotMesh.visible = false;
              setBwState((s) => ({ ...s, blueTeam: { ...s.blueTeam, playerAlive: false } }));
              if (!bwBlueBedAlive) {
                bwMatchActive = false;
                setBwVictory(true);
                setBwState((s) => ({ ...s, phase: "victory" }));
              } else showBwToast("Enemy eliminated! Respawning in 5s…", 2500);
            } else showBwToast(`Arrow hit! ${botHp}♥`, 700);
            scene.remove(ar.mesh);
            bwArrows.splice(i, 1);
          }
        }
      }

      // Small standalone-mesh helper so decorative lobby dressing (flowers,
      // bushes, rails, mist) doesn't have to go through the voxel/BLOCKS
      // instancing system — these are one-offs, not repeated thousands of times.
      function bwDecor(mesh: THREE.Object3D) {
        scene.add(mesh);
        bwObjects.push(mesh);
        return mesh;
      }

      function bwBuildLobby() {
        bwClearScene();
        clearAllBlocks(); // wipe any terrain from a previous build before voxelising
        bwMatchActive = false;

        // ── GLB → voxel lobby ─────────────────────────────────────────────────
        // Load the Hypixel SkyWars hub GLB, sample every mesh onto our integer
        // voxel grid (1 GLB unit ≈ 1 Minecraft block), and map each mesh's
        // material name to our block texture pack.  All decorations (rocks,
        // clouds, birds, NPC) are added synchronously below so the scene has
        // atmosphere while the fetch resolves.
        const MAT_TO_BLOCK: Record<string, number> = {
          // ── Exact names extracted from the aegis-skywars GLB ──────────────
          Grass: 0,
          Grass_Block: 0,
          Grass_Top: 0,
          Grass_Side: 0,
          Dirt: 1,
          Coarse_Dirt: 9,
          Gravel: 1,
          Stone: 2,
          Stone_Slab: 2,
          Double_Stone_Slab: 2,
          Andesite: 2,
          Coal_Ore: 2,
          Iron_Ore: 2,
          Gold_Ore: 2,
          Diamond_Ore: 2,
          Block_of_Iron: 2,
          Furnace: 2,
          Oak_Log: 3,
          Log: 3,
          Wood: 3,
          Birch_Log: 3,
          Spruce_Log: 18,
          Dark_Oak_Log: 18,
          Acacia_Log: 3,
          Fence: 3,
          Chest: 16,
          Crafting_Table: 16,
          Sand: 4,
          Sandstone: 4,
          Red_Sand: 4,
          Oak_Leaves: 5,
          Leaves: 5,
          Birch_Leaves: 5,
          Spruce_Leaves: 5,
          Jungle_Leaves: 5,
          Dark_Oak_Leaves: 5,
          Glass: 7,
          Glass_Pane: 7,
          Stained_Glass: 7,
          Mossy_Cobblestone: 8,
          Mossy_Stone_Bricks: 8,
          Clay: 10,
          Colored_Terracotta: 10,
          Stone_Bricks: 11,
          Stone_Brick: 11,
          Cracked_Stone_Bricks: 11,
          Chiseled_Stone_Bricks: 11,
          Enchanting_Table: 11,
          Stone_Brick_Stairs: 11,
          Cobblestone_Stairs: 11,
          Diorite: 12,
          Polished_Diorite: 12,
          Prismarine: 12,
          Cobblestone: 15,
          Cobblestone_Slab: 15,
          Cobblestone_Wall: 15,
          Smooth_Stone: 16,
          Oak_Planks: 16,
          Birch_Planks: 16,
          Spruce_Planks: 16,
          Planks: 16,
          Wood_Planks: 16,
          Ice: 17,
          Packed_Ice: 17,
          Glowstone: 46,
          Glowstone_Block: 46,
          Sea_Lantern: 46,
          Wool: 42,
          White_Wool: 42,
          Red_Wool: 42,
          Blue_Wool: 43,
          Green_Wool: 44,
          Yellow_Wool: 45,
          Brick: 11,
          Bricks: 11,
          Netherrack: 2,
          Nether_Brick: 13,
          Quartz: 16,
          Quartz_Block: 16,
          Smooth_Quartz: 16,
          Chiseled_Quartz: 16,
        };
        // 0.25 shrinks 266-unit GLB extent to ~66 game blocks — a good hub size.
        const SCALE = 0.25;
        // The GLB terrain sits at Y≈38 in GLB space. Bring it to Y=3 in game space.
        const OY = 3 - Math.round(38 * SCALE);

        const bwGlbLoader = new GLTFLoader();
        bwGlbLoader.load(
          "/aegis-skywars.glb",
          (gltf) => {
            gltf.scene.updateWorldMatrix(true, true);
            const _v = new THREE.Vector3();

            // ── Pass 1: find actual world-space Y floor ───────────────────────
            // We can't assume GLB ground = Y38; compute it from real vertex data
            // so the voxelised island always lands at game Y≈2 regardless of
            // how the GLB was exported.
            let minWorldY = Infinity;
            gltf.scene.traverse((node) => {
              const mesh = node as THREE.Mesh;
              if (!mesh.isMesh || !mesh.geometry?.attributes?.position) return;
              mesh.updateWorldMatrix(true, false);
              const posAttr = mesh.geometry.attributes.position;
              const step = Math.max(1, Math.floor(posAttr.count / 150));
              for (let i = 0; i < posAttr.count; i += step) {
                _v.fromBufferAttribute(posAttr, i).applyMatrix4(mesh.matrixWorld);
                if (_v.y < minWorldY) minWorldY = _v.y;
              }
            });
            if (!isFinite(minWorldY)) minWorldY = 0;
            // OY so the GLB floor maps to game Y=2
            const OY_dyn = 2 - Math.round(minWorldY * SCALE);

            // ── Pass 2: place voxels ─────────────────────────────────────────
            const placed = new Set<string>();
            gltf.scene.traverse((node) => {
              const mesh = node as THREE.Mesh;
              if (!mesh.isMesh || !mesh.geometry?.attributes?.position) return;
              const rawMats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
              const rawName: string = (rawMats[0] as THREE.MeshStandardMaterial)?.name ?? "";
              // Normalise: strip spaces / hyphens → underscores, then try both
              const norm = rawName.replace(/[\s-]/g, "_");
              const normLower = norm.toLowerCase();
              const bt =
                MAT_TO_BLOCK[norm] ?? MAT_TO_BLOCK[rawName] ?? MAT_TO_BLOCK[normLower] ?? 2; // default: stone
              mesh.updateWorldMatrix(true, false);
              const posAttr = mesh.geometry.attributes.position;
              // Sample at most 800 vertices per mesh — enough for good coverage
              // without flooding the block map for high-poly leaf/grass meshes.
              const step = Math.max(1, Math.floor(posAttr.count / 800));
              for (let i = 0; i < posAttr.count; i += step) {
                _v.fromBufferAttribute(posAttr, i).applyMatrix4(mesh.matrixWorld);
                const bx = Math.round(_v.x * SCALE);
                const by = Math.round(_v.y * SCALE) + OY_dyn;
                const bz = Math.round(_v.z * SCALE);
                if (by < -2) continue; // skip deeply underground artefacts
                const k = `${bx},${by},${bz}`;
                if (placed.has(k)) continue;
                placed.add(k);
                addBlock(bx, by, bz, bt);
              }
            });

            // If almost nothing was placed (bad GLB), build fallback island
            if (placed.size < 20) {
              for (let dx = -14; dx <= 14; dx++)
                for (let dz = -14; dz <= 14; dz++) {
                  addBlock(dx, 2, dz, 2);
                  addBlock(dx, 3, dz, 0);
                }
            }

            // ── Big oak tree at the centre of the lobby island ──────────────────
            // Trunk: 2×2 base, 9 blocks tall (Y 4–12)
            const treeBaseY = 4;
            for (let ty = treeBaseY; ty <= treeBaseY + 8; ty++) {
              for (const [tx, tz] of [
                [0, 0],
                [1, 0],
                [0, 1],
                [1, 1],
              ] as [number, number][]) {
                addBlock(tx, ty, tz, 3); // oak log
              }
            }
            // Canopy — blocky layered leaves (Minecraft-style square layers)
            const CANOPY_LAYERS: { dy: number; r: number }[] = [
              { dy: -2, r: 2 },
              { dy: -1, r: 3 },
              { dy: 0, r: 4 },
              { dy: 1, r: 4 },
              { dy: 2, r: 3 },
              { dy: 3, r: 2 },
              { dy: 4, r: 1 },
            ];
            for (const { dy, r } of CANOPY_LAYERS) {
              for (let lx = -r; lx <= r; lx++) {
                for (let lz = -r; lz <= r; lz++) {
                  if (r >= 4 && Math.abs(lx) === r && Math.abs(lz) === r) continue; // clip wide corners
                  if (Math.abs(lx) <= 1 && Math.abs(lz) <= 1 && dy < 0) continue; // keep trunk clear
                  addBlock(lx, treeBaseY + 9 + dy, lz, 5); // leaves
                }
              }
            }

            runOcclusionPass();
            if (isSkyblock) {
              getOrCreateIsland(
                currentSkyblockIslandId,
                qbUser?.displayName || qbUser?.username || "Player",
              ).then((island) => {
                if (island.ownerName && visitingUserId) {
                  setVisitingHostName(island.ownerName);
                }
                const deltas = island.deltaBlocks || {};
                for (const [posKey, bType] of Object.entries(deltas)) {
                  const [bx, by, bz] = posKey.split(",").map(Number);
                  if (!isNaN(bx) && !isNaN(by) && !isNaN(bz)) {
                    if (bType === -1) {
                      removeBlock(bx, by, bz);
                    } else if (bType >= 0) {
                      addBlock(bx, by, bz, bType);
                    }
                  }
                }
                runOcclusionPass();
              });
            }
            setTimeout(() => {
              mapLoaded = true;
              onMapLoaded?.();
            }, 0);
          },
          undefined,
          () => {
            // Fallback flat island if GLB fails to load
            for (let dx = -14; dx <= 14; dx++)
              for (let dz = -14; dz <= 14; dz++) {
                addBlock(dx, 2, dz, 2);
                addBlock(dx, 3, dz, 0);
              }
            runOcclusionPass();
            if (isSkyblock) {
              getOrCreateIsland(
                currentSkyblockIslandId,
                qbUser?.displayName || qbUser?.username || "Player",
              ).then((island) => {
                if (island.ownerName && visitingUserId) {
                  setVisitingHostName(island.ownerName);
                }
                const deltas = island.deltaBlocks || {};
                for (const [posKey, bType] of Object.entries(deltas)) {
                  const [bx, by, bz] = posKey.split(",").map(Number);
                  if (!isNaN(bx) && !isNaN(by) && !isNaN(bz)) {
                    if (bType === -1) {
                      removeBlock(bx, by, bz);
                    } else if (bType >= 0) {
                      addBlock(bx, by, bz, bType);
                    }
                  }
                }
                runOcclusionPass();
              });
            }
            setTimeout(() => {
              mapLoaded = true;
              onMapLoaded?.();
            }, 0);
          },
        );

        // ─ Floating rock formations below island ─────────────────────────────
        for (const [fx, fz, fy, fr] of [
          [24, 6, -4, 3],
          [-22, -15, -6, 4],
          [22, -17, -5, 3],
        ] as [number, number, number, number][]) {
          const rk = new THREE.Mesh(
            new THREE.IcosahedronGeometry(fr, 0),
            new THREE.MeshLambertMaterial({ color: 0x8a9a7a }),
          );
          rk.position.set(fx, fy, fz);
          rk.rotation.set(Math.random(), Math.random(), Math.random());
          bwDecor(rk);
          const cp = new THREE.Mesh(
            new THREE.SphereGeometry(fr * 0.7, 6, 5, 0, Math.PI * 2, 0, Math.PI / 2),
            new THREE.MeshLambertMaterial({ color: 0x8eb86f }),
          );
          cp.position.set(fx, fy + fr * 0.35, fz);
          bwDecor(cp);
        }

        // ── Soft clouds drifting below the island ───────────────────────────
        const cloudMat = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.75,
          depthWrite: false,
        });
        const cloudGeo = new THREE.SphereGeometry(1, 8, 6);
        const clouds: THREE.Group[] = [];
        for (let i = 0; i < 14; i++) {
          const cloud = new THREE.Group();
          const puffs = 3 + Math.floor(Math.random() * 3);
          for (let p = 0; p < puffs; p++) {
            const puff = new THREE.Mesh(cloudGeo, cloudMat);
            puff.scale.setScalar(1.1 + Math.random() * 1.3);
            puff.position.set(
              (Math.random() - 0.5) * 3,
              (Math.random() - 0.5) * 0.6,
              (Math.random() - 0.5) * 2,
            );
            cloud.add(puff);
          }
          const ang = Math.random() * Math.PI * 2;
          const r = 6 + Math.random() * 26;
          cloud.position.set(Math.cos(ang) * r, -9 - Math.random() * 7, Math.sin(ang) * r);
          cloud.userData.driftSpeed = 0.15 + Math.random() * 0.25;
          cloud.userData.driftDir = Math.random() < 0.5 ? 1 : -1;
          bwDecor(cloud);
          clouds.push(cloud);
        }
        bwCloudsRef.current = clouds;

        // ── Ambient floating particles (pollen/dust motes) ──────────────────
        const AMBIENT_N = 70;
        const ambientPos = new Float32Array(AMBIENT_N * 3);
        for (let i = 0; i < AMBIENT_N; i++) {
          const ang = Math.random() * Math.PI * 2;
          const r = Math.random() * 18;
          ambientPos[i * 3] = Math.cos(ang) * r;
          ambientPos[i * 3 + 1] = Math.random() * 6;
          ambientPos[i * 3 + 2] = Math.sin(ang) * r;
        }
        const ambientGeo = new THREE.BufferGeometry();
        ambientGeo.setAttribute("position", new THREE.BufferAttribute(ambientPos, 3));
        const ambientTex = (() => {
          const S = 32;
          const c = document.createElement("canvas");
          c.width = c.height = S;
          const ctx = c.getContext("2d")!;
          const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
          g.addColorStop(0, "rgba(255,255,240,0.9)");
          g.addColorStop(1, "rgba(255,255,240,0)");
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, S, S);
          return new THREE.CanvasTexture(c);
        })();
        const ambientMat = new THREE.PointsMaterial({
          size: 0.12,
          map: ambientTex,
          transparent: true,
          opacity: 0.8,
          depthWrite: false,
          sizeAttenuation: true,
          blending: THREE.AdditiveBlending,
        });
        const ambientPoints = new THREE.Points(ambientGeo, ambientMat);
        bwDecor(ambientPoints);
        bwAmbientRef.current = ambientPoints;

        // ── Birds circling the island ───────────────────────────────────────
        const birdMat = new THREE.MeshBasicMaterial({ color: 0x2a2a2e, side: THREE.DoubleSide });
        const birds: THREE.Mesh[] = [];
        for (let i = 0; i < 4; i++) {
          const wingGeo = new THREE.BufferGeometry();
          wingGeo.setAttribute(
            "position",
            new THREE.BufferAttribute(new Float32Array([-0.35, 0, 0, 0, 0.08, 0, 0.35, 0, 0]), 3),
          );
          const bird = new THREE.Mesh(wingGeo, birdMat);
          bird.userData.orbitR = 10 + Math.random() * 9;
          bird.userData.orbitY = 7 + Math.random() * 4;
          bird.userData.orbitPhase = Math.random() * Math.PI * 2;
          bird.userData.orbitSpeed = 0.25 + Math.random() * 0.15;
          bwDecor(bird);
          birds.push(bird);
        }
        bwBirdsRef.current = birds;

        // ── NPC matchmaker — wizard statue ────────────────────────────────────
        // Stands at the centre-front of the hub, bigger and lower, facing the player
        const npcGroup = new THREE.Group();
        npcGroup.position.set(0, 5, -10);
        scene.add(npcGroup);
        bwObjects.push(npcGroup);
        bwNpcMesh = npcGroup;

        // Warm point light so the statue glows nicely
        const npcLight = new THREE.PointLight(0xfff0cc, 1.4, 8, 2);
        npcLight.position.set(0, 2, 0);
        npcGroup.add(npcLight);
        npcGroup.userData.staffLight = npcLight;

        // Placeholder shown until GLB loads
        const npcPlaceholder = new THREE.Mesh(
          new THREE.CylinderGeometry(0.5, 0.5, 3.5, 8),
          new THREE.MeshStandardMaterial({ color: 0x7a6a9a }),
        );
        npcPlaceholder.position.y = 1.75;
        npcGroup.add(npcPlaceholder);
        npcGroup.userData.placeholder = npcPlaceholder;

        // Floating magic particles orbiting the statue
        const NPC_P = 20;
        const npcPPos = new Float32Array(NPC_P * 3);
        const npcPGeo = new THREE.BufferGeometry();
        npcPGeo.setAttribute("position", new THREE.BufferAttribute(npcPPos, 3));
        const npcParticles = new THREE.Points(
          npcPGeo,
          new THREE.PointsMaterial({
            size: 0.09,
            color: 0xaa77ff,
            transparent: true,
            opacity: 0.9,
            depthWrite: false,
            sizeAttenuation: true,
            blending: THREE.AdditiveBlending,
          }),
        );
        npcGroup.add(npcParticles);
        npcGroup.userData.particles = npcParticles;

        // Load the wizard statue GLB — scale to ~3.5 units tall, face towards player
        new GLTFLoader().load(
          "/wizard_statue.glb",
          (gltf) => {
            if (bwNpcMesh !== npcGroup) return;
            const model = gltf.scene;
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            model.position.sub(center);
            const scale = 3.5 / Math.max(size.y, 0.001);
            model.scale.setScalar(scale);
            model.position.y += (size.y * scale) / 2;
            // Face the player (rotate 180° so the front faces +Z / toward origin)
            model.rotation.y = Math.PI;
            model.traverse((child) => {
              const mesh = child as THREE.Mesh;
              if (!mesh.isMesh) return;
              mesh.castShadow = true;
              mesh.receiveShadow = true;
            });
            npcGroup.remove(npcPlaceholder);
            npcGroup.add(model);
            npcGroup.userData.model = model;
            // Wizard statue has no animated rig parts — clear animation targets
            npcGroup.userData.head = null;
            npcGroup.userData.armL = null;
            npcGroup.userData.armR = null;
            npcGroup.userData.robe = model.getObjectByName("Cube");
          },
          undefined,
          () => {},
        );

        // (occlusion pass is called inside placeLobbyBlocks / fetch callback above)

        // Player position/hp reset is handled by the teleportLobby wrapper in
        // bwSceneRef (below) so this function is safe to call during engine init
        // before playerPos / curHp are declared.
      }

      function bwBuildMatch() {
        bwClearScene();
        bwMatchActive = true;
        bwRedBedAlive = true;
        bwBlueBedAlive = true;
        botHp = 20;
        botState = "idle";
        botRespawnTimer = 0;
        // 4-island diamond map (West=red, East=blue, North, South).
        // Scale 3× in X/Z so islands are vast and very far apart.
        // With S=3, MATCH_OX=-144:
        //   Red base  (file x=2-20)  → world x=-138 to -84,  z=-18 to 21
        //   Blue base (file x=75-93) → world x=81   to 135,  z=-18 to 21
        //   Gap between islands ≈ 165 world blocks of open air.
        // Island floor y=10 (Y not scaled — stays at file y).
        // Gate walls: file x=18-19 (red east) & file x=76-77 (blue west).
        const S = 3;
        const MAP_W = 96;
        const MATCH_OX = -(MAP_W * S) / 2; // -144
        const MATCH_OZ = -(MAP_W * S) / 2;
        const MATCH_OY = 0;
        const BASE_X = 114; // file x=10 → world x=-114 (red), file x=86 → +114 (blue)
        const BED_BLOCK_Y = 10; // island floor y (confirmed from map data)
        const BED_Y = 10.5; // visual height — top face of y=10 block
        botPos.set(BASE_X, BED_Y + 2, 0);
        botVel.set(0, 0, 0);

        _bwMatchMapCache = null; // bust cache — scale constants changed
        setBwMatchLoading(true);

        // Capture the already-initialized voxel helpers before registering any
        // asynchronous map callbacks. Safari can report a TDZ error for the
        // large effect-local function bindings when a delayed GLB/fetch callback
        // resumes after navigation or hot reload.
        const addMatchBlock = addBlock;
        const removeMatchBlock = removeBlock;
        const finishMatchMap = () => {
          runOcclusionPass();
          playerPos.set(-BASE_X, BED_Y + 4, 0);
          playerVel.set(0, 0, 0);
          curHp = 20;
          setHp(20);
          setBwMatchLoading(false);
        };

        // ── Gap-filling loader ────────────────────────────────────────────────
        // For each file block (fx,fy,fz) place S×S world blocks (Y unchanged).
        // After placement:
        //   1. Remap white wool (roof) to team colours.
        //   2. Clear the ENTIRE interior ceiling + gate wall so sky is visible.
        //   3. Stamp team-coloured wool at each bed position.
        //   4. Teleport player onto the red island (safe — blocks now exist).
        function placeMatchBlocks(u16: Uint16Array) {
          for (let i = 0; i < u16.length; i += 4) {
            const wx0 = u16[i] * S + MATCH_OX;
            const wy = u16[i + 1] + MATCH_OY;
            const wz0 = u16[i + 2] * S + MATCH_OZ;
            let bt = u16[i + 3];
            // Remap white wool (type 41) to team colour
            if (bt === 41) bt = wx0 < 0 ? 42 : 43;
            for (let sx = 0; sx < S; sx++)
              for (let sz = 0; sz < S; sz++) addMatchBlock(wx0 + sx, wy, wz0 + sz, bt);
          }

          // ── Open sky over the base interiors + blast the gate walls ────────
          // Red base interior (world x=-144 to -78) + gate wall (x≈-90 to -78)
          for (let wx = -144; wx <= -78; wx++)
            for (let wz = -30; wz <= 30; wz++)
              for (let wy = 14; wy <= 28; wy++) removeMatchBlock(wx, wy, wz);
          // Gate wall itself (below ceiling line, from floor up to ceiling hole)
          for (let wx = -100; wx <= -78; wx++)
            for (let wz = -24; wz <= 24; wz++)
              for (let wy = 11; wy <= 14; wy++) removeMatchBlock(wx, wy, wz);

          // Blue base interior (world x=78 to 144) + gate wall (x≈78 to 90)
          for (let wx = 78; wx <= 144; wx++)
            for (let wz = -30; wz <= 30; wz++)
              for (let wy = 14; wy <= 28; wy++) removeBlock(wx, wy, wz);
          for (let wx = 78; wx <= 100; wx++)
            for (let wz = -24; wz <= 24; wz++)
              for (let wy = 11; wy <= 14; wy++) removeBlock(wx, wy, wz);

          // ── Stamp team-coloured bed blocks ──────────────────────────────────
          removeMatchBlock(-BASE_X, BED_BLOCK_Y, 0);
          addMatchBlock(-BASE_X, BED_BLOCK_Y, 0, 42); // red wool
          removeMatchBlock(BASE_X, BED_BLOCK_Y, 0);
          addMatchBlock(BASE_X, BED_BLOCK_Y, 0, 43); // blue wool

          // Teleport AFTER blocks exist — player spawns on solid island, not void
          finishMatchMap();
        }

        fetch("/bw-match-map.b64")
          .then((r) => r.text())
          .then((b64) => {
            const bin = atob(b64);
            const buf = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
            _bwMatchMapCache = new Uint16Array(buf.buffer);
            if (!disposed) placeMatchBlocks(_bwMatchMapCache);
          })
          .catch(() => {
            if (disposed) return;
            // Fallback: two flat islands
            const R = 18;
            for (let dx = -R; dx <= R; dx++)
              for (let dz = -R; dz <= R; dz++) {
                addMatchBlock(-BASE_X + dx, 0, dz, 0);
                addMatchBlock(-BASE_X + dx, -1, dz, 2);
                addMatchBlock(BASE_X + dx, 0, dz, 0);
                addMatchBlock(BASE_X + dx, -1, dz, 2);
              }
            addMatchBlock(-BASE_X, BED_BLOCK_Y, 0, 42);
            addMatchBlock(BASE_X, BED_BLOCK_Y, 0, 43);
            finishMatchMap();
          });

        // ── Beds — GLB model tinted per team ──────────────────────────────────
        const bedSpawnBed = (wx: number, color: number, side: "red" | "blue") => {
          // Placeholder box (large) shown until GLB loads
          const placeholder = new THREE.Mesh(
            new THREE.BoxGeometry(2.8, 1.1, 5.2),
            new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.1 }),
          );
          placeholder.position.set(wx, BED_Y + 0.55, 0);
          placeholder.castShadow = true;
          scene.add(placeholder);
          bwObjects.push(placeholder);
          if (side === "red") bwRedBedMesh = placeholder;
          else bwBlueBedMesh = placeholder;

          new GLTFLoader().load("/bw-bed.glb", (gltf) => {
            if (!bwObjects.includes(placeholder)) return;
            const model = gltf.scene;
            const bbox = new THREE.Box3().setFromObject(model);
            const bSize = bbox.getSize(new THREE.Vector3());
            const bCtr = bbox.getCenter(new THREE.Vector3());
            // Scale so bed length (Z axis) ≈ 5 world units — large and visible
            const bScale = 5.0 / Math.max(bSize.z, 0.001);
            model.scale.setScalar(bScale);
            model.position.sub(bCtr.clone().multiplyScalar(bScale));
            model.position.y += (bSize.y * bScale) / 2;
            model.traverse((ch) => {
              const m = ch as THREE.Mesh;
              if (!m.isMesh) return;
              const mat = (m.material as THREE.MeshStandardMaterial).clone();
              mat.color.set(color);
              mat.roughness = 0.45;
              mat.metalness = 0.05;
              mat.needsUpdate = true;
              m.material = mat;
              m.castShadow = true;
              m.receiveShadow = true;
            });
            const grp = new THREE.Group();
            grp.add(model);
            grp.position.set(wx, BED_Y, 0);
            scene.add(grp);
            bwObjects.push(grp);
            scene.remove(placeholder);
            const pi = bwObjects.indexOf(placeholder);
            if (pi >= 0) bwObjects.splice(pi, 1);
            if (side === "red") bwRedBedMesh = grp;
            else bwBlueBedMesh = grp;
          });
        };
        bedSpawnBed(-BASE_X, 0xee2222, "red");
        bedSpawnBed(BASE_X, 0x2244ee, "blue");
        // Detection uses the wool block's INTEGER y (BED_BLOCK_Y), not the visual float
        bwRedBedPos.x = -BASE_X;
        bwRedBedPos.y = BED_BLOCK_Y;
        bwRedBedPos.z = 0;
        bwBlueBedPos.x = BASE_X;
        bwBlueBedPos.y = BED_BLOCK_Y;
        bwBlueBedPos.z = 0;

        // ── Resource generators — large, team-coloured, inside the gate ─────────
        // Generators sit 8 blocks toward the centre from each bed, at the gate
        // opening, so players collect resources right at the entrance.
        const genSize = 2.2;
        const genGeo = new THREE.BoxGeometry(genSize, genSize, genSize);
        const redGenMat = new THREE.MeshStandardMaterial({
          color: 0xff2222,
          emissive: 0xcc0000,
          emissiveIntensity: 0.7,
          roughness: 0.35,
          metalness: 0.4,
        });
        const bluGenMat = new THREE.MeshStandardMaterial({
          color: 0x2244ff,
          emissive: 0x001fcc,
          emissiveIntensity: 0.7,
          roughness: 0.35,
          metalness: 0.4,
        });
        bwRedGenMesh = new THREE.Mesh(genGeo, redGenMat);
        bwRedGenMesh.position.set(-BASE_X + 10, BED_Y + genSize / 2, 0);
        scene.add(bwRedGenMesh);
        bwObjects.push(bwRedGenMesh);
        bwBlueGenMesh = new THREE.Mesh(genGeo.clone(), bluGenMat);
        bwBlueGenMesh.position.set(BASE_X - 10, BED_Y + genSize / 2, 0);
        scene.add(bwBlueGenMesh);
        bwObjects.push(bwBlueGenMesh);

        // ── Shop / upgrade signs (inside the gate opening) ────────────────────
        const shopMat2 = new THREE.MeshLambertMaterial({ color: 0xf5c400 });
        const upgMat2 = new THREE.MeshLambertMaterial({ color: 0x44aaff });
        const signGeo = new THREE.BoxGeometry(0.8, 1.2, 0.2);
        for (const [sx, sdx] of [
          [-BASE_X, 8],
          [BASE_X, -8],
        ] as [number, number][]) {
          const s = new THREE.Mesh(signGeo, shopMat2);
          s.position.set(sx + sdx, BED_Y + 2, 4);
          const u = new THREE.Mesh(signGeo, upgMat2);
          u.position.set(sx + sdx, BED_Y + 2, 6);
          scene.add(s);
          bwObjects.push(s);
          scene.add(u);
          bwObjects.push(u);
        }

        // ── Bot entity ─────────────────────────────────────────────────────────
        const botGroup = new THREE.Group();
        const botBody = new THREE.Mesh(
          new THREE.BoxGeometry(0.6, 1.0, 0.3),
          new THREE.MeshLambertMaterial({ color: 0x2244ee }),
        );
        botBody.position.y = 0.5;
        const botHead = new THREE.Mesh(
          new THREE.BoxGeometry(0.5, 0.5, 0.5),
          new THREE.MeshLambertMaterial({ color: 0xffcc99 }),
        );
        botHead.position.y = 1.25;
        botGroup.add(botBody);
        botGroup.add(botHead);
        botGroup.position.copy(botPos);
        scene.add(botGroup);
        bwObjects.push(botGroup);
        bwBotMesh = botGroup;
        bwBotHpBar = createHpBar("Enemy", 20);
        bwBotHpBar.sprite.position.set(0, 2.05, 0);
        botGroup.add(bwBotHpBar.sprite);

        // Player spawn is deferred into placeMatchBlocks so blocks exist first.
      }

      // ── Engine v5: Minecraft-style procedural animal factory ─────────────────
      // Builds a blocky animal mesh group from BoxGeometry parts and registers it
      // for per-tick wander AI + leg-swing animation.
      function spawnAnimal(
        type: "cow" | "pig" | "sheep" | "chicken",
        ax: number,
        ay: number,
        az: number,
      ) {
        const g = new THREE.Group();
        const m = (hex: number) => new THREE.MeshLambertMaterial({ color: hex });
        const box = (w: number, h: number, d: number, mat: THREE.Material) =>
          new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);

        let headRef!: THREE.Object3D;
        const legRefs: THREE.Object3D[] = [];

        const legPositions: [number, number, number][] = [
          [0.28, 0, 0.2],
          [-0.28, 0, 0.2],
          [0.28, 0, -0.2],
          [-0.28, 0, -0.2],
        ];

        if (type === "cow") {
          const bodyM = m(0xd4a870);
          const legM = m(0x1a0a00);
          const spotM = m(0x2a1205);
          const noseM = m(0xffbba8);
          const hornM = m(0xddcc88);
          const body = box(1.2, 0.75, 0.62, bodyM);
          body.position.set(0, 0.92, 0);
          g.add(body);
          const sp1 = box(0.34, 0.34, 0.09, spotM);
          sp1.position.set(0.22, 0.94, 0.32);
          g.add(sp1);
          const sp2 = box(0.24, 0.26, 0.09, spotM);
          sp2.position.set(-0.28, 1.12, 0.32);
          g.add(sp2);
          const hd = box(0.55, 0.52, 0.5, bodyM);
          hd.position.set(0, 1.36, 0.6);
          g.add(hd);
          headRef = hd;
          const ns = box(0.34, 0.18, 0.09, noseM);
          ns.position.set(0, 1.23, 0.86);
          g.add(ns);
          const h1 = box(0.08, 0.22, 0.08, hornM);
          h1.position.set(0.18, 1.66, 0.54);
          g.add(h1);
          const h2 = box(0.08, 0.22, 0.08, hornM);
          h2.position.set(-0.18, 1.66, 0.54);
          g.add(h2);
          for (const [lx, , lz] of legPositions) {
            const lg = box(0.22, 0.6, 0.22, legM);
            lg.position.set(lx, 0.3, lz);
            g.add(lg);
            legRefs.push(lg);
          }
        } else if (type === "pig") {
          const bodyM = m(0xf4a8a0);
          const legM = m(0xe08880);
          const snoutM = m(0xdd9090);
          const body = box(1.0, 0.72, 0.6, bodyM);
          body.position.set(0, 0.86, 0);
          g.add(body);
          const hd = box(0.52, 0.5, 0.48, bodyM);
          hd.position.set(0, 1.3, 0.56);
          g.add(hd);
          headRef = hd;
          const sn = box(0.3, 0.2, 0.12, snoutM);
          sn.position.set(0, 1.2, 0.8);
          g.add(sn);
          const e1 = box(0.16, 0.16, 0.06, snoutM);
          e1.position.set(0.2, 1.52, 0.68);
          g.add(e1);
          const e2 = box(0.16, 0.16, 0.06, snoutM);
          e2.position.set(-0.2, 1.52, 0.68);
          g.add(e2);
          for (const [lx, , lz] of legPositions) {
            const lg = box(0.2, 0.52, 0.2, legM);
            lg.position.set(lx, 0.26, lz);
            g.add(lg);
            legRefs.push(lg);
          }
        } else if (type === "sheep") {
          const woolM = m(0xe8e8e0);
          const skinM = m(0xaaaaaa);
          const legM = m(0x888888);
          // Wool body — slightly larger/puffier than base
          const wool = box(1.15, 0.8, 0.7, woolM);
          wool.position.set(0, 0.95, 0);
          g.add(wool);
          const hd = box(0.46, 0.46, 0.44, skinM);
          hd.position.set(0, 1.42, 0.58);
          g.add(hd);
          headRef = hd;
          for (const [lx, , lz] of legPositions) {
            const lg = box(0.2, 0.56, 0.2, legM);
            lg.position.set(lx, 0.28, lz);
            g.add(lg);
            legRefs.push(lg);
          }
        } else {
          // chicken — load GLB model, fall back to procedural geometry
          // Lightweight procedural placeholder visible while the GLB loads
          const bodyM = m(0xeeeecc);
          const wingM = m(0xddddaa);
          const legM = m(0xffcc44);
          const bkM = m(0xff8800);
          const wattleM = m(0xcc2222);
          const body = box(0.62, 0.52, 0.46, bodyM);
          body.position.set(0, 0.74, 0);
          g.add(body);
          const hd = box(0.32, 0.3, 0.3, bodyM);
          hd.position.set(0, 1.14, 0.36);
          g.add(hd);
          headRef = hd;
          const bk = box(0.1, 0.1, 0.14, bkM);
          bk.position.set(0, 1.1, 0.52);
          g.add(bk);
          const wl = box(0.08, 0.12, 0.06, wattleM);
          wl.position.set(0, 1.0, 0.5);
          g.add(wl);
          const w1 = box(0.1, 0.34, 0.4, wingM);
          w1.position.set(0.36, 0.76, 0);
          g.add(w1);
          const w2 = box(0.1, 0.34, 0.4, wingM);
          w2.position.set(-0.36, 0.76, 0);
          g.add(w2);
          // Chickens only have 2 legs for animation
          for (const [lx, , lz] of [legPositions[0], legPositions[1]]) {
            const lg = box(0.1, 0.42, 0.1, legM);
            lg.position.set(lx, 0.21, lz + 0.04);
            g.add(lg);
            legRefs.push(lg);
          }
          // Async: swap in the real GLB model once loaded
          new GLTFLoader().load("/minecraft_chicken.glb", (gltf) => {
            // Remove procedural parts (keep only legRefs for wander animation, hide them)
            [body, hd, bk, wl, w1, w2].forEach((m3) => {
              m3.visible = false;
            });
            const model = gltf.scene;
            model.scale.setScalar(0.9);
            model.rotation.y = Math.PI; // face forward
            model.position.set(0, 0, 0);
            model.traverse((child) => {
              if ((child as THREE.Mesh).isMesh) (child as THREE.Mesh).castShadow = true;
            });
            g.add(model);
          });
        }

        g.position.set(ax, ay, az);
        g.rotation.y = Math.random() * Math.PI * 2;
        scene.add(g);

        const entity: AnimalEntity = {
          group: g,
          head: headRef,
          legs: legRefs,
          walkPhase: Math.random() * Math.PI * 2,
          wanderDir: Math.random() * Math.PI * 2,
          wanderTimer: Math.random() * 4,
          isMoving: false,
          home: new THREE.Vector3(ax, ay, az),
        };
        animalEntities.push(entity);
        return entity;
      }

      // Expose scene callbacks to React via ref
      if (isBedwars) {
        bwSceneRef.current = {
          // Wrappers are called AFTER engine init, so playerPos/playerVel/curHp
          // are safely in scope by the time these functions execute.
          teleportLobby: () => {
            setBwDefeat(false);
            setBwMatchLoading(false);
            bwBuildLobby();
            // Island surface is flat at y=3. Spawn at y=5 so gravity drops
            // the player onto the grass — never buried inside it.
            playerPos.set(0, 5, 0);
            playerVel.set(0, 0, 0);
            curHp = 20;
            setHp(20);
          },
          teleportMatch: bwBuildMatch,
          resetMatch: bwBuildMatch,
        };
        // Build lobby on first load
        bwBuildLobby();
        // Hard timeout: if the GLB hasn't resolved in 14 s (slow network or
        // silent parse error) force the loading screen to clear so the player
        // isn't stuck staring at "Generating world" forever.
        const _bwLoadGuard = setTimeout(() => {
          if (!mapLoaded) {
            mapLoaded = true;
            onMapLoaded?.();
          }
        }, 14000);
        // Stash on bwSceneRef so the cleanup below can cancel it
        (bwSceneRef as { current: ReturnType<typeof Object.assign> }).current._loadGuard =
          _bwLoadGuard;
      }

      if (isEggwars) {
        eggSceneRef.current = {
          startMatch: eggStartMatch,
          resetMatch: () => {
            eggMatchActive = false;
            eggCountdownStartedRef.current = false;
            setEggMatchLoading(false);
            setEggState({
              phase: "lobby",
              countdown: 3,
              time: 0,
              iron: 0,
              gold: 0,
              diamond: 0,
              teams: EGG_TEAMS.map((team) => ({ ...team })),
              generatorLevel: 1,
              toast: null,
            });
            eggBuildMatch();
            playerPos.set(-24, 3, 0);
            playerVel.set(0, 0, 0);
            curHp = 20;
            setHp(20);
          },
        };
        eggBuildMatch();
        const eggLoadGuard = setTimeout(() => {
          if (!mapLoaded) {
            mapLoaded = true;
            setEggMatchLoading(false);
            onMapLoaded?.();
          }
        }, 14000);
        (eggSceneRef as { current: Record<string, unknown> }).current._loadGuard = eggLoadGuard;
      }

      if (isTntRush) {
        // ── TNT Rush: Big Sand Arena ─────────────────────────────────────────────
        // Large square arena (36×36 interior) with sand walls, varied terrain,
        // and scattered cover structures for tactical TNT throwing.
        const AR = 18; // half-width
        const WALL_H = 6;
        // Floor — checkerboard sand/sandstone for visual texture
        for (let ax = -AR; ax <= AR; ax++) {
          for (let az = -AR; az <= AR; az++) {
            // Alternate sand (4) and sandstone (4) using position parity for texture
            addBlock(ax, 0, az, 4); // sand floor
          }
        }
        // Raised sandy platform in center
        for (let ax = -4; ax <= 4; ax++) {
          for (let az = -4; az <= 4; az++) {
            addBlock(ax, 1, az, 4);
          }
        }
        // Perimeter walls (sand) — tall with battlements
        for (let wy = 1; wy <= WALL_H; wy++) {
          for (let a = -AR; a <= AR; a++) {
            addBlock(a, wy, -AR, 4);
            addBlock(a, wy, AR, 4);
            addBlock(-AR, wy, a, 4);
            addBlock(AR, wy, a, 4);
          }
        }
        // Battlements (crenellations) — alternating gaps at top of walls
        for (let a = -AR; a <= AR; a += 2) {
          addBlock(a, WALL_H + 1, -AR, 4);
          addBlock(a, WALL_H + 1, AR, 4);
          addBlock(-AR, WALL_H + 1, a, 4);
          addBlock(AR, WALL_H + 1, a, 4);
        }
        // Corner towers — tall, imposing
        for (let wy = 1; wy <= WALL_H + 4; wy++) {
          for (const [cx, cz] of [
            [-AR, -AR],
            [-AR, AR],
            [AR, -AR],
            [AR, AR],
          ] as [number, number][]) {
            for (let tx = 0; tx <= 1; tx++)
              for (let tz = 0; tz <= 1; tz++) {
                addBlock(cx + Math.sign(cx || 1) * tx, wy, cz + Math.sign(cz || 1) * tz, 4);
              }
          }
        }
        // Scattered sand mounds inside arena for cover
        const MOUNDS: [number, number, number][] = [
          [7, 7, 2],
          [-7, 7, 3],
          [7, -7, 2],
          [-7, -7, 3],
          [0, 11, 2],
          [11, 0, 2],
          [-11, 0, 3],
          [0, -11, 2],
          [4, 0, 1],
          [0, 4, 1],
          [-4, 0, 2],
          [0, -4, 1],
        ];
        for (const [mx, mz, mh] of MOUNDS) {
          for (let dy = 1; dy <= mh; dy++) {
            const r = mh - dy + 1.5;
            for (let ddx = -Math.ceil(r); ddx <= Math.ceil(r); ddx++) {
              for (let ddz = -Math.ceil(r); ddz <= Math.ceil(r); ddz++) {
                if (Math.sqrt(ddx * ddx + ddz * ddz) <= r) addBlock(mx + ddx, dy, mz + ddz, 4);
              }
            }
          }
        }
        // Corner sandstone pillars inside arena (for cover)
        for (const [px, pz] of [
          [10, 10],
          [-10, 10],
          [10, -10],
          [-10, -10],
        ] as [number, number][]) {
          for (let py = 1; py <= 4; py++) {
            addBlock(px, py, pz, 4);
            addBlock(px + 1, py, pz, 4);
            addBlock(px, py, pz + 1, 4);
          }
          addBlock(px, 5, pz, 46); // glowstone torch top
        }
        runOcclusionPass();

        // ── TNT Rush: overlay arena GLB with game-native voxel textures ──────
        // We load the GLB purely for its geometry; every mesh's material is
        // replaced with one of our own MeshLambertMaterial/MeshStandardMaterial
        // instances so the model reads as part of the same pixel-art world.
        new GLTFLoader().load(
          "/tnt-rush-arena.glb",
          (gltf) => {
            const model = gltf.scene;
            model.scale.setScalar(0.5);
            model.position.set(0, -1, 0);
            // Remap every mesh to a voxel material by name-keyword matching
            model.traverse((node: THREE.Object3D) => {
              const mesh = node as THREE.Mesh;
              if (!mesh.isMesh) return;
              mesh.castShadow = true;
              mesh.receiveShadow = true;
              const n = mesh.name.toLowerCase();
              let mat: THREE.Material | THREE.Material[];
              if (n.includes("brick") || n.includes("wall")) mat = mBricks;
              else if (n.includes("plank") || n.includes("wood")) mat = mOakPlanks;
              else if (n.includes("stone") || n.includes("rock") || n.includes("cobble"))
                mat = mStone;
              else if (n.includes("sand") || n.includes("floor")) mat = mSand;
              else if (n.includes("iron") || n.includes("metal")) mat = mIronBlock;
              else if (n.includes("gold")) mat = mGoldBlock;
              else if (n.includes("dirt") || n.includes("soil")) mat = mDirt;
              else if (n.includes("grass") || n.includes("turf")) mat = grassFaces;
              else mat = mStone; // safe fallback
              mesh.material = mat;
            });
            scene.add(model);
          },
          undefined,
          () => {
            /* silently ignore if asset missing */
          },
        );
      }

      if (isBlockParty) {
        // ── BLOCK PARTY: floating color-call arena ──────────────────────────
        // A deliberately model-free party game: the color floor is the hero,
        // and all eight tile materials come from the shared voxel engine.
        const PARTY_W = 13;
        const PARTY_D = 9;
        function buildPartyFloor() {
          clearAllBlocks();
          partyTiles.length = 0;
          for (let x = -Math.floor(PARTY_W / 2); x <= Math.floor(PARTY_W / 2); x++) {
            for (let z = -Math.floor(PARTY_D / 2); z <= Math.floor(PARTY_D / 2); z++) {
              const type =
                partyTypes[(Math.abs(x * 13 + z * 7) + x * x + z * z) % partyTypes.length];
              partyTiles.push({ x, z, type });
              addBlock(x, 0, z, type);
              addBlock(x, -1, z, 2);
            }
          }
          // A small glow border gives the arena a readable silhouette above
          // the void without introducing any extra model assets.
          for (let x = -7; x <= 7; x++) {
            addBlock(x, 1, -5, 46);
            addBlock(x, 1, 5, 46);
          }
          for (let z = -4; z <= 4; z++) {
            addBlock(-7, 1, z, 46);
            addBlock(7, 1, z, 46);
          }
          runOcclusionPass();
        }
        rebuildPartyFloor = buildPartyFloor;

        function choosePartyColor() {
          partyTargetIndex =
            (partyRoundLocal - 1 + Math.floor(Math.random() * partyTypes.length)) %
            partyTypes.length;
          partyTimeLocal = 8;
          partySecondShown = -1;
          setPartyRound(partyRoundLocal);
          setPartyTime(partyTimeLocal);
          setPartyColor(partyLabels[partyTargetIndex]);
          setPartyMessage("Find the called color");
        }

        function startPartySearch() {
          partyPhase = "search";
          partyRoundLocal = 1;
          partyTimeLocal = 8;
          setPartyStatus("search");
          choosePartyColor();
        }

        buildPartyFloor();
        // The arena floor is centered at y=0, so the normal gravity/collision
        // loop drops the player onto it from the dedicated spawn point.
        setPartyRound(1);
        setPartyTime(3);
        setPartyColor(partyLabels[0]);
        setPartyMessage("Get ready");
        setPartyStatus("countdown");
        partyStartTimer = setTimeout(startPartySearch, 3000);
      } else if (isSpleef) {
        {
          // ── Spleef Map: Crystal Dome ──────────────────────────────────────────
          // Full-circle breakaway arena with 5 concentric rings. Outer rings are
          // snow (easy to dig), inner rings packed snow, centre is a raised hub.
          const DOME_R = 22;
          const domeRings: Array<[number, number, number]> = [
            [0, 4, 16], // centre: stone bricks, elevated
            [4, 8, 100], // ring 1: snow
            [8, 13, 100], // ring 2: snow
            [13, 18, 101], // ring 3: packed snow
            [18, 22, 101], // outer rim: packed snow
          ];
          for (let dax = -DOME_R; dax <= DOME_R; dax++) {
            for (let daz = -DOME_R; daz <= DOME_R; daz++) {
              const ddist = Math.sqrt(dax * dax + daz * daz);
              if (ddist > DOME_R) continue;
              const dring = domeRings.find(([mn, mx]) => ddist >= mn && ddist < mx);
              if (!dring) continue;
              const dbt = dring[2];
              const delevated = dring[0] === 0;
              const dtopY = delevated ? 1 : 0;
              addBlock(dax, dtopY, daz, dbt);
              addBlock(dax, dtopY - 1, daz, 101);
              if (delevated) addBlock(dax, -1, daz, 11);
            }
          }
          // Crystal obelisks at 4 compass points
          const domePillarGeo = new THREE.BoxGeometry(1.3, 14, 1.3);
          const domePillarMat = new THREE.MeshStandardMaterial({
            color: 0xbde4f5,
            roughness: 0.12,
            metalness: 0.05,
            transparent: true,
            opacity: 0.8,
          });
          for (let dop = 0; dop < 4; dop++) {
            const doa = (dop * Math.PI * 2) / 4;
            const dob = new THREE.Mesh(domePillarGeo, domePillarMat);
            dob.position.set(
              Math.round(Math.cos(doa) * (DOME_R + 2)),
              -3,
              Math.round(Math.sin(doa) * (DOME_R + 2)),
            );
            dob.castShadow = true;
            scene.add(dob);
          }
          // Underside ice stalactites
          const domeUnderMat = new THREE.MeshStandardMaterial({
            color: 0x1a3a5e,
            roughness: 0.85,
            metalness: 0.05,
          });
          const domeUnderGeo = new THREE.BoxGeometry(1, 1, 1);
          for (let di = 0; di < 55; di++) {
            const da = Math.random() * Math.PI * 2,
              dr = Math.random() * (DOME_R - 1);
            const dch = new THREE.Mesh(domeUnderGeo, domeUnderMat);
            const dsc = 0.8 + Math.random() * 1.5;
            dch.scale.set(dsc, dsc * (0.5 + Math.random() * 0.9), dsc);
            dch.position.set(
              Math.cos(da) * dr + (Math.random() - 0.5),
              -2 - (1.4 + Math.random() * 3) * 0.5,
              Math.sin(da) * dr + (Math.random() - 0.5),
            );
            dch.rotation.set(Math.random() * 0.3, Math.random() * Math.PI, Math.random() * 0.3);
            scene.add(dch);
          }
        } // end Crystal Dome
      } else if (isEscape) {
        // ── ESCAPE: SCP-069 — Backrooms containment wing ─────────────────────
        // The imported map is visual dressing only. A compact voxel shell keeps
        // collision and startup deterministic even if the GLB is still loading.
        engineSpawnY = 2.5;
        const escapeFloor = 0;
        const escapeHalf = 26;
        const escapeLength = 76;
        for (let x = -escapeHalf; x <= escapeHalf; x++) {
          for (let z = -escapeLength / 2; z <= escapeLength / 2; z++) {
            addBlock(x, escapeFloor, z, 11);
            if (Math.abs(x) > escapeHalf - 2) addBlock(x, 1, z, 2);
          }
        }
        for (let z = -escapeLength / 2; z <= escapeLength / 2; z++) {
          for (let y = 1; y <= 5; y++) {
            addBlock(-escapeHalf, y, z, 2);
            addBlock(escapeHalf, y, z, 2);
          }
        }
        // Repeating wall pillars, lights, and a few side rooms make the
        // generated fallback read as a liminal containment corridor.
        for (let z = -escapeLength / 2 + 8; z <= escapeLength / 2 - 8; z += 12) {
          for (const x of [-escapeHalf + 3, escapeHalf - 3]) {
            for (let y = 1; y <= 4; y++) addBlock(x, y, z, y === 4 ? 46 : 13);
          }
          const alarm = new THREE.PointLight(0xff2020, 1.15, 14, 2);
          alarm.position.set(escapeHalf - 2.2, 3.6, z);
          scene.add(alarm);
        }
        const escapeLoader = new GLTFLoader();
        escapeLoader.load(
          escapeBackroomsUrl,
          (gltf) => {
            if (disposed) return;
            const map = gltf.scene;
            map.updateWorldMatrix(true, true);
            const bounds = new THREE.Box3().setFromObject(map);
            const size = bounds.getSize(new THREE.Vector3());
            const scale = Math.min(
              (escapeHalf * 1.7) / Math.max(size.x, 1),
              (escapeLength * 0.72) / Math.max(size.z, 1),
            );
            map.scale.setScalar(scale);
            map.position.set(0, 0.1, 0);
            map.traverse((node) => {
              const mesh = node as THREE.Mesh;
              if (mesh.isMesh) {
                mesh.castShadow = true;
                mesh.receiveShadow = true;
              }
            });
            scene.add(map);
            map.userData.escapeMap = true;
          },
          undefined,
          () => {},
        );
        new GLTFLoader().load(
          escapeScpUrl,
          (gltf) => {
            if (disposed) return;
            escapeScpMesh = gltf.scene;
            const bounds = new THREE.Box3().setFromObject(escapeScpMesh);
            const size = bounds.getSize(new THREE.Vector3());
            escapeScpMesh.scale.setScalar(3.2 / Math.max(size.y, 1));
            escapeScpMesh.position.copy(escapeScpPos);
            escapeScpMesh.visible = true;
            escapeScpMesh.traverse((node) => {
              const mesh = node as THREE.Mesh;
              if (mesh.isMesh) {
                mesh.castShadow = true;
                mesh.frustumCulled = true;
              }
            });
            if (gltf.animations.length) {
              escapeScpMixer = new THREE.AnimationMixer(escapeScpMesh);
              escapeScpMixer.clipAction(gltf.animations[0]).play();
            }
            scene.add(escapeScpMesh);
          },
          undefined,
          () => {},
        );
        sbSceneRef.current = {
          teleportHome: () => {
            playerPos.set(0, 2.5, 20);
            playerVel.set(0, 0, 0);
          },
          teleportShop: () => {
            playerPos.set(0, 2.5, 20);
            playerVel.set(0, 0, 0);
          },
          teleportMining: () => {
            playerPos.set(0, 2.5, 20);
            playerVel.set(0, 0, 0);
          },
        };
        runOcclusionPass();
      } else if (isSkyblock) {
        // ── SKYBLOCK [NEW HORIZON]: expanded main island + parkour to satellite island ──
        engineSpawnY = 2;

        const islandRadius = 14;
        for (let ix = -islandRadius; ix <= islandRadius; ix++) {
          for (let iz = -islandRadius; iz <= islandRadius; iz++) {
            const edge = Math.sqrt(ix * ix + iz * iz);
            if (edge > islandRadius - 0.25) continue;
            addBlock(ix, 0, iz, 0); // Grass top
            addBlock(ix, -1, iz, 1); // Dirt layer
            if (edge < 11.5) addBlock(ix, -2, iz, 2); // Stone layers
            if (edge < 8.5) addBlock(ix, -3, iz, 2);
            if (edge < 5.5) addBlock(ix, -4, iz, 2);
            if (edge < 3.0) addBlock(ix, -5, iz, 2);
          }
        }
        // Main oak tree on island landmark.
        const treeX = -3,
          treeZ = -3;
        for (let ty = 1; ty <= 6; ty++) addBlock(treeX, ty, treeZ, 3);
        for (let ly = 4; ly <= 8; ly++) {
          const radius = ly === 4 ? 2 : ly === 5 || ly === 6 ? 3 : ly === 7 ? 2 : 1;
          for (let lx = -radius; lx <= radius; lx++) {
            for (let lz = -radius; lz <= radius; lz++) {
              if (Math.abs(lx) === radius && Math.abs(lz) === radius && radius > 1) continue;
              if (ly === 8 && Math.abs(lx) + Math.abs(lz) > 1) continue;
              addBlock(treeX + lx, ly, treeZ + lz, 5);
            }
          }
        }

        // ── Distant Floating Parkour Trail to Satellite Treasure Island ──
        const parkourSteps = [
          { x: 18, y: 0, z: -4, t: 18 },
          { x: 26, y: 1, z: -10, t: 2 },
          { x: 35, y: 2, z: -16, t: 18 },
          { x: 44, y: 2, z: -23, t: 15 },
          { x: 53, y: 3, z: -30, t: 18 },
          { x: 62, y: 4, z: -37, t: 13 },
          { x: 71, y: 4, z: -44, t: 18 },
        ];
        for (const step of parkourSteps) {
          addBlock(step.x, step.y, step.z, step.t);
          if (step.x === 44 || step.x === 62) {
            addBlock(step.x + 1, step.y, step.z, step.t);
          }
        }

        // ── Distant Satellite Treasure Island ──
        const satCenterX = 82;
        const satCenterZ = -52;
        const satRadius = 5;
        for (let sx = -satRadius; sx <= satRadius; sx++) {
          for (let sz = -satRadius; sz <= satRadius; sz++) {
            const edge = Math.sqrt(sx * sx + sz * sz);
            if (edge > satRadius - 0.2) continue;
            const wx = satCenterX + sx;
            const wz = satCenterZ + sz;
            addBlock(wx, 4, wz, 0); // Grass
            addBlock(wx, 3, wz, 1); // Dirt
            if (edge < 3.5) addBlock(wx, 2, wz, 2); // Stone underneath
            if (edge < 2.0) addBlock(wx, 1, wz, 2);
          }
        }
        // Treasure reward on satellite island: Gold & Diamond ore cache + Glowstone pillar
        addBlock(satCenterX, 5, satCenterZ, 46); // Beacon / Lantern
        addBlock(satCenterX - 1, 5, satCenterZ, 9); // Gold block
        addBlock(satCenterX + 1, 5, satCenterZ, 10); // Diamond block
        addBlock(satCenterX, 5, satCenterZ - 1, 47); // Ruby / Amethyst crystal
        addBlock(satCenterX, 5, satCenterZ + 1, 15); // Obsidian

        // ── Distant HIMMEL STATUE SANCTUARY & PHOENIX NEST ISLAND ──
        const himmelCenterX = -72;
        const himmelCenterZ = 54;
        const himmelCenterY = 14;
        const himmelRadius = 9;

        for (let ix = -himmelRadius; ix <= himmelRadius; ix++) {
          for (let iz = -himmelRadius; iz <= himmelRadius; iz++) {
            const edge = Math.sqrt(ix * ix + iz * iz);
            if (edge > himmelRadius - 0.2) continue;
            const wx = himmelCenterX + ix;
            const wz = himmelCenterZ + iz;
            const topType = (ix + iz) % 5 === 0 ? 11 : (ix * iz) % 3 === 0 ? 28 : 0;
            addBlock(wx, himmelCenterY, wz, topType);
            addBlock(wx, himmelCenterY - 1, wz, 1);
            if (edge < 7.5) addBlock(wx, himmelCenterY - 2, wz, 2);
            if (edge < 5.0) addBlock(wx, himmelCenterY - 3, wz, 2);
            if (edge < 2.5) addBlock(wx, himmelCenterY - 4, wz, 2);
          }
        }

        // Raised Himmel Statue Dais & Ancient Pillars
        for (let px = -3; px <= 3; px++) {
          for (let pz = -3; pz <= 3; pz++) {
            addBlock(himmelCenterX + px, himmelCenterY + 1, himmelCenterZ + pz, 16); // smooth stone
          }
        }
        // Four corner quartz pillars with glowing beacons
        const pillarOffsets = [
          [-3, -3],
          [3, -3],
          [-3, 3],
          [3, 3],
        ];
        for (const [ox, oz] of pillarOffsets) {
          for (let py = 2; py <= 5; py++) {
            addBlock(himmelCenterX + ox, himmelCenterY + py, himmelCenterZ + oz, 11);
          }
          addBlock(himmelCenterX + ox, himmelCenterY + 6, himmelCenterZ + oz, 46); // glowstone beacon
        }

        // Phoenix Golden Nest (Adjacent to Statue)
        const nestX = -62;
        const nestZ = 50;
        for (let nx = -2; nx <= 2; nx++) {
          for (let nz = -2; nz <= 2; nz++) {
            const isRim = Math.abs(nx) === 2 || Math.abs(nz) === 2;
            addBlock(nestX + nx, himmelCenterY + (isRim ? 2 : 1), nestZ + nz, isRim ? 24 : 9);
          }
        }
        addBlock(nestX, himmelCenterY + 1, nestZ, 46); // Glowing Phoenix hearth in nest center

        // Ethereal Sky Bridge connecting Main Starter Island to Distant Himmel Sanctuary
        const bridgeSteps = 28;
        for (let s = 1; s <= bridgeSteps; s++) {
          const t = s / bridgeSteps;
          const bx = Math.round(-14 * (1 - t) + (himmelCenterX + 8) * t);
          const by = Math.round(0 * (1 - t) + himmelCenterY * t);
          const bz = Math.round(10 * (1 - t) + (himmelCenterZ - 6) * t);
          addBlock(bx, by, bz, 18); // Wood plank step
          addBlock(bx, by, bz + 1, 18);
          if (s % 6 === 0) {
            addBlock(bx, by + 1, bz, 46); // Glowstone lantern post
          }
        }

        // ── CELESTIAL SKY ISLANDS (Distant in the sky for Phoenix Flight!) ──

        // 1. Celestial Starlight Obelisk Island (X: 110, Y: 85, Z: -95)
        const obeliskX = 110,
          obeliskY = 85,
          obeliskZ = -95;
        for (let ix = -6; ix <= 6; ix++) {
          for (let iz = -6; iz <= 6; iz++) {
            const d = Math.sqrt(ix * ix + iz * iz);
            if (d > 5.8) continue;
            addBlock(obeliskX + ix, obeliskY, obeliskZ + iz, (ix + iz) % 3 === 0 ? 11 : 16);
            if (d < 4) addBlock(obeliskX + ix, obeliskY - 1, obeliskZ + iz, 2);
            if (d < 2) addBlock(obeliskX + ix, obeliskY - 2, obeliskZ + iz, 2);
          }
        }
        // Massive amethyst & diamond crystal spire shooting into the sky
        for (let sy = 1; sy <= 12; sy++) {
          addBlock(obeliskX, obeliskY + sy, obeliskZ, sy > 8 ? 47 : sy > 4 ? 31 : 34);
        }
        addBlock(obeliskX - 1, obeliskY + 1, obeliskZ, 31); // Diamond blocks
        addBlock(obeliskX + 1, obeliskY + 1, obeliskZ, 31);
        addBlock(obeliskX, obeliskY + 1, obeliskZ - 1, 30); // Gold blocks
        addBlock(obeliskX, obeliskY + 1, obeliskZ + 1, 30);
        addBlock(obeliskX, obeliskY + 13, obeliskZ, 46); // Beacon top

        // 2. Archangel Cloud Temple (X: -120, Y: 115, Z: -75)
        const templeX = -120,
          templeY = 115,
          templeZ = -75;
        for (let ix = -7; ix <= 7; ix++) {
          for (let iz = -7; iz <= 7; iz++) {
            const d = Math.sqrt(ix * ix + iz * iz);
            if (d > 6.8) continue;
            addBlock(templeX + ix, templeY, templeZ + iz, 11);
            if (d < 5) addBlock(templeX + ix, templeY - 1, templeZ + iz, 2);
          }
        }
        for (let cy = 1; cy <= 7; cy++) {
          addBlock(templeX - 4, templeY + cy, templeZ - 4, 11);
          addBlock(templeX + 4, templeY + cy, templeZ - 4, 11);
          addBlock(templeX - 4, templeY + cy, templeZ + 4, 11);
          addBlock(templeX + 4, templeY + cy, templeZ + 4, 11);
        }
        for (let ax = -4; ax <= 4; ax++) {
          addBlock(templeX + ax, templeY + 8, templeZ - 4, 11);
          addBlock(templeX + ax, templeY + 8, templeZ + 4, 11);
        }
        addBlock(templeX, templeY + 1, templeZ, 33); // Emerald cache
        addBlock(templeX - 1, templeY + 1, templeZ, 33);
        addBlock(templeX + 1, templeY + 1, templeZ, 33);
        addBlock(templeX, templeY + 2, templeZ, 46); // Glowing beacon

        // 3. Grand Cosmic Citadel (X: 45, Y: 160, Z: 120)
        const citadelX = 45,
          citadelY = 160,
          citadelZ = 120;
        for (let ix = -9; ix <= 9; ix++) {
          for (let iz = -9; iz <= 9; iz++) {
            const d = Math.sqrt(ix * ix + iz * iz);
            if (d > 8.8) continue;
            const blockT = d > 7.5 ? 15 : d > 5.5 ? 30 : d > 3.5 ? 31 : 16;
            addBlock(citadelX + ix, citadelY, citadelZ + iz, blockT);
            if (d < 6) addBlock(citadelX + ix, citadelY - 1, citadelZ + iz, 2);
            if (d < 3) addBlock(citadelX + ix, citadelY - 2, citadelZ + iz, 2);
          }
        }
        addBlock(citadelX, citadelY + 1, citadelZ, 46);
        addBlock(citadelX, citadelY + 2, citadelZ, 46);
        addBlock(citadelX, citadelY + 3, citadelZ, 47); // Amethyst crown

        // Grounded pond on starter island
        // Starter island fixtures
        {
          // Island ground features
        }

        // Phoenix companion: load model (scaled 12% smaller) and animate flight
        new GLTFLoader().load(
          phoenixUrl,
          (gltf) => {
            if (disposed) return;
            skyPhoenix = gltf.scene;
            const bounds = new THREE.Box3().setFromObject(skyPhoenix);
            const size = bounds.getSize(new THREE.Vector3());
            const largestAxis = Math.max(size.x, size.y, size.z) || 1;
            // Phoenix scaled even smaller and glowing per user request
            skyPhoenix.scale.setScalar(0.08 / largestAxis);
            skyPhoenix.position.copy(phoenixNestPos);
            skyPhoenix.traverse((node) => {
              const mesh = node as THREE.Mesh;
              if (!mesh.isMesh) return;
              mesh.castShadow = true;
              mesh.receiveShadow = true;
              mesh.frustumCulled = false;
              if (mesh.material) {
                const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                mats.forEach((m) => {
                  const stdMat = m as any;
                  if (stdMat.map) {
                    stdMat.map.magFilter = THREE.LinearFilter;
                    stdMat.map.minFilter = THREE.LinearMipmapLinearFilter;
                    stdMat.map.generateMipmaps = true;
                    stdMat.map.anisotropy = 16;
                    stdMat.map.needsUpdate = true;
                  }
                  stdMat.emissive = new THREE.Color(0xff6600);
                  stdMat.emissiveIntensity = 0.85;
                  stdMat.needsUpdate = true;
                });
              }
            });
            // Radiant glowing phoenix fire light
            const phoenixFireGlow = new THREE.PointLight(0xff6600, 3.2, 35, 1.2);
            phoenixFireGlow.position.set(0, 1.5, 0);
            skyPhoenix.add(phoenixFireGlow);
            const auraGeo = new THREE.SphereGeometry(1.6, 16, 16);
            const auraMat = new THREE.MeshBasicMaterial({
              color: 0xffaa22,
              transparent: true,
              opacity: 0.38,
              blending: THREE.AdditiveBlending,
            });
            skyPhoenix.add(new THREE.Mesh(auraGeo, auraMat));
            if (gltf.animations.length > 0) {
              phoenixMixer = new THREE.AnimationMixer(skyPhoenix);
              const flightClip =
                gltf.animations.find((clip) => /fly|flap|wing/i.test(clip.name)) ??
                gltf.animations[0];
              phoenixMixer.clipAction(flightClip).play();
            }
            scene.add(skyPhoenix);
          },
          undefined,
          () => {
            /* optional landmark — world remains playable if unavailable */
          },
        );

        // Himmel Monument Statue on Sanctuary Island Dais
        const loadHimmelStatue = (url: string) => {
          new GLTFLoader().load(
            url,
            (gltf) => {
              if (disposed) return;
              himmelStatueObj = gltf.scene;
              const bounds = new THREE.Box3().setFromObject(himmelStatueObj);
              const size = bounds.getSize(new THREE.Vector3());
              const largestAxis = Math.max(size.x, size.y, size.z) || 1;
              // Grand, noble proportions (~6 blocks high)
              himmelStatueObj.scale.setScalar(6.5 / largestAxis);
              // Position on the raised dais of distant Sanctuary Island
              himmelStatueObj.position.set(-72, 15.15, 54);
              himmelStatueObj.rotation.y = Math.PI * 0.28;
              himmelStatueObj.traverse((node) => {
                const mesh = node as THREE.Mesh;
                if (!mesh.isMesh) return;
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                mesh.frustumCulled = false;
              });
              scene.add(himmelStatueObj);

              // Radiant celestial starlight lighting above Himmel Statue
              const himmelLight = new THREE.PointLight(0xfff2dc, 4.0, 32, 1.2);
              himmelLight.position.set(-42, 15, 26);
              scene.add(himmelLight);
            },
            undefined,
            () => {
              if (url !== himmelStatueRemoteUrl) {
                loadHimmelStatue(himmelStatueRemoteUrl);
              }
            },
          );
        };
        loadHimmelStatue(himmelStatueUrl);
        // Optional action asset: it never gates New Horizon startup.
        new GLTFLoader().load(
          magicCubeUrl,
          (gltf) => {
            if (disposed) return;
            magicCubeTemplate = gltf.scene;
            magicCubeTemplate.traverse((node) => {
              const mesh = node as THREE.Mesh;
              if (!mesh.isMesh) return;
              mesh.castShadow = false;
              mesh.receiveShadow = false;
              mesh.frustumCulled = true;
            });
          },
          undefined,
          () => {
            /* action asset is optional; the world stays playable */
          },
        );
        // ── SKYBLOCK GRAND MINING AREA (Expansive Blockmango Deep Mine) ─────────────────────────
        const grandMineFloor = -186;
        const grandMineCeiling = -160;
        const entranceZ = -34;
        const mineHalfW = 28;
        const mineMaxZ = 40;
        const put = (x: number, y: number, z: number, type: number) => {
          if (!blocks.has(key(x, y, z))) addBlock(x, y, z, type);
        };

        // Bounded cavern shell (Solid Enclosure with rock texturing)
        for (let x = -mineHalfW; x <= mineHalfW; x++) {
          for (let z = entranceZ; z <= mineMaxZ; z++) {
            // Textured bedrock base floor
            const floorType =
              (x + z) % 11 === 0 ? 28 : (x * z) % 7 === 0 ? 15 : (x + z) % 13 === 0 ? 27 : 2;
            put(x, grandMineFloor, z, floorType);
            put(x, grandMineCeiling, z, (x + z) % 5 === 0 ? 15 : 2);
            // Stalactites hanging from ceiling
            if (Math.abs(Math.sin(x * 3.7 + z * 5.1)) > 0.84 && Math.abs(x) > 2) {
              put(x, grandMineCeiling - 1, z, 2);
              if (Math.abs(Math.sin(x * 9.1 + z * 2.3)) > 0.88) put(x, grandMineCeiling - 2, z, 15);
              if (Math.abs(Math.sin(x * 4.3 + z * 7.1)) > 0.94) put(x, grandMineCeiling - 3, z, 47); // glowing amethyst tips
            }
          }
        }
        for (let y = grandMineFloor + 1; y < grandMineCeiling; y++) {
          for (let z = entranceZ; z <= mineMaxZ; z++) {
            put(-mineHalfW, y, z, y % 4 === 0 ? 11 : y % 6 === 0 ? 28 : 2);
            put(mineHalfW, y, z, y % 5 === 0 ? 15 : y % 7 === 0 ? 27 : 2);
            // Embedded rich ore veins in the cavern walls
            if (y >= grandMineFloor + 2 && y <= grandMineFloor + 12) {
              if (z % 7 === 0) put(-mineHalfW + 1, y, z, 32); // iron block
              if (z % 9 === 0) put(mineHalfW - 1, y, z, 30); // gold block
              if (z % 11 === 0) put(-mineHalfW + 1, y, z, 50); // redstone
              if (z % 13 === 0) put(mineHalfW - 1, y, z, 31); // diamond block
              if (z % 15 === 0) put(-mineHalfW + 1, y, z, 33); // emerald block
              if (z % 17 === 0) put(mineHalfW - 1, y, z, 34); // lapis block
              if (z % 8 === 0) put(-mineHalfW + 1, y, z, 47); // amethyst
            }
          }
          for (let x = -mineHalfW; x <= mineHalfW; x++) {
            put(x, y, mineMaxZ, y % 4 === 0 ? 13 : y % 7 === 0 ? 11 : 2);
            put(x, y, entranceZ, y % 5 === 0 ? 15 : 2);
          }
        }

        // ── ZONE 1: MASSIVE SAND & DESERT QUARRY SECTOR (East Side: X: 4 to 26, Z: -28 to 36) ──
        for (let x = 4; x <= 26; x++) {
          for (let z = -28; z <= 36; z++) {
            // Rolling undulating sand dunes
            const duneH = Math.max(
              0,
              Math.floor(Math.sin((x - 4) * 0.35) * 2.2 + Math.cos(z * 0.28) * 1.8 + 1.2),
            );
            for (let dy = 1; dy <= duneH; dy++) {
              const y = grandMineFloor + dy;
              // Layered sand, red sand, and terracotta strata
              const sandBlock = dy === duneH ? (x % 5 === 0 ? 38 : 4) : dy === 1 ? 37 : 4;
              put(x, y, z, sandBlock);
            }
            // Rich gold and lapis ore veins scattered inside the sand quarry
            const quarryVein = Math.abs(Math.sin(x * 3.14 + z * 5.23)) % 1;
            if (quarryVein > 0.82 && duneH >= 1) {
              const oreType = quarryVein > 0.92 ? 30 : quarryVein > 0.87 ? 34 : 49;
              put(x, grandMineFloor + duneH, z, oreType);
              if (quarryVein > 0.95) put(x, grandMineFloor + duneH + 1, z, oreType);
            }
          }
        }

        // ── ZONE 2: DEEP MINERAL RAVINE & CRYSTAL PITS (West Side: X: -26 to -4, Z: -28 to 36) ──
        for (let x = -26; x <= -4; x++) {
          for (let z = -28; z <= 36; z++) {
            const rockH = Math.max(
              0,
              Math.floor(Math.sin((-x - 4) * 0.32) * 1.8 + Math.sin(z * 0.22) * 1.6),
            );
            for (let dy = 1; dy <= rockH; dy++) {
              const y = grandMineFloor + dy;
              const rockType = (x + z) % 7 === 0 ? 28 : (x * z) % 5 === 0 ? 15 : 2;
              put(x, y, z, rockType);
            }
            // Dense diamond, emerald, redstone, and iron deposits
            const gemVein = Math.abs(Math.sin(x * 7.89 + z * 11.45)) % 1;
            if (gemVein > 0.78) {
              const oreType = gemVein > 0.93 ? 31 : gemVein > 0.88 ? 33 : gemVein > 0.83 ? 50 : 32;
              put(x, grandMineFloor + rockH + 1, z, oreType);
              if (gemVein > 0.9) put(x, grandMineFloor + rockH + 2, z, oreType);
            }
          }
        }

        // ── ZONE 3: CENTRAL MINE CART RAILWAY & TIMBER SUPPORT ARCHWAYS ──
        for (let z = entranceZ; z <= mineMaxZ - 2; z++) {
          put(0, grandMineFloor, z, 16); // Smooth stone path
          put(-1, grandMineFloor, z, 15); // Cobblestone border left
          put(1, grandMineFloor, z, 15); // Cobblestone border right
          put(-2, grandMineFloor, z, 22); // Wooden rail plank border
          put(2, grandMineFloor, z, 22);
        }

        // Heavy Timber Mine Support Archways at regular intervals across the entire mine
        const timberZList = [-28, -20, -12, -4, 4, 12, 20, 28, 36];
        for (const tz of timberZList) {
          const archHalfW = 8;
          for (let y = grandMineFloor + 1; y <= grandMineFloor + 8; y++) {
            put(-archHalfW, y, tz, 24); // Spruce log pillar left
            put(archHalfW, y, tz, 24); // Spruce log pillar right
          }
          for (let x = -archHalfW; x <= archHalfW; x++) {
            put(x, grandMineFloor + 8, tz, 24); // Spruce crossbeam top
            put(x, grandMineFloor + 9, tz, 22); // Planks trim
          }
          // Suspended glowstone lanterns in center of each arch
          put(0, grandMineFloor + 7, tz, 46); // Glowstone lantern
          put(-archHalfW + 1, grandMineFloor + 5, tz, 14); // Glow block on pillars
          put(archHalfW - 1, grandMineFloor + 5, tz, 14);
        }

        // Entrance Portal archway
        for (let x = -4; x <= 4; x++) {
          for (let y = grandMineFloor + 1; y <= grandMineFloor + 7; y++) {
            removeBlock(x, y, entranceZ);
            removeBlock(x, y, entranceZ + 1);
          }
        }
        for (let y = grandMineFloor + 1; y <= grandMineFloor + 8; y++) {
          put(-5, y, entranceZ, 11); // Stone bricks
          put(5, y, entranceZ, 11);
        }
        for (let x = -5; x <= 5; x++) {
          put(x, grandMineFloor + 8, entranceZ, 11);
        }
        // Glowing portal pillars
        put(-5, grandMineFloor + 9, entranceZ, 46);
        put(5, grandMineFloor + 9, entranceZ, 46);

        // Cavern lighting - warm atmospheric mining lamps & ore glows
        for (const [x, y, z, intensity, distance, color] of [
          [0, grandMineFloor + 6, entranceZ + 5, 2.8, 30, 0xffb86c],
          [0, grandMineFloor + 6, -12, 2.6, 28, 0xffb86c],
          [0, grandMineFloor + 6, 4, 2.6, 28, 0xffb86c],
          [0, grandMineFloor + 6, 20, 2.6, 28, 0xffb86c],
          [0, grandMineFloor + 6, 36, 2.8, 30, 0xffb86c],
          // Sand quarry warm golden glows
          [14, grandMineFloor + 5, -16, 2.2, 26, 0xf5c400],
          [16, grandMineFloor + 5, 8, 2.4, 26, 0xf5c400],
          [15, grandMineFloor + 5, 26, 2.2, 26, 0xf5c400],
          // Deep mineral crystal glows
          [-15, grandMineFloor + 5, -16, 2.2, 26, 0x5be6e0], // diamond cyan
          [-16, grandMineFloor + 5, 8, 2.4, 26, 0x17dd62], // emerald green
          [-14, grandMineFloor + 5, 26, 2.2, 26, 0xb48ead], // amethyst purple
        ] as [number, number, number, number, number, number][]) {
          const lamp = new THREE.PointLight(color, intensity, distance, 1.6);
          lamp.position.set(x, y, z);
          scene.add(lamp);
        }

        sbSceneRef.current = {
          teleportHome: () => {
            playerPos.set(2, 2, 2);
            playerVel.set(0, 0, 0);
            if (cosmicSkyboxTex) {
              scene.background = cosmicSkyboxTex;
              scene.environment = cosmicSkyboxTex;
              if (skyMesh) skyMesh.visible = false;
            } else {
              if (skyMesh) skyMesh.visible = true;
              scene.background = null;
            }
            renderer.setClearColor(new THREE.Color(skyBg), 1);
            scene.fog = new THREE.FogExp2(0x130b24, 0.002);
          },
          teleportShop: () => {
            playerPos.set(2, 2, 2);
            playerVel.set(0, 0, 0);
          },
          teleportMining: () => {
            // Spawn inside the expanded Grand Mining Area entrance tunnel
            playerPos.set(0, grandMineFloor + 1, entranceZ + 6);
            playerVel.set(0, 0, 0);
            if (skyMesh) skyMesh.visible = false;
            scene.background = new THREE.Color(0x0a0710);
            renderer.setClearColor(new THREE.Color(0x0a0710), 1);
            scene.fog = new THREE.FogExp2(0x181224, 0.01);
          },
        };
        runOcclusionPass();
        try {
          getOrCreateIsland(
            currentSkyblockIslandId,
            qbUser?.displayName || qbUser?.username || "Player",
          )
            .then((island) => {
              if (island.ownerName && visitingUserId) {
                setVisitingHostName(island.ownerName);
              }
              const deltas = island.deltaBlocks || {};
              for (const [posKey, bType] of Object.entries(deltas)) {
                const [bx, by, bz] = posKey.split(",").map(Number);
                if (!isNaN(bx) && !isNaN(by) && !isNaN(bz)) {
                  if (bType === -1) {
                    removeBlock(bx, by, bz);
                  } else if (bType >= 0) {
                    addBlock(bx, by, bz, bType);
                  }
                }
              }
              runOcclusionPass();
            })
            .catch((err) => {
              console.warn("Could not load custom island blocks:", err);
            });
        } catch (e) {
          console.warn("Error initiating island block load:", e);
        }
      } else if (isSkyWars) {
        // ── SkyWars: 8 floating islands around a central diamond island ───────────
        // Each island has its own resources, tree, and chest. Players start on
        // their own island and fight to survive — last player standing wins.
        engineSpawnY = 30;
        const SW_ISLAND_COUNT = 8;
        const SW_RADIUS = 42;
        for (let i = 0; i < SW_ISLAND_COUNT; i++) {
          const angle = (i / SW_ISLAND_COUNT) * Math.PI * 2;
          const icx = Math.round(Math.cos(angle) * SW_RADIUS);
          const icz = Math.round(Math.sin(angle) * SW_RADIUS);
          const iy = 26 + (i % 3) * 2; // slight height variation for terrain feel

          // Island platform (oval, tapers downward)
          const swIslandLayers: Array<{ dy: number; r: number; bt: number }> = [
            { dy: 0, r: 5.2, bt: 0 }, // grass surface
            { dy: -1, r: 4.6, bt: 1 }, // dirt
            { dy: -2, r: 3.8, bt: 1 }, // dirt
            { dy: -3, r: 2.8, bt: 2 }, // stone
            { dy: -4, r: 1.5, bt: 2 }, // stone
            { dy: -5, r: 0.6, bt: 2 }, // stone tip
          ];
          for (const { dy, r, bt } of swIslandLayers) {
            for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) {
              for (let dz = -Math.ceil(r); dz <= Math.ceil(r); dz++) {
                if (Math.sqrt(dx * dx + dz * dz) <= r) addBlock(icx + dx, iy + dy, icz + dz, bt);
              }
            }
          }
          // Small oak tree
          for (let ty = 1; ty <= 4; ty++) addBlock(icx, iy + ty, icz, 3); // log trunk
          for (let lx = -2; lx <= 2; lx++) {
            for (let lz = -2; lz <= 2; lz++) {
              for (let ly = 3; ly <= 5; ly++) {
                if (Math.sqrt(lx * lx + lz * lz) <= 2.4) addBlock(icx + lx, iy + ly, icz + lz, 5); // leaves
              }
            }
          }
          // Chest on each island
          addBlock(icx + 2, iy + 1, icz, 22);
          // Glowstone torch marker
          addBlock(icx - 3, iy + 1, icz - 3, 46);
        }

        // ── Central diamond island (mid-game loot spot) ──────────────────────────
        const SW_CTR_R = 7;
        const SW_CTR_Y = 28;
        for (let dx = -SW_CTR_R; dx <= SW_CTR_R; dx++) {
          for (let dz = -SW_CTR_R; dz <= SW_CTR_R; dz++) {
            const r = Math.sqrt(dx * dx + dz * dz);
            if (r <= SW_CTR_R) {
              addBlock(dx, SW_CTR_Y, dz, 12); // diorite surface
              addBlock(dx, SW_CTR_Y - 1, dz, 2); // stone base
            }
          }
        }
        // Central treasure chest
        addBlock(0, SW_CTR_Y + 1, 0, 22);
        addBlock(1, SW_CTR_Y + 1, 0, 22);
        // Center obelisk
        for (let cy = 1; cy <= 6; cy++) addBlock(0, SW_CTR_Y + cy, 0, 11); // stone brick spire
        addBlock(0, SW_CTR_Y + 7, 0, 46); // glowstone top

        // Floating mini-rocks between islands
        for (let f = 0; f < 12; f++) {
          const fa = (f / 12) * Math.PI * 2 + 0.3;
          const fr = 16 + (f % 4) * 4;
          const fx = Math.round(Math.cos(fa) * fr);
          const fz = Math.round(Math.sin(fa) * fr);
          const fy = 24 + (f % 3) * 3;
          const frk = new THREE.Mesh(
            new THREE.IcosahedronGeometry(1.2 + (f % 3) * 0.5, 0),
            new THREE.MeshLambertMaterial({ color: 0x7a8c70 }),
          );
          frk.position.set(fx, fy, fz);
          frk.rotation.set(Math.random(), Math.random(), Math.random());
          scene.add(frk);
        }
        runOcclusionPass();
      } else if (isBaseplate) {
        // ── [Build] BASEPLATE: a single flat plate, nothing else ───────────────
        // Deliberately minimal: one 64x64 slab of smooth stone at y=0 so players
        // land on open, empty ground and build whatever they want on top.
        const BP_HALF = 32;
        for (let x = -BP_HALF; x <= BP_HALF; x++) {
          for (let z = -BP_HALF; z <= BP_HALF; z++) {
            addBlock(x, 0, z, 2); // stone plate
          }
        }
        // The player/spawn vectors are created after this world pass, so only
        // set the spawn height here and let them initialise from it.
        engineSpawnY = 3;

        runOcclusionPass();
        rebuildRaycastTargets();
      } else if (isBlockyplaza) {
        // ── BLOCKY PLAZA: bounded spawn region of the hub map ───────────────────
        // The source export has ~207k blocks. Loading that entire export still
        // exhausts memory after the async batches finish, and the full occlusion
        // pass then blocks the first frame. The client starts with the 36-block
        // spawn region (about 15k blocks) so the hub is playable immediately
        // without making the full export a runtime dependency.
        // mapLoaded was set to false above; we flip it true (and fire onMapLoaded)
        // only after the last chunk + runOcclusionPass() have both finished.
        const BP_CHUNK = 2500;
        let _bpIdx = 0;
        const blockyplazaSpawnMap: Array<[number, number, number, number]> = [];
        // Keep the 6.8 MB export out of the initial route bundle. The compact
        // playable region is copied into tuples and the module reference can be
        // released after this pass, avoiding a second object-heavy filtered array.
        void import("@/assets/blockyplaza-map.json")
          .then(({ default: source }) => {
            const sourceBlocks = source as { x: number; y: number; z: number; type: number }[];
            for (const block of sourceBlocks) {
              const dx = block.x - BLOCKYPLAZA_OFFSET;
              const dz = block.z - BLOCKYPLAZA_OFFSET;
              if (dx * dx + dz * dz <= BLOCKYPLAZA_LOAD_RADIUS * BLOCKYPLAZA_LOAD_RADIUS) {
                blockyplazaSpawnMap.push([dx, block.y, dz, block.type]);
              }
            }
            function loadBpChunk() {
              if (disposed) return; // guard: user navigated away mid-load
              const end = Math.min(_bpIdx + BP_CHUNK, blockyplazaSpawnMap.length);
              for (; _bpIdx < end; _bpIdx++) {
                const [x, y, z, type] = blockyplazaSpawnMap[_bpIdx];
                addBlock(x, y, z, type);
              }
              if (_bpIdx < blockyplazaSpawnMap.length) {
                setTimeout(loadBpChunk, 0);
              } else {
                // All blocks added — find spawn point, cull occluded faces, go live
                let spawnTopY = 0;
                for (const [x, y, z] of blockyplazaSpawnMap) {
                  if (Math.abs(x) <= 4 && Math.abs(z) <= 4 && y > spawnTopY) spawnTopY = y;
                }
                engineSpawnY = spawnTopY + 9;
                // The map loads after the player object is created; move the live
                // player and respawn point once the real ground height is known.
                spawnPoint.set(0, engineSpawnY, 0);
                playerPos.copy(spawnPoint);
                playerVel.set(0, 0, 0);
                runOcclusionPass();
                mapLoaded = true;
                onMapLoaded?.();
              }
            }
            setTimeout(loadBpChunk, 0);
          })
          .catch(() => {
            // A missing optional hub export should not crash the game route. Give
            // the player a clear, empty playable spawn instead.
            engineSpawnY = 12;
            spawnPoint.set(0, engineSpawnY, 0);
            playerPos.copy(spawnPoint);
            playerVel.set(0, 0, 0);
            mapLoaded = true;
            onMapLoaded?.();
          });
      } else if (isEggwars) {
        // EggWars builds its four-island arena in eggBuildMatch above. Keep this
        // branch explicit so the generic survival terrain never overwrites it.
        runOcclusionPass();
        rebuildRaycastTargets();
      } else if (!isBedwars) {
        // ── Engine Test: biome-based procedural terrain ───────────────────────
        // Height noise — 4 octaves for varied mountains, hills, and valleys
        function noise(x: number, z: number) {
          const c =
            Math.sin(x * 0.055) * 5.0 +
            Math.cos(z * 0.06) * 4.5 +
            Math.sin((x + z) * 0.038) * 3.5 +
            Math.cos((x - z) * 0.044) * 2.0;
          const m = Math.sin(x * 0.14 + z * 0.11) * 1.8 + Math.cos(x * 0.12 - z * 0.16) * 1.4;
          const f = Math.sin(x * 0.32 + z * 0.28) * 0.55 + Math.cos(x * 0.27 - z * 0.35) * 0.4;
          const ff = Math.sin(x * 0.65 + z * 0.54) * 0.18;
          return c + m + f + ff;
        }
        // Biome noise — large-scale temperature + humidity values
        function bioTemp(x: number, z: number) {
          return Math.sin(x * 0.018 + 1.3) * Math.cos(z * 0.014 + 0.8) * 0.5 + 0.5;
        }
        function bioHumid(x: number, z: number) {
          return Math.sin(x * 0.011 + z * 0.016 + 2.1) * 0.5 + 0.5;
        }
        // Returns biome index:
        //   0=plains  1=forest  2=birch_forest  3=spruce_forest
        //   4=desert  5=savanna  6=mountains  7=swamp  8=jungle
        function getBiome(x: number, z: number): number {
          const t = bioTemp(x, z); // 0=cold, 1=hot
          const h = bioHumid(x, z); // 0=dry,  1=wet
          const rawH = noise(x, z);
          if (rawH > 8) return 6; // mountains — driven by height, any climate
          if (t < 0.22) return 3; // cold + any humidity → spruce forest
          if (t > 0.78) return 4; // hot + dry → desert
          if (t > 0.68 && h < 0.4) return 5; // warm + dry → savanna
          if (h > 0.72) return 8; // warm + very wet → jungle
          if (h > 0.55) return 7; // warm + damp → swamp/dark-oak
          if (h > 0.4) return 1; // temperate + moderate → oak forest
          if (t < 0.45) return 2; // cool + less humid → birch forest
          return 0; // plains
        }

        const WATER_LEVEL = 0;
        const BEDROCK_Y = -14; // underground limit

        // Per-biome surface block, subsurface block, and height modifier
        function biomeBlocks(
          biome: number,
          h: number,
        ): { surf: number; sub: number; heightMult: number } {
          switch (biome) {
            case 4:
              return { surf: 4, sub: 4, heightMult: 0.55 }; // desert: sand all the way down
            case 5:
              return { surf: 0, sub: 9, heightMult: 0.7 }; // savanna: grass / coarse dirt
            case 6:
              return { surf: h > 10 ? 16 : 2, sub: 2, heightMult: 1.6 }; // mountains: stone, snow cap
            case 3:
              return { surf: 0, sub: 1, heightMult: 1.05 }; // spruce: grass / dirt
            case 7:
              return { surf: 9, sub: 9, heightMult: 0.75 }; // swamp: coarse dirt surface
            case 8:
              return { surf: 0, sub: 1, heightMult: 0.9 }; // jungle: grass / dirt
            default:
              return { surf: 0, sub: 1, heightMult: 1.0 }; // everything else: grass / dirt
          }
        }

        // Smoothed height multiplier — sampling just the local biome's
        // heightMult made terrain jump abruptly at biome borders (e.g.
        // desert 0.55 next to mountains 1.60 reads as a literal cliff at the
        // seam). Blending it with a small ring of nearby samples spreads that
        // jump over ~10-12 blocks so biomes still feel distinct in surface
        // material but the ground itself rolls smoothly between them.
        function blendedHeightMult(x: number, z: number) {
          const samples: Array<[number, number, number]> = [
            [0, 0, 1.6],
            [5, 0, 1],
            [-5, 0, 1],
            [0, 5, 1],
            [0, -5, 1],
            [4, 4, 0.7],
            [-4, 4, 0.7],
            [4, -4, 0.7],
            [-4, -4, 0.7],
          ];
          let sum = 0,
            wsum = 0;
          for (const [dx, dz, w] of samples) {
            const b = getBiome(x + dx, z + dz);
            sum += biomeBlocks(b, 0).heightMult * w;
            wsum += w;
          }
          return sum / wsum;
        }

        // Returns the canonical integer terrain height at (x, z).
        // Mountains get 3-block step quantization �� dramatic vertical cliff
        // faces instead of diagonal slopes. Every height consumer (terrain
        // gen, ore scatter, tree placer, spawn hub) must use this function
        // so all layers stay in sync.
        function getTerrainH(x: number, z: number): number {
          const raw = noise(x, z) * blendedHeightMult(x, z);
          const biome = getBiome(x, z);
          // Mountains: quantise to 3-block steps for blocky Minecraft cliffs.
          // Desert: half-step keeps dunes gently rounded.
          // Everything else: normal 1-block rounding.
          if (biome === 6) return Math.round(raw / 3) * 3;
          return Math.round(raw);
        }

        for (let x = -SIZE; x < SIZE; x++) {
          for (let z = -SIZE; z < SIZE; z++) {
            const biome = getBiome(x, z);
            const { surf, sub } = biomeBlocks(biome, 0);
            const h = getTerrainH(x, z);

            if (h < WATER_LEVEL) {
              // Underwater: sand/gravel bed, water fill
              for (let y = Math.max(BEDROCK_Y, h - 3); y <= h; y++) addBlock(x, y, z, 4);
              for (let y = h + 1; y <= WATER_LEVEL; y++) addBlock(x, y, z, 6);
            } else {
              // Bedrock layer
              addBlock(x, BEDROCK_Y, z, 2);
              // Deep stone
              for (let y = BEDROCK_Y + 1; y < h - 3; y++) addBlock(x, y, z, 2);
              // Subsurface (dirt/sand)
              for (let y = Math.max(BEDROCK_Y + 1, h - 3); y < h; y++) addBlock(x, y, z, sub);
              // Surface block
              addBlock(x, h, z, surf);
            }
          }
        }

        // ── Ore scatter pass (separate loop — ores go inside stone only) ──────
        // Uses a simple spatial hash so ores are in plausible positions
        for (let x = -SIZE; x < SIZE; x++) {
          for (let z = -SIZE; z < SIZE; z++) {
            const h = getTerrainH(x, z);
            if (h <= WATER_LEVEL) continue;
            // Scatter ores through the stone column
            for (let y = BEDROCK_Y + 1; y < h - 3; y++) {
              const r = Math.random();
              const depth = h - y;
              if (depth >= 3 && depth <= 14 && r < 0.055)
                addBlock(x, y, z, 49); // coal
              else if (depth >= 5 && depth <= 20 && r < 0.038)
                addBlock(x, y, z, 32); // iron
              else if (depth >= 12 && depth <= 28 && r < 0.016)
                addBlock(x, y, z, 30); // gold
              else if (depth >= 18 && depth <= 30 && r < 0.008)
                addBlock(x, y, z, 31); // diamond
              else if (depth >= 10 && depth <= 26 && r < 0.028)
                addBlock(x, y, z, 50); // redstone
              else if (depth >= 20 && depth <= 32 && r < 0.005)
                addBlock(x, y, z, 33); // emerald
              else if (depth >= 8 && depth <= 22 && r < 0.015)
                addBlock(x, y, z, 34); // lapis
              else if (r < 0.035)
                addBlock(x, y, z, 27); // granite blob
              else if (r < 0.06) addBlock(x, y, z, 28); // andesite blob
            }
          }
        }

        // ── Tree placer ───────────────────────────────────────────────────────
        // woodType=log block, leafType=leaf block, trunkMin=shortest trunk height
        function placeTree(
          cx: number,
          cz: number,
          woodType: number,
          leafType: number,
          trunkMin = 4,
          canopyRadii: number[] = [3, 3, 3, 2, 2, 1, 0],
        ) {
          const h = getTerrainH(cx, cz);
          if (h < WATER_LEVEL) return;
          if (!blocks.has(key(cx, h, cz))) return;
          const base = h + 1;
          const variant = Math.abs(cx * 7 + cz * 13) % 3;
          const trunkH = trunkMin + variant;
          for (let y = 0; y < trunkH; y++) addBlock(cx, base + y, cz, woodType);
          const canopyBase = base + trunkH - 1;
          const dropProbs = [0.3, 0.1, 0.08, 0.06, 0.1, 0.04, 0.0];
          canopyRadii.forEach((r, di) => {
            const drop = dropProbs[di] ?? 0;
            for (let dx = -r; dx <= r; dx++) {
              for (let dz = -r; dz <= r; dz++) {
                const dist = Math.sqrt(dx * dx + dz * dz);
                if (dist > r + 0.6) continue;
                if (di <= 1 && dx === 0 && dz === 0) continue;
                if (Math.random() < drop) continue;
                if (dist > r - 0.4 && Math.random() < 0.38) continue;
                addBlock(cx + dx, canopyBase + di - 1, cz + dz, leafType);
              }
            }
          });
        }

        // ── Biome-aware tree placement ────────────────────────────────────────
        // Dense forest core + scattered outliers = varied density across biomes
        const treeCount = 320; // more trees for bigger world
        for (let i = 0; i < treeCount; i++) {
          const tx = ((Math.random() * SIZE * 2) | 0) - SIZE;
          const tz = ((Math.random() * SIZE * 2) | 0) - SIZE;
          const biome = getBiome(tx, tz);
          switch (biome) {
            case 0: // plains: sparse oak
              if (Math.random() < 0.25) placeTree(tx, tz, 3, 5);
              break;
            case 1: // oak forest: dense oak
              placeTree(tx, tz, 3, 5);
              break;
            case 2: // birch forest: dense birch
              placeTree(tx, tz, 23, 200, 4, [2, 3, 3, 2, 1, 0]);
              break;
            case 3: // spruce forest: tall pointed spruce
              placeTree(tx, tz, 24, 201, 5, [1, 2, 3, 2, 2, 1, 0]);
              break;
            case 4:
              break; // desert: no trees
            case 5: // savanna: scattered acacia (short, wide)
              if (Math.random() < 0.55) placeTree(tx, tz, 25, 202, 3, [3, 3, 2, 1]);
              break;
            case 6: // mountains: sparse spruce
              if (Math.random() < 0.3) placeTree(tx, tz, 24, 201, 6, [1, 2, 2, 1, 0]);
              break;
            case 7: // swamp: dark oak (wide, low)
              placeTree(tx, tz, 18, 5, 3, [3, 3, 2, 1]);
              break;
            case 8: // jungle: tall jungle trees
              placeTree(tx, tz, 26, 203, 7, [2, 3, 3, 3, 2, 1, 0]);
              break;
          }
        }

        // ── Scattered world features ──────────────────────────────────────────
        // Pumpkin/melon patches near forest biomes
        for (let i = 0; i < 40; i++) {
          const px = ((Math.random() * SIZE * 2) | 0) - SIZE;
          const pz = ((Math.random() * SIZE * 2) | 0) - SIZE;
          const biome = getBiome(px, pz);
          if (biome === 1 || biome === 0) {
            const ph = getTerrainH(px, pz);
            if (ph >= WATER_LEVEL && blocks.has(key(px, ph, pz))) {
              addBlock(px, ph + 1, pz, Math.random() < 0.5 ? 39 : 40); // pumpkin or melon
            }
          }
        }

        // ── Boulder clusters (mountains + forest biomes) ──────────────────────
        // Groups of 3-7 mossy cobblestone rocks add visual interest to hillsides.
        for (let i = 0; i < 55; i++) {
          const bx = ((Math.random() * SIZE * 2) | 0) - SIZE;
          const bz = ((Math.random() * SIZE * 2) | 0) - SIZE;
          const biome = getBiome(bx, bz);
          if (biome !== 6 && biome !== 1 && biome !== 3) continue;
          const bh = getTerrainH(bx, bz);
          if (bh < WATER_LEVEL + 1) continue;
          const clusterSize = 3 + (Math.abs(bx * 7 + bz * 13) % 5);
          for (let c = 0; c < clusterSize; c++) {
            const ox = ((Math.random() * 4) | 0) - 2;
            const oz = ((Math.random() * 4) | 0) - 2;
            const ch = getTerrainH(bx + ox, bz + oz);
            if (ch >= WATER_LEVEL) addBlock(bx + ox, ch + 1, bz + oz, 2); // stone boulder
            if (Math.random() < 0.35) addBlock(bx + ox, ch + 2, bz + oz, 2); // stack tall
          }
        }

        // ── Flower fields (plains + savanna) ─────────────────────────────────
        // Dandelion/rose blocks scattered on surface for colour variety.
        const FLOWER_BLOCKS = [41, 42, 43]; // flower types if defined; fallback to 40 (melon) otherwise
        for (let i = 0; i < 120; i++) {
          const fx = ((Math.random() * SIZE * 2) | 0) - SIZE;
          const fz = ((Math.random() * SIZE * 2) | 0) - SIZE;
          const biome = getBiome(fx, fz);
          if (biome !== 0 && biome !== 5) continue;
          const fh = getTerrainH(fx, fz);
          if (fh < WATER_LEVEL || !blocks.has(key(fx, fh, fz))) continue;
          // Pick flower variant from the palette; wrap to available block IDs
          const flowerType = FLOWER_BLOCKS[Math.abs(fx * 3 + fz * 7) % FLOWER_BLOCKS.length];
          addBlock(fx, fh + 1, fz, flowerType);
        }

        // ── Desert cacti ─────────────────────────────────────────────��──���────
        for (let i = 0; i < 50; i++) {
          const cx2 = ((Math.random() * SIZE * 2) | 0) - SIZE;
          const cz2 = ((Math.random() * SIZE * 2) | 0) - SIZE;
          if (getBiome(cx2, cz2) !== 4) continue;
          const ch = getTerrainH(cx2, cz2);
          if (ch < WATER_LEVEL) continue;
          const cactusH = 2 + (Math.abs(cx2 * 11 + cz2 * 7) % 3);
          for (let cy = 1; cy <= cactusH; cy++) addBlock(cx2, ch + cy, cz2, 4); // sand stack as cactus stand-in
        }

        // ── Jungle vines / undergrowth ────────────────────────────────────────
        for (let i = 0; i < 80; i++) {
          const jx = ((Math.random() * SIZE * 2) | 0) - SIZE;
          const jz = ((Math.random() * SIZE * 2) | 0) - SIZE;
          if (getBiome(jx, jz) !== 8) continue;
          const jh = getTerrainH(jx, jz);
          if (jh < WATER_LEVEL || !blocks.has(key(jx, jh, jz))) continue;
          addBlock(jx, jh + 1, jz, 203); // jungle leaf ground cover
        }
        // Hay bales in plains/savanna
        for (let i = 0; i < 20; i++) {
          const px = ((Math.random() * SIZE * 2) | 0) - SIZE;
          const pz = ((Math.random() * SIZE * 2) | 0) - SIZE;
          const biome = getBiome(px, pz);
          if (biome === 0 || biome === 5) {
            const ph = getTerrainH(px, pz);
            if (ph >= WATER_LEVEL && blocks.has(key(px, ph, pz))) {
              addBlock(px, ph + 1, pz, 48); // hay block
            }
          }
        }

        // Stylized (Minecraft-style) water surface — a tiled, hand-painted
        // blocky texture that just scrolls, instead of a per-pixel
        // multi-wave/caustic shader. That old shader ran ~5 sine/pow terms
        // per fragment over a plane covering the *entire visible world*
        // (always on screen) plus 64×64 segments of vertex wave math every
        // frame — one of the biggest hidden costs in the whole scene. This
        // version is a texture lookup + a single cheap UV-scroll and a tiny
        // one-term vertical bob: same "water is alive" feel, a fraction of
        // the GPU cost, and it reads as a game material instead of realistic
        // water.
        // Cartoon water — smooth gradient with animated wave streaks, visible
        // from both above and below (DoubleSide fixes the invisible underside).
        // ── Engine v5: real-wave water ShaderMaterial ────────────────────────────
        // Subdivided plane (80×80 quads) so the vertex shader displaces geometry
        // into visible rolling waves.  Fragment: caustic ripples + Fresnel shimmer
        // + sparkle highlights — no canvas texture, fully GPU-driven.
        const v5WaterMat = new THREE.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
          uniforms: {
            uTime: { value: 0 },
            uCamPos: { value: new THREE.Vector3() },
          },
          vertexShader: `
          uniform float uTime;
          varying vec2  vUv;
          varying vec3  vWorldPos;
          varying float vWave;
          void main(){
            vUv = uv;
            vec3 p = position;
            float w1 = sin(p.x*0.90 + uTime*1.30)*0.13;
            float w2 = sin(p.z*0.70 + uTime*1.00)*0.11;
            float w3 = sin((p.x*0.50 - p.z*0.40) + uTime*1.70)*0.07;
            float w4 = cos(p.x*0.30 + p.z*0.60  + uTime*0.80)*0.05;
            p.y += w1+w2+w3+w4;
            vWave     = (w1+w2+w3+w4+0.36)*1.35;
            vWorldPos = (modelMatrix * vec4(p,1.0)).xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.0);
          }`,
          fragmentShader: `
          uniform float uTime;
          uniform vec3  uCamPos;
          varying vec2  vUv;
          varying vec3  vWorldPos;
          varying float vWave;
          void main(){
            vec3 deep    = vec3(0.02,0.16,0.44);
            vec3 shallow = vec3(0.08,0.52,0.78);
            vec3 sky     = vec3(0.60,0.82,0.98);
            float cx = vUv.x*20.0, cz = vUv.y*16.0;
            // Caustic ripple: two angled layers for a cross-hatch shimmer
            float r1 = sin(cx*1.1 + uTime*2.2)*sin(cz*0.9 - uTime*1.8)*0.5+0.5;
            float r2 = sin(cx*0.65 - uTime*1.5)*sin(cz*1.1 + uTime*2.5)*0.5+0.5;
            float r3 = sin((cx+cz)*0.55 + uTime*1.1)*0.5+0.5;
            float caustic = pow(r1*r2*r3, 1.6)*0.14;
            vec3 viewDir = normalize(uCamPos - vWorldPos);
            float vDotN  = max(0.0,dot(viewDir,vec3(0.0,1.0,0.0)));
            // Schlick Fresnel — stronger glancing reflection
            float fresnel= pow(1.0-vDotN, 3.2);
            vec3 col = mix(deep, shallow, clamp(vWave*1.2+caustic, 0.0, 1.0));
            // Sky reflection tint at grazing angle
            col = mix(col, sky, fresnel*0.55);
            // Foam at wave crests — white where vWave is near 1
            float foam = smoothstep(0.62, 0.82, vWave) * (0.5 + sin(cx*3.4+uTime*6.0)*0.25+0.5)*0.5;
            col = mix(col, vec3(0.96,0.98,1.0), foam);
            // Sparkle highlights
            float sp = pow(max(0.0,sin(cx*1.9+uTime*5.2)*sin(cz*1.6-uTime*4.5)),9.0)*1.1;
            col += vec3(sp*0.8,sp*0.9,sp);
            gl_FragColor = vec4(col, 0.68+fresnel*0.22);
          }`,
        });
        const waterSurface = new THREE.Mesh(
          new THREE.PlaneGeometry(SIZE * 2, SIZE * 2, 80, 80),
          v5WaterMat,
        );
        waterSurface.rotation.x = -Math.PI / 2;
        waterSurface.position.y = WATER_LEVEL + 0.48;
        waterSurface.renderOrder = 1;
        scene.add(waterSurface);
        waterMatRef = v5WaterMat;

        // ── Spawn hub ────────────────────────────────────────────────────────
        // A floating landmark platform above the natural terrain at (0,0),
        // like the lit spawn islands in Blockman GO-style lobbies: always
        // clear of trees/hills, always flat, and visible from a distance so
        // players can find their way back. Floats a few blocks above whatever
        // the noise function put at the origin, with a glowing beacon beam
        // shooting straight up as a landmark.
        const SPAWN_R = 5;
        const groundH = getTerrainH(0, 0);
        const padY = Math.max(groundH, WATER_LEVEL) + 4;

        // Clear headroom + anything (trees, hills) poking through the pad.
        for (let dx = -SPAWN_R - 1; dx <= SPAWN_R + 1; dx++) {
          for (let dz = -SPAWN_R - 1; dz <= SPAWN_R + 1; dz++) {
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist > SPAWN_R + 1) continue;
            for (let y = padY - 2; y <= padY + 7; y++) removeBlock(dx, y, dz);
          }
        }

        // Two-block-thick disc: glowing rim, chiseled ring, white-wool core.
        for (let dx = -SPAWN_R; dx <= SPAWN_R; dx++) {
          for (let dz = -SPAWN_R; dz <= SPAWN_R; dz++) {
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist > SPAWN_R) continue;
            const top = dist > SPAWN_R - 0.6 ? 46 : dist > SPAWN_R - 2 ? 54 : 41;
            addBlock(dx, padY, dz, top);
            addBlock(dx, padY - 1, dz, 54);
          }
        }

        // Support pillar grounding the floating pad, offset from dead-center
        // so it never shares a column with the player's spawn point below.
        for (let y = Math.max(groundH + 1, WATER_LEVEL + 1); y < padY - 1; y++) {
          addBlock(3, y, 0, 54);
        }

        // Four corner lanterns for detail up close.
        for (const [lx, lz] of [
          [3, 3],
          [3, -3],
          [-3, 3],
          [-3, -3],
        ] as const) {
          addBlock(lx, padY + 1, lz, 46);
        }

        // Beacon: a glass-cased glowstone column with a tall additive light
        // shaft rising above it, so spawn is visible as a bright pillar from
        // anywhere in the world — a landmark, not just a flat clearing. Kept
        // off dead-center (x=3) so it never occupies the exact column the
        // player spawns into.
        for (let y = padY + 1; y <= padY + 4; y++) addBlock(3, y, 0, y === padY + 2 ? 46 : 7);
        const beaconLight = new THREE.PointLight(0xffee99, 2.2, 26, 2);
        beaconLight.position.set(3, padY + 3, 0);
        scene.add(beaconLight);
        const beamTex = (() => {
          const c = document.createElement("canvas");
          c.width = 8;
          c.height = 64;
          const bctx = c.getContext("2d")!;
          const g = bctx.createLinearGradient(0, 0, 0, 64);
          g.addColorStop(0, "rgba(255,238,180,0.85)");
          g.addColorStop(1, "rgba(255,238,180,0)");
          bctx.fillStyle = g;
          bctx.fillRect(0, 0, 8, 64);
          return new THREE.CanvasTexture(c);
        })();
        const beam = new THREE.Mesh(
          new THREE.CylinderGeometry(0.22, 0.22, 40, 8, 1, true),
          new THREE.MeshBasicMaterial({
            map: beamTex,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
          }),
        );
        beam.position.set(3, padY + 5 + 20, 0);
        scene.add(beam);

        // Player spawns standing on the pad's top surface (feet position is
        // one cell above the top block, matching how every other block-top
        // stand works elsewhere in collides()).
        engineSpawnY = padY + 4;

        // ── Engine v5: spawn a small animal farm near the spawn hub ─────────────
        const farmY = Math.max(groundH, WATER_LEVEL) + 1;
        spawnAnimal("cow", 18, farmY, 8);
        spawnAnimal("cow", 22, farmY, 12);
        spawnAnimal("pig", 8, farmY, 18);
        spawnAnimal("pig", 12, farmY, 14);
        spawnAnimal("sheep", -15, farmY, 8);
        spawnAnimal("sheep", -12, farmY, 14);
        spawnAnimal("chicken", 5, farmY, -14);
        spawnAnimal("chicken", -6, farmY, -16);
        spawnAnimal("chicken", 0, farmY, -18);
      }

      // ---------- 3D voxel clouds ----------
      // "Blocky but smooth": rounded-box blobs (chunky silhouette, soft edges) packed
      // tightly into ONE cohesive puff per cloud, with clouds spaced well apart so
      // they read as individual, distinct clouds rather than one hazy mass.
      const cloudGroup = new THREE.Group();
      scene.add(cloudGroup);
      // Dark dramatic clouds — deep navy underlit, bright tops for atmosphere
      const cloudMat = new THREE.MeshStandardMaterial({
        color: 0x1a2a3e,
        roughness: 1.0,
        metalness: 0.0,
        transparent: true,
        opacity: 0.88,
      });
      const cloudMatSoft = new THREE.MeshStandardMaterial({
        color: 0x0f1e30,
        roughness: 1.0,
        metalness: 0.0,
        transparent: true,
        opacity: 0.72,
      });
      // Sharp-edged BoxGeometry for Minecraft-style blocky cloud silhouettes.
      const cloudGeoBig = new THREE.BoxGeometry(1, 1, 1);
      const cloudGeoSmall = new THREE.BoxGeometry(1, 1, 1);
      function makeCloud(cx: number, cy: number, cz: number, scale = 1) {
        const g = new THREE.Group();
        // Dense core cluster — blobs overlap heavily so the cloud reads as one
        // continuous smoothed shape instead of scattered separate boxes.
        const core = new THREE.Mesh(cloudGeoBig, cloudMat);
        core.scale.set(3.2 * scale, 1.35 * scale, 2.6 * scale);
        g.add(core);
        const blobs = 4 + ((Math.random() * 3) | 0);
        for (let i = 0; i < blobs; i++) {
          const m = new THREE.Mesh(
            i % 2 === 0 ? cloudGeoBig : cloudGeoSmall,
            i === 0 ? cloudMat : cloudMatSoft,
          );
          const sx = (1.5 + Math.random() * 1.7) * scale;
          const sy = (0.9 + Math.random() * 0.55) * scale;
          const sz = (1.5 + Math.random() * 1.7) * scale;
          m.scale.set(sx, sy, sz);
          // Tight offsets keep every blob touching/overlapping the core so the
          // whole group fuses into a single smooth cloud silhouette.
          m.position.set(
            (Math.random() - 0.5) * 2.6 * scale,
            (Math.random() - 0.5) * 0.5 * scale,
            (Math.random() - 0.5) * 2.6 * scale,
          );
          g.add(m);
        }
        g.position.set(cx, cy, cz);
        cloudGroup.add(g);
        return g;
      }
      const cloudList: THREE.Group[] = [];
      // Wider, sparser distribution so each cloud floats on its own instead of
      // clumping into a solid ceiling. 3D clouds disabled for Skyblock.
      const CLOUD_COUNT = isSkyblock ? 0 : isMobileUA ? 5 : 8;
      const CLOUD_MIN_GAP = 34;
      const cloudSpots: Array<{ x: number; z: number }> = [];
      for (let i = 0; i < CLOUD_COUNT; i++) {
        let cx = 0,
          cz = 0,
          tries = 0;
        do {
          cx = (Math.random() - 0.5) * 220;
          cz = (Math.random() - 0.5) * 220;
          tries++;
        } while (
          tries < 20 &&
          cloudSpots.some((s) => Math.hypot(s.x - cx, s.z - cz) < CLOUD_MIN_GAP)
        );
        cloudSpots.push({ x: cx, z: cz });
        const cy = 34 + Math.random() * 9;
        cloudList.push(makeCloud(cx, cy, cz, 1 + Math.random() * 0.6));
      }

      // ---------- Sun glow ----------
      // Large cinematic corona — warm orange-gold matching the directional light color
      const sunGlowTex = (() => {
        const S = 256;
        const c = document.createElement("canvas");
        c.width = c.height = S;
        const ctx = c.getContext("2d")!;
        // outer halo
        const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
        g.addColorStop(0, "rgba(255,220,100,1.0)");
        g.addColorStop(0.12, "rgba(255,160,40,0.85)");
        g.addColorStop(0.4, "rgba(255,100,20,0.35)");
        g.addColorStop(0.75, "rgba(200,60,10,0.08)");
        g.addColorStop(1, "rgba(150,30,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, S, S);
        // bright inner core
        const core = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 8);
        core.addColorStop(0, "rgba(255,255,200,1.0)");
        core.addColorStop(1, "rgba(255,220,100,0)");
        ctx.fillStyle = core;
        ctx.fillRect(0, 0, S, S);
        const t = new THREE.CanvasTexture(c);
        t.colorSpace = THREE.SRGBColorSpace;
        return t;
      })();
      const sunGlow = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: sunGlowTex,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      // Sky glow circle removed per user request.
      sunGlow.visible = false;

      // ---------- Ambient particles ----------
      // Drifting ember/ash motes for atmospheric depth — warm glow in engine test,
      // cold crystalline snowflakes in spleef.
      // Low quality gets fewer ambient particles to save vertex-shader budget.
      const AMBIENT_COUNT = isSkyblock
        ? 0
        : qualityPref === "low"
          ? isMobileUA
            ? 30
            : 60
          : isMobileUA
            ? 60
            : 120;
      const ambientGeo = new THREE.BufferGeometry();
      const ambientPos = new Float32Array(AMBIENT_COUNT * 3);
      const ambientSpeed = new Float32Array(AMBIENT_COUNT);
      for (let i = 0; i < AMBIENT_COUNT; i++) {
        ambientPos[i * 3] = (Math.random() - 0.5) * 50;
        ambientPos[i * 3 + 1] = Math.random() * 18;
        ambientPos[i * 3 + 2] = (Math.random() - 0.5) * 50;
        ambientSpeed[i] = 0.25 + Math.random() * 0.55;
      }
      ambientGeo.setAttribute("position", new THREE.BufferAttribute(ambientPos, 3));
      const ambientTex = (() => {
        const S = 32;
        const c = document.createElement("canvas");
        c.width = c.height = S;
        const ctx = c.getContext("2d")!;
        // Soft bright core with colored halo
        const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
        g.addColorStop(0, isSpleef ? "rgba(200,230,255,1.0)" : "rgba(255,200,80,1.0)");
        g.addColorStop(0.3, isSpleef ? "rgba(160,210,255,0.6)" : "rgba(255,120,20,0.5)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, S, S);
        return new THREE.CanvasTexture(c);
      })();
      const ambientPoints = new THREE.Points(
        ambientGeo,
        new THREE.PointsMaterial({
          map: ambientTex,
          size: isSpleef ? 0.22 : 0.14,
          color: isSpleef ? 0xaaddff : 0xff8820,
          transparent: true,
          opacity: isSpleef ? 0.75 : 0.65,
          depthWrite: false,
          sizeAttenuation: true,
          blending: THREE.AdditiveBlending,
        }),
      );
      scene.add(ambientPoints);

      let camYaw = 0;
      let camPitch = -0.05;
      let smoothCamYaw = 0;
      let smoothCamPitch = -0.05;
      // BedWars lobby: dome centre is at y≈3, so spawn at y=6 lets gravity
      // drop the player cleanly onto the grass instead of inside the cliff.
      const spawnPoint = isSpleef
        ? new THREE.Vector3(0, 2, 17)
        : isBedwars
          ? new THREE.Vector3(0, 15, 0)
          : isEggwars
            ? new THREE.Vector3(-24, 3, 0)
            : isTntRush
              ? new THREE.Vector3(0, 2, 0)
              : isBlockParty
                ? new THREE.Vector3(0, 3, 0)
                : isSkyWars
                  ? new THREE.Vector3(Math.round(Math.cos(0) * 42), 30, 0) // first island
                  : isSkyblock
                    ? new THREE.Vector3(2, 2, 2)
                    : new THREE.Vector3(0, engineSpawnY, 0); // Blocky Plaza spawns via engineSpawnY too (set below)
      const playerPos = spawnPoint.clone();
      const playerAvatar = createAvatarModel(scene, {
        tint: gameAvatarColor,
        skinId: gameSkin,
        faceId: gameFace,
        gender: gameGender,
        showBandana: gameBandana,
        equippedItemIds: gameItems,
        equippedPants: gamePants,
      });
      playerAvatar.root.scale.setScalar(0.68);
      playerAvatar.root.visible = false;
      playerAvatar.root.position.set(playerPos.x, playerPos.y + 0.88, playerPos.z);
      // Use the chosen character model in Skyblock:
      // If Nelly is selected (or female) -> Female_Walk_LegsOnly.glb
      // Universal character model in Skyblock:
      let skyblockQblockModel: THREE.Group | null = null;
      let skyblockQblockMixer: THREE.AnimationMixer | null = null;
      let skyblockBreatheAction: THREE.AnimationAction | null = null;
      let skyblockWalkAction: THREE.AnimationAction | null = null;
      let skyblockJumpAction: THREE.AnimationAction | null = null;
      let skyblockClimbAction: THREE.AnimationAction | null = null;
      let skyblockDieAction: THREE.AnimationAction | null = null;
      let skyblockIsDying = false;
      let skyblockDeathTimer: number | null = null;

      function triggerSkyblockDeath(afterDeath?: () => void) {
        if (skyblockIsDying) return;
        skyblockIsDying = true;
        playerVel.set(0, 0.4, 0);

        if (skyblockDieAction) {
          if (skyblockBreatheAction) skyblockBreatheAction.setEffectiveWeight(0);
          if (skyblockWalkAction) skyblockWalkAction.setEffectiveWeight(0);
          if (skyblockJumpAction) skyblockJumpAction.setEffectiveWeight(0);
          if (skyblockClimbAction) skyblockClimbAction.setEffectiveWeight(0);

          skyblockDieAction.reset();
          skyblockDieAction.setEffectiveWeight(1);
          skyblockDieAction.play();

          const dur = (skyblockDieAction.getClip().duration || 1.5) * 1000;
          if (skyblockDeathTimer !== null) clearTimeout(skyblockDeathTimer);
          skyblockDeathTimer = window.setTimeout(() => {
            skyblockDeathTimer = null;
            if (afterDeath) afterDeath();
            else respawn();
          }, dur + 60);
        } else {
          if (skyblockDeathTimer !== null) clearTimeout(skyblockDeathTimer);
          skyblockDeathTimer = window.setTimeout(() => {
            skyblockDeathTimer = null;
            if (afterDeath) afterDeath();
            else respawn();
          }, 1200);
        }
      }

      {
        const isNelly =
          profileAvatar?.selectedCharacter === "char2" ||
          profileAvatar?.selectedCharacter === "nelly" ||
          profileAvatar?.baseCharacter === "char2" ||
          profileAvatar?.baseCharacter === "nelly" ||
          gameGender === "female" ||
          (typeof window !== "undefined" &&
            (localStorage.getItem("qb_base_character") === "char2" ||
             localStorage.getItem("bm-character-preset") === "nelly" ||
             localStorage.getItem("bm-gender") === "female"));

        const modelToLoad = isNelly ? skyblockNellyModelUrl : skyblockUniversalModelUrl;

        const onModelLoaded = (gltf: any) => {
          if (disposed) return;
          const model = skeletonClone(gltf.scene) as THREE.Group;
          const headGroup = model.getObjectByName("Head");
          const torsoGroup = model.getObjectByName("TORSO/PANCIA_0");
          if (headGroup && torsoGroup) {
            model.updateWorldMatrix(true, true);
            const headBounds = new THREE.Box3().setFromObject(headGroup);
            const torsoBounds = new THREE.Box3().setFromObject(torsoGroup);
            const gap = headBounds.min.y - torsoBounds.max.y;
            if (gap > 0.05) headGroup.position.y -= gap - 0.02;
          }
          const bounds = new THREE.Box3().setFromObject(model);
          const size = bounds.getSize(new THREE.Vector3());
          const targetHeight = 1.95;
          model.scale.setScalar(targetHeight / Math.max(size.y, 0.001));
          const scaledBounds = new THREE.Box3().setFromObject(model);
          model.position.y -= scaledBounds.min.y;
          model.position.x -= (scaledBounds.min.x + scaledBounds.max.x) / 2;
          model.position.z -= (scaledBounds.min.z + scaledBounds.max.z) / 2;
          model.traverse((object) => {
            const mesh = object as THREE.Mesh;
            if (!mesh.isMesh) return;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.frustumCulled = false;
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            mesh.material = materials.map((material) => {
              const mat = material.clone();
              if ("roughness" in mat) mat.roughness = 0.95;
              if ("metalness" in mat) mat.metalness = 0;
              return mat;
            });
          });
          playerAvatar.root.add(model);
          skyblockQblockModel = model;

          if (gltf.animations && gltf.animations.length > 0) {
            skyblockQblockMixer = new THREE.AnimationMixer(model);
            for (const anim of gltf.animations) {
              const name = anim.name.toLowerCase();
              const action = skyblockQblockMixer.clipAction(anim);
              if (name.includes("die") || name.includes("death")) {
                action.setLoop(THREE.LoopOnce, 1);
                action.clampWhenFinished = true;
                skyblockDieAction = action;
              } else if (name.includes("jump") || name.includes("air")) {
                action.setLoop(THREE.LoopRepeat, Infinity);
                skyblockJumpAction = action;
              } else if (name.includes("climb")) {
                action.setLoop(THREE.LoopRepeat, Infinity);
                skyblockClimbAction = action;
              } else if (name.includes("walk") || name.includes("run")) {
                action.setLoop(THREE.LoopRepeat, Infinity);
                skyblockWalkAction = action;
              } else if (name.includes("breathe") || name.includes("idle")) {
                action.setLoop(THREE.LoopRepeat, Infinity);
                skyblockBreatheAction = action;
              }
            }

            if (!skyblockWalkAction && gltf.animations[0]) {
              skyblockWalkAction = skyblockQblockMixer.clipAction(gltf.animations[0]);
              skyblockWalkAction.setLoop(THREE.LoopRepeat, Infinity);
            }

            if (skyblockWalkAction) {
              skyblockWalkAction.reset();
              skyblockWalkAction.setLoop(THREE.LoopRepeat, Infinity);
              skyblockWalkAction.setEffectiveWeight(1);
              skyblockWalkAction.setEffectiveTimeScale(1.0);
              skyblockWalkAction.play();
            }
            if (skyblockBreatheAction) {
              skyblockBreatheAction.play();
              skyblockBreatheAction.setEffectiveWeight(skyblockWalkAction ? 0.2 : 1);
            }
            if (skyblockJumpAction) {
              skyblockJumpAction.play();
              skyblockJumpAction.setEffectiveWeight(0);
            }
            if (skyblockClimbAction) {
              skyblockClimbAction.play();
              skyblockClimbAction.setEffectiveWeight(0);
            }
            if (skyblockDieAction) {
              skyblockDieAction.setEffectiveWeight(0);
            }

            skyblockQblockMixer.addEventListener("finished", (e: any) => {
              if (skyblockDieAction && e.action === skyblockDieAction) {
                if (skyblockDeathTimer !== null) {
                  clearTimeout(skyblockDeathTimer);
                  skyblockDeathTimer = null;
                }
                skyblockIsDying = false;
                respawn();
              }
            });
          }

          // The GLB is now authoritative for the player; the procedural rig
          // remains hidden underneath as a no-network fallback.
          playerAvatar.root.children
            .filter((child) => child !== model)
            .forEach((child) => {
              child.visible = false;
            });
        };

        const loader = new GLTFLoader();
        loader.load(
          modelToLoad,
          onModelLoaded,
          undefined,
          () => {
            loader.load(
              skyblockUniversalModelRemoteUrl,
              onModelLoaded,
              undefined,
              (error) => console.warn("Skyblock character model unavailable", error),
            );
          },
        );
      }
      const playerVel = new THREE.Vector3();
      // Scratch objects reused every tick instead of `new THREE.Vector3()` etc.
      // per frame — the tick loop runs at ~60fps, so allocating fresh
      // vectors/quaternions/eulers here was a steady stream of garbage that
      // showed up as periodic GC micro-stutter, especially on mobile.
      const _fwd = new THREE.Vector3();
      const _right = new THREE.Vector3();
      const _move = new THREE.Vector3();
      const _lookDir = new THREE.Vector3();
      const _lookTarget = new THREE.Vector3();
      const _heldTargetPos = new THREE.Vector3();
      const _thirdCamPos = new THREE.Vector3();
      const _heldTargetRot = new THREE.Euler();
      const _qTarget = new THREE.Quaternion();
      const _qCurrent = new THREE.Quaternion();
      let onGround = false;
      let bobPhase = 0;
      let bobAmp = 0;
      let landingKick = 0;
      let fallStartY = playerPos.y;
      let footstepAcc = 0;

      // ── Vectaria-feel engine polish ─────────────────────────────────
      // Look inertia: angular velocity that persists and decays after finger lifts
      // — the single biggest thing that makes mobile movement feel like a real game
      let lookVelYaw = 0;
      let lookVelPitch = 0;
      // Coyote time: jump still fires up to 120 ms after walking off a ledge
      const COYOTE_MS = 120;
      let coyoteMs = 0;
      // Jump buffer: pressing jump up to 160 ms before landing queues the jump
      const JUMP_BUFFER_MS = 160;
      let jumpBufferMs = 0;
      // Smoothed camera eye-height — absorbs micro-jitter from physics steps
      let smoothEyeY = -1; // -1 = uninitialised, set on first frame
      // Smoothed FOV for sprint zoom
      let smoothFov = 0; // 0 = uninitialised

      // ---------- Procedural audio ----------
      // Synthesized instead of loaded assets — zero network/asset weight and
      // always in sync with engine events (jump/land/step/break/place), which
      // reads as far more "app-polished" than a silent voxel world.
      let audioCtx: AudioContext | null = null;
      function ensureAudio() {
        if (!audioCtx) {
          try {
            const Ctor =
              window.AudioContext ||
              (window as unknown as { webkitAudioContext?: typeof AudioContext })
                .webkitAudioContext;
            if (Ctor) audioCtx = new Ctor();
          } catch {
            // audio unsupported — fail silently, gameplay isn't affected
          }
        } else if (audioCtx.state === "suspended") {
          audioCtx.resume();
        }
        return audioCtx;
      }
      function playTone(
        freq: number,
        duration: number,
        type: OscillatorType,
        peak: number,
        freqEnd?: number,
      ) {
        const ctx = ensureAudio();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        if (freqEnd !== undefined)
          osc.frequency.exponentialRampToValueAtTime(
            Math.max(1, freqEnd),
            ctx.currentTime + duration,
          );
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(peak, ctx.currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration + 0.02);
      }
      function playNoiseBurst(duration: number, peak: number, filterFreq: number) {
        const ctx = ensureAudio();
        if (!ctx) return;
        const size = Math.max(1, Math.floor(ctx.sampleRate * duration));
        const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < size; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / size);
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = filterFreq;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(peak, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
        src.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        src.start();
      }
      function playFootstep() {
        GameAudio.playFootstep();
      }
      function playJump() {
        GameAudio.playJump();
        haptic(14);
      }
      function playLand(impact: number) {
        GameAudio.playLand();
        haptic(Math.min(60, 10 + impact * 8));
      }
      function playBreak(matName = "stone") {
        GameAudio.playBreak(matName);
        haptic(12);
      }
      function playPlace() {
        GameAudio.playPlace();
        haptic(6);
      }

      // ── Background ambient music ──────────────────────────────────────────────
      let bgMusicActive = false;
      let bgMusicTimer: ReturnType<typeof setTimeout> | null = null;
      function scheduleBgNote(ctx: AudioContext, freq: number, t: number, dur: number, vol = 0.04) {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + 0.12);
        g.gain.setValueAtTime(vol, t + dur - 0.15);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + dur + 0.05);
      }
      function startBgMusic() {
        if (bgMusicActive) return;
        bgMusicActive = true;
        if (isSkyblock) {
          const stopLoop = GameAudio.startSkyblockMusic();
          return;
        }
        if (isBlockFall) {
          const stopLoop = GameAudio.startBlockFallMusic();
          return;
        }
        const _maybeCtx = ensureAudio();
        if (!_maybeCtx) return;
        const ctx: AudioContext = _maybeCtx;
        const BPM = 72;
        const beat = 60 / BPM;
        const bar = beat * 4;
        // C major pentatonic melody
        const mel = [
          { f: 392.0, s: 0, d: beat }, // G4
          { f: 440.0, s: beat, d: beat * 0.5 }, // A4
          { f: 523.25, s: beat * 1.5, d: beat * 0.5 }, // C5
          { f: 440.0, s: beat * 2, d: beat * 1.5 }, // A4
          { f: 392.0, s: beat * 4, d: beat }, // G4
          { f: 329.63, s: beat * 5, d: beat * 0.5 }, // E4
          { f: 261.63, s: beat * 5.5, d: beat * 0.5 }, // C4
          { f: 293.66, s: beat * 6, d: beat * 1.8 }, // D4
        ];
        // Bass pad cycle
        const pads = [130.81, 146.83, 130.81, 110.0]; // C3 D3 C3 A2
        const loopDur = bar * 8;
        function loop(startT: number) {
          for (let b = 0; b < 8; b++) {
            scheduleBgNote(ctx, pads[b % 4], startT + b * bar, bar * 1.85, 0.025);
            scheduleBgNote(ctx, pads[b % 4] * 1.5, startT + b * bar, bar * 1.6, 0.014);
          }
          for (let rep = 0; rep < 4; rep++) {
            const rs = startT + rep * bar * 2;
            for (const n of mel) scheduleBgNote(ctx, n.f, rs + n.s, n.d, 0.042);
          }
          bgMusicTimer = setTimeout(
            () => {
              if (bgMusicActive) loop(ctx.currentTime + 0.15);
            },
            (loopDur - 0.8) * 1000,
          );
        }
        loop(ctx.currentTime + 0.6);
      }
      // Start bg music on first user interaction
      const _startMusicOnce = () => {
        startBgMusic();
      };
      window.addEventListener("pointerdown", _startMusicOnce, { once: true });

      let curHp = 20;
      function respawn() {
        skyblockIsDying = false;
        if (skyblockDeathTimer !== null) {
          clearTimeout(skyblockDeathTimer);
          skyblockDeathTimer = null;
        }
        if (skyblockDieAction) {
          skyblockDieAction.stop();
          skyblockDieAction.setEffectiveWeight(0);
        }
        if (skyblockBreatheAction) {
          skyblockBreatheAction.reset();
          skyblockBreatheAction.setEffectiveWeight(1);
          skyblockBreatheAction.play();
        }
        if (skyblockWalkAction) skyblockWalkAction.setEffectiveWeight(0);
        if (skyblockJumpAction) skyblockJumpAction.setEffectiveWeight(0);
        playerPos.copy(spawnPoint);
        playerVel.set(0, 0, 0);
        curHp = 20;
        setHp(20);
        fallStartY = spawnPoint.y;
      }
      function damage(n: number) {
        curHp = Math.max(0, curHp - n);
        setHp(curHp);
        if (n > 0) haptic([0, 30, 40, 30]);
        if (curHp <= 0) {
          if (isEggwars && eggMatchActive) {
            const ruby = eggStateRef.current.teams.find((team) => team.id === "ruby");
            if (!ruby?.eggAlive) {
              eggMatchActive = false;
              setEggState((s) => ({
                ...s,
                phase: "defeat",
                teams: s.teams.map((team) =>
                  team.id === "ruby" ? { ...team, playerAlive: false } : team,
                ),
              }));
              showEggToast("Your egg is gone. You are eliminated.", 2600);
              return;
            }
            playerPos.set(-24, 3, 0);
            playerVel.set(0, 0, 0);
            curHp = 20;
            setHp(20);
            showEggToast("Respawning at your egg…", 1400);
            return;
          }
          // BedWars: if red bed is gone, player is permanently eliminated → defeat
          if (isBedwars && bwMatchActive && !bwRedBedAlive) {
            bwMatchActive = false;
            setBwDefeat(true);
            setBwState((s) => ({ ...s, phase: "victory" }));
            return;
          }
          respawn();
          if (isBedwars && bwMatchActive) {
            // Respawn back on red island
            playerPos.set(-114, 15, 0); // respawn inside red base with new BASE_X=114
            playerVel.set(0, 0, 0);
            curHp = 20;
            setHp(20);
            showBwToast("💀 You were eliminated! Respawned at base.", 2500);
          }
        }
      }

      const heldGroup = new THREE.Group();
      camera.add(heldGroup);
      scene.add(camera);
      let heldMesh: THREE.Object3D | null = null;
      const magicSwordLoaded: THREE.Object3D | null = null;
      // Base (rest-pose) transform for whatever is currently held — the bob
      // and digging-swing animation below applies its offsets relative to
      // this instead of a hardcoded position, since the shovel model and the
      // procedural block/placeholder meshes each need a different rest pose.
      let heldBasePos = new THREE.Vector3(0.37, -0.31, -0.55);
      let heldBaseRot = new THREE.Euler(0.25, -0.4, 0.1);
      let disposed = false;
      const diamondShovelModel: THREE.Group | null = null;
      // Diamond shovel scale — the raw model reads big/oversized in first-
      // person, so it's shrunk noticeably from the original 0.62 target size.
      const SHOVEL_SCALE_TARGET = 0.38;
      let shovelReady = !isSpleef; // non-Spleef modes never wait on this
      let onShovelReady: (() => void) | null = null;
      // For BedWars, hold the loading screen until the lobby map fetch resolves
      let mapLoaded = !isBedwars && !isBlockyplaza && !isEggwars;
      let onMapLoaded: (() => void) | null = null;

      // Item sprites (PNG textures) replace the 3D GLTF shovel model — no async
      // load needed; THREE.TextureLoader fetches lazily on first use.
      shovelReady = true; // unblock loading screen immediately

      // Declared here (before buildHeld/buildHeldShovel) so Safari's strict TDZ
      // enforcement doesn't throw when those functions reset them on first call.
      let digPhase = 0;
      let digPhaseSmooth = 0;
      let heldPosSmooth: THREE.Vector3 | null = null;
      let heldRotSmooth: THREE.Euler | null = null;
      // Which shovel tier is currently equipped in Engine Test (null = block).
      let currentShovelTier: number | null = isSpleef ? 4 : null;
      let scytheMixer: THREE.AnimationMixer | null = null;
      let scytheAction: THREE.AnimationAction | null = null;
      let scytheGltfScene: THREE.Group | null = null;

      function buildHeldMagicSword() {
        if (heldMesh) heldGroup.remove(heldMesh);
        meleeDamage = 7;
        heldMesh = null;

        heldPosSmooth = null;
        heldRotSmooth = null;
        digPhase = 0;
        digPhaseSmooth = 0;
        heldBasePos = new THREE.Vector3(-0.35, -0.2, -0.45);
        heldBaseRot = new THREE.Euler(0.1, 0.4, -0.2);
        if (scytheGltfScene) {
          heldMesh = scytheGltfScene;
          heldMesh.position.copy(heldBasePos);
          heldMesh.rotation.copy(heldBaseRot);
          heldGroup.add(heldMesh);
          return;
        }
        // Load Harvester Scythe GLB viewmodel
        new GLTFLoader().load(
          magicSwordUrl,
          (gltf) => {
            if (disposed || !isSkyblock) return;
            const model = gltf.scene;
            model.scale.setScalar(0.05834); // made 27% smaller per user request (0.07992 * 0.73)
            model.position.y = -0.16; // lowered down towards bottom of camera
            model.traverse((node) => {
              const mesh = node as THREE.Mesh;
              if (mesh.isMesh) {
                mesh.castShadow = false;
                mesh.frustumCulled = false;
                if (mesh.material) {
                  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                  mats.forEach((m) => {
                    if ("metalness" in m) (m as THREE.MeshStandardMaterial).metalness = 0.22;
                    if ("roughness" in m) (m as THREE.MeshStandardMaterial).roughness = 0.62;
                  });
                }
              }
            });
            if (gltf.animations && gltf.animations.length > 0) {
              scytheMixer = new THREE.AnimationMixer(model);
              scytheAction = scytheMixer.clipAction(gltf.animations[0]);
              scytheAction.setLoop(THREE.LoopRepeat, Infinity);
              scytheAction.clampWhenFinished = false;
              // Playing continuously
              scytheAction.play();
            }
            scytheGltfScene = model;
            buildHeldMagicSword();
          },
          undefined,
          () => {
            // Keep the hand empty if asset load fails
          },
        );
      }

      // ── Melee damage per held item ────────────────────────────────────────
      // Bare hand hits softly; utensils (shovels/pickaxes/axes) hit harder;
      // swords scale by material tier.
      let meleeDamage = 1;
      function damageForItem(path: string): number {
        const p = path.toLowerCase();
        if (p.includes("netherite")) return p.includes("axe") ? 9 : 8;
        if (p.includes("diamond")) return p.includes("sword") ? 7 : p.includes("axe") ? 8 : 4;
        if (p.includes("iron")) return p.includes("sword") ? 6 : 3;
        if (p.includes("golden") || p.includes("gold")) return p.includes("sword") ? 4 : 3;
        if (p.includes("stone")) return p.includes("sword") ? 5 : 3;
        if (p.includes("wooden") || p.includes("wood")) return p.includes("sword") ? 4 : 2;
        if (p.includes("sword")) return 5;
        if (p.includes("shovel") || p.includes("pickaxe") || p.includes("axe")) return 3;
        return 1;
      }

      // ── 2-D item sprite (PNG plane) held in hand ──────────────────────────
      // LinearFilter smooths item textures — no visible pixels.
      const _heldTexCache: Record<string, THREE.Texture> = {};
      function getItemTex(path: string): THREE.Texture {
        if (_heldTexCache[path]) return _heldTexCache[path];
        // Draw the PNG into a canvas and key out the near-black matte some item
        // sprites ship with, so held items never show a black card behind them.
        const canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 64;
        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.magFilter = THREE.LinearFilter;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          try {
            const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const p = data.data;
            for (let i = 0; i < p.length; i += 4) {
              if (p[i] < 24 && p[i + 1] < 24 && p[i + 2] < 24) p[i + 3] = 0;
            }
            ctx.putImageData(data, 0, 0);
          } catch {
            // canvas tainted — keep the raw draw
          }
          tex.needsUpdate = true;
        };
        img.src = path;
        _heldTexCache[path] = tex;
        return tex;
      }

      // Build a flat PlaneGeometry sprite for the given item texture.
      // The Euler tilt mimics Minecraft's classic right-hand item angle.
      function buildHeldSprite(texPath: string) {
        if (heldMesh) heldGroup.remove(heldMesh);
        heldPosSmooth = null;
        heldRotSmooth = null;
        digPhase = 0;
        digPhaseSmooth = 0;
        meleeDamage = damageForItem(texPath);
        const mat = new THREE.MeshBasicMaterial({
          map: getItemTex(texPath),
          transparent: true,
          alphaTest: 0.12,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        // Swords reduced by 27% (0.2398) per user request
        const isSword = texPath.includes("sword");
        const planeSize = isSword ? 0.2398 : 0.62;
        const m = new THREE.Mesh(new THREE.PlaneGeometry(planeSize, planeSize), mat);
        heldBasePos = new THREE.Vector3(0.24, isSword ? -0.40 : -0.26, -0.42);
        heldBaseRot = new THREE.Euler(0.05, -0.45, 0.72);
        m.position.copy(heldBasePos);
        m.rotation.copy(heldBaseRot);
        heldGroup.add(m);
        heldMesh = m;
      }

      // Shovel sprite — tier maps to the five Minecraft shovel materials.
      function buildHeldShovel(tier: number) {
        const sprites = [
          "/items/wooden_shovel.png",
          "/items/stone_shovel.png",
          "/items/iron_shovel.png",
          "/items/golden_shovel.png",
          "/items/diamond_shovel.png",
        ];
        buildHeldSprite(sprites[Math.max(0, Math.min(sprites.length - 1, tier))]);
      }

      function buildHeld(type: number) {
        if (heldMesh) heldGroup.remove(heldMesh);
        heldPosSmooth = null;
        heldRotSmooth = null;
        digPhase = 0;
        digPhaseSmooth = 0;
        meleeDamage = 1; // bare hand / holding a block

        if (isSpleef) {
          buildHeldShovel(4); // always diamond in Spleef
          return;
        }
        if (isSkyblock) {
          buildHeldMagicSword();
          return;
        }
        if (isBedwars) {
          // BedWars player holds a diamond sword sprite
          buildHeldSprite("/short-sword.svg");
          return;
        }
        if (isEggwars) {
          buildHeldSprite("/short-sword.svg");
          return;
        }
        if (isTntRush) {
          // TNT Rush — player holds a proper 3D TNT block (BoxGeometry, not a flat sprite)
          const tntLoader = new THREE.TextureLoader();
          const tntSideTex = tntLoader.load("/textures/blocks/tnt_side.png");
          tntSideTex.magFilter = THREE.LinearFilter;
          tntSideTex.minFilter = THREE.LinearMipmapLinearFilter;
          const tntTopTex = tntLoader.load("/textures/blocks/tnt_top.png");
          tntTopTex.magFilter = THREE.LinearFilter;
          tntTopTex.minFilter = THREE.LinearMipmapLinearFilter;
          const tntMats = [
            new THREE.MeshLambertMaterial({ map: tntSideTex }),
            new THREE.MeshLambertMaterial({ map: tntSideTex }),
            new THREE.MeshLambertMaterial({ map: tntTopTex }),
            new THREE.MeshLambertMaterial({ map: tntTopTex }),
            new THREE.MeshLambertMaterial({ map: tntSideTex }),
            new THREE.MeshLambertMaterial({ map: tntSideTex }),
          ];
          const m = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), tntMats);
          heldBasePos = new THREE.Vector3(0.34, -0.28, -0.52);
          heldBaseRot = new THREE.Euler(0.22, -0.38, 0.1);
          m.position.copy(heldBasePos);
          m.rotation.copy(heldBaseRot);
          heldGroup.add(m);
          heldMesh = m;
          return;
        }
        const mat = matForType(type);
        const g = new THREE.BoxGeometry(0.34, 0.34, 0.34);
        const m = new THREE.Mesh(g, mat);
        heldBasePos = new THREE.Vector3(0.37, -0.31, -0.55);
        heldBaseRot = new THREE.Euler(0.25, -0.4, 0.1);
        m.position.copy(heldBasePos);
        m.rotation.copy(heldBaseRot);
        heldGroup.add(m);
        heldMesh = m;
      }
      // Initial held item: spleef → diamond shovel, engine test → first block
      if (isSpleef) buildHeldShovel(4);
      else if (isSkyblock) buildHeldMagicSword();
      else buildHeld(0);

      // Mobile GPUs have coarser depth-buffer precision, so two near-identical
      // scaled boxes (outline at 1.001x, break overlay at 1.02x) sitting right
      // on top of a real block face reads as flickering z-fighting. A small
      // polygonOffset pushes them reliably in front without visibly floating.
      const outlineGeo = new THREE.BoxGeometry(1.001, 1.001, 1.001);
      const outlineLineMat = new THREE.LineBasicMaterial({
        color: 0x111111,
        transparent: true,
        opacity: 0.7,
      });
      outlineLineMat.polygonOffset = true;
      outlineLineMat.polygonOffsetFactor = -4;
      outlineLineMat.polygonOffsetUnits = -4;
      const outline = new THREE.LineSegments(new THREE.EdgesGeometry(outlineGeo), outlineLineMat);
      outline.visible = false;
      outline.renderOrder = 10;
      scene.add(outline);

      const crackTextures = generateCrackTextures();
      const breakMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      breakMat.polygonOffset = true;
      breakMat.polygonOffsetFactor = -2;
      breakMat.polygonOffsetUnits = -2;
      const breakOverlay = new THREE.Mesh(new THREE.BoxGeometry(1.02, 1.02, 1.02), breakMat);
      breakOverlay.visible = false;
      breakOverlay.renderOrder = 5;
      scene.add(breakOverlay);

      const joy: Joy = { active: false, cx: 0, cy: 0, dx: 0, dy: 0, id: -1 };
      const canvas = renderer.domElement;
      canvas.style.touchAction = "none";

      let lookId = -1;
      let lookLastX = 0;
      let lookLastY = 0;
      let jumpQueued = false;
      let flyDownQueued = false;
      let placeAnim = 0;
      let destroyAnim = 0;
      let holding = false;
      let holdStart = 0;
      let holdMoved = 0;
      let holdTarget: { x: number; y: number; z: number } | null = null;
      // Spleef: 250 ms.
      // BedWars: 350 ms.
      // Skyblock / Survival mining: 750 ms — deliberate, substantial, and satisfying.
      const HOLD_MS = isSpleef ? 250 : isBedwars ? 350 : 750;

      // ── White Block Flash on Break (0.1s matte flat white effect) ────────────
      const whiteFlashGeo = new THREE.BoxGeometry(1.004, 1.004, 1.004);
      const whiteFlashes: Array<{ mesh: THREE.Mesh; start: number; dur: number }> = [];

      function spawnWhiteFlash(x: number, y: number, z: number) {
        const mat = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.92,
          depthWrite: false,
        });
        const mesh = new THREE.Mesh(whiteFlashGeo, mat);
        mesh.position.set(x, y, z);
        scene.add(mesh);
        whiteFlashes.push({ mesh, start: performance.now(), dur: 100 }); // strictly 0.1s (100ms)
      }

      // ── Physical Popped Block Chunk (when a block is broken, it pops off!) ──
      interface PoppedBlockPiece {
        mesh: THREE.Mesh;
        x: number;
        y: number;
        z: number;
        vx: number;
        vy: number;
        vz: number;
        rx: number;
        ry: number;
        rz: number;
        rvx: number;
        rvy: number;
        rvz: number;
        scale: number;
        born: number;
        lifetime: number;
      }
      const poppedBlockPieces: PoppedBlockPiece[] = [];
      const poppedChunkGeo = new THREE.BoxGeometry(0.38, 0.38, 0.38);

      function spawnPoppedBlockPiece(x: number, y: number, z: number, blockType: number) {
        try {
          const mat = matForType(blockType >= 0 ? blockType : 2);
          const piece = new THREE.Mesh(poppedChunkGeo, mat);
          piece.castShadow = true;
          piece.receiveShadow = false;
          piece.position.set(x, y + 0.1, z);
          scene.add(piece);

          const dx = playerPos.x - x;
          const dz = playerPos.z - z;
          const dist = Math.hypot(dx, dz) || 1;
          const pushX = dx / dist;
          const pushZ = dz / dist;

          poppedBlockPieces.push({
            mesh: piece,
            x,
            y: y + 0.1,
            z,
            vx: pushX * 1.8 + (Math.random() - 0.5) * 1.5,
            vy: 3.5 + Math.random() * 1.5,
            vz: pushZ * 1.8 + (Math.random() - 0.5) * 1.5,
            rx: Math.random() * Math.PI,
            ry: Math.random() * Math.PI,
            rz: Math.random() * Math.PI,
            rvx: (Math.random() - 0.5) * 9,
            rvy: (Math.random() - 0.5) * 9,
            rvz: (Math.random() - 0.5) * 9,
            scale: 1.0,
            born: performance.now(),
            lifetime: 1400,
          });
        } catch {}
      }

      // ── Tree Physics & Falling Blocks System ──────────────────────────────
      const TREE_LOG_TYPES = new Set([3, 18, 23, 24, 25, 26]);
      const TREE_LEAF_TYPES = new Set([5, 200, 201, 202, 203]);

      function isTreeLog(t: number): boolean {
        return TREE_LOG_TYPES.has(t);
      }
      function isTreeBlockType(t: number): boolean {
        return TREE_LOG_TYPES.has(t) || TREE_LEAF_TYPES.has(t);
      }

      interface FallingPhysicsBlock {
        mesh: THREE.Mesh;
        type: number;
        isLog: boolean;
        startX: number;
        startY: number;
        startZ: number;
        x: number;
        y: number;
        z: number;
        vx: number;
        vy: number;
        vz: number;
        rx: number;
        ry: number;
        rz: number;
        rvx: number;
        rvy: number;
        rvz: number;
        scale: number;
        born: number;
        delay: number;
        groundY: number;
        bounces: number;
        settled: boolean;
        settledAt: number;
        windPhase: number;
      }

      const activeFallingBlocks: FallingPhysicsBlock[] = [];
      const fallingBlockGeo = new THREE.BoxGeometry(0.96, 0.96, 0.96);

      function triggerTreePhysics(cutX: number, cutY: number, cutZ: number, _cutType: number) {
        // 1. Procedural audio effects
        try {
          GameAudio.playTreeCollapse();
          GameAudio.playLeafRustle();
        } catch {}

        // 2. Tactile rumble
        haptic([45, 25, 55]);

        // 3. Tree Burst Effects:
        // A. Leaf shower particles drifting from canopy
        const leafColors = [0x3f8f3a, 0x5cb85c, 0x8ae03a, 0x2d6a26, 0xa4e24a];
        for (let i = 0; i < 22; i++) {
          const pm = new THREE.MeshBasicMaterial({
            color: leafColors[i % leafColors.length],
            transparent: true,
            opacity: 0.9,
          });
          const lp = new THREE.Mesh(particleGeo, pm);
          const spread = 2.2;
          lp.position.set(
            cutX + (Math.random() - 0.5) * spread * 2,
            cutY + 1.2 + Math.random() * 3.5,
            cutZ + (Math.random() - 0.5) * spread * 2,
          );
          scene.add(lp);
          liveParticles.push({
            mesh: lp,
            material: pm,
            vy: 0.08 + Math.random() * 0.12,
            vx: (Math.random() - 0.5) * 0.3,
            vz: (Math.random() - 0.5) * 0.3,
            born: performance.now(),
          });
        }

        // B. Wood splinters bursting from the cut point
        const woodColors = [0xb4895e, 0x9a7048, 0x6b4c32, 0xd4cfa0];
        for (let i = 0; i < 12; i++) {
          const wm = new THREE.MeshBasicMaterial({
            color: woodColors[i % woodColors.length],
            transparent: true,
            opacity: 0.95,
          });
          const wp = new THREE.Mesh(particleGeo, wm);
          wp.position.set(
            cutX + (Math.random() - 0.5) * 0.5,
            cutY + 0.5 + Math.random() * 0.3,
            cutZ + (Math.random() - 0.5) * 0.5,
          );
          scene.add(wp);
          liveParticles.push({
            mesh: wp,
            material: wm,
            vy: 0.2 + Math.random() * 0.15,
            vx: (Math.random() - 0.5) * 0.35,
            vz: (Math.random() - 0.5) * 0.35,
            born: performance.now(),
          });
        }

        // 4. BFS find all tree blocks above and around this point
        const visited = new Set<string>();
        const queue: Array<{ x: number; y: number; z: number }> = [];

        for (let dy = 0; dy <= 2; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            for (let dz = -1; dz <= 1; dz++) {
              if (dx === 0 && dy === 0 && dz === 0) continue;
              const nx = cutX + dx;
              const ny = cutY + dy;
              const nz = cutZ + dz;
              const k = key(nx, ny, nz);
              const b = blocks.get(k);
              if (b && "type" in b && isTreeBlockType(b.type)) {
                visited.add(k);
                queue.push({ x: nx, y: ny, z: nz });
              }
            }
          }
        }

        const blocksToFall: Array<{ x: number; y: number; z: number; type: number }> = [];
        const NEIGHBORS = [
          [0, 1, 0],
          [1, 0, 0],
          [-1, 0, 0],
          [0, 0, 1],
          [0, 0, -1],
          [0, -1, 0],
        ];

        while (queue.length > 0 && blocksToFall.length < 32) {
          const cur = queue.shift()!;
          const k = key(cur.x, cur.y, cur.z);
          const b = blocks.get(k);
          if (!b || !("type" in b)) continue;

          blocksToFall.push({ x: cur.x, y: cur.y, z: cur.z, type: b.type });

          for (const [dx, dy, dz] of NEIGHBORS) {
            const nx = cur.x + dx;
            const ny = cur.y + dy;
            const nz = cur.z + dz;
            if (ny < cutY) continue;
            if (Math.abs(nx - cutX) > 6 || Math.abs(nz - cutZ) > 6) continue;
            if (ny - cutY > 16) continue;

            const nk = key(nx, ny, nz);
            if (!visited.has(nk)) {
              visited.add(nk);
              const nb = blocks.get(nk);
              if (nb && "type" in nb && isTreeBlockType(nb.type)) {
                queue.push({ x: nx, y: ny, z: nz });
              }
            }
          }
        }

        blocksToFall.sort((a, b) => a.y - b.y);

        for (const tb of blocksToFall) {
          const isLog = isTreeLog(tb.type);
          let groundY = cutY;
          for (let gy = tb.y - 1; gy >= -10; gy--) {
            const gk = key(tb.x, gy, tb.z);
            const gb = blocks.get(gk);
            if (gb && "type" in gb && !isTreeBlockType(gb.type)) {
              groundY = gy + 1;
              break;
            }
          }

          removeBlock(tb.x, tb.y, tb.z);

          try {
            const mat = matForType(tb.type);
            const mesh = new THREE.Mesh(fallingBlockGeo, mat);
            mesh.castShadow = true;
            mesh.receiveShadow = false;
            mesh.position.set(tb.x, tb.y, tb.z);
            scene.add(mesh);

            const heightDelta = tb.y - cutY;
            const delay = Math.max(0, heightDelta * 0.045 + Math.random() * 0.04);

            activeFallingBlocks.push({
              mesh,
              type: tb.type,
              isLog,
              startX: tb.x,
              startY: tb.y,
              startZ: tb.z,
              x: tb.x,
              y: tb.y,
              z: tb.z,
              vx: (Math.random() - 0.5) * (isLog ? 1.4 : 0.9),
              vy: isLog ? 0.35 + Math.random() * 0.35 : 0.65 + Math.random() * 0.45,
              vz: (Math.random() - 0.5) * (isLog ? 1.4 : 0.9),
              rx: 0,
              ry: 0,
              rz: 0,
              rvx: (Math.random() - 0.5) * (isLog ? 4.5 : 2.0),
              rvy: (Math.random() - 0.5) * 3.0,
              rvz: (Math.random() - 0.5) * (isLog ? 4.5 : 2.0),
              scale: 1.0,
              born: performance.now(),
              delay,
              groundY,
              bounces: 0,
              settled: false,
              settledAt: 0,
              windPhase: Math.random() * Math.PI * 2,
            });
          } catch {}
        }

        rebuildRaycastTargets();
        _invalidateShadows();
      }

      function updateTreePhysicsAndPoppedBlocks(now: number, dt: number) {
        for (let i = poppedBlockPieces.length - 1; i >= 0; i--) {
          const p = poppedBlockPieces[i];
          const age = now - p.born;
          if (age > p.lifetime) {
            scene.remove(p.mesh);
            poppedBlockPieces.splice(i, 1);
            continue;
          }
          p.vy -= 12.0 * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.z += p.vz * dt;
          p.rx += p.rvx * dt;
          p.ry += p.rvy * dt;
          p.rz += p.rvz * dt;

          const progress = age / p.lifetime;
          if (progress > 0.75) {
            p.scale = Math.max(0, 1 - (progress - 0.75) / 0.25);
          } else {
            p.scale = 1.0;
          }
          p.mesh.position.set(p.x, p.y, p.z);
          p.mesh.rotation.set(p.rx, p.ry, p.rz);
          p.mesh.scale.setScalar(p.scale);
        }

        for (let i = activeFallingBlocks.length - 1; i >= 0; i--) {
          const fb = activeFallingBlocks[i];
          const elapsedSec = (now - fb.born) / 1000;

          if (elapsedSec < fb.delay) {
            const wobbleRatio = fb.delay > 0 ? elapsedSec / fb.delay : 1;
            const wobbleAmt = wobbleRatio * 0.08;
            fb.mesh.position.x = fb.startX + Math.sin(now * 0.035 + fb.windPhase) * wobbleAmt;
            fb.mesh.position.z = fb.startZ + Math.cos(now * 0.035 + fb.windPhase) * wobbleAmt;
            continue;
          }

          if (fb.settled) {
            const settleElapsed = (now - fb.settledAt) / 1000;
            fb.ry += dt * 2.2;
            fb.mesh.rotation.y = fb.ry;
            fb.mesh.position.y = fb.y + Math.sin(now * 0.005 + fb.windPhase) * 0.08;

            const distToPlayer = Math.hypot(playerPos.x - fb.x, playerPos.z - fb.z);
            if (settleElapsed > 2.5 || distToPlayer < 2.0) {
              fb.scale -= dt * 3.5;
              if (fb.scale <= 0.05) {
                scene.remove(fb.mesh);
                activeFallingBlocks.splice(i, 1);
                const bName = fb.type < BLOCKS.length ? BLOCKS[fb.type]?.name : "oak log";
                window.dispatchEvent(
                  new CustomEvent("bm-item-collected", { detail: { name: bName, qty: 1 } }),
                );
                continue;
              }
              fb.mesh.scale.setScalar(Math.max(0, fb.scale));
            }
            continue;
          }

          const fallDt = Math.min(0.045, dt);
          if (fb.isLog) {
            fb.vy -= 15.0 * fallDt;
            fb.vx *= 0.985;
            fb.vz *= 0.985;
          } else {
            fb.vy = Math.max(-3.4, fb.vy - 6.0 * fallDt);
            fb.vx = Math.sin(now * 0.006 + fb.windPhase) * 0.75;
            fb.vz = Math.cos(now * 0.005 + fb.windPhase) * 0.75;
          }

          fb.x += fb.vx * fallDt;
          fb.y += fb.vy * fallDt;
          fb.z += fb.vz * fallDt;

          fb.rx += fb.rvx * fallDt;
          fb.ry += fb.rvy * fallDt;
          fb.rz += fb.rvz * fallDt;

          if (fb.y <= fb.groundY) {
            fb.y = fb.groundY;
            if (fb.bounces < 2 && Math.abs(fb.vy) > 1.2) {
              fb.vy = -fb.vy * 0.28;
              fb.vx *= 0.55;
              fb.vz *= 0.55;
              fb.rvx *= 0.4;
              fb.rvz *= 0.4;
              fb.bounces++;
              spawnParticles(fb.x, fb.y, fb.z, fb.type);
            } else {
              fb.settled = true;
              fb.settledAt = now;
              fb.vy = 0;
              fb.vx = 0;
              fb.vz = 0;
              fb.scale = 0.52;
              fb.mesh.scale.setScalar(0.52);
              fb.rx = 0;
              fb.rz = 0;
              spawnParticles(fb.x, fb.y, fb.z, fb.type);
            }
          }

          if (fb.y < -35) {
            scene.remove(fb.mesh);
            activeFallingBlocks.splice(i, 1);
            continue;
          }

          fb.mesh.position.set(fb.x, fb.y, fb.z);
          fb.mesh.rotation.set(fb.rx, fb.ry, fb.rz);
        }
      }

      function tapAction() {
        // Spleef has no block placement — hold-break only
        if (isSpleef) return;

        if (isSkyblock && scytheAction) {
          destroyAnim = 1;
          scytheAction.reset().play();
        }

        // ── TNT Rush: throw TNT toward where the player is looking ────────────
        if (isTntRush) {
          const throwDir = new THREE.Vector3(0, 0, -1).applyEuler(
            new THREE.Euler(camPitch, camYaw, 0, "YXZ"),
          );
          const tntPGeo = new THREE.BoxGeometry(0.35, 0.35, 0.35);
          const tntPMat = new THREE.MeshLambertMaterial({ color: 0xcc2222 });
          const tntP = new THREE.Mesh(tntPGeo, tntPMat);
          tntP.position.copy(playerPos).add(new THREE.Vector3(0, 1.4, 0));
          scene.add(tntP);
          haptic([15, 5, 10]);
          tntProjectiles.push({
            mesh: tntP,
            vel: throwDir
              .clone()
              .multiplyScalar(16)
              .setY(throwDir.y * 16 + 3),
            life: 5,
            fuse: 3.5,
          });
          placeAnim = 1;
          return;
        }

        // ── BedWars: NPC interaction (lobby) ─────────────────────────────────
        if (isBedwars && !bwMatchActive && bwNpcMesh) {
          const distToNpc = playerPos.distanceTo(bwNpcMesh.position);
          if (distToNpc < 3.2) {
            setBwNpcModal(true);
            return;
          }
        }

        // Generous melee hit test: a precise ray hit, or simply being close
        // and roughly facing the target (mobile aim is never pixel-perfect).
        const meleeFacing = (target: THREE.Vector3, reach = 4.2) => {
          const eye = playerPos.clone().add(new THREE.Vector3(0, 1.5, 0));
          const to = target.clone().sub(eye);
          const d = to.length();
          if (d > reach) return false;
          const look = new THREE.Vector3(0, 0, -1).applyEuler(
            new THREE.Euler(camPitch, camYaw, 0, "YXZ"),
          );
          return to.normalize().dot(look) > 0.72;
        };

        // ── BedWars: melee attack on bot (match) ─────────────────────────────
        if (isBedwars && bwMatchActive && bwBotMesh && botState !== "dead") {
          ray.setFromCamera(rayCenter, camera);
          const botHits = ray.intersectObject(bwBotMesh, true);
          if ((botHits.length > 0 && botHits[0].distance <= 3.5) || meleeFacing(botPos)) {
            botHp -= meleeDamage;
            bwBotHpBar?.set(Math.max(0, botHp), 20);
            GameAudio.playGirlHurt();
            const kbDir = new THREE.Vector3().subVectors(botPos, playerPos).setY(0).normalize();
            botVel.x += kbDir.x * 5;
            botVel.z += kbDir.z * 5;
            botVel.y += 1.5;
            haptic([20, 10, 15]);
            spawnParticles(botPos.x, botPos.y + 0.5, botPos.z, 42);
            if (botHp <= 0) {
              botHp = 0;
              botState = "dead";
              botRespawnTimer = 5;
              bwBotMesh.visible = false;
              setBwState((s) => ({ ...s, blueTeam: { ...s.blueTeam, playerAlive: false } }));
              if (!bwBlueBedAlive) {
                bwMatchActive = false;
                setBwVictory(true);
                setBwState((s) => ({ ...s, phase: "victory" }));
              } else {
                showBwToast("Enemy eliminated! Respawning in 5s...", 2500);
              }
            } else {
              showBwToast(`Hit! ${botHp}♥`, 700);
            }
            return;
          }
        }

        // ── EggWars: melee attack on Azure bot ──────────────────────────────
        if (isEggwars && eggMatchActive && eggBotMesh && eggBotAlive) {
          ray.setFromCamera(rayCenter, camera);
          const botHits = ray.intersectObject(eggBotMesh, true);
          if ((botHits.length > 0 && botHits[0].distance <= 3.5) || meleeFacing(eggBotPos)) {
            eggBotHp -= meleeDamage;
            eggBotHpBar?.set(Math.max(0, eggBotHp), 20);
            GameAudio.playGirlHurt();
            const kbDir = new THREE.Vector3().subVectors(eggBotPos, playerPos).setY(0).normalize();
            eggBotVel.x += kbDir.x * 5;
            eggBotVel.z += kbDir.z * 5;
            eggBotVel.y += 1.5;
            haptic([20, 10, 15]);
            spawnParticles(eggBotPos.x, eggBotPos.y + 0.5, eggBotPos.z, 43);
            if (eggBotHp <= 0) {
              eggBotHp = 0;
              eggBotAlive = false;
              eggBotRespawnTimer = 5;
              eggBotMesh.visible = false;
              setEggState((s) => ({
                ...s,
                teams: s.teams.map((team) =>
                  team.id === "azure" ? { ...team, playerAlive: false } : team,
                ),
                phase: !s.teams.some(
                  (team) => team.id !== "ruby" && team.id !== "azure" && team.playerAlive,
                )
                  ? "victory"
                  : s.phase,
              }));
              if (!eggStateRef.current.teams.find((team) => team.id === "azure")?.eggAlive) {
                eggMatchActive = false;
                setEggState((s) => ({ ...s, phase: "victory" }));
                showEggToast("Victory! Azure has been eliminated.", 3000);
              } else {
                showEggToast("Azure player eliminated. Break their egg first!", 2400);
              }
            } else {
              showEggToast(`Azure hit · ${eggBotHp}♥`, 650);
            }
            return;
          }
        }

        // Weapon/tool in hand: swing at things, never place a block.
        if (meleeDamage > 1) {
          placeAnim = 1;
          GameAudio.playAirDig();
          return;
        }

        const { hit, normal, position } = getTargetBlock();
        if (!hit || !normal || !position) return;
        const isVisitingOther =
          isSkyblock &&
          !!visitingUserId &&
          visitingUserId !== qbUser?.uid &&
          visitingUserId !== qbUser?.islandId;
        if (isVisitingOther) {
          showSbToast("You cannot break, only your island you can break now", 3500);
          return;
        }
        const p = position;
        const nx = p.x + Math.round(normal.x);
        const ny = p.y + Math.round(normal.y);
        const nz = p.z + Math.round(normal.z);
        const dx = nx - playerPos.x;
        const dz = nz - playerPos.z;
        if (
          Math.abs(dx) < 0.7 &&
          Math.abs(dz) < 0.7 &&
          ny >= Math.round(playerPos.y) &&
          ny <= Math.round(playerPos.y + 1.6)
        )
          return;
        // In BedWars, block placement is only allowed during an active match
        if (isBedwars && !bwMatchActive) return;
        if (isEggwars && !eggMatchActive) return;
        // When holding a weapon/item, use it instead of placing blocks
        if (isBedwars && bwMatchActive) {
          if (bwHeldItem === "bow") {
            shootBwArrow();
            return;
          }
          if (bwHeldItem === "sword") return; // sword uses hold-attack, not tap-place
          if (bwHeldItem === "tnt") {
            // TNT: place a wool block but tinted red — future: proper TNT explosion
            addBlock(nx, ny, nz, 42);
            rebuildRaycastTargets();
            placeAnim = 1;
            playPlace();
            return;
          }
          // 'wool' or unknown → fall through to normal block placement
        }
        addBlock(nx, ny, nz, slotRef.current);
        // Patch raycast targets when a new block group or transparent mesh appears.
        rebuildRaycastTargets();
        placeAnim = 1;
        playPlace();
      }

      function onPointerDown(e: PointerEvent) {
        e.preventDefault(); // required on iOS/Android to prevent scroll/gesture capture
        ensureAudio(); // unlock/create the audio context on first user gesture
        try {
          canvas.setPointerCapture(e.pointerId);
        } catch {}
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const isTouch = e.pointerType === "touch" || e.pointerType === "pen";
        // Dynamic joystick: activates on touch in the left 45% of the screen
        // or anywhere near the bottom-left joystick pad.
        const isNearJoystick = x < 180 && y > rect.height - 200;
        if (
          (isTouch && x < rect.width * 0.45) ||
          (isTouch && isNearJoystick) ||
          (!isTouch && isNearJoystick && !joy.active)
        ) {
          joy.active = true;
          joy.id = e.pointerId;
          joy.cx = isNearJoystick ? 80 : x;
          joy.cy = isNearJoystick ? rect.height - 80 : y;
          joy.dx = 0;
          joy.dy = 0;
          const c = joyContainerRef.current;
          if (c) {
            c.style.left = `${isNearJoystick ? 80 : e.clientX}px`;
            c.style.top = isNearJoystick ? "auto" : `${e.clientY}px`;
            c.style.bottom = isNearJoystick ? "80px" : "auto";
            c.style.opacity = "1";
          }
          if (joyKnobRef.current) joyKnobRef.current.style.transform = "translate(0px,0px)";
        } else if (lookId === -1) {
          lookId = e.pointerId;
          lookLastX = x;
          lookLastY = y;
          holding = true;
          holdStart = performance.now();
          holdMoved = 0;
          const { hit, position } = getTargetBlock();
          if (hit && position) {
            holdTarget = { x: position.x, y: position.y, z: position.z };
          } else holdTarget = null;
        }
      }
      function onPointerMove(e: PointerEvent) {
        e.preventDefault(); // prevent iOS/Android momentum/scroll stealing mid-drag
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        if (e.pointerId === joy.id) {
          const dx = x - joy.cx,
            dy = y - joy.cy;
          const r = 58;
          const len = Math.hypot(dx, dy);
          const k = len > r ? r / len : 1;
          joy.dx = (dx * k) / r;
          joy.dy = (dy * k) / r;
          if (joyKnobRef.current) {
            joyKnobRef.current.style.transform = `translate(${joy.dx * JOY_KNOB_TRAVEL}px, ${joy.dy * JOY_KNOB_TRAVEL}px)`;
          }
        } else if (e.pointerId === lookId) {
          const dx = x - lookLastX,
            dy = y - lookLastY;
          const dist = Math.hypot(dx, dy);
          holdMoved += dist;
          if (holdMoved > 6) {
            holding = false;
            breakOverlay.visible = false;
            updateHoldProgress(0);
          }
          // Ultra-smooth look delta without burst spikes
          const smoothDx = Math.max(-50, Math.min(50, dx));
          const smoothDy = Math.max(-50, Math.min(50, dy));
          camYaw -= smoothDx * 0.0032 * lookSens;
          camPitch -= smoothDy * 0.0032 * lookSens;
          camPitch = Math.max(-1.48, Math.min(1.48, camPitch));
          lookLastX = x;
          lookLastY = y;
          // Inertia: smooth exponential blend without burst spikes
          const lvy = -smoothDx * 0.0032 * lookSens * 40;
          const lvp = -smoothDy * 0.0032 * lookSens * 40;
          lookVelYaw = lookVelYaw * 0.5 + lvy * 0.5;
          lookVelPitch = lookVelPitch * 0.5 + lvp * 0.5;
        }
      }
      function onPointerUp(e: PointerEvent) {
        e.preventDefault();
        try {
          canvas.releasePointerCapture(e.pointerId);
        } catch {}
        if (e.pointerId === joy.id) {
          joy.active = false;
          joy.id = -1;
          joy.dx = 0;
          joy.dy = 0;
          if (joyKnobRef.current) joyKnobRef.current.style.transform = "translate(0px,0px)";
          if (joyContainerRef.current) {
            joyContainerRef.current.style.left = "80px";
            joyContainerRef.current.style.top = "auto";
            joyContainerRef.current.style.bottom = "80px";
            joyContainerRef.current.style.opacity = "0.75";
          }
        } else if (e.pointerId === lookId) {
          const elapsed = performance.now() - holdStart;
          if (elapsed < HOLD_MS && holdMoved < 8) tapAction();
          holding = false;
          holdTarget = null;
          updateHoldProgress(0);
          breakOverlay.visible = false;
          lookId = -1;
        }
      }
      // { passive: false } is required on iOS Safari: without it the browser
      // marks the touch as "handled" and steals it for scroll/gesture before
      // our pointerdown fires, which is what caused the joystick to appear
      // completely unresponsive on iPhone 13.  preventDefault() inside each
      // handler then confirms we're consuming the event.
      canvas.addEventListener("pointerdown", onPointerDown, { passive: false });
      canvas.addEventListener("pointermove", onPointerMove, { passive: false });
      canvas.addEventListener("pointerup", onPointerUp, { passive: false });
      canvas.addEventListener("pointercancel", onPointerUp, { passive: false });

      const ray = new THREE.Raycaster();
      ray.far = 6;
      const rayCenter = new THREE.Vector2(0, 0);
      // _raycastTargets is built once on world-gen and patched on each
      // addBlock/removeBlock — NOT rebuilt from scratch every frame.
      // Rebuilding from scratch on every tick (the old approach) iterated
      // the entire groups Map + transparentMeshes Set each frame, which is
      // ~20-30 push() calls per frame even with no world changes.
      // Declared with `var` on purpose: world-gen branches (baseplate,
      // eggwars, skywars…) run earlier in this effect and call
      // rebuildRaycastTargets(). A `const` here put the array in the temporal
      // dead zone for those calls, which threw "Cannot access
      // '_raycastTargets' before initialization" and crashed the game on
      // Play. `var` hoists, and the function initialises it on first use.
      // eslint-disable-next-line no-var
      var _raycastTargets: THREE.Object3D[] | undefined;
      _raycastTargets = _raycastTargets || [];
      function rebuildRaycastTargets() {
        if (!_raycastTargets) _raycastTargets = [];
        _raycastTargets.length = 0;
        for (const [type, g] of groups) {
          if (type !== 6) _raycastTargets.push(g.mesh);
        }
        for (const m of transparentMeshes) _raycastTargets.push(m);
      }
      // Cache last raycast result; re-ray every N frames to save GPU time.
      // On mobile we skip 2 out of 3 frames (still feels instant at 60fps).
      const RAYCAST_SKIP = isMobileUA ? 2 : 1;
      let _raycastFrame = 0;
      let _lastRayResult: {
        hit: THREE.Intersection | null;
        normal: THREE.Vector3 | null;
        position: THREE.Vector3 | null;
      } = { hit: null, normal: null, position: null };
      function getTargetBlock() {
        _raycastFrame++;
        if (_raycastFrame % RAYCAST_SKIP !== 0) return _lastRayResult;
        ray.setFromCamera(rayCenter, camera);
        const hits = ray.intersectObjects(_raycastTargets ?? [], false);
        if (hits.length === 0) {
          _lastRayResult = { hit: null, normal: null, position: null };
          return _lastRayResult;
        }
        const h = hits[0];
        const n = h.face?.normal ? h.face.normal.clone() : new THREE.Vector3();
        let position: THREE.Vector3 | null = null;
        if (h.instanceId !== undefined) {
          for (const g of groups.values()) {
            if (g.mesh === h.object) {
              const k = g.indexToPos.get(h.instanceId);
              if (k) {
                const [px, py, pz] = k.split(",").map(Number);
                position = new THREE.Vector3(px, py, pz);
              }
              break;
            }
          }
        } else if (h.object instanceof THREE.Mesh && transparentMeshes.has(h.object)) {
          position = h.object.position.clone();
        }
        _lastRayResult = { hit: h, normal: n, position };
        return _lastRayResult;
      }

      function completeAction() {
        // EggWars keeps the arena inert until its dedicated match countdown
        // finishes; do not allow mining during the lobby/countdown phases.
        if (isEggwars && !eggMatchActive) return;
        // ── BedWars: destroy blue bed on hold ────────────────────────────────
        if (isBedwars && bwMatchActive && bwBlueBedMesh && bwBlueBedAlive) {
          ray.setFromCamera(rayCenter, camera);
          const bedHits = ray.intersectObject(bwBlueBedMesh, true);
          if (bedHits.length > 0 && bedHits[0].distance <= 5) {
            bwBlueBedAlive = false;
            spawnParticles(
              Math.round(bwBlueBedMesh.position.x),
              Math.round(bwBlueBedMesh.position.y),
              Math.round(bwBlueBedMesh.position.z),
              43,
            );
            scene.remove(bwBlueBedMesh);
            const bedIdx = bwObjects.indexOf(bwBlueBedMesh);
            if (bedIdx >= 0) bwObjects.splice(bedIdx, 1);
            bwBlueBedMesh = null;
            setBwState((s) => ({ ...s, blueTeam: { ...s.blueTeam, bedAlive: false } }));
            showBwToast("💥 Blue bed destroyed!", 3000);
            destroyAnim = 1;
            playBreak();
            haptic([50, 20, 50]);
            return;
          }
        }

        if (isEggwars && eggMatchActive) {
          ray.setFromCamera(rayCenter, camera);
          const rubyEgg = eggMeshes.get("ruby");
          for (const [teamId, eggMesh] of eggMeshes) {
            if (teamId === "ruby" || !eggMesh.visible) continue;
            const eggHits = ray.intersectObject(eggMesh, true);
            if (eggHits.length > 0 && eggHits[0].distance <= 5) {
              destroyEgg(teamId);
              destroyAnim = 1;
              return;
            }
          }
          void rubyEgg;
        }

        const { hit, position } = getTargetBlock();
        if (!hit || !position) return;
        const isVisitingOther =
          isSkyblock &&
          !!visitingUserId &&
          visitingUserId !== qbUser?.uid &&
          visitingUserId !== qbUser?.islandId;
        if (isVisitingOther) {
          showSbToast("You cannot break, only your island you can break now", 3500);
          return;
        }
        const targetBlock = blocks.get(key(position.x, position.y, position.z));
        const targetType =
          targetBlock && "type" in targetBlock ? targetBlock.type : -1;
        const blockName =
          targetBlock && "type" in targetBlock && targetBlock.type < BLOCKS.length
            ? BLOCKS[targetBlock.type]?.name
            : "stone";

        // 1. Physically pop off the broken block
        spawnPoppedBlockPiece(position.x, position.y, position.z, targetType >= 0 ? targetType : 2);

        // 2. Remove the mined block from the voxel world
        removeBlock(position.x, position.y, position.z);

        // 3. Visual & sound feedback
        spawnWhiteFlash(position.x, position.y, position.z);
        rebuildRaycastTargets();
        destroyAnim = 1;
        playBreak(blockName);
        window.dispatchEvent(
          new CustomEvent("bm-item-collected", { detail: { name: blockName, qty: 1 } }),
        );
        if (isSpleef) sblocksRef.current++;

        // 4. Skyblock / Voxel Tree Physics:
        // When a tree log or leaf block is destroyed, all unsupported tree blocks above
        // it fall down smoothly with physics, tumbling, bouncing, and leaf shower effects!
        if (isTreeBlockType(targetType)) {
          triggerTreePhysics(position.x, position.y, position.z, targetType);
        }
      }

      // ── Desktop Keyboard Controls ──────────────────────────────────────────
      const keysPressed: Record<string, boolean> = {};
      let lastWTime = 0;
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        keysPressed[e.code] = true;
        if (e.code === "Space") jumpQueued = true;
        if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
          if (flyRef.current) {
            flyDownQueued = true;
          } else {
            setRunning(true);
          }
        }
        if (e.code === "ControlLeft" || e.code === "ControlRight") {
          setRunning(true);
        }
        if (e.code === "KeyR") {
          setRunning((r) => !r);
        }
        if (e.code === "KeyV" || e.code === "F5" || e.code === "KeyC") {
          e.preventDefault();
          cycleCamMode();
        }
        if (e.code === "KeyW") {
          const nowW = performance.now();
          if (nowW - lastWTime < 280) {
            setRunning(true);
          }
          lastWTime = nowW;
        }
        if (e.code >= "Digit1" && e.code <= "Digit9") {
          const slotIdx = parseInt(e.code.replace("Digit", "")) - 1;
          setSlot(slotIdx);
          currentShovelTier = null;
          buildHeld(slotIdx);
        }
      };
      const onKeyUp = (e: KeyboardEvent) => {
        keysPressed[e.code] = false;
      };
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyUp);

      const jumpHandler = () => {
        jumpQueued = true;
      };
      window.addEventListener("bm-jump", jumpHandler);
      const magicCubeHandler = () => {
        fireMagicCube();
      };
      window.addEventListener("bm-magic-cube", magicCubeHandler);
      const flyDownHandler = () => {
        flyDownQueued = true;
      };
      window.addEventListener("bm-fly-down", flyDownHandler);
      const slotHandler = (e: Event) => {
        currentShovelTier = null;
        buildHeld((e as CustomEvent<number>).detail);
      };
      window.addEventListener("bm-slot", slotHandler as EventListener);
      // bm-equip: fired by BackpackModal when user taps any item to equip it
      const equipHandler = (e: Event) => {
        const d = (
          e as CustomEvent<{ type: "shovel"; tier: number } | { type: "block"; slot: number }>
        ).detail;
        if (d.type === "shovel") {
          currentShovelTier = d.tier;
          buildHeldShovel(d.tier);
        } else {
          currentShovelTier = null;
          buildHeld(d.slot);
        }
      };
      window.addEventListener("bm-equip", equipHandler as EventListener);

      // ── Phoenix Mount & Flight Controls ──────────────────────────────────
      const mountPhoenixHandler = () => {
        if (!skyPhoenix) return;
        isRidingPhoenix = true;
        // Position player immediately on Phoenix saddle
        skyPhoenix.position.set(playerPos.x, playerPos.y + 0.5, playerPos.z);
        window.dispatchEvent(new CustomEvent("bm-phoenix-riding", { detail: true }));
      };
      const dismountPhoenixHandler = () => {
        isRidingPhoenix = false;
        phoenixVel.set(0, 0, 0);
        window.dispatchEvent(new CustomEvent("bm-phoenix-riding", { detail: false }));
      };
      const ascendStartHandler = () => {
        phoenixAscend = true;
      };
      const ascendEndHandler = () => {
        phoenixAscend = false;
      };
      const descendStartHandler = () => {
        phoenixDescend = true;
      };
      const descendEndHandler = () => {
        phoenixDescend = false;
      };

      window.addEventListener("bm-mount-phoenix", mountPhoenixHandler);
      window.addEventListener("bm-dismount-phoenix", dismountPhoenixHandler);
      window.addEventListener("bm-phoenix-ascend-start", ascendStartHandler);
      window.addEventListener("bm-phoenix-ascend-end", ascendEndHandler);
      window.addEventListener("bm-phoenix-descend-start", descendStartHandler);
      window.addEventListener("bm-phoenix-descend-end", descendEndHandler);

      const dpadMove = { up: false, down: false, left: false, right: false };
      const dpadHandler = (e: Event) => {
        const ce = e as CustomEvent<{ up?: boolean; down?: boolean; left?: boolean; right?: boolean }>;
        if (ce.detail) {
          if (typeof ce.detail.up === "boolean") dpadMove.up = ce.detail.up;
          if (typeof ce.detail.down === "boolean") dpadMove.down = ce.detail.down;
          if (typeof ce.detail.left === "boolean") dpadMove.left = ce.detail.left;
          if (typeof ce.detail.right === "boolean") dpadMove.right = ce.detail.right;
        }
      };
      window.addEventListener("bm-dpad", dpadHandler);

      const actionBtnHandler = () => {
        toggleCrouch();
      };
      window.addEventListener("bm-action-btn", actionBtnHandler);

      const fovChangeHandler = (e: Event) => {
        const val = (e as CustomEvent<number>).detail;
        if (typeof val === "number" && val >= 50 && val <= 100) {
          BASE_FOV = val;
          camera.fov = fovForAspect(BASE_FOV, camera.aspect);
          camera.updateProjectionMatrix();
        }
      };
      window.addEventListener("bm-fov", fovChangeHandler);

      let lastResizeW = 0;
      let lastResizeH = 0;
      function onResize() {
        const w = mount.clientWidth || window.innerWidth;
        const h = mount.clientHeight || window.innerHeight;
        if (w <= 0 || h <= 0) return;
        if (Math.abs(w - lastResizeW) < 1 && Math.abs(h - lastResizeH) < 1) return;
        lastResizeW = w;
        lastResizeH = h;
        const aspect = w / h;
        camera.aspect = aspect;
        camera.fov = fovForAspect(BASE_FOV, aspect);
        camera.updateProjectionMatrix();
        renderer.setPixelRatio(getTargetDpr(qualityPref));
        renderer.setSize(w, h, false);
        composer?.setSize(w, h);
        _invalidateShadows();
      }
      window.addEventListener("resize", onResize);
      const onOrientation = () => {
        setTimeout(onResize, 40);
        setTimeout(onResize, 150);
        setTimeout(onResize, 320);
      };
      window.addEventListener("orientationchange", onOrientation);
      screen.orientation?.addEventListener?.("change", onOrientation);
      let resizeObserver: ResizeObserver | null = null;
      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(() => onResize());
        resizeObserver.observe(mount);
      }

      const PR = 0.28;
      const PH = 1.7;
      function collides(px: number, py: number, pz: number) {
        // Clearance threshold on feet prevents standing on top of a block from
        // flagging the ground below as a body collision during horizontal movement.
        const minX = Math.ceil(px - PR + 0.01 - 0.5);
        const maxX = Math.floor(px + PR - 0.01 + 0.5);
        const minZ = Math.ceil(pz - PR + 0.01 - 0.5);
        const maxZ = Math.floor(pz + PR - 0.01 + 0.5);
        const minY = Math.ceil(py + 0.05 - 0.5);
        const maxY = Math.floor(py + PH - 0.05 + 0.5);
        for (let x = minX; x <= maxX; x++) {
          for (let z = minZ; z <= maxZ; z++) {
            for (let y = minY; y <= maxY; y++) {
              const b = blocks.get(key(x, y, z));
              if (b && b.type !== 6) return true;
            }
          }
        }
        return false;
      }
      // Slime block gameplay: what's directly under the player's feet at
      // landing, so we can bounce off type 19 (slime block) instead of just
      // stopping. Only checks straight down — same X/Z the player is already
      // standing on, one block below their resolved feet position.
      function blockTypeUnderfoot(px: number, py: number, pz: number): number | null {
        const b = blocks.get(key(Math.round(px), Math.round(py - 0.55), Math.round(pz)));
        return b ? b.type : null;
      }

      let raf = 0;
      let lastT = performance.now();
      curScale = RENDER_SCALE;
      let frameAccum = 0,
        frameCount = 0;
      let firstFrame = true;
      // Exponential moving-average of raw frame time — smooths out OS scheduling
      // jitter (±1-2ms spikes from timer resolution) so visual systems driven by
      // dt don't micro-stutter on otherwise-smooth hardware.
      let dtEma = -1;
      // Pre-allocated scratch vectors for bot AI — avoids a new THREE.Vector3()
      // allocation every tick which triggers GC on low-memory devices mid-game.
      const _botToPlayer = new THREE.Vector3();
      const _botKbDir = new THREE.Vector3();
      // Frame-budget guard: skip rendering when ahead of the target FPS.
      // 0 = unlimited (no cap). fpsPrefInit drives the initial value; the
      // bm-fpscap event updates it at runtime from the settings panel.
      let FRAME_BUDGET_MS =
        fpsPrefInit === "30" ? 1000 / 30 : fpsPrefInit === "max" ? 0 : 1000 / 62;
      const fpsCapHandler = (e: Event) => {
        const cap = (e as CustomEvent<string>).detail;
        FRAME_BUDGET_MS = cap === "30" ? 1000 / 30 : cap === "max" ? 0 : 1000 / 62;
      };
      window.addEventListener("bm-fpscap", fpsCapHandler);
      let particleTick = 0;
      let lastPresenceTime = 0;
      let shadowUpdateAcc = 0;
      // Last player position where the shadow-camera was updated (see sun tracking).
      let _lastSunX = playerPos.x,
        _lastSunZ = playerPos.z;

      function tick() {
        raf = requestAnimationFrame(tick);
        const now = performance.now();
        const elapsed = now - lastT;
        // Only clamp from above (prevent spiral-of-death on tab freeze/restore)
        if (FRAME_BUDGET_MS > 0 && elapsed < FRAME_BUDGET_MS - 1) return;
        const dtRaw = Math.min(0.05, elapsed / 1000);
        // EMA smooths ±1-2ms OS jitter without adding lag — α=0.18 gives ~5-frame
        // smoothing at 60fps which removes micro-stutter from scheduling noise
        // while still tracking genuine frame-rate changes within ~80ms.
        dtEma = dtEma < 0 ? dtRaw : dtEma * 0.82 + dtRaw * 0.18;
        // Physics uses raw dt so collision/gravity stay frame-accurate;
        // visual systems (camera, bob, FOV) use dtEma for jitter-free motion.
        const dt = dtRaw;
        const dtVis = dtEma;
        lastT = now;

        shadowUpdateAcc += dt;
        if (shadowUpdateAcc >= 1.0) {
          shadowUpdateAcc = 0;
          if (renderer) renderer.shadowMap.needsUpdate = true;
        }

        // Keep the sky dome centered on the camera so it never exits the far
        // plane (140 radius, camera far = 160). Without this, moving far from
        // world origin causes the sphere to drift outside the frustum → black sky.
        skyMesh.position.copy(camera.position);

        // Phoenix landmark & mount update (Soaring near the radiant Sun in Skyblock):
        if (isSkyblock && skyPhoenix) {
          if (!isRidingPhoenix) {
            const distToPhoenix = playerPos.distanceTo(skyPhoenix.position);
            const canMount = distToPhoenix < 14.0;
            window.dispatchEvent(new CustomEvent("bm-phoenix-near", { detail: canMount }));

            // Autonomous grand soaring flight further away across the vast sky:
            const flightT = now * 0.00018;
            const orbitR = 64 + Math.sin(flightT * 1.6) * 14;
            const flyX = celestialSunPos.x + Math.sin(flightT) * orbitR;
            const flyZ = celestialSunPos.z + Math.cos(flightT) * orbitR;
            const flyY = celestialSunPos.y + 10 + Math.sin(flightT * 2.0) * 12;

            const nextT = flightT + 0.015;
            const nextOrbitR = 64 + Math.sin(nextT * 1.6) * 14;
            const nextX = celestialSunPos.x + Math.sin(nextT) * nextOrbitR;
            const nextZ = celestialSunPos.z + Math.cos(nextT) * nextOrbitR;
            const nextY = celestialSunPos.y + 10 + Math.sin(nextT * 2.0) * 12;

            skyPhoenix.position.set(flyX, flyY, flyZ);
            skyPhoenix.lookAt(nextX, nextY, nextZ);

            // Dynamic bank roll based on curvature
            const roll = -Math.cos(flightT) * 0.42;
            skyPhoenix.rotateZ(roll);

            phoenixMixer?.update(dt * 1.15);
          }
        }

        // Skyblock Celestial Cycle (Sun, Moon & Aurora Borealis update):
        if (isSkyblock) {
          const isNight = nightModeRef.current;
          if (celestialSunGroup) celestialSunGroup.visible = !isNight;
          if (celestialMoonGroup) celestialMoonGroup.visible = isNight;
          if (auroraRibbonMesh) {
            auroraRibbonMesh.visible = isNight;
            if (isNight) {
              // Shimmering undulating aurora waves across the night sky
              const posAttr = auroraRibbonMesh.geometry.attributes.position;
              if (posAttr) {
                const arr = posAttr.array as Float32Array;
                for (let k = 0; k < arr.length; k += 6) {
                  const segIdx = k / 6;
                  const waveY = Math.sin(now * 0.002 + segIdx * 0.35) * 4.5;
                  const baseH = 95 + Math.sin((segIdx / 64) * Math.PI * 3.0) * 14 + waveY;
                  arr[k + 1] = baseH;
                  arr[k + 4] = baseH + 24;
                }
                posAttr.needsUpdate = true;
              }
              (auroraRibbonMesh.material as THREE.MeshBasicMaterial).opacity =
                0.58 + Math.sin(now * 0.0025) * 0.18;
            }
          }
          if (auroraLight) {
            auroraLight.intensity = isNight ? 0.48 + Math.sin(now * 0.002) * 0.12 : 0;
          }
          if (moonLight) {
            moonLight.intensity = isNight ? 0.9 : 0;
          }
          if (sun) {
            sun.intensity = isNight ? 0.2 : 1.35;
            sun.color.setHex(isNight ? 0x60a5fa : 0xfff8e8);
          }
          if (skyMat) {
            if (isNight) {
              skyMat.uniforms.top.value.setHex(0x050b18);
              skyMat.uniforms.mid.value.setHex(0x0a1628);
              skyMat.uniforms.bottom.value.setHex(0x0e2838);
            } else {
              skyMat.uniforms.top.value.setHex(0x126fbe);
              skyMat.uniforms.mid.value.setHex(0x42b9f3);
              skyMat.uniforms.bottom.value.setHex(0xb9edff);
            }
          }
        }

        // clouds drift
        cloudList.forEach((c, i) => {
          c.position.x += dt * (isSpleef ? 0.35 + (i % 3) * 0.08 : 0.6 + (i % 3) * 0.15);
          if (c.position.x > 100) c.position.x = -100;
        });
        // water shimmer / lava pulse — throttled to every 4 frames (still
        // perfectly smooth at 60fps; no need to update a material uniform 60×/s).
        if (particleTick % 4 === 0) {
          if (!isSpleef) mWater.opacity = 0.65 + Math.sin(now * 0.002) * 0.06;
          // Lava reads as the brightest light source at night.
          mLava.emissiveIntensity = nightModeRef.current
            ? 2.8 + Math.sin(now * 0.0022) * 0.9
            : 1.2 + Math.sin(now * 0.0022) * 0.7;
        }

        // Advance break particles once per frame (see spawnParticles).
        if (liveParticles.length) updateParticles(now);

        // Throttle ambient particle update to every other frame on mobile
        particleTick++;
        if (!isMobileUA || particleTick % 2 === 0) {
          const posAttr = ambientGeo.attributes.position as THREE.BufferAttribute;
          for (let i = 0; i < AMBIENT_COUNT; i++) {
            const fall = isSpleef ? ambientSpeed[i] * 1.4 : ambientSpeed[i] * 0.35;
            let py = posAttr.array[i * 3 + 1] - fall * dt;
            const px = posAttr.array[i * 3] + Math.sin(now * 0.0006 + i) * 0.01;
            if (py < -1) py = 14 + Math.random() * 4;
            posAttr.array[i * 3] = px;
            posAttr.array[i * 3 + 1] = py;
          }
          (ambientGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
        }
        ambientPoints.position.set(playerPos.x, 0, playerPos.z);

        // ── Spleef tick ────────────────────────────────────────────────────
        if (isSpleef) {
          const phase = sphaseRef.current;
          const frozen = sfrozenRef.current;

          // advance timer
          if (phase === "playing") {
            selapsedRef.current += dt;
            if ((selapsedRef.current | 0) !== ((selapsedRef.current - dt) | 0)) {
              setSelapsed(selapsedRef.current | 0);
              if (selapsedRef.current >= 240 && !sovertime) setSovertime(true);
            }
          }
        }

        // ── BedWars tick ───────────────────────────────────────────────────
        if (isBedwars && bwMatchActive) {
          // Rotate resource generators
          if (bwRedGenMesh) bwRedGenMesh.rotation.y += dt * 2.2;
          if (bwBlueGenMesh) bwBlueGenMesh.rotation.y += dt * 2.2;
          // Animate bot marker
          if (bwBotMesh) {
            const child0 = bwBotMesh.children[0];
            if (child0) child0.rotation.y = now * 0.001;
          }

          // Resource generation (iron every ~2s)
          bwIronTimer += dt;
          if (bwIronTimer >= 2.0 && bwRedBedAlive) {
            bwIronTimer = 0;
            setBwState((s) => ({ ...s, iron: s.iron + 1 }));
            // tiny particle burst at generator position
            spawnParticles(-20, 1.5, -4, 32);
          }

          // Check if blue bed was destroyed (player broke it via block removal near its position)
          if (bwBlueBedAlive && bwBlueBedMesh) {
            const bk = key(
              Math.round(bwBlueBedPos.x),
              Math.round(bwBlueBedPos.y),
              Math.round(bwBlueBedPos.z),
            );
            // Check if bed mesh is still visible (we track destruction separately)
            // Destruction happens via tapAction on the bed mesh itself
          }

          // Bot AI state machine
          if (botState === "dead") {
            botRespawnTimer -= dt;
            if (botRespawnTimer <= 0 && bwBlueBedAlive) {
              botHp = 20;
              bwBotHpBar?.set(20, 20);
              botState = "idle";
              botPos.set(114, 13, 0);
              if (bwBotMesh) {
                bwBotMesh.visible = true;
                bwBotMesh.position.copy(botPos);
              }
              setBwState((s) => ({ ...s, blueTeam: { ...s.blueTeam, playerAlive: true } }));
            }
          } else {
            const distToPlayer = botPos.distanceTo(playerPos);
            botAttackCooldown = Math.max(0, botAttackCooldown - dt);
            bwPlayerHitCooldown = Math.max(0, bwPlayerHitCooldown - dt);

            if (distToPlayer < 12) {
              botState = "chase";
            } else {
              botState = "idle";
            }

            if (botState === "chase") {
              // Move toward player — pre-allocated scratch vector avoids GC churn
              _botToPlayer.subVectors(playerPos, botPos).setY(0).normalize();
              const botSpeed = 2.8;
              botVel.x += (_botToPlayer.x * botSpeed - botVel.x) * Math.min(1, 8 * dt);
              botVel.z += (_botToPlayer.z * botSpeed - botVel.z) * Math.min(1, 8 * dt);
              botVel.y -= 20 * dt;
              const nbx = botPos.x + botVel.x * dt;
              const nbz = botPos.z + botVel.z * dt;
              let nby = botPos.y + botVel.y * dt;
              if (collides(nbx, nby, nbz)) {
                nby = Math.round(nby) + 0.5;
                botVel.y = 0;
              } else if (collides(nbx, nby - 0.06, nbz)) botVel.y = 0;
              botPos.set(nbx, nby, nbz);
              if (bwBotMesh) {
                bwBotMesh.position.copy(botPos);
                // Face player
                bwBotMesh.lookAt(playerPos.x, botPos.y, playerPos.z);
              }

              // Attack when close
              if (distToPlayer < 2.0 && botAttackCooldown <= 0) {
                botAttackCooldown = 1.2;
                if (bwPlayerHitCooldown <= 0) {
                  bwPlayerHitCooldown = 0.5;
                  damage(3);
                  // Small knockback from bot
                  _botKbDir.subVectors(playerPos, botPos).setY(0).normalize();
                  playerVel.x += _botKbDir.x * 5;
                  playerVel.y += 2;
                  playerVel.z += _botKbDir.z * 5;
                }
              }
            } else {
              // Idle: patrol near base
              botVel.x *= 0.85;
              botVel.z *= 0.85;
              botVel.y -= 20 * dt;
              const nbx = botPos.x + botVel.x * dt;
              const nbz = botPos.z + botVel.z * dt;
              let nby = botPos.y + botVel.y * dt;
              if (collides(nbx, nby, nbz)) {
                nby = Math.round(nby) + 0.5;
                botVel.y = 0;
              }
              botPos.set(nbx, nby, nbz);
              if (bwBotMesh) bwBotMesh.position.copy(botPos);
            }

            // NPC prompt: check if player near NPC in lobby phase (handled by lobby phase)
            // Also check if player is in range of bot for attack (player hits bot)
            // This is handled via tapAction when looking at bot
          }

          // Bot nameplate: project a point above the bot's head to screen space each frame
          const botPlate = bwBotNameplateRef.current;
          if (botPlate) {
            if (bwBotMesh && botState !== "dead") {
              const bAnchor = new THREE.Vector3(botPos.x, botPos.y + 2.4, botPos.z);
              const bProj = bAnchor.clone().project(camera);
              if (bProj.z < 1) {
                const bsx = (bProj.x * 0.5 + 0.5) * width;
                const bsy = (-bProj.y * 0.5 + 0.5) * height;
                botPlate.style.transform = `translate(-50%, -100%) translate(${bsx}px, ${bsy}px)`;
                botPlate.style.opacity = botPos.distanceTo(playerPos) < 38 ? "1" : "0";
              } else {
                botPlate.style.opacity = "0";
              }
            } else {
              botPlate.style.opacity = "0";
            }
          }

          // NPC proximity check (lobby)
        }
        if (isBedwars && !bwMatchActive && bwNpcMesh) {
          const distToNpc = playerPos.distanceTo(bwNpcMesh.position);
          const inRange = distToNpc < 3.2;
          // Gate: only call setState when the value actually changes so we
          // don't schedule 60 React updates/second when nothing is happening.
          if (inRange !== _bwNpcWasInRange) {
            _bwNpcWasInRange = inRange;
            setBwNpcPrompt(inRange);
          }

          const t = now * 0.001;
          const ud = bwNpcMesh.userData as Record<string, unknown>;
          const proximity = Math.max(0, 1 - distToNpc / 8); // 0 far, 1 close — drives glow/raise
          const breathe = Math.sin(t * 1.6) * 0.02;

          // Placeholder gentle bob while the model streams in.
          const placeholder = ud.placeholder as THREE.Mesh | undefined;
          if (placeholder) placeholder.position.y = 1.2 + Math.sin(t * 1.4) * 0.05;

          // Idle breathing + slight robe sway once the real model has loaded.
          const model = ud.model as THREE.Group | undefined;
          if (model) {
            if (model.userData.baseScaleY === undefined) model.userData.baseScaleY = model.scale.y;
            model.scale.y = model.userData.baseScaleY * (1 + breathe * 0.5);
            model.rotation.y = Math.sin(t * 0.35) * 0.05;
          }
          const robe = ud.robe as THREE.Object3D | undefined;
          if (robe) robe.rotation.z = Math.sin(t * 1.1) * 0.03;
          const armL = ud.armL as THREE.Object3D | undefined;
          const armR = ud.armR as THREE.Object3D | undefined;
          // Staff (held by the right arm) gently raises as the player approaches.
          if (armR) armR.rotation.x = -0.08 - proximity * 0.35 + Math.sin(t * 1.6) * 0.02;
          if (armL) armL.rotation.x = Math.sin(t * 1.3) * 0.03;
          const head = ud.head as THREE.Object3D | undefined;
          if (head) head.rotation.y = Math.sin(t * 0.5) * 0.12;

          // Staff glow brightens on approach.
          const staffLight = ud.staffLight as THREE.PointLight | undefined;
          if (staffLight) staffLight.intensity = 1.8 + Math.sin(t * 3) * 0.4 + proximity * 2.2;
          const glowSprite = ud.glowSprite as THREE.Sprite | undefined;
          if (glowSprite) {
            const s = 0.55 + Math.sin(t * 3) * 0.08 + proximity * 0.25;
            glowSprite.scale.setScalar(s);
          }

          // Particles gently orbiting the wizard.
          const particles = ud.particles as THREE.Points | undefined;
          if (particles) {
            const posAttr = particles.geometry.getAttribute("position") as THREE.BufferAttribute;
            const n = posAttr.count;
            for (let i = 0; i < n; i++) {
              const a = t * 0.6 + (i / n) * Math.PI * 2;
              const r = 0.9 + Math.sin(t * 0.8 + i) * 0.15;
              posAttr.setXYZ(
                i,
                Math.cos(a) * r,
                0.6 + Math.sin(t + i) * 0.5 + Math.sin(a * 2) * 0.2,
                Math.sin(a) * r,
              );
            }
            posAttr.needsUpdate = true;
          }

          // Nameplate: project the point above the wizard's head to screen
          // space and imperatively move the HTML overlay there — cheaper
          // than a React re-render every frame, and it billboards for free
          // since it's a flat DOM element.
          const plate = bwNameplateRef.current;
          if (plate) {
            const anchor = new THREE.Vector3(
              bwNpcMesh.position.x,
              bwNpcMesh.position.y + 3.6,
              bwNpcMesh.position.z,
            );
            const proj = anchor.clone().project(camera);
            if (proj.z < 1) {
              const sx = (proj.x * 0.5 + 0.5) * width;
              const sy = (-proj.y * 0.5 + 0.5) * height;
              plate.style.transform = `translate(-50%, -100%) translate(${sx}px, ${sy}px)`;
              plate.style.opacity = distToNpc < 24 ? "1" : "0";
            } else {
              plate.style.opacity = "0";
            }
          }
        }

        // ── EggWars tick ─────────────────────────────────────────────────────
        // React renders the scoreboard, while this shared loop owns the live
        // timers, resource generators, bot movement, and bot attacks.
        if (isEggwars && eggMatchActive) {
          for (const generator of eggGeneratorMeshes) {
            generator.rotation.y += dt * 2.2;
            generator.rotation.x += dt * 0.35;
          }

          eggSecondTimer += dt;
          if (eggSecondTimer >= 1) {
            const wholeSeconds = Math.floor(eggSecondTimer);
            eggSecondTimer -= wholeSeconds;
            setEggState((s) => ({ ...s, time: s.time + wholeSeconds }));
          }

          eggIronTimer += dt;
          eggGoldTimer += dt;
          eggDiamondTimer += dt;
          if (eggIronTimer >= 2) {
            eggIronTimer -= 2;
            setEggState((s) => ({ ...s, iron: s.iron + 1 }));
            spawnParticles(-24, 2.2, -4, 32);
          }
          if (eggGoldTimer >= 5) {
            eggGoldTimer -= 5;
            setEggState((s) => ({ ...s, gold: s.gold + 1 }));
            spawnParticles(24, 2.2, 4, 30);
          }
          if (eggDiamondTimer >= 10) {
            eggDiamondTimer -= 10;
            setEggState((s) => ({
              ...s,
              diamond: s.diamond + 1,
              generatorLevel: Math.min(3, 1 + Math.floor((s.diamond + 1) / 5)),
            }));
            spawnParticles(0, 2.4, 0, 31);
          }

          if (!eggBotAlive) {
            eggBotRespawnTimer -= dt;
            if (
              eggBotRespawnTimer <= 0 &&
              eggStateRef.current.teams.find((team) => team.id === "azure")?.eggAlive
            ) {
              eggBotAlive = true;
              eggBotHp = 20;
              eggBotHpBar?.set(20, 20);
              eggBotPos.set(23, 2.5, 0);
              eggBotVel.set(0, 0, 0);
              if (eggBotMesh) {
                eggBotMesh.visible = true;
                eggBotMesh.position.copy(eggBotPos);
              }
              setEggState((s) => ({
                ...s,
                teams: s.teams.map((team) =>
                  team.id === "azure" ? { ...team, playerAlive: true } : team,
                ),
              }));
              showEggToast("Azure has respawned.", 1200);
            }
          } else {
            const distToPlayer = eggBotPos.distanceTo(playerPos);
            eggBotAttackTimer = Math.max(0, eggBotAttackTimer - dt);
            if (distToPlayer < 16) {
              _botToPlayer.subVectors(playerPos, eggBotPos).setY(0);
              if (_botToPlayer.lengthSq() > 0.01) _botToPlayer.normalize();
              const botSpeed = 2.35;
              eggBotVel.x += (_botToPlayer.x * botSpeed - eggBotVel.x) * Math.min(1, 7 * dt);
              eggBotVel.z += (_botToPlayer.z * botSpeed - eggBotVel.z) * Math.min(1, 7 * dt);
              eggBotVel.y -= 20 * dt;
              const nextX = eggBotPos.x + eggBotVel.x * dt;
              const nextZ = eggBotPos.z + eggBotVel.z * dt;
              let nextY = eggBotPos.y + eggBotVel.y * dt;
              if (collides(nextX, nextY, nextZ)) {
                nextY = Math.round(nextY) + 0.5;
                eggBotVel.y = 0;
              } else if (collides(nextX, nextY - 0.06, nextZ)) {
                eggBotVel.y = 0;
              }
              eggBotPos.set(nextX, nextY, nextZ);
              if (eggBotMesh) {
                eggBotMesh.position.copy(eggBotPos);
                eggBotMesh.lookAt(playerPos.x, eggBotPos.y, playerPos.z);
              }
              if (distToPlayer < 2.1 && eggBotAttackTimer <= 0) {
                eggBotAttackTimer = 1.15;
                damage(3);
                _botKbDir.subVectors(playerPos, eggBotPos).setY(0);
                if (_botKbDir.lengthSq() > 0.01) _botKbDir.normalize();
                playerVel.x += _botKbDir.x * 4;
                playerVel.y += 1.5;
                playerVel.z += _botKbDir.z * 4;
              }
            } else {
              eggBotVel.x *= 0.86;
              eggBotVel.z *= 0.86;
              eggBotVel.y -= 20 * dt;
              const nextY = eggBotPos.y + eggBotVel.y * dt;
              if (collides(eggBotPos.x, nextY, eggBotPos.z)) {
                eggBotPos.y = Math.round(nextY) + 0.5;
                eggBotVel.y = 0;
              } else {
                eggBotPos.y = nextY;
              }
              if (eggBotMesh) eggBotMesh.position.copy(eggBotPos);
            }
          }
        }

        // ── SCP escape tick ───────────────────────────────────────────────────
        // Looking directly at SCP-069 is the trigger. Once alerted it keeps
        // pursuing through the corridor, with the model's authored animation
        // (when present) driven by the same loop as movement.
        if (isEscape) {
          escapeScpMixer?.update(dt);
          if (escapeScpMesh) {
            const toScp = _botToPlayer.subVectors(escapeScpPos, playerPos);
            const distance = toScp.length();
            toScp.normalize();
            camera.getWorldDirection(_lookDir);
            const inSight = distance < 34 && _lookDir.dot(toScp) > 0.72;
            if (!escapeScpAlerted && inSight) {
              escapeScpAlerted = true;
              showSbToast("SCP-069 is enraged. RUN!", 3200);
              playTone(110, 0.45, "sawtooth", 0.12, 42);
              haptic([40, 30, 80]);
            }
            if (escapeScpAlerted) {
              _botToPlayer.subVectors(playerPos, escapeScpPos).setY(0);
              if (_botToPlayer.lengthSq() > 0.01) _botToPlayer.normalize();
              const speed = 4.2;
              escapeScpVel.x += (_botToPlayer.x * speed - escapeScpVel.x) * Math.min(1, dt * 8);
              escapeScpVel.z += (_botToPlayer.z * speed - escapeScpVel.z) * Math.min(1, dt * 8);
              const nextX = escapeScpPos.x + escapeScpVel.x * dt;
              const nextZ = escapeScpPos.z + escapeScpVel.z * dt;
              if (!collides(nextX, escapeScpPos.y, nextZ)) {
                escapeScpPos.x = nextX;
                escapeScpPos.z = nextZ;
              }
              escapeScpMesh.position.copy(escapeScpPos);
              escapeScpMesh.lookAt(playerPos.x, escapeScpMesh.position.y, playerPos.z);
              escapeScpMesh.rotation.y += Math.sin(now * 0.018) * 0.004;
              if (distance < 1.7) {
                escapeScpDamageCooldown -= dt;
                if (escapeScpDamageCooldown <= 0) {
                  escapeScpDamageCooldown = 1.0;
                  damage(5);
                  showSbToast("SCP-069 caught you — keep moving!", 1500);
                }
              }
            }
          }
        }

        // ── BedWars arrows ────────────────────────────────────────────────────
        if (isBedwars) tickBwArrows(dt);

        // ── TNT Rush: storm fog + projectiles ─────────────────────────────────
        tickTntRush(dt);
        tickMagicCubes(dt);

        // ── Ambient lobby life: drifting clouds, floating dust, circling birds ──
        if (isBedwars && !bwMatchActive) {
          const t = now * 0.001;
          for (const cloud of bwCloudsRef.current) {
            cloud.position.x +=
              (cloud.userData.driftSpeed as number) * (cloud.userData.driftDir as number) * dt;
            if (Math.abs(cloud.position.x) > 40) cloud.position.x *= -0.95;
          }
          const ambient = bwAmbientRef.current;
          if (ambient) {
            const posAttr = ambient.geometry.getAttribute("position") as THREE.BufferAttribute;
            const n = posAttr.count;
            for (let i = 0; i < n; i++) {
              let y = posAttr.getY(i) + dt * 0.25;
              if (y > 7) y = 0;
              posAttr.setY(i, y);
              posAttr.setX(i, posAttr.getX(i) + Math.sin(t * 0.4 + i) * dt * 0.05);
            }
            posAttr.needsUpdate = true;
          }
          for (const bird of bwBirdsRef.current) {
            const r = bird.userData.orbitR as number;
            const oy = bird.userData.orbitY as number;
            const phase = bird.userData.orbitPhase as number;
            const speed = bird.userData.orbitSpeed as number;
            const a = t * speed + phase;
            bird.position.set(Math.cos(a) * r, oy + Math.sin(t * 2 + phase) * 0.5, Math.sin(a) * r);
            bird.rotation.y = -a + Math.PI / 2;
            bird.scale.y = 0.7 + Math.abs(Math.sin(t * 8 + phase)) * 0.6; // wing flap
          }
        }

        // Apply look momentum when no finger is active — camera glides to a stop
        // smoothly without micro-stutter or burst snaps on Android / mobile.
        if (lookId === -1 && (Math.abs(lookVelYaw) > 0.0001 || Math.abs(lookVelPitch) > 0.0001)) {
          const dtClamped = Math.min(dtVis, 0.033);
          camYaw += lookVelYaw * dtClamped;
          camPitch += lookVelPitch * dtClamped;
          camPitch = Math.max(-1.48, Math.min(1.48, camPitch));
          const decay = Math.pow(0.06, dtClamped * 60);
          lookVelYaw *= decay;
          lookVelPitch *= decay;
          if (Math.abs(lookVelYaw) < 0.00005) lookVelYaw = 0;
          if (Math.abs(lookVelPitch) < 0.00005) lookVelPitch = 0;
        }

        // Tick-down jump buffer and coyote timer
        jumpBufferMs = Math.max(0, jumpBufferMs - dt * 1000);
        coyoteMs = Math.max(0, coyoteMs - dt * 1000);

        const fwd = _fwd.set(-Math.sin(camYaw), 0, -Math.cos(camYaw));
        const right = _right.set(Math.cos(camYaw), 0, -Math.sin(camYaw));
        const move = _move.set(0, 0, 0);
        const frozen = isSpleef && sfrozenRef.current;
        const gameFrozen = frozen || (isEggwars && !eggMatchActive);
        if (joy.active && !gameFrozen) {
          const joyFwdMult = invertJoyYRef.current ? 1 : -1;
          const joyRightMult = invertJoyXRef.current ? -1 : 1;
          move.addScaledVector(fwd, joy.dy * joyFwdMult);
          move.addScaledVector(right, joy.dx * joyRightMult);
          if (move.lengthSq() > 0) move.normalize();
        }

        // Desktop keyboard WASD / Arrow keys + Mobile D-Pad movement
        let keyDx = 0;
        let keyDz = 0;
        if (keysPressed["KeyW"] || keysPressed["ArrowUp"] || dpadMove.up) keyDz -= 1;
        if (keysPressed["KeyS"] || keysPressed["ArrowDown"] || dpadMove.down) keyDz += 1;
        if (keysPressed["KeyA"] || keysPressed["ArrowLeft"] || dpadMove.left) keyDx -= 1;
        if (keysPressed["KeyD"] || keysPressed["ArrowRight"] || dpadMove.right) keyDx += 1;
        if ((keyDx !== 0 || keyDz !== 0) && !gameFrozen) {
          const kLen = Math.hypot(keyDx, keyDz);
          move.addScaledVector(fwd, -keyDz / kLen);
          move.addScaledVector(right, keyDx / kLen);
          if (move.lengthSq() > 0) move.normalize();
        }
        let isSprinting = false;
        if (isSkyblock && isRidingPhoenix && skyPhoenix) {
          // ── PHOENIX SOARING 3D FLIGHT PHYSICS (AERODYNAMIC & ULTRA-SMOOTH) ──
          const PHOENIX_CRUISE = 12.0;
          const PHOENIX_MAX = 28.0;
          const sinPitch = Math.sin(camPitch);
          const cosPitch = Math.cos(camPitch);

          let thrust = 0;
          if (keysPressed["KeyW"] || keysPressed["ArrowUp"] || dpadMove.up) thrust += 1;
          if (keysPressed["KeyS"] || keysPressed["ArrowDown"] || dpadMove.down) thrust -= 0.5;
          if (joy.active) {
            const joyFwdMult = invertJoyYRef.current ? 1 : -1;
            const joyRightMult = invertJoyXRef.current ? -1 : 1;
            thrust += -joy.dy * (joyFwdMult === -1 ? 1 : -1);
            strafe += joy.dx * (joyRightMult === 1 ? 1 : -1);
          }

          const flyFwd = new THREE.Vector3(
            -Math.sin(camYaw) * cosPitch,
            sinPitch,
            -Math.cos(camYaw) * cosPitch,
          ).normalize();
          const flyRight = new THREE.Vector3(Math.cos(camYaw), 0, -Math.sin(camYaw)).normalize();

          const targetVel = new THREE.Vector3();
          if (thrust > 0) {
            targetVel.addScaledVector(
              flyFwd,
              PHOENIX_CRUISE + thrust * (PHOENIX_MAX - PHOENIX_CRUISE),
            );
          } else if (thrust < 0) {
            targetVel.addScaledVector(flyFwd, thrust * (PHOENIX_CRUISE * 0.7));
          } else {
            // Gentle cruising glide forward even when idle
            targetVel.addScaledVector(flyFwd, PHOENIX_CRUISE * 0.5);
          }
          targetVel.addScaledVector(flyRight, strafe * (PHOENIX_MAX * 0.6));

          if (jumpQueued || jumpBufferMs > 0 || phoenixAscend) {
            targetVel.y += 16;
          }
          if (phoenixDescend || keysPressed["ShiftLeft"] || keysPressed["KeyC"]) {
            targetVel.y -= 16;
          }
          jumpQueued = false;
          jumpBufferMs = 0;

          // Smooth aerodynamic acceleration
          const flightAccel = 4.8;
          phoenixVel.lerp(targetVel, Math.min(1, flightAccel * dt));
          skyPhoenix.position.addScaledVector(phoenixVel, dt);

          // Smooth orientation using Quaternion slerp for realistic soaring & banking
          const lookDir =
            phoenixVel.lengthSq() > 0.5 ? phoenixVel.clone().normalize() : flyFwd.clone();
          const tempMatrix = new THREE.Matrix4();
          const targetLookPos = skyPhoenix.position.clone().add(lookDir);
          tempMatrix.lookAt(skyPhoenix.position, targetLookPos, new THREE.Vector3(0, 1, 0));
          const targetQuat = new THREE.Quaternion().setFromRotationMatrix(tempMatrix);

          // Dynamic banking roll based on strafe and turn
          const rollQuat = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 0, 1),
            -strafe * 0.4,
          );
          targetQuat.multiply(rollQuat);
          skyPhoenix.quaternion.slerp(targetQuat, Math.min(1, 6.5 * dt));

          // Smooth saddle attachment
          const saddleTarget = skyPhoenix.position.clone().add(new THREE.Vector3(0, 0.92, 0));
          playerPos.lerp(saddleTarget, Math.min(1, 24.0 * dt));
          playerVel.copy(phoenixVel);
          onGround = false;

          // Wing flapping cadence scales smoothly with airspeed
          const speed = phoenixVel.length();
          phoenixMixer?.update(dt * (0.85 + speed * 0.045));
        } else if (flyRef.current && !gameFrozen) {
          // ── Spectator fly mode — no gravity, no collision ──────────────
          const FLY_SPEED = 14;
          // Forward direction is fully 3D: factor in camera pitch so looking
          // up + pushing joystick forward actually flies you upward.
          const sinPitch = Math.sin(camPitch);
          const cosPitch = Math.cos(camPitch);
          const targetVx = move.x * cosPitch * FLY_SPEED;
          const targetVz = move.z * cosPitch * FLY_SPEED;
          // Vertical from pitch-tilt while moving, overridden by buttons
          let targetVy = joy.active
            ? (invertJoyYRef.current ? joy.dy : -joy.dy) * sinPitch * FLY_SPEED
            : 0;
          if (jumpQueued || jumpBufferMs > 0) targetVy = FLY_SPEED; // jump = fly up
          if (flyDownQueued) targetVy = -FLY_SPEED; // down btn = fly down
          jumpQueued = false;
          jumpBufferMs = 0;
          flyDownQueued = false;

          const flyAccel = 22;
          playerVel.x += (targetVx - playerVel.x) * Math.min(1, flyAccel * dt);
          playerVel.y += (targetVy - playerVel.y) * Math.min(1, flyAccel * dt);
          playerVel.z += (targetVz - playerVel.z) * Math.min(1, flyAccel * dt);
          playerPos.addScaledVector(playerVel, dt);
          onGround = false;
        } else {
          if (gameFrozen) {
            // EggWars is intentionally stationary during its lobby/countdown and
            // after a terminal result; gravity still resolves the player onto the
            // spawn island, but input cannot move or jump them out of the gate.
            jumpQueued = false;
            jumpBufferMs = 0;
            playerVel.x = 0;
            playerVel.z = 0;
          }
          const isCrouching = crouchRef.current || keysPressed["KeyC"];
          // Check active sprint state across mobile toggle, keyboard shortcuts, and joystick push
          isSprinting =
            !isCrouching &&
            (runRef.current ||
              keysPressed["ShiftLeft"] ||
              keysPressed["ShiftRight"] ||
              keysPressed["ControlLeft"] ||
              (joy.active && Math.hypot(joy.dx, joy.dy) > 0.82)) &&
            !gameFrozen;

          // Skyblock speed reduced significantly as requested (Kronos & Mel Al speed)
          const baseSpeed = isCrouching
            ? isSkyblock
              ? 1.1
              : 2.5
            : isSkyblock
              ? isSprinting
                ? 4.2
                : 2.2
              : isSprinting
                ? 8.8
                : isSpleef
                  ? 5.7
                  : 5.6;
          // Air control: agile and responsive for Skyblock / PvP bridging & combat
          const airK = onGround ? 1 : isSkyblock ? 0.92 : 0.45;
          const targetVx = gameFrozen ? 0 : move.x * baseSpeed * airK;
          const targetVz = gameFrozen ? 0 : move.z * baseSpeed * airK;
          // High ground accel = instant starts/stops. Air accel = agile steering in PvP.
          const accel = onGround ? (isSpleef ? 34 : 64) : isSkyblock ? 28 : 12;
          playerVel.x += (targetVx - playerVel.x) * Math.min(1, accel * dt);
          playerVel.z += (targetVz - playerVel.z) * Math.min(1, accel * dt);

          // Blockmango 2019-2020 arc: high gravity + high jump = punchy hop that peaks
          // quickly and falls fast — very satisfying on mobile.  Peak ≈ 1.8 blocks (11²/2×34 ≈ 1.78).
          playerVel.y -= 34 * dt;
          const wasAir = !onGround;
          // Buffer: pressing jump queues it for up to JUMP_BUFFER_MS ms
          if (jumpQueued) jumpBufferMs = JUMP_BUFFER_MS;
          jumpQueued = false;
          // Coyote time: still allowed to jump briefly after walking off ledge
          if (jumpBufferMs > 0 && (onGround || coyoteMs > 0)) {
            playerVel.y = 11.0; // Blockmango 2019-2020 punchy leap — tall, fast, satisfying
            onGround = false;
            coyoteMs = 0;
            jumpBufferMs = 0;
            playJump();
          }

          // Sub-step collision on Y when falling fast to prevent tunneling through floors.
          // X/Z movement is slow enough that single-step is fine; only gravity-accelerated
          // vertical motion can reach speeds that skip over 1-block-thick floors on mobile
          // where dt can spike above 50ms after a background tab or thermal throttle.
          const ySubSteps = Math.max(1, Math.ceil((Math.abs(playerVel.y) * dt) / 0.45));
          const yDt = dt / ySubSteps;

          let ny = playerPos.y;
          let nx = playerPos.x + playerVel.x * dt;
          if (collides(nx, ny, playerPos.z)) {
            // Step-up: if blocked horizontally on the ground, try stepping up ≤0.55 blocks
            // so the player glides over small lips without having to jump.
            const stepH = 0.55;
            if (onGround && !collides(nx, ny + stepH, playerPos.z)) {
              let sy = ny;
              while (sy < ny + stepH && collides(nx, sy, playerPos.z)) sy += 0.05;
              if (!collides(nx, sy, playerPos.z)) {
                ny = sy;
                playerPos.y = sy;
              } else {
                playerVel.x = 0;
                nx = playerPos.x;
              }
            } else {
              playerVel.x = 0;
              nx = playerPos.x;
            }
          }
          let nz = playerPos.z + playerVel.z * dt;
          if (collides(nx, ny, nz)) {
            // Same step-up logic for Z axis
            const stepH = 0.55;
            if (onGround && !collides(nx, ny + stepH, nz)) {
              let sy = ny;
              while (sy < ny + stepH && collides(nx, sy, nz)) sy += 0.05;
              if (!collides(nx, sy, nz)) {
                ny = sy;
                playerPos.y = sy;
              } else {
                playerVel.z = 0;
                nz = playerPos.z;
              }
            } else {
              playerVel.z = 0;
              nz = playerPos.z;
            }
          }

          // Y sub-step loop: resolves each slice independently so fast falls never
          // skip through a single block floor even on a slow/spiked frame.
          for (let s = 0; s < ySubSteps; s++) {
            ny += playerVel.y * yDt;
            if (playerVel.y <= 0) {
              if (collides(nx, ny, nz)) {
                const blockY = Math.round(ny - 0.45);
                ny = blockY + 0.5;
                const fallDist = fallStartY - ny;
                if (wasAir) {
                  landingKick = 1;
                  playLand(fallDist);
                }
                // Skyblock is an exploration/mining world, not a fall-damage
                // survival round. Keep the player safe while navigating shafts.
                if (fallDist > 4 && !isSpleef && !isSkyblock) damage(Math.floor(fallDist - 3) * 2);
                if (blockTypeUnderfoot(nx, ny, nz) === 19) {
                  playerVel.y = Math.max(6, fallDist * 2.2);
                  onGround = false;
                } else {
                  playerVel.y = 0;
                  onGround = true;
                }
                fallStartY = ny;
                break; // ground found — no more sub-steps needed
              } else {
                onGround = collides(nx, ny - 0.08, nz);
                if (onGround) {
                  const blockY = Math.round(ny - 0.5);
                  const topY = blockY + 0.5;
                  if (Math.abs(ny - topY) <= 0.12) {
                    ny = topY;
                  }
                  playerVel.y = 0;
                  fallStartY = ny;
                  break;
                }
              }
            } else {
              if (collides(nx, ny, nz)) {
                const ceilY = Math.round(ny + PH - 0.5);
                ny = ceilY - 0.5 - PH;
                playerVel.y = 0;
                break;
              }
              onGround = false;
            }
          }
          if (onGround && playerPos.y > fallStartY) fallStartY = playerPos.y;
          // Coyote time: if we just left the ground without jumping, open window
          if (wasAir && !onGround) {
            // was already airborne — nothing to start
          } else if (!wasAir && !onGround && playerVel.y <= 0) {
            coyoteMs = COYOTE_MS; // walked off ledge
          }
          playerPos.set(nx, ny, nz);
          // (token coin animation removed)
          if (isSpleef) {
            // Solo practice arena — no NPCs to play against, so falling into
            // the void just respawns you back on the platform.
            if (playerPos.y < -5 && sphaseRef.current === "playing") {
              respawn();
              setSlastElim("You fell in!");
              setTimeout(() => setSlastElim(null), 1800);
            }
          } else {
            // Skyblock's mine is intentionally far below the island. Keep its
            // lower cavern reachable; only respawn after falling well below both
            // the island and the mine.
            if (playerPos.y < (isSkyblock ? -225 : -20)) {
              if (!skyblockIsDying) triggerSkyblockDeath();
            }
          }
        } // end fly else

        if (skyblockIsDying) {
          playerVel.x *= Math.exp(-6 * dt);
          playerVel.z *= Math.exp(-6 * dt);
          playerVel.y = Math.max(-1.5, playerVel.y - 2 * dt);
          playerPos.y += playerVel.y * dt;
        }

        const moving = move.lengthSq() > 0 && onGround && !skyblockIsDying;
        const inAir = (!onGround || Math.abs(playerVel.y) > 2.0) && !skyblockIsDying;

        if (skyblockQblockMixer && !skyblockIsDying) {
          let targetWalk = 1;
          let targetBreathe = 0;
          let targetJump = 0;

          if (inAir && skyblockJumpAction) {
            targetJump = 1;
            targetWalk = 0.4;
          } else if (moving && skyblockWalkAction) {
            targetWalk = 1;
          } else {
            targetWalk = 1;
            targetBreathe = 0.2;
          }

          const blendFactor = 1 - Math.exp(-14 * dt);

          if (skyblockWalkAction) {
            const w = THREE.MathUtils.lerp(skyblockWalkAction.getEffectiveWeight(), targetWalk, blendFactor);
            skyblockWalkAction.setEffectiveWeight(w);
            skyblockWalkAction.setEffectiveTimeScale(isSprinting ? 1.45 : moving ? 1.0 : 0.85);
          }
          if (skyblockBreatheAction) {
            const w = THREE.MathUtils.lerp(skyblockBreatheAction.getEffectiveWeight(), targetBreathe, blendFactor);
            skyblockBreatheAction.setEffectiveWeight(w);
          }
          if (skyblockJumpAction) {
            const w = THREE.MathUtils.lerp(skyblockJumpAction.getEffectiveWeight(), targetJump, blendFactor);
            skyblockJumpAction.setEffectiveWeight(w);
          }
        }
        skyblockQblockMixer?.update(dt * (isSprinting ? 1.35 : 1.0));
        playerAvatar.root.visible = camModeRef.current === "third";
        playerAvatar.root.position.set(playerPos.x, playerPos.y, playerPos.z);
        if (moving) {
          playerAvatar.root.rotation.y = Math.atan2(move.x, move.z);
          // Lean forward slightly when sprinting for athletic posture
          playerAvatar.root.rotation.x = isSprinting ? 0.12 : 0.0;
          const gait = Math.sin(bobPhase * 1.55);
          const armAmp = isSprinting ? 0.95 : 0.65;
          const legAmp = isSprinting ? 1.05 : 0.75;
          playerAvatar.leftArm.rotation.x = gait * armAmp;
          playerAvatar.rightArm.rotation.x = -gait * armAmp;
          playerAvatar.leftLeg.rotation.x = -gait * legAmp;
          playerAvatar.rightLeg.rotation.x = gait * legAmp;
          playerAvatar.root.position.y += Math.abs(gait) * (isSprinting ? 0.075 : 0.048);
        } else {
          playerAvatar.root.rotation.y = camYaw + Math.PI;
          playerAvatar.root.rotation.x *= Math.max(0, 1 - dtVis * 8);
          playerAvatar.leftArm.rotation.x *= Math.max(0, 1 - dtVis * 8);
          playerAvatar.rightArm.rotation.x *= Math.max(0, 1 - dtVis * 8);
          playerAvatar.leftLeg.rotation.x *= Math.max(0, 1 - dtVis * 8);
          playerAvatar.rightLeg.rotation.x *= Math.max(0, 1 - dtVis * 8);
        }
        // Smooth camera and gait amplitude
        const targetBobAmp = moving ? (isSprinting ? 1.35 : 1.0) : 0;
        bobAmp += (targetBobAmp - bobAmp) * Math.min(1, dtVis * 10);
        bobPhase += dtVis * (moving ? (isSprinting ? 21.0 : 13.8) : 0);
        landingKick *= Math.pow(0.16, dtVis); // punchy, smooth landing recovery

        // Footstep cadence tied to actual movement speed/gait
        if (moving) {
          footstepAcc += dt;
          const stepPeriod = isSprinting ? 0.22 : 0.35;
          if (footstepAcc >= stepPeriod) {
            footstepAcc -= stepPeriod;
            playFootstep();
          }
        } else {
          footstepAcc = 0;
        }

        // Water liquid bob — gentle vertical oscillation when submerged
        const inWater = !isSpleef && playerPos.y <= WORLD_WATER_LEVEL + 0.6;
        const waterBob = inWater ? Math.sin(now * 0.0024) * 0.07 : 0;

        // Multi-harmonic head bobbing:
        // 1. Vertical bob (double frequency for 2 footfalls per cycle):
        const swayVertical = isSkyblock
          ? 0
          : Math.sin(bobPhase * 2) * (isSprinting ? 0.052 : 0.032) * bobAmp;
        // 2. Lateral sway (single frequency across left-right gait):
        const swayHorizontal = isSkyblock
          ? 0
          : Math.cos(bobPhase) * (isSprinting ? 0.04 : 0.022) * bobAmp;
        // 3. Dynamic camera roll/tilt into stride:
        const swayRoll = isSkyblock
          ? 0
          : Math.sin(bobPhase) * (isSprinting ? 0.024 : 0.012) * bobAmp;
        // 4. Subtle idle breathing when stationary:
        const idleBreathe = (1 - Math.min(1, bobAmp)) * Math.sin(now * 0.0018) * 0.006;

        const targetEyeY =
          playerPos.y + 1.62 + swayVertical + idleBreathe - landingKick * 0.075 + waterBob;
        if (smoothEyeY < 0) smoothEyeY = targetEyeY;
        else smoothEyeY += (targetEyeY - smoothEyeY) * Math.min(1, dtVis * 26);

        // Silky smooth camera orientation damping (frame-rate independent)
        const camRotRate = isSkyblock ? 20 : 26;
        const camRotAlpha = 1 - Math.exp(-camRotRate * dtVis);
        smoothCamYaw += (camYaw - smoothCamYaw) * camRotAlpha;
        smoothCamPitch += (camPitch - smoothCamPitch) * camRotAlpha;

        // Local camera right vector for accurate lateral head sway in any movement direction
        const camRightX = Math.cos(smoothCamYaw);
        const camRightZ = -Math.sin(smoothCamYaw);
        const swayPosX = camRightX * swayHorizontal;
        const swayPosZ = camRightZ * swayHorizontal;

        const lookDir = _lookDir.set(
          -Math.sin(smoothCamYaw) * Math.cos(smoothCamPitch),
          Math.sin(smoothCamPitch),
          -Math.cos(smoothCamYaw) * Math.cos(smoothCamPitch),
        );

        if (camModeRef.current === "third") {
          const isLandscape = camera.aspect >= 1.2;
          // Spacious, comfortable third-person distance:
          // In landscape on Samsung, iPhone, and mobile devices (aspect >= 1.2),
          // pulled back to 4.1m (4.45m sprint) so the character does not dominate the screen.
          // In portrait, 3.8m (4.15m sprint).
          const targetDist = isLandscape
            ? (isSprinting ? 4.45 : 4.1)
            : (isSprinting ? 4.15 : 3.8);

          // Pivot point at player's upper chest (~1.42m above feet)
          const pivotY = playerPos.y + 1.42;

          // Orbital camera positioning using yaw and pitch:
          const pitchCos = Math.cos(smoothCamPitch);
          const camBackX = Math.sin(smoothCamYaw) * pitchCos;
          const camBackY = -Math.sin(smoothCamPitch);
          const camBackZ = Math.cos(smoothCamYaw) * pitchCos;

          // Camera position behind the player with comfortable floor clearance
          const wantedX = playerPos.x + camBackX * targetDist;
          const wantedY = Math.max(playerPos.y + 0.35, pivotY + camBackY * targetDist + 0.28);
          const wantedZ = playerPos.z + camBackZ * targetDist;

          _thirdCamPos.set(wantedX, wantedY, wantedZ);
          camera.position.lerp(_thirdCamPos, 1 - Math.exp(-16 * dtVis));
          camera.lookAt(playerPos.x, pivotY, playerPos.z);
          heldGroup.visible = false;
        } else if (camModeRef.current === "top") {
          // Top-down overhead camera — fixed height above player, straight down
          const TOP_HEIGHT = 14.0;
          camera.position.set(playerPos.x, playerPos.y + TOP_HEIGHT, playerPos.z);
          camera.lookAt(playerPos.x, playerPos.y, playerPos.z);
          heldGroup.visible = false;
        } else {
          // First-person: subtle position damping to eliminate micro-step stutter
          const targetCamX = playerPos.x + swayPosX;
          const targetCamY = smoothEyeY;
          const targetCamZ = playerPos.z + swayPosZ;
          const camPosAlpha = 1 - Math.exp((isSkyblock ? -24 : -32) * dtVis);
          camera.position.x += (targetCamX - camera.position.x) * camPosAlpha;
          camera.position.y += (targetCamY - camera.position.y) * camPosAlpha;
          camera.position.z += (targetCamZ - camera.position.z) * camPosAlpha;
          camera.lookAt(_lookTarget.copy(camera.position).add(lookDir));
          if (Math.abs(swayRoll) > 0.0001) {
            camera.rotateZ(swayRoll);
          }
          heldGroup.visible = true;
        }
        // Sprint FOV zoom — dynamic elastic push that conveys high speed
        const baseFov = fovForAspect(BASE_FOV, camera.aspect);
        if (smoothFov < 1) smoothFov = baseFov;
        const targetFov = baseFov + (isSprinting && moving ? 7.5 : 0);
        smoothFov += (targetFov - smoothFov) * Math.min(1, dtVis * 15);
        if (Math.abs(camera.fov - smoothFov) > 0.05) {
          camera.fov = smoothFov;
          camera.updateProjectionMatrix();
        }
        // Sun follows player — but only update the shadow camera when the player
        // has moved more than 2 units from the last update position. Moving the
        // sun target every frame forces Three.js to re-render the shadow map
        // Realistic dynamic lighting: sun and target follow player smoothly
        sun.position.set(
          playerPos.x + (isSkyblock ? 28 : 34),
          playerPos.y + (isSkyblock ? 48 : 60),
          playerPos.z + (isSkyblock ? 18 : 22),
        );
        sun.target.position.set(playerPos.x, playerPos.y, playerPos.z);

        if (heldMesh) {
          // Ease the raw 0→1 hold progress toward a lagged copy instead of
          // driving the pose from it directly — this is what actually removes
          // the pop when a swing starts/stops or restarts on a new block, and
          // is the main thing that reads as "jerky" vs. "smooth".
          digPhaseSmooth += (digPhase - digPhaseSmooth) * Math.min(1, dtVis * 16);

          const swordIdleSway = isSkyblock ? Math.sin(now * 0.0018) : 0;
          // Lissajous curve for held item bobbing matching camera stride
          const bx =
            heldBasePos.x +
            Math.cos(bobPhase) * (isSprinting ? 0.026 : 0.016) * bobAmp +
            swordIdleSway * 0.008;
          const by =
            heldBasePos.y +
            Math.sin(bobPhase * 2) * (isSprinting ? 0.014 : 0.008) * bobAmp +
            Math.cos(now * 0.0018) * 0.006;
          let bz = heldBasePos.z + (isSprinting ? -0.03 : 0) * bobAmp + destroyAnim * 0.06;
          let swingPitch = 0;
          let swingYaw = 0;
          const swingRoll = 0;
          {
            // Digging swing: wind up and back, then chop forward/down as the
            // hold completes — synced to the break progress itself rather
            // than a free-running loop, so a fast Spleef break (150ms) and a
            // slow Engine Test break (500ms) each show one full swing that
            // lands exactly when the block actually breaks. Driven by the
            // smoothed phase so it eases in/out cleanly instead of cutting.
            const dp = digPhaseSmooth;
            const wind = Math.sin(Math.min(1, dp) * Math.PI); // 0 → 1 → 0 across the hold
            const chop = Math.pow(Math.min(1, dp), 2.2); // eases into the forward strike
            swingPitch = -wind * 0.55 - chop * 0.25;
            swingYaw = wind * 0.18;
            bz += chop * 0.14 - wind * 0.03;
          }
          if (!holding) digPhase = 0;

          const targetPos = _heldTargetPos.set(bx, by + placeAnim * -0.08, bz);
          const targetRot = _heldTargetRot.set(
            heldBaseRot.x + swingPitch + (isSprinting ? 0.08 : 0) + swordIdleSway * 0.025,
            heldBaseRot.y + swingYaw + swordIdleSway * 0.018,
            heldBaseRot.z + swingRoll + destroyAnim * 0.35,
          );
          if (!heldPosSmooth) {
            heldPosSmooth = targetPos.clone();
            heldRotSmooth = targetRot.clone();
          } else {
            // Lerp/slerp the visible transform toward the target each frame —
            // a small critically-damped follow rather than an instant set —
            // so even fast state changes (recoil kicks, swing start) read as
            // fluid motion instead of single-frame snaps.
            const followRate = Math.min(1, dtVis * 28);
            heldPosSmooth.lerp(targetPos, followRate);
            const qTarget = _qTarget.setFromEuler(targetRot);
            const qCurrent = _qCurrent.setFromEuler(heldRotSmooth!);
            qCurrent.slerp(qTarget, followRate);
            heldRotSmooth!.setFromQuaternion(qCurrent);
          }
          heldMesh.position.copy(heldPosSmooth);
          heldMesh.rotation.copy(heldRotSmooth!);
          placeAnim *= 0.82;
          destroyAnim *= 0.82;

          if (scytheMixer) {
            if (holding || digPhase > 0) {
              if (scytheAction && !scytheAction.isRunning()) {
                scytheAction.reset().play();
              }
              scytheMixer.update(dtVis * 1.5);
            } else if (scytheAction?.isRunning()) {
              scytheMixer.update(dtVis * 1.5);
            }
          }
        }

        // Block selection outline disabled — clean, borderless look.
        outline.visible = false;
        const { position: targetPos } = getTargetBlock();

        if (holding && holdMoved <= 6) {
          const isVisitingOther =
            isSkyblock &&
            !!visitingUserId &&
            visitingUserId !== qbUser?.uid &&
            visitingUserId !== qbUser?.islandId;
          if (isVisitingOther) {
            holding = false;
            breakOverlay.visible = false;
            updateHoldProgress(0);
            showSbToast("You cannot break, only your island you can break now", 3500);
          } else {
            const t = targetPos;
            if (
              !t ||
              !holdTarget ||
              t.x !== holdTarget.x ||
              t.y !== holdTarget.y ||
              t.z !== holdTarget.z
            ) {
              holding = false;
              breakOverlay.visible = false;
              updateHoldProgress(0);
            } else {
              const elapsed = now - holdStart;
              if (elapsed > 120) {
                const pct = Math.min(1, (elapsed - 120) / (HOLD_MS - 120));
                digPhase = pct;
                updateHoldProgress(pct);
                breakOverlay.visible = true;
                breakOverlay.position.copy(t);

                // Real progressive breaking crack textures
                const stage = Math.min(9, Math.floor(pct * 10));
                if (crackTextures[stage]) {
                  breakMat.map = crackTextures[stage];
                  breakMat.opacity = 0.95;
                  breakMat.transparent = true;
                  breakMat.needsUpdate = true;
                } else {
                  breakMat.opacity = 0.15 + 0.55 * pct;
                }

                // Rhythmic hit sounds during breaking for satisfying game feel
                if (Math.floor(elapsed / 160) !== Math.floor((elapsed - dt * 1000) / 160)) {
                  const targetBlock = blocks.get(key(t.x, t.y, t.z));
                  const blockName =
                    targetBlock && "type" in targetBlock && targetBlock.type < BLOCKS.length
                      ? BLOCKS[targetBlock.type]?.name
                      : "stone";
                  GameAudio.playHit(blockName);
                }

                if (pct >= 1) {
                  completeAction();
                  holding = false;
                  holdTarget = null;
                  digPhase = 0;
                  breakOverlay.visible = false;
                  updateHoldProgress(0);
                }
              } else {
                breakOverlay.visible = false;
                updateHoldProgress(0);
              }
            }
          }
        } else {
          breakOverlay.visible = false;
          updateHoldProgress(0);
        }

        // Engine v5: drive wave water + sky shader uniforms
        const t001 = now * 0.001;
        if (waterMatRef) {
          waterMatRef.uniforms.uTime.value = t001;
          waterMatRef.uniforms.uCamPos.value.copy(camera.position);
        }
        if (skyMatRef) {
          skyMatRef.uniforms.uTime.value = t001;
        }

        // Engine v5: animal wander AI + leg-swing animation
        for (const a of animalEntities) {
          a.wanderTimer -= dt;
          if (a.wanderTimer <= 0) {
            a.isMoving = !a.isMoving;
            a.wanderTimer = a.isMoving ? 2 + Math.random() * 3 : 1 + Math.random() * 3;
            if (a.isMoving) a.wanderDir = Math.random() * Math.PI * 2;
          }
          // Nudge back home if strayed > 8 blocks
          const ddx = a.group.position.x - a.home.x;
          const ddz = a.group.position.z - a.home.z;
          if (ddx * ddx + ddz * ddz > 64) {
            a.wanderDir = Math.atan2(-ddx, -ddz) + (Math.random() - 0.5) * 0.4;
          }
          if (a.isMoving) {
            const spd = a.legs.length === 2 ? 1.2 : 1.7; // chickens slower
            a.group.position.x += Math.sin(a.wanderDir) * spd * dt;
            a.group.position.z += Math.cos(a.wanderDir) * spd * dt;
            a.group.rotation.y = a.wanderDir + Math.PI;
            a.walkPhase += dt * 9;
            const swing = Math.sin(a.walkPhase) * 0.42;
            if (a.legs.length >= 4) {
              (a.legs[0] as THREE.Mesh).rotation.x = swing;
              (a.legs[1] as THREE.Mesh).rotation.x = -swing;
              (a.legs[2] as THREE.Mesh).rotation.x = -swing;
              (a.legs[3] as THREE.Mesh).rotation.x = swing;
            } else {
              (a.legs[0] as THREE.Mesh).rotation.x = swing * 0.7;
              (a.legs[1] as THREE.Mesh).rotation.x = -swing * 0.7;
            }
            // Walk bob
            a.group.position.y = a.home.y + Math.abs(Math.sin(a.walkPhase * 2)) * 0.05;
          } else {
            // Idle: gentle head bob
            (a.head as THREE.Mesh).rotation.x = Math.sin(now * 0.0008 + a.walkPhase) * 0.1;
            // Settle back to home Y
            a.group.position.y += (a.home.y - a.group.position.y) * Math.min(1, dt * 5);
          }
        }

        // ── Animate White Block Break Flashes (0.1s duration, matte non-glossy) ──
        for (let fi = whiteFlashes.length - 1; fi >= 0; fi--) {
          const flash = whiteFlashes[fi];
          const elapsed = now - flash.start;
          if (elapsed >= flash.dur) {
            scene.remove(flash.mesh);
            (flash.mesh.material as THREE.Material)?.dispose?.();
            whiteFlashes.splice(fi, 1);
          } else {
            (flash.mesh.material as THREE.MeshBasicMaterial).opacity = 0.92;
          }
        }

        // ── Advance Tree Physics & Popped Block Pieces ──
        updateTreePhysicsAndPoppedBlocks(now, dt);

        // Skyblock Multiplayer: broadcast position and animate other players
        if (isSkyblock && qbUser?.uid) {
          if (now - lastPresenceTime > 120) {
            lastPresenceTime = now;
            updatePlayerPresence({
              uid: qbUser.uid,
              name: qbUser.displayName || qbUser.username || "Player",
              x: playerPos.x,
              y: playerPos.y,
              z: playerPos.z,
              rotY: camYaw,
              islandId: currentSkyblockIslandId,
              profilePhoto: qbUser.profilePhoto,
              avatarSnapshot: qbUser.avatarSnapshot,
            });
          }
        }

        for (const [pUid, pMesh] of remotePlayerMeshes) {
          const target = remotePlayersTarget.get(pUid);
          if (target) {
            pMesh.position.x += (target.x - pMesh.position.x) * Math.min(1, dt * 10);
            pMesh.position.y += (target.y - pMesh.position.y) * Math.min(1, dt * 10);
            pMesh.position.z += (target.z - pMesh.position.z) * Math.min(1, dt * 10);
            pMesh.rotation.y = target.rotY;

            const speed = Math.hypot(target.x - pMesh.position.x, target.z - pMesh.position.z);
            if (speed > 0.01) {
              target.walkPhase = (target.walkPhase || 0) + dt * 10;
              const swing = Math.sin(target.walkPhase) * 0.45;
              const leftArm = pMesh.getObjectByName("leftArm");
              const rightArm = pMesh.getObjectByName("rightArm");
              const leftLeg = pMesh.getObjectByName("leftLeg");
              const rightLeg = pMesh.getObjectByName("rightLeg");
              if (leftArm) leftArm.rotation.x = -swing;
              if (rightArm) rightArm.rotation.x = swing;
              if (leftLeg) leftLeg.rotation.x = swing;
              if (rightLeg) rightLeg.rotation.x = -swing;
            }
          }
        }

        if (composer) composer.render();
        else renderer.render(scene, camera);
        if (firstFrame) {
          firstFrame = false;
          const tryReady = () => {
            if (shovelReady && mapLoaded) {
              setWorldReady(true);
              setSkyblockLoadingDone(true);
            }
          };
          onShovelReady = tryReady;
          onMapLoaded = tryReady;
          tryReady();
          // Safety timeout to guarantee the game is fully unlocked and ready on mobile
          setTimeout(() => {
            shovelReady = true;
            mapLoaded = true;
            setWorldReady(true);
            setSkyblockLoadingDone(true);
          }, 300);
        }

        frameAccum += dt;
        frameCount++;
        // Sample twice as often (0.5s vs 1s) so the dynamic-resolution ramp
        // reacts to dips almost immediately instead of a full second late —
        // that lag was the main source of visible "stutter then catch-up".
        if (frameAccum > 0.5) {
          const fps = frameCount / frameAccum;
          // Mobile gets a lower DRS floor (0.38) so the renderer can shed pixels
          // aggressively on low-end GPUs. Desktop keeps 0.55 as the floor since
          // it typically has more headroom and a lower DPR to begin with.
          // High quality intentionally skips dynamic resolution scaling — it's
          // the tier players pick specifically to keep full, crisp resolution,
          // and silently dropping pixels under load was the main source of
          // "why does it suddenly look pixelated" reports. Low/medium still
          // scale down to protect frame rate on weaker hardware.
          const DRS_FLOOR = isMobileUA ? 0.8 : 0.85;
          if (qualityPref !== "high" && qualityPref !== "uhd") {
            if (fps < 52 && curScale > DRS_FLOOR) {
              // Drop faster (0.12 step) when behind; recover slower (0.05) so it
              // doesn't immediately overshoot back up and cause visible oscillation.
              curScale = Math.max(DRS_FLOOR, curScale - 0.12);
              renderer.setPixelRatio(Math.min(baseDpr, MAX_DPR) * curScale);
            } else if (fps > 58 && curScale < RENDER_SCALE) {
              curScale = Math.min(RENDER_SCALE, curScale + 0.05);
              renderer.setPixelRatio(Math.min(baseDpr, MAX_DPR) * curScale);
            }
          }
          frameAccum = 0;
          frameCount = 0;
        }
      }
      // ── Post-worldgen occlusion pass ─────────────────────────────────────────
      // Now that ALL blocks are placed we can identify every interior block
      // (one fully surrounded by solid neighbours on all 6 faces) and pull it
      // out of the InstancedMesh. This is the single biggest geometry reduction
      // in a voxel engine — typical terrain has 60-80% of blocks buried with no
      // visible face, so this cuts vertex/fragment work by the same fraction.
      _worldGenPhase = false;
      {
        const toHide: [number, number, number][] = [];
        for (const [k, b] of blocks) {
          if (!("index" in b) || !isOccluder(b.type)) continue;
          const [xs, ys, zs] = k.split(",");
          const bx = +xs,
            by = +ys,
            bz = +zs;
          if (isFullyOccluded(bx, by, bz)) toHide.push([bx, by, bz]);
        }
        for (const [bx, by, bz] of toHide) _hideInstancedBlock(bx, by, bz);
      }
      _invalidateShadows();
      // Build the raycast targets list once after all world blocks are placed.
      rebuildRaycastTargets();

      // ── Decorative grass-tuft / flower cross-quads ──────────────────────────
      // Cheap "organic foliage" pass, run once after every world-gen branch
      // above has finished: scans every placed grass block (type 0) with open
      // air above it and scatters cross-quad billboards (two crossed planes,
      // the classic tall-grass technique) on a sparse fraction of them.
      // Deliberately NOT added to `blocks`/`groups` — purely decorative, so it
      // never shows up in raycasting/mining and can't desync world state.
      // (Known tradeoff: mining the grass block underneath leaves the tuft
      // floating rather than popping it off — acceptable for a first pass.)
      if (!isSkyblock) {
        type DecorSpot = { x: number; y: number; z: number };
        const spotsByVariant: DecorSpot[][] = [[], [], [], []]; // tuft-a, tuft-b, flower-yellow, flower-pink
        for (const [k, b] of blocks) {
          if (b.type !== 0) continue; // grass only
          const [xs, ys, zs] = k.split(",");
          const bx = +xs,
            by = +ys,
            bz = +zs;
          if (blocks.has(key(bx, by + 1, bz))) continue; // covered — no room
          if (Math.random() > 0.18) continue; // sparse scatter (~18% of open grass)
          const r2 = Math.random();
          const variant = r2 < 0.45 ? 0 : r2 < 0.8 ? 1 : r2 < 0.93 ? 2 : 3;
          spotsByVariant[variant].push({ x: bx, y: by + 1, z: bz });
        }

        function paintTuftTexture(cols: [string, string]): THREE.CanvasTexture {
          const S = 64;
          const c = document.createElement("canvas");
          c.width = c.height = S;
          const ctx = c.getContext("2d")!;
          for (let i = 0; i < 5; i++) {
            const bx = S * (0.12 + (i / 4) * 0.76);
            const bend = (Math.random() - 0.5) * 12;
            const topY = S * (0.06 + Math.random() * 0.14);
            ctx.strokeStyle = cols[i % 2];
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(bx, S);
            ctx.quadraticCurveTo(bx + bend * 0.5, S * 0.5, bx + bend, topY);
            ctx.stroke();
          }
          const tex = new THREE.CanvasTexture(c);
          tex.magFilter = THREE.LinearFilter;
          tex.minFilter = THREE.LinearMipmapLinearFilter;
          tex.generateMipmaps = true;
          tex.colorSpace = THREE.SRGBColorSpace;
          return tex;
        }
        function paintFlowerTexture(petal: string, center: string): THREE.CanvasTexture {
          const S = 64;
          const c = document.createElement("canvas");
          c.width = c.height = S;
          const ctx = c.getContext("2d")!;
          ctx.strokeStyle = "#3fae1c";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(S * 0.28, S);
          ctx.lineTo(S * 0.24, S * 0.5);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(S * 0.72, S);
          ctx.lineTo(S * 0.76, S * 0.5);
          ctx.stroke();
          ctx.strokeStyle = "#2f8f16";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(S * 0.5, S);
          ctx.lineTo(S * 0.5, S * 0.42);
          ctx.stroke();
          const fx = S * 0.5,
            fy = S * 0.3;
          ctx.fillStyle = petal;
          for (const [dx, dy] of [
            [-6, 0],
            [6, 0],
            [0, -6],
            [0, 6],
          ] as const) {
            ctx.beginPath();
            ctx.ellipse(fx + dx, fy + dy, 4, 3, Math.atan2(dy, dx), 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = center;
          ctx.beginPath();
          ctx.arc(fx, fy, 3.2, 0, Math.PI * 2);
          ctx.fill();
          const tex = new THREE.CanvasTexture(c);
          tex.magFilter = THREE.LinearFilter;
          tex.minFilter = THREE.LinearMipmapLinearFilter;
          tex.generateMipmaps = true;
          tex.colorSpace = THREE.SRGBColorSpace;
          return tex;
        }

        const decorDefs: { tex: THREE.CanvasTexture }[] = [
          { tex: paintTuftTexture(["#57c92c", "#6fdb3f"]) },
          { tex: paintTuftTexture(["#2f8f16", "#3fae1c"]) },
          { tex: paintFlowerTexture("#ffe066", "#e8890c") },
          { tex: paintFlowerTexture("#ff7ec9", "#ffe066") },
        ];

        for (let v = 0; v < 4; v++) {
          const spots = spotsByVariant[v];
          if (spots.length === 0) {
            decorDefs[v].tex.dispose();
            continue;
          }
          const geo = new THREE.PlaneGeometry(0.85, 0.85);
          geo.translate(0, 0.425, 0); // pivot at bottom so y sits on the block top
          const mat = new THREE.MeshLambertMaterial({
            map: decorDefs[v].tex,
            transparent: true,
            alphaTest: 0.5,
            side: THREE.DoubleSide,
          });
          const mesh = new THREE.InstancedMesh(geo, mat, spots.length * 2);
          mesh.castShadow = false;
          mesh.receiveShadow = true;
          for (let i = 0; i < spots.length; i++) {
            const { x: sx, y: sy, z: sz } = spots[i];
            const wobble = Math.sin(sx * 91.7 + sz * 13.3) * 0.18;
            dummyObj.position.set(sx, sy, sz);
            dummyObj.scale.setScalar(1);
            dummyObj.rotation.set(0, wobble, 0);
            dummyObj.updateMatrix();
            mesh.setMatrixAt(i * 2, dummyObj.matrix);
            dummyObj.rotation.set(0, wobble + Math.PI / 2, 0);
            dummyObj.updateMatrix();
            mesh.setMatrixAt(i * 2 + 1, dummyObj.matrix);
          }
          dummyObj.rotation.set(0, 0, 0); // reset shared dummy for later callers
          mesh.count = spots.length * 2;
          mesh.instanceMatrix.needsUpdate = true;
          scene.add(mesh);
          decorMeshes.push(mesh);
          decorGeos.push(geo);
          decorMats.push(mat);
        }
      }

      raf = requestAnimationFrame(tick);

      return () => {
        disposed = true;
        cancelAnimationFrame(raf);
        resizeObserver?.disconnect();
        window.removeEventListener("resize", onResize);
        window.removeEventListener("orientationchange", onOrientation);
        screen.orientation?.removeEventListener?.("change", onOrientation);
        window.removeEventListener("bm-fov", fovChangeHandler);
        window.removeEventListener("bm-jump", jumpHandler);
        window.removeEventListener("bm-magic-cube", magicCubeHandler);
        window.removeEventListener("bm-fly-down", flyDownHandler);
        window.removeEventListener("bm-slot", slotHandler as EventListener);
        window.removeEventListener("bm-equip", equipHandler as EventListener);
        window.removeEventListener("bm-mount-phoenix", mountPhoenixHandler);
        window.removeEventListener("bm-dismount-phoenix", dismountPhoenixHandler);
        window.removeEventListener("bm-phoenix-ascend-start", ascendStartHandler);
        window.removeEventListener("bm-phoenix-ascend-end", ascendEndHandler);
        window.removeEventListener("bm-phoenix-descend-start", descendStartHandler);
        window.removeEventListener("bm-phoenix-descend-end", descendEndHandler);
        window.removeEventListener("bm-dpad", dpadHandler);
        window.removeEventListener("bm-action-btn", actionBtnHandler);
        window.removeEventListener("bm-fog", fogHandler);
        window.removeEventListener("bm-renderdist", renderDistHandler);
        window.removeEventListener("bm-shadows", shadowsHandler);
        window.removeEventListener("bm-sensitivity", sensHandler);
        window.removeEventListener("bm-haptics", hapticsHandler);
        window.removeEventListener("bm-fpscap", fpsCapHandler);
        window.removeEventListener("bm-quality", qualityHandler);
        canvas.removeEventListener("pointerdown", onPointerDown);
        canvas.removeEventListener("pointermove", onPointerMove);
        canvas.removeEventListener("pointerup", onPointerUp);
        canvas.removeEventListener("pointercancel", onPointerUp);
        // Note: removeEventListener does not require {passive} to match
        renderer.domElement.removeEventListener("webglcontextlost", onContextLost);
        renderer.domElement.removeEventListener("webglcontextrestored", onContextRestored);
        ssaoPass?.dispose();
        composer?.dispose();
        renderer.dispose();
        blockGeo.dispose();
        leafGeo.dispose();
        mLeafClumpOak.dispose();
        mLeafClumpBirch.dispose();
        mLeafClumpSpruce.dispose();
        mLeafClumpAcacia.dispose();
        mLeafClumpJungle.dispose();
        fallingBlockGeo.dispose();
        poppedChunkGeo.dispose();
        for (const fb of activeFallingBlocks) {
          scene.remove(fb.mesh);
        }
        activeFallingBlocks.length = 0;
        for (const pb of poppedBlockPieces) {
          scene.remove(pb.mesh);
        }
        poppedBlockPieces.length = 0;
        for (const m of decorMeshes) scene.remove(m);
        for (const g of decorGeos) g.dispose();
        for (const m of decorMats) {
          const mm = m as THREE.MeshLambertMaterial;
          mm.map?.dispose();
          mm.dispose();
        }
        for (const obj of sbPondObjects) {
          scene.remove(obj);
          obj.traverse((node) => {
            const mesh = node as THREE.Mesh;
            if (!mesh.isMesh) return;
            mesh.geometry.dispose();
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            for (const material of materials) material.dispose();
          });
        }
        sbPondObjects.length = 0;
        if (escapeScpMesh) {
          scene.remove(escapeScpMesh);
          escapeScpMesh.traverse((node) => {
            const mesh = node as THREE.Mesh;
            if (!mesh.isMesh) return;
            mesh.geometry.dispose();
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            for (const material of materials) material.dispose();
          });
          escapeScpMixer?.stopAllAction();
          escapeScpMesh = null;
          escapeScpMixer = null;
        }
        if (skyPhoenix) {
          scene.remove(skyPhoenix);
          skyPhoenix.traverse((node) => {
            const mesh = node as THREE.Mesh;
            if (!mesh.isMesh) return;
            mesh.geometry.dispose();
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            for (const material of materials) material.dispose();
          });
          phoenixMixer?.stopAllAction();
          skyPhoenix = null;
          phoenixMixer = null;
        }
        for (const projectile of magicCubeProjectiles) scene.remove(projectile.mesh);
        magicCubeProjectiles.length = 0;
        if (magicCubeTemplate) {
          magicCubeTemplate.traverse((node) => {
            const mesh = node as THREE.Mesh;
            if (!mesh.isMesh) return;
            mesh.geometry.dispose();
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            for (const material of materials) material.dispose();
          });
          magicCubeTemplate = null;
        }
        // Procedural block textures/materials are cached at module scope
        // (see buildProceduralAssets) and reused by every future game mount —
        // do not dispose them here, or the next mount would try to use a
        // disposed GPU texture/material.
        for (const pt of liveParticles) {
          scene.remove(pt.mesh);
          pt.material.dispose();
        }
        liveParticles.length = 0;
        particleGeo.dispose();
        sunGlowTex.dispose();
        (sunGlow.material as THREE.SpriteMaterial).dispose();
        ambientTex.dispose();
        ambientGeo.dispose();
        (ambientPoints.material as THREE.PointsMaterial).dispose();
        if (isSkyblock) {
          unsubIslandBlocks?.();
          unsubIslandPlayers?.();
          if (qbUser?.uid) clearPlayerPresence(qbUser.uid);
          for (const [, mesh] of remotePlayerMeshes) scene.remove(mesh);
          remotePlayerMeshes.clear();
        }
        if (renderer.domElement.parentElement === mount) mount.removeChild(renderer.domElement);
      };
    } catch (err) {
      console.warn("Game engine failed to initialize.", err);
      setEngineError(true);
      try {
        renderer.dispose();
      } catch {
        /* ignore secondary errors */
      }
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    }
  }, []);

  // ── Spleef countdown ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isSpleef) return;
    let count = 3;
    setScountdown(3);
    const iv = setInterval(() => {
      count--;
      if (count > 0) {
        setScountdown(count);
      } else {
        clearInterval(iv);
        setScountdown(0);
        sfrozenRef.current = false;
        sphaseRef.current = "playing";
        setSphase("playing");
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [isSpleef]);

  // ── BedWars countdown: triggered when phase becomes 'countdown' ───────────
  useEffect(() => {
    if (!isBedwars || bwState.phase !== "countdown") return;
    let count = 3;
    setBwState((s) => ({ ...s, countdown: count }));
    const iv = setInterval(() => {
      count--;
      if (count > 0) {
        setBwState((s) => ({ ...s, countdown: count }));
      } else {
        clearInterval(iv);
        setBwState((s) => ({ ...s, countdown: 0, phase: "match" }));
        setTimeout(() => {
          bwSceneRef.current?.teleportMatch();
        }, 300);
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [isBedwars, bwState.phase]);

  // EggWars starts from the arena itself, so the match is queued as soon as
  // the arena/loading gate has produced its first real frame. Keeping this
  // countdown in React makes the state visible to the HUD while the engine
  // remains frozen until eggSceneRef.startMatch() is called.
  useEffect(() => {
    if (!isEggwars || !worldReady || eggMatchLoading || eggState.phase !== "lobby") return;
    if (eggCountdownStartedRef.current) return;
    eggCountdownStartedRef.current = true;
    setEggState((s) => ({ ...s, phase: "countdown", countdown: 3 }));
  }, [isEggwars, worldReady, eggMatchLoading, eggState.phase]);

  useEffect(() => {
    if (!isEggwars || eggState.phase !== "countdown") return;
    let count = 3;
    setEggState((s) => ({ ...s, countdown: count }));
    const iv = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setEggState((s) => ({ ...s, countdown: count }));
      } else {
        clearInterval(iv);
        setEggState((s) => ({ ...s, countdown: 0, phase: "match", toast: "GO!" }));
        eggSceneRef.current?.startMatch();
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [isEggwars, eggState.phase]);

  const sendChat = () => {
    const v = chatVal.trim();
    if (!v) return;
    const senderName = qbUser?.displayName || qbUser?.username || "You";
    // ── /fly — toggle spectator fly mode ──────────────────────────────
    if (v === "/fly") {
      const next = !flyRef.current;
      setFlyMode(next);
      setChatMsgs((m) => [
        ...m,
        {
          id: Date.now(),
          from: "System",
          text: next ? "✈ Fly mode ON — jump=up, ↓=down" : "🚶 Fly mode OFF",
        },
      ]);
      setChatVal("");
      return;
    }
    if (isSkyblock && /^\/mine$/i.test(v)) {
      teleportSkyblock("mining");
      setChatMsgs((m) => [
        ...m,
        { id: Date.now(), from: "System", text: "⛏ Teleporting to Deepstone Mine…" },
      ]);
      setChatVal("");
      return;
    }
    if (isSkyblock && /^\/home$/i.test(v)) {
      teleportSkyblock("home");
      setChatMsgs((m) => [...m, { id: Date.now(), from: "System", text: "🏝 Returning home…" }]);
      setChatVal("");
      return;
    }
    const ladybugMatch = /^\/ladybug\s+([\s\S]+)$/i.exec(v);
    const displayText = ladybugMatch ? ladybugMatch[1] : v;
    if (ladybugMatch) {
      setChatMsgs((m) => [
        ...m,
        { id: Date.now(), from: senderName, text: displayText, me: true, special: "ladybug" },
      ]);
    } else {
      setChatMsgs((m) => [...m, { id: Date.now(), from: senderName, text: v, me: true }]);
    }
    if (isSkyblock) {
      const effectiveIslandId =
        visitingUserId || qbUser?.islandId || qbUser?.uid || getPermanentPlayerId(qbUser);
      const isOwner = !visitingUserId || visitingUserId === qbUser?.uid;
      const tag = isOwner ? "OWNER" : qbUser?.staff ? "ADMIN" : "PLAYER";
      sendSkyblockChatMessage(effectiveIslandId, {
        senderId: qbUser?.uid || "guest",
        senderName: getCleanName(qbUser),
        tag,
        text: displayText,
      }).catch(() => {});
    }
    setChatBubble({ text: displayText, sender: senderName, time: Date.now() });
    GameAudio.playChatChime();
    window.setTimeout(() => setChatBubble(null), 5500);
    setChatVal("");
  };

  // Heart display: 10 hearts, each = 2 hp
  const hearts = Array.from({ length: 10 }, (_, i) => {
    const v = hp - i * 2;
    return v >= 2 ? "full" : v === 1 ? "half" : "empty";
  });
  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const worldLoadingVisible = !worldReady || (isSkyblock && !skyblockLoadingDone);

  if (engineError) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-5 bg-white px-8 text-center">
        <div className="h-16 w-16 rounded-[20px] bg-red-50 border border-red-100 grid place-items-center">
          <span className="text-[32px] leading-none">⚠️</span>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <div className="text-[20px] font-black text-gray-900 tracking-tight">
            Something went wrong
          </div>
          <div className="text-[14px] text-gray-500 font-medium max-w-[260px] leading-snug">
            The game couldn't start. Please try again.
          </div>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={() => window.location.reload()}
            className="press h-12 px-6 rounded-[14px] bg-gray-900 text-white font-bold text-[14px]"
          >
            Try Again
          </button>
          <Link
            to={"/" as never}
            className="press h-12 px-6 rounded-[14px] bg-gray-100 text-gray-800 font-bold text-[14px] flex items-center gap-1.5"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`fixed inset-0 overflow-hidden select-none ${isSkyblock ? "skyblock-game" : ""} ${isSpleef ? "bg-[#C8E8FF]" : "bg-[#EDF7FF]"}`}
    >
      <div
        ref={mountRef}
        className="absolute inset-0"
      />

      {/* Cheap color-grade pass: warm center, darkened edges — makes the flat
          voxel render read as a lit "scene" instead of a raw canvas. */}
      <div
        className="absolute inset-0 pointer-events-none z-[2]"
        style={{
          background: isSpleef
            ? "radial-gradient(ellipse at 50% 40%, rgba(255,255,255,0) 45%, rgba(20,50,80,0.22) 100%)"
            : "radial-gradient(ellipse at 50% 40%, rgba(255,244,214,0.05) 0%, rgba(20,30,20,0.18) 100%)",
        }}
      />

      {/* Subtle depth overlay — 1% darkness for Skyblock, adds cinematic depth */}
      {isSkyblock && (
        <div
          className="absolute inset-0 pointer-events-none z-[3]"
          style={{ background: "rgba(0,0,0,0.01)" }}
        />
      )}

      {worldLoadingVisible &&
        isBlockyplaza &&
        (() => {
          // Blocky Plaza keeps its own branded card loader.
          return (
            <div className="absolute inset-0 z-[90] flex flex-col items-center justify-center bg-slate-100">
              <style>{`
              @keyframes bpCubeRotate { 0%{transform:rotateX(-22deg) rotateY(0deg)} 100%{transform:rotateX(-22deg) rotateY(360deg)} }
              @keyframes bpBarPulse { 0%{width:5%} 60%{width:80%} 100%{width:100%} }
            `}</style>
              <div className="w-full max-w-sm mx-4 bg-white rounded-3xl overflow-hidden shadow-2xl shadow-slate-200 border border-slate-100">
                <div
                  className="relative flex w-full items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-200"
                  style={{ height: 220 }}
                >
                  <GearboxLoader />
                  <div className="absolute top-4 left-4 bg-white/80 backdrop-blur-md text-slate-600 text-[10px] tracking-widest font-bold px-3 py-1.5 rounded-full border border-slate-200/60 shadow-sm">
                    LOADING…
                  </div>
                </div>
                <div className="px-6 pt-5 pb-6">
                  <h2 className="text-[26px] font-extrabold tracking-tight text-slate-900 leading-tight">
                    Blocky Plaza
                  </h2>
                  <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Made by Ira</p>
                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[12px] text-slate-500 font-medium">Loading world…</span>
                      <span className="text-[12px] font-bold text-slate-800">●</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/70">
                      <div
                        className="bg-gradient-to-r from-amber-400 to-yellow-500 h-full rounded-full"
                        style={{ animation: "bpBarPulse 2s ease-in-out infinite" }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      {worldLoadingVisible && isEscape && (
        <div className="absolute inset-0 z-[90] flex flex-col items-center justify-center bg-[#09090b] text-white">
          <GearboxLoader />
          <p className="mt-6 text-[10px] font-black uppercase tracking-[0.24em] text-red-400/70">
            ESCAPE: SCP-069
          </p>
          <p className="mt-2 text-[13px] font-bold text-white/85">Loading Monsters</p>
        </div>
      )}
      {worldLoadingVisible && isSkyblock && !isEscape && (
        <V2LoadingScreen
          title="Skyblock"
          subtitle={visitingUserId && visitingUserId !== qbUser?.uid ? "Visiting Realm" : "Building your island"}
          progress={skyblockLoadingDone ? 100 : 75}
          isAssetsLoaded={skyblockLoadingDone}
          onFinished={() => setSkyblockLoadingDone(true)}
        />
      )}
      {worldLoadingVisible && (isBedwars || isBlockFall) && (
        <V2LoadingScreen
          title={isBedwars ? "BedWars" : "Block Fall"}
          subtitle={isBedwars ? "Loading map & arena" : "Generating arena"}
          progress={worldReady ? 100 : 75}
          isAssetsLoaded={worldReady}
        />
      )}
      {isSkyblock && skyblockTeleporting && (
        <div
          className="absolute inset-0 z-[95] flex flex-col items-center justify-center overflow-hidden bg-[#0b1018]/95 text-white"
          style={{ backdropFilter: "blur(12px)" }}
        >
          <img
            src={skyblockTeleporting === "home" ? islandHouseArt : miningEntranceArt}
            alt=""
            className="mb-5 h-24 w-24 object-contain drop-shadow-[0_12px_22px_rgba(0,0,0,.45)]"
          />
          <GearboxLoader />
          <p className="mt-5 text-[10px] font-black uppercase tracking-[0.24em] text-white/45">
            Ira Island
          </p>
          <p className="mt-2 text-[15px] font-black text-white/90">
            {skyblockTeleporting === "home" ? "Going home…" : "Going mining…"}
          </p>
        </div>
      )}
      {worldLoadingVisible &&
        !isBlockyplaza &&
        !isSkyblock &&
        !isBedwars &&
        !isBlockFall &&
        (() => {
          const loadCfg = isBedwars
            ? { accent: "#ff4444", icon: "⚔️", name: "BedWars", verb: "Loading map…" }
            : isSpleef
              ? { accent: "#48b4ff", icon: "❄️", name: "Spleef", verb: "Generating arena…" }
              : isTntRush
                ? { accent: "#ff6600", icon: "💥", name: "TNT Rush", verb: "Laying TNT…" }
                : { accent: "#22d3ee", icon: "🌍", name: "Sandbox", verb: "Building world…" };

          return (
            <div
              className="absolute inset-0 z-[90] flex flex-col items-center justify-center overflow-hidden"
              style={{ background: "#f8f8f6" }}
            >
              {/* Halftone dots bg */}
              <div
                className="absolute inset-0 pointer-events-none opacity-[0.06]"
                style={{
                  backgroundImage: "radial-gradient(circle, #000 1px, transparent 1px)",
                  backgroundSize: "18px 18px",
                }}
              />

              {/* Floating blobs */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div
                  style={{
                    position: "absolute",
                    top: -60,
                    left: -40,
                    width: 260,
                    height: 260,
                    borderRadius: "50%",
                    background: `radial-gradient(circle, ${loadCfg.accent}33 0%, transparent 70%)`,
                    filter: "blur(35px)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    bottom: -50,
                    right: -60,
                    width: 220,
                    height: 220,
                    borderRadius: "50%",
                    background: `radial-gradient(circle, ${loadCfg.accent}22 0%, transparent 70%)`,
                    filter: "blur(32px)",
                  }}
                />
              </div>

              {/* Content */}
              <div className="relative z-10 flex flex-col items-center gap-6">
                {/* Bouncing cube */}
                <div style={{ animation: "worldLoadBounce 1s ease-in-out infinite" }}>
                  <div className="text-6xl select-none">{loadCfg.icon}</div>
                </div>

                {/* Comic speech bubble */}
                <div
                  className="relative px-5 py-3 rounded-[18px]"
                  style={{
                    background: "#fff",
                    border: `3px solid ${loadCfg.accent}`,
                    boxShadow: `0 6px 0 ${loadCfg.accent}66, 0 2px 20px rgba(0,0,0,0.08)`,
                  }}
                >
                  <div
                    className="font-extrabold text-[15px]"
                    style={{
                      color: "#141414",
                      fontFamily: "var(--font-sans)",
                      fontSize: 12,
                      lineHeight: 1.5,
                    }}
                  >
                    {loadCfg.name}
                  </div>
                  <div className="text-[11px] font-semibold mt-1" style={{ color: "#9a9a9a" }}>
                    {loadCfg.verb}
                  </div>
                  {/* Speech bubble tail */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: -12,
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: 0,
                      height: 0,
                      borderLeft: "8px solid transparent",
                      borderRight: "8px solid transparent",
                      borderTop: `12px solid ${loadCfg.accent}`,
                    }}
                  />
                </div>

                {/* Chunky loading bar with tournament icon */}
                <div style={{ width: 220, marginTop: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {/* Tournament / quest icon */}
                    <img
                      src="/assets/ui/icon-quest.svg"
                      alt="quest"
                      style={{
                        width: 26,
                        height: 26,
                        flexShrink: 0,
                        filter: `drop-shadow(0 0 4px ${loadCfg.accent}bb)`,
                      }}
                    />
                    <div
                      style={{
                        flex: 1,
                        height: 13,
                        background: "rgba(0,0,0,0.07)",
                        borderRadius: 99,
                        overflow: "hidden",
                        border: "2px solid rgba(0,0,0,0.09)",
                        position: "relative",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          borderRadius: 99,
                          background: `linear-gradient(90deg,${loadCfg.accent},${loadCfg.accent}cc)`,
                          animation: "worldLoadBar 1.8s ease-in-out infinite",
                          boxShadow: `0 0 10px ${loadCfg.accent}99`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Corner stars */}
              {[
                [-1, -1],
                [1, -1],
                [-1, 1],
                [1, 1],
              ].map(([sx, sy], i) => (
                <div
                  key={i}
                  className="absolute pointer-events-none"
                  style={{
                    left: sx < 0 ? "10%" : "90%",
                    top: sy < 0 ? "8%" : "88%",
                    transform: "translate(-50%,-50%)",
                    animation: `worldLoadStar ${1.2 + i * 0.25}s ease-in-out infinite`,
                    animationDelay: `${i * 0.18}s`,
                  }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill={loadCfg.accent}
                    opacity="0.55"
                  >
                    <path d="M12 2L13.09 8.26L19 6L14.74 10.91L21 12L14.74 13.09L19 18L13.09 15.74L12 22L10.91 15.74L5 18L9.26 13.09L3 12L9.26 10.91L5 6L10.91 8.26Z" />
                  </svg>
                </div>
              ))}

              <style>{`
              @keyframes worldLoadBounce { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-14px) scale(1.08)} }
              @keyframes worldLoadStar   { 0%,100%{transform:rotate(0deg) scale(1)} 50%{transform:rotate(180deg) scale(1.4)} }
            `}</style>
            </div>
          );
        })()}

      {/* Crosshair removed per user request */}

      <div
        ref={holdProgressRef}
        style={{ display: "none" }}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none mt-8 z-20"
      >
        <svg width="44" height="44" viewBox="0 0 44 44">
          <circle
            cx="22"
            cy="22"
            r="18"
            stroke="rgba(255,255,255,0.45)"
            strokeWidth="3"
            fill="none"
          />
          <circle
            ref={holdCircleRef}
            cx="22"
            cy="22"
            r="18"
            stroke="#fff"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 18}
            strokeDashoffset={2 * Math.PI * 18}
            transform="rotate(-90 22 22)"
          />
        </svg>
      </div>

      {privateServer && <PrivateServerBadge privacy={privateServer.privacy} />}

      {isSkyblock && (
        <div className="skyblock-ui">
          <SkyblockPastedHud
            escapeMode={isEscape}
            islandId={visitingUserId || qbUser?.islandId || qbUser?.uid || getPermanentPlayerId(qbUser)}
            onExit={() => setShowQuitDialog(true)}
            onRequestQuit={() => setShowQuitDialog(true)}
            onChat={() => setChatOpen(true)}
            onSettings={() => setSettingsOpen(true)}
            onBattlePass={() => setSkyPassOpen(true)}
            camMode={camMode}
            onToggleCamMode={cycleCamMode}
            area={skyblockArea}
            onMining={() => teleportSkyblock("mining")}
            onHome={() => teleportSkyblock("home")}
            onInventory={() => setInvOpen(true)}
            nearPhoenixNest={nearPhoenixNest}
            ridingPhoenix={ridingPhoenix}
            running={running}
            onToggleRun={() => setRunning(!running)}
            onGacha={() => setChestOpen(true)}
            onMall={() => setShopModalOpen(true)}
            onStats={() => setSkyPassOpen(true)}
            onShop={() => setShopModalOpen(true)}
            onEvents={() => setSkyPassOpen(true)}
            onRuleBook={() => setRuleBookModalOpen(true)}
            activeSlot={slot}
            hotbarBlockIds={skyblockHotbarSlots}
            onSelectSlot={(slotIdx) => {
              const blockId = slotIdx < BLOCKS.length ? slotIdx : 0;
              setSlot(blockId);
              setHeldShovelIdx(null);
              window.dispatchEvent(new CustomEvent("bm-slot", { detail: blockId }));
            }}
          />
        </div>
      )}

      {/* ── TOP-LEFT HUD BAR: [Menu] [Chat] [Smile] [Video] (Hosted PNGs) FOR NON-SKYBLOCK ── */}
      {!isSkyblock && (
        <div className="absolute left-3 top-[max(12px,env(safe-area-inset-top))] z-40 flex items-center gap-2 pointer-events-auto select-none">
          {/* 1. Menu Button */}
          <div className="relative">
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setCubeMenuOpen((o) => !o);
              }}
              className="relative w-11 h-11 sm:w-12 sm:h-12 active:scale-90 transition-transform cursor-pointer border-0 bg-transparent p-0 flex items-center justify-center outline-none touch-none"
              title="Game Menu"
              aria-label="Game Menu"
            >
              <img
                src={HUD_ASSETS.button}
                alt="Menu"
                className="w-full h-full object-contain pointer-events-none drop-shadow-md select-none"
                draggable={false}
              />
              <img
                src={HUD_ASSETS.menu}
                alt=""
                className="absolute inset-0 w-full h-full object-contain p-2 pointer-events-none drop-shadow-sm select-none"
                draggable={false}
              />
            </button>

            {cubeMenuOpen && (
              <div
                className="absolute left-0 top-14 w-48 rounded-xl border border-white/15 bg-[#1e2025]/95 backdrop-blur-xl shadow-2xl p-1.5 flex flex-col gap-1 z-50 text-white animate-in fade-in zoom-in-95 duration-100"
                onPointerDown={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    setCubeMenuOpen(false);
                    setSettingsOpen(true);
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-bold text-zinc-200 hover:bg-white/10 hover:text-white text-left transition cursor-pointer"
                >
                  <Settings className="w-4 h-4 text-amber-400" />
                  <span>Game Settings</span>
                </button>

                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    setCubeMenuOpen(false);
                    setChatOpen(true);
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-bold text-zinc-200 hover:bg-white/10 hover:text-white text-left transition cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4 text-sky-400" />
                  <span>Chat</span>
                </button>

                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    setCubeMenuOpen(false);
                    setShowQuitDialog(true);
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-bold text-red-400 hover:bg-red-500/15 text-left transition cursor-pointer border-t border-white/10 mt-0.5"
                >
                  <LogOut className="w-4 h-4 text-red-400" />
                  <span>Leave</span>
                </button>
              </div>
            )}
          </div>

          {/* 2. Chat Button */}
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setChatOpen(true);
            }}
            className="relative w-11 h-11 sm:w-12 sm:h-12 active:scale-90 transition-transform cursor-pointer border-0 bg-transparent p-0 flex items-center justify-center outline-none touch-none"
            title="Chat"
            aria-label="Chat"
          >
            <img
              src={HUD_ASSETS.button}
              alt="Chat"
              className="w-full h-full object-contain pointer-events-none drop-shadow-md select-none"
              draggable={false}
            />
            <img
              src={HUD_ASSETS.chat}
              alt=""
              className="absolute inset-0 w-full h-full object-contain p-2 pointer-events-none drop-shadow-sm select-none"
              draggable={false}
            />
          </button>

          {/* 3. Smile / Emote Button */}
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              window.dispatchEvent(
                new CustomEvent("bm-chat-say", { detail: { text: "👋 Hello!" } })
              );
            }}
            className="relative w-11 h-11 sm:w-12 sm:h-12 active:scale-90 transition-transform cursor-pointer border-0 bg-transparent p-0 flex items-center justify-center outline-none touch-none"
            title="Emote / Wave"
            aria-label="Emotes"
          >
            <img
              src={HUD_ASSETS.button}
              alt="Smile"
              className="w-full h-full object-contain pointer-events-none drop-shadow-md select-none"
              draggable={false}
            />
            <img
              src={HUD_ASSETS.smile}
              alt=""
              className="absolute inset-0 w-full h-full object-contain p-2 pointer-events-none drop-shadow-sm select-none"
              draggable={false}
            />
          </button>

          {/* 4. Video / Camera View Toggle */}
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              cycleCamMode();
            }}
            className="relative w-11 h-11 sm:w-12 sm:h-12 active:scale-90 transition-transform cursor-pointer border-0 bg-transparent p-0 flex items-center justify-center outline-none touch-none"
            title="Switch Camera View"
            aria-label="Camera Mode"
          >
            <img
              src={HUD_ASSETS.button}
              alt="Video"
              className="w-full h-full object-contain pointer-events-none drop-shadow-md select-none"
              draggable={false}
            />
            <img
              src={HUD_ASSETS.video}
              alt=""
              className="absolute inset-0 w-full h-full object-contain p-2 pointer-events-none drop-shadow-sm select-none"
              draggable={false}
            />
          </button>
        </div>
      )}

      {/* ── TOP RIGHT: Login / Sign Up if guest ── */}
      {!isBlockyplaza && !qbUser?.uid && (
        <div className="absolute right-3 top-[max(12px,calc(env(safe-area-inset-top)+8px))] z-30 flex items-center gap-2 pointer-events-auto">
          <Link
            to="/login"
            search={{ screen: "login" } as never}
            className="h-10 px-3.5 rounded-[14px] flex items-center gap-1.5 text-xs font-bold text-white bg-black/45 hover:bg-black/65 active:scale-95 backdrop-blur-xl border border-white/20 shadow-[0_4px_16px_rgba(0,0,0,0.3)] transition cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5 fill-white text-white" />
            <span>Log In</span>
          </Link>
          <Link
            to="/login"
            search={{ screen: "signup" } as never}
            className="h-10 px-3.5 rounded-[14px] flex items-center gap-1.5 text-xs font-extrabold text-white bg-amber-500/35 hover:bg-amber-500/50 active:scale-95 backdrop-blur-xl border border-amber-400/50 shadow-[0_4px_16px_rgba(245,158,11,0.25)] transition cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
            <span>Sign Up</span>
          </Link>
        </div>
      )}

      {/* ── SKYBLOCK TOP BAR — Hytale-style ─────────────────────────────────── */}
      {isSkyblock && false && (
        <div
          className="absolute top-0 left-0 right-0 z-10 pointer-events-none"
          style={{ paddingTop: "max(10px,env(safe-area-inset-top))" }}
        >
          {/* ── Player card (top-left) ── */}
          <div className="absolute left-3 top-[max(10px,env(safe-area-inset-top))] pointer-events-auto">
            <div
              className="flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-[11px]"
              style={{
                background: "rgba(6,8,20,0.72)",
                backdropFilter: "blur(20px) saturate(1.6)",
                WebkitBackdropFilter: "blur(20px) saturate(1.6)",
                border: "1px solid rgba(255,255,255,0.12)",
                boxShadow: "0 4px 18px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.07)",
              }}
            >
              {/* Avatar face */}
              <div
                className="h-[30px] w-[30px] rounded-[7px] overflow-hidden shrink-0"
                style={{
                  border: "1.5px solid rgba(255,255,255,0.20)",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.45)",
                }}
              ></div>
              <span
                className="text-[11px] font-extrabold leading-none text-white truncate"
                style={{ textShadow: "0 1px 4px rgba(0,0,0,0.7)" }}
              >
                {qbUser?.displayName ?? "Player"}
              </span>
            </div>
          </div>

          {/* ── Compass strip (top-center) ── */}
          <div className="flex justify-center" style={{ paddingTop: 0 }}>
            <div
              className="relative pointer-events-none px-3 py-0.5 rounded-[8px]"
              style={{
                background: "rgba(6,8,20,0.65)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                border: "1px solid rgba(255,255,255,0.10)",
                boxShadow: "0 3px 12px rgba(0,0,0,0.35)",
              }}
            >
              <div className="flex items-center gap-2.5">
                {[
                  ["210", ""],
                  ["SW", ""],
                  ["240", ""],
                  ["W", "▼"],
                  ["285", ""],
                  ["NW", ""],
                ].map(([label, marker], i) => (
                  <div key={i} className="flex flex-col items-center gap-0.5">
                    {marker && (
                      <span className="text-[6px] leading-none" style={{ color: "#ff5555" }}>
                        {marker}
                      </span>
                    )}

                    {/* ── SKYBLOCK [NEW HORIZON] minimal chrome ─────────────────────────── */}
                    {isSkyblock && false && (
                      <div
                        className="absolute left-3 right-3 top-0 z-10 flex items-start justify-between pointer-events-none"
                        style={{ paddingTop: "max(12px,env(safe-area-inset-top))" }}
                      >
                        <Link
                          to={"/" as never}
                          aria-label="Leave New Horizon"
                          className="pointer-events-auto press flex h-10 items-center gap-2 rounded-[13px] px-3 text-slate-800"
                          style={{
                            background:
                              "linear-gradient(145deg,rgba(255,255,255,0.92),rgba(210,216,222,0.88) 58%,rgba(158,167,176,0.86))",
                            border: "1px solid rgba(255,255,255,0.82)",
                            boxShadow:
                              "0 6px 18px rgba(15,23,42,0.20), inset 0 1px 0 rgba(255,255,255,0.95)",
                            backdropFilter: "blur(18px)",
                          }}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          <span className="text-[10px] font-black tracking-[0.12em]">EXIT</span>
                        </Link>
                        <div
                          className="rounded-[13px] px-4 py-2 text-center text-slate-800"
                          style={{
                            background:
                              "linear-gradient(145deg,rgba(255,255,255,0.94),rgba(220,225,230,0.90) 58%,rgba(166,174,182,0.88))",
                            border: "1px solid rgba(255,255,255,0.84)",
                            boxShadow:
                              "0 6px 22px rgba(15,23,42,0.20), inset 0 1px 0 rgba(255,255,255,0.98)",
                            backdropFilter: "blur(18px)",
                          }}
                        >
                          <div className="text-[11px] font-black tracking-[0.16em]">
                            NEW HORIZON
                          </div>
                          <div className="mt-0.5 text-[8px] font-bold tracking-[0.24em] text-slate-500">
                            SKYBLOCK
                          </div>
                        </div>
                      </div>
                    )}
                    <span
                      className="text-[9px] font-bold leading-none"
                      style={{
                        color: marker ? "#ffffff" : "rgba(255,255,255,0.40)",
                        letterSpacing: "0.03em",
                      }}
                    >
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="pointer-events-auto flex items-center gap-1.5">
              <button
                onClick={() => setChatOpen(true)}
                className="press grid h-10 w-10 place-items-center rounded-[13px] text-slate-700"
                style={{
                  background:
                    "linear-gradient(145deg,rgba(255,255,255,0.92),rgba(210,216,222,0.86))",
                  border: "1px solid rgba(255,255,255,0.82)",
                  boxShadow: "0 6px 18px rgba(15,23,42,0.20)",
                }}
                aria-label="Open chat"
              >
                <MessageCircle className="h-4 w-4" />
              </button>
              <button
                onClick={() => setSettingsOpen(true)}
                className="press grid h-10 w-10 place-items-center rounded-[13px] text-slate-700"
                style={{
                  background:
                    "linear-gradient(145deg,rgba(255,255,255,0.92),rgba(210,216,222,0.86))",
                  border: "1px solid rgba(255,255,255,0.82)",
                  boxShadow: "0 6px 18px rgba(15,23,42,0.20)",
                }}
                aria-label="Open settings"
              >
                <SettingsIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* ── Currency + menu (top-right) ── */}
          <div className="absolute right-3 top-[max(10px,env(safe-area-inset-top))] flex items-center gap-1 pointer-events-auto">
            {/* Gold */}
            <div
              className="h-[30px] px-1.5 rounded-[9px] flex items-center gap-1"
              style={{
                background: "rgba(6,8,20,0.72)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: "1px solid rgba(201,162,39,0.28)",
                boxShadow: "0 3px 12px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,220,80,0.08)",
              }}
            >
              <GoldCoin size={13} />
              <span
                className="text-[10.5px] font-extrabold tabular-nums"
                style={{ color: "#ffe066", textShadow: "0 0 8px rgba(255,200,50,0.50)" }}
              >
                {(bpGold ?? 0).toLocaleString()}
              </span>
              <button
                className="press h-[18px] w-[18px] rounded-full grid place-items-center"
                onClick={() => setSbBuyType("gold")}
                style={{
                  background: "rgba(255,220,80,0.16)",
                  border: "1px solid rgba(255,220,80,0.22)",
                }}
                aria-label="Add gold"
              >
                <Plus
                  className="h-2.5 w-2.5"
                  style={{ color: "rgba(255,210,60,0.85)" }}
                  strokeWidth={3}
                />
              </button>
            </div>
            {/* Gems */}
            <div
              className="h-[30px] px-1.5 rounded-[9px] flex items-center gap-1"
              style={{
                background: "rgba(6,8,20,0.72)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: "1px solid rgba(100,180,255,0.25)",
                boxShadow: "0 3px 12px rgba(0,0,0,0.35), inset 0 1px 0 rgba(100,180,255,0.08)",
              }}
            >
              <GemCoin size={13} />
              <span
                className="text-[10.5px] font-extrabold tabular-nums"
                style={{ color: "#7dd3fc", textShadow: "0 0 8px rgba(100,180,255,0.50)" }}
              >
                {(bpGems ?? 0).toLocaleString()}
              </span>
              <button
                className="press h-[18px] w-[18px] rounded-full grid place-items-center"
                onClick={() => setSbBuyType("gem")}
                style={{
                  background: "rgba(100,180,255,0.16)",
                  border: "1px solid rgba(100,180,255,0.22)",
                }}
                aria-label="Add gems"
              >
                <Plus
                  className="h-2.5 w-2.5"
                  style={{ color: "rgba(100,200,255,0.85)" }}
                  strokeWidth={3}
                />
              </button>
            </div>
            {/* Hamburger menu */}
            <button
              onClick={() => setSettingsOpen(true)}
              className="press h-[30px] w-[30px] rounded-[9px] grid place-items-center"
              style={{
                background: "rgba(6,8,20,0.72)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.12)",
                boxShadow: "0 3px 12px rgba(0,0,0,0.35)",
              }}
              aria-label="Menu"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(255,255,255,0.78)"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ── SKYBLOCK: Active quest tracker (left side, below player card) ─── */}
      {isSkyblock && (
        <div
          className="absolute left-3 z-10 flex flex-col gap-2"
          style={{ top: "max(76px,calc(env(safe-area-inset-top)+66px))" }}
        >
          {/* Quest card */}
          <div
            className="wood-panel relative flex flex-col gap-1.5 !rounded-[4px] p-2.5 shadow-md"
            style={{ width: 168 }}
          >
            <div className="flex items-center justify-between gap-1.5">
              <span className="font-lilita text-[13px] tracking-wide text-amber-100 leading-none">
                🪵 Collect Wood
              </span>
              <span className="rounded-[2px] border border-[#150b04] bg-[#160c04] px-1 py-0.5 text-[9.5px] font-lilita text-amber-300">
                +15 XP
              </span>
            </div>
            <p className="text-[10px] font-medium leading-snug text-amber-200/70">
              Visit the tree and collect 10 wood
            </p>
            {/* Wood-grooved progress bar */}
            <div className="h-2 overflow-hidden rounded-[2px] border-2 border-[#150b04] bg-[#160c04] shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)] mt-0.5">
              <div
                className="h-full bg-gradient-to-r from-[#d97706] via-[#f59e0b] to-[#fbbf24] shadow-[0_0_6px_rgba(245,158,11,0.6)]"
                style={{ width: "30%" }}
              />
            </div>
            <div className="flex justify-between text-[9.5px] font-bold tabular-nums text-amber-200/70">
              <span>Quest</span>
              <span>3 / 10</span>
            </div>
          </div>

          {/* Home / Shop island buttons */}
          {!isEmbed && (
            <div className="flex gap-1.5">
              <button
                onClick={() => sbSceneRef.current?.teleportHome()}
                className="press flex-1 h-9 rounded-[10px] flex items-center justify-center gap-1"
                style={{
                  background: "rgba(255,155,20,0.22)",
                  backdropFilter: "blur(18px)",
                  WebkitBackdropFilter: "blur(18px)",
                  border: "1px solid rgba(255,200,80,0.30)",
                  boxShadow: "0 3px 12px rgba(200,100,0,0.20)",
                }}
                aria-label="Home Island"
              >
                <img src="/home-icon.webp" alt="Home" className="h-5 w-5 object-contain" />
                <span className="text-[9px] font-bold text-white/80">Home</span>
              </button>
              <button
                onClick={() => sbSceneRef.current?.teleportShop()}
                className="press flex-1 h-9 rounded-[10px] flex items-center justify-center gap-1"
                style={{
                  background: "rgba(20,180,160,0.22)",
                  backdropFilter: "blur(18px)",
                  WebkitBackdropFilter: "blur(18px)",
                  border: "1px solid rgba(80,220,200,0.30)",
                  boxShadow: "0 3px 12px rgba(0,130,110,0.20)",
                }}
                aria-label="Shop Island"
              >
                <img src="/shop-icon.webp" alt="Shop" className="h-5 w-5 object-contain" />
                <span className="text-[9px] font-bold text-white/80">Shop</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── BLOCKY PLAZA TOP BAR ─────────────────────────────────────────────── */}
      {isBlockyplaza && (
        <div
          className="bp-topbar absolute top-0 left-0 right-0 z-10 pointer-events-none"
          style={{ paddingTop: "max(10px,env(safe-area-inset-top))" }}
        >
          <div className="flex items-center gap-2 px-3">
            {/* ── LEFT: Leave + action icons ── */}
            <div className="bp-topbar-left pointer-events-auto flex items-center gap-1">
              {/* Leave */}
              <Link
                to={"/" as never}
                aria-label="Leave"
                className="press h-10 w-10 rounded-[13px] grid place-items-center shrink-0"
                style={{
                  background: "rgba(255,255,255,0.18)",
                  backdropFilter: "blur(24px) saturate(2)",
                  WebkitBackdropFilter: "blur(24px) saturate(2)",
                  border: "1.5px solid rgba(255,255,255,0.40)",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.55)",
                }}
              >
                <GameLeaveIcon className="h-[17px] w-[17px] text-white/90" />
              </Link>
              {/* Actions pill */}
              <div
                className="bp-topbar-actions flex items-center h-10 px-1 gap-0.5 rounded-[13px]"
                style={{
                  background: "rgba(255,255,255,0.18)",
                  backdropFilter: "blur(24px) saturate(2)",
                  WebkitBackdropFilter: "blur(24px) saturate(2)",
                  border: "1.5px solid rgba(255,255,255,0.38)",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.50)",
                }}
              >
                <button
                  onClick={() => setChatOpen(true)}
                  aria-label="Chat"
                  className="press h-8 w-8 rounded-[10px] grid place-items-center transition-all active:bg-white/20"
                >
                  <GameChatIcon className="h-[16px] w-[16px] text-white/85" />
                </button>
                <div className="w-px h-4" style={{ background: "rgba(255,255,255,0.22)" }} />
                <button
                  onClick={() => setInvOpen(true)}
                  aria-label="Open inventory"
                  className="bp-inventory-square press h-8 w-8 rounded-[10px] grid place-items-center transition-all"
                >
                  <GameBackpackIcon className="relative z-10 h-[16px] w-[16px]" />
                </button>
                <div className="w-px h-4" style={{ background: "rgba(255,255,255,0.22)" }} />
                <button
                  onClick={() => setSettingsOpen(true)}
                  aria-label="Settings"
                  className="press h-8 w-8 rounded-[10px] grid place-items-center transition-all active:bg-white/20"
                >
                  <GameGearIcon className="h-[16px] w-[16px] text-white/85" />
                </button>
              </div>
            </div>

            {/* ── CENTER: Game title badge ── */}
            <div className="bp-topbar-title-wrap flex-1 min-w-0 flex justify-center pointer-events-none">
              <div
                className="bp-topbar-title flex items-center gap-1.5 px-3 h-9 rounded-[11px]"
                style={{
                  background: "rgba(255,255,255,0.16)",
                  backdropFilter: "blur(20px) saturate(2)",
                  WebkitBackdropFilter: "blur(20px) saturate(2)",
                  border: "1.5px solid rgba(255,255,255,0.35)",
                  boxShadow: "0 3px 12px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.45)",
                }}
              >
                {/* Live dot */}
                <span
                  className="h-1.5 w-1.5 rounded-full shrink-0"
                  style={{ background: "#4ade80", boxShadow: "0 0 5px rgba(74,222,128,0.90)" }}
                />
                <span
                  className="text-[11px] font-black tracking-wide text-white"
                  style={{ textShadow: "0 1px 4px rgba(0,0,0,0.50)" }}
                >
                  Blocky Plaza
                </span>
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded-[5px]"
                  style={{
                    background: "rgba(255,255,255,0.22)",
                    color: "rgba(255,255,255,0.70)",
                    letterSpacing: "0.06em",
                  }}
                >
                  LOBBY
                </span>
              </div>
            </div>

            {/* ── RIGHT: Currencies ── */}
            <div className="bp-topbar-currencies pointer-events-auto flex items-center gap-1.5 shrink-0">
              {/* Gold */}
              <div
                className="bp-topbar-currency flex items-center gap-1.5 h-10 px-2.5 rounded-[13px]"
                style={{
                  background: "rgba(255,255,255,0.16)",
                  backdropFilter: "blur(20px) saturate(2)",
                  WebkitBackdropFilter: "blur(20px) saturate(2)",
                  border: "1.5px solid rgba(255,210,0,0.50)",
                  boxShadow:
                    "0 4px 14px rgba(0,0,0,0.18), 0 0 12px rgba(255,200,0,0.15) inset, inset 0 1px 0 rgba(255,255,255,0.45)",
                }}
              >
                <img
                  src={goldTokenIcon}
                  alt="Golden Token"
                  className="h-[15px] w-[15px] object-contain"
                  draggable={false}
                />
                <span
                  className="text-[12px] font-extrabold tabular-nums"
                  style={{ color: "#ffe84a", textShadow: "0 0 8px rgba(255,220,50,0.70)" }}
                >
                  {bpGold}
                </span>
              </div>
              {/* Pink cubes */}
              <div
                className="bp-topbar-currency flex items-center gap-1.5 h-10 px-2.5 rounded-[13px]"
                style={{
                  background: "rgba(255,255,255,0.16)",
                  backdropFilter: "blur(20px) saturate(2)",
                  WebkitBackdropFilter: "blur(20px) saturate(2)",
                  border: "1.5px solid rgba(240,100,200,0.45)",
                  boxShadow:
                    "0 4px 14px rgba(0,0,0,0.18), 0 0 12px rgba(220,80,180,0.15) inset, inset 0 1px 0 rgba(255,255,255,0.45)",
                }}
              >
                <img
                  src={newGenIcon}
                  alt="New Gen"
                  className="h-[15px] w-[15px] object-contain"
                  draggable={false}
                />
                <span
                  className="text-[12px] font-extrabold tabular-nums"
                  style={{ color: "#f9a8d4", textShadow: "0 0 8px rgba(236,72,153,0.60)" }}
                >
                  {bpPink}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── RIGHT RAIL — Quests / Friends / Camera (Liquid Glass circles) ──── */}
      {!isSkyblock && !isBlockyplaza && (
        <div className="absolute right-3 top-[68px] z-10 flex flex-col gap-2">
          <button
            className="press h-11 w-11 rounded-full grid place-items-center relative"
            style={{
              background: "rgba(0,0,0,0.26)",
              backdropFilter: "blur(22px) saturate(1.8)",
              WebkitBackdropFilter: "blur(22px) saturate(1.8)",
              border: "1px solid rgba(255,255,255,0.17)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.14)",
            }}
            aria-label="Quests"
          >
            <img
              src="/assets/ui/icon-quest.svg"
              alt="Quests"
              className="h-[20px] w-[20px]"
              style={{ filter: "brightness(0) invert(1) opacity(0.82)" }}
            />
            <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-primary text-foreground text-[9px] font-extrabold grid place-items-center border border-white/40">
              3
            </span>
          </button>
          <button
            className="press h-11 w-11 rounded-full grid place-items-center relative"
            style={{
              background: "rgba(0,0,0,0.26)",
              backdropFilter: "blur(22px) saturate(1.8)",
              WebkitBackdropFilter: "blur(22px) saturate(1.8)",
              border: "1px solid rgba(255,255,255,0.17)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.14)",
            }}
            aria-label="Friends online"
          >
            <GameFriendsIcon className="h-[19px] w-[19px] text-white/80" />
            <span className="absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-full bg-success border-2 border-black/30" />
          </button>
        </div>
      )}

      {isSpleef && (
        <SpleefHud
          phase={sphase}
          countdown={scountdown}
          elapsed={selapsed}
          overtime={sovertime}
          lastElim={slastElim}
        />
      )}

      {/* ── BedWars HUD ─────────────────────────────────────────────────── */}
      {isBedwars && bwState.phase === "match" && <BedwarsHud bwState={bwState} />}

      {/* ── EggWars HUD ─────────────────────────────────────────────────── */}
      {isEggwars && eggState.phase === "match" && <EggwarsHud eggState={eggState} />}

      {isEggwars && eggState.phase === "countdown" && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 pointer-events-none">
          <div className="text-[13px] font-extrabold tracking-[0.3em] uppercase text-white/90 drop-shadow-lg">
            Protect your egg
          </div>
          <div
            key={eggState.countdown}
            className="text-[104px] font-black text-white drop-shadow-[0_6px_18px_rgba(0,0,0,0.45)] animate-micro-pop"
          >
            {eggState.countdown > 0 ? eggState.countdown : "GO!"}
          </div>
        </div>
      )}

      {isEggwars && eggState.toast && (
        <div className="absolute top-[max(120px,calc(env(safe-area-inset-top)+100px))] left-1/2 -translate-x-1/2 z-20 pointer-events-none animate-fade-in">
          <div className="liquid-glass rounded-full h-9 px-4 flex items-center text-[13px] font-bold whitespace-nowrap">
            {eggState.toast}
          </div>
        </div>
      )}

      {isEggwars && (eggState.phase === "victory" || eggState.phase === "defeat") && (
        <EggwarsResult
          won={eggState.phase === "victory"}
          state={eggState}
          onPlayAgain={() => {
            eggSceneRef.current?.resetMatch();
          }}
        />
      )}

      {/* NPC nameplate — imperatively positioned by tick() projection, no animation */}
      {isBedwars && bwState.phase === "lobby" && !bwNpcModal && (
        <div
          ref={bwNameplateRef}
          className="absolute left-0 top-0 z-20 pointer-events-none"
          style={{ opacity: 0, willChange: "transform" }}
        >
          <div
            style={{
              background: "rgba(0,0,0,0.58)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
              borderRadius: "5px",
              padding: "2px 8px",
              whiteSpace: "nowrap",
            }}
          >
            <span
              style={{
                color: "#fff",
                fontWeight: 800,
                fontSize: "12px",
                textShadow: "0 1px 3px rgba(0,0,0,0.8)",
                letterSpacing: "0.01em",
              }}
            >
              Matchmaker
            </span>
          </div>
        </div>
      )}

      {isSkyblock && (
        <div
          className="absolute left-0 top-0 z-20 pointer-events-none"
          style={{ opacity: 0, willChange: "transform" }}
        >
          <div
            style={{
              background: "rgba(5,18,10,.82)",
              border: "1px solid rgba(74,222,128,.65)",
              borderRadius: 999,
              padding: "3px 10px",
              whiteSpace: "nowrap",
              boxShadow: "0 0 16px rgba(34,197,94,.32)",
            }}
          >
            <span
              style={{
                color: "#4ade80",
                fontWeight: 900,
                fontSize: 12,
                textShadow: "0 1px 3px #000",
              }}
            >
              Eye of the Tiger
            </span>
          </div>
        </div>
      )}

      {/* Bot nameplate — same projection technique, shown during match */}
      {isBedwars && bwState.phase === "match" && (
        <div
          ref={bwBotNameplateRef}
          className="absolute left-0 top-0 z-20 pointer-events-none"
          style={{ opacity: 0, willChange: "transform" }}
        >
          <div
            style={{
              background: "rgba(0,0,0,0.58)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
              borderRadius: "5px",
              padding: "2px 8px",
              whiteSpace: "nowrap",
            }}
          >
            <span
              style={{
                color: "#fff",
                fontWeight: 800,
                fontSize: "12px",
                textShadow: "0 1px 3px rgba(0,0,0,0.8)",
                letterSpacing: "0.01em",
              }}
            >
              Steve
            </span>
          </div>
        </div>
      )}

      {/* BedWars lobby — Blockmango-style direct items sidebar (right edge) */}
      {isBedwars && bwState.phase === "lobby" && !bwNpcModal && (
        <BwLobbySidebar onPlay={() => setBwNpcModal(true)} />
      )}

      {/* BedWars NPC proximity prompt */}
      {isBedwars && bwNpcPrompt && !bwNpcModal && bwState.phase === "lobby" && (
        <div className="absolute bottom-[max(170px,calc(env(safe-area-inset-bottom)+160px))] left-1/2 -translate-x-1/2 z-20 pointer-events-none animate-fade-in">
          <div className="uiverse-white-control flex h-9 items-center gap-2 px-4 text-[12.5px] font-bold">
            <span>🗣️</span>
            <span>Tap to talk</span>
          </div>
        </div>
      )}

      {/* BedWars countdown overlay */}
      {isBedwars && bwState.phase === "countdown" && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 pointer-events-none">
          <div className="text-[13px] font-extrabold tracking-[0.3em] uppercase text-white/85 drop-shadow-lg">
            Get Ready
          </div>
          <div
            key={bwState.countdown}
            className="text-[104px] font-black text-white drop-shadow-[0_6px_18px_rgba(0,0,0,0.45)] animate-micro-pop"
          >
            {bwState.countdown > 0 ? bwState.countdown : "GO!"}
          </div>
        </div>
      )}

      {/* BedWars toast notifications */}
      {isBedwars && bwToast && (
        <div className="absolute top-[max(120px,calc(env(safe-area-inset-top)+100px))] left-1/2 -translate-x-1/2 z-20 pointer-events-none animate-fade-in">
          <div className="liquid-glass rounded-full h-9 px-4 flex items-center text-[13px] font-bold whitespace-nowrap">
            {bwToast}
          </div>
        </div>
      )}

      {/* token toast removed */}

      {/* ── SKYBLOCK discovery / quest toast ──────────────────────────────────── */}
      {isSkyblock && sbToast && (
        <div className="absolute top-[max(116px,calc(env(safe-area-inset-top)+96px))] left-1/2 -translate-x-1/2 z-25 pointer-events-none animate-fade-in">
          <div
            className="rounded-full px-4 h-10 flex items-center gap-2 whitespace-nowrap animate-micro-pop"
            style={{
              background: "linear-gradient(135deg,rgba(255,255,255,.94),rgba(232,238,242,.76))",
              border: "1px solid rgba(255,255,255,.98)",
              color: "#183247",
              backdropFilter: "blur(24px) saturate(1.5)",
              WebkitBackdropFilter: "blur(24px) saturate(1.5)",
              boxShadow: "0 8px 24px rgba(15,23,42,.20), inset 0 1px 0 rgba(255,255,255,.98)",
            }}
          >
            <span className="text-[17px]">👋</span>
            <span className="text-[12.5px] font-black text-slate-800">
              {sbToast.replace(/^👋\s*/, "")}
            </span>
          </div>
        </div>
      )}

      {/* BedWars NPC matchmaking modal — simple yes/no */}
      {isBedwars && bwNpcModal && (
        <div
          className="absolute inset-0 z-50 flex items-end justify-center pb-[max(32px,env(safe-area-inset-bottom))]"
          style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setBwNpcModal(false);
          }}
        >
          <div
            className="w-[calc(100%-32px)] max-w-[360px] rounded-[20px] bg-white px-5 py-5 flex flex-col gap-4"
            style={{ boxShadow: "0 16px 48px rgba(0,0,0,0.22)" }}
          >
            <p className="text-[17px] font-bold text-gray-900 text-center leading-snug">
              Join a BedWars match?
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setBwNpcModal(false)}
                className="press flex-1 h-12 rounded-[14px] font-bold text-[15px] text-gray-600 bg-gray-100"
              >
                No
              </button>
              <button
                onClick={() => {
                  setBwNpcModal(false);
                  setBwState((s) => ({ ...s, phase: "countdown", countdown: 3 }));
                }}
                className="press flex-1 h-12 rounded-[14px] font-black text-[15px] text-white"
                style={{ background: "#f59e0b" }}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BedWars victory screen */}
      {isBedwars && bwVictory && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="flex flex-col items-center gap-2">
            <div
              className="text-[72px] animate-micro-pop"
              style={{ filter: "drop-shadow(0 4px 12px rgba(255,200,0,0.5))" }}
            >
              🏆
            </div>
            <div className="text-[46px] font-black text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.5)] tracking-tight">
              Victory!
            </div>
            <div className="text-white/70 text-[14px] font-semibold mt-1">
              All enemy beds destroyed!
            </div>
            <div className="mt-2 text-[13px] text-white/50">
              Iron collected: <span className="text-white font-bold">{bwState.iron}</span>
            </div>
          </div>
          <div className="flex gap-3 mt-10">
            <button
              onClick={() => {
                setBwVictory(false);
                setBwState({
                  phase: "lobby",
                  countdown: 3,
                  redTeam: { bedAlive: true, playerAlive: true },
                  blueTeam: { bedAlive: true, playerAlive: true },
                  iron: 0,
                  gold: 0,
                  emerald: 0,
                });
                bwSceneRef.current?.teleportLobby();
              }}
              className="press h-12 px-7 rounded-[16px] bg-white/20 backdrop-blur-sm border border-white/30 text-white font-bold text-[15px]"
            >
              Play Again
            </button>
            <Link
              to={"/" as never}
              className="press h-12 px-7 rounded-[16px] bg-primary text-primary-foreground font-bold text-[15px] flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              Return to Lobby
            </Link>
          </div>
        </div>
      )}

      {/* BedWars defeat screen */}
      {isBedwars && bwDefeat && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="flex flex-col items-center gap-2">
            <div
              className="text-[72px] animate-micro-pop"
              style={{ filter: "drop-shadow(0 4px 12px rgba(255,0,0,0.4))" }}
            >
              💀
            </div>
            <div className="text-[46px] font-black text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.5)] tracking-tight">
              Defeated!
            </div>
            <div className="text-white/70 text-[14px] font-semibold mt-1">
              Your bed was destroyed and you were eliminated.
            </div>
          </div>
          <div className="flex gap-3 mt-10">
            <button
              onClick={() => {
                setBwDefeat(false);
                setBwState({
                  phase: "lobby",
                  countdown: 3,
                  redTeam: { bedAlive: true, playerAlive: true },
                  blueTeam: { bedAlive: true, playerAlive: true },
                  iron: 0,
                  gold: 0,
                  emerald: 0,
                });
                bwSceneRef.current?.teleportLobby();
              }}
              className="press h-12 px-7 rounded-[16px] bg-white/20 backdrop-blur-sm border border-white/30 text-white font-bold text-[15px]"
            >
              Play Again
            </button>
            <Link
              to={"/" as never}
              className="press h-12 px-7 rounded-[16px] bg-primary text-primary-foreground font-bold text-[15px] flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              Return to Lobby
            </Link>
          </div>
        </div>
      )}

      {/* BedWars match loading overlay — shown while the arena map fetches */}
      {((isBedwars && bwMatchLoading) || (isEggwars && eggMatchLoading)) && (
        <QblockGameLoadingScreen />
      )}

      {/* Skyblock has its own square touch pad in the pasted HUD. Do not
          render the generic round joystick on top of it. */}
      <JoystickVisual
        containerRef={joyContainerRef}
        baseRef={joyBaseRef}
        knobRef={joyKnobRef}
        square={isSkyblock}
      />

      {/* Fly toggle button — Skyblock is jump-only; other worlds retain flying. */}
      {/* Fly toggle button — Skyblock is jump-only; other worlds retain flying. (NO button holder) */}
      {!isBlockyplaza && !isSkyblock && (
        <button
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setFlyMode((f) => !f);
          }}
          style={{ touchAction: "none" }}
          className="p-0 border-0 bg-transparent outline-none active:scale-90 transition-transform cursor-pointer select-none absolute right-4 bottom-[max(190px,calc(env(safe-area-inset-bottom)+180px))] z-10"
          aria-label="Toggle Fly"
        >
          <img
            src="/assets/hud/pitch_black/dark_MainControlImageSet_fly.png"
            alt="Fly"
            className="h-12 w-12 object-contain pointer-events-none drop-shadow-md"
            draggable={false}
          />
        </button>
      )}

      {/* Fly-down button (NO button holder) */}
      {flyMode && !isSkyblock && (
        <button
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            window.dispatchEvent(new Event("bm-fly-down"));
          }}
          style={{ touchAction: "none" }}
          className="p-0 border-0 bg-transparent outline-none active:scale-90 transition-transform cursor-pointer select-none absolute right-4 bottom-[max(72px,calc(env(safe-area-inset-bottom)+62px))] z-10"
          aria-label="Fly Down"
        >
          <img
            src="/assets/hud/pitch_black/dark_fly_control_jiangdi.png"
            alt="Fly Down"
            className="h-12 w-12 object-contain pointer-events-none drop-shadow-md"
            draggable={false}
          />
        </button>
      )}

      {/* ── ACTION CONTROLS: Jump, Walk, Run, Crouch (Custom Assets) ──────────────────────── */}
      {!isBlockyplaza && (
        <div
          className={`absolute right-4 bottom-[max(20px,calc(env(safe-area-inset-bottom)+16px))] z-30 flex flex-col items-end pointer-events-auto ${isSkyblock ? "gap-2.5" : "gap-3"}`}
        >
          {/* Movement Mode Toggle Buttons (Walk & Run) */}
          <div className="flex items-center gap-2">
            {/* Walk Button */}
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                setWalk();
              }}
              className={`p-0 border-0 bg-transparent outline-none active:scale-90 transition-all cursor-pointer select-none ${
                movementMode === "walk"
                  ? "opacity-100 scale-105 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]"
                  : "opacity-60 hover:opacity-90"
              }`}
              title="Walk"
              aria-label="Walk"
            >
              <img
                src="https://maxwell.z3ki.dev/bot/_files/icon-front-walk/icon_front_walk.png"
                alt="Walk"
                className="h-11 w-11 sm:h-12 sm:w-12 object-contain pointer-events-none drop-shadow-md"
                draggable={false}
              />
            </button>

            {/* Run Button */}
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                setRun();
              }}
              className={`p-0 border-0 bg-transparent outline-none active:scale-90 transition-all cursor-pointer select-none ${
                movementMode === "run"
                  ? "opacity-100 scale-105 drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]"
                  : "opacity-60 hover:opacity-90"
              }`}
              title="Run"
              aria-label="Run"
            >
              <img
                src="https://maxwell.z3ki.dev/bot/_files/icon-side-sprint/icon_side_sprint.png"
                alt="Run"
                className="h-11 w-11 sm:h-12 sm:w-12 object-contain pointer-events-none drop-shadow-md"
                draggable={false}
              />
            </button>
          </div>

          {/* Crouch Button */}
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              toggleCrouch();
            }}
            className={`p-0 border-0 bg-transparent outline-none active:scale-90 transition-all cursor-pointer select-none ${
              movementMode === "crouch"
                ? "opacity-100 scale-105 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]"
                : "opacity-70 hover:opacity-100"
            }`}
            title={movementMode === "crouch" ? "Crouching (tap to stand)" : "Stand (tap to crouch)"}
            aria-label="Toggle Crouch"
          >
            <img
              src="https://maxwell.z3ki.dev/bot/_files/icon-side-walk/icon_side_walk.png"
              alt="Crouch"
              className="h-12 w-12 sm:h-13 sm:w-13 object-contain pointer-events-none drop-shadow-md"
              draggable={false}
            />
          </button>

          {/* Jump Button (Hosted button PNG) */}
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              window.dispatchEvent(new Event("bm-jump"));
            }}
            className="relative w-16 h-16 sm:w-18 sm:h-18 p-0 border-0 bg-transparent outline-none active:scale-90 transition-transform cursor-pointer select-none flex items-center justify-center"
            title="Jump"
            aria-label="Jump"
          >
            <img
              src={HUD_ASSETS.button}
              alt="Jump"
              className="w-full h-full object-contain pointer-events-none drop-shadow-lg select-none"
              draggable={false}
            />
            <img
              src="https://maxwell.z3ki.dev/bot/_files/icon-head-sprint/icon_head_sprint.png"
              alt=""
              className="absolute inset-0 w-full h-full object-contain p-2.5 pointer-events-none drop-shadow-md select-none"
              draggable={false}
            />
          </button>
        </div>
      )}

      {/* Hotbar — TNT Rush shows single TNT slot; others show full block bar */}
      {isTntRush && (
        <div className="absolute bottom-[max(14px,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-10">
          <div className="hud-plate rounded-[18px] p-1.5 flex items-center gap-2 px-3">
            <div
              className="h-11 w-11 rounded-[13px] grid place-items-center ring-2 ring-primary shadow-[0_0_0_3px_rgba(244,80,30,0.35),0_4px_10px_rgba(0,0,0,0.22)] scale-[1.08]"
              style={{
                backgroundImage: `url(/textures/blocks/tnt_side.png)`,
                backgroundSize: "cover",
                imageRendering: "pixelated",
              }}
            />
            <span className="text-[12px] font-extrabold text-white/80 tracking-wide">TNT</span>
          </div>
        </div>
      )}
      {/* ── SKYBLOCK bottom status bars (hearts + food) ─────────────────────── */}
      {isSkyblock && false && (
        <div
          className="absolute left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-[5px]"
          style={{ bottom: "max(76px,calc(env(safe-area-inset-bottom)+68px))" }}
        >
          {/* Hearts */}
          <div className="flex items-center gap-[4px]">
            {Array.from({ length: 10 }).map((_, i) => (
              <svg
                key={i}
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill={
                  i < hearts.filter((h) => h !== "empty").length
                    ? "#e53e3e"
                    : "rgba(255,255,255,0.15)"
                }
                style={{
                  filter:
                    i < hearts.filter((h) => h !== "empty").length
                      ? "drop-shadow(0 0 3px rgba(229,62,62,0.70))"
                      : "none",
                }}
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            ))}
          </div>
          {/* Food / hunger */}
          <div className="flex items-center gap-[4px]">
            {Array.from({ length: 10 }).map((_, i) => (
              <svg
                key={i}
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill={i < 7 ? "#c05621" : "rgba(255,255,255,0.15)"}
                style={{ filter: i < 7 ? "drop-shadow(0 0 3px rgba(192,86,33,0.60))" : "none" }}
              >
                <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
                <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
                <line x1="6" y1="1" x2="6" y2="4" stroke="currentColor" strokeWidth="2" />
                <line x1="10" y1="1" x2="10" y2="4" stroke="currentColor" strokeWidth="2" />
                <line x1="14" y1="1" x2="14" y2="4" stroke="currentColor" strokeWidth="2" />
              </svg>
            ))}
          </div>
        </div>
      )}

      {/* Hotbar — available in Engine Test and BedWars (Skyblock uses SkyblockPastedHud) */}
      {!isSpleef && !isTntRush && !isBlockyplaza && !isSkyblock && (
        <div className="absolute bottom-[max(14px,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1.5">
          <div
            className="rounded-[20px] p-1.5 flex gap-1"
            style={
              isSkyblock
                ? {
                    background:
                      "linear-gradient(145deg, rgba(20,24,32,0.92) 0%, rgba(35,42,54,0.88) 58%, rgba(15,20,28,0.90) 100%)",
                    backdropFilter: "blur(28px)",
                    WebkitBackdropFilter: "blur(28px)",
                    border: "1.5px solid rgba(255,255,255,0.22)",
                    boxShadow: "0 12px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.25)",
                  }
                : {
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.88) 0%, rgba(255,255,255,0.60) 100%)",
                    backdropFilter: "blur(28px) saturate(200%)",
                    WebkitBackdropFilter: "blur(28px) saturate(200%)",
                    border: "1.5px solid rgba(255,255,255,0.80)",
                    boxShadow:
                      "0 1px 0 rgba(255,255,255,0.95) inset, 0 -1px 0 rgba(0,0,0,0.05) inset, 0 12px 28px rgba(0,0,0,0.28), 0 3px 6px rgba(0,0,0,0.14)",
                  }
            }
          >
            {BLOCKS.slice(0, HOTBAR_COUNT).map((b, i) => {
              const isActive = slot === i;
              const showShovel = isActive && heldShovelIdx !== null;
              const td = showShovel ? SHOVEL_TIERS[heldShovelIdx!] : null;
              return (
                <button
                  key={b.name}
                  onClick={() => {
                    setHeldShovelIdx(null);
                    setSlot(i);
                    window.dispatchEvent(new CustomEvent("bm-slot", { detail: i }));
                  }}
                  className="press relative h-11 w-11 rounded-[14px] grid place-items-center overflow-hidden transition-all duration-150"
                  style={
                    isActive
                      ? {
                          ...(showShovel
                            ? { background: td!.color }
                            : blockIcons[b.name]
                              ? {
                                  backgroundImage: `url(${blockIcons[b.name]})`,
                                  backgroundSize: "cover",
                                }
                              : { background: `#${b.color.toString(16).padStart(6, "0")}` }),
                          boxShadow: isSkyblock
                            ? "0 0 0 2px rgba(255,255,255,0.22), 0 0 0 4px #f4c430, 0 4px 16px rgba(244,196,48,0.70)"
                            : "0 0 0 2.5px #fff, 0 0 0 4.5px #f4c430, 0 4px 14px rgba(244,196,48,0.55)",
                          transform: "scale(1.10)",
                        }
                      : {
                          ...(showShovel
                            ? { background: td!.color }
                            : blockIcons[b.name]
                              ? {
                                  backgroundImage: `url(${blockIcons[b.name]})`,
                                  backgroundSize: "cover",
                                }
                              : { background: `#${b.color.toString(16).padStart(6, "0")}` }),
                          boxShadow: isSkyblock
                            ? "0 2px 6px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.10), 0 0 0 1px rgba(255,255,255,0.09)"
                            : "0 2px 5px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.45), 0 0 0 1px rgba(0,0,0,0.08)",
                        }
                  }
                  aria-label={showShovel ? td!.name : b.name}
                >
                  {/* Slot gloss */}
                  {!isActive && (
                    <div
                      className="absolute inset-x-0 top-0 h-1/2 pointer-events-none rounded-t-[14px]"
                      style={{
                        background: "linear-gradient(180deg,rgba(255,255,255,0.28),transparent)",
                      }}
                    />
                  )}
                  {showShovel ? (
                    <img
                      src={getShovelIcon(td!.color)}
                      alt=""
                      className="h-8 w-8 object-contain relative z-10"
                    />
                  ) : (
                    <span className="absolute bottom-0.5 right-1 text-[9px] font-extrabold text-white/95 tabular-nums drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] relative z-10">
                      {i + 1}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {/* Inventory Tab button (Requirement 6) */}
          {!isSkyblock && (
            <button
              type="button"
              onClick={() => setInvOpen(true)}
              className="h-11 w-11 rounded-[14px] bg-[#22242b]/85 border border-white/15 flex items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.35)] transition-transform active:scale-90 hover:bg-[#22242b]/95 shrink-0 cursor-pointer"
              aria-label="Inventory"
            >
              <img
                src="https://file.garden/alGOOylwpAfCa6qP/IMG_7276.png"
                alt="Inventory"
                className="w-5 h-5 object-contain pointer-events-none"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "/assets/hud/v2/inventory_tab.png";
                }}
              />
            </button>
          )}
        </div>
      )}

      {/* Skyblock uses the world crosshair for mining; no separate sword
          button or extra credits/action affordance is shown. */}

      {isSkyblock && skyPassOpen && <SkyblockPassMenu onClose={() => setSkyPassOpen(false)} />}

      {/* Skyblock collapsible side nav — removed in favour of the right action panel */}

      {/* ── SKYBLOCK TUTORIAL OVERLAY ─────────────────────────────────────── */}
      {isSkyblock && false && sbTutorialStep >= 0 && (
        <SkyblockTutorial
          step={sbTutorialStep}
          onNext={() => setSbTutorialStep((s) => s + 1)}
          onSkip={sbTutorialDone}
        />
      )}

      {/* Floating grey chat popup bubble with 3D avatar */}
      {chatBubble && !chatOpen && (
        <div
          className="pointer-events-none fixed top-[max(64px,calc(env(safe-area-inset-top)+54px))] left-1/2 -translate-x-1/2 z-40 animate-fade-in flex items-center gap-2.5 px-3.5 py-2.5 rounded-[18px]"
          style={{
            background: "linear-gradient(145deg, rgba(38,44,56,0.94) 0%, rgba(24,28,36,0.96) 100%)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.16)",
            boxShadow: "0 8px 30px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.18)",
            maxWidth: "min(380px, calc(100vw - 32px))",
          }}
        >
          <div className="relative h-10 w-10 shrink-0 rounded-[12px] overflow-hidden bg-slate-800 border border-white/20 shadow-inner">
            <QblockCharacter className="h-full w-full" autoRotate interactive={false} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-black text-[#fa4616] tracking-wide flex items-center gap-1.5">
              <span>{chatBubble.sender}</span>
              <span className="text-[8px] text-slate-400 font-bold px-1.5 py-0.5 rounded bg-white/10">
                CHAT
              </span>
            </div>
            <div className="text-[13px] font-semibold text-white/95 leading-snug truncate mt-0.5">
              {chatBubble.text}
            </div>
          </div>
        </div>
      )}

      {/* Floating item pickup toast */}
      {itemToast && (
        <div
          className="pointer-events-none fixed bottom-[max(88px,calc(env(safe-area-inset-bottom)+80px))] right-4 z-40 animate-fade-in flex items-center gap-2 px-3 py-1.5 rounded-[14px]"
          style={{
            background: "linear-gradient(145deg, rgba(30,36,46,0.92) 0%, rgba(18,22,30,0.96) 100%)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            border: "1px solid rgba(255,255,255,0.22)",
            boxShadow: "0 6px 20px rgba(0,0,0,0.40)",
          }}
        >
          <img src={itemToast.icon} alt="" className="h-6 w-6 object-contain" />
          <span className="text-[12px] font-extrabold text-white">
            +{itemToast.count} {itemToast.name}
          </span>
        </div>
      )}

      {/* Full-page in-game chat */}
      {chatOpen && (
        <ChatOverlay
          chatMsgs={chatMsgs}
          chatVal={chatVal}
          setChatVal={setChatVal}
          sendChat={sendChat}
          onClose={() => setChatOpen(false)}
        />
      )}

      {/* Game settings modal */}
      {settingsOpen && (
        <GameSettingsModal
          onClose={() => setSettingsOpen(false)}
          privateServer={privateServer}
          camMode={camMode}
          onCamMode={setCamMode}
          isSkyblock={isSkyblock}
          nightMode={nightMode}
          onToggleNightMode={() => setNightMode((n) => !n)}
          invertJoyY={invertJoyY}
          onToggleInvertJoyY={() => setInvertJoyY((v) => !v)}
          invertJoyX={invertJoyX}
          onToggleInvertJoyX={() => setInvertJoyX((v) => !v)}
          qualityPref={qualityPrefState}
          onQualityPref={(q) => {
            setQualityPrefState(q);
            try {
              localStorage.setItem("bm-quality", q);
            } catch {}
            window.dispatchEvent(new CustomEvent("bm-quality", { detail: q }));
          }}
        />
      )}

      {/* ── Plain Android-style Quit Confirmation Dialog ── */}
      {showQuitDialog && (
        <div
          className="fixed inset-0 z-[500] bg-black/75 flex items-center justify-center p-4 backdrop-blur-[2px]"
          onClick={() => setShowQuitDialog(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[320px] bg-[#242424] text-white rounded-[4px] p-6 shadow-2xl border border-white/10 font-sans select-none animate-in fade-in zoom-in-95 duration-150"
          >
            <p className="text-[17px] font-normal leading-relaxed text-zinc-100 mb-7">
              Do you wish to quit this game?
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowQuitDialog(false)}
                className="px-4 py-2 text-[14px] font-bold tracking-wider text-[#80cbc4] hover:bg-white/5 active:bg-white/10 rounded-[2px] transition uppercase cursor-pointer"
              >
                NO
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowQuitDialog(false);
                  nav({ to: "/" as never });
                }}
                className="px-4 py-2 text-[14px] font-bold tracking-wider text-[#80cbc4] hover:bg-white/5 active:bg-white/10 rounded-[2px] transition uppercase cursor-pointer"
              >
                YES
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Minecraft-style Glossy Inventory modal */}
      {invOpen && (
        <AdvancedInventoryModal
          onClose={() => setInvOpen(false)}
          skyblock={isSkyblock}
          coins={bpGold}
          onEquip={(item, targetSlot) => {
            if (item.key.startsWith("shovel-")) {
              const tier = SHOVEL_TIERS.findIndex((t) => `shovel-${t.name}` === item.key);
              if (tier >= 0) {
                setHeldShovelIdx(tier);
                window.dispatchEvent(
                  new CustomEvent("bm-equip", { detail: { type: "shovel", tier } }),
                );
              }
            } else {
              const blockIdx = BLOCKS.findIndex((b) => `block-${b.name}` === item.key);
              if (blockIdx >= 0) {
                setHeldShovelIdx(null);
                setSlot(blockIdx);
                if (typeof targetSlot === "number" && targetSlot >= 0 && targetSlot < 5) {
                  setSkyblockHotbarSlots((prev) => {
                    const next = [...prev];
                    next[targetSlot] = blockIdx;
                    return next;
                  });
                }
                window.dispatchEvent(
                  new CustomEvent("bm-equip", { detail: { type: "block", slot: blockIdx } }),
                );
              }
            }
            setInvOpen(false);
          }}
        />
      )}

      {/* Skyblock currency purchase modal */}
      {sbBuyType && <BuyModal type={sbBuyType} onClose={() => setSbBuyType(null)} />}

      {/* Skyblock Shop & Rule Book Full Page Modals */}
      {shopModalOpen && <SkyblockShopModal onClose={() => setShopModalOpen(false)} />}
      {ruleBookModalOpen && <SkyblockRuleBookModal onClose={() => setRuleBookModalOpen(false)} />}
      {chestOpen && <ChestModal onClose={() => setChestOpen(false)} />}
    </div>
  );
}

export type InvItem = {
  key: string;
  name: string;
  icon: string;
  qty?: number;
  blockType?: number;
  locked?: boolean;
};

// Renders live, slowly-rotating 3D previews of every block item in the
// inventory grid — one shared WebGLRenderer + one shared unit cube, drawn
// once per item per frame into that item's own viewport/scissor rect. A
// separate renderer (and 6 more WebGL contexts) per grid tile would blow
// past the browser's context budget fast; this technique scales to any
// number of tiles for the cost of one context.
function Block3DPreviewLayer({
  containerRef,
  itemRefs,
  items,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  itemRefs: React.RefObject<Map<string, HTMLButtonElement>>;
  items: InvItem[];
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch {
      return; // No WebGL available — grid just shows its empty tiles.
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.LinearToneMapping;
    renderer.toneMappingExposure = 1.0;

    let matForType: (type: number) => THREE.Material | THREE.Material[];
    try {
      ({ matForType } = getProceduralAssets(renderer));
    } catch {
      renderer.dispose();
      return;
    }

    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0x87ceeb, 0x8bc34a, 1.1));
    const sun = new THREE.DirectionalLight(0xfff5e0, 1.9);
    sun.position.set(3, 5, 4);
    scene.add(sun);
    // FOV 42 + pulled-back position so each block fills ~60% of its cell,
    // not the whole tile — fixes the "inventory blocks look too big" issue.
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 12);
    camera.position.set(1.6, 1.25, 2.1);
    camera.lookAt(0, 0, 0);

    const cubeGeo = new THREE.BoxGeometry(1, 1, 1);
    const previewMesh = new THREE.Mesh(cubeGeo, undefined);
    scene.add(previewMesh);

    let raf = 0;
    let disposed = false;
    const clock = new THREE.Clock();

    function resize() {
      const w = container!.clientWidth,
        h = container!.clientHeight;
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas!.width = Math.max(1, Math.round(w * dpr));
      canvas!.height = Math.max(1, Math.round(h * dpr));
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
    }
    resize();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    ro?.observe(container);

    function tick() {
      if (disposed) return;
      const t = clock.getElapsedTime();
      const canvasRect = canvas!.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio, 2);
      const pxW = canvas!.width,
        pxH = canvas!.height;
      if (canvasRect.width > 0 && pxW > 0) {
        renderer.setScissorTest(true);
        let i = 0;
        for (const item of items) {
          if (item.blockType === undefined) continue;
          const el = itemRefs.current.get(item.key);
          i++;
          if (!el) continue;
          const r = el.getBoundingClientRect();
          const localLeft = r.left - canvasRect.left;
          const localTop = r.top - canvasRect.top;
          // Skip tiles scrolled fully out of the visible container — no
          // point paying a render pass for something the user can't see.
          if (localTop + r.height < 0 || localTop > canvasRect.height) continue;
          if (r.width <= 0 || r.height <= 0) continue;
          const vx = Math.round(localLeft * dpr);
          const vy = Math.round(pxH - (localTop + r.height) * dpr);
          const vw = Math.round(r.width * dpr);
          const vh = Math.round(r.height * dpr);
          renderer.setViewport(vx, vy, vw, vh);
          renderer.setScissor(vx, vy, vw, vh);
          camera.aspect = vw / vh;
          camera.updateProjectionMatrix();
          previewMesh.material = matForType(item.blockType) as THREE.Material | THREE.Material[];
          // Keep the thumbnail still: the item should read as a compact,
          // textured 3D block rather than a spinning placeholder.
          previewMesh.rotation.y = 0.58 + i * 0.08;
          previewMesh.rotation.x = -0.3;
          renderer.render(scene, camera);
        }
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro?.disconnect();
      cubeGeo.dispose();
      // matForType's materials are the module-level cached singletons shared
      // with the live game scene — do not dispose them here.
      renderer.dispose();
    };
  }, [containerRef, itemRefs, items]);

  return (
    <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" aria-hidden="true" />
  );
}

function SkyblockPassMenu({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/25 px-4"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="uiverse-white-control w-full max-w-[330px] overflow-hidden rounded-[18px]"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-stone-300/60 px-4 py-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-stone-500">
              Battle Pass
            </div>
            <div className="mt-0.5 text-[20px] font-black tracking-tight text-stone-800">
              New Horizon
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close New Horizon Battle Pass"
            className="uiverse-white-control grid h-8 w-8 place-items-center rounded-[10px]"
          >
            <X className="h-4 w-4 text-stone-600" />
          </button>
        </div>
        <div className="flex min-h-[180px] items-center justify-center px-6 py-8 text-center">
          <div>
            <Archive className="mx-auto h-8 w-8 text-stone-400" strokeWidth={1.5} />
            <div className="mt-3 text-[12px] font-black uppercase tracking-[0.12em] text-stone-600">
              Coming later
            </div>
            <div className="mt-1 text-[11px] font-semibold text-stone-400">No items yet.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── BedWars HUD components ───────────────────────────────────────────────────

// Blockmango 2019-2020 style direct-items sidebar shown during lobby phase.
// Vertical strip anchored to the right edge — items are accessible without
// opening any modal, just like the classic BedWars lobby panel.
// Lobby sidebar items — Sword, Bow, Wool, Arrow, TNT, Iron, Gold.
// Tapping an item selects it (highlights it) AND dispatches bm-bwHeld so
// the engine knows what the player is holding.  Double-tap PLAY to queue a match.
const BW_LOBBY_ITEMS = [
  { id: "sword", icon: "/short-sword.svg", label: "Short Sword", accent: "#5be6e0" },
  { id: "bow", icon: "/items/bow.png", label: "Bow", accent: "#c8a864" },
  { id: "arrow", icon: "/items/bow.png", label: "Arrow", accent: "#e8d88a" },
  { id: "wool", icon: "/textures/blocks/white_wool.png", label: "Wool", accent: "#eeeeee" },
  { id: "tnt", icon: "/textures/blocks/tnt_side.png", label: "TNT", accent: "#cc3322" },
  { id: "iron", icon: "/textures/blocks/iron_block.png", label: "Iron", accent: "#d8dde0" },
  { id: "gold", icon: "/textures/blocks/gold_block.png", label: "Gold", accent: "#f5c400" },
];

function BwLobbySidebar({ onPlay }: { onPlay: () => void }) {
  const [selected, setSelected] = useState("sword");

  function selectItem(id: string) {
    setSelected(id);
    window.dispatchEvent(new CustomEvent("bm-bwHeld", { detail: id }));
  }

  return (
    <div className="absolute right-0 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-[3px] pr-2">
      {BW_LOBBY_ITEMS.map((item) => {
        const active = selected === item.id;
        return (
          <button
            key={item.id}
            onClick={() => selectItem(item.id)}
            aria-label={item.label}
            className="press flex items-center gap-2 pl-2 pr-3 py-[6px] rounded-l-[11px] transition-all"
            style={{
              background: active ? `${item.accent}28` : "rgba(0,0,0,0.60)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              border: `1px solid ${active ? item.accent + "88" : "rgba(255,255,255,0.10)"}`,
              borderRight: "none",
              boxShadow: active
                ? `inset 0 0 10px ${item.accent}33, 0 0 8px ${item.accent}44`
                : undefined,
            }}
          >
            <div
              className="h-8 w-8 rounded-[7px] grid place-items-center shrink-0"
              style={{
                background: `${item.accent}${active ? "44" : "22"}`,
                border: `1.5px solid ${item.accent}${active ? "bb" : "55"}`,
              }}
            >
              <img
                src={item.icon}
                alt=""
                className="h-[22px] w-[22px] object-contain"
                style={{ imageRendering: "pixelated" }}
              />
            </div>
            <span
              className="text-[11px] font-extrabold tracking-wide leading-none"
              style={{
                color: item.accent,
                textShadow: active ? `0 0 8px ${item.accent}` : "0 1px 3px rgba(0,0,0,0.7)",
              }}
            >
              {item.label}
            </span>
            {active && (
              <span
                className="ml-auto text-[9px] font-black opacity-70"
                style={{ color: item.accent }}
              >
                ✓
              </span>
            )}
          </button>
        );
      })}
      <button
        onClick={onPlay}
        className="press mt-1 rounded-l-[11px] py-2 px-3 flex items-center justify-center gap-1.5"
        style={{
          background: "linear-gradient(135deg,#f59e0b,#ef4444)",
          border: "1px solid rgba(255,255,255,0.18)",
          borderRight: "none",
        }}
      >
        <span className="text-[12px] font-black text-white tracking-wide">▶ PLAY</span>
      </button>
    </div>
  );
}

function BedwarsHud({ bwState }: { bwState: BedwarsState }) {
  return (
    <>
      {/* Team status — top left below health */}
      <div className="absolute left-3 top-[112px] z-10 flex flex-col gap-1.5">
        <BwTeamRow
          color="#ef4444"
          label="Red (You)"
          bedAlive={bwState.redTeam.bedAlive}
          playerAlive={bwState.redTeam.playerAlive}
          isPlayer
        />
        <BwTeamRow
          color="#3b82f6"
          label="Blue"
          bedAlive={bwState.blueTeam.bedAlive}
          playerAlive={bwState.blueTeam.playerAlive}
        />
      </div>

      {/* Resource counters — top center */}
      <div className="absolute top-[max(58px,calc(env(safe-area-inset-top)+48px))] left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5">
        <BwResource
          label="Iron"
          count={bwState.iron}
          bg="bg-slate-300/90"
          textColor="text-slate-800"
        />
        <BwResource
          label="Gold"
          count={bwState.gold}
          bg="bg-yellow-400/90"
          textColor="text-yellow-900"
        />
        <BwResource
          label="Emerald"
          count={bwState.emerald}
          bg="bg-emerald-400/90"
          textColor="text-emerald-900"
        />
      </div>
    </>
  );
}

function EggwarsHud({ eggState }: { eggState: EggwarsState }) {
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const teamColors: Record<EggwarsTeam["id"], string> = {
    ruby: "#ef4444",
    azure: "#38bdf8",
    jade: "#34d399",
    gold: "#fbbf24",
  };
  return (
    <>
      <div className="absolute left-3 top-[112px] z-10 flex flex-col gap-1.5">
        {eggState.teams.map((team) => (
          <div
            key={team.id}
            className={`hud-plate rounded-xl px-2.5 h-8 flex items-center gap-1.5 ${team.id === "ruby" ? "ring-1 ring-white/40" : ""}`}
          >
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ background: teamColors[team.id] }}
            />
            <span className="text-[11px] font-bold text-foreground/90 leading-none min-w-[52px]">
              {team.label}
            </span>
            <EggIcon
              className={`h-3.5 w-3.5 ${team.eggAlive ? "text-amber-500" : "text-slate-400"}`}
              strokeWidth={2.4}
            />
            {!team.eggAlive &&
              (team.playerAlive ? (
                <HeartIcon className="h-3 w-3 fill-rose-500 text-rose-500" strokeWidth={2.2} />
              ) : (
                <Skull className="h-3.5 w-3.5 text-slate-400" strokeWidth={2.2} />
              ))}
          </div>
        ))}
      </div>

      <div className="absolute top-[max(58px,calc(env(safe-area-inset-top)+48px))] left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5">
        <div className="liquid-glass rounded-full h-7 px-2.5 flex items-center gap-1 text-[11px] font-extrabold tabular-nums">
          <Timer className="h-[13px] w-[13px]" />
          {fmt(eggState.time)}
        </div>
        <EggResource label="Iron" count={eggState.iron} color="#d7e3ed" />
        <EggResource label="Gold" count={eggState.gold} color="#fbbf24" />
        <EggResource label="Diamond" count={eggState.diamond} color="#67e8f9" />
      </div>

      <div className="absolute right-3 top-[112px] z-10">
        <div className="hud-plate rounded-xl px-2.5 py-1.5 flex flex-col items-end gap-0.5">
          <span className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-foreground/55">
            Diamond generator
          </span>
          <span className="text-[12px] font-black text-cyan-500">
            Level {eggState.generatorLevel}
          </span>
        </div>
      </div>
    </>
  );
}

function EggResource({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div
      className="rounded-full h-7 px-2 flex items-center gap-1 shadow-sm"
      style={{ background: `${color}dd` }}
    >
      <span className="text-[11px] font-bold text-slate-900 tabular-nums">{count}</span>
      <span className="text-[9px] font-semibold text-slate-900/70 leading-none">{label}</span>
    </div>
  );
}

function EggwarsResult({
  won,
  state,
  onPlayAgain,
}: {
  won: boolean;
  state: EggwarsState;
  onPlayAgain: () => void;
}) {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="flex flex-col items-center gap-2">
        <div
          className="grid h-[88px] w-[88px] place-items-center rounded-[26px] animate-micro-pop"
          style={{
            background: won ? "rgba(250,204,21,0.18)" : "rgba(248,113,113,0.16)",
            color: won ? "#facc15" : "#f87171",
            filter: `drop-shadow(0 4px 12px ${won ? "rgba(255,200,0,0.5)" : "rgba(255,0,0,0.4)"})`,
          }}
        >
          {won ? (
            <Trophy className="h-14 w-14" strokeWidth={1.8} />
          ) : (
            <Skull className="h-14 w-14" strokeWidth={1.8} />
          )}
        </div>
        <div className="text-[46px] font-black text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.5)] tracking-tight">
          {won ? "Victory!" : "Defeated!"}
        </div>
        <div className="text-white/70 text-[14px] font-semibold mt-1">
          {won ? "Azure has been eliminated." : "Your egg was destroyed and you were eliminated."}
        </div>
        <div className="mt-2 text-[13px] text-white/50">
          Resources collected:{" "}
          <span className="text-white font-bold">{state.iron + state.gold + state.diamond}</span>
        </div>
      </div>
      <div className="flex gap-3 mt-10">
        <button
          onClick={onPlayAgain}
          className="press h-12 px-7 rounded-[16px] bg-white/20 backdrop-blur-sm border border-white/30 text-white font-bold text-[15px]"
        >
          Play Again
        </button>
        <Link
          to={"/" as never}
          className="press h-12 px-7 rounded-[16px] bg-primary text-primary-foreground font-bold text-[15px] flex items-center gap-2"
        >
          <Home className="h-4 w-4" />
          Return to Lobby
        </Link>
      </div>
    </div>
  );
}

function BwTeamRow({
  color,
  label,
  bedAlive,
  playerAlive,
  isPlayer,
}: {
  color: string;
  label: string;
  bedAlive: boolean;
  playerAlive: boolean;
  isPlayer?: boolean;
}) {
  return (
    <div
      className={`hud-plate rounded-xl px-2.5 h-8 flex items-center gap-1.5 ${isPlayer ? "ring-1 ring-white/40" : ""}`}
    >
      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: color }} />
      <span className="text-[11px] font-bold text-foreground/90 leading-none flex-1 min-w-0">
        {label}
      </span>
      <span className="text-[12px]">{bedAlive ? "🛏" : "💀"}</span>
      {!bedAlive && (
        <span className="text-[11px] text-foreground/70">{playerAlive ? "❤" : "☠"}</span>
      )}
    </div>
  );
}

function BwResource({
  label,
  count,
  bg,
  textColor,
}: {
  label: string;
  count: number;
  bg: string;
  textColor: string;
}) {
  return (
    <div className={`${bg} rounded-full h-7 px-2.5 flex items-center gap-1 shadow-sm`}>
      <span className={`text-[11px] font-bold ${textColor} tabular-nums`}>{count}</span>
      <span className={`text-[9px] font-semibold ${textColor} opacity-70 leading-none`}>
        {label}
      </span>
    </div>
  );
}

function Heart({ state }: { state: string }) {
  if (state === "empty") {
    return <GameHeartIcon className="h-[18px] w-[18px] opacity-25 grayscale" aria-hidden />;
  }
  return (
    <span
      className="relative inline-block h-[18px] w-[18px]"
      style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.6))" }}
    >
      <GameHeartIcon className="absolute inset-0 h-full w-full" />
      {state === "half" && (
        <span
          className="absolute inset-y-0 right-0 w-1/2 bg-black/60"
          style={{ mixBlendMode: "multiply" }}
        />
      )}
    </span>
  );
}

function SpleefHud({
  phase,
  countdown,
  elapsed,
  overtime,
  lastElim,
}: {
  phase: SpleefPhase;
  countdown: number;
  elapsed: number;
  overtime: boolean;
  lastElim: string | null;
}) {
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <>
      {/* Timer pill, top center */}
      <div className="absolute top-[max(58px,calc(env(safe-area-inset-top)+48px))] left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
        <div className="liquid-glass rounded-full h-8 px-3 flex items-center gap-1.5 text-[12px] font-extrabold tabular-nums">
          <Timer className="h-[13px] w-[13px]" />
          {fmt(elapsed)}
        </div>
        {overtime && (
          <div className="rounded-full h-8 px-3 flex items-center gap-1.5 text-[12px] font-extrabold text-white bg-rose-500/90 animate-pulse">
            <Zap className="h-[13px] w-[13px]" />
            Sudden Death
          </div>
        )}
      </div>

      {/* Fell-in toast */}
      {lastElim && (
        <div className="absolute top-[calc(max(58px,calc(env(safe-area-inset-top)+48px))+44px)] left-1/2 -translate-x-1/2 z-10 animate-fade-in">
          <div className="liquid-glass rounded-full h-8 px-3.5 flex items-center gap-1.5 text-[12px] font-bold">
            <Star className="h-[13px] w-[13px] text-amber-500" />
            {lastElim}
          </div>
        </div>
      )}

      {/* Countdown overlay */}
      {phase === "countdown" && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 pointer-events-none">
          <div className="text-[13px] font-extrabold tracking-[0.3em] uppercase text-white/85 drop-shadow-lg">
            Get Ready
          </div>
          <div
            key={countdown}
            className="text-[104px] font-black text-white drop-shadow-[0_6px_18px_rgba(0,0,0,0.45)] animate-micro-pop"
          >
            {countdown}
          </div>
        </div>
      )}
    </>
  );
}

// ── Advanced chat overlay (v5) ────────────────────────────────────────────────
const CHAT_STICKERS = [
  { label: "Green Love", src: "/emojis/face/kirakira.png", text: "🥰" },
  { label: "Angry", src: "/emojis/face/pout.png", text: "😠" },
  { label: "Goggles", src: "/emojis/face/smug.png", text: "😎" },
  { label: "Sad", src: "/emojis/face/weep.png", text: "😢" },
  { label: "OK Wink", src: "/emojis/face/snrk.png", text: "👌" },
  { label: "Love", src: "/emojis/face/owocry.png", text: "❤️" },
  { label: "Smile", src: "/emojis/wechat/342085-wechat-smile.png", text: "😄" },
  { label: "Clap", src: "/emojis/wechat/342085-wechat-clap.png", text: "👏" },
  { label: "Sly", src: "/emojis/wechat/16662-wechatsly.png", text: "😏" },
  { label: "Shocked", src: "/emojis/wechat/816297-wechat-shocked.png", text: "😲" },
  { label: "Sob", src: "/emojis/wechat/239087-wechat-sob.png", text: "😭" },
  { label: "Whimper", src: "/emojis/wechat/275780-wechat-whimper.png", text: "🥺" },
  { label: "Sparkle", src: "/emojis/face/kirakira.png", text: "✨" },
  { label: "Smug", src: "/emojis/face/smug.png", text: "😎" },
  { label: "Squee", src: "/emojis/face/squee.png", text: "😆" },
  { label: "UwU", src: "/emojis/face/uwu.png", text: "uwu" },
  { label: "Zombie", src: "/emojis/face/zombie.png", text: "🧟" },
  { label: "Yawn", src: "/emojis/face/yawn.png", text: "🥱" },
  { label: "Pout", src: "/emojis/face/pout.png", text: "😤" },
  { label: "Sinister", src: "/emojis/face/Sinisterthink.png", text: "🤔" },
];

const QUICK_EMOJIS = [
  "👋",
  "🔥",
  "💀",
  "🏆",
  "❤️",
  "😂",
  "👍",
  "🤝",
  "💎",
  "⛏️",
  "⚔️",
  "⚡",
  "🌟",
  "🎉",
];

function ChatOverlay({
  chatMsgs,
  chatVal,
  setChatVal,
  sendChat,
  onClose,
}: {
  chatMsgs: Array<{ id: number; from: string; text: string; me?: boolean; special?: string }>;
  chatVal: string;
  setChatVal: (v: string) => void;
  sendChat: () => void;
  onClose: () => void;
}) {
  const { qbUser } = useAuth();
  const avatarCol = useAvatarColor();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [emojiTab, setEmojiTab] = useState<"stickers" | "emojis">("stickers");
  const [micListening, setMicListening] = useState(false);
  const [micNotice, setMicNotice] = useState<string | null>(null);
  const [selectedProfileUser, setSelectedProfileUser] = useState<ProfileUser | null>(null);

  async function handleOpenProfile(fromName: string, isMe?: boolean) {
    if (fromName === "System") return;

    if (isMe && qbUser) {
      setSelectedProfileUser({
        id: qbUser.uid,
        n: qbUser.displayName || qbUser.username || "You",
        username: qbUser.username,
        customId: qbUser.customId,
        color: qbUser.color || avatarColor(qbUser.displayName || "You"),
        online: true,
        bio: qbUser.bio || "",
        isOwn: true,
        avatarSnapshot: qbUser.avatarSnapshot,
        createdAt: qbUser.createdAt,
      });
      return;
    }

    try {
      const q1 = query(collection(db, "users"), where("username", "==", fromName), limit(1));
      let snap = await getDocs(q1);
      if (snap.empty) {
        const q2 = query(collection(db, "users"), where("displayName", "==", fromName), limit(1));
        snap = await getDocs(q2);
      }
      if (!snap.empty) {
        const docSnap = snap.docs[0];
        const d = docSnap.data();
        setSelectedProfileUser({
          id: docSnap.id,
          n: d.displayName || d.username || fromName,
          username: d.username,
          customId: d.customId,
          color: d.color || avatarColor(fromName),
          online: typeof d.online === "boolean" ? d.online : true,
          bio: d.bio || "",
          avatarSnapshot: d.avatarSnapshot,
          createdAt: d.createdAt,
          friendCount: d.friendCount,
          staff: d.staff,
          isOwn: docSnap.id === qbUser?.uid,
        });
      } else {
        setSelectedProfileUser({
          id: fromName,
          n: fromName,
          username: fromName,
          color: avatarColor(fromName),
          online: true,
          bio: "Skyblock Adventurer",
          isOwn: false,
        });
      }
    } catch {
      setSelectedProfileUser({
        id: fromName,
        n: fromName,
        username: fromName,
        color: avatarColor(fromName),
        online: true,
        bio: "Skyblock Adventurer",
        isOwn: false,
      });
    }
  }

  // Scroll to bottom on new messages
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chatMsgs]);

  // Auto-focus input when overlay mounts
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  function sendEmoji(text: string) {
    setChatVal(chatVal ? `${chatVal} ${text}` : text);
    setShowEmoji(false);
    inputRef.current?.focus();
  }

  function toggleMic() {
    type SpeechEvent = { results: ArrayLike<{ 0: { transcript: string } }> };
    type SpeechRecognitionLike = {
      lang: string;
      interimResults: boolean;
      maxAlternatives: number;
      start: () => void;
      stop: () => void;
      onresult: ((event: SpeechEvent) => void) | null;
      onend: (() => void) | null;
      onerror: (() => void) | null;
    };
    const speechWindow = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const SpeechRecognitionCtor =
      speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setMicNotice("Voice input is not available in this browser.");
      window.setTimeout(() => setMicNotice(null), 2200);
      return;
    }
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += `${i ? " " : ""}${event.results[i][0].transcript}`;
      }
      setChatVal(transcript);
      setMicListening(false);
      inputRef.current?.focus();
    };
    recognition.onend = () => setMicListening(false);
    recognition.onerror = () => {
      setMicListening(false);
      setMicNotice("I couldn't hear that. Try again.");
      window.setTimeout(() => setMicNotice(null), 2200);
    };
    setMicListening(true);
    recognition.start();
  }

  function avatarColor(name: string) {
    const colors = [
      "#2563eb",
      "#7c3aed",
      "#db2777",
      "#ea580c",
      "#16a34a",
      "#0891b2",
      "#d97706",
      "#4f46e5",
    ];
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
    return colors[h % colors.length];
  }

  return (
    <div
      className="absolute inset-0 z-30 flex flex-col animate-fade-in"
      style={{
        background: "rgba(241,245,249,0.96)",
        backdropFilter: "blur(32px) saturate(1.8)",
        WebkitBackdropFilter: "blur(32px) saturate(1.8)",
      }}
    >
      {/* ── WeChat / Modern game header ─── */}
      <div
        className="flex items-center gap-3 px-4 pt-[max(16px,env(safe-area-inset-top))] pb-3"
        style={{
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(226,232,240,0.85)",
          boxShadow: "0 4px 14px rgba(0,0,0,0.04)",
        }}
      >
        <button
          onClick={onClose}
          className="press h-9 w-9 rounded-full grid place-items-center shrink-0 bg-slate-100 hover:bg-slate-200 transition-colors"
          aria-label="Back"
        >
          <ChevronLeft className="h-5 w-5 text-slate-700" />
        </button>
        <div className="flex-1 text-center flex items-center justify-center gap-2">
          <div className="h-8 w-8 rounded-[10px] overflow-hidden bg-slate-800 border border-slate-300 shadow-sm shrink-0">
            <QblockCharacter className="h-full w-full" autoRotate interactive={false} />
          </div>
          <div className="text-left">
            <div className="text-[14px] font-extrabold text-slate-900 leading-none flex items-center gap-1.5">
              <GameChatIcon className="h-3.5 w-3.5 text-[#fa4616]" />
              <span>Skyblock Chat</span>
            </div>
            <div className="text-[10px] text-slate-500 font-semibold mt-0.5 flex items-center gap-1">
              <img
                src="/emojis/server/7921-verified-icon.png"
                alt=""
                className="h-2.5 w-2.5 object-contain inline-block"
              />
              <span>{qbUser?.displayName || qbUser?.username || "Adventurer"} · Live</span>
            </div>
          </div>
        </div>
        <div className="relative h-9 w-9 grid place-items-center">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <div className="absolute h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping opacity-60" />
        </div>
      </div>

      {/* ── Messages area ── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto ios-scroll px-4 py-4 space-y-3.5"
        style={{ background: "#f8fafc" }}
      >
        {chatMsgs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2.5 pb-12 text-center">
            <div className="h-16 w-16 rounded-2xl bg-[#fa4616]/10 grid place-items-center text-3xl shadow-level1">
              <img
                src="/emojis/wechat/342085-wechat-smile.png"
                alt="Welcome"
                className="h-10 w-10 object-contain"
              />
            </div>
            <div className="text-[15px] font-extrabold text-slate-800">
              Welcome to Skyblock Chat
            </div>
            <div className="text-[12px] font-medium text-slate-500 max-w-[240px]">
              Say hi to nearby islanders, coordinate mining runs, or trade resources!
            </div>
          </div>
        )}
        {chatMsgs.map((m) => {
          const isSystem = m.from === "System";
          return (
            <div
              key={m.id}
              className={`flex gap-2.5 animate-fade-in ${m.me ? "flex-row-reverse" : "flex-row"}`}
            >
              <button
                type="button"
                onClick={() => handleOpenProfile(m.from, m.me)}
                className="h-9 w-9 shrink-0 rounded-[11px] overflow-visible border border-slate-200/80 bg-white p-0.5 shadow-sm cursor-pointer hover:opacity-85 active:scale-95 transition-all text-left"
                aria-label={`View ${m.from}'s profile`}
              >
                {isSystem ? (
                  <div className="grid h-full w-full place-items-center rounded-[9px] bg-gradient-to-br from-amber-400 to-amber-600">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                ) : m.me ? (
                  <GlossyAvatar
                    snapshot={qbUser?.avatarSnapshot}
                    photoUrl={qbUser?.profilePhoto}
                    frame={qbUser?.avatarSnapshot?.frameId}
                    height={32}
                    autoRotate={false}
                    className="h-full w-full"
                  />
                ) : (
                  <div
                    className="grid h-full w-full place-items-center rounded-[9px] text-[13px] font-black text-white shadow-inner"
                    style={{ background: avatarColor(m.from) }}
                  >
                    {m.from.charAt(0).toUpperCase()}
                  </div>
                )}
              </button>

              <div className={`flex flex-col max-w-[76%] ${m.me ? "items-end" : "items-start"}`}>
                {!m.me && (
                  <button
                    type="button"
                    onClick={() => handleOpenProfile(m.from, false)}
                    className="text-[11px] font-bold mb-1 px-1 text-slate-600 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer transition-colors text-left"
                  >
                    {m.special && m.special !== "ladybug" && (
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider border ${
                          m.special === "OWNER"
                            ? "bg-amber-500/15 border-amber-500/40 text-amber-700"
                            : m.special === "VIP"
                              ? "bg-purple-500/15 border-purple-500/40 text-purple-700"
                              : "bg-blue-500/15 border-blue-500/40 text-blue-700"
                        }`}
                      >
                        {m.special}
                      </span>
                    )}
                    <span>{m.from}</span>
                    {isSystem && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-500/15 text-amber-700 uppercase">
                        SERVER
                      </span>
                    )}
                  </button>
                )}
                <div
                  className="text-[14px] font-medium leading-relaxed"
                  style={
                    m.me
                      ? {
                          background: "linear-gradient(135deg, #334155 0%, #1e293b 100%)",
                          color: "#f8fafc",
                          padding: "8px 14px",
                          borderRadius: "16px 4px 16px 16px",
                          border: "1px solid rgba(255,255,255,0.12)",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
                        }
                      : isSystem
                        ? {
                            background: "linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)",
                            border: "1px solid rgba(148,163,184,0.30)",
                            color: "#334155",
                            padding: "8px 14px",
                            borderRadius: "14px",
                            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                          }
                        : m.special === "ladybug"
                          ? {
                              background: "linear-gradient(135deg, #475569 0%, #334155 100%)",
                              border: "1px solid rgba(255,255,255,0.15)",
                              color: "#f8fafc",
                              padding: "8px 14px",
                              borderRadius: "4px 16px 16px 16px",
                              boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
                            }
                          : {
                              background: "#f1f5f9",
                              border: "1px solid #e2e8f0",
                              color: "#1e293b",
                              padding: "8px 14px",
                              borderRadius: "4px 16px 16px 16px",
                              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                            }
                  }
                >
                  {m.text}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Real icon & sticker picker tray ── */}
      {showEmoji && (
        <div className="px-4 py-3 border-t border-slate-200/80 bg-white shadow-level2 animate-sheet-up">
          <div className="flex gap-2 mb-2.5 border-b border-slate-100 pb-2">
            <button
              onClick={() => setEmojiTab("stickers")}
              className={`px-3 py-1 rounded-full text-[11px] font-extrabold flex items-center gap-1.5 transition-colors ${emojiTab === "stickers" ? "bg-[#fa4616] text-white shadow-sm" : "bg-slate-100 text-slate-600"}`}
            >
              <img
                src="/emojis/wechat/342085-wechat-smile.png"
                alt=""
                className="h-3.5 w-3.5 object-contain"
              />
              Stickers
            </button>
            <button
              onClick={() => setEmojiTab("emojis")}
              className={`px-3 py-1 rounded-full text-[11px] font-extrabold flex items-center gap-1.5 transition-colors ${emojiTab === "emojis" ? "bg-[#fa4616] text-white shadow-sm" : "bg-slate-100 text-slate-600"}`}
            >
              <span>😊</span>
              Emojis
            </button>
          </div>
          {emojiTab === "stickers" ? (
            <div className="grid grid-cols-7 gap-2 max-h-[140px] overflow-y-auto hide-scrollbar py-1">
              {CHAT_STICKERS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => sendEmoji(s.text)}
                  className="press p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/60 flex flex-col items-center justify-center transition-all aspect-square"
                  title={s.label}
                >
                  <img src={s.src} alt={s.label} className="h-7 w-7 object-contain" />
                </button>
              ))}
            </div>
          ) : (
            <div className="flex gap-2 flex-wrap py-1">
              {QUICK_EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => sendEmoji(e)}
                  className="press w-10 h-10 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/60 text-xl grid place-items-center transition-all"
                >
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Chat input bar ── */}
      <div className="px-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-2.5 bg-white border-t border-slate-200/80 shadow-level1">
        <div className="flex items-center gap-2">
          {/* Emoji / sticker toggle */}
          <button
            onClick={() => setShowEmoji((v) => !v)}
            className={`press w-10 h-10 grid place-items-center rounded-2xl shrink-0 transition-colors ${showEmoji ? "bg-[#fa4616]/15 border border-[#fa4616]/30" : "bg-slate-100 hover:bg-slate-200/70"}`}
            aria-label="Toggle stickers and emojis"
          >
            <img
              src="/emojis/wechat/342085-wechat-smile.png"
              alt=""
              className="h-5 w-5 object-contain"
            />
          </button>
          {/* Text input */}
          <div className="flex-1 h-11 rounded-2xl flex items-center px-4 bg-slate-100/90 border border-slate-200/70 focus-within:border-[#fa4616] focus-within:bg-white transition-all shadow-inner">
            <input
              ref={inputRef}
              value={chatVal}
              onChange={(e) => setChatVal(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendChat()}
              placeholder="Send a message to Skyblock…"
              className="flex-1 bg-transparent outline-none text-[14px] text-slate-900 placeholder:text-slate-400 font-medium"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          {/* Send / Mic button */}
          {chatVal.trim() ? (
            <button
              onClick={sendChat}
              className="press h-11 w-11 rounded-2xl grid place-items-center shrink-0 bg-gradient-to-b from-[#ff6230] via-[#fa4616] to-[#e03a0d] shadow-[0_4px_14px_rgba(250,70,22,0.38)] border border-[#fa4616]/60 hover:brightness-105 active:scale-95 transition-all text-white"
              aria-label="Send message"
            >
              <Send className="h-4 w-4 text-white" strokeWidth={2.6} />
            </button>
          ) : (
            <button
              onClick={toggleMic}
              aria-label={micListening ? "Stop voice input" : "Start voice input"}
              className={`press w-11 h-11 grid place-items-center rounded-2xl shrink-0 transition-all ${micListening ? "bg-red-500/15 border border-red-500/40 animate-pulse text-red-500" : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"}`}
            >
              {micListening ? (
                <span className="text-base font-black">●</span>
              ) : (
                <span className="text-base">🎙️</span>
              )}
            </button>
          )}
        </div>
        {micNotice && (
          <div className="mt-2 text-center text-[11px] font-semibold text-slate-500">
            {micNotice}
          </div>
        )}
      </div>

      {/* Selected player profile sheet modal */}
      {selectedProfileUser && (
        <ProfileSheet user={selectedProfileUser} onClose={() => setSelectedProfileUser(null)} />
      )}
    </div>
  );
}

function SkyblockPastedHud({
  escapeMode,
  islandId,
  onExit,
  onChat,
  onSettings,
  onBattlePass,
  camMode = "first",
  onToggleCamMode,
  area,
  onMining,
  onHome,
  onInventory,
  nearPhoenixNest,
  ridingPhoenix,
  running,
  onToggleRun,
  onGacha,
  onMall,
  onStats,
  onShop,
  onEvents,
  onRuleBook,
  activeSlot,
  hotbarBlockIds,
  onSelectSlot,
  onRequestQuit,
}: {
  escapeMode?: boolean;
  islandId?: string;
  onExit: () => void;
  onChat: () => void;
  onSettings: () => void;
  onRequestQuit?: () => void;
  onBattlePass: () => void;
  camMode?: "first" | "third" | "top";
  onToggleCamMode?: () => void;
  area: "home" | "mining";
  onMining: () => void;
  onHome: () => void;
  onInventory: () => void;
  nearPhoenixNest?: boolean;
  ridingPhoenix?: boolean;
  running?: boolean;
  onToggleRun?: () => void;
  onGacha?: () => void;
  onMall?: () => void;
  onStats?: () => void;
  onShop?: () => void;
  onEvents?: () => void;
  onRuleBook?: () => void;
  activeSlot?: number;
  hotbarBlockIds?: number[];
  onSelectSlot?: (slotIdx: number) => void;
}) {
  const { qbUser } = useAuth();
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [cubeMenuOpen, setCubeMenuOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState("11:20:56");
  const [likeCount, setLikeCount] = useState<number>(0);
  const [hasLiked, setHasLiked] = useState<boolean>(false);
  const [likeBurst, setLikeBurst] = useState<boolean>(false);
  const [latestMessage, setLatestMessage] = useState<SkyblockChatMessage | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const gold = useCurrency("gold");
  const starCoins = useCurrency("starCoins");
  const gems = useCurrency("gems");

  const effectiveIslandId = islandId || qbUser?.islandId || qbUser?.uid || "my_island";

  useEffect(() => {
    const unsubLikes = subscribeToIslandLikes(effectiveIslandId, (count, likedBy) => {
      setLikeCount(count);
      if (qbUser?.uid) {
        setHasLiked(likedBy.includes(qbUser.uid));
      }
    });

    const unsubChat = subscribeToSkyblockChat(effectiveIslandId, (latest) => {
      if (latest) {
        setLatestMessage(latest);
      }
    });

    return () => {
      unsubLikes();
      unsubChat();
    };
  }, [effectiveIslandId, qbUser?.uid]);

  const handleLike = async (e: React.PointerEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await toggleIslandLike(effectiveIslandId, qbUser?.uid || "guest");
      setLikeCount(res.likesCount);
      setHasLiked(res.liked);
      if (res.liked) {
        setLikeBurst(true);
        setTimeout(() => setLikeBurst(false), 1400);
      }
    } catch {
      // safe fallback
    }
  };

  useEffect(() => {
    const target = new Date("2026-09-01T00:00:00").getTime();
    const update = () => {
      const now = Date.now();
      const diff = Math.max(0, target - now);
      const hrs = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(
        `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`,
      );
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  const effectiveHotbar = hotbarBlockIds || [0, 1, 2, 3, 15];
  const currentBlockId = typeof activeSlot === "number" ? activeSlot : selectedSlot;

  const handleCycleBlock = () => {
    const nextIdx = (currentBlockId + 1) % BLOCKS.length;
    setSelectedSlot(nextIdx);
    onSelectSlot?.(nextIdx);
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex flex-col justify-between p-2 md:p-4 select-none overflow-hidden font-sans">
      {/* ── TOP HUD (Roundy + Grey Gradient Shadowy Gloss, Scaled down to clean compact size) ── */}
      <div
        className="flex items-start justify-between w-full z-20 origin-top"
        style={{ transform: "scale(0.80)", transformOrigin: "top center" }}
      >
        {/* Top Left: [Menu] [Chat] [Smile] [Video] Buttons + Profile & Island Info */}
        <div className="flex items-center gap-2">
          {/* 1. Menu Button */}
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSettings();
            }}
            className="pointer-events-auto relative w-8 h-8 active:scale-90 transition-transform cursor-pointer border-0 bg-transparent p-0 flex items-center justify-center outline-none touch-none"
            title="Game Settings"
            aria-label="Settings"
          >
            <img
              src={HUD_ASSETS.button}
              alt="Menu"
              className="w-full h-full object-contain pointer-events-none drop-shadow-md select-none"
              draggable={false}
            />
            <img
              src={HUD_ASSETS.menu}
              alt=""
              className="absolute inset-0 w-full h-full object-contain p-1.5 pointer-events-none drop-shadow-sm select-none"
              draggable={false}
            />
          </button>

          {/* 2. Chat Button */}
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onChat();
            }}
            className="pointer-events-auto relative w-8 h-8 active:scale-90 transition-transform cursor-pointer border-0 bg-transparent p-0 flex items-center justify-center outline-none touch-none"
            title="Chat"
            aria-label="Chat"
          >
            <img
              src={HUD_ASSETS.button}
              alt="Chat"
              className="w-full h-full object-contain pointer-events-none drop-shadow-md select-none"
              draggable={false}
            />
            <img
              src={HUD_ASSETS.chat}
              alt=""
              className="absolute inset-0 w-full h-full object-contain p-1.5 pointer-events-none drop-shadow-sm select-none"
              draggable={false}
            />
          </button>

          {/* 3. Smile / Emote Button */}
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              window.dispatchEvent(
                new CustomEvent("bm-chat-say", { detail: { text: "👋 Hello!" } })
              );
            }}
            className="pointer-events-auto relative w-8 h-8 active:scale-90 transition-transform cursor-pointer border-0 bg-transparent p-0 flex items-center justify-center outline-none touch-none"
            title="Emote / Wave"
            aria-label="Emotes"
          >
            <img
              src={HUD_ASSETS.button}
              alt="Smile"
              className="w-full h-full object-contain pointer-events-none drop-shadow-md select-none"
              draggable={false}
            />
            <img
              src={HUD_ASSETS.smile}
              alt=""
              className="absolute inset-0 w-full h-full object-contain p-1.5 pointer-events-none drop-shadow-sm select-none"
              draggable={false}
            />
          </button>

          {/* 4. Video / Camera Perspective Button */}
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleCamMode?.();
            }}
            className="pointer-events-auto relative w-8 h-8 active:scale-90 transition-transform cursor-pointer border-0 bg-transparent p-0 flex items-center justify-center outline-none touch-none"
            title="Switch Camera View"
            aria-label="Camera Mode"
          >
            <img
              src={HUD_ASSETS.button}
              alt="Video"
              className="w-full h-full object-contain pointer-events-none drop-shadow-md select-none"
              draggable={false}
            />
            <img
              src={HUD_ASSETS.video}
              alt=""
              className="absolute inset-0 w-full h-full object-contain p-1.5 pointer-events-none drop-shadow-sm select-none"
              draggable={false}
            />
          </button>

          {/* Avatar / Level / Username / Real Island Like Button */}
          <div className="relative flex items-center bg-gradient-to-b from-zinc-800/95 via-zinc-900/95 to-zinc-950/98 text-white rounded-xl p-1.5 pr-3 gap-2 border border-white/10 shadow-[0_8px_25px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-md">
            {likeBurst && (
              <div className="absolute -top-7 right-2 animate-bounce pointer-events-none text-rose-400 font-black text-xs flex items-center gap-1 bg-zinc-900 border border-rose-500/60 px-2 py-0.5 rounded-full shadow-xl">
                <span>+1</span>
                <span>❤️</span>
              </div>
            )}
            <div className="relative w-7 h-7 bg-white/80 backdrop-blur-md border border-slate-200 shadow-sm rounded-lg flex items-center justify-center text-xs text-center overflow-hidden font-bold">
              <GlossyAvatar
                imageFallbackOnly={true}
                snapshot={qbUser?.avatarSnapshot}
                frame={qbUser?.avatarSnapshot?.frameId}
                portrait={isIraAccount(qbUser)}
                photoUrl={qbUser?.profilePhoto}
                height={34}
                className="h-7 w-7"
              />
            </div>
            <div>
              <div>
                <span className="text-[10px] font-bold text-slate-800 tracking-wide">
                  {getCleanName(qbUser)}
                </span>
              </div>
              {/* Interactive Like Button */}
              <button
                type="button"
                onPointerDown={handleLike}
                className="pointer-events-auto flex items-center gap-1 text-[9px] text-slate-600 hover:text-slate-900 font-semibold transition cursor-pointer group active:scale-95 mt-0.5"
                title="Like Island"
              >
                <div className="w-3.5 h-3.5 flex items-center justify-center overflow-hidden inline-block group-hover:scale-110 transition-transform">
                  <img
                    src="https://file.garden/alGOOylwpAfCa6qP/IMG_7256.png"
                    alt="Like"
                    className={`w-full h-full object-contain pointer-events-none ${hasLiked ? "drop-shadow-[0_0_8px_rgba(244,63,94,0.9)]" : "opacity-80"}`}
                  />
                </div>
                <span
                  className={`font-mono font-bold ${hasLiked ? "text-rose-400" : "text-amber-300"}`}
                >
                  {likeCount.toLocaleString()}
                </span>
                <span className="text-[8px] text-zinc-400 uppercase tracking-tighter">likes</span>
              </button>
            </div>
          </div>

          {/* Home Party Icon Button (Teleport between Home & Mining) */}
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (area === "home") onMining();
              else onHome();
            }}
            className="pointer-events-auto w-7 h-7 bg-white/75 backdrop-blur-md border border-slate-200/50 rounded-lg flex items-center justify-center shadow-sm hover:scale-105 active:scale-95 transition-transform p-1 cursor-pointer"
            aria-label="Home Party / Mining Portal"
          >
            <img
              src="https://file.garden/alGOOylwpAfCa6qP/67243A81-11BF-4700-B12E-E4A3EC92B0D3.png"
              alt="Home Party"
              className="w-full h-full object-contain pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
            />
          </button>

          {/* Gacha Icon Button */}
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onGacha) onGacha();
              else onInventory();
            }}
            className="pointer-events-auto w-7 h-7 bg-white/75 backdrop-blur-md border border-slate-200/50 rounded-lg flex items-center justify-center shadow-sm hover:scale-105 active:scale-95 transition-transform p-1 cursor-pointer"
            aria-label="Gacha"
          >
            <img
              src="https://file.garden/alGOOylwpAfCa6qP/IMG_7261.png"
              alt="Gacha"
              className="w-full h-full object-contain pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
            />
          </button>
        </div>

        {/* Top Right: Currencies & Mall / Events Bar */}
        <div className="flex flex-col items-end gap-1.5">
          {/* Currency & Mall Row */}
          <div className="flex items-center gap-2 bg-white/80 backdrop-blur-md px-2 py-0.5 rounded-lg border border-slate-200 text-slate-800 shadow-sm">
            {/* Gold */}
            <div className="flex items-center gap-1">
              <div className="w-3.5 h-3.5 flex items-center justify-center overflow-hidden">
                <img
                  src="https://file.garden/alGOOylwpAfCa6qP/file_000000008f8481f49405d6c7b6fcbb5a.png"
                  alt="Coins"
                  className="w-full h-full object-contain pointer-events-none"
                />
              </div>
              <span className="text-[11px] font-bold text-amber-600 font-bold font-mono">
                {(gold || 796957).toLocaleString()}
              </span>
            </div>

            {/* Star Coins */}
            <div className="flex items-center gap-1 pl-1.5 border-l border-slate-300">
              <div className="w-3.5 h-3.5 flex items-center justify-center overflow-hidden">
                <img
                  src="https://file.garden/alGOOylwpAfCa6qP/IMG_7269.png"
                  alt="Star Coins"
                  className="w-full h-full object-contain pointer-events-none"
                />
              </div>
              <span className="text-[11px] font-bold text-pink-600 font-bold font-mono">
                {(starCoins || 0).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Perks & View Dropdown Menu */}
          <div className="relative pointer-events-auto">
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDropdownOpen((o) => !o);
              }}
              className="h-6 px-2 rounded-lg border border-slate-200 bg-white/80 backdrop-blur-md text-[9px] font-bold text-slate-700 flex items-center gap-1 shadow-sm hover:bg-white/90 active:scale-95 transition cursor-pointer"
              title="Perks, Camera & Island Menu"
            >
              <span className="text-amber-500">⚡</span>
              <span>Perks & View</span>
              <span className="text-[8px] text-zinc-400">{dropdownOpen ? "▲" : "▼"}</span>
            </button>

            {dropdownOpen && (
              <div
                className="absolute right-0 top-7 w-48 rounded-xl border border-slate-200 bg-white/95 backdrop-blur-xl shadow-lg p-1 flex flex-col gap-1 z-50 animate-in fade-in zoom-in-95 duration-100"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                {/* 1st / 3rd Person Camera View Toggle */}
                <div className="flex items-center justify-between px-2.5 py-1.5 bg-white/[0.06] rounded-lg border border-white/5">
                  <span className="text-[10px] font-bold text-slate-700">Camera View</span>
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onToggleCamMode?.();
                    }}
                    className="px-2.5 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[9px] font-extrabold capitalize active:scale-95 transition cursor-pointer"
                  >
                    {camMode === "first"
                      ? "1st Person"
                      : camMode === "third"
                        ? "3rd Person"
                        : "Top Down"}
                  </button>
                </div>

                {/* Sky Pass & Perks */}
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    setDropdownOpen(false);
                    onBattlePass?.();
                  }}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-slate-700 hover:bg-slate-100 text-left transition cursor-pointer"
                >
                  <span className="text-sm">⭐</span>
                  <span>Sky Pass & Perks</span>
                </button>

                {/* Island Mall */}
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    setDropdownOpen(false);
                    onMall?.();
                  }}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-slate-700 hover:bg-slate-100 text-left transition cursor-pointer"
                >
                  <span className="text-sm">🛍️</span>
                  <span>Island Mall</span>
                </button>

                {/* Events */}
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    setDropdownOpen(false);
                    onEvents?.();
                  }}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-slate-700 hover:bg-slate-100 text-left transition cursor-pointer"
                >
                  <span className="text-sm">🎉</span>
                  <span>Events & Quests</span>
                </button>

                {/* Rule Book */}
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    setDropdownOpen(false);
                    onRuleBook?.();
                  }}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-slate-700 hover:bg-slate-100 text-left transition cursor-pointer"
                >
                  <span className="text-sm">📜</span>
                  <span>Island Rules</span>
                </button>

                {/* Island Teleport */}
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    setDropdownOpen(false);
                    if (area === "home") onMining?.();
                    else onHome?.();
                  }}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-slate-700 hover:bg-slate-100 text-left transition cursor-pointer border-t border-white/10 mt-0.5"
                >
                  <span className="text-sm">🏝️</span>
                  <span>{area === "home" ? "Teleport to Mining" : "Teleport to Home"}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Action Bar Banner + Grey Block Switcher in Login Style (Replaces old inventory) */}
        <div className="pointer-events-auto flex items-center justify-center gap-2">
          <div className="h-8 sm:h-9 flex items-center shrink-0">
            <img
              src="https://maxwell.z3ki.dev/bot/_files/action-bar-banner/action_bar_banner.png"
              alt="Action Bar"
              className="h-full w-auto object-contain drop-shadow-md select-none pointer-events-none"
              draggable={false}
            />
          </div>
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              handleCycleBlock();
            }}
            className="h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl bg-gradient-to-b from-zinc-700 via-zinc-800 to-zinc-900 border border-white/20 shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.25)] flex items-center gap-1.5 text-white font-bold active:scale-95 transition-transform cursor-pointer select-none"
            title="Click to switch block"
            aria-label="Switch Block"
          >
            <div
              className="w-4 h-4 rounded-[4px] border border-white/40 shadow-inner flex items-center justify-center shrink-0"
              style={{
                background: `#${(BLOCKS[currentBlockId]?.color ?? 0x8eb86f).toString(16).padStart(6, "0")}`,
              }}
            />
            <span className="text-[11px] font-extrabold capitalize text-zinc-100 tracking-wide max-w-[80px] truncate">
              {BLOCKS[currentBlockId]?.name ?? "Block"}
            </span>
            <RefreshCw className="w-3 h-3 text-zinc-400 shrink-0" />
          </button>
        </div>
      </div>

      {/* ── BOTTOM ACTION BAR (Action Bar Banner + Grey Login Style Block Switcher) ── */}
      <div className="pointer-events-auto flex items-center justify-center pb-2 z-20">
        <div className="flex items-center gap-2.5 bg-black/45 backdrop-blur-md p-1.5 px-3 rounded-2xl border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
          <img
            src="https://maxwell.z3ki.dev/bot/_files/action-bar-banner/action_bar_banner.png"
            alt="Action Bar"
            className="h-10 sm:h-12 w-auto object-contain drop-shadow-md select-none pointer-events-none"
            draggable={false}
          />
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              handleCycleBlock();
            }}
            className="h-9 sm:h-10 px-3 sm:px-4 rounded-xl bg-gradient-to-b from-zinc-700 via-zinc-800 to-zinc-900 border border-white/20 shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.25)] flex items-center gap-2 text-white font-bold active:scale-95 transition-transform cursor-pointer select-none"
            title="Click to change block"
            aria-label="Change Block"
          >
            <div
              className="w-5 h-5 rounded-md border border-white/40 shadow-inner flex items-center justify-center shrink-0"
              style={{
                background: `#${(BLOCKS[currentBlockId]?.color ?? 0x8eb86f).toString(16).padStart(6, "0")}`,
              }}
            />
            <span className="text-[12px] font-extrabold capitalize text-zinc-100 tracking-wide">
              {BLOCKS[currentBlockId]?.name ?? "Block"}
            </span>
            <RefreshCw className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
}
