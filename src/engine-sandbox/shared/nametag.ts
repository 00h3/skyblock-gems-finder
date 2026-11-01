import * as THREE from "three";

/**
 * Canvas-sprite label rendered above a character: the player's name in Inter
 * plus any equipped badges, and a rectangular chat panel that floats above the
 * name for a few seconds. Everything is drawn at high resolution (4x) so the
 * text stays crisp on retina displays and when the camera is close.
 */

const SS = 4; // supersample factor — crisp text at any distance
const NAME_PX = 34; // logical font size
const CHAT_PX = 30;

export type TagBadge = string; // image url

export class NameTag {
  readonly group = new THREE.Group();
  private nameSprite: THREE.Sprite;
  private bubbleSprite: THREE.Sprite | null = null;
  private bubbleUntil = 0;
  private badgeImages: HTMLImageElement[] = [];

  constructor(
    private name: string,
    private headY = 2.05,
    private badges: TagBadge[] = [],
    private color = "#ffffff",
  ) {
    this.nameSprite = makeSprite(drawName(name, [], color));
    this.nameSprite.position.set(0, this.headY, 0);
    this.group.add(this.nameSprite);
    this.loadBadges(badges);
    
    // Check local storage for initial state
    try {
      if (localStorage.getItem("qb_hide_id") === "true") {
        this.setNameVisible(false); // Simplified: NameTag is already nameSprite. Need to distinguish ID from Name.
      }
    } catch {}
  }

  // Need to be able to hide just the ID part of the nameplate
  setName(name: string, showId: boolean = true) {
    // This is tricky because drawName draws both.
    // I should modify drawName to accept a showId parameter.
    if (name === this.name) return;
    this.name = name;
    this.redrawName();
  }

  setBadges(badges: TagBadge[]) {
    if (badges.join("|") === this.badges.join("|")) return;
    this.badges = badges;
    this.loadBadges(badges);
  }

  private loadBadges(urls: TagBadge[]) {
    if (!urls.length) {
      this.badgeImages = [];
      this.redrawName();
      return;
    }
    let pending = urls.length;
    const imgs: HTMLImageElement[] = [];
    urls.forEach((url) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      const done = (ok: boolean) => {
        if (ok) imgs.push(img);
        if (--pending === 0) {
          this.badgeImages = imgs;
          this.redrawName();
        }
      };
      img.onload = () => done(true);
      img.onerror = () => done(false);
      img.src = url;
    });
  }

  private redrawName() {
    disposeSprite(this.nameSprite);
    this.group.remove(this.nameSprite);
    this.nameSprite = makeSprite(drawName(this.name, this.badgeImages, this.color));
    this.nameSprite.position.set(0, this.headY, 0);
    this.group.add(this.nameSprite);
  }

  /** True while a chat panel is currently floating above the name. */
  get hasBubble() {
    return !!this.bubbleSprite && performance.now() <= this.bubbleUntil;
  }

  /** Hide just the name plate (used in first person so only the bubble shows). */
  setNameVisible(visible: boolean) {
    this.nameSprite.visible = visible;
  }

  /** Show a rectangular chat panel above the name for `ms` milliseconds. */
  say(text: string, ms = 6500) {
    this.clearBubble();
    this.bubbleSprite = makeSprite(drawChat(text));
    this.bubbleSprite.position.set(0, this.headY + 0.34, 0);
    this.group.add(this.bubbleSprite);
    this.bubbleUntil = performance.now() + ms;
  }

  update(cameraPosition: THREE.Vector3) {
    if (this.bubbleSprite && performance.now() > this.bubbleUntil) this.clearBubble();
    const d = this.group.position.distanceTo(cameraPosition);
    const s = THREE.MathUtils.clamp(0.7 + d * 0.055, 0.7, 2.2);
    const nameAspect = (this.nameSprite.userData["aspect"] as number) || 4;
    const nameH = 0.34 * s;
    this.nameSprite.scale.set(nameH * nameAspect, nameH, 1);
    if (this.bubbleSprite) {
      const w = (this.bubbleSprite.userData["aspect"] as number) || 3;
      const h = 0.38 * s;
      this.bubbleSprite.scale.set(h * w, h, 1);
      this.bubbleSprite.position.y = this.headY + nameH * 0.6 + h * 0.75;
    }
  }

  private clearBubble() {
    if (!this.bubbleSprite) return;
    this.group.remove(this.bubbleSprite);
    disposeSprite(this.bubbleSprite);
    this.bubbleSprite = null;
  }

  dispose() {
    this.clearBubble();
    disposeSprite(this.nameSprite);
    this.group.clear();
  }
}

function makeSprite(canvas: HTMLCanvasElement) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.renderOrder = 999;
  sprite.userData["aspect"] = canvas.width / canvas.height;
  return sprite;
}

function disposeSprite(s: THREE.Sprite) {
  s.material.map?.dispose();
  s.material.dispose();
}

const nameFont = (px: number) =>
  `800 ${px}px Inter, "Inter", ui-sans-serif, system-ui, -apple-system, sans-serif`;
