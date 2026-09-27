import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

/**
 * Camera motion blur + soft grade. Blur is driven by how fast the camera
 * turns (directional smear) and moves forward (radial smear), so a still
 * camera renders perfectly sharp.
 */
const MotionShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uVelocity: { value: new THREE.Vector2() },
    uRadial: { value: 0 },
    uVignette: { value: 0.28 },
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
    uniform vec2 uVelocity;
    uniform float uRadial;
    uniform float uVignette;
    varying vec2 vUv;
    const int SAMPLES = 8;
    void main() {
      vec2 fromCenter = vUv - 0.5;
      float edge = smoothstep(0.08, 0.75, length(fromCenter));
      vec2 dir = uVelocity + fromCenter * uRadial * edge;
      vec4 color = texture2D(tDiffuse, vUv);
      if (dot(dir, dir) > 1e-8) {
        vec4 acc = color;
        for (int i = 1; i < SAMPLES; i++) {
          float t = float(i) / float(SAMPLES - 1) - 0.5;
          acc += texture2D(tDiffuse, vUv + dir * t);
        }
        color = acc / float(SAMPLES);
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
  private readonly prevQuat = new THREE.Quaternion();
  private readonly prevPos = new THREE.Vector3();
  private readonly tmpQuat = new THREE.Quaternion();
  private readonly euler = new THREE.Euler(0, 0, 0, "YXZ");
  private readonly forward = new THREE.Vector3();
  private readonly smoothVel = new THREE.Vector2();
  private smoothRadial = 0;
  private primed = false;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    private readonly camera: THREE.PerspectiveCamera,
    private readonly strength = 0.72,
  ) {
    const size = renderer.getSize(new THREE.Vector2());
    const target = new THREE.WebGLRenderTarget(size.x, size.y, {
      type: THREE.HalfFloatType,
      samples: renderer.capabilities.isWebGL2 ? 4 : 0,
    });
    this.composer = new EffectComposer(renderer, target);
    this.composer.setPixelRatio(renderer.getPixelRatio());
    this.composer.setSize(size.x, size.y);
    this.composer.addPass(new RenderPass(scene, camera));
    // Half-res HDR bloom: only genuinely bright pixels (sun, moon, lava,
    // phoenix fire, sword sparks) bleed light, with a soft falloff radius.
    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.34, 0.6, 1.0);
    this.composer.addPass(this.bloom);
    this.motion = new ShaderPass(MotionShader);
    this.composer.addPass(this.motion);
    this.composer.addPass(new OutputPass());
  }

  setSize(w: number, h: number, pixelRatio: number) {
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(w, h);
    this.bloom.setSize(w / 2, h / 2);
  }

  render(dt: number) {
    const cam = this.camera;
    const u = this.motion.uniforms;
    if (!this.primed || dt <= 0) {
      this.prevQuat.copy(cam.quaternion);
      this.prevPos.copy(cam.position);
      this.primed = true;
    }

    // Angular delta in camera space → screen-space smear direction.
    this.tmpQuat.copy(this.prevQuat).invert().multiply(cam.quaternion);
    this.euler.setFromQuaternion(this.tmpQuat, "YXZ");
    const fovY = THREE.MathUtils.degToRad(cam.fov);
    const fovX = 2 * Math.atan(Math.tan(fovY / 2) * cam.aspect);
    const maxSmear = 0.035 * this.strength;
    const vx = THREE.MathUtils.clamp(-this.euler.y / fovX, -maxSmear, maxSmear);
    const vy = THREE.MathUtils.clamp(this.euler.x / fovY, -maxSmear, maxSmear);

    cam.getWorldDirection(this.forward);
    const moved = this.forward.dot(this.tmpVec.subVectors(cam.position, this.prevPos));
    const speed = dt > 0 ? moved / dt : 0;
    const radialTarget = THREE.MathUtils.clamp((Math.abs(speed) - 3) * 0.006, 0, 0.05) * this.strength;

    const k = 1 - Math.exp(-18 * Math.max(dt, 0.001));
    this.smoothVel.x += (vx - this.smoothVel.x) * k;
    this.smoothVel.y += (vy - this.smoothVel.y) * k;
    this.smoothRadial += (radialTarget - this.smoothRadial) * k;
    u.uVelocity.value.set(
      Math.abs(this.smoothVel.x) < 0.0006 ? 0 : this.smoothVel.x,
      Math.abs(this.smoothVel.y) < 0.0006 ? 0 : this.smoothVel.y,
    );
    u.uRadial.value = this.smoothRadial < 0.002 ? 0 : this.smoothRadial;

    this.prevQuat.copy(cam.quaternion);
    this.prevPos.copy(cam.position);
    this.composer.render(dt);
  }

  private readonly tmpVec = new THREE.Vector3();

  dispose() {
    this.composer.dispose();
  }
}
