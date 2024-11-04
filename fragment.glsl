precision mediump float;

varying vec2 vTextureCoord;
varying float vProgress;
varying float vDirection;

uniform sampler2D uSampler;
uniform float uTime;

void main() {
    // Create 5px grid
    vec2 gridUV = floor(vTextureCoord * 160.0) / 160.0;
    
    // Sample original texture
    vec4 texture = texture2D(uSampler, vTextureCoord);
    
    // Generate random green color
    float random = fract(sin(dot(gridUV, vec2(12.9898, 78.233))) * 43758.5453);
    vec4 greenColor = vec4(0.0, 0.2 + random * 0.5, 0.0, 1.0);
    
    // Mix between green and texture based on progress
    float mixRatio = smoothstep(0.0, 1.0, vProgress);
    
    if (vDirection > 0.0) {
        gl_FragColor = mix(greenColor, texture, mixRatio);
    } else {
        gl_FragColor = mix(texture, greenColor, mixRatio);
    }
}
