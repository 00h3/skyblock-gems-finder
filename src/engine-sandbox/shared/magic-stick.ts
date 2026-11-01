import * as THREE from "three";
import type { World } from "./world";
import type { Hit } from "./interact";
import { playMagicWandCast } from "@/lib/ui-sounds";
import { triggerHaptic } from "@/lib/haptics";

export type MagicStickMode = "extend" | "wall" | "floor" | "line";

export interface MagicStickState {
  mode: MagicStickMode;
  lastCount: number;
}

interface UndoOperation {
  blocks: { x: number; y: number; z: number; prevId: number }[];
}

const undoStack: UndoOperation[] = [];

let currentMode: MagicStickMode = "extend";

export function getMagicStickMode(): MagicStickMode {
  return currentMode;
}

export function setMagicStickMode(mode: MagicStickMode): void {
  currentMode = mode;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("qb-magic-stick-mode", { detail: mode }));
  }
}

export function castMagicStick({
  world,
  hit,
  playerPos,
  aimDir,
  blockId = 4, // Default cobblestone if no block selected
  setBlock,
  announce,
}: {
  world: World;
  hit: Hit | null;
  playerPos: THREE.Vector3;
  aimDir: THREE.Vector3;
  blockId?: number;
  setBlock: (x: number, y: number, z: number, id: number) => void;
  announce?: (title: string, desc?: string) => void;
}): number {
  if (!world) return 0;

  // Actual building block to place (non-zero)
  const placeId = blockId > 0 ? blockId : 4;

  const targetCoords: { x: number; y: number; z: number }[] = [];

  if (hit) {
    const startX = hit.x + hit.nx;
    const startY = hit.y + hit.ny;
    const startZ = hit.z + hit.nz;

    if (currentMode === "extend") {
      // Minecraft Wand Mode: Replicate connected adjacent blocks on this face
      const sourceId = hit.id;
      const visited = new Set<string>();
      const queue: [number, number, number][] = [[hit.x, hit.y, hit.z]];
      visited.add(`${hit.x},${hit.y},${hit.z}`);

      while (queue.length > 0 && targetCoords.length < 12) {
        const [cx, cy, cz] = queue.shift()!;
        const tx = cx + hit.nx;
        const ty = cy + hit.ny;
        const tz = cz + hit.nz;

        if (world.get(tx, ty, tz) === 0) {
          // Verify not inside player body
          const distToPlayer = Math.hypot(tx + 0.5 - playerPos.x, tz + 0.5 - playerPos.z);
          const overlapY = ty + 1 > playerPos.y && ty < playerPos.y + 1.8;
          if (!(distToPlayer < 0.8 && overlapY)) {
            targetCoords.push({ x: tx, y: ty, z: tz });
          }
        }

        // Check 4 planar neighbors on the face
        const neighbors: [number, number, number][] = [];
        if (hit.nx !== 0) {
          neighbors.push([cx, cy + 1, cz], [cx, cy - 1, cz], [cx, cy, cz + 1], [cx, cy, cz - 1]);
        } else if (hit.ny !== 0) {
          neighbors.push([cx + 1, cy, cz], [cx - 1, cy, cz], [cx, cy, cz + 1], [cx, cy, cz - 1]);
        } else {
          neighbors.push([cx + 1, cy, cz], [cx - 1, cy, cz], [cx, cy + 1, cz], [cx, cy - 1, cz]);
        }

        for (const [nx, ny, nz] of neighbors) {
          const key = `${nx},${ny},${nz}`;
          if (!visited.has(key) && world.get(nx, ny, nz) === sourceId) {
            visited.add(key);
            queue.push([nx, ny, nz]);
          }
        }
      }
      if (targetCoords.length === 0) {
        targetCoords.push({ x: startX, y: startY, z: startZ });
      }
    } else if (currentMode === "wall") {
      // 3x3 Vertical Wall on the face
      const isZWall = Math.abs(hit.nz) > 0.5 || Math.abs(aimDir.z) > Math.abs(aimDir.x);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dw = -1; dw <= 1; dw++) {
          const tx = isZWall ? startX + dw : startX;
          const ty = startY + dy;
          const tz = isZWall ? startZ : startZ + dw;
          if (world.get(tx, ty, tz) === 0) {
            targetCoords.push({ x: tx, y: ty, z: tz });
          }
        }
      }
    } else if (currentMode === "floor") {
      // 3x3 Horizontal Floor
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          const tx = startX + dx;
          const ty = startY;
          const tz = startZ + dz;
          if (world.get(tx, ty, tz) === 0) {
            targetCoords.push({ x: tx, y: ty, z: tz });
          }
        }
      }
    } else if (currentMode === "line") {
      // 5-block Bridge / Line extending in face normal direction
      for (let i = 0; i < 5; i++) {
        const tx = startX + hit.nx * i;
        const ty = startY + hit.ny * i;
        const tz = startZ + hit.nz * i;
        if (world.get(tx, ty, tz) === 0) {
          targetCoords.push({ x: tx, y: ty, z: tz });
        }
      }
    }
  } else {
    // Air cast: bridge 4 blocks forward in front of player
    const fx = Math.round(aimDir.x);
    const fz = Math.round(aimDir.z);
    const px = Math.floor(playerPos.x);
    const py = Math.floor(playerPos.y - 0.5);
    const pz = Math.floor(playerPos.z);
    for (let i = 1; i <= 4; i++) {
      const tx = px + fx * i;
      const ty = py;
      const tz = pz + fz * i;
      if (world.get(tx, ty, tz) === 0) {
        targetCoords.push({ x: tx, y: ty, z: tz });
      }
    }
  }

  if (targetCoords.length === 0) {
    announce?.("Magic Stick", "No valid space to place blocks");
    return 0;
  }

  // Record undo operation
  const undoOp: UndoOperation = { blocks: [] };

  for (const { x, y, z } of targetCoords) {
    const prev = world.get(x, y, z);
    undoOp.blocks.push({ x, y, z, prevId: prev });
    setBlock(x, y, z, placeId);
  }

  undoStack.push(undoOp);
  if (undoStack.length > 15) undoStack.shift();

  // Magical effects
  playMagicWandCast();
  triggerHaptic("medium");

  const modeLabels: Record<MagicStickMode, string> = {
    extend: "Connected Face",
    wall: "Wall 3x3",
    floor: "Floor 3x3",
    line: "Bridge Line",
  };

  announce?.("✦ Magic Stick Cast!", `Placed ${targetCoords.length} blocks (${modeLabels[currentMode]})`);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("qb-magic-stick-cast", {
        detail: { count: targetCoords.length, mode: currentMode },
      }),
    );
  }

  return targetCoords.length;
}

export function undoMagicStick({
  world,
  setBlock,
  announce,
}: {
  world: World;
  setBlock: (x: number, y: number, z: number, id: number) => void;
  announce?: (title: string, desc?: string) => void;
}): boolean {
  if (undoStack.length === 0 || !world) {
    announce?.("Magic Stick Undo", "Nothing left to undo");
    return false;
  }

  const op = undoStack.pop()!;
  for (const { x, y, z, prevId } of op.blocks) {
    setBlock(x, y, z, prevId);
  }

  triggerHaptic("light");
  announce?.("✦ Undone!", `Reverted ${op.blocks.length} blocks`);
  return true;
}
