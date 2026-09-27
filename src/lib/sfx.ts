// Realistic synthesized SFX for the voxel engine.
// Everything is generated with the Web Audio API (no downloads), but instead of
// bare oscillator beeps these use filtered noise bursts + pitched bodies, which
// is how the real Minecraft-style dig/place/step sounds are shaped.
import { BmgoAudio } from "@/lib/bmgo-audio";

export type SfxType =
  | "jump"
  | "land"
  | "break"
  | "place"
  | "mine_tick"
  | "step"
  | "chest_open"
  | "chest_close"
  | "hurt"
  | "air_dig"
  | "air_whoosh"
  | "sword_hit"
  | "pop";

let actx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;

function ctx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!actx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    actx = new Ctor();
    master = actx.createGain();
    master.gain.value = 0.85;
    master.connect(actx.destination);
  }
  if (actx.state === "suspended") void actx.resume();
  return actx;
}

/** 1s of white noise, reused for every grain (cheap + no allocation spikes). */
function noise(a: AudioContext): AudioBuffer {
  if (noiseBuffer) return noiseBuffer;
  const buf = a.createBuffer(1, a.sampleRate, a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  noiseBuffer = buf;
  return buf;
}

type Grain = {
  /** noise band centre in Hz */
  freq: number;
  q?: number;
  type?: BiquadFilterType;
  dur: number;
  gain: number;
  /** playback rate wobble adds the gritty, non-synthetic texture */
  rate?: number;
  delay?: number;
};

function playNoise(a: AudioContext, g: Grain) {
  const t = a.currentTime + (g.delay ?? 0);
  const src = a.createBufferSource();
  src.buffer = noise(a);
  src.loop = true;
  src.playbackRate.value = g.rate ?? 1;

  const filter = a.createBiquadFilter();
  filter.type = g.type ?? "bandpass";
  filter.frequency.value = g.freq;
  filter.Q.value = g.q ?? 1.2;

  const env = a.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(g.gain, t + Math.min(0.008, g.dur * 0.2));
  env.gain.exponentialRampToValueAtTime(0.0001, t + g.dur);

  src.connect(filter);
  filter.connect(env);
  env.connect(master!);
  src.start(t);
  src.stop(t + g.dur + 0.02);
}

type Tone = {
  freq: number;
  to?: number;
  dur: number;
  gain: number;
  type?: OscillatorType;
  delay?: number;
};

function playTone(a: AudioContext, o: Tone) {
  const t = a.currentTime + (o.delay ?? 0);
  const osc = a.createOscillator();
  osc.type = o.type ?? "sine";
  osc.frequency.setValueAtTime(o.freq, t);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + o.dur);

  const env = a.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(o.gain, t + 0.01);
  env.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);

  osc.connect(env);
  env.connect(master!);
  osc.start(t);
  osc.stop(t + o.dur + 0.02);
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);

export function playFootstep(material = "stone") {
  BmgoAudio.playFootstep(material);
}

