import React, { useState, useEffect } from "react";
import {
  Globe2,
  Users,
  Zap,
  Plus,
  RefreshCw,
  Signal,
  Shield,
  Loader2,
  Check,
  ChevronRight,
  Server as ServerIcon,
} from "lucide-react";
import {
  type GameServer,
  type ServerPlayer,
  subscribeGameServers,
  findBestServerWithPlayers,
  createGameServer,
  joinGameServer,
} from "@/lib/roblox-servers";
import { useAuth } from "@/lib/auth-context";

interface RobloxServerBrowserProps {
  gameId: string;
  gameTitle?: string;
  onJoinServer: (serverId: string) => void;
}

export function RobloxServerBrowser({
  gameId,
  gameTitle = "Game",
  onJoinServer,
}: RobloxServerBrowserProps) {
  const { qbUser } = useAuth();
  const [servers, setServers] = useState<GameServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [creatingModal, setCreatingModal] = useState(false);
  const [newServerName, setNewServerName] = useState("");
  const [teleportMsg, setTeleportMsg] = useState<string | null>(null);

  // Subscribe to live servers
  useEffect(() => {
    setLoading(true);
    const unsub = subscribeGameServers(gameId, (list) => {
      setServers(list);
      setLoading(false);
    });
    return () => unsub();
  }, [gameId]);

  // Handle Quick Play / Roblox Matchmaking:
  // If servers exist with players and < 16, teleport immediately to that server!
  const handleQuickJoin = async () => {
    setJoiningId("quick_match");
    setTeleportMsg("Searching for active servers with players...");

    try {
      const best = await findBestServerWithPlayers(gameId);
      if (best) {
        setTeleportMsg(`Found ${best.name} (${best.playerCount}/16 players)! Teleporting...`);
        await handleConnectServer(best.id);
      } else {
        // If no populated server, pick the first server or create one
        const target = servers[0];
        if (target) {
          setTeleportMsg(`Joining ${target.name} (16 slots)...`);
          await handleConnectServer(target.id);
        } else {
          setTeleportMsg("Creating new 16-player server...");
          const created = await createGameServer(gameId, "Public Server #1", false);
          await handleConnectServer(created.id);
        }
      }
    } catch {
      setJoiningId(null);
      setTeleportMsg(null);
    }
  };

  const handleConnectServer = async (serverId: string) => {
    setJoiningId(serverId);
    const player: ServerPlayer = {
      uid: qbUser?.uid || `guest_${Math.random().toString(36).slice(2, 7)}`,
      name: qbUser?.displayName || qbUser?.username || "Player",
      username: qbUser?.username || "player",
      photo: qbUser?.profilePhoto || undefined,
      joinedAt: Date.now(),
      lastSeen: Date.now(),
    };

    try {
      await joinGameServer(gameId, serverId, player);
      setTimeout(() => {
        onJoinServer(serverId);
      }, 500);
    } catch (err) {
      console.warn("Failed to join server:", err);
      onJoinServer(serverId);
    }
  };

  const handleCreateServer = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newServerName.trim() || `Server #${servers.length + 1}`;
    setCreatingModal(false);
    setNewServerName("");
    setJoiningId("creating");

    const player: ServerPlayer = {
      uid: qbUser?.uid || `guest_${Math.random().toString(36).slice(2, 7)}`,
      name: qbUser?.displayName || qbUser?.username || "Host",
      username: qbUser?.username || "host",
      photo: qbUser?.profilePhoto || undefined,
      joinedAt: Date.now(),
      lastSeen: Date.now(),
      isHost: true,
    };

    const newSrv = await createGameServer(gameId, name, false, player);
    setTimeout(() => {
      onJoinServer(newSrv.id);
    }, 400);
  };

  const totalPlayers = servers.reduce((acc, s) => acc + s.playerCount, 0);

  return (
    <div className="space-y-4 pt-1 font-sans">
      {/* Top Matchmaking Banner */}
      <div className="relative overflow-hidden rounded-[20px] bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 p-4 text-white shadow-md">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-black uppercase tracking-wider text-orange-100">
                Roblox-Style Matchmaking
              </span>
            </div>
            <h3 className="text-[17px] font-black tracking-tight leading-snug mt-0.5">
              16-Player Dedicated Servers
            </h3>
            <p className="text-[12px] text-white/85">
              {totalPlayers} players online across {servers.length} servers
            </p>
          </div>

          <button
            type="button"
            onClick={handleQuickJoin}
            disabled={joiningId !== null}
            className="flex items-center justify-center gap-2 rounded-[14px] bg-white text-[#17191d] px-4 py-2.5 text-[13px] font-black shadow-lg hover:bg-white/95 active:scale-95 transition-all select-none shrink-0 cursor-pointer disabled:opacity-50"
          >
            {joiningId === "quick_match" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-orange-600" />
                <span>Teleporting...</span>
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 fill-orange-500 text-orange-500" />
                <span>Quick Play</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Teleport Notification Toast */}
      {teleportMsg && (
        <div className="flex items-center gap-2.5 rounded-[14px] bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/30 px-3.5 py-2.5 text-[12.5px] text-blue-600 dark:text-blue-300 font-bold animate-fade-in">
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          <span className="truncate">{teleportMsg}</span>
        </div>
      )}

      {/* Section Header: Server Count & Create Server */}
      <div className="flex items-center justify-between px-1 pt-1">
        <div className="flex items-center gap-2">
          <ServerIcon className="h-4 w-4 text-[#7d8590] dark:text-[#8e95a0]" />
          <span className="text-[13px] font-extrabold text-[#17191d] dark:text-white">
            Available Servers ({servers.length})
          </span>
        </div>

        <button
          type="button"
          onClick={() => setCreatingModal(true)}
          className="flex items-center gap-1 rounded-[10px] bg-black/[0.05] dark:bg-white/[0.08] hover:bg-black/[0.08] dark:hover:bg-white/[0.12] px-2.5 py-1 text-[11.5px] font-extrabold text-[#17191d] dark:text-white transition select-none cursor-pointer"
        >
          <Plus className="h-3 w-3" />
          <span>New Server</span>
        </button>
      </div>

      {/* Servers List */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center text-center">
          <Loader2 className="h-6 w-6 animate-spin text-orange-500 mb-2" />
          <p className="text-[12.5px] font-bold text-[#7d8590] dark:text-[#8e95a0]">
            Loading servers...
          </p>
        </div>
      ) : servers.length === 0 ? (
        <div className="py-10 flex flex-col items-center justify-center text-center rounded-[20px] bg-black/[0.02] dark:bg-white/[0.02] border border-dashed border-black/[0.08] dark:border-white/[0.08] p-6">
          <Globe2 className="h-8 w-8 text-[#7d8590] dark:text-[#8e95a0] mb-2" />
          <h4 className="text-[14px] font-black text-[#17191d] dark:text-white">
            No Active Servers
          </h4>
          <p className="text-[12px] text-[#7d8590] dark:text-[#8e95a0] max-w-[220px] mt-1 mb-3">
            Be the first to create a 16-player server for {gameTitle}!
          </p>
          <button
            type="button"
            onClick={() => setCreatingModal(true)}
            className="rounded-[12px] bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 text-[12.5px] font-extrabold transition shadow-sm"
          >
            Create Server
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {servers.map((srv) => {
            const isFull = srv.playerCount >= 16;
            const isJoining = joiningId === srv.id;

            return (
              <div
                key={srv.id}
                className="group relative overflow-hidden rounded-[18px] bg-white dark:bg-[#1c1f26] border border-black/[0.06] dark:border-white/[0.08] p-3.5 shadow-sm transition hover:shadow-md"
              >
                {/* Header: Server Name, Ping & Capacity Badge */}
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="truncate text-[13.5px] font-black text-[#17191d] dark:text-white">
                      {srv.name}
                    </span>
                    <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                      <Signal className="h-2.5 w-2.5" />
                      {srv.ping}ms
                    </span>
                  </div>

                  {/* Player Count 16/16 Cap Badge */}
                  <div
                    className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11.5px] font-black shrink-0 ${
                      isFull
                        ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                        : srv.playerCount > 0
                          ? "bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/20"
                          : "bg-black/[0.05] dark:bg-white/[0.08] text-[#7d8590] dark:text-[#8e95a0]"
                    }`}
                  >
                    <Users className="h-3 w-3" />
                    <span>
                      {srv.playerCount}/16 {isFull ? "Full" : ""}
                    </span>
                  </div>
                </div>

                {/* THE 16-PLAYER SQUARE PFP GRID (As Requested!) */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1 text-[11px] font-bold text-[#7d8590] dark:text-[#8e95a0]">
                    <span>Player Slots</span>
                    <span>16 Max</span>
                  </div>

                  {/* 16 Square Slots Grid: 8 columns x 2 rows */}
                  <div className="grid grid-cols-8 gap-1.5 p-2 rounded-[14px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.04] dark:border-white/[0.06]">
                    {Array.from({ length: 16 }).map((_, slotIndex) => {
                      const player = srv.players[slotIndex];

                      if (player) {
                        return (
                          <div
                            key={player.uid || slotIndex}
                            className="group/slot relative aspect-square rounded-[8px] overflow-hidden bg-slate-200 dark:bg-slate-700 ring-1 ring-black/10 dark:ring-white/10 shadow-xs"
                            title={`${player.name} (@${player.username})`}
                          >
                            {player.photo ? (
                              <img
                                src={player.photo}
                                alt={player.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-orange-400 to-amber-500 text-white text-[10px] font-black uppercase">
                                {player.name.slice(0, 1)}
                              </div>
                            )}

                            {/* Active online dot */}
                            <span className="absolute bottom-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500 ring-1 ring-white dark:ring-black" />

                            {/* Hover tooltip for player name */}
                            <div className="absolute inset-x-0 bottom-0 bg-black/75 backdrop-blur-xs text-[8px] font-bold text-white text-center truncate py-0.2 opacity-0 group-hover/slot:opacity-100 transition-opacity pointer-events-none px-0.5">
                              {player.name}
                            </div>
                          </div>
                        );
                      }

                      // Empty Slot placeholder (Square)
                      return (
                        <div
                          key={`empty-${slotIndex}`}
                          className="aspect-square rounded-[8px] border border-dashed border-black/15 dark:border-white/15 bg-black/[0.01] dark:bg-white/[0.02] flex items-center justify-center text-[9px] font-semibold text-black/25 dark:text-white/20 select-none"
                          title={`Available Slot ${slotIndex + 1}`}
                        >
                          {slotIndex + 1}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer Join Action Bar */}
                <div className="flex items-center justify-between pt-1 border-t border-black/[0.04] dark:border-white/[0.06]">
                  <span className="text-[11px] text-[#7d8590] dark:text-[#8e95a0] font-medium">
                    {srv.region} • Public
                  </span>

                  <button
                    type="button"
                    onClick={() => handleConnectServer(srv.id)}
                    disabled={isFull || isJoining}
                    className={`flex items-center gap-1.5 rounded-[12px] px-3.5 py-1.5 text-[12.5px] font-extrabold select-none transition shadow-xs cursor-pointer ${
                      isFull
                        ? "bg-black/[0.06] dark:bg-white/[0.08] text-[#7d8590] dark:text-[#8e95a0] cursor-not-allowed"
                        : "bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white"
                    }`}
                  >
                    {isJoining ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Joining...</span>
                      </>
                    ) : isFull ? (
                      <span>Server Full</span>
                    ) : (
                      <>
                        <span>Join</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Server Modal */}
      {creatingModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-[340px] rounded-[22px] bg-white dark:bg-[#1a1d24] p-5 shadow-2xl border border-black/[0.08] dark:border-white/10">
            <h3 className="text-[16px] font-black text-[#17191d] dark:text-white">
              Create 16-Player Server
            </h3>
            <p className="text-[12px] text-[#7d8590] dark:text-[#8e95a0] mt-1 mb-4">
              Host a dedicated multiplayer room for you and 15 friends.
            </p>

            <form onSubmit={handleCreateServer} className="space-y-3">
              <div>
                <label className="block text-[11px] font-black uppercase text-[#7d8590] dark:text-[#8e95a0] mb-1">
                  Server Name
                </label>
                <input
                  type="text"
                  value={newServerName}
                  onChange={(e) => setNewServerName(e.target.value)}
                  placeholder={`Server #${servers.length + 1}`}
                  maxLength={24}
                  className="w-full rounded-[12px] border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.05] px-3 py-2 text-[13px] font-bold text-[#17191d] dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="rounded-[12px] bg-black/[0.03] dark:bg-white/[0.05] p-2.5 text-[11.5px] text-[#7d8590] dark:text-[#8e95a0] flex items-center justify-between">
                <span>Max Player Capacity</span>
                <span className="font-black text-orange-600 dark:text-orange-400">16 Players</span>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreatingModal(false)}
                  className="flex-1 rounded-[12px] bg-black/[0.06] dark:bg-white/[0.08] py-2 text-[12.5px] font-extrabold text-[#17191d] dark:text-white hover:bg-black/[0.09] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-[12px] bg-orange-600 hover:bg-orange-500 py-2 text-[12.5px] font-extrabold text-white shadow-sm transition"
                >
                  Create & Join
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
