import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const PHOENIX_GLB_URL = "https://file.garden/alGOOylwpAfCa6qP/phoenix_on_fire_update.glb";

export function PhoenixLoadingVisual() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [modelLoaded, setModelLoaded] = useState(false);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 340;
    const height = container.clientHeight || 240;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 0.8, 3.4);
    camera.lookAt(0, 0.2, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    // Dynamic fire / amber illumination
    const ambientLight = new THREE.AmbientLight(0xffeedd, 1.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffa500, 2.5);
    dirLight.position.set(2, 4, 3);
    scene.add(dirLight);

    const flamePointLight = new THREE.PointLight(0xff5500, 4.0, 12, 1.2);
    flamePointLight.position.set(0, 0.5, 0);
    scene.add(flamePointLight);

    const blueRimLight = new THREE.PointLight(0x38bdf8, 1.8, 8);
    blueRimLight.position.set(-2, 1, -1);
    scene.add(blueRimLight);

    let mixer: THREE.AnimationMixer | null = null;
    let phoenixModel: THREE.Group | null = null;
    let animId: number = 0;
    const clock = new THREE.Clock();

    // Subtle floating ember particle sparks
    const particleCount = 28;
    const partGeo = new THREE.BufferGeometry();
    const partPositions = new Float32Array(particleCount * 3);
    const partVelocities: { x: number; y: number; z: number; life: number }[] = [];

    for (let i = 0; i < particleCount; i++) {
      partPositions[i * 3] = (Math.random() - 0.5) * 1.8;
      partPositions[i * 3 + 1] = Math.random() * 1.2 - 0.3;
      partPositions[i * 3 + 2] = (Math.random() - 0.5) * 1.4;
      partVelocities.push({
        x: (Math.random() - 0.5) * 0.2,
        y: 0.3 + Math.random() * 0.5,
        z: (Math.random() - 0.5) * 0.2,
        life: Math.random(),
      });
    }
    partGeo.setAttribute("position", new THREE.BufferAttribute(partPositions, 3));

    const partMat = new THREE.PointsMaterial({
      color: 0xffaa22,
      size: 0.055,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    const emberParticles = new THREE.Points(partGeo, partMat);
    scene.add(emberParticles);

    const loader = new GLTFLoader();
    loader.load(
      PHOENIX_GLB_URL,
      (gltf) => {
        phoenixModel = gltf.scene;

        const bounds = new THREE.Box3().setFromObject(phoenixModel);
        const size = bounds.getSize(new THREE.Vector3());
        const largestAxis = Math.max(size.x, size.y, size.z) || 1;
        phoenixModel.scale.setScalar(2.2 / largestAxis);

        bounds.setFromObject(phoenixModel);
        const center = bounds.getCenter(new THREE.Vector3());
        phoenixModel.position.sub(center);
        phoenixModel.position.y += 0.1;

        phoenixModel.traverse((node) => {
          if ((node as THREE.Mesh).isMesh) {
            const m = node as THREE.Mesh;
            m.castShadow = false;
            m.receiveShadow = false;
            if (m.material) {
              const mat = (m.material as THREE.MeshStandardMaterial).clone();
              mat.roughness = 0.25;
              mat.metalness = 0.4;
              mat.emissive = new THREE.Color(0xff4400);
              mat.emissiveIntensity = 0.35;
              m.material = mat;
            }
          }
        });

        const flightClip =
          gltf.animations.find(
            (c) =>
              c.name.toLowerCase().includes("flight") ||
              c.name.toLowerCase().includes("fly") ||
              c.name.toLowerCase().includes("takeoff"),
          ) || gltf.animations[0];

        if (flightClip) {
          mixer = new THREE.AnimationMixer(phoenixModel);
          const action = mixer.clipAction(flightClip);
          action.play();
        }

        scene.add(phoenixModel);
        setModelLoaded(true);
      },
      undefined,
      (err) => {
        console.warn("Could not load Phoenix in loading screen:", err);
      },
    );

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      const time = clock.getElapsedTime();

      if (mixer) mixer.update(dt * 1.15);

      if (phoenixModel) {
        // Soaring flight yaw & roll banking
        phoenixModel.rotation.y = Math.sin(time * 0.9) * 0.28 - 0.15;
        phoenixModel.rotation.z = Math.sin(time * 0.9) * -0.12;
        phoenixModel.position.y = Math.sin(time * 2.2) * 0.12;
      }

      // Animate embers rising
      const posAttr = partGeo.attributes.position as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        arr[i * 3 + 1] += partVelocities[i].y * dt;
        arr[i * 3] += partVelocities[i].x * dt;
        arr[i * 3 + 2] += partVelocities[i].z * dt;

        if (arr[i * 3 + 1] > 1.6) {
          arr[i * 3 + 1] = -0.3;
          arr[i * 3] = (Math.random() - 0.5) * 1.5;
          arr[i * 3 + 2] = (Math.random() - 0.5) * 1.2;
        }
      }
      posAttr.needsUpdate = true;

      flamePointLight.intensity = 3.6 + Math.sin(time * 12) * 0.6;

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 340;
      const h = container.clientHeight || 240;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animId);
      if (mixer) mixer.stopAllAction();
      renderer.dispose();
      partGeo.dispose();
      partMat.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="relative w-full max-w-[420px] h-[220px] sm:h-[260px] flex items-center justify-center">
      {/* Radiant flame ambient glow behind phoenix */}
      <div
        className="absolute inset-0 pointer-events-none rounded-full"
        style={{
          background: "radial-gradient(circle at 50% 50%, rgba(255, 90, 0, 0.38) 0%, rgba(255, 170, 0, 0.16) 45%, transparent 72%)",
          filter: "blur(24px)",
        }}
      />

      {/* 3D WebGL mount */}
      <div ref={mountRef} className="relative z-10 w-full h-full" />

      {/* Instant fallback glowing phoenix icon while WebGL asset buffers */}
      {!modelLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none animate-pulse">
          <div className="relative w-20 h-20 rounded-full bg-gradient-to-tr from-amber-600 via-orange-500 to-yellow-400 p-0.5 shadow-[0_0_40px_rgba(255,100,0,0.85)] flex items-center justify-center">
            <span className="text-3xl select-none">🔥</span>
          </div>
          <span className="mt-3 text-[12px] font-black tracking-widest uppercase text-amber-300 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
            Summoning Phoenix…
          </span>
        </div>
      )}
    </div>
  );
}
