import * as THREE from "three";
import { paintTile } from "./procedural-tiles";

/**
 * Builds a single padded texture atlas from the supplied cartoon block pack
 * (`/textures/blocks`), plus a procedural 10-stage crack ("destroy stage")
 * strip used by the hold-to-break animation.
 *
 * Each source tile is upscaled into a 96x96 cell with a 16px replicated
 * border. The padding keeps mipmaps from bleeding into neighbouring tiles,
 * while linear filtering gives the block surfaces a cleaner, higher-quality
 * finish at different camera distances.
 */

export const TEXTURE_BASE = "/textures/blocks/";

export const TILE_NAMES = [
  "grass_block_top",
  "grass_block_side",
  "dirt",
  "coarse_dirt",
  "dirt_path_top",
  "dirt_path_side",
  "stone",
  "smooth_stone",
  "cobblestone",
  "mossy_cobblestone",
  "stone_bricks",
  "chiseled_stone_bricks",
  "granite",
  "diorite",
  "andesite",
  "gravel",
  "sand",
  "red_sand",
  "snow",
  "ice",
  "glass",
  "obsidian",
  "bedrock",
  "netherrack",
  "nether_bricks",
  "glowstone",
  "coal_ore",
  "redstone_ore",
  "diamond_block",
  "emerald_block",
  "gold_block",
  "iron_block",
  "lapis_block",
  "amethyst_block",
  "oak_planks",
  "bookshelf",
  "oak_log",
  "oak_log_top",
  "birch_log",
  "birch_log_top",
  "spruce_log",
  "spruce_log_top",
  "dark_oak_log",
  "dark_oak_log_top",
  "acacia_log",
  "acacia_log_top",
  "jungle_log",
  "jungle_log_top",
  "oak_leaves",
  "birch_leaves",
  "spruce_leaves",
  "jungle_leaves",
  "acacia_leaves",
  "hay_block_side",
  "hay_block_top",
  "pumpkin_side",
  "pumpkin_top",
  "melon_side",
  "melon_top",
  "tnt_side",
  "tnt_top",
  "white_wool",
  "red_wool",
  "blue_wool",
  "green_wool",
  "yellow_wool",
  "pink_wool",
  "terracotta",
  "water",
  "iron_ore",
  "diamond_ore",
  "oak_door",
  "oak_door_open",
  "iron_door",
  "iron_door_open",
  "chest",
  "trapped_chest",
  "blast_glass",
  "ladder",
  "bed_top",
  "bed_side",
  "respawn_anchor",
  "respawn_anchor_top",
  "lava",
  "slime_block",
  "door_button",
] as const;

export type TileName = (typeof TILE_NAMES)[number];

const INNER = 96;
const PAD = 16;
const CELL = INNER + PAD * 2;

export const CRACK_STAGES = 10;

