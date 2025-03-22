export class WaveManager {
    constructor() {
        this.currentWave = 0;
        this.enemiesInWave = 0;
        this.enemiesRemaining = 0;
        this.waveInProgress = false;
        this.spawnTimer = 0;
        this.spawnInterval = 2000; // 2 seconds between spawns
        this.enemies = [];
        this.isInitialized = false;
    }

    init() {
        this.currentWave = 1;
        this.enemiesInWave = 5;
        this.enemiesRemaining = this.enemiesInWave;
        this.waveInProgress = false;
        this.spawnTimer = 0;
        this.isInitialized = true;
    }

    update() {
        if (!this.isInitialized) return;

        if (!this.waveInProgress) {
            this.startWave();
        }

        if (this.waveInProgress) {
            this.updateWave();
        }
    }

    startWave() {
        this.waveInProgress = true;
        this.spawnTimer = 0;
        this.enemiesRemaining = this.enemiesInWave;
        console.log(`Starting wave ${this.currentWave} with ${this.enemiesInWave} enemies`);
    }

    updateWave() {
        const currentTime = Date.now();

        // Spawn enemies at intervals
        if (this.spawnTimer <= currentTime && this.enemiesRemaining > 0) {
            this.spawnEnemy();
            this.spawnTimer = currentTime + this.spawnInterval;
            this.enemiesRemaining--;
        }

        // Check if wave is complete
        if (this.enemiesRemaining === 0 && this.enemies.length === 0) {
            this.completeWave();
        }
    }

    spawnEnemy() {
        // This will be implemented when we have enemy models and spawning logic
        console.log('Spawning enemy...');
    }

    completeWave() {
        this.waveInProgress = false;
        this.currentWave++;
        this.enemiesInWave = Math.floor(this.enemiesInWave * 1.5); // Increase enemies by 50% each wave
        console.log(`Wave ${this.currentWave - 1} completed!`);
    }

    getCurrentWave() {
        return this.currentWave;
    }

    getEnemiesRemaining() {
        return this.enemiesRemaining;
    }

    isWaveInProgress() {
        return this.waveInProgress;
    }
} 