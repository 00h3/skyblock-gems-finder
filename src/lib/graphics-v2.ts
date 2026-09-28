const KEY = "qb_graphics_v2";
export const GRAPHICS_V2_EVENT = "qb-graphics-v2";

/** Graphics V2 is on by default; players can opt out from Settings → Beta features. */
export function isGraphicsV2(): boolean {
  try {
    return localStorage.getItem(KEY) !== "false";
  } catch {
    return true;
  }
}

export function setGraphicsV2(on: boolean) {
  try {
    localStorage.setItem(KEY, String(on));
  } catch {}
  window.dispatchEvent(new CustomEvent<boolean>(GRAPHICS_V2_EVENT, { detail: on }));
}
