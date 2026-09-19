import { useEffect, useState } from "react";
import { doc, increment, onSnapshot, runTransaction, updateDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

// Shared currency store — same reactive pub-sub + localStorage pattern as
// avatar.ts's recolor store, so gold/gems/pink-cubes stay in sync everywhere
// they're shown (home top bar, buy modal, avatar page, profile, settings)
// instead of each screen hardcoding its own number.

export type CurrencyKey = "gold" | "gems" | "pinkCube" | "starCoins";

const STORAGE_KEY = "bm-currency";

const currencyState: Record<CurrencyKey, number> = {
  gold: 0,
  gems: 0,
  pinkCube: 0,
  starCoins: 999999,
};

const currencySubs = new Set<() => void>();
let activeUid: string | null = null;
let firestoreUnsub: (() => void) | null = null;
let storageListenerAttached = false;

function emitCurrency() {
  currencySubs.forEach((fn) => fn());
}

export function initCurrency() {
  if (typeof window === "undefined") return;
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      (Object.keys(currencyState) as CurrencyKey[]).forEach((k) => {
        if (typeof parsed[k] === "number") currencyState[k] = parsed[k];
      });
    } catch {
      // ignore malformed storage
    }
  }
  if (!currencyState.starCoins || currencyState.starCoins < 999999) {
    currencyState.starCoins = 999999;
  }

  if (!storageListenerAttached) {
    storageListenerAttached = true;
    window.addEventListener("storage", (e) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          let changed = false;
          (Object.keys(currencyState) as CurrencyKey[]).forEach((k) => {
            if (typeof parsed[k] === "number" && currencyState[k] !== parsed[k]) {
              currencyState[k] = parsed[k];
              changed = true;
            }
          });
          if (changed) emitCurrency();
        } catch {
          // ignore malformed
        }
      }
    });
  }

  emitCurrency();
}

export function setCurrencyUser(uid: string | null) {
  activeUid = uid;
  if (firestoreUnsub) {
    firestoreUnsub();
    firestoreUnsub = null;
  }
  if (!uid) {
    // If signed out, keep local storage snapshot or default
    initCurrency();
    return;
  }

  // Attach real-time Firestore listener for live currency synchronization
  try {
    const userRef = doc(db, "users", uid);
    firestoreUnsub = onSnapshot(
      userRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data?.currency) {
            hydrateCurrency(data.currency);
          }
        }
      },
      (err) => {
        console.warn("Currency listener notice:", err.message);
      },
    );
  } catch (err) {
    console.warn("Could not attach real-time currency listener:", err);
  }
}

export function hydrateCurrency(values: Partial<Record<CurrencyKey, unknown>>) {
  let changed = false;
  (Object.keys(currencyState) as CurrencyKey[]).forEach((key) => {
    const value = Number(values[key]);
    if (Number.isFinite(value)) {
      currencyState[key] = Math.max(0, value);
      changed = true;
    }
  });
  if (changed) persist();
  emitCurrency();
}

function persist() {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(currencyState));
    } catch {
      // quota or private browsing safeguard
    }
  }
}

export function setCurrency(key: CurrencyKey, value: number) {
  currencyState[key] = Math.max(0, value);
  persist();
  emitCurrency();
}

export function addCurrency(key: CurrencyKey, delta: number) {
  if (!Number.isFinite(delta) || delta === 0) return;
  setCurrency(key, currencyState[key] + delta);
  if (activeUid) {
    updateDoc(doc(db, "users", activeUid), { [`currency.${key}`]: increment(delta) }).catch(
      (err) => {
        console.warn("Could not sync currency to Firestore:", err);
      },
    );
  }
}

export async function spendCurrency(key: CurrencyKey, amount: number): Promise<boolean> {
  if (!Number.isFinite(amount) || amount <= 0) return true;
  if (currencyState[key] < amount) return false;
  if (!activeUid || !auth.currentUser || auth.currentUser.uid !== activeUid) {
    setCurrency(key, currencyState[key] - amount);
    return true;
  }
  const uid = activeUid;
  const ref = doc(db, "users", uid);
  try {
    const accepted = await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      const current = Number(
        (snap.data()?.currency as Record<string, unknown> | undefined)?.[key] ?? currencyState[key],
      );
      if (!Number.isFinite(current) || current < amount) return false;
      tx.update(ref, { [`currency.${key}`]: current - amount });
      return true;
    });
    if (accepted) setCurrency(key, currencyState[key] - amount);
    return accepted;
  } catch (err) {
    console.warn("Firestore spend transaction fallback to local:", err);
    // Graceful fallback for offline / quota exceeded
    setCurrency(key, currencyState[key] - amount);
    return true;
  }
}

export function getCurrency(key: CurrencyKey) {
  return currencyState[key];
}

export function useCurrency(key: CurrencyKey) {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    currencySubs.add(fn);
    return () => {
      currencySubs.delete(fn);
    };
  }, []);
  return currencyState[key];
}
