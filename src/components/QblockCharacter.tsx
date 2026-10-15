import React from "react";
import { Avatar3D } from "./Avatar3D";
import { SANDBOX_AVATAR_MODEL } from "@/engine-sandbox/shared/avatar-model";
import type { FocusZone } from "./Avatar3D";
import { useEquippedShop, resolveTextures } from "@/lib/shop";
import {
  useAvatarColor,
  useHairColor,
  useEquippedSkin,
  useEquippedPants,
  useFaceId,
} from "@/lib/avatar";

export const QBLOCK_AVATAR = {
  model: SANDBOX_AVATAR_MODEL,
  cdnModel: SANDBOX_AVATAR_MODEL,
  background: "https://file.garden/alGOOylwpAfCa6qP/8D6BB229-28E8-4E84-8F31-799C1AA27428.png",
  shirt: "https://file.garden/alGOOylwpAfCa6qP/17C76B77-C43F-4828-A016-27B5F689E6AF.png",
  sleeves: "https://file.garden/alGOOylwpAfCa6qP/28390465-ED7C-4170-B8B2-630B34070949.png",
  pants: "https://file.garden/alGOOylwpAfCa6qP/419E9927-DDD9-4884-B010-A05543069774.png",
  shoes: "https://file.garden/alGOOylwpAfCa6qP/9335FF00-2848-4C98-B455-EA0DAD7FFC21.png",
  face: "https://file.garden/alGOOylwpAfCa6qP/1D669B89-1CDF-429A-A101-C72B474AC616.png",
  hands: "https://file.garden/alGOOylwpAfCa6qP/E4105FCF-D78D-4B6C-8777-491A4D6CFE00.png",
} as const;

export const QBLOCK_ASSET_PREVIEWS = [
  QBLOCK_AVATAR.shirt,
  QBLOCK_AVATAR.sleeves,
  QBLOCK_AVATAR.pants,
  QBLOCK_AVATAR.shoes,
  QBLOCK_AVATAR.face,
];

export function QblockCharacter({
  className = "",
  autoRotate = true,
  interactive = true,
  playWalkAnimation = true,
  focusZone = "full",
  height,
  width,
  style,
  tint,
  hairColor: explicitHairColor,
  skinId: explicitSkinId,
  faceId: explicitFaceId,
  equippedPants: explicitEquippedPants,
  onClick,
}: {
  className?: string;
  autoRotate?: boolean;
  interactive?: boolean;
  playWalkAnimation?: boolean;
  focusZone?: FocusZone;
  height?: number | string;
  width?: number | string;
  style?: React.CSSProperties;
  tint?: string;
  hairColor?: string;
  skinId?: string | null;
  faceId?: number | string;
  equippedPants?: string | null;
  onClick?: () => void;
}) {
  const avatarColor = useAvatarColor();
  const hairColor = useHairColor();
  const skinId = useEquippedSkin();
  const equippedPants = useEquippedPants();
  const faceId = useFaceId();
  const textures = resolveTextures(useEquippedShop());

  return (
    <Avatar3D
      className={className}
      autoRotate={autoRotate}
      interactive={interactive}
      playWalkAnimation={playWalkAnimation}
      focusZone={focusZone}
      shirtTexture={textures.shirtTexture}
      pantsTexture={textures.pantsTexture}
      sleevesTexture={textures.sleevesTexture}
      faceTexture={textures.faceTexture}
      height={height}
      width={width}
      style={style}
      tint={tint ?? avatarColor}
      hairColor={explicitHairColor ?? hairColor}
      skinId={explicitSkinId ?? skinId}
      faceId={explicitFaceId ?? faceId}
      equippedPants={explicitEquippedPants ?? equippedPants}
      onClick={onClick}
    />
  );
}
