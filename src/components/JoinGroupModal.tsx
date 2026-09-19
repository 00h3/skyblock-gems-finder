import React, { useEffect, useState } from "react";
import { X, Users, ShieldCheck, Sparkles, ArrowRight, Search, Check } from "lucide-react";
import {
  subscribeDiscoverableGroups,
  joinGroupChat,
  ensureDefaultCommunityGroups,
  type GroupChatData,
} from "@/lib/group-chat";
import { ServerIconBadge } from "@/components/ServerIconBadge";
import { HtmlSpinner } from "@/components/ui/HtmlLoadingScreen";
import { toast } from "sonner";

interface JoinGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: {
    uid: string;
    displayName: string;
  } | null;
  onOpenGroup: (group: GroupChatData) => void;
  onRequireAuth?: () => void;
}

export function JoinGroupModal({
  isOpen,
  onClose,
  currentUser,
  onOpenGroup,
  onRequireAuth,
}: JoinGroupModalProps) {
  const [groups, setGroups] = useState<GroupChatData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [joiningId, setJoiningId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);

    void ensureDefaultCommunityGroups(currentUser?.uid).then(() => {
      const unsub = subscribeDiscoverableGroups((list) => {
        setGroups(list);
        setLoading(false);
      });
      return () => unsub();
    });
  }, [isOpen, currentUser?.uid]);

  if (!isOpen) return null;

  const filtered = groups.filter(
    (g) =>
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.description?.toLowerCase().includes(search.toLowerCase()),
  );

  async function handleJoin(group: GroupChatData) {
    if (!currentUser) {
      if (onRequireAuth) {
        onRequireAuth();
      } else {
        toast.info("Please sign in or create an account to join this group!");
      }
      return;
    }

    setJoiningId(group.id);
    try {
      await joinGroupChat(group.id, currentUser.uid, currentUser.displayName || "Player");
      toast.success(`Joined ${group.name}!`);
      onOpenGroup(group);
      onClose();
    } catch (err) {
      console.error("Error joining group:", err);
      toast.error("Failed to join group. Try again.");
    } finally {
      setJoiningId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-[480px] bg-white dark:bg-[#121316] rounded-t-[28px] sm:rounded-[24px] shadow-2xl border border-black/10 dark:border-white/10 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-[10px] bg-[#5865F2]/15 text-[#5865F2] grid place-items-center">
              <Users className="h-4 w-4 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-[16px] font-black tracking-tight text-[#141414] dark:text-white">
                Join Community Group
              </h2>
              <p className="text-[11.5px] text-[#697383]">
                Discord-style community servers & squad chats
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="press h-8 w-8 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/10 grid place-items-center text-[#697383] hover:text-[#141414] dark:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-5 pt-3 pb-2">
          <div className="flex items-center gap-2 h-10 px-3 rounded-[12px] bg-[#f8fafc] dark:bg-[#181a20] border border-black/10 dark:border-white/10">
            <Search className="h-3.5 w-3.5 text-[#8b929d]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search community groups..."
              className="w-full bg-transparent text-[12.5px] font-semibold text-[#141414] dark:text-white outline-none placeholder:text-[#8b929d]"
            />
          </div>
        </div>

        {/* Groups List */}
        <div className="flex-1 overflow-y-auto px-5 py-2 space-y-3">
          {loading ? (
            <div className="py-12 flex justify-center">
              <HtmlSpinner size="md" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-[13px] text-[#697383]">
              No groups found matching &ldquo;{search}&rdquo;
            </div>
          ) : (
            filtered.map((group) => {
              const isJoined = currentUser && group.members?.includes(currentUser.uid);
              const isBusy = joiningId === group.id;

              return (
                <div
                  key={group.id}
                  className="p-3.5 rounded-[18px] bg-gradient-to-b from-[#fbfcfd] to-[#f4f7fa] dark:from-[#181a20] dark:to-[#14151a] border border-black/[0.08] dark:border-white/[0.08] flex items-center justify-between gap-3 shadow-xs"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <ServerIconBadge
                      iconName={group.iconName}
                      gradient={group.gradient}
                      size="md"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-[13.5px] font-black text-[#141414] dark:text-white truncate">
                          {group.name}
                        </h3>
                      </div>
                      <p className="text-[11.5px] text-[#697383] truncate mt-0.5">
                        {group.description || "Active community server"}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[10.5px] text-[#8b929d] font-bold">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {group.memberCount || 1} members
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-[#fa4616]">
                          <ShieldCheck className="h-3 w-3" />
                          {group.rules?.length || 0} Rules
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (isJoined) {
                        onOpenGroup(group);
                        onClose();
                      } else {
                        void handleJoin(group);
                      }
                    }}
                    disabled={isBusy}
                    className={`qb-squircle press px-3.5 py-2 text-[12px] font-black shrink-0 transition-all ${
                      isJoined
                        ? "bg-green-500/10 text-green-700 border border-green-500/20"
                        : "bg-[#fa4616] text-white shadow-xs"
                    }`}
                  >
                    {isBusy ? (
                      <HtmlSpinner size="xs" />
                    ) : isJoined ? (
                      <span className="flex items-center gap-1">
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                        <span>Open</span>
                      </span>
                    ) : (
                      "Join Group"
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#f8fafc] dark:bg-[#15171d] border-t border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between text-[11.5px] text-[#697383]">
          <span>Servers feature interactive rules & custom icon packs</span>
          <button
            type="button"
            onClick={onClose}
            className="font-bold text-[#141414] dark:text-white hover:underline"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
