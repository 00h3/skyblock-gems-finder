/**
 * Mobile Haptic Feedback Engine
 * Gracefully vibrates on mobile devices with zero overhead on desktop.
 */

export type HapticType = "light" | "medium" | "heavy" | "tap" | "success" | "warning";

export function triggerHaptic(type: HapticType = "tap"): void {
  if (typeof window === "undefined" || typeof navigator === "undefined" || !("vibrate" in navigator)) {
    return;
  }

  try {
    const disabled = localStorage.getItem("qb_haptics") === "false";
    if (disabled) return;

    switch (type) {
      case "light":
        navigator.vibrate(8);
        break;
      case "tap":
        navigator.vibrate(12);
        break;
      case "medium":
        navigator.vibrate(22);
        break;
      case "heavy":
        navigator.vibrate(40);
        break;
      case "success":
        navigator.vibrate([10, 35, 18]);
        break;
      case "warning":
        navigator.vibrate([25, 45, 25]);
        break;
    }
  } catch {
    // Unsupported or vibration blocked by user permission
  }
}
