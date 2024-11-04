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
        uniform mat4 uTextureMatrix0;
        
        varying vec2 vTextureCoord;
        
        void main() {
            gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
            vTextureCoord = (uTextureMatrix0 * vec4(aTextureCoord, 0.0, 1.0)).xy;
        }
    `;

    // Fragment shader with enhanced 3D flip animation
    const fs = `
        precision mediump float;
        
        varying vec2 vTextureCoord;
        
        uniform vec2 uImageSize;
        uniform float uGridSize;
        uniform float uAnimationProgress;
        uniform sampler2D uSampler0;
        
        const float PI = 3.14159265359;
        
        // Pseudo-random function for color variation
        float random(vec2 co) {
            return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
        }
        
        // Calculate delay based on distance from origin point
        float calculateDelay(vec2 currentGrid, vec2 originGrid, vec2 maxGrid) {
            vec2 diff = currentGrid - originGrid;
            float distance = sqrt(diff.x * diff.x + diff.y * diff.y);
            float maxDistance = sqrt(maxGrid.x * maxGrid.x + maxGrid.y * maxGrid.y);
            return (distance / maxDistance) * 0.75;
        }
        
        void main() {
            // Calculate grid cell coordinates
            vec2 gridCoord = floor(vTextureCoord * uImageSize / uGridSize);
            vec2 cellPosition = fract(vTextureCoord * uImageSize / uGridSize);
            
            // Calculate total grid dimensions
            vec2 totalGrid = floor(uImageSize / uGridSize);
            float totalRows = totalGrid.y;
            
            // Origin grid coordinates (center-left)
            vec2 originGrid = vec2(0.0, totalRows * 0.5);
            
            // Calculate delay based on distance from origin
            float delay = calculateDelay(gridCoord, originGrid, totalGrid);
            
            // Calculate local animation progress with delay
            float localProgress = clamp((uAnimationProgress - delay) * 1.5, 0.0, 1.0);
            
            // Calculate rotation angle (0 to PI for 180-degree rotation)
            float angle = localProgress * PI;
            
            // Center point of the cell
            vec2 center = vec2(0.5);
            
            // Apply 3D perspective transformation
            vec2 fromCenter = cellPosition - center;
            
            // Enhanced perspective effect
            float perspectiveStrength = 2.0;
            float z = sin(angle) * perspectiveStrength;
            float perspective = 1.0 / (1.0 + z * 0.5);
            
            // Scale and transform based on rotation
            fromCenter.x *= cos(angle);
            vec2 perspectivePos = center + fromCenter * perspective;
            
            // Determine if we're showing front or back
            float isFront = step(0.0, cos(angle));
            
            // Sample the texture for the back side
            vec4 textureColor = texture2D(uSampler0, vTextureCoord);
            
            // Define green colors for the front side with slight variations
            vec3 greenColor;
            float rnd = random(gridCoord);
            if (rnd < 0.33) {
                greenColor = vec3(0.0, 0.91, 0.52); // Bright green
            } else if (rnd < 0.66) {
                greenColor = vec3(0.0, 0.74, 0.42); // Medium green
            } else {
                greenColor = vec3(0.0, 0.68, 0.39); // Dark green
            }
            
            // Enhanced shading based on rotation
            float shade = mix(1.0, 0.7, abs(sin(angle)));
            
            // Add edge highlighting
            float edgeHighlight = pow(abs(sin(angle)), 4.0) * 0.3;
            
            // Mix colors based on rotation
            vec4 frontColor = vec4(greenColor * shade + vec3(edgeHighlight), 1.0);
            vec4 backColor = vec4(textureColor.rgb * shade + vec3(edgeHighlight), 1.0);
            
            // Determine final color with proper front/back visibility
            vec4 finalColor = mix(backColor, frontColor, isFront);
            
            // Add transparency during rotation to enhance 3D effect
            float alpha = mix(1.0, 0.0, pow(abs(sin(angle)), 0.5));
            alpha = mix(1.0, alpha, step(0.01, abs(sin(angle))));
            
            gl_FragColor = vec4(finalColor.rgb, alpha);
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

    // Create intersection observer
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && entry.intersectionRatio >= 0.75) {
                const plane = entry.target.plane;
                if (plane && !plane.userData.animated) {
                    plane.userData.animated = true;
                    gsap.to(plane.uniforms.uAnimationProgress, {
                        value: 1,
                        duration: 2.0,
                        ease: "power1.inOut"
                    });
                }
            }
        });
    }, {
        threshold: 0.75
    });

    // Create planes after curtains is ready
    curtains.onSuccess(() => {
        document.querySelectorAll('.entry-effect').forEach(image => {
            createPlane(image)
        });
    });

    function createPlane(image) {
        // Get image dimensions
        const bounds = image.getBoundingClientRect();
        
        // Fixed grid size of 10 pixels
        const GRID_SIZE = 20;
        
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
                },
                uAnimationProgress: {
                    name: "uAnimationProgress",
                    type: "1f",
                    value: 0
                }
            },
            texturesOptions: {
                premultiplyAlpha: true,
                anisotropy: 1,
                flipY: true,
                minFilter: curtains.gl.LINEAR_MIPMAP_NEAREST
            }
        });

        if (plane) {
            // Store plane reference and initialize animation state
            image.plane = plane;
            plane.userData = {
                animated: false
            };

            plane.onReady(() => {
                // Start observing the image
                observer.observe(image);
                
                // Update plane dimensions on scroll
                window.addEventListener("scroll", () => {
                    plane.updateScrollPosition();
                });
                plane.onRender(() => {
                    // use the onRender method of our plane fired at each requestAnimationFrame call
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
