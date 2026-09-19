/**
 * QBLOCK Activity Log — tracks user actions (fragment claims, shop purchases,
 * hat equips, sandbox block edits, daily rewards) and persists them locally.
 */

export type ActivityType =
  | "fragment_claim"
  | "shop_purchase"
  | "hat_equip"
  | "block_action"
  | "friend_action"
  | "login_bonus";

export type ActivityEntry = {
  id: string;
  type: ActivityType;
  title: string;
  detail: string;
  timestamp: number;
};

const LOG_KEY = "qb_activity_log";

const DEFAULT_INITIAL_LOGS: ActivityEntry[] = [
  {
    id: "act_init_1",
    type: "login_bonus",
    title: "Daily Login Bonus",
    detail: "Claimed daily rewards & Coins",
    timestamp: Date.now() - 1000 * 60 * 18,
  },
  {
    id: "act_init_2",
    type: "fragment_claim",
    title: "Fragment Collected",
    detail: "Unlocked rare fragment shard",
    timestamp: Date.now() - 1000 * 60 * 85,
  },
  {
    id: "act_init_3",
    type: "block_action",
    title: "Sandbox Construction",
    detail: "Placed blocks in 3D Sandbox world",
    timestamp: Date.now() - 1000 * 60 * 240,
  },
];

export function getActivityLog(): ActivityEntry[] {
  if (typeof window === "undefined") return DEFAULT_INITIAL_LOGS;
  try {
    const raw = localStorage.getItem(LOG_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_INITIAL_LOGS;
}

export function logActivity(type: ActivityType, title: string, detail: string) {
  if (typeof window === "undefined") return;
  const current = getActivityLog();
  const entry: ActivityEntry = {
    id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    type,
    title,
    detail,
    timestamp: Date.now(),
  };
  const updated = [entry, ...current].slice(0, 40);
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(updated));
  } catch {}
  window.dispatchEvent(new CustomEvent("qb_activity_log_updated"));
}

export function clearActivityLog() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LOG_KEY);
  window.dispatchEvent(new CustomEvent("qb_activity_log_updated"));
}
