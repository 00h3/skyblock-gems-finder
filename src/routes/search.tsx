import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Search as SearchIcon,
  X,
  UserPlus,
  Check,
  MessageCircle,
  Clock,
  User,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { ProfileSheet, type ProfileUser } from "@/components/ProfileSheet";
import { GlossyAvatar } from "@/components/GlossyAvatar";
import {
  collection,
  query as fsQuery,
  getDocsFromServer,
  limit,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { uidColor, userDisplayName, sendFriendRequest, getFriendStatus } from "@/lib/friends-utils";
import { UserNameWithBadges } from "@/lib/user-style";
import { normalizeAvatarSnapshot, CHARACTER_1_GLTF, CHARACTER_2_GLTF, getAvatarViewerUrl } from "@/lib/avatar";
import { HtmlElementLoader, HtmlSpinner } from "@/components/ui/HtmlLoadingScreen";
import { toast } from "sonner";

export const Route = createFileRoute("/search")({
  head: () => ({ meta: [{ title: "Search Friends — QBLOCK" }] }),
  validateSearch: (search: Record<string, unknown>) => {
    return {
      q: (search.q as string) || "",
    };
  },
  component: SearchPage,
});

interface RealFirebaseUser {
  id: string;
  username: string;
  displayName: string;
  customId?: string;
  bio?: string;
  avatarSnapshot?: DocumentData["avatarSnapshot"];
  modelUrl: string;
  staff?: boolean;
  online?: boolean;
  friendCount?: number;
}

function SearchPage() {
  const nav = useNavigate();
  const searchParams = Route.useSearch();
  const { qbUser } = useAuth();
  const [query, setQuery] = useState(searchParams.q || "");
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<RealFirebaseUser[]>([]);
  const [selected, setSelected] = useState<ProfileUser | null>(null);
  const [friendStatuses, setFriendStatuses] = useState<
    Record<string, "none" | "sent" | "received" | "friends">
  >({});
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  // Fetch real users from Firebase Firestore — strictly no mockups
  useEffect(() => {
    let active = true;

    async function fetchFirebaseUsers() {
      setLoading(true);
      try {
        const snap = await getDocsFromServer(fsQuery(collection(db, "users"), limit(40)));
        if (!active) return;

        const list: RealFirebaseUser[] = snap.docs
          .filter((d) => d.id !== qbUser?.uid)
          .map((d) => {
            const data = d.data() as DocumentData;
            const username = typeof data.username === "string" ? data.username.trim() : "";
            const lower = username.toLowerCase();
            const isH3 = lower === "h3" || lower === "00h3" || lower === "ira" || lower === "hr" || lower === "ira/hr" || data.email === "mammaettahiri@gmail.com";
            const displayName = isH3 ? "h3" : userDisplayName(data, d.id);
            const isStaff = isH3 || lower === "die";
            const snapshot = normalizeAvatarSnapshot(data);
            const modelUrl =
              snapshot?.modelUrl ||
              (snapshot?.selectedCharacter === "char2" ? CHARACTER_2_GLTF : CHARACTER_1_GLTF);

            return {
              id: d.id,
              username: isH3 ? "h3" : username,
              displayName,
              customId: data.email === "mammaettahiri@gmail.com" || isH3 || lower === "die" ? "id4" : (data.customId || d.id.slice(0, 8).toUpperCase()),
              bio: typeof data.bio === "string" ? data.bio : undefined,
              avatarSnapshot: snapshot,
              modelUrl,
              staff: isStaff,
              online: data.online ?? true,
              friendCount: typeof data.friendCount === "number" ? data.friendCount : undefined,
            };
          });

        setPlayers(list);

        // Check friend statuses for fetched users
        if (qbUser?.uid) {
          const statusMap: Record<string, "none" | "sent" | "received" | "friends"> = {};
          await Promise.all(
            list.slice(0, 15).map(async (u) => {
              try {
                statusMap[u.id] = await getFriendStatus(qbUser.uid, u.id);
              } catch {
                statusMap[u.id] = "none";
              }
            }),
          );
          if (active) setFriendStatuses((prev) => ({ ...prev, ...statusMap }));
        }
      } catch (err) {
        console.warn("Could not fetch real users from Firestore:", err);
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchFirebaseUsers();

    return () => {
      active = false;
    };
  }, [qbUser?.uid]);

  // Real-time filtering on Firebase users
  const filteredPlayers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return players;
    return players.filter((p) => {
      return (
        p.displayName.toLowerCase().includes(q) ||
        p.username.toLowerCase().includes(q) ||
        (p.customId && p.customId.toLowerCase().includes(q))
      );
    });
  }, [players, query]);

  async function handleOpenProfile(player: RealFirebaseUser) {
    setSelected({
      id: player.id,
      n: player.displayName,
      displayName: player.displayName,
      username: player.username || undefined,
      bio: player.bio,
      online: player.online ?? true,
      color: uidColor(player.id),
      friendCount: player.friendCount,
      avatarSnapshot: player.avatarSnapshot,
      staff: player.staff,
      customId: player.customId,
    } as ProfileUser);
  }

  async function handleAddFriend(e: React.MouseEvent, targetUid: string, targetName: string) {
    e.stopPropagation();
    if (!qbUser?.uid) {
      toast.info("Please sign in to add friends.");
      return;
    }
    setActionLoading((prev) => ({ ...prev, [targetUid]: true }));
    try {
      await sendFriendRequest(qbUser.uid, targetUid);
      setFriendStatuses((prev) => ({ ...prev, [targetUid]: "sent" }));
      toast.success(`Friend request sent to ${targetName}!`);
    } catch (err: any) {
      console.error("Friend request error:", err);
      if (err.message?.includes("permission")) {
        toast.error("Missing permission to add friend.");
      } else {
        toast.error(err?.message || "Could not send friend request.");
      }
    } finally {
      setActionLoading((prev) => ({ ...prev, [targetUid]: false }));
    }
  }

  return (
    <MobileShell hideNav={false} scroll={true}>
      <div className="min-h-dvh flex flex-col bg-white text-[#17191d] pb-40 select-none">
        {/* Top Header */}
        <header className="flex items-center justify-between px-5 pt-4 pb-3 bg-white border-b border-black/[0.04]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined" && window.history.length > 1) {
                  window.history.back();
                } else {
                  nav({ to: "/" as never });
                }
              }}
              className="qb-squircle press grid h-9 w-9 place-items-center text-[#17191d]"
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h1 className="text-[18px] font-black tracking-tight text-[#17191d]">
              Find Players<span className="text-[#fa4616]">.</span>
            </h1>
          </div>
        </header>

        {/* Element-level Loading Screen */}
        {loading && (
          <div className="px-5 pt-6">
            <HtmlElementLoader />
          </div>
        )}

        {/* Real Firebase Players Display */}
        {!loading && (
          <div className="px-5 pt-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-extrabold text-[#17191d] tracking-tight">
                {query ? `Search Results (${filteredPlayers.length})` : "Suggested Players"}
              </span>
              <span className="text-[11px] font-semibold text-[#697383]">
                {filteredPlayers.length} {filteredPlayers.length === 1 ? "player" : "players"}
              </span>
            </div>

            {filteredPlayers.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {filteredPlayers.map((player) => {
                  const status = friendStatuses[player.id] || "none";
                  const isActionBusy = actionLoading[player.id];

                  return (
                    <div
                      key={player.id}
                      onClick={() => handleOpenProfile(player)}
                      className="press flex flex-col p-3 gap-2.5 relative cursor-pointer active:scale-[0.99] transition-transform rounded-[18px] border border-black/10 bg-gradient-to-b from-[#fbfcfd] to-[#f1f4f8] shadow-[0_4px_14px_rgba(23,24,27,0.05)]"
                    >
                      {/* 3D Character thumbnail iframe preview */}
                      <div className="w-full h-[140px] rounded-[14px] overflow-hidden bg-[#eef2f6] relative flex items-center justify-center">
                        <iframe
                          src={getAvatarViewerUrl({
                            username: player.username || player.n,
                            customId: player.customId,
                            characterId: player.avatarSnapshot?.selectedCharacter,
                            gender: player.avatarSnapshot?.gender,
                          })}
                          className="w-full h-full border-0 absolute inset-0 bg-transparent pointer-events-none"
                          style={{ border: "none" }}
                          loading="lazy"
                          allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope"
                        />
                      </div>

                      {/* User Info - no nested padding */}
                      <div className="flex flex-col min-w-0 gap-0.5">
                        <div className="text-[13.5px] font-extrabold text-[#17191d] truncate">
                          <UserNameWithBadges
                            user={{
                              username: player.username,
                              displayName: player.displayName,
                              customId: player.customId,
                            }}
                            name={player.displayName}
                            badgeSize={13}
                          />
                        </div>
                        <div className="text-[11px] font-semibold text-[#697383] truncate">
                          ID: {player.customId}
                        </div>
                      </div>

                      {/* Real Add Friend Action Button - strictly no icon */}
                      <button
                        type="button"
                        onClick={(e) => handleAddFriend(e, player.id, player.displayName)}
                        disabled={status !== "none" || isActionBusy}
                        className={`qb-squircle press w-full h-[34px] flex items-center justify-center text-[12.5px] font-black transition-all ${
                          status === "friends"
                            ? "bg-green-500/10 text-green-700 border-green-500/30"
                            : status === "sent"
                              ? "bg-orange-500/10 text-orange-700 border-orange-500/30"
                              : "text-[#17191d] bg-white border border-black/10 shadow-xs active:bg-slate-50"
                        }`}
                      >
                        {isActionBusy ? (
                          <HtmlSpinner size="sm" />
                        ) : status === "friends" ? (
                          "Friends"
                        ) : status === "sent" ? (
                          "Requested"
                        ) : (
                          "Add"
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-16 text-center flex flex-col items-center justify-center text-[#697383]">
                <User className="w-10 h-10 text-slate-300 mb-2" />
                <p className="text-[13.5px] font-semibold text-[#17191d]">
                  {query ? "No players match your search" : "No other players found yet"}
                </p>
                <p className="text-[12px] text-[#8a94a6] mt-0.5">
                  {query
                    ? "Check the username or ID and try again"
                    : "Invite your friends to register and join QBLOCK!"}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Bottom Docked Search UI - strictly NO separate search button, user hits search on keyboard / form submit */}
        <div className="fixed bottom-[calc(60px+env(safe-area-inset-bottom))] left-0 right-0 z-30 max-w-[480px] mx-auto px-4 pb-2.5 pt-2 bg-white/95 backdrop-blur-md border-t border-black/[0.06] shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
            }}
            className="flex items-center gap-2.5 h-[44px] px-3.5 rounded-[14px] border border-black/[0.1] bg-[#f8fafc] focus-within:border-[#fa4616] focus-within:bg-white transition-all shadow-xs"
          >
            <SearchIcon className="h-4 w-4 text-[#697383] shrink-0 fill-current" />
            <input
              type="search"
              enterKeyHint="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search players by name, username or ID..."
              className="w-full bg-transparent text-[14px] font-semibold text-[#17191d] outline-none placeholder:text-[#8a94a6]"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="p-1 text-[#697383] hover:text-[#17191d]"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </form>
        </div>

        {/* Profile Sheet for Clicked User */}
        {selected && (
          <ProfileSheet
            user={selected}
            onClose={() => setSelected(null)}
            onChat={() => {
              nav({ to: "/chat/$id" as never, params: { id: selected.id } as never });
              setSelected(null);
            }}
          />
        )}
      </div>
    </MobileShell>
  );
}
