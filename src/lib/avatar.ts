import { useEffect, useState } from "react";

export const CHARACTER_4_GLTF = "https://file.garden/alGOOylwpAfCa6qP/avatar4_walk.glb"; // For IRA
export const CHARACTER_1_GLTF = "https://maxwell.z3ki.dev/bot/_files/char1-opt/char1_opt.gltf";
export const CHARACTER_2_GLTF = "https://maxwell.z3ki.dev/bot/_files/char2-opt/char2_opt.gltf";

export const NED_AVATAR_GLB =
  "https://maxwell.z3ki.dev/bot/_files/avatar-walk-legs-glb/Avatar_Walk_LegsOnly.glb";
export const NELLY_AVATAR_GLB =
  "https://maxwell.z3ki.dev/bot/_files/female-walk-legs-glb/Female_Walk_LegsOnly.glb";

export function getSkyblockCharacterModelUrl(
  selectedCharacter?: string | null,
  gender?: string | null,
): string {
  const isNelly =
    selectedCharacter === "char2" ||
    selectedCharacter === "nelly" ||
    gender === "female" ||
    (typeof window !== "undefined" &&
      (localStorage.getItem("qb_base_character") === "char2" ||
       localStorage.getItem("bm-character-preset") === "nelly" ||
       localStorage.getItem("bm-gender") === "female"));
  return isNelly ? NELLY_AVATAR_GLB : NED_AVATAR_GLB;
}

export const AVATAR_CHARACTERS = [
  {
    id: "char1",
    name: "Ned",
    modelUrl: CHARACTER_1_GLTF,
    description: "Classic QBlock Adventurer",
  },
  {
    id: "char2",
    name: "Nelly",
    modelUrl: CHARACTER_2_GLTF,
    description: "Modern Cyber Explorer",
  },
] as const;

export type AvatarCharacterId = "char1" | "char2";

const BASE_CHARACTER_KEY = "qb_base_character";

export function getBaseCharacter(): AvatarCharacterId {
  if (typeof window === "undefined") return "char1";
  const stored = localStorage.getItem(BASE_CHARACTER_KEY);
  return stored === "char2" ? "char2" : "char1";
}

export function setBaseCharacter(char: AvatarCharacterId) {
  if (typeof window === "undefined") return;
  localStorage.setItem(BASE_CHARACTER_KEY, char);
  window.dispatchEvent(new CustomEvent("qb-avatar-character-changed", { detail: char }));
}

export type AvatarSnapshot = {
  color: string;
  hairColor?: string;
  skinId: string | null;
  faceId: number;
  gender: "male" | "female";
  showBandana: boolean;
  equippedItemIds: string[];
  equippedPants: string | null;
  frameId?: AvatarFrameId;
  modelUrl?: string;
  selectedCharacter?: AvatarCharacterId;
  shopEquipped?: {
    shirt: string | null;
    pants: string | null;
    face: string | null;
  };
  shopOwned?: string[];
};

export type AvatarFrameId =
  | "none"
  | "star-program"
  | "blue-gold"
  | "staff"
  | "early-beta"
  | "gold-treasure"
  | "emerald"
  | "ice"
  | "halloween"
  | "witch-rose"
  | "neon-cyber";

export function normalizeAvatarFrameId(value: unknown): AvatarFrameId | undefined {
  if (
    value === "none" ||
    value === "star-program" ||
    value === "blue-gold" ||
    value === "staff" ||
    value === "early-beta" ||
    value === "gold-treasure" ||
    value === "emerald" ||
    value === "ice" ||
    value === "halloween" ||
    value === "witch-rose" ||
    value === "neon-cyber"
  ) {
    return value;
  }
  return undefined;
}

type AvatarRecord = {
  avatarSnapshot?: unknown;
  frameId?: unknown;
  equippedFrame?: unknown;
  frame?: unknown;
};

/** Read both the current nested frame and the legacy top-level frame fields. */
export function avatarFrameFrom(
  record: AvatarRecord | null | undefined,
): AvatarFrameId | undefined {
  const snapshot =
    record?.avatarSnapshot && typeof record.avatarSnapshot === "object"
      ? (record.avatarSnapshot as { frameId?: unknown })
      : undefined;
  return normalizeAvatarFrameId(
    snapshot?.frameId ?? record?.frameId ?? record?.equippedFrame ?? record?.frame,
  );
}

