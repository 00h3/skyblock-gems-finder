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

  // High-performance adaptive DPR: maintains native visual sharpness on all screens
  // while capping excessive over-sampling (e.g. 2.5x-3x) that cripples GPU fillrate.
  if (isMobile) {
    if (quality === "low") {
      return Math.min(deviceDpr, 1.25);
    }
    if (quality === "medium") {
      return Math.min(deviceDpr, 1.5);
    }
    return Math.min(deviceDpr, 1.75);
  }

  const cap = quality === "high" ? 1.75 : quality === "medium" ? 1.5 : 1.25;
  return Math.max(1, Math.min(deviceDpr, cap));
};

export const getShadowMapSize = (quality: RenderQuality) =>
  quality === "high" ? 1024 : quality === "medium" ? 1024 : 512;

export const readQualityPref = (): RenderQuality => {
  try {
    const q = localStorage.getItem("bm-quality");
    if (q === "low" || q === "medium" || q === "high") return q;
  } catch {}
  return "high";
};
