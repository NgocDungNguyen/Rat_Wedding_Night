// Film grade pass (grain, vignette, chromatic aberration, colour grade), adapted from the trailer's web/main.js.
// Adds uGamma for the brightness setting and uFade/uRed for later gameplay effects.
import * as THREE from 'three';

export const GradeShader = {
  uniforms: {
    tDiffuse: { value: null }, uT: { value: 0 }, uCA: { value: .0012 }, uGrain: { value: .06 }, uVig: { value: .5 },
    uGamma: { value: 1 }, uFade: { value: 1 }, uRed: { value: 0 }, uRes: { value: new THREE.Vector2(1920, 1080) },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uT, uCA, uGrain, uVig, uGamma, uFade, uRed; uniform vec2 uRes; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec2 uv = vUv, c = uv - .5; float r2 = dot(c, c);
      vec2 off = c * uCA;
      vec3 col = vec3(texture2D(tDiffuse, uv + off).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - off).b);
      col = pow(max(col, 0.), vec3(1. / uGamma));
      float lum = dot(col, vec3(.299,.587,.114));
      vec3 sh = vec3(.004,.011,.02), hi = vec3(1.06,.98,.9);
      col = mix(col, col * hi, smoothstep(.25, .8, lum)) + sh * (1. - smoothstep(0., .35, lum));
      float rr = col.r - max(col.g, col.b);
      col = mix(vec3(lum), col, .82 + clamp(rr * 2.5, 0., .5));
      col = mix(col, vec3(lum * 1.4, lum * .15, lum * .1), uRed);
      col = col * col * (3. - 2. * col) * .35 + col * .65;
      col *= 1. - uVig * smoothstep(.15, .75, r2 * 1.6);
      col += (h(vUv * uRes + fract(uT * 13.7) * 91.) - .5) * uGrain;
      gl_FragColor = vec4(col * uFade, 1.);
    }`,
};
