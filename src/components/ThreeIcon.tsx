import { useEffect, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";

/**
 * Small uploaded 3D icon preview. It is deliberately self-contained and
 * guarded so the rest of Events/Redeem still works on browsers without WebGL.
 */
export function ThreeIcon({
  src,
  fallback,
  className = "h-12 w-12",
}: {
  src: string;
  fallback: ReactNode;
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: THREE.WebGLRenderer | null = null;
    let frame = 0;
    let disposed = false;

    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(56, 56, false);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.setClearColor(0x000000, 0);
      host.replaceChildren(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(24, 1, 0.01, 100);
      camera.position.set(0, 0.1, 4.5);

      scene.add(new THREE.HemisphereLight(0xffffff, 0xb8a36d, 2.4));
      const key = new THREE.DirectionalLight(0xffffff, 3.5);
      key.position.set(2, 3, 4);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0xffd95e, 1.2);
      fill.position.set(-3, 0, 2);
      scene.add(fill);

      const loader = new FBXLoader();
      loader.load(
        src,
        (model) => {
          if (disposed) return;
          const bounds = new THREE.Box3().setFromObject(model);
          const size = bounds.getSize(new THREE.Vector3());
          const center = bounds.getCenter(new THREE.Vector3());
          const maxSize = Math.max(size.x, size.y, size.z, 0.001);
          model.scale.setScalar(1.55 / maxSize);
          model.position.set(
            -center.x * model.scale.x,
            -center.y * model.scale.y,
            -center.z * model.scale.z,
          );
          model.traverse((object) => {
            const mesh = object as THREE.Mesh;
            if (!mesh.isMesh) return;
            mesh.castShadow = true;
            mesh.frustumCulled = false;
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            mesh.material = materials.map((material) => {
              const cloned = material.clone();
              if ("roughness" in cloned) cloned.roughness = 0.32;
              if ("metalness" in cloned) cloned.metalness = 0.08;
              return cloned;
            });
          });
          scene.add(model);
        },
        undefined,
        () => {
          if (!disposed) host.replaceChildren();
        },
      );

      const tick = () => {
        if (disposed || !renderer) return;
        const model = scene.children.find((child) => child.type === "Group");
        if (model) model.rotation.y += 0.012;
        renderer.render(scene, camera);
        frame = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      host.replaceChildren();
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      renderer?.dispose();
      host.replaceChildren();
    };
  }, [src]);

  return (
    <span
      className={`relative inline-grid shrink-0 place-items-center ${className}`}
      aria-hidden="true"
    >
      <span className="absolute inset-0 grid place-items-center">{fallback}</span>
      <span ref={hostRef} className="relative z-[1] h-14 w-14" />
    </span>
  );
}
