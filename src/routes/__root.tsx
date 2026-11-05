import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useNavigate,
  useRouterState,
  useLocation,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AuthProvider, useAuth } from "../lib/auth-context";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { initTheme } from "../lib/ui-bus";
import { initButtonSoundListener } from "../lib/button-audio";
import {
  initAvatarColor,
  initHairColor,
  initEquippedFrame,
  initEquippedSkin,
  initFace,
  initPants,
  initEquippedItems,
  initHairStyle,
  initBackpack,
  initGender,
  initBandana,
  applyAvatarSnapshot,
} from "../lib/avatar";
import { initCurrency } from "../lib/currency";
import {
  applyOwnedShopSnapshot,
  applyShopSnapshot,
  getEquippedShop,
  getOwnedShopItemIds,
  initShop,
  setShopUser,
  useEquippedShop,
  useOwnedShopItems,
} from "../lib/shop";
import { db } from "../lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { Toaster } from "sonner";
import { incrementOnlineTime } from "../lib/daily-events";
import { GlobalFragmentsPopup } from "@/components/GlobalFragmentsPopup";
import { GlobalEventsPopup } from "@/components/GlobalEventsPopup";
import { GlobalSettingsPopup } from "@/components/GlobalSettingsPopup";
import { GlobalShopPopup } from "@/components/GlobalShopPopup";
import { TouchFeedbackRipples } from "@/components/TouchFeedbackRipples";
import { GlobalLoader } from "@/components/GlobalLoader";
import { QBlockLoadingMenu } from "@/components/QBlockLoadingMenu";
import { ShinyButton } from "@/components/ui/shiny-button";
import { PlayersIcon } from "@/components/icons/PlayersIcon";
import { GhostSmileIcon } from "@/components/icons/GhostSmileIcon";
import { WifiOff, RotateCcw, LogIn } from "lucide-react";
import { useNoImageModal, hideNoImageModal } from "../lib/ui-bus";

