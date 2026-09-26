import { Store } from "./store";

export type Announcement = { id: number; title: string; detail?: string; tone?: "info" | "event" | "reward" };

let seq = 0;

/** Centre-screen message channel used by every engine system. */
export const announcer = new Store<Announcement | null>(null);

export function announce(title: string, detail?: string, tone: Announcement["tone"] = "info") {
  announcer.set(() => ({ id: ++seq, title, detail, tone }));
}
