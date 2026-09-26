import React, { useState, useRef, useEffect, useCallback } from "react";
import { Smile, Sparkles, X } from "lucide-react";

export const HUD_ASSETS = {
  menu: "https://maxwell.z3ki.dev/bot/_files/menu-icon/menu-icon.png",
  video: "https://maxwell.z3ki.dev/bot/_files/video-icon/video-icon.png",
  smile: "https://maxwell.z3ki.dev/bot/_files/smile-icon/smile-icon.png",
  chat: "https://maxwell.z3ki.dev/bot/_files/chat-icon-83/chat-icon.png",
  arrow: "https://maxwell.z3ki.dev/bot/_files/arrow-icon/arrow-icon.png",
  button: "https://maxwell.z3ki.dev/bot/_files/blank-button/blank-button.png",
};

interface QblockScreenControlsProps {
  onMenu?: () => void;
  onChat?: () => void;
  onVideo?: () => void;
  onJump?: () => void;
  onAction?: () => void;
  worldTitle?: string;
  showWelcomeBanner?: boolean;
}

export function QblockScreenControls({
  onMenu,
  onChat,
  onVideo,
  onJump,
  onAction,
  worldTitle = "Welcome to Qblock world",
  showWelcomeBanner = true,
}: QblockScreenControlsProps) {
  const [welcomeVisible, setWelcomeVisible] = useState(showWelcomeBanner);
  const [emotesOpen, setEmotesOpen] = useState(false);
  const [activeReaction, setActiveReaction] = useState<string | null>(null);

  // Auto-hide welcome banner after 7 seconds, or user can tap it to dismiss
  useEffect(() => {
    if (!showWelcomeBanner) return;
    const timer = setTimeout(() => {
      setWelcomeVisible(false);
    }, 7000);
    return () => clearTimeout(timer);
  }, [showWelcomeBanner]);

  // Track D-Pad direction states
  const dpadRef = useRef({ up: false, down: false, left: false, right: false });

  const emitDpad = useCallback(() => {
    window.dispatchEvent(
      new CustomEvent("bm-dpad", {
        detail: { ...dpadRef.current },
      }),
    );
  }, []);

  const setDir = useCallback(
    (dir: "up" | "down" | "left" | "right", active: boolean) => {
      if (dpadRef.current[dir] !== active) {
        dpadRef.current[dir] = active;
        emitDpad();
      }
    },
    [emitDpad],
  );

  // Clear all D-Pad directions on unmount
  useEffect(() => {
    return () => {
      dpadRef.current = { up: false, down: false, left: false, right: false };
      window.dispatchEvent(
        new CustomEvent("bm-dpad", {
          detail: { up: false, down: false, left: false, right: false },
        }),
      );
    };
  }, []);

  // Handle pointer sliding across the D-Pad container
  const handleDpadPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    const deadzone = rect.width * 0.12;

    const newUp = y < -deadzone;
    const newDown = y > deadzone;
    const newLeft = x < -deadzone;
    const newRight = x > deadzone;

    let changed = false;
    if (dpadRef.current.up !== newUp) {
      dpadRef.current.up = newUp;
      changed = true;
    }
    if (dpadRef.current.down !== newDown) {
      dpadRef.current.down = newDown;
      changed = true;
    }
    if (dpadRef.current.left !== newLeft) {
      dpadRef.current.left = newLeft;
      changed = true;
    }
    if (dpadRef.current.right !== newRight) {
      dpadRef.current.right = newRight;
      changed = true;
    }
    if (changed) emitDpad();
  };

  const handleDpadPointerLeave = () => {
    dpadRef.current = { up: false, down: false, left: false, right: false };
    emitDpad();
  };

  const EMOTE_LIST = [
    { emoji: "👋", name: "Wave", desc: "Hello everyone!" },
    { emoji: "💃", name: "Dance", desc: "Show some moves!" },
    { emoji: "🎉", name: "Cheer", desc: "Celebrate!" },
    { emoji: "😂", name: "Laugh", desc: "Haha!" },
    { emoji: "❤️", name: "Heart", desc: "Spread the love!" },
    { emoji: "🏆", name: "Victory", desc: "GG!" },
    { emoji: "🙇", name: "Bow", desc: "Show respect" },
    { emoji: "😴", name: "Sleep", desc: "Zzz..." },
    { emoji: "🔥", name: "Fire", desc: "Lit!" },
    { emoji: "⭐", name: "Star", desc: "Awesome!" },
  ];

  const handleSelectEmote = (emote: (typeof EMOTE_LIST)[0]) => {
    setActiveReaction(`${emote.emoji} ${emote.name}!`);
    setEmotesOpen(false);
    window.dispatchEvent(
      new CustomEvent("bm-chat-say", {
        detail: { text: `${emote.emoji} ${emote.name}!` },
      }),
    );
    setTimeout(() => {
      setActiveReaction(null);
    }, 3500);
  };

  return (
    <>
      {/* ── TOP-LEFT BAR: [Menu] [Chat] [Smile] [Video] ── */}
      <div className="absolute top-[max(12px,env(safe-area-inset-top))] left-[max(12px,env(safe-area-inset-left))] z-40 flex items-center gap-1.5 sm:gap-2 pointer-events-auto select-none">
        {/* 1. Menu Button */}
        <button
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation();
            onMenu?.();
          }}
          className="relative w-11 h-11 sm:w-12 sm:h-12 active:scale-90 transition-transform cursor-pointer border-0 bg-transparent p-0 flex items-center justify-center outline-none touch-none"
          title="Game Menu"
          aria-label="Game Menu"
        >
          <img
            src={HUD_ASSETS.button}
            alt="Menu"
            className="w-full h-full object-contain pointer-events-none drop-shadow-md select-none"
            draggable={false}
          />
          <img
            src={HUD_ASSETS.menu}
            alt=""
            className="absolute inset-0 w-full h-full object-contain p-2 sm:p-2.5 pointer-events-none drop-shadow-sm select-none"
            draggable={false}
          />
        </button>

        {/* 2. Chat Button */}
        <button
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation();
            onChat?.();
          }}
          className="relative w-11 h-11 sm:w-12 sm:h-12 active:scale-90 transition-transform cursor-pointer border-0 bg-transparent p-0 flex items-center justify-center outline-none touch-none"
          title="Chat"
          aria-label="Chat"
        >
          <img
            src={HUD_ASSETS.button}
            alt="Chat"
            className="w-full h-full object-contain pointer-events-none drop-shadow-md select-none"
            draggable={false}
          />
          <img
            src={HUD_ASSETS.chat}
            alt=""
            className="absolute inset-0 w-full h-full object-contain p-2 sm:p-2.5 pointer-events-none drop-shadow-sm select-none"
            draggable={false}
          />
        </button>

        {/* 3. Smile / Emote Button */}
        <button
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation();
            setEmotesOpen((v) => !v);
          }}
          className="relative w-11 h-11 sm:w-12 sm:h-12 active:scale-90 transition-transform cursor-pointer border-0 bg-transparent p-0 flex items-center justify-center outline-none touch-none"
          title="Emotes & Reactions"
          aria-label="Emotes"
        >
          <img
            src={HUD_ASSETS.button}
            alt="Smile"
            className="w-full h-full object-contain pointer-events-none drop-shadow-md select-none"
            draggable={false}
          />
          <img
            src={HUD_ASSETS.smile}
            alt=""
            className="absolute inset-0 w-full h-full object-contain p-2 sm:p-2.5 pointer-events-none drop-shadow-sm select-none"
            draggable={false}
          />
        </button>

        {/* 4. Video / Camera Mode Button */}
        <button
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation();
            onVideo?.();
          }}
          className="relative w-11 h-11 sm:w-12 sm:h-12 active:scale-90 transition-transform cursor-pointer border-0 bg-transparent p-0 flex items-center justify-center outline-none touch-none"
          title="Switch Camera View"
          aria-label="Camera Mode"
        >
          <img
            src={HUD_ASSETS.button}
            alt="Video"
            className="w-full h-full object-contain pointer-events-none drop-shadow-md select-none"
            draggable={false}
          />
          <img
            src={HUD_ASSETS.video}
            alt=""
            className="absolute inset-0 w-full h-full object-contain p-2 sm:p-2.5 pointer-events-none drop-shadow-sm select-none"
            draggable={false}
          />
        </button>
      </div>

      {/* ── CENTER TOP: "Welcome to Qblock world" Card (from screenshot) ── */}
      {welcomeVisible && (
        <div className="absolute top-[max(14px,env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-30 pointer-events-auto select-none transition-all duration-300">
          <div
            onClick={() => setWelcomeVisible(false)}
            className="rounded-[18px] bg-white px-7 py-2.5 sm:px-9 sm:py-3.5 text-slate-900 font-extrabold text-base sm:text-xl shadow-[0_12px_36px_rgba(0,0,0,0.35)] border border-slate-200/90 flex items-center justify-center tracking-tight cursor-pointer active:scale-95 transition-transform"
          >
            <span>{worldTitle}</span>
          </div>
        </div>
      )}

      {/* ── FLOATING EMOTE / REACTION POPUP (ABOVE HEAD) ── */}
      {activeReaction && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-40 pointer-events-none animate-bounce">
          <div className="bg-black/75 backdrop-blur-md border border-white/25 px-4 py-2 rounded-2xl text-white font-extrabold text-base shadow-2xl flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>{activeReaction}</span>
          </div>
        </div>
      )}

      {/* ── EMOTES PICKER SHEET (Toggled by Smile Icon) ── */}
      {emotesOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm pointer-events-auto"
          onClick={() => setEmotesOpen(false)}
        >
          <div
            className="relative w-full max-w-[360px] rounded-3xl bg-[#1b1f28]/95 border border-white/15 p-5 text-white shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <Smile className="w-5 h-5 text-amber-400" />
                <h3 className="font-extrabold text-base">Emotes & Reactions</h3>
              </div>
              <button
                type="button"
                onClick={() => setEmotesOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
              {EMOTE_LIST.map((em) => (
                <button
                  key={em.name}
                  type="button"
                  onClick={() => handleSelectEmote(em)}
                  className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/5 hover:bg-white/15 active:scale-95 border border-white/10 transition text-left cursor-pointer"
                >
                  <span className="text-2xl">{em.emoji}</span>
                  <div>
                    <div className="text-xs font-bold text-white">{em.name}</div>
                    <div className="text-[10px] text-white/50">{em.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── BOTTOM-LEFT: Classic D-Pad Cross (Up, Left, Right, Down) ── */}
      <div
        className="absolute bottom-[max(18px,env(safe-area-inset-bottom))] left-[max(18px,env(safe-area-inset-left))] z-40 pointer-events-auto select-none touch-none"
        onPointerMove={handleDpadPointerMove}
        onPointerLeave={handleDpadPointerLeave}
        onPointerUp={handleDpadPointerLeave}
        onPointerCancel={handleDpadPointerLeave}
      >
        <div className="grid grid-cols-3 grid-rows-3 gap-1 w-[156px] h-[156px] sm:w-[174px] sm:h-[174px]">
          {/* Row 1, Col 1: Empty */}
          <div />

          {/* Row 1, Col 2: UP BUTTON */}
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              setDir("up", true);
            }}
            onPointerUp={(e) => {
              e.stopPropagation();
              setDir("up", false);
            }}
            onPointerLeave={() => setDir("up", false)}
            onContextMenu={(e) => e.preventDefault()}
            className="relative w-full h-full active:scale-90 transition-transform cursor-pointer border-0 bg-transparent p-0 flex items-center justify-center outline-none touch-none"
            aria-label="Move Forward"
          >
            <img
              src={HUD_ASSETS.button}
              alt="Up"
              className="w-full h-full object-contain pointer-events-none drop-shadow-md select-none"
              draggable={false}
            />
            <img
              src={HUD_ASSETS.arrow}
              alt=""
              className="absolute inset-0 w-full h-full object-contain pointer-events-none drop-shadow-sm select-none"
              draggable={false}
            />
          </button>

          {/* Row 1, Col 3: Empty */}
          <div />

          {/* Row 2, Col 1: LEFT BUTTON */}
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              setDir("left", true);
            }}
            onPointerUp={(e) => {
              e.stopPropagation();
              setDir("left", false);
            }}
            onPointerLeave={() => setDir("left", false)}
            onContextMenu={(e) => e.preventDefault()}
            className="relative w-full h-full active:scale-90 transition-transform cursor-pointer border-0 bg-transparent p-0 flex items-center justify-center outline-none touch-none"
            aria-label="Move Left"
          >
            <img
              src={HUD_ASSETS.button}
              alt="Left"
              className="w-full h-full object-contain pointer-events-none drop-shadow-md select-none"
              draggable={false}
            />
            <img
              src={HUD_ASSETS.arrow}
              alt=""
              className="absolute inset-0 w-full h-full object-contain pointer-events-none drop-shadow-sm select-none -rotate-90"
              draggable={false}
            />
          </button>

          {/* Row 2, Col 2: Center Spacer */}
          <div className="w-full h-full flex items-center justify-center pointer-events-none opacity-20">
            <div className="w-2.5 h-2.5 rounded-full bg-white/40" />
          </div>

          {/* Row 2, Col 3: RIGHT BUTTON */}
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              setDir("right", true);
            }}
            onPointerUp={(e) => {
              e.stopPropagation();
              setDir("right", false);
            }}
            onPointerLeave={() => setDir("right", false)}
            onContextMenu={(e) => e.preventDefault()}
            className="relative w-full h-full active:scale-90 transition-transform cursor-pointer border-0 bg-transparent p-0 flex items-center justify-center outline-none touch-none"
            aria-label="Move Right"
          >
            <img
              src={HUD_ASSETS.button}
              alt="Right"
              className="w-full h-full object-contain pointer-events-none drop-shadow-md select-none"
              draggable={false}
            />
            <img
              src={HUD_ASSETS.arrow}
              alt=""
              className="absolute inset-0 w-full h-full object-contain pointer-events-none drop-shadow-sm select-none rotate-90"
              draggable={false}
            />
          </button>

          {/* Row 3, Col 1: Empty */}
          <div />

          {/* Row 3, Col 2: DOWN BUTTON */}
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              setDir("down", true);
            }}
            onPointerUp={(e) => {
              e.stopPropagation();
              setDir("down", false);
            }}
            onPointerLeave={() => setDir("down", false)}
            onContextMenu={(e) => e.preventDefault()}
            className="relative w-full h-full active:scale-90 transition-transform cursor-pointer border-0 bg-transparent p-0 flex items-center justify-center outline-none touch-none"
            aria-label="Move Backward"
          >
            <img
              src={HUD_ASSETS.button}
              alt="Down"
              className="w-full h-full object-contain pointer-events-none drop-shadow-md select-none"
              draggable={false}
            />
            <img
              src={HUD_ASSETS.arrow}
              alt=""
              className="absolute inset-0 w-full h-full object-contain pointer-events-none drop-shadow-sm select-none rotate-180"
              draggable={false}
            />
          </button>

          {/* Row 3, Col 3: Empty */}
          <div />
        </div>
      </div>

      {/* ── RIGHT-SIDE: Action Buttons from Screenshot ── */}
      {/* Upper-Right Button (Jump / Fly) */}
      <div className="absolute right-[max(18px,env(safe-area-inset-right))] top-[54%] -translate-y-1/2 z-40 pointer-events-auto select-none">
        <button
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            if (onJump) onJump();
            else window.dispatchEvent(new Event("bm-jump"));
          }}
          className="relative w-16 h-16 sm:w-[72px] sm:h-[72px] active:scale-90 transition-transform cursor-pointer border-0 bg-transparent p-0 flex items-center justify-center outline-none touch-none"
          title="Jump"
          aria-label="Jump"
        >
          <img
            src={HUD_ASSETS.button}
            alt="Jump"
            className="w-full h-full object-contain pointer-events-none drop-shadow-lg select-none"
            draggable={false}
          />
        </button>
      </div>

      {/* Lower-Right Button (Action / Crouch / Mine) */}
      <div className="absolute right-[max(34px,calc(env(safe-area-inset-right)+16px))] bottom-[max(24px,calc(env(safe-area-inset-bottom)+12px))] z-40 pointer-events-auto select-none">
        <button
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            if (onAction) onAction();
            else window.dispatchEvent(new CustomEvent("bm-action-btn"));
          }}
          className="relative w-16 h-16 sm:w-[72px] sm:h-[72px] active:scale-90 transition-transform cursor-pointer border-0 bg-transparent p-0 flex items-center justify-center outline-none touch-none"
          title="Action"
          aria-label="Action"
        >
          <img
            src={HUD_ASSETS.button}
            alt="Action"
            className="w-full h-full object-contain pointer-events-none drop-shadow-lg select-none"
            draggable={false}
          />
        </button>
      </div>
    </>
  );
}
