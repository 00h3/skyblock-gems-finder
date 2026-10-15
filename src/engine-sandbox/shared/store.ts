import { useSyncExternalStore } from "react";

/**
 * Minimal observable store. Engine systems mutate state from the game loop;
 * React subscribes with `useStore` and only re-renders when a system calls
 * `set` — the render loop itself never touches React state.
 */
export class Store<T> {
  private listeners = new Set<() => void>();
  constructor(private state: T) {}

  get = () => this.state;

  set(patch: Partial<T> | ((prev: T) => T)) {
    this.state =
      typeof patch === "function" ? (patch as (p: T) => T)(this.state) : { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
}

export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
