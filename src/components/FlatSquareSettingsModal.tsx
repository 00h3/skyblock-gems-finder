"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Sun,
  Sunset,
  Moon,
  Sparkles,
  Sliders,
  Gauge,
  Eye,
  Volume2,
  VolumeX,
  X,
  Check,
  Zap,
  CloudLightning,
  Snowflake,
  Flame,
  Waves,
  CircleDot,
} from "lucide-react";
import { readQualityPref, RenderQuality } from "@/lib/rendering";
import { WeatherSettingsSection } from "@/components/SkyblockExtras";

interface FlatSquareSettingsModalProps {
  onClose: () => void;
  controlsScale?: number;
  onControlsScaleChange?: (scale: number) => void;
  showWeather?: boolean;
}

export type AtmosphereMode =
  | "normal"
  | "day"
  | "evening"
  | "tramonto"
  | "night"
  | "cinematic"
  | "tempesta"
  | "christmas"
  | "blood_moon"
  | "aurora"
  | "solar_eclipse";

interface AtmosphereOption {
  id: AtmosphereMode;
  label: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  activeClasses: string;
  iconColor: string;
}

const ATMOSPHERE_OPTIONS: AtmosphereOption[] = [
  {
    id: "normal",
    label: "Day",
    sub: "Golden Sunlight",
    icon: Sun,
    activeClasses: "bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_16px_rgba(251,191,36,0.25)]",
    iconColor: "text-amber-400",
  },
  {
    id: "evening",
    label: "Tramonto",
    sub: "Warm Sunset",
    icon: Sunset,
    activeClasses: "bg-orange-500/20 border-orange-400 text-orange-300 shadow-[0_0_16px_rgba(249,115,22,0.25)]",
    iconColor: "text-orange-400",
  },
  {
    id: "night",
    label: "Night",
    sub: "Moon & Stars",
    icon: Moon,
    activeClasses: "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_16px_rgba(6,182,212,0.25)]",
    iconColor: "text-cyan-400",
  },
  {
    id: "cinematic",
    label: "Cinematic",
    sub: "Mystic Twilight",
    icon: Sparkles,
    activeClasses: "bg-purple-500/20 border-purple-400 text-purple-300 shadow-[0_0_16px_rgba(168,85,247,0.25)]",
    iconColor: "text-purple-400",
  },
  {
    id: "tempesta",
    label: "Tempesta",
    sub: "Thunder & Rain",
    icon: CloudLightning,
    activeClasses: "bg-sky-500/20 border-sky-400 text-sky-200 shadow-[0_0_16px_rgba(56,189,248,0.25)]",
    iconColor: "text-sky-300",
  },
  {
    id: "christmas",
    label: "Striking Christmas",
    sub: "Winter & Snow",
    icon: Snowflake,
    activeClasses: "bg-emerald-500/20 border-emerald-400 text-emerald-200 shadow-[0_0_16px_rgba(52,211,153,0.25)]",
    iconColor: "text-emerald-300",
  },
  {
    id: "blood_moon",
    label: "Blood Moon",
    sub: "Crimson Eclipse",
    icon: Flame,
    activeClasses: "bg-red-500/20 border-red-500 text-red-300 shadow-[0_0_16px_rgba(239,68,68,0.25)]",
    iconColor: "text-red-400",
  },
  {
    id: "aurora",
    label: "Aurora Borealis",
    sub: "Cosmic Shimmer",
    icon: Waves,
    activeClasses: "bg-teal-500/20 border-teal-400 text-teal-200 shadow-[0_0_16px_rgba(45,212,191,0.25)]",
    iconColor: "text-teal-300",
  },
  {
    id: "solar_eclipse",
    label: "Solar Eclipse",
    sub: "Corona Umbra",
    icon: CircleDot,
    activeClasses: "bg-amber-500/20 border-amber-300 text-amber-200 shadow-[0_0_16px_rgba(245,158,11,0.25)]",
    iconColor: "text-amber-300",
  },
];

