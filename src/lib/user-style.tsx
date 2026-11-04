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
  if (!user) return false;
  const username = typeof user.username === "string" ? user.username.toLowerCase() : "";
  const displayName = typeof user.displayName === "string" ? user.displayName.toLowerCase() : "";
  const name = typeof user.name === "string" ? user.name.toLowerCase() : "";
  const n = typeof user.n === "string" ? user.n.toLowerCase() : "";
  const customId = typeof user.customId === "string" ? user.customId.toLowerCase() : "";
  const email = typeof user.email === "string" ? user.email.toLowerCase() : "";
  return (
    username === "str" ||
    username.startsWith("str") ||
    displayName === "str" ||
    name === "str" ||
    n === "str" ||
    customId === "str" ||
    customId.startsWith("str") ||
    email.includes("str")
  );
}

export function isH3User(user: UserProfileLike | null | undefined): boolean {
  if (!user) return false;
  const username = typeof user.username === "string" ? user.username.toLowerCase() : "";
  const displayName = typeof user.displayName === "string" ? user.displayName.toLowerCase() : "";
  const name = typeof user.name === "string" ? user.name.toLowerCase() : "";
  const n = typeof user.n === "string" ? user.n.toLowerCase() : "";
  const customId = typeof user.customId === "string" ? user.customId.toLowerCase() : "";
  const email = typeof user.email === "string" ? user.email.toLowerCase() : "";
  return (
    username === "h3" ||
    username === "00h3" ||
    username === "ira" ||
    username === "hr" ||
    username === "ira/hr" ||
    username.startsWith("h3") ||
    displayName === "h3" ||
    displayName === "ira" ||
    displayName === "hr" ||
    displayName === "ira/hr" ||
    name === "h3" ||
    name === "ira" ||
    n === "h3" ||
    n === "ira" ||
    customId === "h3" ||
    customId.startsWith("h3") ||
    email === "mammaettahiri@gmail.com" ||
    email.includes("h3") ||
    email.includes("ira")
  );
}

export function isWoofyUser(user: UserProfileLike | null | undefined): boolean {
  return false;
}

export function isCatUser(user: UserProfileLike | null | undefined): boolean {
  if (!user) return false;
  const username = typeof user.username === "string" ? user.username.toLowerCase() : "";
  const displayName = typeof user.displayName === "string" ? user.displayName.toLowerCase() : "";
  const name = typeof user.name === "string" ? user.name.toLowerCase() : "";
  const n = typeof user.n === "string" ? user.n.toLowerCase() : "";
  const customId = typeof user.customId === "string" ? user.customId.toLowerCase() : "";
  const email = typeof user.email === "string" ? user.email.toLowerCase() : "";

  return (
    username === "cat" ||
    username === "@cat" ||
    displayName === "cat" ||
    displayName === "@cat" ||
    name === "cat" ||
    name === "@cat" ||
    n === "cat" ||
    n === "@cat" ||
    customId === "cat" ||
    customId === "@cat" ||
    email === "cat" ||
    email.startsWith("cat@")
  );
}

/** Check if user has an available gradient name style */
export function userHasGradient(user: UserProfileLike | null | undefined): boolean {
  return (
    isIraUser(user) ||
    isDieUser(user) ||
    isH3User(user) ||
    isStrUser(user) ||
    isCatUser(user)
  );
}

/**
 * Returns class string for user's name.
 * h3 gets an orange gradient name.
 * str gets a pink gradient name.
 * cat / @cat gets a violet gradient name.
 * Ira & Die get a blue gradient name.
 */
export function getUserNameClass(
  user: UserProfileLike | null | undefined,
  defaultClass: string = "text-foreground font-extrabold",
): string {
  if (!user) return defaultClass;
  const outlineClass =
    "[filter:drop-shadow(1px_0_0_#000)_drop-shadow(-1px_0_0_#000)_drop-shadow(0_1px_0_#000)_drop-shadow(0_-1px_0_#000)]";

  // Check custom selected nickname style first
  const style = (user.nameGradient || user.nameStyle || "") as string;
  if (style === "default") {
    return defaultClass;
  }
  if (style === "orange") {
    return `bg-gradient-to-r from-[#fa4616] via-[#ff7a00] to-[#ffa726] bg-clip-text text-transparent font-black ${outlineClass}`;
  }
  if (style === "rainbow") {
    return `bg-gradient-to-r from-red-500 via-amber-400 via-emerald-400 via-sky-400 to-purple-500 bg-clip-text text-transparent font-black ${outlineClass}`;
  }

  if (isH3User(user)) {
    return `bg-gradient-to-r from-[#fa4616] via-[#ff7a00] to-[#ffa726] bg-clip-text text-transparent font-black ${outlineClass}`;
  }
  if (isStrUser(user)) {
    return `bg-gradient-to-r from-[#ec4899] via-[#f472b6] to-[#fb7185] bg-clip-text text-transparent font-black ${outlineClass}`;
  }
  if (isCatUser(user)) {
    return `bg-gradient-to-r from-[#8b5cf6] via-[#a855f7] to-[#d946ef] bg-clip-text text-transparent font-black ${outlineClass}`;
  }
  if (isIraUser(user) || isDieUser(user)) {
    return `bg-gradient-to-r from-[#1769e8] via-[#4b9eff] to-[#1769e8] bg-clip-text text-transparent font-black ${outlineClass}`;
  }

  return defaultClass;
}

/** Resolves all badges for a user into structured items (icon, name, id) */
export function getUserBadges(user: UserProfileLike | null | undefined): UserBadgeItem[] {
  if (!user) return [];
  const isVerified =
    (user as any).verified === true ||
    (user as any).isVerified === true ||
    isStaffUser(user) ||
    isH3User(user) ||
    isStrUser(user);
  if (!isVerified) return [];

  const badgesMap = new Map<string, UserBadgeItem>();
  const add = (id: string, name: string, iconUrl: string) => {
    if (!badgesMap.has(id)) {
      badgesMap.set(id, { id, name, iconUrl });
    }
  };

  // Verified staff badge
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
  const isH3 = isH3User(user);
  const rawName = name || user?.displayName || user?.username || user?.n || user?.name || "Player";
  const lower = rawName.toLowerCase();
  const displayName = isH3 || lower === "ira" || lower === "hr" || lower === "ira/hr" || lower === "mammaettahiri" ? "h3" : rawName;
  const nameStyleClass = getUserNameClass(user, defaultColorClass);
  const isStr = isStrUser(user);
  const isVerified = Boolean(
    (user as any)?.verified === true ||
    (user as any)?.isVerified === true ||
    isStaffUser(user) ||
    isH3 ||
    isStr
  );
  const badges = isVerified ? getUserBadges(user) : [];

  return (
    <span className={`inline-flex items-center gap-1.5 flex-wrap ${className}`}>
      <span className={nameStyleClass}>{displayName}</span>
      {isStr && <VerifiedTick badgeType="pink" size={badgeSize} />}
      {!isStr && isH3 && <VerifiedTick badgeType="verified" size={badgeSize} />}
      {!isStr && !isH3 && isVerified && badges.map((b) => (
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
