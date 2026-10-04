/** Pixel-art 16x16 icons for utility items, rendered once to data URLs. */

type Draw = (r: (x: number, y: number, w: number, h: number, c: string) => void) => void;

const ICONS: Record<string, Draw> = {
  water_bucket: (r) => {
    r(3, 4, 10, 1, "#6b7480");
    r(4, 5, 8, 8, "#aab3bd");
    r(5, 13, 6, 1, "#7d8792");
    r(4, 5, 1, 8, "#c9d1d9");
    r(5, 6, 6, 3, "#3aa8ff");
    r(6, 6, 3, 1, "#9fdcff");
    r(2, 2, 1, 3, "#6b7480");
    r(13, 2, 1, 3, "#6b7480");
    r(3, 1, 10, 1, "#6b7480");
  },
  lava_bucket: (r) => {
    r(3, 4, 10, 1, "#6b7480");
    r(4, 5, 8, 8, "#aab3bd");
    r(5, 13, 6, 1, "#7d8792");
    r(4, 5, 1, 8, "#c9d1d9");
    r(5, 6, 6, 3, "#ff7a1a");
    r(6, 6, 3, 1, "#ffd37a");
    r(2, 2, 1, 3, "#6b7480");
    r(13, 2, 1, 3, "#6b7480");
    r(3, 1, 10, 1, "#6b7480");
  },
  flint_steel: (r) => {
    r(3, 7, 8, 6, "#59616b");
    r(4, 8, 6, 4, "#8d97a3");
    r(5, 9, 2, 2, "#c4ccd6");
    r(10, 3, 4, 5, "#3c3f45");
    r(11, 4, 2, 3, "#6a6f78");
    r(10, 2, 1, 1, "#ffb347");
    r(12, 1, 1, 1, "#ff7a1a");
  },
  fire_charge: (r) => {
    r(4, 4, 8, 8, "#d14a1a");
    r(5, 5, 6, 6, "#ff7a1a");
    r(6, 6, 4, 4, "#ffb347");
    r(7, 7, 2, 2, "#fff0b0");
    r(3, 6, 1, 4, "#8f2f10");
    r(12, 6, 1, 4, "#8f2f10");
    r(6, 3, 4, 1, "#8f2f10");
    r(6, 12, 4, 1, "#8f2f10");
  },
  ender_pearl: (r) => {
    // Outer boundary & dark void rim
    r(5, 2, 6, 1, "#07201a");
    r(5, 13, 6, 1, "#051612");
    r(3, 3, 2, 1, "#092e25");
    r(11, 3, 2, 1, "#07201a");
    r(2, 5, 1, 6, "#0a342a");
    r(13, 5, 1, 6, "#051712");
    r(3, 12, 2, 1, "#051612");
    r(11, 12, 2, 1, "#04120e");
    r(2, 4, 1, 1, "#092e25");
    r(13, 4, 1, 1, "#07201a");
    r(2, 11, 1, 1, "#061a15");
    r(13, 11, 1, 1, "#04120e");
    // Deep emerald-teal body
    r(4, 3, 8, 10, "#135d50");
    r(3, 4, 10, 8, "#135d50");
    r(4, 4, 7, 7, "#1c8270");
    r(5, 4, 6, 6, "#28a790");
    // Luminous iridescent cyan aura & ring
    r(5, 5, 5, 5, "#3de4c3");
    r(6, 5, 4, 4, "#6df8df");
    // Celestial cosmic pupil void
    r(7, 7, 2, 2, "#082921");
    r(8, 8, 1, 1, "#051a15");
    // Bottom-right depth shadow crescent
    r(9, 10, 3, 2, "#0a362c");
    r(10, 8, 2, 3, "#0d4337");
    r(11, 7, 1, 4, "#0a362c");
    r(8, 11, 3, 1, "#0a362c");
    // Specular star glint and shine
    r(5, 4, 2, 1, "#ffffff");
    r(4, 5, 1, 2, "#ffffff");
    r(5, 5, 2, 2, "#e0fff8");
    r(7, 4, 1, 1, "#a8faec");
    // Starry flecks
    r(9, 5, 1, 1, "#b5fbed");
    r(5, 9, 1, 1, "#7af7de");
    r(6, 10, 1, 1, "#40e2c1");
    r(10, 9, 1, 1, "#2ebba0");
  },
  wind_charge: (r) => {
    // Air vortex outer aura
    r(4, 3, 8, 10, "#48a3cb");
    r(3, 4, 10, 8, "#48a3cb");
    r(4, 4, 8, 8, "#72c4e6");
    r(5, 3, 6, 10, "#8ed4ef");
    r(3, 5, 10, 6, "#8ed4ef");
    // Spiraling wind currents
    r(5, 4, 4, 2, "#e3f7ff");
    r(8, 5, 3, 2, "#cbf0fd");
    r(9, 7, 2, 4, "#e3f7ff");
    r(7, 10, 3, 2, "#cbf0fd");
    r(4, 9, 3, 2, "#e3f7ff");
    r(3, 6, 2, 3, "#bce9fa");
    // Compressed pure white center
    r(6, 6, 4, 4, "#ffffff");
    r(7, 7, 2, 2, "#f4fbff");
    r(6, 4, 2, 1, "#ffffff");
    r(10, 8, 1, 2, "#ffffff");
    r(5, 10, 2, 1, "#ffffff");
    // Dynamic trailing gust wisps
    r(1, 4, 2, 1, "#9ee0f7");
    r(13, 11, 2, 1, "#9ee0f7");
    r(11, 2, 1, 2, "#bde9f8");
    r(3, 13, 2, 1, "#78cbed");
  },
  speed_potion: (r) => {
    // Cork stopper
    r(7, 1, 2, 2, "#855127");
    r(6, 2, 4, 1, "#a06935");
    r(6, 3, 4, 1, "#5e3717");
    // Flask bottleneck
    r(7, 3, 2, 3, "#a8d8ea");
    r(6, 4, 1, 2, "#689fb5");
    r(9, 4, 1, 2, "#d5eff8");
    // Bottle glass outline
    r(4, 6, 8, 9, "#2b6b88");
    r(3, 8, 10, 6, "#2b6b88");
    r(5, 15, 6, 1, "#20556e");
    // Glowing electric blue swiftness potion
    r(4, 8, 8, 6, "#008cf0");
    r(4, 9, 8, 5, "#009dff");
    r(5, 10, 6, 4, "#24b3ff");
    r(5, 12, 6, 2, "#52c5ff");
    r(5, 8, 6, 1, "#006bbd");
    // Rising effervescent bubbles
    r(6, 10, 1, 1, "#ffffff");
    r(9, 11, 1, 1, "#b5ebff");
    r(7, 12, 1, 1, "#ffffff");
    // Curved glass highlight reflection
    r(4, 7, 2, 1, "#ffffff");
    r(3, 8, 1, 3, "#ffffff");
    r(3, 11, 1, 2, "#bce9fa");
    r(4, 13, 1, 1, "#bce9fa");
  },
  slime_ball: (r) => {
    // Gel outline
    r(5, 4, 6, 8, "#256310");
    r(4, 5, 8, 6, "#256310");
    r(6, 3, 4, 10, "#256310");
    r(3, 6, 10, 4, "#256310");
    // Shaded lime body
    r(5, 5, 6, 6, "#4cb722");
    r(4, 6, 8, 4, "#4cb722");
    r(6, 4, 4, 8, "#5ec62e");
    r(5, 6, 6, 4, "#77dc3c");
    // Translucent core
    r(6, 6, 4, 4, "#92eb4e");
    r(7, 7, 2, 2, "#aef268");
    // Glossy specular shine
    r(5, 5, 2, 1, "#ffffff");
    r(4, 6, 1, 2, "#ffffff");
    r(5, 6, 1, 1, "#dcff9e");
    // Shadow base
    r(7, 11, 3, 1, "#21550e");
    r(9, 9, 2, 2, "#2b6e13");
  },
  golden_apple: (r) => {
    r(4, 5, 8, 8, "#e8a21a");
    r(3, 6, 10, 6, "#e8a21a");
    r(5, 6, 6, 6, "#ffd34a");
    r(5, 6, 2, 2, "#fff1a8");
    r(10, 10, 2, 2, "#c27a0a");
    r(7, 2, 1, 3, "#6b4521");
    r(8, 2, 3, 2, "#4fa82b");
  },
  shield: (r) => {
    r(3, 2, 10, 9, "#7a4b22");
    r(4, 11, 8, 2, "#7a4b22");
    r(6, 13, 4, 1, "#7a4b22");
    r(4, 3, 8, 8, "#c9953f");
    r(5, 11, 6, 1, "#c9953f");
    r(7, 3, 2, 10, "#e8e8f0");
    r(4, 6, 8, 2, "#e8e8f0");
    r(3, 2, 10, 1, "#4a2d12");
  },
};

const cache = new Map<string, string>();

export function utilityIconUrl(id: string): string {
  const cached = cache.get(id);
  if (cached) return cached;
  const draw = ICONS[id];
  if (!draw || typeof document === "undefined") return "";
  const canvas = document.createElement("canvas");
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  draw((x, y, w, h, c) => {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, w, h);
  });
  const url = canvas.toDataURL();
  cache.set(id, url);
  return url;
}

export function hasUtilityIcon(id: string) {
  return id in ICONS;
}