export function FlatSquareSettingsModal({
  onClose,
  controlsScale,
  onControlsScaleChange,
  showWeather = false,
}: FlatSquareSettingsModalProps) {
  const [mounted, setMounted] = useState(false);

  // Graphics Quality ("normal" | "high")
  const [quality, setQuality] = useState<RenderQuality>(() => readQualityPref());

  // Atmosphere / Time of Day
  const [atmosphere, setAtmosphere] = useState<AtmosphereMode>(() => {
    try {
      const saved = localStorage.getItem("qb_atmosphere") || "day";
      if (saved === "golden" || saved === "evening" || saved === "tramonto") return "evening";
      if (saved === "night") return "night";
      if (saved === "cinematic" || saved === "mystic") return "cinematic";
      if (saved === "tempesta" || saved === "storm") return "tempesta";
      if (saved === "christmas" || saved === "striking_christmas" || saved === "natale") return "christmas";
      if (saved === "blood_moon" || saved === "bloodmoon") return "blood_moon";
      if (saved === "aurora" || saved === "aurora_borealis") return "aurora";
      if (saved === "solar_eclipse" || saved === "eclipse") return "solar_eclipse";
      return "normal";
    } catch {
      return "normal";
    }
  });

  // Camera Field of View
  const [fov, setFov] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("qb_camera_fov");
      return saved ? Math.max(50, Math.min(100, Number(saved))) : 72;
    } catch {
      return 72;
    }
  });

  // Look Sensitivity
  const [sensitivity, setSensitivity] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("qb_sensitivity");
      return saved ? Math.max(10, Math.min(100, Number(saved))) : 50;
    } catch {
      return 50;
    }
  });

  // Volume
  const [volume, setVolume] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("qb_master_volume");
      return saved !== null ? Math.max(0, Math.min(100, Number(saved))) : 80;
    } catch {
      return 80;
    }
  });
  const [muted, setMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem("qb_muted") === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    setMounted(true);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // Handle Graphics Quality change
  const handleQualityChange = useCallback((newQ: RenderQuality) => {
    setQuality(newQ);
    try {
      localStorage.setItem("bm-quality", newQ);
    } catch {}
    window.dispatchEvent(new CustomEvent("bm-quality", { detail: newQ }));
  }, []);

  // Handle Atmosphere change
  const handleAtmosphereChange = useCallback((newAtm: AtmosphereMode) => {
    setAtmosphere(newAtm);
    const storageVal = newAtm === "normal" ? "day" : newAtm;
    try {
      localStorage.setItem("qb_atmosphere", storageVal);
    } catch {}
    window.dispatchEvent(new CustomEvent("bm-atmosphere", { detail: newAtm }));
  }, []);

  // Handle FOV change
  const handleFovChange = useCallback((val: number) => {
    setFov(val);
    try {
      localStorage.setItem("qb_camera_fov", String(val));
    } catch {}
    window.dispatchEvent(new CustomEvent("bm-fov", { detail: val }));
  }, []);

  // Handle Sensitivity change
  const handleSensitivityChange = useCallback((val: number) => {
    setSensitivity(val);
    try {
      localStorage.setItem("qb_sensitivity", String(val));
    } catch {}
    window.dispatchEvent(new CustomEvent("bm-sensitivity", { detail: val }));
  }, []);

  // Handle Volume change
  const handleVolumeChange = useCallback((val: number) => {
    setVolume(val);
    try {
      localStorage.setItem("qb_master_volume", String(val));
    } catch {}
    window.dispatchEvent(new CustomEvent("bm-volume", { detail: val }));
  }, []);

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("qb_muted", String(next));
      } catch {}
      window.dispatchEvent(new CustomEvent("bm-mute", { detail: next }));
      return next;
    });
  }, []);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      id="flat-square-settings-fullscreen"
      className="fixed inset-0 z-[99999] pointer-events-auto flex items-center justify-center bg-black/75 p-3 sm:p-5 backdrop-blur-md select-none animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="square-user-card bg-[#14161b] border border-white/15 w-full max-w-2xl max-h-[90vh] rounded-2xl p-5 sm:p-6 text-white shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center pb-4 mb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight text-white">Game Settings</h2>
              <p className="text-xs text-white/50">
                Switch graphics quality, celestial atmosphere & controls
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Settings"
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-white/80 hover:text-white transition cursor-pointer border border-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list (Scrollable) */}
        <div className="space-y-6 overflow-y-auto pr-1 flex-1 custom-scrollbar">
          {/* SECTION 1: GRAPHICS QUALITY */}
          <div className="rounded-xl p-4 bg-white/[0.03] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-black text-white uppercase tracking-wider">
                  Graphics Quality
                </span>
              </div>
              <span className="text-[11px] font-semibold text-white/50">
                {quality === "high" ? "Ultra Cinematic Mode" : "Optimized 60 FPS Mode"}
              </span>
            </div>

            {/* Quality switch buttons */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              {/* Normal Button */}
              <button
                type="button"
                onClick={() => handleQualityChange("normal")}
                className={`flex flex-col p-3 rounded-xl border text-left transition cursor-pointer relative overflow-hidden ${
                  quality === "normal" || quality === "medium"
                    ? "bg-emerald-500/15 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.25)] text-white"
                    : "bg-white/[0.04] border-white/10 text-white/70 hover:bg-white/[0.08]"
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-black text-sm flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-emerald-400" />
                    Normal (New)
                  </span>
                  {(quality === "normal" || quality === "medium") && (
                    <span className="text-[10px] uppercase font-black tracking-wider bg-emerald-500 text-black px-1.5 py-0.5 rounded">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-[11px] leading-relaxed text-white/60">
                  New high-efficiency profile. Smooth 60–120 FPS, soft ambient bloom & zero stutter.
                </p>
              </button>

              {/* High Button */}
              <button
                type="button"
                onClick={() => handleQualityChange("high")}
                className={`flex flex-col p-3 rounded-xl border text-left transition cursor-pointer relative overflow-hidden ${
                  quality === "high"
                    ? "bg-amber-500/15 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.25)] text-white"
                    : "bg-white/[0.04] border-white/10 text-white/70 hover:bg-white/[0.08]"
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-black text-sm flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    High (Ultra)
                  </span>
                  {quality === "high" && (
                    <span className="text-[10px] uppercase font-black tracking-wider bg-amber-400 text-black px-1.5 py-0.5 rounded">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-[11px] leading-relaxed text-white/60">
                  Restores the old ultra-high quality. Native Retina DPR, full bloom resolution & dynamic shadows.
                </p>
              </button>
            </div>
          </div>

          {showWeather && <WeatherSettingsSection />}

          {/* SECTION 2: ATMOSPHERE & TIME OF DAY */}
          <div className="rounded-xl p-4 bg-white/[0.03] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-black text-white uppercase tracking-wider">
                  Atmosphere & Ambient
                </span>
              </div>
              <span className="text-[11px] font-semibold text-white/50">
                {ATMOSPHERE_OPTIONS.find((o) =>
                  o.id === atmosphere ||
                  (o.id === "normal" && (atmosphere === "day" || atmosphere === "normal")) ||
                  (o.id === "evening" && (atmosphere === "tramonto" || atmosphere === "evening"))
                )?.label ?? "Day"}
              </span>
            </div>

            {/* Atmosphere Presets Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
              {ATMOSPHERE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active =
                  atmosphere === opt.id ||
                  (opt.id === "normal" && (atmosphere === "day" || atmosphere === "normal")) ||
                  (opt.id === "evening" && (atmosphere === "tramonto" || atmosphere === "evening"));
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleAtmosphereChange(opt.id)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition cursor-pointer relative overflow-hidden ${
                      active
                        ? `${opt.activeClasses} font-black`
                        : "bg-white/[0.04] border-white/10 text-white/70 hover:bg-white/[0.08]"
                    }`}
                  >
                    <Icon className={`w-6 h-6 mb-1 ${active ? "" : opt.iconColor}`} />
                    <span className="text-xs font-bold leading-tight">{opt.label}</span>
                    <span className="text-[10px] text-white/50 mt-0.5 leading-tight">{opt.sub}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION 3: CAMERA & FOV */}
          <div className="rounded-xl p-4 bg-white/[0.03] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-sky-400" />
                <span className="text-sm font-black text-white uppercase tracking-wider">
                  Field of View (FOV)
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-sky-300 bg-white/10 px-2 py-0.5 rounded border border-white/10">
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
              className="w-full h-2 bg-white/15 accent-sky-400 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-white/40">
              <span>Narrow (60°)</span>
              <span>Standard (72°)</span>
              <span>Wide (95°)</span>
            </div>
          </div>

          {/* SECTION 4: CONTROLS & SENSITIVITY */}
          <div className="rounded-xl p-4 bg-white/[0.03] border border-white/10 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-white uppercase tracking-wider">
                  Look Sensitivity
                </span>
                <span className="text-xs font-mono font-bold text-amber-300 bg-white/10 px-2 py-0.5 rounded border border-white/10">
                  {sensitivity}%
                </span>
              </div>
              <input
                type="range"
                min={20}
                max={100}
                step={5}
                value={sensitivity}
                onChange={(e) => handleSensitivityChange(Number(e.target.value))}
                className="w-full h-2 bg-white/15 accent-amber-400 rounded-lg cursor-pointer"
              />
            </div>

            {/* Controls Size Slider (if handler available or standalone) */}
            {onControlsScaleChange && controlsScale !== undefined && (
              <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-white uppercase tracking-wider">
                    Touch Controls Scale
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-300 bg-white/10 px-2 py-0.5 rounded border border-white/10">
                    {Math.round(controlsScale * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={70}
                  max={150}
                  step={5}
                  value={Math.round(controlsScale * 100)}
                  onChange={(e) => onControlsScaleChange(Number(e.target.value) / 100)}
                  className="w-full h-2 bg-white/15 accent-emerald-400 rounded-lg cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* SECTION 5: AUDIO */}
          <div className="rounded-xl p-4 bg-white/[0.03] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {muted ? (
                  <VolumeX className="w-4 h-4 text-red-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-indigo-400" />
                )}
                <span className="text-xs font-black text-white uppercase tracking-wider">
                  Master Volume
                </span>
              </div>
              <button
                type="button"
                onClick={handleToggleMute}
                className="text-[11px] font-bold text-white/70 hover:text-white px-2 py-0.5 rounded bg-white/10 hover:bg-white/15 transition cursor-pointer"
              >
                {muted ? "Unmute" : "Mute"}
              </button>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              disabled={muted}
              value={muted ? 0 : volume}
              onChange={(e) => handleVolumeChange(Number(e.target.value))}
              className={`w-full h-2 bg-white/15 accent-indigo-400 rounded-lg cursor-pointer ${
                muted ? "opacity-40 pointer-events-none" : ""
              }`}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 mt-2 border-t border-white/10 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-sm shadow-lg active:scale-95 transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
