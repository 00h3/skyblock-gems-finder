import React from "react";
import { X, Sparkles, MapPin } from "lucide-react";
import { BronzeCorniceUpper } from "./BronzeCornice";

export interface UserSquareCardData {
  name: string;
  photo?: string;
  isNpc?: boolean;
  uid?: string;
  islandLevel?: number;
  bio?: string;
}

interface UserSquareCardModalProps {
  user: UserSquareCardData;
  onClose: () => void;
  onVisit?: () => void;
}

export function UserSquareCardModal({ user, onClose, onVisit }: UserSquareCardModalProps) {
  const isTutorial = user.isNpc || user.name.toLowerCase().includes("tutorial");

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm select-none font-[Inter]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Square modal styled like grey inventory with subtle orange tint */}
      <div className="square-user-card blockman-panel relative w-[320px] sm:w-[350px] aspect-square rounded-xl p-5 flex flex-col justify-between overflow-hidden border-2 border-[#121316] text-white shadow-[0_0_35px_rgba(249,115,22,0.18),0_20px_50px_rgba(0,0,0,0.85)]">
        {/* Subtle orange accent glow line on top */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-600 via-amber-500 to-orange-600" />

        {/* Header: Title and Close button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-[12px] font-bold uppercase tracking-wider text-orange-400">
              {isTutorial ? "Island Guide" : "Player Profile"}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 active:scale-90 flex items-center justify-center text-white/80 hover:text-white transition"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Center: Profile Picture + Name + Skyblock Icon */}
        <div className="flex flex-col items-center justify-center text-center my-auto">
          {/* Avatar PFP Frame with Bronze Cornice behind */}
          <div className="relative mb-3 pt-2">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-0 pointer-events-none">
              <BronzeCorniceUpper size={80} />
            </div>
            <div className="relative z-10 w-20 h-20 sm:w-22 sm:h-22 rounded-2xl bg-[#262832] border-2 border-amber-600/60 p-1 flex items-center justify-center shadow-inner overflow-hidden">
              {user.photo ? (
                <img
                  src={user.photo}
                  alt={user.name}
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : isTutorial ? (
                <img
                  src="https://maxwell.z3ki.dev/bot/_files/goggle-character/goggle_character.png"
                  alt="Island Guide"
                  className="w-full h-full object-contain drop-shadow"
                />
              ) : (
                <div className="w-full h-full rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-2xl font-black text-white">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Floating Skyblock icon badge */}
            <div
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-xl bg-[#1c1c20] border-2 border-amber-400/80 shadow-md flex items-center justify-center p-1"
              title="Skyblock Resident"
            >
              <img
                src="/textures/blocks/grass_top.png"
                alt="Skyblock"
                className="w-full h-full object-cover rounded-[4px] image-pixelated"
                onError={(e) => {
                  // Fallback icon
                  (e.currentTarget as HTMLImageElement).src =
                    "https://maxwell.z3ki.dev/bot/_files/menu-icon/menu-icon.png";
                }}
              />
            </div>
          </div>

          {/* User Name with black outline */}
          <h3
            className="text-[19px] sm:text-[21px] font-black tracking-wide text-white leading-tight"
            style={{
              textShadow:
                "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 2px 4px rgba(0,0,0,0.8)",
            }}
          >
            {user.name}
          </h3>

          {/* Skyblock badge label */}
          <div className="mt-1 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-[11px] font-bold text-amber-300">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Skyblock Island</span>
          </div>

          {isTutorial && (
            <p className="mt-2 text-[11.5px] text-white/70 max-w-[240px] leading-relaxed">
              "Welcome to Skyblock! Mix water & lava to create cobblestone and obsidian. Expand your realm!"
            </p>
          )}
        </div>

        {/* Footer: Visit Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => {
              if (onVisit) {
                onVisit();
              } else {
                onClose();
              }
            }}
            className="w-full h-10 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 hover:brightness-110 active:scale-[0.98] transition-all font-black text-[14px] text-white tracking-wider uppercase flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(249,115,22,0.35)] cursor-pointer"
            style={{
              textShadow: "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
            }}
          >
            <MapPin className="w-4 h-4 fill-white text-white" />
            <span>Visit</span>
          </button>
        </div>
      </div>
    </div>
  );
}
