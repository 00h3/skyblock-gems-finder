import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { setDark, useDark } from "@/lib/ui-bus";
import { useAuth } from "@/lib/auth-context";
import { LegalBody, APP_VERSION } from "@/components/LegalDocs";
import { saveAccount } from "@/lib/saved-accounts";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — QBlock" }] }),
  component: SettingsPage,
});

type SettingsTab = "game" | "graphics" | "account";

export function SettingsPage() {
  const nav = useNavigate();
  const dark = useDark();
  const { qbUser, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>("game");

  // ── Game Settings State ───────────────────────────────────────────────────
  const [camSens, setCamSens] = useState<number>(() => {
    try {
      const v = localStorage.getItem("qb_cam_sensitivity");
      return v ? Number(v) : 1.0;
    } catch {
      return 1.0;
    }
  });

  const [fov, setFov] = useState<number>(() => {
    try {
      const v = localStorage.getItem("bm-fov");
      return v ? Number(v) : 75;
    } catch {
      return 75;
    }
  });

  const [invertY, setInvertY] = useState<boolean>(() => {
    try {
      return localStorage.getItem("bm-invert-joy-y") === "true";
    } catch {
      return false;
    }
  });

  const [invertX, setInvertX] = useState<boolean>(() => {
    try {
      return localStorage.getItem("bm-invert-joy-x") === "true";
    } catch {
      return false;
    }
  });

  const [controlsScale, setControlsScale] = useState<number>(() => {
    try {
      const v = localStorage.getItem("qb_controls_scale");
      return v ? Number(v) : 1.0;
    } catch {
      return 1.0;
    }
  });

  const [autoJump, setAutoJump] = useState<boolean>(() => {
    try {
      return localStorage.getItem("qb_auto_jump") !== "false";
    } catch {
      return true;
    }
  });

  const [touchCircle, setTouchCircle] = useState<boolean>(() => {
    try {
      return localStorage.getItem("qb_touch_circle") !== "false";
    } catch {
      return true;
    }
  });

  const [nametags, setNametags] = useState<boolean>(() => {
    try {
      return localStorage.getItem("qb_show_nametags") !== "false";
    } catch {
      return true;
    }
  });

  const [crosshairStyle, setCrosshairStyle] = useState<string>(() => {
    try {
      return localStorage.getItem("qb_crosshair_style") || "cross";
    } catch {
      return "cross";
    }
  });

  const [joystickMode, setJoystickMode] = useState<string>(() => {
    try {
      return localStorage.getItem("qb_joystick_mode") || "dynamic";
    } catch {
      return "dynamic";
    }
  });

  // ── Graphics & Audio State ────────────────────────────────────────────────
  const [fpsTarget, setFpsTarget] = useState<string>(() => {
    try {
      return localStorage.getItem("qb_fps_target") || "60";
    } catch {
      return "60";
    }
  });

  const [renderDistance, setRenderDistance] = useState<string>(() => {
    try {
      return localStorage.getItem("qb_render_distance") || "medium";
    } catch {
      return "medium";
    }
  });

  const [qualityMode, setQualityMode] = useState<string>(() => {
    try {
      return localStorage.getItem("bm-quality") || "balanced";
    } catch {
      return "balanced";
    }
  });

  const [masterVol, setMasterVol] = useState<number>(() => {
    try {
      const v = localStorage.getItem("bm-master-vol");
      return v ? Number(v) : 90;
    } catch {
      return 90;
    }
  });

  const [sfxVol, setSfxVol] = useState<number>(() => {
    try {
      const v = localStorage.getItem("bm-sfx-vol");
      return v ? Number(v) : 85;
    } catch {
      return 85;
    }
  });

  const [musicVol, setMusicVol] = useState<number>(() => {
    try {
      const v = localStorage.getItem("bm-music-vol");
      return v ? Number(v) : 70;
    } catch {
      return 70;
    }
  });

  const [ambientAudio, setAmbientAudio] = useState<boolean>(() => {
    try {
      return localStorage.getItem("bm-ambient-audio") !== "false";
    } catch {
      return true;
    }
  });

  // ── Account & System State ────────────────────────────────────────────────
  const [streamerMode, setStreamerMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem("qb_streamer_mode") === "true";
    } catch {
      return false;
    }
  });

  const [showLegal, setShowLegal] = useState<boolean>(false);
  const [cacheClearedNotice, setCacheClearedNotice] = useState<boolean>(false);

  // Persistence helpers
  const updateGamePref = (key: string, val: string | number | boolean, eventKey?: string) => {
    try {
      localStorage.setItem(key, String(val));
    } catch {}
    if (eventKey) {
      window.dispatchEvent(new CustomEvent(eventKey, { detail: val }));
    }
  };

  const handleClearCache = () => {
    try {
      if (typeof window !== "undefined") {
        const keysToRemove = Object.keys(localStorage).filter(
          (k) =>
            k.startsWith("qb_friends_cache_") ||
            k.startsWith("qb_cache_") ||
            k.startsWith("bm-games-")
        );
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      }
      setCacheClearedNotice(true);
      toast.success("Offline friends and world cache cleared");
      setTimeout(() => setCacheClearedNotice(false), 2500);
    } catch {
      toast.error("Failed to clear offline cache");
    }
  };

  const handleResetDefaults = () => {
    setCamSens(1.0);
    updateGamePref("qb_cam_sensitivity", 1.0, "bm-cam-sensitivity");
    setFov(75);
    updateGamePref("bm-fov", 75, "bm-fov");
    setInvertY(false);
    updateGamePref("bm-invert-joy-y", false);
    setInvertX(false);
    updateGamePref("bm-invert-joy-x", false);
    setControlsScale(1.0);
    updateGamePref("qb_controls_scale", 1.0, "bm-controls-scale");
    setAutoJump(true);
    updateGamePref("qb_auto_jump", true);
    setTouchCircle(true);
    updateGamePref("qb_touch_circle", true);
    setNametags(true);
    updateGamePref("qb_show_nametags", true);
    setCrosshairStyle("cross");
    updateGamePref("qb_crosshair_style", "cross");
    setJoystickMode("dynamic");
    updateGamePref("qb_joystick_mode", "dynamic");
    setFpsTarget("60");
    updateGamePref("qb_fps_target", "60");
    setRenderDistance("medium");
    updateGamePref("qb_render_distance", "medium");
    setMasterVol(90);
    updateGamePref("bm-master-vol", 90);
    setSfxVol(85);
    updateGamePref("bm-sfx-vol", 85);
    setMusicVol(70);
    updateGamePref("bm-music-vol", 70);
    setAmbientAudio(true);
    updateGamePref("bm-ambient-audio", true);
    setStreamerMode(false);
    updateGamePref("qb_streamer_mode", false);
    toast.success("All preferences reset to defaults");
  };

  async function handleSignOut() {
    if (qbUser) {
      saveAccount({
        uid: qbUser.uid,
        username: qbUser.username,
        displayName: qbUser.displayName,
        email: qbUser.email,
        customId: qbUser.customId,
        profilePhoto: qbUser.profilePhoto,
        avatarSnapshot: qbUser.avatarSnapshot,
        color: qbUser.color,
      });
    }
    await signOut();
    nav({ to: "/accounts" as never });
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#f5f6f8] dark:bg-[#0e1014] text-[#14151a] dark:text-[#f2f4f8] overflow-hidden select-none font-sans">
      {/* ── Top App Bar (Pure typography, no AI slop icons) ── */}
      <header className="shrink-0 h-14 border-b border-black/10 dark:border-white/10 bg-white/95 dark:bg-[#14171d]/95 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <h1 className="text-[19px] font-extrabold tracking-tight">Settings</h1>
          <span className="hidden sm:inline-block px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-black/5 dark:bg-white/10 text-black/60 dark:text-white/60">
            System Preferences
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined" && window.history.length > 1) {
                window.history.back();
              } else {
                nav({ to: "/" as never });
              }
            }}
            className="px-4 py-1.5 rounded-lg bg-[#fa4616] text-white font-bold text-[13px] shadow-sm hover:brightness-105 active:scale-95 transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </header>

      {/* ── Main Full-Page Layout with Side Navigation (or Mobile Segment Bar) ── */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
        {/* ── 3 Clickable Menus (Side rail on tablets/desktop, sticky bar on mobile) ── */}
        <nav
          aria-label="Settings Categories"
          className="shrink-0 border-b md:border-b-0 md:border-r border-black/10 dark:border-white/10 bg-white dark:bg-[#14171d] flex md:flex-col md:w-64 p-2 md:p-3 gap-1 overflow-x-auto md:overflow-y-auto hide-scrollbar z-10"
        >
          <button
            type="button"
            onClick={() => setActiveTab("game")}
            className={`flex-1 md:flex-none px-4 py-2.5 rounded-lg font-bold text-[13px] md:text-[14px] text-left transition-colors cursor-pointer ${
              activeTab === "game"
                ? "bg-[#fa4616] text-white shadow-sm"
                : "text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5"
            }`}
          >
            Game Settings
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("graphics")}
            className={`flex-1 md:flex-none px-4 py-2.5 rounded-lg font-bold text-[13px] md:text-[14px] text-left transition-colors cursor-pointer ${
              activeTab === "graphics"
                ? "bg-[#fa4616] text-white shadow-sm"
                : "text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5"
            }`}
          >
            Graphics & Audio
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("account")}
            className={`flex-1 md:flex-none px-4 py-2.5 rounded-lg font-bold text-[13px] md:text-[14px] text-left transition-colors cursor-pointer ${
              activeTab === "account"
                ? "bg-[#fa4616] text-white shadow-sm"
                : "text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5"
            }`}
          >
            Account & System
          </button>
        </nav>

        {/* ── Active Section Content Pane ── */}
        <main className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 md:p-8 max-w-4xl">
          {/* ================================================================= */}
          {/* PART 1: GAME SETTINGS                                             */}
          {/* ================================================================= */}
          {activeTab === "game" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-[17px] font-extrabold tracking-tight">Gameplay Controls & Camera</h2>
                <p className="text-[12.5px] text-black/60 dark:text-white/60 mt-0.5">
                  Fine-tune look sensitivity, field of view, touch responsiveness, and axis controls.
                </p>
              </div>

              {/* Camera Sensitivity Slider */}
              <div className="p-4 rounded-xl bg-white dark:bg-[#161a22] border border-black/8 dark:border-white/10 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-extrabold text-[14px]">Camera Sensitivity</div>
                    <div className="text-[12px] text-black/55 dark:text-white/55">Touch and mouse rotation speed multiplier</div>
                  </div>
                  <span className="font-mono font-bold text-[13px] px-2 py-0.5 rounded bg-black/5 dark:bg-white/10">
                    {camSens.toFixed(1)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="3.0"
                  step="0.1"
                  value={camSens}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setCamSens(v);
                    updateGamePref("qb_cam_sensitivity", v, "bm-cam-sensitivity");
                  }}
                  className="w-full accent-[#fa4616] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-black/40 dark:text-white/40 font-bold">
                  <span>0.5x Slow</span>
                  <span>1.0x Default</span>
                  <span>3.0x Fast</span>
                </div>
              </div>

              {/* Field of View (FOV) Slider */}
              <div className="p-4 rounded-xl bg-white dark:bg-[#161a22] border border-black/8 dark:border-white/10 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-extrabold text-[14px]">Field of View (FOV)</div>
                    <div className="text-[12px] text-black/55 dark:text-white/55">Adjust horizontal camera aperture in degrees</div>
                  </div>
                  <span className="font-mono font-bold text-[13px] px-2 py-0.5 rounded bg-black/5 dark:bg-white/10">
                    {fov}°
                  </span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="100"
                  step="1"
                  value={fov}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setFov(v);
                    updateGamePref("bm-fov", v, "bm-fov");
                  }}
                  className="w-full accent-[#fa4616] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-black/40 dark:text-white/40 font-bold">
                  <span>60° Tight</span>
                  <span>75° Standard</span>
                  <span>100° Wide</span>
                </div>
              </div>

              {/* Touch Controls Scale Slider */}
              <div className="p-4 rounded-xl bg-white dark:bg-[#161a22] border border-black/8 dark:border-white/10 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-extrabold text-[14px]">Touch Controls Size</div>
                    <div className="text-[12px] text-black/55 dark:text-white/55">Scale on-screen joystick and jump button</div>
                  </div>
                  <span className="font-mono font-bold text-[13px] px-2 py-0.5 rounded bg-black/5 dark:bg-white/10">
                    {Math.round(controlsScale * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.7"
                  max="1.5"
                  step="0.05"
                  value={controlsScale}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setControlsScale(v);
                    updateGamePref("qb_controls_scale", v, "bm-controls-scale");
                  }}
                  className="w-full accent-[#fa4616] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-black/40 dark:text-white/40 font-bold">
                  <span>70% Compact</span>
                  <span>100% Normal</span>
                  <span>150% Large</span>
                </div>
              </div>

              {/* Axis Inversions & Auto Jump Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Invert Pitch Y */}
                <div className="p-4 rounded-xl bg-white dark:bg-[#161a22] border border-black/8 dark:border-white/10 shadow-sm flex items-center justify-between">
                  <div>
                    <div className="font-extrabold text-[13.5px]">Invert Pitch (Y-Axis)</div>
                    <div className="text-[11.5px] text-black/55 dark:text-white/55">Push up to look down</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !invertY;
                      setInvertY(next);
                      updateGamePref("bm-invert-joy-y", next);
                    }}
                    className={`px-3 py-1 rounded-md text-[12px] font-bold transition cursor-pointer ${
                      invertY ? "bg-[#fa4616] text-white" : "bg-black/8 dark:bg-white/10 text-black/70 dark:text-white/70"
                    }`}
                  >
                    {invertY ? "ON" : "OFF"}
                  </button>
                </div>

                {/* Invert Yaw X */}
                <div className="p-4 rounded-xl bg-white dark:bg-[#161a22] border border-black/8 dark:border-white/10 shadow-sm flex items-center justify-between">
                  <div>
                    <div className="font-extrabold text-[13.5px]">Invert Yaw (X-Axis)</div>
                    <div className="text-[11.5px] text-black/55 dark:text-white/55">Reverse horizontal camera drag</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !invertX;
                      setInvertX(next);
                      updateGamePref("bm-invert-joy-x", next);
                    }}
                    className={`px-3 py-1 rounded-md text-[12px] font-bold transition cursor-pointer ${
                      invertX ? "bg-[#fa4616] text-white" : "bg-black/8 dark:bg-white/10 text-black/70 dark:text-white/70"
                    }`}
                  >
                    {invertX ? "ON" : "OFF"}
                  </button>
                </div>

                {/* Auto Jump */}
                <div className="p-4 rounded-xl bg-white dark:bg-[#161a22] border border-black/8 dark:border-white/10 shadow-sm flex items-center justify-between">
                  <div>
                    <div className="font-extrabold text-[13.5px]">Auto-Jump</div>
                    <div className="text-[11.5px] text-black/55 dark:text-white/55">Step over single block elevations</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !autoJump;
                      setAutoJump(next);
                      updateGamePref("qb_auto_jump", next);
                    }}
                    className={`px-3 py-1 rounded-md text-[12px] font-bold transition cursor-pointer ${
                      autoJump ? "bg-[#fa4616] text-white" : "bg-black/8 dark:bg-white/10 text-black/70 dark:text-white/70"
                    }`}
                  >
                    {autoJump ? "ON" : "OFF"}
                  </button>
                </div>

                {/* Translucent Hold Circle */}
                <div className="p-4 rounded-xl bg-white dark:bg-[#161a22] border border-black/8 dark:border-white/10 shadow-sm flex items-center justify-between">
                  <div>
                    <div className="font-extrabold text-[13.5px]">Held Touch Indicator</div>
                    <div className="text-[11.5px] text-black/55 dark:text-white/55">White translucent circle while holding</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !touchCircle;
                      setTouchCircle(next);
                      updateGamePref("qb_touch_circle", next);
                    }}
                    className={`px-3 py-1 rounded-md text-[12px] font-bold transition cursor-pointer ${
                      touchCircle ? "bg-[#fa4616] text-white" : "bg-black/8 dark:bg-white/10 text-black/70 dark:text-white/70"
                    }`}
                  >
                    {touchCircle ? "ON" : "OFF"}
                  </button>
                </div>

                {/* Player Nametags */}
                <div className="p-4 rounded-xl bg-white dark:bg-[#161a22] border border-black/8 dark:border-white/10 shadow-sm flex items-center justify-between">
                  <div>
                    <div className="font-extrabold text-[13.5px]">Player Nametags</div>
                    <div className="text-[11.5px] text-black/55 dark:text-white/55">Render nameplates above adventurers</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !nametags;
                      setNametags(next);
                      updateGamePref("qb_show_nametags", next);
                    }}
                    className={`px-3 py-1 rounded-md text-[12px] font-bold transition cursor-pointer ${
                      nametags ? "bg-[#fa4616] text-white" : "bg-black/8 dark:bg-white/10 text-black/70 dark:text-white/70"
                    }`}
                  >
                    {nametags ? "ON" : "OFF"}
                  </button>
                </div>

                {/* Joystick Positioning Mode */}
                <div className="p-4 rounded-xl bg-white dark:bg-[#161a22] border border-black/8 dark:border-white/10 shadow-sm flex items-center justify-between">
                  <div>
                    <div className="font-extrabold text-[13.5px]">Joystick Anchor</div>
                    <div className="text-[11.5px] text-black/55 dark:text-white/55">Position on touch screen</div>
                  </div>
                  <div className="flex gap-1 bg-black/5 dark:bg-white/10 p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => {
                        setJoystickMode("dynamic");
                        updateGamePref("qb_joystick_mode", "dynamic");
                      }}
                      className={`px-2 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                        joystickMode === "dynamic" ? "bg-[#fa4616] text-white" : "text-black/60 dark:text-white/60"
                      }`}
                    >
                      Dynamic
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setJoystickMode("fixed");
                        updateGamePref("qb_joystick_mode", "fixed");
                      }}
                      className={`px-2 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                        joystickMode === "fixed" ? "bg-[#fa4616] text-white" : "text-black/60 dark:text-white/60"
                      }`}
                    >
                      Fixed
                    </button>
                  </div>
                </div>
              </div>

              {/* Crosshair Style Segmented Picker */}
              <div className="p-4 rounded-xl bg-white dark:bg-[#161a22] border border-black/8 dark:border-white/10 shadow-sm space-y-2">
                <div className="font-extrabold text-[14px]">Aiming Crosshair Reticle</div>
                <div className="text-[12px] text-black/55 dark:text-white/55">Choose center screen targeting glyph</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {[
                    { id: "cross", label: "Classic Cross" },
                    { id: "dot", label: "Minimal Dot" },
                    { id: "diamond", label: "Diamond Box" },
                    { id: "hidden", label: "Hidden" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setCrosshairStyle(item.id);
                        updateGamePref("qb_crosshair_style", item.id);
                      }}
                      className={`py-2 px-3 rounded-lg font-bold text-[12px] text-center transition cursor-pointer border ${
                        crosshairStyle === item.id
                          ? "bg-[#fa4616] text-white border-[#fa4616] shadow-sm"
                          : "bg-black/5 dark:bg-white/5 text-black/70 dark:text-white/70 border-transparent hover:bg-black/10 dark:hover:bg-white/10"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* PART 2: GRAPHICS & AUDIO                                          */}
          {/* ================================================================= */}
          {activeTab === "graphics" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-[17px] font-extrabold tracking-tight">Display & Acoustic Performance</h2>
                <p className="text-[12.5px] text-black/60 dark:text-white/60 mt-0.5">
                  Optimize frame pacing, render distance, audio balance, and application theme.
                </p>
              </div>

              {/* Frame Rate Target */}
              <div className="p-4 rounded-xl bg-white dark:bg-[#161a22] border border-black/8 dark:border-white/10 shadow-sm space-y-2">
                <div className="font-extrabold text-[14px]">Frame Rate Pacing</div>
                <div className="text-[12px] text-black/55 dark:text-white/55">
                  Cap render refresh cycle to conserve battery and eliminate thermal lag spikes
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {[
                    { id: "30", label: "30 FPS (Battery Saver)" },
                    { id: "60", label: "60 FPS (Balanced)" },
                    { id: "uncapped", label: "Max / Native (High Refresh)" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setFpsTarget(item.id);
                        updateGamePref("qb_fps_target", item.id);
                      }}
                      className={`py-2.5 px-3 rounded-lg font-bold text-[12px] text-center transition cursor-pointer border ${
                        fpsTarget === item.id
                          ? "bg-[#fa4616] text-white border-[#fa4616] shadow-sm"
                          : "bg-black/5 dark:bg-white/5 text-black/70 dark:text-white/70 border-transparent hover:bg-black/10 dark:hover:bg-white/10"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Render Distance */}
              <div className="p-4 rounded-xl bg-white dark:bg-[#161a22] border border-black/8 dark:border-white/10 shadow-sm space-y-2">
                <div className="font-extrabold text-[14px]">Chunk Render Distance</div>
                <div className="text-[12px] text-black/55 dark:text-white/55">
                  Horizontal chunk loading radius around player
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {[
                    { id: "near", label: "Near (4 Chunks)" },
                    { id: "medium", label: "Medium (8 Chunks)" },
                    { id: "far", label: "Far (12 Chunks)" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setRenderDistance(item.id);
                        updateGamePref("qb_render_distance", item.id);
                      }}
                      className={`py-2.5 px-3 rounded-lg font-bold text-[12px] text-center transition cursor-pointer border ${
                        renderDistance === item.id
                          ? "bg-[#fa4616] text-white border-[#fa4616] shadow-sm"
                          : "bg-black/5 dark:bg-white/5 text-black/70 dark:text-white/70 border-transparent hover:bg-black/10 dark:hover:bg-white/10"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Audio Controls */}
              <div className="p-4 rounded-xl bg-white dark:bg-[#161a22] border border-black/8 dark:border-white/10 shadow-sm space-y-4">
                <div className="font-extrabold text-[14px]">Audio Levels</div>

                {/* Master Volume */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[12.5px] font-bold">
                    <span>Master Output Volume</span>
                    <span className="font-mono">{masterVol}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={masterVol}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setMasterVol(v);
                      updateGamePref("bm-master-vol", v);
                    }}
                    className="w-full accent-[#fa4616] cursor-pointer"
                  />
                </div>

                {/* SFX Volume */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[12.5px] font-bold">
                    <span>Game Sound Effects (Blocks, Steps, Hits)</span>
                    <span className="font-mono">{sfxVol}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={sfxVol}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setSfxVol(v);
                      updateGamePref("bm-sfx-vol", v);
                    }}
                    className="w-full accent-[#fa4616] cursor-pointer"
                  />
                </div>

                {/* Music Volume */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[12.5px] font-bold">
                    <span>Background Soundtracks & Stems</span>
                    <span className="font-mono">{musicVol}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={musicVol}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setMusicVol(v);
                      updateGamePref("bm-music-vol", v);
                    }}
                    className="w-full accent-[#fa4616] cursor-pointer"
                  />
                </div>

                {/* Ambient Weather Sound Toggle */}
                <div className="pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                  <div>
                    <div className="font-extrabold text-[13px]">Weather & Wind Ambience</div>
                    <div className="text-[11.5px] text-black/55 dark:text-white/55">Skyblock breeze, thunder, and rain audio</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !ambientAudio;
                      setAmbientAudio(next);
                      updateGamePref("bm-ambient-audio", next);
                    }}
                    className={`px-3 py-1 rounded-md text-[12px] font-bold transition cursor-pointer ${
                      ambientAudio ? "bg-[#fa4616] text-white" : "bg-black/8 dark:bg-white/10 text-black/70 dark:text-white/70"
                    }`}
                  >
                    {ambientAudio ? "ON" : "OFF"}
                  </button>
                </div>
              </div>

              {/* Interface Theme */}
              <div className="p-4 rounded-xl bg-white dark:bg-[#161a22] border border-black/8 dark:border-white/10 shadow-sm space-y-2">
                <div className="font-extrabold text-[14px]">App Interface Theme</div>
                <div className="text-[12px] text-black/55 dark:text-white/55">Adjust menu color contrast</div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setDark(false)}
                    className={`py-2 px-3 rounded-lg font-bold text-[12px] text-center transition cursor-pointer border ${
                      !dark
                        ? "bg-[#fa4616] text-white border-[#fa4616] shadow-sm"
                        : "bg-black/5 dark:bg-white/5 text-black/70 dark:text-white/70 border-transparent hover:bg-black/10"
                    }`}
                  >
                    Light Theme
                  </button>
                  <button
                    type="button"
                    onClick={() => setDark(true)}
                    className={`py-2 px-3 rounded-lg font-bold text-[12px] text-center transition cursor-pointer border ${
                      dark
                        ? "bg-[#fa4616] text-white border-[#fa4616] shadow-sm"
                        : "bg-black/5 dark:bg-white/5 text-black/70 dark:text-white/70 border-transparent hover:bg-black/10"
                    }`}
                  >
                    Pitch Dark Theme
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* PART 3: ACCOUNT & SYSTEM                                          */}
          {/* ================================================================= */}
          {activeTab === "account" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-[17px] font-extrabold tracking-tight">Account, Cache & Platform</h2>
                <p className="text-[12.5px] text-black/60 dark:text-white/60 mt-0.5">
                  Manage profile credentials, offline cache, download backups, and platform policies.
                </p>
              </div>

              {/* Player Profile Details */}
              <div className="p-4 rounded-xl bg-white dark:bg-[#161a22] border border-black/8 dark:border-white/10 shadow-sm space-y-3">
                <div className="font-extrabold text-[14px]">Player Identity</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12.5px]">
                  <div className="p-2.5 rounded-lg bg-black/5 dark:bg-white/5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-black/50 dark:text-white/50">Display Name</div>
                    <div className="font-extrabold text-[14px] mt-0.5">{qbUser?.displayName || "Player"}</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-black/5 dark:bg-white/5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-black/50 dark:text-white/50">Username</div>
                    <div className="font-extrabold text-[14px] mt-0.5">@{qbUser?.username || "adventurer"}</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-black/5 dark:bg-white/5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-black/50 dark:text-white/50">Player Custom ID</div>
                    <div className="font-mono font-extrabold text-[13px] mt-0.5">
                      {streamerMode ? "QB-••••••" : qbUser?.customId || "QB-001"}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-black/5 dark:bg-white/5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-black/50 dark:text-white/50">Registered Email</div>
                    <div className="font-mono text-[12px] truncate mt-0.5">
                      {streamerMode ? "••••••••@••••.com" : qbUser?.email || "Guest Session"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Streamer Mode Toggle */}
              <div className="p-4 rounded-xl bg-white dark:bg-[#161a22] border border-black/8 dark:border-white/10 shadow-sm flex items-center justify-between">
                <div>
                  <div className="font-extrabold text-[13.5px]">Streamer Privacy Mode</div>
                  <div className="text-[11.5px] text-black/55 dark:text-white/55">Hides private IDs and email addresses across views</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !streamerMode;
                    setStreamerMode(next);
                    updateGamePref("qb_streamer_mode", next);
                  }}
                  className={`px-3 py-1 rounded-md text-[12px] font-bold transition cursor-pointer ${
                    streamerMode ? "bg-[#fa4616] text-white" : "bg-black/8 dark:bg-white/10 text-black/70 dark:text-white/70"
                  }`}
                >
                  {streamerMode ? "ON" : "OFF"}
                </button>
              </div>

              {/* Cache Management */}
              <div className="p-4 rounded-xl bg-white dark:bg-[#161a22] border border-black/8 dark:border-white/10 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-extrabold text-[14px]">Offline Application Cache</div>
                    <div className="text-[12px] text-black/55 dark:text-white/55">
                      Caches friends list, island progress, and assets for instant app loading
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    Active
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleClearCache}
                    className="px-4 py-2 rounded-lg bg-black/8 dark:bg-white/10 text-black/85 dark:text-white/85 font-bold text-[12.5px] hover:bg-black/15 dark:hover:bg-white/15 transition cursor-pointer"
                  >
                    Clear Offline Cache
                  </button>
                  {cacheClearedNotice && (
                    <span className="text-[12px] font-semibold text-emerald-600 dark:text-emerald-400">
                      Cache cleared. Instant sync refreshed.
                    </span>
                  )}
                </div>
              </div>

              {/* Download Codebase Package */}
              <div className="p-4 rounded-xl bg-white dark:bg-[#161a22] border border-black/8 dark:border-white/10 shadow-sm space-y-2">
                <div className="font-extrabold text-[14px]">Project Codebase Package</div>
                <div className="text-[12px] text-black/55 dark:text-white/55">
                  Download the current project code package (TS/TSX routes, assets, voxel world, configurations).
                </div>
                <div className="pt-1">
                  <a
                    href="/QBLOCK-project.zip"
                    download="QBLOCK-project.zip"
                    className="inline-block px-4 py-2 rounded-lg bg-[#fa4616] text-white font-bold text-[12.5px] shadow-sm hover:brightness-105 active:scale-95 transition cursor-pointer"
                  >
                    Download Project ZIP
                  </a>
                </div>
              </div>

              {/* Version & Legal Docs */}
              <div className="p-4 rounded-xl bg-white dark:bg-[#161a22] border border-black/8 dark:border-white/10 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-extrabold text-[14px]">Platform Version</div>
                    <div className="text-[12px] text-black/55 dark:text-white/55">QBLOCK V2 Client</div>
                  </div>
                  <span className="font-mono font-bold text-[12px] px-2 py-0.5 rounded bg-black/5 dark:bg-white/10">
                    v{APP_VERSION}
                  </span>
                </div>
                <div className="pt-2 border-t border-black/5 dark:border-white/5">
                  <button
                    type="button"
                    onClick={() => setShowLegal(!showLegal)}
                    className="text-[12.5px] font-bold text-[#fa4616] hover:underline cursor-pointer"
                  >
                    {showLegal ? "Hide Terms of Service & Privacy Policy" : "View Terms of Service & Privacy Policy"}
                  </button>
                  {showLegal && (
                    <div className="mt-3 p-3 rounded-lg bg-black/5 dark:bg-white/5 text-[12px] max-h-60 overflow-y-auto">
                      <LegalBody />
                    </div>
                  )}
                </div>
              </div>

              {/* Reset All & Sign Out Actions */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-black/15 dark:border-white/15 bg-white dark:bg-[#161a22] font-bold text-[13px] text-black/75 dark:text-white/75 hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
                >
                  Reset All Settings to Defaults
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-[13px] transition cursor-pointer border border-rose-500/20"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export const SettingsBody = SettingsPage;
export default SettingsPage;
