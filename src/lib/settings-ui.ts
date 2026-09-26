import { useEffect, useState } from "react";

type SettingsUiState = {
  open: boolean;
};

const state: SettingsUiState = { open: false };
const subs = new Set<() => void>();

function emit() {
  subs.forEach((fn) => fn());
}

export function openSettings() {
  state.open = true;
  emit();
}

export function closeSettings() {
  if (!state.open) return;
  state.open = false;
  emit();
}

export function useSettingsUi() {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    subs.add(fn);
    return () => {
      subs.delete(fn);
    };
  }, []);
  return { open: state.open, openSettings, closeSettings };
}
