import * as THREE from "three";

/**
 * Sky dome + sun/moon + drifting volumetric-ish cloud layer, with a slow
 * day/night cycle. Everything is driven from `update(dt)` so the game loop
 * just ticks it.
 */

const VERT = /* glsl */ `
varying vec3 vWorld;
void main() {
  vWorld = normalize((modelMatrix * vec4(position, 1.0)).xyz);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAG = /* glsl */ `
varying vec3 vWorld;
uniform vec3 uTop;
uniform vec3 uMid;
uniform vec3 uHorizon;
uniform vec3 uSunDir;
uniform vec3 uSunColor;

void main() {
  float h = clamp(vWorld.y * 0.5 + 0.5, 0.0, 1.0);
  vec3 col = mix(uHorizon, uMid, smoothstep(0.48, 0.62, h));
  col = mix(col, uTop, smoothstep(0.6, 0.95, h));

  float sun = max(dot(normalize(vWorld), normalize(uSunDir)), 0.0);
  col += uSunColor * pow(sun, 220.0) * 1.6;          // disc
  col += uSunColor * pow(sun, 8.0) * 0.16;           // glow
  col += uSunColor * pow(sun, 2.0) * 0.05;           // wide haze

  gl_FragColor = vec4(col, 1.0);
}
`;

export class Sky {
  readonly group = new THREE.Group();
  readonly sunLight = new THREE.DirectionalLight(0xfff2d4, 1.7);
  readonly hemi = new THREE.HemisphereLight(0xbfe3ff, 0x71805c, 1.1);
  readonly ambient = new THREE.AmbientLight(0xffffff, 0.34);

  private mat: THREE.ShaderMaterial;
  private fog: THREE.Fog;
  private t = 0.28; // 0..1 through the day, start mid-morning
  public isGoldenHour = false;

  constructor(scene: THREE.Scene, dayLength = 420) {
    this.dayLength = dayLength;

    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uTop: { value: new THREE.Color("#3f7fd6") },
        uMid: { value: new THREE.Color("#79b6ee") },
        uHorizon: { value: new THREE.Color("#cfe6fb") },
        uSunDir: { value: new THREE.Vector3(0.4, 0.7, 0.2) },
        uSunColor: { value: new THREE.Color("#fff4d2") },
      },
    });

    const dome = new THREE.Mesh(new THREE.SphereGeometry(3000, 48, 28), this.mat);
    dome.frustumCulled = false;
    dome.renderOrder = -1000;
    this.group.add(dome);

    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 5;
    this.sunLight.shadow.camera.far = 350;
    this.sunLight.shadow.camera.left = -80;
    this.sunLight.shadow.camera.right = 80;
    this.sunLight.shadow.camera.top = 80;
    this.sunLight.shadow.camera.bottom = -80;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;

    this.group.add(this.sunLight);
    this.group.add(this.sunLight.target);
    scene.add(this.hemi, this.ambient, this.group);

    this.fog = new THREE.Fog(0xcfe6fb, 700, 1900);

    scene.fog = this.fog;
    this.scene = scene;
    this.apply();
  }

  private scene: THREE.Scene;
  private dayLength: number;

  /** Adjusts how far you can see before fog takes over. */
  setRange(near: number, far: number) {
    this.fog.near = near;
    this.fog.far = far;
  }

  setNormalDay() {
    this.isGoldenHour = false;
    this.t = 0.28;
    this.mat.uniforms.uTop.value.set("#3f7fd6");
    this.mat.uniforms.uMid.value.set("#79b6ee");
    this.mat.uniforms.uHorizon.value.set("#cfe6fb");
    this.mat.uniforms.uSunDir.value.set(0.38, 0.76, 0.22).normalize();
    this.mat.uniforms.uSunColor.value.set("#fffdf5");
    this.sunLight.position.set(45, 95, 28);
    this.sunLight.color.set("#fffdf5");
    this.sunLight.intensity = 1.75;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.hemi.color.set("#e3f1ff");
    this.hemi.groundColor.set("#52614b");
    this.hemi.intensity = 0.85;
    this.ambient.color.set("#eaf2fa");
    this.ambient.intensity = 0.35;
    this.fog.color.set("#cfe6fb");
    this.fog.near = 500;
    this.fog.far = 2200;
    if (this.scene.background instanceof THREE.Color) this.scene.background.set("#cfe6fb");
  }

  setGoldenHour() {
    this.isGoldenHour = true;
    this.mat.uniforms.uTop.value.set("#2c2448");
    this.mat.uniforms.uMid.value.set("#cf6055");
    this.mat.uniforms.uHorizon.value.set("#ffb368");
    this.mat.uniforms.uSunDir.value.set(-0.52, 0.44, -0.73).normalize();
    this.mat.uniforms.uSunColor.value.set("#ffb45a");
    this.sunLight.position.set(-68, 52, -84);
    this.sunLight.color.set("#ffad50");
    this.sunLight.intensity = 2.4;
    this.sunLight.shadow.bias = -0.0008;
    this.hemi.color.set("#ffd2a8");
    this.hemi.groundColor.set("#4a2e26");
    this.hemi.intensity = 0.88;
    this.ambient.color.set("#ffe2c9");
    this.ambient.intensity = 0.32;
    this.fog.color.set("#e89569");
    this.fog.near = 280;
    this.fog.far = 1600;
    if (this.scene.background instanceof THREE.Color) this.scene.background.set("#e89569");
  }

  setNight() {
    this.isGoldenHour = false;
    this.t = 0.75;
    this.mat.uniforms.uTop.value.set("#050b1a");
    this.mat.uniforms.uMid.value.set("#0d1833");
    this.mat.uniforms.uHorizon.value.set("#152445");
    this.mat.uniforms.uSunDir.value.set(-0.4, -0.6, -0.2).normalize();
    this.mat.uniforms.uSunColor.value.set("#5ba2e0");
    this.sunLight.position.set(-68, 78, -42);
    this.sunLight.color.set("#7dd3fc");
    this.sunLight.intensity = 0.4;
    this.hemi.color.set("#1a3055");
    this.hemi.groundColor.set("#081220");
    this.hemi.intensity = 0.45;
    this.ambient.color.set("#182844");
    this.ambient.intensity = 0.3;
    this.fog.color.set("#101a33");
    this.fog.near = 200;
    this.fog.far = 1200;
    if (this.scene.background instanceof THREE.Color) this.scene.background.set("#101a33");
  }

  /** Keeps the dome/clouds centred on the camera. */
  follow(pos: THREE.Vector3) {
    this.group.position.set(pos.x, 0, pos.z);
  }

  update(dt: number) {
    if (this.isGoldenHour) {
      // Keep rich golden hour lighting locked while smoothly following camera
      return;
    }
    this.t = (this.t + dt / this.dayLength) % 1;
    this.apply();
  }

  private apply() {
    // sun travels across the sky; angle 0 = sunrise, PI = sunset
    const a = this.t * Math.PI * 2 - Math.PI / 2;
    const sunDir = new THREE.Vector3(
      Math.cos(a) * 0.6,
      Math.sin(a),
      Math.cos(a) * 0.35,
    ).normalize();
    // Keep the cartoon atlas readable even during the moving day/night cycle.
    // The old curve let the voxel faces fall almost black at mid-morning.
    const day = THREE.MathUtils.clamp(sunDir.y * 1.25 + 0.68, 0, 1);
    const dusk = THREE.MathUtils.clamp(1 - Math.abs(sunDir.y) * 4, 0, 1);

    const top = new THREE.Color("#0b1330").lerp(new THREE.Color("#3f7fd6"), day);
    const mid = new THREE.Color("#131c3d").lerp(new THREE.Color("#7ab8ef"), day);
    const horizon = new THREE.Color("#1b2244")
      .lerp(new THREE.Color("#d3e9fc"), day)
      .lerp(new THREE.Color("#f6a55f"), dusk * 0.55);
    const sunColor = new THREE.Color("#fff4d2").lerp(new THREE.Color("#ff9b4d"), dusk * 0.8);

    this.mat.uniforms.uTop.value.copy(top);
    this.mat.uniforms.uMid.value.copy(mid);
    this.mat.uniforms.uHorizon.value.copy(horizon);
    this.mat.uniforms.uSunDir.value.copy(sunDir);
    this.mat.uniforms.uSunColor.value.copy(sunColor);

    this.sunLight.position.copy(sunDir).multiplyScalar(120);
    this.sunLight.intensity = 0.45 + day * 1.35;
    this.sunLight.color.copy(sunColor);
    this.hemi.intensity = 0.58 + day * 0.72;
    this.ambient.intensity = 0.24 + day * 0.2;

    this.fog.color.copy(horizon);
    if (this.scene.background instanceof THREE.Color) this.scene.background.copy(horizon);
  }

  dispose() {
    this.mat.dispose();
    this.group.clear();
  }
}
