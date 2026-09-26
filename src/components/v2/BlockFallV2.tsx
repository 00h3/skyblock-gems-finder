import { cn } from "@/lib/utils";
import type { MatchController } from "@/engine/v2/match";
import { useStore } from "@/engine/v2/store";
import { V2Button, formatClock, useNow } from "./primitives";

const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};

export function BlockFallStatus({ match }: { match: MatchController }) {
  const s = useStore(match.store);
  const now = useNow(250);
  const remaining = s.phase === "playing" ? s.phaseEndsAt - now : 0;

  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5 sm:justify-end" aria-live="off">
      <span className="v2-pill">
        Round {s.round}/{s.totalRounds}
      </span>
      {s.phase === "playing" && (
        <span className={cn("v2-pill tabular-nums", remaining < 10_000 && "text-v2-coral")}>
          {formatClock(remaining)}
        </span>
      )}
      <span className="v2-pill">
        Alive {s.phase === "playing" ? s.playersAlive : s.playersTotal}
      </span>
      <span className="v2-pill">Floor {s.floor}/5</span>
      <span className="v2-pill bg-v2-sun/90 text-v2-ink">Score {s.totalScore}</span>
    </div>
  );
}

/**
 * Lobby card, synchronized 3-2-1-GO, round-end banner and results screen.
 * All timing is read from the match controller's deadlines, so the numbers
 * shown always match what the game loop is enforcing.
 */
export function BlockFallOverlays({ match, onLeave }: { match: MatchController; onLeave: () => void }) {
  const s = useStore(match.store);
  const now = useNow(s.phase === "countdown" || s.phase === "playing" ? 33 : 200);

  if (s.phase === "lobby") {
    const secs = Math.max(0, Math.ceil((s.phaseEndsAt - now) / 1000));
    return (
      <div className="pointer-events-none fixed inset-x-0 top-[30%] z-[110] flex justify-center px-4">
        <div className="v2-paper v2-anim-pop px-8 py-4 text-center">
          <p className="text-[12px] uppercase tracking-[0.22em] text-v2-plum">Round {s.round} lobby</p>
          <p className="text-[26px] leading-tight sm:text-[32px]">Get ready</p>
          <p className="mt-1 font-sans text-[13px] font-semibold text-v2-ink/60">
            {s.playersTotal} {s.playersTotal === 1 ? "player" : "players"} - countdown in {secs}s
          </p>
        </div>
      </div>
    );
  }

  if (s.phase === "countdown") {
    const left = s.phaseEndsAt - now;
    const n = Math.min(3, Math.max(1, Math.ceil(left / 1000)));
    return (
      <div className="pointer-events-none fixed inset-0 z-[110] grid place-items-center" aria-live="assertive">
        <span className="sr-only">{n}</span>
        <span
          key={n}
          aria-hidden="true"
          className="v2-anim-count v2-text-stroke text-[clamp(96px,26vmin,200px)] leading-none text-white"
          style={{ WebkitTextStroke: "6px #2b2657", paintOrder: "stroke fill" }}
        >
          {n}
        </span>
      </div>
    );
  }

  if (s.phase === "playing" && now - s.roundStartedAt < 900) {
    return (
      <div className="pointer-events-none fixed inset-0 z-[110] grid place-items-center" aria-live="assertive">
        <span
          className="v2-anim-go text-[clamp(96px,26vmin,200px)] leading-none text-v2-sun"
          style={{ WebkitTextStroke: "6px #2b2657", paintOrder: "stroke fill" }}
        >
          GO
        </span>
      </div>
    );
  }

  if (s.phase === "roundEnd" && s.lastRound) {
    const won = s.lastRound.survived;
    return (
      <div className="pointer-events-none fixed inset-0 z-[110] grid place-items-center bg-v2-ink/30">
        <div className="text-center">
          <p
            className={cn(
              "v2-anim-banner text-[clamp(44px,12vmin,96px)] leading-none",
              won ? "text-v2-sun" : "text-v2-coral",
            )}
            style={{ WebkitTextStroke: "5px #2b2657", paintOrder: "stroke fill" }}
          >
            {won ? "Survived" : "Eliminated"}
          </p>
          <p className="v2-text-stroke v2-anim-pop mt-3 text-[22px] text-white [animation-delay:300ms]">
            {ordinal(s.lastRound.placement)} place
          </p>
        </div>
      </div>
    );
  }

  if (s.phase === "results" && s.lastRound) {
    const over = s.round >= s.totalRounds;
    return (
      <div className="pointer-events-auto fixed inset-0 z-[130] grid place-items-center bg-v2-ink/55 p-4 backdrop-blur-[2px]">
        <div role="dialog" aria-modal="true" aria-label="Round results" className="v2-panel v2-anim-pop w-full max-w-[420px] p-5 sm:p-6">
          <p className="text-center text-[12px] uppercase tracking-[0.22em] text-white/70">
            {over ? "Match complete" : `Round ${s.round} of ${s.totalRounds}`}
          </p>
          <p className="v2-text-stroke text-center text-[30px] leading-tight">
            {over ? "Final results" : "Round results"}
          </p>

          <ol className="mt-4 flex flex-col gap-2">
            {s.history.map((r) => (
              <li
                key={r.round}
                className={cn(
                  "flex items-center justify-between rounded-[14px] border-2 border-v2-plum-deep bg-v2-ink/35 px-4 py-2.5",
                  r.round === s.lastRound?.round && "border-v2-sun/70",
                )}
              >
                <span className="text-[15px]">Round {r.round}</span>
                <span className="font-sans text-[13px] font-semibold text-white/75">
                  {ordinal(r.placement)} - {formatClock(r.survivedMs)} - Floor {r.deepestFloor}
                </span>
                <span className="text-[16px] text-v2-sun">+{r.score}</span>
              </li>
            ))}
          </ol>

          <div className="mt-4 flex items-center justify-between rounded-[14px] bg-white px-4 py-3 text-v2-ink">
            <span className="text-[15px]">Total score</span>
            <span className="text-[24px]">{s.totalScore}</span>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <V2Button variant="ghost" className="h-12 text-[15px]" onClick={onLeave}>
              Leave
            </V2Button>
            <V2Button variant="sun" className="h-12 text-[16px]" onClick={() => match.advance()} autoFocus>
              {over ? "Play again" : "Next round"}
            </V2Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
