"use client";

import { useState, useRef, useEffect } from "react";
import { Settings, MessageCircle, LogOut, ChevronLeft, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type MovementMode = "Crouch" | "Walk" | "Run";

interface GameControlsProps {
  onMovementModeChange: (mode: MovementMode) => void;
  onJump: (down: boolean) => void;
  onJoyVector: (x: number, y: number) => void;
  onOpenSettings: () => void;
  onOpenChat: () => void;
  onLeaveGame: () => void;
  hideInventory?: boolean;
}

const MOVEMENT_MODES: { name: MovementMode; icon: string }[] = [
  { name: "Crouch", icon: "https://maxwell.z3ki.dev/bot/_files/icon-sneak/sneak.png" },
  { name: "Walk", icon: "https://maxwell.z3ki.dev/bot/_files/icon-walk/walk.png" },
  { name: "Run", icon: "https://maxwell.z3ki.dev/bot/_files/icon-run/run.png" },
];

export function GameControls({
  onMovementModeChange,
  onJump,
  onJoyVector,
  onOpenSettings,
  onOpenChat,
  onLeaveGame,
  hideInventory = false,
}: GameControlsProps) {
  const [movementIndex, setMovementIndex] = useState(0);
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });
  const joystickRef = useRef<HTMLDivElement>(null);

  const toggleMovement = () => {
    const nextIndex = (movementIndex + 1) % MOVEMENT_MODES.length;
    setMovementIndex(nextIndex);
    onMovementModeChange(MOVEMENT_MODES[nextIndex].name);
  };

  const handleJoystick = (e: React.PointerEvent) => {
    if (!joystickRef.current) return;
    const rect = joystickRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    setJoystickPos({ x: Math.max(-1, Math.min(1, x)) * 49, y: Math.max(-1, Math.min(1, y)) * 29 });
    onJoyVector(x, -y);
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-[100]">
      {/* Settings Gear */}
      <button
        onClick={onOpenSettings}
        className="absolute top-4 left-4 w-11 h-11 pointer-events-auto"
      >
        <img src="https://maxwell.z3ki.dev/bot/_files/qblock-ui-gear/gear_icon.png" alt="Settings" className="w-full h-full object-contain" />
      </button>

      {/* Inventory */}
      {!hideInventory && (
        <div className="absolute bottom-0 left-0 w-full h-[70px]">
          <img src="https://maxwell.z3ki.dev/bot/_files/qblock-ui-bar/action_bar.png" className="w-full h-full object-fill" alt="Inventory" />
        </div>
      )}

      {/* Movement */}
      <div className="absolute left-5 bottom-[85px] pointer-events-auto">
        <button onClick={toggleMovement} className="w-16 h-16">
          <img src={MOVEMENT_MODES[movementIndex].icon} alt={MOVEMENT_MODES[movementIndex].name} className="w-full h-full object-contain" />
        </button>
      </div>

      {/* Jump */}
      <button
        onPointerDown={() => onJump(true)}
        onPointerUp={() => onJump(false)}
        className="absolute right-8 bottom-[230px] w-[74px] h-[74px] pointer-events-auto"
      >
        <img src="https://maxwell.z3ki.dev/bot/_files/icon-jump/jump.png" alt="Jump" className="w-full h-full object-contain" />
      </button>

      {/* Joystick */}
      <div
        ref={joystickRef}
        onPointerDown={handleJoystick}
        onPointerMove={(e) => e.buttons === 1 && handleJoystick(e)}
        onPointerUp={() => { setJoystickPos({ x: 0, y: 0 }); onJoyVector(0, 0); }}
        className="absolute right-5 bottom-[85px] w-[150px] h-[110px] bg-[#f1f1f1] border-2 border-[#d8d8d8] rounded-lg pointer-events-auto"
      >
        <div
          className="absolute w-14 h-14 bg-[#bdbdbd] border-2 border-[#999] rounded-md"
          style={{ left: `calc(50% + ${joystickPos.x}px)`, top: `calc(50% + ${joystickPos.y}px)`, transform: "translate(-50%, -50%)" }}
        />
      </div>
    </div>
  );
}
