import { vertexShader, fragmentShader } from './shaders.js';

export class PlaneManager {
    constructor(curtains, isDevMode) {
        this.curtains = curtains;
        this.isDevMode = isDevMode;
        this.planes = [];
        this.GRID_SIZE = 20;

        // Create intersection observer
        this.observer = this.createObserver();
    }

    createObserver() {
        return new IntersectionObserver((entries) => {
            // Only handle intersection events if not in dev mode
            if (!this.isDevMode) {
                entries.forEach(entry => {
                    const plane = entry.target.plane;
                    if (!plane) return;

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
                    } else if (entry.intersectionRatio === 0) {
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
    }

    createPlane(image) {
        const bounds = image.getBoundingClientRect();
        
        const numCellsX = Math.floor(bounds.width / this.GRID_SIZE);
        const numCellsY = Math.floor(bounds.height / this.GRID_SIZE);

        const plane = new Plane(this.curtains, image, {
            vertexShader,
            fragmentShader,
            widthSegments: numCellsX,
            heightSegments: numCellsY,
            uniforms: {
                uGridSize: {
                    name: "uGridSize",
                    type: "1f",
                    value: this.GRID_SIZE
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
                minFilter: this.curtains.gl.LINEAR_MIPMAP_NEAREST
            }
        });

        if (plane) {
            this.setupPlane(plane, image);
            this.planes.push(plane);
        } else {
            console.error('Could not create plane');
            image.style.opacity = 1;
        }

        return plane;
    }

    setupPlane(plane, image) {
        image.plane = plane;
        plane.userData = { animated: false };
        image.style.opacity = 1;

        plane.onReady(() => {
            if (!this.isDevMode) {
                this.observer.observe(image);
            }
            
            this.setupEventListeners(plane, image);
        }).onError(() => {
            console.error('Error loading plane');
            image.style.opacity = 1;
        });
    }

    setupEventListeners(plane, image) {
        window.addEventListener("scroll", () => {
            plane.updateScrollPosition();
        });

        window.addEventListener("resize", () => {
            const newBounds = image.getBoundingClientRect();
            
            plane.uniforms.uImageSize.value = [newBounds.width, newBounds.height];
            
            const newNumCellsX = Math.floor(newBounds.width / this.GRID_SIZE);
            const newNumCellsY = Math.floor(newBounds.height / this.GRID_SIZE);
            
            plane.resize({
                widthSegments: newNumCellsX,
                heightSegments: newNumCellsY
            });
        });
    }

    updateAllPlanesProgress(progress) {
        this.planes.forEach(plane => {
            plane.uniforms.uAnimationProgress.value = progress;
        });
    }
}
