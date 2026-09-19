import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Create account — QBlock" }] }),
  component: SignupRedirectPage,
});

function SignupRedirectPage() {
  const nav = useNavigate();
  useEffect(() => {
    nav({ to: "/login", search: { screen: "signup" } as never });
  }, [nav]);

  return (
    <div className="min-h-dvh flex items-center justify-center bg-[#f5f7fa] dark:bg-[#0a0b0e]">
      <div
        className="w-10 h-10 rounded-full border-[3px] animate-spin"
        style={{ borderColor: "rgba(250,70,22,0.15)", borderTopColor: "#fa4616" }}
      />
    </div>
  );
}
