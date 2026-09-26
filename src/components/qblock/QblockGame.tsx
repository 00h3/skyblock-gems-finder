import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Pickaxe, Trophy, Timer, Users, Send } from "lucide-react";
import { QblockEngine, type GameMode, type HudState } from "@/game/qblock/engine";
import { useAuth } from "@/lib/auth-context";
import { getMyScore, submitScore } from "@/lib/qblock-leaderboard";
import { GameAudio } from "@/lib/game-audio";
import { DPad, GemIcon, LILITA, Pill, SpriteButton } from "./QblockHud";
import { LeaderboardPanel } from "./LeaderboardPanel";

type Panel = null | "menu" | "chat" | "emote" | "leaderboard";

const INITIAL: HudState = { phase: "loading", countdown: 3, gems: 0, alive: 0, total: 0, time: 0, mining: 0, inMine: false, feed: [] };

export function QblockGame({ mode }: { mode: GameMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<QblockEngine | null>(null);
  const { qbUser, loading } = useAuth();
  const [hud, setHud] = useState<HudState>(INITIAL);
  const [panel, setPanel] = useState<Panel>(null);
  const [welcome, setWelcome] = useState(true);
  const [result, setResult] = useState<{ won: boolean; time: number; place: number } | null>(null);
  const [chat, setChat] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [camLabel, setCamLabel] = useState("");
  const name = qbUser?.username || qbUser?.displayName || "Guest";
  const uid = qbUser?.uid;

  useEffect(() => {
    if (loading || !canvasRef.current) return;
    let cancelled = false;
    let engine: QblockEngine | null = null;
    let saveTimer: ReturnType<typeof setTimeout> | undefined;
    (async () => {
      const start = mode === "skyblock" && uid ? await getMyScore("skyblock", uid) : 0;
      if (cancelled || !canvasRef.current) return;
      engine = new QblockEngine(canvasRef.current, mode, name, start);
      engineRef.current = engine;
      engine.onHud = setHud;
      engine.onRoundEnd = (r) => {
        setResult(r);
        if (uid) submitScore("blockfall", uid, name, r.time).catch(() => undefined);
      };
      engine.onGems = (g) => {
        if (!uid) return;
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => submitScore("skyblock", uid, name, g).catch(() => undefined), 1500);
      };
    })();
    const hideWelcome = setTimeout(() => setWelcome(false), 3500);
    return () => {
      cancelled = true;
      clearTimeout(hideWelcome);
      clearTimeout(saveTimer);
      engine?.dispose();
      engineRef.current = null;
    };
  }, [mode, loading, uid, name]);

  useEffect(() => {
    let stop: (() => void) | undefined;
    const startMusic = () => {
      if (stop) return;
      stop = mode === "skyblock" ? GameAudio.startSkyblockMusic() : GameAudio.startBlockFallMusic();
    };
    window.addEventListener("pointerdown", startMusic, { once: true });
    window.addEventListener("keydown", startMusic, { once: true });
    return () => {
      window.removeEventListener("pointerdown", startMusic);
      window.removeEventListener("keydown", startMusic);
      stop?.();
    };
  }, [mode]);

  const input = (k: "f" | "b" | "l" | "r", down: boolean) => {
    if (engineRef.current) engineRef.current.input[k] = down ? 1 : 0;
  };
  const toggle = (p: Panel) => setPanel((cur) => (cur === p ? null : p));
  const sendChat = () => {
    const text = draft.trim();
    if (!text) return;
    engineRef.current?.say(text);
    setChat((c) => [...c.slice(-19), `${name}: ${text}`]);
    setDraft("");
  };
  const cycleCam = () => {
    const m = engineRef.current?.cycleCamera();
    if (!m) return;
    setCamLabel(m === "third" ? "Third person" : m === "first" ? "First person" : "Selfie cam");
    setTimeout(() => setCamLabel(""), 1200);
  };
  const playAgain = () => {
    setResult(null);
    engineRef.current?.restart();
  };

  const topBtn = "h-[clamp(40px,11vmin,64px)] w-[clamp(40px,11vmin,64px)]";

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#5fb2ff] text-white" style={LILITA}>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" aria-label={`${mode} game world`} />

      {hud.phase === "loading" && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-[#2f2566]">
          <p className="text-4xl tracking-wide">Qblock</p>
          <div className="h-3 w-48 overflow-hidden rounded-full bg-black/30">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-[#35e0a1]" />
          </div>
          <p className="text-sm text-white/80">Loading {mode === "skyblock" ? "Skyblock" : "Block Fall"}...</p>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 p-[clamp(6px,2vmin,16px)]">
        <nav className="pointer-events-auto flex gap-[clamp(4px,1.4vmin,10px)]" aria-label="Game menu">
          <SpriteButton src="/qblock/ui/menu.png" label="Menu" className={topBtn} onClick={() => toggle("menu")} />
          <SpriteButton src="/qblock/ui/chat.png" label="Chat" className={topBtn} onClick={() => toggle("chat")} />
          <SpriteButton src="/qblock/ui/smile.png" label="Emotes" className={topBtn} onClick={() => toggle("emote")} />
          <SpriteButton src="/qblock/ui/video.png" label="Change camera" className={topBtn} onClick={cycleCam} />
        </nav>
        <div className="pointer-events-auto flex flex-col items-end gap-1.5">
          <div className="flex flex-wrap justify-end gap-1.5">
            {mode === "skyblock" ? (
              <Pill color="#1f7a57">
                <GemIcon /> {hud.gems}
              </Pill>
            ) : (
              <>
                <Pill>
                  <Users className="h-4 w-4" /> {hud.alive}/{hud.total}
                </Pill>
                <Pill>
                  <Timer className="h-4 w-4" /> {hud.time}s
                </Pill>
              </>
            )}
            <button type="button" aria-label="Open leaderboard" onClick={() => toggle("leaderboard")} className="active:scale-90">
              <Pill color="#c98a12">
                <Trophy className="h-4 w-4" />
              </Pill>
            </button>
          </div>
          <ul className="flex flex-col items-end gap-1" aria-live="polite">
            {hud.feed.map((f, i) => (
              <li key={`${f}-${i}`} className="rounded-lg bg-black/35 px-2 py-0.5 text-[clamp(11px,3vmin,15px)]" style={{ opacity: 1 - i * 0.2 }}>
                {f}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {welcome && hud.phase !== "loading" && (
        <div className="pointer-events-none absolute inset-x-0 top-[28%] z-10 flex justify-center px-4">
          <p className="animate-in fade-in zoom-in-95 rounded-2xl bg-white px-[clamp(16px,5vmin,48px)] py-[clamp(8px,2.4vmin,20px)] text-center text-[clamp(18px,6vmin,44px)] text-[#141414] shadow-lg">
            Welcome to Qblock world
          </p>
        </div>
      )}

      {hud.phase === "countdown" && !welcome && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <span key={hud.countdown} className="animate-in zoom-in-50 text-[clamp(64px,24vmin,180px)] text-[#ffd84d] [text-shadow:0_6px_0_#7a4a00]">
            {hud.countdown}
          </span>
        </div>
      )}

      {camLabel && (
        <div className="pointer-events-none absolute inset-x-0 top-[18%] z-10 text-center text-lg [text-shadow:0_2px_0_rgba(0,0,0,.5)]">{camLabel}</div>
      )}

      {mode === "skyblock" && hud.mining > 0 && (
        <div className="pointer-events-none absolute bottom-[30%] left-1/2 z-10 h-3 w-40 -translate-x-1/2 overflow-hidden rounded-full border-2 border-black/50 bg-black/40">
          <div className="h-full bg-[#35e0a1]" style={{ width: `${Math.min(100, hud.mining * 100)}%` }} />
        </div>
      )}
      {mode === "skyblock" && !hud.inMine && hud.phase === "playing" && !welcome && (
        <p className="pointer-events-none absolute inset-x-0 bottom-[34%] z-10 text-center text-[clamp(12px,3.4vmin,18px)] [text-shadow:0_2px_0_rgba(0,0,0,.5)]">
          Cross the bridge to the Mining Area. Hold on a block to mine it!
        </p>
      )}

      <div className="absolute bottom-[clamp(6px,2vmin,20px)] left-[clamp(6px,2vmin,20px)] z-20">
        <DPad onDir={input} />
      </div>
      <div className="absolute bottom-[clamp(6px,2vmin,20px)] right-[clamp(6px,2vmin,20px)] z-20 flex flex-col items-end gap-2">
        {mode === "skyblock" && (
          <SpriteButton
            src="/qblock/ui/button.png"
            kind="blank"
            label="Mine"
            className="mr-[clamp(24px,8vmin,60px)] h-[clamp(50px,14vmin,96px)] w-[clamp(58px,16vmin,110px)]"
            onHold={(d) => engineRef.current && (engineRef.current.input.mine = d)}
          >
            <Pickaxe className="h-[45%] w-[45%]" />
          </SpriteButton>
        )}
        <SpriteButton
          src="/qblock/ui/button.png"
          kind="blank"
          label="Jump"
          className="h-[clamp(50px,14vmin,96px)] w-[clamp(58px,16vmin,110px)] text-[clamp(12px,3.6vmin,20px)]"
          onHold={(d) => engineRef.current && (engineRef.current.input.jump = d)}
        >
          JUMP
        </SpriteButton>
      </div>

      {panel === "menu" && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={() => setPanel(null)}>
          <div
            role="dialog"
            aria-label="Menu"
            className="flex w-full max-w-xs flex-col gap-2 rounded-2xl border-4 border-[#1d1450] bg-[#4a3d8f] p-4 shadow-[0_6px_0_rgba(0,0,0,.4)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-center text-2xl">Menu</h2>
            <MenuBtn onClick={() => setPanel(null)}>Resume</MenuBtn>
            <MenuBtn onClick={() => setPanel("leaderboard")}>Leaderboard</MenuBtn>
            <Link to="/game/$id" params={{ id: mode === "skyblock" ? "block-fall" : "skyblock" }} className={menuCls} onClick={() => setPanel(null)}>
              Play {mode === "skyblock" ? "Block Fall" : "Skyblock"}
            </Link>
            <Link to="/" className={`${menuCls} bg-[#d6453f]`}>
              Leave game
            </Link>
          </div>
        </div>
      )}

      {panel === "chat" && (
        <div className="absolute left-2 top-[clamp(52px,14vmin,84px)] z-30 w-[min(320px,calc(100%-16px))] rounded-2xl border-4 border-[#1d1450] bg-[#2f2566]/90 p-2">
          <ul className="mb-2 max-h-32 space-y-0.5 overflow-y-auto text-sm">
            {chat.length === 0 ? <li className="text-white/70">Say hi to the world!</li> : chat.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
          <form
            className="flex gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              sendChat();
            }}
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.nativeEvent.isComposing || e.keyCode === 229)) e.preventDefault();
              }}
              maxLength={60}
              placeholder="Type a message..."
              aria-label="Chat message"
              className="min-w-0 flex-1 rounded-lg bg-white px-2 py-1.5 text-sm text-[#141414] outline-none"
              style={{ fontFamily: "Inter, sans-serif" }}
            />
            <button type="submit" aria-label="Send" className="rounded-lg bg-[#35e0a1] px-2 text-[#0b3a2a]">
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      {panel === "emote" && (
        <div className="absolute left-2 top-[clamp(52px,14vmin,84px)] z-30 flex gap-2 rounded-2xl border-4 border-[#1d1450] bg-[#2f2566]/90 p-2">
          {(["wave", "jump", "spin"] as const).map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => {
                engineRef.current?.emote(e);
                setPanel(null);
              }}
              className="rounded-xl bg-[#4a3d8f] px-3 py-2 capitalize shadow-[0_3px_0_rgba(0,0,0,.4)] active:translate-y-0.5"
            >
              {e}
            </button>
          ))}
        </div>
      )}

      {panel === "leaderboard" && <LeaderboardPanel mode={mode} myId={uid} onClose={() => setPanel(null)} />}

      {result && panel !== "leaderboard" && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-label="Round results"
            className="flex w-full max-w-xs flex-col items-center gap-2 rounded-2xl border-4 border-[#1d1450] bg-[#4a3d8f] p-5 text-center shadow-[0_6px_0_rgba(0,0,0,.4)]"
          >
            <p className={`text-4xl ${result.won ? "text-[#ffd84d]" : "text-[#ff8a80]"}`}>{result.won ? "VICTORY!" : "YOU FELL!"}</p>
            <p className="text-lg">
              Place #{result.place} &middot; Survived {result.time}s
            </p>
            {!uid && <p className="text-sm text-white/80">Log in to save your best time</p>}
            <MenuBtn onClick={playAgain}>Play again</MenuBtn>
            <MenuBtn onClick={() => setPanel("leaderboard")}>Leaderboard</MenuBtn>
          </div>
        </div>
      )}
    </main>
  );
}

const menuCls =
  "block w-full rounded-xl bg-[#6a58c9] py-2.5 text-center text-lg text-white shadow-[0_4px_0_rgba(0,0,0,.4)] active:translate-y-0.5 active:shadow-none";

function MenuBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={menuCls}>
      {children}
    </button>
  );
}
