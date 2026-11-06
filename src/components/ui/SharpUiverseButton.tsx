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
 * Uiverse-style tactile glossy button with signature top specular highlights,
 * crisp borders, 3D bottom edge depth, and responsive tactile press.
 */
export function SharpUiverseButton({
  children,
  variant = "orange",
  fullWidth = false,
  size = "md",
  icon,
  className = "",
  disabled,
  type = "button",
  ...props
}: SharpUiverseButtonProps) {
  const isOrange = variant === "orange";
  const isWhite = variant === "white";

  // Tactile outer shell with crisp bevel shadow and gradient border
  const outerBorderClass = isOrange
    ? "border-2 border-[#c9380d] bg-gradient-to-b from-[#ff8533] via-[#fa4616] to-[#c9380d] text-white shadow-[0_4px_0_#a92d0a,0_8px_16px_rgba(201,56,13,0.25)]"
    : isWhite
    ? "border border-slate-200/90 bg-gradient-to-b from-[#ffffff] via-[#f8fafc] to-[#eef2f6] text-slate-900 shadow-[0_3px_0_#cbd5e1,0_6px_14px_rgba(0,0,0,0.06)]"
    : "border-2 border-[#1e232d] bg-gradient-to-b from-[#242832] via-[#1a1d24] to-[#12141a] text-white shadow-[0_4px_0_#0f1115,0_8px_16px_rgba(0,0,0,0.3)]";

  const sizeClasses =
    size === "sm"
      ? "px-3.5 py-1.5 text-[12px] min-h-[34px]"
      : size === "lg"
      ? "px-8 py-3 text-[15px] min-h-[50px]"
      : "px-5 py-2.5 text-[13.5px] min-h-[42px]";

  return (
    <button
      type={type}
      disabled={disabled}
      className={`group relative isolate cursor-pointer overflow-hidden rounded-[10px] font-black uppercase tracking-wider select-none transition-all duration-150 active:translate-y-[2px] active:shadow-none disabled:opacity-50 disabled:pointer-events-none disabled:translate-y-0 ${
        fullWidth ? "w-full" : "inline-flex"
      } ${outerBorderClass} ${sizeClasses} ${className}`}
      {...props}
    >
      {/* Top Half Glossy Specular Highlight (The signature Uiverse gloss) */}
      <span
        className={`absolute inset-x-0 top-0 h-[48%] pointer-events-none rounded-t-[8px] z-10 transition-opacity ${
          isOrange
            ? "bg-gradient-to-b from-white/45 via-white/15 to-transparent"
            : isWhite
            ? "bg-gradient-to-b from-white/90 via-white/40 to-transparent"
            : "bg-gradient-to-b from-white/25 to-transparent"
        }`}
      />

      {/* Inner highlight rim */}
      <span
        className={`absolute inset-0 rounded-[8px] pointer-events-none z-10 ${
          isOrange
            ? "ring-1 ring-inset ring-white/30"
            : isWhite
            ? "ring-1 ring-inset ring-white/80"
            : "ring-1 ring-inset ring-white/10"
        }`}
      />

      {/* Glossy light streak sheen on hover */}
      <span className="absolute inset-y-0 -left-full w-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 transition-transform duration-700 ease-out group-hover:translate-x-[250%] pointer-events-none z-10" />

      {/* Button content */}
      <span className="relative z-20 flex w-full items-center justify-center gap-2 drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]">
        {icon}
        {children}
      </span>
    </button>
  );
}

/**
 * Tactile Uiverse-styled "Go Back" button with exact glossiness, crisp chevron,
 * top specular highlight, and 3D tactile press.
 */
export function GoBackButton({
  onClick,
  className = "",
  variant = "white",
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
    <SharpUiverseButton
      type="button"
      variant={variant}
      size={size}
      onClick={onClick}
      className={`font-black tracking-wide ${className}`}
      aria-label={label}
      icon={<ChevronLeft className="w-4 h-4 stroke-[3] shrink-0" />}
    >
      <span>{label}</span>
    </SharpUiverseButton>
  );
}
