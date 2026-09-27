import * as THREE from "three";

const RADIUS = 380;

const starVert = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uFade;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vColor = aColor;
    float twinkle = 0.55 + 0.45 * sin(uTime * (1.2 + aPhase * 2.4) + aPhase * 40.0);
    vAlpha = twinkle * uFade;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (0.8 + twinkle * 0.4);
    gl_Position = projectionMatrix * mv;
  }
`;

const starFrag = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float core = smoothstep(0.5, 0.0, d);
    float glow = pow(core, 3.0);
    gl_FragColor = vec4(vColor * (0.6 + glow * 1.6), (core * 0.7 + glow) * vAlpha);
  }
`;

const nebulaVert = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const nebulaFrag = /* glsl */ `
  uniform float uTime;
  uniform float uFade;
  varying vec3 vDir;
  float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
  float noise(vec3 p) {
    vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p) { float v = 0.0; float a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
  void main() {
    vec3 d = normalize(vDir);
    // Tilted galactic band across the sky.
    vec3 axis = normalize(vec3(0.35, 0.25, 1.0));
    float band = exp(-pow(dot(d, axis) * 3.2, 2.0));
    float n = fbm(d * 3.0 + vec3(uTime * 0.004, 0.0, 0.0));
    float wisps = smoothstep(0.35, 0.85, n) * band;
    vec3 violet = vec3(0.42, 0.16, 0.72);
    vec3 teal = vec3(0.08, 0.55, 0.72);
    vec3 rose = vec3(0.85, 0.28, 0.55);
    vec3 col = mix(violet, teal, smoothstep(0.3, 0.8, fbm(d * 5.0 + 3.1)));
    col = mix(col, rose, smoothstep(0.62, 0.9, n) * 0.5);
    float horizon = smoothstep(-0.05, 0.25, d.y);
    float a = (wisps * 0.55 + band * 0.08) * horizon * uFade;
    gl_FragColor = vec4(col * 1.2, a);
  }
`;

interface Meteor {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  dir: THREE.Vector3;
  life: number;
  duration: number;
  active: boolean;
}

const meteorFrag = /* glsl */ `
  uniform float uAlpha;
  varying vec2 vUv;
  void main() {
    float head = pow(vUv.x, 4.0);
    float edge = 1.0 - abs(vUv.y - 0.5) * 2.0;
    vec3 col = mix(vec3(0.55, 0.7, 1.0), vec3(1.0), head);
    gl_FragColor = vec4(col, vUv.x * edge * edge * uAlpha);
  }
`;

const meteorVert = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

/** Cosmic night overlay: coloured twinkling stars, a nebula band and shooting stars. */
export class CosmicSky {
  readonly group = new THREE.Group();
  private readonly starMat: THREE.ShaderMaterial;
  private readonly nebulaMat: THREE.ShaderMaterial;
  private readonly meteors: Meteor[] = [];
  private fade = 0;
  private fadeTarget = 0;
  private time = 0;
  private nextMeteor = 8;

