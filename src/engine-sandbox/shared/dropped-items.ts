import * as THREE from "three";
import { World, BLOCKS } from "./world";
import type { Atlas } from "./textures";
import { GameAudio } from "@/lib/game-audio";
import { ITEM_INFO } from "@/components/v2/BlockmanInventory";

export interface DroppedItemEntity {
  id: string;
  itemId: number | string;
  count: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  mesh: THREE.Group;
  age: number;
  pickupCooldown: number;
  grounded: boolean;
  baseGroundY: number;
}

export class DroppedItemManager {
  readonly group = new THREE.Group();
  private items: DroppedItemEntity[] = [];
  private static nextId = 1;
  private static cubeGeo = new THREE.BoxGeometry(0.28, 0.28, 0.28);
  private static itemGeo = new THREE.PlaneGeometry(0.35, 0.35);
  private texLoader = new THREE.TextureLoader();

  constructor(
    private scene: THREE.Scene,
    private world: World,
    private atlas?: Atlas | null,
  ) {
    this.group.name = "dropped-items-group";
    this.scene.add(this.group);
  }

  setAtlas(atlas: Atlas) {
    this.atlas = atlas;
  }

  private createItemMesh(itemId: number | string): THREE.Group {
    const root = new THREE.Group();

    if (typeof itemId === "number") {
      // 3D Miniature Voxel Block
      const blockDef = BLOCKS.find((b) => b.id === itemId);
      let mats: THREE.Material[];

      if (this.atlas && blockDef) {
        const createFaceMat = (tileName: string) => {
          const tex = this.atlas!.texture.clone();
          const [u0, v0, u1, v1] = this.atlas!.uv(tileName);
          tex.repeat.set(u1 - u0, v1 - v0);
          tex.offset.set(u0, v0);
          tex.magFilter = THREE.NearestFilter;
          tex.minFilter = THREE.NearestFilter;
          tex.needsUpdate = true;
          return new THREE.MeshStandardMaterial({
            map: tex,
            roughness: 0.8,
            metalness: 0.1,
          });
        };

        const sideMat = createFaceMat(blockDef.side);
        const topMat = createFaceMat(blockDef.top || blockDef.side);
        const botMat = createFaceMat(blockDef.bottom || blockDef.side);
        mats = [sideMat, sideMat, topMat, botMat, sideMat, sideMat];
      } else {
        // Fallback color material for voxel cube
        const color =
          itemId === 1 ? 0x5b8e3a : // grass
          itemId === 2 ? 0x866043 : // dirt
          itemId === 3 ? 0x808080 : // stone
          itemId === 4 ? 0x9a9aa0 : // cobble
          itemId === 13 ? 0x8b5a2b : // wood
          itemId === 20 ? 0x55ffff : // diamond
          itemId === 19 ? 0xffd700 : // gold
          itemId === 47 ? 0xd8dde0 : // iron
          0xaaaaaa;
        mats = Array(6).fill(new THREE.MeshStandardMaterial({ color, roughness: 0.7 }));
      }

      const blockMesh = new THREE.Mesh(DroppedItemManager.cubeGeo, mats);
      blockMesh.castShadow = true;
      blockMesh.receiveShadow = true;
      root.add(blockMesh);
    } else {
      // 2D-3D Extruded Item / Tool
      const name = String(itemId).toLowerCase();
      let iconUrl = `/items/${name}.png`;
      if (name.includes("sword") || name.includes("staff")) {
        iconUrl = "/short-sword.svg";
      }

      const mat = new THREE.MeshStandardMaterial({
        transparent: true,
        side: THREE.DoubleSide,
        alphaTest: 0.08,
        roughness: 0.5,
        metalness: 0.2,
      });

      this.texLoader.load(
        iconUrl,
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.magFilter = THREE.NearestFilter;
          tex.minFilter = THREE.NearestFilter;
          mat.map = tex;
          mat.needsUpdate = true;
        },
        undefined,
        () => {
          // Fallback texture: try public/textures/blocks or color
          mat.color.setHex(0x38bdf8);
        },
      );

      const front = new THREE.Mesh(DroppedItemManager.itemGeo, mat);
      front.position.z = 0.008;
      const back = new THREE.Mesh(DroppedItemManager.itemGeo, mat);
      back.position.z = -0.008;
      back.rotation.y = Math.PI;

      root.add(front, back);
    }

