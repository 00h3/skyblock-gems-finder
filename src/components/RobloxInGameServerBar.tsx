import React, { useState, useEffect, useRef } from "react";
import {
  Users,
  Signal,
  Zap,
  Globe2,
  X,
  ChevronRight,
  Loader2,
  ArrowRightLeft,
  Check,
} from "lucide-react";
import {
  type GameServer,
  subscribeGameServers,
  findBestServerWithPlayers,
  joinGameServer,
  type ServerPlayer,
} from "@/lib/roblox-servers";
import { useAuth } from "@/lib/auth-context";

interface RobloxInGameServerBarProps {
  gameId: string;
  currentServerId: string;
  onServerChange: (newServerId: string) => void;
}

export function RobloxInGameServerBar({
  gameId,
  currentServerId,
  onServerChange,
}: RobloxInGameServerBarProps) {
  const { qbUser } = useAuth();
  const [servers, setServers] = useState<GameServer[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [teleportingTo, setTeleportingTo] = useState<string | null>(null);

  // Auto-teleport state when joined an empty server
  const [autoTeleportPrompt, setAutoTeleportPrompt] = useState<{
    targetServer: GameServer;
    countdown: number;
  } | null>(null);
  const teleportTimerRef = useRef<NodeJS.Timeout | null>(null);
  const checkPerformedRef = useRef(false);

  // Subscribe to live servers
  useEffect(() => {
    const unsub = subscribeGameServers(gameId, (list) => {
      setServers(list);
    });
    return () => unsub();
  }, [gameId]);

  // Current server info
  const currentServer = servers.find((s) => s.id === currentServerId) || servers[0] || {
    id: currentServerId,
    name: "Server #1",
    playerCount: 1,
    maxPlayers: 16,
    ping: 28,
    players: [],
  };

  // Real-time matchmaking check:
  // "if i join a game and has no playeds i get telesported to which has not full ut has another olayer in it"
  useEffect(() => {
    if (checkPerformedRef.current || servers.length === 0) return;

    const timer = setTimeout(async () => {
      checkPerformedRef.current = true;
      const srv = servers.find((s) => s.id === currentServerId);
      const isAlone = !srv || srv.playerCount <= 1;

      if (isAlone) {
        // Look for another server with players that is not full (< 16)
        const candidate = await findBestServerWithPlayers(gameId, currentServerId);
        if (candidate && candidate.playerCount > 0 && candidate.playerCount < 16) {
          // Trigger auto-teleport prompt with 3s countdown!
          setAutoTeleportPrompt({
            targetServer: candidate,
            countdown: 3,
          });
        }
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [servers, currentServerId, gameId]);

  // Countdown timer for auto-teleport
  useEffect(() => {
    if (!autoTeleportPrompt) return;

    if (autoTeleportPrompt.countdown <= 0) {
      executeTeleport(autoTeleportPrompt.targetServer.id);
      setAutoTeleportPrompt(null);
      return;
    }

    const interval = setInterval(() => {
      setAutoTeleportPrompt((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          countdown: prev.countdown - 1,
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoTeleportPrompt]);

  const executeTeleport = async (targetId: string) => {
    setTeleportingTo(targetId);
    const player: ServerPlayer = {
      uid: qbUser?.uid || `guest_${Math.random().toString(36).slice(2, 7)}`,
      name: qbUser?.displayName || qbUser?.username || "Player",
      username: qbUser?.username || "player",
      photo: qbUser?.profilePhoto || undefined,
      joinedAt: Date.now(),
      lastSeen: Date.now(),
    };

    try {
      await joinGameServer(gameId, targetId, player);
    } catch {}

    setTimeout(() => {
      onServerChange(targetId);
      setTeleportingTo(null);
      setModalOpen(false);
    }, 400);
  };

  return (
    <>
      {/* Sleek In-Game Top Badge (Roblox style Server pill) */}
      <div className="fixed top-3 right-14 z-[90] flex items-center gap-1.5 select-none pointer-events-auto">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 rounded-[14px] bg-black/60 hover:bg-black/80 backdrop-blur-md px-3 py-1.5 text-white border border-white/15 shadow-lg active:scale-95 transition cursor-pointer"
          title="Click to view servers & switch"
        >
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11.5px] font-black tracking-tight">
            {currentServer.name.split("•")[0].trim()}
          </span>

          <span className="rounded-full bg-white/20 px-2 py-0.2 text-[10.5px] font-black">
            {currentServer.playerCount}/16
          </span>

          <span className="hidden sm:inline-flex items-center gap-0.5 text-[9.5px] text-emerald-300 font-bold">
            <Signal className="h-2.5 w-2.5" />
            {currentServer.ping}ms
          </span>
        </button>
      </div>

      {/* Auto-Teleport Banner Toast (When joining an empty server) */}
      {autoTeleportPrompt && (
        <div className="fixed top-16 inset-x-4 max-w-[420px] mx-auto z-[150] animate-bounce-subtle pointer-events-auto">
          <div className="rounded-[18px] bg-[#121318]/95 border-2 border-orange-500/80 p-3.5 text-white shadow-[0_8px_30px_rgba(249,115,22,0.4)] backdrop-blur-md flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-orange-400 text-[11px] font-black uppercase">
                <Zap className="h-3.5 w-3.5 fill-orange-400" />
                <span>Active Server Found!</span>
              </div>
              <p className="text-[12.5px] font-bold text-white mt-0.5 truncate">
                Teleporting to {autoTeleportPrompt.targetServer.name} ({autoTeleportPrompt.targetServer.playerCount}/16) in {autoTeleportPrompt.countdown}s...
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setAutoTeleportPrompt(null)}
                className="rounded-[10px] bg-white/10 hover:bg-white/20 px-2 py-1 text-[11px] font-bold text-white/80"
              >
                Stay
              </button>
              <button
                type="button"
                onClick={() => {
                  executeTeleport(autoTeleportPrompt.targetServer.id);
                  setAutoTeleportPrompt(null);
                }}
                className="rounded-[10px] bg-orange-600 hover:bg-orange-500 px-3 py-1 text-[11.5px] font-black text-white shadow-sm"
              >
                Teleport Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Server Browser & PFP Square Grid Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[160] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 select-none"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div className="relative w-full max-w-[420px] max-h-[85vh] flex flex-col rounded-[24px] bg-[#171920] border border-white/10 text-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-[10px] bg-orange-500/20 text-orange-400 flex items-center justify-center">
                  <Globe2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-[15px] font-black text-white leading-tight">
                    Server Browser (16 Max)
                  </h3>
                  <p className="text-[11px] text-white/60">
                    Active multiplayer instances & player grids
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="h-7 w-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable Server Cards */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 hide-scrollbar">
              {servers.map((srv) => {
                const isCurrent = srv.id === currentServerId;
                const isFull = srv.playerCount >= 16;
                const isTeleporting = teleportingTo === srv.id;

                return (
                  <div
                    key={srv.id}
                    className={`rounded-[18px] p-3.5 border transition ${
                      isCurrent
                        ? "bg-orange-500/10 border-orange-500/40"
                        : "bg-white/[0.04] border-white/10 hover:bg-white/[0.07]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="truncate text-[13px] font-black text-white">
                          {srv.name}
                        </span>
                        {isCurrent && (
                          <span className="rounded-full bg-orange-500/30 text-orange-400 px-2 py-0.2 text-[10px] font-black">
                            Current
                          </span>
                        )}
                      </div>

                      <div
                        className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-black ${
                          isFull
                            ? "bg-rose-500/20 text-rose-400"
                            : "bg-white/10 text-emerald-400"
                        }`}
                      >
                        <Users className="h-3 w-3" />
                        <span>{srv.playerCount}/16</span>
                      </div>
                    </div>

                    {/* 16 Square Slots Grid */}
                    <div className="grid grid-cols-8 gap-1.5 p-2 rounded-[12px] bg-black/40 border border-white/5 mb-3">
                      {Array.from({ length: 16 }).map((_, i) => {
                        const p = srv.players[i];
                        if (p) {
                          return (
                            <div
                              key={p.uid || i}
                              className="relative aspect-square rounded-[6px] overflow-hidden bg-slate-700 ring-1 ring-white/15"
                              title={p.name}
                            >
                              {p.photo ? (
                                <img
                                  src={p.photo}
                                  alt={p.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center bg-orange-600 text-white text-[9px] font-black">
                                  {p.name[0]}
                                </div>
                              )}
                              <span className="absolute bottom-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            </div>
                          );
                        }
                        return (
                          <div
                            key={`slot-${i}`}
                            className="aspect-square rounded-[6px] border border-dashed border-white/10 bg-white/[0.01] flex items-center justify-center text-[8px] text-white/30"
                          >
                            {i + 1}
                          </div>
                        );
                      })}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-white/50">
                        {srv.region} • {srv.ping}ms
                      </span>

                      {isCurrent ? (
                        <span className="text-[11.5px] font-bold text-orange-400 flex items-center gap-1">
                          <Check className="h-3 w-3" /> In Server
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => executeTeleport(srv.id)}
                          disabled={isFull || isTeleporting}
                          className={`rounded-[10px] px-3 py-1 text-[11.5px] font-extrabold flex items-center gap-1 transition shadow-sm ${
                            isFull
                              ? "bg-white/10 text-white/40 cursor-not-allowed"
                              : "bg-emerald-600 hover:bg-emerald-500 text-white"
                          }`}
                        >
                          {isTeleporting ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" />
                              <span>Teleporting...</span>
                            </>
                          ) : (
                            <>
                              <span>Teleport</span>
                              <ChevronRight className="h-3 w-3" />
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