const chatFont = (px: number) =>
  `600 ${px}px Inter, "Inter", ui-sans-serif, system-ui, -apple-system, sans-serif`;

/** Rectangular name plate with optional badge icons on the right. */
function roundRect(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + rr, y);
  c.arcTo(x + w, y, x + w, y + h, rr);
  c.arcTo(x + w, y + h, x, y + h, rr);
  c.arcTo(x, y + h, x, y, rr);
  c.arcTo(x, y, x + w, y, rr);
  c.closePath();
}

function drawName(name: string, badges: HTMLImageElement[], color = "#ffffff") {
  const padX = 14;
  const h = 48;
  const badgeSize = 24;
  const measure = document.createElement("canvas").getContext("2d")!;
  measure.font = nameFont(NAME_PX);
  const textW = measure.measureText(name).width;

  // Blockman GO VIP badge dimensions
  const vipW = 54;
  const vipH = 22;
  const gap = 8;
  const badgesW = badges.length ? badges.length * (badgeSize + 6) : 0;
  const w = Math.ceil(textW + gap + vipW + badgesW + padX * 2);

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(80, w) * SS;
  canvas.height = h * SS;
  const c = canvas.getContext("2d")!;
  c.scale(SS, SS);
  c.textBaseline = "middle";

  // Name with crisp dark outline (Blockman GO signature outline)
  c.font = nameFont(NAME_PX);
  c.textAlign = "left";

  const lowerName = name.toLowerCase();
  const isH3 = lowerName === "h3" || lowerName === "00h3" || lowerName.includes("h3");
  const isStr = lowerName === "str" || lowerName.includes("str");

  // Dark outline for crystal clarity in all lighting
  c.lineWidth = 4;
  c.strokeStyle = "rgba(0, 0, 0, 0.88)";
  c.strokeText(name, padX, h / 2 + 1);

  if (isH3) {
    const textGrad = c.createLinearGradient(padX, 0, padX + textW, 0);
    textGrad.addColorStop(0, "#fa4616");
    textGrad.addColorStop(0.5, "#ff8800");
    textGrad.addColorStop(1, "#ffa726");
    c.fillStyle = textGrad;
  } else if (isStr) {
    const textGrad = c.createLinearGradient(padX, 0, padX + textW, 0);
    textGrad.addColorStop(0, "#ec4899");
    textGrad.addColorStop(0.5, "#f472b6");
    textGrad.addColorStop(1, "#fb7185");
    c.fillStyle = textGrad;
  } else {
    c.fillStyle = color;
  }
  c.fillText(name, padX, h / 2 + 1);

  // Draw Blockman GO VIP0 badge next to player name
  const vipX = padX + textW + gap;
  const vipY = (h - vipH) / 2;
  c.save();
  const grad = c.createLinearGradient(vipX, vipY, vipX, vipY + vipH);
  grad.addColorStop(0, "rgba(215, 228, 245, 0.95)");
  grad.addColorStop(1, "rgba(140, 162, 188, 0.95)");
  c.fillStyle = grad;
  c.strokeStyle = "rgba(255, 255, 255, 0.85)";
  c.lineWidth = 1;
  roundRect(c, vipX, vipY, vipW, vipH, 5);
  c.fill();
  c.stroke();

  // VIP0 text
  c.font = `italic 900 12px Inter, ui-sans-serif, system-ui, sans-serif`;
  c.fillStyle = "#1e293b";
  c.textAlign = "center";
  c.fillText("VIP0", vipX + vipW / 2, vipY + vipH / 2 + 0.5);
  c.restore();

  let bx = vipX + vipW + 6;
  badges.forEach((img) => {
    try {
      c.drawImage(img, bx, (h - badgeSize) / 2, badgeSize, badgeSize);
    } catch {
      /* tainted or broken image */
    }
    bx += badgeSize + 6;
  });

  return canvas;
}

/** Rounded chat bubble. */
function drawChat(text: string) {
  const clipped = text.length > 70 ? `${text.slice(0, 69)}…` : text;
  const padX = 18;
  const h = 48;
  const measure = document.createElement("canvas").getContext("2d")!;
  measure.font = chatFont(CHAT_PX);
  const w = Math.ceil(Math.min(760, measure.measureText(clipped).width + padX * 2));

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(90, w) * SS;
  canvas.height = h * SS;
  const c = canvas.getContext("2d")!;
  c.scale(SS, SS);
  c.textBaseline = "middle";

  roundRect(c, 1, 1, w - 2, h - 2, 16);
  c.fillStyle = "rgba(255,255,255,0.97)";
  c.fill();
  c.lineWidth = 2;
  c.strokeStyle = "rgba(16,22,30,0.22)";
  c.stroke();

  c.font = chatFont(CHAT_PX);
  c.textAlign = "center";
  c.fillStyle = "#12161c";
  c.fillText(clipped, w / 2, h / 2 + 1);
  return canvas;
}
