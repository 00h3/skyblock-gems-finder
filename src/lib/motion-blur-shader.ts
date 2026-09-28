import * as THREE from "three";

/**
 * AAA Motion Blur Shader
 * Produces subtle, cinematic camera & movement velocity blur similar to high refresh rate AAA games.
 * Blurs dynamically along the camera rotation and player movement velocity vectors while remaining
 * ultra-clean and sharp when standing still or making gentle turns.
 */
export const MotionBlurShader = {
  name: "MotionBlurShader",
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uVelocity: { value: new THREE.Vector2(0, 0) },
    uRadialSpeed: { value: 0.0 },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uEnabled: { value: 1.0 },
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
    uniform float uRadialSpeed;
    uniform float uEnabled;
    varying vec2 vUv;

    void main() {
      if (uEnabled < 0.5) {
        gl_FragColor = texture2D(tDiffuse, vUv);
        return;
      }

      vec2 delta = uVelocity;
      // Radial blur towards screen edges from moving forward/backward
      vec2 radialDir = vUv - 0.5;
      delta += radialDir * uRadialSpeed;

      float len = length(delta);

      // Fast exit when movement is minimal - 100% sharp image with zero overhead
      if (len < 0.00035) {
        gl_FragColor = texture2D(tDiffuse, vUv);
        return;
      }

      // AAA game cap: keeps blur subtle, smooth, and pleasant ("kinda blurry not that blurry")
      float maxDist = 0.0054;
      if (len > maxDist) {
        delta = (delta / len) * maxDist;
      }

      // 7-tap Gaussian-weighted directional blur for creamy, flicker-free trails
      vec4 col = vec4(0.0);
      col += texture2D(tDiffuse, vUv - delta * 0.50) * 0.09;
      col += texture2D(tDiffuse, vUv - delta * 0.33) * 0.14;
      col += texture2D(tDiffuse, vUv - delta * 0.16) * 0.18;
      col += texture2D(tDiffuse, vUv)                * 0.18;
      col += texture2D(tDiffuse, vUv + delta * 0.16) * 0.18;
      col += texture2D(tDiffuse, vUv + delta * 0.33) * 0.14;
      col += texture2D(tDiffuse, vUv + delta * 0.50) * 0.09;

      gl_FragColor = col;
    }
  `,
};
