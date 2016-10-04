varying vec4 buffer;
varying vec2 vUv;
uniform sampler2D texture;
uniform float opacity;

varying vec3 vColor;
vec3 colorStart = vec3(0.027450980392156862, 0.9568627450980393, 0.4196078431372549);
// vec3 colorStart =  vec3(1.0, 0.0, 0.0);
vec3 colorEnd = vec3(0.0, 0.0, 1.0);

void main() {

	vec4 mask = texture2D( texture, gl_PointCoord );
	vec3 colorVoiceOver = vec3(vColor);
	// vec3 colorVoiceOver = mix(colorStart, colorEnd, buffer.a);

	float alpha = (buffer.a * mask.a) * opacity;
	gl_FragColor = vec4(colorVoiceOver, alpha);

}
