import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { OrangeHeartIcon } from "@/components/QbIcons";
import { PlayersIcon } from "@/components/icons/PlayersIcon";
import { LayoutGrid, List, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { GameSheet } from "@/components/GameSheet";
import { MobileShell } from "@/components/MobileShell";
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
    players: "1",
    likes: "99%",
    badge: "NEW",
    popularity: 98,
  },
  {
    id: "baseplate",
    title: "Cell 99",
    subtitle: "Classic building canvas",
    bio: "Endless flat voxel terrain powered by the SkyBlock engine. Build, test, and explore freely in Cell 99.",
    img: baseplateIcon,
    hue: "from-emerald-400 via-teal-400 to-sky-300",
    mode: "Sandbox",
    modeColor: "#059669",
    mood: "popular",
    players: "1",
    likes: "99%",
    badge: "NEW",
    popularity: 96,
  },
];

const UPLOADED_DISCOVER_TABS = [
  "All",
  "Building",
  "Sandbox",
  "Survival",
] as const;

function UploadedDiscoverPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [open, setOpen] = useState<DiscoveryGame | null>(null);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const games = useMemo(() => {
    const activeTab = UPLOADED_DISCOVER_TABS[tab];
    let list = GAMES;
    if (activeTab === "Sandbox") {
      list = GAMES.filter((g) => g.id === "baseplate");
    } else if (activeTab === "Survival") {
      list = GAMES.filter((g) => g.id === "skyblock");
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (g) =>
          g.title.toLowerCase().includes(q) ||
          g.subtitle.toLowerCase().includes(q) ||
          g.bio.toLowerCase().includes(q) ||
          g.mode.toLowerCase().includes(q),
      );
    }
    return list;
  }, [tab, searchQuery]);

  return (
    <MobileShell>
      <div className="relative min-h-full pb-36 text-foreground overflow-y-auto ios-scroll hide-scrollbar">
        {/* Top Aurora Borealis Glow Effect matching Homepage */}
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

        {/* Top Header Bar with Homepage-style Glossy Search Bar & Card/List Switcher */}
        <div className="relative z-10 px-4 pt-[max(env(safe-area-inset-top),16px)] pb-2 flex items-center gap-2.5">
          <label className="liquid-search flex-1 min-w-0 flex h-10 items-center gap-2 px-3.5 cursor-text rounded-[14px]">
            <Search className="relative z-10 h-[15px] w-[15px] shrink-0 text-text-muted" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search games…"
              className="relative z-10 min-w-0 flex-1 bg-transparent text-[12.5px] outline-none placeholder:text-text-muted text-[#1A1D20] dark:text-white"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="relative z-10 press grid h-5 w-5 shrink-0 place-items-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
                aria-label="Clear search"
              >
                <X className="h-3 w-3 text-text-muted" />
              </button>
            )}
          </label>

          {/* Card / List Switcher in Bottom Menu Style */}
          <div className="qb-glossy-menu shrink-0 rounded-full p-1 flex items-center gap-1 shadow-md border border-black/[0.08] dark:border-white/12 h-10">
            <button
              type="button"
              onClick={() => setViewMode("card")}
              className={`press relative flex items-center gap-1.5 h-8 px-3 rounded-full text-[11.5px] transition-all duration-200 cursor-pointer select-none outline-none ${
                viewMode === "card"
                  ? "font-black text-foreground"
                  : "font-semibold text-foreground/60 hover:text-foreground"
              }`}
              aria-label="Card view"
            >
              {viewMode === "card" && (
                <motion.div
                  layoutId="discoverViewModePill"
                  transition={{
                    type: "spring",
                    stiffness: 450,
                    damping: 32,
                    mass: 0.8,
                  }}
                  className="absolute inset-0 rounded-full pointer-events-none bg-white/70 dark:bg-white/18 backdrop-blur-md border border-white/80 dark:border-white/25 shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.95),0_2px_10px_rgba(0,0,0,0.06)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_2px_12px_rgba(0,0,0,0.4)]"
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Card</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`press relative flex items-center gap-1.5 h-8 px-3 rounded-full text-[11.5px] transition-all duration-200 cursor-pointer select-none outline-none ${
                viewMode === "list"
                  ? "font-black text-foreground"
                  : "font-semibold text-foreground/60 hover:text-foreground"
              }`}
              aria-label="List view"
            >
              {viewMode === "list" && (
                <motion.div
                  layoutId="discoverViewModePill"
                  transition={{
                    type: "spring",
                    stiffness: 450,
                    damping: 32,
                    mass: 0.8,
                  }}
                  className="absolute inset-0 rounded-full pointer-events-none bg-white/70 dark:bg-white/18 backdrop-blur-md border border-white/80 dark:border-white/25 shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.95),0_2px_10px_rgba(0,0,0,0.06)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_2px_12px_rgba(0,0,0,0.4)]"
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <List className="h-3.5 w-3.5" />
                <span>List</span>
              </span>
            </button>
          </div>
        </div>

        {/* Categories Tab Pill Bar - placed inline right below header */}
        <div className="relative z-10 px-4 py-1.5 overflow-x-auto scroll-smooth hide-scrollbar">
          <div className="flex items-center gap-1.5 whitespace-nowrap min-w-max">
            {UPLOADED_DISCOVER_TABS.map((label, index) => {
              const isSelected = index === tab;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setTab(index)}
                  className={`press relative h-7.5 shrink-0 rounded-full px-3.5 text-[11.5px] transition-all cursor-pointer whitespace-nowrap select-none outline-none ${
                    isSelected
                      ? "bg-[#141414] dark:bg-white text-white dark:text-[#141414] font-black shadow-xs"
                      : "bg-black/5 dark:bg-white/10 font-bold text-foreground/75 hover:text-foreground"
                  }`}
                >
                  <span className="relative z-10">{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="relative z-10 mt-2 px-4">
          {viewMode === "card" ? (
            /* Card Grid View — roomy squircle cards */
            <div className="grid grid-cols-2 gap-3.5">
              {games.map((game) => {
                const isLiked = liked.has(game.id);
                return (
                  <div key={game.id} className="flex flex-col items-start w-full text-left">
                    <button
                      type="button"
                      onClick={() => setOpen(game)}
                      className="press relative aspect-square w-full overflow-hidden rounded-[12px] border border-black/[0.08] dark:border-white/10 bg-slate-900/5 dark:bg-white/5 shadow-none active:scale-[0.97] transition-transform text-left cursor-pointer"
                    >
                      <img
                        src={game.img}
                        alt={game.title}
                        className="absolute inset-0 h-full w-full object-cover"
                        draggable={false}
                      />
                      <div className={`absolute inset-0 bg-gradient-to-br ${game.hue} opacity-15 pointer-events-none`} />
                      {game.badge && (
                        <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-[5px] bg-[#fa4616] text-white text-[8px] font-black uppercase tracking-wider leading-none shadow-xs">
                          {game.badge}
                        </span>
                      )}
                    </button>
                    <div className="mt-1.5 flex w-full items-center justify-between gap-1 pl-0">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[11.5px] font-extrabold tracking-tight text-[#1A1D20] dark:text-white leading-tight">
                          {game.title}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[10px] font-bold text-[#6B7280]">
                          <span className="flex items-center gap-0.5">
                            <OrangeHeartIcon className="h-2.5 w-2.5 text-[#fa4616]" />
                            <span className="font-extrabold text-[#6B7280]">{game.likes}</span>
                          </span>
                          <span className="flex items-center gap-0.5">
                            <PlayersIcon className="h-2.5 w-2.5" />
                            <span className="font-extrabold text-[#6B7280]">{game.players}</span>
                          </span>
                        </div>
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
                        className="press grid h-6 w-6 shrink-0 place-items-center cursor-pointer active:scale-90 transition-transform -mr-1"
                        aria-label="Like game"
                      >
                        <OrangeHeartIcon
                          className={
                            isLiked
                              ? "h-[14px] w-[14px] filter drop-shadow-[0_1px_3px_rgba(250,70,22,0.4)]"
                              : "h-[14px] w-[14px] opacity-35 grayscale"
                          }
                        />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* List View — horizontal sleek rectangle cards with game pfp & bio, and glossy Play button */
            <div className="flex flex-col gap-2.5">
              {games.map((game) => (
                <div
                  key={game.id}
                  onClick={() => setOpen(game)}
                  className="press group relative flex items-center gap-3.5 p-3 rounded-[14px] bg-white dark:bg-[#15171c] border border-black/[0.08] dark:border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.03)] active:scale-[0.99] transition-all cursor-pointer overflow-hidden select-none"
                >
                  {/* Game pfp thumbnail — squary squircle */}
                  <div className="relative h-[64px] w-[64px] shrink-0 rounded-[10px] overflow-hidden border border-black/[0.08] dark:border-white/10 bg-slate-900/5 dark:bg-white/5">
                    <img
                      src={game.img}
                      alt={game.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      draggable={false}
                    />
                  </div>

                  {/* Game Details: Title & Bio only */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center pr-1">
                    <h3 className="truncate text-[13.5px] font-extrabold tracking-tight text-[#1A1D20] dark:text-white leading-tight">
                      {game.title}
                    </h3>
                    <p className="mt-1 text-[11px] font-medium text-[#6B7280] dark:text-[#9ea7b3] leading-snug line-clamp-2">
                      {game.bio}
                    </p>
                  </div>

                  {/* Play button with the exact same glossiness as Free */}
                  <div className="shrink-0 flex items-center pl-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (game.id === "skyblock") {
                          navigate({ to: "/game/sandbox", search: { mode: "skyblock" } as never });
                        } else {
                          navigate({ to: "/game/sandbox", search: { mode: "baseplate" } as never });
                        }
                      }}
                      className="qb-squircle press relative h-9 px-3.5 shrink-0 flex items-center justify-center font-extrabold text-[12.5px] text-[#17191d] dark:text-white active:scale-95 transition-transform select-none cursor-pointer"
                      aria-label={`Play ${game.title}`}
                    >
                      Play
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!games.length && (
            <div className="py-12 text-center text-[13px] font-medium text-text-muted">
              {searchQuery ? `No worlds found matching "${searchQuery}".` : "No worlds in this category."}
            </div>
          )}
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
