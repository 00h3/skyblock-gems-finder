/**
 * Shop catalog + equipped-wearable store.
 *
 * Same tiny reactive pub/sub pattern as avatar.ts so the 3D character,
 * the avatar page and the shop all stay in sync. Everything persists to
 * localStorage; purchases spend the shared currency store.
 */
import { useEffect, useState } from "react";
import { GOLDEN_COINS_ICON, PINK_GEM_ICON, STAR_BILL_ICON } from "@/components/CurrencyPills";
import type { CurrencyKey } from "@/lib/currency";
import { getFragmentState, useFragments } from "@/lib/fragments";

export type ShopSlot = "shirt" | "pants" | "sleeves" | "face" | "hair" | "bundle";
export type ShopCategory = "clothes" | "faces" | "bundles" | "character";

export type ShopItem = {
  id: string;
  name: string;
  slot: ShopSlot;
  category: ShopCategory;
  /** Price in the given currency. 0 = free. */
  price: number;
  currency: CurrencyKey;
  /** Texture applied to the matching body part. */
  texture?: string;
  /** For bundles: the item ids granted. */
  grants?: string[];
  /** Optional account-bound fragment redemption instead of currency purchase. */
  fragmentCost?: number;
  trialDays?: number;
  /** Hair recolor items just set a hex color. */
  hairColor?: string;
  /** Thumbnail shown in the shop grid. */
  thumb?: string;
  offSale?: boolean;
  note?: string;
};

export const CURRENCY_ICON: Record<CurrencyKey, string> = {
  gold: GOLDEN_COINS_ICON,
  gems: PINK_GEM_ICON,
  pinkCube: PINK_GEM_ICON,
  starCoins: STAR_BILL_ICON,
};

export const CURRENCY_LABEL: Record<CurrencyKey, string> = {
  gold: "Gold Coins",
  gems: "Gems",
  pinkCube: "Pink Cubes",
  starCoins: "Star Coins",
};

const TEX = {
  qbWhiteShirt: "/skins/qb-white-shirt.png",
  qbMaroonShirt: "/skins/qb-maroon-shirt.png",
  qbMaroonPants: "/skins/qb-maroon-pants.png",
  qbMaroonSleeves: "/skins/qb-maroon-sleeves.png",
  denimPants: "/skins/denim-pants.png",
  faceMoney: "/skins/face-money.png",
  faceSad: "/skins/face-sad.png",
} as const;

export const SHOP_CATALOG: ShopItem[] = [
  // ── Bundles / remodels ──────────────────────────────────────────────
  {
    id: "scarlet-bundle",
    name: "Scarlet Bundle",
    slot: "bundle",
    category: "bundles",
    price: 666,
    currency: "pinkCube",
    grants: ["qb-white", "denim-pants", "face-sad"],
    note: "Scarlet outfit, wings and face",
    thumb: "/studio-splash.png",
  },
  {
    id: "qb-school-boy",
    name: "QB School Boy",
    slot: "bundle",
    category: "bundles",
    price: 600,
    currency: "gold",
    grants: ["qb-maroon-shirt", "qb-maroon-pants"],
    thumb: TEX.qbMaroonShirt,
    note: "Full set — shirt, pants & sleeves",
  },
  {
    id: "starter-ned",
    name: "Starter Ned",
    slot: "bundle",
    category: "bundles",
    price: 0,
    currency: "gold",
    grants: [],
    thumb: TEX.qbWhiteShirt,
    note: "Free starter look",
  },

  // ── Clothing & separates ────────────────────────────────────────────
  {
    id: "suit-torso",
    name: "Suit Torso",
    slot: "shirt",
    category: "clothes",
    price: 0,
    currency: "gold",
    texture: "https://maxwell.z3ki.dev/bot/_files/suit-torso/1791123411121.jpg",
    thumb: "https://maxwell.z3ki.dev/bot/_files/suit-torso/1791123411121.jpg",
    note: "Striped suit torso shirt",
  },
  {
    id: "striped-pants",
    name: "Striped Pants",
    slot: "pants",
    category: "clothes",
    price: 0,
    currency: "gold",
    texture: "https://maxwell.z3ki.dev/bot/_files/striped-pants/1791123490816.jpg",
    thumb: "https://maxwell.z3ki.dev/bot/_files/striped-pants/1791123490816.jpg",
    note: "Striped black and white stockings",
  },
  {
    id: "qb-maroon-shirt",
    name: "QB Maroon Shirt",
    slot: "shirt",
    category: "clothes",
    price: 300,
    currency: "gold",
    texture: TEX.qbMaroonShirt,
    thumb: TEX.qbMaroonShirt,
  },
  {
    id: "qb-maroon-pants",
    name: "QB Maroon Pants",
    slot: "pants",
    category: "clothes",
    price: 300,
    currency: "gold",
    texture: TEX.qbMaroonPants,
    thumb: TEX.qbMaroonPants,
  },
  {
    id: "qb-white",
    name: "QB White Scholar Outfit",
    slot: "shirt",
    category: "clothes",
    price: 60,
    currency: "gold",
    texture: TEX.qbWhiteShirt,
    thumb: TEX.qbWhiteShirt,
  },
  {
    id: "denim-pants",
    name: "Denim Pants",
    slot: "pants",
    category: "clothes",
    price: 80,
    currency: "gold",
    texture: TEX.denimPants,
    thumb: TEX.denimPants,
  },

  // ── Faces & cosmetics ───────────────────────────────────────────────
  {
    id: "face-money",
    name: "$$$ Face",
    slot: "face",
    category: "faces",
    price: 30,
    currency: "pinkCube",
    fragmentCost: 1,
    trialDays: 1,
    note: "Unlock with 1 fragment for 1 day",
    texture: TEX.faceMoney,
    thumb: TEX.faceMoney,
  },
  {
    id: "face-sad",
    name: "Sad Face",
    slot: "face",
    category: "faces",
    price: 200,
    currency: "gold",
    texture: TEX.faceSad,
    thumb: TEX.faceSad,
  },

  // ── Character ───────────────────────────────────────────────────────
  {
    id: "hair-black",
    name: "Black Hair",
    slot: "hair",
    category: "character",
    price: 30,
    currency: "gold",
    hairColor: "#141414",
    note: "Recolors your hair jet black",
  },
];

