"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { collection, query, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";

export const SETTINGS_ASSETS = {
  menu: "https://maxwell.z3ki.dev/bot/_files/menu-icon/menu-icon.png",
  video: "https://maxwell.z3ki.dev/bot/_files/video-icon/video-icon.png",
  smile: "https://maxwell.z3ki.dev/bot/_files/smile-icon/smile-icon.png",
  chat: "https://maxwell.z3ki.dev/bot/_files/chat-icon-83/chat-icon.png",
  arrow: "https://maxwell.z3ki.dev/bot/_files/arrow-icon/arrow-icon.png",
  button: "https://maxwell.z3ki.dev/bot/_files/blank-button/blank-button.png",
};

interface FlatSquareSettingsModalProps {
  onClose: () => void;
  controlsScale?: number;
  onControlsScaleChange?: (scale: number) => void;
}

type SettingTab = "game" | "video" | "controls" | "players";

interface GamePlayerInfo {
  uid: string;
  name: string;
  photo?: string;
  isSelf?: boolean;
}

export function FlatSquareSettingsModal({
  onClose,
  controlsScale: initialControlsScale = 1.0,
  onControlsScaleChange,
}: FlatSquareSettingsModalProps) {
  const { qbUser } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingTab>("game");

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (document.pointerLockElement) {
      try {
        document.exitPointerLock();
      } catch {}
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const [sensitivity, setSensitivity] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("qb_camera_sensitivity");
      return saved ? Number(saved) : 50; // 50 is default 1.0x
    } catch {
      return 50;
    }
  });

  const [soundVolume, setSoundVolume] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("qb_sound_volume");
      return saved ? Number(saved) : 100;
    } catch {
      return 100;
    }
  });

  const [fov, setFov] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("qb_camera_fov");
      return saved ? Number(saved) : 70;
    } catch {
      return 70;
    }
  });

  const [atmosphere, setAtmosphere] = useState<"day" | "golden" | "night">(() => {
    try {
      return (localStorage.getItem("qb_atmosphere") as any) || "day";
    } catch {
      return "day";
    }
  });

  const [fogMode, setFogMode] = useState<"realistic" | "dense" | "subtle" | "off">(() => {
    try {
      return (localStorage.getItem("qb_fog_mode") as any) || "realistic";
    } catch {
      return "realistic";
    }
  });

  // ── Controls Settings State ──
  const [invertY, setInvertY] = useState<boolean>(() => {
    try {
      return localStorage.getItem("qb_invert_y") === "true";
    } catch {
      return false;
    }
  });

  const [hideId, setHideId] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("qb_hide_id");
      return stored === null ? true : stored === "true";
    } catch {
      return true;
    }
  });

  const [firstPerson, setFirstPerson] = useState<boolean>(() => {
    try {
      return localStorage.getItem("qb_first_person") === "true";
    } catch {
      return false;
    }
  });

  const [joystickDeadzone, setJoystickDeadzone] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("qb_joystick_deadzone");
      return saved ? Number(saved) : 10;
    } catch {
      return 10;
    }
  });

  // ── Live Players State ──
  const [playersList, setPlayersList] = useState<GamePlayerInfo[]>([]);

  // Apply sensitivity change
  const handleSensitivityChange = (val: number) => {
    setSensitivity(val);
    try {
      localStorage.setItem("qb_camera_sensitivity", String(val));
    } catch {}
    window.dispatchEvent(new CustomEvent("bm-sensitivity", { detail: val }));
  };

  // Apply sound volume change
  const handleSoundVolumeChange = (val: number) => {
    setSoundVolume(val);
    try {
      localStorage.setItem("qb_sound_volume", String(val));
    } catch {}
    window.dispatchEvent(new CustomEvent("bm-sound-volume", { detail: val }));
  };

  // Apply FOV change
  const handleFovChange = (val: number) => {
    setFov(val);
    try {
      localStorage.setItem("qb_camera_fov", String(val));
    } catch {}
    window.dispatchEvent(new CustomEvent("bm-fov", { detail: val }));
  };

  // Apply Invert Y
  const handleInvertYToggle = () => {
    const next = !invertY;
    setInvertY(next);
    try {
      localStorage.setItem("qb_invert_y", String(next));
    } catch {}
    window.dispatchEvent(new CustomEvent("bm-invert-y", { detail: next }));
  };

  // Apply Hide ID
  const handleHideIdToggle = () => {
    const next = !hideId;
    setHideId(next);
    try {
      localStorage.setItem("qb_hide_id", String(next));
    } catch {}
    window.dispatchEvent(new CustomEvent("bm-hide-id", { detail: next }));
  };

  // Apply First Person
  const handleFirstPersonToggle = () => {
    const next = !firstPerson;
    setFirstPerson(next);
    try {
      localStorage.setItem("qb_first_person", String(next));
    } catch {}
    window.dispatchEvent(new CustomEvent("bm-first-person", { detail: next }));
  };

  // Apply Motion Blur Toggle
  const [motionBlur, setMotionBlur] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("qb_motion_blur");
      return stored === null ? true : stored === "true";
    } catch {
      return true;
    }
  });

  const handleMotionBlurToggle = () => {
    const next = !motionBlur;
    setMotionBlur(next);
    try {
      localStorage.setItem("qb_motion_blur", String(next));
    } catch {}
    window.dispatchEvent(new CustomEvent("bm-motion-blur", { detail: next }));
  };

  // Apply Controls scale change
  const handleControlsScaleSlider = (val: number) => {
    onControlsScaleChange?.(val);
    try {
      localStorage.setItem("qb_controls_scale", String(val));
    } catch {}
    window.dispatchEvent(new CustomEvent("bm-controls-scale", { detail: val }));
  };

  // Apply Atmosphere (Day / Golden Hour / Night)
  const handleAtmosphereChange = (mode: "day" | "golden" | "night") => {
    setAtmosphere(mode);
    try {
      localStorage.setItem("qb_atmosphere", mode);
    } catch {}
    window.dispatchEvent(new CustomEvent("bm-atmosphere", { detail: mode }));
  };

  // Apply Realistic Fog Setting
  const handleFogChange = (mode: "realistic" | "dense" | "subtle" | "off") => {
    setFogMode(mode);
    try {
      localStorage.setItem("qb_fog_mode", mode);
    } catch {}
    window.dispatchEvent(new CustomEvent("bm-fog-mode", { detail: mode }));
    window.dispatchEvent(new CustomEvent("bm-fog", { detail: mode !== "off" }));
  };

  // Reset controls to default
  const handleResetControls = () => {
    handleControlsScaleSlider(1.0);
    setJoystickDeadzone(10);
    try {
      localStorage.setItem("qb_joystick_deadzone", "10");
    } catch {}
    if (invertY) handleInvertYToggle();
  };

  // Fetch / listen to players in this game
  useEffect(() => {
    const myUid =
      qbUser?.uid ||
      localStorage.getItem("qb_guest_id") ||
      "guest_local";
    const myName =
      qbUser?.displayName || qbUser?.username || "You (Player)";
    const myPhoto = qbUser?.profilePhoto || "";

    const selfPlayer: GamePlayerInfo = {
      uid: myUid,
      name: myName,
      photo: myPhoto,
      isSelf: true,
    };

    const map = new Map<string, GamePlayerInfo>();
    map.set(myUid, selfPlayer);

    // Also listen to active presence in sandboxPlayers & skyblock_players
    try {
      const q1 = query(collection(db, "sandboxPlayers"), limit(20));
      const unsub1 = onSnapshot(
        q1,
        (snap) => {
          snap.docs.forEach((docSnap) => {
            const data = docSnap.data();
            const uid = data.uid || docSnap.id;
            if (uid && uid !== myUid) {
              map.set(uid, {
                uid,
                name: data.name || data.username || "Player " + uid.slice(-4),
                photo: data.photo || data.profilePhoto,
                isSelf: false,
              });
            }
          });
          setPlayersList(Array.from(map.values()));
        },
        () => {
          setPlayersList(Array.from(map.values()));
        }
      );

      const q2 = query(collection(db, "skyblock_players"), limit(20));
      const unsub2 = onSnapshot(
        q2,
        (snap) => {
          snap.docs.forEach((docSnap) => {
            const data = docSnap.data();
            const uid = data.uid || docSnap.id;
            if (uid && uid !== myUid) {
              map.set(uid, {
                uid,
                name: data.name || data.username || "Player " + uid.slice(-4),
                photo: data.profilePhoto || data.photo,
                isSelf: false,
              });
            }
          });
          setPlayersList(Array.from(map.values()));
        },
        () => {
          setPlayersList(Array.from(map.values()));
        }
      );

      return () => {
        unsub1();
        unsub2();
      };
    } catch {
      setPlayersList([selfPlayer]);
    }
  }, [qbUser]);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      id="flat-square-settings-fullscreen"
      className="fixed inset-0 z-[99999] pointer-events-auto flex flex-col bg-white text-black select-none overflow-hidden pb-[env(safe-area-inset-bottom)]"
      style={{ borderRadius: 0 }}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      {/* ── Top Header with Hosted PNG Assets ── */}
      <div
        className="h-16 shrink-0 px-4 sm:px-6 flex items-center justify-between bg-[#15181e] border-b border-white/10"
      >
        <div className="flex items-center gap-3">
          {/* Menu button icon badge */}
          <div className="w-14 h-14 flex items-center justify-center shrink-0">
            <img
              src={SETTINGS_ASSETS.menu}
              alt=""
              className="w-full h-full object-contain pointer-events-none drop-shadow-md select-none"
              draggable={false}
            />
          </div>
          <div>
            <h1 className="text-[18px] font-black tracking-wide text-white uppercase leading-none">
              Game Settings
            </h1>
            <p className="text-[11px] text-white/50 mt-1">
              Customize controls, video camera, sound, and player preferences
            </p>
          </div>
        </div>

        {/* Close button with blank-button background */}
        <button
          id="btn-settings-modal-close"
          type="button"
          onClick={onClose}
          className="relative w-11 h-11 flex items-center justify-center p-0 border-0 bg-transparent cursor-pointer select-none active:scale-90 transition-transform outline-none"
          aria-label="Close settings"
          title="Close settings"
        >
          <img
            src={SETTINGS_ASSETS.button}
            alt=""
            className="w-full h-full object-contain pointer-events-none drop-shadow-md select-none"
            draggable={false}
          />
          <span className="absolute inset-0 flex items-center justify-center text-white text-xl font-black drop-shadow-sm select-none">
            ✕
          </span>
        </button>
      </div>

      {/* ── Main Body: Side Nav with 4 tabs + Content Area ── */}
      <div className="flex-1 flex min-h-0 overflow-hidden bg-[#0d1015]">
        {/* ── Left Sidebar (Game, Video, Controls, Players) ── */}
        <div
          className="w-40 sm:w-56 shrink-0 bg-[#161a22] border-r border-white/10 p-3 sm:p-4 flex flex-col gap-2 overflow-y-auto"
        >
          {/* Tab 1: Game (with Menu Icon) */}
          <button
            id="btn-settings-tab-game"
            type="button"
            onClick={() => setActiveTab("game")}
            className={`w-full p-2 rounded-xl flex items-center gap-2.5 text-left text-[13px] sm:text-[14px] font-extrabold tracking-wide transition-all cursor-pointer select-none outline-none border ${
              activeTab === "game"
                ? "bg-white/15 text-white border-white/30 shadow-sm"
                : "bg-white/5 text-white/70 border-white/5 hover:bg-white/10 hover:text-white"
            }`}
          >
            <div className="w-9 h-9 shrink-0 flex items-center justify-center">
              <img
                src={SETTINGS_ASSETS.menu}
                alt=""
                className="w-full h-full object-contain pointer-events-none drop-shadow"
                draggable={false}
              />
            </div>
            <span>Game</span>
          </button>

          {/* Tab 2: Video / Camera (with Video Icon) */}
          <button
            id="btn-settings-tab-video"
            type="button"
            onClick={() => setActiveTab("video")}
            className={`w-full p-2 rounded-xl flex items-center gap-2.5 text-left text-[13px] sm:text-[14px] font-extrabold tracking-wide transition-all cursor-pointer select-none outline-none border ${
              activeTab === "video"
                ? "bg-white/15 text-white border-white/30 shadow-sm"
                : "bg-white/5 text-white/70 border-white/5 hover:bg-white/10 hover:text-white"
            }`}
          >
            <div className="w-9 h-9 shrink-0 flex items-center justify-center">
              <img
                src={SETTINGS_ASSETS.video}
                alt=""
                className="w-full h-full object-contain pointer-events-none drop-shadow"
                draggable={false}
              />
            </div>
            <span>Video</span>
          </button>

          {/* Tab 3: Controls (with Arrow Icon) */}
          <button
            id="btn-settings-tab-controls"
            type="button"
            onClick={() => setActiveTab("controls")}
            className={`w-full p-2 rounded-xl flex items-center gap-2.5 text-left text-[13px] sm:text-[14px] font-extrabold tracking-wide transition-all cursor-pointer select-none outline-none border ${
              activeTab === "controls"
                ? "bg-white/15 text-white border-white/30 shadow-sm"
                : "bg-white/5 text-white/70 border-white/5 hover:bg-white/10 hover:text-white"
            }`}
          >
            <div className="w-9 h-9 shrink-0 flex items-center justify-center">
              <img
                src={SETTINGS_ASSETS.arrow}
                alt=""
                className="w-full h-full object-contain pointer-events-none drop-shadow"
                draggable={false}
              />
            </div>
            <span>Controls</span>
          </button>

          {/* Tab 4: Players & Chat (with Chat Icon) */}
          <button
            id="btn-settings-tab-players"
            type="button"
            onClick={() => setActiveTab("players")}
            className={`w-full p-2 rounded-xl flex items-center gap-2.5 text-left text-[13px] sm:text-[14px] font-extrabold tracking-wide transition-all cursor-pointer select-none outline-none border ${
              activeTab === "players"
                ? "bg-white/15 text-white border-white/30 shadow-sm"
                : "bg-white/5 text-white/70 border-white/5 hover:bg-white/10 hover:text-white"
            }`}
          >
            <div className="w-9 h-9 shrink-0 flex items-center justify-center">
              <img
                src={SETTINGS_ASSETS.chat}
                alt=""
                className="w-full h-full object-contain pointer-events-none drop-shadow"
                draggable={false}
              />
            </div>
            <span>Players</span>
          </button>
        </div>

        {/* ── Right Content Area ── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-7 text-white">
          {/* ═════════ TAB 1: GAME ═════════ */}
          {activeTab === "game" && (
            <div className="max-w-xl space-y-5">
              <div className="border-b border-white/10 pb-3 flex items-center gap-3.5">
                <div className="w-14 h-14 shrink-0 flex items-center justify-center">
                  <img src={SETTINGS_ASSETS.menu} alt="" className="w-full h-full object-contain drop-shadow-md" />
                </div>
                <div>
                  <h2 className="text-[19px] font-black uppercase tracking-wider text-white">
                    Game Preferences
                  </h2>
                  <p className="text-[12px] text-white/50">
                    Adjust camera look sensitivity, master volume, and nametag privacy.
                  </p>
                </div>
              </div>

              {/* Look Sensitivity */}
              <div className="p-4 bg-white/[0.04] border border-white/10 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-bold text-white">
                    Look Sensitivity
                  </span>
                  <span className="text-[12px] font-mono font-bold text-amber-300 bg-white/10 px-2 py-0.5 rounded-lg border border-white/10">
                    {(sensitivity / 50).toFixed(1)}x ({sensitivity}%)
                  </span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={150}
                  step={5}
                  value={sensitivity}
                  onChange={(e) => handleSensitivityChange(Number(e.target.value))}
                  className="w-full h-2.5 bg-white/20 accent-amber-400 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[11px] font-mono text-white/40">
                  <span>Slow (0.2x)</span>
                  <span>Default (1.0x)</span>
                  <span>Fast (3.0x)</span>
                </div>
              </div>

              {/* Max Sound / Volume */}
              <div className="p-4 bg-white/[0.04] border border-white/10 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-bold text-white">
                    Master Volume
                  </span>
                  <span className="text-[12px] font-mono font-bold text-emerald-400 bg-white/10 px-2 py-0.5 rounded-lg border border-white/10">
                    {soundVolume}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={soundVolume}
                  onChange={(e) => handleSoundVolumeChange(Number(e.target.value))}
                  className="w-full h-2.5 bg-white/20 accent-emerald-400 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[11px] font-mono text-white/40">
                  <span>Mute (0%)</span>
                  <span>50%</span>
                  <span>Max (100%)</span>
                </div>
              </div>

              {/* Hide Player ID Toggle */}
              <div className="p-4 bg-white/[0.04] border border-white/10 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[14px] font-bold text-white block">
                    Hide Player ID
                  </span>
                  <span className="text-[12px] text-white/50">
                    Hides the unique player ID on nametags and player lists
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleHideIdToggle}
                  className={`h-9 px-4 font-mono font-bold text-[13px] rounded-xl cursor-pointer select-none transition-all ${
                    hideId
                      ? "bg-amber-400 text-black font-black shadow-md"
                      : "bg-white/10 text-white/70 hover:bg-white/20 border border-white/15"
                  }`}
                >
                  {hideId ? "ON" : "OFF"}
                </button>
              </div>
            </div>
          )}

          {/* ═════════ TAB 2: VIDEO / CAMERA ═════════ */}
          {activeTab === "video" && (
            <div className="max-w-xl space-y-5">
              <div className="border-b border-white/10 pb-3 flex items-center gap-3.5">
                <div className="w-14 h-14 shrink-0 flex items-center justify-center">
                  <img src={SETTINGS_ASSETS.video} alt="" className="w-full h-full object-contain drop-shadow-md" />
                </div>
                <div>
                  <h2 className="text-[19px] font-black uppercase tracking-wider text-white">
                    Video & Camera Settings
                  </h2>
                  <p className="text-[12px] text-white/50">
                    Switch perspectives, adjust Field of View (FOV), and display options.
                  </p>
                </div>
              </div>

              {/* First Person / Third Person Toggle */}
              <div className="p-4 bg-white/[0.04] border border-white/10 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[14px] font-bold text-white block">
                    Motion Blur
                  </span>
                  <span className="text-[12px] text-white/50">
                    Enable cinematic camera motion blur
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleMotionBlurToggle}
                  className={`h-9 px-4 font-mono font-bold text-[13px] rounded-xl cursor-pointer select-none transition-all ${
                    motionBlur
                      ? "bg-amber-400 text-black font-black shadow-md"
                      : "bg-white/10 text-white/70 hover:bg-white/20 border border-white/15"
                  }`}
                >
                  {motionBlur ? "ON" : "OFF"}
                </button>
              </div>

              {/* First Person / Third Person Toggle */}
              <div className="p-4 bg-white/[0.04] border border-white/10 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[14px] font-bold text-white block">
                    First Person Camera
                  </span>
                  <span className="text-[12px] text-white/50">
                    Toggle between immersive 1st person and 3rd person perspective
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleFirstPersonToggle}
                  className={`h-9 px-4 font-mono font-bold text-[13px] rounded-xl cursor-pointer select-none transition-all ${
                    firstPerson
                      ? "bg-sky-400 text-black font-black shadow-md"
                      : "bg-white/10 text-white/70 hover:bg-white/20 border border-white/15"
                  }`}
                >
                  {firstPerson ? "1ST PERSON" : "3RD PERSON"}
                </button>
              </div>

              {/* Field of View (FOV) */}
              <div className="p-4 bg-white/[0.04] border border-white/10 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-bold text-white">
                    Field of View (FOV)
                  </span>
                  <span className="text-[12px] font-mono font-bold text-sky-300 bg-white/10 px-2 py-0.5 rounded-lg border border-white/10">
                    {fov}°
                  </span>
                </div>
                <input
                  type="range"
                  min={60}
                  max={95}
                  step={5}
                  value={fov}
                  onChange={(e) => handleFovChange(Number(e.target.value))}
                  className="w-full h-2.5 bg-white/20 accent-sky-400 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[11px] font-mono text-white/40">
                  <span>Narrow (60°)</span>
                  <span>Standard (70°)</span>
                  <span>Wide (95°)</span>
                </div>
              </div>

              {/* Atmosphere / Time of Day */}
              <div className="p-4 bg-white/[0.04] border border-white/10 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-bold text-white">
                    Atmosphere & Lighting
                  </span>
                  <span className="text-[12px] font-mono font-bold text-amber-300 bg-white/10 px-2 py-0.5 rounded-lg border border-white/10">
                    {atmosphere === "day" ? "Normal Day" : atmosphere === "golden" ? "Golden Hour" : "Night Sky"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleAtmosphereChange("day")}
                    className={`py-2 px-2 rounded-xl text-[12px] font-bold tracking-tight transition-all border ${
                      atmosphere === "day"
                        ? "bg-sky-400 text-black border-sky-300 shadow-md"
                        : "bg-white/10 text-white/70 border-white/15 hover:bg-white/20"
                    }`}
                  >
                    ☀️ Normal Day
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAtmosphereChange("golden")}
                    className={`py-2 px-2 rounded-xl text-[12px] font-bold tracking-tight transition-all border ${
                      atmosphere === "golden"
                        ? "bg-gradient-to-r from-amber-400 to-orange-400 text-black font-black border-amber-300 shadow-md"
                        : "bg-white/10 text-white/70 border-white/15 hover:bg-white/20"
                    }`}
                  >
                    🌅 Golden Hour
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAtmosphereChange("night")}
                    className={`py-2 px-2 rounded-xl text-[12px] font-bold tracking-tight transition-all border ${
                      atmosphere === "night"
                        ? "bg-indigo-500 text-white font-black border-indigo-400 shadow-md"
                        : "bg-white/10 text-white/70 border-white/15 hover:bg-white/20"
                    }`}
                  >
                    🌙 Night Sky
                  </button>
                </div>
              </div>

              {/* Realistic Near Fog */}
              <div className="p-4 bg-white/[0.04] border border-white/10 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-bold text-white">
                    Atmospheric Fog
                  </span>
                  <span className="text-[12px] font-mono font-bold text-sky-300 bg-white/10 px-2 py-0.5 rounded-lg border border-white/10">
                    {fogMode === "realistic"
                      ? "Near Realistic (12m)"
                      : fogMode === "dense"
                      ? "Dense Mist (6m)"
                      : fogMode === "subtle"
                      ? "Subtle (22m)"
                      : "Off"}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => handleFogChange("realistic")}
                    className={`py-2 px-1 rounded-xl text-[12px] font-bold tracking-tight transition-all border text-center ${
                      fogMode === "realistic"
                        ? "bg-sky-400 text-black border-sky-300 shadow-md font-black"
                        : "bg-white/10 text-white/70 border-white/15 hover:bg-white/20"
                    }`}
                  >
                    🌫️ Realistic
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFogChange("dense")}
                    className={`py-2 px-1 rounded-xl text-[12px] font-bold tracking-tight transition-all border text-center ${
                      fogMode === "dense"
                        ? "bg-sky-400 text-black border-sky-300 shadow-md font-black"
                        : "bg-white/10 text-white/70 border-white/15 hover:bg-white/20"
                    }`}
                  >
                    🌁 Dense
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFogChange("subtle")}
                    className={`py-2 px-1 rounded-xl text-[12px] font-bold tracking-tight transition-all border text-center ${
                      fogMode === "subtle"
                        ? "bg-sky-400 text-black border-sky-300 shadow-md font-black"
                        : "bg-white/10 text-white/70 border-white/15 hover:bg-white/20"
                    }`}
                  >
                    🌤️ Subtle
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFogChange("off")}
                    className={`py-2 px-1 rounded-xl text-[12px] font-bold tracking-tight transition-all border text-center ${
                      fogMode === "off"
                        ? "bg-white/30 text-white border-white/40 shadow-md font-black"
                        : "bg-white/10 text-white/70 border-white/15 hover:bg-white/20"
                    }`}
                  >
                    🚫 Off
                  </button>
                </div>
                <p className="text-[11px] text-white/40">
                  Volumetric atmospheric mist wraps nearby floating islands and soft-blends distant horizons.
                </p>
              </div>
            </div>
          )}

          {/* ═════════ TAB 3: CONTROLS & LIVE BUTTON PREVIEW ═════════ */}
          {activeTab === "controls" && (
            <div className="max-w-xl space-y-5">
              <div className="border-b border-white/10 pb-3 flex items-center gap-3.5">
                <div className="w-14 h-14 shrink-0 flex items-center justify-center">
                  <img src={SETTINGS_ASSETS.arrow} alt="" className="w-full h-full object-contain drop-shadow-md" />
                </div>
                <div>
                  <h2 className="text-[19px] font-black uppercase tracking-wider text-white">
                    Controls & Button Customization
                  </h2>
                  <p className="text-[12px] text-white/50">
                    Resize and customize on-screen buttons, joystick, and touch behavior.
                  </p>
                </div>
              </div>

              {/* Live Interactive Preview Box of Buttons */}
              <div className="p-4 bg-white/[0.03] border border-white/15 rounded-2xl">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-amber-300">
                    Live Button Layout Preview
                  </span>
                  <span className="text-[11px] text-white/40">
                    Hosted PNG Button Assets
                  </span>
                </div>

                {/* Preview Frame */}
                <div className="relative w-full h-44 rounded-xl bg-gradient-to-b from-[#11141a] to-[#0a0c10] border border-white/10 p-3 overflow-hidden flex flex-col justify-between select-none">
                  {/* Top Bar Preview: [Menu] [Chat] [Smile] [Video] */}
                  <div className="flex items-center gap-2">
                    {/* Menu */}
                    <div className="relative w-9 h-9 shrink-0 flex items-center justify-center">
                      <img src={SETTINGS_ASSETS.button} alt="" className="w-full h-full object-contain drop-shadow" />
                      <img src={SETTINGS_ASSETS.menu} alt="" className="absolute inset-0 w-full h-full object-contain p-1.5 drop-shadow" />
                    </div>
                    {/* Chat */}
                    <div className="relative w-9 h-9 shrink-0 flex items-center justify-center">
                      <img src={SETTINGS_ASSETS.button} alt="" className="w-full h-full object-contain drop-shadow" />
                      <img src={SETTINGS_ASSETS.chat} alt="" className="absolute inset-0 w-full h-full object-contain p-1.5 drop-shadow" />
                    </div>
                    {/* Smile */}
                    <div className="relative w-9 h-9 shrink-0 flex items-center justify-center">
                      <img src={SETTINGS_ASSETS.button} alt="" className="w-full h-full object-contain drop-shadow" />
                      <img src={SETTINGS_ASSETS.smile} alt="" className="absolute inset-0 w-full h-full object-contain p-1.5 drop-shadow" />
                    </div>
                    {/* Video */}
                    <div className="relative w-9 h-9 shrink-0 flex items-center justify-center">
                      <img src={SETTINGS_ASSETS.button} alt="" className="w-full h-full object-contain drop-shadow" />
                      <img src={SETTINGS_ASSETS.video} alt="" className="absolute inset-0 w-full h-full object-contain p-1.5 drop-shadow" />
                    </div>
                  </div>

                  {/* Bottom Row: D-Pad (Left) and Jump/Action (Right) scaled */}
                  <div className="flex items-end justify-between w-full">
                    {/* D-Pad Preview */}
                    <div
                      className="grid grid-cols-3 grid-rows-3 gap-0.5 w-24 h-24 origin-bottom-left transition-transform"
                      style={{ transform: `scale(${Math.min(1.2, Math.max(0.7, controlsScale * 0.75))})` }}
                    >
                      <div />
                      {/* Up */}
                      <div className="relative w-full h-full flex items-center justify-center">
                        <img src={SETTINGS_ASSETS.button} alt="" className="w-full h-full object-contain" />
                        <img src={SETTINGS_ASSETS.arrow} alt="" className="absolute inset-0 w-full h-full object-contain p-1" />
                      </div>
                      <div />

                      {/* Left */}
                      <div className="relative w-full h-full flex items-center justify-center">
                        <img src={SETTINGS_ASSETS.button} alt="" className="w-full h-full object-contain" />
                        <img src={SETTINGS_ASSETS.arrow} alt="" className="absolute inset-0 w-full h-full object-contain p-1 -rotate-90" />
                      </div>
                      <div className="flex items-center justify-center opacity-30">
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      </div>
                      {/* Right */}
                      <div className="relative w-full h-full flex items-center justify-center">
                        <img src={SETTINGS_ASSETS.button} alt="" className="w-full h-full object-contain" />
                        <img src={SETTINGS_ASSETS.arrow} alt="" className="absolute inset-0 w-full h-full object-contain p-1 rotate-90" />
                      </div>

                      <div />
                      {/* Down */}
                      <div className="relative w-full h-full flex items-center justify-center">
                        <img src={SETTINGS_ASSETS.button} alt="" className="w-full h-full object-contain" />
                        <img src={SETTINGS_ASSETS.arrow} alt="" className="absolute inset-0 w-full h-full object-contain p-1 rotate-180" />
                      </div>
                      <div />
                    </div>

                    {/* Jump / Action Button Preview */}
                    <div
                      className="flex flex-col items-center gap-1.5 origin-bottom-right transition-transform"
                      style={{ transform: `scale(${Math.min(1.2, Math.max(0.7, controlsScale * 0.8))})` }}
                    >
                      <div className="relative w-11 h-11 flex items-center justify-center">
                        <img src={SETTINGS_ASSETS.button} alt="Jump" className="w-full h-full object-contain drop-shadow-md" />
                      </div>
                      <div className="relative w-10 h-10 flex items-center justify-center">
                        <img src={SETTINGS_ASSETS.button} alt="Action" className="w-full h-full object-contain drop-shadow-md" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Resize Controls Slider */}
              <div className="p-4 bg-white/[0.04] border border-white/10 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[14px] font-bold text-white block">
                      Resize Controls Size
                    </span>
                    <span className="text-[12px] text-white/50">
                      Scales D-pad, joystick, and action buttons on screen
                    </span>
                  </div>
                  <span className="text-[12px] font-mono font-bold text-amber-300 bg-white/10 px-2.5 py-1 rounded-lg border border-white/10">
                    {Math.round(controlsScale * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.7}
                  max={1.5}
                  step={0.05}
                  value={controlsScale}
                  onChange={(e) => handleControlsScaleSlider(Number(e.target.value))}
                  className="w-full h-2.5 bg-white/20 accent-amber-400 rounded-lg cursor-pointer mt-2"
                />
                <div className="flex justify-between text-[11px] font-mono text-white/40">
                  <span>Compact (70%)</span>
                  <span>Default (100%)</span>
                  <span>Large (150%)</span>
                </div>
              </div>

              {/* Invert Look Y-Axis */}
              <div className="p-4 bg-white/[0.04] border border-white/10 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[14px] font-bold text-white block">
                    Invert Look Y-Axis
                  </span>
                  <span className="text-[12px] text-white/50">
                    Reverse vertical pitch drag direction
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleInvertYToggle}
                  className={`h-9 px-4 font-mono font-bold text-[13px] rounded-xl cursor-pointer select-none transition-all ${
                    invertY
                      ? "bg-amber-400 text-black font-black shadow-md"
                      : "bg-white/10 text-white/70 hover:bg-white/20 border border-white/15"
                  }`}
                >
                  {invertY ? "ON" : "OFF"}
                </button>
              </div>

              {/* Joystick Deadzone */}
              <div className="p-4 bg-white/[0.04] border border-white/10 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-bold text-white">
                    Joystick Deadzone
                  </span>
                  <span className="text-[12px] font-mono font-bold text-white bg-white/10 px-2 py-0.5 rounded-lg border border-white/10">
                    {joystickDeadzone}%
                  </span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={30}
                  step={5}
                  value={joystickDeadzone}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setJoystickDeadzone(v);
                    try {
                      localStorage.setItem("qb_joystick_deadzone", String(v));
                    } catch {}
                  }}
                  className="w-full h-2.5 bg-white/20 accent-amber-400 rounded-lg cursor-pointer"
                />
              </div>

              {/* Reset Controls Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleResetControls}
                  className="w-full h-11 bg-white/10 hover:bg-white/15 active:scale-[0.99] text-white font-extrabold text-[13px] uppercase tracking-wider rounded-xl border border-white/15 cursor-pointer select-none transition-all"
                >
                  Reset Controls to Default (100%)
                </button>
              </div>
            </div>
          )}

          {/* ═════════ TAB 4: PLAYERS ═════════ */}
          {activeTab === "players" && (
            <div className="max-w-2xl space-y-5">
              <div className="border-b border-white/10 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 shrink-0 flex items-center justify-center">
                    <img src={SETTINGS_ASSETS.chat} alt="" className="w-full h-full object-contain drop-shadow-md" />
                  </div>
                  <div>
                    <h2 className="text-[19px] font-black uppercase tracking-wider text-white">
                      Players in Session
                    </h2>
                    <p className="text-[12px] text-white/50">
                      Players currently present in this game world.
                    </p>
                  </div>
                </div>
                <span className="text-[12px] font-mono font-bold text-amber-300 bg-white/10 px-3 py-1 rounded-xl border border-white/10">
                  {playersList.length} {playersList.length === 1 ? "PLAYER" : "PLAYERS"}
                </span>
              </div>

              {/* Player List */}
              <div className="space-y-2.5">
                {playersList.map((p) => (
                  <div
                    key={p.uid}
                    className="w-full p-3.5 bg-white/[0.04] border border-white/10 rounded-2xl flex items-center gap-3.5 transition-colors hover:bg-white/[0.07]"
                  >
                    {/* Square Player photo */}
                    <div className="w-11 h-11 shrink-0 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center overflow-hidden">
                      {p.photo ? (
                        <img
                          src={p.photo}
                          alt=""
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="text-[16px] font-black text-white/80">
                          {p.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Player Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[15px] font-bold text-white tracking-wide truncate">
                          {p.name}
                        </span>
                        {p.isSelf && (
                          <span className="px-1.5 py-0.5 text-[10px] font-mono font-extrabold bg-amber-400/20 text-amber-300 border border-amber-400/40 rounded-md">
                            YOU
                          </span>
                        )}
                      </div>

                      {!hideId && (
                        <div className="text-[11px] font-mono text-white/50 mt-0.5 truncate">
                          ID: {p.uid}
                        </div>
                      )}
                    </div>

                    {/* Online status badge */}
                    <div className="shrink-0 text-right">
                      <span className="px-2.5 py-1 text-[10px] font-mono font-black tracking-wider text-emerald-400 bg-emerald-400/10 border border-emerald-400/30 rounded-lg uppercase">
                        ONLINE
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
