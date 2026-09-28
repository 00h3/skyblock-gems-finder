import { useState } from "react";
import { Clapperboard, Download, Loader2, Sparkles } from "lucide-react";
import { isGraphicsV2, setGraphicsV2 } from "@/lib/graphics-v2";
import { recordTrailer, type TrailerScene } from "@/lib/trailer";
import skyblockArt from "@/assets/skyblock/sky-pass-placeholder.png?url";

const SCENES: TrailerScene[] = [
  { image: skyblockArt, eyebrow: "SKYBLOCK", title: "GROW YOUR WORLD", tagline: "Plant seeds, raise forests, chop trees that really fall", accent: "#4ade80" },
  { image: "/categories/bedwars.png", eyebrow: "BEDWARS", title: "PROTECT YOUR BED", tagline: "Instant, crisp PvP with real impact", accent: "#f87171" },
  { image: "/banners/blockparty-key-art.jpg", eyebrow: "BLOCK FALL", title: "LAST ONE STANDING", tagline: "The floor crumbles beneath you", accent: "#fbbf24" },
];

export function BetaFeatures() {
  const [v2, setV2] = useState(isGraphicsV2);
  const [progress, setProgress] = useState<number | null>(null);
  const [video, setVideo] = useState<{ url: string; ext: string } | null>(null);
  const [error, setError] = useState("");

  const toggleV2 = () => {
    const next = !v2;
    setV2(next);
    setGraphicsV2(next);
  };

  const makeTrailer = async () => {
    setError("");
    setProgress(0);
    try {
      const { blob, ext } = await recordTrailer(SCENES, "/qblock-app-icon.png", setProgress);
      if (video) URL.revokeObjectURL(video.url);
      setVideo({ url: URL.createObjectURL(blob), ext });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the trailer.");
    } finally {
      setProgress(null);
    }
  };

  return (
    <section className="profile-card p-3" aria-labelledby="beta-heading">
      <div className="mb-2.5 flex items-center justify-between px-0.5">
        <h2 id="beta-heading" className="app-eyebrow">
          BETA FEATURES
        </h2>
        <span className="rounded-full bg-[#7c3aed] px-2 py-0.5 text-[10.5px] font-extrabold text-white">BETA</span>
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-3 rounded-[14px] border border-black/10 p-3 dark:border-white/10">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[#0ea5e9]/15 text-[#0ea5e9]">
            <Sparkles className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-bold">Graphics V2</p>
            <p className="text-[12px] leading-snug text-text-secondary">
              Cinematic skies and sunsets, dynamic cloud lighting, richer bloom and colour grade.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={v2}
            aria-label="Graphics V2"
            onClick={toggleV2}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${v2 ? "bg-[#22c55e]" : "bg-neutral-300 dark:bg-neutral-700"}`}
          >
            <span
              className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${v2 ? "translate-x-[22px]" : "translate-x-0.5"}`}
            />
          </button>
        </div>

        <div className="rounded-[14px] border border-black/10 p-3 dark:border-white/10">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[#fa4616]/15 text-[#fa4616]">
              <Clapperboard className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-bold">Trailer</p>
              <p className="text-[12px] leading-snug text-text-secondary">
                A cinematic trailer for QBLOCK, Skyblock, Bedwars and Block Fall with music. It&apos;s made on your device
                in about 20 seconds.
              </p>
            </div>
          </div>

          {progress !== null && (
            <div className="mt-3" aria-live="polite">
              <div className="h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                <div className="h-full bg-[#fa4616] transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
              <p className="mt-1 text-[11.5px] text-text-secondary">Rendering trailer… {Math.round(progress * 100)}%. Keep this tab open.</p>
            </div>
          )}

          {video && progress === null && (
            <video src={video.url} controls playsInline className="mt-3 aspect-video w-full rounded-[10px] bg-black" />
          )}

          {error && <p className="mt-2 text-[12px] font-semibold text-danger">{error}</p>}

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={makeTrailer}
              disabled={progress !== null}
              className="press flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full border border-black/10 text-[12.5px] font-black disabled:opacity-60 dark:border-white/15"
            >
              {progress !== null ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clapperboard className="h-4 w-4" />}
              {video ? "Make again" : "Create trailer"}
            </button>
            {video && progress === null && (
              <a
                href={video.url}
                download={`QBLOCK-trailer.${video.ext}`}
                className="press flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-[#fa4616] text-[12.5px] font-black text-white"
              >
                <Download className="h-4 w-4" />
                Download
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
