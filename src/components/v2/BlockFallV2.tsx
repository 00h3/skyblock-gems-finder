import { cn } from "@/lib/utils";
import WetPaintButton from "@/components/ui/wet-paint-button";
import type { MatchController } from "@/engine-sandbox/blockfall/match";
import { useStore } from "@/engine-sandbox/shared/store";
import { V2Button, formatClock, useNow } from "./primitives";

const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};

const BIG_NUMBER_STYLE = { textShadow: "0 6px 30px rgba(0,0,0,.35)" };

export function BlockFallStatus({ match }: { match: MatchController }) {
  const s = useStore(match.store);
  const now = useNow(250);
  const remaining = s.phase === "playing" ? s.phaseEndsAt - now : 0;

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end" aria-live="off">
      <span className="v2-pill">
        <span className="text-white/50">Round</span>
        <span className="tabular-nums">
          {s.round}/{s.totalRounds}
        </span>
      </span>
      {s.phase === "playing" && (
        <span className={cn("v2-pill tabular-nums", remaining < 10_000 && "text-v2-coral")}>
          {formatClock(remaining)}
        </span>
      )}
      <span className="v2-pill">
        <span className="text-white/50">Alive</span>
        <span className="tabular-nums">{s.phase === "playing" ? s.playersAlive : s.playersTotal}</span>
      </span>
      <span className="v2-pill">
        <span className="text-white/50">Floor</span>
        <span className="tabular-nums">{s.floor}/5</span>
      </span>
      <span className="v2-pill border-white bg-white text-v2-ink">
        <span className="text-v2-ink/50">Score</span>
        <span className="tabular-nums">{s.totalScore}</span>
      </span>
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
      <div className="v2-ui pointer-events-none fixed inset-x-0 top-[28%] z-[110] flex justify-center px-4">
        <div className="v2-paper v2-anim-pop px-8 py-4 text-center">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-v2-plum">Round {s.round} lobby</p>
          <p className="text-[24px] font-bold leading-tight tracking-tight sm:text-[28px]">Get ready</p>
          <p className="mt-1 text-[13px] font-medium text-v2-ink/55">
            {s.playersTotal} {s.playersTotal === 1 ? "player" : "players"} · starting in{" "}
            <span className="tabular-nums">{secs}s</span>
          </p>
        </div>
      </div>
    );
  }

  if (s.phase === "countdown") {
    const left = s.phaseEndsAt - now;
    const n = Math.min(3, Math.max(1, Math.ceil(left / 1000)));
    return (
      <div className="v2-ui pointer-events-none fixed inset-0 z-[110] grid place-items-center" aria-live="assertive">
        <span className="sr-only">{n}</span>
        <span
          key={n}
          aria-hidden="true"
          className="v2-anim-count text-[clamp(96px,24vmin,180px)] font-extrabold leading-none tracking-tighter text-white tabular-nums"
          style={BIG_NUMBER_STYLE}
        >
          {n}
        </span>
      </div>
    );
  }

  if (s.phase === "playing" && now - s.roundStartedAt < 900) {
    return (
      <div className="v2-ui pointer-events-none fixed inset-0 z-[110] grid place-items-center" aria-live="assertive">
        <span
          className="v2-anim-go text-[clamp(96px,24vmin,180px)] font-extrabold leading-none tracking-tighter text-v2-sun"
          style={BIG_NUMBER_STYLE}
        >
          GO
        </span>
      </div>
    );
  }

  if (s.phase === "roundEnd" && s.lastRound) {
    const won = s.lastRound.survived;
    return (
      <div className="v2-ui pointer-events-none fixed inset-0 z-[110] grid place-items-center bg-[#0b0b12]/35">
        <div className="text-center">
          <p className="v2-eyebrow">Round {s.lastRound.round}</p>
          <p
            className={cn(
              "v2-anim-banner mt-1 text-[clamp(44px,11vmin,88px)] font-extrabold leading-none tracking-tighter",
              won ? "text-white" : "text-v2-coral",
            )}
            style={BIG_NUMBER_STYLE}
          >
            {won ? "Survived" : "Eliminated"}
          </p>
          <p className="v2-anim-pop mt-3 text-[18px] text-white/80 [animation-delay:300ms]">
            {ordinal(s.lastRound.placement)} place
          </p>
        </div>
      </div>
    );
  }

  if (s.phase === "results" && s.lastRound) {
    const over = s.round >= s.totalRounds;
    return (
      <div className="v2-ui pointer-events-auto fixed inset-0 z-[130] grid place-items-center bg-[#0b0b12]/55 p-4 backdrop-blur-[3px]">
        <div role="dialog" aria-modal="true" aria-label="Round results" className="v2-panel v2-anim-pop w-full max-w-[420px] p-5 sm:p-6">
          <p className="v2-eyebrow text-center">{over ? "Match complete" : `Round ${s.round} of ${s.totalRounds}`}</p>
          <p className="mt-1 text-center text-[26px] font-bold leading-tight tracking-tight">
            {over ? "Final results" : "Round results"}
          </p>

          <ol className="mt-5 flex flex-col gap-1.5">
            {s.history.map((r) => (
              <li
                key={r.round}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-[12px] border border-white/10 bg-white/[0.04] px-4 py-2.5",
                  r.round === s.lastRound?.round && "border-v2-plum/60 bg-v2-plum/10",
                )}
              >
                <span className="text-[13px]">Round {r.round}</span>
                <span className="text-[12px] font-medium tabular-nums text-white/55">
                  {ordinal(r.placement)} · {formatClock(r.survivedMs)} · F{r.deepestFloor}
                </span>
                <span className="text-[14px] tabular-nums text-v2-sun">+{r.score}</span>
              </li>
            ))}
          </ol>

          <div className="mt-3 flex items-center justify-between rounded-[12px] bg-white px-4 py-3 text-v2-ink">
            <span className="text-[13px] text-v2-ink/60">Total score</span>
            <span className="text-[22px] font-bold tabular-nums tracking-tight">{s.totalScore}</span>
          </div>

          <div className="mb-6 mt-5 grid grid-cols-2 gap-3">
            <V2Button variant="ghost" className="h-12 text-[14px]" onClick={onLeave}>
              Leave
            </V2Button>
            <WetPaintButton className="h-12 w-full rounded-[12px] text-[14px]" onClick={() => match.advance()} autoFocus>
              {over ? "Play again" : "Next round"}
            </WetPaintButton>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
