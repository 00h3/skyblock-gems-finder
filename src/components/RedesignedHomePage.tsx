import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bell, Search, ChevronRight, Play } from "lucide-react";
import { ClapIcon, HeartAngleIcon } from "@/components/QbIcons";
import { PlayersIcon } from "@/components/icons/PlayersIcon";

import { useAuth } from "@/lib/auth-context";
import { GlossyAvatar } from "@/components/GlossyAvatar";
import { CurrencyPills } from "@/components/CurrencyPills";
import { MobileShell } from "@/components/MobileShell";
import { ProfileSheet } from "@/components/ProfileSheet";
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

  const [showSelfProfile, setShowSelfProfile] = useState(false);

  const visibleGames = GAMES.filter((g) => g.id !== "sandbox" && g.id !== "bedwars-golden-days");

  const grid =
    visibleGames.length > 1
      ? visibleGames
      : [...visibleGames, ...visibleGames, ...visibleGames, ...visibleGames];

  return (
    <MobileShell>
      <div className="min-h-[100dvh] bg-[#f1f2f4] pb-24">
        {/* Header */}
        <header className="flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),12px)] pb-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowSelfProfile(true)}
              className="qb-squircle press grid h-10 w-10 shrink-0 place-items-center active:scale-95 transition-transform"
              aria-label="Open profile"
            >
              <div className="h-8 w-8 overflow-hidden rounded-[10px] relative flex items-center justify-center">
                <GlossyAvatar
                  height={32}
                  className="h-full w-full object-cover"
                  autoRotate={false}
                  focusZone="head"
                  photoUrl={qbUser?.profilePhoto || undefined}
                  snapshot={qbUser?.avatarSnapshot ?? null}
                  frame={qbUser?.avatarSnapshot?.frameId}
                  portrait={!qbUser?.profilePhoto}
                />
              </div>
            </button>
            <div className="min-w-0 ml-1">
              <p className="truncate text-[15px] font-extrabold leading-tight tracking-tight text-[#141414]">
                {qbUser?.displayName || qbUser?.username || "Player"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <CurrencyPills
              compact
              maxItems={2}
              onSelect={(c) => setBuyModal(c === "gems" ? "gem" : "gold")}
            />
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
            className="qb-squircle flex h-[40px] w-full items-center gap-2.5 px-3.5 bg-white border border-black/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.03)] focus-within:border-[#fa4616] focus-within:ring-1 focus-within:ring-[#fa4616] transition-all"
          >
            <Search className="h-4 w-4 text-[#8b929d] shrink-0" />
            <input
              type="search"
              name="q"
              placeholder="Search experiences or players"
              className="flex-1 bg-transparent text-[13px] font-semibold text-[#141414] outline-none placeholder:text-[#8b929d]"
            />
          </form>
        </div>

        {/* Categories */}
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

        {/* Quick Entries: Fragments, Events */}
        <div className="mt-3.5 px-4 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                openFragments();
              }
            }}
            className="press qb-squircle flex items-center gap-2.5 p-2 bg-white border border-black/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.03)] cursor-pointer active:scale-95 transition-transform"
          >
            <div className="w-[42px] h-[42px] rounded-[10px] overflow-hidden shrink-0 shadow-inner bg-[#fff3ec] flex items-center justify-center p-1">
              <img
                src="https://file.garden/alGOOylwpAfCa6qP/file_00000000ded48210a85ba665493b1474.png"
                alt="Fragments"
                className="w-full h-full object-contain"
                draggable={false}
              />
            </div>
            <div className="flex flex-col items-start min-w-0 flex-1">
              <span className="text-[13px] font-extrabold tracking-tight text-[#141414] truncate w-full text-left">
                Fragments
              </span>
              <span className="text-[11px] font-semibold text-[#8b929d] truncate w-full text-left">
                Earn rewards
              </span>
            </div>
          </button>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                openEvents();
              }
            }}
            className="press qb-squircle flex items-center gap-2.5 p-2 bg-white border border-black/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.03)] cursor-pointer active:scale-95 transition-transform"
          >
            <div className="w-[42px] h-[42px] rounded-[10px] overflow-hidden shrink-0 shadow-inner bg-[#f1f2f4] flex items-center justify-center p-1">
              <img
                src="https://file.garden/alGOOylwpAfCa6qP/file_00000000ab448210ace3ea08875f15f6.png"
                alt="Events"
                className="w-full h-full object-contain"
                draggable={false}
              />
            </div>
            <div className="flex flex-col items-start min-w-0 flex-1">
              <span className="text-[13px] font-extrabold tracking-tight text-[#141414] truncate w-full text-left">
                Events
              </span>
              <span className="text-[11px] font-semibold text-[#8b929d] truncate w-full text-left">
                Calendar
              </span>
            </div>
          </button>
        </div>

        {/* Popular grid */}
        <section className="mt-5 px-4">
          <SectionHeader
            title="Popular right now"
            action="See all"
            onAction={() => navigate({ to: "/discover" as never })}
          />
          <div className="mt-2.5 grid grid-cols-3 gap-x-2.5 gap-y-3">
            {grid.slice(0, 9).map((g, i) => (
              <button
                key={`${g.id}-${i}`}
                onClick={() => setSheetGame(g)}
                className="press text-left active:scale-[0.97] transition-transform"
              >
                <span className="qb-squircle relative block aspect-square overflow-hidden">
                  {g.icon ? (
                    <img src={g.icon} alt={g.t} className="h-full w-full object-cover" />
                  ) : null}
                </span>
                <span className="mt-1.5 block truncate text-[11.5px] font-extrabold tracking-tight text-[#141414]">
                  {g.t}
                </span>
                <span className="mt-0.5 flex items-center gap-1.5 text-[10.5px] font-bold text-[#8b929d]">
                  <span className="flex items-center gap-0.5">
                    <PlayersIcon className="h-3 w-3" /> 1
                  </span>
                  <span className="flex items-center gap-0.5">
                    <ClapIcon className="h-3 w-3 text-[#fa4616]" /> 1
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>

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
      <h2 className="text-[15px] font-extrabold tracking-tight text-[#141414]">{title}</h2>
      {action ? (
        <button
          onClick={onAction}
          className="press flex items-center gap-0.5 text-[11.5px] font-bold text-[#8b929d]"
        >
          {action}
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}
