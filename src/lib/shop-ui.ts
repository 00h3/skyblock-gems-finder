// Global Shop popup bus. Any component anywhere in the app can call
// openShop() — the popup itself is mounted once in __root.tsx.

import { useEffect, useState } from "react";

type ShopUiState = {
  open: boolean;
};

const state: ShopUiState = { open: false };
const subs = new Set<() => void>();

function emit() {
  subs.forEach((fn) => fn());
}

export function openShop() {
  state.open = true;
  emit();
}

export function closeShop() {
  if (!state.open) return;
  state.open = false;
  emit();
}

export function useShopUi() {
  const [, force] = useState(0);

  useEffect(() => {
    const fn = () => force((n) => n + 1);
    subs.add(fn);
    return () => {
      subs.delete(fn);
    };
  }, []);

  return { open: state.open, openShop, closeShop };
}
