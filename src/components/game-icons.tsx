// Custom in-game HUD icon set — chunkier / bolder than the app-chrome icons
// in `icons.tsx` since these sit over a busy 3D viewport and need to read at
// a glance. Drawn flat in currentColor so callers control tint (white on
// the liquid-glass HUD plates, or QBLOCK yellow for the active/equipped
// state) instead of baking in one fixed color.

export function GameChatIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M3 12.2C3 7.1 7.3 3.5 12.3 3.5S21.6 7.1 21.6 12.2c0 5.1-4.3 8.7-9.3 8.7-1.15 0-2.25-.2-3.25-.56L4.4 22l1.2-3.9A8.05 8.05 0 0 1 3 12.2Z"
        fill="currentColor"
      />
      <circle cx="8.3" cy="12.1" r="1.25" fill="var(--hud-dot, #f4c430)" />
      <circle cx="12.3" cy="12.1" r="1.25" fill="var(--hud-dot, #f4c430)" />
      <circle cx="16.3" cy="12.1" r="1.25" fill="var(--hud-dot, #f4c430)" />
    </svg>
  );
}

import backpackIconUrl from "@/assets/ui/icon-backpack.png";
import heartIconUrl from "@/assets/ui/icon-heart.png";

export function GameBackpackIcon({ className }: { className?: string }) {
  return (
    <img
      src={backpackIconUrl}
      alt=""
      draggable={false}
      className={`object-contain select-none pointer-events-none ${className ?? ""}`}
    />
  );
}

export function GameHeartIcon({ className }: { className?: string }) {
  return (
    <img
      src={heartIconUrl}
      alt=""
      draggable={false}
      className={`object-contain select-none pointer-events-none ${className ?? ""}`}
    />
  );
}

export function GameGearIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 3.6c.55 0 1.08.04 1.6.13l.45 1.9c.7.2 1.35.5 1.95.9l1.75-.85c.85.65 1.6 1.4 2.25 2.25l-.85 1.75c.4.6.7 1.25.9 1.95l1.9.45c.09.52.13 1.05.13 1.6s-.04 1.08-.13 1.6l-1.9.45c-.2.7-.5 1.35-.9 1.95l.85 1.75c-.65.85-1.4 1.6-2.25 2.25l-1.75-.85c-.6.4-1.25.7-1.95.9l-.45 1.9c-.52.09-1.05.13-1.6.13s-1.08-.04-1.6-.13l-.45-1.9c-.7-.2-1.35-.5-1.95-.9l-1.75.85c-.85-.65-1.6-1.4-2.25-2.25l.85-1.75c-.4-.6-.7-1.25-.9-1.95l-1.9-.45C3.64 13.08 3.6 12.55 3.6 12s.04-1.08.13-1.6l1.9-.45c.2-.7.5-1.35.9-1.95l-.85-1.75C6.33 5.4 7.08 4.65 7.93 4l1.75.85c.6-.4 1.25-.7 1.95-.9l.45-1.9c.52-.09 1.05-.13 1.6-.13Z"
        fill="currentColor"
      />
      <circle cx="12" cy="12" r="3.1" fill="var(--hud-bg, #fff)" />
    </svg>
  );
}

export function GameTrophyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M7.4 4.6h9.2v4.6a4.6 4.6 0 0 1-9.2 0V4.6Z" fill="currentColor" />
      <path
        d="M7.4 6H5a2.4 2.4 0 0 0 2.4 3.4M16.6 6H19a2.4 2.4 0 0 1-2.4 3.4"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        fill="none"
      />
      <rect x="10.6" y="13.6" width="2.8" height="3" fill="currentColor" />
      <rect x="7.6" y="17.4" width="8.8" height="2.2" rx="1.1" fill="currentColor" />
    </svg>
  );
}

export function GameFriendsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="9" cy="8.4" r="3" fill="currentColor" />
      <circle cx="16.4" cy="9.4" r="2.3" fill="currentColor" opacity="0.75" />
      <path d="M3.4 19.4c0-3.2 2.6-5.1 5.6-5.1s5.6 1.9 5.6 5.1" fill="currentColor" />
      <path
        d="M14.6 15.1c2.2.3 3.7 1.9 3.7 4.3"
        stroke="currentColor"
        strokeWidth={1.9}
        strokeLinecap="round"
        fill="none"
        opacity="0.75"
      />
    </svg>
  );
}

export function GameLeaveIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M13.4 4.6H8.2a1.8 1.8 0 0 0-1.8 1.8v11.2a1.8 1.8 0 0 0 1.8 1.8h5.2"
        stroke="currentColor"
        strokeWidth={2.1}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M10.6 12h9.4m0 0-3.2-3.2m3.2 3.2-3.2 3.2"
        stroke="currentColor"
        strokeWidth={2.1}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function GameRunIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="14.4" cy="4.8" r="1.9" fill="currentColor" />
      <path
        d="M9.4 21.2 11 15.8l-2.6-2 1-4.4 3.6 1.1 1.4 2.6 3.3 1.1-.6 1.9-3.5-1.1-1 3.4 2.6 3"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path d="M5.2 17.8 9 12.6" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

export function GameJumpIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M6 15.4 12 10l6 5.4M7.4 20 12 15.8 16.6 20"
        stroke="currentColor"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
