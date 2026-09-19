import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { SKINS, AVATAR_COLORS } from "@/lib/avatar";
import { SANDBOX_AVATAR_FALLBACK_MODEL, SANDBOX_AVATAR_MODEL } from "@/engine/avatar-model";

export const LOCAL_AVATAR_GLB = SANDBOX_AVATAR_MODEL;
export const CDN_AVATAR_GLB = SANDBOX_AVATAR_FALLBACK_MODEL;
export const AVATAR_GLB_URL = LOCAL_AVATAR_GLB;

export type FocusZone = "full" | "head" | "torso" | "legs";

export interface Avatar3DProps {
  modelUrl?: string;
  scale?: number;
  autoRotate?: boolean;
  interactive?: boolean;
  position?: [number, number, number];
  focusZone?: FocusZone;
  playWalkAnimation?: boolean;
  moveOnDrag?: boolean;
  className?: string;
  style?: React.CSSProperties;
  height?: number | string;
  width?: number | string;
  onLoad?: () => void;
  tint?: string;
  hairColor?: string;
  skinId?: string | null;
  faceId?: number | string;
  gender?: "male" | "female";
  equippedItemIds?: string[];
  equippedPants?: string | null;
  showBandana?: boolean;
  onClick?: () => void;
  /** Wearable textures applied to the matching body parts. */
  shirtTexture?: string | null;
  pantsTexture?: string | null;
  sleevesTexture?: string | null;
  faceTexture?: string | null;
}

type CachedGltf = {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
};

const gltfLoader = new GLTFLoader();
const modelCache = new Map<string, Promise<CachedGltf>>();
const DEFAULT_POSITION: [number, number, number] = [0, 0, 0];
const THREE_COLOR_PATTERN = /^(?:#[\da-f]{3,8}|0x[\da-f]{6}|[a-z]+)$/i;

function isThreeColor(value: unknown): value is string {
  return typeof value === "string" && THREE_COLOR_PATTERN.test(value.trim());
}

/**
 * Load GLB with fallback sequence:
 * 1. Local QBLOCK final corrected GLB (instant, same-origin, 0 CORS issues)
 * 2. Remote CDN fallback if needed
 */
export function loadAvatarGltf(url: string = LOCAL_AVATAR_GLB): Promise<CachedGltf> {
  const cached = modelCache.get(url);
  if (cached) return cached;

  const promise = new Promise<CachedGltf>((resolve, reject) => {
    // Primary attempt
    gltfLoader.load(
      url,
      (gltf) => {
        resolve({
          scene: gltf.scene,
          animations: gltf.animations || [],
        });
      },
      undefined,
      (primaryErr) => {
        console.warn(
          `[Avatar3D] Primary load failed for ${url}, trying fallback CDN...`,
          primaryErr,
        );
        const fallbackUrl = url === LOCAL_AVATAR_GLB ? CDN_AVATAR_GLB : LOCAL_AVATAR_GLB;
        gltfLoader.load(
          fallbackUrl,
          (fallbackGltf) => {
            resolve({
              scene: fallbackGltf.scene,
              animations: fallbackGltf.animations || [],
            });
          },
          undefined,
          (fallbackErr) => {
            console.error(`[Avatar3D] All GLB load attempts failed`, fallbackErr);
            modelCache.delete(url);
            reject(fallbackErr);
          },
        );
      },
    );
  });

  modelCache.set(url, promise);
  return promise;
}

export function Avatar3D({
  gender = "male",
  className = "",
  style,
  height,
  width,
  onClick,
}: Avatar3DProps) {
  const iframeSrc =
    gender === "female"
      ? "https://maxwell.z3ki.dev/bot/avatar-3d-preview/"
      : "https://maxwell.z3ki.dev/bot/avatar-boy-preview/";

  const containerStyle: React.CSSProperties = {
    ...style,
    ...(height !== undefined ? { height } : {}),
    ...(width !== undefined ? { width } : {}),
  };

  return (
    <div
      onClick={onClick}
      className={`avatar-3d-root relative overflow-hidden select-none ${className}`}
      style={containerStyle}
    >
      <iframe
        src={iframeSrc}
        className="w-full h-full border-0 absolute inset-0 bg-transparent"
        style={{ pointerEvents: "auto", border: "none" }}
        allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
        sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
      />
    </div>
  );
}
