/**
 * Renders the QBLOCK trailer on a canvas with a synthesized soundtrack and
 * records it with MediaRecorder, entirely on-device. Output is MP4 where the
 * browser supports it (Safari/iOS, recent Chrome) and WebM otherwise.
 */

export type TrailerScene = {
  image: string;
  eyebrow: string;
  title: string;
  tagline: string;
  accent: string;
};

const W = 1280;
const H = 720;
const SCENE_SEC = 3.4;
const INTRO_SEC = 2.8;
const OUTRO_SEC = 3.2;

function loadImage(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export function pickTrailerMime() {
  const candidates = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  if (typeof MediaRecorder === "undefined") return null;
  return candidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
}

const ease = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

function drawCover(g: CanvasRenderingContext2D, img: HTMLImageElement, zoom: number, panX: number) {
  const s = Math.max(W / img.width, H / img.height) * zoom;
  const w = img.width * s;
  const h = img.height * s;
  g.drawImage(img, (W - w) / 2 + panX, (H - h) / 2, w, h);
}

function drawSky(g: CanvasRenderingContext2D, t: number) {
  const sunset = (Math.sin(t * 0.6) + 1) / 2;
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, sunset > 0.5 ? "#1b2a5c" : "#0b3d91");
  grad.addColorStop(0.55, sunset > 0.5 ? "#e8683a" : "#3a9af5");
  grad.addColorStop(1, sunset > 0.5 ? "#ffc27a" : "#cfeaff");
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  const sx = W * 0.7;
  const sy = H * (0.35 + sunset * 0.25);
  const glow = g.createRadialGradient(sx, sy, 0, sx, sy, 380);
  glow.addColorStop(0, "rgba(255,244,214,0.95)");
  glow.addColorStop(0.1, "rgba(255,210,140,0.55)");
  glow.addColorStop(1, "rgba(255,160,90,0)");
  g.fillStyle = glow;
  g.fillRect(0, 0, W, H);
  // Voxel island silhouettes drifting past.
  g.fillStyle = "rgba(12,16,28,0.85)";
  for (let i = 0; i < 6; i++) {
    const x = ((i * 260 - t * 40) % (W + 300)) - 150;
    const y = H * 0.62 + (i % 3) * 40;
    const s = 34 + (i % 2) * 18;
    for (let c = 0; c < 5; c++) g.fillRect(x + c * s, y - (c % 2) * s, s, s);
    for (let c = 1; c < 4; c++) g.fillRect(x + c * s, y + s, s, s);
    g.fillRect(x + 2 * s, y + 2 * s, s, s);
  }
}

export async function recordTrailer(
  scenes: TrailerScene[],
  logoSrc: string,
  onProgress: (p: number) => void,
): Promise<{ blob: Blob; ext: string }> {
  const mime = pickTrailerMime();
  if (mime === null) throw new Error("This browser can't record video. Try Chrome or Safari.");

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext("2d")!;
  const [logo, ...imgs] = await Promise.all([loadImage(logoSrc), ...scenes.map((s) => loadImage(s.image))]);

  const total = INTRO_SEC + scenes.length * SCENE_SEC + SCENE_SEC + OUTRO_SEC;
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audio = new AudioCtx();
  await audio.resume();
  const dest = audio.createMediaStreamDestination();
  scheduleSoundtrack(audio, dest, total);

  const stream = canvas.captureStream(30);
  dest.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
  const recorder = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), videoBitsPerSecond: 6_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise<void>((resolve) => (recorder.onstop = () => resolve()));
  recorder.start(250);

  const start = performance.now();
  await new Promise<void>((resolve) => {
    const frame = () => {
      const t = (performance.now() - start) / 1000;
      onProgress(Math.min(1, t / total));
      renderFrame(g, t, scenes, imgs, logo);
      if (t >= total) return resolve();
      requestAnimationFrame(frame);
    };
    frame();
  });

  recorder.stop();
  await done;
  stream.getTracks().forEach((tr) => tr.stop());
  void audio.close();
  const type = recorder.mimeType || mime || "video/webm";
  return { blob: new Blob(chunks, { type }), ext: type.includes("mp4") ? "mp4" : "webm" };
}

