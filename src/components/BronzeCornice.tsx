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
        onClick ? "cursor-pointer press active:scale-95 transition-transform" : ""
      } ${className}`}
      style={{
        width: size,
        height: size,
      }}
    >
      {/* ── Perfectly Fitted Bronze Frame (z-0) ── */}
      <div
        className="absolute -inset-[3px] rounded-[13px] pointer-events-none z-0"
        style={{
          background:
            "linear-gradient(135deg, #fce5b8 0%, #d4934b 22%, #7a3a0e 48%, #e2a559 75%, #441e08 100%)",
          boxShadow:
            "0 3px 12px rgba(45, 18, 5, 0.4), inset 0 1px 1.5px rgba(255, 255, 255, 0.7)",
          border: "1px solid rgba(85, 38, 10, 0.75)",
        }}
      >
        {/* Crisp inner bronze rim */}
        <div
          className="w-full h-full rounded-[10px]"
          style={{
            border: "1px solid rgba(255, 235, 195, 0.45)",
            boxShadow: "inset 0 1px 2px rgba(40, 15, 3, 0.5)",
          }}
        />
      </div>

      {/* ── Inner Avatar PFP Window (z-10) ── */}
      <div className="relative w-full h-full rounded-[9px] overflow-hidden z-10 bg-[#e2e6ec] dark:bg-[#1a1c22] ring-1 ring-black/15 dark:ring-white/15 shadow-inner flex items-center justify-center">
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
      className={`absolute -inset-[3px] rounded-[13px] pointer-events-none z-0 ${className}`}
      style={{
        background:
          "linear-gradient(135deg, #fce5b8 0%, #d4934b 22%, #7a3a0e 48%, #e2a559 75%, #441e08 100%)",
        boxShadow:
          "0 3px 12px rgba(45, 18, 5, 0.4), inset 0 1px 1.5px rgba(255, 255, 255, 0.7)",
        border: "1px solid rgba(85, 38, 10, 0.75)",
      }}
    >
      <div
        className="w-full h-full rounded-[10px]"
        style={{
          border: "1px solid rgba(255, 235, 195, 0.45)",
          boxShadow: "inset 0 1px 2px rgba(40, 15, 3, 0.5)",
        }}
      />
    </div>
  );
}
