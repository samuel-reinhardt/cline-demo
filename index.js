// Vertex shader code
const vertexShader = `
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
`;

// Fragment shader code
const fragmentShader = `
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
`;

class ImageEffect {
    constructor() {
        this.curtains = new Curtains({
            container: "body",
            pixelRatio: Math.min(1.5, window.devicePixelRatio)
        });

        this.scrollDirection = 1;
        this.lastScrollTop = 0;
        this.planes = [];
        this.observer = null;

        this.init();
    }

    init() {
        // Track scroll direction
        window.addEventListener('scroll', () => {
            const st = window.pageYOffset || document.documentElement.scrollTop;
            this.scrollDirection = st > this.lastScrollTop ? 1 : -1;
            this.lastScrollTop = st;
        });

        // Setup intersection observer
        this.observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    const plane = this.planes.find(p => p.htmlElement === entry.target);
                    if (plane) {
                        if (entry.isIntersecting && entry.intersectionRatio >= 0.75) {
                            gsap.to(plane.uniforms.uProgress, {
                                value: 1,
                                duration: 1.5,
                                ease: "power2.out"
                            });
                        } else {
                            gsap.to(plane.uniforms.uProgress, {
                                value: 0,
                                duration: 1.5,
                                ease: "power2.in"
                            });
                        }
                    }
                });
            },
            {
                threshold: [0, 0.75, 1]
            }
        );

        // Setup planes for each image
        const images = document.querySelectorAll('.entry-effect');
        images.forEach(image => {
            this.setupPlane(image);
        });
    }

    setupPlane(element) {
        const plane = this.curtains.addPlane(element, {
            vertexShader,
            fragmentShader,
            uniforms: {
                uTime: {
                    name: "uTime",
                    type: "1f",
                    value: 0
                },
                uProgress: {
                    name: "uProgress",
                    type: "1f",
                    value: 0
                },
                uDirection: {
                    name: "uDirection",
                    type: "1f",
                    value: 1
                },
                uResolution: {
                    name: "uResolution",
                    type: "2f",
                    value: [element.clientWidth, element.clientHeight]
                },
                uMousePosition: {
                    name: "uMousePosition",
                    type: "2f",
                    value: [0.5, 0.5]
                }
            }
        });

        if (plane) {
            this.planes.push(plane);
            this.observer.observe(element);

            plane.onRender(() => {
                plane.uniforms.uTime.value++;
                plane.uniforms.uDirection.value = this.scrollDirection;
            });
        }
    }
}

// Initialize effect when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
    new ImageEffect();
});
