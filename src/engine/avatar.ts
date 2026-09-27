import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { SANDBOX_AVATAR_FALLBACK_MODEL, SANDBOX_AVATAR_MODEL } from "@/engine/avatar-model";

const JUMP_CLIP_URL = "https://file.garden/alGOOylwpAfCa6qP/Nuovo_Progetto_10_jump.glb";
const CROUCH_CLIP_URL = "https://file.garden/alGOOylwpAfCa6qP/Nuovo_Progetto_10_crouch.glb";

/**
 * Universal character model for Skyblock and Block Fall.
 * Guarantees zero-delay visibility with procedural rig fallback,
 * and loads the universal GLB model with baked animations:
 * - Breathe (idle breathing)
 * - Walk (walking/running)
 * - Jump (jumping / in-air)
 * - Climb (ladder/climb)
 * - Die (angel death sequence before respawning)
 */
export class Avatar {
  readonly group = new THREE.Group();
  private mixer: THREE.AnimationMixer | null = null;
  private animActions: {
    breathe?: THREE.AnimationAction;
    walk?: THREE.AnimationAction;
    jump?: THREE.AnimationAction;
    climb?: THREE.AnimationAction;
    die?: THREE.AnimationAction;
    crouch?: THREE.AnimationAction;
  } = {};
  /** When true the walk cycle pauses while standing still (used by NPCs). */
  idleStill = false;
  private model: THREE.Object3D | null = null;
  private proceduralRig: THREE.Group | null = null;
  private procParts: {
    head?: THREE.Mesh;
    torso?: THREE.Mesh;
    leftArm?: THREE.Mesh;
    rightArm?: THREE.Mesh;
    leftLeg?: THREE.Mesh;
    rightLeg?: THREE.Mesh;
  } = {};

  private targetYaw = 0;
  private air = 0;
  private landSquash = 0;
  private wasOnGround = true;
  private walkCycle = 0;
  private breatheCycle = 0;
  private readonly baseScale = 1;

  loaded = true; // Always visible from frame 0
  isDying = false;
  private deathCallback: (() => void) | null = null;
  private deathTimer: number | null = null;

  constructor() {
    // Build procedural rig as an emergency fallback, but keep it hidden unless GLB fails
    this.buildProceduralRig();
    if (this.proceduralRig) {
      this.proceduralRig.visible = false;
    }
  }

