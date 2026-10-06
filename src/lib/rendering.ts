export type RenderQuality = "low" | "medium" | "normal" | "high";

/**
 * Normal = Optimized 60–120 FPS profile (1.5 max DPR, light bloom, optimized cycles).
 * High = Restores original ultra-high quality (native 2.0+ Retina DPR, full bloom, 60fps particles, 1536 dynamic shadows).
 */
export const getTargetDpr = (quality?: RenderQuality): number => {
  if (typeof window === "undefined") return 1;
  const deviceDpr = window.devicePixelRatio || 1;

  if (quality === "low") {
    return Math.min(deviceDpr, 1.25);
  }
  if (quality === "normal" || quality === "medium") {
    return Math.min(deviceDpr, 1.5);
  }
  // High quality: restores native Retina ultra quality
  return Math.min(deviceDpr, 2.0);
};

export const getShadowMapSize = (quality?: RenderQuality) =>
  quality === "high" ? 1536 : quality === "low" ? 512 : 1024;

export const readQualityPref = (): RenderQuality => {
  try {
    const q = localStorage.getItem("bm-quality");
    if (q === "low" || q === "medium" || q === "normal" || q === "high") return q as RenderQuality;
  } catch {}
  return "normal";
};
