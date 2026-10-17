import { useState } from "react";
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

const CATEGORIES = ["For you", "Popular", "Adventure", "Roleplay", "Obby", "Simulator"];

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
  const [category, setCategory] = useState("For you");
  const [discoverPopupOpen, setDiscoverPopupOpen] = useState(false);

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
        <header className="flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),12px)] pb-2.5">
          <div className="flex items-center gap-1.5">
            <CurrencyPills
              compact
              maxItems={2}
              onSelect={(c) => setBuyModal(c === "gems" ? "gem" : "gold")}
            />
          </div>

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
        </header>

        {/* Search */}
        <div className="px-4">
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
            className="flex h-[42px] w-full items-center gap-2.5 px-3.5 bg-white rounded-2xl border border-black/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.03)] focus-within:border-[#fa4616] focus-within:ring-1 focus-within:ring-[#fa4616] transition-all"
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

        {/* Quick Entries: 3 glossy boxes layout (Gems, Fragments, Events) */}
        <div className="mt-3.5 px-4 flex items-center gap-2.5">
          {/* First box: Opens Gems */}
          <button
            type="button"
            onClick={() => setBuyModal("gem")}
            className="qb-squircle press relative h-[52px] w-[52px] shrink-0 cursor-pointer active:scale-95 transition-transform"
            aria-label="Gems"
          />

          {/* Second box: Opens Fragments */}
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                openFragments();
              }
            }}
            className="qb-squircle press relative h-[52px] w-[52px] shrink-0 cursor-pointer active:scale-95 transition-transform"
            aria-label="Fragments"
          />

          {/* Third box: Opens Events */}
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                openEvents();
              }
            }}
            className="qb-squircle press relative h-[52px] flex-1 cursor-pointer active:scale-95 transition-transform"
            aria-label="Events"
          />
        </div>

        {/* Categories (now down below Fragments and Events) */}
        <div className="mt-3 flex gap-1.5 overflow-x-auto hide-scrollbar px-4">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`press shrink-0 rounded-[10px] px-3 py-1.5 text-[11.5px] font-bold transition-colors ${
                category === c ? "bg-[#141414] text-white" : "qb-squircle text-[#5f646d]"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Recently played (compact UI without player count or likes, game text hidden, no shadow) */}
        <section className="mt-4 px-4">
          <SectionHeader
            title="Recently played"
            action=">"
            onAction={() => setDiscoverPopupOpen(true)}
          />
          <div className="mt-2.5 flex items-center gap-2.5 overflow-x-auto hide-scrollbar py-0.5">
            {recentList.map((g, i) => (
              <button
                key={`recent-${g.id}-${i}`}
                onClick={() => setSheetGame(g)}
                className="press relative h-[72px] w-[72px] shrink-0 rounded-2xl overflow-hidden border border-black/[0.08] bg-slate-100 shadow-none [box-shadow:none] active:scale-95 transition-transform"
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
        <section className="mt-5 px-4">
          <SectionHeader
            title="Popular right now"
            action=">"
            onAction={() => setDiscoverPopupOpen(true)}
          />
          <div className="mt-2.5 grid grid-cols-3 gap-x-2.5 gap-y-3">
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
                <span className="mt-1.5 block w-full truncate text-left text-[11.5px] font-extrabold tracking-tight text-[#1A1D20]">
                  {g.t}
                </span>
                {/* Inverted: Heart first (99%), then player icon (1), bold grey */}
                <span className="mt-0.5 flex w-full items-center gap-2 text-left text-[10.5px] font-extrabold text-[#6B7280]">
                  <span className="flex items-center gap-0.5">
                    <PinkHeartIcon className="h-3.5 w-3.5" />
                    <span className="font-extrabold text-[#6B7280]">99%</span>
                  </span>
                  <span className="flex items-center gap-0.5">
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
