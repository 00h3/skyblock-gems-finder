import * as THREE from "three";

export type VoxelPropHandle = {
  group: THREE.Group;
  light?: THREE.PointLight;
  update?: (time: number) => void;
  dispose: () => void;
};

/**
 * Creates a high-fidelity voxel torch with wooden stick, charcoal head,
 * layered animated flame voxel, and a warm flickering point light.
 */
export function createVoxelTorch(x: number, y: number, z: number): VoxelPropHandle {
  const group = new THREE.Group();
  group.position.set(x, y, z);

  // 1. Wooden torch stick
  const stickGeo = new THREE.BoxGeometry(0.12, 0.58, 0.12);
  const stickMat = new THREE.MeshStandardMaterial({
    color: 0x82542a,
    roughness: 0.85,
    metalness: 0.05,
  });
  const stick = new THREE.Mesh(stickGeo, stickMat);
  stick.position.y = 0.29;
  stick.castShadow = true;
  stick.receiveShadow = true;
  group.add(stick);

  // 2. Charcoal base head
  const headGeo = new THREE.BoxGeometry(0.14, 0.1, 0.14);
  const headMat = new THREE.MeshStandardMaterial({
    color: 0x221c18,
    roughness: 0.9,
  });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 0.52;
  group.add(head);

  // 3. Glowing flame voxel
  const flameGeo = new THREE.BoxGeometry(0.18, 0.24, 0.18);
  const flameMat = new THREE.MeshStandardMaterial({
    color: 0xffaa22,
    emissive: new THREE.Color(0xff6600),
    emissiveIntensity: 2.8,
    roughness: 0.2,
  });
  const flame = new THREE.Mesh(flameGeo, flameMat);
  flame.position.y = 0.65;
  group.add(flame);

  // 4. Hot flame inner core (bright yellow-white)
  const coreGeo = new THREE.BoxGeometry(0.1, 0.15, 0.1);
  const coreMat = new THREE.MeshBasicMaterial({ color: 0xfff6c0 });
  const core = new THREE.Mesh(coreGeo, coreMat);
  core.position.y = 0.65;
  group.add(core);

  // 5. Realistic dynamic point light with natural warm flame temperature
  const light = new THREE.PointLight(0xff9433, 3.2, 24, 1.3);
  light.position.set(0, 0.75, 0);
  light.castShadow = false;
  group.add(light);

  return {
    group,
    light,
    update: (time: number) => {
      const flicker =
        Math.sin(time * 19.3) * 0.28 + Math.sin(time * 37.7) * 0.16 + Math.cos(time * 11.2) * 0.14;
      light.intensity = Math.max(1.8, 3.2 + flicker);
      flame.scale.y = 1.0 + flicker * 0.18;
      flame.scale.x = 1.0 - flicker * 0.08;
      flame.scale.z = 1.0 - flicker * 0.08;
    },
    dispose: () => {
      stickGeo.dispose();
      stickMat.dispose();
      headGeo.dispose();
      headMat.dispose();
      flameGeo.dispose();
      flameMat.dispose();
      coreGeo.dispose();
      coreMat.dispose();
    },
  };
}

/**
 * Creates a cozy hanging or wall-mounted iron lantern with glowing amber core,
 * matching Hytale reference image 3.
 */
export function createVoxelLantern(x: number, y: number, z: number): VoxelPropHandle {
  const group = new THREE.Group();
  group.position.set(x, y, z);

  // Iron frame material
  const ironMat = new THREE.MeshStandardMaterial({
    color: 0x2a2826,
    metalness: 0.6,
    roughness: 0.45,
  });

  // Top cap & hook
  const capGeo = new THREE.BoxGeometry(0.36, 0.08, 0.36);
  const cap = new THREE.Mesh(capGeo, ironMat);
  cap.position.y = 0.44;
  group.add(cap);

  const hookGeo = new THREE.TorusGeometry(0.08, 0.02, 6, 12);
  const hook = new THREE.Mesh(hookGeo, ironMat);
  hook.position.y = 0.54;
  hook.rotation.x = Math.PI / 2;
  group.add(hook);

  // Base
  const baseGeo = new THREE.BoxGeometry(0.32, 0.08, 0.32);
  const base = new THREE.Mesh(baseGeo, ironMat);
  base.position.y = 0.04;
  group.add(base);

  // Glass housing
  const glassGeo = new THREE.BoxGeometry(0.28, 0.34, 0.28);
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xffe899,
    emissive: new THREE.Color(0xffaa22),
    emissiveIntensity: 2.2,
    transparent: true,
    opacity: 0.88,
    roughness: 0.15,
  });
  const glass = new THREE.Mesh(glassGeo, glassMat);
  glass.position.y = 0.24;
  group.add(glass);

  // Inner hot wick
  const wickGeo = new THREE.BoxGeometry(0.1, 0.18, 0.1);
  const wickMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const wick = new THREE.Mesh(wickGeo, wickMat);
  wick.position.y = 0.24;
  group.add(wick);

  // Point light
  const light = new THREE.PointLight(0xffa83e, 3.6, 26, 1.25);
  light.position.set(0, 0.25, 0);
  group.add(light);

  return {
    group,
    light,
    update: (time: number) => {
      const flicker = Math.sin(time * 14.5) * 0.18 + Math.cos(time * 23.1) * 0.12;
      light.intensity = Math.max(2.4, 3.6 + flicker);
      glassMat.emissiveIntensity = 2.2 + flicker * 0.25;
    },
    dispose: () => {
      capGeo.dispose();
      hookGeo.dispose();
      baseGeo.dispose();
      glassGeo.dispose();
      wickGeo.dispose();
      ironMat.dispose();
      glassMat.dispose();
      wickMat.dispose();
    },
  };
}

