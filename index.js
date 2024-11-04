import vertexShader from './vertex.glsl';
import fragmentShader from './fragment.glsl';

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
