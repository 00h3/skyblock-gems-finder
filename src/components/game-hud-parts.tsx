import { useEffect, useState, type RefObject } from "react";
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
} from "lucide-react";

export type CamMode = "first" | "third" | "top";

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
  qualityPref?: "low" | "medium" | "high";
  onQualityPref?: (q: "low" | "medium" | "high") => void;
  motionBlur?: boolean;
  onToggleMotionBlur?: () => void;
}) {
  const modes: { id: CamMode; label: string; icon: string }[] = [
    { id: "first", label: "1st Person", icon: "👁️" },
    { id: "third", label: "3rd Person", icon: "🧍" },
    { id: "top", label: "Top-Down", icon: "🗺️" },
  ];

  const [cameraFov, setCameraFov] = useState<number>(() => {
    try {
      const s = localStorage.getItem("qb_camera_fov");
      return s ? Number(s) : 72;
    } catch {
      return 72;
    }
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[#0c1017]/95 backdrop-blur-2xl text-white overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl mx-auto flex-1 flex flex-col p-4 sm:p-6 md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 shrink-0 flex items-center justify-center">
              <img
                src={HUD_ASSETS.menu}
                alt=""
                className="w-full h-full object-contain pointer-events-none drop-shadow-md select-none"
                draggable={false}
              />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white font-lilita">
                Game Settings
              </h1>
              <p className="text-[12px] text-zinc-400">
                Configure controls, camera view, graphics, and Skyblock atmosphere
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Settings"
            className="relative w-11 h-11 p-0 border-0 bg-transparent flex items-center justify-center active:scale-90 transition-transform cursor-pointer outline-none"
          >
            <img
              src={HUD_ASSETS.button}
              alt=""
              className="w-full h-full object-contain pointer-events-none drop-shadow-md select-none"
              draggable={false}
            />
            <span className="absolute inset-0 flex items-center justify-center text-white text-lg font-black select-none pointer-events-none">
              ✕
            </span>
          </button>
        </div>

        {/* Settings Grid */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 pb-12">
          {/* Section 1: Camera & View */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5 flex flex-col gap-3">
            <div className="flex items-center gap-3 text-amber-400 font-bold text-sm">
              <div className="w-12 h-12 shrink-0 flex items-center justify-center">
                <img src={HUD_ASSETS.video} alt="" className="w-full h-full object-contain drop-shadow-md" />
              </div>
              <span className="text-base font-extrabold">Camera & Perspective</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {modes.map((m) => {
                const active = camMode === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => onCamMode(m.id)}
                    className={`press flex flex-col items-center justify-center p-3 rounded-xl border transition cursor-pointer ${
                      active
                        ? "bg-amber-400/20 border-amber-400 text-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.2)] font-black"
                        : "bg-white/[0.03] border-white/10 text-white/70 hover:bg-white/[0.07] font-semibold"
                    }`}
                  >
                    <span className="text-2xl mb-1">{m.icon}</span>
                    <span className="text-[11px]">{m.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Field of View slider */}
            <div className="flex flex-col gap-1.5 mt-2 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold text-white/90">Field of View (FOV)</span>
                <span className="text-[11px] font-mono font-bold text-amber-300 bg-white/10 px-2 py-0.5 rounded-lg border border-white/10">
                  {cameraFov}°
                </span>
              </div>
              <input
                type="range"
                min={60}
                max={95}
                step={5}
                value={cameraFov}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setCameraFov(val);
                  try {
                    localStorage.setItem("qb_camera_fov", String(val));
                  } catch {}
                  window.dispatchEvent(new CustomEvent("bm-fov", { detail: val }));
                }}
                className="w-full h-2 bg-white/20 accent-amber-400 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-white/40">
                <span>Narrow (60°)</span>
                <span>Standard (72°)</span>
                <span>Wide (95°)</span>
              </div>
            </div>
          </div>

          {/* Section 2: Controls & Joystick Direction */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5 flex flex-col gap-3">
            <div className="flex items-center gap-3 text-sky-400 font-bold text-sm">
              <div className="w-12 h-12 shrink-0 flex items-center justify-center">
                <img src={HUD_ASSETS.arrow} alt="" className="w-full h-full object-contain drop-shadow-md" />
              </div>
              <span className="text-base font-extrabold">Joystick & Movement</span>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/10">
                <div>
                  <div className="text-[12.5px] font-bold text-white">Invert Vertical (Y-Axis)</div>
                  <div className="text-[10.5px] text-zinc-400">
                    {invertJoyY
                      ? "Up goes backward, Down goes forward"
                      : "Standard (Up goes forward, Down goes backward)"}
                  </div>
                </div>
                <button
                  onClick={onToggleInvertJoyY}
                  className={`press px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                    invertJoyY
                      ? "bg-amber-400 text-zinc-950 shadow-sm"
                      : "bg-white/10 text-white/80 hover:bg-white/20 border border-white/15"
                  }`}
                >
                  {invertJoyY ? "Inverted" : "Standard"}
                </button>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/10">
                <div>
                  <div className="text-[12.5px] font-bold text-white">
                    Invert Horizontal (X-Axis)
                  </div>
                  <div className="text-[10.5px] text-zinc-400">
                    {invertJoyX
                      ? "Right goes left, Left goes right"
                      : "Standard (Right goes right, Left goes left)"}
                  </div>
                </div>
                <button
                  onClick={onToggleInvertJoyX}
                  className={`press px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                    invertJoyX
                      ? "bg-amber-400 text-zinc-950 shadow-sm"
                      : "bg-white/10 text-white/80 hover:bg-white/20 border border-white/15"
                  }`}
                >
                  {invertJoyX ? "Inverted" : "Standard"}
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: Atmosphere & Time of Day */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <Sun className="w-4 h-4" />
              <span>Atmosphere & Time of Day</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  try { localStorage.setItem("qb_atmosphere", "day"); } catch {}
                  window.dispatchEvent(new CustomEvent("bm-atmosphere", { detail: "normal" }));
                  if (nightMode && onToggleNightMode) onToggleNightMode();
                }}
                className={`press p-2.5 rounded-xl border text-center text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
                  !nightMode
                    ? "bg-amber-400/20 border-amber-400 text-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.2)] font-black"
                    : "border-white/10 bg-white/[0.03] hover:bg-white/[0.07] text-white/80"
                }`}
              >
                <Sun className="w-5 h-5 text-amber-400" />
                <span>Normal (Day)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  try { localStorage.setItem("qb_atmosphere", "evening"); } catch {}
                  window.dispatchEvent(new CustomEvent("bm-atmosphere", { detail: "evening" }));
                  if (nightMode && onToggleNightMode) onToggleNightMode();
                }}
                className="press p-2.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] text-center text-xs font-bold text-white/80 flex flex-col items-center gap-1 cursor-pointer hover:border-orange-400/50"
              >
                <Sunset className="w-5 h-5 text-orange-400" />
                <span>Evening</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  try { localStorage.setItem("qb_atmosphere", "night"); } catch {}
                  window.dispatchEvent(new CustomEvent("bm-atmosphere", { detail: "night" }));
                  if (!nightMode && onToggleNightMode) onToggleNightMode();
                }}
                className={`press p-2.5 rounded-xl border text-center text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
                  nightMode
                    ? "bg-cyan-400/20 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.2)] font-black"
                    : "border-white/10 bg-white/[0.03] hover:bg-white/[0.07] text-white/80"
                }`}
              >
                <Moon className="w-5 h-5 text-cyan-400" />
                <span>Night</span>
              </button>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200 leading-relaxed">
              🦅 <strong>Atmosphere:</strong> Switch between Normal golden daylight sunshine, warm evening sunset, and luminous starry night with the soaring Phoenix!
            </div>
          </div>

          {/* Section 4: Graphics & Performance */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
              <Sliders className="w-4 h-4" />
              <span>Graphics Quality</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  onQualityPref?.("medium");
                  try { localStorage.setItem("bm-quality", "normal"); } catch {}
                  window.dispatchEvent(new CustomEvent("bm-quality", { detail: "normal" }));
                }}
                className={`press py-2.5 px-3 rounded-xl text-xs font-black transition cursor-pointer flex flex-col items-center gap-0.5 ${
                  qualityPref !== "high"
                    ? "bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.35)]"
                    : "bg-white/[0.03] border border-white/10 text-white/70 hover:bg-white/[0.07]"
                }`}
              >
                <span>Normal (New)</span>
                <span className="text-[10px] font-medium opacity-80">Smooth 60–120 FPS</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onQualityPref?.("high");
                  try { localStorage.setItem("bm-quality", "high"); } catch {}
                  window.dispatchEvent(new CustomEvent("bm-quality", { detail: "high" }));
                }}
                className={`press py-2.5 px-3 rounded-xl text-xs font-black transition cursor-pointer flex flex-col items-center gap-0.5 ${
                  qualityPref === "high"
                    ? "bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.35)] font-black"
                    : "bg-white/[0.03] border border-white/10 text-white/70 hover:bg-white/[0.07]"
                }`}
              >
                <span>High (Ultra)</span>
                <span className="text-[10px] font-medium opacity-80">Old Ultra Quality</span>
              </button>
            </div>
            <div className="text-[11px] text-zinc-400">
              {qualityPref === "high"
                ? "Restores the old ultra-high quality: native Retina DPR, full bloom resolution & dynamic shadows."
                : "New high-efficiency profile: smooth 60–120 FPS, soft ambient bloom & zero lag."}
            </div>

            {/* Motion Blur & Ultra Smoothness */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/10 mt-1">
              <div>
                <div className="text-[13px] font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>AAA Game Motion Blur & High-FPS Smoothness</span>
                </div>
                <div className="text-[10.5px] text-zinc-400 mt-0.5">
                  Cinematic velocity blur when moving & turning (replicates buttery 600 FPS AAA fluidity)
                </div>
              </div>
              <button
                onClick={onToggleMotionBlur}
                className={`press px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                  motionBlur
                    ? "bg-cyan-500 text-zinc-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                    : "bg-white/10 text-white/60 hover:bg-white/15"
                }`}
              >
                {motionBlur ? "ON" : "OFF"}
              </button>
            </div>
          </div>
        </div>

        {/* Footer info & close */}
        <div className="mt-auto pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-zinc-400">
          <div>
            {privateServer
              ? `Private Server (${privateServer.privacy === "friends" ? "Friends only" : "Global"})`
              : "Public Server • Skyblock Cosmic Spark"}
          </div>
          <button
            onClick={onClose}
            className="press px-5 py-2 rounded-xl bg-amber-400 text-zinc-950 font-bold text-xs hover:bg-amber-300 transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

/** Placeholder Skyblock shop. */
export function SkyblockShopModal({ onClose }: { onClose: () => void }) {
  const items = [
    { name: "Dirt x64", price: 25 },
    { name: "Stone x64", price: 40 },
    { name: "Wood x32", price: 60 },
    { name: "Glass x16", price: 90 },
  ];
  return (
    <ModalShell title="Island shop" onClose={onClose}>
      <div className="flex flex-col gap-1.5">
        {items.map((i) => (
          <div
            key={i.name}
            className="flex items-center justify-between rounded-[12px] border border-white/10 bg-white/[0.04] px-3 py-2.5"
          >
            <span className="text-[13px] font-bold">{i.name}</span>
            <span className="text-[12.5px] font-extrabold text-[#f4c430]">{i.price} coins</span>
          </div>
        ))}
      </div>
    </ModalShell>
  );
}

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
