import { PlaneManager } from './plane.js';
import { DevControls } from './dev-controls.js';

window.addEventListener('load', () => {
    // Create canvas container
    const container = document.createElement('div');
    container.id = 'curtains-canvas';
    document.body.appendChild(container);

    // Initialize curtains
    const curtains = new Curtains({
        container: container,
        pixelRatio: Math.min(1.5, window.devicePixelRatio),
        autoRender: true
    });

    // Handle WebGL context errors
    curtains.onError(() => {
        console.error('Error initializing WebGL');
        document.body.classList.add('no-curtains');
        document.querySelectorAll('.entry-effect').forEach(img => {
            img.style.opacity = 1;
        });
    });

    // Initialize plane manager with dev mode status
    const isDevMode = new URLSearchParams(window.location.search).has('dev');
    const planeManager = new PlaneManager(curtains, isDevMode);

    // Initialize dev controls
    new DevControls(planeManager);

    // Create planes after curtains is ready
    curtains.onSuccess(() => {
        document.querySelectorAll('.entry-effect').forEach(image => {
            planeManager.createPlane(image);
        });
    });
});
