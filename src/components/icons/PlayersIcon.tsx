import React from "react";

export function PlayersIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <img
      src="https://file.garden/alGOOylwpAfCa6qP/ghost-smile-svgrepo-com.svg"
      alt="Players"
      className={`object-contain inline-block shrink-0 ${className}`}
      style={{ filter: "hue-rotate(180deg) saturate(2)" }}
      draggable={false}
      aria-hidden="true"
    />
  );
}