export type Atlas = {
  texture: THREE.Texture;
  /** 10-stage crack strip (stage i at u = i/10 .. (i+1)/10). */
  crack: THREE.Texture;
  cols: number;
  rows: number;
  /** [u0, v0, u1, v1] for a tile, already inset to the padded inner area. */
  uv: (name: string) => [number, number, number, number];
  url: (name: string) => string;
  dispose: () => void;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load texture ${src}`));
    img.src = src;
  });
}

/** Minecraft-style destroy-stage strip drawn procedurally (10 frames). */
function buildCrackTexture(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size * CRACK_STAGES;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // deterministic pseudo-random so cracks always grow the same way
  let seed = 9187;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };

  type Seg = { x1: number; y1: number; x2: number; y2: number };
  const segs: Seg[] = [];
  // build a growing web of cracks: each stage adds a few more strokes
  const branches = 5;
  for (let b = 0; b < branches; b++) {
    let x = size / 2 + (rnd() - 0.5) * 10;
    let y = size / 2 + (rnd() - 0.5) * 10;
    let a = (b / branches) * Math.PI * 2 + rnd() * 0.6;
    for (let s = 0; s < 9; s++) {
      const len = 4 + rnd() * 6;
      const nx = x + Math.cos(a) * len;
      const ny = y + Math.sin(a) * len;
      segs.push({ x1: x, y1: y, x2: nx, y2: ny });
      x = nx;
      y = ny;
      a += (rnd() - 0.5) * 1.5;
      if (x < 2 || x > size - 2 || y < 2 || y > size - 2) break;
    }
  }

  for (let stage = 0; stage < CRACK_STAGES; stage++) {
    const ox = stage * size;
    const shown = Math.ceil(((stage + 1) / CRACK_STAGES) * segs.length);
    ctx.save();
    ctx.beginPath();
    ctx.rect(ox, 0, size, size);
    ctx.clip();
    ctx.strokeStyle = "rgba(0,0,0,0.85)";
    ctx.lineCap = "square";
    for (let i = 0; i < shown; i++) {
      const s = segs[i];
      ctx.lineWidth = 1 + (stage / CRACK_STAGES) * 3;
      ctx.beginPath();
      ctx.moveTo(ox + s.x1, s.y1);
      ctx.lineTo(ox + s.x2, s.y2);
      ctx.stroke();
    }
    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  // Nearest texels inside each mip level (crisp pixels) with a smooth blend
  // between mip levels (no shimmering when the crack overlay moves away).
  tex.minFilter = THREE.NearestMipmapLinearFilter;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1 / CRACK_STAGES, 1);
  tex.needsUpdate = true;
  return tex;
}

export async function buildAtlas(
  onProgress?: (loaded: number, total: number) => void,
): Promise<Atlas> {
  const total = TILE_NAMES.length;
  const cols = Math.ceil(Math.sqrt(total));
  const rows = Math.ceil(total / cols);

  const canvas = document.createElement("canvas");
  canvas.width = cols * CELL;
  canvas.height = rows * CELL;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const index = new Map<string, number>();
  const sourceUrls = new Map<string, string>();

  ctx.filter = "saturate(105%)";

  // The supplied cartoon resource pack is the only canonical source. Missing
  // tiles stay visibly magenta instead of silently bringing back an old pack.
  const images = await Promise.all(
    TILE_NAMES.map(async (name) => {
      const source = `${TEXTURE_BASE}${name}.png`;
      try {
        const img = await loadImage(source);
        sourceUrls.set(name, source);
        return img;
      } catch {
        const painted = paintTile(name);
        if (painted) {
          sourceUrls.set(name, painted.toDataURL());
          return painted;
        }
      }
      return null;
    }),
  );

  for (let i = 0; i < total; i++) {
    const name = TILE_NAMES[i];
    index.set(name, i);
    const cx = (i % cols) * CELL;
    const cy = Math.floor(i / cols) * CELL;
    const img = images[i];
    if (img) {
      if (name.includes("grass")) {
        ctx.filter = "saturate(118%) contrast(104%)";
      } else {
        ctx.filter = "saturate(105%)";
      }
      // Draw the tile over the whole cell first to create a replicated border,
      // then redraw the inner tile at the final display resolution.
      const crisp = img instanceof HTMLCanvasElement;
      ctx.imageSmoothingEnabled = !crisp;
      ctx.drawImage(img, cx, cy, CELL, CELL);
      ctx.drawImage(img, cx + PAD, cy + PAD, INNER, INNER);
      ctx.imageSmoothingEnabled = true;
      ctx.filter = "saturate(105%)";
    } else if (name === "water") {
      const grad = ctx.createLinearGradient(cx, cy, cx + CELL, cy + CELL);
      grad.addColorStop(0, "#1988db");
      grad.addColorStop(0.5, "#25a5f5");
      grad.addColorStop(1, "#126bb8");
      ctx.fillStyle = grad;
      ctx.fillRect(cx, cy, CELL, CELL);

      ctx.save();
      ctx.strokeStyle = "rgba(185, 238, 255, 0.45)";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";

      ctx.beginPath();
      ctx.arc(cx + CELL * 0.35, cy + CELL * 0.35, CELL * 0.22, 0.2, Math.PI * 0.9);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx + CELL * 0.72, cy + CELL * 0.65, CELL * 0.18, Math.PI * 0.8, Math.PI * 1.7);
      ctx.stroke();

      ctx.strokeStyle = "rgba(255, 255, 255, 0.65)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx + CELL * 0.38, cy + CELL * 0.33, CELL * 0.14, 0.4, Math.PI * 0.75);
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.fillStyle = "#ff28c8";
      ctx.fillRect(cx, cy, CELL, CELL);
    }
    onProgress?.(i + 1, total);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 16;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;

  const crack = buildCrackTexture();

  const uv = (name: string): [number, number, number, number] => {
    const i = index.get(name) ?? 0;
    const cx = (i % cols) * CELL;
    const cy = Math.floor(i / cols) * CELL;
    const u0 = (cx + PAD + 0.5) / canvas.width;
    const u1 = (cx + PAD + INNER - 0.5) / canvas.width;
    // canvas y grows down, texture v grows up
    const v1 = 1 - (cy + PAD + 0.5) / canvas.height;
    const v0 = 1 - (cy + PAD + INNER - 0.5) / canvas.height;
    return [u0, v0, u1, v1];
  };

  return {
    texture,
    crack,
    cols,
    rows,
    uv,
    url: (name: string) => sourceUrls.get(name) ?? `${TEXTURE_BASE}${name}.png`,
    dispose: () => {
      texture.dispose();
      crack.dispose();
    },
  };
}
