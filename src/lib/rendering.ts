export type RenderQuality = "low" | "medium" | "high";

/**
 * Full HD / Retina resolution across all phone screen aspect ratios,
 * orientations (horizontal landscape and vertical portrait), and devices.
 * Restores crisp, crystal-clear native rendering without pixelation.
 */
export const getTargetDpr = (quality?: RenderQuality): number => {
  if (typeof window === "undefined") return 1;
  const deviceDpr = window.devicePixelRatio || 1;

  if (quality === "low") {
    return Math.min(deviceDpr, 1.75);
  }
  if (quality === "medium") {
    return Math.min(deviceDpr, 2.25);
  }
  // High quality (default): Full native device pixel ratio for true HD
  return Math.min(deviceDpr, 3);
};

export const getShadowMapSize = (quality?: RenderQuality) =>
  quality === "high" ? 2048 : quality === "medium" ? 1024 : 512;

export const readQualityPref = (): RenderQuality => {
  try {
    const q = localStorage.getItem("bm-quality");
    if (q === "low" || q === "medium" || q === "high") return q;
  } catch {}
  return "high";
};
