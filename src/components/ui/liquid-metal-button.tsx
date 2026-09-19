import React from "react";
import { motion } from "motion/react";

export interface LiquidMetalButtonProps {
  label?: string;
  viewMode?: "button" | "icon";
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  iconSrc?: string;
  children?: React.ReactNode;
}

export const LiquidMetalButton: React.FC<LiquidMetalButtonProps> = ({
  label = "Claim Starter Gift & Next",
  viewMode = "button",
  onClick,
  disabled = false,
  loading = false,
  className = "",
  iconSrc = "/categories/puzzle_transparent.png",
  children,
}) => {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={{ scale: disabled ? 1 : 1.01 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className={`relative group isolate overflow-hidden rounded-[14px] select-none cursor-pointer border border-[#fa4616] disabled:opacity-50 disabled:cursor-not-allowed ${
        viewMode === "icon"
          ? "h-[50px] w-[50px] p-2 flex items-center justify-center"
          : "w-full h-[52px] px-5 flex items-center justify-center"
      } ${className}`}
      style={{
        background: "linear-gradient(180deg, #ff6b35 0%, #fa4616 48%, #d83406 100%)",
        boxShadow:
          "0 8px 24px -4px rgba(250, 70, 22, 0.45), 0 2px 6px rgba(0, 0, 0, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.7), inset 0 -2px 4px rgba(160, 26, 0, 0.4)",
      }}
    >
      {/* Liquid Metal Specular Sheen (Subtle animated light reflection) */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 mix-blend-overlay group-hover:opacity-70 transition-opacity duration-500"
        style={{
          background:
            "linear-gradient(115deg, transparent 20%, rgba(255, 255, 255, 0.8) 45%, rgba(255, 255, 255, 0.95) 50%, rgba(255, 255, 255, 0.8) 55%, transparent 80%)",
          backgroundSize: "200% 100%",
          animation: "liquidSheen 4s ease-in-out infinite",
        }}
      />

      {/* Top Gloss Curve / Rim Light */}
      <div
        className="absolute inset-x-0 top-0 h-[48%] pointer-events-none rounded-t-[13px]"
        style={{
          background:
            "linear-gradient(180deg, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.05) 100%)",
        }}
      />

      {/* Inner Rim Outline */}
      <div className="absolute inset-[1px] rounded-[13px] border border-white/20 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center gap-2.5 text-white font-black text-[15px] tracking-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]">
        {iconSrc && (
          <img
            src={iconSrc}
            alt="Claim Gift Icon"
            className="h-6 w-6 object-contain shrink-0 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] transition-transform group-hover:scale-105"
          />
        )}
        {viewMode !== "icon" && (children || <span>{label}</span>)}
      </div>

      <style>{`
        @keyframes liquidSheen {
          0%, 100% { background-position: 200% 0; }
          50% { background-position: -200% 0; }
        }
      `}</style>
    </motion.button>
  );
};

export default LiquidMetalButton;
