import * as THREE from 'three';

export class WaveAnnouncement {
    constructor() {
        this.element = document.createElement('div');
        this.element.style.position = 'absolute';
        this.element.style.top = '50%';
        this.element.style.left = '50%';
        this.element.style.transform = 'translate(-50%, -50%)';
        this.element.style.fontSize = '48px';
        this.element.style.fontWeight = 'bold';
        this.element.style.color = '#ffffff';
        this.element.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.5)';
        this.element.style.opacity = '0';
        this.element.style.transition = 'opacity 1s ease-in-out';
        this.element.style.pointerEvents = 'none';
        this.element.style.zIndex = '1000';
        document.body.appendChild(this.element);
    }

    showWave(waveNumber) {
        this.element.textContent = `Wave ${waveNumber}`;
        this.element.style.opacity = '1';
        
        // Fade out after 3 seconds
        setTimeout(() => {
            this.element.style.opacity = '0';
        }, 3000);
    }

    showGameOver() {
        // Create a black overlay
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'black';
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 1s ease-in-out';
        overlay.style.zIndex = '999';
        document.body.appendChild(overlay);

        // Show "Failed" message
        this.element.textContent = 'Failed';
        this.element.style.opacity = '1';
        
        // Fade in the black overlay
        setTimeout(() => {
            overlay.style.opacity = '1';
        }, 100);
    }
} 