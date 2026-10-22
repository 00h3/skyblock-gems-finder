import { useState, useEffect } from "react";
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
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev === 0 ? 1 : 0));
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const [showSelfProfile, setShowSelfProfile] = useState(false);

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
      <div className="min-h-[100dvh] bg-[#f1f2f4] pb-24">
        {/* Header */}
        <header className="flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),14px)] pb-3">
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
              className="qb-squircle press relative h-9 px-3.5 shrink-0 flex items-center justify-center font-extrabold text-[12.5px] text-[#17191d] active:scale-95 transition-transform select-none"
              aria-label="Free"
            >
              Free
            </button>

            {/* Notifications */}
            <button
              type="button"
              onClick={() => navigate({ to: "/notifications" as never })}
              className="qb-squircle press relative grid h-9 w-9 shrink-0 place-items-center active:scale-95 transition-transform"
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

        {/* Quick Entries: Shop, Events (rectangle in middle), Fragments — blank glossy squircles */}
        <div className="mt-1 px-4 flex items-center gap-3">
          {/* Shop */}
          <button
            type="button"
            onClick={() => navigate({ to: "/shop" as never })}
            className="qb-squircle press relative h-[70px] w-[70px] shrink-0 cursor-pointer active:scale-95 transition-transform overflow-hidden"
            aria-label="Shop"
          />

          {/* Events (Rectangle in middle with more length) */}
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                openEvents();
              }
            }}
            className="qb-squircle press relative h-[70px] flex-1 cursor-pointer active:scale-95 transition-transform overflow-hidden"
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
            className="qb-squircle press relative h-[70px] w-[70px] shrink-0 cursor-pointer active:scale-95 transition-transform overflow-hidden"
            aria-label="Fragments"
          />
        </div>

        {/* Search */}
        <div className="px-4 mt-3.5">
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
            className="flex h-[44px] w-full items-center gap-2.5 px-4 bg-white rounded-2xl border border-black/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.03)] focus-within:border-[#fa4616] focus-within:ring-1 focus-within:ring-[#fa4616] transition-all"
          >
            <Search className="h-4 w-4 text-[#6B7280] shrink-0" />
            <input
              type="search"
              name="q"
              placeholder="Search experiences or players"
              className="flex-1 bg-transparent text-[13px] font-semibold text-[#1A1D20] outline-none placeholder:text-[#6B7280]"
            />
          </form>
        </div>

        {/* Switching Glossy Banner */}
        <div className="px-4 mt-3.5">
          <div
            onClick={() => setActiveSlide((prev) => (prev === 0 ? 1 : 0))}
            className="qb-squircle press relative h-[120px] w-full overflow-hidden cursor-pointer select-none"
          >
            {/* Top gloss curve + shimmer sweep (same glossiness as mail/notify) */}
            <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/45 to-transparent pointer-events-none z-10" />
            <span
              className="pointer-events-none absolute inset-0 -translate-x-[160%] skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/40 to-transparent z-10"
              style={{
                animation: "glossyShineSweep 16s cubic-bezier(0.4, 0, 0.2, 1) infinite",
              }}
            />

            {/* Slider track */}
            <div
              className="flex h-full w-[200%] transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${activeSlide * 50}%)` }}
            >
              {/* Slide 1 */}
              <div className="w-1/2 h-full flex flex-col items-center justify-center px-6 pb-2 relative z-10">
                <span className="text-[17px] font-black tracking-tight text-[#1A1D20]">
                  Untitled Banner
                </span>
              </div>

              {/* Slide 2 */}
              <div className="w-1/2 h-full flex flex-col items-center justify-center px-6 pb-2 relative z-10">
                <span className="text-[17px] font-black tracking-tight text-[#1A1D20]">
                  Untitled Banner
                </span>
              </div>
            </div>

            {/* Animated 2-dot indicator ● ● */}
            <div className="absolute bottom-3 inset-x-0 z-20 flex items-center justify-center gap-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveSlide(0);
                }}
                aria-label="Slide 1"
                className={`h-2 rounded-full transition-all duration-300 ${
                  activeSlide === 0
                    ? "w-5 bg-[#1A1D20]"
                    : "w-2 bg-black/20 hover:bg-black/35"
                }`}
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveSlide(1);
                }}
                aria-label="Slide 2"
                className={`h-2 rounded-full transition-all duration-300 ${
                  activeSlide === 1
                    ? "w-5 bg-[#1A1D20]"
                    : "w-2 bg-black/20 hover:bg-black/35"
                }`}
              />
            </div>
          </div>
        </div>

        {/* Recently played */}
        <section className="mt-6 px-4">
          <SectionHeader
            title="Recently played"
            action=">"
            onAction={() => setDiscoverPopupOpen(true)}
          />
          <div className="mt-3 flex items-center gap-3 overflow-x-auto hide-scrollbar py-0.5">
            {recentList.map((g, i) => (
              <button
                key={`recent-${g.id}-${i}`}
                onClick={() => setSheetGame(g)}
                className="press relative h-[76px] w-[76px] shrink-0 rounded-2xl overflow-hidden border border-black/[0.08] bg-slate-100 shadow-none [box-shadow:none] active:scale-95 transition-transform"
                title={g.t}
                aria-label={g.t}
              >
                {g.icon ? (
                  <img src={g.icon} alt={g.t} className="h-full w-full object-cover" />
                ) : null}
              </button>
            ))}
          </div>
        </section>

        {/* Popular grid */}
        <section className="mt-7 px-4">
          <SectionHeader
            title="Popular right now"
            action=">"
            onAction={() => setDiscoverPopupOpen(true)}
          />
          <div className="mt-3 grid grid-cols-3 gap-x-3 gap-y-4">
            {grid.slice(0, 9).map((g, i) => (
              <button
                key={`${g.id}-${i}`}
                onClick={() => setSheetGame(g)}
                className="press flex flex-col items-start w-full text-left active:scale-[0.97] transition-transform"
              >
                <span className="relative block aspect-square w-full overflow-hidden rounded-2xl border border-black/[0.08] bg-slate-100 shadow-none [box-shadow:none]">
                  {g.icon ? (
                    <img src={g.icon} alt={g.t} className="h-full w-full object-cover" />
                  ) : null}
                </span>
                <span className="mt-2 block w-full truncate text-left text-[12px] font-extrabold tracking-tight text-[#1A1D20]">
                  {g.t}
                </span>
                <span className="mt-1 flex w-full items-center gap-2.5 text-left text-[11px] font-bold text-[#6B7280]">
                  <span className="flex items-center gap-1">
                    <PinkHeartIcon className="h-3.5 w-3.5" />
                    <span className="font-extrabold text-[#6B7280]">99%</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <PlayersIcon className="h-3.5 w-3.5" />
                    <span className="font-extrabold text-[#6B7280]">1</span>
                  </span>
                </span>
              </button>
            ))}
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
