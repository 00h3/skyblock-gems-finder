import React from "react";

export type GlossyIconName =
  | "user-avatar"
  | "key-access"
  | "bell-dot"
  | "cloud-moon"
  | "calendar-heart"
  | "book-learn"
  | "door-lock"
  | "phone-key";

interface IconMeta {
  localSrc: string;
  hostedFallback: string;
  label: string;
  glowColor: string;
}

export const HOSTED_ICONS: Record<GlossyIconName, IconMeta> = {
  "bell-dot": {
    localSrc: "/icons/hosted/bell-dot-glossy.png",
    hostedFallback:
      "https://maxwell.z3ki.dev/bot/_files/icon-bell-notification/bell-dot-bulk-rounded3x.webp",
    label: "Notifications / Alerts",
    glowColor: "rgba(244, 63, 94, 0.25)",
  },
  "user-avatar": {
    localSrc: "/icons/hosted/user-avatar-glossy.png",
    hostedFallback:
      "https://maxwell.z3ki.dev/bot/_files/icon-user-profile/3f6e7dd0-1692-493a-ac83-131f7079c418.png",
    label: "Profile / Account",
    glowColor: "rgba(56, 189, 248, 0.25)",
  },
  "key-access": {
    localSrc: "/icons/hosted/key-access-glossy.png",
    hostedFallback:
      "https://maxwell.z3ki.dev/bot/_files/icon-key-access/640760ad-580b-43c9-bf53-da921e7f86f6.png",
    label: "Access / Unlock / Security / Passkey",
    glowColor: "rgba(245, 158, 11, 0.25)",
  },
  "cloud-moon": {
    localSrc: "/icons/hosted/cloud-moon-glossy.png",
    hostedFallback:
      "https://maxwell.z3ki.dev/bot/_files/icon-weather-night/06f69d35-c25f-4a13-bdf9-f31bae5918b1.png",
    label: "Night Mode / Weather / Sleep",
    glowColor: "rgba(168, 85, 247, 0.25)",
  },
  "calendar-heart": {
    localSrc: "/icons/hosted/calendar-heart-glossy.png",
    hostedFallback:
      "https://maxwell.z3ki.dev/bot/_files/icon-calendar-favorite/8f3060fc-c57a-407a-939b-0160b02647ce.png",
    label: "Events / Favorites / Date saved",
    glowColor: "rgba(52, 211, 153, 0.25)",
  },
  "book-learn": {
    localSrc: "/icons/hosted/book-learn-glossy.png",
    hostedFallback:
      "https://maxwell.z3ki.dev/bot/_files/icon-book-learn/3fe256c9-77ab-4272-aa92-c10b58ac01dd.png",
    label: "Guides / Library / Rules / Docs",
    glowColor: "rgba(99, 102, 241, 0.25)",
  },
  "door-lock": {
    localSrc: "/icons/hosted/door-lock-glossy.png",
    hostedFallback:
      "https://maxwell.z3ki.dev/bot/_files/icon-door-lock/b6839ba8-12ff-48e1-aadd-c0d4559a7647.png",
    label: "Room Lock / Private / Restricted access",
    glowColor: "rgba(249, 115, 22, 0.25)",
  },
  "phone-key": {
    localSrc: "/icons/hosted/phone-key-glossy.png",
    hostedFallback:
      "https://maxwell.z3ki.dev/bot/_files/icon-phone-key-auth/eebfd24b-a5db-4b65-a98f-b0f165836eb9.png",
    label: "2FA Authentication / Mobile Verification / Deactivation",
    glowColor: "rgba(239, 68, 68, 0.25)",
  },
};

interface GlossyHostedIconProps {
  name: GlossyIconName;
  className?: string;
  alt?: string;
  withPeriodicShine?: boolean;
}

export function GlossyHostedIcon({
  name,
  className = "h-[19px] w-[19px]",
  alt,
  withPeriodicShine = true,
}: GlossyHostedIconProps) {
  const icon = HOSTED_ICONS[name];
  const [src, setSrc] = React.useState(icon.localSrc);

  return (
    <div
      className={`relative shrink-0 inline-flex items-center justify-center select-none overflow-hidden rounded-[8px] ${className}`}
      style={{
        filter: `drop-shadow(0 1px 2px ${icon.glowColor}) drop-shadow(0 1px 1px rgba(0,0,0,0.12))`,
      }}
    >
      <img
        src={src}
        alt={alt || icon.label}
        className="h-full w-full object-contain pointer-events-none"
        loading="lazy"
        onError={() => {
          if (src !== icon.hostedFallback) {
            setSrc(icon.hostedFallback);
          }
        }}
      />
      {withPeriodicShine && (
        <span
          className="pointer-events-none absolute inset-0 -translate-x-[160%] skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/50 to-transparent"
          style={{
            animation: "glossyShineSweep 26s cubic-bezier(0.4, 0, 0.2, 1) infinite",
          }}
        />
      )}
    </div>
  );
}

export const GlossyUserProfileIcon = (props: Omit<GlossyHostedIconProps, "name">) => (
  <GlossyHostedIcon name="user-avatar" {...props} />
);

export const GlossyKeyAccessIcon = (props: Omit<GlossyHostedIconProps, "name">) => (
  <GlossyHostedIcon name="key-access" {...props} />
);

export const GlossyBellDotIcon = (props: Omit<GlossyHostedIconProps, "name">) => (
  <GlossyHostedIcon name="bell-dot" {...props} />
);

export const GlossyCloudMoonIcon = (props: Omit<GlossyHostedIconProps, "name">) => (
  <GlossyHostedIcon name="cloud-moon" {...props} />
);

export const GlossyCalendarHeartIcon = (props: Omit<GlossyHostedIconProps, "name">) => (
  <GlossyHostedIcon name="calendar-heart" {...props} />
);

export const GlossyBookLearnIcon = (props: Omit<GlossyHostedIconProps, "name">) => (
  <GlossyHostedIcon name="book-learn" {...props} />
);

export const GlossyDoorLockIcon = (props: Omit<GlossyHostedIconProps, "name">) => (
  <GlossyHostedIcon name="door-lock" {...props} />
);

export const GlossyPhoneKeyIcon = (props: Omit<GlossyHostedIconProps, "name">) => (
  <GlossyHostedIcon name="phone-key" {...props} />
);
