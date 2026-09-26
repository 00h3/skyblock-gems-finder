"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { ChevronUp, LogOut, Menu, MessageSquare, Settings, Smile, Video } from "lucide-react";
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

const glass = "border border-white/10 bg-black/65 text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)]";
const topBtn = `${glass} relative flex h-11 w-11 items-center justify-center rounded-2xl outline-none touch-none active:scale-90 transition-transform cursor-pointer`;
const menuItem =
  "flex h-10 w-full items-center justify-between rounded-xl px-3 text-left text-[14px] tracking-wide outline-none transition-colors cursor-pointer";

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

  const [joystickActive, setJoystickActive] = useState(false);
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const activePointerId = useRef<number | null>(null);

  const BASE_SIZE = 124;
  const KNOB_SIZE = 50;
  const MAX_TRAVEL = (BASE_SIZE - KNOB_SIZE) / 2;

  const updateKnobAndVector = (clientX: number, clientY: number) => {
    if (!joystickBaseRef.current) return;
    const rect = joystickBaseRef.current.getBoundingClientRect();
    const dx = clientX - (rect.left + rect.width / 2);
    const dy = clientY - (rect.top + rect.height / 2);
    const len = Math.hypot(dx, dy);
    const k = len > MAX_TRAVEL ? MAX_TRAVEL / len : 1;
    const cx = dx * k;
    const cy = dy * k;
    setKnobOffset({ x: cx, y: cy });
    onJoyVector(cx / MAX_TRAVEL, -(cy / MAX_TRAVEL));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    activePointerId.current = e.pointerId;
    setJoystickActive(true);
    updateKnobAndVector(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!joystickActive || e.pointerId !== activePointerId.current) return;
    e.preventDefault();
    e.stopPropagation();
    updateKnobAndVector(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== activePointerId.current) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    activePointerId.current = null;
    setJoystickActive(false);
    setKnobOffset({ x: 0, y: 0 });
    onJoyVector(0, 0);
  };

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

  return (
    <div
      id="flat-square-game-controls"
      className="font-lilita fixed inset-0 z-[100] select-none pointer-events-none"
      style={{ userSelect: "none", WebkitUserSelect: "none" }}
    >
      <div
        id="flat-square-menu-container"
        className="pointer-events-auto absolute left-4 top-[max(16px,calc(env(safe-area-inset-top)+10px))] z-40 flex items-center gap-2 sm:left-6"
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
            <Menu className="h-5 w-5" />
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
          <MessageSquare className="h-5 w-5" />
        </button>
        <button
          type="button"
          onPointerDown={tap(() => window.dispatchEvent(new CustomEvent("bm-chat-say", { detail: { text: "Hello!" } })))}
          className={topBtn}
          aria-label="Wave"
        >
          <Smile className="h-5 w-5" />
        </button>
        <button
          type="button"
          onPointerDown={tap(() => window.dispatchEvent(new Event("bm-toggle-cam")))}
          className={topBtn}
          aria-label="Toggle camera view"
        >
          <Video className="h-5 w-5" />
        </button>
      </div>

      <div
        className="pointer-events-auto absolute bottom-[max(24px,calc(env(safe-area-inset-bottom)+16px))] left-6 flex flex-col items-center gap-3"
        style={{ transform: `scale(${controlsScale})`, transformOrigin: "bottom left" }}
      >
        <button
          id="btn-movement-mode-toggle"
          type="button"
          onPointerDown={tap(cycleMovementMode)}
          className={`${glass} flex h-10 items-center justify-center rounded-2xl px-4 text-[13px] uppercase tracking-wider active:scale-95 transition-transform`}
          aria-label={`Switch movement mode. Current: ${currentMode}`}
        >
          {currentMode}
        </button>

        <div
          id="flat-square-joystick-base"
          ref={joystickBaseRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="relative flex touch-none items-center justify-center rounded-[36px] border border-white/10 bg-black/45"
          style={{ width: BASE_SIZE, height: BASE_SIZE }}
          aria-label="Joystick"
        >
          <ChevronUp className="pointer-events-none absolute top-1.5 h-4 w-4 text-white/35" />
          <ChevronUp className="pointer-events-none absolute bottom-1.5 h-4 w-4 rotate-180 text-white/35" />
          <ChevronUp className="pointer-events-none absolute left-1.5 h-4 w-4 -rotate-90 text-white/35" />
          <ChevronUp className="pointer-events-none absolute right-1.5 h-4 w-4 rotate-90 text-white/35" />
          <div
            id="flat-square-joystick-knob"
            className={`pointer-events-none absolute rounded-[18px] border border-white/20 ${joystickActive ? "bg-white/90" : "bg-white/75"} shadow-lg`}
            style={{
              width: KNOB_SIZE,
              height: KNOB_SIZE,
              left: "50%",
              top: "50%",
              transform: `translate(calc(-50% + ${knobOffset.x}px), calc(-50% + ${knobOffset.y}px))`,
            }}
          />
        </div>
      </div>

      <div
        className="pointer-events-auto absolute bottom-[max(24px,calc(env(safe-area-inset-bottom)+16px))] right-6"
        style={{ transform: `scale(${controlsScale})`, transformOrigin: "bottom right" }}
      >
        <button
          id="btn-flat-square-jump"
          type="button"
          onPointerDown={handleJumpDown}
          onPointerUp={handleJumpUp}
          onPointerLeave={handleJumpUp}
          onPointerCancel={handleJumpUp}
          className={`${glass} flex h-20 w-20 flex-col items-center justify-center rounded-[28px] text-[15px] tracking-wider active:scale-90 transition-transform`}
          aria-label="Jump"
        >
          <ChevronUp className="h-6 w-6" />
          JUMP
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
