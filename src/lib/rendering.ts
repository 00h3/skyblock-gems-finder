export const getTargetDpr = (quality: "low" | "medium" | "high"): number => {
  const deviceDpr = window.devicePixelRatio || 1;
  const scale = quality === "low" ? 0.85 : 1.0;
  
  switch (quality) {
    case "high":
      return Math.min(deviceDpr, 2) * scale;
    case "medium":
      return Math.min(deviceDpr, 1.5) * scale;
    case "low":
      return Math.min(deviceDpr, 1) * scale;
    default:
      return 1 * scale;
  }
};
