"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Menu, MessageSquare, Settings, LogOut } from "lucide-react";
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

/**
 * Flat square controls for Skyblock and Blockfall:
 * - Top-left flat, square menu button opening a flat square dropdown (Chat, Settings, Leave)
 * - Full-screen Flat Square Chat page (real-time chat, squared pfps, rectangular bubbles)
 * - Full-screen Flat Square Settings page (3 voci: Game, Controls, Players)
 * - Flat, square joystick (grey, fully opaque, not blurry)
 * - Flat, square jump button (grey, fully opaque, not blurry, NO icon)
 * - Flat, square button above joystick (grey, fully opaque, not blurry, NO icon)
 *   to switch between walking, crouching, and running
 */
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

  // Controls resize scale state (70% - 150%)
  const [controlsScale, setControlsScale] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("qb_controls_scale");
      return saved ? Number(saved) : 1.0;
    } catch {
      return 1.0;
    }
  });

  // Close menu on outside tap/click
  useEffect(() => {
    if (!menuOpen) return;
    const handleOutside = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest("#flat-square-menu-container")) {
        setMenuOpen(false);
      }
    };
    window.addEventListener("pointerdown", handleOutside);
    return () => window.removeEventListener("pointerdown", handleOutside);
  }, [menuOpen]);

  const cycleMovementMode = useCallback(() => {
    // Switch between walking, crouching, and running
    const nextMode: MovementMode =
      currentMode === "walk" ? "crouch" : currentMode === "crouch" ? "run" : "walk";

    if (onMovementModeChange) {
      onMovementModeChange(nextMode);
    } else {
      setInternalMode(nextMode);
    }

    // Also dispatch global event if needed by engine
    window.dispatchEvent(
      new CustomEvent("bm-movement-mode", { detail: { mode: nextMode } }),
    );
  }, [currentMode, onMovementModeChange]);

  // Flat square joystick state
  const [joystickActive, setJoystickActive] = useState(false);
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const activePointerId = useRef<number | null>(null);

  // Outer square base: 120px x 120px
  // Inner square knob: 48px x 48px
  // Max travel: (120 - 48) / 2 = 36px from center
  const BASE_SIZE = 120;
  const KNOB_SIZE = 48;
  const MAX_TRAVEL = (BASE_SIZE - KNOB_SIZE) / 2;

  const updateKnobAndVector = (clientX: number, clientY: number) => {
    if (!joystickBaseRef.current) return;
    const rect = joystickBaseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;

    // Clamp inside square bounds
    const clampedX = Math.max(-MAX_TRAVEL, Math.min(MAX_TRAVEL, dx));
    const clampedY = Math.max(-MAX_TRAVEL, Math.min(MAX_TRAVEL, dy));

    setKnobOffset({ x: clampedX, y: clampedY });

    const normX = clampedX / MAX_TRAVEL;
    const normY = -(clampedY / MAX_TRAVEL); // up on screen is positive forward (Y+)
    onJoyVector(normX, normY);
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

  // Jump button handlers
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

  return (
    <div
      id="flat-square-game-controls"
      className="fixed inset-0 pointer-events-none z-[100] select-none"
      style={{
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      {/* ── Top Left: Flat, square menu button opening flat square dropdown ── */}
      <div
        id="flat-square-menu-container"
        className="absolute left-6 top-[max(20px,calc(env(safe-area-inset-top)+14px))] pointer-events-auto select-none"
      >
        <button
          id="btn-flat-square-menu"
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setMenuOpen((prev) => !prev);
          }}
          className="flex items-center justify-center cursor-pointer select-none p-0 outline-none active:bg-neutral-200 transition-colors bg-black border border-[color:var(--bjork-outline)] rounded-[18px]"
          style={{
            width: "52px",
            height: "52px",
          }}
          aria-label="Menu"
          title="Menu"
        >
          {/* Classic clean 3-line flat square bars */}
          <div className="flex flex-col gap-[4px] items-center justify-center pointer-events-none">
            <span className="w-5 h-[3px] bg-white block" />
            <span className="w-5 h-[3px] bg-white block" />
            <span className="w-5 h-[3px] bg-white block" />
          </div>
        </button>

        {/* Dropdown menu: same style (flat, square, grey, fully opaque) */}
        {menuOpen && (
          <div
            id="flat-square-dropdown-menu"
            className="absolute left-0 top-[calc(100%+6px)] w-44 flex flex-col z-50 select-none animate-in fade-in zoom-in-95 duration-100"
            style={{
              backgroundColor: "#7c7c7c",
              opacity: 1,
              borderRadius: 0,
              border: "1.5px solid #585858",
              boxShadow: "0 8px 20px rgba(0,0,0,0.4)",
              filter: "none",
              backdropFilter: "none",
              WebkitBackdropFilter: "none",
            }}
          >
            {/* Chat button */}
            <button
              id="btn-flat-menu-chat"
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setMenuOpen(false);
                setChatOpen(true);
              }}
              className="w-full h-11 px-3.5 flex items-center justify-between text-left text-[14px] font-semibold tracking-wide text-white hover:bg-[#686868] active:bg-[#525252] cursor-pointer select-none outline-none transition-colors"
              style={{
                backgroundColor: "#7c7c7c",
                borderRadius: 0,
                border: "none",
                borderBottom: "1.5px solid #585858",
              }}
            >
              <span>Chat</span>
              <MessageSquare className="w-4 h-4 text-white" />
            </button>

            {/* Settings button */}
            <button
              id="btn-flat-menu-settings"
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setMenuOpen(false);
                setSettingsOpen(true);
              }}
              className="w-full h-11 px-3.5 flex items-center justify-between text-left text-[14px] font-semibold tracking-wide text-white hover:bg-[#686868] active:bg-[#525252] cursor-pointer select-none outline-none transition-colors"
              style={{
                backgroundColor: "#7c7c7c",
                borderRadius: 0,
                border: "none",
                borderBottom: "1.5px solid #585858",
              }}
            >
              <span>Settings</span>
              <Settings className="w-4 h-4 text-white" />
            </button>

            {/* Leave button - only Leave works */}
            <button
              id="btn-flat-menu-leave"
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setMenuOpen(false);
                if (onLeave) {
                  onLeave();
                } else {
                  window.location.href = "/";
                }
              }}
              className="w-full h-11 px-3.5 flex items-center justify-between text-left text-[14px] font-semibold tracking-wide text-white hover:bg-[#686868] active:bg-[#525252] cursor-pointer select-none outline-none transition-colors"
              style={{
                backgroundColor: "#7c7c7c",
                borderRadius: 0,
                border: "none",
              }}
            >
              <span>Leave</span>
              <LogOut className="w-4 h-4 text-white" />
            </button>
          </div>
        )}
      </div>

      {/* ── Left Side: Mode Toggle Button + Flat Square Joystick ── */}
      <div
        className="absolute left-6 bottom-[max(24px,calc(env(safe-area-inset-bottom)+16px))] flex flex-col items-center gap-3 pointer-events-auto"
        style={{
          transform: `scale(${controlsScale})`,
          transformOrigin: "bottom left",
        }}
      >
        {/* Above the joystick: flat, square button with NO icon.
            Switches between walking, crouching, and running.
            Grey, fully opaque, not blurry. */}
        <button
          id="btn-movement-mode-toggle"
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            cycleMovementMode();
          }}
          className="cursor-pointer select-none p-0 outline-none active:brightness-85 transition-[filter]"
          style={{
            width: "56px",
            height: "56px",
            backgroundColor: "#7c7c7c",
            opacity: 1,
            borderRadius: 0,
            border: "1.5px solid #585858",
            boxShadow: "none",
            filter: "none",
            backdropFilter: "none",
            WebkitBackdropFilter: "none",
          }}
          aria-label={`Switch movement mode. Current: ${currentMode}`}
          title={`Movement Mode: ${currentMode} (Tap to switch)`}
        />

        {/* Flat, square joystick. Grey, fully opaque, not blurry. */}
        <div
          id="flat-square-joystick-base"
          ref={joystickBaseRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="relative touch-none cursor-pointer select-none p-0"
          style={{
            width: `${BASE_SIZE}px`,
            height: `${BASE_SIZE}px`,
            backgroundColor: "#7c7c7c",
            opacity: 1,
            borderRadius: 0,
            border: "1.5px solid #585858",
            boxShadow: "none",
            filter: "none",
            backdropFilter: "none",
            WebkitBackdropFilter: "none",
          }}
          aria-label="Joystick"
        >
          {/* Inner square knob: grey, fully opaque, not blurry */}
          <div
            id="flat-square-joystick-knob"
            className="absolute pointer-events-none"
            style={{
              width: `${KNOB_SIZE}px`,
              height: `${KNOB_SIZE}px`,
              left: "50%",
              top: "50%",
              transform: `translate(calc(-50% + ${knobOffset.x}px), calc(-50% + ${knobOffset.y}px))`,
              backgroundColor: joystickActive ? "#424242" : "#505050",
              opacity: 1,
              borderRadius: 0,
              border: "1.5px solid #303030",
              boxShadow: "none",
              filter: "none",
              backdropFilter: "none",
              WebkitBackdropFilter: "none",
            }}
          />
        </div>
      </div>

      {/* ── Right Side: Flat, square jump button with NO icon.
          Grey, fully opaque, not blurry. ── */}
      <div
        className="absolute right-6 bottom-[max(24px,calc(env(safe-area-inset-bottom)+16px))] pointer-events-auto"
        style={{
          transform: `scale(${controlsScale})`,
          transformOrigin: "bottom right",
        }}
      >
        <button
          id="btn-flat-square-jump"
          type="button"
          onPointerDown={handleJumpDown}
          onPointerUp={handleJumpUp}
          onPointerLeave={handleJumpUp}
          onPointerCancel={handleJumpUp}
          className="cursor-pointer select-none p-0 outline-none active:brightness-85 transition-[filter]"
          style={{
            width: "76px",
            height: "76px",
            backgroundColor: "#7c7c7c",
            opacity: 1,
            borderRadius: 0,
            border: "1.5px solid #585858",
            boxShadow: "none",
            filter: "none",
            backdropFilter: "none",
            WebkitBackdropFilter: "none",
          }}
          aria-label="Jump"
          title="Jump"
        />
      </div>

      {/* ── Fullscreen Flat Square Chat Page ── */}
      {chatOpen && (
        <FlatSquareChatModal onClose={() => setChatOpen(false)} />
      )}

      {/* ── Fullscreen Flat Square Settings Page ── */}
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