function NotFoundComponent() {
  const nav = useNavigate();
  useEffect(() => {
    if (typeof window === "undefined") return;
    const path = window.location.pathname.replace(/\/+$/, "").toLowerCase() || "/";

    if (path.startsWith("/game/")) {
      const gid = path.replace("/game/", "").split("/")[0];
      if (gid === "sandbox") {
        nav({ to: "/game/sandbox" as never, replace: true });
        return;
      }
      if (gid) {
        nav({ to: "/game/$id" as never, params: { id: gid } as never, replace: true });
        return;
      }
    }
    if (path === "/events" || path.startsWith("/event") || path === "/daily") {
      nav({ to: "/events" as never, replace: true });
      return;
    }
    if (path === "/rewards" || path === "/redeem" || path === "/codes" || path === "/code") {
      nav({ to: "/rewards" as never, replace: true });
      return;
    }
    if (path === "/discover" || path === "/games" || path === "/play") {
      nav({ to: "/discover" as never, replace: true });
      return;
    }
    if (path === "/wearables" || path === "/avatar" || path === "/wardrobe") {
      nav({ to: "/wearables" as never, replace: true });
      return;
    }
    if (path === "/inventory" || path === "/store") {
      nav({ to: "/inventory" as never, replace: true });
      return;
    }
    if (path === "/shop") {
      nav({ to: "/shop" as never, replace: true });
      return;
    }
    if (path === "/profile" || path === "/me") {
      nav({ to: "/profile" as never, replace: true });
      return;
    }
    if (path === "/friends") {
      nav({ to: "/friends" as never, replace: true });
      return;
    }
    if (path === "/chat") {
      nav({ to: "/chat" as never, replace: true });
      return;
    }
    if (path === "/mail") {
      nav({ to: "/mail" as never, replace: true });
      return;
    }
    if (path === "/notifications") {
      nav({ to: "/notifications" as never, replace: true });
      return;
    }
    if (path === "/activity" || path === "/activity-log") {
      nav({ to: "/activity" as never, replace: true });
      return;
    }
    if (path === "/build") {
      nav({ to: "/build" as never, replace: true });
      return;
    }
    if (path === "/settings") {
      nav({ to: "/settings" as never, replace: true });
      return;
    }

    const timer = setTimeout(() => {
      nav({ to: "/" as never, replace: true });
    }, 100);
    return () => clearTimeout(timer);
  }, [nav]);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white select-none">
      <div className="star-loader" aria-hidden="true">
        {Array.from({ length: 8 }, (_, i) => (
          <span key={i} />
        ))}
      </div>
      <div
        className="font-extrabold tracking-tight mt-4 text-[24px] text-[#141414]"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        QBlock
      </div>
      <div className="text-[13px] font-semibold mt-1 text-[#8b929d]">Connecting to world…</div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const [showOptions, setShowOptions] = useState(false);

  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
    const timer = setTimeout(() => {
      setShowOptions(true);
    }, 2200);
    return () => clearTimeout(timer);
  }, [error]);

  const handleRetry = () => {
    router.invalidate();
    reset();
  };

  const handleClearAndReset = () => {
    if (typeof window !== "undefined") {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {}
      window.location.href = "/";
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden select-none p-6"
      style={{ background: "#ffffff" }}
    >
      <div className="relative z-10 flex flex-col items-center gap-4 text-center max-w-[340px] w-full">
        <div className="star-loader" aria-hidden="true">
          {Array.from({ length: 8 }, (_, i) => (
            <span key={i} />
          ))}
        </div>
        <div>
          <div
            className="font-extrabold tracking-tight"
            style={{
              fontSize: 26,
              color: "#141414",
              letterSpacing: "-0.8px",
              fontFamily: "var(--font-heading)",
              lineHeight: 1.1,
            }}
          >
            QBlock
          </div>
          <div className="text-[13px] font-semibold mt-1.5" style={{ color: "#8b929d" }}>
            {showOptions ? "Connection was interrupted" : "Connecting to world…"}
          </div>
        </div>

        {!showOptions ? (
          <div style={{ width: 180, marginTop: 2 }}>
            <div
              style={{
                height: 6,
                background: "#edf0f2",
                borderRadius: 99,
                overflow: "hidden",
                border: "1px solid rgba(20,28,38,0.08)",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "#c8cdd2",
                  borderRadius: 99,
                  animation: "errLoad 2.2s ease-in-out forwards",
                }}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 w-full mt-2 animate-fade-in">
            <button
              onClick={handleRetry}
              className="press w-full h-11 rounded-[12px] bg-[#fa4616] text-white font-bold text-[14px] shadow-sm flex items-center justify-center transition hover:brightness-105"
            >
              Try Again
            </button>
            <button
              onClick={() => {
                if (typeof window !== "undefined") window.location.href = "/";
              }}
              className="press w-full h-10 rounded-[12px] bg-slate-100 text-slate-700 font-bold text-[13px] hover:bg-slate-200 transition"
            >
              Go Home
            </button>
            <button
              onClick={handleClearAndReset}
              className="w-full h-8 text-[11.5px] font-semibold text-slate-400 hover:text-slate-600 transition mt-1"
            >
              Clear Local Cache & Restart
            </button>
          </div>
        )}
      </div>
      <style>{`
        @keyframes errLoad { 0%{right:100%} 100%{right:0%} }
      `}</style>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content:
          "width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content",
      },
      { name: "theme-color", content: "#ffffff" },
      { title: "QBLOCK V2" },
      {
        name: "description",
        content: "QBLOCK V2 — modern 3D avatar customization and sandbox game platform.",
      },
      { property: "og:title", content: "QBLOCK V2" },
      {
        property: "og:description",
        content: "QBLOCK V2 — modern 3D avatar customization and sandbox game platform.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "preload",
        href: "/fonts/InterDisplay-SemiBold.otf",
        as: "font",
        type: "font/otf",
        crossOrigin: "anonymous",
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script
          type="module"
          src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js"
        />
      </head>
      <body suppressHydrationWarning>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

// ── Splash Screen ─────────────────────────────────────────────────────────────
function SplashScreen({ onDone }: { onDone: () => void }) {
  return <QBlockLoadingMenu onDone={onDone} speedMs={25} fadeOutOnDone={true} />;
}

function NoInternetFallbackModal({
  onRetry,
  onDismiss,
}: {
  onRetry: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/65 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-[380px] rounded-[24px] bg-white dark:bg-[#15171c] border border-black/[0.08] dark:border-white/10 p-6 text-center shadow-2xl animate-scale-in">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[20px] bg-red-500/10 border border-red-500/25 text-red-500 shadow-sm">
          <WifiOff className="h-8 w-8" />
        </div>
        <h2 className="text-[20px] font-black text-[#17191d] dark:text-white tracking-tight">
          No Connection
        </h2>
        <p className="mt-2 text-[13.5px] leading-relaxed text-[#697383] dark:text-[#9ea7b3]">
          Unable to connect to QBLOCK servers. Please check your Wi-Fi or mobile network and try
          reconnecting.
        </p>
        <div className="mt-6 flex flex-col gap-2.5">
          <ShinyButton
            type="button"
            variant="orange"
            onClick={onRetry}
            className="w-full h-12 text-[14px]"
          >
            <RotateCcw className="h-4 w-4 text-white" />
            <span>Reconnect</span>
          </ShinyButton>
          <ShinyButton
            type="button"
            variant="white"
            onClick={onDismiss}
            className="w-full h-11 text-[13.5px]"
          >
            <span>Dismiss</span>
          </ShinyButton>
        </div>
      </div>
    </div>
  );
}

function SessionExpiredModal({
  onDismiss,
  onRelogin,
}: {
  onDismiss: () => void;
  onRelogin: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/65 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-[390px] rounded-[24px] bg-white dark:bg-[#15171c] border border-black/[0.08] dark:border-white/10 p-6 text-center shadow-2xl animate-scale-in">
        <span className="inline-block px-2.5 py-0.5 mb-2 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-orange-500/10 text-[#fa4616] border border-orange-500/20">
          Multiple Devices Detected
        </span>
        <h2 className="text-[20px] font-black text-[#17191d] dark:text-white tracking-tight">
          Connection Found
        </h2>
        <p className="mt-2 text-[13.5px] leading-relaxed text-[#697383] dark:text-[#9ea7b3]">
          Your account was signed in on another device. Only one active player connection is
          permitted at a time. Sign in again to continue playing.
        </p>
        <div className="mt-6 flex flex-col gap-2.5">
          <ShinyButton
            type="button"
            variant="orange"
            onClick={onRelogin}
            className="w-full h-12 text-[14px]"
          >
            <span>Sign In Again</span>
          </ShinyButton>
          <ShinyButton
            type="button"
            variant="white"
            onClick={onDismiss}
            className="w-full h-11 text-[13.5px]"
          >
            <span>Dismiss</span>
          </ShinyButton>
        </div>
      </div>
    </div>
  );
}

function NoImageModal() {
  const modal = useNoImageModal();
  if (!modal.open) return null;

  return (
    <div className="fixed inset-0 z-[9997] flex items-center justify-center p-4 bg-black/65 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-[380px] rounded-[24px] bg-white dark:bg-[#15171c] border border-black/[0.08] dark:border-white/10 p-6 text-center shadow-2xl animate-scale-in">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[20px] bg-orange-500/10 border border-[#fa4616]/30 text-[#fa4616] shadow-sm">
          <GhostSmileIcon className="h-8 w-8 text-[#fa4616]" />
        </div>
        <h2 className="text-[20px] font-black text-[#17191d] dark:text-white tracking-tight">
          {modal.title || "No Image Available"}
        </h2>
        <p className="mt-2 text-[13.5px] leading-relaxed text-[#697383] dark:text-[#9ea7b3]">
          {modal.message ||
            "The requested photo or graphic preview could not be loaded or is missing."}
        </p>
        <div className="mt-6">
          <ShinyButton
            type="button"
            variant="orange"
            onClick={hideNoImageModal}
            className="w-full h-12 text-[14px]"
          >
            <span>Understood</span>
          </ShinyButton>
        </div>
      </div>
    </div>
  );
}

// ── Auth guard — forces /login for unauthenticated users ─────────────────────
const PUBLIC_PATHS = ["/login", "/onboarding", "/game", "/preview-settings"];

function AuthGuard({ children }: { children: ReactNode }) {
  const { qbUser, firebaseUser, loading, sessionExpired, dismissSessionExpired, signOut } =
    useAuth();
  const nav = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [isOffline, setIsOffline] = useState(false);
  const [offlineDismissed, setOfflineDismissed] = useState(false);

  useEffect(() => {
    // Only flag offline if the browser explicitly reports offline
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsOffline(true);
    }
    const onOnline = () => {
      setIsOffline(false);
      setOfflineDismissed(false);
    };
    const onOffline = () => {
      setIsOffline(true);
      setOfflineDismissed(false);
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const handleRetry = () => {
    if (typeof navigator !== "undefined" && navigator.onLine) {
      setIsOffline(false);
      setOfflineDismissed(false);
    } else {
      fetch("/favicon.ico", { method: "HEAD", cache: "no-store" })
        .then(() => {
          setIsOffline(false);
          setOfflineDismissed(false);
        })
        .catch(() => {});
    }
  };

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (loading) return;
    // firebaseUser set but qbUser not yet = Firestore doc still loading (new signup race).
    // Don't redirect — the snapshot will fire again once the doc is written.
    if (firebaseUser && !qbUser) return;
    if (!qbUser && !isPublic) {
      nav({ to: "/login" as never, replace: true });
      return;
    }
    // If authenticated user hasn't completed onboarding yet, enforce /onboarding unless on a public/auth route
    if (
      qbUser &&
      qbUser.onboardingCompleted === false &&
      pathname !== "/onboarding" &&
      !pathname.startsWith("/preview-settings")
    ) {
      nav({ to: "/onboarding" as never, replace: true });
    }
  }, [loading, qbUser, firebaseUser, pathname, nav, isPublic]);

  // If offline, prioritize the no internet popup. If online and duplicate session, show session expired popup.
  const showOffline = isOffline && !offlineDismissed;
  const showSessionExpired = !showOffline && sessionExpired;

  if (loading && !isPublic) {
    return <GlobalLoader />;
  }

  if (!qbUser && !firebaseUser && !isPublic) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white select-none">
        <div className="star-loader" aria-hidden="true">
          {Array.from({ length: 8 }, (_, i) => (
            <span key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      {children}
      {showOffline && (
        <NoInternetFallbackModal
          onRetry={handleRetry}
          onDismiss={() => setOfflineDismissed(true)}
        />
      )}
      {showSessionExpired && (
        <SessionExpiredModal
          onDismiss={dismissSessionExpired}
          onRelogin={async () => {
            await signOut();
            nav({ to: "/login" } as never);
          }}
        />
      )}
      <NoImageModal />
    </>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const { pathname } = useLocation();
  const { qbUser } = useAuth();
  const equippedShop = useEquippedShop();
  const ownedShopItems = useOwnedShopItems();
  const hydratedShopUid = useRef<string | null>(null);
  const [splashDone, setSplashDone] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const handleSplashDone = useCallback(() => setSplashDone(true), []);

  useEffect(() => {
    initTheme();
    initAvatarColor();
    initHairColor();
    initEquippedSkin();
    initFace();
    initPants();
    initEquippedItems();
    initHairStyle();
    initBackpack();
    initGender();
    initBandana();
    initCurrency();
    initShop();
    initButtonSoundListener();

    // Daily Days active time tracker
    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        incrementOnlineTime(1);
      }
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  // Frames are account data, never global browser data. Reset the in-memory
  // selection when the signed-in account changes so one account cannot bleed
  // into another while the profile is loading.
  useEffect(() => {
    initEquippedFrame(qbUser?.uid);
  }, [qbUser?.uid]);

  useEffect(() => {
    setShopUser(qbUser?.uid ?? null);
  }, [qbUser?.uid]);

  // The inventory is the source of truth for the avatar shown to other
  // players. Hydrate it from the profile after auth so a new device matches
  // the saved look before opening Friends or a game.
  useEffect(() => {
    applyAvatarSnapshot(qbUser?.avatarSnapshot);
  }, [qbUser?.avatarSnapshot]);

  // Keep purchased wardrobe choices in the same profile snapshot as the
  // avatar colors/face/frame. This makes the outfit survive a reload and
  // lets other users see the same clothing when their profile is opened.
  useEffect(() => {
    if (!qbUser) {
      hydratedShopUid.current = null;
      return;
    }
    if (hydratedShopUid.current !== qbUser.uid) {
      hydratedShopUid.current = qbUser.uid;
      if (qbUser.avatarSnapshot?.shopEquipped) {
        applyShopSnapshot(qbUser.avatarSnapshot.shopEquipped);
      }
      if (qbUser.avatarSnapshot?.shopOwned) {
        applyOwnedShopSnapshot(qbUser.avatarSnapshot.shopOwned);
      }
      return;
    }

    const shopEquipped = getEquippedShop();
    const shopOwned = getOwnedShopItemIds();
    void updateDoc(doc(db, "users", qbUser.uid), {
      "avatarSnapshot.shopEquipped": shopEquipped,
      "avatarSnapshot.shopOwned": shopOwned,
    }).catch(() => {});
  }, [qbUser, qbUser?.uid, equippedShop, ownedShopItems]);

  // App-wide: no copying text/images, no pinch or double-tap zoom. The
  // viewport meta tag + CSS `user-select: none` already cover most of this;
  // these are the remaining browser gestures/events that ignore both.
  useEffect(() => {
    const preventCopy = (e: ClipboardEvent) => e.preventDefault();
    const preventContextMenu = (e: MouseEvent) => e.preventDefault();
    const preventGesture = (e: Event) => e.preventDefault();
    let lastTouchEnd = 0;
    const preventDoubleTapZoom = (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouchEnd < 350) e.preventDefault();
      lastTouchEnd = now;
    };
    const preventPinchZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };

    document.addEventListener("copy", preventCopy);
    document.addEventListener("cut", preventCopy);
    document.addEventListener("contextmenu", preventContextMenu);
    document.addEventListener("gesturestart", preventGesture);
    document.addEventListener("touchend", preventDoubleTapZoom, { passive: false });
    document.addEventListener("touchmove", preventPinchZoom, { passive: false });

    return () => {
      document.removeEventListener("copy", preventCopy);
      document.removeEventListener("cut", preventCopy);
      document.removeEventListener("contextmenu", preventContextMenu);
      document.removeEventListener("gesturestart", preventGesture);
      document.removeEventListener("touchend", preventDoubleTapZoom);
      document.removeEventListener("touchmove", preventPinchZoom);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {mounted && !splashDone && <SplashScreen onDone={handleSplashDone} />}
        <AuthGuard>
          {/* Mount the route immediately. The splash is a visual handoff
              overlay, not a dependency for auth or route initialization. */}
          <div key={pathname} className="animate-fade-in flex-1 flex flex-col min-h-full">
            <Outlet />
          </div>
        </AuthGuard>
        <GlobalFragmentsPopup />
        <GlobalEventsPopup />
        <GlobalSettingsPopup />
        <GlobalShopPopup />
        <TouchFeedbackRipples />
        <Toaster position="top-center" richColors />
      </AuthProvider>
    </QueryClientProvider>
  );
}
