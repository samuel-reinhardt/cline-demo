window.addEventListener('load', () => {
    // Create canvas container first
    const container = document.createElement('div');
    container.id = 'curtains-canvas';
    document.body.appendChild(container);

    // Initialize curtains with the container
    const curtains = new Curtains({
        container: container,
        pixelRatio: 1,
        autoRender: true // Enable auto rendering
    });

    // Simple vertex shader
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

    // Simple fragment shader
    const fs = `
        precision mediump float;
        
        varying vec2 vTextureCoord;
        uniform sampler2D uSampler;
        
        void main() {
            gl_FragColor = texture2D(uSampler, vTextureCoord);
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

    // Create planes only after curtains is ready
    curtains.onSuccess(() => {
        document.querySelectorAll('.entry-effect').forEach(image => {
            // Create plane with basic parameters
            const plane = new Plane(curtains, image, {
                vertexShader: vs,
                fragmentShader: fs,
                widthSegments: 1,
                heightSegments: 1
            });

            if (plane) {
                plane.onReady(() => {
                    console.log('Plane is ready');
                }).onError(() => {
                    console.error('Error loading plane');
                    image.style.opacity = 1;
                });
            } else {
                console.error('Could not create plane');
                image.style.opacity = 1;
            }
        });
    });
});