const AVATAR_SHOP_IDS = new Set([
  "scarlet-bundle",
  "qb-white",
  "denim-pants",
  "face-money",
  "face-sad",
  "suit-torso",
  "striped-pants",
  "qb-maroon-shirt",
  "qb-maroon-pants",
]);

/** The focused avatar catalog: no duplicate hair or unrelated accessories. */
export const SHOP_ITEMS = SHOP_CATALOG.filter((item) => AVATAR_SHOP_IDS.has(item.id));

/** The sleeves texture that comes with the QB maroon set. */
export const QB_MAROON_SLEEVES = TEX.qbMaroonSleeves;

export function getShopItem(id: string) {
  return SHOP_ITEMS.find((i) => i.id === id) ?? null;
}

// ─── Owned items ───────────────────────────────────────────────────────
const OWNED_KEY = "qb-shop-owned";
const ownedState = { ids: new Set<string>() };
let activeShopUid: string | null = null;
const ownedSubs = new Set<() => void>();
function emitOwned() {
  ownedSubs.forEach((fn) => fn());
}

export function initShop() {
  if (typeof window === "undefined") return;
  // Account data is loaded by setShopUser/applyOwnedShopSnapshot. Never
  // hydrate a previous account's global browser snapshot here.
  emitOwned();
  emitEquip();
}

export function setShopUser(uid: string | null) {
  if (activeShopUid === uid) return;
  activeShopUid = uid;
  ownedState.ids = new Set();
  equipState.shirt = null;
  equipState.pants = null;
  equipState.face = null;
  if (typeof window === "undefined" || !uid) {
    emitOwned();
    emitEquip();
    return;
  }
  try {
    const raw = window.localStorage.getItem(`${OWNED_KEY}:${uid}`);
    if (raw) ownedState.ids = new Set(JSON.parse(raw) as string[]);
  } catch {
    /* ignore */
  }
  try {
    const raw = window.localStorage.getItem(`${EQUIP_KEY}:${uid}`);
    if (raw) Object.assign(equipState, JSON.parse(raw));
  } catch {
    /* ignore */
  }
  emitOwned();
  emitEquip();
}

export function getEquippedShop(): EquipState {
  const snapshot = getFragmentState();
  return {
    ...equipState,
    face:
      equipState.face === "face-money" && snapshot.faceTrialUntil <= Date.now()
        ? null
        : equipState.face,
  };
}

