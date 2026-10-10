import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { QBlockLoadingMenu } from "@/components/QBlockLoadingMenu";
import { OrangeHeartIcon } from "@/components/QbIcons";
import {
  ArrowRight,
  ChevronRight,
  Clock3,
  Gamepad2,
  Hammer,
  Info,
  Map,
  Play,
  Search,
  Server,
  Sparkles,
  Tag,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { GameSheet, type GameMeta } from "@/components/GameSheet";
import { MobileShell } from "@/components/MobileShell";
import { PrivateServerSheet } from "@/components/PrivateServerSheet";
import { setNavHidden } from "@/lib/ui-bus";
import scpEscapeBannerUrl from "../assets/skyblock/sky-pass-placeholder.png?url";
import baseplateIcon from "@/assets/game-baseplate.jpg";

export const Route = createFileRoute("/discover")({
  head: () => ({ meta: [{ title: "Discover — QBlock" }] }),
  component: UploadedDiscoverPage,
});

type Mood = "all" | "popular" | "voxel" | "horror";
type DiscoveryGame = {
  id: string;
  title: string;
  subtitle: string;
  bio: string;
  img: string;
  hue: string;
  mode: string;
  modeColor: string;
  mood: Exclude<Mood, "all">;
  players: string;
  likes: string;
  badge?: "NEW" | "UPDATED";
  progress?: number;
  popularity: number;
};

const GAMES: DiscoveryGame[] = [
  {
    id: "skyblock",
    title: "SkyBlock",
    subtitle: "Classic floating island",
    bio: "Build and expand your floating island in the sky starting with just a tree and a chest.",
    img: baseplateIcon,
    hue: "from-sky-400 via-emerald-300 to-emerald-200",
    mode: "SkyBlock",
    modeColor: "#0284c7",
    mood: "popular",
    players: "2.1K",
    likes: "9.2K",
    badge: "NEW",
    popularity: 98,
  },
  {
    id: "block-fall",
    title: "Block Fall",
    subtitle: "Platforms vanish fast",
    bio: "Stay moving as blocks disintegrate under your footsteps. Last survivor wins.",
    img: baseplateIcon,
    hue: "from-red-400 via-amber-400 to-yellow-300",
    mode: "Arcade",
    modeColor: "#dc2626",
    mood: "voxel",
    players: "890",
    likes: "3.1K",
    popularity: 88,
  },  {
    id: "bedwars",
    title: "Bedwars",
    subtitle: "Protect your bed",
    bio: "Defend your bed and break everyone else's. Queue up in the golden-hour lobby.",
    img: baseplateIcon,
    hue: "from-amber-300 via-orange-300 to-rose-300",
    mode: "PvP",
    modeColor: "#d97706",
    mood: "voxel",
    players: "1.4K",
    likes: "4.8K",
    badge: "NEW",
    popularity: 92,
  },
];

const MOODS: { id: Mood; label: string; detail: string }[] = [
  { id: "all", label: "All games", detail: "The full lineup" },
  { id: "popular", label: "Popular", detail: "Playing right now" },
  { id: "voxel", label: "Voxel", detail: "Build and battle" },
  { id: "horror", label: "Horror", detail: "Keep the lights on" },
];

const UPLOADED_DISCOVER_TABS = ["Party", "PvP", "Building", "Fantasy", "Time Pass"] as const;

function UploadedDiscoverPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [open, setOpen] = useState<DiscoveryGame | null>(null);
  const [liked, setLiked] = useState<Set<string>>(new Set());

  const games = useMemo(() => {
    const activeTab = UPLOADED_DISCOVER_TABS[tab];
    if (activeTab === "Party") return GAMES;
    if (activeTab === "PvP") return GAMES.filter((g) => g.id === "block-fall" || g.id === "bedwars");
    if (activeTab === "Building") return GAMES.filter((g) => g.id === "skyblock");
    if (activeTab === "Fantasy") return GAMES.filter((g) => g.id === "skyblock");
    return GAMES;
  }, [tab]);

  return (
    <MobileShell>
      <div className="min-h-full bg-background pb-24">
        <div className="px-4 pt-3 pb-1">
          {/* Header text omitted so Discover does not appear at top */}
        </div>

        <div className="mt-1 px-4">
          <div className="mb-2 text-[10.5px] font-normal uppercase tracking-[0.14em] text-text-secondary">
            {UPLOADED_DISCOVER_TABS[tab]}
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {games.map((game) => {
              const isLiked = liked.has(game.id);
              return (
                <div key={game.id} className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => setOpen(game)}
                    className="press relative aspect-square overflow-hidden rounded-[14px] bg-gradient-to-br shadow-xs"
                  >
                    <img
                      src={game.img}
                      alt={game.title}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    <div className={`absolute inset-0 bg-gradient-to-br ${game.hue} opacity-25`} />
                  </button>
                  <div className="flex h-[36px] items-center justify-between gap-1 px-0.5">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[11px] font-medium">{game.title}</div>
                      <div className="text-[9.5px] font-normal text-text-muted">{game.mode}</div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLiked((current) => {
                          const next = new Set(current);
                          if (next.has(game.id)) {
                            next.delete(game.id);
                          } else {
                            next.add(game.id);
                          }
                          return next;
                        });
                      }}
                      className="press grid h-6 w-6 shrink-0 place-items-center cursor-pointer active:scale-90 transition-transform"
                      aria-label="Like game"
                    >
                      <OrangeHeartIcon
                        className={
                          isLiked
                            ? "h-[15px] w-[15px] filter drop-shadow-[0_1px_3px_rgba(250,70,22,0.4)]"
                            : "h-[15px] w-[15px] opacity-35 grayscale"
                        }
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpen(game)}
                      className="press grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface-2 cursor-pointer"
                      aria-label="Game info"
                    >
                      <Info className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          {!games.length && (
            <div className="py-12 text-center text-[13px] font-normal text-text-muted">
              No worlds in this category.
            </div>
          )}
        </div>

        <div className="fixed bottom-[calc(56px+max(env(safe-area-inset-bottom),8px))] left-0 right-0 z-30 flex justify-center px-4 pointer-events-none">
          <div className="qb-glossy-menu pointer-events-auto flex max-w-full gap-1 overflow-x-auto rounded-full px-2 py-1 shadow-md hide-scrollbar">
            {UPLOADED_DISCOVER_TABS.map((label, index) => (
              <button
                key={label}
                type="button"
                onClick={() => setTab(index)}
                className={`press relative z-10 h-7 shrink-0 rounded-full px-3 text-[11px] font-normal transition-colors cursor-pointer ${
                  index === tab
                    ? "bg-foreground text-background shadow-xs"
                    : "qb-glossy-chip text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
      {open && (
        <GameSheet
          g={{
            t: open.title,
            p: open.players,
            hue: open.hue,
            bio: open.bio,
            id: open.id,
            icon: open.img,
            playable: true,
          }}
          onClose={() => setOpen(null)}
          onPlay={() => {
            setOpen(null);
            if (open.id === "sandbox") navigate({ to: "/game/sandbox" as never });
            else if (open.id)
              navigate({ to: "/game/$id" as never, params: { id: open.id } as never });
          }}
        />
      )}
    </MobileShell>
  );
}

function ArchiveDiscoverPage() {
  const navigate = useNavigate();
  const [category, setCategory] = useState<"all" | "popular" | "new">("all");
  const [query, setQuery] = useState("");
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<GameMeta | null>(null);
  const [realmsOpen, setRealmsOpen] = useState(false);

  const games = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return GAMES.filter((game) => {
      const matchesQuery =
        !normalized ||
        `${game.title} ${game.subtitle} ${game.bio} ${game.mode}`
          .toLowerCase()
          .includes(normalized);
      const matchesCategory =
        category === "all" ||
        (category === "popular" && game.popularity >= 90) ||
        (category === "new" && game.badge === "NEW");
      return matchesQuery && matchesCategory;
    });
  }, [category, query]);

  function openGame(game: DiscoveryGame) {
    setNavHidden(true);
    setOpen({
      t: game.title,
      p: game.players,
      bio: game.bio,
      hue: game.hue,
      id: game.id,
      icon: game.img,
      playable: true,
      developer: "Ira",
    });
  }

  function closeGame() {
    setNavHidden(false);
    setOpen(null);
  }

  function launchGame(game: GameMeta) {
    closeGame();
    if (game.id === "sandbox") navigate({ to: "/game/sandbox" as never });
    else if (game.id) navigate({ to: "/game/$id" as never, params: { id: game.id } as never });
  }

  return (
    <MobileShell>
      <div className="min-h-full bg-surface-2 pb-8">
        <header className="px-5 pt-6">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-text-muted">
            Explore
          </p>
          <div className="mt-1 flex items-end justify-between gap-3">
            <h1 className="text-[28px] font-extrabold leading-none tracking-tight">Discover</h1>
          </div>
          <label className="mt-4 flex h-12 items-center gap-3 rounded-2xl bg-background px-4 shadow-level1">
            <Search className="h-[18px] w-[18px] shrink-0 text-text-muted" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search worlds and games…"
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
        </header>

        <div className="mt-5 flex gap-2 overflow-x-auto px-5 pb-1 hide-scrollbar">
          {[
            { id: "all" as const, label: "All games", detail: "The full lineup" },
            { id: "popular" as const, label: "Popular", detail: "Playing right now" },
            { id: "new" as const, label: "New this week", detail: "Fresh worlds" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setCategory(item.id)}
              className={`press shrink-0 rounded-[13px] border px-3.5 py-2 text-left ${
                category === item.id
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-foreground"
              }`}
            >
              <span className="block text-[11px] font-extrabold">{item.label}</span>
              <span
                className={`mt-0.5 block text-[9px] font-medium ${category === item.id ? "text-background/60" : "text-text-muted"}`}
              >
                {item.detail}
              </span>
            </button>
          ))}
        </div>

        <section className="mt-6 px-4">
          <div className="mb-3 flex items-end justify-between px-1">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-muted">
                Featured worlds
              </p>
              <h2 className="mt-1 text-[18px] font-extrabold tracking-tight">Featured worlds</h2>
            </div>
            <Gamepad2 className="h-5 w-5 text-primary-hover" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {games.map((game) => {
              const isLiked = liked.has(game.id);
              return (
                <article
                  key={game.id}
                  className="overflow-hidden rounded-[18px] bg-background shadow-level1"
                >
                  <button
                    type="button"
                    onClick={() => openGame(game)}
                    className="press block w-full text-left"
                  >
                    <div className="relative aspect-[1.1] overflow-hidden bg-surface">
                      <img
                        src={game.img}
                        alt={game.title}
                        className="absolute inset-0 h-full w-full object-cover"
                        draggable={false}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent" />
                      {game.badge && (
                        <span className="absolute left-2.5 top-2.5 rounded-md bg-white/90 px-2 py-1 text-[8px] font-extrabold text-foreground">
                          {game.badge}
                        </span>
                      )}
                      <div className="absolute inset-x-2.5 bottom-2.5">
                        <p className="truncate text-[13px] font-extrabold text-white">
                          {game.title}
                        </p>
                      </div>
                    </div>
                  </button>
                  <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                    <span className="truncate text-[10px] font-semibold text-text-muted">
                      {game.mode} · {game.likes} likes
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setLiked((current) => {
                          const next = new Set(current);
                          if (next.has(game.id)) next.delete(game.id);
                          else next.add(game.id);
                          return next;
                        })
                      }
                      className={`press grid h-7 w-7 shrink-0 place-items-center rounded-full ${isLiked ? "bg-rose-50 text-rose-500" : "bg-surface-2 text-text-muted"}`}
                      aria-label={isLiked ? `Unlike ${game.title}` : `Like ${game.title}`}
                    >
                      <OrangeHeartIcon
                        className={
                          isLiked
                            ? "h-3.5 w-3.5 text-[#fa4616]"
                            : "h-3.5 w-3.5 text-black/40 dark:text-white/40"
                        }
                      />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
          {!games.length && (
            <div className="rounded-2xl bg-background px-4 py-10 text-center text-[13px] text-text-muted">
              No worlds match that search yet.
            </div>
          )}
        </section>

        <section className="mx-4 mt-6 rounded-[18px] bg-background p-4 shadow-level1">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary-hover">
              <Server className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-extrabold">Open a private realm</p>
              <p className="mt-0.5 text-[10px] text-text-muted">Host a world for your crew.</p>
            </div>
            <button
              type="button"
              onClick={() => setRealmsOpen(true)}
              className="press rounded-[10px] bg-foreground px-3 py-2 text-[10px] font-extrabold text-background"
            >
              Host
            </button>
          </div>
          <button
            type="button"
            onClick={() => navigate({ to: "/build" as never })}
            className="press mt-3 flex w-full items-center gap-3 rounded-[13px] bg-surface-2 p-3 text-left"
          >
            <Hammer className="h-4 w-4 text-text-muted" />
            <span className="flex-1">
              <span className="block text-[12px] font-extrabold">Build something new</span>
              <span className="mt-0.5 block text-[10px] text-text-muted">
                Open Studio and place the first block.
              </span>
            </span>
            <ChevronRight className="h-4 w-4 text-text-muted" />
          </button>
        </section>
      </div>
      {open && <GameSheet g={open} onClose={closeGame} onPlay={() => launchGame(open)} />}
      {realmsOpen && <PrivateServerSheet onClose={() => setRealmsOpen(false)} />}
    </MobileShell>
  );
}

function DiscoverPage() {
  const navigate = useNavigate();
  const [open, setOpen] = useState<GameMeta | null>(null);
  const [serverSheetOpen, setSSOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeMood, setActiveMood] = useState<Mood>("all");
  const [searchFocused, setSearchFocused] = useState(false);
  const [gameLoading, setGameLoading] = useState<{ id: string; name: string } | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem("qblock-discovery-favorites") ?? "[]");
      setFavoriteIds(
        new Set(
          Array.isArray(saved) ? saved.filter((id): id is string => typeof id === "string") : [],
        ),
      );
    } catch {
      // ignore
    }
  }, []);
  const launchTimerRef = useRef<number | null>(null);
  const categoryRailRef = useRef<HTMLDivElement>(null);

  const continueGame = GAMES[0];
  const alternateGame = GAMES[1];
  const searchOpen = searchFocused || query.trim().length > 0;
  const filteredGames = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return GAMES.filter((game) => {
      const matchesMood =
        activeMood === "all" ||
        (activeMood === "popular" ? game.popularity >= 75 : game.mood === activeMood);
      const matchesQuery =
        !normalized ||
        `${game.title} ${game.subtitle} ${game.bio} ${game.mode}`
          .toLowerCase()
          .includes(normalized);
      return matchesMood && matchesQuery;
    });
  }, [activeMood, query]);
  const popularGames = useMemo(
    () => [...GAMES].sort((a, b) => b.popularity - a.popularity).slice(0, 5),
    [],
  );
  const toggleFavorite = (id: string) => {
    setFavoriteIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      window.localStorage.setItem("qblock-discovery-favorites", JSON.stringify([...next]));
      return next;
    });
  };
  useEffect(() => {
    const active = categoryRailRef.current?.querySelector<HTMLElement>("[data-active='true']");
    active?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeMood]);

  const openGame = (game: DiscoveryGame) => {
    setNavHidden(true);
    setOpen({
      t: game.title,
      p: game.players,
      bio: game.bio,
      hue: game.hue,
      id: game.id,
      icon: game.img,
      playable: true,
      developer: "Ira",
    });
  };
  const closeGame = () => {
    setNavHidden(false);
    setOpen(null);
  };
  const launchGame = (id: string) => {
    const game = GAMES.find((item) => item.id === id);
    if (!game || gameLoading) return;
    setOpen(null);
    setNavHidden(false);
    setGameLoading({ id, name: game.title });
    launchTimerRef.current = window.setTimeout(() => {
      setGameLoading(null);
      if (id === "sandbox") navigate({ to: "/game/sandbox" as never });
      else navigate({ to: "/game/$id" as never, params: { id } as never });
    }, 800);
  };
  useEffect(
    () => () => {
      if (launchTimerRef.current) window.clearTimeout(launchTimerRef.current);
    },
    [],
  );
  const clearFilters = () => {
    setQuery("");
    setActiveMood("all");
    setSearchFocused(false);
  };

  return (
    <MobileShell>
      <div className="discover-page min-h-full bg-[#f5f6f8] pb-8 text-[#17181b]">
        <header className="discover-header sticky top-0 z-30 border-b border-[#17181b]/[0.08] bg-[#f5f6f8]/95 px-4 pb-3 pt-4 backdrop-blur-md">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="discover-eyebrow flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#6f737c]">
                <Map className="h-3.5 w-3.5" strokeWidth={2.2} /> Discover
              </div>
              <h1 className="discover-title mt-1 text-[23px] font-bold leading-none tracking-[-0.04em] text-[#17181b]">
                What will you play?
              </h1>
            </div>
          </div>
          <label
            className={`liquid-search mt-3 flex h-11 items-center gap-3 px-3.5 transition-all ${searchFocused ? "ring-2 ring-[#aeb6bf]/20" : ""}`}
          >
            <Search className="h-[16px] w-[16px] shrink-0 text-[#858a94]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Search games…"
              className="min-w-0 flex-1 bg-transparent text-[13px] font-medium outline-none placeholder:text-[#858a94]"
            />
            {query && (
              <button
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setQuery("")}
                className="press android-control grid h-7 w-7 place-items-center rounded-[8px] bg-[#eef0f2]"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5 text-[#6c6c73]" />
              </button>
            )}
          </label>
        </header>

        {searchOpen ? (
          <SearchResults
            games={filteredGames}
            query={query}
            onOpen={openGame}
            onClear={clearFilters}
          />
        ) : (
          <div className="flex flex-col gap-6 pt-4">
            <section>
              <div className="mb-3 flex items-end justify-between px-4">
                <SectionHeading eyebrow="For you" title="Popular right now" />
                <span className="mb-1 text-[10px] font-semibold text-[#858a94]">Swipe →</span>
              </div>
              <div className="hide-scrollbar flex gap-3 overflow-x-auto px-4 pb-1">
                {popularGames.map((game, index) => (
                  <PopularCard
                    key={game.id}
                    game={game}
                    rank={index + 1}
                    favorite={favoriteIds.has(game.id)}
                    onFavorite={() => toggleFavorite(game.id)}
                    onOpen={() => openGame(game)}
                  />
                ))}
              </div>
            </section>
            <section className="px-4">
              <SectionHeading
                eyebrow="Your last stop"
                title="Continue playing"
                meta={`${continueGame.progress}% complete`}
              />
              <ContinueCard game={continueGame} onOpen={() => openGame(continueGame)} />
            </section>
            <section className="px-4">
              <SectionHeading
                eyebrow="Featured game"
                title="Something darker"
                meta="New this week"
              />
              <DifferentCard game={alternateGame} onOpen={() => openGame(alternateGame)} />
            </section>
            <section>
              <div className="mb-3 flex items-end justify-between px-5">
                <SectionHeading eyebrow="The lineup" title="Choose your next game" />
                <Gamepad2 className="mb-1 h-5 w-5 text-primary" strokeWidth={2.1} />
              </div>
              <div
                ref={categoryRailRef}
                className="hide-scrollbar mb-3 flex gap-2 overflow-x-auto px-5 pb-1"
              >
                {MOODS.map((mood) => (
                  <button
                    key={mood.id}
                    data-active={activeMood === mood.id}
                    onClick={() => setActiveMood(mood.id)}
                    className={`press android-control shrink-0 rounded-[10px] border px-3.5 py-2 text-left ${activeMood === mood.id ? "border-primary bg-[#17181b] text-white" : "border-[#17181b]/[0.09] bg-white text-[#626771]"}`}
                  >
                    <span className="block text-[11px] font-semibold">{mood.label}</span>
                    <span
                      className={`mt-0.5 block text-[9px] font-medium ${activeMood === mood.id ? "text-white/65" : "text-[#9297a0]"}`}
                    >
                      {mood.detail}
                    </span>
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-3 px-4">
                {filteredGames.map((game, index) => (
                  <WorldRow
                    key={game.id}
                    game={game}
                    index={index}
                    onOpen={() => openGame(game)}
                    favorite={favoriteIds.has(game.id)}
                    onFavorite={() => toggleFavorite(game.id)}
                  />
                ))}
              </div>
            </section>
            <section className="px-4">
              <div className="discover-card flex items-center gap-3 rounded-[12px] p-3.5">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-[#eceff2]">
                  <Server className="h-[19px] w-[19px] text-[#626771]" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold">Open a private realm</p>
                  <p className="mt-0.5 text-[10px] font-medium text-[#858a94]">
                    A quiet server for your crew.
                  </p>
                </div>
                <button
                  onClick={() => setSSOpen(true)}
                  className="press flex items-center gap-1 rounded-[8px] bg-[#17181b] px-3 py-2 text-[10px] font-semibold text-white"
                >
                  Host <ChevronRight className="h-3 w-3" />
                </button>
              </div>
              <button
                onClick={() => navigate({ to: "/build" as never })}
                className="discover-card press mt-3 flex w-full items-center gap-3 rounded-[12px] p-3.5 text-left"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-[#eceff2]">
                  <Hammer className="h-[19px] w-[19px] text-[#626771]" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold">Build something new</p>
                  <p className="mt-0.5 text-[10px] font-medium text-[#858a94]">
                    Open Studio and place the first block.
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-[#858a94]" />
              </button>
            </section>
          </div>
        )}
      </div>
      {serverSheetOpen && <PrivateServerSheet onClose={() => setSSOpen(false)} />}
      {open && <GameSheet g={open} onClose={closeGame} onPlay={() => launchGame(open.id ?? "")} />}
      {gameLoading && <GameLoadingOverlay name={gameLoading.name} />}
    </MobileShell>
  );
}

function SectionHeading({
  eyebrow,
  title,
  meta,
}: {
  eyebrow: string;
  title: string;
  meta?: string;
}) {
  return (
    <div className="mb-3 flex items-end justify-between px-1">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#858a94]">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-[19px] font-bold tracking-[-0.035em] text-[#17181b]">{title}</h2>
      </div>
      {meta && (
        <span className="rounded-[7px] border border-[#17181b]/[0.08] bg-white px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.06em] text-[#626771]">
          {meta}
        </span>
      )}
    </div>
  );
}

function GameImage({ src, alt = "", className }: { src: string; alt?: string; className: string }) {
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={(event) => {
        const image = event.currentTarget;
        if (image.dataset.fallback) return;
        image.dataset.fallback = "true";
        image.src = "/banners/qblock-splash.png";
      }}
    />
  );
}

function PopularCard({
  game,
  rank,
  favorite,
  onFavorite,
  onOpen,
}: {
  game: DiscoveryGame;
  rank: number;
  favorite: boolean;
  onFavorite: () => void;
  onOpen: () => void;
}) {
  return (
    <div className="relative w-[158px] shrink-0">
      <button onClick={onOpen} className="press block w-full text-left">
        <div className="relative aspect-[1.2] overflow-hidden rounded-[12px] bg-[#e8e8ed] shadow-[0_3px_10px_rgba(0,0,0,0.12)]">
          <GameImage src={game.img} alt={game.title} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent" />
          <span className="absolute left-2 top-2 grid h-6 w-6 place-items-center rounded-[7px] bg-black/60 text-[10px] font-semibold text-white">
            {rank}
          </span>
          {game.badge && (
            <span className="absolute right-2 top-2 rounded-[6px] bg-white/90 px-1.5 py-1 text-[7px] font-semibold text-[#4f535c]">
              {game.badge}
            </span>
          )}
          <div className="absolute inset-x-2 bottom-2">
            <p className="truncate text-[13px] font-semibold text-white">{game.title}</p>
          </div>
        </div>
      </button>
      <button
        onClick={onFavorite}
        aria-label={favorite ? `Remove ${game.title} from favorites` : `Favorite ${game.title}`}
        className="press android-control absolute bottom-2 right-2 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-[#d97706] shadow-sm backdrop-blur-sm"
      >
        <OrangeHeartIcon
          className={favorite ? "h-4 w-4 text-[#fa4616]" : "h-4 w-4 text-black/40"}
        />
      </button>
    </div>
  );
}

function ContinueCard({ game, onOpen }: { game: DiscoveryGame; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="discover-card press relative flex min-h-[112px] w-full items-center gap-0 overflow-hidden rounded-[12px] text-left"
    >
      <div className="relative h-[112px] w-[112px] shrink-0 overflow-hidden">
        <GameImage src={game.img} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-white" />
        <div className="absolute left-2 top-2 flex items-center gap-1 rounded-[6px] bg-white/90 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.05em] text-[#4f535c]">
          <Clock3 className="h-3 w-3" strokeWidth={2.5} /> Resume
        </div>
      </div>
      <div className="min-w-0 flex-1 py-3 pl-1 pr-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-[16px] font-bold leading-none tracking-[-0.03em] text-[#17181b]">
              {game.title}
            </h3>
            <p className="mt-1.5 line-clamp-2 text-[10px] font-medium leading-relaxed text-[#858a94]">
              {game.bio}
            </p>
          </div>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px] bg-[#17181b] text-white">
            <Play className="h-4 w-4 fill-current" />
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="h-[7px] flex-1 overflow-hidden rounded-full bg-black/[0.07]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#fbbf24] to-[#f59e0b]"
              style={{ width: `${game.progress ?? 0}%` }}
            />
          </div>
          <span className="text-[9px] font-black text-[#d97706]">{game.progress}%</span>
        </div>
      </div>
    </button>
  );
}

function DifferentCard({ game, onOpen }: { game: DiscoveryGame; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="discover-card press flex min-h-[112px] w-full items-center gap-3 rounded-[12px] p-3 text-left"
    >
      <div className="relative h-[86px] w-[86px] shrink-0 overflow-hidden rounded-[10px]">
        <GameImage src={game.img} className="h-full w-full object-cover" />
        <span className="absolute left-1.5 top-1.5 rounded-[6px] bg-white/90 px-1.5 py-1 text-[8px] font-semibold text-[#4f535c]">
          NEW
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#858a94]">
          {game.subtitle}
        </p>
        <h3 className="mt-1 text-[19px] font-bold leading-none text-[#17181b]">{game.title}</h3>
        <p className="mt-1.5 line-clamp-2 text-[10px] font-medium leading-relaxed text-[#858a94]">
          {game.bio}
        </p>
        <div className="mt-1.5 text-[9px] font-medium text-[#858a94]">
          {game.mode} · {game.likes} likes
        </div>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-[#858a94]" />
    </button>
  );
}

function WorldRow({
  game,
  index,
  onOpen,
  favorite,
  onFavorite,
}: {
  game: DiscoveryGame;
  index: number;
  onOpen: () => void;
  favorite?: boolean;
  onFavorite?: () => void;
}) {
  return (
    <div
      className="discover-card flex w-full items-center gap-3 rounded-[12px] p-3 text-left"
      style={{ animation: `fadeSlideUp 0.32s ease-out ${Math.min(index, 4) * 45}ms both` }}
    >
      <button onClick={onOpen} className="press flex min-w-0 flex-1 items-center gap-3 text-left">
        <span className="relative h-[64px] w-[64px] shrink-0 overflow-hidden rounded-[9px]">
          <GameImage src={game.img} alt={game.title} className="h-full w-full object-cover" />
          {game.badge && (
            <span className="absolute bottom-1 left-1 rounded-[5px] bg-white/90 px-1.5 py-0.5 text-[7px] font-semibold text-[#4f535c]">
              {game.badge}
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[14px] font-semibold text-[#17181b]">{game.title}</span>
            <span className="flex shrink-0 items-center gap-1 rounded-[5px] border border-[#17181b]/[0.08] bg-[#f1f2f4] px-1.5 py-0.5 text-[8px] font-semibold text-[#626771]">
              <Tag className="h-2.5 w-2.5" />
              {game.mode}
            </span>
          </span>
          <span className="mt-1 block line-clamp-1 text-[10px] font-medium text-[#858a94]">
            {game.bio}
          </span>
          <span className="mt-2 block text-[9px] font-medium text-[#858a94]">
            {game.likes} likes
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1 rounded-[7px] bg-[#17181b] px-2.5 py-2 text-[9px] font-semibold text-white">
          Play <Play className="h-3 w-3 fill-current" />
        </span>
      </button>
      {onFavorite && (
        <button
          onClick={onFavorite}
          aria-label={favorite ? `Remove ${game.title} from favorites` : `Favorite ${game.title}`}
          className="press grid h-8 w-8 shrink-0 place-items-center rounded-full text-[#d97706]"
        >
          <OrangeHeartIcon
            className={favorite ? "h-4 w-4 text-[#fa4616]" : "h-4 w-4 text-black/40"}
          />
        </button>
      )}
    </div>
  );
}

function SearchResults({
  games,
  query,
  onOpen,
  onClear,
}: {
  games: DiscoveryGame[];
  query: string;
  onOpen: (game: DiscoveryGame) => void;
  onClear: () => void;
}) {
  return (
    <section className="px-4 pt-5">
      <SectionHeading
        eyebrow="Search games"
        title={query.trim() ? `Results for “${query.trim()}”` : "All games"}
        meta={`${games.length} found`}
      />
      {games.length > 0 ? (
        <div className="flex flex-col gap-3">
          {games.map((game, index) => (
            <WorldRow key={game.id} game={game} index={index} onOpen={() => onOpen(game)} />
          ))}
        </div>
      ) : (
        <div className="discover-card rounded-[12px] px-6 py-12 text-center">
          <Search className="mx-auto h-7 w-7 text-[#858a94]" />
          <p className="mt-3 text-[14px] font-semibold text-[#17181b]">No games found</p>
          <p className="mt-1 text-[11px] font-medium text-[#858a94]">
            Try a title, mode, or category.
          </p>
          <button
            onClick={onClear}
            className="press mt-4 rounded-[8px] bg-[#17181b] px-4 py-2.5 text-[11px] font-semibold text-white"
          >
            Clear filters
          </button>
        </div>
      )}
    </section>
  );
}

function GameLoadingOverlay({ name }: { name: string }) {
  return <QBlockLoadingMenu fadeOutOnDone={false} speedMs={20} />;
}
