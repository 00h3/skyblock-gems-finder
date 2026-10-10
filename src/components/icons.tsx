// Icon set — all SVG, using currentColor for tinting.

type IconProps = { className?: string; filled?: boolean };

// ── Home ───────────────────────────────────────────────────────────────────
export function HomeIcon({ className, filled = false }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        opacity={filled ? 1 : 0.35}
        d="M2 12.2039C2 9.91549 2 8.77128 2.5192 7.82274C3.0384 6.87421 3.98695 6.28551 5.88403 5.10813L7.88403 3.86687C9.88939 2.62229 10.8921 2 12 2C13.1079 2 14.1106 2.62229 16.116 3.86687L18.116 5.10812C20.0131 6.28551 20.9616 6.87421 21.4808 7.82274C22 8.77128 22 9.91549 22 12.2039V13.725C22 17.6258 22 19.5763 20.8284 20.7881C19.6569 22 17.7712 22 14 22H10C6.22876 22 4.34315 22 3.17157 20.7881C2 19.5763 2 17.6258 2 13.725V12.2039Z"
        fill="currentColor"
      />
      <path
        d="M9 17.25C8.58579 17.25 8.25 17.5858 8.25 18C8.25 18.4142 8.58579 18.75 9 18.75H15C15.4142 18.75 15.75 18.4142 15.75 18C15.75 17.5858 15.4142 17.25 15 17.25H9Z"
        fill="currentColor"
      />
    </svg>
  );
}

// ── QBLOCK supplied vector navigation icons ─────────────────────────────────
// These stay inline SVGs so they inherit the active/inactive nav color without
// loading raster assets or relying on browser image filters.
export function QBlockHomeIcon({ className, filled = false }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M2 12.2039C2 9.91549 2 8.77128 2.5192 7.82274C3.0384 6.87421 3.98695 6.28551 5.88403 5.10813L7.88403 3.86687C9.88939 2.62229 10.8921 2 12 2C13.1079 2 14.1106 2.62229 16.116 3.86687L18.116 5.10812C20.0131 6.28551 20.9616 6.87421 21.4808 7.82274C22 8.77128 22 9.91549 22 12.2039V13.725C22 17.6258 22 19.5763 20.8284 20.7881C19.6569 22 17.7712 22 14 22H10C6.22876 22 4.34315 22 3.17157 20.7881C2 19.5763 2 17.6258 2 13.725V12.2039Z"
        fill="currentColor"
        opacity={filled ? 1 : 0.42}
      />
      <path
        d="M9 17.25C8.58579 17.25 8.25 17.5858 8.25 18C8.25 18.4142 8.58579 18.75 9 18.75H15C15.4142 18.75 15.75 18.4142 15.75 18C15.75 17.5858 15.4142 17.25 15 17.25H9Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function QBlockAvatarIcon({ className, filled = false }: IconProps) {
  return (
    <img
      src="/icons/emoji-funny-square-svgrepo-com.svg"
      alt="Avatar"
      className={`${className ?? "h-[22px] w-[22px]"} object-contain select-none transition-all duration-200 dark:invert ${
        filled ? "scale-105 opacity-100" : "opacity-60"
      }`}
      draggable={false}
    />
  );
}

export function QBlockProfileSettingsIcon({ className, filled = false }: IconProps) {
  return (
    <img
      src="/icons/expressionless-square-svgrepo-com.svg"
      alt="Profile"
      className={`${className ?? "h-[22px] w-[22px]"} object-contain select-none transition-all duration-200 dark:invert ${
        filled ? "scale-105 opacity-100" : "opacity-60"
      }`}
      draggable={false}
    />
  );
}

export function QBlockMailIcon({ className, filled = false }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="2.5" y="4.5" width="19" height="15" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="m4 7 6.25 5.05a2.75 2.75 0 0 0 3.5 0L20 7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {filled && (
        <path
          d="M4.5 17.5h15v-2.8l-5.1-3.9a3.75 3.75 0 0 1-4.8 0l-5.1 3.9v2.8Z"
          fill="currentColor"
          opacity=".16"
        />
      )}
    </svg>
  );
}

// ── Discover / Games ───────────────────────────────────────────────────────
export function DiscoverIcon({ className, filled = false }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        opacity={filled ? 0.5 : 0.3}
        d="M22 11.07V16.65C22 19.6 19.6 22 16.65 22H7.35C4.4 22 2 19.6 2 16.65V11.07C2 8.12 4.4 5.72 7.35 5.72H16.65C19.6 5.72 22 8.12 22 11.07Z"
        fill="currentColor"
      />
      <path
        d="M10.13 15.01L9.1 13.98l.99-1c.29-.29.29-.77 0-1.06-.29-.29-.77-.29-1.06 0l-.99.99-.96-.96a.75.75 0 0 0-1.06 1.06l.96.96-.99.99a.75.75 0 0 0 1.06 1.06l.99-.99 1.03 1.03a.75.75 0 0 0 1.06-1.06Z"
        fill="currentColor"
      />
      <circle cx="13.53" cy="14" r="1" fill="currentColor" />
      <circle cx="17.48" cy="14" r="1" fill="currentColor" />
      <circle cx="15.5" cy="15.97" r="1" fill="currentColor" />
      <circle cx="15.5" cy="12.03" r="1" fill="currentColor" />
      <path
        d="M13.64 2.71l-.01.94c-.01.88-.74 1.61-1.63 1.61-.15 0-.24.1-.24.23s.1.2.23.2h-1.61c-.01-.07-.02-.15-.02-.23 0-.9.73-1.63 1.62-1.63.15 0 .24-.1.24-.23l.01-.94c.01-.38.32-.69.71-.69.39 0 .7.32.7.74Z"
        fill="currentColor"
      />
    </svg>
  );
}

