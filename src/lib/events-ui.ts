// Global Events popup bus. Any component anywhere in the app can call
// openEvents() — the popup itself is mounted once in __root.tsx.

import { useEffect, useState } from "react";

type EventsUiState = {
  open: boolean;
};

const state: EventsUiState = { open: false };
const subs = new Set<() => void>();

function emit() {
  subs.forEach((fn) => fn());
}

export function openEvents() {
  state.open = true;
  emit();
}

export function closeEvents() {
  if (!state.open) return;
  state.open = false;
  emit();
}

export function useEventsUi() {
  const [, force] = useState(0);

  useEffect(() => {
    const fn = () => force((n) => n + 1);
    subs.add(fn);
    return () => {
      subs.delete(fn);
    };
  }, []);

  return { open: state.open, openEvents, closeEvents };
}
