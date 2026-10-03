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
uniform float uAurora;
uniform float uV2;

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
    p = p * 2.05 + vec2(17.1, 9.2);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec3 dir = normalize(vDir);
  float h = clamp(dir.y, -1.0, 1.0);

  // Smooth multi-spectral atmospheric gradient
  vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.32, h));
  col = mix(col, uTop, smoothstep(0.18, 0.92, h));
  col = mix(col, uHorizon * 0.85, smoothstep(0.0, -0.40, h));

  vec3 sunDir = normalize(uSunDir);
  float sunDot = max(dot(dir, sunDir), 0.0);
  float sunVisible = smoothstep(-0.06, 0.08, sunDir.y);

  // Azimuthal warm forward scattering at horizon towards the sun (smooth, soft ambient warmth)
  float horizonScatter = pow(max(dot(vec3(dir.x, 0.0, dir.z), vec3(sunDir.x, 0.0, sunDir.z)), 0.0), 3.0) * smoothstep(0.35, 0.0, h) * sunVisible;
  col += mix(uSunColor, vec3(1.0, 0.88, 0.72), 0.5) * horizonScatter * 0.18;

  // Gentle, smooth celestial warmth in the sky without harsh glaring light disc
  float smoothSunWarmth = pow(sunDot, 12.0) * 0.14 + pow(sunDot, 32.0) * 0.08;
  col += mix(uSunColor, vec3(1.0, 0.96, 0.90), 0.6) * smoothSunWarmth * sunVisible;

  // Wavelength-dependent (Rayleigh ~ 1/lambda^4) extinction: a low sun has to
  // travel through more air, so blue is scattered out near the horizon and
  // the lower sky warms while the zenith keeps its deep blue.
  float airMass = 1.0 / (max(h, 0.0) + 0.12);
  vec3 lambdaExt = vec3(0.16, 0.38, 1.0);
  float lowSun = smoothstep(0.42, -0.02, sunDir.y) * sunVisible;
  col *= mix(vec3(1.0), exp(-lambdaExt * airMass * 0.06), lowSun * 0.55);
  col += vec3(1.0, 0.45, 0.18) * lowSun * pow(1.0 - clamp(h, 0.0, 1.0), 6.0) * 0.22;
  // Faint Rayleigh skylight away from the sun during the day.
  col += vec3(0.05, 0.11, 0.26) * (1.0 - sunDot) * smoothstep(0.05, 0.7, h) * (1.0 - uNight) * 0.3;

  // Graphics V2: physically-inspired sun disc + corona (bright enough to
  // bloom), a wide Mie glow that paints sunsets across half the sky, and a
  // thin horizon haze band for depth.
  if (uV2 > 0.0) {
    float disc = smoothstep(0.9993, 0.99965, sunDot);
    float corona = pow(sunDot, 220.0) * 1.1 + pow(sunDot, 48.0) * 0.28;
    col += mix(uSunColor, vec3(1.0), 0.35) * (disc * 2.6 + corona) * sunVisible * uV2;
    float mie = pow(sunDot, 4.0) * lowSun;
    col += vec3(1.0, 0.52, 0.26) * mie * 0.34 * uV2;
    float haze = exp(-abs(h) * 14.0);
    col = mix(col, mix(uHorizon, uSunColor, 0.25 * lowSun) * 1.04, haze * 0.22 * uV2 * (1.0 - uNight * 0.6));
  }

  // Moon: opposite the sun, soft cratered disc with a wide cold glow.
  vec3 moonDir = normalize(vec3(-sunDir.x, max(-sunDir.y, 0.25), -sunDir.z));
  float moonDot = max(dot(dir, moonDir), 0.0);
  float moonDisc = smoothstep(0.99955, 0.99975, moonDot);
  float craters = 0.82 + 0.18 * noise(dir.xy * 900.0);
  vec3 moonCol = vec3(0.86, 0.92, 1.0);
  col += moonCol * moonDisc * craters * 3.2 * uNight;
  col += moonCol * (pow(moonDot, 900.0) * 0.9 + pow(moonDot, 60.0) * 0.22 + pow(moonDot, 8.0) * 0.06) * uNight;

  // Rare green aurora curtains, only when the Sky switches them on.
  if (uAurora > 0.01 && uNight > 0.05 && h > 0.04) {
    float curtainN = fbm(vec2(dir.x * 2.6 + uTime * 0.02, dir.z * 2.6 - uTime * 0.012));
    float bands = sin(dir.x * 7.0 + dir.z * 3.0 + curtainN * 6.0 + uTime * 0.15) * 0.5 + 0.5;
    float rays = 0.65 + 0.35 * noise(vec2(dir.x * 60.0 + uTime * 0.4, dir.z * 60.0));
    float band = smoothstep(0.55, 1.0, bands) * rays;
    float heightMask = smoothstep(0.06, 0.26, h) * smoothstep(0.85, 0.35, h);
    vec3 auroraCol = mix(vec3(0.1, 1.0, 0.45), vec3(0.45, 0.2, 0.9), smoothstep(0.3, 0.8, h));
    col += auroraCol * band * heightMask * uAurora * uNight * 0.55;
  }

  // Twinkling stars + galactic nebula dust at night
  if (uNight > 0.01 && h > 0.0) {
    vec2 sp = floor(dir.xz / (dir.y + 0.25) * 320.0);
    float star = step(0.9940, hash(sp));
    float twinkle = 0.50 + 0.50 * sin(uTime * 3.0 + hash(sp + 3.1) * 60.0);
    vec3 starColor = mix(vec3(0.78, 0.90, 1.0), vec3(1.0, 0.92, 0.76), hash(sp * 2.4));
    col += starColor * (star * twinkle * uNight * smoothstep(0.03, 0.30, h) * 1.6);

    // Galactic nebula / Milky Way ribbon across the sky
    float neb1 = fbm(dir.xz * 2.2 + vec2(1.5, 3.8));
    float neb2 = fbm(dir.xz * 4.0 - vec2(2.1, 1.4));
    float neb = neb1 * 0.65 + neb2 * 0.35;
    vec3 nebColor = mix(vec3(0.08, 0.06, 0.18), vec3(0.16, 0.10, 0.24), neb);
    col += nebColor * smoothstep(0.48, 0.82, neb) * uNight * smoothstep(0.05, 0.4, h);
  }

  // Volumetric billowy clouds with forward scattering and silver lining
  if (h > 0.0) {
    vec2 uv = dir.xz / (h + 0.12) * 1.35;
    vec2 wind = vec2(uTime * 0.009, uTime * 0.003);
    float base = fbm(uv + wind);
    float detail = fbm(uv * 2.4 - wind * 1.5);
    float d = base * 0.68 + detail * 0.32;
    float threshold = mix(0.68, 0.36, uCloudCover);
    float density = smoothstep(threshold, threshold + 0.22, d);
    density *= smoothstep(0.01, 0.20, h);

    // Dynamic cloud lighting: top sunlit highlights, underside ambient shading
    float light = clamp(0.48 + (d - threshold) * 2.0, 0.0, 1.0);
    vec3 cloud = mix(uCloudShade, uCloudLit, light);

    // Radiant silver lining on cloud borders when facing the sun
    float silverLining = pow(sunDot, 5.0) * smoothstep(0.18, 0.75, density) * 0.72;
    cloud += uSunColor * silverLining * sunVisible;
    if (uV2 > 0.0) {
      // Self-shadowed bellies and fiery sunset undersides.
      float belly = 1.0 - smoothstep(threshold, threshold + 0.35, d);
      cloud = mix(cloud, cloud * vec3(0.78, 0.8, 0.9), belly * 0.35 * uV2);
      cloud += vec3(1.0, 0.45, 0.2) * lowSun * belly * 0.28 * uV2;
      // High, wispy cirrus layer.
      float cirrus = fbm(vec2(uv.x * 0.55 + uTime * 0.004, uv.y * 3.2));
      col = mix(col, uCloudLit, smoothstep(0.58, 0.9, cirrus) * 0.18 * smoothstep(0.1, 0.5, h) * uV2);
    }

    col = mix(col, cloud, density * 0.95);
  }

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const SKY_RADIUS = 1000;

