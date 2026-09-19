import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";

const WING_MODEL_URL = "https://file.garden/alGOOylwpAfCa6qP/wing_379.glb";
const MODEL_URL = "/QBLOCK_Final_Corrected_1787676456656.glb";
const FALLBACK_MODEL_URL = "/QBLOCK_Final_Corrected_1787676456656.glb";
const TEXTURES = {
  shirt: "https://file.garden/alGOOylwpAfCa6qP/17C76B77-C43F-4828-A016-27B5F689E6AF.png",
  sleeves: "https://file.garden/alGOOylwpAfCa6qP/28390465-ED7C-4170-B8B2-630B34070949.png",
  shoes: "https://file.garden/alGOOylwpAfCa6qP/9335FF00-2848-4C98-B455-EA0DAD7FFC21.png",
  face: "https://file.garden/alGOOylwpAfCa6qP/1D669B89-1CDF-429A-A101-C72B474AC616.png",
  pants: "https://file.garden/alGOOylwpAfCa6qP/419E9927-DDD9-4884-B010-A05543069774.png",
  hands: "https://file.garden/alGOOylwpAfCa6qP/E4105FCF-D78D-4B6C-8777-491A4D6CFE00.png",
};

export interface PastedCharacterPreviewProps {
  className?: string;
  background?: boolean;
  lowered?: boolean;
  verticalShift?: number;
  showRotateHint?: boolean;
  autoRotate?: boolean;
  hairGradient?: "black" | "blue" | "red" | "verde-acqua" | string;
}

