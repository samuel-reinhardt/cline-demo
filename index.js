window.addEventListener('load', () => {
    // Check if we're in dev mode
    const isDevMode = new URLSearchParams(window.location.search).has('dev');
    const devControls = document.getElementById('dev-controls');
    const timelineSlider = document.getElementById('timeline-slider');
    const progressValue = document.getElementById('progress-value');

    // Show dev controls if in dev mode
    if (isDevMode && devControls) {
        devControls.style.display = 'flex';
    }

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

    // Fragment shader with true 3D flip animation
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
            return (distance / maxDistance) * 1.2;
        }
        
        // Smooth step function for more natural transitions
        float smootherstep(float edge0, float edge1, float x) {
            x = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
            return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
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
            float localProgress = smootherstep(0.0, 1.0, clamp((uAnimationProgress * 1.5 - delay), 0.0, 1.0));
            
            // Calculate rotation angle (0 to PI for 180-degree rotation)
            float angle = localProgress * PI;
            
            // Center point of the cell
            vec2 center = vec2(0.5);
            
            // Apply 3D perspective transformation
            vec2 fromCenter = cellPosition - center;
            
            // Enhanced perspective effect during rotation
            float perspectiveStrength = 2.0;
            float z = sin(angle) * perspectiveStrength;
            float perspective = 1.0 / (1.0 + z * 0.5);
            
            // Scale based on rotation angle
            fromCenter.x *= cos(angle);
            vec2 perspectivePos = center + fromCenter * perspective;
            
            // Calculate UV coordinates for texture sampling
            vec2 uv = perspectivePos * uGridSize / uImageSize + floor(vTextureCoord * uImageSize / uGridSize) * uGridSize / uImageSize;
            
            // Sample the texture
            vec4 textureColor = texture2D(uSampler0, uv);
            
            // Define green colors for the front side
            vec3 greenColor;
            float rnd = random(gridCoord);
            if (rnd < 0.33) {
                greenColor = vec3(0.0, 0.91, 0.52);
            } else if (rnd < 0.66) {
                greenColor = vec3(0.0, 0.74, 0.42);
            } else {
                greenColor = vec3(0.0, 0.68, 0.39);
            }
            
            // Calculate visibility based on angle
            // Maximum transparency when the square is edge-on (90 degrees)
            float edgeOnFactor = abs(sin(angle));
            float visibility = 1.0 - pow(edgeOnFactor, 0.5);
            
            // Determine which side is visible (front = green, back = image)
            // Use a sharp transition between sides
            float isFront = step(0.0, cos(angle));
            
            // Add subtle edge highlighting
            float edgeHighlight = pow(abs(sin(angle)), 4.0) * 0.15;
            
            // Mix colors based on which side is visible
            vec4 frontColor = vec4(greenColor + vec3(edgeHighlight), 1.0);
            vec4 backColor = vec4(textureColor.rgb, 1.0);
            vec4 finalColor = mix(backColor, frontColor, isFront);
            
            // Calculate final alpha
            // Only show one side at a time and factor in edge-on transparency
            float alpha = visibility * step(abs(fromCenter.x), 0.5 * abs(cos(angle)));
            
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

    // Store all planes for dev mode control
    const planes = [];

    // Create intersection observer with two thresholds
    const observer = new IntersectionObserver((entries) => {
        // Only handle intersection events if not in dev mode
        if (!isDevMode) {
            entries.forEach(entry => {
                const plane = entry.target.plane;
                if (!plane) return;

                // When element is at least 75% visible, start animation
                if (entry.isIntersecting && entry.intersectionRatio >= 0.75) {
                    if (!plane.userData.animated) {
                        plane.userData.animated = true;
                        gsap.to(plane.uniforms.uAnimationProgress, {
                            value: 1,
                            duration: 4.5,
                            ease: "power1.inOut",
                            overwrite: true
                        });
                    }
                }
                // When element is completely out of view, reset animation
                else if (entry.intersectionRatio === 0) {
                    plane.userData.animated = false;
                    gsap.to(plane.uniforms.uAnimationProgress, {
                        value: 0,
                        duration: 0,
                        overwrite: true
                    });
                }
            });
        }
    }, {
        threshold: [0, 0.75]
    });

    // Create planes after curtains is ready
    curtains.onSuccess(() => {
        document.querySelectorAll('.entry-effect').forEach(image => {
            const plane = createPlane(image);
            if (plane) {
                planes.push(plane);
                // Set initial opacity
                image.style.opacity = 1;
            }
        });
    });

    // Handle dev mode slider input
    if (isDevMode && timelineSlider) {
        timelineSlider.addEventListener('input', (e) => {
            const progress = parseFloat(e.target.value) / 100;
            progressValue.textContent = `${Math.round(progress * 100)}%`;
            
            // Update all planes with the new progress value
            planes.forEach(plane => {
                plane.uniforms.uAnimationProgress.value = progress;
            });
        });
    }

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
                // Only observe if not in dev mode
                if (!isDevMode) {
                    observer.observe(image);
                }
                
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

        return plane;
    }
});
