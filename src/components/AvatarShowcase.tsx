import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, User, ShoppingBag, RotateCw, RotateCcw, Check, RefreshCw } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { CurrencyPills } from "@/components/CurrencyPills";
import { BuyModal } from "@/components/CurrencyModal";
import {
  CHARACTER_1_GLTF,
  CHARACTER_2_GLTF,
  AVATAR_CHARACTERS,
  getBaseCharacter,
  setBaseCharacter,
  setGender,
  type AvatarCharacterId,
} from "@/lib/avatar";
import { useAuth } from "@/lib/auth-context";
import { useCurrency, hydrateCurrency } from "@/lib/currency";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { HtmlSpinner } from "./ui/HtmlLoadingScreen";
import { toast } from "sonner";

class AvatarErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.warn("AvatarErrorBoundary caught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[#f1f5f9]">
          <p className="text-sm font-bold text-[#17191d] mb-1">Preview Unavailable</p>
          <p className="text-xs text-[#697383] mb-3">The 3D model could not be rendered.</p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="qb-squircle press px-3 py-1.5 text-xs font-extrabold bg-[#17191d] text-white flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reload</span>
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

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

  // Character selection: strictly Character 1 and Character 2 only
  const [selectedChar, setSelectedChar] = useState<AvatarCharacterId>(() => {
    if (qbUser?.avatarSnapshot?.selectedCharacter === "char2") return "char2";
    return getBaseCharacter();
  });

  const [isMounted, setIsMounted] = useState(false);
  const [modelError, setModelError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "frequently" | "clothes" | "accessories" | "character"
  >("frequently");
  const [activeSubPill, setActiveSubPill] = useState<string>("my_outfit");

  const modelViewerRef = useRef<HTMLElement | null>(null);

  const activeCharData =
    AVATAR_CHARACTERS.find((c) => c.id === selectedChar) || AVATAR_CHARACTERS[0];

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== "undefined" && !customElements.get("model-viewer")) {
      if (!document.querySelector('script[src*="model-viewer"]')) {
        const script = document.createElement("script");
        script.type = "module";
        script.src = "https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js";
        document.head.appendChild(script);
      }
    }
  }, []);

  useEffect(() => {
    if (qbUser?.avatarSnapshot?.selectedCharacter) {
      setSelectedChar(qbUser.avatarSnapshot.selectedCharacter);
    }
  }, [qbUser?.avatarSnapshot?.selectedCharacter]);

  // Reliable model loading implementation matching public/wardrobe.html
  useEffect(() => {
    if (!isMounted) return;
    const viewer = modelViewerRef.current as any;
    if (!viewer) return;

    try {
      viewer.cameraControls = true;
      viewer.autoRotate = autoRotate;
      viewer.rotationPerSecond = "25deg";
      viewer.cameraOrbit = "0deg 75deg 3m";
      viewer.fieldOfView = "30deg";
      viewer.shadowIntensity = 1;
      viewer.exposure = 1.1;
      viewer.interactionPrompt = "none";
      viewer.loading = "eager";
      if (activeCharData?.modelUrl && viewer.src !== activeCharData.modelUrl) {
        viewer.src = activeCharData.modelUrl;
      }
    } catch (e) {
      console.warn("Model viewer setup failed:", e);
    }

    const onLoad = () => {
      setLoading(false);
      setModelError(false);
    };

    const onError = (e: any) => {
      console.warn("Model load failed:", e);
      setLoading(false);
      setModelError(true);
    };

    viewer.addEventListener("load", onLoad);
    viewer.addEventListener("error", onError);

    return () => {
      viewer.removeEventListener("load", onLoad);
      viewer.removeEventListener("error", onError);
    };
  }, [isMounted, activeCharData?.modelUrl, autoRotate]);

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    } else {
      navigate({ to: "/" as never });
    }
  };

  const handleSelectChar = (id: AvatarCharacterId) => {
    if (id === selectedChar) return;
    setLoading(true);
    setSelectedChar(id);
    const isFemale = id === "char2";
    setGender(isFemale ? "female" : "male");
    setBaseCharacter(id);
    const charObj = AVATAR_CHARACTERS.find((c) => c.id === id);
    const viewer = modelViewerRef.current as any;
    if (viewer && charObj) {
      viewer.src = charObj.modelUrl;
    }
  };

  const handleResetCamera = () => {
    const viewer = modelViewerRef.current as any;
    if (viewer && typeof viewer.resetTurntable === "function") {
      viewer.resetTurntable();
    }
    if (viewer && viewer.cameraOrbit) {
      viewer.cameraOrbit = "0deg 75deg 3m";
    }
  };

  const handleEquipAndSave = async () => {
    const isFemale = selectedChar === "char2";
    setBaseCharacter(selectedChar);
    setGender(isFemale ? "female" : "male");
    if (!qbUser?.uid) {
      toast.info(`${activeCharData.name} equipped!`);
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
        "avatarSnapshot.modelUrl": charObj?.modelUrl || CHARACTER_1_GLTF,
      });
      toast.success(`${activeCharData.name} equipped!`);
    } catch (err) {
      console.error("Failed to save avatar", err);
      toast.error("Failed to save avatar");
    } finally {
      setSaving(false);
    }
  };

  // Determine whether current tab/subpill shows real 3D avatars
  const isCharacterView =
    (activeTab === "character" && activeSubPill === "my_avatars") ||
    (activeTab === "frequently" && activeSubPill === "my_outfit");

  return (
    <MobileShell hideNav={false} scroll={true}>
      <div className="min-h-dvh flex flex-col bg-[#f8fafc] text-[#17191d] pb-24 select-none">
        {/* Top Header with Real Currency Pills matching Homepage */}
        <header className="flex items-center justify-between px-4 pt-3.5 pb-2 bg-white/95 backdrop-blur-md sticky top-0 z-30 border-b border-black/[0.04]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBack}
              className="qb-squircle press grid h-8 w-8 place-items-center text-[#17191d]"
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <span className="text-[15px] font-black tracking-tight text-[#17191d]">Avatar Studio</span>
          </div>

          {/* Real Currency Badges matching homepage */}
          <div className="flex items-center gap-1.5">
            <CurrencyPills
              compact
              maxItems={2}
              onSelect={(c) => setBuyModal(c === "gems" ? "gem" : "gold")}
            />
          </div>
        </header>

        {/* 3D Character Stage Section */}
        {/* 3D Model Stage (Top Half) */}
        <div className="relative w-full h-[370px] bg-gradient-to-b from-[#ffffff] via-[#f1f5f9] to-[#e2e8f0] overflow-hidden">
          {/* Full Space 3D Avatar Preview Iframe */}
          <iframe
            src="https://maxwell.z3ki.dev/bot/avatar-boy-preview/"
            className="w-full h-full border-0 absolute inset-0 bg-transparent z-0"
            style={{ pointerEvents: "auto", border: "none", width: "100%", height: "100%" }}
            allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
            sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
            title="Avatar 3D Preview"
          />

          {/* Floating Stage Bottom Right: Shopping Cart Button */}
          <div className="absolute bottom-3 right-3.5 z-10 pointer-events-auto">
            <button
              type="button"
              onClick={() => navigate({ to: "/shop" as never })}
              className="qb-squircle press relative grid h-9 w-9 place-items-center bg-white/95 backdrop-blur-md border border-black/[0.08] text-[#17191d] shadow-xs"
              aria-label="Cart"
            >
              <ShoppingBag className="w-4 h-4 fill-current text-[#17191d]" />
            </button>
          </div>
        </div>

        {/* Wardrobe Customizer Panel (Bottom Half) */}
        <div className="flex-1 bg-white rounded-t-[24px] -mt-4 relative z-20 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] flex flex-col">
          {/* Decorative Drag Handle Pill */}
          <div className="pt-2.5 pb-1 flex justify-center">
            <div className="w-10 h-1 rounded-full bg-[#e2e8f0]" />
          </div>

          {/* Category Tabs: Frequently used | Clothes | Accessories | Character */}
          <div className="flex items-center justify-between border-b border-black/[0.06] px-3 pt-2">
            {[
              { id: "frequently", label: "Frequently used" },
              { id: "clothes", label: "Clothes" },
              { id: "accessories", label: "Accessories" },
              { id: "character", label: "Character" },
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
                  }}
                  className={`relative pb-2.5 px-2 text-[13px] font-black transition-colors whitespace-nowrap ${
                    isActive ? "text-[#17191d]" : "text-[#8a94a6] hover:text-[#17191d]"
                  }`}
                >
                  {tab.label}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#fa4616] rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Sub-Category Horizontal Filters */}
          <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto no-scrollbar">
            {activeTab === "frequently" && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveSubPill("my_outfit")}
                  className={`px-3 py-1 rounded-full text-[12px] font-bold transition-all shrink-0 ${
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
                  className={`px-3 py-1 rounded-full text-[12px] font-bold transition-all shrink-0 ${
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
                  className={`px-3 py-1 rounded-full text-[12px] font-bold transition-all shrink-0 ${
                    activeSubPill === "recently"
                      ? "bg-[#17191d] text-white shadow-xs"
                      : "bg-[#f1f5f9] text-[#697383] hover:bg-[#e2e8f0]"
                  }`}
                >
                  Recently Used
                </button>
              </>
            )}

            {activeTab === "clothes" && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveSubPill("recommend")}
                  className={`px-3 py-1 rounded-full text-[12px] font-bold transition-all shrink-0 ${
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
                  className={`px-3 py-1 rounded-full text-[12px] font-bold transition-all shrink-0 ${
                    activeSubPill === "new_item"
                      ? "bg-[#17191d] text-white shadow-xs"
                      : "bg-[#f1f5f9] text-[#697383] hover:bg-[#e2e8f0]"
                  }`}
                >
                  New item
                </button>
              </>
            )}

            {activeTab === "accessories" && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveSubPill("recommend")}
                  className={`px-3 py-1 rounded-full text-[12px] font-bold transition-all shrink-0 ${
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
                  className={`px-3 py-1 rounded-full text-[12px] font-bold transition-all shrink-0 ${
                    activeSubPill === "new_item"
                      ? "bg-[#17191d] text-white shadow-xs"
                      : "bg-[#f1f5f9] text-[#697383] hover:bg-[#e2e8f0]"
                  }`}
                >
                  New item
                </button>
              </>
            )}

            {activeTab === "character" && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveSubPill("my_avatars")}
                  className={`px-3 py-1 rounded-full text-[12px] font-bold transition-all shrink-0 ${
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
                  className={`px-3 py-1 rounded-full text-[12px] font-bold transition-all shrink-0 ${
                    activeSubPill === "preset"
                      ? "bg-[#17191d] text-white shadow-xs"
                      : "bg-[#f1f5f9] text-[#697383] hover:bg-[#e2e8f0]"
                  }`}
                >
                  Preset Characters
                </button>
              </>
            )}
          </div>

          {/* Outfits / Items Grid / No Skin Added Yet */}
          <div className="px-4 py-2 flex-1">
            {isCharacterView ? (
              <div className="grid grid-cols-2 gap-3 max-w-[360px]">
                {/* Strictly Character 1 and Character 2 only */}
                {AVATAR_CHARACTERS.map((char) => {
                  const isSelected = selectedChar === char.id;
                  return (
                    <button
                      key={char.id}
                      type="button"
                      onClick={() => handleSelectChar(char.id as AvatarCharacterId)}
                      className={`qb-play-card press relative flex flex-col p-2.5 h-[140px] text-left transition-all ${
                        isSelected
                          ? "ring-2 ring-[#fa4616] border-transparent bg-white shadow-md"
                          : "bg-[#f8fafc] hover:bg-white"
                      }`}
                    >
                      {/* Thumbnail Container */}
                      <div className="w-full flex-1 rounded-[12px] bg-gradient-to-b from-[#eef2f6] to-[#e2e8f0] overflow-hidden relative flex items-center justify-center">
                        <User className="w-8 h-8 text-[#fa4616]" fill="currentColor" />
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#fa4616] text-white grid place-items-center shadow-xs">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                      </div>

                      <div className="mt-2 flex flex-col">
                        <span className="text-[12px] font-black text-[#17191d] truncate">
                          {char.name}
                        </span>
                        <span className="text-[10px] font-semibold text-[#8a94a6]">
                          {isSelected ? "Equipped" : "Tap to test"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="py-16 flex flex-col items-center justify-center text-center px-4">
                <p className="text-[14px] font-bold text-[#697383]">No Skin Added Yet</p>
              </div>
            )}
          </div>

          {/* Bottom Equip Action Button */}
          <div className="p-4 pt-2 border-t border-black/[0.04]">
            <button
              type="button"
              onClick={handleEquipAndSave}
              disabled={saving}
              className="qb-squircle press w-full h-[46px] flex items-center justify-center gap-2 text-[14px] font-extrabold text-[#17191d] active:scale-[0.98] transition-transform shadow-xs"
            >
              {saving ? (
                <HtmlSpinner size="sm" />
              ) : (
                <>
                  <Check className="w-4 h-4 text-[#fa4616] stroke-[2.5]" />
                  <span>Equip {activeCharData.name}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Currency Top-Up Modal when user taps currency or shop pills */}
        {buyModal && <BuyModal type={buyModal} onClose={() => setBuyModal(null)} />}
      </div>
    </MobileShell>
  );
}
