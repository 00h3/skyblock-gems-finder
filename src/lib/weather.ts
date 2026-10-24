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
  clear: { label: "Clear", hint: "Calm skies", wind: 0.8, snowCover: 0, particles: "off", drift: 0, fall: 1, cloud: 0.3 },
  windy: { label: "Windy", hint: "Leaves sway hard", wind: 2.8, snowCover: 0, particles: "motes", drift: 6, fall: 1, cloud: 0.55 },
  snow: { label: "Snow", hint: "Ground turns white", wind: 1.2, snowCover: 0.85, particles: "snow", drift: 0.6, fall: 1, cloud: 0.65 },
  blizzard: { label: "Blizzard", hint: "Heavy wind & snow", wind: 3.4, snowCover: 1, particles: "snow", drift: 7, fall: 2.2, cloud: 0.92 },
};

export const WEATHER_ORDER: Weather[] = ["clear", "windy", "snow", "blizzard"];

export function readWeather(): Weather {
  try {
    const saved = localStorage.getItem(WEATHER_KEY);
    if (saved && saved in WEATHER_PRESETS) return saved as Weather;
    return localStorage.getItem("qb_snow_ambient") === "0" ? "clear" : "snow";
  } catch {
    return "snow";
  }
}

export function setWeather(next: Weather) {
  try {
    localStorage.setItem(WEATHER_KEY, next);
  } catch {}
  window.dispatchEvent(new CustomEvent<Weather>(WEATHER_EVENT, { detail: next }));
}
