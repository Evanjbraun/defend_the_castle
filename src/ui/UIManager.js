export class UIManager {
    constructor() {
        this.uiContainer = null;
        this.healthBar = null;
        this.waveInfo = null;
        this.scoreDisplay = null;
        this.isInitialized = false;
    }

    init() {
        // Get UI container
        this.uiContainer = document.getElementById('ui-overlay');

        // Create health bar
        this.createHealthBar();

        // Create wave info display
        this.createWaveInfo();

        // Create score display
        this.createScoreDisplay();

        this.isInitialized = true;
    }

    createHealthBar() {
        const healthBarContainer = document.createElement('div');
        healthBarContainer.style.position = 'absolute';
        healthBarContainer.style.top = '20px';
        healthBarContainer.style.left = '20px';
        healthBarContainer.style.width = '200px';
        healthBarContainer.style.height = '20px';
        healthBarContainer.style.backgroundColor = '#333';
        healthBarContainer.style.border = '2px solid #666';

        this.healthBar = document.createElement('div');
        this.healthBar.style.width = '100%';
        this.healthBar.style.height = '100%';
        this.healthBar.style.backgroundColor = '#4CAF50';
        this.healthBar.style.transition = 'width 0.3s ease-in-out';

        healthBarContainer.appendChild(this.healthBar);
        this.uiContainer.appendChild(healthBarContainer);
    }

    createWaveInfo() {
        this.waveInfo = document.createElement('div');
        this.waveInfo.style.position = 'absolute';
        this.waveInfo.style.top = '20px';
        this.waveInfo.style.right = '20px';
        this.waveInfo.style.color = '#fff';
        this.waveInfo.style.fontSize = '24px';
        this.waveInfo.style.fontFamily = 'Arial, sans-serif';
        this.waveInfo.style.textShadow = '2px 2px 4px rgba(0,0,0,0.5)';
        this.waveInfo.textContent = 'Wave: 1';
        this.uiContainer.appendChild(this.waveInfo);
    }

    createScoreDisplay() {
        this.scoreDisplay = document.createElement('div');
        this.scoreDisplay.style.position = 'absolute';
        this.scoreDisplay.style.bottom = '20px';
        this.scoreDisplay.style.right = '20px';
        this.scoreDisplay.style.color = '#fff';
        this.scoreDisplay.style.fontSize = '24px';
        this.scoreDisplay.style.fontFamily = 'Arial, sans-serif';
        this.scoreDisplay.style.textShadow = '2px 2px 4px rgba(0,0,0,0.5)';
        this.scoreDisplay.textContent = 'Score: 0';
        this.uiContainer.appendChild(this.scoreDisplay);
    }

    update() {
        if (!this.isInitialized) return;

        // Update UI elements based on game state
        // This will be implemented when we have game state management
    }

    updateHealth(percentage) {
        if (this.healthBar) {
            this.healthBar.style.width = `${percentage}%`;
        }
    }

    updateWave(waveNumber) {
        if (this.waveInfo) {
            this.waveInfo.textContent = `Wave: ${waveNumber}`;
        }
    }

    updateScore(score) {
        if (this.scoreDisplay) {
            this.scoreDisplay.textContent = `Score: ${score}`;
        }
    }
} 