import React, { Component, type ErrorInfo, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { AVATAR_GLB_URL, type FocusZone } from "./Avatar3D";

type ModelProps = {
  focusZone: FocusZone;
  playWalkAnimation: boolean;
};

function LoadedQblockModel({ focusZone, playWalkAnimation }: ModelProps) {
  const { scene, animations } = useGLTF(AVATAR_GLB_URL);
  const model = useMemo(() => {
    const clone = skeletonClone(scene) as THREE.Group;
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    const bounds = new THREE.Box3().setFromObject(clone);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const fitScale = 3.9 / Math.max(size.y, 0.001);
    clone.scale.setScalar(fitScale);
    clone.position.set(-center.x * fitScale, -center.y * fitScale + 0.05, -center.z * fitScale);
    return clone;
  }, [scene]);

  const mixer = useMemo(() => {
    if (!playWalkAnimation || animations.length === 0) return null;
    const nextMixer = new THREE.AnimationMixer(model);
    const clip =
      animations.find((item) => /walk|run|move|anim|action/i.test(item.name)) ?? animations[0];
    nextMixer.clipAction(clip).play();
    return nextMixer;
  }, [animations, model, playWalkAnimation]);
  const clock = useRef(new THREE.Clock());

  useFrame(() => {
    mixer?.update(clock.current.getDelta());
  });

  return <primitive object={model} />;
}

function cameraSettings(focusZone: FocusZone) {
  if (focusZone === "head")
    return {
      position: [0, 1.35, 3.2] as [number, number, number],
      target: [0, 1.25, 0] as [number, number, number],
      fov: 24,
    };
  if (focusZone === "torso")
    return {
      position: [0, 0.35, 4.2] as [number, number, number],
      target: [0, 0.35, 0] as [number, number, number],
      fov: 28,
    };
  if (focusZone === "legs")
    return {
      position: [0, -0.95, 4.6] as [number, number, number],
      target: [0, -0.95, 0] as [number, number, number],
      fov: 30,
    };
  return {
    position: [0, 0.05, 7.4] as [number, number, number],
    target: [0, 0, 0] as [number, number, number],
    fov: 34,
  };
}

class ModelErrorBoundary extends Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[QblockModelCanvas] Unable to render avatar GLB", error, info);
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

export function QblockModelCanvas({
  className = "",
  style,
  autoRotate = true,
  interactive = true,
  focusZone = "full",
  playWalkAnimation = true,
  height,
  width,
  onClick,
}: {
  className?: string;
  style?: React.CSSProperties;
  autoRotate?: boolean;
  interactive?: boolean;
  focusZone?: FocusZone;
  playWalkAnimation?: boolean;
  height?: number | string;
  width?: number | string;
  onClick?: () => void;
}) {
  const camera = cameraSettings(focusZone);
  const fallback = (
    <div
      className={`relative flex items-center justify-center bg-slate-100/60 ${className}`}
      style={style}
    >
      <img
        src="/qblock-mascot.png"
        alt="QBlock avatar"
        className="h-full w-full object-contain p-2"
        draggable={false}
      />
    </div>
  );

  return (
    <ModelErrorBoundary fallback={fallback}>
      <div
        className={`relative overflow-hidden select-none ${className}`}
        style={{
          ...style,
          ...(height !== undefined ? { height } : {}),
          ...(width !== undefined ? { width } : {}),
        }}
        onClick={onClick}
      >
        <Canvas
          dpr={[1, 2]}
          camera={{ position: camera.position, fov: camera.fov, near: 0.1, far: 100 }}
          gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
          fallback={fallback}
        >
          <color attach="background" args={["#000000"]} />
          <ambientLight intensity={1.5} />
          <directionalLight position={[4, 8, 6]} intensity={1.6} />
          <directionalLight position={[-5, 3, -3]} intensity={0.8} color="#bad7ff" />
          <directionalLight position={[0, 6, -5]} intensity={0.7} color="#fff1de" />
          <LoadedQblockModel focusZone={focusZone} playWalkAnimation={playWalkAnimation} />
          <OrbitControls
            enabled={interactive}
            enablePan={false}
            enableZoom={false}
            target={camera.target}
            autoRotate={autoRotate}
            autoRotateSpeed={1.2}
            enableDamping
            dampingFactor={0.08}
          />
        </Canvas>
      </div>
    </ModelErrorBoundary>
  );
}
