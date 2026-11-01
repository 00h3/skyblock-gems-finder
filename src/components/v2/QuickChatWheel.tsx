import React from "react";
import { triggerHaptic } from "@/lib/haptics";
import { playUiClick } from "@/lib/ui-sounds";

interface QuickChatWheelProps {
  open: boolean;
  onClose: () => void;
  onSend: (text: string) => void;
}

const PRESETS = [
  "👋 Hello!",
  "⚔️ Follow me!",
  "🛡️ Need help!",
  "✨ GG!",
  "🧱 Nice build!",
  "⚠️ Watch out!",
  "💎 Want to trade?",
  "🔥 Let's go!",
  "👍 Yes!",
  "👎 No",
  "🏃 Run!",
  "🎉 Victory!",
];

export function QuickChatWheel({ open, onClose, onSend }: QuickChatWheelProps) {
  if (!open) return null;

  const handlePick = (phrase: string) => {
    triggerHaptic("medium");
    playUiClick(1.2);
    onSend(phrase);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl bg-[#181b22]/95 border border-white/20 shadow-2xl p-4 flex flex-col gap-3 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <div>
            <div className="font-extrabold text-[15px] text-white">Quick Chat</div>
            <div className="text-[11px] text-white/50">Tap a preset phrase to send instantly</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 rounded-lg bg-white/10 text-white/80 text-[11px] font-bold hover:bg-white/20 active:scale-95 transition cursor-pointer"
          >
            Close
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto pr-1">
          {PRESETS.map((phrase) => (
            <button
              key={phrase}
              type="button"
              onClick={() => handlePick(phrase)}
              className="p-3 rounded-xl bg-white/5 hover:bg-amber-500/20 hover:border-amber-400/40 border border-white/10 text-white font-bold text-[12.5px] text-left transition-all active:scale-95 cursor-pointer shadow-sm flex items-center justify-between"
            >
              <span>{phrase}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
