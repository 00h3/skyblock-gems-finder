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
    r(4, 3, 8, 10, "#1f6b5e");
    r(3, 4, 10, 8, "#1f6b5e");
    r(5, 4, 6, 8, "#2fa08d");
    r(4, 5, 8, 6, "#2fa08d");
    r(5, 5, 3, 3, "#7df0d8");
    r(9, 9, 2, 2, "#145045");
    r(6, 6, 1, 1, "#ffffff");
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