function renderFrame(
  g: CanvasRenderingContext2D,
  t: number,
  scenes: TrailerScene[],
  imgs: (HTMLImageElement | null)[],
  logo: HTMLImageElement | null,
) {
  g.save();
  g.fillStyle = "#05060a";
  g.fillRect(0, 0, W, H);

  const v2Start = INTRO_SEC + scenes.length * SCENE_SEC;
  const outroStart = v2Start + SCENE_SEC;

  if (t < INTRO_SEC) {
    const p = t / INTRO_SEC;
    drawSky(g, t);
    g.fillStyle = `rgba(5,6,10,${0.75 - p * 0.35})`;
    g.fillRect(0, 0, W, H);
    if (logo) {
      const s = 150 + ease(p * 1.4) * 60;
      g.globalAlpha = ease(p * 2);
      g.drawImage(logo, W / 2 - s / 2, H / 2 - s / 2 - 60, s, s);
      g.globalAlpha = 1;
    }
    title(g, "QBLOCK PRESENTS", "A new era of block games", "#ffd23f", p, H / 2 + 110);
  } else if (t < v2Start) {
    const idx = Math.floor((t - INTRO_SEC) / SCENE_SEC);
    const p = (t - INTRO_SEC - idx * SCENE_SEC) / SCENE_SEC;
    const sc = scenes[idx];
    const img = imgs[idx];
    if (img) drawCover(g, img, 1.08 + p * 0.12, (idx % 2 ? -1 : 1) * (p - 0.5) * 60);
    const shade = g.createLinearGradient(0, H * 0.35, 0, H);
    shade.addColorStop(0, "rgba(0,0,0,0)");
    shade.addColorStop(1, "rgba(0,0,0,0.85)");
    g.fillStyle = shade;
    g.fillRect(0, 0, W, H);
    title(g, sc.eyebrow, sc.tagline, sc.accent, p, H - 150, sc.title);
    flash(g, p);
  } else if (t < outroStart) {
    const p = (t - v2Start) / SCENE_SEC;
    drawSky(g, t * 2);
    title(g, "GRAPHICS V2", "Cinematic skies. Dynamic light. Real physics.", "#7dd3fc", p, H - 150, "EVERYTHING ALIVE");
    flash(g, p);
  } else {
    const p = Math.min(1, (t - outroStart) / OUTRO_SEC);
    drawSky(g, t);
    g.fillStyle = "rgba(5,6,10,0.6)";
    g.fillRect(0, 0, W, H);
    if (logo) {
      g.globalAlpha = ease(p * 2);
      g.drawImage(logo, W / 2 - 90, H / 2 - 170, 180, 180);
      g.globalAlpha = 1;
    }
    title(g, "PLAY NOW", "Skyblock · Bedwars · Block Fall", "#ffd23f", p, H / 2 + 110, "QBLOCK");
    g.fillStyle = `rgba(0,0,0,${Math.max(0, (p - 0.85) / 0.15)})`;
    g.fillRect(0, 0, W, H);
  }

  // Letterbox bars + light film grain for a cinematic finish.
  g.fillStyle = "#000";
  g.fillRect(0, 0, W, 54);
  g.fillRect(0, H - 54, W, 54);
  g.globalAlpha = 0.05;
  for (let i = 0; i < 90; i++) {
    g.fillStyle = Math.random() > 0.5 ? "#fff" : "#000";
    g.fillRect(Math.random() * W, Math.random() * H, 2, 2);
  }
  g.restore();
}

function flash(g: CanvasRenderingContext2D, p: number) {
  if (p > 0.08) return;
  g.fillStyle = `rgba(255,255,255,${(1 - p / 0.08) * 0.8})`;
  g.fillRect(0, 0, W, H);
}

function title(g: CanvasRenderingContext2D, eyebrow: string, tagline: string, accent: string, p: number, y: number, big?: string) {
  const inP = ease((p - 0.08) * 3);
  const outP = p > 0.88 ? 1 - (p - 0.88) / 0.12 : 1;
  g.globalAlpha = inP * outP;
  g.textAlign = "center";
  const slide = (1 - inP) * 40;
  g.fillStyle = accent;
  g.font = "800 22px system-ui, sans-serif";
  g.fillText(eyebrow.split("").join(" "), W / 2, y - (big ? 78 : 10) + slide);
  if (big) {
    g.fillStyle = "#fff";
    g.font = "900 84px system-ui, sans-serif";
    g.shadowColor = "rgba(0,0,0,0.6)";
    g.shadowBlur = 24;
    g.fillText(big, W / 2, y + slide);
    g.shadowBlur = 0;
  }
  g.fillStyle = "rgba(255,255,255,0.88)";
  g.font = "600 28px system-ui, sans-serif";
  g.fillText(tagline, W / 2, y + (big ? 48 : 34) + slide);
  g.globalAlpha = 1;
}

/** 110 BPM kick + hat + a warm minor pad, all synthesized. */
function scheduleSoundtrack(ctx: AudioContext, out: AudioNode, total: number) {
  const master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(out);
  const beat = 60 / 110;
  const t0 = ctx.currentTime + 0.05;
  for (let b = 0; b * beat < total; b++) {
    const at = t0 + b * beat;
    if (b >= 4) {
      const o = ctx.createOscillator();
      const gn = ctx.createGain();
      o.frequency.setValueAtTime(140, at);
      o.frequency.exponentialRampToValueAtTime(40, at + 0.18);
      gn.gain.setValueAtTime(0.9, at);
      gn.gain.exponentialRampToValueAtTime(0.001, at + 0.3);
      o.connect(gn).connect(master);
      o.start(at);
      o.stop(at + 0.32);
    }
    const hat = ctx.createOscillator();
    const hg = ctx.createGain();
    hat.type = "square";
    hat.frequency.value = 8000;
    hg.gain.setValueAtTime(0.03, at + beat / 2);
    hg.gain.exponentialRampToValueAtTime(0.0001, at + beat / 2 + 0.05);
    hat.connect(hg).connect(master);
    hat.start(at + beat / 2);
    hat.stop(at + beat / 2 + 0.06);
  }
  const chords = [
    [220, 261.6, 329.6],
    [174.6, 220, 261.6],
    [196, 246.9, 293.7],
    [164.8, 207.7, 246.9],
  ];
  const bar = beat * 4;
  for (let i = 0; i * bar < total; i++) {
    const at = t0 + i * bar;
    for (const f of chords[i % chords.length]) {
      const o = ctx.createOscillator();
      const gn = ctx.createGain();
      o.type = "sawtooth";
      o.frequency.value = f;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 900;
      gn.gain.setValueAtTime(0, at);
      gn.gain.linearRampToValueAtTime(0.05, at + 0.4);
      gn.gain.linearRampToValueAtTime(0, at + bar);
      o.connect(lp).connect(gn).connect(master);
      o.start(at);
      o.stop(at + bar + 0.05);
    }
  }
}
