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
uniform float uIsPond;
varying vec3 vWorld;
varying float vViewDepth;

vec2 waveGrad(vec2 p, vec2 dir, float freq, float speed, float amp) {
  float ph = dot(p, dir) * freq + uTime * speed;
  return dir * cos(ph) * freq * amp;
}

// Procedural animated caustics shimmer
float caustic(vec2 p) {
  vec2 p1 = p * 1.4 + vec2(uTime * 0.12, uTime * 0.08);
  vec2 p2 = p * 1.8 - vec2(uTime * 0.09, uTime * 0.14);
  float c1 = sin(p1.x + sin(p1.y * 1.2)) * 0.5 + 0.5;
  float c2 = cos(p2.y + cos(p2.x * 1.3)) * 0.5 + 0.5;
  return pow(c1 * c2, 1.8) * 1.8;
}

void main() {
  vec2 p = vWorld.xz * uScale;
  vec2 g = vec2(0.0);
  g += waveGrad(p, normalize(vec2(1.0, 0.3)), 1.1, 1.2, 0.12);
  g += waveGrad(p, normalize(vec2(-0.5, 0.9)), 2.2, 1.6, 0.07);
  g += waveGrad(p, normalize(vec2(0.8, -0.6)), 4.1, 2.4, 0.04);
  g += waveGrad(p, normalize(vec2(-0.8, -0.3)), 7.5, 3.2, 0.02);
  g += waveGrad(p, normalize(vec2(0.3, 0.95)), 12.0, 4.5, 0.01);
  vec3 n = normalize(vec3(-g.x, 1.0, -g.y));

  vec3 v = normalize(cameraPosition - vWorld);
  float ndv = max(dot(n, v), 0.0);
  float fresnel = 0.04 + 0.96 * pow(1.0 - ndv, 4.0);

  vec3 r = reflect(-v, n);
  vec3 sky = mix(uSkyColor * 0.88, uSkyColor * 1.25, clamp(r.y * 1.4 + 0.1, 0.0, 1.0));

  vec3 h = normalize(uSunDir + v);
  float ndh = max(dot(n, h), 0.0);
  // Soft, subtle specular sheen (removed harsh 4.5x blinding light hotspot)
  float spec = pow(ndh, 32.0) * 0.15;

  // Crystal clear tropical water gradient with depth
  vec3 body = mix(uDeep, uShallow, pow(ndv, 1.3) * 0.85);

  // Gentle caustics pattern moving with the waves
  if (uIsPond > 0.5) {
    float caust = caustic(vWorld.xz * 1.8);
    body += vec3(0.02, 0.05, 0.07) * caust;
  }

  vec3 col = mix(body, sky, fresnel) + uSunColor * spec;

  float fog = smoothstep(uFogNear, uFogFar, vViewDepth);
  col = mix(col, uFogColor, fog);

  float alpha = mix(uOpacity, 0.96, fresnel);
  gl_FragColor = vec4(col, alpha);
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
  isPond?: boolean;
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
      uIsPond: { value: o.isPond ? 1.0 : 0.0 },
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
      createWaterMaterial({ scale: 0.05, opacity: 1, deep: "#072b48", shallow: "#166892", transparent: false, isPond: false }),
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
        new THREE.PlaneGeometry(size, size, 24, 24),
        createWaterMaterial({ scale: 1.5, opacity: 0.82, deep: "#0a4466", shallow: "#22c6e8", transparent: true, isPond: true }),
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
        u.uFogNear.value = Math.max(35, fog.near * 2.5);
        u.uFogFar.value = Math.max(160, fog.far * 2.4);
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
