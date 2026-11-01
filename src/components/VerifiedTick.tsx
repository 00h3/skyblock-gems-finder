import React from "react";

export type BadgeType = "verified" | "character" | "event" | "cod" | "youtuber" | "pink" | "pink-tick";

export function VerifiedTick({
  className = "",
  size = 24,
  badgeType = "verified",
  interactive = false,
}: {
  className?: string;
  size?: number;
  badgeType?: BadgeType;
  interactive?: boolean;
}) {
  const badgeUrls: Record<string, string> = {
    verified: "https://file.garden/alGOOylwpAfCa6qP/IMG_7218.png",
    character: "https://file.garden/alGOOylwpAfCa6qP/IMG_7216.png",
    event: "/assets/ui/icon-events.svg",
    cod: "https://file.garden/alGOOylwpAfCa6qP/IMG_7220.png",
    youtuber: "/badges/youtuber-star.png",
  };

  if (badgeType === "pink" || badgeType === "pink-tick") {
    return (
      <span
        className={`inline-flex items-center justify-center shrink-0 select-none ${className}`}
        style={{ width: size, height: size }}
        title="Verified (Pink)"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-full w-full drop-shadow-[0_2px_5px_rgba(236,72,153,0.45)]">
          <path
            d="M12 2l2.3 2.1 3.1-.3 1.2 2.9 3 1.3-.6 3.1 1.7 2.6-2.2 2.2-.1 3.2-3.1.8-1.6 2.7-3-1-3 1-1.6-2.7-3.1-.8-.1-3.2-2.2-2.2 1.7-2.6-.6-3.1 3-1.3 1.2-2.9 3.1.3L12 2z"
            fill="url(#pinkTickGrad)"
          />
          <path
            d="M8.5 12.2l2.5 2.5 5-5"
            stroke="#ffffff"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <defs>
            <linearGradient id="pinkTickGrad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
              <stop stopColor="#f472b6" />
              <stop offset="0.5" stopColor="#ec4899" />
              <stop offset="1" stopColor="#db2777" />
            </linearGradient>
          </defs>
        </svg>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 select-none ${className}`}
      style={{ width: size, height: size }}
    >
      {badgeType === "verified" ? (
        <img
          src="https://file.garden/alGOOylwpAfCa6qP/IMG_7218.png"
          alt="Verified Tick"
          className="h-full w-full object-contain drop-shadow-[0_2px_4px_rgba(0,132,255,0.35)]"
          referrerPolicy="no-referrer"
        />
      ) : badgeType === "character" ? (
        <img
          src="https://file.garden/alGOOylwpAfCa6qP/IMG_7216.png"
          alt="Character"
          className="h-full w-full object-contain drop-shadow-[0_2px_4px_rgba(245,158,11,0.35)]"
          referrerPolicy="no-referrer"
        />
      ) : badgeType === "cod" ? (
        <img
          src="https://file.garden/alGOOylwpAfCa6qP/IMG_7220.png"
          alt="COD"
          className="h-full w-full object-contain drop-shadow-[0_2px_4px_rgba(59,130,246,0.35)]"
          referrerPolicy="no-referrer"
        />
      ) : badgeType === "youtuber" ? (
        <img
          src="https://file.garden/alGOOylwpAfCa6qP/IMG_7219.png"
          alt="YouTuber"
          className="h-full w-full object-contain drop-shadow-[0_2px_4px_rgba(232,72,72,0.35)]"
          referrerPolicy="no-referrer"
        />
      ) : (
        <img
          src="/assets/ui/icon-events.svg"
          alt="Event"
          className="h-full w-full object-contain drop-shadow-[0_2px_4px_rgba(236,72,153,0.35)]"
          referrerPolicy="no-referrer"
        />
      )}
    </span>
  );
}
