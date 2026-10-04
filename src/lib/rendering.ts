export type RenderQuality = "low" | "medium" | "high";

/**
 * Calculates adaptive, crystal-clear DPR across all phone screen aspect ratios
 * (16:9, 18:9, 19.5:9, 20:9, 21:9) and orientations without lagging.
 */
export const getTargetDpr = (quality: RenderQuality): number => {
  if (typeof window === "undefined") return 1;
  const deviceDpr = window.devicePixelRatio || 1;
  const isMobile =
    window.innerWidth <= 840 ||
    window.innerHeight <= 840 ||
    /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

  // On mobile screens with small CSS pixel dimensions (e.g. 390x844),
  // clamping DPR too low (1.25 or 1.5) stretches a small buffer over a high-density
  // 1080p/1200p phone screen causing obvious pixelation.
  // We compute an adaptive DPR that stays native & sharp on all phone ratios
  // without exceeding thermal/GPU limits:
  if (isMobile) {
    if (quality === "low") {
      return Math.min(deviceDpr, 1.5);
    }
    if (quality === "medium") {
      return Math.min(deviceDpr, 2.0);
    }
    return Math.min(deviceDpr, 2.5);
  }

  const cap = quality === "high" ? 2.0 : quality === "medium" ? 1.6 : 1.25;
  return Math.max(1, Math.min(deviceDpr, cap));
};

export const getShadowMapSize = (quality: RenderQuality) =>
  quality === "high" ? 2048 : quality === "medium" ? 1536 : 1024;

export const readQualityPref = (): RenderQuality => {
  try {
    const q = localStorage.getItem("bm-quality");
    if (q === "low" || q === "medium" || q === "high") return q;
  } catch {}
  return "high";
};
