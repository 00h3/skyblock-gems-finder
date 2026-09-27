import * as THREE from "three";
import { WIND, type World } from "@/engine/world";

const GRASS_ID = 1;
const MAX_TUFTS = 1400;

type Bounds = { minX: number; maxX: number; minZ: number; maxZ: number; minY: number; maxY: number };

function hash(x: number, y: number, z: number) {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function makeBladeTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const blades = 11;
  for (let i = 0; i < blades; i++) {
    const baseX = 10 + (i / (blades - 1)) * (size - 20) + (Math.sin(i * 7.3) * 6);
    const h = size * (0.55 + ((Math.sin(i * 3.1) + 1) / 2) * 0.42);
    const lean = Math.sin(i * 5.7) * 14;
    const w = 5 + (i % 3);
    const grad = ctx.createLinearGradient(0, size, 0, size - h);
    // User requested RGB colors: (31, 72, 4), (40, 93, 5), (43, 104, 6)
    grad.addColorStop(0, "#1f4804");
    grad.addColorStop(0.55, "#285d05");
    grad.addColorStop(1, "#2b6806");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(baseX - w, size);
    ctx.quadraticCurveTo(baseX + lean * 0.3, size - h * 0.55, baseX + lean, size - h);
    ctx.quadraticCurveTo(baseX + lean * 0.3 + 1, size - h * 0.5, baseX + w, size);
    ctx.closePath();
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = true;
  return tex;
}

function makeTuftGeometry() {
  const a = new THREE.PlaneGeometry(0.9, 0.55);
  a.translate(0, 0.275, 0);
  const b = a.clone();
  a.rotateY(Math.PI / 4);
  b.rotateY(-Math.PI / 4);
  const merged = new THREE.BufferGeometry();
  const pos: number[] = [];
  const uv: number[] = [];
  const nrm: number[] = [];
  const idx: number[] = [];
  let offset = 0;
  for (const g of [a, b]) {
    pos.push(...(g.attributes.position.array as Float32Array));
    uv.push(...(g.attributes.uv.array as Float32Array));
    for (let i = 0; i < g.attributes.position.count; i++) nrm.push(0, 1, 0);
    for (const i of g.index!.array as Uint16Array) idx.push(i + offset);
    offset += g.attributes.position.count;
  }
  merged.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  merged.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  merged.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
  merged.setIndex(idx);
  a.dispose();
  b.dispose();
  return merged;
}

/**
 * Swaying grass tufts on top of exposed grass blocks. Rescans the area
 * periodically so tufts follow blocks the player mines or places.
 */
export class GrassField {
  readonly mesh: THREE.InstancedMesh;
  private readonly material: THREE.MeshLambertMaterial;
  private readonly texture: THREE.CanvasTexture;
  private scanAcc = 0;
  private signature = "";
  private readonly dummy = new THREE.Object3D();

  constructor(
    private readonly world: World,
    private readonly bounds: Bounds,
    private readonly density = 0.6,
  ) {
    this.texture = makeBladeTexture();
    this.material = new THREE.MeshLambertMaterial({
      map: this.texture,
      alphaTest: 0.5,
      side: THREE.DoubleSide,
    });
    this.material.onBeforeCompile = (shader) => {
      shader.uniforms.uWindTime = WIND.uTime;
      shader.uniforms.uWindStrength = WIND.uStrength;
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nuniform float uWindTime;\nuniform float uWindStrength;")
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
          #ifdef USE_INSTANCING
            vec2 root = instanceMatrix[3].xz;
          #else
            vec2 root = vec2(0.0);
          #endif
          float tip = uv.y * uv.y;
          float ph = root.x * 0.7 + root.y * 0.5;
          float gust = 0.55 + 0.45 * sin(uWindTime * 0.4 + root.x * 0.08);
          transformed.x += sin(uWindTime * 2.2 + ph) * 0.12 * tip * gust * uWindStrength;
          transformed.z += cos(uWindTime * 1.7 + ph * 1.2) * 0.08 * tip * gust * uWindStrength;`,
        );
    };
    this.material.customProgramCacheKey = () => "grass-tuft-wind";
    this.mesh = new THREE.InstancedMesh(makeTuftGeometry(), this.material, MAX_TUFTS);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.receiveShadow = true;
    this.rebuild();
  }

  private collect() {
    const spots: [number, number, number][] = [];
    const { minX, maxX, minZ, maxZ, minY, maxY } = this.bounds;
    for (let x = minX; x <= maxX; x++) {
      for (let z = minZ; z <= maxZ; z++) {
        for (let y = maxY; y >= minY; y--) {
          const id = this.world.get(x, y, z);
          if (id === 0) continue;
          if (id === GRASS_ID && this.world.get(x, y + 1, z) === 0 && hash(x, y, z) < this.density) {
            spots.push([x, y, z]);
          }
          break;
        }
        if (spots.length >= MAX_TUFTS) return spots;
      }
    }
    return spots;
  }

  rebuild() {
    const spots = this.collect();
    const sig = spots.map((s) => s.join(",")).join("|");
    if (sig === this.signature) return;
    this.signature = sig;
    spots.forEach(([x, y, z], i) => {
      const r = hash(x + 11, y, z - 7);
      this.dummy.position.set(x + 0.25 + r * 0.5, y + 1, z + 0.25 + hash(x, y + 3, z) * 0.5);
      this.dummy.rotation.set(0, r * Math.PI, 0);
      const s = 0.75 + hash(z, x, y) * 0.55;
      this.dummy.scale.set(s, s, s);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    });
    this.mesh.count = spots.length;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  markDirty() {
    this.scanAcc = 10;
  }

  update(dt: number) {
    this.scanAcc += dt;
    if (this.scanAcc >= 3.5) {
      this.scanAcc = 0;
      this.rebuild();
    }
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.texture.dispose();
    this.mesh.removeFromParent();
  }
}
