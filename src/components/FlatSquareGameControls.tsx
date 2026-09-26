"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { LogOut, MessageSquare, Settings } from "lucide-react";
import { FlatSquareChatModal } from "@/components/FlatSquareChatModal";
import { FlatSquareSettingsModal } from "@/components/FlatSquareSettingsModal";

export type MovementMode = "walk" | "crouch" | "run";

interface FlatSquareGameControlsProps {
  movementMode?: MovementMode;
  onMovementModeChange?: (mode: MovementMode) => void;
  onJump: (down: boolean) => void;
  onJoyVector: (x: number, y: number) => void;
  onLeave?: () => void;
}

// The PNGs are 1744x902 canvases with the button art centered; these sizes crop to the art.
const SPRITE_SIZE = {
  purple: "459% 247%",
  gray: "329% 198%",
  blank: "206% 124%",
} as const;

type SpriteKind = keyof typeof SPRITE_SIZE;
type Dir = "up" | "down" | "left" | "right";

const ARROW_ROTATION: Record<Dir, number> = { right: 0, down: 90, left: 180, up: -90 };

const glass = "border border-white/10 bg-black/70 text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)]";
const menuItem =
  "flex h-10 w-full items-center justify-between rounded-xl px-3 text-left text-[14px] tracking-wide outline-none transition-colors cursor-pointer";

function Sprite({ src, kind, rotate = 0 }: { src: string; kind: SpriteKind; rotate?: number }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 bg-center bg-no-repeat"
      style={{
        backgroundImage: `url(${src})`,
        backgroundSize: SPRITE_SIZE[kind],
        transform: rotate ? `rotate(${rotate}deg)` : undefined,
      }}
    />
  );
}

