import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import {
  ChevronLeft,
  ChevronDown,
  Save,
  Trash2,
  Code2,
  Settings2,
  Layers,
  MapPin,
  Upload,
  Plus,
  Check,
  X,
  Move3d,
  MousePointer,
  Eraser,
  Grid3x3,
  Package,
  FolderOpen,
  Download,
  Box,
  FileJson,
  TriangleAlert,
  Zap,
  Globe,
  ChevronUp,
  ChevronRight,
  CirclePlay,
  Trash,
  Map as MapIcon,
  Heart,
  Star,
  Gamepad2,
  Hammer,
  BookOpen,
  Sliders,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Move,
} from "lucide-react";

export const Route = createFileRoute("/build")({
  head: () => ({ meta: [{ title: "Build Studio — QBLOCK" }] }),
  component: BuildPage,
});

// ─── BLOCKS ───────────────────────────────────────────────────────────────────
export const BLOCKS = [
  /* 0 */ {
    name: "Grass",
    color: 0x8eb86f,
    emissive: 0x000000,
    tex: { top: "grass_block_top.png", side: "grass_block_side.png", bot: "dirt.png" },
  },
  /* 1 */ { name: "Dirt", color: 0x9a7855, emissive: 0x000000, tex: { top: "dirt.png" } },
  /* 2 */ { name: "Stone", color: 0xbfbfbf, emissive: 0x000000, tex: { top: "stone.png" } },
  /* 3 */ {
    name: "Oak Log",
    color: 0xb4895e,
    emissive: 0x000000,
    tex: { top: "oak_log_top.png", side: "oak_log.png" },
  },
  /* 4 */ { name: "Sand", color: 0xdcc69d, emissive: 0x000000, tex: { top: "sand.png" } },
  /* 5 */ {
    name: "Oak Leaves",
    color: 0x3f8f3a,
    emissive: 0x000000,
    tex: { top: "oak_leaves.png" },
  },
  /* 6 */ { name: "Water", color: 0x4aa8e8, emissive: 0x001122, tex: { top: "glass.png" } },
  /* 7 */ { name: "Glass", color: 0xbfe9ff, emissive: 0x000000, tex: { top: "glass.png" } },
  /* 8 */ {
    name: "Mossy Cobble",
    color: 0x5a9c34,
    emissive: 0x000000,
    tex: { top: "mossy_cobblestone.png" },
  },
  /* 9 */ {
    name: "Coarse Dirt",
    color: 0x6a4a30,
    emissive: 0x000000,
    tex: { top: "coarse_dirt.png" },
  },
  /*10 */ { name: "Clay", color: 0xc8a888, emissive: 0x000000, tex: { top: "coarse_dirt.png" } },
  /*11 */ {
    name: "Stone Bricks",
    color: 0x9a9aa0,
    emissive: 0x000000,
    tex: { top: "stone_bricks.png" },
  },
  /*12 */ { name: "Diorite", color: 0xe8e8ec, emissive: 0x000000, tex: { top: "diorite.png" } },
  /*13 */ {
    name: "Basalt",
    color: 0x3a3a40,
    emissive: 0x000000,
    tex: { top: "basalt_top.png", side: "basalt_side.png" },
  },
  /*14 */ {
    name: "Glow Block",
    color: 0xffcc44,
    emissive: 0xaa6600,
    tex: { top: "glowstone.png" },
  },
  /*15 */ {
    name: "Cobblestone",
    color: 0x9a9aa0,
    emissive: 0x000000,
    tex: { top: "cobblestone.png" },
  },
  /*16 */ {
    name: "Smooth Stone",
    color: 0xc4c4ca,
    emissive: 0x000000,
    tex: { top: "smooth_stone.png" },
  },
  /*17 */ { name: "Ice", color: 0xbde4f5, emissive: 0x000000, tex: { top: "ice.png" } },
  /*18 */ {
    name: "Dark Oak Log",
    color: 0x5a3420,
    emissive: 0x000000,
    tex: { top: "dark_oak_log_top.png", side: "dark_oak_log.png" },
  },
  /*19 */ {
    name: "Slime Block",
    color: 0x7bd63a,
    emissive: 0x001100,
    tex: { top: "green_wool.png" },
  },
  /*20 */ { name: "Lava", color: 0xff4500, emissive: 0xcc2200, tex: { top: "netherrack.png" } },
  /*21 */ { name: "Gravel", color: 0xa09090, emissive: 0x000000, tex: { top: "gravel.png" } },
  /*22 */ {
    name: "Oak Planks",
    color: 0xc8a864,
    emissive: 0x000000,
    tex: { top: "oak_planks.png" },
  },
  /*23 */ {
    name: "Birch Log",
    color: 0xd4cfa0,
    emissive: 0x000000,
    tex: { top: "birch_log_top.png", side: "birch_log.png" },
  },
  /*24 */ {
    name: "Spruce Log",
    color: 0x6b4c32,
    emissive: 0x000000,
    tex: { top: "spruce_log_top.png", side: "spruce_log.png" },
  },
  /*25 */ {
    name: "Acacia Log",
    color: 0xc87040,
    emissive: 0x000000,
    tex: { top: "acacia_log_top.png", side: "acacia_log.png" },
  },
  /*26 */ {
    name: "Jungle Log",
    color: 0x7a6040,
    emissive: 0x000000,
    tex: { top: "jungle_log_top.png", side: "jungle_log.png" },
  },
  /*27 */ { name: "Granite", color: 0xc47050, emissive: 0x000000, tex: { top: "granite.png" } },
  /*28 */ { name: "Andesite", color: 0x888888, emissive: 0x000000, tex: { top: "andesite.png" } },
  /*29 */ { name: "Obsidian", color: 0x1a1028, emissive: 0x000000, tex: { top: "obsidian.png" } },
  /*30 */ {
    name: "Gold Block",
    color: 0xf5c400,
    emissive: 0x221100,
    tex: { top: "gold_block.png" },
  },
  /*31 */ {
    name: "Diamond Block",
    color: 0x5be6e0,
    emissive: 0x112222,
    tex: { top: "diamond_block.png" },
  },
  /*32 */ {
    name: "Iron Block",
    color: 0xd8dde0,
    emissive: 0x000000,
    tex: { top: "iron_block.png" },
  },
  /*33 */ {
    name: "Emerald Block",
    color: 0x17dd62,
    emissive: 0x003311,
    tex: { top: "emerald_block.png" },
  },
  /*34 */ {
    name: "Lapis Block",
    color: 0x1a4abf,
    emissive: 0x000000,
    tex: { top: "lapis_block.png" },
  },
  /*35 */ {
    name: "Netherrack",
    color: 0x8a2222,
    emissive: 0x000000,
    tex: { top: "netherrack.png" },
  },
  /*36 */ {
    name: "Nether Brick",
    color: 0x3a1822,
    emissive: 0x000000,
    tex: { top: "nether_bricks.png" },
  },
  /*37 */ {
    name: "Terracotta",
    color: 0xb86030,
    emissive: 0x000000,
    tex: { top: "terracotta.png" },
  },
  /*38 */ { name: "Red Sand", color: 0xc86020, emissive: 0x000000, tex: { top: "red_sand.png" } },
  /*39 */ {
    name: "Pumpkin",
    color: 0xe07820,
    emissive: 0x000000,
    tex: { top: "pumpkin_top.png", side: "pumpkin_side.png" },
  },
  /*40 */ {
    name: "Melon",
    color: 0x78a830,
    emissive: 0x000000,
    tex: { top: "melon_top.png", side: "melon_side.png" },
  },
  /*41 */ {
    name: "White Wool",
    color: 0xeeeeee,
    emissive: 0x000000,
    tex: { top: "white_wool.png" },
  },
  /*42 */ { name: "Red Wool", color: 0xcc2222, emissive: 0x000000, tex: { top: "red_wool.png" } },
  /*43 */ { name: "Blue Wool", color: 0x2244cc, emissive: 0x000000, tex: { top: "blue_wool.png" } },
  /*44 */ {
    name: "Green Wool",
    color: 0x228822,
    emissive: 0x000000,
    tex: { top: "green_wool.png" },
  },
  /*45 */ {
    name: "Yellow Wool",
    color: 0xddcc22,
    emissive: 0x000000,
    tex: { top: "yellow_wool.png" },
  },
  /*46 */ { name: "Glowstone", color: 0xffdd88, emissive: 0xaa6600, tex: { top: "glowstone.png" } },
  /*47 */ {
    name: "Amethyst",
    color: 0x8844cc,
    emissive: 0x110022,
    tex: { top: "amethyst_block.png" },
  },
  /*48 */ {
    name: "Hay Block",
    color: 0xd4b820,
    emissive: 0x000000,
    tex: { top: "hay_block_top.png", side: "hay_block_side.png" },
  },
  /*49 */ { name: "Coal Ore", color: 0x606060, emissive: 0x000000, tex: { top: "coal_ore.png" } },
  /*50 */ {
    name: "Redstone Ore",
    color: 0xcc2222,
    emissive: 0x220000,
    tex: { top: "redstone_ore.png" },
  },
  /*51 */ {
    name: "Crying Obsidian",
    color: 0x4a1880,
    emissive: 0x220044,
    tex: { top: "crying_obsidian.png" },
  },
  /*52 */ {
    name: "TNT",
    color: 0xcc3322,
    emissive: 0x000000,
    tex: { top: "tnt_top.png", side: "tnt_side.png" },
  },
  /*53 */ { name: "Bookshelf", color: 0xc8a864, emissive: 0x000000, tex: { top: "bookshelf.png" } },
  /*54 */ {
    name: "Chiseled Stone",
    color: 0xb8b8b8,
    emissive: 0x000000,
    tex: { top: "chiseled_stone_bricks.png" },
  },
  /*55 */ {
    name: "Dirt Path",
    color: 0xa08050,
    emissive: 0x000000,
    tex: { top: "dirt_path_top.png", side: "dirt_path_side.png", bot: "dirt.png" },
  },
] as const;

type BlockType = number;
type ToolMode = "place" | "erase" | "move";
type BottomTab = "build" | "maps" | "scripts" | "settings";

const MODELS = [
  { id: "wizard", name: "Wizard Statue", file: "/wizard_statue.glb", scale: 1.5 },
  { id: "player", name: "Player Rig", file: "/minecraft_rig_player.glb", scale: 1.2 },
  { id: "backpack", name: "Tactical Bag", file: "/tactical_backpack.glb", scale: 0.8 },
  { id: "aegis", name: "Aegis Lobby", file: "/aegis-skywars.glb", scale: 0.05 },
  { id: "bed", name: "BedWars Bed", file: "/bw-bed.glb", scale: 0.5 },
];

const QSCRIPTS = [
  {
    name: "SpawnPoint",
    icon: MapPin,
    desc: "Sets player spawn point.",
    code: `function onActivate(player)\n  Game.setSpawn(this:getPosition())\nend`,
  },
  {
    name: "OnTouch",
    icon: Zap,
    desc: "Fires when player touches block.",
    code: `function onTouch(player)\n  player:chat("Hello!")\nend`,
  },
  {
    name: "DamageZone",
    icon: TriangleAlert,
    desc: "Damages players in zone.",
    code: `function onTouch(player)\n  player:damage(5)\nend`,
  },
];

type BlockEntry = { x: number; y: number; z: number; type: number; name: string };
type ModelEntry = {
  id: string;
  name: string;
  file: string;
  x: number;
  y: number;
  z: number;
  scale: number;
};
type MapJson = {
  id: string;
  name: string;
  version: string;
  created: string;
  modified: string;
  blocks: BlockEntry[];
  models: ModelEntry[];
};

const MAPS_KEY = "qblock-studio-maps-v2";
function loadAllMaps(): MapJson[] {
  try {
    return JSON.parse(localStorage.getItem(MAPS_KEY) || "[]");
  } catch {
    return [];
  }
}
function saveAllMaps(maps: MapJson[]) {
  localStorage.setItem(MAPS_KEY, JSON.stringify(maps));
}
function saveMapLocally(map: MapJson) {
  const all = loadAllMaps();
  const idx = all.findIndex((m) => m.id === map.id);
  if (idx >= 0) all[idx] = map;
  else all.unshift(map);
  saveAllMaps(all);
}
function deleteMapLocally(id: string) {
  saveAllMaps(loadAllMaps().filter((m) => m.id !== id));
}

