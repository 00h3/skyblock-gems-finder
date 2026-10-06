import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const JERRY_WORKSHOP_SCALE = 6551.86;
const MODEL_LOCAL_PATH = "/models/jerrys_workshop.glb";
const MODEL_FALLBACK_URL = "https://file.garden/alGOOylwpAfCa6qP/jerrys_workshop_hypixel_skyblock.glb";

// Mapping of Hypixel/Mineways GLTF material names to our local cartoon texture pack in /textures/blocks/
const MATERIAL_TO_OUR_TEXTURE: Record<string, string> = {
  Block_of_Coal: "coal_ore",
  Block_of_Gold: "gold_block",
  Block_of_Iron: "iron_block",
  Block_of_Quartz: "smooth_stone",
  Block_of_Redstone: "redstone_ore",
  Bookshelf: "bookshelf",
  Brick_Stairs: "stone_bricks",
  Bricks: "stone_bricks",
  Carpet: "red_wool",
  Chest: "oak_planks",
  Clay: "terracotta",
  Cobblestone: "cobblestone",
  Cobblestone_Wall: "cobblestone",
  Crafting_Table: "oak_planks",
  Dark_Oak_Wood_Stairs: "dark_oak_log",
  Dirt: "dirt",
  Double_Stone_Slab: "stone",
  Double_Wooden_Slab: "oak_planks",
  Fence: "oak_planks",
  Fence_Gate: "oak_planks",
  Fire: "glowstone",
  Flower_Pot: "terracotta",
  Furnace: "cobblestone",
  Glowstone: "glowstone",
  Hardened_Clay: "terracotta",
  Iron_Bars: "iron_block",
  Jungle_Wood_Stairs: "oak_planks",
  Ladder: "oak_planks",
  Leaves: "spruce_leaves",
  Mob_Head: "snow",
  Oak_Wood_Stairs: "oak_planks",
  Packed_Ice: "ice",
  Quartz_Stairs: "smooth_stone",
  Red_Mushroom_block: "red_wool",
  Redstone_Lamp_active: "glowstone",
  Sea_Lantern: "glowstone",
  Slime_Block: "emerald_block",
  Snow: "snow",
  Snow_layer: "snow",
  Spruce_Fence: "oak_planks",
  Spruce_Fence_Gate: "oak_planks",
  Spruce_Wood_Stairs: "spruce_log",
  Stained_Clay: "terracotta",
  Stained_Glass: "glass",
  Stained_Glass_Pane: "glass",
  Stationary_Lava: "glowstone",
  Stationary_Water: "ice",
  Stone: "stone",
  Stone_Brick_Stairs: "stone_bricks",
  Stone_Bricks: "stone_bricks",
  Stone_Button: "stone",
  Stone_Slab: "stone",
  Torch: "glowstone",
  Trapdoor: "oak_planks",
  Wall_Sign: "oak_planks",
  Weighted_Pressure_Plate_Light: "gold_block",
  Wood: "oak_log",
  Wood_Planks: "oak_planks",
  Wooden_Slab: "oak_planks",
  Wool: "white_wool",
  material: "snow",
};

export async function loadJerrysWorkshop(scene: THREE.Scene): Promise<THREE.Group> {
  const loader = new GLTFLoader();

  let gltf;
  try {
    gltf = await loader.loadAsync(MODEL_LOCAL_PATH);
  } catch (err) {
    console.warn("Could not load local Jerry Workshop model, falling back to remote URL:", err);
    gltf = await loader.loadAsync(MODEL_FALLBACK_URL);
  }

  const model = gltf.scene;
  model.scale.setScalar(JERRY_WORKSHOP_SCALE);
  model.position.set(0, 0, 0);

  const textureLoader = new THREE.TextureLoader();
  const cachedTextures = new Map<string, THREE.Texture>();

  const getTexture = (name: string): THREE.Texture => {
    if (!cachedTextures.has(name)) {
      const tex = textureLoader.load(`/textures/blocks/${name}.png`);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestMipmapLinearFilter;
      tex.generateMipmaps = true;
      cachedTextures.set(name, tex);
    }
    return cachedTextures.get(name)!;
  };

  model.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const oldMat = mesh.material as THREE.MeshStandardMaterial;
      const matName = oldMat?.name || "";
      let textureKey = "snow";
      for (const [key, tex] of Object.entries(MATERIAL_TO_OUR_TEXTURE)) {
        if (matName.toLowerCase().includes(key.toLowerCase())) {
          textureKey = tex;
          break;
        }
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
      }

      const ourTex = getTexture(textureKey);
      const isLeaves = textureKey.includes("leaves");
      const isGlass = textureKey === "glass";
      const isWaterOrIce = textureKey === "water" || textureKey === "ice";

      mesh.material = new THREE.MeshStandardMaterial({
        map: ourTex,
        roughness: isWaterOrIce ? 0.35 : 0.85,
        metalness: isWaterOrIce ? 0.2 : 0.05,
        transparent: isLeaves || isGlass,
        opacity: isGlass ? 0.65 : 1.0,
        alphaTest: isLeaves ? 0.35 : 0.0,
      });
    }
  });

  scene.add(model);
  return model;
}
