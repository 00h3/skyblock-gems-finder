import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { Avatar3D } from "./Avatar3D";
import wingAssetUrl from "../assets/imported/wing_379_1786180191578.glb?url";
import qblockObjSource from "../assets/imported/QBLOCK_Rig_v2_3_1786894540230.obj?raw";
import qblockShirtUrl from "../assets/imported/IMG_6909_1786894510114.png?url";
import qblockClothingUrl from "../assets/imported/IMG_6910_1786894510114.png?url";
import qblockShoesUrl from "../assets/imported/IMG_6911_1786894510114.png?url";
const qblockFaceUrl =
  "https://file.garden/alGOOylwpAfCa6qP/1D669B89-1CDF-429A-A101-C72B474AC616.png";
import qblockWingUrl from "../assets/imported/IMG_6929_1786894554591.png?url";
import { SKINS } from "@/lib/avatar";

type LoadedGltf = { scene: THREE.Group; animations: THREE.AnimationClip[] };
const accessoryLoader = new GLTFLoader();
const accessoryCache = new Map<string, Promise<LoadedGltf>>();

function loadAccessory(url: string): Promise<LoadedGltf> {
  const cached = accessoryCache.get(url);
  if (cached) return cached;
  const promise = accessoryLoader.loadAsync(url).then((gltf) => ({
    scene: gltf.scene,
    animations: gltf.animations,
  }));
  accessoryCache.set(url, promise);
  return promise;
}

function prepareAccessory(
  source: THREE.Group,
  target: THREE.Group,
  size: THREE.Vector3,
  position: THREE.Vector3,
  rotationY = 0,
): THREE.Group {
  const model = skeletonClone(source) as THREE.Group;
  const bounds = new THREE.Box3().setFromObject(model);
  const sourceSize = bounds.getSize(new THREE.Vector3());
  const scale = Math.min(
    size.x / Math.max(sourceSize.x, 0.001),
    size.y / Math.max(sourceSize.y, 0.001),
    size.z / Math.max(sourceSize.z, 0.001),
  );
  model.scale.setScalar(scale);
  const scaledBounds = new THREE.Box3().setFromObject(model);
  const center = scaledBounds.getCenter(new THREE.Vector3());
  model.position.copy(position).sub(center);
  model.rotation.y = rotationY;
  model.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    mesh.geometry.computeVertexNormals();
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mesh.material = materials.map((material) => {
      const cloned = material.clone();
      const standard = cloned as THREE.MeshStandardMaterial;
      if ("roughness" in standard)
        standard.roughness = Math.min(Number(standard.roughness ?? 0.6), 0.46);
      if ("metalness" in standard)
        standard.metalness = Math.max(Number(standard.metalness ?? 0), 0.08);
      return cloned;
    });
  });
  target.add(model);
  return model;
}

const qblockObjLoader = new OBJLoader();
const qblockTextureLoader = new THREE.TextureLoader();
const qblockTextureCache = new Map<string, THREE.Texture>();

function loadQblockTexture(url: string) {
  const cached = qblockTextureCache.get(url);
  if (cached) return cached;
  const texture = qblockTextureLoader.load(url);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestMipmapNearestFilter;
  texture.generateMipmaps = true;
  qblockTextureCache.set(url, texture);
  return texture;
}

function loadQblockFaceTexture(url: string) {
  const texture = loadQblockTexture(url).clone();
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.repeat.set(0.8, 0.8);
  texture.offset.set(0.1, 0.1);
  return texture;
}

function makeBlueHairTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext("2d")!;
  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#7bf1a8");
  gradient.addColorStop(0.35, "#2dd4bf");
  gradient.addColorStop(0.7, "#0d9488");
  gradient.addColorStop(1, "#0f766e");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestMipmapNearestFilter;
  return texture;
}

function addMaterialBands(
  mesh: THREE.Mesh,
  materials: THREE.Material[],
  getMaterialIndex: (centerY: number, minY: number, maxY: number) => number,
) {
  const positions = mesh.geometry.attributes.position;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < positions.count; i++) {
    minY = Math.min(minY, positions.getY(i));
    maxY = Math.max(maxY, positions.getY(i));
  }
  mesh.geometry.clearGroups();
  for (let i = 0; i < positions.count; i += 3) {
    const centerY = (positions.getY(i) + positions.getY(i + 1) + positions.getY(i + 2)) / 3;
    mesh.geometry.addGroup(i, 3, getMaterialIndex(centerY, minY, maxY));
  }
  mesh.material = materials;
}

function texturedMaterial(map: THREE.Texture, roughness = 0.72, metalness = 0.02) {
  return new THREE.MeshStandardMaterial({
    map,
    roughness,
    metalness,
  });
}

/**
 * The uploaded QBLOCK OBJ is the canonical avatar. The export is a T-pose
 * with separate named material meshes for each body part; the accessory,
 * camera, light, and scene-helper objects are intentionally not included.
 */
function buildUploadedQblockCharacter(scene: THREE.Scene, hairTint?: string): CharRefs {
  const parsed = qblockObjLoader.parse(qblockObjSource);
  const root = new THREE.Group();
  root.name = "uploaded-qblock-avatar";
  root.scale.setScalar(0.34);
  root.position.y = -0.45;
  scene.add(root);
  // Keep the OBJ's feet at the same baseline as the legacy rig while leaving
  // root.position free for the existing walk/dance/death animation code.
  const model = new THREE.Group();
  model.position.y = -1.32 / 0.34;
  root.add(model);

  const shirt = texturedMaterial(loadQblockTexture(qblockShirtUrl));
  const clothing = texturedMaterial(loadQblockTexture(qblockClothingUrl));
  const shoes = texturedMaterial(loadQblockTexture(qblockShoesUrl), 0.58, 0.08);
  const face = texturedMaterial(loadQblockFaceTexture(qblockFaceUrl));
  const skin = new THREE.MeshStandardMaterial({
    color: 0xf4a96a,
    roughness: 0.72,
    metalness: 0.02,
  });
  const hair = new THREE.MeshStandardMaterial({
    color: hairTint ?? 0x147de0,
    roughness: 0.68,
    metalness: 0.02,
  });

  const partMeshes = new Map<string, THREE.Mesh>();
  parsed.children.forEach((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const source = child as THREE.Mesh;
    const name = source.name;
    if (
      ![
        "material_ 8",
        "material_2",
        "material_1",
        "material_0",
        "material_ 7",
        "material_ 6",
        "material_ 5",
        "material_ 4",
      ].includes(name)
    )
      return;
    const mesh = source.clone();
    mesh.geometry = source.geometry.clone();
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    if (name === "material_2") {
      // The front (+Z) face keeps the supplied expression; the remaining
      // head faces get the requested blue gradient hair treatment.
      addMaterialBands(mesh, [hair, face], () => 0);
      const position = mesh.geometry.attributes.position;
      mesh.geometry.clearGroups();
      for (let i = 0; i < position.count; i += 3) {
        const a = new THREE.Vector3(position.getX(i), position.getY(i), position.getZ(i));
        const b = new THREE.Vector3(
          position.getX(i + 1),
          position.getY(i + 1),
          position.getZ(i + 1),
        );
        const c = new THREE.Vector3(
          position.getX(i + 2),
          position.getY(i + 2),
          position.getZ(i + 2),
        );
        const normal = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
        mesh.geometry.addGroup(i, 3, normal.z > 0.5 ? 1 : 0);
      }
      mesh.material = [hair, face];
    } else if (name === "material_1") {
      mesh.material = shirt;
    } else if (name === "material_ 6" || name === "material_ 7") {
      // The lower band of each arm is the hand area in the exported rig.
      addMaterialBands(mesh, [skin, clothing], (centerY, minY, maxY) =>
        centerY < minY + (maxY - minY) * 0.2 ? 0 : 1,
      );
    } else if (name === "material_ 8" || name === "material_0") {
      mesh.material = clothing;
    } else {
      mesh.material = shoes;
    }
    partMeshes.set(name, mesh);
  });

  const makePivot = (name: string, position: [number, number, number]) => {
    const pivot = new THREE.Group();
    pivot.name = name;
    pivot.position.set(...position);
    model.add(pivot);
    const mesh = partMeshes.get(name);
    if (mesh) {
      mesh.position.set(-position[0], -position[1], -position[2]);
      pivot.add(mesh);
    }
    return pivot;
  };

  const torsoGroup = makePivot("material_1", [0, 4.85, 0]);
  const headGroup = makePivot("material_2", [0, 7.36, 0]);
  const leftArm = makePivot("material_ 6", [-1.5, 4.86, 0]);
  const rightArm = makePivot("material_ 7", [1.5, 4.86, 0]);
  const leftLeg = makePivot("material_ 8", [-0.55, 1.7, 0]);
  const rightLeg = makePivot("material_0", [0.5, 1.7, 0]);

  const leftShoe = partMeshes.get("material_ 5");
  if (leftShoe) {
    leftShoe.position.set(0.55, 0.22, 0);
    leftLeg.add(leftShoe);
  }
  const rightShoe = partMeshes.get("material_ 4");
  if (rightShoe) {
    rightShoe.position.set(-0.5, 0.22, 0);
    rightLeg.add(rightShoe);
  }

  const backAccessoryGroup = new THREE.Group();
  backAccessoryGroup.name = "back-accessories";
  torsoGroup.add(backAccessoryGroup);
  const headAccessoryGroup = new THREE.Group();
  headAccessoryGroup.name = "head-accessories";
  headGroup.add(headAccessoryGroup);
  return {
    root,
    headGroup,
    torsoGroup,
    backAccessoryGroup,
    headAccessoryGroup,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
  };
}

// ─── Colour palettes ─────────────────────────────────────────────────────────
// Skin tones match reference QBlock character — warm peach-orange
const PAL_MALE = {
  skin: 0xf4a96a,
  skinDark: 0xdf8550,
  hair: 0x0276fe,
  hairShad: 0x0050cd,
  hairHi: 0x3a9eff,
  shirt: 0xf5f5f5,
  shirtTrim: 0xa5b1be,
  shorts: 0xf0f0f5,
  shortsTrim: 0x8a97a6,
  shoes: 0x181818,
  shoeAcc: 0xb5bfc9,
};
const PAL_FEMALE = {
  skin: 0xf4a96a,
  skinDark: 0xdf8550,
  hair: 0xf472b6,
  hairShad: 0xdb4ea0,
  hairHi: 0xff9ed8,
  shirt: 0xf5f5f5,
  shirtTrim: 0xa5b1be,
  shorts: 0xf0f0f5,
  shortsTrim: 0x8a97a6,
  shoes: 0x181818,
  shoeAcc: 0xb5bfc9,
};
type Pal = typeof PAL_MALE;

// ─── Texture helpers ─────────────────────────────────────────────────────────
function makeTex(
  w: number,
  h: number,
  fn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  fn(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  return t;
}

function hx(n: number) {
  return "#" + n.toString(16).padStart(6, "0");
}

function mat(color: number, roughness = 0.78, metalness = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}
function tmat(tex: THREE.CanvasTexture, roughness = 0.75) {
  return new THREE.MeshStandardMaterial({ map: tex, roughness });
}

function makeHairTex(p: Pal): THREE.CanvasTexture {
  return makeTex(128, 128, (ctx, W, H) => {
    ctx.fillStyle = hx(p.hair);
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.24;
    ctx.fillStyle = hx(p.hairHi);
    for (let x = -H; x < W + H; x += 18) {
      ctx.save();
      ctx.translate(x, 0);
      ctx.rotate(-0.18);
      ctx.fillRect(0, 0, 7, H);
      ctx.restore();
    }
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = hx(p.hairShad);
    for (let x = 8; x < W; x += 24) ctx.fillRect(x, H * 0.72, 8, H * 0.28);
    ctx.globalAlpha = 1;
  });
}

/** The canonical character texture from the pasted HTML reference. */
function makePastedHairTex(p?: Pal): THREE.CanvasTexture {
  return makeTex(128, 128, (ctx, W, H) => {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, p ? hx(p.hairShad) : "#3b82f6");
    grad.addColorStop(1, p ? hx(p.hairHi) : "#93c5fd");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#ffffff";
    for (let x = -H; x < W + H; x += 18) {
      ctx.save();
      ctx.translate(x, 0);
      ctx.rotate(-0.18);
      ctx.fillRect(0, 0, 7, H);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  });
}

function adjustPastedColor(hex: string, amount: number) {
  const value = hex.replace("#", "");
  const channels = [0, 2, 4].map((offset) =>
    Math.max(0, Math.min(255, parseInt(value.slice(offset, offset + 2), 16) + amount)),
  );
  return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

/** The uploaded model's 32×32 virtual pixel skin texture. */
function makePastedSkinTex(p: Pal): THREE.CanvasTexture {
  return makeTex(256, 256, (ctx, W, H) => {
    const px = W / 32;
    const gradient = ctx.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, adjustPastedColor(hx(p.skin), 20));
    gradient.addColorStop(1, adjustPastedColor(hx(p.skin), -30));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(0,0,0,0.035)";
    for (let i = 0; i < 92; i++) {
      const gridX = (i * 17) % 32;
      const gridY = (i * 29) % 32;
      ctx.fillRect(gridX * px, gridY * px, px, px);
    }
  });
}

/** The uploaded model's pixel-grid fabric texture, with seams and trim. */
function makePastedFabricTex(
  base: number,
  secondary: number,
  isPants = false,
): THREE.CanvasTexture {
  return makeTex(256, 256, (ctx, W, H) => {
    const px = W / 32;
    const gradient = ctx.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, adjustPastedColor(hx(base), 15));
    gradient.addColorStop(1, adjustPastedColor(hx(secondary), -10));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(0,0,0,0.16)";
    ctx.fillRect(0, 0, px, H);
    ctx.fillRect(W - px, 0, px, H);
    if (!isPants) {
      ctx.fillStyle = "rgba(0,0,0,0.15)";
      ctx.fillRect(14 * px, 0, 4 * px, 10 * px);
      ctx.fillStyle = adjustPastedColor(hx(base), 40);
      ctx.fillRect(12 * px, 0, 2 * px, 12 * px);
      ctx.fillRect(18 * px, 0, 2 * px, 12 * px);
      ctx.fillStyle = "#fbbf24";
      ctx.fillRect(15 * px, 12 * px, 2 * px, 2 * px);
      ctx.fillRect(15 * px, 18 * px, 2 * px, 2 * px);
      ctx.fillStyle = adjustPastedColor(hx(secondary), -30);
      ctx.fillRect(0, 28 * px, W, 4 * px);
    } else {
      ctx.fillStyle = "#1f2937";
      ctx.fillRect(0, 0, W, 4 * px);
      ctx.fillStyle = "#fbbf24";
      ctx.fillRect(13 * px, 0, 6 * px, 5 * px);
      ctx.fillStyle = "#1f2937";
      ctx.fillRect(14 * px, px, 4 * px, 3 * px);
      ctx.fillStyle = "rgba(0,0,0,0.15)";
      ctx.fillRect(15 * px, 4 * px, 2 * px, 28 * px);
      ctx.fillRect(10 * px, 16 * px, 12 * px, 6 * px);
    }
  });
}

