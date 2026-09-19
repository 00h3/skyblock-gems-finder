import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { X } from "lucide-react";

/**
 * In-game grey glossy menu panel (Roblox-style).
 * - closeable (X + backdrop click + Esc)
 * - draggable by its header bar
 * - animated open/close + staggered row reveal
 * - uses the project's own PNG/SVG icon assets, no generic icon font
 */

type MenuItem = {
  label: string;
  icon: string;
  to?: string;
  event?: string;
};

const ITEMS: MenuItem[] = [
  { label: "Requests", icon: "/assets/ui/icon-friends.svg", to: "/friends" },
  { label: "Self View", icon: "/icon-avatar.png", to: "/profile" },
  { label: "Captures", icon: "/assets/ui/icon-ribbon.svg", event: "qb-menu-captures" },
  { label: "Music", icon: "/assets/ui/icon-star.svg", event: "qb-menu-music" },
  { label: "Report", icon: "/assets/ui/icon-hardcore.svg", event: "qb-menu-report" },
  { label: "Leaderboard", icon: "/assets/ui/icon-leaderboard.svg", event: "qb-menu-leaderboard" },
  { label: "Emotes", icon: "/emojis/face/uwu.png", event: "qb-menu-emotes" },
  { label: "Inventory", icon: "/assets/ui/icon-shop.svg", to: "/inventory" },
  { label: "Respawn", icon: "/icon-packs/ui-play.png", event: "qb-menu-respawn" },
  { label: "Settings", icon: "/assets/controls/icon_cog.png", to: "/profile" },
];

export function GameSideMenu({
  isOpen,
  onClose,
  lastPlayed,
}: {
  isOpen: boolean;
  onClose: () => void;
  lastPlayed?: string;
}) {
  const navigate = useNavigate();
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(
    null,
  );

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { startX: e.clientX, startY: e.clientY, baseX: offset.x, baseY: offset.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    setOffset({ x: d.baseX + (e.clientX - d.startX), y: d.baseY + (e.clientY - d.startY) });
  };
  const onPointerUp = (e: React.PointerEvent) => {
    drag.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* pointer already released */
    }
  };

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-[110] bg-black/35 backdrop-blur-[2px] transition-opacity duration-200 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <div
        style={{ transform: `translate3d(${offset.x}px, ${offset.y}px, 0)` }}
        className={`fixed left-3 top-[max(14px,env(safe-area-inset-top))] z-[111] w-[268px] ${
          isOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        <div
          className={`overflow-hidden rounded-[20px] border border-white/20 bg-gradient-to-b from-[#4b4f56]/95 via-[#33363c]/95 to-[#232529]/96 text-white shadow-[0_24px_60px_rgb(0_0_0_/_0.45)] backdrop-blur-xl transition-all duration-300 ease-[cubic-bezier(0.2,0.9,0.25,1)] ${
            isOpen ? "translate-x-0 scale-100 opacity-100" : "-translate-x-6 scale-[0.96] opacity-0"
          }`}
        >
          {/* glossy top sheen */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/20 to-transparent" />

          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="relative flex cursor-grab items-center gap-2 border-b border-white/12 px-3 py-2.5 active:cursor-grabbing"
          >
            <span className="flex flex-col gap-[3px]">
              <i className="block h-[2px] w-4 rounded-full bg-white/55" />
              <i className="block h-[2px] w-4 rounded-full bg-white/55" />
              <i className="block h-[2px] w-4 rounded-full bg-white/55" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-extrabold tracking-tight">Game Menu</p>
              {lastPlayed && (
                <p className="truncate text-[9px] uppercase tracking-[0.14em] text-white/45">
                  Last played · {lastPlayed}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close menu"
              className="press grid h-7 w-7 place-items-center rounded-lg border border-white/20 bg-white/10 transition-transform active:scale-90"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="relative max-h-[62vh] overflow-y-auto p-2">
            {ITEMS.map((item, i) => (
              <button
                key={item.label}
                type="button"
                style={{ transitionDelay: isOpen ? `${60 + i * 28}ms` : "0ms" }}
                onClick={() => {
                  onClose();
                  if (item.to) navigate({ to: item.to as never });
                  else if (item.event) window.dispatchEvent(new CustomEvent(item.event));
                }}
                className={`press mb-1 flex w-full items-center gap-3 rounded-[14px] border border-white/12 bg-gradient-to-b from-white/12 to-white/[0.03] px-3 py-2.5 text-left shadow-[inset_0_1px_0_rgb(255_255_255_/_0.18)] transition-all duration-300 hover:border-white/30 hover:from-white/20 active:scale-[0.97] ${
                  isOpen ? "translate-x-0 opacity-100" : "-translate-x-3 opacity-0"
                }`}
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] border border-white/15 bg-black/25">
                  <img
                    src={item.icon}
                    alt=""
                    className="h-[18px] w-[18px] object-contain"
                    draggable={false}
                  />
                </span>
                <span className="text-[13px] font-bold tracking-tight">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
