export class WaveInfo {
    constructor(waveManager) {
        this.waveManager = waveManager;
        this.element = null;
        this.createUI();
    }

    createUI() {
        // Create container
        this.element = document.createElement('div');
        this.element.style.position = 'fixed';
        this.element.style.top = '20px';
        this.element.style.left = '20px';
        this.element.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        this.element.style.padding = '10px';
        this.element.style.borderRadius = '5px';
        this.element.style.color = 'white';
        this.element.style.fontFamily = 'Arial, sans-serif';
        this.element.style.marginTop = '120px'; // Position below castle health bar

        // Create wave info container
        const waveInfoContainer = document.createElement('div');
        waveInfoContainer.style.marginBottom = '10px';

        // Create wave number text
        this.waveNumberText = document.createElement('div');
        this.waveNumberText.style.fontSize = '16px';
        this.waveNumberText.style.marginBottom = '5px';
        waveInfoContainer.appendChild(this.waveNumberText);

        // Create goblin count text
        this.goblinCountText = document.createElement('div');
        this.goblinCountText.style.fontSize = '14px';
        waveInfoContainer.appendChild(this.goblinCountText);

        this.element.appendChild(waveInfoContainer);

        // Add to document
        document.body.appendChild(this.element);

        // Initial update
        this.update();
    }

    update() {
        const currentWave = this.waveManager.currentWave;
        const maxWaves = this.waveManager.maxWaves;
        const remainingGoblins = this.waveManager.activeGoblins.length;
        
        // Get the current wave configuration
        const waveConfig = this.waveManager.waveConfigs[currentWave];
        const totalGoblinsInWave = waveConfig ? waveConfig.count : 0;

        // Update wave number text - Fix to show correct wave number
        this.waveNumberText.textContent = `Wave ${currentWave} of ${maxWaves}`;

        // Update goblin count text - Remove the "/ 5" format
        if (this.waveManager.isWaveInProgress) {
            this.goblinCountText.textContent = `Goblins Remaining: ${remainingGoblins}`;
        } else {
            this.goblinCountText.textContent = `Wave Complete!`;
        }
    }

    remove() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
} 