  constructor(scene: THREE.Scene, lowQuality = false) {
    this.group.renderOrder = -1;
    this.group.visible = false;

    const count = lowQuality ? 1400 : 3200;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const size = new Float32Array(count);
    const phase = new Float32Array(count);
    const palette = [
      new THREE.Color(0xffffff),
      new THREE.Color(0xbcd4ff),
      new THREE.Color(0xffe2b8),
      new THREE.Color(0xd8b8ff),
      new THREE.Color(0x9fe8ff),
    ];
    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const v = Math.random() * 0.95 + 0.05;
      const theta = u * Math.PI * 2;
      const phi = Math.acos(1 - v);
      pos[i * 3] = Math.sin(phi) * Math.cos(theta) * RADIUS;
      pos[i * 3 + 1] = Math.cos(phi) * RADIUS;
      pos[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * RADIUS;
      const c = palette[Math.floor(Math.random() * palette.length)];
      col.set([c.r, c.g, c.b], i * 3);
      size[i] = Math.random() < 0.04 ? 5 + Math.random() * 3 : 1.4 + Math.random() * 2.2;
      phase[i] = Math.random();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
    geo.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
    geo.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
    this.starMat = new THREE.ShaderMaterial({
      vertexShader: starVert,
      fragmentShader: starFrag,
      uniforms: { uTime: { value: 0 }, uFade: { value: 0 } },
      transparent: true,
      depthWrite: false,
      fog: false,
      blending: THREE.AdditiveBlending,
    });
    const stars = new THREE.Points(geo, this.starMat);
    stars.frustumCulled = false;
    this.group.add(stars);

    this.nebulaMat = new THREE.ShaderMaterial({
      vertexShader: nebulaVert,
      fragmentShader: nebulaFrag,
      uniforms: { uTime: { value: 0 }, uFade: { value: 0 } },
      transparent: true,
      depthWrite: false,
      fog: false,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    });
    const nebula = new THREE.Mesh(new THREE.SphereGeometry(RADIUS + 10, 48, 24), this.nebulaMat);
    nebula.frustumCulled = false;
    this.group.add(nebula);

    const meteorGeo = new THREE.PlaneGeometry(1, 1);
    meteorGeo.translate(-0.5, 0, 0);
    for (let i = 0; i < 4; i++) {
      const mat = new THREE.ShaderMaterial({
        vertexShader: meteorVert,
        fragmentShader: meteorFrag,
        uniforms: { uAlpha: { value: 0 } },
        transparent: true,
        depthWrite: false,
        fog: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(meteorGeo, mat);
      mesh.visible = false;
      mesh.frustumCulled = false;
      this.group.add(mesh);
      this.meteors.push({ mesh, mat, dir: new THREE.Vector3(), life: 0, duration: 1, active: false });
    }

    scene.add(this.group);
  }

  setNight(on: boolean) {
    this.fadeTarget = on ? 1 : 0;
    if (on) this.group.visible = true;
  }

  private spawnMeteor() {
    const m = this.meteors.find((x) => !x.active);
    if (!m) return;
    const theta = Math.random() * Math.PI * 2;
    const elev = 0.35 + Math.random() * 0.5;
    const r = RADIUS * 0.8;
    m.mesh.position.set(Math.cos(theta) * r * Math.cos(elev), Math.sin(elev) * r, Math.sin(theta) * r * Math.cos(elev));
    const tangent = new THREE.Vector3(-Math.sin(theta), -0.35 - Math.random() * 0.4, Math.cos(theta));
    if (Math.random() < 0.5) tangent.x *= -1;
    m.dir.copy(tangent.normalize());
    m.mesh.scale.set(40 + Math.random() * 40, 1.2, 1);
    m.duration = 0.7 + Math.random() * 0.8;
    m.life = 0;
    m.active = true;
    m.mesh.visible = true;
  }

  update(dt: number, camera: THREE.Camera) {
    this.fade += (this.fadeTarget - this.fade) * (1 - Math.exp(-1.6 * dt));
    if (this.fade < 0.01 && this.fadeTarget === 0) {
      this.group.visible = false;
      return;
    }
    this.time += dt;
    this.group.position.copy(camera.position);
    this.starMat.uniforms.uTime.value = this.time;
    this.starMat.uniforms.uFade.value = this.fade;
    this.nebulaMat.uniforms.uTime.value = this.time;
    this.nebulaMat.uniforms.uFade.value = this.fade;

    this.nextMeteor -= dt;
    if (this.nextMeteor <= 0 && this.fadeTarget > 0) {
      this.spawnMeteor();
      if (Math.random() < 0.08) this.spawnMeteor();
      // Shooting stars are a rare treat, not a constant shower.
      this.nextMeteor = 14 + Math.random() * 26;
    }

    for (const m of this.meteors) {
      if (!m.active) continue;
      m.life += dt;
      const t = m.life / m.duration;
      m.mesh.position.addScaledVector(m.dir, dt * 260);
      const target = m.mesh.position.clone().add(m.dir);
      m.mesh.up.set(0, 1, 0);
      m.mesh.lookAt(target);
      m.mesh.rotateY(-Math.PI / 2);
      m.mat.uniforms.uAlpha.value = Math.sin(Math.min(t, 1) * Math.PI) * this.fade;
      if (t >= 1) {
        m.active = false;
        m.mesh.visible = false;
      }
    }
  }

  dispose() {
    this.group.removeFromParent();
    this.group.traverse((o) => {
      const mesh = o as THREE.Mesh;
      mesh.geometry?.dispose();
      (mesh.material as THREE.Material | undefined)?.dispose?.();
    });
  }
}