/** Merge a profile snapshot with legacy frame fields without dropping custom avatar data. */
export function normalizeAvatarSnapshot(
  record: AvatarRecord | null | undefined,
): Partial<AvatarSnapshot> | undefined {
  const snapshot =
    record?.avatarSnapshot && typeof record.avatarSnapshot === "object"
      ? (record.avatarSnapshot as Partial<AvatarSnapshot>)
      : {};
  const frameId = avatarFrameFrom(record);
  if (Object.keys(snapshot).length === 0 && !frameId) return undefined;
  return {
    ...snapshot,
    ...(frameId ? { frameId } : {}),
  };
}

// Avatar rig recolor — a tiny reactive store so every RigPreview stays in sync
export const AVATAR_COLORS = [
  "#7dd3fc",
  "#4ade80",
  "#facc15",
  "#fb923c",
  "#f87171",
  "#ec4899",
  "#a78bfa",
  "#94a3b8",
];
export const HAIR_COLORS = [
  "#17181b",
  "#3b82f6",
  "#7c3aed",
  "#ec4899",
  "#ef4444",
  "#f59e0b",
  "#22c55e",
  "#e5e7eb",
];
const DEFAULT_AVATAR_COLOR = AVATAR_COLORS[2];
const avatarState = { color: DEFAULT_AVATAR_COLOR };
const avatarSubs = new Set<() => void>();
function emitAvatar() {
  avatarSubs.forEach((fn) => fn());
}
export function initAvatarColor() {
  if (typeof window === "undefined") return;
  const saved = window.localStorage.getItem("bm-avatar-color");
  if (saved) avatarState.color = saved;
}
export function setAvatarColor(hex: string) {
  avatarState.color = hex;
  if (typeof window !== "undefined") window.localStorage.setItem("bm-avatar-color", hex);
  emitAvatar();
}
export function getAvatarColor() {
  return avatarState.color;
}
export function useAvatarColor() {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    avatarSubs.add(fn);
    return () => {
      avatarSubs.delete(fn);
    };
  }, []);
  return avatarState.color;
}

const hairColorState = { color: HAIR_COLORS[0] };
const hairColorSubs = new Set<() => void>();
function emitHairColor() {
  hairColorSubs.forEach((fn) => fn());
}
export function initHairColor() {
  if (typeof window === "undefined") return;
  const saved = window.localStorage.getItem("qb-hair-color");
  if (saved) hairColorState.color = saved;
  emitHairColor();
}
export function setHairColor(hex: string) {
  hairColorState.color = hex;
  if (typeof window !== "undefined") window.localStorage.setItem("qb-hair-color", hex);
  emitHairColor();
}
export function getHairColor() {
  return hairColorState.color;
}
export function useHairColor() {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    hairColorSubs.add(fn);
    return () => {
      hairColorSubs.delete(fn);
    };
  }, []);
  return hairColorState.color;
}

export function getAvatarSnapshot(): AvatarSnapshot {
  return {
    color: avatarState.color,
    skinId: skinState.id,
    faceId: faceState.id,
    gender: genderState.value,
    showBandana: bandanaState.show,
    equippedItemIds: [...equippedState.ids],
    equippedPants: pantsState.id,
    frameId: frameState.id,
  };
}

