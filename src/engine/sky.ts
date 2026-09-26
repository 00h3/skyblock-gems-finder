import * as THREE from "three";

/**
 * V2 atmosphere: gradient sky dome with a sun disc, procedural drifting
 * clouds, stars at night and a day/night cycle that drives every light in
 * the scene. All clouds are evaluated in the dome shader (no extra geometry),
 * which keeps the cost to a single draw call.
 */

const VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  // Pin the dome to the far plane so the camera's far distance can stay
  // short (better depth precision) without ever clipping the sky.
  gl_Position = vec4(p.xy, p.w * 0.99999, p.w);
}
`;

const FRAG = /* glsl */ `
precision highp float;
varying vec3 vDir;
uniform vec3 uTop;
uniform vec3 uMid;
uniform vec3 uHorizon;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uCloudLit;
uniform vec3 uCloudShade;
uniform float uTime;
uniform float uCloudCover;
uniform float uNight;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

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
  vec3 dir = normalize(vDir);
  float h = clamp(dir.y, -1.0, 1.0);

  vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.22, h));
  col = mix(col, uTop, smoothstep(0.18, 0.85, h));
  col = mix(col, uHorizon * 0.82, smoothstep(0.0, -0.25, h));

  vec3 sunDir = normalize(uSunDir);
  float sunDot = max(dot(dir, sunDir), 0.0);
  float sunVisible = smoothstep(-0.08, 0.05, sunDir.y);
  col += uSunColor * pow(sunDot, 900.0) * 3.0 * sunVisible;
  col += uSunColor * pow(sunDot, 24.0) * 0.22 * sunVisible;
  col += uSunColor * pow(sunDot, 3.0) * 0.08 * sunVisible;

  if (uNight > 0.01 && h > 0.0) {
    vec2 sp = floor(dir.xz / (dir.y + 0.35) * 220.0);
    float star = step(0.9965, hash(sp));
    float twinkle = 0.6 + 0.4 * sin(uTime * 2.0 + hash(sp + 3.1) * 40.0);
    col += vec3(star * twinkle * uNight * smoothstep(0.05, 0.4, h));
  }

  if (h > 0.0) {
    vec2 uv = dir.xz / (h + 0.12) * 1.35;
    vec2 wind = vec2(uTime * 0.012, uTime * 0.004);
    float base = fbm(uv + wind);
    float detail = fbm(uv * 2.4 - wind * 1.7);
    float d = base * 0.72 + detail * 0.28;
    float threshold = mix(0.72, 0.42, uCloudCover);
    float density = smoothstep(threshold, threshold + 0.22, d);
    density *= smoothstep(0.02, 0.22, h);

    float light = clamp(0.55 + (d - threshold) * 1.6, 0.0, 1.0);
    vec3 cloud = mix(uCloudShade, uCloudLit, light);
    cloud += uSunColor * pow(sunDot, 10.0) * 0.35 * sunVisible;
    col = mix(col, cloud, density * 0.92);
  }

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const SKY_RADIUS = 1000;

const C = {
  // Vibrant, rich day atmosphere
  topDay: new THREE.Color("#1864c8"),
  midDay: new THREE.Color("#58a6f0"),
  horizonDay: new THREE.Color("#c6e2ff"),
  sunDay: new THREE.Color("#fff7e6"),
  cloudLitDay: new THREE.Color("#ffffff"),
  cloudShadeDay: new THREE.Color("#adc3da"),
  hemiSkyDay: new THREE.Color("#d8ecff"),
  hemiGroundDay: new THREE.Color("#567848"),

  // Authentic, stunning Golden Hour
  topGolden: new THREE.Color("#1a3564"),
  midGolden: new THREE.Color("#dd6328"),
  horizonGolden: new THREE.Color("#ff7c30"),
  sunGolden: new THREE.Color("#ffaa33"),
  cloudLitGolden: new THREE.Color("#ffe4b8"),
  cloudShadeGolden: new THREE.Color("#6b3f54"),
  hemiSkyGolden: new THREE.Color("#ffaa66"),
  hemiGroundGolden: new THREE.Color("#683e25"),

  // Night
  topNight: new THREE.Color("#050a18"),
  midNight: new THREE.Color("#0c1732"),
  horizonNight: new THREE.Color("#172648"),
  moon: new THREE.Color("#9ec4ff"),
  cloudLitNight: new THREE.Color("#354260"),
  cloudShadeNight: new THREE.Color("#12192e"),
  hemiSkyNight: new THREE.Color("#203358"),
  hemiGroundNight: new THREE.Color("#09101c"),
};

