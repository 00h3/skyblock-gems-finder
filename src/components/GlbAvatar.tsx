/**
 * GlbAvatar — wrapper around Avatar3D that auto-connects to the live
 * avatar state stores (avatarColor, faceId, hairColor, skin, pants) so any call-site
 * always shows the real 3D GLB avatar with walk animations.
 */
import React from "react";
import { Avatar3D, type FocusZone } from "./Avatar3D";
import type { AvatarSnapshot } from "@/lib/avatar";
import { useEquippedShop, resolveTextures } from "@/lib/shop";
import {
  useFaceId,
  useAvatarColor,
  useEquippedItems,
  useEquippedPants,
  useEquippedSkin,
  useHairColor,
  useGender,
} from "@/lib/avatar";
import { AVATAR_GLB_URL } from "./Avatar3D";

export type { FocusZone };
const DEFAULT_POSITION: [number, number, number] = [0, 0, 0];

export function GlbAvatar({
  modelUrl = AVATAR_GLB_URL,
  height = 260,
  width,
  className,
  scale = 1,
  position = DEFAULT_POSITION,
  tint,
  autoRotate = true,
  interactive = true,
  style,
  focusZone = "full",
  playWalkAnimation = true,
  moveOnDrag = false,
  snapshot,
  gender: explicitGender,
  onClick,
  preferLocalShop = false,
}: {
  modelUrl?: string;
  height?: number | string;
  width?: number | string;
  className?: string;
  scale?: number;
  position?: [number, number, number];
  tint?: string;
  autoRotate?: boolean;
  interactive?: boolean;
  style?: React.CSSProperties;
  focusZone?: FocusZone;
  playWalkAnimation?: boolean;
  moveOnDrag?: boolean;
  snapshot?: Partial<AvatarSnapshot> | null;
  gender?: "male" | "female";
  /** Keep the local wardrobe immediately visible on the signed-in avatar page. */
  preferLocalShop?: boolean;
  walkSpeed?: number;
  dance?: string | null;
  onClick?: () => void;
}) {
  const localGender = useGender();
  const localFaceId = useFaceId();
  const localAvatarColor = useAvatarColor();
  const localHairColor = useHairColor();
  const localEquippedItemIds = useEquippedItems();
  const localEquippedPants = useEquippedPants();
  const localSkinId = useEquippedSkin();
  const equippedShop = useEquippedShop();
  const shopForModel =
    preferLocalShop || !snapshot
      ? equippedShop
      : (snapshot.shopEquipped ?? { shirt: null, pants: null, face: null });
  const textures = resolveTextures(shopForModel);
  const gender = explicitGender ?? (snapshot?.gender || localGender);
  const faceId = snapshot?.faceId ?? localFaceId;
  const avatarColor = snapshot?.color ?? localAvatarColor;
  const hairColor = snapshot?.hairColor ?? localHairColor;
  const equippedItemIds = snapshot?.equippedItemIds ?? localEquippedItemIds;
  const equippedPants = snapshot?.equippedPants ?? localEquippedPants;
  const skinId = snapshot?.skinId ?? localSkinId;

  return (
    <Avatar3D
      modelUrl={modelUrl}
      height={height}
      width={width}
      className={className}
      scale={scale}
      position={position}
      tint={tint || avatarColor}
      hairColor={hairColor}
      skinId={skinId}
      faceId={faceId}
      gender={gender}
      equippedItemIds={[...equippedItemIds]}
      equippedPants={equippedPants}
      style={style}
      autoRotate={autoRotate}
      interactive={interactive}
      focusZone={focusZone}
      shirtTexture={textures.shirtTexture}
      pantsTexture={textures.pantsTexture}
      sleevesTexture={textures.sleevesTexture}
      faceTexture={textures.faceTexture}
      playWalkAnimation={playWalkAnimation}
      moveOnDrag={moveOnDrag}
      onClick={onClick}
    />
  );
}
