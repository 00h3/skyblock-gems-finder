import React, { useState, useEffect } from "react";
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
  bgGrad: string;
}

const SKY_PRESETS: SkyPreset[] = [
  { id: "dawn", label: "Alba", timeLabel: "06:00 AM", val: 5, color: "#fca5a5", accent: "#fb7185", bgGrad: "from-rose-900/40 via-amber-900/30 to-sky-950/40" },
  { id: "day", label: "Giorno", timeLabel: "12:00 PM", val: 30, color: "#60a5fa", accent: "#38bdf8", bgGrad: "from-sky-500/20 via-blue-600/20 to-sky-900/30" },
  { id: "tramonto", label: "Tramonto", timeLabel: "07:30 PM", val: 58, color: "#f97316", accent: "#fb923c", bgGrad: "from-amber-600/30 via-orange-700/30 to-purple-950/40" },
  { id: "night", label: "Notte", timeLabel: "00:00 AM", val: 78, color: "#818cf8", accent: "#6366f1", bgGrad: "from-indigo-950/50 via-slate-900/50 to-black/60" },
  { id: "aurora", label: "Aurora", timeLabel: "03:00 AM", val: 95, color: "#2dd4bf", accent: "#14b8a6", bgGrad: "from-emerald-950/40 via-teal-900/30 to-slate-950/50" },
];

function getPresetForValue(val: number): SkyPreset {
  if (val <= 15) return SKY_PRESETS[0]; // Alba
  if (val <= 45) return SKY_PRESETS[1]; // Giorno
  if (val <= 68) return SKY_PRESETS[2]; // Tramonto
  if (val <= 88) return SKY_PRESETS[3]; // Notte
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
    <div
      className={`relative overflow-hidden rounded-2xl p-6 border border-white/10 shadow-xl transition-all duration-300 bg-gradient-to-br ${activePreset.bgGrad}`}
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
        <div>
          <div className="font-extrabold text-[16px] text-white tracking-tight flex items-center gap-2">
            <span>Sky & Atmosphere Dial Editor</span>
            <span
              className="text-[11px] font-bold px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: `${activePreset.accent}25`,
                color: activePreset.accent,
                border: `1px solid ${activePreset.accent}45`,
              }}
            >
              {activePreset.label} • {activePreset.timeLabel}
            </span>
          </div>
          <div className="text-[12px] text-white/60 mt-0.5">
            Turn the React Bits CometDial to scrub between Day, Tramonto, Night, and Aurora in real-time.
          </div>
        </div>

        {/* Quick-jump preset pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {SKY_PRESETS.map((p) => {
            const isSelected = activePreset.id === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => selectPreset(p)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  isSelected
                    ? "bg-white text-black shadow-md scale-105"
                    : "bg-white/10 text-white/75 hover:bg-white/20 active:scale-95"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* CometDial Radial Controller */}
      <div className="flex flex-col items-center justify-center py-2">
        <CometDial
          value={currentVal}
          min={0}
          max={100}
          step={1}
          unit="%"
          label="Time of Day & Atmosphere"
          accent={activePreset.accent}
          ink="rgba(255, 255, 255, 0.45)"
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

        <div className="mt-3 flex items-center justify-between w-full max-w-xs px-2 text-[11px] font-semibold text-white/50">
          <span>0% Alba</span>
          <span>30% Giorno</span>
          <span>60% Tramonto</span>
          <span>80% Notte</span>
          <span>100% Aurora</span>
        </div>
      </div>
    </div>
  );
}
