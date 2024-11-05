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
    uniform sampler2D uSampler0;
    
    const float PI = 3.14159265359;
    
    // Calculate delay based primarily on x-coordinate
    float calculateDelay(vec2 currentGrid, vec2 maxGrid) {
        // Focus on x-coordinate for left-to-right animation
        float xProgress = currentGrid.x / maxGrid.x;
        
        // Scale delay to ensure rightmost squares complete on time
        // Reserve 0.25 for the actual flip animation
        return xProgress * 0.75;
    }
    
    void main() {
        // Calculate grid cell coordinates
        vec2 gridCoord = floor(vTextureCoord * uImageSize / uGridSize);
        vec2 cellPosition = fract(vTextureCoord * uImageSize / uGridSize);
        
        // Calculate total grid dimensions
        vec2 totalGrid = floor(uImageSize / uGridSize);
        
        // Calculate delay based on x-coordinate
        float delay = calculateDelay(gridCoord, totalGrid);
        
        // Calculate local animation progress with delay
        float localProgress = clamp((uAnimationProgress - delay), 0.0, 1.0);
        
        // Calculate rotation angle (0 to PI for 180-degree rotation)
        float angle = localProgress * PI;
        
        // Center point of the cell
        vec2 center = vec2(0.5);
        vec2 fromCenter = cellPosition - center;
        
        // Calculate perspective scale based on rotation
        float scale = cos(angle);
        
        // Apply perspective transformation
        vec2 rotatedPos = fromCenter;
        rotatedPos.x *= scale;  // Scale X based on rotation
        rotatedPos = center + rotatedPos;
        
        // Calculate UV coordinates for the current cell
        vec2 cellUV = rotatedPos * uGridSize / uImageSize + 
                     floor(vTextureCoord * uImageSize / uGridSize) * uGridSize / uImageSize;
        
        // Always flip texture coordinates initially (back side starts visible)
        vec2 flippedUV = vec2(1.0 - cellUV.x, cellUV.y);
        vec4 textureColor = texture2D(uSampler0, flippedUV);
        
        // Define green color for front side
        vec3 greenColor = vec3(0.0, 0.85, 0.45);
        
        // Determine which side is visible based on rotation
        float isFront = step(0.0, cos(angle));
        
        // Mix colors based on which side is visible
        vec4 frontColor = vec4(greenColor, 1.0);
        vec4 backColor = vec4(textureColor.rgb, 1.0);
        vec4 finalColor = mix(backColor, frontColor, isFront);
        
        // Calculate visibility of the square
        float edgeVisibility = step(abs(fromCenter.x), 0.5 * abs(scale));
        
        // Calculate transparency at the edge-on state (90 degrees)
        float edgeOnTransparency = 1.0 - abs(sin(angle));
        
        // Combine visibilities for final alpha
        float alpha = edgeVisibility * (abs(scale) + 0.1);
        
        gl_FragColor = vec4(finalColor.rgb, alpha);
    }
`;
