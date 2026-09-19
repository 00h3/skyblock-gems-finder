export type ToolMode = "select" | "translate" | "rotate" | "scale" | "block" | "script" | "prefabs";

export type SkyboxPreset = "day" | "sunset" | "night" | "space";

export type QScriptTriggerType =
  | "none"
  | "kill_player"
  | "give_coin"
  | "set_checkpoint"
  | "bounce_pad"
  | "open_door"
  | "npc_dialog"
  | "tick_spin"
  | "tick_bob"
  | "teleport"
  | "speed_boost"
  | "custom";

export interface VoxelObject {
  id: string;
  name: string;
  type: "block" | "hazard" | "coin" | "checkpoint" | "spawn" | "npc" | "door" | "spring" | "prefab";
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: string;
  material?: "stone" | "wood" | "grass" | "glass" | "dirt" | "sand" | "glow" | "metal" | "lava";
  canCollide: boolean;
  anchored: boolean;
  trigger: QScriptTriggerType;
  triggerParam?: string | number;
  customScript?: string;
}

export interface WowProject {
  id: string;
  name: string;
  version: string;
  updatedAt: string;
  spawnPoint: [number, number, number];
  skybox: SkyboxPreset;
  objects: VoxelObject[];
  globalScript: string;
}

export const DEFAULT_QSCRIPT = `-- WoW Studio 1.0 — Q_Script Logic Engine
-- Connects voxel objects to game events

function onGameStart(world, player)
  Console.Log("[Q_Script] World loaded: " .. world.name)
  player.SetSpeed(1.0)
end

function onTouch(object, player)
  if object.trigger == "kill_player" then
    player.Damage(100)
    Console.Log("[Q_Script] Player entered hazard: " .. object.name)
  elseif object.trigger == "give_coin" then
    player.AddCoins(5)
    object.Destroy()
    Audio.Play("coin_chime")
  elseif object.trigger == "bounce_pad" then
    player.ApplyImpulse(Vector3(0, 16, 0))
    Audio.Play("spring_boing")
  elseif object.trigger == "set_checkpoint" then
    player.SetRespawn(object.position)
    Console.Log("[Q_Script] Checkpoint saved at " .. tostring(object.position))
  elseif object.trigger == "speed_boost" then
    player.ApplyBuff("Speed", 2.0, 5)
  end
end

function onInteract(npc, player)
  if npc.trigger == "npc_dialog" then
    UI.ShowDialog(npc.name, npc.dialogText or "Hello builder! Welcome to WoW Studio 1.0!")
  end
end
`;

export const STARTER_PRESETS: Record<
  string,
  { name: string; desc: string; objects: VoxelObject[] }
