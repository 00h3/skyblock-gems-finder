import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export const BEDWARS_LOBBY_SCALE = 1 / 0.012048779853979896; // ~82.996 (maps 0.01205 unit blocks to exact 1-block units)
export const BEDWARS_LOBBY_POSITION = new THREE.Vector3(0, 13, 0);

const MODEL_LOCAL_PATH = "/models/lobbybw.glb";
const MODEL_FALLBACK_URL_1 = "https://file.garden/alGOOylwpAfCa6qP/lobbybw%20(1).glb";
const MODEL_FALLBACK_URL_2 = "https://file.garden/alGOOylwpAfCa6qP/lobbybw.glb";

// Mapping from the GLTF/Mineways material names to our custom stylized block textures in /textures/blocks/
const MATERIAL_TO_OUR_TEXTURE: Record<string, string> = {
  Anvil: "iron_block",
  Birch_Stairs: "oak_planks",
  Block_of_Emerald: "emerald_block",
  Block_of_Gold: "gold_block",
  Bookshelf: "bookshelf",
  Brown_Mushroom_block: "terracotta",
  Cauldron: "iron_block",
  Cobblestone_Wall: "cobblestone",
  Dirt: "dirt",
  Double_Stone_Slab: "smooth_stone",
  Double_Wooden_Slab: "oak_planks",
  End_Stone: "sand",
  Fence: "oak_planks",
  Grass: "grass_block_top",
  Grass_Block: "grass_block_top",
  Hardened_Clay: "terracotta",
  Hopper: "iron_block",
  Iron_Bars: "iron_block",
  Jungle_Stairs: "oak_planks",
  Lapis_Lazuli_Block: "lapis_block",
  Leaves: "oak_leaves",
  Oak_Log: "oak_log",
  Oak_Planks: "oak_planks",
  Oak_Trapdoor: "oak_planks",
  Packed_Ice: "ice",
  Red_Mushroom: "red_wool",
  Sand: "sand",
  Sandstone: "sand",
  Sandstone_Stairs: "sand",
  Sea_Lantern: "glowstone",
  Spruce_Stairs: "spruce_log",
  Stained_Clay: "terracotta",
  Stained_Glass_Pane: "glass",
  Stationary_Water: "ice",
  Stone: "stone",
  Stone_Brick_Stairs: "stone_bricks",
  Stone_Bricks: "stone_bricks",
  Stone_Button: "stone",
  Stone_Slab: "smooth_stone",
  Torch: "glowstone",
  Weighted_Pressure_Plate_Light: "gold_block",
  Wooden_Slab: "oak_planks",
  Wool: "white_wool",
  // Common Minecraft block variants
  Coal_Ore: "coal_ore",
  Iron_Ore: "iron_block",
  Gold_Ore: "gold_block",
  Diamond_Ore: "diamond_block",
  Bedrock: "bedrock",
  Gravel: "gravel",
  Snow: "snow",
  material: "stone",
};

const FIREWORK_COLORS: number[] = [
  0xff3366, // hot pink / red
  0xffcc00, // brilliant gold
  0x00e5ff, // neon cyan
  0xb026ff, // vibrant purple
  0x00ff66, // electric lime
  0xff6600, // radiant orange
  0xffffff, // sparkling white
];

export interface LoadedBedwarsLobby {
  model: THREE.Group;
  mixer: THREE.AnimationMixer | null;
}

