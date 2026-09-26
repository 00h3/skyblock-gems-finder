import * as THREE from "three";
import type { Sky } from "@/engine/sky";

/**
 * Cinematic backdrop for Skyblock: a sun-lit ocean far below, a drifting
 * sea of clouds between the island and the water, and an optional pond on
 * the island. Everything is shader-driven planes (no geometry displacement)
 * so it stays cheap on mobile. The far layers follow the camera on XZ while
 * the noise is sampled in world space, so the view never visibly slides.
 */

const SHARED_VERT = /* glsl */ `
varying vec3 vWorld;
varying float vViewDepth;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vec4 mv = viewMatrix * w;
  vViewDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;

const WATER_FRAG = /* glsl */ `
uniform float uTime;
uniform float uScale;
uniform float uOpacity;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uSkyColor;
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
varying vec3 vWorld;
varying float vViewDepth;

vec2 waveGrad(vec2 p, vec2 dir, float freq, float speed, float amp) {
  float ph = dot(p, dir) * freq + uTime * speed;
  return dir * cos(ph) * freq * amp;
}

void main() {
  vec2 p = vWorld.xz * uScale;
  vec2 g = vec2(0.0);
  g += waveGrad(p, normalize(vec2(1.0, 0.3)), 1.0, 1.1, 0.13);
  g += waveGrad(p, normalize(vec2(-0.4, 1.0)), 1.8, 1.5, 0.07);
  g += waveGrad(p, normalize(vec2(0.7, -0.8)), 3.3, 2.2, 0.035);
  g += waveGrad(p, normalize(vec2(-0.9, -0.25)), 5.9, 3.0, 0.018);
  g += waveGrad(p, normalize(vec2(0.2, 0.95)), 9.7, 4.1, 0.009);
  vec3 n = normalize(vec3(-g.x, 1.0, -g.y));

  vec3 v = normalize(cameraPosition - vWorld);
  float ndv = max(dot(n, v), 0.0);
  float fresnel = 0.02 + 0.98 * pow(1.0 - ndv, 5.0);

  vec3 r = reflect(-v, n);
  vec3 sky = mix(uSkyColor * 0.82, uSkyColor * 1.12, clamp(r.y * 1.5, 0.0, 1.0));

  vec3 h = normalize(uSunDir + v);
  float spec = pow(max(dot(n, h), 0.0), 220.0) * 3.0;
  float glitter = pow(max(dot(n, h), 0.0), 40.0) * 0.12;

  vec3 body = mix(uDeep, uShallow, pow(ndv, 2.0) * 0.7);
  vec3 col = mix(body, sky, fresnel) + uSunColor * (spec + glitter);

  float fog = smoothstep(uFogNear, uFogFar, vViewDepth);
  col = mix(col, uFogColor, fog);
  gl_FragColor = vec4(col, mix(uOpacity, 1.0, fresnel));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const CLOUD_FRAG = /* glsl */ `
uniform float uTime;
uniform float uSeed;
uniform float uCover;
uniform float uOpacity;
uniform vec3 uLit;
uniform vec3 uShade;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
varying vec3 vWorld;
varying float vViewDepth;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < CLOUD_OCTAVES; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(17.1, 9.2);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 drift = vec2(uTime * 0.0045, uTime * 0.0028);
  vec2 p = vWorld.xz * 0.011 + drift + uSeed * 3.7;
  float d = fbm(p);
  float density = smoothstep(uCover, uCover + 0.26, d);
  // Offset sample toward the light fakes self-shadowing on the cloud tops.
  float lightSample = fbm(p + vec2(0.035, 0.05));
  float lit = clamp(0.55 + (d - lightSample) * 5.0 + (d - uCover) * 0.9, 0.0, 1.0);
  vec3 col = mix(uShade, uLit, lit);

  float nearFade = smoothstep(1.5, 12.0, abs(cameraPosition.y - vWorld.y));
  float fog = smoothstep(uFogNear, uFogFar, vViewDepth);
  col = mix(col, uFogColor, fog * 0.85);
  float alpha = density * uOpacity * nearFade * (1.0 - fog * 0.6);
  if (alpha < 0.003) discard;
  gl_FragColor = vec4(col, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

type WaterOptions = {
  scale: number;
  opacity: number;
  deep: THREE.ColorRepresentation;
  shallow: THREE.ColorRepresentation;
  transparent: boolean;
};

function createWaterMaterial(o: WaterOptions) {
  return new THREE.ShaderMaterial({
    vertexShader: SHARED_VERT,
    fragmentShader: WATER_FRAG,
    transparent: o.transparent,
    depthWrite: !o.transparent,
    fog: false,
    uniforms: {
      uTime: { value: 0 },
      uScale: { value: o.scale },
      uOpacity: { value: o.opacity },
      uSunDir: { value: new THREE.Vector3(0.4, 0.7, 0.2) },
      uSunColor: { value: new THREE.Color("#fff1d6") },
      uSkyColor: { value: new THREE.Color("#bcdcff") },
      uDeep: { value: new THREE.Color(o.deep) },
      uShallow: { value: new THREE.Color(o.shallow) },
      uFogColor: { value: new THREE.Color("#cfe6fb") },
      uFogNear: { value: 90 },
      uFogFar: { value: 700 },
    },
  });
}

export type PondSpec = { x: number; y: number; z: number; size: number };

export class SkyblockEnvironment {
  readonly group = new THREE.Group();
  private farGroup = new THREE.Group();
  private ocean: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private cloudLayers: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>[] = [];
  private pond: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial> | null = null;
  private time = 0;
  private _sunDir = new THREE.Vector3();
  private _lit = new THREE.Color();
  private _shade = new THREE.Color();
  private readonly white = new THREE.Color("#ffffff");
  private readonly shadeBase = new THREE.Color("#8a9bb8");

  constructor(scene: THREE.Scene, opts: { pond?: PondSpec; lowQuality?: boolean } = {}) {
    const low = opts.lowQuality ?? false;

    this.ocean = new THREE.Mesh(
      new THREE.PlaneGeometry(2600, 2600, 1, 1),
      createWaterMaterial({ scale: 0.06, opacity: 1, deep: "#0b3a5c", shallow: "#1f7aa3", transparent: false }),
    );
    this.ocean.rotation.x = -Math.PI / 2;
    this.ocean.position.y = -70;
    this.ocean.frustumCulled = false;
    this.ocean.renderOrder = -10;
    this.farGroup.add(this.ocean);

    const layers = low
      ? [{ y: -10, cover: 0.5, opacity: 0.9, seed: 0 }]
      : [
          { y: -22, cover: 0.52, opacity: 0.7, seed: 2 },
          { y: -14, cover: 0.5, opacity: 0.82, seed: 1 },
          { y: -7, cover: 0.56, opacity: 0.9, seed: 0 },
        ];
    layers.forEach((l, i) => {
      const mat = new THREE.ShaderMaterial({
        vertexShader: SHARED_VERT,
        fragmentShader: CLOUD_FRAG,
        defines: { CLOUD_OCTAVES: low ? 3 : 5 },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        fog: false,
        uniforms: {
          uTime: { value: 0 },
          uSeed: { value: l.seed },
          uCover: { value: l.cover },
          uOpacity: { value: l.opacity },
          uLit: { value: new THREE.Color("#ffffff") },
          uShade: { value: new THREE.Color("#8a9bb8") },
          uFogColor: { value: new THREE.Color("#cfe6fb") },
          uFogNear: { value: 90 },
          uFogFar: { value: 520 },
        },
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400, 1, 1), mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = l.y;
      mesh.frustumCulled = false;
      mesh.renderOrder = -5 + i;
      this.cloudLayers.push(mesh);
      this.farGroup.add(mesh);
    });

    this.group.add(this.farGroup);

    if (opts.pond) {
      const { x, y, z, size } = opts.pond;
      this.pond = new THREE.Mesh(
        new THREE.PlaneGeometry(size, size, 1, 1),
        createWaterMaterial({ scale: 1.6, opacity: 0.72, deep: "#0f4d6e", shallow: "#3fb0c9", transparent: true }),
      );
      this.pond.rotation.x = -Math.PI / 2;
      this.pond.position.set(x, y, z);
      this.pond.renderOrder = 5;
      this.group.add(this.pond);
    }

    scene.add(this.group);
  }

  update(dt: number, camera: THREE.Camera, sky: Sky, scene: THREE.Scene) {
    this.time += dt;
    this.farGroup.position.set(camera.position.x, 0, camera.position.z);

    const sunDir = this._sunDir.copy(sky.sunLight.position).normalize();
    const day = THREE.MathUtils.clamp(sunDir.y * 2.2 + 0.35, 0, 1);
    const fog = scene.fog instanceof THREE.Fog ? scene.fog : null;
    const skyColor = scene.background instanceof THREE.Color ? scene.background : null;

    const waters = this.pond ? [this.ocean, this.pond] : [this.ocean];
    for (const w of waters) {
      const u = w.material.uniforms;
      u.uTime.value = this.time;
      u.uSunDir.value.copy(sunDir);
      u.uSunColor.value.copy(sky.sunLight.color).multiplyScalar(0.4 + day * 0.9);
      if (skyColor) u.uSkyColor.value.copy(skyColor);
      if (fog) {
        u.uFogColor.value.copy(fog.color);
        u.uFogNear.value = w === this.ocean ? fog.near + 40 : fog.near;
        u.uFogFar.value = w === this.ocean ? fog.far * 1.35 : fog.far;
      }
    }

    this._lit.copy(this.white).lerp(sky.sunLight.color, 0.35).multiplyScalar(0.55 + day * 0.5);
    this._shade.copy(this.shadeBase).multiplyScalar(0.35 + day * 0.65);
    if (skyColor) this._shade.lerp(skyColor, 0.25);
    for (const layer of this.cloudLayers) {
      const u = layer.material.uniforms;
      u.uTime.value = this.time;
      u.uLit.value.copy(this._lit);
      u.uShade.value.copy(this._shade);
      if (fog) {
        u.uFogColor.value.copy(fog.color);
        u.uFogNear.value = fog.near;
        u.uFogFar.value = fog.far;
      }
    }
  }

  dispose() {
    this.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      }
    });
    this.group.removeFromParent();
  }
}
