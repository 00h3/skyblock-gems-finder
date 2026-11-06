import { useState, useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { PinkHeartIcon } from "@/components/QbIcons";
import { PlayersIcon } from "@/components/icons/PlayersIcon";

import { useAuth } from "@/lib/auth-context";
import { CurrencyPills } from "@/components/CurrencyPills";
import { MobileShell } from "@/components/MobileShell";
import { ProfileSheet } from "@/components/ProfileSheet";
import { DiscoveryPopup } from "@/components/DiscoveryPopup";
import { getRecentlyPlayedGameIds } from "@/lib/games-cache";
import { openFragments } from "@/lib/fragments-ui";
import { openEvents } from "@/lib/events-ui";
import { openShop } from "@/lib/shop-ui";
import { ThreeDTestimonials } from "@/components/ui/3d-testimonials";
import LaserFlow from "@/components/ui/LaserFlow";

export function RedesignedHomePage({
  GAMES,
  setBuyModal,
  setSheetGame,
}: {
  GAMES: any[];
  setBuyModal: (type: string) => void;
  setSheetGame: (game: any) => void;
}) {
  const navigate = useNavigate();
  const { qbUser } = useAuth();
  const [discoverPopupOpen, setDiscoverPopupOpen] = useState(false);

  const [showSelfProfile, setShowSelfProfile] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [showBetaBadge, setShowBetaBadge] = useState(false);
  const bannerCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const dismissed = localStorage.getItem("qb_beta_badge_dismissed_v2");
      if (!dismissed) {
        setShowBetaBadge(true);
      }
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev === 0 ? 1 : 0));
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const visibleGames = GAMES.filter(
    (g) =>
      g.id !== "sandbox" &&
      g.id !== "bedwars-golden-days" &&
      g.id !== "block-fall" &&
      g.id !== "blockfall" &&
      g.id !== "bedwars",
  );

  const recentIds = getRecentlyPlayedGameIds();
  const recentGames = recentIds
    .map((id) => GAMES.find((g) => g.id === id))
    .filter(Boolean);
  const recentList = recentGames.length > 0 ? recentGames.slice(0, 8) : visibleGames.slice(0, 6);

  const grid =
    visibleGames.length > 1
      ? visibleGames
      : [...visibleGames, ...visibleGames, ...visibleGames, ...visibleGames];

  return (
    <MobileShell>
      <div className="relative min-h-[100dvh] bg-[#f1f2f4] dark:bg-[#0e0f12] pb-24 overflow-hidden">
        {/* Top Aurora Borealis Glow Effect: subtle ethereal orange shades mixed with white/peach, weighted towards the left into the top bar */}
        <div
          className="pointer-events-none absolute top-0 left-0 right-0 h-48 overflow-hidden select-none z-0"
          aria-hidden="true"
        >
          {/* Main soft orange aura plume on the top-left */}
          <div
            className="absolute -top-12 -left-10 w-[280px] h-[190px] rounded-full blur-[42px] opacity-40 dark:opacity-20 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at 30% 25%, rgba(255, 122, 0, 0.45) 0%, rgba(255, 165, 65, 0.28) 38%, rgba(255, 240, 225, 0.2) 65%, transparent 80%)",
            }}
          />
          {/* Gentle secondary wave undulating across into the top bar */}
          <div
            className="absolute -top-16 left-12 w-[340px] h-[160px] rounded-full blur-[50px] opacity-30 dark:opacity-15 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at 35% 35%, rgba(255, 145, 36, 0.32) 0%, rgba(255, 205, 150, 0.22) 45%, rgba(255, 255, 255, 0.32) 70%, transparent 85%)",
            }}
          />
          {/* Soft linear mist blending white and warm orange into the background */}
          <div
            className="absolute top-0 left-0 right-0 h-24 opacity-35 dark:opacity-10 pointer-events-none"
            style={{
              background:
                "linear-gradient(180deg, rgba(255, 150, 40, 0.16) 0%, rgba(255, 255, 255, 0.22) 40%, transparent 100%)",
            }}
          />
        </div>

        {/* Header */}
        <header className="relative z-10 flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),14px)] pb-3">
          <div className="flex items-center gap-1.5">
            <CurrencyPills
              compact
              maxItems={2}
              onSelect={(c) => setBuyModal(c === "gems" ? "gem" : "gold")}
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Free button: in place of mail, same style as notif, no icon */}
            <button
              type="button"
              onClick={() => navigate({ to: "/rewards" as never })}
              className="qb-squircle press relative h-9 px-3.5 shrink-0 flex items-center justify-center font-extrabold text-[12.5px] text-[#17191d] dark:text-white active:scale-95 transition-transform select-none cursor-pointer"
              aria-label="Free"
            >
              Free
            </button>

            {/* Notifications */}
            <button
              type="button"
              onClick={() => navigate({ to: "/notifications" as never })}
              className="qb-squircle press relative grid h-9 w-9 shrink-0 place-items-center active:scale-95 transition-transform cursor-pointer"
              aria-label="Notifications"
            >
              <img
                src="/icons/bell-svgrepo-com.svg"
                alt="Notifications"
                className="h-[18px] w-[18px] object-contain dark:invert"
              />
              <span className="absolute right-2 top-2 h-[6px] w-[6px] rounded-full bg-[#ff3b30] ring-2 ring-white" />
            </button>
          </div>
        </header>

        {/* Search — positioned on top of the 3 quick entry cards */}
        <div className="px-4 mt-1.5 mb-2.5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const input = form.elements.namedItem("q") as HTMLInputElement;
              if (input && input.value.trim()) {
                navigate({ to: "/search", search: { q: input.value.trim() } } as any);
              } else {
                navigate({ to: "/search" as never });
              }
            }}
            className="qb-squircle group press relative flex h-[40px] w-full items-center gap-2.5 px-3.5 overflow-hidden select-none transition-all duration-300 hover:border-[#fa4616]/80 hover:[animation:orangeOutlineGlow_2.2s_ease-in-out_infinite] focus-within:border-[#fa4616] focus-within:[animation:orangeOutlineGlow_2.2s_ease-in-out_infinite] rounded-[13px]"
          >
            {/* Top gloss curve (signature mail glossiness) */}
            <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/50 dark:from-white/15 to-transparent pointer-events-none rounded-t-[12px] z-10" />

            {/* Animated glossy light sweep on hover / focus */}
            <span
              className="pointer-events-none absolute inset-0 -translate-x-[160%] skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/45 dark:via-white/20 to-transparent z-10 group-hover:translate-x-[240%] group-focus-within:translate-x-[240%] transition-transform duration-1000 ease-out"
            />

            <Search className="relative z-20 h-3.5 w-3.5 text-[#6B7280] group-hover:text-[#fa4616] group-focus-within:text-[#fa4616] shrink-0 transition-colors" />
            <input
              type="search"
              name="q"
              placeholder="Search experiences or players"
              className="relative z-20 flex-1 bg-transparent text-[12.5px] font-semibold text-[#1A1D20] dark:text-white outline-none placeholder:text-[#6B7280] dark:placeholder:text-[#8E95A0]"
            />
          </form>
        </div>

        {/* Quick Entries: Shop, Events, Fragments (reverted to blank glossy squircles without text and image) */}
        <div className="px-4 flex items-center gap-2.5">
          {/* Shop */}
          <button
            type="button"
            onClick={() => {
              openShop();
            }}
            className="qb-squircle press relative h-[60px] w-[60px] shrink-0 cursor-pointer active:scale-95 transition-transform overflow-hidden rounded-[14px]"
            aria-label="Shop"
          />

          {/* Events */}
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                openEvents();
              }
            }}
            className="qb-squircle press relative h-[60px] flex-1 cursor-pointer active:scale-95 transition-transform overflow-hidden rounded-[14px]"
            aria-label="Events"
          />

          {/* Fragments */}
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                openFragments();
              }
            }}
            className="qb-squircle press relative h-[60px] w-[60px] shrink-0 cursor-pointer active:scale-95 transition-transform overflow-hidden rounded-[14px]"
            aria-label="Fragments"
          />
        </div>

        {/* Featured Floating Islands Event Component with LaserFlow flowing from above */}
        <div className="relative px-4 mt-3">
          {/* LaserFlow light beam positioned above the event component */}
          <div className="absolute -top-20 left-4 right-4 h-[132px] pointer-events-none z-20 overflow-visible">
            <LaserFlow
              surfaceRef={bannerCardRef}
              beamPosition={0.5}
              color="#ff6600"
              intensity={2.2}
              flare={1.8}
              spread={1.8}
              spill={1.4}
              fog={0.3}
              dust={2.0}
              streaks={2.0}
              pulse={1.8}
              speed={1.6}
              theme="dark"
            />
          </div>

          <div
            ref={bannerCardRef}
            onClick={() => {
              if (typeof window !== "undefined") openEvents();
            }}
            className="qb-squircle press relative h-[112px] w-full overflow-hidden cursor-pointer select-none rounded-[16px] text-white shadow-xl transition-all duration-300 border border-white/20 bg-slate-950"
          >
            {/* Background Floating Islands Event Graphic */}
            <img
              src="https://maxwell.z3ki.dev/bot/_files/floating-islands/floating-islands.png"
              alt="Floating Islands Event"
              className="absolute inset-0 h-full w-full object-cover opacity-90 transition-transform duration-500 hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-transparent" />

            {/* Glossy top specular highlight & inner rim reflection */}
            <div className="absolute inset-x-0 top-0 h-3/5 bg-gradient-to-b from-white/35 via-white/10 to-transparent pointer-events-none rounded-t-[16px] z-10" />
            <div className="absolute -top-10 -left-10 w-44 h-24 bg-white/25 rounded-full blur-xl pointer-events-none z-10" />
            <div className="absolute inset-0 rounded-[16px] ring-1 ring-inset ring-white/25 pointer-events-none z-10" />

            <div className="relative z-20 h-full p-3.5 flex items-center justify-between">
              <div className="flex flex-col justify-center max-w-[76%]">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-black uppercase tracking-wider text-orange-200 bg-orange-600/80 border border-orange-400/50 px-2 py-0.5 rounded-full backdrop-blur-xs">
                    Live Event
                  </span>
                </div>
                <h3 className="mt-1 text-[18px] sm:text-[20px] font-black tracking-tight text-white leading-tight drop-shadow-md">
                  Floating Islands
                </h3>
                <p className="text-[11px] font-semibold text-amber-100/95 mt-0.5 line-clamp-1 drop-shadow-sm">
                  Explore floating islands & collect rare treasures
                </p>
              </div>

              <div className="relative z-20 shrink-0 w-14 h-14 rounded-2xl bg-black/40 backdrop-blur-md border border-white/30 grid place-items-center shadow-lg overflow-hidden p-1.5">
                <img
                  src="https://maxwell.z3ki.dev/bot/_files/goggle-character/goggle_character.png"
                  alt="Floating Islands Mascot"
                  className="w-full h-full object-contain drop-shadow"
                  draggable={false}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Recently played */}
        <section className="mt-4 px-4">
          <SectionHeader
            title="Recently played"
            action=">"
            onAction={() => setDiscoverPopupOpen(true)}
          />
          <div className="mt-2 flex items-center gap-2 overflow-x-auto hide-scrollbar py-0.5">
            {recentList.map((g, i) => (
              <button
                key={`recent-${g.id}-${i}`}
                onClick={() => setSheetGame(g)}
                className="press relative h-[56px] w-[56px] shrink-0 rounded-[10px] overflow-hidden border border-black/[0.08] dark:border-white/10 bg-slate-100 shadow-none [box-shadow:none] active:scale-95 transition-transform"
                title={g.t}
                aria-label={g.t}
              >
                {g.icon ? (
                  <img src={g.icon} alt={g.t} className="h-full w-full object-cover" draggable={false} />
                ) : null}
              </button>
            ))}
          </div>
        </section>

        {/* Popular grid */}
        <section className="mt-4 px-4">
          <SectionHeader
            title="Popular right now"
            action=">"
            onAction={() => setDiscoverPopupOpen(true)}
          />
          <div className="mt-2 grid grid-cols-3 gap-x-3 gap-y-3.5">
            {grid.slice(0, 9).map((g, i) => (
              <button
                key={`${g.id}-${i}`}
                onClick={() => setSheetGame(g)}
                className="press flex flex-col items-start w-full text-left active:scale-[0.97] transition-transform select-none"
              >
                <span className="relative block aspect-square w-full overflow-hidden rounded-[10px] border border-black/[0.08] dark:border-white/10 bg-slate-100 shadow-none [box-shadow:none]">
                  {g.icon ? (
                    <img src={g.icon} alt={g.t} className="h-full w-full object-cover" draggable={false} />
                  ) : null}
                </span>
                <span className="mt-1.5 block w-full truncate text-left text-[11.5px] font-extrabold tracking-tight text-[#1A1D20] dark:text-white leading-tight pl-0">
                  {g.t}
                </span>
                <span className="mt-0.5 flex w-full items-center gap-1.5 text-left text-[10px] font-bold text-[#6B7280] pl-0">
                  <span className="flex items-center gap-0.5">
                    <PinkHeartIcon className="h-2.5 w-2.5" />
                    <span className="font-extrabold text-[#6B7280]">99%</span>
                  </span>
                  <span className="flex items-center gap-0.5">
                    <PlayersIcon className="h-2.5 w-2.5" />
                    <span className="font-extrabold text-[#6B7280]">1</span>
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* 3D Community Player Reviews */}
        <section className="mt-6 px-4">
          <div className="mt-1">
            <ThreeDTestimonials className="py-2" />
          </div>
        </section>


      </div>

      <DiscoveryPopup
        open={discoverPopupOpen}
        onClose={() => setDiscoverPopupOpen(false)}
        onSelectGame={(g) => setSheetGame(g)}
      />

      {showSelfProfile && qbUser && (
        <ProfileSheet
          user={{
            id: qbUser.uid,
            n: qbUser.displayName || qbUser.username || "Player",
            color: "blue",
            online: true,
            isOwn: true,
            avatarSnapshot: qbUser.avatarSnapshot,
            frame: qbUser.avatarSnapshot?.frameId,
            profilePhoto: qbUser.profilePhoto,
            email: qbUser.email ?? undefined,
            username: qbUser.username,
            bio: qbUser.bio,

            badges: qbUser.badges,
          }}
          onClose={() => setShowSelfProfile(false)}
        />
      )}

      {/* Beta Badge Popup — clean card overlay without embed, disappears on click & saved to localStorage */}
      {showBetaBadge && (
        <div
          className="fixed inset-0 z-[200] grid place-items-center bg-black/60 p-4 select-none cursor-pointer animate-fade-in"
          onClick={() => {
            setShowBetaBadge(false);
            try {
              localStorage.setItem("qb_beta_badge_dismissed_v2", "true");
            } catch {}
          }}
        >
          <div className="relative max-w-[320px] w-full flex flex-col items-center justify-center active:scale-95 transition-transform">
            <img
              src="https://maxwell.z3ki.dev/bot/_files/qblock-beta-badge-alt/2403C62A-326C-4422-B9F1-304485F3998A.png"
              alt="QBlock Beta Badge"
              className="w-full h-auto object-contain drop-shadow-2xl pointer-events-none select-none"
              draggable={false}
            />
            <span className="mt-3 text-[11px] font-extrabold text-white/90 bg-black/50 px-3 py-1 rounded-full border border-white/20 shadow-md">
              Tap anywhere to close
            </span>
          </div>
        </div>
      )}
    </MobileShell>
  );
}

function SectionHeader({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-[15px] font-extrabold tracking-tight text-[#1A1D20]">{title}</h2>
      {action ? (
        <button
          type="button"
          onClick={onAction}
          className="press flex items-center justify-center p-1 -mr-1 text-[17px] font-black leading-none text-[#6B7280] hover:text-[#1A1D20] active:scale-90 transition-transform cursor-pointer select-none"
          aria-label={title}
        >
          {action}
        </button>
      ) : null}
    </div>
  );
}
