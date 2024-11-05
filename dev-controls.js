export class DevControls {
    constructor(planeManager) {
        this.planeManager = planeManager;
        this.isDevMode = new URLSearchParams(window.location.search).has('dev');
        
        if (this.isDevMode) {
            this.initializeControls();
        }
    }

    initializeControls() {
        const devControls = document.getElementById('dev-controls');
        const timelineSlider = document.getElementById('timeline-slider');
        const progressValue = document.getElementById('progress-value');

        if (devControls) {
            devControls.style.display = 'flex';
        }

        if (timelineSlider) {
            timelineSlider.addEventListener('input', (e) => {
                const progress = parseFloat(e.target.value) / 100;
                progressValue.textContent = `${Math.round(progress * 100)}%`;
                this.planeManager.updateAllPlanesProgress(progress);
            });
        }
    }
}
