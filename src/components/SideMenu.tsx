import { X, CalendarDays, Sparkles, ShoppingBag, Settings as SettingsIcon } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { GlossyAvatar } from "@/components/GlossyAvatar";
import { openFragments } from "@/lib/fragments-ui";
import { openEvents } from "@/lib/events-ui";
import { openSettings } from "@/lib/settings-ui";

const ITEMS = [
  {
    label: "Shop",
    icon: ShoppingBag,
    to: "/shop",
    image: "/assets/ui/icon-shop.svg",
    gradient: "from-amber-100 to-amber-200",
    shadow: "shadow-amber-500/10",
  },
  {
    label: "Events",
    icon: CalendarDays,
    to: "/events",
    image: "/assets/ui/icon-events.svg",
    gradient: "from-slate-100 to-slate-200",
    shadow: "shadow-slate-500/10",
  },
  {
    label: "Fragments",
    icon: Sparkles,
    to: "/fragments",
    image: "/qblock-plus-icon.png",
    gradient: "from-slate-100 to-slate-200",
    shadow: "shadow-slate-500/10",
  },
  {
    label: "Settings",
    icon: SettingsIcon,
    to: "/settings",
    image: "",
    gradient: "from-slate-100 to-slate-200",
    shadow: "shadow-slate-500/10",
  },
];

export function SideMenu({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const nav = useNavigate();
  const { qbUser } = useAuth();

  return (
    <>
      <div
        className={`fixed inset-0 z-[100] bg-black/25 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />

      <div
        className={`fixed inset-y-0 left-0 z-[101] w-[292px] bg-white shadow-[8px_0_40px_rgba(0,0,0,0.08)] transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between px-6 pt-[max(env(safe-area-inset-top),22px)] pb-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="block h-11 w-11 shrink-0 overflow-hidden rounded-[24%] bg-[#f1f2f4]">
              <GlossyAvatar
                height={44}
                className="h-full w-full object-cover"
                autoRotate={false}
                focusZone="head"
              />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-extrabold tracking-tight text-[#141414]">
                {qbUser?.displayName || "Player"}
              </p>
              <p className="truncate text-[12px] font-medium text-[#8b929d]">
                @{qbUser?.username || "player"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="press shrink-0 p-1 active:scale-90 transition-transform"
            aria-label="Close menu"
          >
            <X className="h-5 w-5 text-[#141414]" />
          </button>
        </div>

        <nav className="flex flex-col px-3.5 space-y-1">
          {ITEMS.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                onClose();
                if (item.label === "Events") {
                  if (typeof window !== "undefined") {
                    openEvents();
                  }
                } else if (item.label === "Fragments") {
                  if (typeof window !== "undefined") {
                    openFragments();
                  }
                } else if (item.label === "Settings") {
                  if (typeof window !== "undefined") {
                    openSettings();
                  }
                } else {
                  nav({ to: item.to as never });
                }
              }}
              className="press flex items-center gap-3.5 rounded-2xl px-3.5 py-2.5 text-left transition-all active:scale-[0.98] hover:bg-slate-50"
            >
              <div
                className={`w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br ${item.gradient} ${item.shadow} shadow-md flex items-center justify-center text-[#5d636e]`}
              >
                {item.image ? (
                  <img src={item.image} alt="" className="h-6 w-6 object-contain" />
                ) : (
                  <item.icon className="h-[19px] w-[19px] stroke-[2.2]" />
                )}
              </div>
              <span className="text-[15px] font-bold text-[#141414]">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </>
  );
}
