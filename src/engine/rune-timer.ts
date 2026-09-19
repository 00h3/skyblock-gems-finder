import * as THREE from "three";

const SS = 3;
const MAX_SECONDS = 10 * 60;

/**
 * A readable world-space timer that floats above each Runes Ghast.
 * It intentionally uses a wide horizontal card with generous vertical
 * separation from the model so the timer never sits on top of the Ghast.
 */
export class RuneTimerTag {
  readonly group = new THREE.Group();
  private sprite: THREE.Sprite;
  private icon: HTMLImageElement | null = null;
  private lastSeconds = -1;

  constructor() {
    this.sprite = makeSprite(drawTimer(MAX_SECONDS, null));
    this.group.add(this.sprite);

    const icon = new Image();
    icon.onload = () => {
      this.icon = icon;
      this.redraw(MAX_SECONDS);
    };
    icon.src = "/runes-magnify.png";
  }

  update(cameraPosition: THREE.Vector3, seconds: number) {
    const remaining = Math.max(0, Math.ceil(seconds));
    if (remaining !== this.lastSeconds) this.redraw(remaining);

    const distance = this.group.position.distanceTo(cameraPosition);
    const scale = THREE.MathUtils.clamp(0.72 + distance * 0.05, 0.72, 2.1);
    const height = 0.9 * scale;
    this.sprite.scale.set(height * 4.1, height, 1);
  }

  private redraw(seconds: number) {
    this.lastSeconds = seconds;
    const next = makeSprite(drawTimer(seconds, this.icon));
    next.scale.copy(this.sprite.scale);
    this.group.remove(this.sprite);
    disposeSprite(this.sprite);
    this.sprite = next;
    this.group.add(this.sprite);
  }

  dispose() {
    disposeSprite(this.sprite);
    this.group.clear();
  }
}

function makeSprite(canvas: HTMLCanvasElement) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    }),
  );
  sprite.renderOrder = 1000;
  return sprite;
}

function disposeSprite(sprite: THREE.Sprite) {
  sprite.material.map?.dispose();
  sprite.material.dispose();
}

function drawTimer(seconds: number, icon: HTMLImageElement | null) {
  const width = 640;
  const height = 156;
  const canvas = document.createElement("canvas");
  canvas.width = width * SS;
  canvas.height = height * SS;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(SS, SS);

  roundRect(ctx, 1, 1, width - 2, height - 2, 24);
  ctx.fillStyle = "rgba(16, 19, 28, 0.94)";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(255,255,255,0.3)";
  ctx.stroke();

  if (icon) {
    ctx.save();
    roundRect(ctx, 18, 25, 106, 106, 20);
    ctx.clip();
    ctx.drawImage(icon, 18, 25, 106, 106);
    ctx.restore();
  } else {
    ctx.fillStyle = "#3b4658";
    roundRect(ctx, 18, 25, 106, 106, 20);
    ctx.fill();
  }

  ctx.textBaseline = "middle";
  ctx.font = "900 27px Inter, ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("RUNES", 148, 38);
  ctx.font = "700 24px Inter, ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = "#ffdbe0";
  ctx.fillText(`${formatTime(seconds)} left`, 148, 72);

  const barX = 148;
  const barY = 105;
  const barW = 462;
  const barH = 24;
  roundRect(ctx, barX, barY, barW, barH, 12);
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fill();
  const progress = Math.max(0, Math.min(1, seconds / MAX_SECONDS));
  if (progress > 0) {
    ctx.save();
    roundRect(ctx, barX, barY, barW * progress, barH, 12);
    ctx.clip();
    const gradient = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    gradient.addColorStop(0, "#ff6473");
    gradient.addColorStop(0.5, "#f02f55");
    gradient.addColorStop(1, "#a90835");
    ctx.fillStyle = gradient;
    ctx.fillRect(barX, barY, barW, barH);
    ctx.restore();
  }
  return canvas;
}

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}
