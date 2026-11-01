"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

interface FlatSquareSettingsModalProps {
  onClose: () => void;
  controlsScale?: number;
  onControlsScaleChange?: (scale: number) => void;
  showWeather?: boolean;
}

type ModalTab = "game" | "graphics" | "account";

export function FlatSquareSettingsModal({
  onClose,
  controlsScale: initialScale,
  onControlsScaleChange,
}: FlatSquareSettingsModalProps) {
  const { qbUser } = useAuth();
  const [activeTab, setActiveTab] = useState<ModalTab>("game");

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

  const [scale, setScale] = useState<number>(() => {
    if (typeof initialScale === "number") return initialScale;
    try {
      const saved = localStorage.getItem("qb_controls_scale");
      return saved ? Number(saved) : 1.0;
    } catch {
      return 1.0;
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

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const updateSetting = (key: string, val: string | number | boolean, eventName?: string) => {
    try {
      localStorage.setItem(key, String(val));
    } catch {}
    if (eventName) {
      window.dispatchEvent(new CustomEvent(eventName, { detail: val }));
    }
  };

  const content = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Game Settings"
      className="fixed inset-0 z-[9999] bg-[#0f1115] text-[#f2f4f8] flex flex-col font-sans select-none animate-in fade-in duration-100"
    >
      {/* ── Top Header Bar (No icons, pure typography) ── */}
      <header className="shrink-0 h-14 border-b border-white/10 bg-[#161920] px-4 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[17px] sm:text-[19px] font-extrabold tracking-tight text-white">
            Game Settings
          </span>
          <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10.5px] font-bold uppercase tracking-wider bg-white/10 text-white/70">
            Realtime Configuration
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-1.5 rounded-lg bg-[#fa4616] hover:bg-[#ff5524] active:scale-95 text-white font-bold text-[13px] transition cursor-pointer shadow-sm"
        >
          Close
        </button>
      </header>

      {/* ── 3 Clickable Menus + Content Layout ── */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
        {/* Navigation Rail with 3 Distinct Clickable Menus */}
        <nav
          aria-label="Settings Categories"
          className="shrink-0 border-b md:border-b-0 md:border-r border-white/10 bg-[#12141a] flex md:flex-col md:w-60 p-2 md:p-3 gap-1 overflow-x-auto md:overflow-y-auto hide-scrollbar z-10"
        >
          <button
            type="button"
            onClick={() => setActiveTab("game")}
            className={`flex-1 md:flex-none px-4 py-2.5 rounded-lg font-bold text-[13px] md:text-[14px] text-left transition-colors cursor-pointer ${
              activeTab === "game"
                ? "bg-[#fa4616] text-white shadow-sm"
                : "text-white/70 hover:bg-white/5"
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
                : "text-white/70 hover:bg-white/5"
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
                : "text-white/70 hover:bg-white/5"
            }`}
          >
            Account & System
          </button>
        </nav>

        {/* Content Pane */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 md:p-8 max-w-4xl space-y-6">
          {/* =============================================================== */}
          {/* PART 1: GAME SETTINGS                                           */}
          {/* =============================================================== */}
          {activeTab === "game" && (
            <div className="space-y-5">
              <div>
                <h3 className="text-[16px] font-extrabold text-white">Controls, Motion & Reticle</h3>
                <p className="text-[12px] text-white/55 mt-0.5">
                  Adjust sensitivity, field of view, controls scale, and axis preferences.
                </p>
              </div>

              {/* Camera Sensitivity */}
              <div className="p-4 rounded-xl bg-[#181b22] border border-white/10 space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-extrabold text-[13.5px] text-white">Camera Sensitivity</div>
                    <div className="text-[11.5px] text-white/55">Touch swipe and mouse turn rate</div>
                  </div>
                  <span className="font-mono font-bold text-[13px] px-2 py-0.5 rounded bg-white/10 text-white">
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
                    updateSetting("qb_cam_sensitivity", v, "bm-cam-sensitivity");
                  }}
                  className="w-full accent-[#fa4616] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-white/40 font-bold">
                  <span>0.5x Slow</span>
                  <span>1.0x Default</span>
                  <span>3.0x Fast</span>
                </div>
              </div>

              {/* Field of View (FOV) */}
              <div className="p-4 rounded-xl bg-[#181b22] border border-white/10 space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-extrabold text-[13.5px] text-white">Field of View (FOV)</div>
                    <div className="text-[11.5px] text-white/55">Camera viewing angle</div>
                  </div>
                  <span className="font-mono font-bold text-[13px] px-2 py-0.5 rounded bg-white/10 text-white">
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
                    updateSetting("bm-fov", v, "bm-fov");
                  }}
                  className="w-full accent-[#fa4616] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-white/40 font-bold">
                  <span>60° Tight</span>
                  <span>75° Standard</span>
                  <span>100° Wide</span>
                </div>
              </div>

              {/* Controls Scale Slider */}
              <div className="p-4 rounded-xl bg-[#181b22] border border-white/10 space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-extrabold text-[13.5px] text-white">On-Screen Controls Size</div>
                    <div className="text-[11.5px] text-white/55">Scale D-pad, joystick and action buttons</div>
                  </div>
                  <span className="font-mono font-bold text-[13px] px-2 py-0.5 rounded bg-white/10 text-white">
                    {Math.round(scale * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.7"
                  max="1.5"
                  step="0.05"
                  value={scale}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setScale(v);
                    onControlsScaleChange?.(v);
                    updateSetting("qb_controls_scale", v, "bm-controls-scale");
                  }}
                  className="w-full accent-[#fa4616] cursor-pointer"
                />
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-[#181b22] border border-white/10 flex items-center justify-between">
                  <div>
                    <div className="font-extrabold text-[13px] text-white">Invert Y-Axis (Pitch)</div>
                    <div className="text-[11px] text-white/50">Push forward to look down</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !invertY;
                      setInvertY(next);
                      updateSetting("bm-invert-joy-y", next);
                    }}
                    className={`px-3 py-1 rounded text-[12px] font-bold cursor-pointer ${
                      invertY ? "bg-[#fa4616] text-white" : "bg-white/10 text-white/70"
                    }`}
                  >
                    {invertY ? "ON" : "OFF"}
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-[#181b22] border border-white/10 flex items-center justify-between">
                  <div>
                    <div className="font-extrabold text-[13px] text-white">Invert X-Axis (Yaw)</div>
                    <div className="text-[11px] text-white/50">Reverse horizontal look</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !invertX;
                      setInvertX(next);
                      updateSetting("bm-invert-joy-x", next);
                    }}
                    className={`px-3 py-1 rounded text-[12px] font-bold cursor-pointer ${
                      invertX ? "bg-[#fa4616] text-white" : "bg-white/10 text-white/70"
                    }`}
                  >
                    {invertX ? "ON" : "OFF"}
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-[#181b22] border border-white/10 flex items-center justify-between">
                  <div>
                    <div className="font-extrabold text-[13px] text-white">Auto-Jump</div>
                    <div className="text-[11px] text-white/50">Automatically step up blocks</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !autoJump;
                      setAutoJump(next);
                      updateSetting("qb_auto_jump", next);
                    }}
                    className={`px-3 py-1 rounded text-[12px] font-bold cursor-pointer ${
                      autoJump ? "bg-[#fa4616] text-white" : "bg-white/10 text-white/70"
                    }`}
                  >
                    {autoJump ? "ON" : "OFF"}
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-[#181b22] border border-white/10 flex items-center justify-between">
                  <div>
                    <div className="font-extrabold text-[13px] text-white">Held Touch Circle</div>
                    <div className="text-[11px] text-white/50">Translucent circle while holding screen</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !touchCircle;
                      setTouchCircle(next);
                      updateSetting("qb_touch_circle", next);
                    }}
                    className={`px-3 py-1 rounded text-[12px] font-bold cursor-pointer ${
                      touchCircle ? "bg-[#fa4616] text-white" : "bg-white/10 text-white/70"
                    }`}
                  >
                    {touchCircle ? "ON" : "OFF"}
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-[#181b22] border border-white/10 flex items-center justify-between">
                  <div>
                    <div className="font-extrabold text-[13px] text-white">Player Nametags</div>
                    <div className="text-[11px] text-white/50">Show names above players</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !nametags;
                      setNametags(next);
                      updateSetting("qb_show_nametags", next);
                    }}
                    className={`px-3 py-1 rounded text-[12px] font-bold cursor-pointer ${
                      nametags ? "bg-[#fa4616] text-white" : "bg-white/10 text-white/70"
                    }`}
                  >
                    {nametags ? "ON" : "OFF"}
                  </button>
                </div>
              </div>

              {/* Crosshair Selection */}
              <div className="p-4 rounded-xl bg-[#181b22] border border-white/10 space-y-2">
                <div className="font-extrabold text-[13.5px] text-white">Crosshair Style</div>
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
                        updateSetting("qb_crosshair_style", item.id);
                      }}
                      className={`py-2 px-3 rounded-lg font-bold text-[12px] text-center transition cursor-pointer border ${
                        crosshairStyle === item.id
                          ? "bg-[#fa4616] text-white border-[#fa4616]"
                          : "bg-white/5 text-white/70 border-transparent hover:bg-white/10"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* PART 2: GRAPHICS & AUDIO                                        */}
          {/* =============================================================== */}
          {activeTab === "graphics" && (
            <div className="space-y-5">
              <div>
                <h3 className="text-[16px] font-extrabold text-white">Display & Acoustics</h3>
                <p className="text-[12px] text-white/55 mt-0.5">
                  Frame pacing, render distance, audio sliders, and ambient effects.
                </p>
              </div>

              {/* Frame Rate Target */}
              <div className="p-4 rounded-xl bg-[#181b22] border border-white/10 space-y-2">
                <div className="font-extrabold text-[13.5px] text-white">Target Frame Rate</div>
                <div className="text-[11.5px] text-white/55">Pace rendering to prevent device heat and lag spikes</div>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {[
                    { id: "30", label: "30 FPS" },
                    { id: "60", label: "60 FPS" },
                    { id: "uncapped", label: "Max / Native" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setFpsTarget(item.id);
                        updateSetting("qb_fps_target", item.id);
                      }}
                      className={`py-2 px-3 rounded-lg font-bold text-[12px] text-center transition cursor-pointer border ${
                        fpsTarget === item.id
                          ? "bg-[#fa4616] text-white border-[#fa4616]"
                          : "bg-white/5 text-white/70 border-transparent hover:bg-white/10"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Render Distance */}
              <div className="p-4 rounded-xl bg-[#181b22] border border-white/10 space-y-2">
                <div className="font-extrabold text-[13.5px] text-white">Render Distance</div>
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
                        updateSetting("qb_render_distance", item.id);
                      }}
                      className={`py-2 px-3 rounded-lg font-bold text-[12px] text-center transition cursor-pointer border ${
                        renderDistance === item.id
                          ? "bg-[#fa4616] text-white border-[#fa4616]"
                          : "bg-white/5 text-white/70 border-transparent hover:bg-white/10"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Volume Sliders */}
              <div className="p-4 rounded-xl bg-[#181b22] border border-white/10 space-y-4">
                <div className="font-extrabold text-[13.5px] text-white">Audio Levels</div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[12px] font-bold text-white">
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
                      updateSetting("bm-master-vol", v);
                    }}
                    className="w-full accent-[#fa4616] cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[12px] font-bold text-white">
                    <span>Sound Effects (Blocks, Steps, Hits)</span>
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
                      updateSetting("bm-sfx-vol", v);
                    }}
                    className="w-full accent-[#fa4616] cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[12px] font-bold text-white">
                    <span>Background Soundtracks</span>
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
                      updateSetting("bm-music-vol", v);
                    }}
                    className="w-full accent-[#fa4616] cursor-pointer"
                  />
                </div>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                  <div>
                    <div className="font-extrabold text-[13px] text-white">Weather & Ambience</div>
                    <div className="text-[11px] text-white/50">Skyblock breeze and ambient sounds</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !ambientAudio;
                      setAmbientAudio(next);
                      updateSetting("bm-ambient-audio", next);
                    }}
                    className={`px-3 py-1 rounded text-[12px] font-bold cursor-pointer ${
                      ambientAudio ? "bg-[#fa4616] text-white" : "bg-white/10 text-white/70"
                    }`}
                  >
                    {ambientAudio ? "ON" : "OFF"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* PART 3: ACCOUNT & SYSTEM                                        */}
          {/* =============================================================== */}
          {activeTab === "account" && (
            <div className="space-y-5">
              <div>
                <h3 className="text-[16px] font-extrabold text-white">Profile, Cache & State</h3>
                <p className="text-[12px] text-white/55 mt-0.5">
                  Player identity, offline synchronization cache, and session controls.
                </p>
              </div>

              {/* Player Identity */}
              <div className="p-4 rounded-xl bg-[#181b22] border border-white/10 space-y-2">
                <div className="font-extrabold text-[13.5px] text-white">Player Session</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12px] pt-1">
                  <div className="p-2.5 rounded bg-white/5">
                    <span className="text-[10px] uppercase font-bold text-white/50">Display Name</span>
                    <div className="font-extrabold text-[13.5px] text-white mt-0.5">
                      {qbUser?.displayName || "Player"}
                    </div>
                  </div>
                  <div className="p-2.5 rounded bg-white/5">
                    <span className="text-[10px] uppercase font-bold text-white/50">Username</span>
                    <div className="font-extrabold text-[13.5px] text-white mt-0.5">
                      @{qbUser?.username || "adventurer"}
                    </div>
                  </div>
                  <div className="p-2.5 rounded bg-white/5">
                    <span className="text-[10px] uppercase font-bold text-white/50">Player Custom ID</span>
                    <div className="font-mono font-extrabold text-[13px] text-white mt-0.5">
                      {qbUser?.customId || "QB-001"}
                    </div>
                  </div>
                  <div className="p-2.5 rounded bg-white/5">
                    <span className="text-[10px] uppercase font-bold text-white/50">Session Status</span>
                    <div className="font-extrabold text-[13px] text-emerald-400 mt-0.5">
                      Connected Live
                    </div>
                  </div>
                </div>
              </div>

              {/* Offline Cache Sync */}
              <div className="p-4 rounded-xl bg-[#181b22] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-extrabold text-[13.5px] text-white">Offline Cache Storage</div>
                    <div className="text-[11.5px] text-white/55">
                      Friends list, islands, and inventory are saved locally for instant app loading
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/15 text-emerald-400">
                    Active
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    try {
                      const keys = Object.keys(localStorage).filter(
                        (k) => k.startsWith("qb_friends_cache_") || k.startsWith("qb_cache_")
                      );
                      keys.forEach((k) => localStorage.removeItem(k));
                      toast.success("Offline friends and world cache cleared");
                    } catch {
                      toast.error("Failed to clear cache");
                    }
                  }}
                  className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white font-bold text-[12px] transition cursor-pointer"
                >
                  Clear Offline Cache
                </button>
              </div>

              {/* Leave Game Action */}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    window.location.href = "/";
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 font-bold text-[13px] border border-rose-500/30 transition cursor-pointer text-center"
                >
                  Exit to Lobby
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(content, document.body) : null;
}