export function FlatSquareGameControls({
  movementMode: controlledMode,
  onMovementModeChange,
  onJump,
  onJoyVector,
  onLeave,
}: FlatSquareGameControlsProps) {
  const [internalMode, setInternalMode] = useState<MovementMode>("walk");
  const currentMode = controlledMode ?? internalMode;
  const [menuOpen, setMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pressed, setPressed] = useState<Record<Dir, boolean>>({ up: false, down: false, left: false, right: false });
  const pressedRef = useRef(pressed);

  const [controlsScale, setControlsScale] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("qb_controls_scale");
      return saved ? Number(saved) : 1.0;
    } catch {
      return 1.0;
    }
  });

  useEffect(() => {
    if (!menuOpen) return;
    const handleOutside = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest("#flat-square-menu-container")) setMenuOpen(false);
    };
    window.addEventListener("pointerdown", handleOutside);
    return () => window.removeEventListener("pointerdown", handleOutside);
  }, [menuOpen]);

  const cycleMovementMode = useCallback(() => {
    const nextMode: MovementMode = currentMode === "walk" ? "crouch" : currentMode === "crouch" ? "run" : "walk";
    if (onMovementModeChange) onMovementModeChange(nextMode);
    else setInternalMode(nextMode);
    window.dispatchEvent(new CustomEvent("bm-movement-mode", { detail: { mode: nextMode } }));
  }, [currentMode, onMovementModeChange]);

  const setDir = (dir: Dir, down: boolean) => {
    if (pressedRef.current[dir] === down) return;
    const next = { ...pressedRef.current, [dir]: down };
    pressedRef.current = next;
    setPressed(next);
    const x = (next.right ? 1 : 0) - (next.left ? 1 : 0);
    const y = (next.up ? 1 : 0) - (next.down ? 1 : 0);
    const len = Math.hypot(x, y) || 1;
    onJoyVector(x / len, y / len);
  };

  const dirHandlers = (dir: Dir) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {}
      setDir(dir, true);
    },
    onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      setDir(dir, false);
    },
    onPointerCancel: () => setDir(dir, false),
    onLostPointerCapture: () => setDir(dir, false),
  });

  const handleJumpDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onJump(true);
    window.dispatchEvent(new Event("bm-jump"));
  };

  const handleJumpUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onJump(false);
  };

  const tap = (fn: () => void) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
  };

  const topBtn =
    "relative h-12 w-12 outline-none touch-none cursor-pointer transition-transform active:scale-90 sm:h-14 sm:w-14";
  const padBtn = (dir: Dir) =>
    `relative h-14 w-14 touch-none outline-none transition-transform ${pressed[dir] ? "scale-90 brightness-125" : ""}`;

  return (
    <div
      id="flat-square-game-controls"
      className="font-lilita fixed inset-0 z-[100] select-none pointer-events-none"
      style={{ userSelect: "none", WebkitUserSelect: "none" }}
    >
      <div
        id="flat-square-menu-container"
        className="pointer-events-auto absolute left-3 top-[max(12px,calc(env(safe-area-inset-top)+8px))] z-40 flex items-center gap-1.5 sm:left-6"
      >
        <div className="relative">
          <button
            id="btn-flat-square-menu"
            type="button"
            onPointerDown={tap(() => setMenuOpen((p) => !p))}
            className={topBtn}
            aria-label="Menu"
            aria-expanded={menuOpen}
          >
            <Sprite src="/qblock/ui/menu.png" kind="purple" />
          </button>

          {menuOpen && (
            <div
              id="flat-square-dropdown-menu"
              className={`${glass} animate-in fade-in zoom-in-95 absolute left-0 top-[calc(100%+8px)] z-50 flex w-44 flex-col gap-0.5 rounded-[22px] bg-black/85 p-1.5 duration-100`}
            >
              <button
                type="button"
                onPointerDown={tap(() => {
                  setMenuOpen(false);
                  setSettingsOpen(true);
                })}
                className={`${menuItem} hover:bg-white/10`}
              >
                <span>Settings</span>
                <Settings className="h-4 w-4 text-white/60" />
              </button>
              <button
                type="button"
                onPointerDown={tap(() => {
                  setMenuOpen(false);
                  setChatOpen(true);
                })}
                className={`${menuItem} hover:bg-white/10`}
              >
                <span>Chat</span>
                <MessageSquare className="h-4 w-4 text-white/60" />
              </button>
              <button
                type="button"
                onPointerDown={tap(() => {
                  setMenuOpen(false);
                  if (onLeave) onLeave();
                  else window.location.href = "/";
                })}
                className={`${menuItem} text-red-400 hover:bg-red-500/15`}
              >
                <span>Leave</span>
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        <button type="button" onPointerDown={tap(() => setChatOpen(true))} className={topBtn} aria-label="Chat">
          <Sprite src="/qblock/ui/chat.png" kind="purple" />
        </button>
        <button
          type="button"
          onPointerDown={tap(() => window.dispatchEvent(new CustomEvent("bm-chat-say", { detail: { text: "Hello!" } })))}
          className={topBtn}
          aria-label="Wave"
        >
          <Sprite src="/qblock/ui/smile.png" kind="purple" />
        </button>
        <button
          type="button"
          onPointerDown={tap(() => window.dispatchEvent(new Event("bm-toggle-cam")))}
          className={topBtn}
          aria-label="Toggle camera view"
        >
          <Sprite src="/qblock/ui/video.png" kind="purple" />
        </button>
      </div>

      <div
        className="pointer-events-auto absolute bottom-[max(20px,calc(env(safe-area-inset-bottom)+12px))] left-4 flex flex-col items-center gap-2 sm:left-6"
        style={{ transform: `scale(${controlsScale})`, transformOrigin: "bottom left" }}
      >
        <button
          id="btn-movement-mode-toggle"
          type="button"
          onPointerDown={tap(cycleMovementMode)}
          className={`${glass} flex h-9 items-center justify-center rounded-2xl px-4 text-[13px] uppercase tracking-wider active:scale-95 transition-transform`}
          aria-label={`Switch movement mode. Current: ${currentMode}`}
        >
          {currentMode}
        </button>

        <div id="flat-square-dpad" className="grid grid-cols-3 grid-rows-3 gap-0.5" aria-label="Movement pad">
          <span />
          <button type="button" className={padBtn("up")} aria-label="Move forward" {...dirHandlers("up")}>
            <Sprite src="/qblock/ui/arrow.png" kind="gray" rotate={ARROW_ROTATION.up} />
          </button>
          <span />
          <button type="button" className={padBtn("left")} aria-label="Move left" {...dirHandlers("left")}>
            <Sprite src="/qblock/ui/arrow.png" kind="gray" rotate={ARROW_ROTATION.left} />
          </button>
          <span className="relative h-14 w-14 opacity-80">
            <Sprite src="/qblock/ui/button.png" kind="blank" />
          </span>
          <button type="button" className={padBtn("right")} aria-label="Move right" {...dirHandlers("right")}>
            <Sprite src="/qblock/ui/arrow.png" kind="gray" rotate={ARROW_ROTATION.right} />
          </button>
          <span />
          <button type="button" className={padBtn("down")} aria-label="Move back" {...dirHandlers("down")}>
            <Sprite src="/qblock/ui/arrow.png" kind="gray" rotate={ARROW_ROTATION.down} />
          </button>
          <span />
        </div>
      </div>

      <div
        className="pointer-events-auto absolute bottom-[max(28px,calc(env(safe-area-inset-bottom)+20px))] right-5 sm:right-8"
        style={{ transform: `scale(${controlsScale})`, transformOrigin: "bottom right" }}
      >
        <button
          id="btn-flat-square-jump"
          type="button"
          onPointerDown={handleJumpDown}
          onPointerUp={handleJumpUp}
          onPointerLeave={handleJumpUp}
          onPointerCancel={handleJumpUp}
          className="relative flex h-20 w-20 items-center justify-center text-[15px] tracking-wider text-white/90 outline-none touch-none transition-transform active:scale-90"
          aria-label="Jump"
        >
          <Sprite src="/qblock/ui/button.png" kind="blank" />
          <span className="relative drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">JUMP</span>
        </button>
      </div>

      {chatOpen && <FlatSquareChatModal onClose={() => setChatOpen(false)} />}

      {settingsOpen && (
        <FlatSquareSettingsModal
          onClose={() => setSettingsOpen(false)}
          controlsScale={controlsScale}
          onControlsScaleChange={(sc) => {
            setControlsScale(sc);
            try {
              localStorage.setItem("qb_controls_scale", String(sc));
            } catch {}
          }}
        />
      )}
    </div>
  );
}
