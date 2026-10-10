import { useState, useEffect, useCallback } from "react";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { addCurrency } from "./currency";

export interface DailyTask {
  id: string;
  title: string;
  description: string;
  coinReward: number;
  gemReward: number;
  pointsReward: number;
  targetCount: number;
  iconUrl: string;
  type: "login" | "online" | "skyblock" | "chat";
  secondsTarget?: number;
}

export interface MilestoneTier {
  pts: number;
  title: string;
  coinReward: number;
  gemReward: number;
  iconUrl: string;
}

export const DAILY_TASKS_CONFIG: DailyTask[] = [
  {
    id: "daily-login",
    title: "Daily Login",
    description: "Log in to QBLOCK today to claim your daily check-in reward.",
    coinReward: 150,
    gemReward: 15,
    pointsReward: 25,
    targetCount: 1,
    iconUrl: "https://file.garden/alGOOylwpAfCa6qP/IMG_7216.png",
    type: "login",
  },
  {
    id: "skyblock-1h",
    title: "Skyblock Play (1 Hour)",
    description: "Build and play on Skyblock for 1 hour today.",
    coinReward: 1000,
    gemReward: 100,
    pointsReward: 100,
    targetCount: 1,
    secondsTarget: 3600, // 1 hour
    iconUrl: "https://file.garden/alGOOylwpAfCa6qP/IMG_7218.png",
    type: "skyblock",
  },
  {
    id: "skyblock-15m",
    title: "Skyblock Session (15 Mins)",
    description: "Play Skyblock for 15 minutes.",
    coinReward: 350,
    gemReward: 35,
    pointsReward: 40,
    targetCount: 1,
    secondsTarget: 900, // 15 mins
    iconUrl: "https://file.garden/alGOOylwpAfCa6qP/IMG_7240.png",
    type: "skyblock",
  },
  {
    id: "online-10min",
    title: "Stay Active (10 Mins)",
    description: "Spend 10 minutes exploring QBLOCK.",
    coinReward: 200,
    gemReward: 20,
    pointsReward: 30,
    targetCount: 1,
    secondsTarget: 600, // 10 minutes
    iconUrl: "https://file.garden/alGOOylwpAfCa6qP/IMG_7220.png",
    type: "online",
  },
  {
    id: "send-chat",
    title: "Send a Message",
    description: "Send a message in Global Chat or direct message a friend.",
    coinReward: 100,
    gemReward: 10,
    pointsReward: 15,
    targetCount: 1,
    iconUrl: "https://file.garden/alGOOylwpAfCa6qP/IMG_7239.png",
    type: "chat",
  },
];

export const MILESTONE_TIERS: MilestoneTier[] = [
  {
    pts: 50,
    title: "Silver Cache",
    coinReward: 250,
    gemReward: 20,
    iconUrl: "https://file.garden/alGOOylwpAfCa6qP/file_000000008f8481f49405d6c7b6fcbb5a.png",
  },
  {
    pts: 100,
    title: "Gold Cache",
    coinReward: 600,
    gemReward: 50,
    iconUrl: "https://file.garden/alGOOylwpAfCa6qP/file_000000007ea881f4a21aac7088884509.png",
  },
  {
    pts: 200,
    title: "Master Vault",
    coinReward: 1500,
    gemReward: 150,
    iconUrl: "https://file.garden/alGOOylwpAfCa6qP/IMG_7218.png",
  },
];

export const STREAK_REWARDS = [
  { day: 1, coins: 100, gems: 10 },
  { day: 2, coins: 150, gems: 15 },
  { day: 3, coins: 200, gems: 20 },
  { day: 4, coins: 250, gems: 25 },
  { day: 5, coins: 350, gems: 35 },
  { day: 6, coins: 500, gems: 50 },
  { day: 7, coins: 1000, gems: 100 },
];

export interface DailyProgressState {
  date: string;
  onlineSeconds: number;
  skyblockSeconds: number;
  chatsSent: number;
  claimedTasks: string[];
  claimedMilestones: number[];
  claimedStreakDay?: number;
  points: number;
  streakDays: number;
  lastLoginDate: string;
}

function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const STORAGE_KEY = "qb-daily-events-state";

function getInitialState(): DailyProgressState {
  const today = getTodayString();
  if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: DailyProgressState = JSON.parse(raw);
        if (parsed.date === today) {
          return parsed;
        }
        // Check consecutive day logic
        const yesterday = new Date(Date.now() - 86400000);
        const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
        const isConsecutive = parsed.lastLoginDate === yStr;
        const nextStreak = isConsecutive ? (parsed.streakDays % 7) + 1 : 1;

        const resetState: DailyProgressState = {
          date: today,
          onlineSeconds: 0,
          skyblockSeconds: 0,
          chatsSent: 0,
          claimedTasks: [],
          claimedMilestones: [],
          points: 0,
          streakDays: nextStreak,
          lastLoginDate: today,
        };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(resetState));
        } catch {}
        return resetState;
      }
    } catch {}
  }

  const freshState: DailyProgressState = {
    date: today,
    onlineSeconds: 0,
    skyblockSeconds: 0,
    chatsSent: 0,
    claimedTasks: [],
    claimedMilestones: [],
    points: 0,
    streakDays: 1,
    lastLoginDate: today,
  };
  if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(freshState));
    } catch {}
  }
  return freshState;
}

