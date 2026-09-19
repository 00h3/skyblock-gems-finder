import * as THREE from "three";

/**
 * Floating name + HP bar sprite ("Enemy" / [====] / 20/20) drawn on a canvas
 * texture. Small, flat and always facing the camera — hung above an entity.
 */
export interface HpBar {
  sprite: THREE.Sprite;
  set: (hp: number, max?: number) => void;
  dispose: () => void;
}

export function createHpBar(name: string, max = 20): HpBar {
  const W = 256;
  const H = 96;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;

  let heartLoaded = false;
  const heartImg = new Image();
  heartImg.src = "https://file.garden/alGOOylwpAfCa6qP/IMG_7256.png";
  heartImg.onload = () => {
    heartLoaded = true;
    draw();
  };

  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(1.6, 0.6, 1);
  sprite.renderOrder = 999;

  let current = max;
  let maximum = max;

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // name
    ctx.font = "bold 30px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 6;
    ctx.strokeStyle = "rgba(0,0,0,.75)";
    ctx.strokeText(name, W / 2, 24);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(name, W / 2, 24);

    // bar frame
    const bx = 24;
    const by = 50;
    const bw = W - 48;
    const bh = 22;
    ctx.fillStyle = "rgba(0,0,0,.7)";
    ctx.fillRect(bx - 3, by - 3, bw + 6, bh + 6);
    ctx.fillStyle = "#3a2020";
    ctx.fillRect(bx, by, bw, bh);

    // fill
    const ratio = maximum > 0 ? Math.max(0, Math.min(1, current / maximum)) : 0;
    ctx.fillStyle = ratio > 0.5 ? "#49d16a" : ratio > 0.25 ? "#e8c33c" : "#e0453c";
    ctx.fillRect(bx, by, bw * ratio, bh);

    // numbers
    ctx.font = "bold 18px system-ui, sans-serif";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(0,0,0,.8)";
    const label = `${Math.max(0, Math.round(current))}/${maximum}`;
    ctx.strokeText(label, W / 2, by + bh / 2 + 1);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(label, W / 2, by + bh / 2 + 1);

    if (heartLoaded) {
      ctx.drawImage(heartImg, bx - 16, by - 6, 32, 32);
    }

    tex.needsUpdate = true;
  }

  draw();

  return {
    sprite,
    set(hp: number, m?: number) {
      current = hp;
      if (typeof m === "number") maximum = m;
      draw();
    },
    dispose() {
      tex.dispose();
      mat.dispose();
    },
  };
}
