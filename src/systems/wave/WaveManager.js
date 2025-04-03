import * as THREE from 'three';
import { Goblin } from '../../npc/humanoid/Goblin';
import { WaveAnnouncement } from '../../ui/WaveAnnouncement';
import { AudioSystem } from '../audio/AudioSystem';

export class WaveManager {
    constructor(scene, castle) {
        this.scene = scene;
        this.castle = castle;
        this.currentWave = 0;
        this.maxWaves = 10;
        this.activeGoblins = [];
        this.isWaveInProgress = false;
        this.spawnRadius = 80;
        this.spawnPoints = this.generateSpawnPoints();
        this.waveAnnouncement = new WaveAnnouncement();
        this.audioSystem = new AudioSystem();
        
        // Load goblin scream sound
        this.audioSystem.loadSound('goblinScream', '/music/scream.mp3');
        console.log('Loaded goblin scream sound');
        
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
        const numPoints = 12;
        for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * Math.PI * 2;
            const x = Math.cos(angle) * this.spawnRadius;
            const z = Math.sin(angle) * this.spawnRadius;
            points.push(new THREE.Vector3(x, 0, z));
        }
        return points;
    }

    async startWave() {
        if (this.currentWave >= this.maxWaves || this.isWaveInProgress) {
            console.log('Wave not started - maxWaves reached or wave in progress', {
                currentWave: this.currentWave,
                maxWaves: this.maxWaves,
                isWaveInProgress: this.isWaveInProgress
            });
            return;
        }

        this.isWaveInProgress = true;
        this.currentWave++;
        const config = this.waveConfigs[this.currentWave - 1];
        console.log('Starting wave', {
            waveNumber: this.currentWave,
            goblinCount: config.count,
            goblinHealth: config.goblinHealth,
            goblinDamage: config.goblinDamage
        });

        this.waveAnnouncement.showWave(this.currentWave);

        for (let i = 0; i < config.count; i++) {
            const spawnPoint = this.spawnPoints[Math.floor(Math.random() * this.spawnPoints.length)];
            console.log('Spawning goblin', {
                spawnPoint: spawnPoint,
                goblinNumber: i + 1,
                totalGoblins: config.count
            });
            
            const goblin = new Goblin({
                position: spawnPoint,
                health: config.goblinHealth,
                maxHealth: config.goblinHealth,
                attackPower: config.goblinDamage,
                moveSpeed: 3.0,
                attackRange: 4.0,
                attackCooldown: 3.0,
                lastAttackTime: 0,
                currentState: 'walk',
                stats: {
                    strength: 12 + this.currentWave,
                    dexterity: 14 + this.currentWave,
                    vitality: 10 + this.currentWave,
                    intelligence: 8 + this.currentWave
                }
            });

            const mesh = await goblin.init(this.scene);
            if (!mesh) {
                console.error('Failed to initialize goblin mesh');
                continue;
            }
            console.log('Goblin initialized successfully');
            
            goblin.waveManager = this;
            goblin.playAnimation('walk', 0.2, 0.2);
            
            // Add scream timing properties with unique initial delay
            goblin.lastScreamTime = performance.now() / 1000;
            // Stagger initial screams by adding an offset based on goblin number
            const initialOffset = (i / config.count) * 10; // Spread first screams over 10 seconds
            goblin.nextScreamDelay = this.getRandomScreamDelay() + initialOffset;
            console.log('Goblin initialized with scream timing:', {
                goblinId: goblin.id,
                initialDelay: goblin.nextScreamDelay.toFixed(2),
                offset: initialOffset.toFixed(2)
            });
            
            this.activeGoblins.push(goblin);
            console.log('Active goblins count:', this.activeGoblins.length);
        }
    }

    getRandomScreamDelay() {
        return Math.random() * (22 - 10) + 10; // Random delay between 10-22 seconds
    }

    handleGoblinDeath(goblin) {
        const index = this.activeGoblins.indexOf(goblin);
        if (index > -1) {
            this.activeGoblins.splice(index, 1);
        }

        if (this.activeGoblins.length === 0) {
            this.isWaveInProgress = false;
            if (this.currentWave < this.maxWaves) {
                setTimeout(() => this.startWave(), 5000);
            }
        }
    }

    update(deltaTime) {
        if (!this.isWaveInProgress) return;

        if (this.castle.getHealth() <= 0) {
            this.handleGameOver();
            return;
        }

        this.activeGoblins.forEach(goblin => {
            if (!goblin.isDead) {
                if (goblin.mixer) {
                    goblin.mixer.update(deltaTime);
                }
                this.updateGoblinBehavior(goblin, deltaTime);
            }
        });
    }

    getNearestWallPosition(goblinPosition) {
        // Get castle size from the castle walls
        const castleWalls = this.castle.castleWalls;
        if (!castleWalls) return new THREE.Vector3(0, 0, 0);
        
        const castleSize = castleWalls.castleSize || 20;
        const halfSize = castleSize / 2;
        
        // Get direction from castle center to goblin
        const direction = new THREE.Vector3();
        direction.subVectors(goblinPosition, new THREE.Vector3(0, 0, 0)).normalize();
        
        // Calculate the nearest point on the castle walls
        const nearestPoint = new THREE.Vector3(
            direction.x * halfSize,
            0,
            direction.z * halfSize
        );
        
        return nearestPoint;
    }

    updateGoblinBehavior(goblin, deltaTime) {
        // Get the nearest wall position
        const nearestWallPosition = this.getNearestWallPosition(goblin.mesh.position);
        const distanceToWall = goblin.mesh.position.distanceTo(nearestWallPosition);

        // If goblin is in attack range of wall
        if (distanceToWall <= goblin.attackRange) {
            // Check attack cooldown
            const currentTime = performance.now() / 1000;
            const timeSinceLastAttack = currentTime - goblin.lastAttackTime;
            
            // Make goblin face the wall
            goblin.mesh.lookAt(nearestWallPosition);

            if (timeSinceLastAttack >= goblin.attackCooldown) {
                // Start attack sequence
                if (goblin.currentState !== 'attack') {
                    // Deal damage immediately
                    this.castle.takeDamage(goblin.attackPower);
                    
                    // Play attack animation
                    goblin.currentState = 'attack';
                    goblin.playAnimation('attack', 0.2, 0.2);
                    
                    // Return to idle after attack animation
                    setTimeout(() => {
                        if (!goblin.isDead && goblin.currentState === 'attack') {
                            goblin.currentState = 'idle';
                            goblin.playAnimation('idle', 0.2, 0.2);
                        }
                    }, 1000); // Full attack animation duration
                    
                    // Update last attack time
                    goblin.lastAttackTime = currentTime;
                }
            } else {
                // If on cooldown and not attacking, play idle animation
                if (goblin.currentState !== 'idle' && goblin.currentState !== 'attack') {
                    goblin.currentState = 'idle';
                    goblin.playAnimation('idle', 0.2, 0.2);
                }
            }
        } else {
            // Move towards nearest wall
            const direction = nearestWallPosition.clone().sub(goblin.mesh.position).normalize();
            const moveAmount = goblin.moveSpeed * deltaTime;
            goblin.mesh.position.add(direction.multiplyScalar(moveAmount));
            
            // Make goblin face the direction it's moving
            goblin.mesh.lookAt(nearestWallPosition);
            
            // Update state and play walking animation if not already walking
            if (goblin.currentState !== 'walk') {
                goblin.currentState = 'walk';
                goblin.playAnimation('walk', 0.2, 0.2);
            }

            // Handle screaming while walking
            const currentTime = performance.now() / 1000;
            const timeSinceLastScream = currentTime - goblin.lastScreamTime;

            if (timeSinceLastScream >= goblin.nextScreamDelay) {
                // Get player position from game instance
                const player = window.game?.player;
                if (player && player.mesh) {
                    const distanceToPlayer = goblin.mesh.position.distanceTo(player.mesh.position);
                    
                    console.log('Goblin considering scream:', {
                        goblinId: goblin.id,
                        distanceToPlayer: distanceToPlayer.toFixed(2),
                        timeSinceLastScream: timeSinceLastScream.toFixed(2),
                        nextScreamDelay: goblin.nextScreamDelay.toFixed(2)
                    });
                    
                    // Only play scream if within audible range (120 units)
                    if (distanceToPlayer <= 120) {
                        // Calculate volume based on distance (1.0 at 0 distance, 0.05 at 115-120 distance)
                        const volume = Math.max(0.05, 1 - (distanceToPlayer / 120));
                        console.log('Goblin screaming:', {
                            goblinId: goblin.id,
                            volume: volume.toFixed(2),
                            distanceToPlayer: distanceToPlayer.toFixed(2)
                        });
                        this.audioSystem.playSound('goblinScream', volume);
                    } else {
                        console.log('Goblin too far to be heard:', {
                            goblinId: goblin.id,
                            distanceToPlayer: distanceToPlayer.toFixed(2)
                        });
                    }
                }
                
                // Set up next scream with randomization specific to this goblin
                goblin.lastScreamTime = currentTime;
                goblin.nextScreamDelay = this.getRandomScreamDelay();
                console.log('Next scream scheduled:', {
                    goblinId: goblin.id,
                    nextDelay: goblin.nextScreamDelay.toFixed(2),
                    nextScreamIn: goblin.nextScreamDelay.toFixed(2) + ' seconds'
                });
            }
        }
    }

    handleGameOver() {
        this.isWaveInProgress = false;
        this.waveAnnouncement.showGameOver();
        setTimeout(() => {
            window.location.reload();
        }, 3000);
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