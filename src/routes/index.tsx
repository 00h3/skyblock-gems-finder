import { RedesignedHomePage } from "../components/RedesignedHomePage";
import { QBlockLoadingMenu } from "@/components/QBlockLoadingMenu";
import { getRecentlyPlayedGameIds, schedulePlayedGame } from "@/lib/games-cache";
import baseplateIcon from "@/assets/game-baseplate.jpg";
import { OrangeHeartIcon } from "@/components/QbIcons";

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { BuyModal } from "@/components/CurrencyModal";
import {
  Bell,
  ChevronRight,
  ChevronDown,
  Plus,
  X,
  Check,
  Inbox,
  BadgeCheck,
  Users,
  Search,
  Star,
  Swords,
  Gamepad2,
  MoreHorizontal,
  RotateCcw,
  Loader2,
  Trophy,
  ShoppingBag,
  Zap,
  Wheat,
  EggFried,
  Target,
  MapPin,
  CalendarDays,
  TicketCheck,
  CheckCircle2,
  Circle,
  Gift,
  Coins,
  Shirt,
  Scissors,
  Sparkles,
  User,
  Palette,
} from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";
import { GameSheet, type GameMeta } from "@/components/GameSheet";
import { TextureItemArt, type Item as AvatarShopItem } from "@/routes/inventory";
import { useCurrency, addCurrency } from "@/lib/currency";
import { useAuth } from "@/lib/auth-context";
import { ProfileSheet, type ProfileUser } from "@/components/ProfileSheet";
import { useAvatarColor } from "@/lib/avatar";
import { PrivateServerSheet } from "@/components/PrivateServerSheet";
import { setNavHidden } from "@/lib/ui-bus";
import { CurrencyPills } from "@/components/CurrencyPills";
import qblockGameLoaderUrl from "../assets/imported/IMG_6930_1786893754942.png?url";
import skyblockNewHorizonUrl from "../assets/skyblock/sky-pass-placeholder.png?url";
import scpEscapeBannerUrl from "../assets/skyblock/sky-pass-placeholder.png?url";
import { GlossyAvatar, isIraAccount } from "@/components/GlossyAvatar";
import { PlayersIcon } from "@/components/icons/PlayersIcon";
import { QBlockMailIcon } from "@/components/icons";
import { useEquippedFrame } from "@/lib/avatar";

import { FirstTimeSectionLoader } from "@/components/ui/FirstTimeSectionLoader";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "QBLOCK V2" },
      {
        name: "description",
        content: "QBLOCK V2 — modern 3D avatar customization and sandbox game platform.",
      },
      { property: "og:title", content: "QBLOCK V2" },
      {
        property: "og:description",
        content: "QBLOCK V2 — modern 3D avatar customization and sandbox game platform.",
      },
    ],
  }),
  component: () => (
    <FirstTimeSectionLoader id="home">
      <HomePage />
    </FirstTimeSectionLoader>
  ),
});

export type Game = {
  id: string;
  t: string;
  hue: string;
  bio: string;
  mode: string;
  modeColor: string;
  icon?: string;
  video?: string;
  players?: string;
  playable?: boolean;
  likes?: string;
  progress?: number;
  updated?: boolean;
};

export const GAMES: Game[] = [
  {
    id: "skyblock",
    t: "SkyBlock",
    hue: "from-sky-300 via-emerald-300 to-emerald-200",
    bio: "Build your island from scratch in the sky.",
    mode: "SkyBlock",
    modeColor: "text-sky-600",
    icon: baseplateIcon,
    players: "1",
    playable: true,
    likes: "99%",
    updated: true,
    progress: 0,
  },
  {
    id: "baseplate",
    t: "Cell 99",
    hue: "from-emerald-400 via-teal-400 to-sky-300",
    bio: "Endless flat voxel terrain powered by the SkyBlock engine. Build, test, and explore freely in Cell 99.",
    mode: "Sandbox",
    modeColor: "text-emerald-600",
    icon: baseplateIcon,
    players: "1",
    playable: true,
    likes: "99%",
    updated: true,
    progress: 0,
  },
];

// TRENDING_GAMES intentionally empty until the live catalog is connected.
const TRENDING_GAMES: Game[] = [];

// Keep the discovery feed feeling full without adding another API call yet.
// The real catalog can replace this array later; the UI already supports a
// long, scrollable result set.
const FEED_GAMES = Array.from({ length: 50 }, (_, i) => ({
  ...GAMES[i % GAMES.length],
  id: `${GAMES[i % GAMES.length].id}-${i + 1}`,
  sourceId: GAMES[i % GAMES.length].id,
}));