/** Hydrate the local avatar from the profile snapshot saved by Inventory. */
export function applyAvatarSnapshot(snapshot: Partial<AvatarSnapshot> | null | undefined) {
  if (!snapshot) {
    setEquippedFrame("none");
    return;
  }
  if (typeof snapshot.color === "string") setAvatarColor(snapshot.color);
  if (typeof snapshot.hairColor === "string") setHairColor(snapshot.hairColor);
  if (typeof snapshot.skinId === "string" || snapshot.skinId === null)
    setEquippedSkin(snapshot.skinId);
  if (typeof snapshot.faceId === "number") setFaceId(snapshot.faceId);
  if (snapshot.gender === "male" || snapshot.gender === "female") setGender(snapshot.gender);
  if (typeof snapshot.showBandana === "boolean") setBandana(snapshot.showBandana);
  if (Array.isArray(snapshot.equippedItemIds)) applyEquippedItems(snapshot.equippedItemIds);
  if (typeof snapshot.equippedPants === "string" || snapshot.equippedPants === null) {
    setEquippedPants(snapshot.equippedPants);
  }
  // A profile is authoritative. Explicitly clear the previous account's
  // frame when this account has no frame instead of leaving stale process
  // state visible until the next reload.
  setEquippedFrame(normalizeAvatarFrameId(snapshot.frameId) ?? "none");
}

// ─── Profile frame ─────────────────────────────────────────────────────────────
const frameState = { id: "none" as AvatarFrameId };
const frameSubs = new Set<() => void>();
function emitFrame() {
  frameSubs.forEach((fn) => fn());
}
export function initEquippedFrame(uid?: string) {
  if (typeof window === "undefined") return;
  const saved = uid ? window.localStorage.getItem(`bm-avatar-frame:${uid}`) : null;
  const frame = normalizeAvatarFrameId(saved);
  frameState.id = frame ?? "none";
  emitFrame();
}
export function setEquippedFrame(id: AvatarFrameId) {
  frameState.id = id;
  emitFrame();
}
export function getEquippedFrame() {
  return frameState.id;
}
export function useEquippedFrame() {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    frameSubs.add(fn);
    return () => {
      frameSubs.delete(fn);
    };
  }, []);
  return frameState.id;
}

// ─── Face ──────────────────────────────────────────────────────────────────────
const faceState = { id: 0 };
const faceSubs = new Set<() => void>();
function emitFace() {
  faceSubs.forEach((fn) => fn());
}
export function initFace() {
  if (typeof window === "undefined") return;
  const saved = window.localStorage.getItem("bm-face");
  if (saved) faceState.id = parseInt(saved, 10) || 0;
}
export function setFaceId(id: number) {
  faceState.id = id;
  if (typeof window !== "undefined") window.localStorage.setItem("bm-face", String(id));
  emitFace();
}
export function getFaceId() {
  return faceState.id;
}
export function useFaceId() {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    faceSubs.add(fn);
    return () => {
      faceSubs.delete(fn);
    };
  }, []);
  return faceState.id;
}

// ─── Pants ─────────────────────────────────────────────────────────────────────
const pantsState = { id: "pants-classic" as string | null };
const pantsSubs = new Set<() => void>();
function emitPants() {
  pantsSubs.forEach((fn) => fn());
}
export function initPants() {
  if (typeof window === "undefined") return;
  const saved = window.localStorage.getItem("bm-pants");
  pantsState.id = saved ?? "pants-classic";
  emitPants();
}
export function setEquippedPants(id: string | null) {
  pantsState.id = id;
  if (typeof window !== "undefined") {
    if (id) window.localStorage.setItem("bm-pants", id);
    else window.localStorage.removeItem("bm-pants");
  }
  emitPants();
}
export function getEquippedPants() {
  return pantsState.id;
}
export function useEquippedPants() {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    pantsSubs.add(fn);
    return () => {
      pantsSubs.delete(fn);
    };
  }, []);
  return pantsState.id;
}

// ─── Equipped items (accessories, etc.) ───────────────────────────────────────
const equippedState = { ids: new Set<string>() };
const equippedSubs = new Set<() => void>();
function emitEquipped() {
  equippedSubs.forEach((fn) => fn());
}
export function initEquippedItems() {
  if (typeof window === "undefined") return;
  const saved = window.localStorage.getItem("bm-equipped-items");
  if (saved) {
    try {
      equippedState.ids = new Set(JSON.parse(saved));
    } catch {
      /* ignore */
    }
  }
  emitEquipped();
}
export function toggleEquippedItem(id: string) {
  if (equippedState.ids.has(id)) equippedState.ids.delete(id);
  else equippedState.ids.add(id);
  if (typeof window !== "undefined")
    window.localStorage.setItem("bm-equipped-items", JSON.stringify([...equippedState.ids]));
  emitEquipped();
}
export function applyEquippedItems(ids: string[]) {
  equippedState.ids = new Set(ids.filter((id): id is string => typeof id === "string"));
  if (typeof window !== "undefined") {
    window.localStorage.setItem("bm-equipped-items", JSON.stringify([...equippedState.ids]));
  }
  emitEquipped();
}
export function isItemEquipped(id: string) {
  return equippedState.ids.has(id);
}
export function useEquippedItems() {
  const [snap, setSnap] = useState(() => new Set(equippedState.ids));
  useEffect(() => {
    const fn = () => setSnap(new Set(equippedState.ids));
    equippedSubs.add(fn);
    return () => {
      equippedSubs.delete(fn);
    };
  }, []);
  return snap;
}

