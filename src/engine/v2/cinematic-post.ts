import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

/**
 * Soft, bright cinematic grade (Hytale-style). Motion blur is intentionally
 * not applied so the image stays crisp while turning and sprinting.
 */
const MotionShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uVignette: { value: 0.08 },
    uGrade: { value: 0 },
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
        c = mix(vec3(luma), c, 1.0 - 0.06 * uGrade);
        c = (c - 0.5) * (1.0 - 0.02 * uGrade) + 0.5;
        c = c * (1.0 + 0.08 * uGrade) + 0.025 * uGrade;
        vec3 shadowTint = vec3(0.98, 1.0, 1.04);
        vec3 highTint = vec3(1.03, 1.0, 0.97);
        c *= mix(shadowTint, highTint, smoothstep(0.15, 0.85, luma)) * uGrade + (1.0 - uGrade);
        color.rgb = max(c, 0.0);
      }
      float v = smoothstep(0.85, 0.2, length(fromCenter * vec2(1.1, 1.0)));
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
    _strength = 0.18,
  ) {
    const size = renderer.getSize(new THREE.Vector2());
    const target = new THREE.WebGLRenderTarget(size.x, size.y, {
      type: THREE.HalfFloatType,
      samples: 0,
    });
    this.composer = new EffectComposer(renderer, target);
    this.composer.setPixelRatio(renderer.getPixelRatio());
    this.composer.setSize(size.x, size.y);
    this.composer.addPass(new RenderPass(scene, camera));
    const bloomW = Math.max(64, Math.round(size.x / 3));
    const bloomH = Math.max(64, Math.round(size.y / 3));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(bloomW, bloomH), 0.28, 0.5, 0.98);
    this.composer.addPass(this.bloom);
    this.motion = new ShaderPass(MotionShader);
    this.composer.addPass(this.motion);
    this.composer.addPass(new OutputPass());
  }

  /** Graphics V2: richer bloom on bright sun/emissives plus a filmic grade. */
  setGraphicsV2(on: boolean) {
    this.bloom.strength = on ? 0.36 : 0.28;
    this.bloom.radius = on ? 0.62 : 0.5;
    this.bloom.threshold = on ? 0.9 : 0.98;
    this.motion.uniforms.uGrade.value = on ? 1 : 0;
    this.motion.uniforms.uVignette.value = on ? 0.1 : 0.08;
  }

  setSize(w: number, h: number, pixelRatio: number) {
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(w, h);
    this.bloom.setSize(Math.max(64, Math.round(w / 3)), Math.max(64, Math.round(h / 3)));
  }

  render(dt: number) {
    this.composer.render(dt);
  }

  dispose() {
    this.composer.dispose();
  }
}
