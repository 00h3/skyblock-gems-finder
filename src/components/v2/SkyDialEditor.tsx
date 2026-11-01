import React, { useState } from "react";
import CometDial from "@/components/ui/CometDial";
import { triggerHaptic } from "@/lib/haptics";
import { playUiClick } from "@/lib/ui-sounds";

interface SkyPreset {
  id: string;
  label: string;
  timeLabel: string;
  val: number;
  color: string;
  accent: string;
}

const SKY_PRESETS: SkyPreset[] = [
  { id: "dawn", label: "Dawn", timeLabel: "6:00 AM", val: 5, color: "#fca5a5", accent: "#fb7185" },
  { id: "day", label: "Day", timeLabel: "12:00 PM", val: 30, color: "#60a5fa", accent: "#38bdf8" },
  { id: "tramonto", label: "Sunset", timeLabel: "7:30 PM", val: 58, color: "#f97316", accent: "#fb923c" },
  { id: "night", label: "Night", timeLabel: "12:00 AM", val: 78, color: "#818cf8", accent: "#6366f1" },
  { id: "aurora", label: "Aurora", timeLabel: "3:00 AM", val: 95, color: "#2dd4bf", accent: "#14b8a6" },
];

function getPresetForValue(val: number): SkyPreset {
  if (val <= 15) return SKY_PRESETS[0]; // Dawn
  if (val <= 45) return SKY_PRESETS[1]; // Day
  if (val <= 68) return SKY_PRESETS[2]; // Sunset
  if (val <= 88) return SKY_PRESETS[3]; // Night
  return SKY_PRESETS[4]; // Aurora
}

function getValueForPresetId(id: string): number {
  const found = SKY_PRESETS.find((p) => p.id === id);
  return found ? found.val : 30;
}

export function SkyDialEditor({
  onAtmosphereChange,
}: {
  onAtmosphereChange?: (atm: string) => void;
}) {
  const [currentVal, setCurrentVal] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("qb_atmosphere") || "day";
      return getValueForPresetId(saved);
    } catch {
      return 30;
    }
  });

  const activePreset = getPresetForValue(currentVal);

  const applyAtmosphere = (preset: SkyPreset) => {
    try {
      localStorage.setItem("qb_atmosphere", preset.id);
    } catch {}
    window.dispatchEvent(new CustomEvent("bm-atmosphere-change", { detail: preset.id }));
    window.dispatchEvent(new CustomEvent("bm-sky-time", { detail: preset.id }));
    onAtmosphereChange?.(preset.id);
  };

  const handleDialChange = (val: number) => {
    setCurrentVal(val);
    const p = getPresetForValue(val);
    applyAtmosphere(p);
  };

  const selectPreset = (p: SkyPreset) => {
    playUiClick(1.1);
    triggerHaptic("medium");
    setCurrentVal(p.val);
    applyAtmosphere(p);
  };

  return (
    <div className="flex flex-col items-center justify-center py-2 space-y-3">
      {/* Quick selection pills */}
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {SKY_PRESETS.map((p) => {
          const isSelected = activePreset.id === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => selectPreset(p)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                isSelected
                  ? "bg-white text-black shadow scale-105"
                  : "bg-white/10 text-white/70 hover:bg-white/20 active:scale-95"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Rotating Dial */}
      <CometDial
        value={currentVal}
        min={0}
        max={100}
        step={1}
        unit=""
        label="Time of Day"
        accent={activePreset.accent}
        ink="rgba(255, 255, 255, 0.35)"
        size={210}
        sweep={310}
        thickness={6}
        speed={30}
        tapBounce={0.2}
        flickBounce={0.12}
        momentum={0.8}
        cometReach={160}
        cometWidth={14}
        displayValueMapper={() => activePreset.label}
        onChange={(v) => {
          handleDialChange(v);
        }}
        onChangeEnd={(v) => {
          triggerHaptic("light");
          playUiClick(1.0);
          handleDialChange(v);
        }}
      />

      <div className="text-center text-xs text-white/60 font-medium">
        {activePreset.label} ({activePreset.timeLabel})
      </div>
    </div>
  );
}

