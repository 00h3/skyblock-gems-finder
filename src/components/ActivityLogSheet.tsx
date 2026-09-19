import React, { useEffect, useState } from "react";
import {
  History,
  Trash2,
  X,
  CheckCircle2,
  Gift,
  Shirt,
  Box,
  UserPlus,
  Sparkles,
} from "lucide-react";
import {
  getActivityLog,
  clearActivityLog,
  type ActivityEntry,
  type ActivityType,
} from "@/lib/activity-log";
import { toast } from "sonner";
import { MobileShell } from "@/components/MobileShell";
import { SubPage } from "@/components/SubPage";
import { BarChart3 } from "lucide-react";

export function ActivityLogPage() {
  const [logs, setLogs] = useState<ActivityEntry[]>(() => getActivityLog());

  useEffect(() => {
    const handleUpdate = () => setLogs(getActivityLog());
    window.addEventListener("qb_activity_log_updated", handleUpdate);
    return () => window.removeEventListener("qb_activity_log_updated", handleUpdate);
  }, []);

  function handleClear() {
    clearActivityLog();
    setLogs([]);
    toast.success("Activity log cleared");
  }

  return (
    <MobileShell hideNav>
      <SubPage
        title="Activity Log"
        right={
          logs.length > 0 ? (
            <button
              type="button"
              onClick={handleClear}
              className="press grid h-9 w-9 place-items-center rounded-[11px] bg-black/5 text-[#737982]"
              aria-label="Clear activity log"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null
        }
      >
        <div className="min-h-full bg-[#f1f3f5] px-4 pb-10 pt-4">
          <div className="mb-4 rounded-[20px] bg-gradient-to-br from-[#272c36] via-[#1c2028] to-[#14171d] p-4 text-white shadow-[0_10px_25px_rgba(15,23,42,0.15)]">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-[14px] bg-white/10 ring-1 ring-white/15">
                <BarChart3 className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.16em] text-white/50">
                  Your timeline
                </p>
                <h2 className="mt-1 text-[20px] font-black tracking-[-.04em]">Recent activity</h2>
              </div>
            </div>
            <p className="mt-3 text-[11px] font-medium leading-relaxed text-white/60">
              A record of your rewards, creations, wardrobe changes, and time in QBLOCK.
            </p>
          </div>

          {logs.length === 0 ? (
            <div className="rounded-[20px] border border-black/[.07] bg-white px-5 py-14 text-center shadow-[0_4px_16px_rgba(15,23,42,0.05)]">
              <Sparkles className="mx-auto mb-2 h-8 w-8 text-[#cbd1d8]" />
              <p className="text-[14px] font-black text-[#454c56]">No recent activity</p>
              <p className="mt-1 text-[11px] font-medium text-[#9aa1ab]">
                Play games, equip wearables, or claim fragments to populate your log.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {logs.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 rounded-[18px] border border-black/[.06] bg-white p-3.5 shadow-[0_3px_12px_rgba(18,28,38,.045)]"
                >
                  <ActivityIcon type={item.type} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[13px] font-extrabold text-[#17181b]">
                        {item.title}
                      </span>
                      <span className="shrink-0 text-[10px] font-bold text-[#9aa1ab]">
                        {formatAgo(item.timestamp)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] font-medium leading-snug text-[#737982]">
                      {item.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SubPage>
    </MobileShell>
  );
}

export function ActivityLogSheet({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [logs, setLogs] = useState<ActivityEntry[]>(() => getActivityLog());

  useEffect(() => {
    function handleUpdate() {
      setLogs(getActivityLog());
    }
    window.addEventListener("qb_activity_log_updated", handleUpdate);
    return () => window.removeEventListener("qb_activity_log_updated", handleUpdate);
  }, []);

  if (!isOpen) return null;

  function handleClear() {
    clearActivityLog();
    setLogs([]);
    toast.success("Activity log cleared");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-0 sm:p-4">
      <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#17191e] p-5 shadow-2xl border border-slate-200 dark:border-white/10 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/40">
              <History className="h-4.5 w-4.5" />
            </span>
            <div>
              <h2 className="text-[17px] font-black tracking-tight text-slate-900 dark:text-white">
                Activity Log
              </h2>
              <p className="text-[11px] font-semibold text-slate-400">
                Your recent actions & achievements
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {logs.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                className="press grid h-8 w-8 place-items-center rounded-xl bg-slate-100 dark:bg-white/10 text-slate-500 hover:text-red-500 transition-colors"
                title="Clear activity log"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="press grid h-8 w-8 place-items-center rounded-xl bg-slate-100 dark:bg-white/10 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Log List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2 [scrollbar-width:none]">
          {logs.length === 0 ? (
            <div className="py-12 text-center">
              <Sparkles className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-[14px] font-bold text-slate-700 dark:text-slate-300">
                No recent activity
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Play games, equip hats, or claim fragments to populate your log!
              </p>
            </div>
          ) : (
            logs.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 rounded-2xl p-3 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 transition-colors"
              >
                <ActivityIcon type={item.type} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-extrabold text-slate-900 dark:text-white truncate">
                      {item.title}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 shrink-0 ml-2">
                      {formatAgo(item.timestamp)}
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                    {item.detail}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function ActivityIcon({ type }: { type: ActivityType }) {
  switch (type) {
    case "fragment_claim":
      return (
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-pink-100 text-pink-600 dark:bg-pink-950/60 dark:text-pink-400">
          <Gift className="h-4 w-4" />
        </span>
      );
    case "shop_purchase":
    case "hat_equip":
      return (
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
          <Shirt className="h-4 w-4" />
        </span>
      );
    case "block_action":
      return (
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
          <Box className="h-4 w-4" />
        </span>
      );
    case "friend_action":
      return (
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
          <UserPlus className="h-4 w-4" />
        </span>
      );
    default:
      return (
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4" />
        </span>
      );
  }
}

function formatAgo(timestamp: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}d ago`;
}