export type SkyOptions = {
  dayLength?: number;
  shadowMapSize?: number;
  cloudOctaves?: number;
};

export class Sky {
  readonly group = new THREE.Group();
  readonly sunLight = new THREE.DirectionalLight(0xfff2d4, 1.7);
  readonly hemi = new THREE.HemisphereLight(0xbfe3ff, 0x71805c, 1.1);
  readonly ambient = new THREE.AmbientLight(0xffffff, 0.3);

  public isGoldenHour = false;
  public paused = false;

  private mat: THREE.ShaderMaterial;
  private fog: THREE.Fog;
  private scene: THREE.Scene;
  private dayLength: number;
  private t = 0.3;
  private elapsed = 0;
  private cloudCover = 0.5;
  private cloudCoverTarget = 0.5;
  private tint = new THREE.Color("#ffffff");
  private tintAmount = 0;
  private tintTarget = 0;

  private _sunDir = new THREE.Vector3();
  private _top = new THREE.Color();
  private _mid = new THREE.Color();
  private _horizon = new THREE.Color();
  private _sun = new THREE.Color();

  constructor(scene: THREE.Scene, dayLengthOrOptions: number | SkyOptions = 600) {
    const opts: SkyOptions =
      typeof dayLengthOrOptions === "number" ? { dayLength: dayLengthOrOptions } : dayLengthOrOptions;
    this.dayLength = opts.dayLength ?? 600;
    this.scene = scene;

    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      defines: { CLOUD_OCTAVES: opts.cloudOctaves ?? 5 },
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uTop: { value: C.topDay.clone() },
        uMid: { value: C.midDay.clone() },
        uHorizon: { value: C.horizonDay.clone() },
        uSunDir: { value: new THREE.Vector3(0.4, 0.7, 0.2) },
        uSunColor: { value: C.sunDay.clone() },
        uCloudLit: { value: C.cloudLitDay.clone() },
        uCloudShade: { value: C.cloudShadeDay.clone() },
        uTime: { value: 0 },
        uCloudCover: { value: this.cloudCover },
        uNight: { value: 0 },
      },
    });

    const dome = new THREE.Mesh(new THREE.SphereGeometry(SKY_RADIUS, 48, 24), this.mat);
    dome.frustumCulled = false;
    dome.renderOrder = -1000;
    this.group.add(dome);

    const shadowSize = opts.shadowMapSize ?? 2048;
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(shadowSize, shadowSize);
    this.sunLight.shadow.camera.near = 5;
    this.sunLight.shadow.camera.far = 200;
    this.sunLight.shadow.camera.left = -40;
    this.sunLight.shadow.camera.right = 40;
    this.sunLight.shadow.camera.top = 40;
    this.sunLight.shadow.camera.bottom = -40;
    this.sunLight.shadow.bias = -0.0004;
    this.sunLight.shadow.normalBias = 0.03;
    this.sunLight.shadow.radius = 3;

    this.group.add(this.sunLight);
    this.group.add(this.sunLight.target);
    scene.add(this.hemi, this.ambient, this.group);

    let initialNear = 12;
    let initialFar = 68;
    try {
      if (typeof window !== "undefined") {
        const mode = localStorage.getItem("qb_fog_mode") || "realistic";
        if (mode === "dense") { initialNear = 6; initialFar = 42; }
        else if (mode === "subtle") { initialNear = 22; initialFar = 110; }
        else if (mode === "off") { initialNear = 90; initialFar = 450; }
        else { initialNear = 12; initialFar = 68; }
      }
    } catch {}

    this.fog = new THREE.Fog(0xcfe6fb, initialNear, initialFar);
    scene.fog = this.fog;
    this.apply();
  }

  setRange(near: number, far: number) {
    this.fog.near = near;
    this.fog.far = far;
  }

  setTimeOfDay(t: number) {
    this.t = ((t % 1) + 1) % 1;
    this.apply();
  }

  get timeOfDay() {
    return this.t;
  }

  setCloudCover(cover: number) {
    this.cloudCoverTarget = THREE.MathUtils.clamp(cover, 0, 1);
  }

  /** Temporary colour grade used by world events; amount 0 clears it. */
  setTint(color: THREE.ColorRepresentation, amount: number) {
    this.tint.set(color);
    this.tintTarget = THREE.MathUtils.clamp(amount, 0, 1);
  }

  setNormalDay() {
    this.isGoldenHour = false;
    this.setTimeOfDay(0.3);
  }

  setGoldenHour() {
    this.isGoldenHour = true;
    this.setTimeOfDay(0.72); // Low golden sun angle
  }

  setNight() {
    this.isGoldenHour = false;
    this.setTimeOfDay(0.85);
  }

  follow(pos: THREE.Vector3) {
    this.group.position.set(pos.x, pos.y, pos.z);
  }

  update(dt: number) {
    this.elapsed += dt;
    this.mat.uniforms.uTime.value = this.elapsed;
    const k = 1 - Math.exp(-0.6 * dt);
    this.cloudCover += (this.cloudCoverTarget - this.cloudCover) * k;
    this.tintAmount += (this.tintTarget - this.tintAmount) * k;
    this.mat.uniforms.uCloudCover.value = this.cloudCover;
    if (!this.paused && !this.isGoldenHour) {
      this.t = (this.t + dt / this.dayLength) % 1;
    }
    this.apply();
  }

  private apply() {
    const a = this.t * Math.PI * 2 - Math.PI / 2;
    const sunDir = this._sunDir.set(Math.cos(a) * 0.62, Math.sin(a), Math.cos(a) * 0.32 + 0.18).normalize();

    // Voxel textures must stay readable, so "night" never goes pitch black.
    const day = THREE.MathUtils.clamp(sunDir.y * 2.2 + 0.35, 0, 1);
    const dusk = this.isGoldenHour
      ? 1.0
      : THREE.MathUtils.clamp(1.0 - Math.abs(sunDir.y - 0.20) * 3.6, 0, 1);
    const night = Math.max(0, 1 - day - dusk * 0.5);

    const top = this._top.copy(C.topNight).lerp(C.topDay, day).lerp(C.topGolden, dusk * 0.95);
    const mid = this._mid.copy(C.midNight).lerp(C.midDay, day).lerp(C.midGolden, dusk * 0.98);
    const horizon = this._horizon.copy(C.horizonNight).lerp(C.horizonDay, day).lerp(C.horizonGolden, dusk);
    const sun = this._sun.copy(C.sunDay).lerp(C.sunGolden, dusk);

    if (this.tintAmount > 0.001) {
      top.lerp(this.tint, this.tintAmount * 0.35);
      mid.lerp(this.tint, this.tintAmount * 0.5);
      horizon.lerp(this.tint, this.tintAmount * 0.6);
      sun.lerp(this.tint, this.tintAmount * 0.4);
    }

    const u = this.mat.uniforms;
    u.uTop.value.copy(top);
    u.uMid.value.copy(mid);
    u.uHorizon.value.copy(horizon);
    u.uSunDir.value.copy(sunDir);
    u.uSunColor.value.copy(sun);
    u.uNight.value = night;
    u.uCloudLit.value.copy(C.cloudLitNight).lerp(C.cloudLitDay, day).lerp(C.cloudLitGolden, dusk * 0.85);
    u.uCloudShade.value.copy(C.cloudShadeNight).lerp(C.cloudShadeDay, day).lerp(C.cloudShadeGolden, dusk * 0.7);

    // Below the horizon the key light becomes the moon from the opposite side.
    if (sunDir.y >= -0.05) {
      this.sunLight.position.copy(sunDir).multiplyScalar(120);
      this.sunLight.color.copy(sun);
      this.sunLight.intensity = this.isGoldenHour ? 2.3 : 0.65 + day * 1.55;
    } else {
      this.sunLight.position.copy(sunDir).multiplyScalar(-120);
      this.sunLight.color.copy(C.moon);
      this.sunLight.intensity = 0.45;
    }
    if (this.sunLight.position.y < 20) this.sunLight.position.y = 20;

    const hemiSky = this.isGoldenHour
      ? C.hemiSkyGolden
      : C.hemiSkyNight.clone().lerp(C.hemiSkyDay, day);
    const hemiGround = this.isGoldenHour
      ? C.hemiGroundGolden
      : C.hemiGroundNight.clone().lerp(C.hemiGroundDay, day);

    this.hemi.color.copy(hemiSky);
    this.hemi.groundColor.copy(hemiGround);
    this.hemi.intensity = this.isGoldenHour ? 1.3 : 0.65 + day * 0.55;
    this.ambient.intensity = this.isGoldenHour ? 0.35 : 0.28 + day * 0.16;

    this.fog.color.copy(horizon);
    if (this.scene.background instanceof THREE.Color) this.scene.background.copy(horizon);
  }

  dispose() {
    this.mat.dispose();
    this.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) m.geometry.dispose();
    });
    this.group.clear();
  }
}