/** Hydrate purchased outfit data saved inside an avatar profile snapshot. */
export function applyShopSnapshot(snapshot: Partial<EquipState> | null | undefined) {
  if (!snapshot || typeof snapshot !== "object") return;
  for (const slot of ["shirt", "pants", "face"] as const) {
    const value = snapshot[slot];
    if (value === null || typeof value === "string") equipState[slot] = value;
  }
  persistEquip();
  emitEquip();
}

/** Restore the account's purchased wardrobe on a new browser/device. */
export function applyOwnedShopSnapshot(ids: unknown) {
  if (!Array.isArray(ids)) return;
  const validIds = new Set(SHOP_ITEMS.map((item) => item.id));
  ownedState.ids = new Set(
    ids.filter((id): id is string => typeof id === "string" && validIds.has(id)),
  );
  persistOwned();
  emitOwned();
}

export function getOwnedShopItemIds(): string[] {
  return [...ownedState.ids];
}

function persistOwned() {
  if (typeof window === "undefined" || !activeShopUid) return;
  window.localStorage.setItem(`${OWNED_KEY}:${activeShopUid}`, JSON.stringify([...ownedState.ids]));
}

export function ownsItem(id: string) {
  return ownedState.ids.has(id);
}

export function grantItem(id: string) {
  const item = getShopItem(id);
  ownedState.ids.add(id);
  item?.grants?.forEach((g) => ownedState.ids.add(g));
  persistOwned();
  emitOwned();
}

export function useOwnedShopItems() {
  const [snap, setSnap] = useState(
    () =>
      new Set([
        ...ownedState.ids,
        ...SHOP_ITEMS.filter((item) => item.price === 0).map((item) => item.id),
      ]),
  );
  useEffect(() => {
    const fn = () =>
      setSnap(
        new Set([
          ...ownedState.ids,
          ...SHOP_ITEMS.filter((item) => item.price === 0).map((item) => item.id),
        ]),
      );
    ownedSubs.add(fn);
    return () => {
      ownedSubs.delete(fn);
    };
  }, []);
  return snap;
}

// ─── Equipped wearables ────────────────────────────────────────────────
export type EquipState = {
  shirt: string | null;
  pants: string | null;
  face: string | null;
};

const EQUIP_KEY = "qb-shop-equipped";
const equipState: EquipState = { shirt: null, pants: null, face: null };
const equipSubs = new Set<() => void>();
function emitEquip() {
  equipSubs.forEach((fn) => fn());
}

function persistEquip() {
  if (typeof window === "undefined" || !activeShopUid) return;
  window.localStorage.setItem(`${EQUIP_KEY}:${activeShopUid}`, JSON.stringify(equipState));
}

export function toggleEquipShopItem(id: string) {
  const item = getShopItem(id);
  if (!item) return;
  if (item.slot === "shirt" || item.slot === "pants" || item.slot === "face") {
    const nextVal = equipState[item.slot] === id ? null : id;
    equipState[item.slot] = nextVal;
    persistEquip();
    emitEquip();
  }
}

export function equipBundle(id: string) {
  const item = getShopItem(id);
  if (!item?.grants) return;
  item.grants.forEach((g) => {
    const sub = getShopItem(g);
    if (sub && (sub.slot === "shirt" || sub.slot === "pants" || sub.slot === "face")) {
      equipState[sub.slot] = g;
    }
  });
  persistEquip();
  emitEquip();
}

export function useEquippedShop(): EquipState {
  const fragment = useFragments();
  const visible = (): EquipState => ({
    ...equipState,
    face: equipState.face === "face-money" && !fragment.faceTrialActive ? null : equipState.face,
  });
  const [snap, setSnap] = useState<EquipState>(visible);
  useEffect(() => {
    const fn = () => setSnap(visible());
    equipSubs.add(fn);
    return () => {
      equipSubs.delete(fn);
    };
  }, [fragment.faceTrialActive]);
  return snap;
}

/** Resolve equipped ids into the texture urls the 3D model needs. */
export function resolveTextures(equipped: EquipState) {
  const shirt = equipped.shirt ? getShopItem(equipped.shirt) : null;
  const pants = equipped.pants ? getShopItem(equipped.pants) : null;
  const face = equipped.face ? getShopItem(equipped.face) : null;
  return {
    shirtTexture: shirt?.texture ?? null,
    pantsTexture: pants?.texture ?? null,
    faceTexture: face?.texture ?? null,
    // The maroon set ships matching sleeves.
    sleevesTexture: shirt?.id === "qb-maroon-shirt" ? QB_MAROON_SLEEVES : null,
  };
}
