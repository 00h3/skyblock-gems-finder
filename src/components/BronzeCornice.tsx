import React from "react";

/**
 * Simple square bronze frame for avatars in Settings, Profile, and user cards.
 * Clean, modern metallic bronze square frame that sits behind the PFP.
 */

export function BronzeCorniceUpper(_props: { className?: string; size?: number }) {
  // Simple square frame: no protruding arch/pediment on top
  return null;
}

export function BronzeCorniceAvatar({
  children,
  size = 62,
  className = "",
  onClick,
  title,
}: {
  children: React.ReactNode;
  size?: number;
  className?: string;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <div
      onClick={onClick}
      title={title}
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${
        onClick ? "cursor-pointer press" : ""
      } ${className}`}
      style={{
        width: size,
        height: size,
      }}
    >
      {/* ── Simple Square Bronze Frame — BEHIND PFP (z-0) ── */}
      <div
        className="absolute -inset-[3.5px] rounded-[10px] pointer-events-none z-0"
        style={{
          background:
            "linear-gradient(135deg, #f5d8a8 0%, #c48238 24%, #6e350d 50%, #d89849 78%, #3e1b06 100%)",
          boxShadow:
            "0 3px 10px rgba(45, 18, 5, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.6)",
          border: "1px solid rgba(75, 33, 8, 0.65)",
        }}
      >
        {/* Subtle inner square bevel line */}
        <div
          className="w-full h-full rounded-[8px]"
          style={{
            border: "1px solid rgba(255, 225, 175, 0.35)",
            boxShadow: "inset 0 1px 2px rgba(40, 15, 3, 0.45)",
          }}
        />
      </div>

      {/* ── Inner Content (Avatar PFP) — IN FRONT OF FRAME (z-10) ── */}
      <div className="relative w-full h-full rounded-[7px] overflow-hidden z-10 bg-[#e2e6ec] dark:bg-[#1a1c22] ring-1 ring-black/10 dark:ring-white/10 shadow-sm">
        {children}
      </div>
    </div>
  );
}

export function BronzeCorniceOverlay({
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={`absolute -inset-[3.5px] rounded-[10px] pointer-events-none z-0 ${className}`}
      style={{
        background:
          "linear-gradient(135deg, #f5d8a8 0%, #c48238 24%, #6e350d 50%, #d89849 78%, #3e1b06 100%)",
        boxShadow:
          "0 3px 10px rgba(45, 18, 5, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.6)",
        border: "1px solid rgba(75, 33, 8, 0.65)",
      }}
    >
      <div
        className="w-full h-full rounded-[8px]"
        style={{
          border: "1px solid rgba(255, 225, 175, 0.35)",
          boxShadow: "inset 0 1px 2px rgba(40, 15, 3, 0.45)",
        }}
      />
    </div>
  );
}
