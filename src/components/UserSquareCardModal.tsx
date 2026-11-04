import React from "react";
import { X, Sparkles, MapPin } from "lucide-react";
import { BronzeCorniceUpper } from "./BronzeCornice";
import { getAvatarViewerUrl } from "@/lib/avatar";
import { VerifiedTick } from "@/components/VerifiedTick";

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
  const lowerName = user.name.toLowerCase();
  const isH3 = lowerName === "h3" || lowerName === "00h3" || lowerName === "ira" || lowerName === "hr" || lowerName === "ira/hr" || lowerName.includes("h3") || lowerName.includes("ira") || lowerName.includes("hr");
  const displayName = isH3 ? "h3" : user.name;
  const isStr = lowerName === "str" || lowerName.includes("str");
  const isCat = lowerName === "cat" || lowerName === "@cat" || lowerName.includes("cat");

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm select-none font-[Inter]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Square modal styled like grey inventory with subtle orange tint */}
      <div className="square-user-card blockman-panel relative w-[320px] sm:w-[350px] aspect-square rounded-2xl p-5 flex flex-col justify-between overflow-hidden border-2 border-[#121316] text-white shadow-[0_0_35px_rgba(249,115,22,0.18),0_20px_50px_rgba(0,0,0,0.85)]">
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

        {/* Center: Profile 3D Webview + Squircle PFP + Name + Skyblock Icon */}
        <div className="flex flex-col items-center justify-center text-center my-auto">
          {/* Avatar 3D Webview Frame with Bronze Cornice behind */}
          <div className="relative mb-2.5 pt-2">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-0 pointer-events-none">
              <BronzeCorniceUpper size={80} />
            </div>
            <div className="relative z-10 w-24 h-24 sm:w-26 sm:h-26 rounded-2xl bg-[#1d1f27] border-2 border-amber-600/60 p-0.5 flex items-center justify-center shadow-inner overflow-hidden">
              {isTutorial ? (
                <img
                  src="https://maxwell.z3ki.dev/bot/_files/goggle-character/goggle_character.png"
                  alt="Island Guide"
                  className="w-full h-full object-contain drop-shadow"
                />
              ) : (
                <iframe
                  src={getAvatarViewerUrl({
                    username: displayName,
                    customId: user.uid,
                    isH3,
                    isStr,
                  })}
                  className="w-full h-full border-0 absolute inset-0 bg-transparent pointer-events-none"
                  style={{ border: "none" }}
                  loading="lazy"
                  title={`${displayName} 3D Avatar`}
                />
              )}
            </div>

            {/* Floating Skyblock icon badge */}
            <div
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg bg-[#1c1c20] border-2 border-amber-400/80 shadow-md flex items-center justify-center p-1 z-20"
              title="Skyblock Resident"
            >
              <img
                src="/textures/blocks/grass_top.png"
                alt="Skyblock"
                className="w-full h-full object-cover rounded-[3px] image-pixelated"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    "/assets/qblock-ui-kit/kit/assets/icons/icon-cube.png";
                }}
              />
            </div>
          </div>

          {/* User Name with squircle PFP next to it */}
          <div className="flex items-center justify-center gap-2 mt-1">
            {/* Squircle PFP part */}
            <div className="w-7 h-7 rounded-[9px] overflow-hidden bg-gradient-to-br from-orange-500 to-amber-600 border border-white/20 shadow-xs flex items-center justify-center text-xs font-black text-white shrink-0">
              {isH3 ? (
                <img src="https://maxwell.z3ki.dev/bot/cyberpunk-model-preview/" alt="h3" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
              ) : user.photo ? (
                <img src={user.photo} alt="" className="w-full h-full object-cover" />
              ) : (
                displayName.charAt(0).toUpperCase()
              )}
            </div>

            <h3
              className={`text-[18px] sm:text-[20px] font-black tracking-wide leading-tight ${
                isH3
                  ? "bg-gradient-to-r from-[#fa4616] via-[#ff7a00] to-[#ffa726] bg-clip-text text-transparent"
                  : isStr
                    ? "bg-gradient-to-r from-[#ec4899] via-[#f472b6] to-[#fb7185] bg-clip-text text-transparent"
                    : isCat
                      ? "bg-gradient-to-r from-[#8b5cf6] via-[#a855f7] to-[#d946ef] bg-clip-text text-transparent"
                      : "text-white"
              }`}
              style={{
                textShadow:
                  isH3 || isStr || isCat
                    ? "none"
                    : "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 2px 4px rgba(0,0,0,0.8)",
              }}
            >
              {displayName}
            </h3>

            {/* Verified tick for h3, pink tick for str */}
            {isH3 && <VerifiedTick badgeType="verified" size={18} />}
            {isStr && <VerifiedTick badgeType="pink" size={18} />}
          </div>

          {/* Skyblock badge label */}
          <div className="mt-1.5 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-[11px] font-bold text-amber-300">
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
