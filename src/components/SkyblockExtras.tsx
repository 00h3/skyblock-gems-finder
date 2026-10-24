import { useEffect, useState } from "react";
import { CloudSnow, Home, Pickaxe, Snowflake, Sun, Wind } from "lucide-react";
import { PANEL_INNER, SLOT_EMPTY, SLOT_FILLED, SLOT_SEL } from "@/components/AdvancedInventoryModal";
import { WEATHER_EVENT, WEATHER_ORDER, WEATHER_PRESETS, readWeather, setWeather, type Weather } from "@/lib/weather";

export function MineTeleportButton({ inMine, onPress }: { inMine: boolean; onPress: () => void }) {
  const Icon = inMine ? Home : Pickaxe;
  return (
    <button
      type="button"
      onClick={onPress}
      aria-label={inMine ? "Teleport back to your island" : "Teleport to the Deep Mines"}
      className="font-inter-bold pointer-events-auto flex h-[52px] w-[52px] flex-col items-center justify-center gap-0.5 text-white transition active:scale-95"
      style={{ ...SLOT_FILLED, borderRadius: "10px", boxShadow: "0 6px 18px rgba(0,0,0,0.45)" }}
    >
      <Icon className="h-5 w-5 text-slate-100" aria-hidden="true" />
      <span className="text-[9px] font-black italic leading-none text-slate-300">{inMine ? "Island" : "Mines"}</span>
    </button>
  );
}

const WEATHER_ICON = { clear: Sun, windy: Wind, snow: Snowflake, blizzard: CloudSnow } as const;

export function useWeather(): Weather {
  const [weather, setLocal] = useState<Weather>(readWeather);
  useEffect(() => {
    const onChange = (e: Event) => setLocal((e as CustomEvent<Weather>).detail);
    window.addEventListener(WEATHER_EVENT, onChange);
    return () => window.removeEventListener(WEATHER_EVENT, onChange);
  }, []);
  return weather;
}

export function WeatherSettingsSection() {
  const weather = useWeather();
  return (
    <section className="font-inter-bold space-y-2.5 p-3" style={PANEL_INNER} aria-labelledby="weather-heading">
      <div className="flex items-center justify-between">
        <h3 id="weather-heading" className="text-sm font-black italic text-white">Weather</h3>
        <span className="text-[11px] font-black italic text-slate-400">{WEATHER_PRESETS[weather].hint}</span>
      </div>
      <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Weather">
        {WEATHER_ORDER.map((id) => {
          const Icon = WEATHER_ICON[id];
          const active = id === weather;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setWeather(id)}
              className="flex min-h-[60px] flex-col items-center justify-center gap-1 text-white transition active:scale-95"
              style={active ? SLOT_SEL : id === "clear" ? SLOT_EMPTY : SLOT_FILLED}
            >
              <Icon className={`h-5 w-5 ${active ? "text-sky-300" : "text-slate-300"}`} aria-hidden="true" />
              <span className="text-[11px] font-black italic">{WEATHER_PRESETS[id].label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
