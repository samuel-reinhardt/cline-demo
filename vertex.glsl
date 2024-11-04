precision mediump float;

attribute vec3 aVertexPosition;
attribute vec2 aTextureCoord;

uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;

uniform float uTime;
uniform float uProgress;
uniform vec2 uResolution;
uniform float uDirection;
uniform vec2 uMousePosition;

varying vec2 vTextureCoord;
varying float vProgress;
varying float vDirection;

void main() {
    vec3 vertexPosition = aVertexPosition;
    
    // Calculate distance from mouse position for wave effect
    vec2 mouseDistance = (vertexPosition.xy / uResolution - uMousePosition);
    float distanceFromMouse = length(mouseDistance);
    
    // Create wave effect based on distance and direction
    float waveEffect = sin(distanceFromMouse * 10.0 - uTime * 2.0) * 0.05;
    
    // Scale effect
    float scale = 1.0 + (sin(uProgress * 3.14) * 0.1);
    vertexPosition.xy *= scale;
    
    // Flip effect
    float flipProgress = clamp(uProgress * 2.0 - distanceFromMouse, 0.0, 1.0);
    float flip = sin(flipProgress * 3.14) * 3.14;
    
    if (uDirection > 0.0) {
        vertexPosition.z += sin(flip) * 0.1;
    } else {
        vertexPosition.z += sin(-flip) * 0.1;
    }
    
    gl_Position = uPMatrix * uMVMatrix * vec4(vertexPosition, 1.0);
    
    vTextureCoord = aTextureCoord;
    vProgress = flipProgress;
    vDirection = uDirection;
}
