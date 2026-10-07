export type RenderQuality = "low" | "medium" | "high" | "uhd";

/**
 * True 4K / UHD Ultra-High-Definition resolution across all displays and devices.
 * Restores crisp, crystal-clear native 4K rendering without any pixelation or downscaling.
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
  if (quality === "high") {
    return Math.max(deviceDpr, 2);
  }
  // True UHD / 4K quality: Full uncompromised native Retina/4K pixel ratio with supersampling
  return Math.min(Math.max(deviceDpr, 2.5), 4);
};

export const getShadowMapSize = (_quality?: RenderQuality) => 4096;

export const readQualityPref = (): RenderQuality => {
  try {
    const q = localStorage.getItem("bm-quality");
    if (q === "low" || q === "medium" || q === "high" || q === "uhd") return q;
  } catch {}
  return "uhd";
};