export function playSound(type: SfxType, material = "stone") {
  if (type === "hurt") {
    BmgoAudio.playGirlHurt();
    return;
  }
  if (type === "air_dig") {
    BmgoAudio.playAirDig();
    return;
  }
  if (type === "mine_tick") {
    BmgoAudio.playMineDig(material);
    return;
  }

  const a = ctx();
  if (!a) return;

  switch (type) {
    case "pop":
      playTone(a, { freq: rand(650, 750), to: rand(950, 1050), dur: 0.05, gain: 0.15, type: "sine" });
      break;

    case "air_whoosh": {
      // Blade cutting air: a fast band-passed noise sweep, high to low.
      const t = a.currentTime;
      const src = a.createBufferSource();
      src.buffer = noise(a);
      const filter = a.createBiquadFilter();
      filter.type = "bandpass";
      filter.Q.value = 2.4;
      filter.frequency.setValueAtTime(rand(2600, 3200), t);
      filter.frequency.exponentialRampToValueAtTime(rand(380, 520), t + 0.2);
      const env = a.createGain();
      env.gain.setValueAtTime(0.0001, t);
      env.gain.exponentialRampToValueAtTime(0.32, t + 0.05);
      env.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
      src.connect(filter);
      filter.connect(env);
      env.connect(master!);
      src.start(t);
      src.stop(t + 0.26);
      break;
    }

    case "sword_hit":
      // Meaty impact + short metallic ring.
      playNoise(a, { freq: rand(260, 340), q: 0.8, dur: 0.12, gain: 0.34 });
      playNoise(a, { freq: rand(3200, 4200), q: 3, dur: 0.08, gain: 0.12, delay: 0.005 });
      playTone(a, { freq: rand(1180, 1320), to: 900, dur: 0.18, gain: 0.05, type: "triangle", delay: 0.01 });
      playTone(a, { freq: 120, to: 60, dur: 0.12, gain: 0.16, type: "sine" });
      break;

    case "jump":
      // soft cloth/dirt scuff + tiny body thud, no cartoon "boing"
      playNoise(a, { freq: rand(900, 1200), q: 0.8, dur: 0.09, gain: 0.1, rate: rand(0.9, 1.1) });
      playTone(a, { freq: 150, to: 95, dur: 0.1, gain: 0.06, type: "triangle" });
      break;

    case "land":
      playNoise(a, { freq: rand(320, 420), q: 0.7, dur: 0.16, gain: 0.22, rate: rand(0.85, 1.05) });
      playTone(a, { freq: 90, to: 48, dur: 0.16, gain: 0.14, type: "sine" });
      break;

    case "break":
      // crunchy multi-grain shatter: low body + mid debris + bright shards
      playNoise(a, { freq: rand(220, 300), q: 0.6, dur: 0.22, gain: 0.3, rate: rand(0.8, 1.0) });
      playNoise(a, { freq: rand(1100, 1500), q: 1.6, dur: 0.16, gain: 0.16, delay: 0.012 });
      playNoise(a, { freq: rand(2600, 3400), q: 2.2, dur: 0.1, gain: 0.09, delay: 0.03 });
      playTone(a, { freq: rand(120, 160), to: 55, dur: 0.18, gain: 0.1, type: "triangle" });
      break;

    case "place":
      // short dull knock, slightly different pitch every time
      playNoise(a, { freq: rand(500, 700), q: 1.1, dur: 0.07, gain: 0.22, rate: rand(0.9, 1.15) });
      playTone(a, { freq: rand(170, 210), to: 110, dur: 0.08, gain: 0.13, type: "triangle" });
      break;

    case "mine_tick":
      // per-hit dig scrape while holding to break
      playNoise(a, {
        freq: rand(700, 1100),
        q: 1.4,
        dur: 0.055,
        gain: 0.12,
        rate: rand(0.85, 1.2),
      });
      playTone(a, { freq: rand(90, 130), dur: 0.05, gain: 0.05, type: "square" });
      break;

    case "step":
      playFootstep();
      break;

    case "chest_open":
      // Authentic wooden chest opening creak: slow pitch rise + friction followed by latch tick
      playNoise(a, {
        freq: rand(380, 480),
        q: 2.2,
        dur: 0.35,
        gain: 0.16,
        rate: 0.95,
      });
      playTone(a, {
        freq: 180,
        to: 320,
        dur: 0.32,
        gain: 0.12,
        type: "sawtooth",
      });
      playNoise(a, {
        freq: 1400,
        q: 2.5,
        dur: 0.04,
        gain: 0.08,
        delay: 0.31,
      });
      break;

    case "chest_close":
      // Solid oak chest slam: immediate latch thud + low body resonance
      playNoise(a, {
        freq: rand(280, 360),
        q: 1.4,
        dur: 0.18,
        gain: 0.24,
        rate: 0.9,
      });
      playTone(a, {
        freq: 140,
        to: 50,
        dur: 0.22,
        gain: 0.18,
        type: "triangle",
      });
      playNoise(a, {
        freq: 950,
        q: 2.0,
        dur: 0.05,
        gain: 0.14,
        delay: 0.01,
      });
      break;
  }
}
