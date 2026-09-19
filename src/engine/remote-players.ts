import * as THREE from "three";
import { Avatar } from "@/engine/avatar";
import { NameTag } from "@/engine/nametag";
import type { LiveSandboxPlayer } from "@/lib/sandbox-presence";

type Entity = {
  avatar: Avatar;
  tag: NameTag;
  target: THREE.Vector3;
  current: THREE.Vector3;
  targetYaw: number;
  speed: number;
};

/**
 * Renders every other player in the sandbox: a GLB character that interpolates
 * towards its last networked position, with an Inter name tag and chat bubble
 * floating above the head.
 */
export class RemotePlayers {
  private entities = new Map<string, Entity>();

  constructor(private scene: THREE.Scene) {}

  /** Reconcile the live roster from presence. */
  sync(players: LiveSandboxPlayer[]) {
    const seen = new Set<string>();
    for (const p of players) {
      seen.add(p.uid);
      let e = this.entities.get(p.uid);
      if (!e) {
        e = this.spawn(p.uid, p.name || "Player", new THREE.Vector3(p.x, p.y, p.z));
      }
      e.tag.setName(p.name || "Player");
      e.tag.setBadges(p.badges ?? []);
      e.target.set(p.x, p.y, p.z);
      e.targetYaw = p.rotY ?? 0;
    }
    for (const [uid, e] of this.entities) {
      if (seen.has(uid)) continue;
      this.remove(uid, e);
    }
  }

  spawn(uid: string, name: string, at: THREE.Vector3) {
    const avatar = new Avatar();
    void avatar.load(1.8);
    this.scene.add(avatar.group);
    const tag = new NameTag(name);
    this.scene.add(tag.group);
    const e: Entity = {
      avatar,
      tag,
      target: at.clone(),
      current: at.clone(),
      targetYaw: 0,
      speed: 0,
    };
    this.entities.set(uid, e);
    return e;
  }

  get(uid: string) {
    return this.entities.get(uid);
  }

  /** Every live entity, for hit-testing and floating HP bars. */
  list(): [string, Entity][] {
    return [...this.entities];
  }

  /** Show a chat bubble above a player (no-op when they aren't nearby). */
  say(uid: string, text: string) {
    this.entities.get(uid)?.tag.say(text);
  }

  setPosition(uid: string, pos: THREE.Vector3, yaw: number) {
    const e = this.entities.get(uid);
    if (!e) return;
    e.target.copy(pos);
    e.targetYaw = yaw;
  }

  update(dt: number, cameraPosition: THREE.Vector3) {
    for (const e of this.entities.values()) {
      const prev = e.current.clone();
      e.current.lerp(e.target, 1 - Math.exp(-12 * dt));
      e.speed = prev.distanceTo(e.current) / Math.max(dt, 0.0001);
      if (e.avatar.loaded) {
        e.avatar.update(dt, e.current, e.targetYaw, e.speed, true, false, 0);
      }
      e.tag.group.position.copy(e.current);
      e.tag.update(cameraPosition);
    }
  }

  private remove(uid: string, e: Entity) {
    this.scene.remove(e.avatar.group);
    this.scene.remove(e.tag.group);
    e.avatar.dispose();
    e.tag.dispose();
    this.entities.delete(uid);
  }

  dispose() {
    for (const [uid, e] of [...this.entities]) this.remove(uid, e);
  }
}
