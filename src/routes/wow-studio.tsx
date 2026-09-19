import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Play,
  Square,
  Save,
  Upload,
  Download,
  Search,
  Settings,
  ChevronRight,
  ChevronDown,
  Box,
  Code2,
  Folder,
  MousePointer,
  Move,
  RotateCw,
  Maximize2,
  Terminal,
  HelpCircle,
  Plus,
  Trash2,
  Copy,
  Sun,
  Layers,
  Sparkles,
  X,
  Minimize2,
  Sliders,
  Check,
  ArrowLeft,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { WowEngine3D } from "@/components/wow-studio/WowEngine3D";
import { WowScriptEditor } from "@/components/wow-studio/WowScriptEditor";
import { WowTutorialModal } from "@/components/wow-studio/WowTutorialModal";
import { WowAudio } from "@/components/wow-studio/wow-audio";
import {
  type VoxelObject,
  type ToolMode,
  type SkyboxPreset,
  type QScriptTriggerType,
  STARTER_PRESETS,
  DEFAULT_QSCRIPT,
} from "@/components/wow-studio/wow-types";

export const Route = createFileRoute("/wow-studio")({
  head: () => ({ meta: [{ title: "WoW Studio 1.0 — QBLOCK Voxel Engine" }] }),
  component: WowStudioPage,
});

