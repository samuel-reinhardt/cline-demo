window.addEventListener('load', () => {
    // Create canvas container first
    const container = document.createElement('div');
    container.id = 'curtains-canvas';
    document.body.appendChild(container);

    // Initialize curtains with the container
    const curtains = new Curtains({
        container: container,
        pixelRatio: Math.min(1.5, window.devicePixelRatio), // Better handling of pixel ratio
        autoRender: true
    });

    // Enhanced vertex shader with better texture coordinate handling
    const vs = `
        precision mediump float;
        
        // Default attributes from curtains.js
        attribute vec3 aVertexPosition;
        attribute vec2 aTextureCoord;
        
        // Default uniforms from curtains.js
        uniform mat4 uMVMatrix;
        uniform mat4 uPMatrix;
        
        // Varyings
        varying vec2 vTextureCoord;
        
        void main() {
            // Handle vertex position
            gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
            
            // Pass texture coordinates to fragment shader
            vTextureCoord = aTextureCoord;
        }
    `;

    // Enhanced fragment shader with proper texture sampling
    const fs = `
        precision mediump float;
        
        // Get our texture coordinates from vertex shader
        varying vec2 vTextureCoord;
        
        // Our texture sampler
        uniform sampler2D uSampler0;
        
        void main() {
            // Sample the texture
            vec4 textureColor = texture2D(uSampler0, vTextureCoord);
            
            // Apply the texture color
            gl_FragColor = textureColor;
        }
    `;

    // Handle WebGL context errors
    curtains.onError(() => {
        console.error('Error initializing WebGL');
        document.body.classList.add('no-curtains');
        // Fallback for images
        document.querySelectorAll('.entry-effect').forEach(img => {
            img.style.opacity = 1;
        });
    });

    // Create planes only after curtains is ready
    curtains.onSuccess(() => {
        document.querySelectorAll('.entry-effect').forEach(image => {
            // Create plane with enhanced parameters
            const plane = new Plane(curtains, image, {
                vertexShader: vs,
                fragmentShader: fs,
                widthSegments: 1,
                heightSegments: 1,
                // Ensure proper texture loading
                texturesOptions: {
                    premultiplyAlpha: true,
                    anisotropy: 1,
                    // Ensure textures are loaded with correct orientation
                    flipY: true,
                    // Use better texture filtering
                    minFilter: curtains.gl.LINEAR_MIPMAP_NEAREST
                }
            });

            if (plane) {
                // Handle successful plane creation
                plane.onReady(() => {
                    console.log('Plane is ready');
                    
                    // Verify texture loading
                    if (plane.textures.length > 0) {
                        console.log('Texture loaded successfully:', plane.textures[0]);
                    }
                })
                .onLoading((texture) => {
                    // Log texture loading progress
                    console.log('Loading texture:', texture);
                })
                .onError(() => {
                    console.error('Error loading plane or texture');
                    // Fallback if plane or texture fails
                    image.style.opacity = 1;
                });

                // Load the image texture
                plane.loadImage(image.src, {
                    sampler: "uSampler0"
                });

            } else {
                console.error('Could not create plane');
                // Fallback if plane creation fails
                image.style.opacity = 1;
            }
        });
    });
});
