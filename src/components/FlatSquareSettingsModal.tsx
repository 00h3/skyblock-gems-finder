"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { collection, query, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";

interface FlatSquareSettingsModalProps {
  onClose: () => void;
  controlsScale: number;
  onControlsScaleChange: (scale: number) => void;
}

type SettingTab = "game" | "controls" | "players";

interface GamePlayerInfo {
  uid: string;
  name: string;
  photo?: string;
  isSelf?: boolean;
}

export function FlatSquareSettingsModal({
  onClose,
  controlsScale,
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
      return saved ? Number(saved) : 75;
    } catch {
      return 75;
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

  // Apply Controls scale change
  const handleControlsScaleSlider = (val: number) => {
    onControlsScaleChange(val);
    try {
      localStorage.setItem("qb_controls_scale", String(val));
    } catch {}
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
      className="fixed inset-0 z-[99999] pointer-events-auto flex flex-col bg-[#747474] text-white select-none overflow-hidden"
      style={{ borderRadius: 0 }}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      {/* ── Top Header: Flat, Square, Grey ── */}
      <div
        className="h-14 shrink-0 px-4 sm:px-6 flex items-center justify-between bg-[#636363] border-b-2 border-[#505050]"
        style={{ borderRadius: 0 }}
      >
        <span className="text-[17px] font-bold tracking-wider text-white uppercase">
          Settings
        </span>

        {/* Flat square close button */}
        <button
          id="btn-settings-modal-close"
          type="button"
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center bg-[#7c7c7c] hover:bg-[#686868] active:bg-[#4f4f4f] text-white text-[22px] font-bold cursor-pointer select-none transition-colors border-[1.5px] border-[#505050] outline-none"
          style={{ borderRadius: 0 }}
          aria-label="Close settings"
          title="Close settings"
        >
          ×
        </button>
      </div>

      {/* ── Main Body: Side Nav with 3 voci + Content Area ── */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* ── Left Sidebar (3 voci: Game, Controls, Players) ── */}
        <div
          className="w-36 sm:w-52 shrink-0 bg-[#636363] border-r-2 border-[#505050] p-3 sm:p-4 flex flex-col gap-2.5 overflow-y-auto"
          style={{ borderRadius: 0 }}
        >
          {/* Voce 1: Game */}
          <button
            id="btn-settings-tab-game"
            type="button"
            onClick={() => setActiveTab("game")}
            className={`w-full h-12 px-4 flex items-center text-left text-[14px] sm:text-[15px] font-bold tracking-wide transition-colors cursor-pointer select-none outline-none border-[1.5px] ${
              activeTab === "game"
                ? "bg-[#4e4e4e] text-white border-[#383838]"
                : "bg-[#757575] text-white/80 border-[#5a5a5a] hover:bg-[#686868]"
            }`}
            style={{ borderRadius: 0 }}
          >
            Game
          </button>

          {/* Voce 2: Controls */}
          <button
            id="btn-settings-tab-controls"
            type="button"
            onClick={() => setActiveTab("controls")}
            className={`w-full h-12 px-4 flex items-center text-left text-[14px] sm:text-[15px] font-bold tracking-wide transition-colors cursor-pointer select-none outline-none border-[1.5px] ${
              activeTab === "controls"
                ? "bg-[#4e4e4e] text-white border-[#383838]"
                : "bg-[#757575] text-white/80 border-[#5a5a5a] hover:bg-[#686868]"
            }`}
            style={{ borderRadius: 0 }}
          >
            Controls
          </button>

          {/* Voce 3: Players */}
          <button
            id="btn-settings-tab-players"
            type="button"
            onClick={() => setActiveTab("players")}
            className={`w-full h-12 px-4 flex items-center text-left text-[14px] sm:text-[15px] font-bold tracking-wide transition-colors cursor-pointer select-none outline-none border-[1.5px] ${
              activeTab === "players"
                ? "bg-[#4e4e4e] text-white border-[#383838]"
                : "bg-[#757575] text-white/80 border-[#5a5a5a] hover:bg-[#686868]"
            }`}
            style={{ borderRadius: 0 }}
          >
            Players
          </button>
        </div>

        {/* ── Right Content Area ── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-7 bg-[#6a6a6a]">
          {/* ═════════ TAB 1: GAME ═════════ */}
          {activeTab === "game" && (
            <div className="max-w-xl space-y-6">
              <div className="border-b border-white/15 pb-2">
                <h2 className="text-[18px] font-bold uppercase tracking-wider text-white">
                  Game Settings
                </h2>
                <p className="text-[13px] text-white/60 mt-0.5">
                  Adjust sensitivity, maximum sound, and visual settings.
                </p>
              </div>

              {/* Look Sensitivity */}
              <div
                className="p-4 bg-[#5c5c5c] border-[1.5px] border-[#4c4c4c] space-y-2"
                style={{ borderRadius: 0 }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-bold tracking-wide text-white">
                    Look Sensitivity
                  </span>
                  <span className="text-[13px] font-mono font-bold text-[#facc15] bg-[#4a4a4a] px-2 py-0.5 border border-[#3c3c3c]">
                    {(sensitivity / 50).toFixed(1)}x ({sensitivity}%)
                  </span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={150}
                  step={5}
                  value={sensitivity}
                  onChange={(e) =>
                    handleSensitivityChange(Number(e.target.value))
                  }
                  className="w-full h-3 bg-[#444444] accent-[#7c7c7c] cursor-pointer"
                  style={{ borderRadius: 0 }}
                />
                <div className="flex justify-between text-[11px] font-mono text-white/50">
                  <span>Slow (0.2x)</span>
                  <span>Default (1.0x)</span>
                  <span>Fast (3.0x)</span>
                </div>
              </div>

              {/* Max Sound / Volume */}
              <div
                className="p-4 bg-[#5c5c5c] border-[1.5px] border-[#4c4c4c] space-y-2"
                style={{ borderRadius: 0 }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-bold tracking-wide text-white">
                    Max Sound / Volume
                  </span>
                  <span className="text-[13px] font-mono font-bold text-[#a3e635] bg-[#4a4a4a] px-2 py-0.5 border border-[#3c3c3c]">
                    {soundVolume}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={soundVolume}
                  onChange={(e) =>
                    handleSoundVolumeChange(Number(e.target.value))
                  }
                  className="w-full h-3 bg-[#444444] accent-[#7c7c7c] cursor-pointer"
                  style={{ borderRadius: 0 }}
                />
                <div className="flex justify-between text-[11px] font-mono text-white/50">
                  <span>Mute (0%)</span>
                  <span>50%</span>
                  <span>Max (100%)</span>
                </div>
              </div>

              {/* Field of View (FOV) */}
              <div
                className="p-4 bg-[#5c5c5c] border-[1.5px] border-[#4c4c4c] space-y-2"
                style={{ borderRadius: 0 }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-bold tracking-wide text-white">
                    Field of View (FOV)
                  </span>
                  <span className="text-[13px] font-mono font-bold text-white bg-[#4a4a4a] px-2 py-0.5 border border-[#3c3c3c]">
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
                  className="w-full h-3 bg-[#444444] accent-[#7c7c7c] cursor-pointer"
                  style={{ borderRadius: 0 }}
                />
                <div className="flex justify-between text-[11px] font-mono text-white/50">
                  <span>Narrow (60°)</span>
                  <span>Normal (75°)</span>
                  <span>Wide (95°)</span>
                </div>
              </div>
            </div>
          )}

          {/* ═════════ TAB 2: CONTROLS ═════════ */}
          {activeTab === "controls" && (
            <div className="max-w-xl space-y-6">
              <div className="border-b border-white/15 pb-2">
                <h2 className="text-[18px] font-bold uppercase tracking-wider text-white">
                  Controls Settings
                </h2>
                <p className="text-[13px] text-white/60 mt-0.5">
                  Resize and customize on-screen buttons, joystick, and touch behavior.
                </p>
              </div>

              {/* Resize Controls (Scale Slider) */}
              <div
                className="p-4 bg-[#5c5c5c] border-[1.5px] border-[#4c4c4c] space-y-2"
                style={{ borderRadius: 0 }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[14px] font-bold tracking-wide text-white block">
                      Resize Controls
                    </span>
                    <span className="text-[12px] text-white/60">
                      Scales joystick, jump button, and mode switch
                    </span>
                  </div>
                  <span className="text-[13px] font-mono font-bold text-[#facc15] bg-[#4a4a4a] px-2.5 py-1 border border-[#3c3c3c]">
                    {Math.round(controlsScale * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.7}
                  max={1.5}
                  step={0.05}
                  value={controlsScale}
                  onChange={(e) =>
                    handleControlsScaleSlider(Number(e.target.value))
                  }
                  className="w-full h-3 bg-[#444444] accent-[#7c7c7c] cursor-pointer mt-2"
                  style={{ borderRadius: 0 }}
                />
                <div className="flex justify-between text-[11px] font-mono text-white/50">
                  <span>Small (70%)</span>
                  <span>Standard (100%)</span>
                  <span>Large (150%)</span>
                </div>
              </div>

              {/* Invert Look Y-Axis */}
              <div
                className="p-4 bg-[#5c5c5c] border-[1.5px] border-[#4c4c4c] flex items-center justify-between"
                style={{ borderRadius: 0 }}
              >
                <div>
                  <span className="text-[14px] font-bold tracking-wide text-white block">
                    Invert Look Y-Axis
                  </span>
                  <span className="text-[12px] text-white/60">
                    Reverse vertical pitch drag direction
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleInvertYToggle}
                  className={`h-9 px-5 font-mono font-bold text-[13px] tracking-wider border-[1.5px] cursor-pointer select-none transition-colors ${
                    invertY
                      ? "bg-[#a3e635] text-black border-[#65a30d]"
                      : "bg-[#4a4a4a] text-white/70 border-[#383838] hover:bg-[#525252]"
                  }`}
                  style={{ borderRadius: 0 }}
                >
                  {invertY ? "ON" : "OFF"}
                </button>
              </div>

              {/* Joystick Deadzone */}
              <div
                className="p-4 bg-[#5c5c5c] border-[1.5px] border-[#4c4c4c] space-y-2"
                style={{ borderRadius: 0 }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-bold tracking-wide text-white">
                    Joystick Deadzone
                  </span>
                  <span className="text-[13px] font-mono font-bold text-white bg-[#4a4a4a] px-2 py-0.5 border border-[#3c3c3c]">
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
                  className="w-full h-3 bg-[#444444] accent-[#7c7c7c] cursor-pointer"
                  style={{ borderRadius: 0 }}
                />
              </div>

              {/* Reset Controls Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleResetControls}
                  className="w-full h-11 bg-[#7c7c7c] hover:bg-[#686868] active:bg-[#4f4f4f] text-white font-bold text-[13px] uppercase tracking-wider border-[1.5px] border-[#505050] cursor-pointer select-none transition-colors"
                  style={{ borderRadius: 0 }}
                >
                  Reset Controls to Default (100%)
                </button>
              </div>
            </div>
          )}

          {/* ═════════ TAB 3: PLAYERS (Iconless, Rectangle with Photo, ID, Name) ═════════ */}
          {activeTab === "players" && (
            <div className="max-w-2xl space-y-5">
              <div className="border-b border-white/15 pb-2 flex items-baseline justify-between">
                <div>
                  <h2 className="text-[18px] font-bold uppercase tracking-wider text-white">
                    Players in this Game
                  </h2>
                  <p className="text-[13px] text-white/60 mt-0.5">
                    List of players currently present in this session.
                  </p>
                </div>
                <span className="text-[13px] font-mono font-bold text-white bg-[#525252] px-2.5 py-1 border border-[#424242]">
                  {playersList.length} {playersList.length === 1 ? "PLAYER" : "PLAYERS"}
                </span>
              </div>

              {/* Player Rectangles List - Strictly Iconless */}
              <div className="space-y-3">
                {playersList.map((p) => {
                  return (
                    <div
                      key={p.uid}
                      className="w-full p-3.5 sm:p-4 bg-[#5c5c5c] border-[1.5px] border-[#4c4c4c] flex items-center gap-3.5"
                      style={{ borderRadius: 0 }}
                    >
                      {/* Square Player ofo (pfp) */}
                      <div
                        className="w-12 h-12 shrink-0 bg-[#484848] border-[1.5px] border-[#3a3a3a] flex items-center justify-center overflow-hidden"
                        style={{ borderRadius: 0 }}
                      >
                        {p.photo ? (
                          <img
                            src={p.photo}
                            alt=""
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            style={{ borderRadius: 0 }}
                          />
                        ) : (
                          <span className="text-[17px] font-bold text-white/80">
                            {p.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>

                      {/* Player Details: Name & Player ID ("olayer if") */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[15px] font-bold text-white tracking-wide truncate">
                            {p.name}
                          </span>
                          {p.isSelf && (
                            <span
                              className="px-1.5 py-0.2 text-[10px] font-mono font-bold bg-[#484848] text-[#a3e635] border border-[#383838]"
                              style={{ borderRadius: 0 }}
                            >
                              YOU
                            </span>
                          )}
                        </div>

                        {/* Player ID: clean monospace font, strictly iconless */}
                        <div className="text-[12px] font-mono text-white/70 mt-0.5 truncate">
                          ID: {p.uid}
                        </div>
                      </div>

                      {/* Status label: strictly iconless text badge */}
                      <div className="shrink-0 text-right">
                        <span
                          className="px-2 py-1 text-[11px] font-mono font-bold tracking-wider text-[#a3e635] bg-[#4a4a4a] border border-[#3a3a3a] uppercase"
                          style={{ borderRadius: 0 }}
                        >
                          ONLINE
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
