import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

/**
 * Soft, bright cinematic grade (Hytale-style). Motion blur is intentionally
 * not applied so the image stays crisp while turning and sprinting.
 * Enhanced with rich vibrance, deep ambient contrast, and soft bloom on
 * crystals, lanterns, and sun.
 */
const MotionShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uVignette: { value: 0.08 },
    uGrade: { value: 1.0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uVignette;
    uniform float uGrade;
    varying vec2 vUv;
    void main() {
      vec2 fromCenter = vUv - 0.5;
      vec4 color = texture2D(tDiffuse, vUv);
      if (uGrade > 0.0) {
        vec3 c = color.rgb;
        float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));
        
        // Hytale-style color vibrance: selectively boost saturated colors (greens, ambers, cyans)
        float maxC = max(c.r, max(c.g, c.b));
        float minC = min(c.r, min(c.g, c.b));
        float sat = (maxC - minC) / (maxC + 0.0001);
        float vibranceBoost = (1.0 - sat) * 0.18 * uGrade;
        c = mix(vec3(luma), c, 1.0 + vibranceBoost);

        // Filmic S-curve contrast without crushing dark details
        c = (c - 0.5) * (1.0 + 0.08 * uGrade) + 0.5;

        // Warm golden highlight tint & rich celestial shadow tint
        vec3 shadowTint = vec3(0.96, 0.98, 1.05);
        vec3 midTint = vec3(1.02, 1.0, 0.98);
        vec3 highTint = vec3(1.05, 1.02, 0.96);
        vec3 toneTint = mix(shadowTint, midTint, smoothstep(0.08, 0.5, luma));
        toneTint = mix(toneTint, highTint, smoothstep(0.5, 0.9, luma));
        c *= mix(vec3(1.0), toneTint, 0.75 * uGrade);

        color.rgb = max(c, 0.0);
      }
      float v = smoothstep(0.88, 0.22, length(fromCenter * vec2(1.1, 1.0)));
      color.rgb *= mix(1.0 - uVignette, 1.0, v);
      gl_FragColor = color;
    }
  `,
};

export class CinematicPost {
  readonly composer: EffectComposer;
  private readonly motion: ShaderPass;
  private readonly bloom: UnrealBloomPass;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    _strength = 0.22,
  ) {
    const dpr = renderer.getPixelRatio() || (typeof window !== "undefined" ? window.devicePixelRatio : 1) || 1;
    const canvas = renderer.domElement;
    const w = canvas.clientWidth || window.innerWidth || 1280;
    const h = canvas.clientHeight || window.innerHeight || 720;
    const targetW = Math.max(64, Math.round(w * dpr));
    const targetH = Math.max(64, Math.round(h * dpr));

    const target = new THREE.WebGLRenderTarget(targetW, targetH, {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: true,
      stencilBuffer: false,
    });
    this.composer = new EffectComposer(renderer, target);
    this.composer.setPixelRatio(dpr);
    this.composer.setSize(w, h);
    this.composer.addPass(new RenderPass(scene, camera));

    // High-efficiency soft diffuse bloom for lanterns, fire, and sun
    // 320x180 resolution produces wide, smooth, ethereal ambient bloom with ~85% less GPU fill-rate overhead
    const bloomW = Math.min(320, Math.max(48, Math.round(targetW * 0.25)));
    const bloomH = Math.min(180, Math.max(48, Math.round(targetH * 0.25)));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(bloomW, bloomH), 0.38, 0.65, 0.85);
    this.composer.addPass(this.bloom);
    this.motion = new ShaderPass(MotionShader);
    this.motion.renderToScreen = true;
    this.composer.addPass(this.motion);
  }

  private ultraHigh = false;

  /** Toggle ultra high resolution bloom passes or normal optimized bloom */
  setUltraHigh(on: boolean) {
    this.ultraHigh = on;
    const canvas = this.composer.renderer.domElement;
    const dpr = this.composer.renderer.getPixelRatio() || 1;
    const w = canvas.clientWidth || window.innerWidth || 1280;
    const h = canvas.clientHeight || window.innerHeight || 720;
    this.setSize(w, h, dpr);
  }

  /** Graphics V2: richer bloom on bright sun/emissives plus a filmic grade. */
  setGraphicsV2(on: boolean) {
    this.bloom.strength = on ? 0.44 : 0.35;
    this.bloom.radius = on ? 0.70 : 0.60;
    this.bloom.threshold = on ? 0.82 : 0.88;
    this.motion.uniforms.uGrade.value = on ? 1.10 : 0.95;
    this.motion.uniforms.uVignette.value = on ? 0.09 : 0.06;
  }

  setSize(w: number, h: number, pixelRatio: number) {
    const dpr = pixelRatio || (typeof window !== "undefined" ? window.devicePixelRatio : 1) || 1;
    const targetW = Math.max(64, Math.round(w * dpr));
    const targetH = Math.max(64, Math.round(h * dpr));
    this.composer.setPixelRatio(dpr);
    this.composer.setSize(w, h);
    const bloomW = this.ultraHigh
      ? Math.max(32, Math.round(targetW * 0.25))
      : Math.min(320, Math.max(48, Math.round(targetW * 0.25)));
    const bloomH = this.ultraHigh
      ? Math.max(32, Math.round(targetH * 0.25))
      : Math.min(180, Math.max(48, Math.round(targetH * 0.25)));
    this.bloom.setSize(bloomW, bloomH);
  }

  render(dt: number) {
    this.composer.render(dt);
  }

  dispose() {
    this.composer.dispose();
  }
}
