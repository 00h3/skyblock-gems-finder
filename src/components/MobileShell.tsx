import { useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, type ReactNode, type UIEvent } from "react";
import { useNavHidden } from "@/lib/ui-bus";
import { LiquidBottomNav } from "@/components/LiquidBottomNav";

export function MobileShell({
  children,
  hideNav = false,
  scroll = true,
}: {
  children: ReactNode;
  hideNav?: boolean;
  scroll?: boolean;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navHiddenGlobal = useNavHidden();
  const hidden = hideNav || navHiddenGlobal;
  const lastScrollTop = useRef(0);

  const handleScroll = (event: UIEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    const top = Math.max(0, target.scrollTop);
    const previous = lastScrollTop.current;

    if (top <= 18 || top > previous + 4 || top < previous - 4) {
      // Keep the bottom navigation stable; the app uses it as a persistent
      // iOS-like tab bar rather than hiding it while scrolling.
    }
    lastScrollTop.current = top;
  };

  useEffect(() => {
    lastScrollTop.current = 0;
  }, [pathname]);

  return (
    <div className="h-[100dvh] w-full bg-[#f4f5f7] dark:bg-[#0c0d0f] flex justify-center overflow-hidden transition-colors duration-200">
      <div className="mobile-shell relative w-full max-w-[440px] bg-background text-foreground h-[100dvh] min-h-0 flex flex-col shadow-[0_0_60px_rgb(0_0_0_/_0.04)] dark:shadow-none overflow-hidden transition-colors duration-200">
        <main
          className={`min-h-0 h-0 flex-1 ${scroll ? "overflow-y-auto ios-scroll" : "overflow-hidden"} ${
            hidden ? "pb-2" : "pb-[calc(78px+env(safe-area-inset-bottom))]"
          } hide-scrollbar relative z-[6]`}
          onScrollCapture={handleScroll}
        >
          <div
            key={pathname}
            className={`min-h-full ${pathname === "/events" ? "page-enter-static" : "page-enter"}`}
          >
            {children}
          </div>
        </main>
        {!hidden && <LiquidBottomNav pathname={pathname} />}
      </div>
    </div>
  );
}

export { LiquidBottomNav as BottomNav };
