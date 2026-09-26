import { createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/$")({
  component: SplatRedirector,
});

function SplatRedirector() {
  const routerState = useRouterState();
  const navigate = useNavigate();

  useEffect(() => {
    const pathname = routerState.location.pathname.replace(/\/+$/, "").toLowerCase() || "/";
    const search = routerState.location.searchStr;

    // Route alias dictionary
    if (pathname === "" || pathname === "/") {
      navigate({ to: "/" as never, replace: true });
      return;
    }

    if (
      pathname === "/events" ||
      pathname.startsWith("/event") ||
      pathname === "/daily" ||
      pathname === "/dailydays"
    ) {
      navigate({ to: "/events" as never, replace: true });
      return;
    }

    if (
      pathname === "/rewards" ||
      pathname === "/redeem" ||
      pathname === "/codes" ||
      pathname === "/code" ||
      pathname === "/gift"
    ) {
      navigate({ to: "/rewards" as never, replace: true });
      return;
    }

    if (
      pathname === "/discover" ||
      pathname === "/games" ||
      pathname === "/play" ||
      pathname === "/explore" ||
      pathname === "/game"
    ) {
      navigate({ to: "/discover" as never, replace: true });
      return;
    }

    if (
      pathname === "/wearables" ||
      pathname === "/avatar" ||
      pathname === "/wardrobe" ||
      pathname === "/skin" ||
      pathname === "/skins" ||
      pathname === "/costumes"
    ) {
      navigate({ to: "/wearables" as never, replace: true });
      return;
    }

    if (
      pathname === "/inventory" ||
      pathname === "/shop" ||
      pathname === "/store" ||
      pathname === "/market" ||
      pathname === "/items" ||
      pathname === "/backpack"
    ) {
      navigate({ to: "/inventory" as never, replace: true });
      return;
    }

    if (pathname === "/profile" || pathname === "/me" || pathname === "/account") {
      navigate({ to: "/profile" as never, replace: true });
      return;
    }

    if (pathname === "/friends" || pathname === "/social" || pathname === "/players") {
      navigate({ to: "/friends" as never, replace: true });
      return;
    }

    if (pathname === "/chat" || pathname === "/messages" || pathname === "/dm") {
      navigate({ to: "/chat" as never, replace: true });
      return;
    }

    if (pathname === "/mail" || pathname === "/inbox") {
      navigate({ to: "/mail" as never, replace: true });
      return;
    }

    if (pathname === "/notifications" || pathname === "/activity") {
      navigate({ to: "/notifications" as never, replace: true });
      return;
    }

    if (pathname === "/build" || pathname === "/studio" || pathname === "/create") {
      navigate({ to: "/build" as never, replace: true });
      return;
    }

    if (pathname === "/settings" || pathname === "/config") {
      navigate({ to: "/settings" as never, replace: true });
      return;
    }

    if (
      pathname === "/accounts" ||
      pathname === "/switch-account" ||
      pathname === "/sign-out" ||
      pathname === "/switch"
    ) {
      navigate({ to: "/accounts" as never, replace: true });
      return;
    }

    if (
      pathname.startsWith("/user/") ||
      pathname.startsWith("/u/") ||
      pathname.startsWith("/people/")
    ) {
      const username = pathname.split("/").filter(Boolean)[1];
      if (username) {
        navigate({
          to: "/people/$username" as never,
          params: { username } as never,
          replace: true,
        });
        return;
      }
    }

    if (pathname.startsWith("/game/")) {
      const gameId = pathname.replace("/game/", "").split("/")[0];
      if (gameId === "sandbox") {
        navigate({ to: "/game/sandbox" as never, replace: true });
        return;
      }
      if (gameId) {
        navigate({ to: "/game/$id" as never, params: { id: gameId } as never, replace: true });
        return;
      }
    }

    // Default fallback to home
    navigate({ to: "/" as never, replace: true });
  }, [routerState.location.pathname, routerState.location.searchStr, navigate]);

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
      <div className="text-[13px] font-semibold mt-1 text-[#8b929d]">Loading world…</div>
    </div>
  );
}
