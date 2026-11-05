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
  // Silenced per user request: "don’t make app has that click sound neither spas or jump"
}

// Global click event handler silenced per user request
export function initButtonSoundListener() {
  // No-op
}
