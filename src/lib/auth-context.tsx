import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { onAuthStateChanged, signOut as fbSignOut, type User } from "firebase/auth";
import { doc, onSnapshot, type DocumentData } from "firebase/firestore";
import { auth, db } from "./firebase";
import { addCurrency, hydrateCurrency, setCurrencyUser } from "./currency";
import { normalizeAvatarSnapshot, type AvatarSnapshot } from "./avatar";
import { hydrateFragments, setFragmentUser } from "./fragments";

export interface QBUser {
  uid: string;
  email: string | null;
  username: string;
  customId: string;
  displayName: string;
  bio: string;
  profilePhoto: string;
  createdAt: string;
  onboardingCompleted: boolean;
  onboardingAnswers?: Record<string, unknown>;
  sessionId?: string;
  xp: number;
  level: number;
  badgeEquipped: boolean;
  avatarSnapshot?: AvatarSnapshot;
  frameId?: string;
  equippedFrame?: string;
  currency?: { gold?: number; gems?: number; pinkCube?: number };
  fragments?: number;
  fragmentNextAt?: number;
  fragmentFaceTrialUntil?: number;
  settings?: Record<string, unknown>;
  islandId?: string;
  staff?: boolean;
  color?: string;
  badges?: string[];
  badgesList?: string[];
  gradientName?: string;
  nameGradient?: string;
  nameStyle?: "default" | "gradient";
  useGradientName?: boolean;
  isYouTuber?: boolean;
  admin?: boolean;
  dev?: boolean;
  gamesPlayed?: string[];
}

