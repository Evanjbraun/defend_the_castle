import * as THREE from 'three';
import { Goblin } from '../../npc/humanoid/Goblin';
import { WaveAnnouncement } from '../../ui/WaveAnnouncement';

export class WaveManager {
    constructor(scene, castle) {
        this.scene = scene;
        this.castle = castle;
        this.currentWave = 0;
        this.maxWaves = 10;
        this.activeGoblins = [];
        this.isWaveInProgress = false;
        this.spawnRadius = 80; // Increased from 50 to 80 units
        this.spawnPoints = this.generateSpawnPoints();
        this.waveAnnouncement = new WaveAnnouncement();
        
        // Wave configuration
        this.waveConfigs = [
            { count: 3, goblinHealth: 40, goblinDamage: 5 },
            { count: 5, goblinHealth: 45, goblinDamage: 6 },
            { count: 7, goblinHealth: 50, goblinDamage: 7 },
            { count: 10, goblinHealth: 55, goblinDamage: 8 },
            { count: 12, goblinHealth: 60, goblinDamage: 9 },
            { count: 15, goblinHealth: 65, goblinDamage: 10 },
            { count: 18, goblinHealth: 70, goblinDamage: 11 },
            { count: 20, goblinHealth: 75, goblinDamage: 12 },
            { count: 25, goblinHealth: 80, goblinDamage: 13 },
            { count: 30, goblinHealth: 85, goblinDamage: 14 }
        ];
    }

    generateSpawnPoints() {
        const points = [];
        const numPoints = 12; // Number of spawn points around the circle
        for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * Math.PI * 2;
            const x = Math.cos(angle) * this.spawnRadius;
            const z = Math.sin(angle) * this.spawnRadius;
            points.push(new THREE.Vector3(x, 0, z));
        }
        return points;
    }

    async startWave() {
        if (this.currentWave >= this.maxWaves || this.isWaveInProgress) return;

        console.log(`Starting wave ${this.currentWave + 1}`);
        this.isWaveInProgress = true;
        this.currentWave++;
        const config = this.waveConfigs[this.currentWave - 1];

        // Show wave announcement
        this.waveAnnouncement.showWave(this.currentWave);

        console.log(`Wave ${this.currentWave} config:`, config);

        // Spawn goblins
        for (let i = 0; i < config.count; i++) {
            const spawnPoint = this.spawnPoints[Math.floor(Math.random() * this.spawnPoints.length)];
            console.log(`Spawning goblin ${i + 1}/${config.count} at position:`, spawnPoint);
            
            const goblin = new Goblin({
                position: spawnPoint,
                health: config.goblinHealth,
                maxHealth: config.goblinHealth,
                attackPower: config.goblinDamage,
                moveSpeed: 3.0,
                attackRange: 2.0,
                stats: {
                    strength: 12 + this.currentWave,
                    dexterity: 14 + this.currentWave,
                    vitality: 10 + this.currentWave,
                    intelligence: 8 + this.currentWave
                }
            });

            // Initialize goblin
            const mesh = await goblin.init(this.scene);
            if (!mesh) {
                console.error(`Failed to initialize goblin ${i + 1}`);
                continue;
            }
            
            console.log(`Successfully initialized goblin ${i + 1}`);
            
            // Store reference to wave manager in goblin for death handling
            goblin.waveManager = this;
            
            // Start with walking animation using the state name
            goblin.playAnimation('walk', 0.2, 0.2);
            
            this.activeGoblins.push(goblin);
        }

        console.log(`Wave ${this.currentWave} started with ${this.activeGoblins.length} goblins`);
    }

    handleGoblinDeath(goblin) {
        console.log('Goblin died, remaining goblins:', this.activeGoblins.length - 1);
        const index = this.activeGoblins.indexOf(goblin);
        if (index > -1) {
            this.activeGoblins.splice(index, 1);
        }

        // Check if wave is complete
        if (this.activeGoblins.length === 0) {
            console.log(`Wave ${this.currentWave} completed`);
            this.isWaveInProgress = false;
            if (this.currentWave < this.maxWaves) {
                console.log('Starting next wave in 5 seconds...');
                setTimeout(() => this.startWave(), 5000);
            } else {
                console.log('All waves completed!');
            }
        }
    }

    update(deltaTime) {
        if (!this.isWaveInProgress) return;

        // Check if castle is destroyed
        if (this.castle.getHealth() <= 0) {
            console.log('Castle destroyed! Game Over');
            this.handleGameOver();
            return;
        }

        // Update all active goblins
        this.activeGoblins.forEach(goblin => {
            if (!goblin.isDead) {
                // Update goblin animations
                if (goblin.mixer) {
                    goblin.mixer.update(deltaTime);
                }
                
                // Update goblin position and behavior
                this.updateGoblinBehavior(goblin, deltaTime);
            }
        });
    }

    updateGoblinBehavior(goblin, deltaTime) {
        const castlePosition = this.castle.getPosition();
        const distanceToCastle = goblin.mesh.position.distanceTo(castlePosition);

        // If goblin is in attack range of castle
        if (distanceToCastle <= goblin.attackRange) {
            // Attack castle
            this.castle.takeDamage(goblin.attackPower * deltaTime);
            
            // Play attack animation using the state name
            goblin.playAnimation('attack', 0.2, 0.2);
            
            // Make goblin face the castle while attacking
            const direction = castlePosition.clone().sub(goblin.mesh.position).normalize();
            goblin.mesh.lookAt(castlePosition);
        } else {
            // Move towards castle
            const direction = castlePosition.clone().sub(goblin.mesh.position).normalize();
            goblin.mesh.position.add(direction.multiplyScalar(goblin.moveSpeed * deltaTime));
            
            // Make goblin face the direction it's moving
            goblin.mesh.lookAt(castlePosition);
            
            // Play walking animation using the state name
            goblin.playAnimation('walk', 0.2, 0.2);
        }
    }

    handleGameOver() {
        // Stop the wave
        this.isWaveInProgress = false;
        
        // Show game over message
        this.waveAnnouncement.showGameOver();
        
        // Fade to black and reset after delay
        setTimeout(() => {
            // Reset the game
            window.location.reload();
        }, 3000); // 3 seconds before reset
    }

    getCurrentWave() {
        return this.currentWave;
    }

    getMaxWaves() {
        return this.maxWaves;
    }

    isGameComplete() {
        return this.currentWave >= this.maxWaves && this.activeGoblins.length === 0;
    }
} 