// ─── Studio 1v0 design tokens — white × yellow ────────────────────────────────
const S = {
  bg: "#f7f5ef",
  panel: "rgba(255,255,255,0.94)",
  border: "rgba(0,0,0,0.07)",
  borderA: "rgba(200,155,0,0.32)",
  text: "#1a1a2e",
  muted: "rgba(26,26,46,0.42)",
  accent: "#FFD600",
  accentDim: "rgba(255,214,0,0.13)",
  accentDk: "#c9a500",
  red: "#ef4444",
  green: "#22c55e",
  blue: "#3b82f6",
  orange: "#f59e0b",
  shadow: "0 8px 32px rgba(0,0,0,0.10), 0 1px 0 rgba(255,255,255,0.90) inset",
  shadowSm: "0 3px 14px rgba(0,0,0,0.08)",
} as const;
// Legacy aliases so engine error-fallback HTML still compiles
const YELLOW = "#FFD600";
const YELLOW_DARK = "#c9a500";
const glass = (a = 0.88) => `rgba(255,255,255,${a})`;
const glassBorder = `1px solid ${S.border}`;
const glassShadow = S.shadow;

// ─── Page ─────────────────────────────────────────────────────────────────────
function BuildPage() {
  const nav = useNavigate();
  const { qbUser } = useAuth();
  const isAuthorized = Boolean(
    qbUser?.email?.toLowerCase() === "mammaettahiri@gmail.com" ||
    qbUser?.email?.toLowerCase() === "dojamoocat42@gmail.com" ||
    qbUser?.email?.toLowerCase() === "maruane0farsad@gmail.com" ||
    (qbUser as { staff?: boolean })?.staff ||
    (qbUser as { isCreator?: boolean })?.isCreator,
  );

  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<ReturnType<typeof createEngine> | null>(null);
  const joyRef = useRef({ x: 0, z: 0 });
  const jumpRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [splashFade, setSplashFade] = useState(false);
  const [playMode, setPlayMode] = useState(false);
  const [tool, setTool] = useState<ToolMode>("place");
  const [selectedBlock, setSelectedBlock] = useState<BlockType>(0);
  const [bottomTab, setBottomTab] = useState<BottomTab>("build");
  const [panelOpen, setPanelOpen] = useState(false);
  const [localSaved, setLocalSaved] = useState(false);
  const [jsonDone, setJsonDone] = useState(false);
  const [projectName, setProjectName] = useState("My Island");
  const [editingName, setEditingName] = useState(false);
  const [savedMaps, setSavedMaps] = useState<MapJson[]>(() => loadAllMaps());
  const [blockCount, setBlockCount] = useState(256);
  const [blockMap, setBlockMap] = useState<Map<string, number>>(new Map());
  const [placedModels, setPlacedModels] = useState<ModelEntry[]>([]);
  const [projectId] = useState(() => `map-${Date.now()}`);
  const [activeScript, setActiveScript] = useState(-1);
  const [gridMode, setGridMode] = useState(false);
  const [gridY, setGridY] = useState(0);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [selectedModelName, setSelectedModelName] = useState<string | null>(null);
  const [scriptTarget, setScriptTarget] = useState<string | null>(null);
  const [scriptOutput, setScriptOutput] = useState<string[]>([]);
  const [scriptRunning, setScriptRunning] = useState(false);

  // Virtual joystick touch state
  const joyBaseRef = useRef({ x: 0, y: 0 });
  const joyTouchId = useRef<number | null>(null);
  const joyKnobRef = useRef<HTMLDivElement>(null);
  const joyAreaRef = useRef<HTMLDivElement>(null);

  const selectedBlockRef = useRef(selectedBlock);
  const toolRef = useRef(tool);
  const playModeRef = useRef(playMode);
  useEffect(() => {
    selectedBlockRef.current = selectedBlock;
  }, [selectedBlock]);
  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);
  useEffect(() => {
    playModeRef.current = playMode;
  }, [playMode]);

  const onBlockCountChange = useCallback((n: number, map: Map<string, number>) => {
    setBlockCount(n);
    setBlockMap(new Map(map));
  }, []);

  const onModelSelectCb = useCallback((id: string | null, name: string | null) => {
    setSelectedModelId(id);
    setSelectedModelName(name);
  }, []);

  // Init engine only when authorized
  useEffect(() => {
    if (!isAuthorized) return;
    let engine: ReturnType<typeof createEngine> | null = null;
    const raf = requestAnimationFrame(() => {
      const mount = mountRef.current;
      if (!mount) return;
      engine = createEngine(
        mount,
        selectedBlockRef,
        toolRef,
        playModeRef,
        joyRef,
        jumpRef,
        onBlockCountChange,
        onModelSelectCb,
      );
      engineRef.current = engine;
      // Show splash for at least 1.2s, then fade out
      const minShow = 1200;
      const started = performance.now();
      requestAnimationFrame(() => {
        const elapsed = performance.now() - started;
        const delay = Math.max(0, minShow - elapsed);
        setTimeout(() => {
          setSplashFade(true);
          setTimeout(() => setLoading(false), 380);
        }, delay);
      });
    });
    return () => {
      cancelAnimationFrame(raf);
      engine?.dispose();
    };
  }, [isAuthorized, onBlockCountChange, onModelSelectCb]);

  const buildMapJson = useCallback((): MapJson => {
    const blocks: BlockEntry[] = [];
    blockMap.forEach((type, key) => {
      const [x, y, z] = key.split(",").map(Number);
      blocks.push({ x, y, z, type, name: BLOCKS[type]?.name ?? "unknown" });
    });
    return {
      id: projectId,
      name: projectName,
      version: "2.0",
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      blocks,
      models: placedModels,
    };
  }, [blockMap, placedModels, projectName, projectId]);

  const handleLocalSave = useCallback(() => {
    saveMapLocally(buildMapJson());
    setSavedMaps(loadAllMaps());
    setLocalSaved(true);
    setTimeout(() => setLocalSaved(false), 2000);
  }, [buildMapJson]);

  const handleJsonExport = useCallback(() => {
    const p = buildMapJson();
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(p, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projectName.replace(/\s+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setJsonDone(true);
    setTimeout(() => setJsonDone(false), 2000);
  }, [buildMapJson, projectName]);

  const handleLoadMap = useCallback((map: MapJson) => {
    engineRef.current?.clearAll();
    map.blocks.forEach(({ x, y, z, type }) => engineRef.current?.addBlockExternal(x, y, z, type));
    setProjectName(map.name);
    setPlacedModels([]);
    setPanelOpen(false);
  }, []);

  const handleLoad = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data: MapJson = JSON.parse(ev.target?.result as string);
        if (!data.blocks) return;
        engineRef.current?.clearAll();
        data.blocks.forEach(({ x, y, z, type }) =>
          engineRef.current?.addBlockExternal(x, y, z, type),
        );
        if (data.name) setProjectName(data.name);
      } catch {
        /* */
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  const handlePlaceModel = useCallback((m: (typeof MODELS)[number]) => {
    const entry: ModelEntry = {
      id: `${m.id}-${Date.now()}`,
      name: m.name,
      file: m.file,
      x: 8,
      y: 1,
      z: 8,
      scale: m.scale,
    };
    engineRef.current?.placeModel(m.file, m.scale, 8, 1, 8, entry.id, m.name);
    setPlacedModels((prev) => [...prev, entry]);
  }, []);

  const handleClear = useCallback(() => {
    engineRef.current?.clearUserBlocks();
    setBlockCount(256);
  }, []);

  const runScript = useCallback(
    (idx: number) => {
      const s = QSCRIPTS[idx];
      if (!s) return;
      setScriptRunning(true);
      setScriptOutput([
        `> Compiling "${s.name}"…`,
        `> Target: ${scriptTarget ? (selectedModelName ?? scriptTarget) : "Global scope"}`,
      ]);
      const lines = [
        `> Parsing QScript syntax…`,
        `> OK — no errors found`,
        `> Loading QScript runtime…`,
        `> Binding event handlers…`,
        `[QScript] "${s.name}" attached ${scriptTarget ? `→ "${selectedModelName ?? scriptTarget}"` : "→ global"}.`,
        `[QScript] Listening for events. ✓ Ready.`,
      ];
      let li = 0;
      const iv = setInterval(() => {
        if (li < lines.length) {
          setScriptOutput((prev) => [...prev, lines[li++]]);
        } else {
          clearInterval(iv);
          setScriptRunning(false);
        }
      }, 150);
    },
    [scriptTarget, selectedModelName],
  );

  const handleCrosshairAction = useCallback(() => {
    engineRef.current?.placeAtCrosshair(tool === "erase" ? "erase" : "place", selectedBlock);
  }, [tool, selectedBlock]);

  // ── Virtual joystick handlers ──
  const handleJoyTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!playMode) return;
      const t = e.changedTouches[0];
      joyTouchId.current = t.identifier;
      const rect = joyAreaRef.current!.getBoundingClientRect();
      joyBaseRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      e.stopPropagation();
    },
    [playMode],
  );

  const handleJoyTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!playMode) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier !== joyTouchId.current) continue;
        const dx = t.clientX - joyBaseRef.current.x;
        const dy = t.clientY - joyBaseRef.current.y;
        const dist = Math.hypot(dx, dy);
        const maxR = 40;
        const nx = dist > maxR ? dx / dist : dx / maxR;
        const ny = dist > maxR ? dy / dist : dy / maxR;
        joyRef.current = { x: nx, z: ny };
        if (joyKnobRef.current) {
          joyKnobRef.current.style.transform = `translate(${nx * maxR}px, ${ny * maxR}px)`;
        }
      }
      e.stopPropagation();
      e.preventDefault();
    },
    [playMode],
  );

  const handleJoyTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!playMode) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === joyTouchId.current) {
          joyRef.current = { x: 0, z: 0 };
          joyTouchId.current = null;
          if (joyKnobRef.current) joyKnobRef.current.style.transform = "translate(0px,0px)";
        }
      }
      e.stopPropagation();
    },
    [playMode],
  );

  // Toggle play mode — reset player on enter
  const togglePlay = useCallback(() => {
    setPlayMode((v) => {
      const next = !v;
      if (next) engineRef.current?.startPlay();
      else engineRef.current?.stopPlay();
      return next;
    });
  }, []);

  const TOOLS: Array<{ id: ToolMode; label: string; icon: typeof MousePointer }> = [
    { id: "place", label: "Place", icon: MousePointer },
    { id: "erase", label: "Erase", icon: Eraser },
    { id: "move", label: "Pan", icon: Move3d },
  ];

  const memoryMB = useMemo(
    () => Math.max(0.1, (blockCount * 320 + placedModels.length * 512_000) / (1024 * 1024)),
    [blockCount, placedModels],
  );

  if (!isAuthorized) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-fade-in">
        <div
          className="w-full max-w-sm rounded-[24px] p-6 text-center shadow-2xl bg-white border border-slate-200/90"
          style={{
            boxShadow:
              "0 20px 50px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,1)",
          }}
        >
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 shadow-sm">
            <Hammer className="h-8 w-8" strokeWidth={2.4} />
          </div>
          <h2 className="text-[20px] font-black tracking-tight text-slate-900">Build Studio</h2>
          <p className="mt-2 text-[13.5px] leading-relaxed text-slate-600 font-medium">
            QBLOCK Build Studio is currently reserved for Creator Program members and verified world
            builders.
          </p>
          <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100 text-[11.5px] text-slate-500 font-semibold">
            Sign in with a verified creator account or join the builder community to start placing
            voxels.
          </div>
          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => nav({ to: "/" as never })}
              className="press flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-b from-amber-400 to-amber-500 font-extrabold text-slate-950 shadow-md shadow-amber-500/20 transition active:scale-[0.98]"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-dvh w-full overflow-hidden select-none relative"
      style={{
        background: S.bg,
        fontFamily: "Inter,ui-sans-serif,system-ui,sans-serif",
      }}
    >
      {/* ─── Splash ─── */}
      {loading && (
        <div
          className="absolute inset-0 z-50 flex flex-col items-center justify-center transition-opacity duration-300"
          style={{ background: S.bg, opacity: splashFade ? 0 : 1 }}
        >
          <img
            src="/studio-splash.png"
            alt="Studio 1v0"
            className="w-full max-w-lg object-contain px-6"
            draggable={false}
          />
          <div
            className="mt-10 w-52 h-0.5 rounded-full overflow-hidden"
            style={{ background: "rgba(0,0,0,0.09)" }}
          >
            <div
              className="h-full rounded-full"
              style={{
                background: `linear-gradient(90deg,${S.accentDk},${S.accent})`,
                animation: "load 1.1s ease-in-out forwards",
              }}
            />
          </div>
          <p
            className="mt-4 text-[10px] font-black tracking-[0.22em] uppercase"
            style={{ color: S.muted }}
          >
            Studio 1v0 · Loading…
          </p>
        </div>
      )}

      {/* ─── 3D canvas ─── */}
      <div
        ref={mountRef}
        className="absolute inset-0"
        style={{
          cursor: playMode
            ? "none"
            : tool === "place"
              ? "crosshair"
              : tool === "erase"
                ? "not-allowed"
                : "grab",
        }}
      />

      {/* ─── TOP BAR ─── */}
      {!playMode && (
        <div className="absolute top-0 inset-x-0 z-30 flex items-center gap-2 px-3 pt-3 pb-2 pointer-events-none">
          {/* Back */}
          <button
            className="pointer-events-auto h-10 w-10 rounded-[12px] flex items-center justify-center shrink-0 active:scale-95 transition-transform"
            style={{ background: S.panel, border: `1px solid ${S.border}`, boxShadow: S.shadowSm }}
            onClick={() => nav({ to: "/discover" as never })}
          >
            <ChevronLeft className="h-5 w-5" style={{ color: S.text }} />
          </button>

          {/* Studio badge */}
          <div
            className="pointer-events-none shrink-0 px-2.5 h-10 rounded-[12px] flex items-center gap-1.5"
            style={{ background: S.accentDim, border: `1px solid ${S.borderA}` }}
          >
            <div
              className="h-4 w-4 rounded-[4px] flex items-center justify-center"
              style={{ background: S.accent }}
            >
              <Box className="h-2.5 w-2.5" style={{ color: "#1a1000" }} />
            </div>
            <span
              className="text-[11px] font-black tracking-[0.10em] uppercase"
              style={{ color: S.accent }}
            >
              Studio
            </span>
            <span
              className="text-[8px] font-bold tracking-widest px-1 py-0.5 rounded-[4px]"
              style={{ background: "rgba(255,214,0,0.18)", color: S.accentDk }}
            >
              1v0
            </span>
          </div>

          {/* Project name */}
          <div
            className="pointer-events-auto flex-1 flex items-center gap-2 px-3 h-10 rounded-[12px] min-w-0"
            style={{ background: S.panel, border: `1px solid ${S.border}`, boxShadow: S.shadowSm }}
            onClick={() => setEditingName(true)}
          >
            {editingName ? (
              <input
                autoFocus
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                onBlur={() => setEditingName(false)}
                onKeyDown={(e) => e.key === "Enter" && setEditingName(false)}
                className="flex-1 bg-transparent outline-none text-[13px] font-semibold min-w-0"
                style={{ color: S.text }}
              />
            ) : (
              <span className="flex-1 truncate text-[13px] font-semibold" style={{ color: S.text }}>
                {projectName}
              </span>
            )}
            <span
              className="text-[10px] font-mono font-bold shrink-0 tabular-nums"
              style={{ color: S.accent }}
            >
              {blockCount.toLocaleString()}
            </span>
          </div>

          {/* Save */}
          <button
            className="pointer-events-auto h-10 px-3 rounded-[12px] flex items-center gap-1.5 shrink-0 active:scale-95 transition-transform"
            style={{
              background: localSaved
                ? "rgba(52,211,153,0.18)"
                : `linear-gradient(135deg,${S.accentDk},${S.accent})`,
              border: localSaved ? "1px solid rgba(52,211,153,0.35)" : `1px solid ${S.borderA}`,
              boxShadow: S.shadowSm,
            }}
            onClick={handleLocalSave}
          >
            {localSaved ? (
              <Check className="h-4 w-4" style={{ color: S.green }} />
            ) : (
              <Save className="h-4 w-4" style={{ color: "#1a1000" }} />
            )}
            <span
              className="text-[12px] font-bold"
              style={{ color: localSaved ? S.green : "#1a1000" }}
            >
              {localSaved ? "Saved" : "Save"}
            </span>
          </button>

          {/* Export */}
          <button
            className="pointer-events-auto h-10 w-10 rounded-[12px] flex items-center justify-center shrink-0 active:scale-95 transition-transform"
            style={{
              background: jsonDone ? "rgba(52,211,153,0.18)" : S.panel,
              border: jsonDone ? "1px solid rgba(52,211,153,0.35)" : `1px solid ${S.border}`,
              boxShadow: S.shadowSm,
            }}
            onClick={handleJsonExport}
          >
            {jsonDone ? (
              <Check className="h-4 w-4" style={{ color: S.green }} />
            ) : (
              <FileJson className="h-4 w-4" style={{ color: S.accentDk }} />
            )}
          </button>
        </div>
      )}

      {/* ─── FLOATING TOOLBAR ─── */}
      {!playMode && !gridMode && (
        <div
          className="absolute z-30 pointer-events-none"
          style={{
            bottom: "calc(62px + 20px)",
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            className="pointer-events-auto flex items-center gap-1 px-2 py-1.5 rounded-[16px]"
            style={{ background: S.panel, border: `1px solid ${S.border}`, boxShadow: S.shadow }}
          >
            {TOOLS.map(({ id, icon: Icon, label }) => {
              const active = tool === id;
              return (
                <button
                  key={id}
                  title={label}
                  onClick={() => setTool(id)}
                  className="h-10 w-10 rounded-[10px] flex items-center justify-center active:scale-90 transition-all"
                  style={{
                    background: active
                      ? `linear-gradient(135deg,${S.accentDk},${S.accent})`
                      : "transparent",
                  }}
                >
                  <Icon
                    className="h-[18px] w-[18px]"
                    style={{ color: active ? "#1a1000" : S.muted }}
                    strokeWidth={2}
                  />
                </button>
              );
            })}

            <div className="w-px h-6 mx-0.5" style={{ background: S.border }} />

            <button
              onClick={() => setGridMode((v) => !v)}
              className="h-10 w-10 rounded-[10px] flex items-center justify-center active:scale-90 transition-all"
              style={{ background: gridMode ? S.accentDim : "transparent" }}
            >
              <Grid3x3
                className="h-[18px] w-[18px]"
                style={{ color: gridMode ? S.accent : S.muted }}
                strokeWidth={2}
              />
            </button>

            <div className="w-px h-6 mx-0.5" style={{ background: S.border }} />

            {/* Active block chip */}
            <button
              onClick={() => {
                setPanelOpen(true);
                setBottomTab("build");
              }}
              className="h-10 px-2 rounded-[10px] flex items-center gap-2 active:scale-90 transition-all"
            >
              <div
                className="h-7 w-7 rounded-[6px] overflow-hidden relative shrink-0"
                style={{
                  border: "1.5px solid rgba(255,255,255,0.14)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.40)",
                }}
              >
                <div
                  className="absolute inset-0"
                  style={{
                    background: `#${BLOCKS[selectedBlock].color.toString(16).padStart(6, "0")}`,
                  }}
                />
                <img
                  src={`/textures/blocks/${BLOCKS[selectedBlock].tex.top}`}
                  className="absolute inset-0 w-full h-full"
                  style={{ imageRendering: "pixelated" }}
                  alt=""
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.opacity = "0";
                  }}
                />
              </div>
              <span
                className="text-[10px] font-semibold max-w-[50px] truncate hidden sm:block"
                style={{ color: S.muted }}
              >
                {BLOCKS[selectedBlock].name}
              </span>
              <ChevronUp className="h-3 w-3 shrink-0" style={{ color: S.muted }} />
            </button>
          </div>
        </div>
      )}

      {/* ─── FAB: place / erase at crosshair ─── */}
      {!playMode && !gridMode && (
        <button
          onPointerDown={handleCrosshairAction}
          aria-label={tool === "erase" ? "Erase" : "Place"}
          className="absolute z-30 h-14 w-14 rounded-[16px] flex items-center justify-center active:scale-90 transition-transform"
          style={{
            bottom: "calc(62px + 76px)",
            right: 16,
            background:
              tool === "erase"
                ? "rgba(255,82,82,0.92)"
                : `linear-gradient(135deg,${S.accentDk},${S.accent})`,
            border: "1px solid rgba(255,255,255,0.10)",
            boxShadow:
              tool === "erase"
                ? "0 6px 24px rgba(255,82,82,0.45)"
                : `0 6px 24px rgba(255,214,0,0.45)`,
          }}
        >
          {tool === "erase" ? (
            <Eraser className="h-6 w-6 text-white" />
          ) : (
            <MousePointer className="h-6 w-6" style={{ color: "#1a1000" }} />
          )}
        </button>
      )}

      {/* ─── BOTTOM DOCK ─── */}
      {!playMode && (
        <div
          className="absolute bottom-0 inset-x-0 z-30"
          style={{ paddingBottom: "max(8px,env(safe-area-inset-bottom))" }}
        >
          <div
            className="mx-3 mb-2 rounded-[18px] flex items-stretch overflow-hidden"
            style={{
              background: S.panel,
              border: `1px solid ${S.border}`,
              boxShadow: S.shadow,
              height: 62,
            }}
          >
            {(
              [
                { id: "build", label: "Build", icon: Hammer },
                { id: "maps", label: "Maps", icon: MapIcon },
                { id: "scripts", label: "Scripts", icon: Code2 },
                { id: "settings", label: "Settings", icon: Sliders },
              ] as const
            ).map(({ id, label, icon: Icon }) => {
              const active = bottomTab === id && panelOpen;
              return (
                <button
                  key={id}
                  onClick={() => {
                    setBottomTab(id);
                    setPanelOpen(true);
                  }}
                  className="flex-1 flex flex-col items-center justify-center gap-[3px] active:scale-95 transition-all"
                  style={{
                    background: active ? S.accentDim : "transparent",
                    borderBottom: `2px solid ${active ? S.accent : "transparent"}`,
                  }}
                >
                  <Icon
                    className="h-[19px] w-[19px]"
                    style={{ color: active ? S.accent : S.muted }}
                    strokeWidth={1.8}
                  />
                  <span
                    className="text-[8.5px] font-bold tracking-wide uppercase"
                    style={{ color: active ? S.accent : S.muted }}
                  >
                    {label}
                  </span>
                </button>
              );
            })}

            <div className="w-px my-3" style={{ background: S.border }} />

            <button
              onClick={togglePlay}
              className="flex-1 flex flex-col items-center justify-center gap-[3px] active:scale-95 transition-all"
            >
              <div
                className="h-7 w-7 rounded-[10px] flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg,#22c55e,#34d399)",
                  boxShadow: "0 3px 12px rgba(52,211,153,0.40)",
                }}
              >
                <CirclePlay className="h-4 w-4 text-white" />
              </div>
              <span
                className="text-[8.5px] font-bold tracking-wide uppercase"
                style={{ color: S.green }}
              >
                Play
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ─── BOTTOM SHEET ─── */}
      {!playMode && panelOpen && (
        <div
          className="absolute inset-x-0 z-20 mx-2"
          style={{ bottom: "calc(62px + 12px)", maxHeight: "54vh" }}
        >
          <div
            className="rounded-[20px] overflow-hidden flex flex-col"
            style={{
              background: S.panel,
              border: `1px solid ${S.border}`,
              boxShadow: S.shadow,
              maxHeight: "54vh",
            }}
          >
            {/* Header row */}
            <div
              className="flex items-center gap-2 px-4 pt-3 pb-2.5 shrink-0"
              style={{ borderBottom: `1px solid ${S.border}` }}
            >
              <button
                onClick={() => setPanelOpen(false)}
                className="h-7 w-7 rounded-[8px] flex items-center justify-center active:scale-90 shrink-0"
                style={{ background: "rgba(0,0,0,0.05)" }}
              >
                <X className="h-3.5 w-3.5" style={{ color: S.muted }} />
              </button>
              <div className="flex-1" />
              <div
                className="w-8 h-[3px] rounded-full"
                style={{ background: "rgba(0,0,0,0.10)" }}
              />
              <div className="flex-1" />
              <span
                className="text-[9px] font-black tracking-[0.15em] uppercase"
                style={{ color: S.muted }}
              >
                {bottomTab === "build"
                  ? "Build"
                  : bottomTab === "maps"
                    ? "Maps"
                    : bottomTab === "scripts"
                      ? "Scripts"
                      : "Config"}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
              {/* BUILD */}
              {bottomTab === "build" && (
                <div className="px-3 py-3">
                  <div className="flex items-center gap-2 mb-2.5 px-0.5">
                    <span
                      className="text-[8.5px] font-black tracking-[0.18em] uppercase"
                      style={{ color: S.muted }}
                    >
                      Blocks
                    </span>
                    <div className="flex-1 h-px" style={{ background: S.border }} />
                    <span className="text-[8.5px] font-mono" style={{ color: S.muted }}>
                      {BLOCKS.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-9 gap-1.5 mb-4">
                    {BLOCKS.map((b, i) => {
                      const hex = `#${b.color.toString(16).padStart(6, "0")}`;
                      const active = selectedBlock === i;
                      return (
                        <button
                          key={i}
                          title={b.name}
                          onClick={() => {
                            setSelectedBlock(i);
                            if (tool === "erase") setTool("place");
                          }}
                          className="aspect-square rounded-[7px] flex items-center justify-center active:scale-90 transition-all overflow-hidden"
                          style={{
                            background: active ? hex : "rgba(0,0,0,0.04)",
                            border: `${active ? 2 : 1}px solid ${active ? hex : "rgba(0,0,0,0.09)"}`,
                            boxShadow: active ? `0 0 10px ${hex}55` : "none",
                          }}
                        >
                          <img
                            src={`/textures/blocks/${b.tex.top}`}
                            alt={b.name}
                            className="w-5 h-5"
                            style={{ imageRendering: "pixelated" }}
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.opacity = "0";
                            }}
                          />
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2 mb-2.5 px-0.5">
                    <span
                      className="text-[8.5px] font-black tracking-[0.18em] uppercase"
                      style={{ color: S.muted }}
                    >
                      Models
                    </span>
                    <div className="flex-1 h-px" style={{ background: S.border }} />
                  </div>
                  <div
                    className="flex gap-2 overflow-x-auto pb-1"
                    style={{ scrollbarWidth: "none" }}
                  >
                    {MODELS.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => handlePlaceModel(m)}
                        className="flex-shrink-0 w-[68px] flex flex-col items-center gap-1.5 px-1.5 py-2.5 rounded-[12px] active:scale-95 transition-all"
                        style={{ background: "rgba(0,0,0,0.04)", border: `1px solid ${S.border}` }}
                      >
                        <div
                          className="h-8 w-8 rounded-[8px] flex items-center justify-center"
                          style={{
                            background: "rgba(167,139,250,0.14)",
                            border: "1px solid rgba(167,139,250,0.20)",
                          }}
                        >
                          <Box className="h-4 w-4" style={{ color: "#a78bfa" }} />
                        </div>
                        <span
                          className="text-[8px] font-semibold text-center leading-tight"
                          style={{ color: S.muted }}
                        >
                          {m.name}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={handleClear}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[10px] active:scale-95 transition-all"
                      style={{
                        background: "rgba(255,82,82,0.08)",
                        border: "1px solid rgba(255,82,82,0.18)",
                      }}
                    >
                      <Trash className="h-3.5 w-3.5" style={{ color: S.red }} />
                      <span className="text-[11px] font-bold" style={{ color: S.red }}>
                        Clear
                      </span>
                    </button>
                    <label
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[10px] cursor-pointer active:scale-95 transition-all"
                      style={{ background: S.accentDim, border: `1px solid ${S.borderA}` }}
                    >
                      <FileJson className="h-3.5 w-3.5" style={{ color: S.accent }} />
                      <span className="text-[11px] font-bold" style={{ color: S.accent }}>
                        Import JSON
                      </span>
                      <input type="file" accept=".json" className="hidden" onChange={handleLoad} />
                    </label>
                  </div>
                </div>
              )}

              {/* MAPS */}
              {bottomTab === "maps" && (
                <div className="px-3 py-3">
                  <div className="flex items-center gap-2 mb-3 px-0.5">
                    <span
                      className="text-[8.5px] font-black tracking-[0.18em] uppercase"
                      style={{ color: S.muted }}
                    >
                      Saved Maps
                    </span>
                    <div className="flex-1 h-px" style={{ background: S.border }} />
                    <span
                      className="text-[8.5px] font-mono px-1.5 py-0.5 rounded-[4px]"
                      style={{ background: S.accentDim, color: S.accent }}
                    >
                      {savedMaps.length}
                    </span>
                  </div>
                  {savedMaps.length === 0 && (
                    <div className="py-10 flex flex-col items-center gap-3">
                      <div
                        className="h-14 w-14 rounded-[16px] flex items-center justify-center"
                        style={{ background: S.accentDim, border: `1px solid ${S.borderA}` }}
                      >
                        <MapIcon className="h-7 w-7" style={{ color: S.accent }} />
                      </div>
                      <div className="text-center">
                        <div className="text-[14px] font-bold" style={{ color: S.text }}>
                          No saved maps
                        </div>
                        <div className="text-[11px] mt-0.5" style={{ color: S.muted }}>
                          Tap Save in the top bar
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    {savedMaps.map((map) => (
                      <div
                        key={map.id}
                        className="rounded-[14px]"
                        style={{ background: "rgba(0,0,0,0.04)", border: `1px solid ${S.border}` }}
                      >
                        <div className="flex items-center gap-3 px-3 py-2.5">
                          <div
                            className="h-10 w-10 rounded-[11px] flex items-center justify-center shrink-0"
                            style={{
                              background: `linear-gradient(135deg,${S.accentDk},${S.accent})`,
                            }}
                          >
                            <MapIcon className="h-5 w-5" style={{ color: "#1a1000" }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div
                              className="text-[13px] font-bold truncate"
                              style={{ color: S.text }}
                            >
                              {map.name}
                            </div>
                            <div className="flex gap-2 mt-0.5 items-center">
                              <div className="flex gap-0.5">
                                {Array.from(new Map(map.blocks.map((b) => [b.type, b])).values())
                                  .slice(0, 5)
                                  .map((b) => (
                                    <div
                                      key={b.type}
                                      className="h-2.5 w-2.5 rounded-[2px]"
                                      style={{
                                        background: `#${BLOCKS[b.type]?.color.toString(16).padStart(6, "0") ?? "888"}`,
                                      }}
                                    />
                                  ))}
                              </div>
                              <span className="text-[10px] font-mono" style={{ color: S.muted }}>
                                {map.blocks.length.toLocaleString()} blocks
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleLoadMap(map)}
                              className="h-8 px-2.5 rounded-[9px] flex items-center gap-1 active:scale-95 transition-all"
                              style={{
                                background: `linear-gradient(135deg,${S.accentDk},${S.accent})`,
                              }}
                            >
                              <FolderOpen className="h-3 w-3" style={{ color: "#1a1000" }} />
                              <span className="text-[11px] font-bold" style={{ color: "#1a1000" }}>
                                Load
                              </span>
                            </button>
                            <button
                              onClick={() => {
                                const u = URL.createObjectURL(
                                  new Blob([JSON.stringify(map, null, 2)], {
                                    type: "application/json",
                                  }),
                                );
                                const a = document.createElement("a");
                                a.href = u;
                                a.download = `${map.name.replace(/\s+/g, "-")}.json`;
                                a.click();
                                URL.revokeObjectURL(u);
                              }}
                              className="h-8 w-8 rounded-[9px] flex items-center justify-center active:scale-95"
                              style={{
                                background: "rgba(0,0,0,0.05)",
                                border: `1px solid ${S.border}`,
                              }}
                            >
                              <Download className="h-3 w-3" style={{ color: S.muted }} />
                            </button>
                            <button
                              onClick={() => {
                                deleteMapLocally(map.id);
                                setSavedMaps(loadAllMaps());
                              }}
                              className="h-8 w-8 rounded-[9px] flex items-center justify-center active:scale-95"
                              style={{
                                background: "rgba(255,82,82,0.08)",
                                border: "1px solid rgba(255,82,82,0.14)",
                              }}
                            >
                              <Trash2 className="h-3 w-3" style={{ color: S.red }} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SCRIPTS */}
              {bottomTab === "scripts" && (
                <div className="px-3 py-3">
                  <div
                    className="mb-3 rounded-[12px] px-3 py-2.5 flex items-center gap-2.5"
                    style={{
                      background: scriptTarget ? "rgba(255,214,0,0.06)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${scriptTarget ? S.borderA : S.border}`,
                    }}
                  >
                    <div
                      className="h-8 w-8 rounded-[8px] grid place-items-center shrink-0"
                      style={{ background: scriptTarget ? S.accentDim : "rgba(0,0,0,0.05)" }}
                    >
                      <Box
                        className="h-4 w-4"
                        style={{ color: scriptTarget ? S.accent : S.muted }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      {scriptTarget ? (
                        <>
                          <div className="text-[12px] font-bold" style={{ color: S.accent }}>
                            {selectedModelName ?? scriptTarget}
                          </div>
                          <div className="text-[9px]" style={{ color: S.muted }}>
                            Entity targeted
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-[12px] font-semibold" style={{ color: S.muted }}>
                            No target
                          </div>
                          <div className="text-[9px]" style={{ color: "rgba(255,255,255,0.22)" }}>
                            Select a model in Build tab
                          </div>
                        </>
                      )}
                    </div>
                    {scriptTarget && (
                      <button
                        onClick={() => setScriptTarget(null)}
                        className="h-6 w-6 rounded-full grid place-items-center active:scale-90"
                        style={{ background: "rgba(0,0,0,0.09)" }}
                      >
                        <X className="h-3 w-3" style={{ color: S.muted }} />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mb-2 px-0.5">
                    <span
                      className="text-[8.5px] font-black tracking-[0.18em] uppercase"
                      style={{ color: S.muted }}
                    >
                      Templates
                    </span>
                    <div className="flex-1 h-px" style={{ background: S.border }} />
                  </div>
                  <div className="space-y-2">
                    {QSCRIPTS.map((s, i) => {
                      const Icon = s.icon;
                      const isActive = activeScript === i;
                      return (
                        <div
                          key={i}
                          className="rounded-[12px] overflow-hidden"
                          style={{
                            background: "rgba(0,0,0,0.04)",
                            border: `1px solid ${isActive ? S.borderA : S.border}`,
                          }}
                        >
                          <button
                            className="w-full flex items-center gap-3 px-3 py-2.5"
                            onClick={() => setActiveScript(isActive ? -1 : i)}
                          >
                            <div
                              className="h-9 w-9 rounded-[9px] flex items-center justify-center shrink-0"
                              style={{
                                background: `linear-gradient(135deg,${S.accentDk},${S.accent})`,
                              }}
                            >
                              <Icon className="h-4 w-4" style={{ color: "#1a1000" }} />
                            </div>
                            <div className="flex-1 text-left">
                              <div className="text-[13px] font-bold" style={{ color: S.text }}>
                                {s.name}
                              </div>
                              <div className="text-[10px]" style={{ color: S.muted }}>
                                {s.desc}
                              </div>
                            </div>
                            {isActive ? (
                              <ChevronUp className="h-4 w-4" style={{ color: S.muted }} />
                            ) : (
                              <ChevronDown className="h-4 w-4" style={{ color: S.muted }} />
                            )}
                          </button>
                          {isActive && (
                            <div className="px-3 pb-3">
                              {scriptTarget && (
                                <div
                                  className="mb-2 text-[10px] font-bold px-2 py-1 rounded-[6px]"
                                  style={{
                                    background: S.accentDim,
                                    color: S.accentDk,
                                    border: `1px solid ${S.borderA}`,
                                  }}
                                >
                                  Target: {selectedModelName ?? scriptTarget}
                                </div>
                              )}
                              <pre
                                className="w-full rounded-[10px] p-3 text-[11px] font-mono leading-relaxed overflow-x-auto"
                                style={{
                                  background: "#060a12",
                                  color: "#7dd3fc",
                                  border: `1px solid ${S.border}`,
                                }}
                              >
                                {s.code}
                              </pre>
                              <button
                                onClick={() => runScript(i)}
                                disabled={scriptRunning}
                                className="mt-2 w-full h-8 rounded-[8px] flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                                style={{
                                  background: scriptRunning
                                    ? "rgba(52,211,153,0.05)"
                                    : "rgba(52,211,153,0.12)",
                                  border: "1px solid rgba(52,211,153,0.22)",
                                  opacity: scriptRunning ? 0.6 : 1,
                                }}
                              >
                                <CirclePlay className="h-3.5 w-3.5" style={{ color: S.green }} />
                                <span className="text-[11px] font-bold" style={{ color: S.green }}>
                                  {scriptRunning ? "Running…" : "Run Script"}
                                </span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {scriptOutput.length > 0 && (
                    <div
                      className="mt-3 rounded-[12px] p-3 font-mono text-[10px] leading-[1.7] overflow-y-auto"
                      style={{
                        background: "#050810",
                        border: `1px solid rgba(52,211,153,0.18)`,
                        maxHeight: 132,
                      }}
                    >
                      {scriptOutput.map((line, li) => (
                        <div
                          key={li}
                          style={{
                            color: line.startsWith("[QScript]")
                              ? S.green
                              : line.startsWith("> OK")
                                ? S.blue
                                : "rgba(255,255,255,0.38)",
                          }}
                        >
                          {line}
                        </div>
                      ))}
                      {scriptRunning && (
                        <div className="animate-pulse" style={{ color: S.green }}>
                          ▋
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* SETTINGS */}
              {bottomTab === "settings" && (
                <div className="px-3 py-3">
                  <div className="flex items-center gap-2 mb-2.5 px-0.5">
                    <span
                      className="text-[8.5px] font-black tracking-[0.18em] uppercase"
                      style={{ color: S.muted }}
                    >
                      Render
                    </span>
                    <div className="flex-1 h-px" style={{ background: S.border }} />
                  </div>
                  <div
                    className="rounded-[14px] overflow-hidden"
                    style={{ border: `1px solid ${S.border}` }}
                  >
                    {[
                      { label: "Shadows", desc: "Real-time block shadows", defaultOn: true },
                      { label: "Fog", desc: "Atmospheric distance fog", defaultOn: true },
                      { label: "Sky", desc: "Dynamic sky gradient", defaultOn: true },
                      { label: "Grid", desc: "Floor grid overlay", defaultOn: false },
                    ].map((item, idx) => (
                      <SettingsRow
                        key={item.label}
                        label={item.label}
                        desc={item.desc}
                        defaultOn={item.defaultOn}
                      />
                    ))}
                  </div>

                  <div className="flex items-center gap-2 mt-4 mb-2.5 px-0.5">
                    <span
                      className="text-[8.5px] font-black tracking-[0.18em] uppercase"
                      style={{ color: S.muted }}
                    >
                      Memory
                    </span>
                    <div className="flex-1 h-px" style={{ background: S.border }} />
                  </div>
                  <div
                    className="rounded-[14px] px-4 py-3"
                    style={{ background: "rgba(0,0,0,0.03)", border: `1px solid ${S.border}` }}
                  >
                    <div className="flex justify-between mb-2">
                      <span className="text-[12px] font-semibold" style={{ color: S.text }}>
                        VRAM estimate
                      </span>
                      <span
                        className="text-[12px] font-bold font-mono tabular-nums"
                        style={{ color: memoryMB > 80 ? S.red : S.accent }}
                      >
                        {memoryMB.toFixed(1)} MB
                      </span>
                    </div>
                    <div
                      className="h-1.5 rounded-full overflow-hidden"
                      style={{ background: "rgba(0,0,0,0.09)" }}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, (memoryMB / 128) * 100)}%`,
                          background:
                            memoryMB > 80
                              ? S.red
                              : `linear-gradient(90deg,${S.accentDk},${S.accent})`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between mt-1.5">
                      <span className="text-[9px]" style={{ color: S.muted }}>
                        {blockCount.toLocaleString()} blocks · {placedModels.length} models
                      </span>
                      <span className="text-[9px]" style={{ color: S.muted }}>
                        128 MB max
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── MODEL INSPECTOR ─── */}
      {!playMode && selectedModelId && (
        <div
          className="absolute inset-x-3 z-[25] pointer-events-auto"
          style={{ bottom: panelOpen ? "calc(54vh + 74px + 12px)" : "calc(62px + 14px)" }}
        >
          <div
            className="rounded-[18px] px-4 py-3.5 flex flex-col gap-3"
            style={{
              background: S.panel,
              border: "1.5px solid rgba(251,146,60,0.38)",
              boxShadow: "0 0 0 1px rgba(251,146,60,0.10), 0 20px 60px rgba(0,0,0,0.70)",
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-2.5">
              <div
                className="h-8 w-8 rounded-[9px] grid place-items-center shrink-0"
                style={{
                  background: "rgba(251,146,60,0.14)",
                  border: "1.5px solid rgba(251,146,60,0.28)",
                }}
              >
                <Box className="h-4 w-4" style={{ color: S.orange }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-bold" style={{ color: S.text }}>
                  {selectedModelName ?? "Model"}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <div
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: S.orange, boxShadow: `0 0 4px ${S.orange}` }}
                  />
                  <span
                    className="text-[8.5px] font-black tracking-widest uppercase"
                    style={{ color: S.orange }}
                  >
                    Selected
                  </span>
                </div>
              </div>
              <button
                onClick={() => engineRef.current?.selectModel(null)}
                className="h-7 w-7 rounded-[8px] flex items-center justify-center active:scale-90"
                style={{ background: "rgba(0,0,0,0.05)" }}
              >
                <X className="h-3.5 w-3.5" style={{ color: S.muted }} />
              </button>
            </div>

            {/* Axis arrow controls — colored XYZ */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { axis: "x" as const, label: "X", color: S.red },
                { axis: "y" as const, label: "Y", color: S.green },
                { axis: "z" as const, label: "Z", color: S.blue },
              ].map(({ axis, label, color }) => (
                <div key={axis} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-center gap-1">
                    <div className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
                    <span
                      className="text-[9px] font-black tracking-widest uppercase"
                      style={{ color }}
                    >
                      {label}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => engineRef.current?.nudgeModel(selectedModelId, axis, -0.5)}
                      className="flex-1 h-9 rounded-[10px] flex items-center justify-center active:scale-90 transition-all"
                      style={{ background: `${color}16`, border: `1px solid ${color}32` }}
                    >
                      {axis === "y" ? (
                        <ArrowDown className="h-[18px] w-[18px]" style={{ color }} />
                      ) : (
                        <ArrowLeft className="h-[18px] w-[18px]" style={{ color }} />
                      )}
                    </button>
                    <button
                      onClick={() => engineRef.current?.nudgeModel(selectedModelId, axis, 0.5)}
                      className="flex-1 h-9 rounded-[10px] flex items-center justify-center active:scale-90 transition-all"
                      style={{ background: `${color}16`, border: `1px solid ${color}32` }}
                    >
                      {axis === "y" ? (
                        <ArrowUp className="h-[18px] w-[18px]" style={{ color }} />
                      ) : (
                        <ArrowRight className="h-[18px] w-[18px]" style={{ color }} />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (scriptTarget === selectedModelId) {
                    setScriptTarget(null);
                  } else {
                    setScriptTarget(selectedModelId);
                    setBottomTab("scripts");
                    setPanelOpen(true);
                  }
                }}
                className="flex-1 h-8 rounded-[10px] flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                style={{
                  background: scriptTarget === selectedModelId ? S.accentDim : "rgba(0,0,0,0.05)",
                  border: `1px solid ${scriptTarget === selectedModelId ? S.borderA : S.border}`,
                }}
              >
                <Code2
                  className="h-3.5 w-3.5"
                  style={{ color: scriptTarget === selectedModelId ? S.accent : S.muted }}
                />
                <span
                  className="text-[11px] font-bold"
                  style={{ color: scriptTarget === selectedModelId ? S.accent : S.muted }}
                >
                  {scriptTarget === selectedModelId ? "Targeted" : "Script"}
                </span>
              </button>
              <button
                onClick={() => {
                  engineRef.current?.removeModel(selectedModelId);
                  setPlacedModels((prev) => prev.filter((m) => m.id !== selectedModelId));
                }}
                className="flex-1 h-8 rounded-[10px] flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                style={{
                  background: "rgba(255,82,82,0.08)",
                  border: "1px solid rgba(255,82,82,0.18)",
                }}
              >
                <Trash2 className="h-3.5 w-3.5" style={{ color: S.red }} />
                <span className="text-[11px] font-bold" style={{ color: S.red }}>
                  Remove
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── GRID BLUEPRINT OVERLAY ─── */}
      {gridMode && !playMode && (
        <div className="absolute inset-0 z-20">
          <GridBlueprintView
            blockMap={blockMap}
            gridY={gridY}
            setGridY={setGridY}
            selectedBlock={selectedBlock}
            tool={tool}
            onPaint={(x, z, type) => engineRef.current?.addBlockExternal(x, gridY, z, type)}
            onErase={(x, z) => engineRef.current?.eraseBlockExternal(x, gridY, z)}
            onClose={() => setGridMode(false)}
          />
        </div>
      )}

      {/* ─── PLAY MODE HUD ─── */}
      {playMode && (
        <>
          <div className="absolute top-0 inset-x-0 z-40 flex items-center justify-between px-4 pt-4 pointer-events-none">
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-[14px] pointer-events-auto"
              style={{
                background: "rgba(0,0,0,0.65)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div
                className="h-2 w-2 rounded-full"
                style={{ background: S.green, boxShadow: `0 0 6px ${S.green}` }}
              />
              <span className="text-[12px] font-bold" style={{ color: S.text }}>
                QBLOCK
              </span>
              <span
                className="text-[8.5px] font-black tracking-widest uppercase"
                style={{ color: S.muted }}
              >
                Test
              </span>
            </div>
            <button
              onClick={togglePlay}
              className="pointer-events-auto px-4 py-2 rounded-[14px] flex items-center gap-2 active:scale-95 transition-all"
              style={{
                background: "rgba(255,82,82,0.92)",
                boxShadow: "0 4px 16px rgba(255,82,82,0.40)",
                border: "1px solid rgba(255,255,255,0.10)",
              }}
            >
              <div className="h-3 w-3 rounded-[3px] bg-white" />
              <span className="text-[12px] font-bold text-white">Stop</span>
            </button>
          </div>

          <div
            className="absolute bottom-32 left-6 z-40"
            ref={joyAreaRef}
            onTouchStart={handleJoyTouchStart}
            onTouchMove={handleJoyTouchMove}
            onTouchEnd={handleJoyTouchEnd}
            style={{ touchAction: "none" }}
          >
            <div
              className="h-28 w-28 rounded-full flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.32)", border: "2px solid rgba(255,255,255,0.12)" }}
            >
              <div
                ref={joyKnobRef}
                className="h-11 w-11 rounded-full transition-none"
                style={{
                  background: "rgba(255,255,255,0.88)",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
                }}
              />
            </div>
          </div>

          <div className="absolute bottom-32 right-6 z-40">
            <button
              onTouchStart={(e) => {
                jumpRef.current = true;
                e.preventDefault();
              }}
              onTouchEnd={(e) => {
                jumpRef.current = false;
                e.preventDefault();
              }}
              className="h-16 w-16 rounded-[18px] flex items-center justify-center active:scale-90 transition-all"
              style={{
                background: `linear-gradient(135deg,${S.accentDk},${S.accent})`,
                boxShadow: "0 6px 20px rgba(255,214,0,0.40)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              <ArrowUp className="h-7 w-7" style={{ color: "#1a1000" }} />
            </button>
          </div>

          <div className="absolute bottom-0 inset-x-0 z-40 flex flex-col items-center gap-1.5 pb-6 px-4 pointer-events-none">
            <div className="flex items-center gap-2 w-full max-w-sm">
              <Star className="h-3 w-3 shrink-0" style={{ color: S.accent }} />
              <div
                className="flex-1 h-1.5 rounded-full overflow-hidden"
                style={{ background: "rgba(255,255,255,0.10)" }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: "42%",
                    background: `linear-gradient(90deg,${S.accentDk},${S.accent})`,
                  }}
                />
              </div>
              <span
                className="text-[9px] font-bold font-mono tabular-nums"
                style={{ color: S.accent }}
              >
                Lv 12
              </span>
            </div>
            <div className="flex gap-0.5">
              {Array.from({ length: 10 }).map((_, i) => (
                <Heart
                  key={i}
                  className="h-4 w-4"
                  style={{
                    color: i < 9 ? S.red : "rgba(255,82,82,0.28)",
                    fill: i < 9 ? S.red : "none",
                  }}
                />
              ))}
            </div>
            <div
              className="flex gap-1 px-2 py-1.5 rounded-[16px]"
              style={{
                background: "rgba(0,0,0,0.75)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {Array.from({ length: 9 }).map((_, slot) => {
                const b = BLOCKS[slot];
                const isActive = slot === 0;
                return (
                  <div
                    key={slot}
                    className="h-12 w-12 rounded-[10px] flex flex-col items-center justify-center relative overflow-hidden"
                    style={{
                      background: isActive ? "rgba(255,214,0,0.20)" : "rgba(255,255,255,0.05)",
                      border: `1.5px solid ${isActive ? "rgba(255,214,0,0.75)" : "rgba(255,255,255,0.08)"}`,
                      boxShadow: isActive ? "0 0 12px rgba(255,214,0,0.30)" : "none",
                    }}
                  >
                    <img
                      src={`/textures/blocks/${b.tex.top}`}
                      alt={b.name}
                      className="h-8 w-8"
                      style={{ imageRendering: "pixelated" }}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.opacity = "0";
                      }}
                    />
                    <span
                      className="absolute bottom-0.5 right-1 text-[7px] font-bold"
                      style={{ color: "rgba(255,255,255,0.35)" }}
                    >
                      {slot + 1}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <div className="relative h-5 w-5">
              <div
                className="absolute inset-x-0 top-1/2 h-[1.5px] -translate-y-1/2 rounded-full"
                style={{ background: "rgba(255,255,255,0.75)" }}
              />
              <div
                className="absolute inset-y-0 left-1/2 w-[1.5px] -translate-x-1/2 rounded-full"
                style={{ background: "rgba(255,255,255,0.75)" }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Settings Row ─────────────────────────────────────────────────────────────
function SettingsRow({
  label,
  desc,
  defaultOn,
}: {
  label: string;
  desc: string;
  defaultOn: boolean;
}) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div
      className="flex items-center gap-3 px-4 py-3"
      style={{ borderBottom: `1px solid ${S.border}` }}
    >
      <div className="flex-1">
        <div className="text-[13px] font-semibold" style={{ color: S.text }}>
          {label}
        </div>
        <div className="text-[10px] mt-0.5" style={{ color: S.muted }}>
          {desc}
        </div>
      </div>
      <button
        onClick={() => setOn((v) => !v)}
        className="relative shrink-0 transition-all duration-200"
        style={{
          width: 46,
          height: 26,
          borderRadius: 13,
          background: on ? S.green : "rgba(255,255,255,0.10)",
          border: `1px solid ${on ? "rgba(52,211,153,0.40)" : S.border}`,
        }}
      >
        <span
          className="absolute top-[2px] h-[20px] w-[20px] rounded-full bg-white transition-all duration-200"
          style={{ left: on ? 22 : 3, boxShadow: "0 2px 6px rgba(0,0,0,0.45)" }}
        />
      </button>
    </div>
  );
}

// ─── Grid Blueprint Overlay ───────────────────────────────────────────────────
function GridBlueprintView({
  blockMap,
  gridY,
  setGridY,
  selectedBlock,
  tool,
  onPaint,
  onErase,
  onClose,
}: {
  blockMap: Map<string, number>;
  gridY: number;
  setGridY: (y: number) => void;
  selectedBlock: number;
  tool: ToolMode;
  onPaint: (x: number, z: number, type: number) => void;
  onErase: (x: number, z: number) => void;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const GRID = 24;
  const CELL = 28;
  const [layer, setLayer] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    const m = new Map<string, number>();
    blockMap.forEach((type, key) => {
      const [, y] = key.split(",").map(Number);
      if (y === gridY) {
        const [x, , z] = key.split(",").map(Number);
        m.set(`${x},${z}`, type);
      }
    });
    setLayer(m);
  }, [blockMap, gridY]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#0a0a14";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let x = 0; x < GRID; x++)
      for (let z = 0; z < GRID; z++) {
        const cx = x * CELL,
          cy = z * CELL;
        const bt = layer.get(`${x},${z}`);
        if (bt !== undefined && BLOCKS[bt]) {
          ctx.fillStyle = `#${BLOCKS[bt].color.toString(16).padStart(6, "0")}`;
          ctx.fillRect(cx + 1, cy + 1, CELL - 2, CELL - 2);
          ctx.fillStyle = "rgba(255,255,255,0.18)";
          ctx.fillRect(cx + 1, cy + 1, CELL - 2, 4);
        } else {
          ctx.fillStyle = x % 2 === z % 2 ? "#0e0e1c" : "#0c0c18";
          ctx.fillRect(cx, cy, CELL, CELL);
        }
        ctx.strokeStyle = "rgba(255,214,0,0.08)";
        ctx.strokeRect(cx, cy, CELL, CELL);
      }
  }, [layer]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
      const x = Math.floor((e.clientX - rect.left) / CELL);
      const z = Math.floor((e.clientY - rect.top) / CELL);
      if (x < 0 || x >= GRID || z < 0 || z >= GRID) return;
      if (tool === "erase") {
        setLayer((p) => {
          const n = new Map(p);
          n.delete(`${x},${z}`);
          return n;
        });
        onErase(x, z);
      } else {
        setLayer((p) => {
          const n = new Map(p);
          n.set(`${x},${z}`, selectedBlock);
          return n;
        });
        onPaint(x, z, selectedBlock);
      }
    },
    [tool, selectedBlock, onPaint, onErase],
  );

  return (
    <div className="flex flex-col h-full" style={{ background: S.bg }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 shrink-0"
        style={{ background: S.panel, borderBottom: `1px solid ${S.border}` }}
      >
        <div
          className="h-8 w-8 rounded-[9px] flex items-center justify-center shrink-0"
          style={{ background: S.accentDim, border: `1px solid ${S.borderA}` }}
        >
          <Grid3x3 className="h-4 w-4" style={{ color: S.accent }} />
        </div>
        <div className="flex-1">
          <span className="text-[14px] font-bold" style={{ color: S.text }}>
            Blueprint
          </span>
          <span className="ml-2 text-[11px] font-mono" style={{ color: S.accent }}>
            Y = {gridY}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setGridY(gridY - 1)}
            className="h-8 w-8 rounded-[9px] flex items-center justify-center active:scale-90 transition-all"
            style={{ background: "rgba(0,0,0,0.05)", border: `1px solid ${S.border}` }}
          >
            <ChevronDown className="h-4 w-4" style={{ color: S.muted }} />
          </button>
          <button
            onClick={() => setGridY(gridY + 1)}
            className="h-8 w-8 rounded-[9px] flex items-center justify-center active:scale-90 transition-all"
            style={{ background: "rgba(0,0,0,0.05)", border: `1px solid ${S.border}` }}
          >
            <ChevronUp className="h-4 w-4" style={{ color: S.muted }} />
          </button>
        </div>
        <button
          onClick={onClose}
          className="h-8 w-8 rounded-[9px] flex items-center justify-center active:scale-90 transition-all"
          style={{ background: "rgba(255,82,82,0.10)", border: "1px solid rgba(255,82,82,0.18)" }}
        >
          <X className="h-4 w-4" style={{ color: S.red }} />
        </button>
      </div>
      <div className="flex-1 overflow-auto p-4 flex items-start justify-center">
        <canvas
          ref={canvasRef}
          width={GRID * CELL}
          height={GRID * CELL}
          className="rounded-[12px]"
          style={{
            cursor: tool === "erase" ? "not-allowed" : "crosshair",
            border: `1px solid ${S.borderA}`,
            imageRendering: "pixelated",
            boxShadow: `0 8px 40px rgba(0,0,0,0.60), 0 0 0 1px ${S.borderA}`,
            touchAction: "none",
          }}
          onClick={handleClick}
        />
      </div>
    </div>
  );
}

// ─── 3D Engine ────────────────────────────────────────────────────────────────
function createEngine(
  mount: HTMLDivElement,
  selectedBlockRef: React.MutableRefObject<BlockType>,
  toolRef: React.MutableRefObject<ToolMode>,
  playModeRef: React.MutableRefObject<boolean>,
  joyRef: React.MutableRefObject<{ x: number; z: number }>,
  jumpRef: React.MutableRefObject<boolean>,
  onBlockCountChange: (n: number, map: Map<string, number>) => void,
  onModelSelect?: (
    id: string | null,
    name: string | null,
    pos: { x: number; y: number; z: number } | null,
  ) => void,
) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x9ed4f8, 0.016);

  const initW = Math.max(mount.clientWidth, 1);
  const initH = Math.max(mount.clientHeight, 1);
  const camera = new THREE.PerspectiveCamera(70, initW / initH, 0.05, 500);

  // ── Editor orbit camera ──
  let camTheta = -Math.PI / 4;
  let camPhi = Math.PI / 3.8;
  let camRadius = 32;
  const camTarget = new THREE.Vector3(8, 0, 8);

  function updateEditorCamera() {
    camera.position.set(
      camTarget.x + camRadius * Math.sin(camPhi) * Math.sin(camTheta),
      camTarget.y + camRadius * Math.cos(camPhi),
      camTarget.z + camRadius * Math.sin(camPhi) * Math.cos(camTheta),
    );
    camera.lookAt(camTarget);
  }
  updateEditorCamera();

  // ── Renderer ──
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    if (!renderer.getContext()) throw new Error("no ctx");
  } catch {
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false });
    } catch {
      mount.innerHTML = `<div style="height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;font-family:system-ui;background:linear-gradient(160deg,#fffbeb,#fff9d0)">
        <div style="font-size:48px">🧱</div>
        <div style="font-size:17px;font-weight:700;color:#1a1a2e">3D Build Mode</div>
        <div style="font-size:13px;text-align:center;max-width:240px;line-height:1.6;color:#6a6a8a">WebGL required.<br/>Open on a real device to build.</div>
      </div>`;
      return {
        placeModel() {},
        removeModel() {},
        moveModel() {},
        scaleModel() {},
        selectModel(_id: string | null) {},
        nudgeModel(_id: string, _axis: "x" | "y" | "z", _delta: number) {},
        getModelPos(_id: string): null {
          return null;
        },
        placeAtCrosshair(_action: "place" | "erase", _type: number): boolean {
          return false;
        },
        addBlockExternal() {},
        eraseBlockExternal() {},
        clearUserBlocks() {},
        clearAll() {},
        startPlay() {},
        stopPlay() {},
        dispose() {
          mount.innerHTML = "";
        },
      };
    }
  }

  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(initW, initH, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  const canvas = renderer.domElement;
  canvas.style.cssText = "display:block;width:100%;height:100%;touch-action:none";
  mount.appendChild(canvas);

  // ── Sky ──
  const skyC = document.createElement("canvas");
  skyC.width = 4;
  skyC.height = 512;
  const sCtx = skyC.getContext("2d")!;
  const grad = sCtx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, "#0d1f3c");
  grad.addColorStop(0.22, "#1a4a8a");
  grad.addColorStop(0.52, "#4c9fd8");
  grad.addColorStop(0.76, "#9ed4f8");
  grad.addColorStop(0.92, "#c8ecff");
  grad.addColorStop(1, "#ddf2ff");
  sCtx.fillStyle = grad;
  sCtx.fillRect(0, 0, 4, 512);
  scene.background = new THREE.CanvasTexture(skyC);

  // Sun sphere
  const sunMesh = new THREE.Mesh(
    new THREE.SphereGeometry(3, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xfffae0 }),
  );
  sunMesh.position.set(80, 100, -150);
  scene.add(sunMesh);

  // ── Lights ──
  scene.add(new THREE.AmbientLight(0xffeedd, 0.55));
  const sun = new THREE.DirectionalLight(0xfff8e0, 1.8);
  sun.position.set(20, 40, 14);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {
    near: 1,
    far: 120,
    left: -50,
    right: 50,
    top: 50,
    bottom: -50,
  });
  sun.shadow.bias = -0.002;
  scene.add(sun);
  const fillLight = new THREE.DirectionalLight(0xa8d8ff, 0.28);
  fillLight.position.set(-12, 8, -10);
  scene.add(fillLight);
  scene.add(new THREE.HemisphereLight(0x9ed4f8, 0x5a7040, 0.32));

  // ── Floor grid ──
  const gridHelper = new THREE.GridHelper(64, 64, 0xc8b050, 0xddc870);
  (gridHelper.material as THREE.LineBasicMaterial).opacity = 0.2;
  (gridHelper.material as THREE.LineBasicMaterial).transparent = true;
  gridHelper.position.set(8, -0.5, 8);
  scene.add(gridHelper);

  // ── Block system ──
  const blockGeo = new THREE.BoxGeometry(1, 1, 1);
  const texLoader = new THREE.TextureLoader();

  function loadTex(file: string) {
    const t = texLoader.load(`/textures/blocks/${file}`);
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestMipMapLinearFilter;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return t;
  }
  function makeMat(
    b: (typeof BLOCKS)[number],
  ): THREE.MeshStandardMaterial | THREE.MeshStandardMaterial[] {
    const def = b.tex as Record<string, string>;
    const isEmissive = b.emissive !== 0;
    const isMetallic = [30, 31, 32].includes(BLOCKS.indexOf(b as any));
    function m(file: string) {
      return new THREE.MeshStandardMaterial({
        map: loadTex(file),
        roughness: isMetallic ? 0.3 : 0.85,
        metalness: isMetallic ? 0.5 : 0,
        emissive: new THREE.Color(b.emissive),
        emissiveIntensity: isEmissive ? 0.5 : 0,
      });
    }
    if (def.side || def.bot) {
      const top = m(b.tex.top);
      const side = m(def.side ?? b.tex.top);
      const bot = m(def.bot ?? b.tex.top);
      return [side, side, top, bot, side, side];
    }
    return m(b.tex.top);
  }
  const mats = BLOCKS.map(makeMat);

  type Group = {
    mesh: THREE.InstancedMesh;
    count: number;
    posToIndex: Map<string, number>;
    indexToPos: Map<number, string>;
  };
  const groups = new Map<number, Group>();
  const dummy = new THREE.Object3D();
  const scratch = new THREE.Matrix4();
  const blocks = new Map<string, number>();

  function bkey(x: number, y: number, z: number) {
    return `${x},${y},${z}`;
  }
  function ensureGroup(type: number): Group {
    let g = groups.get(type);
    if (g) return g;
    const mesh = new THREE.InstancedMesh(blockGeo, mats[type], 4096);
    mesh.count = 0;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(mesh);
    g = { mesh, count: 0, posToIndex: new Map(), indexToPos: new Map() };
    groups.set(type, g);
    return g;
  }
  function addBlock(x: number, y: number, z: number, type: number) {
    if (type < 0 || type >= BLOCKS.length) return;
    const k = bkey(x, y, z);
    if (blocks.has(k)) removeBlock(x, y, z);
    blocks.set(k, type);
    const g = ensureGroup(type);
    const idx = g.count;
    dummy.position.set(x, y, z);
    dummy.updateMatrix();
    g.mesh.setMatrixAt(idx, dummy.matrix);
    g.count++;
    g.mesh.count = g.count;
    g.posToIndex.set(k, idx);
    g.indexToPos.set(idx, k);
    g.mesh.instanceMatrix.needsUpdate = true;
    onBlockCountChange(blocks.size, blocks);
  }
  function removeBlock(x: number, y: number, z: number) {
    const k = bkey(x, y, z);
    const type = blocks.get(k);
    if (type === undefined) return;
    const g = groups.get(type)!;
    const idx = g.posToIndex.get(k)!;
    const last = g.count - 1;
    if (idx !== last) {
      g.mesh.getMatrixAt(last, scratch);
      g.mesh.setMatrixAt(idx, scratch);
      const lk = g.indexToPos.get(last)!;
      g.posToIndex.set(lk, idx);
      g.indexToPos.set(idx, lk);
      g.indexToPos.delete(last);
    }
    g.posToIndex.delete(k);
    g.count--;
    g.mesh.count = g.count;
    g.mesh.instanceMatrix.needsUpdate = true;
    blocks.delete(k);
    onBlockCountChange(blocks.size, blocks);
  }

  // Platform
  for (let x = 0; x < 16; x++)
    for (let z = 0; z < 16; z++) {
      addBlock(x, 0, z, 0);
      addBlock(x, -1, z, 1);
    }

  // ── Hover indicator ──
  const hoverMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1.04, 1.04, 1.04),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
    }),
  );
  hoverMesh.add(
    new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1.04, 1.04, 1.04)),
      new THREE.LineBasicMaterial({ color: 0xffd600, transparent: true, opacity: 0.88 }),
    ),
  );
  hoverMesh.visible = false;
  scene.add(hoverMesh);

  // ── Player for play mode ──
  const playerGeo = new THREE.BoxGeometry(0.6, 1.8, 0.6);
  const playerMat = new THREE.MeshStandardMaterial({
    color: 0x4488ff,
    roughness: 0.6,
    metalness: 0.1,
    transparent: true,
    opacity: 0.0,
  }); // invisible
  const playerMesh = new THREE.Mesh(playerGeo, playerMat);
  playerMesh.visible = false;
  scene.add(playerMesh);

  // Player physics state
  let px = 8,
    py = 3,
    pz = 8;
  let pvx = 0,
    pvy = 0,
    pvz = 0;
  let onGround = false;
  let playing = false;
  let lastTime = 0;
  // Camera yaw for play mode (controlled by touch drag on canvas)
  let playYaw = 0;
  let playDragActive = false;
  let playDragLastX = 0;

  const GRAVITY = -22;
  const JUMP_VEL = 9;
  const MOVE_SPD = 5;
  const PLAYER_H = 1.8;
  const PLAYER_R = 0.28; // half-width

  function blockAt(x: number, y: number, z: number): boolean {
    return blocks.has(bkey(Math.floor(x + 0.5), Math.floor(y + 0.5), Math.floor(z + 0.5)));
  }
  function solidAt(x: number, y: number, z: number): boolean {
    return blocks.has(bkey(Math.round(x), Math.round(y), Math.round(z)));
  }

  function updatePlayer(dt: number) {
    const joy = joyRef.current;
    const doJump = jumpRef.current;

    // Move relative to camera yaw
    const fwdX = Math.sin(playYaw);
    const fwdZ = Math.cos(playYaw);
    const rgtX = fwdZ;
    const rgtZ = -fwdX;

    pvx = (fwdX * -joy.z + rgtX * joy.x) * MOVE_SPD;
    pvz = (fwdZ * -joy.z + rgtZ * joy.x) * MOVE_SPD;

    // Jump
    if (doJump && onGround) {
      pvy = JUMP_VEL;
      onGround = false;
      jumpRef.current = false;
    }

    // Gravity
    pvy += GRAVITY * dt;

    // Move X
    px += pvx * dt;
    // Simple X collision
    if (solidAt(px + PLAYER_R, py, pz) || solidAt(px + PLAYER_R, py + 1, pz)) {
      px -= pvx * dt;
      pvx = 0;
    }
    if (solidAt(px - PLAYER_R, py, pz) || solidAt(px - PLAYER_R, py + 1, pz)) {
      px -= pvx * dt;
      pvx = 0;
    }

    // Move Z
    pz += pvz * dt;
    if (solidAt(px, py, pz + PLAYER_R) || solidAt(px, py + 1, pz + PLAYER_R)) {
      pz -= pvz * dt;
      pvz = 0;
    }
    if (solidAt(px, py, pz - PLAYER_R) || solidAt(px, py + 1, pz - PLAYER_R)) {
      pz -= pvz * dt;
      pvz = 0;
    }

    // Move Y
    py += pvy * dt;

    // Floor collision
    const floorY = Math.floor(py) - 1;
    onGround = false;
    if (pvy <= 0 && solidAt(px, floorY, pz)) {
      py = floorY + 1;
      pvy = 0;
      onGround = true;
    }
    // Ceiling
    if (pvy > 0 && solidAt(px, Math.ceil(py + PLAYER_H), pz)) {
      py = Math.ceil(py + PLAYER_H) - PLAYER_H - 1;
      pvy = 0;
    }

    // Void reset
    if (py < -20) {
      px = 8;
      py = 3;
      pz = 8;
      pvx = 0;
      pvy = 0;
      pvz = 0;
    }

    // Sync mesh
    playerMesh.position.set(px, py + PLAYER_H / 2, pz);
  }

  function updatePlayCamera() {
    // Third-person: 4 blocks behind, 2 above
    const eyeY = py + 1.6;
    const dist = 4;
    const camX = px - Math.sin(playYaw) * dist;
    const camZ = pz - Math.cos(playYaw) * dist;
    const camY = eyeY + 1.5;
    camera.position.set(camX, camY, camZ);
    camera.lookAt(px, eyeY, pz);
  }

  // ── Raycaster ──
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2(-9, -9);
  let hoverPos: THREE.Vector3 | null = null;
  function getAllMeshes() {
    return [...groups.values()].map((g) => g.mesh);
  }
  function raycast(nx: number, ny: number) {
    const rect = mount.getBoundingClientRect();
    mouse.set(((nx - rect.left) / rect.width) * 2 - 1, -((ny - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(getAllMeshes(), false);
    return hits.length ? hits[0] : null;
  }

  // ── Editor drag ──
  let dragging = false,
    dragBtn = 0,
    lastX = 0,
    lastY = 0,
    touchDist = 0;

  function onMouseDown(e: MouseEvent) {
    if (playing) {
      // Camera yaw drag in play mode
      playDragActive = true;
      playDragLastX = e.clientX;
      return;
    }
    if (e.button === 2) e.preventDefault();
    dragging = true;
    dragBtn = e.button;
    lastX = e.clientX;
    lastY = e.clientY;
  }
  function onMouseMove(e: MouseEvent) {
    if (playing) {
      if (playDragActive) {
        playYaw += (e.clientX - playDragLastX) * 0.005;
        playDragLastX = e.clientX;
      }
      return;
    }
    if (!dragging) {
      const hit = raycast(e.clientX, e.clientY);
      if (hit?.face) {
        const iMesh = hit.object as THREE.InstancedMesh;
        if (toolRef.current === "erase") {
          iMesh.getMatrixAt(hit.instanceId!, scratch);
          const p = new THREE.Vector3().setFromMatrixPosition(scratch);
          hoverMesh.position.set(p.x, p.y, p.z);
          hoverMesh.visible = true;
          hoverPos = p.clone();
        } else {
          hoverPos = hit.point.clone().add(hit.face.normal.clone().multiplyScalar(0.5)).floor();
          hoverMesh.position.set(hoverPos.x + 0.5, hoverPos.y + 0.5, hoverPos.z + 0.5);
          hoverMesh.visible = true;
        }
      } else {
        hoverMesh.visible = false;
        hoverPos = null;
      }
      return;
    }
    const dx = e.clientX - lastX,
      dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    if (dragBtn === 0) {
      camTheta -= dx * 0.006;
      camPhi = Math.max(0.08, Math.min(Math.PI * 0.47, camPhi - dy * 0.006));
    } else if (dragBtn === 2) {
      const right = new THREE.Vector3(-Math.cos(camTheta), 0, Math.sin(camTheta));
      camTarget
        .addScaledVector(right, -dx * 0.025)
        .addScaledVector(new THREE.Vector3(0, 1, 0), dy * 0.025);
    }
    updateEditorCamera();
  }
  function onMouseUp(e: MouseEvent) {
    if (playing) {
      playDragActive = false;
      return;
    }
    if (!dragging) return;
    const dx = Math.abs(e.clientX - lastX),
      dy = Math.abs(e.clientY - lastY);
    dragging = false;
    if (dx < 5 && dy < 5 && hoverPos && !playModeRef.current) handleClick();
  }
  function onWheel(e: WheelEvent) {
    if (!playing) {
      camRadius = Math.max(4, Math.min(80, camRadius + e.deltaY * 0.04));
      updateEditorCamera();
    }
    e.preventDefault();
  }
  function onContextMenu(e: Event) {
    e.preventDefault();
  }

  function checkModelHit(): boolean {
    // Returns true and selects/deselects if a model was hit
    const modelList = [...modelObjects.values()];
    if (!modelList.length) return false;
    const modelHits = raycaster.intersectObjects(modelList, true);
    if (!modelHits.length) return false;
    for (const [id, obj] of modelObjects) {
      let node: THREE.Object3D | null = modelHits[0].object;
      while (node) {
        if (node === obj) {
          selectModelInternal(selModelId === id ? null : id);
          return true;
        }
        node = node.parent;
      }
    }
    return false;
  }

  function handleClick() {
    // First check if clicking a placed model (selects it)
    if (!playModeRef.current && checkModelHit()) return;
    // Otherwise deselect any model and do block edit
    if (selModelId) selectModelInternal(null);
    if (!hoverPos) return;
    if (toolRef.current === "erase") removeBlock(hoverPos.x, hoverPos.y, hoverPos.z);
    else if (toolRef.current === "place")
      addBlock(hoverPos.x, hoverPos.y, hoverPos.z, selectedBlockRef.current);
    renderer.shadowMap.needsUpdate = true;
  }

  // Place or erase at the screen's centre (crosshair) — used by the
  // dedicated floating action button so mobile users don't have to
  // tap-orbit-tap; they can just look then tap the FAB.
  function placeAtCrosshair(action: "place" | "erase", type: number): boolean {
    if (playing) return false;
    const rect = mount.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const hit = raycast(cx, cy);
    if (!hit?.face) return false;
    const iMesh = hit.object as THREE.InstancedMesh;
    if (action === "erase") {
      iMesh.getMatrixAt(hit.instanceId!, scratch);
      const p = new THREE.Vector3().setFromMatrixPosition(scratch);
      removeBlock(Math.round(p.x), Math.round(p.y), Math.round(p.z));
    } else {
      const p = hit.point.clone().add(hit.face.normal.clone().multiplyScalar(0.5)).floor();
      addBlock(p.x, p.y, p.z, type);
    }
    renderer.shadowMap.needsUpdate = true;
    return true;
  }

  // Touch for editor orbit / pinch
  function onTouchStart(e: TouchEvent) {
    if (playing) return; // play mode joystick handles touch separately
    if (e.touches.length === 2) {
      const a = e.touches[0],
        b = e.touches[1];
      touchDist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    } else {
      lastX = e.touches[0].clientX;
      lastY = e.touches[0].clientY;
      dragging = true;
      dragBtn = 0;
    }
  }
  function onTouchMove(e: TouchEvent) {
    if (playing) return;
    e.preventDefault();
    if (e.touches.length === 2) {
      const a = e.touches[0],
        b = e.touches[1];
      const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      camRadius = Math.max(4, Math.min(80, camRadius - (d - touchDist) * 0.05));
      touchDist = d;
      updateEditorCamera();
    } else if (e.touches.length === 1 && dragging) {
      const dx = e.touches[0].clientX - lastX,
        dy = e.touches[0].clientY - lastY;
      lastX = e.touches[0].clientX;
      lastY = e.touches[0].clientY;
      camTheta -= dx * 0.006;
      camPhi = Math.max(0.08, Math.min(Math.PI * 0.47, camPhi - dy * 0.006));
      updateEditorCamera();
    }
  }
  function onTouchEnd(e: TouchEvent) {
    if (playing) return;
    dragging = false;
    if (e.changedTouches.length === 1 && !playModeRef.current) {
      const t = e.changedTouches[0];
      // Set raycaster to this touch position for model hit testing
      const rect = mount.getBoundingClientRect();
      const mx = ((t.clientX - rect.left) / rect.width) * 2 - 1;
      const my = -((t.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(new THREE.Vector2(mx, my), camera);
      // Check model hit first
      if (checkModelHit()) return;
      // Block edit
      const hit = raycast(t.clientX, t.clientY);
      if (hit?.face) {
        const iMesh = hit.object as THREE.InstancedMesh;
        if (toolRef.current === "erase") {
          iMesh.getMatrixAt(hit.instanceId!, scratch);
          hoverPos = new THREE.Vector3().setFromMatrixPosition(scratch);
        } else
          hoverPos = hit.point.clone().add(hit.face.normal.clone().multiplyScalar(0.5)).floor();
        if (selModelId) selectModelInternal(null);
        handleClick();
        hoverPos = null;
      }
    }
  }

  // Touch camera-look in play mode (right side of screen)
  function onPlayTouchStart(e: TouchEvent) {
    if (!playing) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      const halfW = mount.clientWidth / 2;
      if (t.clientX > halfW) {
        playDragActive = true;
        playDragLastX = t.clientX;
      }
    }
  }
  function onPlayTouchMove(e: TouchEvent) {
    if (!playing) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (playDragActive) {
        playYaw += (t.clientX - playDragLastX) * 0.006;
        playDragLastX = t.clientX;
      }
    }
    e.preventDefault();
  }
  function onPlayTouchEnd() {
    if (playing) playDragActive = false;
  }

  mount.addEventListener("mousedown", onMouseDown);
  mount.addEventListener("mousemove", onMouseMove);
  mount.addEventListener("mouseup", onMouseUp);
  mount.addEventListener("wheel", onWheel, { passive: false });
  mount.addEventListener("contextmenu", onContextMenu);
  mount.addEventListener("touchstart", onTouchStart, { passive: false });
  mount.addEventListener("touchmove", onTouchMove, { passive: false });
  mount.addEventListener("touchend", onTouchEnd);
  mount.addEventListener("touchstart", onPlayTouchStart, { passive: false });
  mount.addEventListener("touchmove", onPlayTouchMove, { passive: false });
  mount.addEventListener("touchend", onPlayTouchEnd);

  // ── GLB Models + Selection ──
  const modelObjects = new Map<string, THREE.Object3D>();
  const modelNames = new Map<string, string>();
  const loader = new GLTFLoader();

  // Purple bounding box for the selected model
  let selModelId: string | null = null;
  let boxHelper: THREE.BoxHelper | null = null;

  function selectModelInternal(id: string | null) {
    if (boxHelper) {
      scene.remove(boxHelper);
      boxHelper = null;
    }
    selModelId = id;
    if (id) {
      const obj = modelObjects.get(id);
      if (obj) {
        boxHelper = new THREE.BoxHelper(obj, 0x9333ea);
        (boxHelper.material as THREE.LineBasicMaterial).linewidth = 2;
        scene.add(boxHelper);
        const p = obj.position;
        onModelSelect?.(id, modelNames.get(id) ?? id, { x: p.x, y: p.y, z: p.z });
      }
    } else {
      onModelSelect?.(null, null, null);
    }
  }

  function placeModel(
    file: string,
    scale: number,
    px: number,
    py: number,
    pz: number,
    id: string,
    displayName?: string,
  ) {
    loader.load(file, (gltf) => {
      const obj = skeletonClone(gltf.scene);
      obj.scale.setScalar(scale);
      obj.position.set(px, py, pz);
      obj.traverse((c) => {
        if ((c as THREE.Mesh).isMesh) {
          c.castShadow = true;
          c.receiveShadow = true;
        }
      });
      scene.add(obj);
      modelObjects.set(id, obj);
      if (displayName) modelNames.set(id, displayName);
      renderer.shadowMap.needsUpdate = true;
    });
  }
  function removeModel(id: string) {
    const obj = modelObjects.get(id);
    if (obj) {
      scene.remove(obj);
      modelObjects.delete(id);
      modelNames.delete(id);
    }
    if (selModelId === id) selectModelInternal(null);
  }
  function moveModel(id: string, axis: "x" | "y" | "z", val: number) {
    const obj = modelObjects.get(id);
    if (obj) obj.position[axis] = val;
  }
  function scaleModel(id: string, val: number) {
    const obj = modelObjects.get(id);
    if (obj) obj.scale.setScalar(val);
  }

  function nudgeModel(id: string, axis: "x" | "y" | "z", delta: number) {
    const obj = modelObjects.get(id);
    if (!obj) return;
    obj.position[axis] += delta;
    if (boxHelper) boxHelper.update();
  }
  function getModelPos(id: string): { x: number; y: number; z: number } | null {
    const obj = modelObjects.get(id);
    if (!obj) return null;
    return { x: obj.position.x, y: obj.position.y, z: obj.position.z };
  }

  // ── Resize ──
  const ro = new ResizeObserver(() => {
    const w = mount.clientWidth,
      h = mount.clientHeight;
    if (w > 0 && h > 0) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    }
  });
  ro.observe(mount);

  // ── Render loop ──
  let rafId = 0;
  function loop(now: number) {
    rafId = requestAnimationFrame(loop);
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    if (playing) {
      updatePlayer(dt);
      updatePlayCamera();
    }
    if (boxHelper) boxHelper.update(); // keep purple selection box in sync
    renderer.render(scene, camera);
  }
  rafId = requestAnimationFrame((t) => {
    lastTime = t;
    loop(t);
  });

  return {
    placeModel,
    removeModel,
    moveModel,
    scaleModel,
    selectModel: selectModelInternal,
    nudgeModel,
    getModelPos,
    placeAtCrosshair,
    addBlockExternal(x: number, y: number, z: number, type: number) {
      addBlock(x, y, z, type);
      renderer.shadowMap.needsUpdate = true;
    },
    eraseBlockExternal(x: number, y: number, z: number) {
      removeBlock(x, y, z);
    },
    clearUserBlocks() {
      const rem: [number, number, number][] = [];
      blocks.forEach((_, k) => {
        const [x, y, z] = k.split(",").map(Number);
        if (y > 0) rem.push([x, y, z]);
      });
      rem.forEach(([x, y, z]) => removeBlock(x, y, z));
      renderer.shadowMap.needsUpdate = true;
    },
    clearAll() {
      const all: [number, number, number][] = [];
      blocks.forEach((_, k) => {
        const [x, y, z] = k.split(",").map(Number);
        all.push([x, y, z]);
      });
      all.forEach(([x, y, z]) => removeBlock(x, y, z));
    },
    startPlay() {
      playing = true;
      playerMesh.visible = false;
      // Reset player to a block above the terrain
      px = 8;
      py = 3;
      pz = 8;
      pvx = 0;
      pvy = 0;
      pvz = 0;
      onGround = false;
      playYaw = 0;
      hoverMesh.visible = false;
    },
    stopPlay() {
      playing = false;
      playerMesh.visible = false;
      updateEditorCamera();
    },
    dispose() {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      mount.removeEventListener("mousedown", onMouseDown);
      mount.removeEventListener("mousemove", onMouseMove);
      mount.removeEventListener("mouseup", onMouseUp);
      mount.removeEventListener("wheel", onWheel);
      mount.removeEventListener("contextmenu", onContextMenu);
      mount.removeEventListener("touchstart", onTouchStart);
      mount.removeEventListener("touchmove", onTouchMove);
      mount.removeEventListener("touchend", onTouchEnd);
      mount.removeEventListener("touchstart", onPlayTouchStart);
      mount.removeEventListener("touchmove", onPlayTouchMove);
      mount.removeEventListener("touchend", onPlayTouchEnd);
      renderer.dispose();
      if (renderer.domElement.parentNode)
        renderer.domElement.parentNode.removeChild(renderer.domElement);
    },
  };
}
