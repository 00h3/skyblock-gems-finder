import * as THREE from "three";
import { WIND, type World } from "./world";

const GRASS_ID = 1;
const MAX_TUFTS = 3600;

type Bounds = { minX: number; maxX: number; minZ: number; maxZ: number; minY: number; maxY: number };

function hash(x: number, y: number, z: number) {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function makeTuftTexture() {
  const tex = new THREE.TextureLoader().load("/ui/grass-tuft.png");
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.repeat.set(1290 / 2048, 460 / 2048);
  tex.offset.set(430 / 2048, 1 - 1465 / 2048);
  return tex;
}

function makeTuftGeometry() {
  const a = new THREE.PlaneGeometry(1.0, 0.4);
  a.translate(0, 0.2, 0);
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
  private readonly texture: THREE.Texture;
  private scanAcc = 0;
  private hashSignature = 0;
  private readonly dummy = new THREE.Object3D();
  private readonly tint = new THREE.Color();

  constructor(
    private readonly world: World,
    private readonly bounds: Bounds,
    private readonly density = 0.9,
  ) {
    this.texture = makeTuftTexture();
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
          float wave = sin(uWindTime * 1.3 + root.x * 0.35 + root.y * 0.22);
          float gust = 0.6 + 0.4 * wave;
          transformed.x += (sin(uWindTime * 2.6 + ph) * 0.16 + wave * 0.14) * tip * gust * uWindStrength;
          transformed.z += cos(uWindTime * 2.0 + ph * 1.2) * 0.10 * tip * gust * uWindStrength;`,
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
    let h = spots.length;
    for (let i = 0; i < spots.length; i++) {
      const s = spots[i];
      h = (h * 31 + ((s[0] * 73856093) ^ (s[1] * 19349663) ^ (s[2] * 83492791))) | 0;
    }
    if (h === this.hashSignature && spots.length === this.mesh.count) return;
    this.hashSignature = h;
    spots.forEach(([x, y, z], i) => {
      const r = hash(x + 11, y, z - 7);
      this.dummy.position.set(x + 0.25 + r * 0.5, y + 1, z + 0.25 + hash(x, y + 3, z) * 0.5);
      this.dummy.rotation.set(0, r * Math.PI, 0);
      const s = 0.75 + hash(z, x, y) * 0.55;
      this.dummy.scale.set(s, s, s);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
      this.tint.setHSL(0.22 + r * 0.06, 0.4, 0.68 + hash(x, z, y) * 0.2);
      this.mesh.setColorAt(i, this.tint);
    });
    this.mesh.count = spots.length;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  private dirty = false;

  markDirty() {
    this.dirty = true;
  }

  update(_dt: number) {
    if (this.dirty) {
      this.dirty = false;
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
