// Blockman GO Official Audio Engine for Skyblock
// Handles authentic SFX and looped background music with low latency.

let masterVolume = 1.0;
if (typeof window !== "undefined") {
  try {
    const saved = localStorage.getItem("qb_sound_volume");
    if (saved !== null) {
      masterVolume = Math.max(0, Math.min(1, Number(saved) / 100));
    }
  } catch {}
}

class SoundEffectPool {
  private pool: HTMLAudioElement[] = [];
  private index = 0;

  constructor(
    private url: string,
    private poolSize = 5,
    private defaultVolume = 0.75,
  ) {
    if (typeof window !== "undefined") {
      for (let i = 0; i < poolSize; i++) {
        try {
          const audio = new Audio(url);
          audio.preload = "auto";
          audio.volume = defaultVolume * masterVolume;
          this.pool.push(audio);
        } catch {
          // ignore instantiation failure
        }
      }
    }
  }

  play(volume?: number) {
    const effectiveVolume = (volume ?? this.defaultVolume) * masterVolume;
    if (this.pool.length === 0) {
      if (typeof window !== "undefined") {
        try {
          const audio = new Audio(this.url);
          audio.volume = effectiveVolume;
          audio.play().catch(() => {});
        } catch {}
      }
      return;
    }

    const audio = this.pool[this.index];
    this.index = (this.index + 1) % this.pool.length;
    try {
      audio.currentTime = 0;
      audio.volume = effectiveVolume;
      const p = audio.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => {});
      }
    } catch {}
  }
}

// Sound asset URLs specified by the user:
export const BMGO_SOUND_URLS = {
  girlHurt:
    "https://lambda.vgmtreasurechest.com/soundtracks/blockman-go-android-ios-windows-gamerip-2017/gtzrkzqf/49.%20Girl%20Hurt.mp3",
  grassStep:
    "https://lambda.vgmtreasurechest.com/soundtracks/blockman-go-android-ios-windows-gamerip-2017/sjsoofhv/77.%20Grass1.mp3",
  stoneGlobal:
    "https://lambda.vgmtreasurechest.com/soundtracks/blockman-go-android-ios-windows-gamerip-2017/ibgcuoki/83.%20Stone.mp3",
  airDig: "https://maxwell.z3ki.dev/bot/_files/bmgo-air-dig1/Air_Dig1.mp3",
  stoneDig: "https://maxwell.z3ki.dev/bot/_files/bmgo-stone-mining/bmgo_stone_dig.mp3",
  goldDig1: "https://maxwell.z3ki.dev/bot/_files/bmgo-gold-mining1/bmgo_gold_dig1.mp3",
  goldDig2: "https://maxwell.z3ki.dev/bot/_files/bmgo-gold-mining2/bmgo_gold_dig2.mp3",
  woodDig: "https://maxwell.z3ki.dev/bot/_files/bmgo-wood-dig/bmgo_wood_dig1.mp3",
  bgmSkywars: "https://maxwell.z3ki.dev/bot/_files/bmgo-skywars-bgm/bmgo_skywar_bgm.mp3",
  bgmBlockFall: "https://maxwell.z3ki.dev/bot/_files/blockman-go-bgm/blockman_go_bgm.mp3",
};

// Sound pools
let hurtSound: SoundEffectPool | null = null;
let grassStepSound: SoundEffectPool | null = null;
let stoneGlobalSound: SoundEffectPool | null = null;
let airDigSound: SoundEffectPool | null = null;
let stoneDigSound: SoundEffectPool | null = null;
let goldDig1Sound: SoundEffectPool | null = null;
let goldDig2Sound: SoundEffectPool | null = null;
let woodDigSound: SoundEffectPool | null = null;

let bgmAudio: HTMLAudioElement | null = null;
let isBgmPlaying = false;
let lastGoldAlt = false;

function initSounds() {
  if (hurtSound || typeof window === "undefined") return;
  hurtSound = new SoundEffectPool(BMGO_SOUND_URLS.girlHurt, 4, 0.85);
  grassStepSound = new SoundEffectPool(BMGO_SOUND_URLS.grassStep, 4, 0.6);
  stoneGlobalSound = new SoundEffectPool(BMGO_SOUND_URLS.stoneGlobal, 4, 0.65);
  airDigSound = new SoundEffectPool(BMGO_SOUND_URLS.airDig, 4, 0.7);
  stoneDigSound = new SoundEffectPool(BMGO_SOUND_URLS.stoneDig, 5, 0.8);
  goldDig1Sound = new SoundEffectPool(BMGO_SOUND_URLS.goldDig1, 4, 0.8);
  goldDig2Sound = new SoundEffectPool(BMGO_SOUND_URLS.goldDig2, 4, 0.8);
  woodDigSound = new SoundEffectPool(BMGO_SOUND_URLS.woodDig, 4, 0.8);
}

