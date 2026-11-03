import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  SANDBOX_AVATAR_FALLBACK_MODEL,
  SANDBOX_AVATAR_MODEL,
  WITCH_AVATAR_MODEL,
  WITCH_AVATAR_REMOTE_URL,
} from "./avatar-model";

/**
 * Sparkling Purple Aura effect with glowing runic rings and swirling particles.
 */
class PurpleAuraFx {
  readonly group = new THREE.Group();
  private rings: THREE.Mesh[] = [];
  private particles: THREE.Points;
  private particleGeo: THREE.BufferGeometry;
  private particlePositions: Float32Array;
  private particleVelocities: { angle: number; speed: number; radius: number; y: number }[] = [];
  private count = 42;
  private time = 0;

  constructor() {
    // 1. Dual rotating runic rings on the ground
    const ringGeo = new THREE.RingGeometry(0.55, 0.78, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ring1 = new THREE.Mesh(ringGeo, ringMat);
    ring1.position.y = 0.05;
    this.rings.push(ring1);
    this.group.add(ring1);

    const ringGeo2 = new THREE.RingGeometry(0.85, 1.05, 32);
    ringGeo2.rotateX(-Math.PI / 2);
    const ringMat2 = new THREE.MeshBasicMaterial({
      color: 0xc084fc,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    ring2.position.y = 0.07;
    this.rings.push(ring2);
    this.group.add(ring2);

    // 2. Swirling sparkling purple particles
    this.particlePositions = new Float32Array(this.count * 3);
    for (let i = 0; i < this.count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.35 + Math.random() * 0.5;
      const y = Math.random() * 2.2;
      this.particleVelocities.push({
        angle,
        speed: 1.5 + Math.random() * 1.8,
        radius,
        y,
      });
      this.particlePositions[i * 3] = Math.cos(angle) * radius;
      this.particlePositions[i * 3 + 1] = y;
      this.particlePositions[i * 3 + 2] = Math.sin(angle) * radius;
    }

    this.particleGeo = new THREE.BufferGeometry();
    this.particleGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(this.particlePositions, 3),
    );

    const canvas = typeof document !== "undefined" ? document.createElement("canvas") : null;
    let sparkTex: THREE.Texture | null = null;
    if (canvas) {
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
        grad.addColorStop(0, "rgba(255, 255, 255, 1)");
        grad.addColorStop(0.35, "rgba(216, 180, 254, 0.95)");
        grad.addColorStop(0.7, "rgba(168, 85, 247, 0.6)");
        grad.addColorStop(1, "rgba(126, 34, 206, 0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 64, 64);
      }
      sparkTex = new THREE.CanvasTexture(canvas);
      sparkTex.colorSpace = THREE.SRGBColorSpace;
    }

    const pMat = new THREE.PointsMaterial({
      size: 0.24,
      map: sparkTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      color: 0xf3e8ff,
    });
    this.particles = new THREE.Points(this.particleGeo, pMat);
    this.group.add(this.particles);

    this.group.visible = false;
  }

  update(dt: number) {
    if (!this.group.visible) return;
    this.time += dt;

    if (this.rings[0]) {
      this.rings[0].rotation.y += dt * 1.6;
      const s = 1 + Math.sin(this.time * 4) * 0.1;
      this.rings[0].scale.set(s, s, s);
    }
    if (this.rings[1]) {
      this.rings[1].rotation.y -= dt * 1.1;
      const s = 1 + Math.cos(this.time * 3.2) * 0.08;
      this.rings[1].scale.set(s, s, s);
    }

    const pos = this.particlePositions;
    for (let i = 0; i < this.count; i++) {
      const v = this.particleVelocities[i];
      v.angle += dt * v.speed;
      v.y += dt * 0.75;
      if (v.y > 2.4) {
        v.y = 0.05;
        v.radius = 0.35 + Math.random() * 0.5;
      }
      pos[i * 3] = Math.cos(v.angle) * v.radius;
      pos[i * 3 + 1] = v.y + Math.sin(this.time * 6 + i) * 0.04;
      pos[i * 3 + 2] = Math.sin(v.angle) * v.radius;
    }
    this.particleGeo.attributes.position.needsUpdate = true;
  }

  setVisible(v: boolean) {
    this.group.visible = v;
  }
}

/**
 * Universal character model for Skyblock and Block Fall.
 * Guarantees zero-delay visibility with procedural rig fallback,
 * and loads the universal GLB model with baked animations.
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
  isEmoting = false;
  emoteTime = 0;
  private purpleAura: PurpleAuraFx | null = null;
  private deathCallback: (() => void) | null = null;
  private deathTimer: number | null = null;
  private heldItemAnchor = new THREE.Group();
  private heldItemMesh: THREE.Object3D | null = null;

  constructor() {
    // Build procedural rig for instant frame-0 visibility until GLB assets finish loading
    this.buildProceduralRig();
    if (this.proceduralRig) {
      this.proceduralRig.visible = true;
    }
    this.purpleAura = new PurpleAuraFx();
    this.group.add(this.purpleAura.group);

    // Right-hand held item anchor for 3rd person visibility
    this.heldItemAnchor.position.set(0.32, 0.75, 0.22);
    this.heldItemAnchor.rotation.set(-0.25, 0.35, -0.15);
    this.heldItemAnchor.visible = false;
    this.group.add(this.heldItemAnchor);
  }

  setEmote(active: boolean) {
    this.isEmoting = active;
    this.purpleAura?.setVisible(active);
    if (!active) {
      this.emoteTime = 0;
      if (this.model) {
        this.model.position.y = 0;
        this.model.rotation.z = 0;
      }
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

    // Priority candidates: Local avatar_boy_all_anims.glb first to match Blockman GO boy from screenshots
    const candidates = [
      SANDBOX_AVATAR_MODEL,
      "/avatar_boy_all_anims.glb",
      SANDBOX_AVATAR_FALLBACK_MODEL,
      WITCH_AVATAR_MODEL,
      WITCH_AVATAR_REMOTE_URL,
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

      // Automatically start the character animation immediately
      if (this.animActions.walk) {
        this.animActions.walk.reset();
        this.animActions.walk.setLoop(THREE.LoopRepeat, Infinity);
        this.animActions.walk.clampWhenFinished = false;
        this.animActions.walk.enabled = true;
        this.animActions.walk.setEffectiveWeight(1.0);
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
    }

    return this;
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

    const moving = speed > 0.15 && onGround;
    const inAir = !onGround || Math.abs(verticalVelocity) > 2.0;

    let targetTimeScale = 1.0;

    if (inAir) {
      targetTimeScale = 1.2;
    } else if (moving) {
      targetTimeScale = sneaking ? 0.75 : speed > 5 ? 1.55 : Math.max(0.95, speed * 0.28);
    } else {
      targetTimeScale = 0.85;
    }

    if (this.animActions.walk) {
      const walkWeight = (moving || inAir) ? 1.0 : 0.0;
      this.animActions.walk.setEffectiveWeight(walkWeight);
      this.animActions.walk.setEffectiveTimeScale(targetTimeScale);
      if (walkWeight > 0 && !this.animActions.walk.isRunning()) {
        this.animActions.walk.play();
      }
    }

    if (this.animActions.breathe) {
      const breatheWeight = (moving || inAir) ? 0.2 : 1.0;
      this.animActions.breathe.setEffectiveWeight(breatheWeight);
      this.animActions.breathe.setEffectiveTimeScale(1.0);
      if (!this.animActions.breathe.isRunning()) {
        this.animActions.breathe.play();
      }
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

    // Update Sparkling Purple Aura effect
    if (this.purpleAura) {
      this.purpleAura.update(dt);
    }

    if (this.model) {
      if (this.isEmoting) {
        this.emoteTime += dt;
        // Smooth continuous looping dance motion with bounce, sway, and groove
        const danceY = Math.sin(this.emoteTime * 5.8) * 0.12;
        const danceSway = Math.sin(this.emoteTime * 4.2) * 0.18;
        const danceTurn = Math.sin(this.emoteTime * 2.6) * 0.28;
        this.model.position.y = danceY;
        this.model.rotation.z = danceSway;
        this.model.rotation.y = danceTurn;
        this.model.rotation.x = 0;
      } else {
        const hasCrouchClip = !!this.animActions.crouch;
        const crouch = sneaking && !hasCrouchClip ? -0.16 : 0;
        this.model.position.y = crouch - this.landSquash * 0.08;
        this.model.rotation.x = sneaking && !hasCrouchClip ? 0.14 : 0;
        this.model.rotation.z *= Math.max(0, 1 - dt * 8);
        this.model.rotation.y *= Math.max(0, 1 - dt * 8);
      }
    }
  }

  setVisible(v: boolean) {
    this.group.visible = v;
  }

  setAlpha(alpha: number) {
    const clamped = THREE.MathUtils.clamp(alpha, 0.05, 1.0);
    this.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && m.material) {
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        mats.forEach((mat) => {
          if (mat) {
            mat.transparent = clamped < 0.99;
            mat.opacity = clamped;
            mat.needsUpdate = true;
          }
        });
      }
    });
  }

  setHeldItem(itemId: number | string) {
    if (this.heldItemMesh) {
      this.heldItemAnchor.remove(this.heldItemMesh);
      this.heldItemMesh = null;
    }
    if (!itemId || itemId === 0) {
      this.heldItemAnchor.visible = false;
      return;
    }
    this.heldItemAnchor.visible = true;
    if (typeof itemId === "number") {
      const geo = new THREE.BoxGeometry(0.24, 0.24, 0.24);
      const mat = new THREE.MeshStandardMaterial({
        color:
          itemId === 1 ? 0x5b8e3a :
          itemId === 2 ? 0x866043 :
          itemId === 3 ? 0x808080 :
          itemId === 4 ? 0x9a9aa0 :
          itemId === 13 ? 0x8b5a2b :
          itemId === 20 ? 0x55ffff :
          itemId === 19 ? 0xffd700 :
          itemId === 47 ? 0xd8dde0 :
          0xaaaaaa,
        roughness: 0.7,
      });
      const cube = new THREE.Mesh(geo, mat);
      cube.castShadow = true;
      this.heldItemMesh = cube;
      this.heldItemAnchor.add(cube);
    } else {
      const name = String(itemId).toLowerCase();
      const url = name.includes("sword") || name.includes("staff") ? "/short-sword.svg" : `/items/${name}.png`;
      const mat = new THREE.MeshStandardMaterial({
        transparent: true,
        side: THREE.DoubleSide,
        alphaTest: 0.1,
      });
      new THREE.TextureLoader().load(url, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.NearestFilter;
        mat.map = tex;
        mat.needsUpdate = true;
      });
      const geo = new THREE.PlaneGeometry(0.38, 0.38);
      const sprite = new THREE.Mesh(geo, mat);
      sprite.castShadow = true;
      this.heldItemMesh = sprite;
      this.heldItemAnchor.add(sprite);
    }
  }

  dispose() {
    this.mixer?.stopAllAction();
    if (this.heldItemMesh) {
      this.heldItemAnchor.remove(this.heldItemMesh);
      this.heldItemMesh = null;
    }
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