function UploadedHomePage({ setBuyModal }: { setBuyModal: (type: string) => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<GameMeta | null>(null);
  const [mailOpen, setMailOpen] = useState(false);
  const q = query.trim().toLowerCase();
  const recentIds = getRecentlyPlayedGameIds();
  const recentGames = GAMES.filter((g) => recentIds.includes(g.id));
  const visible = GAMES.filter(
    (game) =>
      game.id !== "block-fall" &&
      game.id !== "bedwars" &&
      (!q || `${game.t} ${game.bio} ${game.mode}`.toLowerCase().includes(q)),
  );
  const sections = [
    ...(recentGames.length > 0 ? [{ title: "Recent Game", games: recentGames }] : []),
    { title: "Guess You Like It", games: [...visible].reverse() },
    { title: "RPG Game", games: visible.slice().sort((a, b) => a.t.localeCompare(b.t)) },
  ];
  const dwellCancelRef = useRef<(() => void) | null>(null);
  useEffect(() => () => dwellCancelRef.current?.(), []);
  const openGame = (game: Game) => {
    dwellCancelRef.current?.();
    dwellCancelRef.current = schedulePlayedGame(game.id);
    setOpen({
      t: game.t,
      p: game.players ?? "0",
      hue: game.hue,
      bio: game.bio,
      id: game.id,
      icon: game.icon,
      playable: game.playable,
    });
  };
  const closeGameSheet = () => {
    dwellCancelRef.current?.();
    dwellCancelRef.current = null;
    setOpen(null);
  };

  return (
    <MobileShell>
      <div className="relative min-h-full bg-background pb-7 overflow-hidden">
        {/* Top Aurora Borealis Glow Effect */}
        <div
          className="pointer-events-none absolute top-0 left-0 right-0 h-44 overflow-hidden select-none z-0"
          aria-hidden="true"
        >
          <div
            className="absolute -top-12 -left-10 w-[280px] h-[190px] rounded-full blur-[42px] opacity-40 dark:opacity-20 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at 30% 25%, rgba(255, 122, 0, 0.45) 0%, rgba(255, 165, 65, 0.28) 38%, rgba(255, 240, 225, 0.2) 65%, transparent 80%)",
            }}
          />
          <div
            className="absolute -top-16 left-12 w-[340px] h-[160px] rounded-full blur-[50px] opacity-30 dark:opacity-15 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at 35% 35%, rgba(255, 145, 36, 0.32) 0%, rgba(255, 205, 150, 0.22) 45%, rgba(255, 255, 255, 0.32) 70%, transparent 85%)",
            }}
          />
          <div
            className="absolute top-0 left-0 right-0 h-24 opacity-35 dark:opacity-10 pointer-events-none"
            style={{
              background:
                "linear-gradient(180deg, rgba(255, 150, 40, 0.16) 0%, rgba(255, 255, 255, 0.22) 40%, transparent 100%)",
            }}
          />
        </div>

        <header className="relative z-10 flex items-center gap-2 px-4 pt-6">
          <Link
            to={"/profile" as never}
            className="press relative shrink-0"
            aria-label="Open profile"
          >
            <span className="block h-10 w-10 overflow-hidden rounded-[12px] bg-[#e2e6ec] shadow-level1 ring-1 ring-slate-300/70">
              <GlossyAvatar
                photoUrl={qbUser?.profilePhoto}
                snapshot={qbUser?.avatarSnapshot}
                imageFallbackOnly={true}
                height={40}
                className="h-full w-full pointer-events-none"
                autoRotate={false}
                focusZone="head"
              />
            </span>
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-success ring-2 ring-background" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[16px] font-extrabold leading-tight tracking-tight">
              QBLOCK
            </div>
            <div className="truncate text-[10.5px] text-text-secondary">
              Welcome to early access!
            </div>
          </div>
          <div className="home-currency-bubble shrink-0">
            <CurrencyPills
              compact
              maxItems={2}
              onSelect={(currency) => setBuyModal(currency === "gems" ? "gem" : "gold")}
            />
          </div>
          <button
            type="button"
            onClick={() => navigate({ to: "/mail" as never })}
            className="press liquid-button liquid-button-ghost grid h-9 w-9 shrink-0 place-items-center rounded-[12px]"
            aria-label="Open inbox"
          >
            <QBlockMailIcon className="h-4 w-4" />
          </button>
        </header>

        <label className="liquid-search mx-4 mt-3.5 flex h-10 items-center gap-2 px-3">
          <Search className="h-[15px] w-[15px] text-text-muted" />
          <input
            value={query}
            onFocus={() => navigate({ to: "/search" as never })}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search games"
            className="flex-1 bg-transparent text-[12.5px] outline-none placeholder:text-text-muted"
          />
        </label>

        <div className="mx-4 mt-3 rounded-[18px] border border-[#f0d26a]/70 bg-[#fff9df] px-4 py-3 shadow-[0_8px_20px_rgb(180_119_0_/_0.08)]">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] overflow-hidden bg-amber-100">
              <img
                src="https://file.garden/alGOOylwpAfCa6qP/13FD00B3-7CDA-4B91-B1CC-42F496FC79D7.png"
                alt="Welcome Early Access"
                className="h-full w-full object-contain"
              />
            </span>
            <div>
              <div className="text-[13.5px] font-black text-slate-900">Welcome Early Access</div>
              <div className="mt-0.5 text-[10.5px] font-semibold text-[#806719]">
                Play, create, and help shape QBLOCK.
              </div>
            </div>
          </div>
        </div>

        {/* Quick Entries: Shop, Event, Fragment */}
        <div className="mx-4 mt-4 grid grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={() => navigate({ to: "/shop" as never })}
            className="press group relative aspect-[4/5] overflow-hidden rounded-[18px] bg-slate-900 text-left shadow-[0_6px_16px_rgba(0,0,0,0.12)] border-0 cursor-pointer"
          >
            <img
              src="/file_000000004d5881f498ee54c310e345a5_1788908394839.png"
              alt="Shop"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {/* Restrained gloss overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-white/10 pointer-events-none" />
            <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
            <div className="relative z-10 flex h-full flex-col justify-end p-2.5">
              <span className="text-[9px] font-black uppercase tracking-wider text-[#fa4616] drop-shadow">
                Catalog
              </span>
              <span className="text-[13px] font-black text-white leading-tight drop-shadow-md">
                Shop
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
            className="press group relative aspect-[4/5] overflow-hidden rounded-[18px] bg-slate-900 text-left shadow-[0_6px_16px_rgba(0,0,0,0.12)] border-0 cursor-pointer"
          >
            <img
              src="https://file.garden/alGOOylwpAfCa6qP/file_00000000ab448210ace3ea08875f15f6.png"
              alt="Events"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {/* Restrained gloss overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-white/10 pointer-events-none" />
            <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
            <div className="relative z-10 flex h-full flex-col justify-end p-2.5">
              <span className="text-[9px] font-black uppercase tracking-wider text-[#fa4616] drop-shadow">
                Live Now
              </span>
              <span className="text-[13px] font-black text-white leading-tight drop-shadow-md">
                Events
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                openFragments();
              }
            }}
            className="press group relative aspect-[4/5] overflow-hidden rounded-[18px] bg-slate-900 text-left shadow-[0_6px_16px_rgba(0,0,0,0.12)] border-0 cursor-pointer"
          >
            <img
              src="https://file.garden/alGOOylwpAfCa6qP/file_00000000ded48210a85ba665493b1474.png"
              alt="Fragments"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {/* Restrained gloss overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-white/10 pointer-events-none" />
            <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
            <div className="relative z-10 flex h-full flex-col justify-end p-2.5">
              <span className="text-[9px] font-black uppercase tracking-wider text-[#fa4616] drop-shadow">
                Collect
              </span>
              <span className="text-[13px] font-black text-white leading-tight drop-shadow-md">
                Fragments
              </span>
            </div>
          </button>
        </div>

        {sections.map((section) => (
          <section key={section.title} className="mt-5">
            <div className="mb-2.5 flex items-center justify-between px-4">
              <h2 className="text-[15px] font-extrabold tracking-tight">{section.title}</h2>
              <ChevronRight className="h-3.5 w-3.5 text-text-secondary" />
            </div>
            <div className="hide-scrollbar flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4">
              {section.games.map((game) => (
                <button
                  key={`${section.title}-${game.id}`}
                  type="button"
                  onClick={() => openGame(game)}
                  className="press w-[124px] shrink-0 snap-start text-left"
                >
                  <div
                    className={`relative h-[124px] overflow-hidden rounded-[14px] bg-gradient-to-br ${game.hue}`}
                    style={{
                      boxShadow:
                        "0 1px 0 rgba(255,255,255,.35) inset, 0 -1px 0 rgba(0,0,0,.2) inset, 0 6px 14px rgba(15,23,42,.14)",
                    }}
                  >
                    {game.icon && (
                      <img
                        src={game.icon}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-white/10" />
                    {game.id === "bedwars" && (
                      <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ background: "rgba(0,0,0,0.32)", backdropFilter: "blur(1px)" }}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="rgba(255,255,255,0.85)"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0110 0v4" />
                          </svg>
                          <span className="text-[9px] font-extrabold text-white/80 tracking-wide">Locked</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="mt-1.5 px-0.5">
                    <div className="truncate text-[12px] font-lilita tracking-wide leading-tight">{game.t}</div>
                    <div className="mt-1 flex items-center gap-2.5 text-[10px] text-text-muted">
                      <span className="flex items-center gap-1">
                        <OrangeHeartIcon className="h-3 w-3" />
                        {game.likes}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))}
        {!visible.length && (
          <p className="px-4 py-12 text-center text-[13px] text-text-muted">No games found.</p>
        )}
      </div>
      {open && (
        <GameSheet
          g={open}
          onClose={closeGameSheet}
          onPlay={(serverId?: string) => {
            const id = open.id;
            dwellCancelRef.current = null; // keep the dwell timer running into the game
            setOpen(null);
            if (id) {
              navigate({
                to: "/game/$id" as never,
                params: { id } as never,
                search: (serverId ? { server: serverId } : undefined) as never,
              });
            }
          }}
        />
      )}
      {mailOpen && <MailModal onClose={() => setMailOpen(false)} />}
    </MobileShell>
  );
}

// ── Quest definitions ─────────────────────────────────────────────────────────
type QuestStatus = { progress: number; completed: boolean };
type Quest = {
  id: string;
  title: string;
  desc: string;
  goal: number;
  unit: string;
  icon: React.ReactNode;
  reward: string;
  rewardIcon: React.ReactNode;
};
const QUESTS: Quest[] = [
  {
    id: "wood",
    title: "Timber!",
    desc: "Collect 10 Wood",
    goal: 10,
    unit: "wood",
    icon: <Zap className="h-4 w-4" />,
    reward: "50 Coins",
    rewardIcon: <Coins className="h-3 w-3" />,
  },
  {
    id: "wheat",
    title: "Harvest Season",
    desc: "Harvest 20 Wheat",
    goal: 20,
    unit: "wheat",
    icon: <Wheat className="h-4 w-4" />,
    reward: "80 Coins",
    rewardIcon: <Coins className="h-3 w-3" />,
  },
  {
    id: "eggs",
    title: "Egg Collector",
    desc: "Collect 5 Eggs",
    goal: 5,
    unit: "eggs",
    icon: <EggFried className="h-4 w-4" />,
    reward: "30 Coins",
    rewardIcon: <Coins className="h-3 w-3" />,
  },
  {
    id: "sell",
    title: "Merchant",
    desc: "Sell 10 Items",
    goal: 10,
    unit: "items",
    icon: <ShoppingBag className="h-4 w-4" />,
    reward: "120 Coins",
    rewardIcon: <Coins className="h-3 w-3" />,
  },
  {
    id: "enemy",
    title: "First Blood",
    desc: "Defeat your first enemy",
    goal: 1,
    unit: "enemy",
    icon: <Swords className="h-4 w-4" />,
    reward: "100 Coins",
    rewardIcon: <Coins className="h-3 w-3" />,
  },
  {
    id: "agora",
    title: "Market Explorer",
    desc: "Visit The Agora",
    goal: 1,
    unit: "visit",
    icon: <MapPin className="h-4 w-4" />,
    reward: "60 Coins",
    rewardIcon: <Coins className="h-3 w-3" />,
  },
];

// ─── Home Page ─────────────────────────────────────────────────────────────────
function ArchiveHomePage() {
  const navigate = useNavigate();
  const { qbUser } = useAuth();
  const equippedFrame = useEquippedFrame();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<GameMeta | null>(null);
  const [realmsOpen, setRealmsOpen] = useState(false);

  const archiveRecentIds = getRecentlyPlayedGameIds();
  const archiveRecentGames = GAMES.filter((g) => archiveRecentIds.includes(g.id));

  const sections = [
    ...(archiveRecentGames.length > 0 ? [{ title: "Recent Game", games: archiveRecentGames }] : []),
    { title: "Guess You Like It", games: [...GAMES].reverse() },
    { title: "RPG Game", games: [GAMES[2], GAMES[0], GAMES[1]] },
  ];
  const normalizedQuery = query.trim().toLowerCase();
  const matches = (game: Game) =>
    !normalizedQuery ||
    `${game.t} ${game.bio} ${game.mode}`.toLowerCase().includes(normalizedQuery);

  const dwellCancelRef = useRef<(() => void) | null>(null);
  useEffect(() => () => dwellCancelRef.current?.(), []);
  const openGame = (game: Game) => {
    dwellCancelRef.current?.();
    dwellCancelRef.current = schedulePlayedGame(game.id);
    setNavHidden(true);
    setOpen({
      t: game.t,
      p: game.players ?? "0",
      hue: game.hue,
      bio: game.bio,
      id: game.id,
      icon: game.icon,
      playable: game.playable,
      developer: "Ira",
    });
  };

  const closeGame = () => {
    dwellCancelRef.current?.();
    dwellCancelRef.current = null;
    setNavHidden(false);
    setOpen(null);
  };

  const launchGame = (game: GameMeta) => {
    dwellCancelRef.current = null; // keep the dwell timer running into the game
    setNavHidden(false);
    setOpen(null);
    if (game.id === "sandbox") {
      navigate({ to: "/game/sandbox" as never });
    } else if (game.id) {
      navigate({ to: "/game/$id" as never, params: { id: game.id } as never });
    }
  };

  return (
    <MobileShell>
      <div className="min-h-full bg-surface-2 pb-8">
        <header className="px-4 pt-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate({ to: "/profile" as never })}
              className="press relative shrink-0"
              aria-label="Open profile"
            >
              <span className="block h-11 w-11 overflow-hidden rounded-[14px] bg-[#fff7d6] ring-1 ring-border-soft shadow-level1">
                <GlossyAvatar
                  frame={equippedFrame}
                  height={62}
                  className="h-full w-full"
                  autoRotate={false}
                  focusZone="head"
                />
              </span>
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-success ring-2 ring-background" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[19px] font-extrabold tracking-tight">
                {qbUser?.displayName || "QBLOCK"}
              </h1>
            </div>
            <button
              type="button"
              onClick={() => navigate({ to: "/notifications" as never })}
              className="press grid h-10 w-10 place-items-center rounded-[13px] bg-background shadow-level1"
              aria-label="Notifications"
            >
              <img
                src="/icons/bell-svgrepo-com.svg"
                alt="Notifications"
                className="h-[20px] w-[20px] object-contain dark:invert"
              />
              <span className="absolute ml-5 mt-[-19px] h-2 w-2 rounded-full bg-danger ring-2 ring-background" />
            </button>
          </div>
        </header>

        <label className="mx-4 mt-4 flex h-12 items-center gap-3 rounded-2xl bg-background px-4 shadow-level1">
          <Search className="h-[18px] w-[18px] shrink-0 text-text-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search games, worlds, and friends…"
            className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-text-muted"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="press grid h-6 w-6 place-items-center rounded-full bg-surface-2"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5 text-text-muted" />
            </button>
          )}
        </label>

        {sections.map((section) => {
          const games = section.games.filter(matches);
          if (!games.length) return null;
          return (
            <section key={section.title} className="mt-6">
              <div className="mb-3 flex items-center justify-between px-4">
                <h2 className="text-[17px] font-extrabold tracking-tight">{section.title}</h2>
                <ChevronRight className="h-4 w-4 text-text-muted" />
              </div>
              <div className="hide-scrollbar flex gap-3 overflow-x-auto px-4 pb-1">
                {games.map((game) => (
                  <button
                    key={`${section.title}-${game.id}`}
                    type="button"
                    onClick={() => openGame(game)}
                    className="press w-[178px] shrink-0 text-left"
                  >
                    <div className="relative aspect-[1.08] overflow-hidden rounded-[18px] bg-surface shadow-level1">
                      {game.icon && (
                        <img
                          src={game.icon}
                          alt={game.t}
                          className="absolute inset-0 h-full w-full object-cover"
                          draggable={false}
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                      <div className="absolute inset-x-3 bottom-3">
                        <p className="truncate text-[15px] font-lilita tracking-wide text-white">{game.t}</p>
                        <p className="mt-1 text-[10px] font-semibold text-white/75">
                          {game.players ?? "0"} playing · {game.likes ?? "0"} likes
                        </p>
                      </div>
                      {game.updated && (
                        <span className="absolute left-3 top-3 rounded-md bg-primary px-2 py-1 text-[9px] font-extrabold text-primary-foreground">
                          Updated
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          );
        })}

        <div className="mx-4 mt-7 grid grid-cols-1 gap-3">
          <button
            type="button"
            onClick={() => setRealmsOpen(true)}
            className="press flex min-h-[74px] items-center gap-3 rounded-2xl bg-background p-3 text-left shadow-level1"
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary-hover">
              <Users className="h-4 w-4" />
            </span>
            <span>
              <span className="block text-[12px] font-extrabold">Realms</span>
              <span className="mt-0.5 block text-[10px] text-text-muted">Play with friends</span>
            </span>
          </button>
        </div>
      </div>
      {open && <GameSheet g={open} onClose={closeGame} onPlay={() => launchGame(open)} />}
      {realmsOpen && <PrivateServerSheet onClose={() => setRealmsOpen(false)} />}
    </MobileShell>
  );
}

function HomePage() {
  const [sheetGame, setSheetGame] = useState<GameMeta | null>(null);
  const [buyModal, setBuyModal] = useState<"gold" | "gem" | null>(null);
  const [friendProfile, setFriendProfile] = useState<ProfileUser | null>(null);
  const [mailOpen, setMailOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [questsOpen, setQuestsOpen] = useState(false);
  const [gameLoading, setGameLoading] = useState<{
    id: string;
    t: string;
    icon?: string;
  } | null>(null);
  const nav = useNavigate();

  const launchGame = (id: string) => {
    const g = GAMES.find((x) => x.id === id);
    if (g) {
      setGameLoading({ id: g.id!, t: g.t!, icon: g.icon });
      setTimeout(() => {
        if (g.id === "sandbox") nav({ to: "/game/sandbox" as never });
        else nav({ to: "/game/$id" as never, params: { id: g.id } as never });
      }, 1200);
    }
  };

  const closeSheet = () => setSheetGame(null);

  return (
    <>
      <RedesignedHomePage
        GAMES={GAMES}
        setBuyModal={(t: string) => setBuyModal(t === "gem" ? "gem" : "gold")}
        setSheetGame={setSheetGame}
      />
      {/* Modals */}
      {sheetGame && (
        <GameSheet g={sheetGame} onClose={closeSheet} onPlay={() => launchGame(sheetGame.id!)} />
      )}
      {buyModal && <BuyModal type={buyModal} onClose={() => setBuyModal(null)} />}
      {friendProfile && (
        <ProfileSheet
          user={friendProfile}
          onClose={() => setFriendProfile(null)}
          onChat={() => {
            nav({ to: "/chat/$id" as never, params: { id: friendProfile.id } as never });
            setFriendProfile(null);
          }}
        />
      )}
      {mailOpen && <MailModal onClose={() => setMailOpen(false)} />}
      {shopOpen && <ShopSheet onClose={() => setShopOpen(false)} />}
      {questsOpen && <QuestsSheet onClose={() => setQuestsOpen(false)} />}
      {gameLoading && <GameLoadingOverlay />}
    </>
  );
}

