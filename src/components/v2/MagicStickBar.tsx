import React, { useEffect, useState } from "react";
import {
  getMagicStickMode,
  setMagicStickMode,
  undoMagicStick,
  type MagicStickMode,
} from "@/engine-sandbox/shared/magic-stick";
import { triggerHaptic } from "@/lib/haptics";
import { playUiClick } from "@/lib/ui-sounds";

interface MagicStickBarProps {
  visible: boolean;
  onUndo?: () => void;
}

const MODES: { id: MagicStickMode; label: string; desc: string }[] = [
  { id: "extend", label: "Extend Face", desc: "Builds on matching face" },
  { id: "wall", label: "Wall 3x3", desc: "Places 3x3 vertical plane" },
  { id: "floor", label: "Floor 3x3", desc: "Places 3x3 horizontal pad" },
  { id: "line", label: "Bridge 5x1", desc: "Places 5 blocks forward" },
];

export function MagicStickBar({ visible, onUndo }: MagicStickBarProps) {
  const [mode, setMode] = useState<MagicStickMode>(() => getMagicStickMode());

  useEffect(() => {
    const handler = (e: Event) => {
      setMode((e as CustomEvent<MagicStickMode>).detail);
    };
    window.addEventListener("qb-magic-stick-mode", handler);
    return () => window.removeEventListener("qb-magic-stick-mode", handler);
  }, []);

  if (!visible) return null;

  return (
    <div className="pointer-events-auto fixed bottom-24 sm:bottom-28 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 p-1.5 rounded-2xl bg-black/75 backdrop-blur-xl border border-amber-400/40 shadow-[0_8px_32px_rgba(0,0,0,0.65),0_0_16px_rgba(251,191,36,0.25)] select-none animate-in fade-in zoom-in-95 duration-150">
      <div className="px-2 py-0.5 text-[10px] font-black tracking-wider uppercase text-amber-300 flex items-center gap-1 border-r border-white/15 mr-0.5">
        <span>MAGIC STICK</span>
      </div>

      {MODES.map((m) => {
        const active = mode === m.id;
        return (
          <button
            key={m.id}
            type="button"
            title={m.desc}
            onClick={() => {
              playUiClick(1.2);
              triggerHaptic("light");
              setMagicStickMode(m.id);
            }}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold tracking-tight transition-all cursor-pointer ${
              active
                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-[0_0_12px_rgba(245,158,11,0.6)] font-extrabold scale-105"
                : "text-white/80 hover:text-white hover:bg-white/10 active:scale-95"
            }`}
          >
            {m.label}
          </button>
        );
      })}

      <button
        type="button"
        title="Undo last magic wand placement"
        onClick={() => {
          playUiClick(0.9);
          triggerHaptic("medium");
          if (onUndo) onUndo();
          else {
            window.dispatchEvent(new CustomEvent("qb-magic-stick-trigger-undo"));
          }
        }}
        className="px-2.5 py-1 rounded-xl text-[11px] font-bold text-rose-300 hover:text-rose-100 hover:bg-rose-500/20 active:scale-95 transition-all border border-rose-500/30 cursor-pointer"
      >
        Undo
      </button>
    </div>
  );
}
