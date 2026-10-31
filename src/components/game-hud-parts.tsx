import { useEffect, useState, type RefObject } from "react";
import { motion } from "motion/react";
import {
  Lock,
  Users,
  X,
  Camera,
  MessageSquare,
  Settings,
  Backpack,
  LogOut,
  User,
  Sun,
  Sunset,
  Moon,
  Compass,
  Sliders,
  Eye,
  Zap,
  Shield,
  Volume2,
  Sparkles,
  CloudLightning,
  Snowflake,
  Flame,
  Waves,
  CircleDot,
} from "lucide-react";

export type CamMode = "first" | "third" | "top";

const ATMOSPHERE_OPTIONS = [
  {
    id: "normal",
    label: "Day",
    sub: "Golden Sunlight",
    icon: Sun,
    activeClasses: "bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_16px_rgba(251,191,36,0.25)]",
    iconColor: "text-amber-400",
  },
  {
    id: "evening",
    label: "Tramonto",
    sub: "Warm Sunset",
    icon: Sunset,
    activeClasses: "bg-orange-500/20 border-orange-400 text-orange-300 shadow-[0_0_16px_rgba(249,115,22,0.25)]",
    iconColor: "text-orange-400",
  },
  {
    id: "night",
    label: "Night",
    sub: "Moon & Stars",
    icon: Moon,
    activeClasses: "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_16px_rgba(6,182,212,0.25)]",
    iconColor: "text-cyan-400",
  },
  {
    id: "cinematic",
    label: "Cinematic",
    sub: "Mystic Twilight",
    icon: Sparkles,
    activeClasses: "bg-purple-500/20 border-purple-400 text-purple-300 shadow-[0_0_16px_rgba(168,85,247,0.25)]",
    iconColor: "text-purple-400",
  },
  {
    id: "tempesta",
    label: "Tempesta",
    sub: "Thunder & Rain",
    icon: CloudLightning,
    activeClasses: "bg-sky-500/20 border-sky-400 text-sky-200 shadow-[0_0_16px_rgba(56,189,248,0.25)]",
    iconColor: "text-sky-300",
  },
  {
    id: "christmas",
    label: "Striking Christmas",
    sub: "Winter & Snow",
    icon: Snowflake,
    activeClasses: "bg-emerald-500/20 border-emerald-400 text-emerald-200 shadow-[0_0_16px_rgba(52,211,153,0.25)]",
    iconColor: "text-emerald-300",
  },
  {
    id: "blood_moon",
    label: "Blood Moon",
    sub: "Crimson Eclipse",
    icon: Flame,
    activeClasses: "bg-red-500/20 border-red-500 text-red-300 shadow-[0_0_16px_rgba(239,68,68,0.25)]",
    iconColor: "text-red-400",
  },
  {
    id: "aurora",
    label: "Aurora Borealis",
    sub: "Cosmic Shimmer",
    icon: Waves,
    activeClasses: "bg-teal-500/20 border-teal-400 text-teal-200 shadow-[0_0_16px_rgba(45,212,191,0.25)]",
    iconColor: "text-teal-300",
  },
  {
    id: "solar_eclipse",
    label: "Solar Eclipse",
    sub: "Corona Umbra",
    icon: CircleDot,
    activeClasses: "bg-amber-500/20 border-amber-300 text-amber-200 shadow-[0_0_16px_rgba(245,158,11,0.25)]",
    iconColor: "text-amber-300",
  },
];