function GameLoadingOverlay() {
  return <QBlockLoadingMenu fadeOutOnDone={false} speedMs={20} />;
}

// ── Canvas drawn inside loading overlay ────────────────────────���──────────────
function GameLoadCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const draw = () => {
      const w = el.clientWidth || 400,
        h = el.clientHeight || 200;
      el.width = w * (window.devicePixelRatio || 1);
      el.height = h * (window.devicePixelRatio || 1);
      const ctx = el.getContext("2d");
      if (!ctx) return;
      ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
      // Sky gradient
      const sky = ctx.createLinearGradient(0, 0, 0, h * 0.55);
      sky.addColorStop(0, "#bae6fd");
      sky.addColorStop(1, "#e0f2fe");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);
      // Ground
      const hy = h * 0.44;
      ctx.fillStyle = "#94a3b8";
      ctx.fillRect(0, hy, w, h - hy);
      // Perspective grid
      ctx.strokeStyle = "rgba(255,255,255,0.32)";
      ctx.lineWidth = 1;
      const vx = w / 2;
      for (let i = -32; i <= 32; i++) {
        ctx.beginPath();
        ctx.moveTo(vx, hy);
        ctx.lineTo(vx + i * (w / 10), h);
        ctx.stroke();
      }
      for (let i = 1; i <= 16; i++) {
        const p = Math.pow(i / 16, 2.2),
          y = hy + p * (h - hy);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    };
    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, []);
  return <canvas ref={canvasRef} className="w-full h-full block" />;
}