// ─── Owned items (purchased) ──────────────────────────────────────────────────
const ownedState = { ids: new Set<string>() };
const ownedSubs = new Set<() => void>();
function emitOwned() {
  ownedSubs.forEach((fn) => fn());
}
export function initOwnedItems() {
  if (typeof window === "undefined") return;
  const saved = window.localStorage.getItem("bm-owned-items");
  if (saved) {
    try {
      ownedState.ids = new Set(JSON.parse(saved));
    } catch {
      /* ignore */
    }
  }
  emitOwned();
}
export function addOwnedItem(id: string) {
  ownedState.ids.add(id);
  if (typeof window !== "undefined")
    window.localStorage.setItem("bm-owned-items", JSON.stringify([...ownedState.ids]));
  emitOwned();
}
export function isItemOwned(id: string) {
  return ownedState.ids.has(id);
}
export function useOwnedItems() {
  const [snap, setSnap] = useState(() => new Set(ownedState.ids));
  useEffect(() => {
    const fn = () => setSnap(new Set(ownedState.ids));
    ownedSubs.add(fn);
    return () => {
      ownedSubs.delete(fn);
    };
  }, []);
  return snap;
}

// ─── Skins ─────────────────────────────────────────────────────────────────────
export type SkinPart = "head" | "torso" | "arm" | "leg";
export type SkinPattern = "solid" | "floral" | "stealth" | "racer" | "camo" | "aqua";
export type AccessoryKind = "cap" | "mask" | "visor" | "brim";

export type SkinDef = {
  id: string;
  label: string;
  description: string;
  colors: Record<SkinPart, string>;
  accent: string;
  pattern: SkinPattern;
  accessory?: { part: Extract<SkinPart, "head">; kind: AccessoryKind; color: string };
  faceId?: number;
  hair?: { base: string; shadow: string; highlight: string };
  shoes?: { base: string; accent: string };
  topId?: string;
  pantsId?: string;
  rarity?: "rare" | "epic" | "legendary";
  imageUrl?: string;
};

