export type Weather = "clear" | "windy" | "snow" | "blizzard";

export const WEATHER_KEY = "qb_weather";
export const WEATHER_EVENT = "qb-weather";

export interface WeatherPreset {
  label: string;
  hint: string;
  /** Foliage sway multiplier (WIND.uStrength). */
  wind: number;
  /** Snow cover on upward faces, 0..1. */
  snowCover: number;
  particles: "off" | "snow" | "motes";
  /** Sideways particle drift in blocks/second. */
  drift: number;
  /** Fall speed multiplier for particles. */
  fall: number;
  cloud: number;
}

export const WEATHER_PRESETS: Record<Weather, WeatherPreset> = {
  clear: { label: "Clear", hint: "Calm & Still (Clear sky mode)", wind: 0, snowCover: 0, particles: "off", drift: 0, fall: 1, cloud: 0.2 },
  windy: { label: "Windy", hint: "Leaves & Grass sway gently", wind: 2.8, snowCover: 0, particles: "motes", drift: 6, fall: 1, cloud: 0.55 },
  snow: { label: "Clear", hint: "Calm & Still (Clear sky mode)", wind: 0, snowCover: 0, particles: "off", drift: 0, fall: 1, cloud: 0.2 },
  blizzard: { label: "Clear", hint: "Calm & Still (Clear sky mode)", wind: 0, snowCover: 0, particles: "off", drift: 0, fall: 1, cloud: 0.2 },
};

export const WEATHER_ORDER: Weather[] = ["clear", "windy"];

export function readWeather(): Weather {
  try {
    const windMode = localStorage.getItem("qb_wind_mode");
    if (windMode && (windMode === "clear" || windMode === "windy")) return windMode as Weather;
    const saved = localStorage.getItem(WEATHER_KEY);
    if (saved && (saved === "clear" || saved === "windy")) return saved as Weather;
    return "clear";
  } catch {
    return "clear";
  }
}

export function setWeather(next: Weather) {
  const safeNext = next === "snow" || next === "blizzard" ? "clear" : next;
  try {
    localStorage.setItem(WEATHER_KEY, safeNext);
    localStorage.setItem("qb_wind_mode", safeNext);
  } catch {}
  window.dispatchEvent(new CustomEvent<Weather>(WEATHER_EVENT, { detail: safeNext }));
}