// ── Continue Playing Card (horizontal, like reference image) ──────────────────
function ContinuePlayingCard({ g, onPlay }: { g: Game; onPlay: () => void }) {
  return (
    <button
      onClick={onPlay}
      className="press w-full flex items-center gap-0 rounded-[20px] overflow-hidden relative flat-card"
      style={{ background: "#fff" }}
    >
      {/* Thumbnail */}
      <div className="relative shrink-0 overflow-hidden" style={{ width: 90, height: 90 }}>
        <img src={g.icon} alt={g.t} className="w-full h-full object-cover" draggable={false} />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(90deg,transparent 55%,white 100%)" }}
        />
        {g.updated && (
          <div
            className="absolute top-2 left-2 px-1.5 py-0.5 rounded-full text-[7.5px] font-bold text-white"
            style={{
              background: "linear-gradient(90deg,#22c55e,#16a34a)",
              boxShadow: "0 1px 5px rgba(34,197,94,0.5)",
            }}
          >
            Updated
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 py-3 pl-1">
        <div
          className="text-[15px] font-lilita tracking-wide leading-tight"
          style={{ color: "#141414" }}
        >
          {g.t}
        </div>
        <div className="flex items-center gap-2.5 mt-1">
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
            <span className="text-[10px] font-semibold" style={{ color: "#6b7280" }}>
              {g.players} playing
            </span>
          </div>
        </div>
        {/* Progress bar */}
        {g.progress !== undefined && (
          <div className="mt-2 pr-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-semibold" style={{ color: "#9ca3af" }}>
                Progress
              </span>
              <span className="text-[9px] font-bold" style={{ color: "#f59e0b" }}>
                {g.progress}%
              </span>
            </div>
            <div
              className="h-[7px] rounded-full overflow-hidden relative"
              style={{
                background: "rgba(0,0,0,0.07)",
                boxShadow: "inset 0 1px 2px rgba(0,0,0,0.08)",
              }}
            >
              <div
                className="h-full rounded-full relative overflow-hidden"
                style={{
                  width: `${g.progress}%`,
                  background: "linear-gradient(90deg,#fbbf24,#f59e0b)",
                  boxShadow: "0 0 8px rgba(245,158,11,0.45), inset 0 1px 0 rgba(255,255,255,0.45)",
                }}
              >
                <div
                  className="absolute inset-x-0 top-0 h-1/2 rounded-full"
                  style={{
                    background: "linear-gradient(180deg,rgba(255,255,255,0.42),transparent)",
                  }}
                />
                <div
                  className="absolute inset-0 animate-shimmer"
                  style={{
                    background:
                      "linear-gradient(90deg,transparent,rgba(255,255,255,0.42),transparent)",
                    backgroundSize: "200% 100%",
                  }}
                />
              </div>
            </div>
          </div>
        )}
        <div className="text-[9.5px] mt-1 pr-2" style={{ color: "#c0c0c0" }}>
          Survival · Multiplayer
        </div>
      </div>

      {/* Play button — clean flat orange */}
      <div className="shrink-0 mx-3">
        <div
          className="px-4 py-[7px] rounded-[10px] text-[13px] font-extrabold"
          style={{
            background: "linear-gradient(160deg,#ff8a68 0%,#fa4616 100%)",
            color: "#ffffff",
            boxShadow: "0 1px 0 rgba(255,255,255,0.50) inset, 0 1px 3px rgba(0,0,0,0.08)",
            fontFamily: "var(--font-heading)",
          }}
        >
          Play
        </div>
      </div>
    </button>
  );
}

function MoreGameRow({ g, onPlay }: { g: Game & { sourceId?: string }; onPlay: () => void }) {
  return (
    <button
      onClick={onPlay}
      className="press w-full flex items-center gap-0 rounded-[20px] overflow-hidden relative flat-card text-left"
      style={{ background: "#fff" }}
    >
      <div className="relative shrink-0 overflow-hidden" style={{ width: 82, height: 82 }}>
        <img src={g.icon} alt={g.t} className="w-full h-full object-cover" draggable={false} />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(90deg,transparent 45%,#fff 100%)" }}
        />
      </div>
      <div className="flex-1 min-w-0 py-3 pl-1 pr-2">
        <div
          className="truncate text-[14px] font-bold"
          style={{ color: "#141414", fontFamily: "var(--font-heading)" }}
        >
          {g.t.replace("[NEW] ", "")}
        </div>
        <div className="mt-1 text-[10px] font-medium" style={{ color: "#6b7280" }}>
          {g.players} playing · {g.mode}
        </div>
        <div
          className="mt-2 h-[6px] overflow-hidden rounded-full"
          style={{ background: "rgba(0,0,0,0.07)" }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${g.progress ?? 0}%`,
              background: "linear-gradient(90deg,#ff7a52,#fa4616)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.55)",
            }}
          />
        </div>
      </div>
      <span
        className="relative mr-3 shrink-0 overflow-hidden rounded-[11px] px-3.5 py-2 text-[12px] font-bold"
        style={{
          background: "linear-gradient(145deg,#ff7a52,#fa4616)",
          color: "#1a0a00",
          boxShadow: "0 2px 0 #b8900e, inset 0 1px 0 rgba(255,255,255,0.46)",
        }}
      >
        Continue
      </span>
    </button>
  );
}

// ─── Home Header ───────────────────────────────────────────────────────────────
function HomeHeader({
  onBell,
  onCurrency,
}: {
  onBell: () => void;
  onQuests: () => void;
  onCurrency: (currency: "gold" | "gems") => void;
}) {
  const { qbUser } = useAuth();
  const xpInLvl = qbUser ? qbUser.xp % 500 : 0;
  const xpPct = Math.min(100, (xpInLvl / 500) * 100);
  const [selfProfileOpen, setSelfProfileOpen] = useState(false);

  return (
    <div className="px-4 pt-[max(16px,env(safe-area-inset-top))]">
      {selfProfileOpen && qbUser && (
        <ProfileSheet
          user={{
            id: qbUser.uid,
            n: qbUser.displayName || qbUser.username || "Player",
            color: "#7c8cff",
            online: true,
            isOwn: true,
            staff: qbUser.staff,
            bio: qbUser.bio,
            username: qbUser.username,
            customId: qbUser.customId,
            avatarSnapshot: qbUser.avatarSnapshot,
            profilePhoto: qbUser.profilePhoto,
          }}
          onClose={() => setSelfProfileOpen(false)}
        />
      )}
      <div className="flex items-center gap-3 rounded-[18px] px-4 py-3 relative overflow-hidden flat-card">
        {/* Avatar thumbnail — tap to open your profile sheet */}
        <button
          onClick={() => setSelfProfileOpen(true)}
          className="press shrink-0 relative rounded-[10px] overflow-hidden bg-[#f3f4f6]"
          aria-label="Open your profile"
          style={{ width: 70, height: 82, border: "1px solid #dfe3e8" }}
        >
          <GlossyAvatar height={82} className="h-full w-full" autoRotate={false} focusZone="head" />

          {/* Online dot */}
          <span
            className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-400"
            style={{ border: "2px solid #fff" }}
          />
        </button>

        {/* Name + level + XP */}
        <div className="flex-1 min-w-0 relative z-10">
          <div className="flex items-center gap-2">
            <span
              className="text-[16px] font-extrabold leading-tight truncate"
              style={{ color: "#141414", fontFamily: "var(--font-heading)" }}
            >
              {qbUser?.displayName ?? "Player"}
            </span>
            <span
              className="shrink-0 text-[10px] font-extrabold px-2 py-0.5 rounded-full"
              style={{
                background: "#fff7d6",
                color: "#a16207",
                border: "1px solid rgba(245,200,0,0.25)",
              }}
            >
              Lv.&nbsp;{qbUser?.level ?? 1}
            </span>
          </div>
          {/* XP bar — amber glossy */}
          <div className="flex items-center gap-2 mt-1.5">
            <div
              className="flex-1 h-[7px] rounded-full overflow-hidden relative"
              style={{
                background: "rgba(245,158,11,0.10)",
                boxShadow: "inset 0 1px 2px rgba(0,0,0,0.06)",
              }}
            >
              <div
                className="h-full rounded-full relative overflow-hidden transition-all duration-700"
                style={{
                  width: `${xpPct}%`,
                  background: "linear-gradient(90deg,#fbbf24,#f59e0b)",
                  boxShadow: "0 0 8px rgba(245,158,11,0.50), inset 0 1px 0 rgba(255,255,255,0.40)",
                }}
              >
                <div
                  className="absolute inset-x-0 top-0 h-1/2 rounded-full"
                  style={{
                    background: "linear-gradient(180deg,rgba(255,255,255,0.45),transparent)",
                  }}
                />
                <div
                  className="absolute inset-0 animate-shimmer"
                  style={{
                    background:
                      "linear-gradient(90deg,transparent,rgba(255,255,255,0.38),transparent)",
                    backgroundSize: "200% 100%",
                  }}
                />
              </div>
            </div>
            <span
              className="text-[10px] font-bold tabular-nums shrink-0"
              style={{ color: "#d97706" }}
            >
              {xpInLvl}&nbsp;/&nbsp;500 XP
            </span>
          </div>
        </div>

        {/* Mail button */}
        <button
          onClick={onBell}
          className="press shrink-0 relative z-10 h-9 w-9 rounded-full grid place-items-center"
          style={{
            background: "rgba(0,0,0,0.05)",
            boxShadow: "0 1px 0 rgba(255,255,255,0.8) inset",
          }}
        >
          <QBlockMailIcon className="h-[18px] w-[18px]" />
          <span
            className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-red-500"
            style={{ border: "1.5px solid #fff", boxShadow: "0 1px 4px rgba(239,68,68,0.5)" }}
          />
        </button>
      </div>
    </div>
  );
}

// legacy stub — never rendered

function WelcomeHero(_: {
  onBell: () => void;
  onGold: () => void;
  onGem: () => void;
  onExplore: () => void;
}) {
  return null;
}

// ─── SkyBlock Continue Playing Card ───────────────────────────────────────────
function SkyBlockCard({ g, onPlay }: { g: Game; onPlay: () => void }) {
  return (
    <button
      onClick={onPlay}
      className="press w-full flex items-center gap-0 rounded-[20px] overflow-hidden relative"
      style={{
        background: "#fff",
        boxShadow:
          "0 4px 0 rgba(0,0,0,0.07), 0 14px 28px rgba(15,23,42,0.10), 0 1px 0 rgba(255,255,255,1) inset",
      }}
    >
      {/* Gloss */}
      <div
        className="absolute inset-x-0 top-0 h-[40%] pointer-events-none"
        style={{ background: "linear-gradient(180deg,rgba(255,255,255,0.18) 0%,transparent 100%)" }}
      />

      {/* Thumbnail */}
      <div className="relative shrink-0 overflow-hidden" style={{ width: 90, height: 90 }}>
        <img src={g.icon} alt={g.t} className="w-full h-full object-cover" draggable={false} />
        {/* fade edge */}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(90deg,transparent 55%,white 100%)" }}
        />
        {/* Updated badge */}
        {g.updated && (
          <div
            className="absolute top-2 left-2 px-1.5 py-0.5 rounded-full text-[8px] font-extrabold text-white"
            style={{
              background: "linear-gradient(90deg,#22c55e,#16a34a)",
              boxShadow: "0 1px 5px rgba(34,197,94,0.5)",
            }}
          >
            Updated
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 py-3 pl-1 pr-2">
        <div
          className="text-[16px] font-lilita tracking-wide leading-tight"
          style={{ color: "#141414" }}
        >
          {g.t}
        </div>
        {/* Player count + likes row */}
        <div className="flex items-center gap-2.5 mt-1">
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
            <span className="text-[10.5px] font-semibold" style={{ color: "#6b7280" }}>
              {g.players} playing
            </span>
          </div>
        </div>
        {/* Glossy Progress bar */}
        {g.progress !== undefined && (
          <div className="mt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9.5px] font-semibold" style={{ color: "#9ca3af" }}>
                Progress
              </span>
              <span className="text-[9.5px] font-bold" style={{ color: "#f59e0b" }}>
                {g.progress}%
              </span>
            </div>
            <div
              className="h-2 rounded-full overflow-hidden relative"
              style={{
                background: "rgba(0,0,0,0.07)",
                border: "1px solid rgba(245,158,11,0.10)",
                boxShadow: "inset 0 1px 2px rgba(0,0,0,0.08)",
              }}
            >
              <div
                className="h-full rounded-full relative overflow-hidden"
                style={{
                  width: `${g.progress}%`,
                  background: "linear-gradient(90deg,#fbbf24 0%,#f9d23c 50%,#f59e0b 100%)",
                  boxShadow: "0 0 10px rgba(245,158,11,0.45), inset 0 1px 0 rgba(255,255,255,0.45)",
                }}
              >
                <div
                  className="absolute inset-x-0 top-0 h-1/2 pointer-events-none rounded-full"
                  style={{
                    background: "linear-gradient(180deg,rgba(255,255,255,0.40),transparent)",
                  }}
                />
                <div
                  className="absolute inset-0 animate-shimmer"
                  style={{
                    background:
                      "linear-gradient(90deg,transparent,rgba(255,255,255,0.42),transparent)",
                    backgroundSize: "200% 100%",
                  }}
                />
              </div>
            </div>
          </div>
        )}
        <div className="text-[10px] mt-1" style={{ color: "#c0c0c0" }}>
          Survival · Multiplayer
        </div>
      </div>

      {/* Play button */}
      <div className="shrink-0 mr-4">
        <div
          className="relative overflow-hidden px-4 py-2.5 rounded-[13px] text-[13px] font-extrabold"
          style={{
            background: "linear-gradient(135deg,#ff7a52,#fa4616)",
            color: "#1a0a00",
            boxShadow: "0 3px 10px rgba(250,70,22,0.16)",
            fontFamily: "var(--font-heading)",
          }}
        >
          <div
            className="absolute inset-x-0 top-0 h-1/2"
            style={{ background: "linear-gradient(180deg,rgba(255,255,255,0.26),transparent)" }}
          />
          <span className="relative z-10">Play</span>
        </div>
      </div>
    </button>
  );
}

// ─── Blocky Plaza Square Card ────────────────────────────────────────────────
function BlockyPlazaHero({ g, onPlay }: { g: Game; onPlay: () => void }) {
  return (
    <div className="flex gap-3">
      {/* Main square game card */}
      <button
        onClick={onPlay}
        className="press relative overflow-hidden text-left shrink-0"
        style={{
          width: 160,
          height: 160,
          borderRadius: 20,
          boxShadow:
            "0 4px 0 rgba(180,100,0,0.15), 0 12px 28px rgba(180,80,0,0.18), 0 1px 0 rgba(255,255,255,1) inset",
        }}
      >
        {g.icon && (
          <img
            src={g.icon}
            alt={g.t}
            className="absolute inset-0 w-full h-full object-cover"
            draggable={false}
          />
        )}
        <div className={`absolute inset-0 bg-gradient-to-br ${g.hue} opacity-70`} />
        <div
          className="absolute inset-x-0 top-0 h-1/3"
          style={{ background: "linear-gradient(180deg,rgba(255,255,255,0.25),transparent)" }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-2/3"
          style={{ background: "linear-gradient(to top,rgba(0,0,0,0.70),transparent)" }}
        />
        {g.updated && (
          <div
            className="absolute top-2 left-2 px-1.5 py-0.5 rounded-full text-[8px] font-extrabold text-white"
            style={{ background: "linear-gradient(90deg,#f0b51b,#d98900)" }}
          >
            Updated
          </div>
        )}
        <div className="absolute bottom-2.5 left-2.5 right-2.5">
          <div
            className="text-white font-extrabold text-[14px] leading-tight"
            style={{ fontFamily: "var(--font-heading)", textShadow: "0 1px 6px rgba(0,0,0,0.5)" }}
          >
            {g.t}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[9px] font-bold text-white/85 tabular-nums">{g.players}</span>
            </div>
          </div>
        </div>
        {/* Play badge */}
        <div
          className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[8.5px] font-extrabold"
          style={{ background: "linear-gradient(135deg,#ff7a52,#fa4616)", color: "#fff" }}
        >
          Featured
        </div>
      </button>

      {/* Info card beside */}
      <div className="flex-1 flex flex-col justify-between py-1">
        <div>
          <div
            className="text-[16px] font-extrabold leading-tight"
            style={{ color: "#141414", fontFamily: "var(--font-heading)" }}
          >
            {g.t}
          </div>
          <div className="text-[11px] mt-1 leading-snug" style={{ color: "#6b7280" }}>
            {g.bio}
          </div>
          <div className="flex items-center gap-2 mt-2.5">
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{
                background: "rgba(245,158,11,0.10)",
                border: "1px solid rgba(245,158,11,0.18)",
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              <span className="text-[10px] font-extrabold" style={{ color: "#d97706" }}>
                {g.players} online
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={onPlay}
          className="press flex items-center justify-center gap-1.5 h-9 rounded-[12px] relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg,#ff7a52,#fa4616)",
            boxShadow: "0 3px 10px rgba(250,70,22,0.16)",
          }}
        >
          <div
            className="absolute inset-x-0 top-0 h-1/2"
            style={{ background: "linear-gradient(180deg,rgba(255,255,255,0.28),transparent)" }}
          />
          <span
            className="relative z-10 text-[13px] font-extrabold"
            style={{ color: "#1a0a00", fontFamily: "var(--font-heading)" }}
          >
            Play Now
          </span>
          <ChevronRight
            className="relative z-10 h-3.5 w-3.5"
            style={{ color: "#1a0a00" }}
            strokeWidth={2.8}
          />
        </button>
      </div>
    </div>
  );
}

// ─── Explore Game Card ─────────────────────────────────────────────────────────
function ExploreGameCard({ g, onPlay }: { g: Game; onPlay: () => void }) {
  const locked = !g.playable;
  return (
    <button
      onClick={onPlay}
      className="press shrink-0 flex flex-col text-left"
      style={{ width: g.playable ? 148 : 130, opacity: locked ? 0.75 : 1 }}
    >
      <div
        className="relative w-full overflow-hidden"
        style={{
          height: g.playable ? 148 : 130,
          borderRadius: 18,
          boxShadow: "0 0 0 1px rgba(15,23,42,0.06)",
        }}
      >
        <div className={`absolute inset-0 bg-gradient-to-br ${g.hue}`} />
        {g.video && !locked && (
          <video
            src={g.video}
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        {g.icon && !g.video && (
          <img
            src={g.icon}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            draggable={false}
          />
        )}
        {locked && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}
          >
            <div className="flex flex-col items-center gap-1">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(255,255,255,0.85)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              <span className="text-[9px] font-extrabold text-white/80 tracking-wide">SOON</span>
            </div>
          </div>
        )}
        <div
          className="absolute inset-x-0 top-0 h-1/3 pointer-events-none"
          style={{
            background: "linear-gradient(180deg,rgba(255,255,255,0.25) 0%,transparent 100%)",
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-2/5 pointer-events-none"
          style={{ background: "linear-gradient(0deg,rgba(0,0,0,0.50) 0%,transparent 100%)" }}
        />
        {!locked && (
          <div
            className="absolute bottom-2 left-2 flex items-center gap-1 px-1.5 py-[3px] rounded-full"
            style={{ background: "rgba(0,0,0,0.48)", backdropFilter: "blur(6px)" }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
            <span className="text-[8.5px] font-extrabold text-white/90 tabular-nums">
              {g.players} playing
            </span>
          </div>
        )}
        {g.updated && (
          <div
            className="absolute top-2 left-2 px-1.5 py-[3px] rounded-full text-[8px] font-extrabold text-white"
            style={{ background: "linear-gradient(90deg,#22c55e,#16a34a)" }}
          >
            Updated
          </div>
        )}
        {g.playable && !g.updated && (
          <div
            className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[8.5px] font-extrabold"
            style={{ background: "linear-gradient(135deg,#ff7a52,#fa4616)", color: "#fff" }}
          >
            ✦ PLAY
          </div>
        )}
      </div>
      <div className="mt-2 px-0.5">
        <div
          className="text-[12.5px] font-extrabold leading-tight"
          style={{ color: "#141414", fontFamily: "var(--font-heading)" }}
        >
          {g.t}
        </div>
        {locked && (
          <div className="text-[10px] font-semibold mt-0.5" style={{ color: "#9c9c9c" }}>
            Coming Soon
          </div>
        )}
      </div>
    </button>
  );
}

// ─── Trending Card ────────────────────────────────────────────────────────────
function TrendingCard({ g, onPlay }: { g: Game; onPlay: () => void }) {
  return (
    <button
      onClick={onPlay}
      className="press shrink-0 flex flex-col text-left"
      style={{ width: 130 }}
    >
      <div
        className="relative w-full overflow-hidden"
        style={{
          height: 130,
          borderRadius: 18,
          boxShadow: "0 0 0 1px rgba(15,23,42,0.06)",
        }}
      >
        <div className={`absolute inset-0 bg-gradient-to-br ${g.hue}`} />
        {g.icon && (
          <img
            src={g.icon}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            draggable={false}
          />
        )}
        {/* Removed locked overlay */}
        <div
          className="absolute inset-x-0 top-0 h-1/3 pointer-events-none"
          style={{
            background: "linear-gradient(180deg,rgba(255,255,255,0.25) 0%,transparent 100%)",
          }}
        />
        {/* Player count */}
        <div
          className="absolute bottom-2 left-2 flex items-center gap-1 px-1.5 py-[3px] rounded-full"
          style={{ background: "rgba(0,0,0,0.48)", backdropFilter: "blur(6px)" }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
          <span className="text-[8.5px] font-extrabold text-white/90 tabular-nums">
            {g.players} playing
          </span>
        </div>
      </div>
      <div className="mt-2 px-0.5">
        <div
          className="text-[12.5px] font-extrabold leading-tight"
          style={{ color: "#141414", fontFamily: "var(--font-heading)" }}
        >
          {g.t}
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <PlayersIcon className="h-3.5 w-3.5" />
          <span className="text-[10px] font-semibold" style={{ color: "#9ca3af" }}>
            {g.players}
          </span>
        </div>
      </div>
    </button>
  );
}

// ─── Quests Sheet ──────────────────────────────────────────────────────────────
function QuestsSheet({ onClose }: { onClose: () => void }) {
  const [questProgress] = useState<Record<string, QuestStatus>>(() =>
    Object.fromEntries(QUESTS.map((q) => [q.id, { progress: 0, completed: false }])),
  );

  const completedCount = Object.values(questProgress).filter((v) => v.completed).length;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/55 animate-fade-in" onClick={onClose} />
      <div
        className="relative w-full max-w-[440px] rounded-t-[34px] shadow-level3 animate-sheet-up overflow-hidden"
        style={{ maxHeight: "88dvh", background: "#f4f6fb" }}
      >
        <div className="pt-2.5 flex justify-center">
          <div className="h-1.5 w-10 rounded-full" style={{ background: "rgba(0,0,0,0.14)" }} />
        </div>

        {/* Header */}
        <div className="px-5 pt-3 pb-0">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h2
                className="text-[22px] font-extrabold"
                style={{ color: "#141414", fontFamily: "var(--font-heading)" }}
              >
                Quests
              </h2>
              <p className="text-[11px] font-medium" style={{ color: "#9c9c9c" }}>
                {completedCount}/{QUESTS.length} completed · Earn coins &amp; rewards
              </p>
            </div>
            <button
              onClick={onClose}
              className="press close-button h-10 w-10 grid place-items-center"
              style={{ background: "rgba(0,0,0,0.08)" }}
            >
              <X className="h-[18px] w-[18px]" style={{ color: "#555" }} />
            </button>
          </div>

          {/* Overall progress bar */}
          <div className="mt-3 mb-4">
            <div
              className="h-2 rounded-full overflow-hidden"
              style={{ background: "rgba(0,0,0,0.08)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-500 relative overflow-hidden"
                style={{
                  width: `${(completedCount / QUESTS.length) * 100}%`,
                  background: "linear-gradient(90deg,#fbbf24,#f59e0b)",
                }}
              >
                <div
                  className="absolute inset-0 animate-shimmer"
                  style={{
                    background:
                      "linear-gradient(90deg,transparent,rgba(255,255,255,0.40),transparent)",
                    backgroundSize: "200% 100%",
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Quest list */}
        <div
          className="overflow-y-auto hide-scrollbar px-4 pb-6"
          style={{ maxHeight: "calc(88dvh - 140px)" }}
        >
          <div className="flex flex-col gap-2.5">
            {QUESTS.map((quest) => {
              const status = questProgress[quest.id];
              const pct = Math.min(100, (status.progress / quest.goal) * 100);
              return (
                <div
                  key={quest.id}
                  className="rounded-[20px] overflow-hidden relative"
                  style={{
                    background: status.completed ? "#f0fdf4" : "#fff",
                    boxShadow: "0 3px 0 rgba(0,0,0,0.07), 0 10px 20px rgba(15,23,42,0.08)",
                    border: status.completed
                      ? "1px solid rgba(34,197,94,0.25)"
                      : "1px solid transparent",
                  }}
                >
                  {/* Top gloss */}
                  <div
                    className="absolute inset-x-0 top-0 h-[40%] pointer-events-none"
                    style={{
                      background: "linear-gradient(180deg,rgba(255,255,255,0.22),transparent)",
                    }}
                  />

                  <div className="px-4 py-3.5 relative z-10">
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div
                        className="shrink-0 h-10 w-10 rounded-[12px] grid place-items-center"
                        style={{
                          background: status.completed
                            ? "linear-gradient(135deg,#22c55e,#16a34a)"
                            : "linear-gradient(135deg,#fbbf24,#f59e0b)",
                          boxShadow: status.completed
                            ? "0 3px 0 #14532d, 0 5px 10px rgba(34,197,94,0.30)"
                            : "0 3px 0 #b45309, 0 5px 10px rgba(245,158,11,0.25)",
                          color: "#fff",
                        }}
                      >
                        {status.completed ? <CheckCircle2 className="h-5 w-5" /> : quest.icon}
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className="text-[13px] font-extrabold leading-tight"
                            style={{ color: "#141414", fontFamily: "var(--font-heading)" }}
                          >
                            {quest.title}
                          </span>
                          {/* Reward pill */}
                          <div
                            className="flex items-center gap-1 px-2 py-0.5 rounded-full shrink-0"
                            style={{
                              background: "rgba(245,158,11,0.10)",
                              border: "1px solid rgba(245,158,11,0.22)",
                            }}
                          >
                            <Coins className="h-3 w-3" style={{ color: "#d97706" }} />
                            <span
                              className="text-[9.5px] font-extrabold"
                              style={{ color: "#d97706" }}
                            >
                              {quest.reward}
                            </span>
                          </div>
                        </div>
                        <p className="text-[11px] mt-0.5" style={{ color: "#9ca3af" }}>
                          {quest.desc}
                        </p>
                        {/* Progress */}
                        {!status.completed && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between mb-1">
                              <span
                                className="text-[9.5px] font-semibold"
                                style={{ color: "#9ca3af" }}
                              >
                                {status.progress}/{quest.goal} {quest.unit}
                              </span>
                              <span className="text-[9.5px] font-bold" style={{ color: "#f59e0b" }}>
                                {Math.round(pct)}%
                              </span>
                            </div>
                            <div
                              className="h-1.5 rounded-full overflow-hidden"
                              style={{ background: "rgba(0,0,0,0.07)" }}
                            >
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${pct}%`,
                                  background: "linear-gradient(90deg,#fbbf24,#f59e0b)",
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Shop Sheet ────────────────────────────────────────────────────────────────
function ShopSheet({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"featured" | "outfits" | "accessories">("featured");
  const nav = useNavigate();

  const SHOP_ITEMS: Array<
    AvatarShopItem & { type: string; tab: "featured" | "outfits" | "accessories" }
  > = [
    {
      id: "mag-wings",
      name: "Rare Wings GLB",
      type: "Back model",
      category: "magic",
      price: 2200,
      color1: "#f0fdf4",
      color2: "#bbf7d0",
      shape: "wings",
      rarity: "rare",
      tab: "featured",
    },
    {
      id: "skin-6666-doraemon",
      name: "6666 Doraemon Suit",
      type: "Full skin",
      category: "magic",
      price: 6666,
      color1: "#1878c9",
      color2: "#ef3340",
      shape: "top",
      rarity: "legendary",
      tab: "featured",
    },
    {
      id: "top-remlev-bomber",
      name: "Remlev Bomber",
      type: "Shirt",
      category: "clothing",
      price: 1400,
      color1: "#334155",
      color2: "#0f172a",
      shape: "top",
      rarity: "epic",
      tab: "outfits",
    },
    {
      id: "top-sakura-hoodie",
      name: "Sakura Hoodie",
      type: "Shirt",
      category: "clothing",
      price: 950,
      color1: "#f472b6",
      color2: "#701a75",
      shape: "top",
      rarity: "rare",
      tab: "outfits",
    },
    {
      id: "pants-cyan-cargo",
      name: "Cyan Cargo",
      type: "Pants",
      category: "pants",
      price: 750,
      color1: "#06b6d4",
      color2: "#164e63",
      shape: "pants",
      rarity: "uncommon",
      tab: "outfits",
    },
    {
      id: "acc-crystal-crown",
      name: "Crystal Crown",
      type: "Accessory",
      category: "ears",
      price: 1250,
      color1: "#a78bfa",
      color2: "#38bdf8",
      shape: "crown",
      rarity: "rare",
      tab: "accessories",
    },
    {
      id: "acc-starlight-clips",
      name: "Starlight Clips",
      type: "Accessory",
      category: "ears",
      price: 700,
      color1: "#fef08a",
      color2: "#c084fc",
      shape: "clips",
      rarity: "rare",
      tab: "accessories",
    },
  ];

  const RARITY_COLORS: Record<string, string> = {
    uncommon: "#16a34a",
    rare: "#0284c7",
    epic: "#7c3aed",
    legendary: "#d97706",
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/55 animate-fade-in" onClick={onClose} />
      <div
        className="relative w-full max-w-[440px] rounded-t-[34px] shadow-level3 animate-sheet-up overflow-hidden"
        style={{ maxHeight: "88dvh", background: "#f4f6fb" }}
      >
        <div className="pt-2.5 flex justify-center">
          <div className="h-1.5 w-10 rounded-full" style={{ background: "rgba(0,0,0,0.14)" }} />
        </div>
        <div className="px-5 pt-3 pb-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2
                className="text-[22px] font-extrabold"
                style={{ color: "#141414", fontFamily: "var(--font-heading)" }}
              >
                Shop
              </h2>
              <p className="text-[11px] font-medium" style={{ color: "#9c9c9c" }}>
                Customize your character
              </p>
            </div>
            <button
              onClick={onClose}
              className="press close-button h-10 w-10 grid place-items-center"
              style={{ background: "rgba(0,0,0,0.08)" }}
            >
              <X className="h-[18px] w-[18px]" style={{ color: "#555" }} />
            </button>
          </div>
          <div className="flex gap-2 mb-4">
            {(["featured", "outfits", "accessories"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="press px-3.5 py-2 rounded-full text-[12px] font-bold capitalize transition-all duration-200"
                style={
                  tab === t
                    ? {
                        background: "#141414",
                        color: "#fff",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
                      }
                    : { background: "rgba(0,0,0,0.07)", color: "#666" }
                }
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div
          className="overflow-y-auto hide-scrollbar px-4 pb-6"
          style={{ maxHeight: "calc(88dvh - 168px)" }}
        >
          <div className="grid grid-cols-2 gap-3">
            {SHOP_ITEMS.filter((item) => tab === "featured" || item.tab === tab).map((item) => (
              <button
                key={item.id}
                onClick={() => nav({ to: "/inventory" })}
                className="press flex flex-col items-start rounded-[20px] overflow-hidden relative text-left"
                style={{
                  background: "#fff",
                  boxShadow: `0 3px 0 rgba(0,0,0,0.07), 0 10px 20px rgba(15,23,42,0.09)`,
                  border: `1px solid ${item.color1}55`,
                }}
              >
                <div
                  className="w-full relative overflow-hidden"
                  style={{
                    height: 112,
                    background: `linear-gradient(135deg,${item.color1}22,${item.color2}44)`,
                  }}
                >
                  <div
                    className="absolute inset-x-0 top-0 h-1/2 pointer-events-none"
                    style={{
                      background: "linear-gradient(180deg,rgba(255,255,255,0.22),transparent)",
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <TextureItemArt item={item} />
                  </div>
                  <div
                    className="absolute top-2 left-2 px-1.5 py-0.5 rounded-full text-[8px] font-extrabold capitalize text-white"
                    style={{ background: RARITY_COLORS[item.rarity ?? "common"] ?? "#555" }}
                  >
                    {item.rarity}
                  </div>
                </div>
                <div className="px-3 py-2.5 w-full">
                  <div
                    className="text-[12px] font-extrabold"
                    style={{ color: "#141414", fontFamily: "var(--font-heading)" }}
                  >
                    {item.name}
                  </div>
                  <div className="text-[10px] font-medium" style={{ color: "#9c9c9c" }}>
                    {item.type}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1">
                      <Coins className="h-3.5 w-3.5" style={{ color: "#d97706" }} />
                      <span className="text-[12px] font-extrabold" style={{ color: "#d97706" }}>
                        {item.price.toLocaleString()}
                      </span>
                    </div>
                    <div
                      className="relative overflow-hidden px-2.5 py-1 rounded-full text-[10px] font-extrabold text-white"
                      style={{ background: item.color1 }}
                    >
                      <span>Open studio</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Mail Modal ───────────────────────────────────────────────────────────────
function MailModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={onClose} />
      <div
        className="relative w-full max-w-[440px] bg-background rounded-t-[34px] shadow-level3 animate-sheet-up overflow-hidden"
        style={{ maxHeight: "88dvh" }}
      >
        <div className="pt-2.5 flex justify-center">
          <div className="h-1.5 w-10 rounded-full bg-border" />
        </div>
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border-soft">
          <h2
            className="text-[20px] font-extrabold flex items-center gap-2"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            <QBlockMailIcon className="h-5 w-5 text-primary" /> Inbox
          </h2>
          <button
            onClick={onClose}
            className="press close-button h-10 w-10 bg-surface-2 grid place-items-center"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>
        <div className="flex flex-col items-center justify-center py-16 px-6">
          <div className="h-16 w-16 rounded-full bg-surface-2 grid place-items-center mb-3">
            <Inbox className="h-7 w-7 text-text-muted" />
          </div>
          <div className="text-[14.5px] font-bold text-text-secondary">No mail</div>
          <div className="text-[12px] text-text-muted mt-1 text-center">
            You're all caught up — new messages will show up here.
          </div>
        </div>
      </div>
    </div>
  );
}

function NotificationsModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={onClose} />
      <div
        className="relative w-full max-w-[440px] bg-background rounded-t-[34px] shadow-level3 animate-sheet-up overflow-hidden"
        style={{ maxHeight: "88dvh" }}
      >
        <div className="pt-2.5 flex justify-center">
          <div className="h-1.5 w-10 rounded-full bg-border" />
        </div>
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border-soft">
          <h2
            className="text-[20px] font-extrabold flex items-center gap-2"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            <Bell className="h-5 w-5 text-primary" /> Notifications
          </h2>
          <button
            onClick={onClose}
            className="press close-button h-10 w-10 bg-surface-2 grid place-items-center"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>
        <div className="flex flex-col items-center justify-center py-16 px-6">
          <div className="h-16 w-16 rounded-full bg-surface-2 grid place-items-center mb-3">
            <Bell className="h-7 w-7 text-text-muted" />
          </div>
          <div className="text-[14.5px] font-bold text-text-secondary">No notifications</div>
          <div className="text-[12px] text-text-muted mt-1 text-center">
            You're all caught up — updates will show up here.
          </div>
        </div>
      </div>
    </div>
  );
}

export {
  BuyModal,
  GoldCoin,
  GemCoin,
  PinkCube,
  GOLDEN_COINS_ICON,
  PINK_GEM_ICON,
  goldPackages,
  gemPackages,
} from "@/components/CurrencyModal";
