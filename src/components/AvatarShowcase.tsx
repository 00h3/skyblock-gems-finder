import React, { useState, useEffect, useRef } from "react";
import { Check, User, Sparkles, RefreshCw, Layers, Smile } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { BuyModal } from "@/components/CurrencyModal";
import { GOLDEN_COINS_ICON, PINK_GEM_ICON } from "@/components/CurrencyPills";
import {
  AVATAR_CHARACTERS,
  getBaseCharacter,
  setBaseCharacter,
  setGender,
  getAvatarViewerUrl,
  type AvatarCharacterId,
} from "@/lib/avatar";
import { useAuth } from "@/lib/auth-context";
import { useCurrency, hydrateCurrency } from "@/lib/currency";
import {
  useEquippedShop,
  toggleEquipShopItem,
  useOwnedShopItems,
  getShopItem,
  type ShopItem,
} from "@/lib/shop";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { HtmlSpinner } from "./ui/HtmlLoadingScreen";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export function AvatarShowcase({ initialMode }: { initialMode?: "wardrobe" | "shop" } = {}) {
  const navigate = useNavigate();
  const { qbUser } = useAuth();
  const gems = useCurrency("gems");
  const gold = useCurrency("gold");
  const [buyModal, setBuyModal] = useState<"gold" | "gem" | null>(null);

  // Sync real-time currency from auth context if updated
  useEffect(() => {
    if (qbUser?.currency) {
      hydrateCurrency(qbUser.currency);
    }
  }, [qbUser?.currency]);

  // Selected character: default to Nelly (char2) matching reference screenshot
  const [selectedChar, setSelectedChar] = useState<AvatarCharacterId>(() => {
    if (qbUser?.avatarSnapshot?.selectedCharacter) {
      return qbUser.avatarSnapshot.selectedCharacter;
    }
    const base = getBaseCharacter();
    if (base === "char2") return "char2";
    // Check if user previously saved a preference, otherwise default to Nelly
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("qb_base_character");
      if (stored === "char1") return "char1";
    }
    return "char2";
  });

  const [isMounted, setIsMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "frequently" | "clothes" | "accessories" | "character" | "animations" | "body"
  >("clothes");
  const [activeSubPill, setActiveSubPill] = useState<string>("recommend");

  // Equipped wearables store
  const equippedShop = useEquippedShop();
  const ownedShopItems = useOwnedShopItems();

  // Local equipped state for immediate UI feedback and fast toggling
  const [localEquipped, setLocalEquipped] = useState<{ [key: string]: boolean }>(() => ({
    "suit-torso": equippedShop.shirt === "suit-torso",
    "striped-pants": equippedShop.pants === "striped-pants",
    "qb-white": equippedShop.shirt === "qb-white",
    "denim-pants": equippedShop.pants === "denim-pants",
    "qb-maroon-shirt": equippedShop.shirt === "qb-maroon-shirt",
    "qb-maroon-pants": equippedShop.pants === "qb-maroon-pants",
  }));

  // Keep in sync with store
  useEffect(() => {
    setLocalEquipped((prev) => ({
      ...prev,
      "suit-torso": equippedShop.shirt === "suit-torso",
      "striped-pants": equippedShop.pants === "striped-pants",
      "qb-white": equippedShop.shirt === "qb-white",
      "denim-pants": equippedShop.pants === "denim-pants",
      "qb-maroon-shirt": equippedShop.shirt === "qb-maroon-shirt",
      "qb-maroon-pants": equippedShop.pants === "qb-maroon-pants",
    }));
  }, [equippedShop.shirt, equippedShop.pants]);

  // Sync with auth user snapshot on load if available
  useEffect(() => {
    if (qbUser?.avatarSnapshot?.shopEquipped) {
      const shirt = qbUser.avatarSnapshot.shopEquipped.shirt;
      const pants = qbUser.avatarSnapshot.shopEquipped.pants;
      setLocalEquipped((prev) => ({
        ...prev,
        ...(shirt ? { [shirt]: true } : {}),
        ...(pants ? { [pants]: true } : {}),
      }));
    }
  }, [qbUser?.avatarSnapshot?.shopEquipped]);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // When putting both suit-torso and striped-pants or one of them, load spotlight-crimson;
  // if removing them, reverts back to previous viewer URL.
  const hasCrimsonOutfit =
    !!localEquipped["suit-torso"] ||
    !!localEquipped["striped-pants"] ||
    equippedShop.shirt === "suit-torso" ||
    equippedShop.pants === "striped-pants";

  const avatarViewerUrl = hasCrimsonOutfit
    ? "https://maxwell.z3ki.dev/bot/spotlight-crimson/"
    : getAvatarViewerUrl({
        characterId: selectedChar,
        gender: qbUser?.avatarSnapshot?.gender,
        username: qbUser?.username || qbUser?.displayName,
        email: qbUser?.email,
      });

  const activeCharData =
    AVATAR_CHARACTERS.find((c) => c.id === selectedChar) || AVATAR_CHARACTERS[1];

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (qbUser?.avatarSnapshot?.selectedCharacter) {
      setSelectedChar(qbUser.avatarSnapshot.selectedCharacter);
    }
  }, [qbUser?.avatarSnapshot?.selectedCharacter]);

  const handleSelectChar = (id: AvatarCharacterId) => {
    if (id === selectedChar) return;
    setSelectedChar(id);
    const isFemale = id === "char2";
    setGender(isFemale ? "female" : "male");
    setBaseCharacter(id);
    const charObj = AVATAR_CHARACTERS.find((c) => c.id === id);
    toast.info(`Switched to ${charObj?.name || id}`);
  };

  const handleResetCamera = () => {
    if (iframeRef.current) {
      try {
        iframeRef.current.contentWindow?.postMessage({ type: "reset-camera" }, "*");
      } catch {}
      // If needed reload iframe
      const curSrc = iframeRef.current.src;
      iframeRef.current.src = curSrc;
      toast.info("Camera reset");
    }
  };

  // Toggle item equipped state
  const handleToggleItem = (item: { id: string; name: string; slot: string }) => {
    const isCurrentlyEquipped = !!localEquipped[item.id];
    const newEquippedState = !isCurrentlyEquipped;

    setLocalEquipped((prev) => ({
      ...prev,
      [item.id]: newEquippedState,
    }));

    toggleEquipShopItem(item.id);

    if (newEquippedState) {
      toast.success(`Equipped ${item.name}`);
    } else {
      toast.info(`Unequipped ${item.name}`);
    }
  };

  const handleEquipAndSave = async () => {
    const isFemale = selectedChar === "char2";
    setBaseCharacter(selectedChar);
    setGender(isFemale ? "female" : "male");
    if (!qbUser?.uid) {
      toast.success(`${activeCharData.name} equipped!`);
      return;
    }
    setSaving(true);
    try {
      const charObj = AVATAR_CHARACTERS.find((c) => c.id === selectedChar);
      const userRef = doc(db, "users", qbUser.uid);
      await updateDoc(userRef, {
        "avatarSnapshot.selectedCharacter": selectedChar,
        "avatarSnapshot.baseCharacter": selectedChar,
        "avatarSnapshot.gender": isFemale ? "female" : "male",
        "avatarSnapshot.modelUrl": charObj?.modelUrl,
        "avatarSnapshot.shopEquipped.shirt": localEquipped["suit-torso"]
          ? "suit-torso"
          : localEquipped["qb-white"]
            ? "qb-white"
            : null,
        "avatarSnapshot.shopEquipped.pants": localEquipped["striped-pants"]
          ? "striped-pants"
          : localEquipped["denim-pants"]
            ? "denim-pants"
            : null,
      });
      toast.success(`${activeCharData.name} equipped!`);
    } catch (err) {
      console.error("Failed to save avatar", err);
      toast.error("Failed to save avatar");
    } finally {
      setSaving(false);
    }
  };

  // Item catalogs for Clothes tab - ONLY the two requested items
  const CLOTHING_ITEMS = [
    {
      id: "suit-torso",
      name: "Suit Torso",
      slot: "shirt",
      category: "shirts",
      thumb: "https://maxwell.z3ki.dev/bot/_files/suit-torso/1791123411121.jpg",
      isNew: true,
      recommend: true,
    },
    {
      id: "striped-pants",
      name: "Striped Pants",
      slot: "pants",
      category: "pants",
      thumb: "https://maxwell.z3ki.dev/bot/_files/striped-pants/1791123490816.jpg",
      isNew: true,
      recommend: true,
    },
  ];

  // Filter clothes based on active subpill
  const filteredClothes = CLOTHING_ITEMS.filter((item) => {
    if (activeSubPill === "shirts") return item.category === "shirts";
    if (activeSubPill === "pants") return item.category === "pants";
    return true; // recommend and new_item show the items
  });

  // Accessories list
  const ACCESSORY_ITEMS = [
    {
      id: "witch-hat",
      name: "Witch Hat",
      thumb: "https://file.garden/alGOOylwpAfCa6qP/70907A5A-2AD0-4E56-A5A3-6F1E0548E44A.png",
      slot: "hat",
    },
    {
      id: "purple-cape",
      name: "Purple Cape Wings",
      thumb: "/studio-splash.png",
      slot: "wings",
    },
    {
      id: "tactical-backpack",
      name: "Tactical Backpack",
      thumb: "/public/icon-settings.png",
      slot: "backpack",
    },
  ];

  return (
    <MobileShell hideNav={false} scroll={true}>
      <div className="min-h-dvh flex flex-col bg-[#ffffff] text-[#17191d] pb-24 select-none">
        {/* Top Header with Currencies directly placed */}
        <header className="flex items-center justify-center gap-2 px-3 pt-2 pb-1.5 bg-white sticky top-0 z-30">
          {/* Gem Currency Pill */}
          <button
            type="button"
            onClick={() => setBuyModal("gem")}
            className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-full border border-black/[0.08] shadow-[0_1px_4px_rgba(0,0,0,0.03)] active:scale-95 transition-transform"
            aria-label="Gem Balance"
          >
            <img
              src={PINK_GEM_ICON}
              alt="Gems"
              className="w-4 h-4 object-contain"
              draggable={false}
            />
            <span
              className="text-[13px] font-black tracking-tight text-[#17191d] tabular-nums"
              suppressHydrationWarning
            >
              {gems > 0 ? gems.toLocaleString("de-DE") : "99.200"}
            </span>
          </button>

          {/* Gold Coin Currency Pill */}
          <button
            type="button"
            onClick={() => setBuyModal("gold")}
            className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-full border border-black/[0.08] shadow-[0_1px_4px_rgba(0,0,0,0.03)] active:scale-95 transition-transform"
            aria-label="Gold Coin Balance"
          >
            <img
              src={GOLDEN_COINS_ICON}
              alt="Coins"
              className="w-4 h-4 object-contain"
              draggable={false}
            />
            <span
              className="text-[13px] font-black tracking-tight text-[#17191d] tabular-nums"
              suppressHydrationWarning
            >
              {gold > 0 ? gold.toLocaleString("de-DE") : "1.532.669"}
            </span>
          </button>
        </header>

        {/* 3D Character Stage Section - Way smaller & compact per user request */}
        <div className="relative w-full h-[225px] sm:h-[250px] bg-gradient-to-b from-[#ffffff] via-[#f8fafc] to-[#eef2f6] overflow-hidden">
          {/* Full Space 3D Avatar Preview Iframe */}
          <iframe
            ref={iframeRef}
            key={avatarViewerUrl}
            src={avatarViewerUrl}
            className="w-full h-full border-0 absolute inset-0 bg-transparent z-0"
            style={{ pointerEvents: "auto", border: "none", width: "100%", height: "100%" }}
            allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
            sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
            title="Avatar 3D Preview"
          />

          {/* Camera Reset Button on bottom-right of 3D stage */}
          <div className="absolute bottom-3 right-3 z-10 pointer-events-auto">
            <button
              type="button"
              onClick={handleResetCamera}
              className="w-8 h-8 rounded-[10px] bg-white border border-black/[0.08] shadow-xs flex items-center justify-center cursor-pointer active:scale-90 transition-all hover:bg-slate-50"
              title="Reset View"
              aria-label="Reset View"
            >
              <div className="w-2.5 h-2.5 rounded-[3px] bg-[#17191d]" />
            </button>
          </div>
        </div>

        {/* Wardrobe Customizer Panel (Bottom Half) with squircle top */}
        <div className="flex-1 bg-white rounded-t-[20px] -mt-4 relative z-20 shadow-[0_-6px_24px_rgba(0,0,0,0.05)] flex flex-col">
          {/* Decorative Drag Handle Pill */}
          <div className="pt-2 pb-0.5 flex justify-center">
            <div className="w-8 h-1 rounded-full bg-[#e2e8f0]" />
          </div>

          {/* Main Category Tabs: Compact horizontal scrolling between categories */}
          <div className="overflow-x-auto no-scrollbar scroll-smooth flex items-center gap-4 px-4 pt-1.5 pb-0.5 border-b border-black/[0.05]">
            {[
              { id: "frequently", label: "Frequently used" },
              { id: "clothes", label: "Clothes" },
              { id: "accessories", label: "Accessories" },
              { id: "character", label: "Character" },
              { id: "animations", label: "Animations" },
              { id: "body", label: "Body" },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    if (tab.id === "frequently") setActiveSubPill("my_outfit");
                    if (tab.id === "clothes") setActiveSubPill("recommend");
                    if (tab.id === "accessories") setActiveSubPill("recommend");
                    if (tab.id === "character") setActiveSubPill("my_avatars");
                    if (tab.id === "animations") setActiveSubPill("walk");
                    if (tab.id === "body") setActiveSubPill("skin");
                  }}
                  className={`relative pb-2 text-[13px] font-extrabold whitespace-nowrap transition-colors shrink-0 ${
                    isActive ? "text-[#17191d]" : "text-[#8a94a6] hover:text-[#17191d]"
                  }`}
                >
                  {tab.label}
                  {isActive && (
                    <motion.div
                      layoutId="avatarTabIndicator"
                      className="absolute -bottom-[1px] left-0 right-0 h-[2.5px] bg-[#fa4616] rounded-full"
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Sub-Category Horizontal Filter Pills */}
          <div className="flex items-center gap-1.5 px-4 py-2 overflow-x-auto no-scrollbar">
            {activeTab === "clothes" && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveSubPill("recommend")}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all shrink-0 active:scale-95 ${
                    activeSubPill === "recommend"
                      ? "bg-[#17191d] text-white shadow-xs"
                      : "bg-[#f1f5f9] text-[#697383] hover:bg-[#e2e8f0]"
                  }`}
                >
                  Recommend
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubPill("new_item")}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all shrink-0 active:scale-95 ${
                    activeSubPill === "new_item"
                      ? "bg-[#17191d] text-white shadow-xs"
                      : "bg-[#f1f5f9] text-[#697383] hover:bg-[#e2e8f0]"
                  }`}
                >
                  New item
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubPill("shirts")}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all shrink-0 active:scale-95 ${
                    activeSubPill === "shirts"
                      ? "bg-[#17191d] text-white shadow-xs"
                      : "bg-[#f1f5f9] text-[#697383] hover:bg-[#e2e8f0]"
                  }`}
                >
                  Shirts
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubPill("pants")}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all shrink-0 active:scale-95 ${
                    activeSubPill === "pants"
                      ? "bg-[#17191d] text-white shadow-xs"
                      : "bg-[#f1f5f9] text-[#697383] hover:bg-[#e2e8f0]"
                  }`}
                >
                  Pants
                </button>
              </>
            )}

            {activeTab === "frequently" && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveSubPill("my_outfit")}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all shrink-0 active:scale-95 ${
                    activeSubPill === "my_outfit"
                      ? "bg-[#17191d] text-white shadow-xs"
                      : "bg-[#f1f5f9] text-[#697383] hover:bg-[#e2e8f0]"
                  }`}
                >
                  My outfit
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubPill("decorations")}
                  className={`px-4 py-1.5 rounded-full text-[13px] font-bold transition-all shrink-0 active:scale-95 ${
                    activeSubPill === "decorations"
                      ? "bg-[#17191d] text-white shadow-xs"
                      : "bg-[#f1f5f9] text-[#697383] hover:bg-[#e2e8f0]"
                  }`}
                >
                  All decorations
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubPill("recently")}
                  className={`px-4 py-1.5 rounded-full text-[13px] font-bold transition-all shrink-0 active:scale-95 ${
                    activeSubPill === "recently"
                      ? "bg-[#17191d] text-white shadow-xs"
                      : "bg-[#f1f5f9] text-[#697383] hover:bg-[#e2e8f0]"
                  }`}
                >
                  Recently Used
                </button>
              </>
            )}

            {activeTab === "accessories" && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveSubPill("recommend")}
                  className={`px-4 py-1.5 rounded-full text-[13px] font-bold transition-all shrink-0 active:scale-95 ${
                    activeSubPill === "recommend"
                      ? "bg-[#17191d] text-white shadow-xs"
                      : "bg-[#f1f5f9] text-[#697383] hover:bg-[#e2e8f0]"
                  }`}
                >
                  Recommend
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubPill("new_item")}
                  className={`px-4 py-1.5 rounded-full text-[13px] font-bold transition-all shrink-0 active:scale-95 ${
                    activeSubPill === "new_item"
                      ? "bg-[#17191d] text-white shadow-xs"
                      : "bg-[#f1f5f9] text-[#697383] hover:bg-[#e2e8f0]"
                  }`}
                >
                  New item
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubPill("hats")}
                  className={`px-4 py-1.5 rounded-full text-[13px] font-bold transition-all shrink-0 active:scale-95 ${
                    activeSubPill === "hats"
                      ? "bg-[#17191d] text-white shadow-xs"
                      : "bg-[#f1f5f9] text-[#697383] hover:bg-[#e2e8f0]"
                  }`}
                >
                  Hats
                </button>
              </>
            )}

            {activeTab === "character" && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveSubPill("my_avatars")}
                  className={`px-4 py-1.5 rounded-full text-[13px] font-bold transition-all shrink-0 active:scale-95 ${
                    activeSubPill === "my_avatars"
                      ? "bg-[#17191d] text-white shadow-xs"
                      : "bg-[#f1f5f9] text-[#697383] hover:bg-[#e2e8f0]"
                  }`}
                >
                  My 3D Avatars
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubPill("preset")}
                  className={`px-4 py-1.5 rounded-full text-[13px] font-bold transition-all shrink-0 active:scale-95 ${
                    activeSubPill === "preset"
                      ? "bg-[#17191d] text-white shadow-xs"
                      : "bg-[#f1f5f9] text-[#697383] hover:bg-[#e2e8f0]"
                  }`}
                >
                  Preset Characters
                </button>
              </>
            )}

            {activeTab === "animations" && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveSubPill("walk")}
                  className={`px-4 py-1.5 rounded-full text-[13px] font-bold transition-all shrink-0 active:scale-95 ${
                    activeSubPill === "walk"
                      ? "bg-[#17191d] text-white shadow-xs"
                      : "bg-[#f1f5f9] text-[#697383] hover:bg-[#e2e8f0]"
                  }`}
                >
                  Walk
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubPill("run")}
                  className={`px-4 py-1.5 rounded-full text-[13px] font-bold transition-all shrink-0 active:scale-95 ${
                    activeSubPill === "run"
                      ? "bg-[#17191d] text-white shadow-xs"
                      : "bg-[#f1f5f9] text-[#697383] hover:bg-[#e2e8f0]"
                  }`}
                >
                  Run
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubPill("emotes")}
                  className={`px-4 py-1.5 rounded-full text-[13px] font-bold transition-all shrink-0 active:scale-95 ${
                    activeSubPill === "emotes"
                      ? "bg-[#17191d] text-white shadow-xs"
                      : "bg-[#f1f5f9] text-[#697383] hover:bg-[#e2e8f0]"
                  }`}
                >
                  Emotes
                </button>
              </>
            )}

            {activeTab === "body" && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveSubPill("skin")}
                  className={`px-4 py-1.5 rounded-full text-[13px] font-bold transition-all shrink-0 active:scale-95 ${
                    activeSubPill === "skin"
                      ? "bg-[#17191d] text-white shadow-xs"
                      : "bg-[#f1f5f9] text-[#697383] hover:bg-[#e2e8f0]"
                  }`}
                >
                  Skin
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubPill("hair")}
                  className={`px-4 py-1.5 rounded-full text-[13px] font-bold transition-all shrink-0 active:scale-95 ${
                    activeSubPill === "hair"
                      ? "bg-[#17191d] text-white shadow-xs"
                      : "bg-[#f1f5f9] text-[#697383] hover:bg-[#e2e8f0]"
                  }`}
                >
                  Hair
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubPill("face")}
                  className={`px-4 py-1.5 rounded-full text-[13px] font-bold transition-all shrink-0 active:scale-95 ${
                    activeSubPill === "face"
                      ? "bg-[#17191d] text-white shadow-xs"
                      : "bg-[#f1f5f9] text-[#697383] hover:bg-[#e2e8f0]"
                  }`}
                >
                  Face
                </button>
              </>
            )}
          </div>

          {/* Items Content Grid */}
          <div className="px-4 py-1 flex-1">
            <AnimatePresence mode="wait">
              {activeTab === "clothes" && (
                <motion.div
                  key="clothes-grid"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.18 }}
                  className="grid grid-cols-3 sm:grid-cols-4 gap-2"
                >
                  {filteredClothes.map((item) => {
                    const isEquipped = !!localEquipped[item.id];
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleToggleItem(item)}
                        className={`relative rounded-[14px] overflow-hidden h-[86px] sm:h-[92px] w-full flex items-center justify-center transition-all cursor-pointer select-none active:scale-95 ${
                          isEquipped
                            ? "border-2 border-[#fa4616] ring-2 ring-[#fa4616]/25 shadow-[0_2px_8px_rgba(250,70,22,0.20)]"
                            : "border border-black/[0.08] hover:border-black/20"
                        }`}
                        style={{
                          background:
                            "linear-gradient(180deg, #f2f8f5 0%, #ebf4ef 45%, #d8e7de 100%)",
                        }}
                      >
                        {/* Fully incorporated image, edge-to-edge */}
                        <img
                          src={item.thumb}
                          alt={item.name}
                          className="w-full h-full object-cover object-center pointer-events-none select-none"
                          draggable={false}
                        />

                        {/* Checkmark indicator at bottom if equipped */}
                        {isEquipped && (
                          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex items-center justify-center w-5 h-5 rounded-full bg-white/95 shadow-xs text-[#fa4616]">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </motion.div>
              )}

              {activeTab === "character" && (
                <motion.div
                  key="character-grid"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.18 }}
                  className="grid grid-cols-2 gap-2.5 max-w-[320px]"
                >
                  {AVATAR_CHARACTERS.map((char) => {
                    const isSelected = selectedChar === char.id;
                    return (
                      <button
                        key={char.id}
                        type="button"
                        onClick={() => handleSelectChar(char.id as AvatarCharacterId)}
                        className={`relative rounded-[14px] p-2 h-[100px] flex flex-col text-left transition-all cursor-pointer select-none active:scale-95 ${
                          isSelected
                            ? "border-2 border-[#fa4616] ring-2 ring-[#fa4616]/20 bg-white shadow-xs"
                            : "border border-black/[0.08] bg-[#f8fafc] hover:bg-white"
                        }`}
                      >
                        <div className="w-full flex-1 rounded-[10px] bg-gradient-to-b from-[#eef2f6] to-[#e2e8f0] overflow-hidden relative flex items-center justify-center">
                          <User className="w-6 h-6 text-[#fa4616]" fill="currentColor" />
                          {isSelected && (
                            <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-[#fa4616] text-white grid place-items-center shadow-xs">
                              <Check className="w-2 h-2 stroke-[3]" />
                            </div>
                          )}
                        </div>

                        <div className="mt-1.5 flex flex-col">
                          <span className="text-[12px] font-black text-[#17191d] truncate">
                            {char.name}
                          </span>
                          <span className="text-[10px] font-semibold text-[#8a94a6]">
                            {isSelected ? "Equipped" : "Tap to switch"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </motion.div>
              )}

              {activeTab === "frequently" && (
                <motion.div
                  key="frequently-grid"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.18 }}
                  className="grid grid-cols-3 sm:grid-cols-4 gap-2"
                >
                  {CLOTHING_ITEMS.map((item) => {
                    const isEquipped = !!localEquipped[item.id];
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleToggleItem(item)}
                        className={`relative rounded-[14px] overflow-hidden h-[86px] sm:h-[92px] w-full flex items-center justify-center transition-all cursor-pointer select-none active:scale-95 ${
                          isEquipped
                            ? "border-2 border-[#fa4616] ring-2 ring-[#fa4616]/25 shadow-[0_2px_8px_rgba(250,70,22,0.20)]"
                            : "border border-black/[0.08] hover:border-black/20"
                        }`}
                        style={{
                          background:
                            "linear-gradient(180deg, #f2f8f5 0%, #ebf4ef 45%, #d8e7de 100%)",
                        }}
                      >
                        <img
                          src={item.thumb}
                          alt={item.name}
                          className="w-full h-full object-cover object-center pointer-events-none select-none"
                          draggable={false}
                        />
                        {isEquipped && (
                          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex items-center justify-center w-5 h-5 rounded-full bg-white/95 shadow-xs text-[#fa4616]">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </motion.div>
              )}

              {activeTab === "accessories" && (
                <motion.div
                  key="accessories-grid"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.18 }}
                  className="grid grid-cols-3 sm:grid-cols-4 gap-2"
                >
                  {ACCESSORY_ITEMS.map((item) => {
                    const isEquipped = !!localEquipped[item.id];
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setLocalEquipped((prev) => ({
                            ...prev,
                            [item.id]: !prev[item.id],
                          }));
                          toast.success(`Toggled ${item.name}`);
                        }}
                        className={`relative rounded-[14px] p-2 h-[86px] sm:h-[92px] flex flex-col items-center justify-center transition-all cursor-pointer select-none active:scale-95 ${
                          isEquipped
                            ? "border-2 border-[#fa4616] ring-2 ring-[#fa4616]/20 shadow-xs"
                            : "border border-black/[0.08] hover:border-black/20"
                        }`}
                        style={{
                          background:
                            "linear-gradient(180deg, #f2f8f5 0%, #ebf4ef 45%, #d8e7de 100%)",
                        }}
                      >
                        <div className="flex-1 flex items-center justify-center w-full">
                          <img
                            src={item.thumb}
                            alt={item.name}
                            className="w-[46px] h-[46px] object-contain drop-shadow-xs pointer-events-none"
                            draggable={false}
                          />
                        </div>
                        {isEquipped && (
                          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center justify-center text-[#fa4616]">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </motion.div>
              )}

              {activeTab === "animations" && (
                <motion.div
                  key="animations-grid"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.18 }}
                  className="flex flex-col gap-2 py-1.5"
                >
                  <div className="grid grid-cols-3 gap-2">
                    {["Idle", "Walk", "Wave", "Jump", "Dance", "Clap"].map((anim) => (
                      <button
                        key={anim}
                        type="button"
                        onClick={() => toast.info(`Playing ${anim} animation`)}
                        className="h-8.5 rounded-[10px] bg-[#f8fafc] border border-black/[0.07] font-extrabold text-[12px] text-[#17191d] hover:bg-white active:scale-95 transition-all shadow-xs"
                      >
                        {anim}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === "body" && (
                <motion.div
                  key="body-grid"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.18 }}
                  className="flex flex-col gap-2 py-1.5"
                >
                  <span className="text-[11px] font-bold text-[#8a94a6]">Skin Tone Palette</span>
                  <div className="flex items-center gap-2">
                    {["#ffe0bd", "#f1c27d", "#e0ac69", "#c68642", "#8d5524", "#3d2314"].map(
                      (tone, i) => (
                        <button
                          key={tone}
                          type="button"
                          onClick={() => toast.success(`Selected skin tone ${i + 1}`)}
                          className="w-7 h-7 rounded-full border-2 border-white shadow-xs active:scale-90 transition-transform"
                          style={{ backgroundColor: tone }}
                        />
                      ),
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom Equip Action Button */}
          <div className="px-4 pt-2 pb-1.5 mt-auto">
            <button
              type="button"
              onClick={handleEquipAndSave}
              disabled={saving}
              className="w-full h-[40px] rounded-[12px] bg-white border border-black/15 shadow-xs flex items-center justify-center gap-2 font-extrabold text-[13.5px] text-[#17191d] active:scale-[0.98] transition-all hover:bg-slate-50 cursor-pointer"
            >
              {saving ? (
                <HtmlSpinner size="sm" />
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 text-[#fa4616] stroke-[3]" />
                  <span>Equip {activeCharData.name}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Currency Top-Up Modal when user taps currency pills */}
        {buyModal && <BuyModal type={buyModal} onClose={() => setBuyModal(null)} />}
      </div>
    </MobileShell>
  );
}