  private buildProceduralRig() {
    const rig = new THREE.Group();
    this.proceduralRig = rig;

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffdfc4, roughness: 0.8 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x3d2314, roughness: 0.9 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: 0x2299dd, roughness: 0.7 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1f3c64, roughness: 0.8 });
    const shoesMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });

    // Torso: center at y = 1.05
    const torsoGeo = new THREE.BoxGeometry(0.5, 0.65, 0.28);
    const torso = new THREE.Mesh(torsoGeo, shirtMat);
    torso.position.y = 1.05;
    torso.castShadow = true;
    torso.receiveShadow = true;
    rig.add(torso);
    this.procParts.torso = torso;

    // Head: center at y = 1.62
    const headGeo = new THREE.BoxGeometry(0.44, 0.44, 0.44);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 1.62;
    head.castShadow = true;
    head.receiveShadow = true;

    // Hair cap
    const hairGeo = new THREE.BoxGeometry(0.46, 0.18, 0.46);
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.y = 0.18;
    head.add(hair);

    rig.add(head);
    this.procParts.head = head;

    // Left Arm (pivot at top y = 1.35)
    const armGeo = new THREE.BoxGeometry(0.2, 0.65, 0.2);
    armGeo.translate(0, -0.3, 0); // pivot at shoulder
    const leftArm = new THREE.Mesh(armGeo, shirtMat);
    leftArm.position.set(-0.38, 1.35, 0);
    leftArm.castShadow = true;
    rig.add(leftArm);
    this.procParts.leftArm = leftArm;

    // Right Arm
    const rightArm = new THREE.Mesh(armGeo, shirtMat);
    rightArm.position.set(0.38, 1.35, 0);
    rightArm.castShadow = true;
    rig.add(rightArm);
    this.procParts.rightArm = rightArm;

    // Left Leg (pivot at hip y = 0.72)
    const legGeo = new THREE.BoxGeometry(0.22, 0.72, 0.22);
    legGeo.translate(0, -0.36, 0);
    const leftLeg = new THREE.Mesh(legGeo, pantsMat);
    leftLeg.position.set(-0.14, 0.72, 0);
    leftLeg.castShadow = true;
    rig.add(leftLeg);
    this.procParts.leftLeg = leftLeg;

    // Right Leg
    const rightLeg = new THREE.Mesh(legGeo, pantsMat);
    rightLeg.position.set(0.14, 0.72, 0);
    rightLeg.castShadow = true;
    rig.add(rightLeg);
    this.procParts.rightLeg = rightLeg;

    this.group.add(rig);
  }

  async load(targetHeight = 2.28) {
    const loader = new GLTFLoader();

    // Priority candidates: Local Avatar_Walk_LegsOnly.glb first, then remote file.garden link
    const candidates = [
      "https://file.garden/alGOOylwpAfCa6qP/Nuovo_Progetto_10_walk.gltf",
      "https://file.garden/alGOOylwpAfCa6qP/Nuovo_Progetto_10_walk.gltf",
      SANDBOX_AVATAR_MODEL,
      SANDBOX_AVATAR_FALLBACK_MODEL,
    ].filter(Boolean);

    let gltf: any = null;
    for (const url of candidates) {
      try {
        gltf = await loader.loadAsync(url);
        if (gltf && gltf.scene) break;
      } catch (err) {
        console.warn(`Failed to load avatar model from ${url}, trying next...`);
      }
    }

    if (!gltf || !gltf.scene) {
      console.warn("Universal GLB model could not be loaded; enabling fallback procedural avatar rig.");
      if (this.proceduralRig) this.proceduralRig.visible = true;
      return this;
    }

    const model = gltf.scene;

    model.traverse((o: any) => {
      if (o.isLight) {
        o.visible = false;
        if ("intensity" in o) o.intensity = 0;
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
          mat.map.magFilter = THREE.LinearFilter;
          mat.map.minFilter = THREE.LinearMipmapLinearFilter;
          mat.map.generateMipmaps = true;
          mat.map.needsUpdate = true;
        }
        if (mat.emissiveMap) {
          mat.emissiveMap.colorSpace = THREE.SRGBColorSpace;
          mat.emissiveMap.magFilter = THREE.LinearFilter;
          mat.emissiveMap.minFilter = THREE.LinearMipmapLinearFilter;
          mat.emissiveMap.needsUpdate = true;
        }
        if ("roughness" in mat) {
          mat.roughness = THREE.MathUtils.clamp(mat.roughness ?? 0.6, 0.2, 0.85);
        }
        if ("metalness" in mat) {
          mat.metalness = THREE.MathUtils.clamp(mat.metalness ?? 0.1, 0, 0.35);
        }
        if ("envMapIntensity" in mat) {
          mat.envMapIntensity = 0.8;
        }
        mat.needsUpdate = true;
      }
    });

    // Remove the procedural rig now that the real GLB is ready
    if (this.proceduralRig) {
      this.group.remove(this.proceduralRig);
      this.proceduralRig = null;
    }

    // Normalise size + put the feet at y = 0
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

    if (gltf.animations && gltf.animations.length) {
      this.mixer = new THREE.AnimationMixer(model);

      for (const clip of gltf.animations) {
        const name = clip.name.toLowerCase();
        const action = this.mixer.clipAction(clip);
        if (name.includes("die") || name.includes("death")) {
          action.setLoop(THREE.LoopOnce, 1);
          action.clampWhenFinished = true;
          this.animActions.die = action;
        } else if (name.includes("jump") || name.includes("air")) {
          action.setLoop(THREE.LoopRepeat, Infinity);
          this.animActions.jump = action;
        } else if (name.includes("climb")) {
          action.setLoop(THREE.LoopRepeat, Infinity);
          this.animActions.climb = action;
        } else if (name.includes("walk") || name.includes("run")) {
          action.setLoop(THREE.LoopRepeat, Infinity);
          this.animActions.walk = action;
        } else if (name.includes("breathe") || name.includes("idle")) {
          action.setLoop(THREE.LoopRepeat, Infinity);
          this.animActions.breathe = action;
        }
      }

      // Fallback if walk wasn't found by name
      if (!this.animActions.walk && gltf.animations[0]) {
        this.animActions.walk = this.mixer.clipAction(gltf.animations[0]);
        this.animActions.walk.setLoop(THREE.LoopRepeat, Infinity);
      }

      // Automatically start the character's walking animation
      if (this.animActions.walk) {
        this.animActions.walk.reset();
        this.animActions.walk.setLoop(THREE.LoopRepeat, Infinity);
        this.animActions.walk.setEffectiveWeight(1);
        this.animActions.walk.setEffectiveTimeScale(1.0);
        this.animActions.walk.play();
      }

      // Initial playback weights: ensure walk animation is active and started
      if (this.animActions.breathe) {
        this.animActions.breathe.play();
        this.animActions.breathe.setEffectiveWeight(this.animActions.walk ? 0.2 : 1);
      }
      if (this.animActions.jump) {
        this.animActions.jump.play();
        this.animActions.jump.setEffectiveWeight(0);
      }
      if (this.animActions.climb) {
        this.animActions.climb.play();
        this.animActions.climb.setEffectiveWeight(0);
      }
      if (this.animActions.die) {
        this.animActions.die.setEffectiveWeight(0);
      }

      this.mixer.addEventListener("finished", (e: any) => {
        if (this.animActions.die && e.action === this.animActions.die) {
          this.completeDeath();
        }
      });

      void this.loadStateClips(loader);
    }

    return this;
  }

  /** Dedicated jump + crouch clips share the walk rig, so they bind by bone name. */
  private async loadStateClips(loader: GLTFLoader) {
    const load = async (url: string) => {
      const g = await loader.loadAsync(url).catch(() => null);
      return g?.animations?.[0] ?? null;
    };
    const [jumpClip, crouchClip] = await Promise.all([load(JUMP_CLIP_URL), load(CROUCH_CLIP_URL)]);
    if (!this.mixer) return;
    if (jumpClip) {
      this.animActions.jump?.stop();
      const a = this.mixer.clipAction(jumpClip);
      a.setLoop(THREE.LoopRepeat, Infinity);
      a.play();
      a.setEffectiveWeight(0);
      this.animActions.jump = a;
    }
    if (crouchClip) {
      const a = this.mixer.clipAction(crouchClip);
      a.setLoop(THREE.LoopRepeat, Infinity);
      a.play();
      a.setEffectiveWeight(0);
      this.animActions.crouch = a;
    }
  }

  triggerDeath(onRespawn?: () => void) {
    if (this.isDying) return;
    this.isDying = true;
    this.deathCallback = onRespawn ?? null;

    if (this.animActions.die) {
      if (this.animActions.breathe) this.animActions.breathe.setEffectiveWeight(0);
      if (this.animActions.walk) this.animActions.walk.setEffectiveWeight(0);
      if (this.animActions.jump) this.animActions.jump.setEffectiveWeight(0);
      if (this.animActions.climb) this.animActions.climb.setEffectiveWeight(0);

      this.animActions.die.reset();
      this.animActions.die.setEffectiveWeight(1);
      this.animActions.die.play();

      const dur = (this.animActions.die.getClip().duration || 1.5) * 1000;
      if (this.deathTimer !== null) clearTimeout(this.deathTimer);
      this.deathTimer = window.setTimeout(() => {
        this.completeDeath();
      }, dur + 60);
    } else {
      // Procedural angel death duration
      if (this.deathTimer !== null) clearTimeout(this.deathTimer);
      this.deathTimer = window.setTimeout(() => {
        this.completeDeath();
      }, 1500);
    }
  }

  private completeDeath() {
    if (this.deathTimer !== null) {
      clearTimeout(this.deathTimer);
      this.deathTimer = null;
    }
    const cb = this.deathCallback;
    this.deathCallback = null;
    cb?.();
  }

  resetDeath() {
    this.isDying = false;
    if (this.deathTimer !== null) {
      clearTimeout(this.deathTimer);
      this.deathTimer = null;
    }
    this.deathCallback = null;

    if (this.animActions.die) {
      this.animActions.die.stop();
      this.animActions.die.setEffectiveWeight(0);
    }
    if (this.animActions.breathe) {
      this.animActions.breathe.reset();
      this.animActions.breathe.setEffectiveWeight(1);
      this.animActions.breathe.play();
    }
    if (this.animActions.walk) {
      this.animActions.walk.setEffectiveWeight(0);
    }
    if (this.animActions.jump) {
      this.animActions.jump.setEffectiveWeight(0);
    }

    if (this.model) {
      this.model.position.y = 0;
      this.model.rotation.set(0, 0, 0);
      this.model.scale.set(this.baseScale, this.baseScale, this.baseScale);
    }
  }

  /**
   * @param speed horizontal speed in blocks/s
   * @param yaw facing direction (radians)
   */
  update(
    dt: number,
    position: THREE.Vector3,
    yaw: number,
    speed: number,
    onGround: boolean,
    sneaking: boolean,
    verticalVelocity = 0,
    climbing = false,
  ) {
    this.group.position.copy(position);

    if (this.isDying) {
      if (this.mixer) {
        this.mixer.update(dt);
      } else if (this.proceduralRig) {
        // Procedural angel death pose: arms raised wide, body tilting back
        if (this.procParts.leftArm) this.procParts.leftArm.rotation.z = -1.2;
        if (this.procParts.rightArm) this.procParts.rightArm.rotation.z = 1.2;
        if (this.procParts.torso) this.procParts.torso.rotation.x = -0.5;
        this.proceduralRig.position.y = 0.4;
      }
      return;
    }

    // Smooth turning towards camera/motion direction
    let delta = yaw - this.targetYaw;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    this.targetYaw += delta * (1 - Math.exp(-14 * dt));
    this.group.rotation.y = this.targetYaw;

    const moving = speed > 0.35 && onGround;
    const inAir = !onGround || Math.abs(verticalVelocity) > 2.0;

    let targetWalk = 1; // Automatically keep walking animation active
    let targetBreathe = 0;
    let targetJump = 0;
    let targetClimb = 0;
    let targetCrouch = 0;

    if (climbing && this.animActions.climb) {
      targetClimb = 1;
    } else if (inAir && this.animActions.jump) {
      targetJump = 1;
      targetWalk = 0;
    } else if (sneaking && this.animActions.crouch) {
      targetCrouch = 1;
      targetWalk = 0;
    } else if (moving && this.animActions.walk) {
      targetWalk = 1;
    } else {
      targetWalk = 1;
      targetBreathe = 0.2;
    }

    const blendFactor = 1 - Math.exp(-14 * dt);

    if (this.animActions.walk) {
      const w = THREE.MathUtils.lerp(
        this.animActions.walk.getEffectiveWeight(),
        targetWalk,
        blendFactor,
      );
      // Walk stays the base layer unless a dedicated state clip takes over.
      this.animActions.walk.setEffectiveWeight(targetWalk === 0 ? w : Math.max(0.9, w));
      const targetTimeScale =
        this.idleStill && !moving ? 0 : sneaking ? 0.65 : speed > 5 ? 1.55 : 1.0;
      if (targetTimeScale === 0) this.animActions.walk.time = 0;
      this.animActions.walk.setEffectiveTimeScale(targetTimeScale);
      if (!this.animActions.walk.isRunning()) {
        this.animActions.walk.play();
      }
    }

    if (this.animActions.breathe) {
      const w = THREE.MathUtils.lerp(
        this.animActions.breathe.getEffectiveWeight(),
        targetBreathe,
        blendFactor,
      );
      this.animActions.breathe.setEffectiveWeight(w);
      this.animActions.breathe.setEffectiveTimeScale(1.0);
    }

    if (this.animActions.jump) {
      const w = THREE.MathUtils.lerp(
        this.animActions.jump.getEffectiveWeight(),
        targetJump,
        blendFactor,
      );
      this.animActions.jump.setEffectiveWeight(w);
      this.animActions.jump.setEffectiveTimeScale(1.0);
    }

    if (this.animActions.climb) {
      const w = THREE.MathUtils.lerp(
        this.animActions.climb.getEffectiveWeight(),
        targetClimb,
        blendFactor,
      );
      this.animActions.climb.setEffectiveWeight(w);
    }

    if (this.animActions.crouch) {
      const w = THREE.MathUtils.lerp(this.animActions.crouch.getEffectiveWeight(), targetCrouch, blendFactor);
      this.animActions.crouch.setEffectiveWeight(w);
      this.animActions.crouch.setEffectiveTimeScale(moving ? 1 : 0.35);
    }

    if (this.mixer) {
      this.mixer.update(dt);
    }

    // Procedural animation loop if GLB has not loaded yet
    if (this.proceduralRig) {
      this.breatheCycle += dt * 3;
      const breathe = Math.sin(this.breatheCycle) * 0.02;
      if (this.procParts.torso) this.procParts.torso.position.y = 1.05 + breathe;
      if (this.procParts.head) this.procParts.head.position.y = 1.62 + breathe;

      this.walkCycle += dt * (moving ? Math.max(speed * 2.5, 3.5) : 3.5);
      const legSwing = Math.sin(this.walkCycle) * 0.6;
      if (inAir) {
        if (this.procParts.leftArm) this.procParts.leftArm.rotation.x = -1.2;
        if (this.procParts.rightArm) this.procParts.rightArm.rotation.x = -1.2;
        if (this.procParts.leftLeg) this.procParts.leftLeg.rotation.x = 0.3 + legSwing * 0.3;
        if (this.procParts.rightLeg) this.procParts.rightLeg.rotation.x = -0.3 - legSwing * 0.3;
      } else {
        if (this.procParts.leftLeg) this.procParts.leftLeg.rotation.x = legSwing;
        if (this.procParts.rightLeg) this.procParts.rightLeg.rotation.x = -legSwing;
        if (this.procParts.leftArm) this.procParts.leftArm.rotation.x = -legSwing;
        if (this.procParts.rightArm) this.procParts.rightArm.rotation.x = legSwing;
      }
    }

    // Subtle sneak crouch and landing squash
    const airTarget = onGround ? 0 : 1;
    this.air += (airTarget - this.air) * (1 - Math.exp(-16 * dt));
    if (this.wasOnGround && !onGround) this.landSquash = 0;
    if (!this.wasOnGround && onGround) this.landSquash = 1;
    this.wasOnGround = onGround;
    this.landSquash = Math.max(0, this.landSquash - dt * 5);

    if (this.model) {
      const hasCrouchClip = !!this.animActions.crouch;
      const crouch = sneaking && !hasCrouchClip ? -0.16 : 0;
      this.model.position.y = crouch - this.landSquash * 0.08;
      this.model.rotation.x = sneaking && !hasCrouchClip ? 0.14 : 0;
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
