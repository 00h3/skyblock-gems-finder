"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { MessageSquare, Settings, LogOut } from "lucide-react";
import { FlatSquareChatModal } from "@/components/FlatSquareChatModal";
import { FlatSquareSettingsModal } from "@/components/FlatSquareSettingsModal";

const HUD_ASSETS = {
  menu: "https://maxwell.z3ki.dev/bot/_files/menu-icon/menu-icon.png",
  video: "https://maxwell.z3ki.dev/bot/_files/video-icon/video-icon.png",
  smile: "https://maxwell.z3ki.dev/bot/_files/smile-icon/smile-icon.png",
  chat: "https://maxwell.z3ki.dev/bot/_files/chat-icon-83/chat-icon.png",
  arrow: "https://maxwell.z3ki.dev/bot/_files/arrow-icon/arrow-icon.png",
  button: "https://maxwell.z3ki.dev/bot/_files/blank-button/blank-button.png",
};

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
 * - Grey with 18% opacity, NOT blur (backdropFilter: none)
 * - Bold italic white font (cursive markdown style: ***text***)
 * - Mode toggle button displays bold italic white mode (WALK / CROUCH / RUN)
 * - Jump button displays bold italic white JUMP
 * - Menu button displays bold italic white MENU
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
    const nextMode: MovementMode =
      currentMode === "walk" ? "crouch" : currentMode === "crouch" ? "run" : "walk";

    if (onMovementModeChange) {
      onMovementModeChange(nextMode);
    } else {
      setInternalMode(nextMode);
    }

    window.dispatchEvent(
      new CustomEvent("bm-movement-mode", { detail: { mode: nextMode } }),
    );
  }, [currentMode, onMovementModeChange]);

  // Flat square joystick state
  const [joystickActive, setJoystickActive] = useState(false);
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const activePointerId = useRef<number | null>(null);

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

    const clampedX = Math.max(-MAX_TRAVEL, Math.min(MAX_TRAVEL, dx));
    const clampedY = Math.max(-MAX_TRAVEL, Math.min(MAX_TRAVEL, dy));

    setKnobOffset({ x: clampedX, y: clampedY });

    const normX = clampedX / MAX_TRAVEL;
    const normY = -(clampedY / MAX_TRAVEL);
    if (isNaN(normX) || isNaN(normY)) return;
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
      {/* ── Top Left: [Menu] [Chat] [Smile] [Video] hosted PNG button bar ── */}
      <div
        id="flat-square-menu-container"
        className="absolute left-4 sm:left-6 top-[max(16px,calc(env(safe-area-inset-top)+10px))] z-40 flex items-center gap-2 pointer-events-auto select-none"
      >
        {/* 1. Menu Button */}
        <div className="relative">
          <button
            id="btn-flat-square-menu"
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMenuOpen((prev) => !prev);
            }}
            className="relative w-11 h-11 sm:w-12 sm:h-12 active:scale-90 transition-transform cursor-pointer border-0 bg-transparent p-0 flex items-center justify-center outline-none touch-none"
            aria-label="Menu"
            title="Menu"
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

          {/* Dropdown menu */}
          {menuOpen && (
            <div
              id="flat-square-dropdown-menu"
              className="absolute left-0 top-[calc(100%+6px)] w-44 flex flex-col z-50 select-none animate-in fade-in zoom-in-95 duration-100 rounded-xl overflow-hidden border border-white/20 bg-[#1e2025]/95 backdrop-blur-xl shadow-2xl p-1"
            >
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
                className="w-full h-10 px-3 flex items-center justify-between text-left cursor-pointer select-none outline-none rounded-lg text-white hover:bg-white/10 active:bg-white/20 transition-colors"
              >
                <span className="font-bold text-[13px] tracking-wide">
                  Settings
                </span>
                <Settings className="w-4 h-4 text-amber-400" />
              </button>

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
                className="w-full h-10 px-3 flex items-center justify-between text-left cursor-pointer select-none outline-none rounded-lg text-white hover:bg-white/10 active:bg-white/20 transition-colors"
              >
                <span className="font-bold text-[13px] tracking-wide">
                  Chat
                </span>
                <MessageSquare className="w-4 h-4 text-sky-400" />
              </button>

              {/* Leave button */}
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
                className="w-full h-10 px-3 flex items-center justify-between text-left cursor-pointer select-none outline-none rounded-lg text-red-400 hover:bg-red-500/15 active:bg-red-500/25 transition-colors border-t border-white/10 mt-1"
              >
                <span className="font-bold text-[13px] tracking-wide">
                  Leave
                </span>
                <LogOut className="w-4 h-4 text-red-400" />
              </button>
            </div>
          )}
        </div>

        {/* 2. Chat Button */}
        <button
          id="btn-flat-top-chat"
          type="button"
          onClick={() => setChatOpen(true)}
          onPointerDown={(e) => {
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
          id="btn-flat-top-smile"
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

        {/* 4. Video / Camera Perspective Button */}
        <button
          id="btn-flat-top-video"
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            window.dispatchEvent(new Event("bm-toggle-cam"));
          }}
          className="relative w-11 h-11 sm:w-12 sm:h-12 active:scale-90 transition-transform cursor-pointer border-0 bg-transparent p-0 flex items-center justify-center outline-none touch-none"
          title="Toggle Camera View"
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

      {/* ── Left Side: Mode Toggle Button + Flat Square Joystick ── */}
      <div
        className="absolute left-2 sm:left-3 bottom-[max(12px,calc(env(safe-area-inset-bottom)+8px))] flex flex-col items-center gap-2 pointer-events-auto"
        style={{
          transform: `scale(${controlsScale * 1.15})`,
          transformOrigin: "bottom left",
        }}
      >
        {/* Above the joystick: flat square button, grey with 18% opacity, NOT blur,
            bold italic white font (cursive markdown style) */}
        <button
          id="btn-movement-mode-toggle"
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            cycleMovementMode();
          }}
          className="flex items-center justify-center cursor-pointer select-none p-0 outline-none active:brightness-90 transition-[filter]"
          style={{
            width: "56px",
            height: "56px",
            backgroundColor: "rgba(128, 128, 128, 0.18)",
            borderRadius: 0,
            border: "1.5px solid rgba(255, 255, 255, 0.3)",
            boxShadow: "none",
            filter: "none",
            backdropFilter: "none",
            WebkitBackdropFilter: "none",
          }}
          aria-label={`Switch movement mode. Current: ${currentMode}`}
          title={`Movement Mode: ${currentMode} (Tap to switch)`}
        >
          <span className="font-bold italic text-white text-[11px] tracking-wider uppercase select-none pointer-events-none">
            {currentMode}
          </span>
        </button>

        {/* Joystick base with directional arrows outside and button knob for pole */}
        <div
          id="flat-square-joystick-base"
          ref={joystickBaseRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="relative touch-none cursor-pointer select-none p-0 flex items-center justify-center"
          style={{
            width: `${BASE_SIZE}px`,
            height: `${BASE_SIZE}px`,
            backgroundColor: "rgba(128, 128, 128, 0.18)",
            borderRadius: 0,
            border: "1.5px solid rgba(255, 255, 255, 0.3)",
            boxShadow: "none",
            filter: "none",
            backdropFilter: "none",
            WebkitBackdropFilter: "none",
          }}
          aria-label="Joystick"
        >
          {/* Directional arrows around joystick */}
          {/* Up arrow */}
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 w-7 h-7 flex items-center justify-center pointer-events-none">
            <img
              src={HUD_ASSETS.arrow}
              alt=""
              className="w-full h-full object-contain drop-shadow"
              draggable={false}
            />
          </div>
          {/* Down arrow */}
          <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 w-7 h-7 flex items-center justify-center pointer-events-none">
            <img
              src={HUD_ASSETS.arrow}
              alt=""
              className="w-full h-full object-contain drop-shadow rotate-180"
              draggable={false}
            />
          </div>
          {/* Left arrow */}
          <div className="absolute -left-7 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center pointer-events-none">
            <img
              src={HUD_ASSETS.arrow}
              alt=""
              className="w-full h-full object-contain drop-shadow -rotate-90"
              draggable={false}
            />
          </div>
          {/* Right arrow */}
          <div className="absolute -right-7 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center pointer-events-none">
            <img
              src={HUD_ASSETS.arrow}
              alt=""
              className="w-full h-full object-contain drop-shadow rotate-90"
              draggable={false}
            />
          </div>

          {/* Pole Knob using blank button PNG */}
          <div
            id="flat-square-joystick-knob"
            className="absolute pointer-events-none flex items-center justify-center"
            style={{
              width: `${KNOB_SIZE}px`,
              height: `${KNOB_SIZE}px`,
              left: "50%",
              top: "50%",
              transform: `translate(calc(-50% + ${knobOffset.x}px), calc(-50% + ${knobOffset.y}px))`,
            }}
          >
            <img
              src={HUD_ASSETS.button}
              alt="Pole Knob"
              className="w-full h-full object-contain pointer-events-none drop-shadow-md select-none"
              draggable={false}
            />
          </div>
        </div>
      </div>

      {/* ── Right Side: Jump button using hosted blank-button PNG (no text) ── */}
      <div
        className="absolute right-3 sm:right-4 bottom-[max(12px,calc(env(safe-area-inset-bottom)+8px))] pointer-events-auto"
        style={{
          transform: `scale(${controlsScale * 1.0})`,
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
          className="relative w-[92px] h-[92px] flex items-center justify-center cursor-pointer select-none p-0 outline-none active:scale-95 transition-transform border-0 bg-transparent"
          aria-label="Jump"
          title="Jump"
        >
          <img
            src="https://maxwell.z3ki.dev/bot/_files/icon-jump/jump.png"
            alt="Jump"
            className="w-full h-full object-contain pointer-events-none drop-shadow-lg select-none"
            draggable={false}
          />
        </button>
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
