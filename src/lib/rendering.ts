export type RenderQuality = "low" | "medium" | "high";

/**
 * Render resolution never drops below the CSS pixel grid (1.0), so the
 * canvas is never upscaled — upscaling is what made distant geometry look
 * pixelated. Quality only controls how far above 1.0 we supersample.
 */
export const getTargetDpr = (quality: RenderQuality): number => {
  const deviceDpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  const cap = quality === "high" ? 2 : quality === "medium" ? 1.6 : 1.25;
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
