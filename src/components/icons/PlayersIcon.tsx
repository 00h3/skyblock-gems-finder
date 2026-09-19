import React from "react";

export function PlayersIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <img
      src="https://maxwell.z3ki.dev/bot/_files/ghost-smile/ghost-smile.svg"
      alt="Players"
      className={`object-contain inline-block shrink-0 ${className}`}
      draggable={false}
      aria-hidden="true"
    />
  );
}
