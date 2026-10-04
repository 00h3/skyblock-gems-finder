import React from "react";

export function PlayersIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <img
      src="/icons/ghost-smile-svgrepo-com.svg"
      onError={(e) => {
        (e.target as HTMLImageElement).src =
          "https://file.garden/alGOOylwpAfCa6qP/ghost-smile-svgrepo-com.svg";
      }}
      alt="Players"
      className={`object-contain inline-block shrink-0 ${className}`}
      draggable={false}
      aria-hidden="true"
    />
  );
}
