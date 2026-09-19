import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import type { VoxelObject, SkyboxPreset, ToolMode } from "./wow-types";
import { WowAudio } from "./wow-audio";

interface WowEngine3DProps {
  objects: VoxelObject[];
  selectedId: string | null;
  onSelectObject: (id: string | null) => void;
  onUpdateObject: (updated: VoxelObject) => void;
  onAddBlockAt: (pos: [number, number, number]) => void;
  isPlaying: boolean;
  toolMode: ToolMode;
  gridSnap: number;
  skybox: SkyboxPreset;
  onLog: (msg: string) => void;
  onCoinCollected: (amount: number) => void;
  onNpcDialog: (npcName: string, text: string) => void;
}

export function WowEngine3D({
  objects,
  selectedId,
  onSelectObject,
  onUpdateObject,
  onAddBlockAt,
  isPlaying,
  toolMode,
  gridSnap,
  skybox,
  onLog,
  onCoinCollected,
  onNpcDialog,
}: WowEngine3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Active play mode stats
  const [coinsCollected, setCoinsCollected] = useState(0);
  const [checkpointPos, setCheckpointPos] = useState<[number, number, number] | null>(null);
  const [hazardFlash, setHazardFlash] = useState(false);

  // Engine state refs to maintain 60 FPS without React re-renders
  const stateRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    objectMeshes: Map<string, THREE.Object3D>;
    gizmoGroup: THREE.Group;
    activeGizmoAxis: "x" | "y" | "z" | null;
    isGizmoDragging: boolean;
    gizmoStartPos: THREE.Vector3;
    dragPlane: THREE.Plane;
    raycaster: THREE.Raycaster;
    mouse: THREE.Vector2;
    // Camera Orbit & Fly controls
    isOrbiting: boolean;
    orbitStartX: number;
    orbitStartY: number;
    cameraYaw: number;
    cameraPitch: number;
    cameraPos: THREE.Vector3;
    cameraTarget: THREE.Vector3;
    keysDown: Set<string>;
    // Player Character state
    playerGroup: THREE.Group | null;
    playerPos: THREE.Vector3;
    playerVelocity: THREE.Vector3;
    playerIsGrounded: boolean;
    speedBoostUntil: number;
    collectedCoinIds: Set<string>;
  } | null>(null);

  // Setup Three.js scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x13151b);
    scene.fog = new THREE.FogExp2(0x13151b, 0.015);

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(12, 14, 18);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // Lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444455, 0.85);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfffaed, 1.4);
    dirLight.position.set(20, 40, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 150;
    const d = 30;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    scene.add(dirLight);

    // Subtle dark grid floor (matching screenshot)
    const gridHelper = new THREE.GridHelper(60, 60, 0x3b82f6, 0x222632);
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);

    // 3D Transform Gizmo group
    const gizmoGroup = new THREE.Group();
    gizmoGroup.visible = false;
    scene.add(gizmoGroup);

    // Helper to create clean gizmo arrow with text label
    function createGizmoAxis(axis: "x" | "y" | "z", colorHex: number) {
      const group = new THREE.Group();
      group.name = `gizmo_${axis}`;

      const length = 2.4;
      const cylinderRadius = 0.05;
      const coneRadius = 0.18;
      const coneHeight = 0.5;

      const mat = new THREE.MeshBasicMaterial({
        color: colorHex,
        depthTest: false,
        depthWrite: false,
      });

      const cylGeo = new THREE.CylinderGeometry(
        cylinderRadius,
        cylinderRadius,
        length - coneHeight,
        12,
      );
      const cylMesh = new THREE.Mesh(cylGeo, mat);
      cylMesh.position.y = (length - coneHeight) / 2;
      group.add(cylMesh);

      const coneGeo = new THREE.ConeGeometry(coneRadius, coneHeight, 16);
      const coneMesh = new THREE.Mesh(coneGeo, mat);
      coneMesh.position.y = length - coneHeight / 2;
      group.add(coneMesh);

      if (axis === "x") {
        group.rotation.z = -Math.PI / 2;
      } else if (axis === "z") {
        group.rotation.x = Math.PI / 2;
      }

      return group;
    }

    const gizmoX = createGizmoAxis("x", 0xef4444); // Red X
    const gizmoY = createGizmoAxis("y", 0x22c55e); // Green Y
    const gizmoZ = createGizmoAxis("z", 0x3b82f6); // Blue Z
    gizmoGroup.add(gizmoX, gizmoY, gizmoZ);

    // Selection bounding box
    const boxGeo = new THREE.BoxGeometry(1.04, 1.04, 1.04);
    const boxMat = new THREE.MeshBasicMaterial({
      color: 0xfa4616,
      wireframe: true,
      depthTest: false,
    });
    const selectionBox = new THREE.Mesh(boxGeo, boxMat);
    selectionBox.name = "selection_box";
    gizmoGroup.add(selectionBox);

    // Procedural QBlock Player Model for Play mode
    const playerGroup = new THREE.Group();
    playerGroup.visible = false;

    // Torso
    const torsoGeo = new THREE.BoxGeometry(0.8, 1.0, 0.5);
    const torsoMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.4 });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.y = 1.0;
    torso.castShadow = true;
    playerGroup.add(torso);

    // Head
    const headGeo = new THREE.BoxGeometry(0.65, 0.65, 0.65);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffd1a4, roughness: 0.3 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.8;
    head.castShadow = true;
    playerGroup.add(head);

    // Limbs
    const armGeo = new THREE.BoxGeometry(0.3, 0.9, 0.35);
    const armMat = new THREE.MeshStandardMaterial({ color: 0xffd1a4 });
    const leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.position.set(-0.6, 0.95, 0);
    leftArm.castShadow = true;
    const rightArm = new THREE.Mesh(armGeo, armMat);
    rightArm.position.set(0.6, 0.95, 0);
    rightArm.castShadow = true;
    playerGroup.add(leftArm, rightArm);

    const legGeo = new THREE.BoxGeometry(0.38, 0.9, 0.45);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
    const leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.22, 0.45, 0);
    leftLeg.castShadow = true;
    const rightLeg = new THREE.Mesh(legGeo, legMat);
    rightLeg.position.set(0.22, 0.45, 0);
    rightLeg.castShadow = true;
    playerGroup.add(leftLeg, rightLeg);

    scene.add(playerGroup);

    stateRef.current = {
      scene,
      camera,
      renderer,
      objectMeshes: new Map(),
      gizmoGroup,
      activeGizmoAxis: null,
      isGizmoDragging: false,
      gizmoStartPos: new THREE.Vector3(),
      dragPlane: new THREE.Plane(),
      raycaster: new THREE.Raycaster(),
      mouse: new THREE.Vector2(),
      isOrbiting: false,
      orbitStartX: 0,
      orbitStartY: 0,
      cameraYaw: -0.8,
      cameraPitch: 0.6,
      cameraPos: new THREE.Vector3(12, 14, 18),
      cameraTarget: new THREE.Vector3(0, 0, 0),
      keysDown: new Set(),
      playerGroup,
      playerPos: new THREE.Vector3(0, 2, 0),
      playerVelocity: new THREE.Vector3(0, 0, 0),
      playerIsGrounded: false,
      speedBoostUntil: 0,
      collectedCoinIds: new Set(),
    };

    // Animation Loop
    let lastTime = performance.now();
    let animId: number;

    const tick = (now: number) => {
      animId = requestAnimationFrame(tick);
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      const state = stateRef.current;
      if (!state) return;

      // Rotate decorative objects / coins
      state.objectMeshes.forEach((mesh, id) => {
        const obj = objects.find((o) => o.id === id);
        if (obj?.type === "coin" || obj?.trigger === "tick_spin") {
          mesh.rotation.y += 2.0 * dt;
        }
        if (obj?.trigger === "tick_bob") {
          mesh.position.y = obj.position[1] + Math.sin(now * 0.004) * 0.25;
        }
      });

      // PLAY/TEST MODE LOGIC
      if (isPlaying && state.playerGroup) {
        state.playerGroup.visible = true;

        // Player controls
        const keys = state.keysDown;
        const isBoosted = Date.now() < state.speedBoostUntil;
        const moveSpeed = (isBoosted ? 14 : 8) * dt;

        let moveX = 0;
        let moveZ = 0;
        if (keys.has("KeyW") || keys.has("ArrowUp")) moveZ -= 1;
        if (keys.has("KeyS") || keys.has("ArrowDown")) moveZ += 1;
        if (keys.has("KeyA") || keys.has("ArrowLeft")) moveX -= 1;
        if (keys.has("KeyD") || keys.has("ArrowRight")) moveX += 1;

        // Camera facing angle for player
        const camDir = new THREE.Vector3();
        state.camera.getWorldDirection(camDir);
        camDir.y = 0;
        camDir.normalize();

        const camSide = new THREE.Vector3(-camDir.z, 0, camDir.x);

        const moveVec = new THREE.Vector3()
          .addScaledVector(camDir, -moveZ)
          .addScaledVector(camSide, moveX);

        if (moveVec.lengthSq() > 0.01) {
          moveVec.normalize();
          state.playerPos.x += moveVec.x * moveSpeed;
          state.playerPos.z += moveVec.z * moveSpeed;
          state.playerGroup.rotation.y = Math.atan2(moveVec.x, moveVec.z);
        }

        // Jump & Gravity
        if ((keys.has("Space") || keys.has("KeyJ")) && state.playerIsGrounded) {
          state.playerVelocity.y = 11.5;
          state.playerIsGrounded = false;
          WowAudio.click();
        }

        // Apply gravity
        state.playerVelocity.y -= 26 * dt;
        state.playerPos.y += state.playerVelocity.y * dt;

        // Ground / Object Collision check
        let grounded = false;
        const playerBox = new THREE.Box3().setFromCenterAndSize(
          new THREE.Vector3(state.playerPos.x, state.playerPos.y + 0.9, state.playerPos.z),
          new THREE.Vector3(0.75, 1.8, 0.75),
        );

        // Floor baseplate
        if (state.playerPos.y <= 0) {
          state.playerPos.y = 0;
          state.playerVelocity.y = 0;
          grounded = true;
        }

        // Check against solid and trigger objects
        for (const obj of objects) {
          // Skip if coin collected
          if (obj.type === "coin" && state.collectedCoinIds.has(obj.id)) continue;

          const objBox = new THREE.Box3().setFromCenterAndSize(
            new THREE.Vector3(...obj.position),
            new THREE.Vector3(...obj.scale),
          );

          if (playerBox.intersectsBox(objBox)) {
            // TRIGGER HANDLING
            if (obj.trigger === "kill_player" || obj.type === "hazard") {
              // Reset to checkpoint
              state.playerPos.set(
                checkpointPos ? checkpointPos[0] : 0,
                checkpointPos ? checkpointPos[1] + 1 : 1,
                checkpointPos ? checkpointPos[2] : 0,
              );
              state.playerVelocity.set(0, 0, 0);
              WowAudio.hazard();
              setHazardFlash(true);
              setTimeout(() => setHazardFlash(false), 300);
              onLog(`[Q_Script] Player triggered hazard "${obj.name}"! Respawning at checkpoint.`);
              break;
            }

            if (obj.trigger === "give_coin" || obj.type === "coin") {
              if (!state.collectedCoinIds.has(obj.id)) {
                state.collectedCoinIds.add(obj.id);
                const coinMesh = state.objectMeshes.get(obj.id);
                if (coinMesh) coinMesh.visible = false;
                WowAudio.coin();
                const amt = Number(obj.triggerParam) || 5;
                setCoinsCollected((c) => c + amt);
                onCoinCollected(amt);
                onLog(`[Q_Script] Collected coin "${obj.name}" (+${amt} coins)`);
              }
            }

            if (obj.trigger === "bounce_pad" || obj.type === "spring") {
              state.playerVelocity.y = Number(obj.triggerParam) || 16;
              grounded = false;
              WowAudio.bounce();
              onLog(`[Q_Script] Bounce pad activated on "${obj.name}"`);
            }

            if (obj.trigger === "set_checkpoint" || obj.type === "checkpoint") {
              if (
                !checkpointPos ||
                checkpointPos[0] !== obj.position[0] ||
                checkpointPos[2] !== obj.position[2]
              ) {
                setCheckpointPos([...obj.position]);
                WowAudio.checkpoint();
                onLog(
                  `[Q_Script] Checkpoint updated to "${obj.name}" (${obj.position.join(", ")})`,
                );
              }
            }

            if (obj.trigger === "speed_boost") {
              state.speedBoostUntil = Date.now() + 5000;
              WowAudio.checkpoint();
              onLog(`[Q_Script] Speed boost activated! (2x speed for 5s)`);
            }

            if (obj.trigger === "npc_dialog" || obj.type === "npc") {
              onNpcDialog(
                obj.name,
                String(
                  obj.triggerParam || "Hello adventurer! Welcome to WoW Studio 1.0. Keep building!",
                ),
              );
            }

            // SOLID COLLISION RESOLUTION
            if (obj.canCollide) {
              const halfY = obj.scale[1] / 2;
              const topY = obj.position[1] + halfY;
              // If player is landing from above
              if (state.playerPos.y >= topY - 0.5 && state.playerVelocity.y <= 0) {
                state.playerPos.y = topY;
                state.playerVelocity.y = 0;
                grounded = true;
              }
            }
          }
        }

        // Void kill check
        if (state.playerPos.y < -15) {
          state.playerPos.set(
            checkpointPos ? checkpointPos[0] : 0,
            checkpointPos ? checkpointPos[1] + 1 : 1,
            checkpointPos ? checkpointPos[2] : 0,
          );
          state.playerVelocity.set(0, 0, 0);
          WowAudio.hazard();
          setHazardFlash(true);
          setTimeout(() => setHazardFlash(false), 300);
          onLog("[Q_Script] Player fell into void. Respawning.");
        }

        state.playerIsGrounded = grounded;
        state.playerGroup.position.copy(state.playerPos);

        // Third-person smooth follow camera
        const targetCamPos = new THREE.Vector3(
          state.playerPos.x - Math.sin(state.cameraYaw) * 9,
          state.playerPos.y + 4.5,
          state.playerPos.z - Math.cos(state.cameraYaw) * 9,
        );
        state.camera.position.lerp(targetCamPos, 0.15);
        state.camera.lookAt(state.playerPos.x, state.playerPos.y + 1.2, state.playerPos.z);
      } else {
        // EDIT MODE: Free-cam flying controls
        if (state.playerGroup) state.playerGroup.visible = false;

        const keys = state.keysDown;
        const flySpeed = 16 * dt;

        if (keys.has("KeyW")) {
          const dir = new THREE.Vector3();
          state.camera.getWorldDirection(dir);
          state.cameraPos.addScaledVector(dir, flySpeed);
        }
        if (keys.has("KeyS")) {
          const dir = new THREE.Vector3();
          state.camera.getWorldDirection(dir);
          state.cameraPos.addScaledVector(dir, -flySpeed);
        }
        if (keys.has("KeyA")) {
          const dir = new THREE.Vector3();
          state.camera.getWorldDirection(dir);
          const side = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
          state.cameraPos.addScaledVector(side, -flySpeed);
        }
        if (keys.has("KeyD")) {
          const dir = new THREE.Vector3();
          state.camera.getWorldDirection(dir);
          const side = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
          state.cameraPos.addScaledVector(side, flySpeed);
        }
        if (keys.has("Space") || keys.has("KeyE")) {
          state.cameraPos.y += flySpeed;
        }
        if (keys.has("ShiftLeft") || keys.has("KeyQ")) {
          state.cameraPos.y -= flySpeed;
        }

        state.camera.position.copy(state.cameraPos);
      }

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(tick);

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Update Skybox & Lighting preset
  useEffect(() => {
    const state = stateRef.current;
    if (!state) return;
    const { scene } = state;

    switch (skybox) {
      case "day":
        scene.background = new THREE.Color(0x38bdf8);
        scene.fog = new THREE.FogExp2(0x38bdf8, 0.012);
        break;
      case "sunset":
        scene.background = new THREE.Color(0xf97316);
        scene.fog = new THREE.FogExp2(0xc2410c, 0.015);
        break;
      case "night":
        scene.background = new THREE.Color(0x0f172a);
        scene.fog = new THREE.FogExp2(0x0f172a, 0.02);
        break;
      case "space":
        scene.background = new THREE.Color(0x050508);
        scene.fog = new THREE.FogExp2(0x050508, 0.008);
        break;
    }
  }, [skybox]);

  // Sync Voxel Objects to Three.js Meshes
  useEffect(() => {
    const state = stateRef.current;
    if (!state) return;
    const { scene, objectMeshes } = state;

    // Track current object ids
    const currentIds = new Set(objects.map((o) => o.id));

    // Remove deleted meshes
    objectMeshes.forEach((mesh, id) => {
      if (!currentIds.has(id)) {
        scene.remove(mesh);
        objectMeshes.delete(id);
      }
    });

    // Add or update meshes
    objects.forEach((obj) => {
      let mesh = objectMeshes.get(obj.id);

      if (!mesh) {
        // Create new mesh based on object type
        let geo: THREE.BufferGeometry;
        if (obj.type === "coin") {
          geo = new THREE.CylinderGeometry(0.5, 0.5, 0.15, 18);
          geo.rotateX(Math.PI / 2);
        } else if (obj.type === "checkpoint") {
          geo = new THREE.BoxGeometry(1, 0.2, 1);
        } else if (obj.type === "spring") {
          geo = new THREE.BoxGeometry(1, 0.3, 1);
        } else {
          geo = new THREE.BoxGeometry(1, 1, 1);
        }

        const mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(obj.color),
          roughness: obj.material === "glass" ? 0.1 : 0.6,
          transparent: obj.material === "glass" || !obj.canCollide,
          opacity: obj.material === "glass" ? 0.6 : 1.0,
          emissive:
            obj.trigger === "kill_player" || obj.type === "hazard"
              ? new THREE.Color(0x770000)
              : obj.type === "coin"
                ? new THREE.Color(0x443300)
                : new THREE.Color(0x000000),
        });

        mesh = new THREE.Mesh(geo, mat);
        mesh.name = `voxel_${obj.id}`;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        scene.add(mesh);
        objectMeshes.set(obj.id, mesh);
      }

      // Update transform & appearance
      mesh.position.set(...obj.position);
      mesh.rotation.set(...obj.rotation);
      mesh.scale.set(...obj.scale);

      const mat = (mesh as THREE.Mesh).material as THREE.MeshStandardMaterial;
      if (mat && mat.color) {
        mat.color.set(obj.color);
      }
    });
  }, [objects]);

  // Update Transform Gizmo position to Selected Object
  useEffect(() => {
    const state = stateRef.current;
    if (!state) return;
    const { gizmoGroup } = state;

    if (!selectedId || isPlaying) {
      gizmoGroup.visible = false;
      return;
    }

    const selObj = objects.find((o) => o.id === selectedId);
    if (!selObj) {
      gizmoGroup.visible = false;
      return;
    }

    gizmoGroup.visible = true;
    gizmoGroup.position.set(...selObj.position);

    // Update selection box scale
    const selBox = gizmoGroup.getObjectByName("selection_box");
    if (selBox) {
      selBox.scale.set(selObj.scale[0] * 1.05, selObj.scale[1] * 1.05, selObj.scale[2] * 1.05);
    }
  }, [selectedId, objects, isPlaying]);

  // Respawn player at spawn point when entering Play Mode
  useEffect(() => {
    const state = stateRef.current;
    if (!state) return;

    if (isPlaying) {
      // Find spawn point
      const spawnObj = objects.find((o) => o.type === "spawn") || objects[0];
      const startX = spawnObj ? spawnObj.position[0] : 0;
      const startY = spawnObj ? spawnObj.position[1] + 1.2 : 2;
      const startZ = spawnObj ? spawnObj.position[2] : 0;

      state.playerPos.set(startX, startY, startZ);
      state.playerVelocity.set(0, 0, 0);
      state.collectedCoinIds.clear();
      state.objectMeshes.forEach((m) => (m.visible = true));
      setCoinsCollected(0);
      setCheckpointPos(null);

      // Camera reset for play mode
      state.cameraYaw = 0;
      state.cameraPitch = 0.3;

      WowAudio.playStart();
      onLog("[Q_Script] Entered Play Mode (F5). Spawning player.");
    } else {
      WowAudio.playStop();
      onLog("[Q_Script] Stopped Play Mode. Returned to Edit Viewport.");
    }
  }, [isPlaying, objects, onLog]);

  // Pointer & Key event listeners for Orbit, Select, and Gizmo interaction
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      stateRef.current?.keysDown.add(e.code);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      stateRef.current?.keysDown.delete(e.code);
    };

    const handlePointerDown = (e: PointerEvent) => {
      const state = stateRef.current;
      if (!state) return;

      const rect = container.getBoundingClientRect();
      state.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      state.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      // In Play mode, pointer look
      if (isPlaying) {
        state.isOrbiting = true;
        state.orbitStartX = e.clientX;
        state.orbitStartY = e.clientY;
        return;
      }

      // Check if clicked a gizmo axis arrow
      if (state.gizmoGroup.visible) {
        state.raycaster.setFromCamera(state.mouse, state.camera);
        const gizmoHits = state.raycaster.intersectObjects(state.gizmoGroup.children, true);
        if (gizmoHits.length > 0) {
          let hitObj = gizmoHits[0].object;
          while (hitObj.parent && hitObj.parent !== state.gizmoGroup) {
            hitObj = hitObj.parent;
          }
          if (hitObj.name === "gizmo_x") {
            state.activeGizmoAxis = "x";
            state.isGizmoDragging = true;
            state.gizmoStartPos.copy(state.gizmoGroup.position);
            return;
          } else if (hitObj.name === "gizmo_y") {
            state.activeGizmoAxis = "y";
            state.isGizmoDragging = true;
            state.gizmoStartPos.copy(state.gizmoGroup.position);
            return;
          } else if (hitObj.name === "gizmo_z") {
            state.activeGizmoAxis = "z";
            state.isGizmoDragging = true;
            state.gizmoStartPos.copy(state.gizmoGroup.position);
            return;
          }
        }
      }

      // If right click or middle click, or clicking empty space: start orbit
      if (e.button === 2 || e.button === 1 || e.shiftKey) {
        state.isOrbiting = true;
        state.orbitStartX = e.clientX;
        state.orbitStartY = e.clientY;
        return;
      }

      // Raycast scene objects to select or place block
      state.raycaster.setFromCamera(state.mouse, state.camera);
      const meshes = Array.from(state.objectMeshes.values());
      const hits = state.raycaster.intersectObjects(meshes, true);

      if (hits.length > 0) {
        const hit = hits[0];
        // Find which object was hit
        let foundId: string | null = null;
        state.objectMeshes.forEach((m, id) => {
          if (m === hit.object || m.children.includes(hit.object)) {
            foundId = id;
          }
        });

        if (foundId) {
          if (toolMode === "block") {
            // Place block on the face of clicked block
            if (hit.face) {
              const normal = hit.face.normal;
              const hitObj = objects.find((o) => o.id === foundId);
              if (hitObj) {
                const snap = gridSnap > 0 ? gridSnap : 1;
                const newPos: [number, number, number] = [
                  Math.round((hitObj.position[0] + normal.x * snap) / snap) * snap,
                  Math.round((hitObj.position[1] + normal.y * snap) / snap) * snap,
                  Math.round((hitObj.position[2] + normal.z * snap) / snap) * snap,
                ];
                onAddBlockAt(newPos);
                WowAudio.place();
              }
            }
          } else {
            onSelectObject(foundId);
            WowAudio.click();
          }
          return;
        }
      } else {
        // Deselect or orbit
        if (e.button === 0) {
          state.isOrbiting = true;
          state.orbitStartX = e.clientX;
          state.orbitStartY = e.clientY;
        }
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      const state = stateRef.current;
      if (!state) return;

      const rect = container.getBoundingClientRect();
      state.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      state.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      // Dragging Gizmo Arrow
      if (state.isGizmoDragging && state.activeGizmoAxis && selectedId) {
        const selObj = objects.find((o) => o.id === selectedId);
        if (!selObj) return;

        const deltaX = (e.clientX - state.orbitStartX) * 0.04;
        const deltaY = -(e.clientY - state.orbitStartY) * 0.04;

        const snap = gridSnap > 0 ? gridSnap : 0.1;
        const newPos = [...selObj.position] as [number, number, number];

        if (state.activeGizmoAxis === "x") {
          newPos[0] = Math.round((state.gizmoStartPos.x + deltaX) / snap) * snap;
        } else if (state.activeGizmoAxis === "y") {
          newPos[1] = Math.max(0, Math.round((state.gizmoStartPos.y + deltaY) / snap) * snap);
        } else if (state.activeGizmoAxis === "z") {
          newPos[2] = Math.round((state.gizmoStartPos.z + deltaX) / snap) * snap;
        }

        onUpdateObject({ ...selObj, position: newPos });
        return;
      }

      // Orbit / Look around
      if (state.isOrbiting) {
        const dx = e.clientX - state.orbitStartX;
        const dy = e.clientY - state.orbitStartY;
        state.orbitStartX = e.clientX;
        state.orbitStartY = e.clientY;

        state.cameraYaw -= dx * 0.005;
        state.cameraPitch = Math.max(-1.4, Math.min(1.4, state.cameraPitch - dy * 0.005));

        if (!isPlaying) {
          // Free look rotation
          const dir = new THREE.Vector3(
            -Math.sin(state.cameraYaw) * Math.cos(state.cameraPitch),
            Math.sin(state.cameraPitch),
            -Math.cos(state.cameraYaw) * Math.cos(state.cameraPitch),
          );
          state.camera.lookAt(state.camera.position.clone().add(dir));
        }
      }
    };

    const handlePointerUp = () => {
      const state = stateRef.current;
      if (!state) return;
      state.isOrbiting = false;
      state.isGizmoDragging = false;
      state.activeGizmoAxis = null;
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    container.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    container.addEventListener("contextmenu", handleContextMenu);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      container.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      container.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [
    isPlaying,
    selectedId,
    objects,
    toolMode,
    gridSnap,
    onAddBlockAt,
    onSelectObject,
    onUpdateObject,
  ]);

  return (
    <div className="relative h-full w-full overflow-hidden select-none">
      {/* 3D Canvas Container */}
      <div ref={containerRef} className="h-full w-full cursor-crosshair" />

      {/* Red Hazard Screen Flash */}
      {hazardFlash && (
        <div className="pointer-events-none absolute inset-0 bg-red-600/35 transition-opacity duration-300 animate-ping" />
      )}

      {/* In-Game Play HUD Stats Overlay */}
      {isPlaying && (
        <div className="pointer-events-none absolute top-4 left-4 z-20 flex flex-col gap-2 font-['Inter',sans-serif]">
          {/* Live Play Status Pill */}
          <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-black/60 px-3.5 py-1.5 backdrop-blur-md text-[12px] font-bold text-emerald-400 shadow-lg">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            PLAY TEST ACTIVE (F5 to Stop)
          </div>

          {/* Coin Counter */}
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/50 px-3.5 py-2 backdrop-blur-md text-[13px] font-black text-amber-400 shadow-md">
            🪙 Coins Collected: {coinsCollected}
          </div>

          {checkpointPos && (
            <div className="flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-950/40 px-3 py-1.5 backdrop-blur-md text-[11.5px] font-extrabold text-cyan-300">
              🚩 Checkpoint Active
            </div>
          )}
        </div>
      )}

      {/* Mobile Play Controls overlay */}
      {isPlaying && (
        <div className="pointer-events-auto absolute bottom-6 right-6 z-30 flex items-center gap-3 sm:hidden">
          <button
            onPointerDown={() => {
              const state = stateRef.current;
              if (state && state.playerIsGrounded) {
                state.playerVelocity.y = 11.5;
                state.playerIsGrounded = false;
                WowAudio.click();
              }
            }}
            className="press grid h-16 w-16 place-items-center rounded-full bg-gradient-to-t from-white/90 to-white text-[#181a20] shadow-xl border border-white/80 font-black text-[15px]"
          >
            JUMP
          </button>
        </div>
      )}
    </div>
  );
}
