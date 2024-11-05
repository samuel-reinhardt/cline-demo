// Simple vertex shader that passes grid coordinates
export const vertexShader = `
    precision mediump float;
    
    attribute vec3 aVertexPosition;
    attribute vec2 aTextureCoord;
    
    uniform mat4 uMVMatrix;
    uniform mat4 uPMatrix;
    uniform mat4 uTextureMatrix0;
    
    varying vec2 vTextureCoord;
    
    void main() {
        gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
        vTextureCoord = (uTextureMatrix0 * vec4(aTextureCoord, 0.0, 1.0)).xy;
    }
`;

// Fragment shader with true 3D flip animation
export const fragmentShader = `
    precision mediump float;
    
    varying vec2 vTextureCoord;
    
    uniform vec2 uImageSize;
    uniform float uGridSize;
    uniform float uAnimationProgress;
    uniform float uTime;
    uniform sampler2D uSampler0;
    
    const float PI = 3.14159265359;
    
    // Define our three green shades
    const vec3 GREEN_LIGHT = vec3(0.0, 0.91, 0.522);  // #00E885
    const vec3 GREEN_DARK = vec3(0.0, 0.447, 0.255);  // #007241
    const vec3 GREEN_MED = vec3(0.0, 0.741, 0.42);    // #00BD6B
    
    // Pseudo-random function for noise
    float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }
    
    // Smooth interpolation between three colors based on a value between 0 and 1
    vec3 interpolateColors(vec3 color1, vec3 color2, vec3 color3, float t) {
        t = t * 3.0; // Scale t to cover all three colors
        if (t < 1.0) {
            return mix(color1, color2, t);
        } else if (t < 2.0) {
            return mix(color2, color3, t - 1.0);
        } else {
            return mix(color3, color1, t - 2.0);
        }
    }
    
    // Select and oscillate green shade based on position and time
    vec3 selectGreenShade(vec2 position) {
        float r = random(position);
        
        // Create a time-based oscillation (0 to 1)
        // Slower oscillation (0.1 Hz) with random phase offset
        float oscillation = (sin(uTime * PI + r * PI * 2.0) + 1.0) * 0.1;
        
        // Interpolate between the three shades based on oscillation
        return interpolateColors(GREEN_LIGHT, GREEN_MED, GREEN_DARK, oscillation);
    }
    
    // Calculate delay based on distance from top-left with organic variation
    float calculateDelay(vec2 currentGrid, vec2 maxGrid) {
        // Calculate normalized position (0 to 1 range)
        vec2 normalizedPos = currentGrid / maxGrid;
        
        // Calculate Manhattan distance from top-left
        float distanceFromTopLeft = normalizedPos.x + normalizedPos.y;
        
        // Add noise based on position
        float noise = random(currentGrid * 0.1) * 0.15;
        
        // Combine distance and noise for organic wave effect
        float delay = distanceFromTopLeft * 0.4 + noise;
        
        // Keep original delay range [0, 0.75] for wave effect
        return clamp(delay, 0.0, 0.75);
    }
    
    void main() {
        // Convert WebGL coordinates to top-left origin coordinates
        vec2 invertedCoord = vec2(vTextureCoord.x, 1.0 - vTextureCoord.y);
        
        // Calculate grid cell coordinates (now using inverted Y)
        vec2 gridCoord = floor(invertedCoord * uImageSize / uGridSize);
        vec2 cellPosition = fract(vTextureCoord * uImageSize / uGridSize);
        
        // Calculate total grid dimensions
        vec2 totalGrid = floor(uImageSize / uGridSize);
        
        // Calculate delay based on distance from top-left with noise
        float delay = calculateDelay(gridCoord, totalGrid);
        
        // Scale progress to account for maximum delay (0.75)
        float scaledProgress = uAnimationProgress * 1.75;
        
        // Calculate local animation progress with delay
        float localProgress = clamp((scaledProgress - delay), 0.0, 1.0);
        
        // Calculate rotation angle (0 to PI for 180-degree rotation)
        float angle = localProgress * PI;
        
        // Center point of the cell
        vec2 center = vec2(0.5);
        vec2 fromCenter = cellPosition - center;
        
        // Mirror the pixels over x-axis within each cell
        fromCenter.x = -fromCenter.x;
        
        // Calculate perspective scale based on rotation
        float scale = cos(angle);
        
        // Apply perspective transformation
        vec2 rotatedPos = fromCenter;
        rotatedPos.x *= scale;  // Scale X based on rotation
        rotatedPos = center + rotatedPos;
        
        // Calculate UV coordinates for the current cell
        vec2 cellUV = rotatedPos * uGridSize / uImageSize + 
                     floor(vTextureCoord * uImageSize / uGridSize) * uGridSize / uImageSize;
        
        vec2 textureUV = vec2(cellUV.x, cellUV.y);
        vec4 textureColor = texture2D(uSampler0, textureUV);
        
        // Select and oscillate green shade for this square
        vec3 greenColor = selectGreenShade(gridCoord);
        
        // Determine which side is visible based on rotation
        float isFront = step(0.0, cos(angle));
        
        // Mix colors based on which side is visible
        vec4 frontColor = vec4(greenColor, 1.0);
        vec4 backColor = vec4(textureColor.rgb, 1.0);
        vec4 finalColor = mix(backColor, frontColor, isFront);
        
        // Calculate visibility of the square
        float edgeVisibility = step(abs(fromCenter.x), 0.5 * abs(scale));
        
        gl_FragColor = vec4(finalColor.rgb, edgeVisibility);
    }
`;