export const SKINS: SkinDef[] = [
  {
    id: "skin-6666-doraemon",
    label: "Doraemon Suit 6666",
    description: "A rare blue pocket-suit with a red bell. Face and hair stay visible.",
    colors: { head: "#f4a96a", torso: "#1878c9", arm: "#1878c9", leg: "#1261a8" },
    accent: "#ef3340",
    pattern: "aqua",
    shoes: { base: "#f7f9ff", accent: "#ef3340" },
    rarity: "legendary",
  },
  {
    id: "dark-hoodie",
    label: "Dark Hoodie",
    description: "Sleek black hoodie with subtle plaid texture",
    colors: { head: "#e8b898", torso: "#181818", arm: "#1a1a1a", leg: "#111111" },
    accent: "#8b1a1a",
    pattern: "stealth",
    imageUrl: "/skin-dark-hoodie.jpg",
  },
  {
    id: "blue-hoodie",
    label: "Blue Hoodie",
    description: "Same clean cut as the dark hoodie, but in deep ocean blue",
    colors: { head: "#e8b898", torso: "#0d2d6e", arm: "#0d2d6e", leg: "#081b4a" },
    accent: "#38bdf8",
    pattern: "stealth",
  },
  {
    id: "mango-bloom",
    label: "Lady Bloom",
    description: "Floral petal print with a soft pink bloom trim",
    colors: { head: "#ffe1ee", torso: "#ec4899", arm: "#f9a8d4", leg: "#831843" },
    accent: "#fff0f7",
    pattern: "floral",
  },
  {
    id: "shadow-ninja",
    label: "Shadow Ninja",
    description: "Stealth bodysuit with a wrapped face mask",
    colors: { head: "#2a2f3a", torso: "#1b1f27", arm: "#242832", leg: "#161920" },
    accent: "#e11d48",
    pattern: "stealth",
    accessory: { part: "head", kind: "mask", color: "#e11d48" },
  },
  {
    id: "retro-racer",
    label: "Retro Racer",
    description: "Racing stripes over a crisp white jumpsuit",
    colors: { head: "#f4f4f6", torso: "#f4f4f6", arm: "#f4f4f6", leg: "#2b2f38" },
    accent: "#ef4444",
    pattern: "racer",
    accessory: { part: "head", kind: "visor", color: "#38bdf8" },
  },
  {
    id: "forest-ranger",
    label: "Forest Ranger",
    description: "Camo fatigues with a wide ranger hat",
    colors: { head: "#8a9a6b", torso: "#5c6b3f", arm: "#6b7a46", leg: "#4a5732" },
    accent: "#3f2e1c",
    pattern: "camo",
    accessory: { part: "head", kind: "brim", color: "#5c4327" },
  },
  {
    id: "aqua-diver",
    label: "Aqua Diver",
    description: "Wetsuit blues with a reflective swim cap",
    colors: { head: "#0e7490", torso: "#155e75", arm: "#0e7490", leg: "#083344" },
    accent: "#67e8f9",
    pattern: "aqua",
    accessory: { part: "head", kind: "cap", color: "#67e8f9" },
  },
  {
    id: "dev-blue-protocol",
    label: "Dev Blue Protocol",
    description:
      "Exclusive developer suit with electric-blue hair, blue trim, and a dizzy spiral face",
    colors: { head: "#f4b184", torso: "#111827", arm: "#151c2e", leg: "#0b1020" },
    accent: "#2d8cff",
    pattern: "stealth",
    faceId: 8,
    hair: { base: "#1264d9", shadow: "#071b55", highlight: "#35a7ff" },
    shoes: { base: "#080d1c", accent: "#2f7ff0" },
    topId: "top-dev-blazer",
    pantsId: "pants-dev-tailored",
    rarity: "legendary",
  },
  {
    id: "sunforge-champion",
    label: "Sunforge Champion",
    description: "Gold-trimmed arena armor with a bright champion stare",
    colors: { head: "#f4bd82", torso: "#5a250f", arm: "#6e2e14", leg: "#281016" },
    accent: "#ffd23f",
    pattern: "racer",
    faceId: 13,
    hair: { base: "#f4a51c", shadow: "#8b310c", highlight: "#ffe36b" },
    shoes: { base: "#261014", accent: "#f7bd32" },
    topId: "top-sunforge-armor",
    pantsId: "pants-sunforge",
    rarity: "epic",
  },
  {
    id: "frostbyte-rogue",
    label: "Frostbyte Rogue",
    description: "Icy stealth layers with a sharp side-eye and cyan edge light",
    colors: { head: "#e9bda7", torso: "#102335", arm: "#102b46", leg: "#091725" },
    accent: "#67e8f9",
    pattern: "aqua",
    faceId: 9,
    hair: { base: "#65d9ff", shadow: "#13518c", highlight: "#d3fbff" },
    shoes: { base: "#081523", accent: "#67e8f9" },
    topId: "top-frostbyte",
    pantsId: "pants-frostbyte",
    rarity: "rare",
  },
];

