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
    <div className="space-y-3 pt-1 font-sans">
      {/* Teleport Notification Toast */}
      {teleportMsg && (
        <div className="flex items-center gap-2 rounded-[12px] bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/30 px-3 py-2 text-[12px] text-blue-600 dark:text-blue-300 font-bold animate-fade-in">
          <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
          <span className="truncate">{teleportMsg}</span>
        </div>
      )}

      {/* The White Glossy Create Server Button matching Mail/Notify button minimal glossiness */}
      <button
        type="button"
        onClick={() => setCreatingModal(true)}
        className="press relative w-full h-10 rounded-[12px] bg-white text-[#17191d] text-[13px] font-bold tracking-tight border border-black/[0.08] dark:border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_2px_6px_rgba(0,0,0,0.03)] hover:bg-[#fafafa] active:scale-[0.98] transition-all cursor-pointer select-none flex items-center justify-center overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:bg-gradient-to-b before:from-white/60 before:to-transparent before:pointer-events-none"
      >
        Create Server
      </button>

      {/* Header: Real Active Servers Count */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[12px] font-bold text-[#7d8590] dark:text-[#8e95a0]">
          Active Servers ({servers.length})
        </span>
        {servers.length > 0 && (
          <button
            type="button"
            onClick={handleQuickJoin}
            disabled={joiningId !== null}
            className="text-[11.5px] font-bold text-orange-600 dark:text-orange-400 hover:underline select-none cursor-pointer disabled:opacity-50"
          >
            {joiningId === "quick_match" ? "Joining..." : "Quick Join"}
          </button>
        )}
      </div>

      {/* Real Servers List */}
      {loading ? (
        <div className="py-8 flex flex-col items-center justify-center text-center">
          <Loader2 className="h-5 w-5 animate-spin text-orange-500 mb-1.5" />
          <p className="text-[12px] font-bold text-[#7d8590] dark:text-[#8e95a0]">
            Checking lobbies...
          </p>
        </div>
      ) : servers.length === 0 ? (
        <div className="py-8 flex flex-col items-center justify-center text-center rounded-[16px] bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.08] p-5">
          <p className="text-[12.5px] font-bold text-[#17191d] dark:text-white mb-1">
            No Active Lobbies
          </p>
          <p className="text-[11.5px] text-[#7d8590] dark:text-[#8e95a0] max-w-[240px]">
            No players are currently hosting a server for {gameTitle}. Use the button above to start one.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {servers.map((srv) => {
            const isFull = srv.playerCount >= 16;
            const isJoining = joiningId === srv.id;

            return (
              <div
                key={srv.id}
                className="group relative overflow-hidden rounded-[14px] bg-white dark:bg-[#1a1d24] border border-black/[0.06] dark:border-white/[0.08] p-2.5 shadow-xs transition hover:shadow-sm"
              >
                {/* Header: Server Name, Ping & Capacity */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="truncate text-[12.5px] font-bold text-[#17191d] dark:text-white">
                      {srv.name}
                    </span>
                    <span className="flex items-center gap-0.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 px-1.5 py-0.2 text-[9.5px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                      <Signal className="h-2 w-2" />
                      {srv.ping}ms
                    </span>
                  </div>

                  {/* Player Count 16/16 Cap Badge */}
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10.5px] font-extrabold shrink-0 ${
                      isFull
                        ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                        : srv.playerCount > 0
                          ? "bg-orange-500/15 text-orange-600 dark:text-orange-400"
                          : "bg-black/[0.04] dark:bg-white/[0.06] text-[#7d8590] dark:text-[#8e95a0]"
                    }`}
                  >
                    {srv.playerCount}/16 {isFull ? "Full" : ""}
                  </span>
                </div>

                {/* THE 16-PLAYER SQUARE PFP GRID (Compact mini-slots) */}
                <div className="mb-2">
                  <div className="grid grid-cols-8 gap-1 p-1 rounded-[10px] bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.05]">
                    {Array.from({ length: 16 }).map((_, slotIndex) => {
                      const player = srv.players[slotIndex];

                      if (player) {
                        return (
                          <div
                            key={player.uid || slotIndex}
                            className="group/slot relative aspect-square rounded-[6px] overflow-hidden bg-slate-200 dark:bg-slate-700 ring-1 ring-black/10 dark:ring-white/10"
                            title={`${player.name} (@${player.username})`}
                          >
                            {player.photo ? (
                              <img
                                src={player.photo}
                                alt={player.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-orange-400 to-amber-500 text-white text-[9px] font-bold uppercase">
                                {player.name.slice(0, 1)}
                              </div>
                            )}
                            <span className="absolute bottom-0.5 right-0.5 h-1 w-1 rounded-full bg-emerald-500" />
                          </div>
                        );
                      }

                      // Empty Slot placeholder (Compact square)
                      return (
                        <div
                          key={`empty-${slotIndex}`}
                          className="aspect-square rounded-[6px] border border-dashed border-black/15 dark:border-white/15 bg-black/[0.01] dark:bg-white/[0.02] flex items-center justify-center text-[8px] font-medium text-black/25 dark:text-white/20 select-none"
                          title={`Available Slot ${slotIndex + 1}`}
                        >
                          {slotIndex + 1}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Compact Join Button */}
                <div className="flex items-center justify-between pt-1 border-t border-black/[0.04] dark:border-white/[0.05]">
                  <span className="text-[10.5px] text-[#7d8590] dark:text-[#8e95a0]">
                    {srv.region || "Global"}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleConnectServer(srv.id)}
                    disabled={isFull || isJoining}
                    className={`h-7 px-3 rounded-[9px] text-[11.5px] font-bold select-none transition cursor-pointer flex items-center justify-center ${
                      isFull
                        ? "bg-black/[0.05] dark:bg-white/[0.06] text-[#7d8590] dark:text-[#8e95a0] cursor-not-allowed"
                        : "bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95"
                    }`}
                  >
                    {isJoining ? "Joining..." : isFull ? "Full" : "Join"}
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
