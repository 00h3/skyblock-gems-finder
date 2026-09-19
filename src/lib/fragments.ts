import { useEffect, useState } from "react";
import { doc, runTransaction } from "firebase/firestore";
import { auth, db } from "./firebase";

export const FRAGMENT_MIN_DELAY = 10 * 60 * 1000;
export const FRAGMENT_MAX_DELAY = 60 * 60 * 1000;
export const FRAGMENT_TRIAL_MS = 24 * 60 * 60 * 1000;

export type FragmentSnapshot = {
  fragments?: unknown;
  fragmentNextAt?: unknown;
  fragmentFaceTrialUntil?: unknown;
};

type FragmentState = {
  uid: string | null;
  count: number;
  nextAt: number | null;
  faceTrialUntil: number;
};

const state: FragmentState = {
  uid: null,
  count: 0,
  nextAt: null,
  faceTrialUntil: 0,
};
const subscribers = new Set<() => void>();

function emit() {
  subscribers.forEach((subscriber) => subscriber());
}

function numberValue(value: unknown, fallback: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function randomDelay() {
  return Math.floor(FRAGMENT_MIN_DELAY + Math.random() * (FRAGMENT_MAX_DELAY - FRAGMENT_MIN_DELAY));
}

export function setFragmentUser(uid: string | null) {
  if (state.uid === uid) return;
  state.uid = uid;
  state.count = 0;
  state.nextAt = null;
  state.faceTrialUntil = 0;
  emit();
}

export function hydrateFragments(snapshot: FragmentSnapshot | null | undefined) {
  if (!snapshot) return;
  state.count = Math.max(0, Math.floor(numberValue(snapshot.fragments, state.count)));
  const nextAt = numberValue(snapshot.fragmentNextAt, 0);
  state.nextAt = nextAt > 0 ? nextAt : null;
  state.faceTrialUntil = Math.max(
    0,
    numberValue(snapshot.fragmentFaceTrialUntil, state.faceTrialUntil),
  );
  emit();
}

export function getFragmentState() {
  return { ...state };
}

export function useFragments() {
  const [, rerender] = useState(0);
  useEffect(() => {
    const subscriber = () => rerender((value) => value + 1);
    subscribers.add(subscriber);
    return () => {
      subscribers.delete(subscriber);
    };
  }, []);
  return {
    count: state.count,
    nextAt: state.nextAt,
    faceTrialUntil: state.faceTrialUntil,
    faceTrialActive: state.faceTrialUntil > Date.now(),
  };
}

export async function ensureFragmentSchedule() {
  const uid = state.uid || auth.currentUser?.uid;
  if (!uid) return;
  const ref = doc(db, "users", uid);
  const nextAt = Date.now() + randomDelay();
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    const current = numberValue(snapshot.data()?.fragmentNextAt, 0);
    if (!current) transaction.update(ref, { fragmentNextAt: nextAt });
  });
  if (!state.nextAt) {
    state.nextAt = nextAt;
    emit();
  }
}

export async function claimFragment() {
  const uid = state.uid || auth.currentUser?.uid;
  if (!uid) throw new Error("Sign in to collect fragments.");

  const now = Date.now();
  const ref = doc(db, "users", uid);
  const result = await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    const data = snapshot.data() ?? {};
    const count = Math.max(0, Math.floor(numberValue(data.fragments, state.count)));
    const nextAt = numberValue(data.fragmentNextAt, 0);
    if (nextAt > now) {
      return {
        claimed: false,
        count,
        nextAt,
        faceTrialUntil: numberValue(data.fragmentFaceTrialUntil, 0),
      };
    }
    const next = now + randomDelay();
    transaction.update(ref, {
      fragments: count + 1,
      fragmentNextAt: next,
    });
    return {
      claimed: true,
      count: count + 1,
      nextAt: next,
      faceTrialUntil: numberValue(data.fragmentFaceTrialUntil, 0),
    };
  });
  state.count = result.count;
  state.nextAt = result.nextAt;
  state.faceTrialUntil = result.faceTrialUntil;
  emit();
  return result.claimed;
}

export async function redeemFaceFragment() {
  const uid = state.uid || auth.currentUser?.uid;
  if (!uid) throw new Error("Sign in to use fragments.");

  const now = Date.now();
  const ref = doc(db, "users", uid);
  const result = await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    const data = snapshot.data() ?? {};
    const count = Math.max(0, Math.floor(numberValue(data.fragments, state.count)));
    if (count < 1)
      return {
        redeemed: false,
        count,
        faceTrialUntil: numberValue(data.fragmentFaceTrialUntil, 0),
      };
    const currentTrial = numberValue(data.fragmentFaceTrialUntil, 0);
    const faceTrialUntil = Math.max(now, currentTrial) + FRAGMENT_TRIAL_MS;
    transaction.update(ref, {
      fragments: count - 1,
      fragmentFaceTrialUntil: faceTrialUntil,
    });
    return { redeemed: true, count: count - 1, faceTrialUntil };
  });
  state.count = result.count;
  state.faceTrialUntil = result.faceTrialUntil;
  emit();
  return result.redeemed;
}
