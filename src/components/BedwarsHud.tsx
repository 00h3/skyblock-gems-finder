import { useState, useRef, useEffect, type RefObject } from "react";
import { Link } from "@tanstack/react-router";
import { Box, Settings, MessageSquare, LogOut, RefreshCw } from "lucide-react";
import { BLOCKS } from "@/engine-sandbox/shared/world";
import { FlatSquareGameControls } from "@/components/FlatSquareGameControls";

export const HUD_ASSETS = {
  // Joystick Base Ring & Center Knob
  poleBg: "https://maxwell.z3ki.dev/bot/_files/dark-gui-btn-blue/dark_gui_material_btn_bg_blue.png",
  poleCenter: "/assets/hud/pitch_black/dark_pole_pole_center.png",
  button: "https://maxwell.z3ki.dev/bot/_files/blank-button/blank-button.png",
  arrow: "https://maxwell.z3ki.dev/bot/_files/arrow-icon/arrow-icon.png",

  // Directional Arrows
  arrowUp: "/assets/hud/pitch_black/dark_arrow_key_shang.png",
  arrowUpPressed: "/assets/hud/pitch_black/dark_arrow_key_shang_pre.png",
  arrowDown: "/assets/hud/pitch_black/dark_arrow_key_xia.png",
  arrowLeft: "/assets/hud/pitch_black/dark_arrow_key_zuo.png",
  arrowRight: "/assets/hud/pitch_black/dark_arrow_key_you.png",
  arrowUpRight: "/assets/hud/pitch_black/dark_arrow_key_youxieshang.png",
  arrowUpLeft: "/assets/hud/pitch_black/dark_arrow_key_zuoxieshang.png",

  // Action & Navigation
  jumpIcon: "/ui/icon-jump.png",
  
  // Movement States (Custom Assets)
  sprintIcon: "/ui/icon-run.png",
  crouchIcon: "/ui/icon-crouch.png",
  runIcon: "/ui/icon-run.png",
  walkIcon: "/ui/icon-walk.png",

  // System GUI
  chatIcon: "/assets/hud/pitch_black/dark_gui_material_chat_icon.png",
  closeIcon: "/assets/hud/pitch_black/dark_gui_material_guanbianniu.png",
  settingsCube: "/assets/hud/v2/settings_cube.png",
  gearIcon: "https://maxwell.z3ki.dev/bot/_files/qblock-ui-gear/gear_icon.png",

  inventorySquare: "/assets/hud/v2/inventory_square.png",
};

export type MovementMode = "walk" | "run" | "crouch";

export type BedwarsHudProps = {
  // Legacy / optional values passed from parent; HP and Food are removed from HUD display
  hp?: number;
  maxHp?: number;
  hunger?: number;
  runesTimeLeft?: number;
  hotbar: (number | string)[];
  tileUrls: Record<number | string, string>;
  slot: number;
  isTouch: boolean;
  thirdPerson: boolean;
  bedSafe?: boolean;
  isSkyblock?: boolean;
  isBlockFall?: boolean;
  nearChest?: boolean;
  onOpenChest?: () => void;
  onSelectSlot: (index: number) => void;
  onOpenInventory: () => void;
  onOpenChat: () => void;
  onOpenSettings?: () => void;
  onToggleCamera: () => void;
  onJump: (down: boolean) => void;
  onPlace?: (down: boolean) => void;
  onJoyVector?: (x: number, y: number) => void;
  movementMode?: MovementMode;
  onMovementModeChange?: (mode: MovementMode) => void;
  onRequestQuit?: () => void;
  onLeave?: () => void;
  celestialNight?: boolean;
  onToggleCelestialNight?: () => void;

  // Backwards-compat props if passed
  joyRef?: RefObject<HTMLDivElement | null>;
  joyNub?: { x: number; y: number };
  onJoyDown?: (e: React.PointerEvent) => void;
  onJoyMove?: (e: React.PointerEvent) => void;
  onJoyUp?: () => void;
  onEatFood?: () => void;
};

