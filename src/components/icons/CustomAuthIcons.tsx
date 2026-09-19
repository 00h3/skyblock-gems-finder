import React from "react";

// User speaking icon (head + body + speech waves)
export function UserSpeakIcon({
  className = "w-5 h-5",
  color = "currentColor",
}: {
  className?: string;
  color?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M16 4a4 4 0 0 1 0 8" />
      <path d="M19 2a7 7 0 0 1 0 12" />
      <circle cx="9" cy="7" r="4" />
      <path d="M2 21a7 7 0 0 1 14 0" />
    </svg>
  );
}

// Mail forward icon (envelope with forward arrow bottom right)
export function MailForwardIcon({
  className = "w-5 h-5",
  color = "currentColor",
}: {
  className?: string;
  color?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6" />
      <path d="m3 7 9 6 9-6" />
      <path d="M3 19a2 2 0 0 0 2 2h8" />
      <path d="M16 19h6" />
      <path d="m19 16 3 3-3 3" />
    </svg>
  );
}

// Password asterisk badge icon
export function PasswordKeyIcon({
  className = "w-5 h-5",
  color = "currentColor",
}: {
  className?: string;
  color?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="2" y="5" width="20" height="14" rx="4" />
      {/* 3 Asterisks */}
      <path d="M6.5 10v4M4.5 11l4 2M4.5 13l4-2" />
      <path d="M12 10v4M10 11l4 2M10 13l4-2" />
      <path d="M17.5 10v4M15.5 11l4 2M15.5 13l4-2" />
    </svg>
  );
}

// Eye open icon matching uploaded svgrepo style
export function SvgEyeOpen({
  className = "w-5 h-5",
  color = "currentColor",
}: {
  className?: string;
  color?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

// Eye closed with eyelashes matching uploaded svgrepo style
export function SvgEyeClosed({
  className = "w-5 h-5",
  color = "currentColor",
}: {
  className?: string;
  color?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 10c2.5 4 6 6 9 6s6.5-2 9-6" />
      <path d="m5 13-1.5 2.5" />
      <path d="m8.5 15.5-1 2.5" />
      <path d="M12 16v3" />
      <path d="m15.5 15.5 1 2.5" />
      <path d="m19 13 1.5 2.5" />
    </svg>
  );
}
