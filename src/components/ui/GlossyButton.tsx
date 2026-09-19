import React from "react";

interface GlossyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "white" | "subtle" | "accent";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
  loading?: boolean;
}

export function GlossyButton({
  children,
  variant = "white",
  size = "md",
  icon,
  loading = false,
  className = "",
  disabled,
  ...props
}: GlossyButtonProps) {
  const sizeClasses = {
    sm: "h-9 px-3 text-[13px] rounded-[12px]",
    md: "h-[44px] px-4 text-[14px] rounded-[14px]",
    lg: "h-[50px] px-5 text-[15px] rounded-[16px]",
  }[size];

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`qb-squircle press relative flex items-center justify-center gap-2 font-bold select-none text-[#17191d] active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none ${sizeClasses} ${className}`}
    >
      {loading ? (
        <div className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-[#fa4616] animate-spin shrink-0" />
      ) : (
        icon && <span className="shrink-0">{icon}</span>
      )}
      {children && <span>{children}</span>}
    </button>
  );
}
