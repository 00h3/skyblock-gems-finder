/**
 * 16x16 pixel-art painters for blocks that ship without a texture file.
 * Hytale-leaning palette: clean, slightly warm, with soft two-tone shading.
 */

type Paint = (px: (x: number, y: number, c: string) => void, rect: (x: number, y: number, w: number, h: number, c: string) => void, rnd: () => number) => void;

const STONE = ["#8d949c", "#868d95", "#949ba3", "#7f868e"];

function stoneBase(px: Parameters<Paint>[0], rnd: () => number) {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) px(x, y, STONE[Math.floor(rnd() * STONE.length)]);
}

function ore(colors: string[]): Paint {
  return (px, _rect, rnd) => {
    stoneBase(px, rnd);
    const spots: [number, number][] = [[3, 3], [10, 2], [6, 8], [12, 11], [2, 12], [9, 13]];
    for (const [sx, sy] of spots) {
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1], [-1, 0]]) {
        if (rnd() > 0.2) px(sx + dx, sy + dy, colors[Math.floor(rnd() * colors.length)]);
      }
    }
  };
}

function planks(px: Parameters<Paint>[0], rect: Parameters<Paint>[1], rnd: () => number, base = "#b98c55", dark = "#8f6a3c") {
  rect(0, 0, 16, 16, base);
  for (let y = 0; y < 16; y += 4) rect(0, y + 3, 16, 1, dark);
  for (let i = 0; i < 40; i++) px(Math.floor(rnd() * 16), Math.floor(rnd() * 16), rnd() > 0.5 ? "#c69a62" : "#a97b47");
}

