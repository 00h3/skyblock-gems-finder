import React from "react";

export function PlayersIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  const iconUrl = "/icons/player-icon-custom.png";
  return (
    <span
      className={`inline-block shrink-0 ${className}`}
      style={{
        maskImage: `url(${iconUrl})`,
        WebkitMaskImage: `url(${iconUrl})`,
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
        background: "linear-gradient(135deg, #ff7a52 0%, #fa4616 50%, #d93800 100%)",
        verticalAlign: "middle",
      }}
      aria-hidden="true"
    />
  );
}
