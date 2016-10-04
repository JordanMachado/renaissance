varying vec2 vUv;

uniform sampler2D tPositions;
uniform sampler2D tInfos;
uniform vec3 mouse;
uniform float lifeDiviser;
uniform float tick;
uniform float volume;
#pragma glslify: snoise2 = require(glsl-noise/simplex/2d)
#pragma glslify: pnoise = require(glsl-noise/periodic/3d)

void main() {
      vec4 infos = texture2D(tInfos, vUv);
      vec4 pos = texture2D(tPositions, vUv);
      float life = pos.w;
      life -= lifeDiviser;
      if (life < 0.001) {
        life = 1.0;
        pos = vec4(mouse ,0.0);
      }
      float noise2 = snoise2(vUv * 20.0);
      pos.x += cos( infos.z ) * infos.x * (noise2 * 5.0 * volume);
      pos.y += sin( infos.z ) * infos.y * (noise2 * 5.0 * volume);
      // pos.x += noise ;
      // pos.y *= noise;
      pos.z += volume;

      gl_FragColor = vec4(pos.xyz, life);

}
