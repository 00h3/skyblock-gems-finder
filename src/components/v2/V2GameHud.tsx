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
};

type Props = {
  isTouch: boolean;
  running: boolean;
  thirdPerson: boolean;
  muted: boolean;
  /** When true, touch controls sit above the bottom-pinned inventory bar. */
  hasHotbar?: boolean;
  /** Mode-specific overlays (status bars, hotbar, countdown...). */
  topCenter?: ReactNode;
  children?: ReactNode;
  actions: HudAction[];
  menuExtra?: { label: string; onSelect: () => void }[];
  onMove: (x: number, y: number) => void;
  onToggleRun: () => void;
  onOpenChat: () => void;
  onOpenSettings: () => void;
  onToggleCamera: () => void;
  onToggleMute: () => void;
  onEmote: () => void;
  onLeave: () => void;
  onMenuChange?: (open: boolean) => void;
};

/**
 * V2 game chrome shared by every sandbox mode: top button row, text D-pad,
 * action keys and the pause menu. Text only — no icons until the custom
 * icon set lands.
 */
export function V2GameHud({
  isTouch,
  running,
  thirdPerson,
  muted,
  hasHotbar = false,
  topCenter,
  children,
  actions,
  menuExtra = [],
  onMove,
  onToggleRun,
  onOpenChat,
  onOpenSettings,
  onToggleCamera,
  onToggleMute,
  onEmote,
  onLeave,
  onMenuChange,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  const setMenu = (open: boolean) => {
    setMenuOpen(open);
    onMenuChange?.(open);
  };

  const topButtons: { label: string; onClick: () => void }[] = [
    { label: "Menu", onClick: () => setMenu(!menuOpen) },
    { label: "Chat", onClick: onOpenChat },
    { label: "Emote", onClick: onEmote },
    { label: "View", onClick: onToggleCamera },
  ];

  return (
    <div
      className="v2-ui pointer-events-none fixed inset-0 z-[100] select-none"
      style={{ ["--hb" as string]: hasHotbar ? "66px" : "0px" }}
    >
      <header className="absolute inset-x-3 top-[max(12px,calc(env(safe-area-inset-top)+8px))] flex flex-wrap items-start justify-between gap-2 sm:inset-x-5">
        <nav aria-label="Game" className="pointer-events-auto flex gap-2">
          {topButtons.map((b) => (
            <V2Button
              key={b.label}
              onClick={b.onClick}
              aria-expanded={b.label === "Menu" ? menuOpen : undefined}
              className="h-11 min-w-[52px] px-3 text-[14px] sm:h-12 sm:min-w-[60px] sm:text-[15px]"
            >
              {b.label}
            </V2Button>
          ))}
        </nav>
        {topCenter && (
          <div className="pointer-events-none flex w-full justify-center sm:w-auto sm:flex-1 sm:justify-end">
            {topCenter}
          </div>
        )}
      </header>

      {children}

      {isTouch && (
        <>
          <DPad onMove={onMove} running={running} onToggleRun={onToggleRun} />
          <ActionCluster actions={actions} />
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
}: {
  onMove: (x: number, y: number) => void;
  running: boolean;
  onToggleRun: () => void;
}) {
  const padRef = useRef<HTMLDivElement>(null);
  const pointer = useRef<number | null>(null);
  const [dir, setDir] = useState({ x: 0, y: 0 });

  const update = (clientX: number, clientY: number) => {
    const el = padRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const nx = (clientX - (r.left + r.width / 2)) / (r.width / 2);
    const ny = (clientY - (r.top + r.height / 2)) / (r.height / 2);
    const x = Math.abs(nx) > 0.34 ? Math.sign(nx) : 0;
    const y = Math.abs(ny) > 0.34 ? -Math.sign(ny) : 0;
    setDir((d) => (d.x === x && d.y === y ? d : { x, y }));
    const len = Math.hypot(x, y) || 1;
    onMove(x / len, y / len);
  };

  const release = () => {
    pointer.current = null;
    setDir({ x: 0, y: 0 });
    onMove(0, 0);
  };

  useEffect(() => {
    const blur = () => release();
    window.addEventListener("blur", blur);
    return () => window.removeEventListener("blur", blur);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const key = "v2-key text-[calc(var(--k)*0.26)]";
  const size = { width: "var(--k)", height: "var(--k)" };

  return (
    <div
      className="pointer-events-auto absolute bottom-[calc(max(18px,calc(env(safe-area-inset-bottom)+12px))+var(--hb,0px))] left-[max(14px,env(safe-area-inset-left))] sm:left-8"
    >
      <div
        ref={padRef}
        role="group"
        aria-label="Movement pad"
        className="grid touch-none gap-1.5"
        style={{ gridTemplateColumns: "repeat(3, var(--k))" }}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).dataset.center) return;
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
        onPointerCancel={release}
      >
        <span style={size} />
        <span className={key} style={size} data-active={dir.y === 1}>Up</span>
        <span style={size} />
        <span className={key} style={size} data-active={dir.x === -1}>Left</span>
        <button
          type="button"
          data-center="true"
          aria-pressed={running}
          onPointerDown={(e) => {
            e.stopPropagation();
            onToggleRun();
          }}
          className={cn(key, "text-[calc(var(--k)*0.22)]")}
          style={size}
          data-active={running}
        >
          {running ? "Run" : "Walk"}
        </button>
        <span className={key} style={size} data-active={dir.x === 1}>Right</span>
        <span style={size} />
        <span className={key} style={size} data-active={dir.y === -1}>Down</span>
        <span style={size} />
      </div>
    </div>
  );
}

function ActionCluster({ actions }: { actions: HudAction[] }) {
  const primary = actions.find((a) => a.primary) ?? actions[0];
  const secondary = actions.filter((a) => a !== primary);
  return (
    <div className="pointer-events-auto absolute bottom-[calc(max(18px,calc(env(safe-area-inset-bottom)+12px))+var(--hb,0px))] right-[max(14px,env(safe-area-inset-right))] flex items-end gap-2 sm:right-8">
      {secondary.length > 0 && (
        <div className="mb-1 flex flex-col gap-2">
          {secondary.map((a) => (
            <ActionKey key={a.id} action={a} scale={1.05} />
          ))}
        </div>
      )}
      {primary && <ActionKey action={primary} scale={1.5} />}
    </div>
  );
}

function ActionKey({ action, scale }: { action: HudAction; scale: number }) {
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
      className="v2-key touch-none"
      style={{
        width: `calc(var(--k) * ${scale})`,
        height: `calc(var(--k) * ${scale})`,
        fontSize: `calc(var(--k) * ${0.24 + (scale - 1) * 0.08})`,
        borderRadius: scale > 1.2 ? 999 : 14,
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
      {action.label}
    </button>
  );
}