// ─── Hair style ────────────────────────────────────────────────────────────────
export type HairStyleId = "default" | "bun" | "long" | "buzz";
const HAIR_DEFAULT: HairStyleId = "default";
const hairState = { id: HAIR_DEFAULT as HairStyleId };
const hairSubs = new Set<() => void>();
function emitHair() {
  hairSubs.forEach((fn) => fn());
}
export function initHairStyle() {
  if (typeof window === "undefined") return;
  const saved = window.localStorage.getItem("bm-hair") as HairStyleId | null;
  if (saved) hairState.id = saved;
}
export function setHairStyle(id: HairStyleId) {
  hairState.id = id;
  if (typeof window !== "undefined") window.localStorage.setItem("bm-hair", id);
  emitHair();
}
export function getHairStyle() {
  return hairState.id;
}
export function useHairStyle(): HairStyleId {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    hairSubs.add(fn);
    return () => {
      hairSubs.delete(fn);
    };
  }, []);
  return hairState.id;
}

// ─── Backpack ──────────────────────────────────────────────────────────────────
export type BackpackId = "none" | "mini" | "tactical" | "adventure";
const backpackState = { id: "none" as BackpackId };
const backpackSubs = new Set<() => void>();
function emitBackpack() {
  backpackSubs.forEach((fn) => fn());
}
export function initBackpack() {
  if (typeof window === "undefined") return;
  const saved = window.localStorage.getItem("bm-backpack") as BackpackId | null;
  if (saved) backpackState.id = saved;
}
export function setBackpack(id: BackpackId) {
  backpackState.id = id;
  if (typeof window !== "undefined") window.localStorage.setItem("bm-backpack", id);
  emitBackpack();
}
export function getBackpack() {
  return backpackState.id;
}
export function useBackpack(): BackpackId {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    backpackSubs.add(fn);
    return () => {
      backpackSubs.delete(fn);
    };
  }, []);
  return backpackState.id;
}

// ─── Gender ────────────────────────────────────────────────────────────────────
const genderState = { value: "male" as "male" | "female" };
const genderSubs = new Set<() => void>();
function emitGender() {
  genderSubs.forEach((fn) => fn());
}
export function initGender() {
  if (typeof window === "undefined") return;
  const saved = window.localStorage.getItem("bm-gender") as "male" | "female" | null;
  if (saved === "male" || saved === "female") genderState.value = saved;
}
export function setGender(g: "male" | "female") {
  genderState.value = g;
  if (typeof window !== "undefined") window.localStorage.setItem("bm-gender", g);
  emitGender();
}
export function getGender() {
  return genderState.value;
}
export function useGender(): "male" | "female" {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    genderSubs.add(fn);
    return () => {
      genderSubs.delete(fn);
    };
  }, []);
  return genderState.value;
}

// ─── Bandana / Eye Mask ────────────────────────────────────────────────────────
const bandanaState = { show: false };
const bandanaSubs = new Set<() => void>();
function emitBandana() {
  bandanaSubs.forEach((fn) => fn());
}
export function initBandana() {
  if (typeof window === "undefined") return;
  const saved = window.localStorage.getItem("bm-bandana");
  if (saved !== null) bandanaState.show = saved === "true";
}
export function setBandana(show: boolean) {
  bandanaState.show = show;
  if (typeof window !== "undefined") window.localStorage.setItem("bm-bandana", String(show));
  emitBandana();
}
export function getBandana() {
  return bandanaState.show;
}
export function useBandana() {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    bandanaSubs.add(fn);
    return () => {
      bandanaSubs.delete(fn);
    };
  }, []);
  return bandanaState.show;
}

// ─── Skin (full outfit) ───────────────────────────────────────────────────────
const skinState = { id: null as string | null };
const skinSubs = new Set<() => void>();
function emitSkin() {
  skinSubs.forEach((fn) => fn());
}
export function initEquippedSkin() {
  if (typeof window === "undefined") return;
  const saved = window.localStorage.getItem("bm-skin");
  if (saved) skinState.id = saved;
  emitSkin();
}
export function setEquippedSkin(id: string | null) {
  skinState.id = id;
  if (typeof window !== "undefined") {
    if (id) window.localStorage.setItem("bm-skin", id);
    else window.localStorage.removeItem("bm-skin");
  }
  emitSkin();
}
export function getEquippedSkin() {
  return skinState.id;
}
export function useEquippedSkin() {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    skinSubs.add(fn);
    return () => {
      skinSubs.delete(fn);
    };
  }, []);
  return skinState.id;
}