/** Full-screen loading spinner used while a world streams in. */
export function GearboxLoader() {
  return (
    <div className="absolute inset-0 z-50 grid place-items-center bg-[#0d1016]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-14 w-14">
          <div className="absolute inset-0 rounded-full border-[3px] border-white/12" />
          <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-t-[#fa4616]" />
        </div>
        <div className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-white/70">
          Loading world
        </div>
      </div>
    </div>
  );
}

/** Small badge showing that the current world is a private server. */
export function PrivateServerBadge({ privacy }: { privacy: "global" | "friends" }) {
  const friends = privacy === "friends";
  return (
    <div className="pointer-events-none absolute left-1/2 top-[max(12px,env(safe-area-inset-top))] z-20 -translate-x-1/2">
      <div className="flex items-center gap-1.5 rounded-full border border-white/18 bg-black/45 px-3 py-1.5 text-[11px] font-extrabold text-white/85 backdrop-blur-md">
        {friends ? <Users className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
        {friends ? "Friends only" : "Private server"}
      </div>
    </div>
  );
}

/** Top-left radial cube menu used by Blocky Plaza. */
export function GameCubeBubbleMenu({
  onExit,
  onChat,
  onSettings,
  onInventory,
  onAvatar,
  camMode,
  onToggleCamMode,
}: {
  onExit: () => void;
  onChat: () => void;
  onSettings: () => void;
  onInventory: () => void;
  onAvatar: () => void;
  camMode: CamMode;
  onToggleCamMode: () => void;
}) {
  const [open, setOpen] = useState(false);
  const items = [
    { icon: MessageSquare, label: "Chat", run: onChat },
    { icon: Backpack, label: "Inventory", run: onInventory },
    { icon: User, label: "Avatar", run: onAvatar },
    { icon: Camera, label: `Camera: ${camMode}`, run: onToggleCamMode },
    { icon: Settings, label: "Settings", run: onSettings },
    { icon: LogOut, label: "Exit", run: onExit },
  ];
  return (
    <div className="absolute left-3 top-[max(12px,env(safe-area-inset-top))] z-30 flex flex-col items-start gap-2">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Game menu"
        className="press grid h-11 w-11 place-items-center rounded-[14px] border border-white/20 bg-black/45 text-white backdrop-blur-md"
      >
        {open ? <X className="h-5 w-5" /> : <div className="h-4 w-4 rounded-[4px] bg-[#f4c430]" />}
      </button>
      {open && (
        <div className="flex flex-col gap-1.5 rounded-[16px] border border-white/16 bg-black/55 p-1.5 backdrop-blur-md">
          {items.map(({ icon: Icon, label, run }) => (
            <button
              key={label}
              onClick={() => {
                setOpen(false);
                run();
              }}
              className="press flex items-center gap-2 rounded-[11px] px-2.5 py-2 text-left text-[12px] font-bold text-white/90 hover:bg-white/10"
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Touch joystick surface — the engine wires movement through these refs. */
export const HUD_ASSETS = {
  menu: "https://maxwell.z3ki.dev/bot/_files/menu-icon/menu-icon.png",
  video: "https://maxwell.z3ki.dev/bot/_files/video-icon/video-icon.png",
  smile: "https://maxwell.z3ki.dev/bot/_files/smile-icon/smile-icon.png",
  chat: "https://maxwell.z3ki.dev/bot/_files/chat-icon-83/chat-icon.png",
  arrow: "https://maxwell.z3ki.dev/bot/_files/arrow-icon/arrow-icon.png",
  button: "https://maxwell.z3ki.dev/bot/_files/blank-button/blank-button.png",
};

export function JoystickVisual({
  containerRef,
  baseRef,
  knobRef,
  square,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  baseRef: RefObject<HTMLDivElement | null>;
  knobRef: RefObject<HTMLDivElement | null>;
  square?: boolean;
}) {
  return (
    <div
      ref={containerRef}
      className="fixed z-30 h-[104px] w-[104px] touch-none select-none pointer-events-none transition-all duration-150"
      style={{
        touchAction: "none",
        opacity: 0.92,
        left: "76px",
        bottom: "76px",
        transform: "translate(-50%, 50%)",
      }}
    >
      {/* Directional arrows using hosted arrow-icon */}
      {/* Up -> top side */}
      <div className="absolute -top-7 left-1/2 -translate-x-1/2 w-7 h-7 flex items-center justify-center pointer-events-none">
        <img
          src={HUD_ASSETS.arrow}
          alt="Up"
          className="w-full h-full object-contain drop-shadow-md"
          draggable={false}
        />
      </div>

      {/* Down -> bottom side */}
      <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 w-7 h-7 flex items-center justify-center pointer-events-none">
        <img
          src={HUD_ASSETS.arrow}
          alt="Down"
          className="w-full h-full object-contain drop-shadow-md rotate-180"
          draggable={false}
        />
      </div>

      {/* Left -> left side */}
      <div className="absolute -left-7 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center pointer-events-none">
        <img
          src={HUD_ASSETS.arrow}
          alt="Left"
          className="w-full h-full object-contain drop-shadow-md -rotate-90"
          draggable={false}
        />
      </div>

      {/* Right -> right side */}
      <div className="absolute -right-7 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center pointer-events-none">
        <img
          src={HUD_ASSETS.arrow}
          alt="Right"
          className="w-full h-full object-contain drop-shadow-md rotate-90"
          draggable={false}
        />
      </div>

      {/* D-Pad Base Ring / Button */}
      <div
        ref={baseRef}
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        <img
          src={HUD_ASSETS.button}
          alt="Joystick Base"
          className="h-full w-full object-contain pointer-events-none drop-shadow-md select-none rounded-full"
          draggable={false}
        />
      </div>

      {/* Knob (Pole knob using button PNG) */}
      <div
        ref={knobRef}
        className="absolute left-1/2 top-1/2 h-13 w-13 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none transition-transform duration-75 select-none"
      >
        <img
          src={HUD_ASSETS.button}
          alt="Pole Knob"
          className="w-full h-full object-contain pointer-events-none drop-shadow-lg select-none"
          draggable={false}
        />
      </div>
    </div>
  );
}

const TUTORIAL_STEPS = [
  {
    title: "Welcome to Skyblock",
    body: "You start on a tiny island. Break blocks to gather resources.",
  },
  { title: "Build outward", body: "Place blocks to expand your island — every block counts." },
  { title: "Chat & visit", body: "Open chat to talk, and visit other islands from the menu." },
];

/** Step-by-step Skyblock intro overlay. */
export function SkyblockTutorial({
  step,
  onNext,
  onSkip,
}: {
  step: number;
  onNext: () => void;
  onSkip: () => void;
}) {
  const s = TUTORIAL_STEPS[Math.min(step, TUTORIAL_STEPS.length - 1)]!;
  const last = step >= TUTORIAL_STEPS.length - 1;
  return (
    <div className="absolute inset-0 z-40 grid place-items-end bg-black/35 p-4 pb-[max(28px,env(safe-area-inset-bottom))]">
      <div className="w-full rounded-[18px] border border-white/15 bg-[#171b22] p-4 text-white">
        <div className="text-[15px] font-extrabold font-lilita">{s.title}</div>
        <p className="mt-1 text-[13px] leading-relaxed text-white/70">{s.body}</p>
        <div className="mt-3 flex gap-2">
          <button
            onClick={last ? onSkip : onNext}
            className="press h-10 flex-1 rounded-[12px] bg-[#f4c430] text-[13px] font-extrabold text-[#20252b]"
          >
            {last ? "Start playing" : "Next"}
          </button>
          <button
            onClick={onSkip}
            className="press h-10 rounded-[12px] border border-white/15 px-4 text-[13px] font-bold text-white/70"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      className="absolute inset-0 z-50 grid place-items-center bg-black/55 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[380px] rounded-[20px] border border-white/12 bg-[#171b22] p-4 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[15px] font-extrabold font-lilita">{title}</div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="press grid h-8 w-8 place-items-center rounded-full bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** In-game settings: full-page experience with camera, movement, graphics, and atmosphere options. */
export function GameSettingsModal({
  onClose,
  privateServer,
  camMode,
  onCamMode,
  isSkyblock,
  nightMode,
  onToggleNightMode,
  invertJoyY,
  onToggleInvertJoyY,
  invertJoyX,
  onToggleInvertJoyX,
  qualityPref = "high",
  onQualityPref,
  motionBlur = true,
  onToggleMotionBlur,
}: {
  onClose: () => void;
  privateServer?: { privacy: "global" | "friends" } | null;
  camMode: CamMode;
  onCamMode: (m: CamMode) => void;
  isSkyblock?: boolean;
  nightMode?: boolean;
  onToggleNightMode?: () => void;
  invertJoyY?: boolean;
  onToggleInvertJoyY?: () => void;
  invertJoyX?: boolean;
  onToggleInvertJoyX?: () => void;
  qualityPref?: "low" | "medium" | "high" | "uhd";
  onQualityPref?: (q: "low" | "medium" | "high" | "uhd") => void;
  motionBlur?: boolean;
  onToggleMotionBlur?: () => void;
}) {
  type SettingsTab = "camera" | "controls" | "graphics" | "sky" | "server";
  const [activeTab, setActiveTab] = useState<SettingsTab>("camera");

  const [bfFit, setBfFit] = useState(1);
  useEffect(() => {
    const calc = () => {
      const scaleX = (window.innerWidth - 24) / 840;
      const scaleY = (window.innerHeight - 36) / 510;
      setBfFit(Math.min(1, Math.max(0.68, Math.min(scaleX, scaleY))));
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  const modes: { id: CamMode; label: string; icon: string; desc: string }[] = [
    { id: "first", label: "1st Person", icon: "👁️", desc: "Precision mining & close interaction" },
    { id: "third", label: "3rd Person", icon: "🧍", desc: "Classic third-person hero perspective" },
    { id: "top", label: "Top-Down", icon: "🗺️", desc: "Bird's eye isometric tactical overview" },
  ];

  const [cameraFov, setCameraFov] = useState<number>(() => {
    try {
      const s = localStorage.getItem("qb_camera_fov");
      return s ? Number(s) : 72;
    } catch {
      return 72;
    }
  });

  const [atmosphere, setAtmosphere] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("qb_atmosphere");
      if (saved) return saved;
      return nightMode ? "night" : "normal";
    } catch {
      return "normal";
    }
  });

  const handleAtmosphereChange = (id: string) => {
    setAtmosphere(id);
    try {
      localStorage.setItem("qb_atmosphere", id);
      const isNightLike = id === "night" || id === "aurora" || id === "blood_moon";
      localStorage.setItem("bm-nightmode", String(isNightLike));
      if (isNightLike && !nightMode) onToggleNightMode?.();
      else if (!isNightLike && nightMode) onToggleNightMode?.();
    } catch {}
    window.dispatchEvent(new CustomEvent("bm-atmosphere", { detail: id }));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="bf-overlay is-open"
      style={{ background: "transparent", backdropFilter: "none", WebkitBackdropFilter: "none" }}
      onClick={onClose}
    >
      <div
        className="bf-modal-wrap bf-modal-wrap--store"
        style={{ transform: `scale(${bfFit})`, transformOrigin: "center center" }}
        onClick={onClose}
      >
        <motion.section
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 12 }}
          transition={{ type: "spring", damping: 25, stiffness: 380 }}
          className="bf-modal bf-panel bf-settings-board"
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-title"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Title plate matching Shop */}
          <div className="bf-panel__title">
            <span className="bf-plate bf-plate--title" id="settings-title">
              Settings
            </span>
          </div>

          {/* Side category tabs using the EXACT same ribbon buttons as Shop, styled in grey */}
          <div className="bf-panel__side">
            <button
              type="button"
              className={`bf-tab bf-tab--grey ${activeTab === "camera" ? "is-active" : ""}`}
              onClick={() => setActiveTab("camera")}
            >
              Camera
            </button>
            <button
              type="button"
              className={`bf-tab bf-tab--grey ${activeTab === "controls" ? "is-active" : ""}`}
              onClick={() => setActiveTab("controls")}
            >
              Controls
            </button>
            <button
              type="button"
              className={`bf-tab bf-tab--grey ${activeTab === "graphics" ? "is-active" : ""}`}
              onClick={() => setActiveTab("graphics")}
            >
              Graphics
            </button>
            <button
              type="button"
              className={`bf-tab bf-tab--grey ${activeTab === "sky" ? "is-active" : ""}`}
              onClick={() => setActiveTab("sky")}
            >
              Sky
            </button>
            <button
              type="button"
              className={`bf-tab bf-tab--grey ${activeTab === "server" ? "is-active" : ""}`}
              onClick={() => setActiveTab("server")}
            >
              Server
            </button>
          </div>

          {/* Yellow round close X button anchored top-right */}
          <button
            type="button"
            className="bf-close bf-panel__close"
            aria-label="Close Settings"
            onClick={onClose}
          >
            ✕
          </button>

          {/* Settings main content divided into polished grey sections */}
          <div className="bf-settings-content">
            {/* ── TAB 1: CAMERA ─────────────────────────────────────────── */}
            {activeTab === "camera" && (
              <div className="flex flex-col gap-3">
                <div className="bf-settings-card">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-[15px] text-white flex items-center gap-2">
                      <Camera className="w-4 h-4 text-cyan-400" />
                      Perspective View
                    </span>
                    <span className="text-[11px] text-zinc-400 font-semibold">
                      Current: {modes.find((m) => m.id === camMode)?.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    {modes.map((m) => {
                      const isActive = camMode === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => onCamMode(m.id)}
                          className={`bf-btn-grey flex flex-col items-center justify-center p-3 text-center transition cursor-pointer ${
                            isActive ? "is-active" : ""
                          }`}
                        >
                          <span className="text-2xl mb-1">{m.icon}</span>
                          <span className="text-[13px] font-black">{m.label}</span>
                          <span className="text-[9.5px] text-zinc-300/80 mt-0.5 leading-tight">
                            {m.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="bf-settings-card">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-[15px] text-white flex items-center gap-2">
                      <Eye className="w-4 h-4 text-amber-400" />
                      Field of View (FOV)
                    </span>
                    <span className="text-[12px] font-mono font-black text-amber-300 bg-black/40 px-2.5 py-0.5 rounded-md border border-white/10">
                      {cameraFov}°
                    </span>
                  </div>
                  <input
                    type="range"
                    min={60}
                    max={95}
                    step={1}
                    value={cameraFov}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setCameraFov(val);
                      try {
                        localStorage.setItem("qb_camera_fov", String(val));
                      } catch {}
                      window.dispatchEvent(new CustomEvent("bm-fov", { detail: val }));
                    }}
                    className="w-full h-2.5 bg-zinc-700/80 accent-amber-400 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-zinc-400 mt-1">
                    <span>Narrow (60°)</span>
                    <span>Standard (72°)</span>
                    <span>Wide (95°)</span>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 2: CONTROLS ───────────────────────────────────────── */}
            {activeTab === "controls" && (
              <div className="flex flex-col gap-3">
                <div className="bf-settings-card flex flex-col gap-2.5">
                  <div className="bf-settings-row">
                    <div>
                      <div className="text-[14px] font-black text-white">Invert Vertical (Y-Axis)</div>
                      <div className="text-[11px] text-zinc-400">
                        {invertJoyY
                          ? "Inverted (Push up to move back, pull down to move forward)"
                          : "Standard (Push up to move forward, pull down to move back)"}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={onToggleInvertJoyY}
                      className={`bf-btn-grey !min-w-[95px] text-[12px] font-black ${
                        invertJoyY ? "is-active" : ""
                      }`}
                    >
                      {invertJoyY ? "Inverted" : "Standard"}
                    </button>
                  </div>

                  <div className="bf-settings-row">
                    <div>
                      <div className="text-[14px] font-black text-white">Invert Horizontal (X-Axis)</div>
                      <div className="text-[11px] text-zinc-400">
                        {invertJoyX
                          ? "Inverted (Push right to go left, pull left to go right)"
                          : "Standard (Push right to go right, pull left to go left)"}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={onToggleInvertJoyX}
                      className={`bf-btn-grey !min-w-[95px] text-[12px] font-black ${
                        invertJoyX ? "is-active" : ""
                      }`}
                    >
                      {invertJoyX ? "Inverted" : "Standard"}
                    </button>
                  </div>
                </div>

                <div className="bf-settings-card">
                  <div className="text-[13px] font-black text-white mb-1">🎮 Control Schemes</div>
                  <p className="text-[11.5px] text-zinc-300/80 leading-relaxed">
                    • <strong>Mobile:</strong> Use the left virtual thumbstick to walk or run. Swipe on the right half of the screen to rotate your camera.
                    <br />
                    • <strong>Desktop:</strong> WASD keys to move, Space to jump, double-tap W to sprint. Click anywhere inside the viewport to look around.
                  </p>
                </div>
              </div>
            )}

            {/* ── TAB 3: GRAPHICS ───────────────────────────────────────── */}
            {activeTab === "graphics" && (
              <div className="flex flex-col gap-3">
                <div className="bf-settings-card">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-[15px] text-white flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-purple-400" />
                      Visual Fidelity & Resolution
                    </span>
                    <span className="text-[11px] text-purple-300 font-bold uppercase">
                      Preset: {qualityPref}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {(["low", "medium", "high", "uhd"] as const).map((q) => {
                      const isActive = qualityPref === q;
                      return (
                        <button
                          key={q}
                          type="button"
                          onClick={() => onQualityPref?.(q)}
                          className={`bf-btn-grey py-2.5 text-center transition cursor-pointer ${
                            isActive ? "is-active font-black" : "font-semibold"
                          }`}
                        >
                          <span className="text-[12px]">{q === "uhd" ? "UHD 4K" : q.toUpperCase()}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed">
                    {qualityPref === "uhd"
                      ? "UHD 4K: Crystal-clear native resolution, 0% pixelation, 4096 dynamic soft shadows & maximum visual fidelity."
                      : qualityPref === "high"
                        ? "High: Full dynamic resolution, high-precision shaders & ultra-smooth 60fps."
                        : qualityPref === "medium"
                          ? "Medium: Balanced resolution and optimized shadow maps."
                          : "Low: Battery saver mode for low-power mobile devices."}
                  </p>
                </div>

                <div className="bf-settings-card">
                  <div className="bf-settings-row">
                    <div>
                      <div className="text-[13.5px] font-black text-white flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                        <span>AAA Velocity Motion Blur</span>
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        Fluid camera shutter blur when turning & moving (buttery smooth game feel)
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={onToggleMotionBlur}
                      className={`bf-btn-grey !min-w-[85px] text-[12px] font-black ${
                        motionBlur ? "is-active" : ""
                      }`}
                    >
                      {motionBlur ? "ON" : "OFF"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 4: SKY & ATMOSPHERE ───────────────────────────────── */}
            {activeTab === "sky" && (
              <div className="bf-settings-card">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-black text-[15px] text-white flex items-center gap-2">
                    <Sun className="w-4 h-4 text-amber-400" />
                    Atmosphere & Ambience
                  </span>
                  <span className="text-[11px] text-amber-300 font-bold">
                    Active: {ATMOSPHERE_OPTIONS.find((o) => o.id === atmosphere)?.label ?? "Day"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {ATMOSPHERE_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const isActive =
                      atmosphere === opt.id ||
                      (opt.id === "normal" && (atmosphere === "day" || atmosphere === "normal")) ||
                      (opt.id === "evening" && (atmosphere === "tramonto" || atmosphere === "evening"));
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleAtmosphereChange(opt.id)}
                        className={`bf-btn-grey flex flex-col items-center justify-center p-2.5 text-center transition cursor-pointer ${
                          isActive ? "is-active" : ""
                        }`}
                      >
                        <Icon className={`w-5 h-5 mb-1 ${isActive ? "text-amber-300" : opt.iconColor}`} />
                        <span className="text-[12px] font-black leading-tight text-white">{opt.label}</span>
                        <span className="text-[9.5px] text-zinc-300/80 mt-0.5 leading-tight">{opt.sub}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── TAB 5: SERVER ─────────────────────────────────────────── */}
            {activeTab === "server" && (
              <div className="flex flex-col gap-3">
                <div className="bf-settings-card flex flex-col gap-2.5">
                  <div className="bf-settings-row">
                    <div>
                      <div className="text-[14px] font-black text-white">Server Connection</div>
                      <div className="text-[11px] text-zinc-400">
                        {privateServer
                          ? `Private Island Realm (${privateServer.privacy === "friends" ? "Friends only" : "Password Protected"})`
                          : "QBlock Public Skyblock Cluster (Real-Time Multiplayer)"}
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-extrabold">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Connected
                    </span>
                  </div>

                  <div className="bf-settings-row">
                    <div>
                      <div className="text-[14px] font-black text-white">Reset Settings</div>
                      <div className="text-[11px] text-zinc-400">
                        Restore default camera FOV (72°), high quality, and standard controls
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onCamMode("third");
                        setCameraFov(72);
                        try {
                          localStorage.setItem("qb_camera_fov", "72");
                        } catch {}
                        window.dispatchEvent(new CustomEvent("bm-fov", { detail: 72 }));
                        onQualityPref?.("high");
                        handleAtmosphereChange("normal");
                      }}
                      className="bf-btn-grey !min-w-[95px] text-[12px] font-black hover:text-amber-300"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom action row with Close button */}
          <div className="flex justify-center mt-3 pt-2 border-t border-[#8c7355]/40">
            <button
              type="button"
              className="bf-btn bf-btn--plain !min-w-[120px] !h-9 text-[13px] font-black cursor-pointer"
              onClick={onClose}
            >
              <span className="bf-btn__label">Close Settings</span>
            </button>
          </div>
        </motion.section>
      </div>
    </div>
  );
}

export { SkyblockShopModal } from "@/components/SkyblockShopModal";


/** Skyblock rules reference. */
export function SkyblockRuleBookModal({ onClose }: { onClose: () => void }) {
  const rules = [
    "Be respectful — no harassment or slurs in chat.",
    "No griefing other players' islands.",
    "No exploiting bugs or duplicating items.",
    "Keep builds appropriate for all ages.",
  ];
  return (
    <ModalShell title="Rule book" onClose={onClose}>
      <ol className="flex list-decimal flex-col gap-2 pl-4 text-[13px] leading-relaxed text-white/75">
        {rules.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ol>
    </ModalShell>
  );
}