/** One clean HD face pass based on the uploaded 32×32 Hytale-style model. */
function makePastedFaceTex(
  faceId = 0,
  skinTone = "#ffcc99",
  hairTone = "#3b82f6",
): THREE.CanvasTexture {
  return makeTex(256, 256, (ctx, W, H) => {
    const px = W / 32;
    const vRect = (gridX: number, gridY: number, gridW: number, gridH: number, color: string) => {
      ctx.fillStyle = color;
      ctx.fillRect(gridX * px, gridY * px, gridW * px, gridH * px);
    };
    const gradient = ctx.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, adjustPastedColor(skinTone, 20));
    gradient.addColorStop(1, adjustPastedColor(skinTone, -30));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);
    vRect(2, 21, 6, 3, "rgba(255,100,100,0.30)");
    vRect(24, 21, 6, 3, "rgba(255,100,100,0.30)");
    vRect(14, 21, 4, 3, "rgba(0,0,0,0.08)");

    const iris = [0x3b82f6, 0x22c55e, 0xa855f7, 0xf59e0b, 0xef4444, 0x06b6d4][faceId % 6];
    const drawHDEye = (gridX: number, isRight: boolean, eyeColor = hx(iris)) => {
      vRect(gridX, 10, 10, 10, "#ffffff");
      vRect(gridX, 10, 10, 2, "#cbd5e1");
      const irisX = isRight ? gridX + 1 : gridX + 3;
      const irisGradient = ctx.createLinearGradient(0, 10 * px, 0, 20 * px);
      irisGradient.addColorStop(0, adjustPastedColor(eyeColor, 50));
      irisGradient.addColorStop(1, adjustPastedColor(eyeColor, -50));
      ctx.fillStyle = irisGradient;
      ctx.fillRect(irisX * px, 10 * px, 6 * px, 10 * px);
      vRect(irisX + 1, 13, 4, 5, "#0f172a");
      vRect(irisX + 1, 11, 2, 3, "#ffffff");
      vRect(irisX + 4, 17, 1, 2, "rgba(255,255,255,0.8)");
      vRect(gridX - 1, 8, 12, 2, "#1e293b");
      vRect(isRight ? gridX + 9 : gridX - 1, 10, 2, 5, "#1e293b");
      vRect(gridX, 5, 10, 2, adjustPastedColor(hairTone, -40));
      vRect(isRight ? gridX - 1 : gridX + 9, 6, 2, 2, adjustPastedColor(hairTone, -40));
    };
    const drawClosedEye = (gridX: number, happy = false) => {
      ctx.strokeStyle = "#263044";
      ctx.lineWidth = happy ? 7 : 5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo((gridX - 1) * px, 16 * px);
      ctx.quadraticCurveTo((gridX + 5) * px, (happy ? 12 : 18) * px, (gridX + 11) * px, 16 * px);
      ctx.stroke();
    };
    const drawMouth = (kind: "neutral" | "smile" | "frown" | "open" | "grin") => {
      ctx.strokeStyle = "#881337";
      ctx.fillStyle = "#881337";
      ctx.lineCap = "round";
      ctx.lineWidth = kind === "grin" ? 7 : 5;
      if (kind === "open") {
        ctx.beginPath();
        ctx.ellipse(16 * px, 27 * px, 3.2 * px, 2.2 * px, 0, 0, Math.PI * 2);
        ctx.fill();
        vRect(14, 26, 2, 1, "#ffffff");
        vRect(15, 28, 3, 1, "#f87171");
        return;
      }
      ctx.beginPath();
      ctx.moveTo(12.5 * px, 23 * px);
      ctx.quadraticCurveTo(
        16 * px,
        (kind === "frown" ? 20.5 : kind === "neutral" ? 23.5 : 26) * px,
        19.5 * px,
        23 * px,
      );
      ctx.stroke();
    };
    const drawBlush = () => {
      vRect(2, 21, 6, 3, "rgba(255,100,100,0.34)");
      vRect(24, 21, 6, 3, "rgba(255,100,100,0.34)");
    };
    const drawStar = (gridX: number) => {
      ctx.fillStyle = "#f5b82e";
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const angle = -Math.PI / 2 + (i * Math.PI) / 5;
        const radius = (i % 2 === 0 ? 3.5 : 1.5) * px;
        const pointX = gridX * px + Math.cos(angle) * radius;
        const pointY = 15 * px + Math.sin(angle) * radius;
        i === 0 ? ctx.moveTo(pointX, pointY) : ctx.lineTo(pointX, pointY);
      }
      ctx.closePath();
      ctx.fill();
      vRect(gridX - 1, 13, 1, 1, "#fff8c5");
    };
    const drawHeart = (gridX: number) => {
      ctx.fillStyle = "#ef477f";
      ctx.beginPath();
      ctx.moveTo(gridX * px, 18 * px);
      ctx.bezierCurveTo((gridX - 4) * px, 15 * px, (gridX - 3) * px, 12 * px, gridX * px, 14 * px);
      ctx.bezierCurveTo((gridX + 3) * px, 12 * px, (gridX + 4) * px, 15 * px, gridX * px, 18 * px);
      ctx.fill();
    };
    const coverEyes = () => {
      ctx.fillStyle = skinTone;
      ctx.globalAlpha = 0.98;
      vRect(2, 10, 12, 8, skinTone);
      vRect(18, 10, 12, 8, skinTone);
      ctx.globalAlpha = 1;
    };

    switch (faceId % 18) {
      case 1:
        drawHDEye(3, false, "#28658f");
        drawHDEye(19, true, "#28658f");
        drawBlush();
        drawMouth("grin");
        break;
      case 2:
        drawClosedEye(3);
        drawClosedEye(19);
        drawMouth("neutral");
        break;
      case 3:
        vRect(2, 10, 12, 7, "#1e293b");
        vRect(18, 10, 12, 7, "#1e293b");
        vRect(3, 11, 9, 2, "rgba(255,255,255,0.16)");
        vRect(19, 11, 9, 2, "rgba(255,255,255,0.16)");
        vRect(14, 13, 4, 1, "#1e293b");
        drawMouth("neutral");
        break;
      case 4:
        drawHDEye(3, false, "#7f1d1d");
        drawHDEye(19, true, "#7f1d1d");
        drawMouth("frown");
        break;
      case 5:
        drawClosedEye(3, true);
        drawClosedEye(19, true);
        drawBlush();
        drawMouth("smile");
        break;
      case 6:
        drawHDEye(3, false);
        drawClosedEye(19);
        drawBlush();
        drawMouth("smile");
        break;
      case 7:
        drawStar(8);
        drawStar(24);
        drawBlush();
        drawMouth("open");
        break;
      case 8:
        for (const centerX of [9, 23]) {
          ctx.strokeStyle = "#4a2c24";
          ctx.lineWidth = 5;
          ctx.beginPath();
          for (let i = 0; i <= 24; i++) {
            const angle = (i / 24) * Math.PI * 4.5;
            const radius = 3.4 * (1 - i / 28) * px;
            const pointX = centerX * px + Math.cos(angle) * radius;
            const pointY = 15 * px + Math.sin(angle) * radius;
            i === 0 ? ctx.moveTo(pointX, pointY) : ctx.lineTo(pointX, pointY);
          }
          ctx.stroke();
        }
        drawMouth("neutral");
        break;
      case 9:
        vRect(5, 12, 7, 4, "#f8fbff");
        vRect(21, 12, 7, 4, "#f8fbff");
        vRect(10, 13, 2, 4, "#263c65");
        vRect(22, 13, 2, 4, "#263c65");
        drawMouth("smile");
        break;
      case 10:
        vRect(3, 10, 9, 7, "#f8fbff");
        vRect(20, 10, 9, 7, "#f8fbff");
        ctx.strokeStyle = "#17131b";
        ctx.lineWidth = 5;
        ctx.strokeRect(3 * px, 10 * px, 9 * px, 7 * px);
        ctx.strokeRect(20 * px, 10 * px, 9 * px, 7 * px);
        vRect(7, 12, 2, 4, "#13101a");
        vRect(24, 12, 2, 4, "#13101a");
        drawMouth("open");
        break;
      case 11:
        drawHDEye(3, false, "#316bd0");
        drawHDEye(19, true, "#316bd0");
        vRect(7, 19, 2, 4, "#316bd0");
        vRect(23, 19, 2, 4, "#316bd0");
        drawMouth("frown");
        break;
      case 12:
        vRect(3, 10, 8, 5, "#f8fbff");
        vRect(21, 10, 8, 5, "#f8fbff");
        vRect(7, 12, 2, 3, "#2b65d9");
        vRect(24, 12, 2, 3, "#2b65d9");
        drawMouth("grin");
        break;
      case 13:
        drawHeart(9);
        drawHeart(23);
        drawBlush();
        drawMouth("smile");
        break;
      case 14:
        // focused — clean brows, narrowed eyes, neutral mouth
        drawHDEye(3, false, "#334155");
        drawHDEye(19, true, "#334155");
        vRect(3, 8, 10, 2, "#263044");
        vRect(19, 8, 10, 2, "#263044");
        drawMouth("neutral");
        break;
      case 15:
        // confident — asymmetric side-eye and a small smirk
        drawHDEye(3, false, "#7c3aed");
        drawHDEye(19, true, "#7c3aed");
        vRect(4, 8, 8, 2, "#263044");
        vRect(20, 7, 9, 2, "#263044");
        drawMouth("smile");
        break;
      case 16:
        // laughing — closed happy eyes with a bright open smile
        drawClosedEye(3, true);
        drawClosedEye(19, true);
        drawBlush();
        drawMouth("open");
        break;
      case 17:
        // unimpressed — flat lids and a firm straight mouth
        coverEyes();
        vRect(4, 13, 9, 2, "#263044");
        vRect(19, 13, 9, 2, "#263044");
        vRect(13, 23, 6, 1, "#881337");
        break;
      default:
        drawHDEye(3, false);
        drawHDEye(19, true);
        drawMouth("neutral");
        break;
    }
  });
}

