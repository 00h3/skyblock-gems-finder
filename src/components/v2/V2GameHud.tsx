import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import WetPaintButton from "@/components/ui/wet-paint-button";
import { V2Announcer, V2Button } from "./primitives";

export type HudAction = {
  id: string;
  label: string;
  /** "hold" fires down/up, "tap" fires once on press. */
  kind: "hold" | "tap";
  onPress: (down: boolean) => void;
  primary?: boolean;
  /** Optional image key (HUD icon pack) shown instead of the text label. */
  icon?: string;
};

type Props = {
  isTouch: boolean;
  running: boolean;
  thirdPerson: boolean;
  muted: boolean;
  isSkyblock?: boolean;
  /** When true, touch controls sit above the bottom-pinned inventory bar. */
  hasHotbar?: boolean;
  /** Mode-specific overlays (status bars, hotbar, countdown...). */
  topCenter?: ReactNode;
  children?: ReactNode;
  actions: HudAction[];
  menuExtra?: { label: string; onSelect: () => void }[];
  onMove: (x: number, y: number) => void;
  onToggleRun: () => void;
  sneaking?: boolean;
  onToggleSneak?: () => void;
  onOpenChat: () => void;
  onOpenSettings: () => void;
  onToggleCamera: () => void;
  onToggleMute: () => void;
  onEmote: () => void;
  emoting?: boolean;
  freeLook?: boolean;
  onToggleFreeLook?: () => void;
  onLeave: () => void;
  onMenuChange?: (open: boolean) => void;
};

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/**
 * V2 game chrome shared by every sandbox mode: top button row, text D-pad,
 * action keys and the pause menu. Scaled down by 40% for optimal mobile visibility.
 */