export function BedwarsHud({
  runesTimeLeft = 600,
  hotbar,
  tileUrls,
  slot,
  isTouch = true,
  thirdPerson,
  bedSafe = true,
  isSkyblock = false,
  isBlockFall = false,
  nearChest = false,
  celestialNight = false,
  onToggleCelestialNight,
  onOpenChest,
  onSelectSlot,
  onOpenInventory,
  onOpenChat,
  onOpenSettings,
  onToggleCamera,
  onJump,
  onPlace,
  onJoyVector,
  movementMode: controlledMode,
  onMovementModeChange,
  onLeave,
  onJoyDown,
  onJoyMove,
  onJoyUp,
  onRequestQuit,
}: BedwarsHudProps) {
  // Local state for movement state if not controlled externally
  const [internalMode, setInternalMode] = useState<MovementMode>("walk");
  const [cubeMenuOpen, setCubeMenuOpen] = useState(false);
  const currentMode = controlledMode ?? internalMode;

  const cycleMovementMode = () => {
    // Crouch -> Walk -> Run -> repeat
    const next: MovementMode =
      currentMode === "crouch" ? "walk" : currentMode === "walk" ? "run" : "crouch";
    if (onMovementModeChange) {
      onMovementModeChange(next);
    } else {
      setInternalMode(next);
    }
  };

  // Dynamic movement joystick state
  const [joystick, setJoystick] = useState<{
    active: boolean;
    pointerId: number | null;
    cx: number;
    cy: number;
    knobX: number;
    knobY: number;
  }>({
    active: false,
    pointerId: null,
    cx: 0,
    cy: 0,
    knobX: 0,
    knobY: 0,
  });

  const touchZoneRef = useRef<HTMLDivElement | null>(null);

  const handleTouchZoneDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only track primary touch or when not already active
    if (joystick.active) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    const px = e.clientX;
    const py = e.clientY;

    // Keep joystick comfortably within screen bounds
    const radius = 58;
    const clampedX = Math.max(radius + 12, Math.min(window.innerWidth * 0.5 - radius, px));
    const clampedY = Math.max(radius + 12, Math.min(window.innerHeight - radius - 12, py));

    setJoystick({
      active: true,
      pointerId: e.pointerId,
      cx: clampedX,
      cy: clampedY,
      knobX: 0,
      knobY: 0,
    });

    onJoyVector?.(0, 0);
    onJoyDown?.(e);
  };

  const handleTouchZoneMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!joystick.active || e.pointerId !== joystick.pointerId) return;

    const dx = e.clientX - joystick.cx;
    const dy = e.clientY - joystick.cy;
    const dist = Math.hypot(dx, dy);
    const maxTravel = 44;

    let knobX = dx;
    let knobY = dy;
    if (dist > maxTravel) {
      knobX = (dx / dist) * maxTravel;
      knobY = (dy / dist) * maxTravel;
    }

    setJoystick((prev) => ({ ...prev, knobX, knobY }));

    // Send normalized vector (-1 to 1) to game engine
    const normX = knobX / maxTravel;
    const normY = -(knobY / maxTravel); // invert Y: up on screen is positive forward
    onJoyVector?.(normX, normY);
    onJoyMove?.(e);
  };

  const handleTouchZoneUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== joystick.pointerId) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    setJoystick({
      active: false,
      pointerId: null,
      cx: 0,
      cy: 0,
      knobX: 0,
      knobY: 0,
    });

    onJoyVector?.(0, 0);
    onJoyUp?.();
  };

  // Clean up if window loses focus or pointer is canceled
  useEffect(() => {
    const onWindowBlur = () => {
      setJoystick({
        active: false,
        pointerId: null,
        cx: 0,
        cy: 0,
        knobX: 0,
        knobY: 0,
      });
      onJoyVector?.(0, 0);
      onJoyUp?.();
    };
    window.addEventListener("pointercancel", onWindowBlur);
    window.addEventListener("blur", onWindowBlur);
    return () => {
      window.removeEventListener("pointercancel", onWindowBlur);
      window.removeEventListener("blur", onWindowBlur);
    };
  }, [onJoyVector, onJoyUp]);

  // Movement mode icon selector
  const currentModeIcon =
    currentMode === "crouch"
      ? HUD_ASSETS.crouchIcon
      : currentMode === "run"
        ? HUD_ASSETS.runIcon
        : HUD_ASSETS.walkIcon;

  // For both Skyblock and Blockfall: Remove all UI elements (timers, hotbars, runes, etc.)
  // and render ONLY flat square joystick, flat square jump button, flat square mode toggle button, and top-left flat square menu.
  if (isSkyblock || isBlockFall) {
    return (
      <FlatSquareGameControls
        movementMode={currentMode}
        onMovementModeChange={(mode) => {
          if (onMovementModeChange) onMovementModeChange(mode);
          else setInternalMode(mode);
        }}
        onJump={onJump}
        onJoyVector={onJoyVector ?? (() => {})}
        onLeave={onLeave || onRequestQuit}
      />
    );
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[85] select-none">
      {/* Top Left: BedWars bed status or natural empty space (HP and Food UI removed completely) */}
      {!isSkyblock && bedSafe !== undefined && (
        <div className="pointer-events-auto absolute left-3 top-[max(12px,calc(env(safe-area-inset-top)+8px))] flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-[14px] bg-[#3f434d]/90 px-3.5 py-2 text-[12px] font-bold text-white shadow-sm backdrop-blur-sm border border-white/10">
            <span
              className={`h-2.5 w-2.5 rounded-full ${bedSafe ? "bg-emerald-400" : "bg-rose-500 animate-pulse"}`}
            />
            <span className="tracking-wide">{bedSafe ? "Bed Safe" : "Bed Destroyed"}</span>
          </div>
        </div>
      )}

      {/* LEFT CUBE MENU BUTTON (Login Style) FOR SKYBLOCK ──────────────── */}
      {isSkyblock && (
        <div className="absolute left-3 top-[max(12px,env(safe-area-inset-top))] z-30 pointer-events-auto">
          <div className="relative">
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setCubeMenuOpen((o) => !o);
              }}
              className="h-10 w-10 rounded-xl bg-gradient-to-b from-zinc-700 via-zinc-800 to-zinc-900 border border-white/20 shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.25)] flex items-center justify-center text-white active:scale-95 transition-transform cursor-pointer"
              title="Game Menu"
              aria-label="Game Menu"
            >
              <img src={HUD_ASSETS.gearIcon} className="w-6 h-6 object-contain" alt="Menu" />
            </button>

            {cubeMenuOpen && (
              <div
                className="absolute left-0 top-12 w-48 rounded-xl border border-white/15 bg-[#1e2025]/95 backdrop-blur-xl shadow-2xl p-1.5 flex flex-col gap-1 z-50 text-white animate-in fade-in zoom-in-95 duration-100"
                onPointerDown={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    setCubeMenuOpen(false);
                    onOpenSettings?.();
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-bold text-zinc-200 hover:bg-white/10 hover:text-white text-left transition cursor-pointer"
                >
                  <Settings className="w-4 h-4 text-amber-400" />
                  <span>Game Settings</span>
                </button>

                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    setCubeMenuOpen(false);
                    onOpenChat?.();
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-bold text-zinc-200 hover:bg-white/10 hover:text-white text-left transition cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4 text-sky-400" />
                  <span>Chat</span>
                </button>

                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    setCubeMenuOpen(false);
                    onRequestQuit?.();
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-bold text-red-400 hover:bg-red-500/15 text-left transition cursor-pointer border-t border-white/10 mt-0.5"
                >
                  <LogOut className="w-4 h-4 text-red-400" />
                  <span>Leave</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Top Center: Game Mode Pill */}
      {isSkyblock ? (
        <div className="pointer-events-auto absolute left-1/2 top-[max(12px,calc(env(safe-area-inset-top)+8px))] flex -translate-x-1/2 items-center gap-2">
          <div className="flex items-center gap-2 rounded-[14px] bg-[#22242a]/90 px-3 py-1.5 shadow-md backdrop-blur-md border border-white/10">
            <img
              src="/banners/skyblock.png"
              alt="SkyBlock"
              className="h-5 w-5 rounded-[6px] object-cover shadow-xs"
              draggable={false}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <span className="text-[11.5px] font-black tracking-wider text-white">SKYBLOCK</span>
          </div>
        </div>
      ) : (
        <div className="pointer-events-none absolute left-1/2 top-[max(12px,calc(env(safe-area-inset-top)+8px))] flex -translate-x-1/2 items-center gap-2.5 rounded-[14px] bg-[#22242a]/90 px-3.5 py-1.5 shadow-sm backdrop-blur-sm border border-white/10">
          <img
            src="/runes-magnify.png"
            alt=""
            className="h-5 w-5 rounded-[6px] object-cover"
            draggable={false}
          />
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-white">
            <span>Runes</span>
            <span className="text-amber-300">{formatCountdown(runesTimeLeft)}</span>
          </div>
        </div>
      )}

      {/* Top Right: Minimal floating icons without bulky button holders (Only for non-skyblock) */}
      {!isSkyblock && (
        <div className="pointer-events-auto absolute right-3 top-[max(12px,calc(env(safe-area-inset-top)+8px))] flex items-center gap-2.5">
          {/* Camera Toggle */}
          <button
            type="button"
            onClick={onToggleCamera}
            className="flex h-9 px-2.5 items-center justify-center rounded-[10px] bg-black/50 hover:bg-black/70 active:scale-95 text-white/95 text-[11px] font-black tracking-tight border border-white/15 transition-all backdrop-blur-xs cursor-pointer shadow-sm"
            aria-label="Toggle camera view"
          >
            {thirdPerson ? "3P" : "1P"}
          </button>

          {/* Chat Button (raw dark icon, no button holder) */}
          <button
            type="button"
            onClick={onOpenChat}
            className="p-0 border-0 bg-transparent outline-none active:scale-90 transition-transform cursor-pointer"
            aria-label="Open chat"
          >
            <img
              src={HUD_ASSETS.chatIcon}
              alt="Chat"
              className="h-10 w-10 object-contain pointer-events-none drop-shadow-md"
              draggable={false}
            />
          </button>

          {/* Settings Button (raw dark icon, no button holder) */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="p-0 border-0 bg-transparent outline-none active:scale-90 transition-transform cursor-pointer"
            aria-label="Open settings"
          >
            <img
              src={HUD_ASSETS.settingsCube}
              alt="Settings"
              className="h-10 w-10 object-contain pointer-events-none drop-shadow-md"
              draggable={false}
            />
          </button>

          {/* Exit/Leave Match (raw close X icon, no button holder) */}
          {onLeave ? (
            <button
              type="button"
              onClick={onLeave}
              className="p-0 border-0 bg-transparent outline-none active:scale-90 transition-transform cursor-pointer"
              aria-label="Leave game"
            >
              <img
                src={HUD_ASSETS.closeIcon}
                alt="Leave"
                className="h-10 w-10 object-contain pointer-events-none drop-shadow-md"
                draggable={false}
              />
            </button>
          ) : (
            <Link
              to="/"
              className="p-0 border-0 bg-transparent outline-none active:scale-90 transition-transform cursor-pointer flex items-center justify-center"
              aria-label="Leave game"
            >
              <img
                src={HUD_ASSETS.closeIcon}
                alt="Leave"
                className="h-10 w-10 object-contain pointer-events-none drop-shadow-md"
                draggable={false}
              />
            </Link>
          )}
        </div>
      )}

      {/* Bottom Center: Hotbar + Flat Grey Inventory Button */}
      <div className="pointer-events-auto absolute inset-x-0 bottom-[max(10px,env(safe-area-inset-bottom))] flex flex-col items-center gap-2 px-3">
        {nearChest && onOpenChest && !isSkyblock && (
          <button
            type="button"
            onClick={onOpenChest}
            className="flex items-center gap-2 rounded-[12px] bg-[#f59e0b] px-4 py-2 text-[11px] font-black uppercase tracking-wider text-white shadow-md active:scale-95 animate-pulse border border-white/20 transition-all"
            aria-label="Open chest"
          >
            <span className="text-base leading-none">📦</span>
            Open Chest
          </button>
        )}

        <div className="flex items-center gap-1 rounded-[16px] border border-black/10 bg-white/95 p-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.18)] backdrop-blur-md">
          {/* Hotbar Slots */}
          {hotbar.map((id, i) => (
            <button
              key={`${id}-${i}`}
              type="button"
              onClick={() => onSelectSlot(i)}
              className={`relative grid h-9 w-9 place-items-center rounded-[10px] transition-transform active:scale-90 ${
                slot === i ? "scale-105" : "opacity-90"
              }`}
              aria-label={`Slot ${i + 1}`}
            >
              <span
                className={`absolute inset-0 rounded-[10px] border transition-colors ${
                  slot === i
                    ? "border-[#2d3037] bg-slate-100 shadow-[0_0_0_1.5px_#2d3037]"
                    : "border-slate-200 bg-slate-50 hover:border-slate-300"
                }`}
              />
              {tileUrls[id] && (
                <img
                  src={tileUrls[id]}
                  alt=""
                  draggable={false}
                  className="relative h-5 w-5 rounded-[3px] object-cover"
                />
              )}
              {id === "short_sword" && (
                <span
                  className="relative text-[18px] leading-none text-slate-800"
                  aria-hidden="true"
                >
                  ⚔
                </span>
              )}
            </button>
          ))}

          {/* Inventory/Movement toggle - HIDE inventory if Skyblock or BlockFall, always show movement toggle */}
          {!isSkyblock && !isBlockFall && (
            <button
              type="button"
              onClick={onOpenInventory}
              className="relative grid h-8 w-8 place-items-center rounded-[8px] bg-[#34373e] hover:bg-[#3e424b] active:scale-95 border border-[#4a505c] transition-all"
              aria-label="Open inventory"
            >
              <img
                src={HUD_ASSETS.inventorySquare}
                alt="Inventory"
                className="h-4 w-4 object-contain pointer-events-none opacity-90"
                draggable={false}
              />
            </button>
          )}
          {!isSkyblock && !isBlockFall && (
            <button
              type="button"
              onClick={cycleMovementMode}
              className="relative grid h-8 w-8 place-items-center rounded-[8px] bg-[#34373e] hover:bg-[#3e424b] active:scale-95 border border-[#4a505c] transition-all"
              aria-label="Toggle movement"
            >
              <img
                src={currentModeIcon}
                alt="Movement"
                className="h-4 w-4 object-contain pointer-events-none opacity-90"
                draggable={false}
              />
            </button>
          )}
        </div>
      </div>

      {/* Touch Interaction Layer */}
      {isTouch && (
        <>
          {/* Movement touch capture zone (left half of screen) */}
          <div
            ref={touchZoneRef}
            onPointerDown={handleTouchZoneDown}
            onPointerMove={handleTouchZoneMove}
            onPointerUp={handleTouchZoneUp}
            onPointerCancel={handleTouchZoneUp}
            className="pointer-events-auto fixed left-0 bottom-0 w-[45vw] max-w-[340px] h-[65vh] z-[86] touch-none select-none"
          />

          {/* Dynamic Movement Joystick: directional arrows outside, clean dark pole ring & knob inside */}
          <div
            className={`pointer-events-none fixed z-[92] select-none transition-opacity duration-150 ${
              joystick.active ? "opacity-100" : "opacity-0"
            }`}
            style={{
              left: joystick.cx ? joystick.cx - 64 : 0,
              top: joystick.cy ? joystick.cy - 64 : 0,
              width: 128,
              height: 128,
            }}
          >
            {/* Directional arrows independently positioned OUTSIDE the joystick circle */}
            {/* Up -> top side */}
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 w-8 h-8 flex items-center justify-center pointer-events-none">
              <img
                src={HUD_ASSETS.arrow}
                alt="Up"
                className="w-full h-full object-contain drop-shadow-md"
                draggable={false}
              />
            </div>

            {/* Down -> bottom side */}
            <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 w-8 h-8 flex items-center justify-center pointer-events-none">
              <img
                src={HUD_ASSETS.arrow}
                alt="Down"
                className="w-full h-full object-contain drop-shadow-md rotate-180"
                draggable={false}
              />
            </div>

            {/* Left -> left side */}
            <div className="absolute -left-7 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center pointer-events-none">
              <img
                src={HUD_ASSETS.arrow}
                alt="Left"
                className="w-full h-full object-contain drop-shadow-md -rotate-90"
                draggable={false}
              />
            </div>

            {/* Right -> right side */}
            <div className="absolute -right-7 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center pointer-events-none">
              <img
                src={HUD_ASSETS.arrow}
                alt="Right"
                className="w-full h-full object-contain drop-shadow-md rotate-90"
                draggable={false}
              />
            </div>

            {/* Authentic Pitch-Dark Joystick Base Ring */}
            <div className="relative h-full w-full flex items-center justify-center">
              <img
                src={HUD_ASSETS.poleBg}
                alt=""
                className="absolute inset-0 h-full w-full object-contain pointer-events-none drop-shadow-md select-none"
                draggable={false}
              />

              {/* Centered moving pole knob using button PNG */}
              <div
                className="absolute h-14 w-14 -ml-7 -mt-7 left-1/2 top-1/2 flex items-center justify-center pointer-events-none select-none transition-transform duration-75"
                style={{
                  transform: `translate(${joystick.knobX}px, ${joystick.knobY}px)`,
                }}
              >
                <img
                  src={HUD_ASSETS.button}
                  alt="Pole Knob"
                  className="w-full h-full object-contain pointer-events-none drop-shadow-lg select-none"
                  draggable={false}
                />
              </div>
            </div>
          </div>

          {/* Right-Side Controls: Movement state & Jump (NO button holders, pure icons) */}
          <div className="pointer-events-auto fixed right-4 bottom-[max(20px,calc(env(safe-area-inset-bottom)+14px))] z-[88] flex flex-col items-center gap-3 select-none">
            {/* Crouch / Walk / Run state control icon positioned ABOVE Jump */}
            {isSkyblock ? (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => onMovementModeChange?.("walk")}
                  className={`p-0 border-0 bg-transparent outline-none active:scale-95 transition-transform cursor-pointer select-none ${currentMode === 'walk' ? 'opacity-100' : 'opacity-60'}`}
                  aria-label="Walk"
                >
                  <img src={HUD_ASSETS.walkIcon} alt="Walk" className="h-[51px] w-[51px] object-contain pointer-events-none drop-shadow-md" draggable={false} />
                </button>
                <button
                  type="button"
                  onClick={() => onMovementModeChange?.("run")}
                  className={`p-0 border-0 bg-transparent outline-none active:scale-95 transition-transform cursor-pointer select-none ${currentMode === 'run' ? 'opacity-100' : 'opacity-60'}`}
                  aria-label="Run"
                >
                  <img src={HUD_ASSETS.runIcon} alt="Run" className="h-[51px] w-[51px] object-contain pointer-events-none drop-shadow-md" draggable={false} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={cycleMovementMode}
                className="p-0 border-0 bg-transparent outline-none active:scale-95 transition-transform cursor-pointer select-none"
                aria-label={`Movement state: ${currentMode}. Tap to change.`}
              >
                <img
                  src={currentModeIcon}
                  alt={currentMode}
                  className="h-16 w-16 object-contain pointer-events-none drop-shadow-md"
                  draggable={false}
                />
              </button>
            )}

            {/* Jump Button (raw dark jump button, NO holder) */}
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                onJump(true);
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                onJump(false);
              }}
              onPointerLeave={(e) => {
                e.preventDefault();
                onJump(false);
              }}
              onPointerCancel={(e) => {
                e.preventDefault();
                onJump(false);
              }}
              className="p-0 border-0 bg-transparent outline-none active:scale-95 transition-transform cursor-pointer select-none"
              aria-label="Jump"
            >
              <img
                src={HUD_ASSETS.jumpIcon}
                alt="Jump"
                className="h-[74px] w-[74px] sm:h-[83px] sm:w-[83px] object-contain pointer-events-none drop-shadow-md"
                draggable={false}
              />
            </button>
          </div>

          {/* Build/Place/Shoot Quick Action Trigger (positioned left of Jump, NO button holder) */}
          <div className="pointer-events-auto fixed right-[88px] bottom-[max(20px,calc(env(safe-area-inset-bottom)+14px))] z-[88] select-none">
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                onPlace?.(true);
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                onPlace?.(false);
              }}
              onPointerLeave={(e) => {
                e.preventDefault();
                onPlace?.(false);
              }}
              onPointerCancel={(e) => {
                e.preventDefault();
                onPlace?.(false);
              }}
              className="p-0 border-0 bg-transparent outline-none active:scale-90 transition-transform cursor-pointer select-none"
              aria-label="Action"
            >
              <img
                src={HUD_ASSETS.rightShoot}
                alt="Action"
                className="h-14 w-14 object-contain pointer-events-none drop-shadow-md"
                draggable={false}
              />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function formatCountdown(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