let memoryState: DailyProgressState = getInitialState();
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((cb) => cb());
}

function saveState(state: DailyProgressState) {
  memoryState = state;
  if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }
  notify();

  const user = auth.currentUser;
  if (user) {
    const userRef = doc(db, "users", user.uid);
    updateDoc(userRef, {
      dailyDays: {
        ...state,
        lastSynced: new Date().toISOString(),
      },
    }).catch(() => {
      setDoc(userRef, { dailyDays: state }, { merge: true }).catch(() => {});
    });
  }
}

export function recordChatSent() {
  const current = { ...memoryState };
  current.chatsSent = (current.chatsSent || 0) + 1;
  saveState(current);
}

export function incrementOnlineTime(seconds: number = 1) {
  const today = getTodayString();
  if (memoryState.date !== today) {
    memoryState = getInitialState();
  }
  memoryState.onlineSeconds = (memoryState.onlineSeconds || 0) + seconds;
  if (memoryState.onlineSeconds % 10 === 0) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryState));
    } catch {}
  }
  notify();
}

export function incrementSkyblockTime(seconds: number = 1) {
  const today = getTodayString();
  if (memoryState.date !== today) {
    memoryState = getInitialState();
  }
  memoryState.skyblockSeconds = (memoryState.skyblockSeconds || 0) + seconds;
  if (memoryState.skyblockSeconds % 10 === 0) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryState));
    } catch {}
  }
  notify();
}

export function useDailyEvents() {
  const [state, setState] = useState<DailyProgressState>(memoryState);

  useEffect(() => {
    const update = () => setState({ ...memoryState });
    listeners.add(update);

    const user = auth.currentUser;
    if (user) {
      const userRef = doc(db, "users", user.uid);
      getDoc(userRef)
        .then((snap) => {
          if (snap.exists()) {
            const cloudData = snap.data()?.dailyDays;
            if (cloudData && cloudData.date === getTodayString()) {
              const merged: DailyProgressState = {
                ...memoryState,
                ...cloudData,
                onlineSeconds: Math.max(memoryState.onlineSeconds, cloudData.onlineSeconds || 0),
                skyblockSeconds: Math.max(
                  memoryState.skyblockSeconds || 0,
                  cloudData.skyblockSeconds || 0,
                ),
                chatsSent: Math.max(memoryState.chatsSent, cloudData.chatsSent || 0),
                claimedTasks: Array.from(
                  new Set([...(memoryState.claimedTasks || []), ...(cloudData.claimedTasks || [])]),
                ),
                claimedMilestones: Array.from(
                  new Set([
                    ...(memoryState.claimedMilestones || []),
                    ...(cloudData.claimedMilestones || []),
                  ]),
                ),
                points: Math.max(memoryState.points || 0, cloudData.points || 0),
              };
              saveState(merged);
            }
          }
        })
        .catch(() => {});
    }

    return () => {
      listeners.delete(update);
    };
  }, []);

  const claimDailyTask = useCallback((taskId: string) => {
    const task = DAILY_TASKS_CONFIG.find((t) => t.id === taskId);
    if (!task) return false;
    if (memoryState.claimedTasks?.includes(taskId)) return false;

    addCurrency("gold", task.coinReward);
    addCurrency("gems", task.gemReward);

    const nextClaimed = [...(memoryState.claimedTasks || []), taskId];
    const nextPoints = (memoryState.points || 0) + task.pointsReward;

    const nextState: DailyProgressState = {
      ...memoryState,
      claimedTasks: nextClaimed,
      points: nextPoints,
    };
    saveState(nextState);
    return true;
  }, []);

  const claimMilestone = useCallback((milestonePts: number) => {
    const milestone = MILESTONE_TIERS.find((m) => m.pts === milestonePts);
    if (!milestone) return false;
    if ((memoryState.points || 0) < milestonePts) return false;
    if (memoryState.claimedMilestones?.includes(milestonePts)) return false;

    addCurrency("gold", milestone.coinReward);
    addCurrency("gems", milestone.gemReward);

    const nextClaimed = [...(memoryState.claimedMilestones || []), milestonePts];
    const nextState: DailyProgressState = {
      ...memoryState,
      claimedMilestones: nextClaimed,
    };
    saveState(nextState);
    return true;
  }, []);

  const claimStreakReward = useCallback(() => {
    const today = getTodayString();
    const streakDay = memoryState.streakDays || 1;
    const reward = STREAK_REWARDS[(streakDay - 1) % 7];
    if (!reward) return false;
    if (memoryState.claimedStreakDay === streakDay && memoryState.lastLoginDate === today) {
      return false;
    }

    addCurrency("gold", reward.coins);
    addCurrency("gems", reward.gems);

    const nextState: DailyProgressState = {
      ...memoryState,
      claimedStreakDay: streakDay,
      lastLoginDate: today,
    };
    saveState(nextState);
    return true;
  }, []);

  return {
    state,
    tasks: DAILY_TASKS_CONFIG,
    milestones: MILESTONE_TIERS,
    streakRewards: STREAK_REWARDS,
    claimDailyTask,
    claimMilestone,
    claimStreakReward,
  };
}