export type CrystalType = "sapphire" | "emerald" | "ruby" | "amethyst";

const CRYSTAL_CONFIGS: Record<CrystalType, { color: number; emissive: number; lightColor: number; intensity: number }> = {
  sapphire: { color: 0x1e88e5, emissive: 0x00a2ff, lightColor: 0x38bdf8, intensity: 3.8 },
  emerald: { color: 0x10b981, emissive: 0x05df72, lightColor: 0x34d399, intensity: 3.5 },
  ruby: { color: 0xe11d48, emissive: 0xff2e56, lightColor: 0xf87171, intensity: 3.6 },
  amethyst: { color: 0x9333ea, emissive: 0xb53eff, lightColor: 0xc084fc, intensity: 3.4 },
};

/**
 * Creates glowing, faceted gemstone crystal clusters that hang from ceilings
 * or sprout from walls and floors, casting vivid colored lighting into caverns
 * exactly like Hytale reference images 4 & 5.
 */
export function createCrystalCluster(
  x: number,
  y: number,
  z: number,
  type: CrystalType = "sapphire",
  pointing: "down" | "up" | "side" = "down",
): VoxelPropHandle {
  const group = new THREE.Group();
  group.position.set(x, y, z);

  const cfg = CRYSTAL_CONFIGS[type];
  const crystalMat = new THREE.MeshStandardMaterial({
    color: cfg.color,
    emissive: new THREE.Color(cfg.emissive),
    emissiveIntensity: 2.4,
    roughness: 0.15,
    metalness: 0.1,
    transparent: true,
    opacity: 0.92,
  });

  // Base octahedron / cone shards
  const shardGeos: THREE.BufferGeometry[] = [];
  const shards: [size: [number, number, number], rot: [number, number, number], pos: [number, number, number]][] = [
    [[0.32, 0.75, 0.32], [0, 0, 0], [0, 0, 0]],
    [[0.22, 0.55, 0.22], [0.2, 0.4, 0.15], [0.22, -0.08, 0.12]],
    [[0.24, 0.62, 0.24], [-0.25, -0.3, -0.1], [-0.18, -0.05, -0.15]],
    [[0.18, 0.45, 0.18], [0.1, 0.8, -0.2], [-0.2, -0.12, 0.18]],
  ];

  for (const s of shards) {
    const geo = new THREE.ConeGeometry(s[0][0], s[0][1], 5);
    shardGeos.push(geo);
    const mesh = new THREE.Mesh(geo, crystalMat);
    mesh.position.set(s[2][0], s[2][1], s[2][2]);
    mesh.rotation.set(s[1][0], s[1][1], s[1][2]);
    group.add(mesh);
  }

  if (pointing === "down") {
    group.rotation.x = Math.PI;
  } else if (pointing === "side") {
    group.rotation.z = Math.PI / 2;
  }

  // Radiant point light illuminating surrounding blocks
  const light = new THREE.PointLight(cfg.lightColor, cfg.intensity, 20, 1.3);
  light.position.set(0, pointing === "down" ? -0.3 : 0.3, 0);
  group.add(light);

  return {
    group,
    light,
    update: (time: number) => {
      const pulse = Math.sin(time * 2.8 + x * 2.0 + z) * 0.22;
      light.intensity = cfg.intensity + pulse;
      crystalMat.emissiveIntensity = 2.4 + pulse * 0.4;
    },
    dispose: () => {
      crystalMat.dispose();
      shardGeos.forEach((g) => g.dispose());
    },
  };
}
