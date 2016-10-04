
attribute float pointSize;
attribute vec3 color;

uniform sampler2D tMap;
uniform float volume;
uniform float volumeScale;

varying vec2 vUv;
varying vec3 vColor;
varying vec4 buffer;


void main() {

	vUv = uv;
	vColor = color;
	buffer = texture2D(tMap, vUv);
	vec3 newPosition = position + buffer.xyz;

	gl_PointSize = pointSize * buffer.a * (volume * volumeScale);

	gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);

}
