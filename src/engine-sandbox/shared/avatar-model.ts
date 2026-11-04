export const WITCH_AVATAR_MODEL = "/QBlock_Witch_Walk.glb";
export const WITCH_AVATAR_REMOTE_URL =
  "https://file.garden/alGOOylwpAfCa6qP/QBlock_Witch_Walk.glb";

export const AVATAR_BOY_ALL_ANIMS_URL = "/avatar_boy_all_anims.glb";
export const AVATAR_BOY_ALL_ANIMS_LOCAL = "/avatar_boy_all_anims.glb";

export const NED_AVATAR_MODEL = "/avatar_boy_all_anims.glb";
export const NELLY_AVATAR_MODEL = "/avatar_boy_all_anims.glb";

export const CYBERPUNK_DEV_MODEL = "https://file.garden/alGOOylwpAfCa6qP/Cyberpunk_Dev_Orange_Hair.glb";

/** The universal character rig matching the classic old witch character with cape & magic */
export const SANDBOX_AVATAR_MODEL = WITCH_AVATAR_MODEL;
export const SANDBOX_AVATAR_FALLBACK_MODEL = WITCH_AVATAR_REMOTE_URL;
export const H3_AVATAR_PREVIEW_URL = "https://maxwell.z3ki.dev/bot/cyberpunk-model-preview/";

export function isIraHrUser(identifier?: string | null): boolean {
  if (!identifier) return false;
  const lower = identifier.toLowerCase().trim();
  return (
    lower === "h3" ||
    lower === "00h3" ||
    lower === "ira" ||
    lower === "hr" ||
    lower === "ira/hr" ||
    lower === "ira_hr" ||
    lower === "hr_ira" ||
    lower === "mammaettahiri@gmail.com" ||
    lower === "mammaettahiri" ||
    /\b(ira|hr|h3)\b/i.test(lower) ||
    lower.includes("ira") ||
    lower.includes("hr") ||
    lower.includes("h3")
  );
}

export function getUserDisplayName(name?: string | null): string {
  if (!name) return "Player";
  if (isIraHrUser(name)) return "h3";
  return name;
}