const PAINTERS: Record<string, Paint> = {
  iron_ore: ore(["#e0b89a", "#d4a483", "#c99673"]),
  diamond_ore: ore(["#5ef0ff", "#34d6e8", "#b8fbff"]),
  oak_door: (px, rect, rnd) => {
    planks(px, rect, rnd);
    rect(0, 0, 16, 1, "#5e4224");
    rect(0, 15, 16, 1, "#5e4224");
    rect(0, 0, 1, 16, "#5e4224");
    rect(15, 0, 1, 16, "#5e4224");
    rect(3, 3, 4, 4, "#8f6a3c");
    rect(9, 3, 4, 4, "#8f6a3c");
    rect(3, 9, 4, 4, "#8f6a3c");
    rect(9, 9, 4, 4, "#8f6a3c");
    rect(12, 7, 2, 2, "#f2c14e");
  },
  oak_door_open: (px, rect, rnd) => {
    rect(0, 0, 16, 16, "rgba(0,0,0,0)");
    planks(px, rect, rnd);
    rect(3, 0, 13, 16, "rgba(0,0,0,0)");
    rect(0, 0, 3, 16, "#8f6a3c");
    rect(0, 0, 1, 16, "#5e4224");
    rect(2, 7, 1, 2, "#f2c14e");
  },
  iron_door: (px, rect) => {
    rect(0, 0, 16, 16, "#cfd6dc");
    rect(0, 0, 16, 1, "#7d8790");
    rect(0, 15, 16, 1, "#7d8790");
    rect(0, 0, 1, 16, "#7d8790");
    rect(15, 0, 1, 16, "#7d8790");
    for (let y = 3; y < 14; y += 5) rect(3, y, 10, 3, "#aeb8c0");
    rect(12, 7, 2, 2, "#3b4650");
    px(2, 2, "#ffffff");
  },
  iron_door_open: (_px, rect) => {
    rect(0, 0, 16, 16, "rgba(0,0,0,0)");
    rect(0, 0, 3, 16, "#cfd6dc");
    rect(0, 0, 1, 16, "#7d8790");
    rect(2, 7, 1, 2, "#3b4650");
  },
  chest: (px, rect, rnd) => {
    planks(px, rect, rnd, "#a8743a", "#7d5226");
    rect(0, 0, 16, 1, "#5a3a18");
    rect(0, 15, 16, 1, "#5a3a18");
    rect(0, 0, 1, 16, "#5a3a18");
    rect(15, 0, 1, 16, "#5a3a18");
    rect(0, 6, 16, 1, "#5a3a18");
    rect(7, 5, 2, 4, "#f2c14e");
    rect(7, 7, 2, 1, "#b8861f");
  },
  trapped_chest: (px, rect, rnd) => {
    planks(px, rect, rnd, "#a8743a", "#7d5226");
    rect(0, 0, 16, 1, "#5a3a18");
    rect(0, 15, 16, 1, "#5a3a18");
    rect(0, 0, 1, 16, "#5a3a18");
    rect(15, 0, 1, 16, "#5a3a18");
    rect(0, 6, 16, 1, "#5a3a18");
    rect(7, 5, 2, 4, "#e5483d");
    rect(7, 7, 2, 1, "#8f1f18");
  },
  blast_glass: (_px, rect) => {
    rect(0, 0, 16, 16, "rgba(190,225,255,0.28)");
    rect(0, 0, 16, 1, "#bfe3ff");
    rect(0, 15, 16, 1, "#bfe3ff");
    rect(0, 0, 1, 16, "#bfe3ff");
    rect(15, 0, 1, 16, "#bfe3ff");
    rect(2, 2, 12, 1, "#6fa8d8");
    rect(2, 13, 12, 1, "#6fa8d8");
    rect(2, 2, 1, 12, "#6fa8d8");
    rect(13, 2, 1, 12, "#6fa8d8");
    for (let i = 4; i < 12; i++) _px(i, 15 - i, "rgba(255,255,255,0.7)");
  },
  ladder: (_px, rect) => {
    rect(0, 0, 16, 16, "rgba(0,0,0,0)");
    rect(2, 0, 2, 16, "#9b6b34");
    rect(12, 0, 2, 16, "#9b6b34");
    rect(2, 0, 1, 16, "#b98c55");
    rect(12, 0, 1, 16, "#b98c55");
    for (let y = 1; y < 16; y += 4) {
      rect(4, y, 8, 2, "#b98c55");
      rect(4, y + 1, 8, 1, "#8f6a3c");
    }
  },
  bed_top: (_px, rect) => {
    rect(0, 0, 16, 16, "#e0463c");
    rect(0, 0, 16, 5, "#f4f0e6");
    rect(1, 1, 14, 3, "#ffffff");
    rect(0, 5, 16, 1, "#a8281f");
    for (let x = 1; x < 16; x += 4) rect(x, 8, 2, 6, "#c93a31");
  },
  bed_side: (_px, rect) => {
    rect(0, 0, 16, 16, "#9b6b34");
    rect(0, 0, 16, 9, "#e0463c");
    rect(0, 0, 16, 3, "#f4f0e6");
    rect(0, 9, 16, 1, "#a8281f");
    rect(0, 14, 16, 2, "#6b4521");
  },
  respawn_anchor: (px, rect, rnd) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) px(x, y, rnd() > 0.5 ? "#2a1d3d" : "#34244b");
    rect(0, 0, 16, 1, "#15101f");
    rect(0, 15, 16, 1, "#15101f");
    rect(0, 0, 1, 16, "#15101f");
    rect(15, 0, 1, 16, "#15101f");
    rect(5, 5, 6, 6, "#9b5cff");
    rect(6, 6, 4, 4, "#d9b8ff");
    rect(7, 7, 2, 2, "#ffffff");
  },
  respawn_anchor_top: (px, rect, rnd) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) px(x, y, rnd() > 0.5 ? "#2a1d3d" : "#34244b");
    rect(2, 2, 12, 12, "#15101f");
    rect(4, 4, 8, 8, "#7a3fe0");
    rect(6, 6, 4, 4, "#d9b8ff");
  },
  lava: (px, _rect, rnd) => {
    const cols = ["#ff7a1a", "#ff9a2e", "#ffb347", "#e8531a", "#ffd37a"];
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) px(x, y, cols[Math.floor(rnd() * cols.length)]);
    for (let i = 0; i < 18; i++) px(Math.floor(rnd() * 16), Math.floor(rnd() * 16), "#ffe9a8");
  },
  slime_block: (px, rect, rnd) => {
    // Outer semi-translucent lime jelly background
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        px(x, y, rnd() > 0.5 ? "#76db40" : "#84e44e");
      }
    }

    // Outer gel borders & bevelled shading
    rect(0, 0, 16, 1, "#5ebf30");
    rect(0, 1, 1, 14, "#5ebf30");
    rect(0, 15, 16, 1, "#337817");
    rect(15, 1, 1, 14, "#337817");

    // Top-left outer corner highlight
    rect(1, 1, 3, 1, "#b5f777");
    rect(1, 2, 1, 2, "#b5f777");

    // Floating 3D Dark Lime Slime Core (8x8 box inside)
    rect(4, 4, 8, 8, "#255f11"); // core border
    rect(5, 5, 6, 6, "#52b525"); // core body
    for (let cy = 5; cy <= 10; cy++) {
      for (let cx = 5; cx <= 10; cx++) {
        if (rnd() > 0.6) px(cx, cy, "#5ec42c");
      }
    }
    // Core top-left highlight & rim
    rect(5, 5, 3, 1, "#8ceb4b");
    rect(5, 6, 1, 2, "#8ceb4b");
    px(6, 6, "#a9f56e"); // specular dot on core
    // Core bottom-right shadow
    rect(5, 10, 6, 1, "#347a16");
    rect(10, 5, 1, 5, "#347a16");

    // Outer translucent jelly reflections & gloss
    rect(2, 2, 4, 1, "#e6ffb5");
    rect(2, 3, 1, 2, "#e6ffb5");
    px(3, 3, "#ffffff"); // crisp bright glint

    // Suspended internal gel bubbles
    px(3, 12, "#b7f871");
    px(12, 3, "#b7f871");
    px(13, 11, "#a8f45f");
    px(12, 12, "#60bb2d");
  },
  door_button: (px, rect, rnd) => {
    stoneBase(px, rnd);
    rect(0, 0, 16, 1, "#5f666d");
    rect(0, 15, 16, 1, "#5f666d");
    rect(0, 0, 1, 16, "#5f666d");
    rect(15, 0, 1, 16, "#5f666d");
    rect(5, 5, 6, 6, "#c93a31");
    rect(6, 6, 4, 4, "#ff6a5e");
  },
};

export function hasPaintedTile(name: string) {
  return name in PAINTERS;
}

export function paintTile(name: string): HTMLCanvasElement | null {
  const painter = PAINTERS[name];
  if (!painter || typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  let seed = 0;
  for (let i = 0; i < name.length; i++) seed = (seed * 31 + name.charCodeAt(i)) >>> 0;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const px = (x: number, y: number, c: string) => {
    if (x < 0 || y < 0 || x > 15 || y > 15) return;
    ctx.clearRect(x, y, 1, 1);
    ctx.fillStyle = c;
    ctx.fillRect(x, y, 1, 1);
  };
  const rect = (x: number, y: number, w: number, h: number, c: string) => {
    ctx.clearRect(x, y, w, h);
    ctx.fillStyle = c;
    ctx.fillRect(x, y, w, h);
  };
  painter(px, rect, rnd);
  return canvas;
}