function makePastedShirtTex(p: Pal, topId?: string, skinId?: string | null): THREE.CanvasTexture {
  return makeTex(256, 256, (ctx, W, H) => {
    const skinDef = skinId ? SKINS.find((skin) => skin.id === skinId) : undefined;
    ctx.fillStyle = hx(p.shirt);
    ctx.fillRect(0, 0, W, H);
    if (skinId === "skin-6666-doraemon") {
      ctx.fillStyle = "#1878c9";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#f7fbff";
      ctx.fillRect(W * 0.22, H * 0.5, W * 0.56, H * 0.3);
      ctx.fillStyle = "#ef3340";
      ctx.fillRect(W * 0.42, 0, W * 0.16, 12);
      return;
    }
    if (skinDef && skinId) {
      const accent = hx(Number.parseInt(skinDef.accent.replace("#", ""), 16));
      ctx.fillStyle = accent;
      if (skinDef.pattern === "racer") {
        ctx.save();
        ctx.translate(W * 0.5, H * 0.5);
        ctx.rotate(-0.18);
        ctx.fillRect(-W * 0.08, -H * 0.6, W * 0.16, H * 1.2);
        ctx.fillRect(W * 0.18, -H * 0.6, W * 0.045, H * 1.2);
        ctx.restore();
      } else if (skinDef.pattern === "camo") {
        ctx.globalAlpha = 0.46;
        for (let i = 0; i < 14; i++) {
          ctx.fillRect((i * 53) % W, (i * 37) % H, W * 0.14, H * 0.11);
        }
        ctx.globalAlpha = 1;
      } else if (skinDef.pattern === "floral") {
        for (let i = 0; i < 9; i++) {
          const px = (i * 61) % W,
            py = H * 0.2 + ((i * 43) % (H * 0.6));
          ctx.beginPath();
          ctx.arc(px, py, W * 0.035, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#fff7ed";
          ctx.beginPath();
          ctx.arc(px + W * 0.03, py - H * 0.02, W * 0.018, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = accent;
        }
      } else if (skinDef.pattern === "aqua") {
        for (let y = H * 0.18; y < H * 0.92; y += H * 0.18) {
          ctx.fillRect(0, y, W, 5);
        }
      } else {
        ctx.globalAlpha = 0.2;
        for (let x = -H; x < W + H; x += 28) {
          ctx.save();
          ctx.translate(x, 0);
          ctx.rotate(-0.22);
          ctx.fillRect(0, 0, 8, H);
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = "rgba(255,255,255,0.30)";
      ctx.fillRect(0, 0, W, 8);
      return;
    }
    if (topId === "top-dark-hoodie" || topId === "top-sakura-hoodie") {
      ctx.fillStyle = hx(p.shirt);
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = hx(p.shirtTrim);
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(W * 0.34, 0);
      ctx.lineTo(W * 0.43, H * 0.18);
      ctx.moveTo(W * 0.66, 0);
      ctx.lineTo(W * 0.57, H * 0.18);
      ctx.stroke();
    } else if (topId === "top-striped-polo" || topId === "top-sport-jersey") {
      ctx.fillStyle = hx(p.shirtTrim);
      for (let y = H * 0.18; y < H * 0.82; y += H * 0.15) ctx.fillRect(0, y, W, 8);
    } else if (topId === "top-galaxy-tee" || topId === "top-neon-grid") {
      ctx.fillStyle = "#ffffff";
      for (let i = 0; i < 18; i++) ctx.fillRect((i * 47) % W, (i * 71) % H, 4, 4);
    }
    // The reference's signature front print.
    ctx.fillStyle = "#0f172a";
    ctx.font = '900 34px "Segoe UI", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("QBLOCK", W / 2, H / 2 - 8);
    ctx.fillStyle = "#f1f5f9";
    ctx.fillRect(0, 0, W, 6);
    ctx.fillRect(W / 2 - 24, 0, 48, 16);
  });
}

function buildPastedHair(head: THREE.Mesh, p?: Pal) {
  const hair = tmat(makePastedHairTex(p), 0.4);
  const add = (
    size: [number, number, number],
    position: [number, number, number],
    material = hair,
  ) => {
    const piece = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    piece.position.set(...position);
    piece.castShadow = true;
    head.add(piece);
  };
  // Layered long-hair silhouette from the uploaded model: top volume,
  // side volumes, back slab, and a short front bang.
  add([1.3, 0.3, 1.3], [0, 0.65, 0]);
  add([0.2, 1.1, 1.1], [0.65, -0.05, -0.1]);
  add([0.2, 1.1, 1.1], [-0.65, -0.05, -0.1]);
  add([1.3, 1.4, 0.2], [0, -0.2, -0.65]);
  add([1.3, 0.4, 0.2], [0, 0.5, 0.65]);
}

// BoxGeometry face-material order: [+X, -X, +Y, -Y, +Z(front), -Z(back)]
function faceMats(
  sides: number,
  top: number,
  bot: number,
  front: THREE.Material,
  back: THREE.Material,
): THREE.Material[] {
  const s = mat(sides);
  return [s, s, mat(top), mat(bot), front, back];
}

// ─── Face expression overlay helpers ─────────────────────────────────────────

/** Polyfill for roundRect — draws a filled rounded rectangle without requiring ctx.roundRect */
function fillRRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
  ctx.fill();
}
/** Stroke a rounded rectangle path (no fill). */
function strokeRRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
  ctx.stroke();
}

/** Draw expression overlays on top of a base face canvas. */
function applyFaceExpression(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  faceId: number,
  skinTone = "#f4a96a",
) {
  const coverEyes = () => {
    ctx.fillStyle = skinTone;
    ctx.globalAlpha = 0.98;
    ctx.fillRect(W * 0.12, H * 0.4, W * 0.34, H * 0.2);
    ctx.fillRect(W * 0.54, H * 0.4, W * 0.34, H * 0.2);
    ctx.globalAlpha = 1;
  };
  const spiral = (cx: number, cy: number, radius: number, color: string) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(5, W * 0.012);
    ctx.lineCap = "round";
    ctx.beginPath();
    for (let i = 0; i <= 30; i++) {
      const a = (i / 30) * Math.PI * 4.5;
      const r = radius * (1 - i / 34);
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  };
  switch (faceId) {
    case 0: // neutral — no overlay needed
      break;
    case 1: // big smile + blush
      ctx.fillStyle = "#f97316";
      ctx.globalAlpha = 0.22;
      ctx.beginPath();
      ctx.ellipse(W * 0.16, H * 0.38, W * 0.1, H * 0.06, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(W * 0.84, H * 0.38, W * 0.1, H * 0.06, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      // widen smile
      ctx.strokeStyle = "#c0624a";
      ctx.lineWidth = 7;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(W * 0.3, H * 0.22);
      ctx.bezierCurveTo(W * 0.4, H * 0.16, W * 0.6, H * 0.16, W * 0.7, H * 0.22);
      ctx.stroke();
      break;
    case 2: // sleepy — half-closed eyes overlay
      ctx.fillStyle = skinTone;
      ctx.globalAlpha = 0.88;
      ctx.beginPath();
      ctx.ellipse(W * 0.28, H * 0.49 - H * 0.04, W * 0.135, H * 0.052, 0, Math.PI, 0);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(W * 0.72, H * 0.49 - H * 0.04, W * 0.135, H * 0.052, 0, Math.PI, 0);
      ctx.fill();
      ctx.globalAlpha = 1;
      // zzz
      ctx.fillStyle = "#94a3b8";
      ctx.font = `bold ${W * 0.06}px sans-serif`;
      ctx.fillText("z z", W * 0.65, H * 0.6);
      break;
    case 3: // cool sunglasses
      ctx.fillStyle = "#1e293b";
      fillRRect(ctx, W * 0.13, H * 0.43, W * 0.3, H * 0.13, W * 0.04);
      fillRRect(ctx, W * 0.57, H * 0.43, W * 0.3, H * 0.13, W * 0.04);
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = W * 0.022;
      ctx.beginPath();
      ctx.moveTo(W * 0.43, H * 0.495);
      ctx.lineTo(W * 0.57, H * 0.495);
      ctx.stroke();
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = W * 0.018;
      ctx.beginPath();
      ctx.moveTo(W * 0.0, H * 0.46);
      ctx.lineTo(W * 0.13, H * 0.46);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(W * 0.87, H * 0.46);
      ctx.lineTo(W * 1.0, H * 0.46);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.14)";
      fillRRect(ctx, W * 0.13, H * 0.43, W * 0.3, H * 0.055, W * 0.04);
      fillRRect(ctx, W * 0.57, H * 0.43, W * 0.3, H * 0.055, W * 0.04);
      break;
    case 4: // angry — furrowed brows + frown
      ctx.fillStyle = hx(0xdf8550);
      ctx.globalAlpha = 0.9;
      // left angry brow
      ctx.save();
      ctx.translate(W * 0.13, H * 0.605);
      ctx.rotate(0.25);
      ctx.fillRect(0, 0, W * 0.24, 12);
      ctx.restore();
      // right angry brow
      ctx.save();
      ctx.translate(W * 0.51, H * 0.59);
      ctx.rotate(-0.25);
      ctx.fillRect(0, 0, W * 0.24, 12);
      ctx.restore();
      ctx.globalAlpha = 1;
      // frown
      ctx.strokeStyle = "#c0624a";
      ctx.lineWidth = 6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(W * 0.35, H * 0.18);
      ctx.bezierCurveTo(W * 0.42, H * 0.22, W * 0.58, H * 0.22, W * 0.65, H * 0.18);
      ctx.stroke();
      // red rage marks
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 4;
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.moveTo(W * 0.06, H * 0.68);
      ctx.lineTo(W * 0.14, H * 0.6);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(W * 0.94, H * 0.68);
      ctx.lineTo(W * 0.86, H * 0.6);
      ctx.stroke();
      ctx.globalAlpha = 1;
      break;
    case 5: // uwu — happy curved eyes + blush
      ctx.fillStyle = "#f97316";
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      ctx.ellipse(W * 0.16, H * 0.4, W * 0.12, H * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(W * 0.84, H * 0.4, W * 0.12, H * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      // curved ^v^ eyes
      ctx.fillStyle = hx(0xf4a96a);
      ctx.globalAlpha = 0.92;
      ctx.beginPath();
      ctx.ellipse(W * 0.28, H * 0.505, W * 0.125, H * 0.055, 0, Math.PI, 0);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(W * 0.72, H * 0.505, W * 0.125, H * 0.055, 0, Math.PI, 0);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "#1c1917";
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(W * 0.155, H * 0.5);
      ctx.bezierCurveTo(W * 0.21, H * 0.46, W * 0.29, H * 0.46, W * 0.345, H * 0.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(W * 0.655, H * 0.5);
      ctx.bezierCurveTo(W * 0.71, H * 0.46, W * 0.79, H * 0.46, W * 0.845, H * 0.5);
      ctx.stroke();
      break;
    case 6: // wink — right eye wink
      ctx.fillStyle = hx(0xf4a96a);
      ctx.globalAlpha = 0.92;
      ctx.beginPath();
      ctx.ellipse(W * 0.72, H * 0.505, W * 0.135, H * 0.06, 0, Math.PI, 0);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "#1c1917";
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(W * 0.6, H * 0.5);
      ctx.bezierCurveTo(W * 0.66, H * 0.56, W * 0.79, H * 0.56, W * 0.845, H * 0.5);
      ctx.stroke();
      // blush right only
      ctx.fillStyle = "#f97316";
      ctx.globalAlpha = 0.2;
      ctx.beginPath();
      ctx.ellipse(W * 0.84, H * 0.4, W * 0.1, H * 0.055, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      break;
    case 7: // star eyes
      ctx.fillStyle = hx(0xf4a96a);
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.ellipse(W * 0.28, H * 0.49, W * 0.14, H * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(W * 0.72, H * 0.49, W * 0.14, H * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      // draw stars on eyes
      const drawStar = (cx: number, cy: number) => {
        ctx.fillStyle = "#fde047";
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const angle = (i * Math.PI) / 5 - Math.PI / 2;
          const r = i % 2 === 0 ? W * 0.065 : W * 0.028;
          const x = cx + r * Math.cos(angle);
          const y = cy + r * Math.sin(angle);
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
      };
      drawStar(W * 0.28, H * 0.49);
      drawStar(W * 0.72, H * 0.49);
      // open mouth
      ctx.fillStyle = "#c0624a";
      ctx.beginPath();
      ctx.ellipse(W * 0.5, H * 0.18, W * 0.12, H * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e87050";
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.ellipse(W * 0.5, H * 0.19, W * 0.07, H * 0.04, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      break;
    case 8: // dizzy spiral face from the Dev Blue Protocol reference
      coverEyes();
      spiral(W * 0.29, H * 0.49, W * 0.105, "#4a2c24");
      spiral(W * 0.71, H * 0.49, W * 0.105, "#4a2c24");
      ctx.fillStyle = "#4a2c24";
      ctx.fillRect(W * 0.44, H * 0.58, W * 0.12, H * 0.025);
      ctx.fillRect(W * 0.38, H * 0.6, W * 0.24, H * 0.025);
      ctx.fillRect(W * 0.31, H * 0.58, W * 0.07, H * 0.025);
      ctx.fillRect(W * 0.62, H * 0.58, W * 0.07, H * 0.025);
      break;
    case 9: // smug side-eye
      coverEyes();
      ctx.fillStyle = "#f8fbff";
      ctx.fillRect(W * 0.17, H * 0.45, W * 0.22, H * 0.11);
      ctx.fillRect(W * 0.61, H * 0.45, W * 0.22, H * 0.11);
      ctx.fillStyle = "#263c65";
      ctx.fillRect(W * 0.31, H * 0.47, W * 0.045, H * 0.09);
      ctx.fillRect(W * 0.65, H * 0.47, W * 0.045, H * 0.09);
      ctx.fillStyle = "#3b241c";
      ctx.fillRect(W * 0.15, H * 0.38, W * 0.25, H * 0.025);
      ctx.fillRect(W * 0.6, H * 0.36, W * 0.25, H * 0.025);
      ctx.strokeStyle = "#9d4f42";
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(W * 0.38, H * 0.23);
      ctx.quadraticCurveTo(W * 0.54, H * 0.16, W * 0.68, H * 0.21);
      ctx.stroke();
      break;
    case 10: // shocked square eyes and open mouth
      coverEyes();
      ctx.fillStyle = "#f8fbff";
      ctx.fillRect(W * 0.16, H * 0.42, W * 0.26, H * 0.18);
      ctx.fillRect(W * 0.58, H * 0.42, W * 0.26, H * 0.18);
      ctx.strokeStyle = "#17131b";
      ctx.lineWidth = 7;
      ctx.strokeRect(W * 0.16, H * 0.42, W * 0.26, H * 0.18);
      ctx.strokeRect(W * 0.58, H * 0.42, W * 0.26, H * 0.18);
      ctx.fillStyle = "#13101a";
      ctx.fillRect(W * 0.265, H * 0.47, W * 0.055, H * 0.09);
      ctx.fillRect(W * 0.685, H * 0.47, W * 0.055, H * 0.09);
      ctx.fillStyle = "#3d1e28";
      ctx.beginPath();
      ctx.ellipse(W * 0.5, H * 0.25, W * 0.11, H * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 11: // crying face
      coverEyes();
      ctx.fillStyle = "#f8fbff";
      ctx.fillRect(W * 0.16, H * 0.44, W * 0.26, H * 0.13);
      ctx.fillRect(W * 0.58, H * 0.44, W * 0.26, H * 0.13);
      ctx.fillStyle = "#316bd0";
      ctx.fillRect(W * 0.27, H * 0.48, W * 0.05, H * 0.07);
      ctx.fillRect(W * 0.69, H * 0.48, W * 0.05, H * 0.07);
      ctx.beginPath();
      ctx.moveTo(W * 0.29, H * 0.57);
      ctx.lineTo(W * 0.25, H * 0.72);
      ctx.lineTo(W * 0.33, H * 0.65);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(W * 0.71, H * 0.57);
      ctx.lineTo(W * 0.67, H * 0.72);
      ctx.lineTo(W * 0.75, H * 0.65);
      ctx.fill();
      ctx.strokeStyle = "#9d4f42";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(W * 0.37, H * 0.23);
      ctx.quadraticCurveTo(W * 0.5, H * 0.17, W * 0.63, H * 0.23);
      ctx.stroke();
      break;
    case 12: // clean pixel smile
      coverEyes();
      ctx.fillStyle = "#f8fbff";
      ctx.fillRect(W * 0.16, H * 0.43, W * 0.25, H * 0.13);
      ctx.fillRect(W * 0.59, H * 0.43, W * 0.25, H * 0.13);
      ctx.fillStyle = "#2b65d9";
      ctx.fillRect(W * 0.25, H * 0.47, W * 0.07, H * 0.07);
      ctx.fillRect(W * 0.68, H * 0.47, W * 0.07, H * 0.07);
      ctx.fillStyle = "#8c3c36";
      ctx.fillRect(W * 0.34, H * 0.23, W * 0.32, H * 0.035);
      ctx.fillRect(W * 0.39, H * 0.255, W * 0.22, H * 0.035);
      break;
    case 13: // heart eyes
      coverEyes();
      const heart = (cx: number, cy: number) => {
        ctx.fillStyle = "#ef477f";
        ctx.beginPath();
        ctx.moveTo(cx, cy + H * 0.07);
        ctx.bezierCurveTo(
          cx - W * 0.13,
          cy - H * 0.01,
          cx - W * 0.1,
          cy - H * 0.12,
          cx,
          cy - H * 0.045,
        );
        ctx.bezierCurveTo(
          cx + W * 0.1,
          cy - H * 0.12,
          cx + W * 0.13,
          cy - H * 0.01,
          cx,
          cy + H * 0.07,
        );
        ctx.fill();
      };
      heart(W * 0.29, H * 0.49);
      heart(W * 0.71, H * 0.49);
      ctx.strokeStyle = "#9d4f42";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(W * 0.36, H * 0.24);
      ctx.quadraticCurveTo(W * 0.5, H * 0.31, W * 0.64, H * 0.24);
      ctx.stroke();
      break;
    case 14: // focused — narrowed eyes and firm brows
      coverEyes();
      ctx.fillStyle = "#f8fbff";
      ctx.fillRect(W * 0.16, H * 0.47, W * 0.25, H * 0.08);
      ctx.fillRect(W * 0.59, H * 0.47, W * 0.25, H * 0.08);
      ctx.fillStyle = "#334155";
      ctx.fillRect(W * 0.17, H * 0.39, W * 0.23, H * 0.025);
      ctx.fillRect(W * 0.6, H * 0.39, W * 0.23, H * 0.025);
      ctx.fillStyle = "#7f1d1d";
      ctx.fillRect(W * 0.42, H * 0.25, W * 0.16, H * 0.025);
      break;
    case 15: // confident — asymmetric brows and a small smirk
      coverEyes();
      ctx.fillStyle = "#f8fbff";
      ctx.fillRect(W * 0.16, H * 0.44, W * 0.25, H * 0.13);
      ctx.fillRect(W * 0.59, H * 0.44, W * 0.25, H * 0.13);
      ctx.fillStyle = "#7c3aed";
      ctx.fillRect(W * 0.3, H * 0.47, W * 0.06, H * 0.08);
      ctx.fillRect(W * 0.68, H * 0.47, W * 0.06, H * 0.08);
      ctx.fillStyle = "#263044";
      ctx.fillRect(W * 0.16, H * 0.37, W * 0.2, H * 0.025);
      ctx.fillRect(W * 0.64, H * 0.34, W * 0.2, H * 0.025);
      ctx.strokeStyle = "#9d4f42";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(W * 0.43, H * 0.24);
      ctx.quadraticCurveTo(W * 0.56, H * 0.29, W * 0.68, H * 0.22);
      ctx.stroke();
      break;
    case 16: // laughing — happy eyes and an open smile
      coverEyes();
      ctx.strokeStyle = "#263044";
      ctx.lineWidth = 8;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(W * 0.17, H * 0.51);
      ctx.quadraticCurveTo(W * 0.28, H * 0.42, W * 0.39, H * 0.51);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(W * 0.61, H * 0.51);
      ctx.quadraticCurveTo(W * 0.72, H * 0.42, W * 0.83, H * 0.51);
      ctx.stroke();
      ctx.fillStyle = "#f97316";
      ctx.globalAlpha = 0.22;
      ctx.beginPath();
      ctx.ellipse(W * 0.16, H * 0.4, W * 0.1, H * 0.055, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(W * 0.84, H * 0.4, W * 0.1, H * 0.055, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#7f1d1d";
      ctx.beginPath();
      ctx.ellipse(W * 0.5, H * 0.24, W * 0.12, H * 0.075, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 17: // unimpressed — flat lids and a straight mouth
      coverEyes();
      ctx.fillStyle = "#f8fbff";
      ctx.fillRect(W * 0.16, H * 0.47, W * 0.25, H * 0.08);
      ctx.fillRect(W * 0.59, H * 0.47, W * 0.25, H * 0.08);
      ctx.fillStyle = "#263044";
      ctx.fillRect(W * 0.16, H * 0.42, W * 0.25, H * 0.025);
      ctx.fillRect(W * 0.59, H * 0.42, W * 0.25, H * 0.025);
      ctx.fillStyle = "#881337";
      ctx.fillRect(W * 0.38, H * 0.25, W * 0.24, H * 0.025);
      break;
  }
}

// ─── Face textures ────────────────────────────────────────────────────────────

/** V3 Female face — large anime eyes, rosy cheeks, glossy lips. */
function makeFemaleFaceTex(p: Pal, faceId = 0): THREE.CanvasTexture {
  return makeTex(512, 512, (ctx, W, H) => {
    // Will apply expression overlay at end
    // ── Skin base with subtle gradient shading ─────────────────────────
    const skinGrad = ctx.createRadialGradient(W / 2, H * 0.5, 0, W / 2, H * 0.5, W * 0.6);
    skinGrad.addColorStop(0, hx(p.skin));
    skinGrad.addColorStop(1, hx(p.skinDark));
    ctx.fillStyle = skinGrad;
    ctx.fillRect(0, 0, W, H);

    // ── Forehead sheen ─────────────────────────────────────────────────
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(W * 0.15, H * 0.72, W * 0.7, H * 0.1);
    ctx.globalAlpha = 1;

    // ── Eyebrows — soft arched female ─────────────────────────────────
    ctx.fillStyle = hx(p.hairShad);
    // Left brow — curved
    for (let i = 0; i < 64; i++) {
      const t = i / 64;
      const x = W * 0.12 + t * W * 0.26;
      const y = H * 0.6 - Math.sin(t * Math.PI) * H * 0.04;
      ctx.fillRect(x, y, 4, 9);
    }
    // Right brow
    for (let i = 0; i < 64; i++) {
      const t = i / 64;
      const x = W * 0.62 + t * W * 0.26;
      const y = H * 0.6 - Math.sin(t * Math.PI) * H * 0.04;
      ctx.fillRect(x, y, 4, 9);
    }

    // ── LEFT EYE ──────────────────────────────────────────────────────
    const drawEye = (cx: number, cy: number, flip: boolean) => {
      const ex = cx,
        ey = cy;
      // White sclera — rectangle shape
      ctx.fillStyle = "#fefefe";
      fillRRect(ctx, ex - W * 0.135, ey - H * 0.085, W * 0.27, H * 0.17, W * 0.036);
      // Outline
      ctx.strokeStyle = "#2a1a0a";
      ctx.lineWidth = 3;
      strokeRRect(ctx, ex - W * 0.135, ey - H * 0.085, W * 0.27, H * 0.17, W * 0.036);

      // Iris — large, colourful
      const irisFill = gender === "female" ? "#b44fa0" : "#2255cc";
      ctx.fillStyle = irisFill;
      ctx.beginPath();
      ctx.ellipse(ex, ey + H * 0.015, W * 0.098, H * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();

      // Iris gradient depth
      const irisGrad = ctx.createRadialGradient(ex, ey, 0, ex, ey + H * 0.01, W * 0.09);
      irisGrad.addColorStop(0, "rgba(255,255,255,0.18)");
      irisGrad.addColorStop(0.6, "rgba(0,0,0,0)");
      irisGrad.addColorStop(1, "rgba(0,0,0,0.22)");
      ctx.fillStyle = irisGrad;
      ctx.beginPath();
      ctx.ellipse(ex, ey + H * 0.015, W * 0.098, H * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();

      // Pupil
      ctx.fillStyle = "#0d0a14";
      ctx.beginPath();
      ctx.ellipse(ex, ey + H * 0.015, W * 0.055, H * 0.055, 0, 0, Math.PI * 2);
      ctx.fill();

      // Upper lash shadow over top of eye
      ctx.fillStyle = "#1a0a0a";
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.ellipse(ex, ey - H * 0.035, W * 0.14, H * 0.045, 0, 0, Math.PI);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Eyelashes — top (drawn as thick arcs)
      ctx.strokeStyle = "#1a0a0a";
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      for (let i = -3; i <= 3; i++) {
        const lx = ex + i * W * 0.038;
        const ly = ey - H * 0.09 + Math.abs(i) * H * 0.012;
        const dir = flip ? 1 : -1;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx + dir * i * 4, ly - H * 0.028 - Math.abs(i) * H * 0.01);
        ctx.stroke();
      }

      // Eye glint — large upper-left
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.beginPath();
      ctx.ellipse(ex - W * 0.04, ey - H * 0.04, W * 0.03, H * 0.025, -0.5, 0, Math.PI * 2);
      ctx.fill();
      // Small lower glint
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.beginPath();
      ctx.ellipse(ex + W * 0.04, ey + H * 0.04, W * 0.018, H * 0.014, 0.3, 0, Math.PI * 2);
      ctx.fill();

      // Lower lash line (subtle)
      ctx.strokeStyle = "#3a2a2a";
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.ellipse(ex, ey + H * 0.06, W * 0.13, H * 0.04, 0, 0, Math.PI);
      ctx.stroke();
      ctx.globalAlpha = 1;
    };

    const gender = "female";
    drawEye(W * 0.28, H * 0.495, false);
    drawEye(W * 0.72, H * 0.495, true);

    // ── Nose — cute small double dot ──────────────────────────────────
    ctx.fillStyle = hx(p.skinDark);
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.ellipse(W * 0.42, H * 0.345, 9, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(W * 0.58, H * 0.345, 9, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // ── Cheeks — rosy circles ──────────────────────────────────────────
    ctx.fillStyle = "#f97316";
    ctx.globalAlpha = 0.18;
    ctx.beginPath();
    ctx.ellipse(W * 0.18, H * 0.36, W * 0.12, H * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(W * 0.82, H * 0.36, W * 0.12, H * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // ── Mouth — realistic glossy lips ─────────────────────────────────
    // Philtrum shadow above cupid's bow
    ctx.fillStyle = hx(p.skinDark);
    ctx.globalAlpha = 0.18;
    ctx.beginPath();
    ctx.ellipse(W * 0.5, H * 0.245, W * 0.028, H * 0.018, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // Upper lip — cupid's bow shape
    ctx.fillStyle = "#c0446a";
    ctx.beginPath();
    ctx.moveTo(W * 0.3, H * 0.232);
    ctx.bezierCurveTo(W * 0.36, H * 0.226, W * 0.42, H * 0.198, W * 0.47, H * 0.208);
    ctx.bezierCurveTo(W * 0.49, H * 0.213, W * 0.5, H * 0.218, W * 0.5, H * 0.218);
    ctx.bezierCurveTo(W * 0.51, H * 0.213, W * 0.53, H * 0.208, W * 0.53, H * 0.208);
    ctx.bezierCurveTo(W * 0.58, H * 0.198, W * 0.64, H * 0.226, W * 0.7, H * 0.232);
    ctx.bezierCurveTo(W * 0.65, H * 0.258, W * 0.56, H * 0.268, W * 0.5, H * 0.264);
    ctx.bezierCurveTo(W * 0.44, H * 0.268, W * 0.35, H * 0.258, W * 0.3, H * 0.232);
    ctx.fill();
    // Lower lip — fuller, lighter
    ctx.fillStyle = "#e8608a";
    ctx.beginPath();
    ctx.moveTo(W * 0.31, H * 0.238);
    ctx.bezierCurveTo(W * 0.38, H * 0.258, W * 0.45, H * 0.274, W * 0.5, H * 0.274);
    ctx.bezierCurveTo(W * 0.55, H * 0.274, W * 0.62, H * 0.258, W * 0.69, H * 0.238);
    ctx.bezierCurveTo(W * 0.64, H * 0.178, W * 0.36, H * 0.178, W * 0.31, H * 0.238);
    ctx.fill();
    // Lip crease line
    ctx.strokeStyle = "#aa3258";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(W * 0.31, H * 0.238);
    ctx.bezierCurveTo(W * 0.4, H * 0.243, W * 0.47, H * 0.246, W * 0.5, H * 0.246);
    ctx.bezierCurveTo(W * 0.53, H * 0.246, W * 0.6, H * 0.243, W * 0.69, H * 0.238);
    ctx.stroke();
    // Upper lip highlight — gloss
    ctx.fillStyle = "rgba(255,255,255,0.48)";
    ctx.beginPath();
    ctx.ellipse(W * 0.435, H * 0.213, W * 0.065, H * 0.017, -0.15, 0, Math.PI * 2);
    ctx.fill();
    // Lower lip center shine
    ctx.fillStyle = "rgba(255,255,255,0.32)";
    ctx.beginPath();
    ctx.ellipse(W * 0.5, H * 0.258, W * 0.09, H * 0.022, 0, 0, Math.PI * 2);
    ctx.fill();
    // Corner shading
    ctx.fillStyle = "#aa3258";
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.ellipse(W * 0.31, H * 0.238, W * 0.016, H * 0.011, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(W * 0.69, H * 0.238, W * 0.016, H * 0.011, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // expression overlay
    if (faceId !== 0) applyFaceExpression(ctx, W, H, faceId);
  });
}

/** V4 Male face — Hytale-inspired: large vivid eyes, pixel-art depth, strong brows. */
function makeMaleFaceTex(p: Pal, faceId = 0): THREE.CanvasTexture {
  return makeTex(512, 512, (ctx, W, H) => {
    // ── Skin base — warm gradient with side shading ──────────────────
    const skinGrad = ctx.createLinearGradient(0, 0, 0, H);
    skinGrad.addColorStop(0, hx(p.skin));
    skinGrad.addColorStop(0.5, hx(p.skin));
    skinGrad.addColorStop(1, hx(p.skinDark));
    ctx.fillStyle = skinGrad;
    ctx.fillRect(0, 0, W, H);

    // Pixel-art side shadow bands (gives voxel depth)
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W * 0.1, H);
    ctx.fillRect(W * 0.9, 0, W * 0.1, H);
    ctx.globalAlpha = 1;

    // ── Forehead sheen ─────────────────────────────────────────────────
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = "#fff";
    ctx.fillRect(W * 0.18, H * 0.72, W * 0.64, H * 0.1);
    ctx.globalAlpha = 1;

    // ── Eyebrows — thick pixel-art style, strong arch ─────────────────
    // Left brow — darker inner end, lighter outer
    ctx.fillStyle = hx(p.hairShad);
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.translate(W * 0.15, H * 0.62);
    ctx.rotate(-0.1);
    ctx.fillRect(0, 0, W * 0.28, 14); // main brow block
    ctx.restore();
    // brow shadow underline
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = "#000";
    ctx.save();
    ctx.translate(W * 0.15, H * 0.61);
    ctx.rotate(-0.1);
    ctx.fillRect(0, 14, W * 0.28, 4);
    ctx.restore();
    ctx.globalAlpha = 1;

    // Right brow
    ctx.fillStyle = hx(p.hairShad);
    ctx.save();
    ctx.translate(W * 0.57, H * 0.615);
    ctx.rotate(0.1);
    ctx.fillRect(0, 0, W * 0.28, 14);
    ctx.restore();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = "#000";
    ctx.save();
    ctx.translate(W * 0.57, H * 0.605);
    ctx.rotate(0.1);
    ctx.fillRect(0, 14, W * 0.28, 4);
    ctx.restore();
    ctx.globalAlpha = 1;

    // ── Eyes — Hytale-style: large rectangular sclera, vivid ringed iris ──
    const drawMaleEye = (cx: number, cy: number) => {
      const EW = W * 0.275,
        EH = H * 0.185; // eye box size
      const ex = cx - EW / 2,
        ey = cy - EH / 2;

      // Shadow under brow (depth)
      ctx.fillStyle = hx(p.skinDark);
      ctx.globalAlpha = 0.28;
      ctx.fillRect(ex - 4, ey - 10, EW + 8, 14);
      ctx.globalAlpha = 1;

      // Outer black border (pixel outline)
      ctx.fillStyle = "#0d0810";
      ctx.fillRect(ex - 4, ey - 4, EW + 8, EH + 8);

      // White sclera
      ctx.fillStyle = "#fafcff";
      ctx.fillRect(ex, ey, EW, EH);

      // ── Iris — Hytale multi-ring vivid blue ─────────────────────────
      const irisCX = cx,
        irisCY = cy + H * 0.008;
      const irisW = EW * 0.62,
        irisH = EH * 0.9;

      // Outer iris ring — deep blue
      ctx.fillStyle = "#0d3a8a";
      ctx.beginPath();
      ctx.ellipse(irisCX, irisCY, irisW / 2, irisH / 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Mid iris ring — vivid blue
      ctx.fillStyle = "#1e6ddf";
      ctx.beginPath();
      ctx.ellipse(irisCX, irisCY, (irisW * 0.78) / 2, (irisH * 0.78) / 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Inner iris — lighter blue highlight ring
      ctx.fillStyle = "#3b9ef0";
      ctx.beginPath();
      ctx.ellipse(irisCX, irisCY, (irisW * 0.52) / 2, (irisH * 0.52) / 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Pupil — dark oval
      ctx.fillStyle = "#060410";
      ctx.beginPath();
      ctx.ellipse(irisCX, irisCY, (irisW * 0.3) / 2, (irisH * 0.36) / 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Top lash shadow bar (pixel art style)
      ctx.fillStyle = "#0d0810";
      ctx.globalAlpha = 0.9;
      ctx.fillRect(ex, ey, EW, Math.round(EH * 0.18));
      ctx.globalAlpha = 1;

      // Bottom inner eyelid line
      ctx.fillStyle = "#2a1a2a";
      ctx.globalAlpha = 0.45;
      ctx.fillRect(ex + 2, ey + EH - Math.round(EH * 0.12), EW - 4, Math.round(EH * 0.12));
      ctx.globalAlpha = 1;

      // Large upper-left glint (Hytale hallmark)
      ctx.fillStyle = "rgba(255,255,255,0.96)";
      ctx.beginPath();
      ctx.ellipse(
        irisCX - irisW * 0.22,
        irisCY - irisH * 0.28,
        irisW * 0.14,
        irisH * 0.14,
        -0.3,
        0,
        Math.PI * 2,
      );
      ctx.fill();

      // Small lower-right glint
      ctx.fillStyle = "rgba(255,255,255,0.50)";
      ctx.beginPath();
      ctx.ellipse(
        irisCX + irisW * 0.18,
        irisCY + irisH * 0.22,
        irisW * 0.07,
        irisH * 0.07,
        0.3,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    };

    drawMaleEye(W * 0.285, H * 0.485);
    drawMaleEye(W * 0.715, H * 0.485);

    // ── Nose — two pixel dots ──────────────────────────────────────────
    ctx.fillStyle = hx(p.skinDark);
    ctx.globalAlpha = 0.32;
    ctx.fillRect(Math.round(W * 0.415), Math.round(H * 0.352), 14, 9);
    ctx.fillRect(Math.round(W * 0.545), Math.round(H * 0.352), 14, 9);
    ctx.globalAlpha = 1;

    // ── Cheek depth shadow ─────────────────────────────────────────────
    ctx.fillStyle = hx(p.skinDark);
    ctx.globalAlpha = 0.07;
    ctx.beginPath();
    ctx.ellipse(W * 0.16, H * 0.42, W * 0.09, H * 0.055, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(W * 0.84, H * 0.42, W * 0.09, H * 0.055, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // ── Mouth — realistic neutral lips ────────────────────────────────
    // Upper lip
    ctx.fillStyle = "#a85838";
    ctx.beginPath();
    ctx.moveTo(W * 0.32, H * 0.244);
    ctx.bezierCurveTo(W * 0.38, H * 0.234, W * 0.45, H * 0.227, W * 0.5, H * 0.229);
    ctx.bezierCurveTo(W * 0.55, H * 0.227, W * 0.62, H * 0.234, W * 0.68, H * 0.244);
    ctx.bezierCurveTo(W * 0.64, H * 0.258, W * 0.56, H * 0.263, W * 0.5, H * 0.263);
    ctx.bezierCurveTo(W * 0.44, H * 0.263, W * 0.36, H * 0.258, W * 0.32, H * 0.244);
    ctx.fill();
    // Lower lip — fuller and slightly lighter
    ctx.fillStyle = "#be7050";
    ctx.beginPath();
    ctx.moveTo(W * 0.33, H * 0.25);
    ctx.bezierCurveTo(W * 0.4, H * 0.265, W * 0.46, H * 0.275, W * 0.5, H * 0.275);
    ctx.bezierCurveTo(W * 0.54, H * 0.275, W * 0.6, H * 0.265, W * 0.67, H * 0.25);
    ctx.bezierCurveTo(W * 0.62, H * 0.208, W * 0.38, H * 0.208, W * 0.33, H * 0.25);
    ctx.fill();
    // Lip crease
    ctx.strokeStyle = hx(p.skinDark);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.globalAlpha = 0.65;
    ctx.beginPath();
    ctx.moveTo(W * 0.33, H * 0.25);
    ctx.bezierCurveTo(W * 0.41, H * 0.254, W * 0.47, H * 0.257, W * 0.5, H * 0.257);
    ctx.bezierCurveTo(W * 0.53, H * 0.257, W * 0.59, H * 0.254, W * 0.67, H * 0.25);
    ctx.stroke();
    ctx.globalAlpha = 1;
    // Lower lip subtle shine
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.beginPath();
    ctx.ellipse(W * 0.5, H * 0.263, W * 0.082, H * 0.018, 0, 0, Math.PI * 2);
    ctx.fill();
    // Corner shadow
    ctx.fillStyle = hx(p.skinDark);
    ctx.globalAlpha = 0.28;
    ctx.beginPath();
    ctx.ellipse(W * 0.33, H * 0.25, W * 0.014, H * 0.009, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(W * 0.67, H * 0.25, W * 0.014, H * 0.009, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // expression overlay
    if (faceId !== 0) applyFaceExpression(ctx, W, H, faceId);
  });
}

/** Shirt front — white with pixelated QBlock logo. Enhanced V2. */
function makeShirtTex(
  p: Pal,
  devSkin = false,
  skinId?: string | null,
  topId?: string,
): THREE.CanvasTexture {
  return makeTex(256, 256, (ctx, W, H) => {
    // Base shirt
    ctx.fillStyle = hx(p.shirt);
    ctx.fillRect(0, 0, W, H);

    // Remlev's 6666 reward is a full textured suit. The face and hair are
    // deliberately left to the normal head materials below.
    if (skinId === "skin-6666-doraemon") {
      ctx.fillStyle = "#f7fbff";
      ctx.fillRect(W * 0.18, H * 0.28, W * 0.64, H * 0.56);
      ctx.fillStyle = "#dcecff";
      ctx.fillRect(W * 0.18, H * 0.28, W * 0.64, 8);
      ctx.fillStyle = "#ef3340";
      ctx.fillRect(W * 0.4, 0, W * 0.2, 10);
      ctx.fillRect(W * 0.44, H * 0.78, W * 0.12, H * 0.12);
      ctx.fillStyle = "#1878c9";
      ctx.fillRect(W * 0.1, H * 0.72, W * 0.8, H * 0.28);
      ctx.strokeStyle = "#ef3340";
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(W / 2, H * 0.72, W * 0.075, 0, Math.PI * 2);
      ctx.stroke();
      return;
    }

    // Subtle fabric texture (vertical weave lines)
    ctx.globalAlpha = 0.04;
    ctx.fillStyle = "#000";
    for (let x = 0; x < W; x += 4) ctx.fillRect(x, 0, 1, H);
    ctx.globalAlpha = 1;

    // Side shadow panels for depth
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W * 0.12, H);
    ctx.fillRect(W * 0.88, 0, W * 0.12, H);
    ctx.globalAlpha = 1;

    // V-collar
    ctx.fillStyle = hx(p.shirtTrim);
    ctx.fillRect(W * 0.3, 0, W * 0.4, 8);
    // V notch
    ctx.fillStyle = hx(p.skin);
    ctx.fillRect(W * 0.4, 0, W * 0.2, 20);
    ctx.fillStyle = hx(p.shirtTrim);
    ctx.fillRect(W * 0.43, 12, W * 0.14, 6);

    // Centre button placket
    ctx.fillStyle = hx(p.shirtTrim);
    ctx.globalAlpha = 0.35;
    ctx.fillRect(W * 0.475, 20, W * 0.05, H * 0.55);
    ctx.globalAlpha = 1;
    // Buttons
    ctx.fillStyle = "#bec5cc";
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(W * 0.49, 28 + i * 16, 8, 8);
    }

    // ── Chest badge ────────────────────────────────────────────────────────
    // The Dev skin uses the blue "Dev" badge from the supplied reference;
    // the everyday rig keeps the neutral QBlock patch.
    if (devSkin) {
      ctx.fillStyle = "#0b1223";
      ctx.fillRect(W * 0.56, H * 0.29, W * 0.3, H * 0.17);
      ctx.fillStyle = "#5aaeff";
      ctx.fillRect(W * 0.56, H * 0.29, W * 0.3, 5);
      ctx.font = `900 ${Math.round(W * 0.12)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Dev", W * 0.71, H * 0.38);
      ctx.textAlign = "start";
      ctx.textBaseline = "alphabetic";
    }

    // ── QBlock logo patch (left chest) ─────────────────────────────────────
    // Logo backing
    ctx.fillStyle = "#dde0e3";
    ctx.fillRect(W * 0.08, H * 0.28, W * 0.36, H * 0.22);
    ctx.fillStyle = "#c8cdd1";
    ctx.fillRect(W * 0.1, H * 0.32, W * 0.32, H * 0.14);
    // Pixel Q
    ctx.fillStyle = "#586070";
    const Q = (x: number, y: number, s: number) => {
      ctx.fillRect(x, y, s * 4, s);
      ctx.fillRect(x, y + s, s, s * 4);
      ctx.fillRect(x + s * 3, y + s, s, s * 4);
      ctx.fillRect(x, y + s * 5, s * 4, s);
      ctx.fillRect(x + s * 2, y + s * 4, s * 2, s * 2);
    };
    const s = 4;
    Q(W * 0.1, H * 0.3, s);
    // "Block" pixel text
    ctx.fillRect(W * 0.26, H * 0.3, s * 2, s * 6);
    ctx.fillRect(W * 0.26, H * 0.3, s * 3, s);
    ctx.fillRect(W * 0.26, H * 0.33, s * 3, s);
    ctx.fillRect(W * 0.26, H * 0.36, s * 3, s);

    // bottom hem detail
    ctx.fillStyle = hx(p.shirtTrim);
    ctx.fillRect(0, H - 14, W, 6);
    ctx.fillStyle = hx(p.shirt);
    ctx.fillRect(0, H - 8, W, 8);

    // Every catalog top gets a readable, rasterized fabric treatment rather
    // than a flat placeholder colour.
    if (topId === "top-dark-hoodie" || topId === "top-sakura-hoodie") {
      ctx.strokeStyle = hx(p.shirtTrim);
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(W * 0.34, H * 0.03);
      ctx.lineTo(W * 0.43, H * 0.18);
      ctx.moveTo(W * 0.66, H * 0.03);
      ctx.lineTo(W * 0.57, H * 0.18);
      ctx.stroke();
      ctx.fillStyle = hx(p.shirtTrim);
      ctx.fillRect(W * 0.25, H * 0.68, W * 0.5, H * 0.13);
    } else if (topId === "top-striped-polo" || topId === "top-sport-jersey") {
      ctx.fillStyle = hx(p.shirtTrim);
      for (let y = H * 0.2; y < H * 0.78; y += H * 0.15) ctx.fillRect(0, y, W, 7);
    } else if (topId === "top-vintage-jacket" || topId === "top-varsity-jacket") {
      ctx.fillStyle = hx(p.shirtTrim);
      ctx.fillRect(W * 0.07, 0, 7, H);
      ctx.fillRect(W * 0.93 - 7, 0, 7, H);
      ctx.fillRect(W * 0.46, H * 0.15, 7, H * 0.68);
    } else if (topId === "top-cyber-vest") {
      ctx.fillStyle = "#07131f";
      ctx.fillRect(W * 0.16, H * 0.2, W * 0.68, H * 0.56);
      ctx.fillStyle = hx(p.shirtTrim);
      ctx.fillRect(W * 0.18, H * 0.23, W * 0.64, 5);
      ctx.fillRect(W * 0.18, H * 0.72, W * 0.64, 5);
    } else if (topId === "top-galaxy-tee" || topId === "top-neon-grid") {
      ctx.fillStyle = "#fff";
      for (let i = 0; i < 18; i++) {
        const x = (i * 47) % W;
        const y = (i * 71) % H;
        ctx.fillRect(x, y, 3, 3);
      }
    } else if (topId === "top-remlev-bomber") {
      ctx.fillStyle = hx(p.shirtTrim);
      ctx.fillRect(W * 0.08, H * 0.12, W * 0.84, 7);
      ctx.fillRect(W * 0.08, H * 0.82, W * 0.84, 7);
      ctx.fillRect(W * 0.47, H * 0.14, 7, H * 0.68);
    }
  });
}

/** Arm texture — sleeve top, grey cuff, skin forearm. */
function makeArmTex(p: Pal, fullCoverage = false): THREE.CanvasTexture {
  return makeTex(64, 128, (ctx, W, H) => {
    ctx.fillStyle = hx(p.shirt);
    ctx.fillRect(0, 0, W, H * 0.42);
    ctx.fillStyle = hx(p.shirtTrim);
    ctx.fillRect(0, H * 0.42, W, 6);
    ctx.fillStyle = hx(fullCoverage ? p.shirt : p.skin);
    ctx.fillRect(0, H * 0.42 + 6, W, H);
    if (fullCoverage) {
      ctx.fillStyle = hx(p.shirtTrim);
      ctx.fillRect(0, H * 0.72, W, 7);
    }
  });
}

/** Leg texture — white shorts top, cuff, skin thigh, black shoe. */
function makeLegTex(p: Pal, fullCoverage = false): THREE.CanvasTexture {
  return makeTex(64, 128, (ctx, W, H) => {
    ctx.fillStyle = hx(p.shorts);
    ctx.fillRect(0, 0, W, H * 0.44);
    ctx.fillStyle = hx(p.shortsTrim);
    ctx.fillRect(0, H * 0.4, W, 6);
    // vertical seam stripe
    ctx.fillRect(W * 0.38, 0, 4, H * 0.4);
    ctx.fillStyle = hx(fullCoverage ? p.shorts : p.skin);
    ctx.fillRect(0, H * 0.44 + 2, W, H * 0.36);
    // shoe
    ctx.fillStyle = hx(p.shoes);
    ctx.fillRect(0, H * 0.8, W, H * 0.2);
    // lace accent
    ctx.fillStyle = hx(p.shoeAcc);
    ctx.fillRect(W * 0.2, H * 0.79, W * 0.6, 4);
  });
}

/** Fabric texture for the raised, fitted pants shell. */
function makePantsTex(p: Pal): THREE.CanvasTexture {
  return makeTex(128, 128, (ctx, W, H) => {
    ctx.fillStyle = hx(p.shorts);
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = "#ffffff";
    for (let x = 0; x < W; x += 12) ctx.fillRect(x, 0, 3, H);
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = "#000000";
    for (let y = 8; y < H; y += 18) ctx.fillRect(0, y, W, 2);
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = hx(p.shortsTrim);
    ctx.fillRect(0, 8, W, 7);
    ctx.fillRect(W * 0.47, 15, 6, H * 0.68);
    ctx.strokeStyle = hx(p.shortsTrim);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(12, 34);
    ctx.lineTo(42, 52);
    ctx.moveTo(W - 12, 34);
    ctx.lineTo(W - 42, 52);
    ctx.stroke();
    ctx.globalAlpha = 1;
  });
}

// ─── Hair builders ────────────────────────────────────────────────────────────

/** Male blue spiky anime hair — volumes nested inside the head group. */
function buildMaleHair(head: THREE.Mesh, p: Pal) {
  const hm = tmat(makeHairTex(p), 0.58);
  const hs = mat(p.hairShad, 0.62);
  const hhi = mat(p.hairHi, 0.52);

  const add = (
    sx: number,
    sy: number,
    sz: number,
    px_: number,
    py_: number,
    pz_: number,
    m = hm,
  ) => {
    const piece = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m);
    piece.position.set(px_, py_, pz_);
    head.add(piece);
  };

  // All pieces: inner face must sit ≥ 0.02 outside the head cube (half = 0.48).
  // Rule: for a piece of half-thickness T centred at P, |P| - T ≥ 0.50.

  // ── Main cap ───────────────────────────────────────────────────────────────
  add(1.12, 0.38, 1.12, 0, 0.47, 0); // top cap  (wider than head → no side z-fight)
  add(0.18, 0.68, 1.1, -0.59, 0.1, 0); // left wall  inner=0.50 ✓
  add(0.18, 0.68, 1.1, 0.59, 0.1, 0); // right wall inner=0.50 ✓
  add(1.1, 0.7, 0.22, 0, 0.08, -0.61, hs); // back slab  front=−0.50 ✓
  add(0.86, 0.38, 0.22, 0, -0.18, -0.61, hs); // back lower drop

  // ── Front spiky bangs ─────────────────────────────────────────────────────
  // back face of each spike = centre_z − depth/2 must be ≥ 0.50
  add(0.3, 0.46, 0.24, -0.14, 0.32, 0.62); // centre-left (back = 0.50)
  add(0.26, 0.36, 0.22, -0.38, 0.22, 0.61, hhi);
  add(0.18, 0.24, 0.18, -0.5, 0.1, 0.59);
  add(0.28, 0.4, 0.22, 0.2, 0.28, 0.61);
  add(0.2, 0.28, 0.18, 0.4, 0.14, 0.59, hhi);
  add(0.22, 0.3, 0.14, 0.0, 0.18, 0.64, hs);

  // ── Sideburn flares ────────────────────────────────────────────────────────
  add(0.2, 0.32, 0.36, -0.59, -0.22, -0.1); // inner=0.50 ✓
  add(0.2, 0.32, 0.36, 0.59, -0.22, -0.1);

  // ── Extra crown tiers — stacked above main cap for anime volume ───────────
  // Each tier sits on top of the previous; no z-fight since narrower each step.
  add(0.72, 0.24, 0.72, 0, 0.66, 0); // 2nd tier (wide)
  add(0.4, 0.22, 0.38, 0, 0.83, 0, hhi); // 3rd tier highlight
  add(0.18, 0.18, 0.18, -0.06, 0.94, 0.06, hm); // left peak
  add(0.16, 0.18, 0.18, 0.06, 0.94, -0.08, hs); // right shadow peak

  // ── Extended side wings (wider flare, anime silhouette) ───────────────────
  // inner face: |-0.71| − 0.10 = 0.61 ≥ 0.50 ✓
  add(0.2, 0.42, 0.5, -0.71, 0.1, -0.05);
  add(0.2, 0.42, 0.5, 0.71, 0.1, -0.05);

  // ── Extra front bang volume ────────────────────────────────────────────────
  add(0.4, 0.22, 0.18, 0, 0.04, 0.64, hs); // wide base strip
  add(0.2, 0.3, 0.2, 0.28, 0.18, 0.62, hhi); // right bright accent
}

/** Clean, reference-matched blue developer hair.
 * Kept as a separate silhouette from the older spiky preset so the long
 * side panels never intersect the face or flicker at oblique angles.
 */
function buildDevHair(head: THREE.Mesh, p: Pal) {
  const hair = mat(p.hair, 0.52);
  const shadow = mat(p.hairShad, 0.62);
  const highlight = mat(p.hairHi, 0.42);
  const add = (size: [number, number, number], pos: [number, number, number], material = hair) => {
    const piece = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    piece.position.set(...pos);
    piece.castShadow = true;
    head.add(piece);
  };
  // Smooth cap and a stepped fringe, all outside the 0.48 head half-width.
  add([1.1, 0.32, 1.1], [0, 0.49, 0]);
  add([0.16, 0.78, 1.04], [-0.58, 0.08, 0], shadow);
  add([0.16, 0.78, 1.04], [0.58, 0.08, 0], hair);
  add([1.02, 0.2, 0.16], [0, 0.31, 0.57], highlight);
  add([0.25, 0.3, 0.18], [-0.28, 0.18, 0.59], hair);
  add([0.25, 0.38, 0.18], [0.02, 0.14, 0.59], highlight);
  add([0.22, 0.26, 0.18], [0.29, 0.2, 0.59], shadow);
  add([0.92, 0.52, 0.16], [0, 0.02, -0.58], shadow);
  add([0.72, 0.18, 0.18], [0, -0.24, -0.59], shadow);
}

/** Female pink long flowing hair — cap + long strands parented to head. */
function buildFemaleHair(head: THREE.Mesh, p: Pal) {
  const hm = tmat(makeHairTex(p), 0.58);
  const hs = mat(p.hairShad, 0.72);

  // All pieces: inner face ≥ 0.02 outside head cube (half = 0.48 → threshold 0.50).
  const add = (
    sx: number,
    sy: number,
    sz: number,
    px_: number,
    py_: number,
    pz_: number,
    m = hm,
  ) => {
    const piece = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m);
    piece.position.set(px_, py_, pz_);
    head.add(piece);
  };

  // ── Cap + side coverage ────────────────────────────────────────────────────
  add(1.16, 0.36, 1.16, 0, 0.47, 0); // top cap (wider → no side z-fight)
  add(0.22, 0.8, 1.1, -0.61, 0.08, 0); // left wall  inner=0.50 ✓
  add(0.22, 0.8, 1.1, 0.61, 0.08, 0); // right wall inner=0.50 ✓
  add(1.1, 0.9, 0.22, 0, 0.02, -0.61, hs); // back slab front=−0.50 ✓

  // ── Fringe / bangs ─────────────────────────────────────────────────────────
  add(0.7, 0.24, 0.2, 0, 0.28, 0.6); // back=0.50 ✓
  add(0.3, 0.32, 0.18, -0.28, 0.18, 0.59);
  add(0.26, 0.28, 0.18, 0.26, 0.14, 0.59, hs);

  // ── Long flowing strands — parented to head so they follow head movement ───
  // Coordinates are in headMesh-local space.
  // Conversion from old torso-local: subtract (torsoGroup.y=0.28 → 1.41 root offset)
  // headMesh_local_y = torso_local_y + 0.28 − 1.41 = torso_local_y − 1.13
  add(0.24, 1.8, 0.24, -0.56, -0.63, -0.06); // left upper strand
  add(0.22, 1.1, 0.22, -0.52, -1.63, -0.04, hs); // left lower strand
  add(0.24, 1.8, 0.24, 0.56, -0.63, -0.06); // right upper strand
  add(0.22, 1.1, 0.22, 0.52, -1.63, -0.04, hs); // right lower strand
  add(0.7, 1.6, 0.22, 0, -0.73, -0.38, hs); // mid-back panel
}

// ─── Full character builder ───────────────────────────────────────────────────

interface CharRefs {
  root: THREE.Group;
  headGroup: THREE.Group; // for look-at / head bob
  torsoGroup: THREE.Group; // torso pivot for breathing
  backAccessoryGroup: THREE.Group;
  headAccessoryGroup: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
}

function buildReferenceAccessories(headAccessoryGroup: THREE.Group, p: Pal) {
  // Signature accessories from the uploaded QBLOCK reference. They are part
  // of the authored avatar silhouette, not a separate GLB dependency.
  const headsetGroup = new THREE.Group();
  headsetGroup.position.set(0, 0.5, 0);
  headAccessoryGroup.add(headsetGroup);

  const headsetMat = mat(0x1e293b, 0.32, 0.18);
  const headsetGlow = new THREE.MeshStandardMaterial({
    color: 0xf43f5e,
    emissive: 0xf43f5e,
    emissiveIntensity: 0.72,
    roughness: 0.28,
    metalness: 0.16,
  });
  const arch = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.14, 0.18), headsetMat);
  arch.position.y = 1.02;
  headsetGroup.add(arch);
  for (const side of [-1, 1]) {
    const cup = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.38, 0.34), headsetMat.clone());
    cup.position.set(side * 0.53, 0.5, 0);
    headsetGroup.add(cup);
    const light = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.22, 0.22), headsetGlow.clone());
    light.position.set(side * 0.64, 0.5, 0.18);
    headsetGroup.add(light);
  }
  const mic = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.38), headsetMat.clone());
  mic.position.set(0.5, 0.25, 0.24);
  headsetGroup.add(mic);

  const haloGroup = new THREE.Group();
  haloGroup.position.set(0, 1.18, 0);
  headAccessoryGroup.add(haloGroup);
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.4, 0.065, 8, 16),
    new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.65,
      roughness: 0.24,
      metalness: 0.38,
    }),
  );
  halo.rotation.x = Math.PI / 2;
  halo.castShadow = true;
  haloGroup.add(halo);

  // A small blue pin gives the headset a QBLOCK-specific accent without
  // competing with the face texture or the optional wearable catalog.
  const pin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.04), mat(p.hairHi, 0.36, 0.12));
  pin.position.set(0.53, 0.64, 0.2);
  headsetGroup.add(pin);
}

function buildLegacyCharacter(
  scene: THREE.Scene,
  gender: "male" | "female",
  tint?: string,
  skinId?: string | null,
  faceId = 0,
  showBandana = false,
  equippedItemIds: string[] = [],
  equippedPants?: string | null,
): CharRefs {
  const p: Pal = gender === "female" ? { ...PAL_FEMALE } : { ...PAL_MALE };
  const skinDef = skinId ? SKINS.find((skin) => skin.id === skinId) : undefined;
  const special6666 = skinId === "skin-6666-doraemon";
  if (skinDef) {
    p.skin = Number.parseInt(skinDef.colors.head.replace("#", ""), 16);
    p.shirt = Number.parseInt(skinDef.colors.torso.replace("#", ""), 16);
    p.shirtTrim = Number.parseInt(skinDef.accent.replace("#", ""), 16);
    p.shorts = Number.parseInt(skinDef.colors.leg.replace("#", ""), 16);
    p.shortsTrim = Number.parseInt(skinDef.accent.replace("#", ""), 16);
    p.shoes = skinDef.shoes ? Number.parseInt(skinDef.shoes.base.replace("#", ""), 16) : p.shoes;
    p.shoeAcc = skinDef.shoes
      ? Number.parseInt(skinDef.shoes.accent.replace("#", ""), 16)
      : p.shoeAcc;
  }
  const equipped = new Set(equippedItemIds);
  const topId =
    equippedItemIds.find((id) => id.startsWith("top-") || id.endsWith("-top")) ?? skinDef?.topId;
  const topColors: Record<string, [number, number]> = {
    "top-dark-hoodie": [0x1c1917, 0x0c0a09],
    "top-striped-polo": [0x3b82f6, 0x1d4ed8],
    "top-vintage-jacket": [0xa16207, 0x78350f],
    "top-sport-jersey": [0x22c55e, 0x15803d],
    "top-varsity-jacket": [0xdc2626, 0x991b1b],
    "top-cyber-vest": [0x0891b2, 0x0e7490],
    "top-galaxy-tee": [0x7c3aed, 0x4c1d95],
    "bundle-chicken-top": [0xfef08a, 0xeab308],
  };
  const pantsColors: Record<string, [number, number]> = {
    "pants-classic": [0x1d4ed8, 0x1e3a8a],
    "pants-black-skinny": [0x111827, 0x030712],
    "pants-cargo-shorts": [0x65a30d, 0x3f6212],
    "pants-sweatpants": [0x6b7280, 0x374151],
    "pants-striped": [0xfbbf24, 0xd97706],
    "pants-plaid": [0xb91c1c, 0x7f1d1d],
    "pants-neon-leggings": [0xa855f7, 0x7e22ce],
    "pants-tuxedo": [0x0f172a, 0x020617],
    "pants-cyan-cargo": [0x06b6d4, 0x164e63],
    "pants-ember-jeans": [0xf97316, 0x7c2d12],
    "pants-lilac-wide": [0xc084fc, 0x581c87],
    "bundle-chicken-pants": [0xfef08a, 0xeab308],
  };
  const topPalette = topId ? topColors[topId] : undefined;
  if (topPalette) {
    p.shirt = topPalette[0];
    p.shirtTrim = topPalette[1];
  }
  const pantsPalette = equippedPants
    ? pantsColors[equippedPants]
    : skinDef?.pantsId
      ? pantsColors[skinDef.pantsId]
      : undefined;
  if (pantsPalette) {
    p.shorts = pantsPalette[0];
    p.shortsTrim = pantsPalette[1];
  }
  if (special6666) {
    // The 6666 suit owns the whole silhouette; the default pants selection
    // must not punch a denim panel through the blue lower half.
    p.shirt = 0x1878c9;
    p.shirtTrim = 0xef3340;
    p.shorts = 0x1261a8;
    p.shortsTrim = 0xef3340;
    p.shoes = 0xf7f9ff;
    p.shoeAcc = 0xef3340;
  }

  // Allow tint to shift the shorts/accent colour slightly
  if (tint) {
    const tc = new THREE.Color(tint);
    const blended = tc.clone().lerp(new THREE.Color(p.shorts), 0.65);
    p.shorts = blended.getHex();
  }

  // ── Textures ─────────────────────────────────────────────────────────────
  const shirtTex = makeShirtTex(p, false, skinId, topId);
  const armTex = makeArmTex(p, special6666);
  const legTex = makeLegTex(p, special6666);

  // ── Root group ──────────────────────────────────────────────────────────
  const root = new THREE.Group();
  root.position.y = -0.45;
  scene.add(root);

  // ── TORSO ──────────────────────────────────────────────────────────────
  // Reference-matched Minecraft proportions: compact & square, not stretched
  const torsoGroup = new THREE.Group();
  torsoGroup.position.y = 0.28;
  root.add(torsoGroup);

  const torsoFrontMat = tmat(shirtTex);
  const torsoBackMat = mat(p.shirt);
  const torsoMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 1.45, 0.55),
    faceMats(p.shirt, p.shirtTrim, p.shorts, torsoFrontMat, torsoBackMat),
  );
  torsoMesh.castShadow = true;
  torsoMesh.receiveShadow = true;
  torsoGroup.add(torsoMesh);

  // ── ARMS ────────────────────────────────────────────────────────────────
  // Arms are ~1.2 units tall — proportional, not elongated
  const armW = gender === "female" ? 0.44 : 0.5;
  const armH = 1.22;
  const armGeo = new THREE.BoxGeometry(armW, armH, armW);
  const armFrontMat = tmat(armTex);
  // X pivot: torsoHalf + armHalf + 1px gap
  const armPivotX = 0.55 + armW / 2 + 0.01;

  const leftArm = new THREE.Group();
  leftArm.position.set(-armPivotX, 0.48, 0);
  torsoGroup.add(leftArm);
  const lArmMesh = new THREE.Mesh(
    armGeo,
    faceMats(
      p.shirt,
      special6666 ? p.shirt : p.skin,
      p.shirt,
      armFrontMat.clone(),
      armFrontMat.clone(),
    ),
  );
  lArmMesh.position.y = -(armH / 2); // arm top at pivot
  lArmMesh.castShadow = true;
  leftArm.add(lArmMesh);

  // Shoulder cap — thin raised block for that Minecraft hero silhouette
  const capW = armW + 0.14;
  const capD = armW + 0.08;
  const shoulderCapGeo = new THREE.BoxGeometry(capW, 0.22, capD);
  const shoulderMat = new THREE.MeshStandardMaterial({
    color: p.shirtTrim,
    roughness: 0.65,
    metalness: 0.05,
  });
  const lShoulderCap = new THREE.Mesh(shoulderCapGeo, shoulderMat);
  lShoulderCap.position.y = 0.03;
  lShoulderCap.castShadow = true;
  leftArm.add(lShoulderCap);

  const rightArm = new THREE.Group();
  rightArm.position.set(armPivotX, 0.48, 0);
  torsoGroup.add(rightArm);
  const rArmMesh = new THREE.Mesh(
    armGeo,
    faceMats(
      p.shirt,
      special6666 ? p.shirt : p.skin,
      p.shirt,
      armFrontMat.clone(),
      armFrontMat.clone(),
    ),
  );
  rArmMesh.position.y = -(armH / 2);
  rArmMesh.castShadow = true;
  rightArm.add(rArmMesh);

  const rShoulderCap = new THREE.Mesh(shoulderCapGeo, shoulderMat.clone());
  rShoulderCap.position.y = 0.03;
  rShoulderCap.castShadow = true;
  rightArm.add(rShoulderCap);

  // ── LEGS ────────────────────────────────────────────────────────────────
  const legH = 1.38;
  const legGeo = new THREE.BoxGeometry(0.5, legH, 0.5);
  const legFrontMat = tmat(legTex);
  const pantsTex = makePantsTex(p);
  // Pivot at torso bottom
  const legPivotY = -(1.3 / 2);

  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.28, legPivotY, 0);
  torsoGroup.add(leftLeg);
  const lLegMesh = new THREE.Mesh(
    legGeo,
    faceMats(p.shorts, p.shorts, p.shoes, legFrontMat.clone(), legFrontMat.clone()),
  );
  lLegMesh.position.y = -(legH / 2);
  lLegMesh.castShadow = true;
  lLegMesh.receiveShadow = true;
  leftLeg.add(lLegMesh);

  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.28, legPivotY, 0);
  torsoGroup.add(rightLeg);
  const rLegMesh = new THREE.Mesh(
    legGeo,
    faceMats(p.shorts, p.shorts, p.shoes, legFrontMat.clone(), legFrontMat.clone()),
  );
  rLegMesh.position.y = -(legH / 2);
  rLegMesh.castShadow = true;
  rLegMesh.receiveShadow = true;
  rightLeg.add(rLegMesh);

  // Raised shells make pants and sneakers read as actual fitted 3D pieces,
  // rather than a flat color baked into the leg texture.
  const pantsShellMat = tmat(pantsTex, 0.7);
  for (const leg of [leftLeg, rightLeg]) {
    const shell = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.68, 0.55), [
      pantsShellMat.clone(),
      pantsShellMat.clone(),
      pantsShellMat.clone(),
      pantsShellMat.clone(),
      pantsShellMat.clone(),
      pantsShellMat.clone(),
    ]);
    shell.position.y = -(legH / 2) + 0.96;
    shell.castShadow = true;
    shell.receiveShadow = true;
    leg.add(shell);

    const cuff = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.09, 0.56), mat(p.shortsTrim, 0.54));
    cuff.position.y = -(legH / 2) + 0.63;
    cuff.castShadow = true;
    leg.add(cuff);

    const sneaker = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.68), [
      mat(p.shoes, 0.42, 0.12),
      mat(p.shoes, 0.42, 0.12),
      mat(p.shoeAcc, 0.46, 0.18),
      mat(0x101010, 0.7),
      mat(p.shoes, 0.42, 0.12),
      mat(0x101010, 0.7),
    ]);
    sneaker.position.set(0, -(legH / 2) - 0.56, 0.08);
    sneaker.castShadow = true;
    sneaker.receiveShadow = true;
    leg.add(sneaker);
    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.63, 0.075, 0.7), mat(0xf6f7fb, 0.48));
    sole.position.set(0, -(legH / 2) - 0.73, 0.08);
    sole.castShadow = true;
    leg.add(sole);
  }

  // ── HEAD ─────────────────────────────────────────────────────────────────
  // headGroup sits exactly at torso-top; no separate neck mesh — the collar
  // trim on the torso top-face is the only "neck" separation, matching the
  // reference image where the head almost directly meets the shoulders.
  const headGroup = new THREE.Group();
  // root-space: torsoGroup.y(0.28) + torsoHalfH(0.65) = 0.93
  headGroup.position.set(0, 0.93, 0);
  root.add(headGroup);

  const headAccessoryGroup = new THREE.Group();
  headGroup.add(headAccessoryGroup);
  const backAccessoryGroup = new THREE.Group();
  torsoGroup.add(backAccessoryGroup);
  buildReferenceAccessories(headAccessoryGroup, p);

  // Head cube — 0.96 units, bottom flush with headGroup origin (torso top)
  // Front/back = plain skin (no face texture for now); sides/top use detailed textures.

  // Side texture — 128×128 with hair zone, skin zone, ear hint, shadow band.
  // UV on BoxGeometry side faces: U=0→front of head, U=1→back; V=0→bottom, V=1→top.
  const headSideTex = makeTex(128, 128, (ctx, W, H) => {
    // Skin base
    ctx.fillStyle = hx(p.skin);
    ctx.fillRect(0, 0, W, H);
    // Slight back-of-head ambient shadow
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = "#000000";
    ctx.fillRect(W * 0.55, 0, W * 0.45, H);
    ctx.globalAlpha = 1;
    // Hair zone — top 36%
    ctx.fillStyle = hx(p.hair);
    ctx.fillRect(0, H * 0.64, W, H * 0.36); // V=0 is bottom, so hair is top rows
    // Hair shadow at back of head
    ctx.fillStyle = hx(p.hairShad);
    ctx.fillRect(W * 0.55, H * 0.64, W * 0.45, H * 0.36);
    // Hair-skin boundary strip
    ctx.fillStyle = hx(p.skinDark);
    ctx.fillRect(0, H * 0.62, W, 3);
    // Ear suggestion — raised bump mid-front of side
    ctx.fillStyle = hx(p.skinDark);
    ctx.fillRect(W * 0.06, H * 0.38, 8, 18);
    // Sideburn strip (male only)
    if (gender === "male") {
      ctx.fillStyle = hx(p.hairShad);
      ctx.globalAlpha = 0.55;
      ctx.fillRect(W * 0.06, H * 0.62, W * 0.14, H * 0.16);
      ctx.globalAlpha = 1;
    }
  });

  // Back texture — 128×128 hair-back with subtle highlight streak
  const headBackTex = makeTex(128, 128, (ctx, W, H) => {
    ctx.fillStyle = hx(p.hairShad);
    ctx.fillRect(0, 0, W, H);
    // Central highlight stripe
    ctx.fillStyle = hx(p.hair);
    ctx.globalAlpha = 0.55;
    ctx.fillRect(W * 0.3, 0, W * 0.4, H);
    ctx.globalAlpha = 1;
    // Top edge slightly lighter
    ctx.fillStyle = hx(p.hairHi ?? p.hair);
    ctx.globalAlpha = 0.35;
    ctx.fillRect(W * 0.25, H * 0.7, W * 0.5, H * 0.3);
    ctx.globalAlpha = 1;
  });

  // Top texture — 128×128 hair top with highlight
  const headTopTex = makeTex(128, 128, (ctx, W, H) => {
    ctx.fillStyle = hx(p.hair);
    ctx.fillRect(0, 0, W, H);
    // Highlight patch (front-left area matches spiky bangs direction for males)
    ctx.fillStyle = hx(p.hairHi ?? p.hair);
    ctx.globalAlpha = 0.55;
    if (gender === "male") {
      ctx.fillRect(W * 0.1, H * 0.1, W * 0.45, H * 0.55);
    } else {
      ctx.fillRect(W * 0.2, H * 0.2, W * 0.6, H * 0.4);
    }
    ctx.globalAlpha = 1;
    // Shadow at back
    ctx.fillStyle = hx(p.hairShad);
    ctx.globalAlpha = 0.35;
    ctx.fillRect(0, 0, W, H * 0.25);
    ctx.globalAlpha = 1;
  });

  // Face texture — anime-style expressive face, NetEase/QBlock aesthetic
  const faceTex = gender === "female" ? makeFemaleFaceTex(p, faceId) : makeMaleFaceTex(p, faceId);

  // BoxGeometry face order: [+X right, -X left, +Y top, -Y bottom, +Z front, -Z back]
  const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.96, 0.96), [
    tmat(headSideTex), // +X right side
    tmat(headSideTex), // −X left side  (mirrored, fine for this style)
    tmat(headTopTex), // +Y top
    mat(p.skin), // −Y bottom (inside collar, never seen)
    tmat(faceTex), // +Z front — anime face
    tmat(headBackTex), // −Z back
  ]);
  // Bottom of head flush with headGroup origin (torso top)
  headMesh.position.y = 0.48;
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  // ── HAIR ────────────────────────────────────────────────────────────────
  if (gender === "male") {
    buildMaleHair(headMesh, p);
  } else {
    buildFemaleHair(headMesh, p);
  }

  // Catalog hair selections are layered on top of the base rig so they remain
  // visible in every public preview, not just inside Inventory.
  const hairMat = mat(p.hair, 0.68);
  const hairId = equippedItemIds.find((id) => id.startsWith("hair-"));
  if (hairId === "hair-bun") {
    const bun = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.46, 0.46), hairMat);
    bun.position.set(0, 0.98, -0.22);
    headMesh.add(bun);
  } else if (hairId === "hair-long" || hairId === "hair-ponytail") {
    for (const x of [-0.54, 0.54]) {
      const strand = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.92, 0.22), hairMat);
      strand.position.set(x, -0.35, -0.08);
      headMesh.add(strand);
    }
  } else if (hairId === "hair-buzz") {
    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.16, 1.04), hairMat);
    cap.position.y = 0.5;
    headMesh.add(cap);
  } else if (hairId === "hair-twin") {
    for (const x of [-0.42, 0.42]) {
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.62, 0.3), hairMat.clone());
      tail.position.set(x, 0.52, -0.18);
      tail.rotation.z = x < 0 ? -0.12 : 0.12;
      headMesh.add(tail);
    }
  }

  // ── NINJA EYE MASK (bandana) ─────────────────────────────────────────────
  // Wraps around the head at eye level — headMesh-local space, center = (0,0,0)
  if (showBandana) {
    const maskMat = new THREE.MeshStandardMaterial({
      color: 0x1a0a2e,
      roughness: 0.55,
      metalness: 0.12,
    });
    const maskMatC = () => maskMat.clone();
    // Front band
    const frontBand = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.24, 0.04), maskMat);
    frontBand.position.set(0, 0.01, 0.5);
    headMesh.add(frontBand);
    // Back band
    const backBand = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.24, 0.04), maskMatC());
    backBand.position.set(0, 0.01, -0.5);
    headMesh.add(backBand);
    // Left side
    const lBand = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.24, 0.96), maskMatC());
    lBand.position.set(-0.5, 0.01, 0);
    headMesh.add(lBand);
    // Right side
    const rBand = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.24, 0.96), maskMatC());
    rBand.position.set(0.5, 0.01, 0);
    headMesh.add(rBand);
    // Lens sheen left
    const lLens = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.18, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x223366, roughness: 0.28, metalness: 0.55 }),
    );
    lLens.position.set(-0.22, 0.01, 0.52);
    headMesh.add(lLens);
    // Lens sheen right
    const rLens = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.18, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x223366, roughness: 0.28, metalness: 0.55 }),
    );
    rLens.position.set(0.22, 0.01, 0.52);
    headMesh.add(rLens);
    // Tie tails hanging at back
    const tailMat = new THREE.MeshStandardMaterial({ color: 0x12061e, roughness: 0.7 });
    const lTail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.4, 0.06), tailMat);
    lTail.position.set(-0.2, -0.28, -0.5);
    lTail.rotation.x = 0.18;
    headMesh.add(lTail);
    const rTail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.36, 0.06), tailMat.clone());
    rTail.position.set(0.2, -0.3, -0.5);
    rTail.rotation.x = 0.14;
    headMesh.add(rTail);
  }

  // Wearable catalog accessories. These are deliberately separate meshes
  // parented to the rig so they follow head/body animation and are also
  // cloned into every social/profile preview through the same props.
  const addHeadBox = (
    size: [number, number, number],
    pos: [number, number, number],
    color: number,
    rotation = 0,
  ) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat(color, 0.62));
    mesh.position.set(...pos);
    mesh.rotation.z = rotation;
    headMesh.add(mesh);
  };
  if (
    equipped.has("acc-cat-ears") ||
    equipped.has("acc-bear") ||
    equipped.has("acc-wolf") ||
    equipped.has("acc-bunny")
  ) {
    const color = equipped.has("acc-bunny")
      ? 0xf5f5f5
      : equipped.has("acc-cat-ears")
        ? 0xfb7185
        : equipped.has("acc-wolf")
          ? 0x94a3b8
          : 0xd97706;
    addHeadBox([0.22, 0.42, 0.22], [-0.34, 0.88, 0], color, -0.18);
    addHeadBox([0.22, 0.42, 0.22], [0.34, 0.88, 0], color, 0.18);
  }
  if (equipped.has("face-visor") || equipped.has("face-glasses") || equipped.has("face-mask")) {
    const color = equipped.has("face-visor")
      ? 0x38bdf8
      : equipped.has("face-glasses")
        ? 0xfbbf24
        : 0x1e293b;
    addHeadBox(
      [0.82, equipped.has("face-mask") ? 0.28 : 0.16, 0.06],
      [0, equipped.has("face-mask") ? -0.02 : 0.08, 0.51],
      color,
    );
  }
  if (equipped.has("face-freckles")) {
    const freckles = mat(0xc2410c, 0.82);
    for (const x of [-0.22, -0.08, 0.08, 0.22]) {
      const dot = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, 0.025), freckles);
      dot.position.set(x, -0.08 + Math.abs(x) * 0.08, 0.515);
      headMesh.add(dot);
    }
  }

  // ── V2 BODY DETAILS ─────────────────────────────────────────────────────
  // Belt — thin strip at waist with buckle detail
  const beltMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    roughness: 0.6,
    metalness: 0.1,
  });
  const beltBuckleMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    roughness: 0.35,
    metalness: 0.7,
  });
  const belt = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.1, 0.58), beltMat);
  belt.position.y = -0.4; // bottom of torso
  belt.castShadow = true;
  torsoGroup.add(belt);
  // Buckle
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.04), beltBuckleMat);
  buckle.position.set(0, -0.4, 0.3);
  buckle.castShadow = true;
  torsoGroup.add(buckle);

  // Collar/neck detail — raised ring at top of torso
  const collarMat = new THREE.MeshStandardMaterial({
    color: p.shirtTrim,
    roughness: 0.62,
    metalness: 0.04,
  });
  const collar = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.12, 0.58), collarMat);
  collar.position.y = 0.78; // top of torso
  collar.castShadow = true;
  torsoGroup.add(collar);

  if (topId && topId !== "top-white-tee") {
    const outer = new THREE.Mesh(new THREE.BoxGeometry(1.18, 1.48, 0.6), mat(p.shirt, 0.72));
    outer.position.y = 0.01;
    outer.castShadow = true;
    torsoGroup.add(outer);
    if (
      topId === "top-striped-polo" ||
      topId === "top-sport-jersey" ||
      topId === "top-galaxy-tee"
    ) {
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.16, 0.035),
        mat(p.shirtTrim, 0.62),
      );
      stripe.position.set(0, 0.22, 0.315);
      torsoGroup.add(stripe);
    }
  }

  if (equipped.has("mag-flower") || equipped.has("mag-star")) {
    const flower = equipped.has("mag-flower");
    const star = equipped.has("mag-star");
    const haloColor = equipped.has("mag-halo") ? 0xfde047 : flower ? 0xec4899 : 0xfbbf24;
    const haloGroup = new THREE.Group();
    haloGroup.position.set(0, 1.18, 0);
    headAccessoryGroup.add(haloGroup);
    // Blocky halo: chunky gold segments with small gaps read better at
    // mobile preview scale than a smooth torus.
    const segmentCount = flower ? 8 : 10;
    for (let i = 0; i < segmentCount; i++) {
      const a = (i / segmentCount) * Math.PI * 2;
      const segment = new THREE.Mesh(
        new THREE.BoxGeometry(flower ? 0.22 : 0.25, flower ? 0.1 : 0.12, flower ? 0.13 : 0.15),
        mat(haloColor, 0.3, 0.42),
      );
      segment.position.set(Math.cos(a) * 0.4, Math.sin(a) * 0.4, 0);
      segment.rotation.z = a;
      segment.castShadow = true;
      haloGroup.add(segment);
    }
    const trailMat = new THREE.MeshBasicMaterial({
      color: haloColor,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    for (let i = 0; i < 4; i++) {
      const trail = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.32 - i * 0.05, 0.035),
        trailMat.clone(),
      );
      trail.position.set(-0.54 + i * 0.36, -0.34 - i * 0.07, 0.01);
      trail.rotation.z = -0.45;
      haloGroup.add(trail);
    }
    if (flower || star) {
      for (let i = 0; i < (flower ? 6 : 4); i++) {
        const a = (i / (flower ? 6 : 4)) * Math.PI * 2;
        const petal = new THREE.Mesh(
          new THREE.BoxGeometry(flower ? 0.12 : 0.08, flower ? 0.16 : 0.12, 0.06),
          mat(haloColor, 0.42, 0.15),
        );
        petal.position.set(Math.cos(a) * 0.42, 1.18 + Math.sin(a) * 0.42, 0);
        petal.rotation.z = a;
        headAccessoryGroup.add(petal);
      }
    }
  }

  // Wristband — left arm
  const wristMat = new THREE.MeshStandardMaterial({
    color: p.shirtTrim,
    roughness: 0.55,
    metalness: 0.08,
  });
  const lWrist = new THREE.Mesh(new THREE.BoxGeometry(armW + 0.04, 0.12, armW + 0.04), wristMat);
  lWrist.position.y = -(armH / 2) + 0.06; // near the end of arm
  leftArm.add(lWrist);
  const rWrist = new THREE.Mesh(
    new THREE.BoxGeometry(armW + 0.04, 0.12, armW + 0.04),
    wristMat.clone(),
  );
  rWrist.position.y = -(armH / 2) + 0.06;
  rightArm.add(rWrist);

  // Shoe lace accent — raised bar across each shoe
  const laceMat = new THREE.MeshStandardMaterial({
    color: p.shoeAcc,
    roughness: 0.55,
    metalness: 0.15,
  });
  const lLace = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.06, 0.04), laceMat);
  lLace.position.set(0, -(legH / 2) + 0.14, 0.26);
  leftLeg.add(lLace);
  const rLace = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.06, 0.04), laceMat.clone());
  rLace.position.set(0, -(legH / 2) + 0.14, 0.26);
  rightLeg.add(rLace);

  // Knee pad — subtle raised square on each leg mid-thigh
  const kneeMat = new THREE.MeshStandardMaterial({
    color: p.shortsTrim,
    roughness: 0.65,
    metalness: 0,
  });
  const lKnee = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.2, 0.06), kneeMat);
  lKnee.position.set(0, -(legH / 2) + 0.48, 0.27);
  leftLeg.add(lKnee);
  const rKnee = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.2, 0.06), kneeMat.clone());
  rKnee.position.set(0, -(legH / 2) + 0.48, 0.27);
  rightLeg.add(rKnee);

  return {
    root,
    headGroup,
    torsoGroup,
    backAccessoryGroup,
    headAccessoryGroup,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
  };
}

/**
 * Canonical player character copied from the uploaded HTML reference.
 * Do not branch this builder by gender: the old male/female rigs are retired.
 */
function buildPastedHtmlCharacter(
  scene: THREE.Scene,
  tint?: string,
  skinId?: string | null,
  faceId = 0,
  showBandana = false,
  equippedItemIds: string[] = [],
  equippedPants?: string | null,
): CharRefs {
  const p: Pal = {
    skin: 0xffcc99,
    skinDark: 0xe3a172,
    hair: 0x3b82f6,
    hairShad: 0x2563eb,
    hairHi: 0x93c5fd,
    shirt: 0xffffff,
    shirtTrim: 0xf1f5f9,
    shorts: 0x334155,
    shortsTrim: 0x1e293b,
    shoes: 0x0f172a,
    shoeAcc: 0xffffff,
  };
  const skinDef = skinId ? SKINS.find((skin) => skin.id === skinId) : undefined;
  if (skinDef) {
    p.skin = Number.parseInt(skinDef.colors.head.replace("#", ""), 16);
    p.skinDark = Math.max(0, p.skin - 0x181008);
    p.shirt = Number.parseInt(skinDef.colors.torso.replace("#", ""), 16);
    p.shirtTrim = Number.parseInt(skinDef.accent.replace("#", ""), 16);
    p.shorts = Number.parseInt(skinDef.colors.leg.replace("#", ""), 16);
    p.shortsTrim = Number.parseInt(skinDef.accent.replace("#", ""), 16);
    if (skinDef.shoes) {
      p.shoes = Number.parseInt(skinDef.shoes.base.replace("#", ""), 16);
      p.shoeAcc = Number.parseInt(skinDef.shoes.accent.replace("#", ""), 16);
    }
    if (skinDef.hair) {
      p.hair = Number.parseInt(skinDef.hair.base.replace("#", ""), 16);
      p.hairShad = Number.parseInt(skinDef.hair.shadow.replace("#", ""), 16);
      p.hairHi = Number.parseInt(skinDef.hair.highlight.replace("#", ""), 16);
    }
  }
  const equipped = new Set(equippedItemIds);
  const equippedTopId = equippedItemIds.find((id) => id.startsWith("top-") || id.endsWith("-top"));
  const topId = equippedTopId ?? skinDef?.topId;
  const topColors: Record<string, [number, number]> = {
    "top-dark-hoodie": [0x1c1917, 0x0c0a09],
    "top-sakura-hoodie": [0xf472b6, 0x701a75],
    "top-neon-grid": [0x22d3ee, 0x312e81],
    "top-remlev-bomber": [0x334155, 0x0f172a],
    "top-striped-polo": [0x3b82f6, 0x1d4ed8],
    "top-sport-jersey": [0x22c55e, 0x15803d],
    "top-galaxy-tee": [0x7c3aed, 0x4c1d95],
  };
  const pantsColors: Record<string, [number, number]> = {
    "pants-classic": [0x334155, 0x1e293b],
    "pants-black-skinny": [0x111827, 0x030712],
    "pants-cyan-cargo": [0x06b6d4, 0x164e63],
    "pants-ember-jeans": [0xf97316, 0x7c2d12],
    "pants-lilac-wide": [0xc084fc, 0x581c87],
    "pants-tuxedo": [0x0f172a, 0x020617],
  };
  const topPalette = topId ? topColors[topId] : undefined;
  const pantsPalette = equippedPants ? pantsColors[equippedPants] : undefined;
  if (topPalette) {
    p.shirt = topPalette[0];
    p.shirtTrim = topPalette[1];
  }
  if (pantsPalette) {
    p.shorts = pantsPalette[0];
    p.shortsTrim = pantsPalette[1];
  }
  if (skinId === "skin-6666-doraemon") {
    p.shirt = 0x1878c9;
    p.shirtTrim = 0xef3340;
    p.shorts = 0x1261a8;
    p.shortsTrim = 0xef3340;
    p.shoes = 0xf7f9ff;
    p.shoeAcc = 0xef3340;
  }
  if (tint) p.shorts = new THREE.Color(tint).lerp(new THREE.Color(p.shorts), 0.65).getHex();

  const skinMaterial = tmat(makePastedSkinTex(p), 0.7);
  const shirtMaterial = tmat(makePastedShirtTex(p, topId, skinId), 1.0);
  const pantsMaterial = tmat(makePastedFabricTex(p.shorts, p.shortsTrim, true), 1.0);
  const shoeMaterial = tmat(makePastedFabricTex(p.shoes, p.shoeAcc, true), 0.4);

  const root = new THREE.Group();
  root.position.y = -0.45;
  scene.add(root);

  const torsoGroup = new THREE.Group();
  // Keep the authored body at the same pivot used by the animation loop.
  // The previous 0.50 offset was being overwritten every frame, which made
  // the head, hair, limbs, and back accessories appear detached.
  torsoGroup.position.y = 0.28;
  root.add(torsoGroup);
  const torsoFront = shirtMaterial;
  const torso = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.4, 0.5), [
    torsoFront,
    torsoFront,
    torsoFront,
    torsoFront,
    torsoFront,
    torsoFront,
  ]);
  torso.castShadow = true;
  torso.receiveShadow = true;
  torsoGroup.add(torso);

  const armGeo = new THREE.BoxGeometry(0.35, 0.8, 0.35);
  const leftArm = new THREE.Group();
  leftArm.position.set(0.65, 0.6, 0);
  torsoGroup.add(leftArm);
  const leftArmMesh = new THREE.Mesh(armGeo, shirtMaterial);
  leftArmMesh.position.y = -0.4;
  leftArmMesh.castShadow = true;
  leftArm.add(leftArmMesh);
  const leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.35, 0.3), skinMaterial);
  leftHand.position.y = -0.95;
  leftHand.castShadow = true;
  leftArm.add(leftHand);
  const rightArm = new THREE.Group();
  rightArm.position.set(-0.65, 0.6, 0);
  torsoGroup.add(rightArm);
  const rightArmMesh = new THREE.Mesh(armGeo, shirtMaterial.clone());
  rightArmMesh.position.y = -0.4;
  rightArmMesh.castShadow = true;
  rightArm.add(rightArmMesh);
  const rightHand = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.35, 0.3), skinMaterial.clone());
  rightHand.position.y = -0.95;
  rightHand.castShadow = true;
  rightArm.add(rightHand);

  const pelvisGroup = new THREE.Group();
  pelvisGroup.position.y = -0.7;
  torsoGroup.add(pelvisGroup);
  const leftLeg = new THREE.Group();
  leftLeg.position.set(0.25, 0, 0);
  pelvisGroup.add(leftLeg);
  const rightLeg = new THREE.Group();
  rightLeg.position.set(-0.25, 0, 0);
  pelvisGroup.add(rightLeg);
  const legGeo = new THREE.BoxGeometry(0.45, 1.0, 0.45);
  for (const leg of [leftLeg, rightLeg]) {
    const mesh = new THREE.Mesh(legGeo, pantsMaterial.clone());
    mesh.position.y = -0.5;
    mesh.castShadow = true;
    leg.add(mesh);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.6), shoeMaterial.clone());
    shoe.position.set(0, -1.15, 0.05);
    shoe.castShadow = true;
    leg.add(shoe);
  }

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.7, 0);
  torsoGroup.add(headGroup);
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.3), skinMaterial.clone());
  neck.position.y = 0.1;
  neck.castShadow = true;
  headGroup.add(neck);
  const headAccessoryGroup = new THREE.Group();
  headGroup.add(headAccessoryGroup);
  const backAccessoryGroup = new THREE.Group();
  torsoGroup.add(backAccessoryGroup);
  buildReferenceAccessories(headAccessoryGroup, p);
  const face = tmat(makePastedFaceTex(skinDef?.faceId ?? faceId, hx(p.skin), hx(p.hair)), 0.5);
  const hairMaterial = tmat(makePastedHairTex(p), 0.9);
  const head = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), [
    skinMaterial,
    skinMaterial,
    hairMaterial,
    skinMaterial,
    face,
    skinMaterial,
  ]);
  head.position.y = 0.8;
  head.castShadow = true;
  headGroup.add(head);
  buildPastedHair(head, p);

  // Retain wearable interactions, but layer them on the pasted character.
  const addHeadBox = (
    size: [number, number, number],
    pos: [number, number, number],
    color: number,
  ) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat(color, 0.62));
    mesh.position.set(...pos);
    head.add(mesh);
  };
  if (skinDef?.accessory) {
    const accessoryColor = Number.parseInt(skinDef.accessory.color.replace("#", ""), 16);
    if (skinDef.accessory.kind === "cap") {
      addHeadBox([1.08, 0.18, 1.08], [0, 0.99, 0], accessoryColor);
    } else if (skinDef.accessory.kind === "brim") {
      addHeadBox([1.3, 0.1, 1.08], [0, 0.82, 0.02], accessoryColor);
      addHeadBox([0.82, 0.28, 0.82], [0, 1.0, -0.02], accessoryColor);
    } else if (skinDef.accessory.kind === "visor") {
      addHeadBox([0.9, 0.14, 0.1], [0, 0.06, 0.53], accessoryColor);
    } else {
      addHeadBox([1.02, 0.24, 0.06], [0, 0.01, 0.53], accessoryColor);
    }
  }
  if (
    equipped.has("acc-cat-ears") ||
    equipped.has("acc-bear") ||
    equipped.has("acc-wolf") ||
    equipped.has("acc-bunny")
  ) {
    const color = equipped.has("acc-bunny")
      ? 0xf5f5f5
      : equipped.has("acc-cat-ears")
        ? 0xfb7185
        : 0x94a3b8;
    addHeadBox([0.22, 0.42, 0.22], [-0.34, 0.88, 0], color);
    addHeadBox([0.22, 0.42, 0.22], [0.34, 0.88, 0], color);
  }
  if (equipped.has("face-visor") || equipped.has("face-glasses") || equipped.has("face-mask")) {
    const color = equipped.has("face-visor")
      ? 0x38bdf8
      : equipped.has("face-glasses")
        ? 0xfbbf24
        : 0x1e293b;
    addHeadBox(
      [0.82, equipped.has("face-mask") ? 0.28 : 0.16, 0.06],
      [0, equipped.has("face-mask") ? -0.02 : 0.08, 0.51],
      color,
    );
  }
  if (equipped.has("face-freckles") || equipped.has("face-blush")) {
    const color = equipped.has("face-blush") ? 0xfb7185 : 0xf97316;
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        addHeadBox(
          [0.035, 0.035, 0.025],
          [side * (0.3 + i * 0.08), -0.1 + (i % 2) * 0.05, 0.615],
          color,
        );
      }
    }
  }
  if (equipped.has("face-tears")) {
    for (const side of [-1, 1]) {
      const tear = new THREE.Mesh(
        new THREE.BoxGeometry(0.07, 0.2, 0.035),
        new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          emissive: 0x0284c7,
          emissiveIntensity: 0.22,
          roughness: 0.3,
        }),
      );
      tear.position.set(side * 0.29, -0.18, 0.615);
      tear.rotation.z = side * -0.1;
      head.add(tear);
    }
  }
  if (equipped.has("face-bandage")) {
    addHeadBox([0.25, 0.11, 0.035], [0.28, 0.18, 0.615], 0xfef3c7);
    addHeadBox([0.07, 0.07, 0.04], [0.28, 0.18, 0.638], 0xf59e0b);
  }
  if (equipped.has("acc-headphones")) {
    const headphones = new THREE.Group();
    headphones.position.set(0, 0.42, 0);
    headAccessoryGroup.add(headphones);
    const headphoneMat = mat(0x334155, 0.3, 0.18);
    const headphoneGlow = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.7,
      roughness: 0.24,
      metalness: 0.16,
    });
    const band = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.12, 0.18), headphoneMat);
    band.position.y = 0.78;
    headphones.add(band);
    for (const side of [-1, 1]) {
      const cup = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.36, 0.3), headphoneMat.clone());
      cup.position.set(side * 0.55, 0.3, 0);
      headphones.add(cup);
      const light = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.2, 0.18), headphoneGlow.clone());
      light.position.set(side * 0.65, 0.3, 0.17);
      headphones.add(light);
    }
  }
  if (showBandana) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.24, 0.04), mat(0x1a0a2e));
    band.position.set(0, 0.01, 0.51);
    head.add(band);
  }
  return {
    root,
    headGroup,
    torsoGroup,
    backAccessoryGroup,
    headAccessoryGroup,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
  };
}

export type AvatarModelOptions = {
  tint?: string;
  skinId?: string | null;
  faceId?: number;
  gender?: "male" | "female";
  showBandana?: boolean;
  equippedItemIds?: string[];
  equippedPants?: string | null;
};

/** Build the high-quality QBLOCK avatar rig used by previews and game-world players. */
export function createAvatarModel(scene: THREE.Scene, options: AvatarModelOptions = {}) {
  return buildPastedHtmlCharacter(
    scene,
    options.tint,
    options.skinId,
    options.faceId ?? 0,
    options.showBandana ?? false,
    options.equippedItemIds ?? [],
    options.equippedPants ?? null,
  );
}

// ─── RigPreview component ─────────────────────────────────────────────────────
export function RigPreview({
  height = 240,
  className,
  tint,
  skinId,
  faceId = 0,
  walkSpeed = 0,
  dance = null,
  death: _death = false,
  focusZone,
  autoRotate = true,
  style,
  showBandana = false,
  equippedItemIds = [],
  equippedPants,
  hairTint,
}: {
  height?: number;
  className?: string;
  tint?: string;
  skinId?: string | null;
  faceId?: number;
  customSkinUrl?: string | null;
  walkSpeed?: number;
  dance?: string | null;
  death?: boolean;
  gender?: "male" | "female";
  focusZone?: "full" | "head" | "torso" | "legs";
  autoRotate?: boolean;
  style?: React.CSSProperties;
  showBandana?: boolean;
  equippedItemIds?: string[];
  equippedPants?: string | null;
  hairTint?: string;
}) {
  return (
    <Avatar3D
      height={height}
      className={className ?? "w-full"}
      tint={tint}
      skinId={skinId}
      faceId={faceId}
      hairColor={hairTint}
      equippedItemIds={equippedItemIds}
      equippedPants={equippedPants}
      showBandana={showBandana}
      autoRotate={autoRotate}
      interactive={true}
      focusZone={focusZone}
      playWalkAnimation={walkSpeed > 0 || !dance}
      style={style}
    />
  );
}

function LegacyUnusedRigPreview(
  height?: number,
  tint?: string,
  skinId?: string | null,
  faceId?: number,
  showBandana?: boolean,
  equippedItemIds: string[] = [],
  equippedPants?: string | null,
  hairTint?: string,
  autoRotate = true,
  focusZone?: string,
  gender = "male",
  style?: React.CSSProperties,
  className?: string,
  walkSpeed = 0,
  dance: string | null = null,
  death = false,
) {
  // Live refs for focus-zone camera and auto-rotate — updated each render
  const focusZoneRef = useRef<string>(focusZone ?? "full");
  focusZoneRef.current = focusZone ?? "full";
  const autoRotateRef = useRef(autoRotate);
  autoRotateRef.current = autoRotate;
  const camPosRef = useRef(new THREE.Vector3(0, 0.3, 6.2));
  const camAtRef = useRef(new THREE.Vector3(0, -0.4, 0));
  const _camTgtPos = useRef(new THREE.Vector3(0, 0.3, 6.2));
  const _camTgtAt = useRef(new THREE.Vector3(0, -0.4, 0));
  const mountRef = useRef<HTMLDivElement | null>(null);
  const isDragRef = useRef(false);
  const dragLastX = useRef(0);
  const rotYRef = useRef(0);
  const walkRef = useRef(walkSpeed);
  walkRef.current = walkSpeed;
  const danceRef = useRef<string | null>(dance);
  danceRef.current = dance;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const initialW = Math.max(
      mount.clientWidth || 0,
      typeof height === "number" && height > 0 ? height : 300,
    );
    const initialH = Math.max(
      mount.clientHeight || 0,
      typeof height === "number" && height > 0 ? height : 300,
    );

    // ── Scene ──────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = null;

    // ── Camera ─────────────────────────────────────────────────────────────
    // Pulled back and raised to frame the full body comfortably in preview
    const camera = new THREE.PerspectiveCamera(36, initialW / initialH, 0.1, 100);
    camera.position.set(0, 0.3, 6.2);
    camera.lookAt(0, -0.4, 0);

    // ── Renderer ───────────────────────────────────────────────────────────
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 3));
    renderer.setSize(initialW, initialH);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.28;
    // Preview lighting stays crisp and graphic. Hard shadow maps made the
    // avatar read muddy inside small home/events cards.
    renderer.shadowMap.enabled = false;
    mount.appendChild(renderer.domElement);

    // ── Lighting ───────────────────────────────────────────────────────────
    scene.add(new THREE.HemisphereLight(0xb4d8ff, 0x8bc34a, 1.1));
    const sun = new THREE.DirectionalLight(0xffffff, 1.35);
    sun.position.set(4, 8, 6);
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xdbeafe, 0.45);
    fill.position.set(-4, 3, -4);
    scene.add(fill);

    // ── Character ─────────────────────────────────────────────────────────
    const {
      root,
      headGroup,
      torsoGroup,
      backAccessoryGroup,
      headAccessoryGroup,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
    } = buildPastedHtmlCharacter(
      scene,
      tint,
      skinId,
      faceId,
      showBandana,
      equippedItemIds,
      equippedPants,
    );

    // Uploaded accessories are enhancement assets, not startup dependencies.
    // The QBLOCK procedural character is the source of truth; GLBs are only
    // used for optional accessory geometry.
    const accessoryMixers: THREE.AnimationMixer[] = [];
    const accessoryDisposed = false;
    const wantsWings = equippedItemIds.includes("mag-wings") || equippedItemIds.includes("wings");
    void Promise.all([
      wantsWings ? loadAccessory(wingAssetUrl).catch(() => null) : Promise.resolve(null),
    ])
      .then(([wingAsset]) => {
        if (accessoryDisposed) return;
        if (wingAsset) {
          const wingModel = prepareAccessory(
            wingAsset.scene,
            backAccessoryGroup,
            // Neatly proportioned wings fitted comfortably to character back
            new THREE.Vector3(3.8, 3.4, 0.9),
            new THREE.Vector3(0, 0.45, -0.65),
            Math.PI,
          );
          const wingTexture = loadQblockTexture(qblockWingUrl);
          wingModel.traverse((object) => {
            const mesh = object as THREE.Mesh;
            if (!mesh.isMesh) return;
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            mesh.material = materials.map((material) => {
              const cloned = material.clone() as THREE.MeshStandardMaterial;
              cloned.map = wingTexture;
              cloned.color.set(0xffffff);
              cloned.needsUpdate = true;
              return cloned;
            });
          });
          if (wingAsset.animations.length) {
            const mixer = new THREE.AnimationMixer(wingModel);
            const clip =
              wingAsset.animations.find((candidate) =>
                /stand|idle|fly|flap/i.test(candidate.name),
              ) ?? wingAsset.animations[0];
            mixer.clipAction(clip).play();
            accessoryMixers.push(mixer);
          }
        }
      })
      .catch(() => {
        // The uploaded rig remains usable if the optional wing geometry is
        // unavailable on a slow/offline device.
      });

    // ── Drag interaction ──────────────────────────────────────────────────
    const canvas = renderer.domElement;
    canvas.style.touchAction = "none";
    canvas.style.cursor = "grab";
    const onPDown = (e: PointerEvent) => {
      isDragRef.current = true;
      dragLastX.current = e.clientX;
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = "grabbing";
    };
    const onPMove = (e: PointerEvent) => {
      if (!isDragRef.current) return;
      rotYRef.current += (e.clientX - dragLastX.current) * 0.013;
      dragLastX.current = e.clientX;
    };
    const onPUp = (e: PointerEvent) => {
      isDragRef.current = false;
      canvas.releasePointerCapture(e.pointerId);
      canvas.style.cursor = "grab";
    };
    canvas.addEventListener("pointerdown", onPDown);
    canvas.addEventListener("pointermove", onPMove);
    canvas.addEventListener("pointerup", onPUp);
    canvas.addEventListener("pointercancel", onPUp);

    // ── Resize ────────────────────────────────────────────────────────────
    const onResize = () => {
      if (!mount) return;
      const nw = mount.clientWidth || (typeof height === "number" && height > 0 ? height : 300);
      const nh = mount.clientHeight || (typeof height === "number" && height > 0 ? height : 300);
      if (nw > 0 && nh > 0) {
        camera.aspect = nw / nh;
        camera.updateProjectionMatrix();
        renderer.setSize(nw, nh);
      }
    };
    window.addEventListener("resize", onResize);
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        onResize();
      });
      resizeObserver.observe(mount);
    }

    // ── Animation loop ────────────────────────────────────────────────────
    const clock = new THREE.Clock();
    let raf = 0;
    let disposed = false;
    let wasDancing = false;
    let danceElapsed = 0;

    function tick() {
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;
      const spd = walkRef.current;
      const d = danceRef.current;
      accessoryMixers.forEach((mixer) => mixer.update(dt));
      headAccessoryGroup.rotation.y = Math.sin(t * 1.8) * 0.025;
      backAccessoryGroup.rotation.y = Math.sin(t * 3.4) * 0.05;
      backAccessoryGroup.rotation.x = Math.sin(t * 2.1) * 0.025;

      // auto slow-rotate when not dragging
      if (!isDragRef.current && autoRotateRef.current) rotYRef.current += dt * 0.3;
      root.rotation.y = rotYRef.current;

      // ── Smooth focus-zone camera lerp ─────────────────────────────────────
      const CAM_ZONES = {
        full: { p: [0, 0.3, 6.2] as const, a: [0, -0.4, 0] as const },
        head: { p: [0, 1.8, 3.0] as const, a: [0, 1.45, 0] as const },
        torso: { p: [0, 0.45, 3.6] as const, a: [0, 0.1, 0] as const },
        legs: { p: [0, -0.9, 3.2] as const, a: [0, -1.1, 0] as const },
      };
      const zKey = focusZoneRef.current as keyof typeof CAM_ZONES;
      const zt = CAM_ZONES[zKey] ?? CAM_ZONES.full;
      _camTgtPos.current.set(zt.p[0], zt.p[1], zt.p[2]);
      _camTgtAt.current.set(zt.a[0], zt.a[1], zt.a[2]);
      const lk = Math.min(1, dt * 5.0);
      camPosRef.current.lerp(_camTgtPos.current, lk);
      camAtRef.current.lerp(_camTgtAt.current, lk);
      camera.position.copy(camPosRef.current);
      camera.lookAt(camAtRef.current);

      // reset torso/head every frame before applying anim
      torsoGroup.rotation.set(0, 0, 0);
      torsoGroup.scale.set(1, 1, 1);
      torsoGroup.position.set(0, 0.28, 0);
      headGroup.rotation.set(0, 0, 0);

      if (d) {
        // ── Dance ─────────────────────────────────────────────────────────
        if (!wasDancing) {
          wasDancing = true;
          danceElapsed = 0;
        }
        danceElapsed += dt;

        if (d === "shuffle") {
          root.position.y = -0.45 + Math.abs(Math.sin(t * 7)) * 0.2;
          root.rotation.z = Math.sin(t * 3.5) * 0.3;
          leftArm.rotation.x = Math.sin(t * 7) * 0.75;
          leftArm.rotation.z = -0.5 + Math.sin(t * 3.5) * 0.28;
          rightArm.rotation.x = Math.sin(t * 7 + Math.PI) * 0.75;
          rightArm.rotation.z = 0.5 + Math.sin(t * 3.5) * 0.28;
          leftLeg.rotation.x = Math.sin(t * 7) * 0.48;
          rightLeg.rotation.x = Math.sin(t * 7 + Math.PI) * 0.48;
          headGroup.rotation.z = Math.sin(t * 3.5) * 0.14;
        } else if (d === "dinky") {
          // A compact, playful loop for profile/home previews: springy knees,
          // tiny shoulder wiggles, and a curious head tilt.
          const hop = Math.abs(Math.sin(t * 4.6));
          root.position.y = -0.45 + hop * 0.1;
          root.rotation.z = Math.sin(t * 2.3) * 0.08;
          torsoGroup.scale.set(1 + hop * 0.018, 1 - hop * 0.025, 1 + hop * 0.018);
          headGroup.rotation.z = Math.sin(t * 2.3 + 0.55) * 0.12;
          headGroup.rotation.y = Math.sin(t * 1.7) * 0.18;
          leftArm.rotation.x = Math.sin(t * 4.6 + 0.7) * 0.2;
          rightArm.rotation.x = Math.sin(t * 4.6 + Math.PI + 0.7) * 0.2;
          leftArm.rotation.z = -0.05 - hop * 0.04;
          rightArm.rotation.z = 0.05 + hop * 0.04;
          leftLeg.rotation.x = Math.sin(t * 4.6) * 0.16;
          rightLeg.rotation.x = Math.sin(t * 4.6 + Math.PI) * 0.16;
        } else if (d === "wave") {
          root.position.y = -0.45 + Math.sin(t * 2.2) * 0.07;
          leftArm.rotation.x = -1.2 + Math.sin(t * 2.8) * 0.65;
          leftArm.rotation.z = -0.8 + Math.sin(t * 2.8 + 0.9) * 0.55;
          rightArm.rotation.x = Math.sin(t * 2.2) * 0.25;
          rightArm.rotation.z = 0.22;
          leftLeg.rotation.x = Math.sin(t * 2.2) * 0.1;
          rightLeg.rotation.x = -Math.sin(t * 2.2) * 0.1;
          headGroup.rotation.y = Math.sin(t * 2.8) * 0.3;
        } else if (d === "sparkle") {
          const CYCLE = 2.5;
          const phase = (t % CYCLE) / CYCLE;
          const arc = Math.sin(phase * Math.PI);
          root.position.y = -0.45 + arc * 0.34;
          leftArm.rotation.x = -arc * 1.25;
          leftArm.rotation.z = -(0.25 + arc * 0.65);
          rightArm.rotation.x = -arc * 1.25;
          rightArm.rotation.z = 0.25 + arc * 0.65;
          leftLeg.rotation.x = arc * 0.42;
          rightLeg.rotation.x = arc * 0.42;
          headGroup.rotation.x = -arc * 0.22;
        } else if (d === "death") {
          // Reusable QBLOCK death beat: the character loses balance, drops,
          // and holds the final pose. Keeping it on the same refs as walk and
          // dance means game modes can trigger it without a second avatar rig.
          const progress = Math.min(danceElapsed / 1.15, 1);
          const ease = 1 - Math.pow(1 - progress, 3);
          root.position.y = -0.45 - ease * 0.48;
          root.rotation.z = -ease * 1.12;
          torsoGroup.rotation.z = -ease * 0.24;
          headGroup.rotation.z = ease * 0.3;
          headGroup.rotation.x = ease * 0.18;
          leftArm.rotation.x = ease * 0.22;
          rightArm.rotation.x = -ease * 0.22;
          leftArm.rotation.z = -ease * 0.18;
          rightArm.rotation.z = ease * 0.18;
          leftLeg.rotation.x = -ease * 0.12;
          rightLeg.rotation.x = ease * 0.12;
        }
      } else {
        // ── Idle / walk ───────────────────────────────────────────────────
        if (wasDancing) {
          wasDancing = false;
          danceElapsed = 0;
          root.position.y = -0.45;
          root.rotation.z = 0;
          root.rotation.x = 0;
        }

        const idle = spd < 0.05;
        if (idle) {
          // Reference idle: soft breathing plus a tiny “dinky” spring so the
          // avatar never reads as a static card illustration.
          const b = Math.sin(t * 2.0);
          const bounce = Math.abs(Math.sin(t * 2.3)) * 0.045;
          root.position.y = -0.45 + bounce;
          torsoGroup.scale.set(1 + b * 0.018, 1 + b * 0.012, 1 + b * 0.022);
          leftArm.rotation.z = -Math.abs(b * 0.035);
          rightArm.rotation.z = Math.abs(b * 0.035);
          leftArm.rotation.x = b * 0.035;
          rightArm.rotation.x = -b * 0.035;
          leftLeg.rotation.x = 0;
          rightLeg.rotation.x = 0;
          headGroup.rotation.x = b * 0.035;
          headGroup.rotation.z = Math.sin(t * 1.15) * 0.025;
        } else {
          // Walk cycle
          const w = Math.sin(t * 5.5 * spd);
          leftArm.rotation.x = w * 0.5;
          rightArm.rotation.x = -w * 0.5;
          leftLeg.rotation.x = -w * 0.48;
          rightLeg.rotation.x = w * 0.48;
          torsoGroup.position.y = 0.28 + Math.abs(Math.sin(t * 11 * spd)) * 0.18;
          leftArm.rotation.z = 0;
          rightArm.rotation.z = 0;
        }
      }

      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      resizeObserver?.disconnect();
      canvas.removeEventListener("pointerdown", onPDown);
      canvas.removeEventListener("pointermove", onPMove);
      canvas.removeEventListener("pointerup", onPUp);
      canvas.removeEventListener("pointercancel", onPUp);
      scene.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (m.isMesh) {
          m.geometry?.dispose();
          const mats = Array.isArray(m.material) ? m.material : [m.material];
          mats.forEach((mt: THREE.Material) => mt?.dispose());
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentElement === mount) mount.removeChild(renderer.domElement);
      void disposed;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gender, tint, skinId, faceId, showBandana, equippedItemIds, equippedPants, hairTint]);

  return (
    <div
      ref={mountRef}
      className={className ?? "w-full"}
      style={className ? style : { height, ...style }}
    />
  );
}