    return root;
  }

  drop(
    itemId: number | string,
    count: number = 1,
    origin: THREE.Vector3,
    direction: THREE.Vector3,
  ): DroppedItemEntity {
    if (!Number.isFinite(count) || count <= 0) count = 1;
    const safeOrigin = origin.isFinite() ? origin : new THREE.Vector3();
    const safeDirection = direction.isFinite() ? direction : new THREE.Vector3(0, 0, -1);
    const mesh = this.createItemMesh(itemId);
    const pos = safeOrigin.clone();
    // Offset forward so it spawns right outside the player's eyes
    pos.addScaledVector(safeDirection, 0.45);

    mesh.position.copy(pos);
    mesh.rotation.y = Math.random() * Math.PI * 2;
    this.group.add(mesh);

    // Initial toss velocity: forward + slight upward arc + tiny random jitter
    const vel = safeDirection.clone().multiplyScalar(4.2);
    vel.y = 2.4;
    vel.x += (Math.random() - 0.5) * 0.8;
    vel.z += (Math.random() - 0.5) * 0.8;

    const entity: DroppedItemEntity = {
      id: `drop_${DroppedItemManager.nextId++}`,
      itemId,
      count: Math.max(1, count),
      pos,
      vel,
      mesh,
      age: 0,
      pickupCooldown: 0.75, // 0.75s grace period before the dropper can pick it up
      grounded: false,
      baseGroundY: pos.y,
    };

    this.items.push(entity);
    GameAudio.playPop();
    return entity;
  }

  update(
    dt: number,
    playerPos: THREE.Vector3,
    onPickup?: (itemId: number | string, count: number) => boolean | void,
  ) {
    if (this.items.length === 0) return;

    const playerTarget = playerPos.clone().add(new THREE.Vector3(0, 0.9, 0));

    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.age += dt;
      if (item.pickupCooldown > 0) {
        item.pickupCooldown -= dt;
      }

      // Physics integration if not grounded or falling
      if (!item.grounded) {
        item.vel.y -= 22 * dt; // gravity
        item.pos.x += item.vel.x * dt;
        item.pos.y += item.vel.y * dt;
        item.pos.z += item.vel.z * dt;

        // Air damping on horizontal velocity
        item.vel.x *= Math.pow(0.2, dt);
        item.vel.z *= Math.pow(0.2, dt);

        // Ground / block surface check
        const blockX = Math.floor(item.pos.x);
        const blockY = Math.floor(item.pos.y);
        const blockZ = Math.floor(item.pos.z);

        const solidHere = this.world.isSolid(blockX, blockY, blockZ);
        const solidBelow = this.world.isSolid(blockX, blockY - 1, blockZ);

        if (solidHere) {
          item.grounded = true;
          item.baseGroundY = blockY + 1.0 + 0.18;
          item.pos.y = item.baseGroundY;
          item.vel.set(0, 0, 0);
        } else if (solidBelow && item.pos.y <= blockY + 0.18) {
          item.grounded = true;
          item.baseGroundY = blockY + 0.18;
          item.pos.y = item.baseGroundY;
          item.vel.set(0, 0, 0);
        } else if (item.pos.y < -30) {
          // Fell into the void
          this.removeItem(i);
          continue;
        }
      }

      // Gentle Minecraft floating & spinning animation
      item.mesh.rotation.y += dt * 2.5;
      if (item.grounded) {
        item.mesh.position.y = item.baseGroundY + Math.sin(item.age * 3.8) * 0.07;
        item.mesh.position.x = item.pos.x;
        item.mesh.position.z = item.pos.z;
      } else {
        item.mesh.position.copy(item.pos);
      }

      // Proximity check to player
      const dist = item.mesh.position.distanceTo(playerTarget);

      // Minecraft item magnet pull when near and cooldown expired
      if (dist < 2.5 && item.pickupCooldown <= 0) {
        const pullSpeed = Math.min(16, 22 / Math.max(0.15, dist));
        item.pos.lerp(playerTarget, dt * pullSpeed);
        item.mesh.position.copy(item.pos);
      }

      // Pickup trigger
      if (dist < 0.75 && item.pickupCooldown <= 0) {
        // Collect into player inventory
        let accepted = true;
        if (onPickup) {
          const res = onPickup(item.itemId, item.count);
          if (res === false) accepted = false;
        }

        if (accepted) {
          GameAudio.playPop();
          this.removeItem(i);
        }
      }
    }
  }

  private removeItem(idx: number) {
    const item = this.items[idx];
    if (!item) return;
    this.group.remove(item.mesh);
    item.mesh.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const m = child as THREE.Mesh;
        // cubeGeo and itemGeo are shared static geometries. Disposing them here
        // breaks every later drop because Three.js meshes reuse the same buffers.
        if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
        else m.material?.dispose();
      }
    });
    this.items.splice(idx, 1);
  }

  clear() {
    for (let i = this.items.length - 1; i >= 0; i--) {
      this.removeItem(i);
    }
  }

  dispose() {
    this.clear();
    this.scene.remove(this.group);
  }
}
