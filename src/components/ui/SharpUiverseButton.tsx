import React from "react";
import { ChevronLeft } from "lucide-react";

export interface SharpUiverseButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  variant?: "orange" | "white" | "dark";
  fullWidth?: boolean;
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
}

/**
 * Exact squircle glossy button matching the "Let's get started" style:
 * signature top specular highlight reflection, inner light ring,
 * smooth gradient, tactile active:scale-95 press, and bold black text.
 */
export function SharpUiverseButton({
  children,
  variant = "white",
  fullWidth = false,
  size = "md",
  icon,
  className = "",
  disabled,
  type = "button",
  ...props
}: SharpUiverseButtonProps) {
  const isOrange = variant === "orange";
  const isDark = variant === "dark";

  const sizeClasses =
    size === "sm"
      ? "h-9 px-3.5 text-[12px] rounded-[11px]"
      : size === "lg"
      ? "h-[52px] px-8 text-[14.5px] rounded-[14px]"
      : "h-[44px] px-5 text-[13.5px] rounded-[13px]";

  const roundedTClass =
    size === "sm" ? "rounded-t-[11px]" : size === "lg" ? "rounded-t-[14px]" : "rounded-t-[13px]";
  const roundedClass =
    size === "sm" ? "rounded-[11px]" : size === "lg" ? "rounded-[14px]" : "rounded-[13px]";

  const outerClasses = isOrange
    ? "bg-gradient-to-b from-[#ff8533] via-[#fa4616] to-[#c9380d] text-white border-2 border-[#c9380d] shadow-[0_6px_18px_rgba(201,56,13,0.28)]"
    : isDark
    ? "bg-gradient-to-b from-[#242832] via-[#1a1d24] to-[#12141a] text-white border-2 border-[#1e232d] shadow-[0_6px_18px_rgba(0,0,0,0.3)]"
    : "border border-black/[0.12] bg-gradient-to-b from-white via-[#fafbfc] to-[#f0f3f6] text-black shadow-[0_6px_18px_rgba(23,24,27,0.08),inset_1px_1px_0_rgba(255,255,255,0.98)]";

  return (
    <button
      type={type}
      disabled={disabled}
      className={`qb-squircle press relative isolate cursor-pointer overflow-hidden flex items-center justify-center font-black uppercase tracking-wider select-none active:scale-95 transition-transform disabled:opacity-50 disabled:pointer-events-none ${
        fullWidth ? "w-full" : "inline-flex"
      } ${outerClasses} ${sizeClasses} ${className}`}
      {...props}
    >
      {/* Top Half Glossy Specular Highlight (The exact "Let's get started" gloss) */}
      <span
        className={`absolute inset-x-0 top-0 h-[48%] pointer-events-none ${roundedTClass} z-10 ${
          isOrange
            ? "bg-gradient-to-b from-white/45 via-white/15 to-transparent"
            : isDark
            ? "bg-gradient-to-b from-white/25 to-transparent"
            : "bg-gradient-to-b from-white/90 via-white/30 to-transparent"
        }`}
      />

      {/* Inner highlight rim */}
      <span
        className={`absolute inset-0 ${roundedClass} pointer-events-none z-10 ${
          isOrange
            ? "ring-1 ring-inset ring-white/30"
            : isDark
            ? "ring-1 ring-inset ring-white/10"
            : "ring-1 ring-inset ring-white/80"
        }`}
      />

      {/* Button content */}
      <span
        className={`relative z-20 flex w-full items-center justify-center gap-2 ${
          isOrange || isDark
            ? "text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]"
            : "text-black drop-shadow-[0_1px_0_rgba(255,255,255,0.8)]"
        }`}
      >
        {icon}
        {children}
      </span>
    </button>
  );
}

/**
 * "Go Back" button using the exact same squircle button style as "Let's get started",
 * featuring top specular highlight, inner light ring, chevron, and bold black text.
 */
export function GoBackButton({
  onClick,
  className = "",
  size = "sm",
  label = "Go Back",
}: {
  onClick?: () => void;
  className?: string;
  variant?: "orange" | "white" | "dark";
  size?: "sm" | "md";
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`qb-squircle press relative isolate cursor-pointer overflow-hidden inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-[12px] font-black uppercase tracking-wider text-[12.5px] text-black select-none active:scale-95 transition-transform border border-black/[0.12] bg-gradient-to-b from-white via-[#fafbfc] to-[#f0f3f6] shadow-[0_4px_14px_rgba(23,24,27,0.08),inset_1px_1px_0_rgba(255,255,255,0.98)] ${className}`}
      aria-label={label}
    >
      {/* Top Half Glossy Specular Highlight */}
      <span className="absolute inset-x-0 top-0 h-[48%] pointer-events-none rounded-t-[12px] bg-gradient-to-b from-white/90 via-white/30 to-transparent z-10" />

      {/* Inner highlight rim */}
      <span className="absolute inset-0 rounded-[12px] pointer-events-none ring-1 ring-inset ring-white/80 z-10" />

      {/* Icon & Label with black text */}
      <ChevronLeft className="w-4 h-4 stroke-[3] text-black shrink-0 relative z-20" />
      <span className="relative z-20 text-black drop-shadow-[0_1px_0_rgba(255,255,255,0.8)]">
        {label}
      </span>
    </button>
  );
}
