// Global Fragments popup bus. Any component anywhere in the app can call
// openFragments() — the popup itself is mounted once in __root.tsx.
import { useEffect, useState } from "react";
import type { FragmentTagId } from "./fragment-tags";

type FragmentsUiState = {
  open: boolean;
  tag: FragmentTagId | null;
};

const state: FragmentsUiState = { open: false, tag: null };
const subs = new Set<() => void>();

function emit() {
  subs.forEach((fn) => fn());
}

export function openFragments(tag?: FragmentTagId) {
  state.open = true;
  state.tag = tag ?? null;
  emit();
}

export function closeFragments() {
  if (!state.open) return;
  state.open = false;
  emit();
}

export function useFragmentsUi() {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    subs.add(fn);
    return () => {
      subs.delete(fn);
    };
  }, []);
  return { open: state.open, tag: state.tag, openFragments, closeFragments };
}