interface AuthCtx {
  firebaseUser: User | null;
  qbUser: QBUser | null;
  loading: boolean;
  sessionExpired: boolean;
  dismissSessionExpired: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>({
  firebaseUser: null,
  qbUser: null,
  loading: true,
  sessionExpired: false,
  dismissSessionExpired: () => {},
  signOut: async () => {},
});

const SESSION_KEY = "qb_session_id";

function generateStableCustomId(uid: string, email?: string | null): string {
  const isIra =
    email?.toLowerCase() === "mammaettahiri@gmail.com" ||
    email?.toLowerCase() === "dojamoocat42@gmail.com";
  if (isIra) return "QB-IRA";
  const cleanUid = uid.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return `QB-${(cleanUid.slice(0, 6) || "ADVENT").padEnd(6, "X")}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [qbUser, setQbUser] = useState<QBUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    // Never hydrate a profile from local storage. Firestore is the account
    // source of truth, so a failed auth read must not show another account.
    const bail = window.setTimeout(() => {
      console.error("[auth] auth state timed out");
      setFirebaseUser(null);
      setQbUser(null);
      setLoading(false);
    }, 10000);
    const unsub = onAuthStateChanged(
      auth,
      (user) => {
        window.clearTimeout(bail);
        setFirebaseUser(user);
        if (!user) {
          setQbUser(null);
          setFragmentUser(null);
          setLoading(false);
          return;
        }
        setFragmentUser(user.uid);
        setQbUser(null);
        setLoading(true);
      },
      (err) => {
        console.error("[auth] onAuthStateChanged error", err);
        setFirebaseUser(null);
        setQbUser(null);
        setFragmentUser(null);
        window.clearTimeout(bail);
        setLoading(false);
      },
    );
    return () => {
      window.clearTimeout(bail);
      unsub();
    };
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;
    const ref = doc(db, "users", firebaseUser.uid);
    const unsub = onSnapshot(
      ref,
      { includeMetadataChanges: true },
      (snap) => {
        if (!snap.exists()) {
          setQbUser(null);
          setLoading(false);
          return;
        }
        const data = snap.data() as DocumentData;
        const xpRaw = Number(data.xp ?? 0);
        const stableId =
          data.customId || generateStableCustomId(firebaseUser.uid, firebaseUser.email);
        const profile: QBUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          username:
            data.username ?? (firebaseUser.email?.toLowerCase().includes("ira") ? "ira" : "Player"),
          customId: stableId,
          displayName:
            data.displayName ??
            data.username ??
            (firebaseUser.email?.toLowerCase().includes("ira") ? "Ira" : "Player"),
          bio: data.bio ?? "",
          profilePhoto: data.profilePhoto ?? "",
          createdAt: data.createdAt ?? "",
          onboardingCompleted: data.onboardingCompleted ?? true,
          onboardingAnswers: data.onboardingAnswers ?? {},
          sessionId: data.sessionId,
          xp: xpRaw,
          level: Math.floor(xpRaw / 500) + 1,
          badgeEquipped: data.badgeEquipped ?? false,
          avatarSnapshot: normalizeAvatarSnapshot({
            avatarSnapshot: data.avatarSnapshot,
            frameId: data.frameId,
            equippedFrame: data.equippedFrame,
          }) as AvatarSnapshot | undefined,
          frameId: typeof data.frameId === "string" ? data.frameId : undefined,
          equippedFrame: typeof data.equippedFrame === "string" ? data.equippedFrame : undefined,
          currency: data.currency,
          fragments: typeof data.fragments === "number" ? data.fragments : undefined,
          fragmentNextAt: typeof data.fragmentNextAt === "number" ? data.fragmentNextAt : undefined,
          fragmentFaceTrialUntil:
            typeof data.fragmentFaceTrialUntil === "number"
              ? data.fragmentFaceTrialUntil
              : undefined,
          settings: data.settings,
          staff: data.staff ?? false,
          badges: data.badges ?? data.badgesList ?? data.ownedBadges ?? [],
          gradientName: data.gradientName ?? data.nameGradient ?? undefined,
          nameGradient: data.nameGradient ?? data.gradientName ?? undefined,
          nameStyle:
            data.nameStyle ??
            (data.useGradientName === false
              ? "default"
              : data.useGradientName === true
                ? "gradient"
                : undefined),
          useGradientName:
            data.useGradientName ??
            (data.nameStyle === "gradient"
              ? true
              : data.nameStyle === "default"
                ? false
                : undefined),
          isYouTuber: data.isYouTuber ?? data.youtuber ?? false,
          admin: data.admin ?? false,
          dev: data.dev ?? data.developer ?? false,
        };
        setQbUser(profile);
        setFragmentUser(firebaseUser.uid);
        hydrateFragments({
          fragments: profile.fragments,
          fragmentNextAt: profile.fragmentNextAt,
          fragmentFaceTrialUntil: profile.fragmentFaceTrialUntil,
        });
        setCurrencyUser(firebaseUser.uid);
        if (data.currency) hydrateCurrency(data.currency);
        setLoading(false);

        const localSid = localStorage.getItem(SESSION_KEY);
        if (data.sessionId && localSid && data.sessionId !== localSid) {
          setSessionExpired(true);
        }
      },
      (err) => {
        console.error("User snapshot unavailable:", err.code ?? "unknown");
        setQbUser(null);
        setLoading(false);
      },
    );
    return () => {
      unsub();
    };
  }, [firebaseUser]);

  // Mutations on profile screens should update the visible identity
  // immediately. Firestore normally echoes the write through onSnapshot, but
  // that echo can be delayed while offline or when IndexedDB is recovering.
  useEffect(() => {
    if (!firebaseUser || typeof window === "undefined") return;
    const handleProfileUpdated = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          uid?: string;
          patch?: Partial<QBUser>;
        }>
      ).detail;
      if (detail?.uid !== firebaseUser.uid || !detail.patch) return;
      setQbUser((current) => {
        if (!current) return current;
        const next = { ...current, ...detail.patch };
        return next;
      });
    };
    window.addEventListener("qb-profile-updated", handleProfileUpdated);
    return () => window.removeEventListener("qb-profile-updated", handleProfileUpdated);
  }, [firebaseUser]);

  useEffect(() => {
    if (!qbUser) return;
    const isOwner =
      qbUser.email === "mammaettahiri@gmail.com" ||
      qbUser.email === "dojamoocat42@gmail.com" ||
      qbUser.username === "ira";
    if (isOwner) {
      const KEY = "bm-owner-grant-v2";
      if (!localStorage.getItem(KEY)) {
        addCurrency("gems", 500);
        addCurrency("gold", 7777);
        localStorage.setItem(KEY, "1");
      }
    }
  }, [qbUser]);

  const dismissSessionExpired = useCallback(() => setSessionExpired(false), []);

  const signOut = useCallback(async () => {
    localStorage.removeItem(SESSION_KEY);
    await fbSignOut(auth);
    setQbUser(null);
    setSessionExpired(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{ firebaseUser, qbUser, loading, sessionExpired, dismissSessionExpired, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export { SESSION_KEY };
