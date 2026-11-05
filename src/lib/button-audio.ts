// Global button click audio listener for QBLOCK
// Plays https://file.garden/alGOOylwpAfCa6qP/Sounds/button_hit.mp3 on any button click

const BUTTON_HIT_URL = "https://file.garden/alGOOylwpAfCa6qP/Sounds/button_hit.mp3";

let audioCtx: AudioContext | null = null;
let audioBuffer: AudioBuffer | null = null;
let isBufferLoading = false;

async function getAudioBuffer(): Promise<AudioBuffer | null> {
  if (audioBuffer) return audioBuffer;
  if (isBufferLoading) return null;
  isBufferLoading = true;
  try {
    const res = await fetch(BUTTON_HIT_URL);
    const arrayBuffer = await res.arrayBuffer();
    const ctx = audioCtx || new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    audioCtx = ctx;
    audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    return audioBuffer;
  } catch (err) {
    console.warn("Could not load button_hit.mp3:", err);
    return null;
  } finally {
    isBufferLoading = false;
  }
}

export function playButtonHitSound() {
  try {
    const ctx = audioCtx || new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    audioCtx = ctx;
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    if (audioBuffer) {
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      const gainNode = ctx.createGain();
      gainNode.gain.value = 0.65;
      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      source.start(0);
      return;
    }

    // Fallback using HTMLAudioElement if WebAudio buffer is still loading
    const audio = new Audio(BUTTON_HIT_URL);
    audio.volume = 0.65;
    audio.play().catch(() => {});
    // Pre-fetch WebAudio buffer for subsequent clicks
    void getAudioBuffer();
  } catch {
    // Fail silently
  }
}

// Global click event handler for all button interactions across the app
let listenerAttached = false;
export function initButtonSoundListener() {
  if (listenerAttached || typeof window === "undefined") return;
  listenerAttached = true;

  // Pre-load audio buffer
  void getAudioBuffer();

  const handlePointerDown = (e: MouseEvent | TouchEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    const btn = target.closest('button, [role="button"], input[type="button"], input[type="submit"], .btn, .press');
    if (btn) {
      playButtonHitSound();
    }
  };

  window.addEventListener("pointerdown", handlePointerDown, { capture: true, passive: true });
}
