import { useNavigate } from "@tanstack/react-router";
import { MessageCircle, UsersRound, X } from "lucide-react";
import { CurrencyPills } from "@/components/CurrencyPills";

export function GameUiChrome({ title }: { title: string }) {
  const navigate = useNavigate();

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[100000] flex justify-center px-3 pt-[max(10px,env(safe-area-inset-top))]">
      <div className="pointer-events-auto flex w-full max-w-[760px] items-center gap-2 rounded-[18px] border border-white/15 bg-[#11151c]/75 px-2.5 py-2 text-white shadow-[0_12px_35px_rgb(0_0_0_/_0.22)] backdrop-blur-xl">
        <button
          type="button"
          onClick={() => navigate({ to: "/" as never })}
          className="press grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10"
          aria-label="Exit game"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-extrabold tracking-tight">{title}</p>
          <p className="text-[9px] uppercase tracking-[0.14em] text-white/45">QBlock world</p>
        </div>
        <div className="hidden min-[520px]:block">
          <CurrencyPills compact />
        </div>
        <button
          type="button"
          onClick={() => navigate({ to: "/friends" as never })}
          className="press grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10"
          aria-label="Find friends"
        >
          <UsersRound className="h-4 w-4" />
        </button>
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => {
            window.location.assign("/chat");
          }}
          className="press grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#f4c430] text-[#17181b]"
          aria-label="Open chat"
        >
          <MessageCircle className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
