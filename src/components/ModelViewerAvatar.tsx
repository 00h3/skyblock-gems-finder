import React, { useEffect, useRef, useState } from "react";
import {
  CHARACTER_1_GLTF,
  CHARACTER_2_GLTF,
  AVATAR_CHARACTERS,
  setBaseCharacter,
  setGender,
  type AvatarCharacterId,
} from "@/lib/avatar";
import { HtmlSpinner } from "./ui/HtmlLoadingScreen";
import { RotateCw, Sun, RotateCcw, Check, User } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { toast } from "sonner";

interface ModelViewerAvatarProps {
  initialCharacter?: AvatarCharacterId;
  height?: number | string;
  className?: string;
  showSelector?: boolean;
  showControls?: boolean;
  onCharacterSelect?: (charId: AvatarCharacterId, modelUrl: string) => void;
}

export function ModelViewerAvatar({
  initialCharacter = "char1",
  height = 380,
  className = "",
  showSelector = true,
  showControls = true,
  onCharacterSelect,
}: ModelViewerAvatarProps) {
  const { qbUser } = useAuth();
  const [selectedChar, setSelectedChar] = useState<AvatarCharacterId>(() => {
    if (qbUser?.avatarSnapshot?.selectedCharacter === "char2") return "char2";
    return initialCharacter;
  });
  const [loading, setLoading] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [lightingMode, setLightingMode] = useState<"neutral" | "bright">("bright");
  const [saving, setSaving] = useState(false);
  const modelViewerRef = useRef<HTMLElement | null>(null);

  const activeCharData =
    AVATAR_CHARACTERS.find((c) => c.id === selectedChar) || AVATAR_CHARACTERS[0];

  useEffect(() => {
    if (qbUser?.avatarSnapshot?.selectedCharacter) {
      setSelectedChar(qbUser.avatarSnapshot.selectedCharacter);
    }
  }, [qbUser?.avatarSnapshot?.selectedCharacter]);

  // Method matching public/wardrobe.html: direct property assignment and reliable load listening
  useEffect(() => {
    const viewer = modelViewerRef.current as any;
    if (!viewer) return;

    try {
      viewer.cameraControls = true;
      viewer.autoRotate = autoRotate;
      viewer.rotationPerSecond = "25deg";
      viewer.cameraOrbit = "0deg 75deg 3m";
      viewer.fieldOfView = "30deg";
      viewer.shadowIntensity = 1;
      viewer.exposure = lightingMode === "bright" ? 1.2 : 0.95;
      viewer.interactionPrompt = "none";
      viewer.loading = "eager";
      if (activeCharData?.modelUrl && viewer.src !== activeCharData.modelUrl) {
        viewer.src = activeCharData.modelUrl;
      }
    } catch {
      // safe fallback
    }

    const handleLoad = () => {
      setLoading(false);
    };

    const handleError = () => {
      setLoading(false);
    };

    viewer.addEventListener("load", handleLoad);
    viewer.addEventListener("error", handleError);
    viewer.addEventListener("model-visibility", handleLoad);

    if (viewer.loaded) {
      setLoading(false);
    }

    // Safety timeout ensuring spinner never blocks interaction
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);

    return () => {
      viewer.removeEventListener("load", handleLoad);
      viewer.removeEventListener("error", handleError);
      viewer.removeEventListener("model-visibility", handleLoad);
      clearTimeout(timer);
    };
  }, [selectedChar, autoRotate, lightingMode, activeCharData?.modelUrl]);

  const handleToggleRotate = () => {
    setAutoRotate((prev) => !prev);
  };

  const handleToggleLighting = () => {
    setLightingMode((prev) => (prev === "neutral" ? "bright" : "neutral"));
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

  const handleSelect = (charId: AvatarCharacterId) => {
    if (charId === selectedChar) return;
    setLoading(true);
    setSelectedChar(charId);
    const isFemale = charId === "char2";
    setGender(isFemale ? "female" : "male");
    setBaseCharacter(charId);
    const charObj = AVATAR_CHARACTERS.find((c) => c.id === charId);
    const viewer = modelViewerRef.current as any;
    if (viewer && charObj) {
      viewer.src = charObj.modelUrl;
    }
    if (charObj && onCharacterSelect) {
      onCharacterSelect(charId, charObj.modelUrl);
    }
  };

  const handleEquipAndSave = async () => {
    const isFemale = selectedChar === "char2";
    setBaseCharacter(selectedChar);
    setGender(isFemale ? "female" : "male");
    if (!qbUser?.uid) {
      toast.info("Character selected!");
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

  return (
    <div className={`flex flex-col w-full ${className}`}>
      {/* 3D Stage Section - styled like public/wardrobe.html */}
      <div
        className="relative w-full rounded-[20px] bg-gradient-to-b from-[#f8fafc] to-[#eef2f6] border border-black/[0.1] shadow-sm overflow-hidden flex items-center justify-center select-none"
        style={{ height: typeof height === "number" ? `${height}px` : height }}
      >
        {/* Element-level loading state overlay (starts hidden, shows on character switch) */}
        {loading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/70 backdrop-blur-xs transition-opacity pointer-events-none">
            <HtmlSpinner size="md" />
          </div>
        )}

        {/* Floating character info pill */}
        <div className="absolute top-3.5 left-3.5 z-10 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-black/[0.08] shadow-xs flex items-center gap-1.5 pointer-events-none">
          <User className="w-3.5 h-3.5 text-[#fa4616]" fill="currentColor" />
          <span className="text-[12px] font-extrabold text-[#17191d]">{activeCharData.name}</span>
        </div>

        {/* Floating Stage Tools */}
        {showControls && (
          <div className="absolute top-3.5 right-3.5 z-10 flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleToggleRotate}
              title="Toggle rotation"
              className={`qb-squircle press grid h-8 w-8 place-items-center text-xs transition-colors ${
                autoRotate ? "text-[#fa4616]" : "text-[#5f646d]"
              }`}
            >
              <RotateCw className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={handleToggleLighting}
              title="Toggle lighting"
              className="qb-squircle press grid h-8 w-8 place-items-center text-[#5f646d] text-xs transition-colors"
            >
              <Sun className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={handleResetCamera}
              title="Reset angle"
              className="qb-squircle press grid h-8 w-8 place-items-center text-[#5f646d] text-xs transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* model-viewer element rendered with identical attributes to wardrobe.html */}
        <model-viewer
          ref={modelViewerRef as any}
          id="avatar-viewer"
          src={activeCharData.modelUrl}
          alt={activeCharData.name}
          camera-controls=""
          auto-rotate=""
          rotation-per-second="25deg"
          camera-orbit="0deg 75deg 3m"
          field-of-view="30deg"
          shadow-intensity="1"
          exposure="1.1"
          interaction-prompt="none"
          loading="eager"
          style={{ width: "100%", height: "100%", outline: "none", display: "block" }}
        />
      </div>

      {/* Two-Avatar Selector Section */}
      {showSelector && (
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-[13px] font-extrabold text-[#17191d] tracking-tight">
              Select 3D Avatar
            </span>
            <span className="text-[11px] font-semibold text-[#697383]">2 options available</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {AVATAR_CHARACTERS.map((char) => {
              const isSelected = selectedChar === char.id;
              return (
                <button
                  key={char.id}
                  type="button"
                  onClick={() => handleSelect(char.id as AvatarCharacterId)}
                  className={`press qb-squircle relative p-3.5 text-left transition-all ${
                    isSelected
                      ? "ring-2 ring-[#fa4616] border-transparent bg-white shadow-md"
                      : "bg-[#f8fafc] hover:bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-xl grid place-items-center ${
                          isSelected ? "bg-[#fa4616] text-white" : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        <User className="w-3.5 h-3.5" fill="currentColor" />
                      </div>
                      <span className="text-[13.5px] font-bold text-[#17191d]">{char.name}</span>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-[#fa4616] text-white grid place-items-center shadow-xs">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-[11px] font-medium text-[#697383]">{char.description}</p>
                </button>
              );
            })}
          </div>

          {/* Glossy Equip / Save Button */}
          <button
            type="button"
            onClick={handleEquipAndSave}
            disabled={saving}
            className="qb-squircle press w-full h-[46px] mt-1 flex items-center justify-center gap-2 text-[14px] font-extrabold text-[#17191d] active:scale-[0.98] transition-transform"
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
      )}
    </div>
  );
}
