import type { AvatarSnapshot } from "./avatar";

export interface SavedAccount {
  uid: string;
  username: string;
  displayName: string;
  email: string | null;
  customId: string;
  profilePhoto?: string;
  avatarSnapshot?: AvatarSnapshot;
  color?: string;
  lastActive: number;
}

const STORAGE_KEY = "qb_saved_accounts";

/**
 * Retrieve all saved accounts from localStorage, ordered by last active descending.
 */
export function getSavedAccounts(): SavedAccount[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0));
    }
  } catch (err) {
    console.error("Failed to parse saved accounts", err);
  }
  return [];
}

/**
 * Save or update an account in localStorage.
 */
export function saveAccount(account: {
  uid: string;
  username: string;
  displayName?: string;
  email?: string | null;
  customId?: string;
  profilePhoto?: string;
  avatarSnapshot?: AvatarSnapshot;
  color?: string;
}): SavedAccount[] {
  if (typeof window === "undefined" || !account.uid) return [];
  try {
    const current = getSavedAccounts();
    const existingIndex = current.findIndex((a) => a.uid === account.uid);

    const updatedAccount: SavedAccount = {
      uid: account.uid,
      username: account.username || (account.email ? account.email.split("@")[0] : "Player"),
      displayName: account.displayName || account.username || "Player",
      email: account.email || null,
      customId: account.customId || `QB-${account.uid.slice(0, 6).toUpperCase()}`,
      profilePhoto: account.profilePhoto || "",
      avatarSnapshot: account.avatarSnapshot,
      color: account.color || "#fa4616",
      lastActive: Date.now(),
    };

    if (existingIndex >= 0) {
      // Merge
      current[existingIndex] = {
        ...current[existingIndex],
        ...updatedAccount,
        lastActive: Date.now(),
      };
    } else {
      current.unshift(updatedAccount);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    return current;
  } catch (err) {
    console.error("Failed to save account", err);
    return getSavedAccounts();
  }
}

/**
 * Remove an account from the saved list.
 */
export function removeSavedAccount(uid: string): SavedAccount[] {
  if (typeof window === "undefined") return [];
  try {
    const current = getSavedAccounts().filter((a) => a.uid !== uid);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    return current;
  } catch (err) {
    console.error("Failed to remove saved account", err);
    return getSavedAccounts();
  }
}