// ── Avatar / Shirt ─────────────────────────────────────────────────────────
export function AvatarGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden>
      <polygon
        points="356.174,33.391 356.174,111.304 322.783,111.304 322.783,144.696 189.217,144.696 189.217,111.304 155.826,111.304 155.826,33.391 0,33.391 0,222.609 66.783,222.609 66.783,478.609 445.217,478.609 445.217,222.609 512,222.609 512,33.391"
        fill="currentColor"
      />
    </svg>
  );
}

// ── Chat / Unread bubble ───────────────────────────────────────────────────
export function ChatIcon({ className, filled = false }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        opacity={filled ? 0.6 : 0.3}
        d="M15.64 2.01C15.01 2 14.31 2 13.5 2h-3C7.23 2 5.59 2 4.39 2.74A5.5 5.5 0 0 0 2.74 4.39C2 5.59 2 7.23 2 10.5v1c0 2.33 0 3.49.38 4.41a5.5 5.5 0 0 0 2.71 2.71c.66.27 1.45.35 2.7.37.85.01 1.28.02 1.62.22.34.19.55.55.97 1.26l.54.92c.48.82 1.69.82 2.17 0l.54-.92c.42-.71.63-1.07.97-1.26.34-.19.77-.21 1.62-.22 1.26-.02 2.04-.1 2.7-.37a5.5 5.5 0 0 0 2.71-2.71C22 14.99 22 13.83 22 11.5v-1c0-.8 0-1.51-.01-2.14A4.5 4.5 0 0 1 14.5 5c0-1.15.43-2.19 1.14-2.99Z"
        fill="currentColor"
      />
      <circle cx="19" cy="5" r="3" fill="currentColor" />
    </svg>
  );
}

// ── Profile / Settings sliders ─────────────────────────────────────────────
export function ProfileIcon({ className, filled = false }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        opacity={filled ? 0.5 : 0.3}
        d="M16.19 2H7.81C4.17 2 2 4.17 2 7.81v8.37C2 19.83 4.17 22 7.81 22h8.37c3.64 0 5.81-2.17 5.81-5.81V7.81C22 4.17 19.83 2 16.19 2Z"
        fill="currentColor"
      />
      <rect x="14.83" y="13.85" width="1.5" height="5.4" rx="0.75" fill="currentColor" />
      <rect x="14.83" y="4.75" width="1.5" height="3.45" rx="0.75" fill="currentColor" />
      <circle cx="15.58" cy="10.05" r="1.75" fill="currentColor" />
      <rect x="7.67" y="15.8" width="1.5" height="3.45" rx="0.75" fill="currentColor" />
      <rect x="7.67" y="4.75" width="1.5" height="5.4" rx="0.75" fill="currentColor" />
      <circle cx="8.42" cy="13.96" r="1.75" fill="currentColor" />
    </svg>
  );
}

// ── Heart (universal like / favourite) ────────────────────────────────────
export function HeartIcon({ className, filled = false }: { className?: string; filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M2 9.1371C2 14 6.01943 16.5914 8.96173 18.9109C10 19.7294 11 20.5 12 20.5C13 20.5 14 19.7294 15.0383 18.9109C17.9806 16.5914 22 14 22 9.1371C22 4.27416 16.4998 0.825464 12 5.50063C7.50016 0.825464 2 4.27416 2 9.1371Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={filled ? 0 : 1.8}
      />
    </svg>
  );
}

export function PlayerIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
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

// ── Avatar / character silhouette — bottom-nav tab ─────────────────────────
export function AvatarNavIcon({ className, filled = false }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      {/* Head */}
      <rect
        x="8"
        y="2"
        width="8"
        height="8"
        rx="2"
        fill="currentColor"
        opacity={filled ? 1 : 0.38}
      />
      {/* Body */}
      <rect
        x="6"
        y="11"
        width="12"
        height="7"
        rx="2"
        fill="currentColor"
        opacity={filled ? 0.85 : 0.28}
      />
      {/* Left arm */}
      <rect
        x="2"
        y="11"
        width="3.5"
        height="6"
        rx="1.5"
        fill="currentColor"
        opacity={filled ? 0.7 : 0.22}
      />
      {/* Right arm */}
      <rect
        x="18.5"
        y="11"
        width="3.5"
        height="6"
        rx="1.5"
        fill="currentColor"
        opacity={filled ? 0.7 : 0.22}
      />
      {/* Left leg */}
      <rect
        x="6.5"
        y="19"
        width="4"
        height="3"
        rx="1.2"
        fill="currentColor"
        opacity={filled ? 0.7 : 0.22}
      />
      {/* Right leg */}
      <rect
        x="13.5"
        y="19"
        width="4"
        height="3"
        rx="1.2"
        fill="currentColor"
        opacity={filled ? 0.7 : 0.22}
      />
    </svg>
  );
}

// ── Globe (Private Server button) ──────────────────────────────────────────
export function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="8.6" stroke="currentColor" strokeWidth={2.1} />
      <path
        d="M3.4 12h17.2M12 3.4c2.4 2.3 3.7 5.3 3.7 8.6s-1.3 6.3-3.7 8.6c-2.4-2.3-3.7-5.3-3.7-8.6S9.6 5.7 12 3.4Z"
        stroke="currentColor"
        strokeWidth={2.1}
        strokeLinejoin="round"
      />
    </svg>
  );
}
