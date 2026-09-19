import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Heart, Play, Sparkles, Star, Users } from "lucide-react";
import { useState, useEffect } from "react";
import { MobileShell } from "@/components/MobileShell";
import { CurrencyPills } from "@/components/CurrencyPills";
import { GameSheet, type GameMeta } from "@/components/GameSheet";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

type CatalogGame = {
  id: string;
  title: string;
  subtitle: string;
  bio: string;
  icon: string;
  mode: string;
  players: string;
  likes: string;
  playable: boolean;
  hue: string;
};

const ALL_GAMES: CatalogGame[] = [
  {
    id: "sandbox",
    title: "Sandbox",
    subtitle: "Build & Explore",
    bio: "First-person voxel sandbox. Walk, jump, break and place blocks in a fresh flat world.",
    icon: "/assets/game-baseplate.jpg",
    mode: "Sandbox",
    players: "1.2K",
    likes: "4.8K",
    playable: true,
    hue: "from-emerald-400 via-lime-300 to-sky-300",
  },
];

export const Route = createFileRoute("/favorites")({
  head: () => ({ meta: [{ title: "Favorites — QBLOCK" }] }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const nav = useNavigate();
  const { qbUser } = useAuth();
  const [selectedGame, setSelectedGame] = useState<GameMeta | null>(null);

  const [favMap, setFavMap] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return { sandbox: true };
    const saved: Record<string, boolean> = {};
    ALL_GAMES.forEach((g) => {
      const isFav = localStorage.getItem(`qb_fav_${g.id}`) === "true";
      if (isFav) saved[g.id] = true;
    });
    // Default Sandbox to favorited if nothing set
    if (Object.keys(saved).length === 0) {
      saved.sandbox = true;
      localStorage.setItem("qb_fav_sandbox", "true");
    }
    return saved;
  });

  const toggleFavorite = (e: React.MouseEvent, gameId: string) => {
    e.stopPropagation();
    setFavMap((prev) => {
      const nextState = !prev[gameId];
      const updated = { ...prev, [gameId]: nextState };
      localStorage.setItem(`qb_fav_${gameId}`, String(nextState));

      // Persist to firebase if user is logged in
      if (qbUser) {
        setDoc(
          doc(db, "users", qbUser.uid),
          { [`favorites.${gameId}`]: nextState },
          { merge: true },
        ).catch(() => {});
      }
      return updated;
    });
  };

  const openGame = (g: CatalogGame) => {
    setSelectedGame({
      t: g.title,
      p: g.players,
      hue: g.hue,
      bio: g.bio,
      id: g.id,
      icon: g.icon,
      playable: g.playable,
    });
  };

  const favoriteCount = Object.values(favMap).filter(Boolean).length;

  return (
    <MobileShell hideNav>
      <div className="wearables-page min-h-full px-4 pb-8 pt-3">
        <header className="wearables-header compact-gloss-header">
          <button
            type="button"
            onClick={() => nav({ to: "/profile" as never })}
            className="press liquid-button liquid-button-ghost grid h-8 w-8 place-items-center rounded-[10px]"
            aria-label="Back to profile"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="app-eyebrow">QBLOCK / LIBRARY</div>
            <h1 className="mt-0.5 text-[19px] font-black tracking-[-.05em]">Favorites</h1>
          </div>
          <span className="wearables-count">{favoriteCount} SAVED</span>
        </header>

        <section className="wearables-currency" aria-label="Currency status">
          <CurrencyPills compact />
        </section>

        <section className="wearables-intro">
          <div className="wearables-intro-icon">
            <Heart className="h-4 w-4 text-rose-500 fill-rose-500" />
          </div>
          <div>
            <p className="text-[13px] font-black">Your Favorite Worlds</p>
            <p className="mt-0.5 text-[10.5px] text-text-muted">
              Quickly launch and explore your favorite multiplayer experiences.
            </p>
          </div>
        </section>

        <section className="wearables-grid" aria-label="Favorite games">
          {ALL_GAMES.map((item) => {
            const isFav = Boolean(favMap[item.id]);
            return (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                className={`wearables-card text-left relative ${isFav ? "wearables-card-accent" : ""}`}
                onClick={() => openGame(item)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openGame(item);
                  }
                }}
              >
                <div className="wearables-preview relative overflow-hidden bg-slate-900 flex items-center justify-center">
                  <img
                    src={item.icon}
                    alt={item.title}
                    className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                  />
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 40%, rgba(0,0,0,0.6) 100%)",
                    }}
                  />

                  {/* Favorite Toggle Button */}
                  <button
                    type="button"
                    onClick={(e) => toggleFavorite(e, item.id)}
                    className="press absolute top-2 right-2 h-7 w-7 rounded-full bg-white/90 backdrop-blur-md grid place-items-center shadow-md transition"
                    aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
                  >
                    <Heart
                      className={`h-4 w-4 transition-colors ${
                        isFav ? "text-rose-500 fill-rose-500 scale-110" : "text-slate-400"
                      }`}
                    />
                  </button>

                  {/* Play Action Button inside preview */}
                  <div className="absolute bottom-2 right-2">
                    <div
                      className="h-7 w-7 rounded-full grid place-items-center shadow-lg"
                      style={{
                        background: "linear-gradient(135deg, #FFD600, #FFB800)",
                        border: "1px solid rgba(255,255,255,0.8)",
                      }}
                    >
                      <Play className="h-3.5 w-3.5 text-slate-900 fill-slate-900 ml-0.5" />
                    </div>
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between gap-1">
                  <p className="truncate text-[12px] font-black text-slate-900">{item.title}</p>
                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                    {item.mode}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-[10px] font-semibold text-text-muted">
                  {item.subtitle} · {item.likes} likes
                </p>
              </div>
            );
          })}
        </section>
      </div>

      {selectedGame && <GameSheet g={selectedGame} onClose={() => setSelectedGame(null)} />}
    </MobileShell>
  );
}
