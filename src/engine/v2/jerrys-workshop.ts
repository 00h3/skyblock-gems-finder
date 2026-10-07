import * as THREE from "three";
import { loadBedwarsLobby } from "./bedwars-lobby-model";

export { loadBedwarsLobby };

export async function loadJerrysWorkshop(scene: THREE.Scene): Promise<THREE.Group> {
  const { model } = await loadBedwarsLobby(scene);
  return model;
}

