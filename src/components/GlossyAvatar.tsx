import { normalizeAvatarFrameId, useEquippedFrame, type AvatarFrameId } from "@/lib/avatar";
import type { AvatarSnapshot } from "@/lib/avatar";
import { GlbAvatar, type FocusZone } from "@/components/GlbAvatar";
import iraPortrait from "../assets/imported/IMG_6551_1786910421451.jpeg?url";
import nedPortrait from "../assets/avatar.png?url";
import nellyPortrait from "../assets/images/nelly_support_avatar_1787672860439.jpg?url";

export type AvatarFrame = AvatarFrameId;

export const GLOBAL_DEFAULT_PFP =
  "https://file.garden/alGOOylwpAfCa6qP/C24029F2-83D1-4C8B-B67C-71A7E0186ED4.png";

export function isIraAccount(
  user: { email?: string | null; username?: string; customId?: string } | null | undefined,
) {
  const email = typeof user?.email === "string" ? user.email.toLowerCase() : "";
  return email === "mammaettahiri@gmail.com";
}

function frameAssetFor(frame: AvatarFrameId): string | null {
  return frame === "staff" || frame === "blue-gold" || frame === "gold-treasure"
    ? "https://file.garden/alGOOylwpAfCa6qP/EE22FE2B-63EC-474E-84AD-21DB230D39BE.png"
    : frame === "star-program"
      ? "https://file.garden/alGOOylwpAfCa6qP/C3E6AF95-DA29-4CA4-A7AC-E1DB8112DD45.png"
      : frame === "early-beta" || frame === "ice"
        ? "https://file.garden/alGOOylwpAfCa6qP/IMG_7472.png"
        : null;
}

function customFrameClass(frame: AvatarFrameId): string {
  return frame === "emerald"
    ? "border-4 border-emerald-500/80"
    : frame === "halloween"
      ? "border-4 border-orange-500/90"
      : frame === "witch-rose"
        ? "border-4 border-rose-500/90"
        : frame === "neon-cyber"
          ? "border-4 border-cyan-400 shadow-[0_0_18px_rgba(34,211,238,0.5)]"
          : frame === "ice"
            ? "border-4 border-sky-300 shadow-[0_0_18px_rgba(125,211,252,0.45)]"
            : frame === "gold-treasure"
              ? "border-4 border-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.45)]"
              : "";
}

function customFrameRingClass(frame: AvatarFrameId): string {
  return frame === "emerald"
    ? "ring-4 ring-emerald-500/80"
    : frame === "halloween"
      ? "ring-4 ring-orange-500/90"
      : frame === "witch-rose"
        ? "ring-4 ring-rose-500/90"
        : frame === "neon-cyber"
          ? "ring-4 ring-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.5)]"
          : frame === "ice"
            ? "ring-4 ring-sky-300 shadow-[0_0_12px_rgba(125,211,252,0.45)]"
            : frame === "gold-treasure"
              ? "ring-4 ring-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.45)]"
              : "";
}

/** Frame-only overlay for large live previews (disabled for now per specification). */
export function AvatarFrameOverlay({
  frame: _frame,
  className: _className = "",
}: {
  frame?: AvatarFrame;
  className?: string;
}) {
  // Frame system is temporarily disabled in UI; returns null so it's easy to restore later.
  return null;
}

export function GlossyAvatar({
  frame,
  portrait = false,
  height = 160,
  className = "",
  focusZone = "full",
  autoRotate = true,
  snapshot,
  photoUrl,
  imageFallbackOnly = false,
  blank = false,
}: {
  frame?: AvatarFrame;
  portrait?: boolean;
  height?: number;
  className?: string;
  focusZone?: FocusZone;
  autoRotate?: boolean;
  snapshot?: Partial<AvatarSnapshot> | null;
  photoUrl?: string | null;
  imageFallbackOnly?: boolean;
  blank?: boolean;
}) {
  // Underlying system preserved; frame rendering disabled for this version
  const _storedFrame = useEquippedFrame();
  const _activeFrame = normalizeAvatarFrameId(frame ?? snapshot?.frameId ?? _storedFrame) ?? "none";

  const containerStyle = height
    ? { width: height, height, minHeight: height, aspectRatio: "1 / 1" }
    : { aspectRatio: "1 / 1" };

  const isFirebaseImage =
    photoUrl?.includes("firebasestorage.googleapis.com") || photoUrl?.includes("qblock-app");
  const hasSnapshot = snapshot != null && Object.keys(snapshot).length > 0;
  const isThumbnail = typeof height === "number" && height <= 64;
  // Always prefer 3D unless explicitly requested not to, or thumbnail size, or non-firebase custom image.
  const prefer3D = !imageFallbackOnly && !portrait && !isThumbnail && (!photoUrl || isFirebaseImage);

  return (
    <div
      className={`qb-glossy-avatar relative isolate inline-flex items-center justify-center overflow-visible shrink-0 ${className}`}
      style={containerStyle}
    >
      <div className="qb-avatar-window absolute inset-0 h-full w-full overflow-hidden rounded-[24%] bg-white dark:bg-[#1a1d24]">
        {blank ? null : prefer3D ? (
          <GlbAvatar
            height={height}
            snapshot={snapshot || undefined}
            focusZone={focusZone}
            autoRotate={autoRotate}
            playWalkAnimation={false}
            interactive={false}
            className="h-full w-full"
          />
        ) : (
          <img
            src={
              photoUrl ||
              (portrait
                ? iraPortrait
                : snapshot?.selectedCharacter === "char2"
                  ? nellyPortrait
                  : nedPortrait)
            }
            alt=""
            className="h-full w-full object-cover"
            draggable={false}
          />
        )}
      </div>
    </div>
  );
}
