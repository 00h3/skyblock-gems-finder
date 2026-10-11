import React from "react";
import { VerifiedTick } from "@/components/VerifiedTick";

export const YOUTUBER_STAR_BADGE_URL = "/badges/youtuber-star.png";
export const VERIFIED_BADGE_URL = "https://file.garden/alGOOylwpAfCa6qP/IMG_7218.png";

export type UserProfileLike = {
  email?: string | null;
  username?: string | null;
  displayName?: string | null;
  n?: string | null;
  name?: string | null;
  customId?: string | null;
  staff?: boolean | null;
  badgeEquipped?: boolean | null;
  badges?: string[] | null;
  badgesList?: string[] | null;
  gradientName?: string | null;
  nameGradient?: string | null;
  nameStyle?: "default" | "gradient" | null;
  useGradientName?: boolean | null;
  isYouTuber?: boolean | null;
  admin?: boolean | null;
  dev?: boolean | null;
};

export type UserBadgeItem = {
  id: string;
  name: string;
  iconUrl: string;
  description?: string;
};

export function isIraUser(user: UserProfileLike | null | undefined): boolean {
  if (!user) return false;
  const email = typeof user.email === "string" ? user.email.toLowerCase() : "";
  const username = typeof user.username === "string" ? user.username.toLowerCase() : "";
  const displayName = typeof user.displayName === "string" ? user.displayName.toLowerCase() : "";
  const name = typeof user.name === "string" ? user.name.toLowerCase() : "";
  const n = typeof user.n === "string" ? user.n.toLowerCase() : "";
  return (
    email === "mammaettahiri@gmail.com" ||
    email.includes("ira") ||
    username === "ira" ||
    displayName === "ira" ||
    name === "ira" ||
    n === "ira"
  );
}

export function isDieUser(user: UserProfileLike | null | undefined): boolean {
  if (!user) return false;
  const email = typeof user.email === "string" ? user.email.toLowerCase() : "";
  const username = typeof user.username === "string" ? user.username.toLowerCase() : "";
  const displayName = typeof user.displayName === "string" ? user.displayName.toLowerCase() : "";
  const name = typeof user.name === "string" ? user.name.toLowerCase() : "";
  const n = typeof user.n === "string" ? user.n.toLowerCase() : "";
  return (
    email.includes("die") ||
    username === "die" ||
    displayName === "die" ||
    name === "die" ||
    n === "die"
  );
}

export function isStaffUser(user: UserProfileLike | null | undefined): boolean {
  return isIraUser(user) || isDieUser(user) || user?.staff === true;
}

export function isStrUser(user: UserProfileLike | null | undefined): boolean {
  return false;
}

export function isH3User(user: UserProfileLike | null | undefined): boolean {
  return false;
}

export function isWoofyUser(user: UserProfileLike | null | undefined): boolean {
  return false;
}

/** Check if user has an available gradient name style */
export function userHasGradient(user: UserProfileLike | null | undefined): boolean {
  return isIraUser(user) || isDieUser(user);
}

/**
 * Returns class string for user's name.
 * Verified staff members (Ira & Die) get a distinctive gradient name.
 */
export function getUserNameClass(
  user: UserProfileLike | null | undefined,
  defaultClass: string = "text-foreground font-extrabold",
): string {
  if (!user) return defaultClass;
  if (!isIraUser(user) && !isDieUser(user)) return defaultClass;

  const outlineClass =
    "[filter:drop-shadow(1px_0_0_#000)_drop-shadow(-1px_0_0_#000)_drop-shadow(0_1px_0_#000)_drop-shadow(0_-1px_0_#000)]";
  return `bg-gradient-to-r from-[#1769e8] via-[#4b9eff] to-[#1769e8] bg-clip-text text-transparent font-black ${outlineClass}`;
}

/** Resolves all badges for a user into structured items (icon, name, id) */
export function getUserBadges(user: UserProfileLike | null | undefined): UserBadgeItem[] {
  if (!user) return [];
  const isStaff = isStaffUser(user);
  if (!isStaff) return [];

  const badgesMap = new Map<string, UserBadgeItem>();
  const add = (id: string, name: string, iconUrl: string) => {
    if (!badgesMap.has(id)) {
      badgesMap.set(id, { id, name, iconUrl });
    }
  };

  // Verified staff badge for Ira, Die, and users with staff role
  add("verified", "Verified Staff", VERIFIED_BADGE_URL);

  return Array.from(badgesMap.values());
}

export function UserNameWithBadges({
  user,
  name,
  className = "",
  badgeSize = 16,
  defaultColorClass = "text-foreground font-extrabold",
}: {
  user: UserProfileLike | null | undefined;
  name?: string;
  className?: string;
  badgeSize?: number;
  defaultColorClass?: string;
}) {
  const displayName =
    name || user?.displayName || user?.username || user?.n || user?.name || "Player";
  const nameStyleClass = getUserNameClass(user, defaultColorClass);
  const badges = getUserBadges(user);

  return (
    <span className={`inline-flex items-center gap-1.5 flex-wrap ${className}`}>
      <span className={nameStyleClass}>{displayName}</span>
      {badges.map((b) => (
        <img
          key={b.id}
          src={b.iconUrl}
          alt={b.name}
          title={b.name}
          className="inline-block shrink-0 object-contain drop-shadow-sm select-none"
          style={{ width: badgeSize, height: badgeSize }}
          referrerPolicy="no-referrer"
        />
      ))}
    </span>
  );
}

/** Badge image URLs for a user — used by in-game name tags and chat rows. */
export function badgeUrlsFor(user: UserProfileLike | null | undefined): string[] {
  return getUserBadges(user).map((b) => b.iconUrl);
}
