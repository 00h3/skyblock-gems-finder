import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { SANDBOX_AVATAR_FALLBACK_MODEL, SANDBOX_AVATAR_MODEL } from "@/engine/avatar-model";
const playerAsset = { url: SANDBOX_AVATAR_MODEL };

/**
 * The QBLOCK character used in third person. Loads the GLB, normalises its
 * scale to the player's collider height and cross-fades between an idle pose
 * and the baked "QBLOCK Walk" clip depending on movement speed.
 */
export class Avatar {
  readonly group = new THREE.Group();
  private mixer: THREE.AnimationMixer | null = null;
  private walk: THREE.AnimationAction | null = null;
  private model: THREE.Object3D | null = null;
  private idleT = 0;
  private targetYaw = 0;
  private air = 0;
  private landSquash = 0;
  private wasOnGround = true;
  private readonly baseScale = 1;
  loaded = false;

  async load(targetHeight = 1.8) {
    const loader = new GLTFLoader();
    // Fall back to the bundled rig if the hosted asset isn't reachable.
    let gltf;
    try {
      gltf = await loader.loadAsync(playerAsset.url);
    } catch {
      gltf = await loader.loadAsync(SANDBOX_AVATAR_FALLBACK_MODEL);
    }
    const model = gltf.scene;

    model.traverse((o) => {
      if ((o as any).isLight) {
        o.visible = false;
        if ("intensity" in o) (o as any).intensity = 0;
      }
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) {
        const mat = m as THREE.MeshStandardMaterial;
        if (mat.map) {
          mat.map.colorSpace = THREE.SRGBColorSpace;
          mat.map.anisotropy = 8;
        }
        if (mat.emissiveMap) mat.emissiveMap.colorSpace = THREE.SRGBColorSpace;
        // kill the washed-out white look: no emissive glow, no mirror-bright env
        if ("emissive" in mat && mat.emissive) mat.emissive.setRGB(0, 0, 0);
        if ("emissiveIntensity" in mat) mat.emissiveIntensity = 0;
        if ("envMapIntensity" in mat) mat.envMapIntensity = 0.1;
        if ("toneMapped" in mat) mat.toneMapped = true;
        // matte, readable surface instead of a blown-out shiny one
        if ("roughness" in mat) mat.roughness = 0.95;
        if ("metalness" in mat) mat.metalness = 0;

        mat.needsUpdate = true;
      }
    });

    // normalise size + put the feet at y = 0
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    const scale = size.y > 0.001 ? targetHeight / size.y : 1;
    model.scale.setScalar(scale);
    const box2 = new THREE.Box3().setFromObject(model);
    const center = new THREE.Vector3();
    box2.getCenter(center);
    model.position.x -= center.x;
    model.position.z -= center.z;
    model.position.y -= box2.min.y;

    const holder = new THREE.Group();
    holder.add(model);
    this.group.add(holder);
    this.model = holder;

    if (gltf.animations.length) {
      this.mixer = new THREE.AnimationMixer(model);
      const clip = gltf.animations.find((c) => /walk/i.test(c.name)) ?? gltf.animations[0];
      this.walk = this.mixer.clipAction(clip);
      this.walk.setLoop(THREE.LoopRepeat, Infinity);
      this.walk.play();
      this.walk.setEffectiveWeight(0);
    }

    this.loaded = true;
    return this;
  }

  /**
   * @param speed horizontal speed in blocks/s
   * @param yaw   facing direction (radians)
   */
  update(
    dt: number,
    position: THREE.Vector3,
    yaw: number,
    speed: number,
    onGround: boolean,
    sneaking: boolean,
    verticalVelocity = 0,
  ) {
    this.group.position.copy(position);

    // smooth turning
    let delta = yaw - this.targetYaw;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    this.targetYaw += delta * (1 - Math.exp(-14 * dt));
    this.group.rotation.y = this.targetYaw;

    const moving = speed > 0.35 && onGround;
    if (this.walk) {
      const target = moving ? 1 : 0;
      const w = THREE.MathUtils.lerp(
        this.walk.getEffectiveWeight(),
        target,
        1 - Math.exp(-12 * dt),
      );
      this.walk.setEffectiveWeight(w);
      this.walk.setEffectiveTimeScale(THREE.MathUtils.clamp(speed / 4.3, 0.6, 1.9));
    }
    this.mixer?.update(dt);

    // ── jump / air pose ─────────────────────────────────────────────────────
    // Blend towards an airborne pose: tuck up, lean forward on the way up,
    // reach down on the way in, then a short squash on touchdown.
    const airTarget = onGround ? 0 : 1;
    this.air += (airTarget - this.air) * (1 - Math.exp(-16 * dt));
    if (this.wasOnGround && !onGround) this.landSquash = 0; // launched
    if (!this.wasOnGround && onGround) this.landSquash = 1; // landed
    this.wasOnGround = onGround;
    this.landSquash = Math.max(0, this.landSquash - dt * 5);

    // gentle idle breathing + sneak crouch when the walk clip is off
    if (this.model) {
      this.idleT += dt;
      const breathe = moving || this.air > 0.05 ? 0 : Math.sin(this.idleT * 1.8) * 0.012;
      const crouch = sneaking ? -0.18 : 0;
      const rise = THREE.MathUtils.clamp(verticalVelocity / 9, -1, 1);
      const tuck = this.air * (0.14 + rise * 0.06);
      this.model.position.y = breathe + crouch + tuck - this.landSquash * 0.14;

      const squash = 1 - this.landSquash * 0.14 + this.air * 0.05;
      const stretch = 1 + this.landSquash * 0.1 - this.air * 0.03;
      this.model.scale.y = this.baseScale * squash;
      this.model.scale.x = this.baseScale * stretch;
      this.model.scale.z = this.baseScale * stretch;

      this.model.rotation.x = sneaking ? 0.18 : this.air * (0.2 - rise * 0.12);
    }
  }

  setVisible(v: boolean) {
    this.group.visible = v;
  }

  dispose() {
    this.mixer?.stopAllAction();
    this.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.geometry?.dispose();
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        mats.forEach((mm) => mm?.dispose());
      }
    });
    this.group.clear();
  }
}
