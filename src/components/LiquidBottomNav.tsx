import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import {
  QBlockHomeIcon,
  QBlockAvatarIcon,
  DiscoverIcon,
  ChatIcon,
  ProfileIcon,
} from "@/components/icons";

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

  const getIndexFromPath = useCallback((path: string) => {
    if (path === "/" || path === "") return 0;
    if (path.startsWith("/discover")) return 1;
    if (path.startsWith("/chat")) return 2;
    if (path.startsWith("/avatar")) return 3;
    if (path.startsWith("/profile") || path.startsWith("/settings")) return 4;
    return -1;
  }, []);

  const activeIndex = getIndexFromPath(pathname);

  const vibrate = (ms: number = 12) => {
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
    <div className="pointer-events-none absolute bottom-[max(10px,env(safe-area-inset-bottom))] left-0 right-0 z-40 flex justify-center px-3.5 select-none">
      <nav
        aria-label="Main Navigation"
        className="pointer-events-auto relative w-full max-w-[364px] h-[46px] rounded-full px-1.5 flex items-center justify-between qb-glossy-menu bg-white/85 dark:bg-[#13151b]/85 backdrop-blur-2xl border border-black/[0.08] dark:border-white/[0.12] shadow-[0_8px_24px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.9)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.12)] transition-all duration-200"
      >
        {NAV_TABS.map((tab, idx) => {
          const isSelected = activeIndex === idx;
          const Icon = tab.icon;

          return (
            <button
              key={tab.to}
              type="button"
              onClick={() => handleTabClick(tab, idx)}
              aria-label={tab.label}
              className={`press relative flex flex-1 flex-col items-center justify-center h-[38px] rounded-full gap-0.5 cursor-pointer outline-none select-none transition-all duration-150 ${
                isSelected
                  ? "bg-black/[0.06] dark:bg-white/[0.1] text-[#1A1D20] dark:text-white shadow-2xs font-semibold"
                  : "text-[#6B7280] hover:text-[#1A1D20] dark:hover:text-white font-medium"
              }`}
            >
              <div
                className={`transition-transform duration-150 flex items-center justify-center ${
                  isSelected ? "scale-105 -translate-y-px" : "scale-100"
                }`}
              >
                <Icon
                  filled={isSelected}
                  className={`h-[18px] w-[18px] transition-colors duration-150 ${
                    isSelected
                      ? "text-[#1A1D20] dark:text-white"
                      : "text-[#6B7280]"
                  }`}
                />
              </div>
              <span
                className={`text-[9.5px] tracking-tight leading-none transition-colors duration-150 ${
                  isSelected
                    ? "font-bold text-[#1A1D20] dark:text-white"
                    : "font-medium text-[#6B7280]"
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
