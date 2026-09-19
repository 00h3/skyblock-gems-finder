import React from "react";
import {
  Gamepad2,
  Crown,
  Swords,
  Box,
  Zap,
  Shield,
  Sparkles,
  Skull,
  Rocket,
  Ghost,
  Trophy,
  Compass,
  Users,
} from "lucide-react";

interface ServerIconBadgeProps {
  iconName?: string;
  gradient?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function ServerIconBadge({
  iconName = "Gamepad2",
  gradient = "from-[#5865F2] to-[#3a45a5]",
  size = "md",
  className = "",
}: ServerIconBadgeProps) {
  const sizeClasses = {
    sm: "h-8 w-8 rounded-[10px] text-white",
    md: "h-11 w-11 rounded-[14px] text-white",
    lg: "h-14 w-14 rounded-[18px] text-white",
    xl: "h-20 w-20 rounded-[24px] text-white",
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 26,
    xl: 36,
  };

  const IconComp = (() => {
    switch (iconName) {
      case "Gamepad2":
        return Gamepad2;
      case "Crown":
        return Crown;
      case "Swords":
        return Swords;
      case "Box":
        return Box;
      case "Zap":
        return Zap;
      case "Shield":
        return Shield;
      case "Sparkles":
        return Sparkles;
      case "Skull":
        return Skull;
      case "Rocket":
        return Rocket;
      case "Ghost":
        return Ghost;
      case "Trophy":
        return Trophy;
      case "Compass":
        return Compass;
      default:
        return Users;
    }
  })();

  return (
    <div
      className={`relative grid place-items-center bg-gradient-to-br ${gradient} shadow-[0_4px_12px_rgba(0,0,0,0.15),inset_0_1px_1px_rgba(255,255,255,0.35)] shrink-0 select-none ${sizeClasses[size]} ${className}`}
    >
      <IconComp size={iconSizes[size]} strokeWidth={2.2} className="drop-shadow-sm" />
    </div>
  );
}