export async function loadBedwarsLobby(scene: THREE.Scene): Promise<LoadedBedwarsLobby> {
  const loader = new GLTFLoader();

  let gltf;
  try {
    gltf = await loader.loadAsync(MODEL_LOCAL_PATH);
  } catch (err) {
    console.warn("Could not load local Bedwars lobby model, falling back to remote URL:", err);
    try {
      gltf = await loader.loadAsync(MODEL_FALLBACK_URL_1);
    } catch (err2) {
      console.warn("Falling back to secondary remote URL:", err2);
      gltf = await loader.loadAsync(MODEL_FALLBACK_URL_2);
    }
  }

  const model = gltf.scene;
  model.scale.setScalar(BEDWARS_LOBBY_SCALE);
  model.position.copy(BEDWARS_LOBBY_POSITION);

  const textureLoader = new THREE.TextureLoader();
  const cachedTextures = new Map<string, THREE.Texture>();

  const getTexture = (name: string): THREE.Texture => {
    if (!cachedTextures.has(name)) {
      const tex = textureLoader.load(`/textures/blocks/${name}.png`);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.colorSpace = THREE.SRGBColorSpace;
      // High-definition smooth filtering — zero pixelation!
      tex.magFilter = THREE.LinearFilter;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.generateMipmaps = true;
      tex.anisotropy = 16;
      cachedTextures.set(name, tex);
    }
    return cachedTextures.get(name)!;
  };

  model.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const oldMat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial;
      const matName = oldMat?.name || "";

      // Special handling for the BEDWARS sky sign
      if (matName === "sign_0") {
        mesh.material = new THREE.MeshStandardMaterial({
          color: 0xee2233,
          roughness: 0.3,
          metalness: 0.2,
          emissive: new THREE.Color(0x991122),
          emissiveIntensity: 0.7,
        });
        return;
      }
      if (matName === "sign_1") {
        mesh.material = new THREE.MeshStandardMaterial({
          color: 0xffdd44,
          roughness: 0.2,
          metalness: 0.3,
          emissive: new THREE.Color(0xeeaa11),
          emissiveIntensity: 0.9,
        });
        return;
      }

      // Special handling for animated sky fireworks
      if (matName.startsWith("firework_")) {
        const fireworkIdx = parseInt(matName.replace("firework_", ""), 10) || 0;
        const color = FIREWORK_COLORS[fireworkIdx % FIREWORK_COLORS.length];
        mesh.material = new THREE.MeshStandardMaterial({
          color: color,
          emissive: new THREE.Color(color),
          emissiveIntensity: 2.2,
          roughness: 0.1,
          metalness: 0.1,
        });
        return;
      }

      // Props and custom decor items keep their dedicated models textures (tents, chests, trucks, benches, doghouses)
      const isCustomProp =
        matName.startsWith("tent_") ||
        matName.startsWith("chest_") ||
        matName.startsWith("truck_") ||
        matName.startsWith("bench_") ||
        matName.startsWith("doghouse_");

      if (isCustomProp) {
        if (oldMat && oldMat.map) {
          oldMat.map.colorSpace = THREE.SRGBColorSpace;
          oldMat.map.needsUpdate = true;
        }
        return;
      }

      // Find mapped texture in our block texture library
      let textureKey: string | null = null;
      for (const [key, tex] of Object.entries(MATERIAL_TO_OUR_TEXTURE)) {
        if (matName.toLowerCase() === key.toLowerCase() || matName.toLowerCase().startsWith(key.toLowerCase())) {
          textureKey = tex;
          break;
        }
      }

      if (!textureKey) {
        for (const [key, tex] of Object.entries(MATERIAL_TO_OUR_TEXTURE)) {
          if (matName.toLowerCase().includes(key.toLowerCase())) {
            textureKey = tex;
            break;
          }
        }
      }

      if (!textureKey) {
        textureKey = "stone";
      }

      // Remap UV coordinates from Mineways 32x32 atlas grid into normalized 1x1 tile repeats
      const uvAttr = mesh.geometry.attributes.uv;
      if (uvAttr && uvAttr.count > 0) {
        let minU = Infinity;
        let minV = Infinity;
        for (let i = 0; i < uvAttr.count; i++) {
          const u = uvAttr.getX(i);
          const v = uvAttr.getY(i);
          if (u < minU) minU = u;
          if (v < minV) minV = v;
        }
        const tileSize = 0.03125; // 1 / 32 in standard Mineways atlas
        const newUvs = new Float32Array(uvAttr.count * 2);
        for (let i = 0; i < uvAttr.count; i++) {
          newUvs[i * 2] = (uvAttr.getX(i) - minU) / tileSize;
          newUvs[i * 2 + 1] = (uvAttr.getY(i) - minV) / tileSize;
        }
        mesh.geometry.setAttribute("uv", new THREE.BufferAttribute(newUvs, 2));
        mesh.geometry.attributes.uv.needsUpdate = true;
      }

      const ourTex = getTexture(textureKey);
      const isLeaves = textureKey.includes("leaves");
      const isGlass = textureKey === "glass";
      const isWaterOrIce = textureKey === "water" || textureKey === "ice";
      const isGlow = textureKey === "glowstone" || matName === "Torch" || matName === "Sea_Lantern";

      // Subtle ambient violet moonlight illumination so all block details and textures remain crisp and readable at night
      const ambientNightColor = new THREE.Color(0x1a0c28);

      mesh.material = new THREE.MeshStandardMaterial({
        map: ourTex,
        roughness: isWaterOrIce ? 0.35 : 0.82,
        metalness: isWaterOrIce ? 0.2 : 0.04,
        transparent: isLeaves || isGlass,
        opacity: isGlass ? 0.65 : 1.0,
        alphaTest: isLeaves ? 0.35 : 0.0,
        emissive: isGlow ? new THREE.Color(0xffd54f) : ambientNightColor,
        emissiveIntensity: isGlow ? 1.6 : 0.08,
      });
    }
  });

  // ── Dynamic Structure Lighting for Bedwars ──
  // Gentle atmospheric warm amber & celestial violet point lights illuminating key structures
  const structureLights = new THREE.Group();
  structureLights.name = "bedwars_structure_lights";

  const lightsConfig = [
    // Central courtyard / plaza fountain & walkways
    { x: 0, y: 5.5, z: 0, color: 0xffd97d, intensity: 1.8, distance: 36 },
    // Matchmaker & front portal pavilion
    { x: 0, y: 5.2, z: -8, color: 0xffbe69, intensity: 1.6, distance: 32 },
    // South plaza & walkway
    { x: 0, y: 5.2, z: 12, color: 0xc4a6ff, intensity: 1.5, distance: 32 },
    // East wing structure
    { x: 22, y: 5.2, z: 0, color: 0x8ce8ff, intensity: 1.4, distance: 30 },
    // West wing structure
    { x: -22, y: 5.2, z: 0, color: 0xffa8ef, intensity: 1.4, distance: 30 },
    // Camp / Big Tent area
    { x: -25, y: 5.2, z: 35, color: 0xffb066, intensity: 1.7, distance: 35 },
    // Secondary tent / campsite
    { x: 25, y: 5.2, z: -35, color: 0xd2b3ff, intensity: 1.5, distance: 32 },
  ];

  for (const cfg of lightsConfig) {
    const pl = new THREE.PointLight(cfg.color, cfg.intensity, cfg.distance, 1.4);
    pl.position.set(cfg.x, cfg.y, cfg.z);
    structureLights.add(pl);
  }

  model.add(structureLights);

  // Start all animation clips (npc_trucks, fireworks, etc.)
  let mixer: THREE.AnimationMixer | null = null;
  if (gltf.animations && gltf.animations.length > 0) {
    mixer = new THREE.AnimationMixer(model);
    gltf.animations.forEach((clip) => {
      const action = mixer!.clipAction(clip);
      action.setLoop(THREE.LoopRepeat, Infinity);
      action.play();
    });
  }

  model.userData.mixer = mixer;
  scene.add(model);

  return { model, mixer };
}
