import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneModel } from "three/examples/jsm/utils/SkeletonUtils.js";

export const CHEST_MODEL_URL = "/skyblock/chest.glb";
const CLICK_RANGE = 9;
const NEAR_RANGE = 6;
const RESPAWN_SECONDS = 150;

interface ChestEntry {
  root: THREE.Group;
  mixer: THREE.AnimationMixer;
  action: THREE.AnimationAction;
  state: "closed" | "opening" | "gone";
  respawnIn: number;
}

export interface RewardChestsOptions {
  scene: THREE.Scene;
  camera: THREE.Camera;
  canvas: HTMLElement;
  playerPosition: () => THREE.Vector3;
  /** Fires once the opening animation has finished and the chest has vanished. */
  onOpened: () => void;
  onNear: (near: boolean) => void;
}

/**
 * Golden chest props. They stay perfectly still until clicked, then play the
 * model's own "open" animation, vanish, and hand control back to the game
 * (sound + reward screen). Chests come back after a while.
 */
export class RewardChests {
  private entries: ChestEntry[] = [];
  private template: THREE.Object3D | null = null;
  private clip: THREE.AnimationClip | null = null;
  private pending: { x: number; y: number; z: number; yaw: number }[] = [];
  private raycaster = new THREE.Raycaster();
  private ndc = new THREE.Vector2();
  private near = false;
  private disposed = false;
  private readonly onPointerDown: (e: PointerEvent) => void;

  constructor(private readonly opts: RewardChestsOptions) {
    this.onPointerDown = (e) => this.handlePointer(e);
    opts.canvas.addEventListener("pointerdown", this.onPointerDown);
    new GLTFLoader().load(
      CHEST_MODEL_URL,
      (gltf) => {
        if (this.disposed) return;
        const model = gltf.scene;
        model.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (!mesh.isMesh) return;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.frustumCulled = false;
        });
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const scale = 1.05 / Math.max(size.x, size.z, 0.001);
        model.scale.setScalar(scale);
        const fitted = new THREE.Box3().setFromObject(model);
        const center = fitted.getCenter(new THREE.Vector3());
        model.position.x -= center.x;
        model.position.z -= center.z;
        model.position.y -= fitted.min.y;
        const holder = new THREE.Group();
        holder.add(model);
        this.template = holder;
        this.clip = gltf.animations.find((a) => a.name === "open") ?? gltf.animations[0] ?? null;
        for (const p of this.pending) this.spawn(p.x, p.y, p.z, p.yaw);
        this.pending = [];
      },
      undefined,
      (err) => console.warn("Failed to load chest model:", err),
    );
  }

  add(x: number, y: number, z: number, yaw = 0) {
    if (this.template) this.spawn(x, y, z, yaw);
    else this.pending.push({ x, y, z, yaw });
  }

  private spawn(x: number, y: number, z: number, yaw: number) {
    if (!this.template || !this.clip) return;
    const root = cloneModel(this.template) as THREE.Group;
    root.position.set(x, y, z);
    root.rotation.y = yaw;
    const mixer = new THREE.AnimationMixer(root);
    const action = mixer.clipAction(this.clip);
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.play();
    action.paused = true;
    action.time = 0;
    mixer.update(0);
    this.opts.scene.add(root);
    this.entries.push({ root, mixer, action, state: "closed", respawnIn: 0 });
  }

  private handlePointer(e: PointerEvent) {
    if (this.disposed || this.entries.length === 0) return;
    const rect = this.opts.canvas.getBoundingClientRect();
    if (document.pointerLockElement) {
      this.ndc.set(0, 0);
    } else {
      this.ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -(((e.clientY - rect.top) / rect.height) * 2 - 1));
    }
    this.raycaster.setFromCamera(this.ndc, this.opts.camera);
    const targets = this.entries.filter((c) => c.state === "closed").map((c) => c.root);
    if (targets.length === 0) return;
    const hits = this.raycaster.intersectObjects(targets, true);
    if (hits.length === 0) return;
    let obj: THREE.Object3D | null = hits[0].object;
    while (obj && !targets.includes(obj as THREE.Group)) obj = obj.parent;
    const entry = this.entries.find((c) => c.root === obj);
    if (!entry) return;
    if (entry.root.position.distanceTo(this.opts.playerPosition()) > CLICK_RANGE) return;
    this.open(entry);
  }

  private open(entry: ChestEntry) {
    entry.state = "opening";
    entry.action.paused = false;
    entry.action.reset();
    entry.action.play();
    const onFinished = (ev: { action: THREE.AnimationAction }) => {
      if (ev.action !== entry.action) return;
      entry.mixer.removeEventListener("finished", onFinished);
      entry.state = "gone";
      entry.root.visible = false;
      entry.respawnIn = RESPAWN_SECONDS;
      this.opts.onOpened();
    };
    entry.mixer.addEventListener("finished", onFinished);
  }

  update(dt: number) {
    const player = this.opts.playerPosition();
    let nearAny = false;
    for (const c of this.entries) {
      if (c.state === "opening") c.mixer.update(dt);
      else if (c.state === "gone") {
        c.respawnIn -= dt;
        if (c.respawnIn <= 0) {
          c.action.reset();
          c.action.play();
          c.action.paused = true;
          c.action.time = 0;
          c.mixer.update(0);
          c.root.visible = true;
          c.state = "closed";
        }
      } else if (c.root.position.distanceTo(player) < NEAR_RANGE) nearAny = true;
    }
    if (nearAny !== this.near) {
      this.near = nearAny;
      this.opts.onNear(nearAny);
    }
  }

  dispose() {
    this.disposed = true;
    this.opts.canvas.removeEventListener("pointerdown", this.onPointerDown);
    for (const c of this.entries) {
      c.mixer.stopAllAction();
      this.opts.scene.remove(c.root);
    }
    this.entries = [];
  }
}