const C = {
  // Vibrant, rich anime/celestial day atmosphere with deep sapphire & sunlit horizon
  topDay: new THREE.Color("#083a88"),
  midDay: new THREE.Color("#258cf5"),
  horizonDay: new THREE.Color("#c8ebff"),
  sunDay: new THREE.Color("#fffaf0"),
  cloudLitDay: new THREE.Color("#ffffff"),
  cloudShadeDay: new THREE.Color("#95b8d8"),
  hemiSkyDay: new THREE.Color("#cbe7ff"),
  hemiGroundDay: new THREE.Color("#56784d"),

  // Authentic, stunning Golden Hour (fiery amber-violet twilight)
  topGolden: new THREE.Color("#23346a"),
  midGolden: new THREE.Color("#e8683a"),
  horizonGolden: new THREE.Color("#ffab5e"),
  sunGolden: new THREE.Color("#ffc46b"),
  cloudLitGolden: new THREE.Color("#ffd9a8"),
  cloudShadeGolden: new THREE.Color("#7a4466"),
  hemiSkyGolden: new THREE.Color("#ffbf8a"),
  hemiGroundGolden: new THREE.Color("#5e3a2a"),

  // Celestial Night with rich galactic hues
  topNight: new THREE.Color("#030715"),
  midNight: new THREE.Color("#0a142c"),
  horizonNight: new THREE.Color("#142142"),
  moon: new THREE.Color("#a8ccff"),
  cloudLitNight: new THREE.Color("#38486b"),
  cloudShadeNight: new THREE.Color("#10172a"),
  hemiSkyNight: new THREE.Color("#22375f"),
  hemiGroundNight: new THREE.Color("#09101d"),
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
  private aurora = 0;
  private auroraTarget = 0;
  private auroraTimer = 25;
  private v2 = false;
  private cloudLight = 1;

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
        uAurora: { value: 0 },
        uV2: { value: 0 },
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

  /** Graphics V2: cinematic sky + clouds that dim and brighten the sun as they pass. */
  setGraphicsV2(on: boolean) {
    this.v2 = on;
    this.mat.uniforms.uV2.value = on ? 1 : 0;
    this.apply();
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

    // Aurora is a rare event: a roll every ~40s of night, ~25% chance.
    const isNight = this.mat.uniforms.uNight.value > 0.45;
    this.auroraTimer -= dt;
    if (this.auroraTimer <= 0) {
      if (this.auroraTarget > 0) {
        this.auroraTarget = 0;
        this.auroraTimer = 40 + Math.random() * 40;
      } else if (isNight && Math.random() < 0.25) {
        this.auroraTarget = 1;
        this.auroraTimer = 45 + Math.random() * 35;
      } else {
        this.auroraTimer = 40;
      }
    }
    if (!isNight) this.auroraTarget = 0;
    this.aurora += (this.auroraTarget - this.aurora) * (1 - Math.exp(-0.35 * dt));
    this.mat.uniforms.uAurora.value = this.aurora;

    if (!this.paused && !this.isGoldenHour) {
      this.t = (this.t + dt / this.dayLength) % 1;
    }
    if (this.v2) {
      // Slow layered sines stand in for cloud shadows sweeping over the island.
      const e = this.elapsed;
      const pass = Math.sin(e * 0.11) * 0.6 + Math.sin(e * 0.047 + 1.7) * 0.4;
      const target = 1 - Math.max(0, pass) * 0.22 * this.cloudCover;
      this.cloudLight += (target - this.cloudLight) * (1 - Math.exp(-1.5 * dt));
    } else {
      this.cloudLight = 1;
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
      this.sunLight.intensity = (this.isGoldenHour ? 2.3 : 0.65 + day * 1.55) * this.cloudLight * (this.v2 ? 1.08 : 1);
    } else {
      this.sunLight.position.copy(sunDir).multiplyScalar(-120);
      this.sunLight.color.copy(C.moon);
      // Cool, directional moonlight so night keeps shape and soft shadows.
      this.sunLight.intensity = 0.55 + this.aurora * 0.12;
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
    this.hemi.intensity = this.isGoldenHour ? 1.4 : 0.8 + day * 0.6;
    this.ambient.intensity = this.isGoldenHour ? 0.45 : 0.4 + day * 0.2;

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
