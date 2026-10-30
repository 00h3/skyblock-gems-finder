"use client";

import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  QBlockHomeIcon,
  QBlockAvatarIcon,
  DiscoverIcon,
  ChatIcon,
  ProfileIcon,
} from "@/components/icons";
import { LiquidGlass } from "@/components/ui/apple-tahoe-liquid-glass-button";
import { useDark } from "@/lib/ui-bus";

interface NavTab {
  to: string;
  label: string;
  icon: typeof QBlockHomeIcon;
}

const NAV_TABS: NavTab[] = [
  { to: "/", label: "Home", icon: QBlockHomeIcon },
  { to: "/discover", label: "Discover", icon: DiscoverIcon },
  { to: "/chat", label: "Chat", icon: ChatIcon },
  { to: "/avatar", label: "Avatar", icon: QBlockAvatarIcon },
  { to: "/profile", label: "Profile", icon: ProfileIcon },
];

export function LiquidBottomNav({ pathname }: { pathname: string }) {
  const navigate = useNavigate();
  const isDarkBus = useDark();
  const [isDarkClass, setIsDarkClass] = useState(false);

  useEffect(() => {
    if (typeof document !== "undefined") {
      setIsDarkClass(document.documentElement.classList.contains("dark"));
      const observer = new MutationObserver(() => {
        setIsDarkClass(document.documentElement.classList.contains("dark"));
      });
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });
      return () => observer.disconnect();
    }
  }, []);

  const isDark = isDarkBus || isDarkClass;

  const getIndexFromPath = useCallback((path: string) => {
    if (path === "/" || path === "") return 0;
    if (path.startsWith("/discover")) return 1;
    if (path.startsWith("/chat")) return 2;
    if (path.startsWith("/avatar")) return 3;
    if (path.startsWith("/profile") || path.startsWith("/settings")) return 4;
    return -1;
  }, []);

  const activeIndex = getIndexFromPath(pathname);

  const vibrate = (ms: number = 14) => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate(ms);
      } catch {
        // ignore
      }
    }
  };

  const handleTabClick = (tab: NavTab, index: number) => {
    vibrate(14);
    if (index !== activeIndex) {
      navigate({ to: tab.to as never });
    }
  };

  return (
    <div className="pointer-events-none absolute bottom-[max(12px,env(safe-area-inset-bottom))] left-0 right-0 z-40 flex justify-center px-3.5 select-none">
      <LiquidGlass
        material="regular"
        appearance={isDark ? "dark" : "light"}
        refraction={22}
        bezel={26}
        blur={2.5}
        saturation={1.3}
        brightness={isDark ? 0.95 : 1.08}
        mode="auto"
        className="pointer-events-auto relative w-full max-w-[370px] h-[52px] rounded-full p-1.5 flex items-center justify-between border border-black/[0.08] dark:border-white/[0.14] shadow-[0_12px_36px_rgba(0,0,0,0.14),0_2px_8px_rgba(0,0,0,0.06),inset_0_1px_1px_rgba(255,255,255,0.8)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,255,255,0.18)]"
      >
        <div className="relative w-full h-full flex items-center justify-between">
          {NAV_TABS.map((tab, idx) => {
            const isSelected = activeIndex === idx;
            const Icon = tab.icon;

            return (
              <button
                key={tab.to}
                type="button"
                onClick={() => handleTabClick(tab, idx)}
                aria-label={tab.label}
                aria-current={isSelected ? "page" : undefined}
                className="relative flex flex-1 flex-col items-center justify-center h-full rounded-full cursor-pointer outline-none select-none transition-transform active:scale-95"
              >
                {/* Flowing liquid glass active pill */}
                {isSelected && (
                  <motion.div
                    layoutId="liquidNavActivePill"
                    transition={{
                      type: "spring",
                      stiffness: 450,
                      damping: 32,
                      mass: 0.8,
                    }}
                    className="absolute inset-0 rounded-full overflow-hidden pointer-events-none"
                  >
                    <div className="w-full h-full rounded-full bg-white/60 dark:bg-white/18 backdrop-blur-md border border-white/80 dark:border-white/25 shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.95),0_2px_10px_rgba(0,70,140,0.12)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_2px_12px_rgba(0,0,0,0.5)]" />
                  </motion.div>
                )}

                <div
                  className={`relative z-10 flex flex-col items-center justify-center gap-0.5 transition-all duration-200 ${
                    isSelected ? "-translate-y-[1px]" : "hover:opacity-90"
                  }`}
                >
                  <div
                    className={`transition-all duration-200 flex items-center justify-center ${
                      isSelected
                        ? "scale-105 text-[#111827] dark:text-white"
                        : "text-[#6b7280] dark:text-[#9ca3af] hover:text-[#111827] dark:hover:text-white"
                    }`}
                  >
                    <Icon
                      filled={isSelected}
                      className="h-[18px] w-[18px] transition-colors duration-150"
                    />
                  </div>
                  <span
                    className={`text-[9.5px] tracking-tight leading-none transition-all duration-150 ${
                      isSelected
                        ? "font-extrabold text-[#111827] dark:text-white"
                        : "font-medium text-[#6b7280] dark:text-[#9ca3af]"
                    }`}
                  >
                    {tab.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </LiquidGlass>
    </div>
  );
}

export { LiquidBottomNav as BottomNav };
