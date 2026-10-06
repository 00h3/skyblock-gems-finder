import React from "react";

export type BadgeType = "verified" | "character" | "event" | "cod" | "youtuber";

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
  const badgeUrls: Record<BadgeType, string> = {
    verified: "https://file.garden/alGOOylwpAfCa6qP/IMG_7218.png",
    character: "https://file.garden/alGOOylwpAfCa6qP/IMG_7216.png",
    event: "/assets/ui/icon-events.svg",
    cod: "https://file.garden/alGOOylwpAfCa6qP/IMG_7220.png",
    youtuber: "/badges/youtuber-star.png",
  };

  const url = badgeUrls[badgeType] || badgeUrls.verified;

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
