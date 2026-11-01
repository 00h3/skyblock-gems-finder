/**
 * Web Audio UI and Magic Sound Synthesizer
 * Produces crisp, tactile clicks, pops, and magical wand chimes without downloading external audio files.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      audioCtx = new AudioCtx();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playUiClick(pitch = 1.0): void {
  try {
    const sfxMuted = localStorage.getItem("qb_sfx_muted") === "true";
    if (sfxMuted) return;

    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    const startFreq = 420 * pitch;
    osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.045);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.045);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  } catch {}
}

export function playMagicWandCast(): void {
  try {
    const sfxMuted = localStorage.getItem("qb_sfx_muted") === "true";
    if (sfxMuted) return;

    const ctx = getAudioContext();
    if (!ctx) return;

    // Arpeggiated celestial wand chime
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.035);

      gain.gain.setValueAtTime(0.001, ctx.currentTime + idx * 0.035);
      gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + idx * 0.035 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.035 + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.035);
      osc.stop(ctx.currentTime + idx * 0.035 + 0.3);
    });
  } catch {}
}
