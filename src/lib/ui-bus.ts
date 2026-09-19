// Tiny pub-sub used to toggle global UI flags (e.g. hide bottom nav while a sheet is open).
import { useEffect, useState } from "react";

type Flags = { navHidden: boolean };
const state: Flags = { navHidden: false };
const subs = new Set<() => void>();

function emit() {
  subs.forEach((fn) => fn());
}

export function setNavHidden(v: boolean) {
  if (state.navHidden === v) return;
  state.navHidden = v;
  emit();
}

export function useNavHidden() {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    subs.add(fn);
    return () => {
      subs.delete(fn);
    };
  }, []);
  return state.navHidden;
}

// Theme (dark mode) bus
const themeState = { dark: false as boolean };
const themeSubs = new Set<() => void>();
function emitTheme() {
  themeSubs.forEach((fn) => fn());
}
function apply() {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", themeState.dark);
}
export function initTheme() {
  if (typeof window === "undefined") return;
  const saved = window.localStorage.getItem("bm-theme");
  themeState.dark = saved === "dark";
  apply();
}
export function setDark(v: boolean) {
  themeState.dark = v;
  if (typeof window !== "undefined") {
    window.localStorage.setItem("bm-theme", v ? "dark" : "light");
  }
  apply();
  emitTheme();
}
export function useDark() {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    themeSubs.add(fn);
    return () => {
      themeSubs.delete(fn);
    };
  }, []);
  return themeState.dark;
}

// No Image Modal bus
interface NoImageData {
  open: boolean;
  title?: string;
  message?: string;
}
const noImageState: NoImageData = { open: false };
const noImageSubs = new Set<() => void>();

export function showNoImageModal(title?: string, message?: string) {
  noImageState.open = true;
  noImageState.title = title;
  noImageState.message = message;
  noImageSubs.forEach((fn) => fn());
}

export function hideNoImageModal() {
  noImageState.open = false;
  noImageSubs.forEach((fn) => fn());
}

export function useNoImageModal() {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    noImageSubs.add(fn);
    return () => {
      noImageSubs.delete(fn);
    };
  }, []);
  return noImageState;
}