export const BmgoAudio = {
  unlock() {
    initSounds();
    if (bgmAudio && !isBgmPlaying) {
      bgmAudio
        .play()
        .then(() => {
          isBgmPlaying = true;
        })
        .catch(() => {});
    }
  },

  /** When player/bot takes damage / gets hit */
  playGirlHurt() {
    initSounds();
    hurtSound?.play(0.85);
  },

  /** Footstep sound on walking */
  playFootstep(material = "stone") {
    initSounds();
    const mat = (material || "").toLowerCase();
    if (/grass|leaves|dirt|path|foliage/.test(mat)) {
      grassStepSound?.play(0.65);
    } else {
      // Global fallback for any other block
      stoneGlobalSound?.play(0.65);
    }
  },

  /** Clicking in air / swinging with empty hand or without hitting block */
  playAirDig() {
    initSounds();
    airDigSound?.play(0.75);
  },

  /** Mining / digging ticking sound when breaking a block */
  playMineDig(material = "stone") {
    initSounds();
    const mat = (material || "").toLowerCase();
    if (/gold|iron|metal|copper/.test(mat)) {
      lastGoldAlt = !lastGoldAlt;
      if (lastGoldAlt) {
        goldDig1Sound?.play(0.8);
      } else {
        goldDig2Sound?.play(0.8);
      }
    } else if (/wood|log|plank|tree/.test(mat)) {
      woodDigSound?.play(0.8);
    } else {
      // Universal stone / ore digging sound for all other blocks
      stoneDigSound?.play(0.8);
    }
  },

  /** Start looped BGM */
  startBgm(volume = 0.45) {
    if (typeof window === "undefined") return;
    if (!bgmAudio) {
      bgmAudio = new Audio(BMGO_SOUND_URLS.bgmSkywars);
      bgmAudio.loop = true;
      bgmAudio.preload = "auto";
      bgmAudio.volume = volume;
    }
    bgmAudio.volume = volume;
    const playPromise = bgmAudio.play();
    if (playPromise) {
      playPromise
        .then(() => {
          isBgmPlaying = true;
        })
        .catch(() => {
          // Autoplay blocked: wait for first click
          const startOnGesture = () => {
            if (bgmAudio) {
              bgmAudio
                .play()
                .then(() => {
                  isBgmPlaying = true;
                })
                .catch(() => {});
            }
            window.removeEventListener("pointerdown", startOnGesture);
            window.removeEventListener("keydown", startOnGesture);
          };
          window.addEventListener("pointerdown", startOnGesture, { once: true });
          window.addEventListener("keydown", startOnGesture, { once: true });
        });
    }
  },

  startBlockFallBgm(volume = 0.45) {
    if (typeof window === "undefined") return;
    if (!bgmAudio) {
      bgmAudio = new Audio(BMGO_SOUND_URLS.bgmBlockFall);
      bgmAudio.loop = true;
      bgmAudio.preload = "auto";
      bgmAudio.volume = volume;
    }
    bgmAudio.volume = volume;
    const playPromise = bgmAudio.play();
    if (playPromise) {
      playPromise
        .then(() => {
          isBgmPlaying = true;
        })
        .catch(() => {});
    }
  },

  stopBgm() {
    if (bgmAudio) {
      bgmAudio.pause();
      isBgmPlaying = false;
    }
  },

  setMuted(muted: boolean) {
    if (bgmAudio) {
      bgmAudio.muted = muted;
    }
  },

  playGameStart() {
    initSounds();
    try {
      if (typeof window !== "undefined") {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const now = ctx.currentTime;
          [392, 523.25, 659.25, 783.99].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "triangle";
            osc.frequency.setValueAtTime(freq, now + idx * 0.09);
            gain.gain.setValueAtTime(0.25, now + idx * 0.09);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.32);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + idx * 0.09);
            osc.stop(now + idx * 0.09 + 0.33);
          });
        }
      }
    } catch {}
  },

  playDefeat() {
    initSounds();
    try {
      if (typeof window !== "undefined") {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const now = ctx.currentTime;
          [370, 330, 293, 220].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(freq, now + idx * 0.12);
            gain.gain.setValueAtTime(0.22, now + idx * 0.12);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.38);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + idx * 0.12);
            osc.stop(now + idx * 0.12 + 0.39);
          });
        }
      }
    } catch {}
  },

  setMasterVolume(vol: number) {
    masterVolume = Math.max(0, Math.min(1, vol));
    if (bgmAudio) {
      bgmAudio.volume = 0.5 * masterVolume;
    }
  },

  toggleBgm(): boolean {
    if (isBgmPlaying) {
      this.stopBgm();
      return false;
    } else {
      this.startBgm();
      return true;
    }
  },
};

// Global listener for sound volume changes from settings modal
if (typeof window !== "undefined") {
  window.addEventListener("bm-sound-volume", (e: Event) => {
    const vol = (e as CustomEvent<number>).detail;
    if (typeof vol === "number") {
      BmgoAudio.setMasterVolume(vol / 100);
    }
  });
}

// Global unlock on initial user gesture
if (typeof window !== "undefined") {
  const onFirstInteraction = () => {
    BmgoAudio.unlock();
    window.removeEventListener("pointerdown", onFirstInteraction);
    window.removeEventListener("keydown", onFirstInteraction);
  };
  window.addEventListener("pointerdown", onFirstInteraction, { once: true });
  window.addEventListener("keydown", onFirstInteraction, { once: true });
}
