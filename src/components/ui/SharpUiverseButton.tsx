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
 * Rectangle Sharp Button inspired by Uiverse.io (adamgiebl)
 * Styled with vibrant orange & white gradients, crisp rectangle borders,
 * tactile inner container, and smooth press animations.
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
  const isDark = variant === "dark";

  // Outer 2px border gradient with rectangle sharp corners (rounded-[6px])
  const outerBorderClass = isOrange
    ? "bg-gradient-to-t from-[#c2410c] via-[#ea580c] to-[#ffedd5] shadow-[0_4px_14px_rgba(234,88,12,0.32)]"
    : isWhite
    ? "bg-gradient-to-t from-[#ea580c] via-[#fdba74] to-[#ffffff] shadow-[0_3px_10px_rgba(0,0,0,0.06)]"
    : "bg-gradient-to-t from-[#ea580c] via-[#ff7a00] to-[#ffffff] shadow-[0_4px_14px_rgba(0,0,0,0.3)]";

  // Inner container gradient with matching rectangle sharp corners (rounded-[4px])
  const innerSpanClass = isOrange
    ? "bg-[#ea580c] text-white bg-gradient-to-t from-[#c2410c] via-[#ea580c] to-[#f97316] [text-shadow:0_1px_2px_rgba(0,0,0,0.4)]"
    : isWhite
    ? "bg-white text-[#ea580c] bg-gradient-to-t from-[#fff7ed] via-[#ffffff] to-[#ffffff] [text-shadow:0_1px_0_rgba(255,255,255,0.8)] border border-orange-100/50"
    : "bg-[#14151b] text-white bg-gradient-to-t from-[#0e0f14] via-[#14151b] to-[#1c1f28]";

  const sizeClasses =
    size === "sm"
      ? "px-3.5 py-1.5 text-[12px]"
      : size === "lg"
      ? "px-8 py-3.5 text-[15px]"
      : "px-5 py-2.5 text-[13.5px]";

  return (
    <button
      type={type}
      disabled={disabled}
      className={`relative cursor-pointer opacity-95 hover:opacity-100 transition-all p-[2px] rounded-[6px] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none select-none ${
        fullWidth ? "w-full" : "inline-flex"
      } ${outerBorderClass} ${className}`}
      {...props}
    >
      <span
        className={`w-full h-full flex items-center justify-center gap-2 rounded-[4px] font-black uppercase tracking-wider ${sizeClasses} ${innerSpanClass}`}
      >
        {icon}
        {children}
      </span>
    </button>
  );
}

/**
 * Sharp Rectangle "Go Back" button with orange & white styling
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
      className={className}
      aria-label={label}
      icon={<ChevronLeft className="w-4 h-4 stroke-[3] shrink-0" />}
    >
      <span>{label}</span>
    </SharpUiverseButton>
  );
}