export function V2GameHud({
  isTouch,
  running,
  thirdPerson,
  muted,
  isSkyblock = false,
  hasHotbar = false,
  topCenter,
  children,
  actions,
  menuExtra = [],
  onMove,
  onToggleRun,
  sneaking,
  onToggleSneak,
  onOpenChat,
  onOpenSettings,
  onToggleCamera,
  onToggleMute,
  onEmote,
  emoting = false,
  freeLook = false,
  onToggleFreeLook,
  onLeave,
  onMenuChange,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [controlsScale, setControlsScale] = useState<number>(() => {
    try {
      const s = localStorage.getItem("qb_controls_scale");
      return s ? Number(s) : 1.0;
    } catch {
      return 1.0;
    }
  });

  useEffect(() => {
    const handleScale = (e: Event) => {
      const val = (e as CustomEvent<number>).detail;
      if (typeof val === "number") setControlsScale(val);
    };
    window.addEventListener("bm-controls-scale", handleScale);
    return () => window.removeEventListener("bm-controls-scale", handleScale);
  }, []);

  useEffect(() => {
    const handleModalActive = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail && typeof detail.open === "boolean") {
        setIsModalOpen(detail.open);
      } else {
        setIsModalOpen(true);
      }
    };
    window.addEventListener("bm-modal-active", handleModalActive);
    return () => window.removeEventListener("bm-modal-active", handleModalActive);
  }, []);

  const setMenu = (open: boolean) => {
    setMenuOpen(open);
    onMenuChange?.(open);
  };

  const topButtons: { label: string; icon: string; onClick: () => void; active?: boolean }[] = [
    { label: "Menu", icon: UI.menu, onClick: () => setMenu(!menuOpen) },
    { label: "Chat", icon: UI.chat, onClick: onOpenChat },
    { label: "Emote", icon: UI.smile, onClick: onEmote, active: emoting },
    { label: "Camera", icon: UI.video, onClick: onToggleCamera },
    ...(onToggleFreeLook
      ? [
          {
            label: "Free-Look",
            icon: "eye",
            onClick: onToggleFreeLook,
            active: freeLook,
          },
        ]
      : []),
  ];

  // Scale down controls for optimal mobile visibility and ergonomic thumb reach
  const effectiveControlsScale = controlsScale * 0.95;

  return (
    <div
      className={cn("v2-ui game-font-inter pointer-events-none fixed inset-0 z-[100] select-none", isSkyblock && "skyblock-scaled-ui")}
      style={{ ["--hb" as string]: hasHotbar ? "34px" : "0px", fontFamily: "'Inter', sans-serif" }}
    >
      <header className="absolute inset-x-3 top-[max(6px,calc(env(safe-area-inset-top)+4px))] flex flex-wrap items-start justify-between gap-1 sm:inset-x-4">
        <nav aria-label="Game" className="pointer-events-auto flex gap-1 scale-[0.80] origin-top-left">
          {topButtons.map((b) => (
            <button
              key={b.label}
              type="button"
              onClick={b.onClick}
              aria-label={b.label}
              title={b.label}
              aria-expanded={b.label === "Menu" ? menuOpen : undefined}
              className={cn(
                "relative grid place-items-center transition-all duration-150 active:scale-90 rounded-full h-8 w-8 sm:h-9 sm:w-9",
                b.active && "ring-2 ring-amber-400 bg-amber-500/35 shadow-[0_0_14px_rgba(245,158,11,0.85)] animate-pulse",
              )}
            >
              {b.icon === "eye" ? (
                <EyeIcon className="h-4 w-4 text-white drop-shadow-[0_2px_3px_rgba(0,0,0,.7)]" />
              ) : (
                <img src={b.icon} alt="" draggable={false} className="h-full w-full object-contain drop-shadow-[0_2px_3px_rgba(0,0,0,.35)]" />
              )}
              {b.active && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500 shadow-[0_0_6px_#fbbf24]"></span>
                </span>
              )}
            </button>
          ))}
          {isSkyblock && (
            <button
              type="button"
              onClick={onOpenChat}
              title="Click to open Skyblock chat"
              className="pointer-events-auto flex items-center gap-1.5 ml-1 px-2.5 py-1 rounded-lg bg-black/45 hover:bg-black/60 backdrop-blur-md border border-white/20 shadow-lg text-[11px] cursor-pointer active:scale-95 transition-all text-left"
            >
              <span className="font-bold text-[#ff80bf] [text-shadow:-1px_-1px_0_#000,1px_-1px_0_#000,-1px_1px_0_#000,1px_1px_0_#000]">
                [Skyblock Team]
              </span>
              <span className="font-bold text-white [text-shadow:-1px_-1px_0_#000,1px_-1px_0_#000,-1px_1px_0_#000,1px_1px_0_#000]">
                Welcome to skyblock!
              </span>
            </button>
          )}
        </nav>
        {topCenter && (
          <div className="pointer-events-none flex w-full justify-center sm:w-auto sm:flex-1 sm:justify-end scale-[0.68] origin-top-center sm:origin-top-right">
            {topCenter}
          </div>
        )}
      </header>

      {/* Hotbar / bottom items placed directly on the bottom and a lil bigger per user request */}
      <div className="scale-[0.92] origin-bottom pointer-events-none w-full h-full flex flex-col justify-end items-center pb-0">
        {children}
      </div>

      {isTouch && !isModalOpen && !menuOpen && (
        <>
          <DPad
            onMove={onMove}
            running={running}
            onToggleRun={onToggleRun}
            sneaking={sneaking}
            onToggleSneak={onToggleSneak}
            scale={controlsScale}
          />
          <ActionCluster actions={actions} scale={controlsScale} />
        </>
      )}

      <V2Announcer />

      {menuOpen && (
        <div
          className="pointer-events-auto fixed inset-0 z-[140] grid place-items-center bg-v2-ink/45 p-4 backdrop-blur-[2px]"
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) setMenu(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Game menu"
            className="v2-panel v2-anim-pop w-full max-w-[340px] p-5"
          >
            <p className="v2-eyebrow text-center">Game menu</p>
            <p className="mb-5 mt-1 text-center text-[24px] font-bold tracking-tight">Paused</p>
            <div className="flex flex-col gap-3">
              <WetPaintButton className="mb-6 h-12 w-full rounded-[12px] text-[15px]" onClick={() => setMenu(false)} autoFocus>
                Resume
              </WetPaintButton>
              <div className="grid grid-cols-2 gap-3">
                <V2Button className="h-11 text-[14px]" onClick={() => { setMenu(false); onOpenSettings(); }}>
                  Settings
                </V2Button>
                <V2Button className="h-11 text-[14px]" onClick={() => { setMenu(false); onOpenChat(); }}>
                  Chat
                </V2Button>
                <V2Button className="h-11 text-[14px]" onClick={onToggleCamera}>
                  {thirdPerson ? "3rd person" : "1st person"}
                </V2Button>
                <V2Button className="h-11 text-[14px]" onClick={onToggleMute}>
                  {muted ? "Sound off" : "Sound on"}
                </V2Button>
              </div>
              {menuExtra.map((m) => (
                <V2Button
                  key={m.label}
                  className="h-11 text-[14px]"
                  onClick={() => {
                    setMenu(false);
                    m.onSelect();
                  }}
                >
                  {m.label}
                </V2Button>
              ))}
              <V2Button
                variant="ghost"
                className="h-11 text-[14px] text-[#ffb3b5]"
                onClick={() => {
                  setMenu(false);
                  onLeave();
                }}
              >
                Leave game
              </V2Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * One pointer drives the whole pad, so sliding between keys (and diagonals)
 * works like a physical D-pad. Screen-up is always "forward" (+y).
 */
function DPad({
  onMove,
  running,
  onToggleRun,
  sneaking,
  onToggleSneak,
  scale = 1.0,
}: {
  onMove: (x: number, y: number) => void;
  running: boolean;
  onToggleRun: () => void;
  sneaking?: boolean;
  onToggleSneak?: () => void;
  scale?: number;
}) {
  const padRef = useRef<HTMLDivElement>(null);
  const pointer = useRef<number | null>(null);
  const last = useRef({ x: 0, y: 0 });
  const [dir, setDir] = useState({ x: 0, y: 0 });

  // Angle-based 8-way sectors: no dead gaps between keys, clean diagonals,
  // and onMove only fires when the direction actually changes.
  const update = (clientX: number, clientY: number) => {
    const el = padRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const nx = (clientX - (r.left + r.width / 2)) / (r.width / 2);
    const ny = (clientY - (r.top + r.height / 2)) / (r.height / 2);
    let x = 0;
    let y = 0;
    if (Math.hypot(nx, ny) > 0.22) {
      const sector = Math.round(Math.atan2(-ny, nx) / (Math.PI / 4));
      const a = sector * (Math.PI / 4);
      x = Math.round(Math.cos(a));
      y = Math.round(Math.sin(a));
    }
    if (last.current.x === x && last.current.y === y) return;
    last.current = { x, y };
    setDir({ x, y });
    const len = Math.hypot(x, y) || 1;
    onMove(x / len, y / len);
  };

  const release = () => {
    pointer.current = null;
    last.current = { x: 0, y: 0 };
    setDir({ x: 0, y: 0 });
    onMove(0, 0);
  };

  useEffect(() => {
    const blur = () => release();
    window.addEventListener("blur", blur);
    return () => window.removeEventListener("blur", blur);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const size = { width: "var(--k)", height: "var(--k)" };

  return (
    <div
      className="pointer-events-auto absolute bottom-[calc(max(8px,calc(env(safe-area-inset-bottom)+4px))+var(--hb,0px))] left-[max(2px,calc(env(safe-area-inset-left)+1px))] sm:left-2"
      style={{
        transform: `scale(${1.02 * scale})`,
        transformOrigin: "bottom left",
      }}
    >
      <div
        ref={padRef}
        role="group"
        aria-label="Movement pad"
        className="grid touch-none gap-1.5"
        style={{ gridTemplateColumns: "repeat(3, var(--k))" }}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest("[data-key]")) return;
          if (pointer.current !== null) return;
          e.preventDefault();
          pointer.current = e.pointerId;
          e.currentTarget.setPointerCapture(e.pointerId);
          update(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (pointer.current === e.pointerId) update(e.clientX, e.clientY);
        }}
        onPointerUp={(e) => {
          if (pointer.current === e.pointerId) release();
        }}
        onPointerCancel={(e) => {
          if (pointer.current === e.pointerId) release();
        }}
        onLostPointerCapture={(e) => {
          if (pointer.current === e.pointerId) release();
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <span style={size} />
        <PadArrow label="Up" rotate={-90} active={dir.y === 1} />
        <span style={size} />
        <PadArrow label="Left" rotate={180} active={dir.x === -1} />
        <button
          type="button"
          data-key="run"
          aria-label={running ? "Running, switch to walk" : "Walking, switch to run"}
          aria-pressed={running}
          onPointerDown={(e) => {
            e.stopPropagation();
            onToggleRun();
          }}
          className={cn("p-0 border-0 bg-transparent outline-none active:scale-95 transition-transform cursor-pointer select-none", running && "is-active")}
          style={{ ...size, transform: "scale(1.3)", transformOrigin: "center" }}
        >
          <img
            src={running ? UI.run : UI.walk}
            alt=""
            draggable={false}
            className="pointer-events-none h-full w-full object-contain drop-shadow-md"
          />
        </button>
        <PadArrow label="Right" rotate={0} active={dir.x === 1} />
        {onToggleSneak ? (
          <button
            type="button"
            data-key="sneak"
            aria-label={sneaking ? "Stop sneaking" : "Sneak"}
            aria-pressed={!!sneaking}
            onPointerDown={(e) => {
              e.stopPropagation();
              onToggleSneak();
            }}
            className={cn("p-0 border-0 bg-transparent outline-none active:scale-95 transition-transform cursor-pointer select-none", sneaking && "is-active")}
            style={{ ...size, transform: "scale(1.3)", transformOrigin: "center" }}
          >
            <img src={UI.sneak} alt="" draggable={false} className="pointer-events-none h-full w-full object-contain drop-shadow-md" />
          </button>
        ) : (
          <span style={size} />
        )}
        <PadArrow label="Down" rotate={90} active={dir.y === -1} />
        <span style={size} />
      </div>
    </div>
  );
}

export const UI = {
  menu: "/ui/menu-icon.png",
  chat: "/ui/chat-icon.png",
  smile: "/ui/smile-icon.png",
  video: "/ui/video-icon.png",
  arrow: "/ui/arrow-icon.png",
  blank: "/ui/blank-button.png",
  walk: "/ui/icon-walk.png",
  run: "/ui/icon-run.png",
  sneak: "/ui/icon-crouch.png",
  jump: "/ui/icon-jump.png",
};

function PadArrow({ label, rotate, active }: { label: string; rotate: number; active: boolean }) {
  return (
    <span
      role="img"
      aria-label={label}
      className={cn("blockman-key", active && "is-active")}
      style={{ width: "var(--k)", height: "var(--k)" }}
    >
      <img
        src={UI.arrow}
        alt=""
        draggable={false}
        className="pointer-events-none h-full w-full object-contain"
        style={{ transform: `rotate(${rotate}deg)` }}
      />
    </span>
  );
}

function ActionCluster({ actions, scale = 1.0 }: { actions: HudAction[]; scale?: number }) {
  const primary = actions.find((a) => a.primary) ?? actions[0];
  const secondary = actions.filter((a) => a !== primary);
  return (
    <div
      className="pointer-events-auto absolute bottom-[calc(max(8px,calc(env(safe-area-inset-bottom)+4px))+var(--hb,0px))] right-[max(4px,calc(env(safe-area-inset-right)+2px))] flex items-end gap-2 sm:right-4"
      style={{
        transform: `scale(${1.0 * scale})`,
        transformOrigin: "bottom right",
      }}
    >
      {secondary.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {secondary.map((a) => (
            <ActionKey key={a.id} action={a} scale={0.92} />
          ))}
        </div>
      )}
      {primary && <ActionKey action={primary} scale={1.25} isPrimary />}
    </div>
  );
}

function ActionKey({ action, scale, isPrimary = false }: { action: HudAction; scale: number; isPrimary?: boolean }) {
  const [down, setDown] = useState(false);
  const end = () => {
    if (!down) return;
    setDown(false);
    if (action.kind === "hold") action.onPress(false);
  };
  return (
    <button
      type="button"
      aria-label={action.label}
      data-active={down}
      className={cn(
        "touch-none select-none transition-transform cursor-pointer",
        action.icon ? "p-0 border-0 bg-transparent outline-none active:scale-90" : "blockman-key",
        isPrimary && "font-black",
        down && "is-active scale-95"
      )}
      style={{
        width: `calc(var(--k) * ${scale})`,
        height: `calc(var(--k) * ${scale})`,
        fontSize: `calc(var(--k) * ${0.24 + (scale - 1) * 0.08})`,
        backgroundImage: action.icon ? undefined : `url(${UI.blank})`,
      }}
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        setDown(true);
        action.onPress(true);
      }}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
    >
      {action.icon ? (
        <img
          src={action.icon}
          alt={action.label}
          draggable={false}
          className="pointer-events-none h-full w-full object-contain drop-shadow-md select-none"
        />
      ) : (
        action.label
      )}
    </button>
  );
}