> = {
  flat_grass: {
    name: "Flat Grass Starter",
    desc: "A clean 16x16 emerald grass baseplate with a spawn point and trees.",
    objects: [
      {
        id: "spawn-1",
        name: "Spawn_Point",
        type: "spawn",
        position: [0, 0.5, 0],
        rotation: [0, 0, 0],
        scale: [2, 0.2, 2],
        color: "#22c55e",
        material: "glow",
        canCollide: true,
        anchored: true,
        trigger: "none",
      },
      // Baseplate blocks
      ...Array.from({ length: 9 }).map((_, i) => {
        const x = ((i % 3) - 1) * 4;
        const z = (Math.floor(i / 3) - 1) * 4;
        return {
          id: `ground-${i}`,
          name: `Grass_Platform_${i + 1}`,
          type: "block" as const,
          position: [x, -0.5, z] as [number, number, number],
          rotation: [0, 0, 0] as [number, number, number],
          scale: [4, 1, 4] as [number, number, number],
          color: "#4ade80",
          material: "grass" as const,
          canCollide: true,
          anchored: true,
          trigger: "none" as const,
        };
      }),
      // Tree trunk & leaves
      {
        id: "tree-trunk-1",
        name: "Tree_Trunk",
        type: "block",
        position: [4, 1.5, -4],
        rotation: [0, 0, 0],
        scale: [1, 3, 1],
        color: "#854d0e",
        material: "wood",
        canCollide: true,
        anchored: true,
        trigger: "none",
      },
      {
        id: "tree-leaves-1",
        name: "Tree_Leaves",
        type: "block",
        position: [4, 3.5, -4],
        rotation: [0, 0, 0],
        scale: [3, 2, 3],
        color: "#16a34a",
        material: "grass",
        canCollide: true,
        anchored: true,
        trigger: "none",
      },
      // NPC Guide
      {
        id: "npc-ned",
        name: "Guide_Ned",
        type: "npc",
        position: [2, 1, 2],
        rotation: [0, 0, 0],
        scale: [1, 2, 1],
        color: "#f59e0b",
        canCollide: true,
        anchored: true,
        trigger: "npc_dialog",
        triggerParam: "Welcome to WoW Studio 1.0! Press [Play/Test] or F5 anytime to run around.",
      },
    ],
  },
  parkour_obby: {
    name: "Obby Parkour Starter",
    desc: "A challenging course with floating blocks, kill bricks, bounce pads, and coins.",
    objects: [
      {
        id: "spawn-1",
        name: "Spawn_Point",
        type: "spawn",
        position: [0, 0.5, 0],
        rotation: [0, 0, 0],
        scale: [2, 0.2, 2],
        color: "#22c55e",
        canCollide: true,
        anchored: true,
        trigger: "none",
      },
      {
        id: "plat-start",
        name: "Start_Platform",
        type: "block",
        position: [0, -0.5, 0],
        rotation: [0, 0, 0],
        scale: [3, 1, 3],
        color: "#3b82f6",
        material: "stone",
        canCollide: true,
        anchored: true,
        trigger: "none",
      },
      // Jumps
      {
        id: "plat-1",
        name: "Parkour_Step_1",
        type: "block",
        position: [0, 0.5, -4],
        rotation: [0, 0, 0],
        scale: [1.5, 0.5, 1.5],
        color: "#f59e0b",
        canCollide: true,
        anchored: true,
        trigger: "none",
      },
      {
        id: "hazard-1",
        name: "Kill_Brick_01",
        type: "hazard",
        position: [0, 0.8, -7],
        rotation: [0, 0, 0],
        scale: [2, 0.3, 0.8],
        color: "#ef4444",
        material: "glow",
        canCollide: true,
        anchored: true,
        trigger: "kill_player",
      },
      {
        id: "plat-2",
        name: "Parkour_Step_2",
        type: "block",
        position: [0, 1.2, -10],
        rotation: [0, 0, 0],
        scale: [1.5, 0.5, 1.5],
        color: "#f59e0b",
        canCollide: true,
        anchored: true,
        trigger: "none",
      },
      {
        id: "spring-1",
        name: "Super_Bounce_Pad",
        type: "spring",
        position: [0, 1.6, -14],
        rotation: [0, 0, 0],
        scale: [1.8, 0.3, 1.8],
        color: "#e11d48",
        canCollide: true,
        anchored: true,
        trigger: "bounce_pad",
        triggerParam: 18,
      },
      {
        id: "coin-1",
        name: "Gold_Coin_High",
        type: "coin",
        position: [0, 7.0, -14],
        rotation: [0, 0, 0],
        scale: [0.8, 0.8, 0.8],
        color: "#eab308",
        material: "glow",
        canCollide: false,
        anchored: true,
        trigger: "give_coin",
        triggerParam: 10,
      },
      {
        id: "check-1",
        name: "Checkpoint_Island",
        type: "checkpoint",
        position: [0, 4.0, -20],
        rotation: [0, 0, 0],
        scale: [3, 0.6, 3],
        color: "#06b6d4",
        canCollide: true,
        anchored: true,
        trigger: "set_checkpoint",
      },
    ],
  },
  base_arena: {
    name: "Base Arena",
    desc: "A floating battle and sandbox arena with stone walls, pillars, and hazards.",
    objects: [
      {
        id: "arena-floor",
        name: "Arena_Floor",
        type: "block",
        position: [0, -0.5, 0],
        rotation: [0, 0, 0],
        scale: [14, 1, 14],
        color: "#475569",
        material: "stone",
        canCollide: true,
        anchored: true,
        trigger: "none",
      },
      {
        id: "spawn-1",
        name: "Spawn_Point",
        type: "spawn",
        position: [0, 0.5, 4],
        rotation: [0, 0, 0],
        scale: [2, 0.2, 2],
        color: "#22c55e",
        canCollide: true,
        anchored: true,
        trigger: "none",
      },
      {
        id: "pillar-1",
        name: "Stone_Pillar_NE",
        type: "block",
        position: [5, 2.5, -5],
        rotation: [0, 0, 0],
        scale: [1.5, 5, 1.5],
        color: "#94a3b8",
        canCollide: true,
        anchored: true,
        trigger: "none",
      },
      {
        id: "pillar-2",
        name: "Stone_Pillar_NW",
        type: "block",
        position: [-5, 2.5, -5],
        rotation: [0, 0, 0],
        scale: [1.5, 5, 1.5],
        color: "#94a3b8",
        canCollide: true,
        anchored: true,
        trigger: "none",
      },
      {
        id: "coin-center",
        name: "Arena_Trophy_Coin",
        type: "coin",
        position: [0, 1.5, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        color: "#f59e0b",
        canCollide: false,
        anchored: true,
        trigger: "give_coin",
        triggerParam: 25,
      },
      {
        id: "lava-strip",
        name: "Lava_Trap",
        type: "hazard",
        position: [0, 0.1, -2],
        rotation: [0, 0, 0],
        scale: [6, 0.2, 1],
        color: "#ef4444",
        material: "lava",
        canCollide: true,
        anchored: true,
        trigger: "kill_player",
      },
    ],
  },
};
