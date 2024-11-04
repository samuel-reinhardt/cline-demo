window.addEventListener('load', () => {
    // Create canvas container first
    const container = document.createElement('div');
    container.id = 'curtains-canvas';
    document.body.appendChild(container);

    // Initialize curtains with the container
    const curtains = new Curtains({
        container: container,
        pixelRatio: Math.min(1.5, window.devicePixelRatio),
        autoRender: true
    });

    // Simple vertex shader that passes grid coordinates
    const vs = `
        precision mediump float;
        
        attribute vec3 aVertexPosition;
        attribute vec2 aTextureCoord;
        
        uniform mat4 uMVMatrix;
        uniform mat4 uPMatrix;
        
        varying vec2 vTextureCoord;
        
        void main() {
            gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
            vTextureCoord = aTextureCoord;
        }
    `;

    // Fragment shader with random green squares
    const fs = `
        precision mediump float;
        
        varying vec2 vTextureCoord;
        
        uniform vec2 uImageSize;
        uniform float uGridSize;
        
        // Pseudo-random function
        float random(vec2 co) {
            return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
        }
        
        void main() {
            // Calculate grid cell coordinates
            vec2 gridCoord = floor(vTextureCoord * uImageSize / uGridSize);
            
            // Get random value for this grid cell
            float rnd = random(gridCoord);
            
            // Define our three shades of green
            vec3 green1 = vec3(0.0, 0.91, 0.52); // #00e885
            vec3 green2 = vec3(0.0, 0.74, 0.42); // #00BD6B
            vec3 green3 = vec3(0.0, 0.68, 0.39); // #00ae64
            
            // Choose color based on random value
            vec3 finalColor;
            if (rnd < 0.33) {
                finalColor = green1;
            } else if (rnd < 0.66) {
                finalColor = green2;
            } else {
                finalColor = green3;
            }
            
            gl_FragColor = vec4(finalColor, 1.0);
        }
    `;

    // Handle WebGL context errors
    curtains.onError(() => {
        console.error('Error initializing WebGL');
        document.body.classList.add('no-curtains');
        document.querySelectorAll('.entry-effect').forEach(img => {
            img.style.opacity = 1;
        });
    });

    // Create planes after curtains is ready
    curtains.onSuccess(() => {
        document.querySelectorAll('.entry-effect').forEach(image => {
            // Wait for image to load to get dimensions
            if (image.complete) {
                createPlane(image);
            } else {
                image.onload = () => createPlane(image);
            }
        });
    });

    function createPlane(image) {
        // Get image dimensions
        const bounds = image.getBoundingClientRect();
        
        // Fixed grid size of 10 pixels
        const GRID_SIZE = 10;
        
        // Calculate number of grid cells
        const numCellsX = Math.floor(bounds.width / GRID_SIZE);
        const numCellsY = Math.floor(bounds.height / GRID_SIZE);

        // Create plane with minimal segments
        const plane = new Plane(curtains, image, {
            vertexShader: vs,
            fragmentShader: fs,
            widthSegments: numCellsX,
            heightSegments: numCellsY,
            uniforms: {
                uGridSize: {
                    name: "uGridSize",
                    type: "1f",
                    value: GRID_SIZE
                },
                uImageSize: {
                    name: "uImageSize",
                    type: "2f",
                    value: [bounds.width, bounds.height]
                }
            }
        });

        if (plane) {
            plane.onReady(() => {
                // Update plane dimensions on scroll
                window.addEventListener("scroll", () => {
                    plane.updateScrollPosition();
                });

                // Update dimensions on resize
                window.addEventListener("resize", () => {
                    const newBounds = image.getBoundingClientRect();
                    
                    // Update uniforms with new dimensions
                    plane.uniforms.uImageSize.value = [newBounds.width, newBounds.height];
                    
                    // Recalculate number of cells
                    const newNumCellsX = Math.floor(newBounds.width / GRID_SIZE);
                    const newNumCellsY = Math.floor(newBounds.height / GRID_SIZE);
                    
                    // Update plane segments
                    plane.resize({
                        widthSegments: newNumCellsX,
                        heightSegments: newNumCellsY
                    });
                });
            }).onError(() => {
                console.error('Error loading plane');
                image.style.opacity = 1;
            });
        } else {
            console.error('Could not create plane');
            image.style.opacity = 1;
        }
    }
});