export function WowStudioPage() {
  const navigate = useNavigate();

  // Project metadata
  const [projectName, setProjectName] = useState("VoxelRunner");
  const [isEditingName, setIsEditingName] = useState(false);

  // Engine state
  const [isPlaying, setIsPlaying] = useState(false);
  const [toolMode, setToolMode] = useState<ToolMode>("block");
  const [gridSnap, setGridSnap] = useState<number>(1.0);
  const [skybox, setSkybox] = useState<SkyboxPreset>("space");

  // Selection & Properties
  const [objects, setObjects] = useState<VoxelObject[]>(STARTER_PRESETS.parkour_obby.objects);
  const [selectedId, setSelectedId] = useState<string | null>("hazard-1");
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(true);
  const [transformAccordionOpen, setTransformAccordionOpen] = useState(true);

  // Console & Logs
  const [isConsoleOpen, setIsConsoleOpen] = useState(true);
  const [logs, setLogs] = useState<string[]>([
    "[12:04] Object updated",
    "[12:05] Build successful",
    "[12:05] Running 'player_script'",
    "[12:05] Q_Script compiled: 0 errors",
  ]);

  // Dialog & Modal state
  const [isScriptEditorOpen, setIsScriptEditorOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [activeNpcDialog, setActiveNpcDialog] = useState<{ name: string; text: string } | null>(
    null,
  );
  const [globalScript, setGlobalScript] = useState(DEFAULT_QSCRIPT);
  const [paletteIndex, setPaletteIndex] = useState(6); // default to Kill Brick

  // Palette Blocks Definition (matching bottom dock in hd_generated_image-34.jpg)
  const PALETTE_BLOCKS = [
    { name: "Stone", color: "#64748b", type: "block" as const, trigger: "none" as const },
    { name: "Wood Planks", color: "#854d0e", type: "block" as const, trigger: "none" as const },
    { name: "Grass Block", color: "#22c55e", type: "block" as const, trigger: "none" as const },
    { name: "Glass", color: "#67e8f9", type: "block" as const, trigger: "none" as const },
    { name: "Dirt", color: "#78350f", type: "block" as const, trigger: "none" as const },
    { name: "Sand", color: "#fde047", type: "block" as const, trigger: "none" as const },
    {
      name: "Kill Brick",
      color: "#ef4444",
      type: "hazard" as const,
      trigger: "kill_player" as const,
    },
    { name: "Gold Coin", color: "#eab308", type: "coin" as const, trigger: "give_coin" as const },
    {
      name: "Checkpoint",
      color: "#06b6d4",
      type: "checkpoint" as const,
      trigger: "set_checkpoint" as const,
    },
    { name: "Spawn Point", color: "#10b981", type: "spawn" as const, trigger: "none" as const },
    {
      name: "Super Bounce",
      color: "#e11d48",
      type: "spring" as const,
      trigger: "bounce_pad" as const,
    },
    { name: "NPC Guard", color: "#f97316", type: "npc" as const, trigger: "npc_dialog" as const },
  ];

  // Helper to add log
  const addLog = useCallback((msg: string) => {
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setLogs((prev) => [...prev.slice(-40), `[${time}] ${msg}`]);
  }, []);

  // Keyboard shortcut F5 to toggle Play/Test mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F5") {
        e.preventDefault();
        togglePlay();
      }
      if (e.key === "Escape" && isPlaying) {
        setIsPlaying(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying]);

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem("wow_studio_project");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.objects && parsed.objects.length > 0) {
          setObjects(parsed.objects);
          if (parsed.name) setProjectName(parsed.name);
          if (parsed.skybox) setSkybox(parsed.skybox);
          addLog("[Storage] Loaded project from local storage.");
        }
      } catch {
        // Fallback to starter
      }
    }
  }, [addLog]);

  // Toggle Play / Test
  function togglePlay() {
    setIsPlaying((p) => {
      const next = !p;
      if (next) {
        toast.info("Entering Play Test Mode (Press F5 or Stop to exit)");
      } else {
        toast.info("Exited Play Test Mode");
      }
      return next;
    });
  }

  // Save to Local Storage
  function handleSave() {
    WowAudio.checkpoint();
    const data = {
      name: projectName,
      updatedAt: new Date().toISOString(),
      skybox,
      objects,
      globalScript,
    };
    localStorage.setItem("wow_studio_project", JSON.stringify(data));
    addLog(`[Storage] Project "${projectName}" saved locally (${objects.length} objects).`);
    toast.success(`Project "${projectName}" saved locally!`);
  }

  // Export JSON file
  function handleExportJson() {
    WowAudio.click();
    const data = {
      studio: "WoW Studio 1.0",
      project: projectName,
      exportedAt: new Date().toISOString(),
      skybox,
      objects,
      globalScript,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projectName.toLowerCase().replace(/\s+/g, "_")}_wow1.0.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addLog(`[Export] Exported map JSON: ${a.download}`);
    toast.success("Downloaded project .json file!");
  }

  // Import JSON file
  function handleImportJson(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        if (parsed.objects && Array.isArray(parsed.objects)) {
          setObjects(parsed.objects);
          if (parsed.project) setProjectName(parsed.project);
          if (parsed.skybox) setSkybox(parsed.skybox);
          setSelectedId(parsed.objects[0]?.id || null);
          WowAudio.checkpoint();
          addLog(`[Import] Loaded ${parsed.objects.length} objects from ${file.name}`);
          toast.success(`Imported ${parsed.objects.length} blocks from file!`);
        }
      } catch {
        toast.error("Failed to parse .json map file");
      }
    };
    reader.readAsText(file);
  }

  // Load a Starter Preset
  function handleLoadStarter(key: keyof typeof STARTER_PRESETS) {
    const preset = STARTER_PRESETS[key];
    if (!preset) return;
    setObjects(preset.objects);
    setSelectedId(preset.objects[0]?.id || null);
    setProjectName(preset.name);
    WowAudio.checkpoint();
    addLog(`[Preset] Loaded starter map: ${preset.name}`);
    toast.success(`Loaded ${preset.name}!`);
  }

  // Add block at 3D location
  const handleAddBlockAt = useCallback(
    (pos: [number, number, number]) => {
      const pBlock = PALETTE_BLOCKS[paletteIndex] || PALETTE_BLOCKS[0];
      const newId = `block-${Date.now()}`;
      const newObj: VoxelObject = {
        id: newId,
        name: `${pBlock.name.replace(/\s+/g, "_")}_${objects.length + 1}`,
        type: pBlock.type,
        position: pos,
        rotation: [0, 0, 0],
        scale: pBlock.type === "coin" ? [0.8, 0.8, 0.8] : [1, 1, 1],
        color: pBlock.color,
        canCollide: pBlock.type !== "coin",
        anchored: true,
        trigger: pBlock.trigger,
        triggerParam:
          pBlock.trigger === "give_coin" ? 5 : pBlock.trigger === "bounce_pad" ? 16 : undefined,
      };

      setObjects((prev) => [...prev, newObj]);
      setSelectedId(newId);
      addLog(`[Editor] Added ${newObj.name} at (${pos.join(", ")})`);
    },
    [paletteIndex, objects.length, addLog],
  );

  // Update selected object
  const handleUpdateObject = useCallback((updated: VoxelObject) => {
    setObjects((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
  }, []);

  // Delete selected object
  function handleDeleteSelected() {
    if (!selectedId) return;
    const toDelete = objects.find((o) => o.id === selectedId);
    setObjects((prev) => prev.filter((o) => o.id !== selectedId));
    setSelectedId(null);
    WowAudio.hazard();
    addLog(`[Editor] Deleted object "${toDelete?.name || selectedId}"`);
    toast.info("Deleted object");
  }

  // Duplicate selected object
  function handleDuplicateSelected() {
    if (!selectedId) return;
    const src = objects.find((o) => o.id === selectedId);
    if (!src) return;
    const newId = `dup-${Date.now()}`;
    const clone: VoxelObject = {
      ...src,
      id: newId,
      name: `${src.name}_copy`,
      position: [src.position[0] + 1, src.position[1], src.position[2] + 1],
    };
    setObjects((prev) => [...prev, clone]);
    setSelectedId(newId);
    WowAudio.place();
    addLog(`[Editor] Duplicated "${src.name}"`);
    toast.success("Object duplicated");
  }

  // Currently selected object
  const selectedObj = objects.find((o) => o.id === selectedId) || null;

  return (
    <div className="relative flex h-dvh w-screen flex-col overflow-hidden bg-[#101217] text-zinc-100 font-['Inter',sans-serif] select-none">
      {/* ── TOP APP BAR (matching hd_generated_image-34.jpg) ─────────────────────────── */}
      <header className="z-30 flex h-14 w-full shrink-0 items-center justify-between border-b border-white/10 bg-[#16181f] px-3 sm:px-4 text-[13px]">
        {/* Left: Q Logo + Project Name + File Actions */}
        <div className="flex items-center gap-3">
          {/* Back button */}
          <button
            onClick={() => navigate({ to: "/profile" as never })}
            title="Back to QBLOCK"
            className="press grid h-8 w-8 place-items-center rounded-xl bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          {/* Q Orange Cube Logo */}
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#ff5722] to-[#ea580c] shadow-md shadow-[#ff5722]/30">
              <span className="font-black text-[17px] text-white tracking-tighter">Q</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-white text-[13.5px] tracking-tight">
                  WoW Studio 1.0
                </span>
                <span className="rounded-full bg-amber-500/20 px-1.5 py-0.2 text-[9.5px] font-extrabold text-amber-400">
                  BETA
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-zinc-400">
                <span>Project:</span>
                {isEditingName ? (
                  <input
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    onBlur={() => setIsEditingName(false)}
                    onKeyDown={(e) => e.key === "Enter" && setIsEditingName(false)}
                    autoFocus
                    className="rounded bg-black/40 px-1 font-semibold text-white outline-none border border-white/20"
                  />
                ) : (
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="font-semibold text-zinc-200 hover:text-[#ff5722] underline decoration-dotted underline-offset-2"
                  >
                    {projectName}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="h-4 w-[1px] bg-white/10 mx-1 hidden md:block" />

          {/* Save / Import / Export Actions */}
          <div className="hidden sm:flex items-center gap-1.5">
            <button
              onClick={handleSave}
              className="press flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-bold text-zinc-300 hover:bg-white/5 hover:text-white transition"
              title="Save project locally"
            >
              <Save className="h-3.5 w-3.5 text-zinc-400" />
              <span>Save</span>
            </button>

            {/* Hidden input for importing json */}
            <label className="press flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-bold text-zinc-300 hover:bg-white/5 hover:text-white transition cursor-pointer">
              <Upload className="h-3.5 w-3.5 text-zinc-400" />
              <span>Import</span>
              <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
            </label>

            <button
              onClick={handleExportJson}
              className="press flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-bold text-zinc-300 hover:bg-white/5 hover:text-white transition"
              title="Download map as .json"
            >
              <Download className="h-3.5 w-3.5 text-zinc-400" />
              <span>Export .json</span>
            </button>
          </div>

          {/* Starters dropdown */}
          <div className="relative group hidden lg:block">
            <button className="press flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[12px] font-bold text-zinc-300 hover:bg-white/10">
              <Layers className="h-3.5 w-3.5 text-amber-400" />
              Templates
              <ChevronDown className="h-3 w-3 text-zinc-400" />
            </button>
            <div className="absolute top-full left-0 mt-1 hidden w-48 rounded-xl border border-white/10 bg-[#171922] p-1.5 shadow-xl group-hover:block z-50">
              <button
                onClick={() => handleLoadStarter("flat_grass")}
                className="w-full rounded-lg px-2.5 py-1.5 text-left text-[12px] font-semibold text-zinc-200 hover:bg-white/10"
              >
                🌱 Flat Grass Starter
              </button>
              <button
                onClick={() => handleLoadStarter("parkour_obby")}
                className="w-full rounded-lg px-2.5 py-1.5 text-left text-[12px] font-semibold text-zinc-200 hover:bg-white/10"
              >
                🏃 Parkour Obby Starter
              </button>
              <button
                onClick={() => handleLoadStarter("base_arena")}
                className="w-full rounded-lg px-2.5 py-1.5 text-left text-[12px] font-semibold text-zinc-200 hover:bg-white/10"
              >
                ⚔️ Base Arena
              </button>
            </div>
          </div>
        </div>

        {/* Center: Glossy Orange PLAY/TEST Button (F5) */}
        <div className="flex items-center justify-center">
          <button
            onClick={togglePlay}
            className={`press group relative flex items-center gap-2 overflow-hidden rounded-full px-5 sm:px-6 py-2 text-[13px] font-black tracking-wide text-white shadow-xl transition-all duration-200 ${
              isPlaying
                ? "bg-gradient-to-r from-red-600 to-rose-600 shadow-red-600/40 hover:brightness-110"
                : "bg-gradient-to-r from-[#ff5722] via-[#fa4616] to-[#f97316] shadow-[#fa4616]/40 hover:brightness-110 hover:shadow-[#fa4616]/60"
            }`}
          >
            {/* Top Gloss Shine overlay */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-white/40 via-white/10 to-transparent" />

            {isPlaying ? (
              <>
                <Square className="h-4 w-4 fill-current text-white animate-pulse" />
                <span>STOP (F5)</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current text-white" />
                <span>PLAY/TEST</span>
              </>
            )}
          </button>
        </div>

        {/* Right: Grid Snap, Skybox, Search, Tutorial */}
        <div className="flex items-center gap-2">
          {/* Grid Snap Toggle */}
          <div className="hidden md:flex items-center rounded-lg border border-white/10 bg-black/40 p-0.5 text-[11px] font-bold">
            <span className="px-1.5 text-zinc-500">Snap:</span>
            {[0, 0.5, 1.0].map((val) => (
              <button
                key={val}
                onClick={() => setGridSnap(val)}
                className={`rounded-md px-2 py-0.5 transition ${
                  gridSnap === val ? "bg-[#fa4616] text-white" : "text-zinc-400 hover:text-white"
                }`}
              >
                {val === 0 ? "Off" : `${val}`}
              </button>
            ))}
          </div>

          {/* Skybox Switcher */}
          <div className="relative group hidden sm:block">
            <button className="press flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[12px] font-bold text-zinc-300 hover:bg-white/10">
              <Sun className="h-3.5 w-3.5 text-amber-400" />
              <span className="capitalize">{skybox}</span>
            </button>
            <div className="absolute right-0 top-full mt-1 hidden w-32 rounded-xl border border-white/10 bg-[#171922] p-1.5 shadow-xl group-hover:block z-50">
              {(["day", "sunset", "night", "space"] as SkyboxPreset[]).map((sky) => (
                <button
                  key={sky}
                  onClick={() => {
                    setSkybox(sky);
                    WowAudio.click();
                  }}
                  className={`w-full rounded-lg px-2.5 py-1.5 text-left text-[12px] font-semibold capitalize transition ${
                    skybox === sky ? "bg-[#fa4616] text-white" : "text-zinc-200 hover:bg-white/10"
                  }`}
                >
                  {sky}
                </button>
              ))}
            </div>
          </div>

          {/* Tutorial Button */}
          <button
            onClick={() => {
              setIsTutorialOpen(true);
              WowAudio.click();
            }}
            className="press flex items-center gap-1 rounded-xl bg-amber-500/15 border border-amber-500/30 px-2.5 py-1.5 text-[12px] font-bold text-amber-400 hover:bg-amber-500/25"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Guide</span>
          </button>

          {/* User badge */}
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-white/10 font-black text-[12px] text-zinc-300">
            QB
          </div>
        </div>
      </header>

      {/* ── MAIN WORKSPACE AREA ────────────────────────────────────────────────────────── */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* ── LEFT TOOL RAIL (Vertical Icon Dock) (matching hd_generated_image-34.jpg) ── */}
        <aside className="z-20 flex w-14 shrink-0 flex-col items-center justify-between border-r border-white/10 bg-[#14161d] py-3 text-zinc-400">
          <div className="flex flex-col items-center gap-2">
            {/* Select Pointer */}
            <button
              onClick={() => {
                setToolMode("select");
                WowAudio.click();
              }}
              title="Select / Pick (V)"
              className={`press grid h-10 w-10 place-items-center rounded-xl transition ${
                toolMode === "select"
                  ? "bg-[#ff5722] text-white shadow-md shadow-[#ff5722]/40"
                  : "hover:bg-white/10 hover:text-white"
              }`}
            >
              <MousePointer className="h-5 w-5 fill-current" />
            </button>

            {/* Translate / Move */}
            <button
              onClick={() => {
                setToolMode("translate");
                WowAudio.click();
              }}
              title="Move Tool (W)"
              className={`press grid h-10 w-10 place-items-center rounded-xl transition ${
                toolMode === "translate"
                  ? "bg-[#ff5722] text-white shadow-md shadow-[#ff5722]/40"
                  : "hover:bg-white/10 hover:text-white"
              }`}
            >
              <Move className="h-5 w-5" />
            </button>

            {/* Rotate */}
            <button
              onClick={() => {
                setToolMode("rotate");
                WowAudio.click();
              }}
              title="Rotate Tool (E)"
              className={`press grid h-10 w-10 place-items-center rounded-xl transition ${
                toolMode === "rotate"
                  ? "bg-[#ff5722] text-white shadow-md shadow-[#ff5722]/40"
                  : "hover:bg-white/10 hover:text-white"
              }`}
            >
              <RotateCw className="h-5 w-5" />
            </button>

            {/* Scale */}
            <button
              onClick={() => {
                setToolMode("scale");
                WowAudio.click();
              }}
              title="Scale Tool (R)"
              className={`press grid h-10 w-10 place-items-center rounded-xl transition ${
                toolMode === "scale"
                  ? "bg-[#ff5722] text-white shadow-md shadow-[#ff5722]/40"
                  : "hover:bg-white/10 hover:text-white"
              }`}
            >
              <Maximize2 className="h-5 w-5" />
            </button>

            {/* Add Block / Brush (Active Orange Rounded Square) */}
            <button
              onClick={() => {
                setToolMode("block");
                WowAudio.click();
              }}
              title="Add Block / Voxel Tool (B)"
              className={`press grid h-10 w-10 place-items-center rounded-xl transition ${
                toolMode === "block"
                  ? "bg-[#ff5722] text-white shadow-lg shadow-[#ff5722]/40 ring-2 ring-white/20"
                  : "hover:bg-white/10 hover:text-white"
              }`}
            >
              <Box className="h-5 w-5 fill-current" />
            </button>

            {/* Code / Q_Script Editor */}
            <button
              onClick={() => {
                setIsScriptEditorOpen(true);
                WowAudio.click();
              }}
              title="Q_Script & JSON Editor ({})"
              className="press grid h-10 w-10 place-items-center rounded-xl hover:bg-white/10 hover:text-white transition text-zinc-300"
            >
              <Code2 className="h-5 w-5" />
            </button>

            {/* Asset Library / Prefabs */}
            <button
              onClick={() => {
                setIsTutorialOpen(true);
                WowAudio.click();
              }}
              title="Asset Library"
              className="press grid h-10 w-10 place-items-center rounded-xl hover:bg-white/10 hover:text-white transition text-zinc-300"
            >
              <Folder className="h-5 w-5 fill-current" />
            </button>
          </div>

          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => setIsPropertiesOpen((o) => !o)}
              title="Toggle Properties Drawer"
              className="press grid h-9 w-9 place-items-center rounded-xl hover:bg-white/10 hover:text-white text-zinc-400"
            >
              <Sliders className="h-4 w-4" />
            </button>
          </div>
        </aside>

        {/* ── CENTER 3D VIEWPORT ──────────────────────────────────────────────────────── */}
        <main className="relative flex-1 bg-[#13151b] overflow-hidden">
          {/* Subtle Label top-left */}
          <div className="pointer-events-none absolute top-3 left-4 z-10 text-[12px] font-extrabold uppercase tracking-wider text-white/30">
            3D Voxel Sandbox
          </div>

          {/* Three.js Canvas Engine */}
          <WowEngine3D
            objects={objects}
            selectedId={selectedId}
            onSelectObject={setSelectedId}
            onUpdateObject={handleUpdateObject}
            onAddBlockAt={handleAddBlockAt}
            isPlaying={isPlaying}
            toolMode={toolMode}
            gridSnap={gridSnap}
            skybox={skybox}
            onLog={addLog}
            onCoinCollected={(amt) => addLog(`[Score] +${amt} Coins added to wallet.`)}
            onNpcDialog={(name, text) => setActiveNpcDialog({ name, text })}
          />

          {/* ── BOTTOM CENTER FLOATING DOCK (Palette + Console) ────────────────────────── */}
          <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex flex-col items-center gap-2 px-4">
            {/* Horizontal Palette Chips + Console Drawer Container */}
            <div className="pointer-events-auto flex flex-wrap items-end justify-center gap-3 w-full max-w-5xl">
              {/* Quick Object Palette (matching bottom dock in hd_generated_image-34.jpg) */}
              <div className="flex items-center gap-1.5 rounded-2xl border border-white/15 bg-[#171922]/90 p-2 shadow-2xl backdrop-blur-xl max-w-full overflow-x-auto scrollbar-none">
                {PALETTE_BLOCKS.map((blk, idx) => (
                  <button
                    key={blk.name}
                    onClick={() => {
                      setPaletteIndex(idx);
                      setToolMode("block");
                      WowAudio.click();
                    }}
                    title={blk.name}
                    className={`press flex flex-col items-center gap-1 rounded-xl p-1.5 transition ${
                      paletteIndex === idx
                        ? "bg-[#ff5722]/25 ring-2 ring-[#ff5722]"
                        : "hover:bg-white/5"
                    }`}
                  >
                    <div
                      className="h-9 w-9 rounded-lg border border-white/20 shadow-inner"
                      style={{ backgroundColor: blk.color }}
                    />
                    <span className="text-[10px] font-bold text-zinc-300 w-14 truncate text-center">
                      {blk.name}
                    </span>
                  </button>
                ))}

                {/* Add Custom Button */}
                <button
                  onClick={() => {
                    handleAddBlockAt([0, 1, 0]);
                    WowAudio.place();
                  }}
                  title="Add new block at center"
                  className="press grid h-12 w-10 place-items-center rounded-xl border border-dashed border-white/25 text-zinc-400 hover:border-white hover:text-white"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>

              {/* Slide-Up Console / Output Window (matching hd_generated_image-34.jpg) */}
              <div className="flex flex-col rounded-2xl border border-white/15 bg-[#14161f]/95 shadow-2xl backdrop-blur-xl w-80 text-[11.5px] overflow-hidden">
                {/* Console Header */}
                <div
                  onClick={() => setIsConsoleOpen((c) => !c)}
                  className="flex items-center justify-between border-b border-white/10 bg-white/5 px-3 py-2 cursor-pointer"
                >
                  <span className="flex items-center gap-1.5 font-bold text-zinc-200">
                    <Terminal className="h-3.5 w-3.5 text-amber-400" />
                    Console Output
                  </span>
                  <div className="flex items-center gap-1.5 text-zinc-400">
                    <button className="hover:text-white">
                      <Minimize2 className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsConsoleOpen(false);
                      }}
                      className="hover:text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Console Logs Body */}
                {isConsoleOpen && (
                  <div className="h-28 overflow-y-auto p-2.5 font-mono text-[11px] leading-relaxed text-zinc-300 flex flex-col gap-1">
                    {logs.map((line, i) => (
                      <div
                        key={i}
                        className={`truncate ${
                          line.includes("error") || line.includes("fell")
                            ? "text-red-400"
                            : line.includes("Q_Script")
                              ? "text-amber-300"
                              : "text-zinc-400"
                        }`}
                      >
                        {line}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Status Bar */}
            <div className="flex items-center gap-4 text-[11px] text-zinc-400">
              <span>
                Mode:{" "}
                <strong className="text-zinc-200 uppercase">
                  {isPlaying ? "Play Test" : toolMode}
                </strong>
              </span>
              <span>•</span>
              <span>
                FPS: <strong className="text-emerald-400">60</strong>
              </span>
              <span>•</span>
              <span>
                View: <strong className="text-zinc-200">Perspective</strong>
              </span>
              <span>•</span>
              <span>
                Grid:{" "}
                <strong className="text-zinc-200">{gridSnap === 0 ? "Off" : `${gridSnap}`}</strong>
              </span>
              <span>•</span>
              <span>
                Objects: <strong className="text-zinc-200">{objects.length}</strong>
              </span>
            </div>
          </div>
        </main>

        {/* ── RIGHT PROPERTIES DRAWER (matching hd_generated_image-34.jpg) ──────────── */}
        {isPropertiesOpen && (
          <aside className="z-20 flex w-80 shrink-0 flex-col border-l border-white/10 bg-[#161820] text-zinc-300">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <span className="text-[12px] font-black uppercase tracking-wider text-zinc-400">
                OBJECT PROPERTIES
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleDuplicateSelected}
                  title="Duplicate Object"
                  disabled={!selectedObj}
                  className="press grid h-7 w-7 place-items-center rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white disabled:opacity-30"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={handleDeleteSelected}
                  title="Delete Object"
                  disabled={!selectedObj}
                  className="press grid h-7 w-7 place-items-center rounded-lg hover:bg-red-500/20 text-zinc-400 hover:text-red-400 disabled:opacity-30"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setIsPropertiesOpen(false)}
                  className="press grid h-7 w-7 place-items-center rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Properties Form */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-[12.5px]">
              {selectedObj ? (
                <>
                  {/* Object Name Input */}
                  <div>
                    <label className="text-[11px] font-bold text-zinc-400 block mb-1">
                      Entity Name
                    </label>
                    <input
                      value={selectedObj.name}
                      onChange={(e) => handleUpdateObject({ ...selectedObj, name: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-[13px] font-semibold text-white outline-none focus:border-[#fa4616]"
                    />
                  </div>

                  {/* Transform Accordion */}
                  <div className="rounded-xl border border-white/10 bg-black/30 overflow-hidden">
                    <button
                      onClick={() => setTransformAccordionOpen((o) => !o)}
                      className="flex w-full items-center justify-between p-3 font-bold text-zinc-200 hover:bg-white/5"
                    >
                      <span className="flex items-center gap-1.5">
                        <Move className="h-3.5 w-3.5 text-zinc-400" />
                        Transform
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 text-zinc-400 transition-transform ${
                          transformAccordionOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {transformAccordionOpen && (
                      <div className="p-3 pt-0 space-y-3">
                        {/* Position (X, Y, Z) */}
                        <div>
                          <span className="text-[11px] font-bold text-zinc-400 block mb-1">
                            Position
                          </span>
                          <div className="grid grid-cols-3 gap-1.5 font-mono text-[12px]">
                            {(["X", "Y", "Z"] as const).map((axis, i) => (
                              <div
                                key={axis}
                                className="flex items-center rounded-lg bg-white/5 px-2 py-1 border border-white/5"
                              >
                                <span
                                  className={`mr-1.5 font-bold ${i === 0 ? "text-red-400" : i === 1 ? "text-emerald-400" : "text-blue-400"}`}
                                >
                                  {axis}
                                </span>
                                <input
                                  type="number"
                                  step="0.5"
                                  value={Number(selectedObj.position[i].toFixed(1))}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    const pos = [...selectedObj.position] as [
                                      number,
                                      number,
                                      number,
                                    ];
                                    pos[i] = val;
                                    handleUpdateObject({ ...selectedObj, position: pos });
                                  }}
                                  className="w-full bg-transparent text-white outline-none"
                                />
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Rotation (X, Y, Z) */}
                        <div>
                          <span className="text-[11px] font-bold text-zinc-400 block mb-1">
                            Rotation
                          </span>
                          <div className="grid grid-cols-3 gap-1.5 font-mono text-[12px]">
                            {(["X", "Y", "Z"] as const).map((axis, i) => (
                              <div
                                key={axis}
                                className="flex items-center rounded-lg bg-white/5 px-2 py-1 border border-white/5"
                              >
                                <span className="mr-1.5 font-bold text-zinc-500">{axis}</span>
                                <input
                                  type="number"
                                  value={selectedObj.rotation[i]}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    const rot = [...selectedObj.rotation] as [
                                      number,
                                      number,
                                      number,
                                    ];
                                    rot[i] = val;
                                    handleUpdateObject({ ...selectedObj, rotation: rot });
                                  }}
                                  className="w-full bg-transparent text-white outline-none"
                                />
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Scale (X, Y, Z) */}
                        <div>
                          <span className="text-[11px] font-bold text-zinc-400 block mb-1">
                            Scale
                          </span>
                          <div className="grid grid-cols-3 gap-1.5 font-mono text-[12px]">
                            {(["X", "Y", "Z"] as const).map((axis, i) => (
                              <div
                                key={axis}
                                className="flex items-center rounded-lg bg-white/5 px-2 py-1 border border-white/5"
                              >
                                <span className="mr-1.5 font-bold text-zinc-500">{axis}</span>
                                <input
                                  type="number"
                                  step="0.2"
                                  min="0.2"
                                  value={selectedObj.scale[i]}
                                  onChange={(e) => {
                                    const val = Math.max(0.1, parseFloat(e.target.value) || 1);
                                    const scl = [...selectedObj.scale] as [number, number, number];
                                    scl[i] = val;
                                    handleUpdateObject({ ...selectedObj, scale: scl });
                                  }}
                                  className="w-full bg-transparent text-white outline-none"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Color Swatch & Preset Picker */}
                  <div>
                    <label className="text-[11px] font-bold text-zinc-400 block mb-1">
                      Color &amp; Material
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={selectedObj.color}
                        onChange={(e) =>
                          handleUpdateObject({ ...selectedObj, color: e.target.value })
                        }
                        className="h-9 w-12 rounded-lg border border-white/20 bg-transparent p-0.5 cursor-pointer"
                      />
                      <input
                        value={selectedObj.color}
                        onChange={(e) =>
                          handleUpdateObject({ ...selectedObj, color: e.target.value })
                        }
                        className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 font-mono text-[12px] text-white uppercase outline-none"
                      />
                    </div>

                    <div className="mt-2 flex items-center gap-1.5">
                      {[
                        "#ef4444",
                        "#22c55e",
                        "#3b82f6",
                        "#f59e0b",
                        "#a855f7",
                        "#ffffff",
                        "#1e293b",
                      ].map((c) => (
                        <button
                          key={c}
                          onClick={() => handleUpdateObject({ ...selectedObj, color: c })}
                          className="h-5 w-5 rounded-md border border-white/20 transition hover:scale-110"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Collision & Anchored Toggles */}
                  <div className="rounded-xl border border-white/10 bg-black/30 p-3 space-y-2.5">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="font-bold text-zinc-300">Collision (CanCollide)</span>
                      <input
                        type="checkbox"
                        checked={selectedObj.canCollide}
                        onChange={(e) =>
                          handleUpdateObject({ ...selectedObj, canCollide: e.target.checked })
                        }
                        className="h-4 w-4 rounded accent-[#fa4616]"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="font-bold text-zinc-300">Anchored (Freeze Physics)</span>
                      <input
                        type="checkbox"
                        checked={selectedObj.anchored}
                        onChange={(e) =>
                          handleUpdateObject({ ...selectedObj, anchored: e.target.checked })
                        }
                        className="h-4 w-4 rounded accent-[#fa4616]"
                      />
                    </label>
                  </div>

                  {/* Q_Script Trigger Dropdown */}
                  <div>
                    <label className="text-[11px] font-bold text-zinc-400 block mb-1">
                      Q_Script Trigger
                    </label>
                    <select
                      value={selectedObj.trigger}
                      onChange={(e) => {
                        const trg = e.target.value as QScriptTriggerType;
                        handleUpdateObject({
                          ...selectedObj,
                          trigger: trg,
                          triggerParam:
                            trg === "bounce_pad"
                              ? 18
                              : trg === "give_coin"
                                ? 5
                                : selectedObj.triggerParam,
                        });
                        WowAudio.click();
                      }}
                      className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-[12.5px] font-semibold text-white outline-none focus:border-[#fa4616]"
                    >
                      <option value="none">None (Static Object)</option>
                      <option value="kill_player">OnTouch -&gt; KillPlayer (Kill Brick)</option>
                      <option value="give_coin">OnTouch -&gt; GiveCoin(5) (Pickup)</option>
                      <option value="set_checkpoint">OnTouch -&gt; SetCheckpoint</option>
                      <option value="bounce_pad">OnTouch -&gt; Bounce(16) (Spring Pad)</option>
                      <option value="npc_dialog">OnInteract -&gt; NPC Dialog</option>
                      <option value="speed_boost">OnTouch -&gt; SpeedBoost(2x)</option>
                      <option value="tick_spin">OnTick -&gt; Spin Constantly</option>
                      <option value="tick_bob">OnTick -&gt; Hover / Bobbing</option>
                      <option value="open_door">OnTouch -&gt; OpenDoor / Disappear</option>
                    </select>

                    {/* Trigger parameter if applicable */}
                    {selectedObj.trigger === "npc_dialog" && (
                      <div className="mt-2">
                        <label className="text-[11px] text-zinc-400 block mb-1">
                          Dialog Message:
                        </label>
                        <input
                          value={String(selectedObj.triggerParam || "")}
                          onChange={(e) =>
                            handleUpdateObject({ ...selectedObj, triggerParam: e.target.value })
                          }
                          placeholder="What does the NPC say?"
                          className="w-full rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-[12px] text-white outline-none"
                        />
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center text-zinc-500">
                  <Box className="h-10 w-10 mb-2 opacity-30" />
                  <p className="font-bold">No Object Selected</p>
                  <p className="text-[11.5px] mt-1 text-zinc-500">
                    Click any block in the 3D viewport or use the bottom palette to add blocks.
                  </p>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* ── NPC INTERACTION DIALOG MODAL (In Play Mode) ──────────────────────────────── */}
      <AnimatePresence>
        {activeNpcDialog && (
          <div className="fixed inset-0 z-[9980] flex items-end sm:items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: 30, filter: "blur(8px)" }}
              className="relative w-full max-w-lg rounded-3xl border border-amber-500/30 bg-[#161820]/95 p-5 shadow-2xl backdrop-blur-xl text-white"
            >
              <div className="flex items-start gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-500 text-black font-black text-[18px] shadow-lg">
                  NPC
                </div>
                <div className="flex-1">
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-400">
                    {activeNpcDialog.name}
                  </span>
                  <p className="mt-1 text-[14px] leading-relaxed text-zinc-200">
                    &ldquo;{activeNpcDialog.text}&rdquo;
                  </p>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setActiveNpcDialog(null)}
                  className="press rounded-xl bg-amber-500 px-4 py-1.5 text-[12.5px] font-bold text-black hover:bg-amber-400"
                >
                  Continue [E]
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── SCRIPT & JSON CODE EDITOR MODAL ──────────────────────────────────────────── */}
      <WowScriptEditor
        isOpen={isScriptEditorOpen}
        onClose={() => setIsScriptEditorOpen(false)}
        objects={objects}
        globalScript={globalScript}
        onUpdateGlobalScript={setGlobalScript}
        onLog={addLog}
      />

      {/* ── TUTORIAL GUIDE MODAL ────────────────────────────────────────────────────── */}
      <WowTutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        onSelectStarter={(key) => handleLoadStarter(key as keyof typeof STARTER_PRESETS)}
      />
    </div>
  );
}