// Generate gradient texture dynamically
function createGradientTexture(type: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;

  const gradient = ctx.createLinearGradient(0, 0, 0, 256);
  if (type === "red") {
    gradient.addColorStop(0, "#f87171");
    gradient.addColorStop(0.5, "#dc2626");
    gradient.addColorStop(1, "#7f1d1d");
  } else if (type === "black") {
    gradient.addColorStop(0, "#374151");
    gradient.addColorStop(0.5, "#1f2937");
    gradient.addColorStop(1, "#111827");
  } else if (type === "blue") {
    gradient.addColorStop(0, "#bae6fd");
    gradient.addColorStop(0.4, "#60a5fa");
    gradient.addColorStop(1, "#38bdf8");
  } else {
    // Verde acqua gradient (default)
    gradient.addColorStop(0, "#7bf1a8");
    gradient.addColorStop(0.35, "#2dd4bf");
    gradient.addColorStop(0.7, "#0d9488");
    gradient.addColorStop(1, "#0f766e");
  }

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function PastedCharacterPreview({
  className = "",
  background = true,
  lowered = true,
  verticalShift = 0,
  showRotateHint = true,
  autoRotate = false,
  hairGradient = "verde-acqua",
}: PastedCharacterPreviewProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = Math.max(1, mount.clientWidth || 360);
    const height = Math.max(1, mount.clientHeight || 360);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 1000);

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

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.5));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.domElement.style.touchAction = "none";
    renderer.domElement.style.cursor = "grab";
    mount.appendChild(renderer.domElement);

    // Studio Lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfffbf0, 1.4);
    keyLight.position.set(4, 8, 7);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x94a3b8, 0.65);
    fillLight.position.set(-6, 2, -4);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.85);
    rimLight.position.set(0, 6, -8);
    scene.add(rimLight);

    // Texture loading
    const textureLoader = new THREE.TextureLoader();
    const loadedTextures: Record<string, THREE.Texture> = {};

    Object.entries(TEXTURES).forEach(([name, url]) => {
      const tex = textureLoader.load(url);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.generateMipmaps = true;
      if (name === "face") {
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.repeat.set(0.8, 0.8);
        tex.offset.set(0.1, 0.1);
      }
      loadedTextures[name] = tex;
    });

    const hairTexture = createGradientTexture(hairGradient);

    const gltfLoader = new GLTFLoader();
    const avatarRoot = new THREE.Group();
    scene.add(avatarRoot);

    let isLoaded = false;
    let modelHeight = 10;
    let dragging = false;
    let lastX = 0;
    let targetRotationY = 0;
    let currentRotationY = 0;
    let wingMixer: THREE.AnimationMixer | null = null;
    let walkMixer: THREE.AnimationMixer | null = null;

    const loadAvatarGLB = async () => {
      const urls = [FALLBACK_MODEL_URL, MODEL_URL];
      let gltfData: { scene: THREE.Group; animations: THREE.AnimationClip[] } | null = null;

      for (const url of urls) {
        try {
          gltfData = await new Promise((resolve, reject) => {
            gltfLoader.load(
              url,
              (gltf) => resolve({ scene: gltf.scene, animations: gltf.animations }),
              undefined,
              (err) => reject(err),
            );
          });
          if (gltfData) break;
        } catch {
          // retry fallback
        }
      }

      if (!gltfData) return;

      const object = skeletonClone(gltfData.scene) as THREE.Group;
      const bbox = new THREE.Box3().setFromObject(object);
      const center = bbox.getCenter(new THREE.Vector3());
      const size = bbox.getSize(new THREE.Vector3());

      modelHeight = Math.max(size.y, 1);
      object.position.set(-center.x, -center.y, -center.z);

      object.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.frustumCulled = false;

        const name = (mesh.name || "").toLowerCase();

        // Plain smooth gradient on hair/head, removing pixel textures from hair
        if (name.includes("hair") || name.includes("cap") || name.includes("pumpkin")) {
          mesh.material = new THREE.MeshStandardMaterial({
            map: hairTexture,
            roughness: 0.42,
            metalness: 0.08,
            side: THREE.DoubleSide,
          });
          return;
        }

        if (mesh.material) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mesh.material = mats.map((m) => {
            const standard = m.clone() as THREE.MeshStandardMaterial;
            if ("roughness" in standard)
              standard.roughness = Math.min(standard.roughness ?? 0.45, 0.42);
            if ("metalness" in standard)
              standard.metalness = Math.max(standard.metalness ?? 0, 0.04);
            return standard;
          });
        }
      });

      avatarRoot.add(object);

      if (gltfData.animations && gltfData.animations.length > 0) {
        walkMixer = new THREE.AnimationMixer(object);
        const walkClip =
          gltfData.animations.find((c) => /walk|run|move/i.test(c.name)) ?? gltfData.animations[0];
        if (walkClip) {
          walkMixer.clipAction(walkClip).play();
        }
      }

      // Load animated wings for character back
      const wingsPivot = new THREE.Group();
      wingsPivot.name = "character-wings";
      avatarRoot.add(wingsPivot);

      gltfLoader.load(
        WING_MODEL_URL,
        (gltf) => {
          const wingScene = gltf.scene;
          const wBounds = new THREE.Box3().setFromObject(wingScene);
          const wSize = wBounds.getSize(new THREE.Vector3());
          const targetWingSpan = size.x * 1.35;
          const wingScale = targetWingSpan / Math.max(wSize.x, 0.001);
          wingScene.scale.setScalar(wingScale);
          const scaledWBounds = new THREE.Box3().setFromObject(wingScene);
          const wCenter = scaledWBounds.getCenter(new THREE.Vector3());
          wingScene.position.sub(wCenter);
          wingScene.rotation.y = Math.PI;

          // Position with a little space on the back of the character
          wingsPivot.position.set(0, size.y * 0.16, -size.z * 0.42);
          wingsPivot.add(wingScene);

          if (gltf.animations.length) {
            const mixer = new THREE.AnimationMixer(wingScene);
            const clip =
              gltf.animations.find((c) => /idle|fly|flap/i.test(c.name)) ?? gltf.animations[0];
            mixer.clipAction(clip).play();
            wingMixer = mixer;
          }
        },
        undefined,
        (err) => console.warn("Failed to load wing model", err),
      );

      const fovRad = (camera.fov * Math.PI) / 180;
      const currentAspect = Math.max(0.1, width / height);

      const distForHeight = (size.y * 0.5) / Math.tan(fovRad * 0.5);
      const distForWidth = (size.x * 0.5) / (Math.tan(fovRad * 0.5) * currentAspect);
      const baseDistance = Math.max(distForHeight, distForWidth) * 1.32;

      camera.position.set(0, 0, baseDistance);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();

      const verticalDrop = lowered ? -size.y * 0.14 + verticalShift : verticalShift;
      avatarRoot.position.set(0, verticalDrop, 0);

      isLoaded = true;
    };

    void loadAvatarGLB();

    const canvas = renderer.domElement;

    const onDown = (event: PointerEvent) => {
      dragging = true;
      lastX = event.clientX;
      canvas.setPointerCapture(event.pointerId);
      canvas.style.cursor = "grabbing";
    };

    const onMove = (event: PointerEvent) => {
      if (!dragging) return;
      const deltaX = event.clientX - lastX;
      lastX = event.clientX;
      targetRotationY += deltaX * 0.012;
    };

    const onUp = (event: PointerEvent) => {
      dragging = false;
      try {
        canvas.releasePointerCapture(event.pointerId);
      } catch {}
      canvas.style.cursor = "grab";
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);

    let frameId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      if (wingMixer) {
        wingMixer.update(delta);
      }
      if (walkMixer) {
        walkMixer.update(delta);
      }

      if (autoRotate && !dragging) {
        targetRotationY += delta * 0.4;
      }

      currentRotationY += (targetRotationY - currentRotationY) * 0.18;
      avatarRoot.rotation.y = currentRotationY;

      if (isLoaded && !dragging) {
        const time = clock.getElapsedTime();
        const baseY = lowered ? -modelHeight * 0.14 + verticalShift : verticalShift;
        avatarRoot.position.y = baseY + Math.sin(time * 2.0) * (modelHeight * 0.008);

        const wings = avatarRoot.getObjectByName("character-wings");
        if (wings) {
          wings.rotation.y = Math.sin(time * 3.5) * 0.08;
          wings.rotation.x = Math.sin(time * 2.2) * 0.04;
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    const onResize = () => {
      if (!mount) return;
      const nextW = Math.max(1, mount.clientWidth);
      const nextH = Math.max(1, mount.clientHeight);
      camera.aspect = nextW / nextH;

      if (isLoaded) {
        const fovRad = (camera.fov * Math.PI) / 180;
        const currentAspect = Math.max(0.1, nextW / nextH);
        const distForHeight = (modelHeight * 0.5) / Math.tan(fovRad * 0.5);
        const baseDistance = distForHeight * (currentAspect < 1 ? 1.45 : 1.32);
        camera.position.z = baseDistance;
      }

      camera.updateProjectionMatrix();
      renderer.setSize(nextW, nextH);
    };

    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);

      scene.traverse((node) => {
        const mesh = node as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry?.dispose();
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach((m) => m?.dispose());
      });

      Object.values(loadedTextures).forEach((t) => t.dispose());
      hairTexture.dispose();
      renderer.dispose();
      if (canvas.parentElement === mount) {
        mount.removeChild(canvas);
      }
    };
  }, [lowered, verticalShift, autoRotate, hairGradient]);

  return (
    <div
      ref={mountRef}
      className={`relative h-full w-full overflow-hidden select-none ${className}`}
      style={
        background
          ? {
              border: "1px solid rgba(20,28,38,.075)",
              background:
                "radial-gradient(circle at 15% 0%, rgba(255,255,255,.98), transparent 38%), linear-gradient(180deg, rgba(255,255,255,.96), rgba(239,242,245,.92))",
              boxShadow: "0 7px 16px rgba(18,28,38,.065), inset 0 1px 0 rgba(255,255,255,.98)",
            }
          : undefined
      }
    >
      {/* Subtle stage floor shadow */}
      <div
        className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full"
        style={{
          width: 140,
          height: 24,
          background: "radial-gradient(ellipse, rgba(0,0,0,0.18) 0%, transparent 70%)",
          filter: "blur(4px)",
        }}
      />

      {showRotateHint && (
        <div
          className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-1.5 rounded-[10px] px-2.5 py-1 text-[10px] font-bold text-slate-700 shadow-sm"
          style={{
            background: "rgba(255,255,255,0.92)",
            border: "1px solid rgba(20,28,38,0.08)",
            boxShadow: "0 2px 6px rgba(0,0,0,0.06), inset 0 1px 0 #fff",
          }}
        >
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
          </svg>
          Drag to rotate
        </div>
      )}
    </div>
  );
}
