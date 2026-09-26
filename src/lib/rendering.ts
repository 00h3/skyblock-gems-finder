export const getTargetDpr = (quality: "low" | "medium" | "high"): number => {
  const deviceDpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  const scale = quality === "low" ? 0.9 : 1.0;
  
  switch (quality) {
    case "high":
      return Math.min(deviceDpr, 1.85) * scale;
    case "medium":
      return Math.min(deviceDpr, 1.45) * scale;
    case "low":
      return Math.min(deviceDpr, 1.0) * scale;
    default:
      return 1.15 * scale;
  }
};
