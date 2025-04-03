import { ItemSchema } from '../ItemSchema';
import { SwordAnimation } from './weaponAnimations/SwordAnimation';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { AudioLoader } from 'three';

export class WoodenSword extends ItemSchema {
    constructor() {
        super({
            // Basic properties
            id: 'weapon_wooden_sword',
            name: 'Wooden Sword',
            description: 'A basic training sword made of wood. Not very effective, but better than nothing!',
            type: 'WEAPON',
            rarity: 'COMMON',
            level: 1,
            value: 5, // 5 gold

            // Visual properties
            model: null, // Will be set in createModel()
            icon: null, // Will need a UI icon
            texture: null,

            // Inventory properties
            stackable: false,
            maxStack: 1,
            weight: 2.0, // 2 kg

            // Equipment properties
            isEquippable: true, // Set this to true
            equipSlot: 'MAINHAND',

            // Stats
            stats: {
                // Offensive stats
                attackPower: 9,
                attackSpeed: 1.2, // Slightly faster than average
                criticalChance: 0.02, // 2% crit chance
                criticalDamage: 1.5, // 150% crit damage

                // Attribute bonuses
                strength: 1,
                dexterity: 1
            },

            // Combat mechanics
            attackType: 'SLASH',
            damageType: 'PHYSICAL',
            range: 3.5, // 1.5 units reach
            areaOfEffect: 0,

            // Requirements
            requirements: {
                level: 1,
                strength: 2 // Requires 2 strength to wield
            }
        });

        // Additional wooden sword specific properties
        this.woodenType = 'Oak';
        this.trainingWeapon = true;
        
        // Initialize animation system
        this.attackAnimation = new SwordAnimation();
        this.equippedModel = null;
        
        // Initialize model as a Promise
        this.model = this.createModel();

        // Initialize audio
        this.audioLoader = new AudioLoader();
        this.slashSound = null;
        this.loadSlashSound();
    }

    // Special method for training weapons
    getTrainingBonus(playerLevel) {
        if (playerLevel <= 5) {
            return {
                experienceBonus: 0.1 // 10% bonus XP for low-level training
            };
        }
        return null;
    }

    // Initialize the weapon with its 3D model
    initModel(model) {
        this.model = model;
    }

    // Load the slash sound
    loadSlashSound() {
        this.audioLoader.load('/music/slash.mp3', (buffer) => {
            this.slashSound = new THREE.Audio(new THREE.AudioListener());
            this.slashSound.setBuffer(buffer);
            this.slashSound.setVolume(0.5);
            this.slashSound.setLoop(false);
            
            // Add error handling
            this.slashSound.onError = (error) => {
                console.error('Error playing slash sound:', error);
            };
        });
    }

    // Override onAttack to handle combat
    onAttack() {
        if (!this.equippedModel) {
            return;
        }
        this.playAnimation();
    }

    checkForEnemiesInRange() {
        const enemies = this.getEnemiesInScene();

        // Get the player (owner) of the sword
        const player = this.getOwner();
        if (!player || !player.camera) {
            return;
        }

        // Get current camera world position
        const cameraPosition = new THREE.Vector3();
        player.camera.getWorldPosition(cameraPosition);

        enemies.forEach(enemy => {
            if (!enemy.mesh) {
                return;
            }

            const enemyPosition = enemy.mesh.position.clone();
            const distance = this.getDistanceToEnemy(enemy);
            
            if (distance <= this.range) {
                const damage = this.calculateDamage();
                enemy.takeDamage(damage);
            }
        });
    }

    getEnemiesInScene() {
        // Get the player (owner) of the sword
        const player = this.getOwner();
        if (!player) {
            return [];
        }

        // Get the game instance from the player
        const game = player.game;
        if (!game || !game.waveManager) {
            return [];
        }
        
        // Return all active goblins that aren't dead
        return game.waveManager.activeGoblins.filter(goblin => !goblin.isDead);
    }

    getDistanceToEnemy(enemy) {
        if (!enemy || !enemy.mesh) {
            return Infinity;
        }
        
        // Get the player (owner) of the sword
        const player = this.getOwner();
        if (!player || !player.camera) {
            return Infinity;
        }
        
        // Get current positions
        const cameraPosition = new THREE.Vector3();
        player.camera.getWorldPosition(cameraPosition);
        const enemyPosition = enemy.mesh.position.clone();
        
        // Calculate distance using the current positions
        return cameraPosition.distanceTo(enemyPosition);
    }

    calculateDamage() {
        // Base damage from weapon
        let damage = this.stats.attackPower;

        // Add critical hit chance
        if (Math.random() < this.stats.criticalChance) {
            damage *= this.stats.criticalDamage;
        }

        // Add some randomness (±10%)
        const randomFactor = 0.9 + (Math.random() * 0.2);
        damage *= randomFactor;

        // Round to nearest integer
        return Math.round(damage);
    }

    // Update animation
    update(deltaTime) {
        if (this.attackAnimation) {
            this.attackAnimation.update(deltaTime);
        }
    }

    // Create the 3D model of the wooden sword
    createModel() {
        // Create a group to hold the sword model
        const swordGroup = new THREE.Group();

        const loader = new GLTFLoader();

        // Return a promise that resolves with the sword group
        return new Promise((resolve, reject) => {
            loader.load(
                '/models/weapons/ironSword.glb',
                (gltf) => {
                    // Get the sword model from the loaded GLB
                    const swordModel = gltf.scene;
                    
                    // Scale the model if needed
                    swordModel.scale.set(0.5, 0.5, 0.5);
                    
                    // Rotate the model to the correct orientation
                    swordModel.rotation.z = Math.PI / 2;
                    
                    // Add the model to the group
                    swordGroup.add(swordModel);
                    
                    resolve(swordGroup);
                },
                // Progress callback
                (progress) => {
                },
                // Error callback
                (error) => {
                    // Create a fallback basic sword model if loading fails
                    this.createFallbackModel(swordGroup);
                    resolve(swordGroup); // Resolve with fallback model instead of rejecting
                }
            );
        });
    }

    // Fallback model in case GLB loading fails
    createFallbackModel(swordGroup) {
        // Create a basic sword geometry as fallback
        const bladeGeometry = new THREE.BoxGeometry(0.15, 2.5, 0.4);
        const handleGeometry = new THREE.BoxGeometry(0.1, 0.8, 0.1);
        const guardGeometry = new THREE.BoxGeometry(0.5, 0.15, 0.25);

        const bladeMaterial = new THREE.MeshStandardMaterial({
            color: 0xcd7f32,
            metalness: 0.7,
            roughness: 0.3
        });

        const handleMaterial = new THREE.MeshStandardMaterial({
            color: 0xffd700,
            metalness: 0.8,
            roughness: 0.2
        });

        const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
        const handle = new THREE.Mesh(handleGeometry, handleMaterial);
        const guard = new THREE.Mesh(guardGeometry, handleMaterial);

        blade.position.y = handleGeometry.parameters.height / 2 + bladeGeometry.parameters.height / 2;
        guard.position.y = handleGeometry.parameters.height;

        swordGroup.add(blade);
        swordGroup.add(handle);
        swordGroup.add(guard);
    }

    // Load the GLB model
    loadGLBModel() {
        this.createModel().then(model => {
            if (model instanceof THREE.Group) {
                this.model = model;
                this.dispatchEvent({ type: 'modelReady', model: this.model });
            } else {
                // Create fallback model only if GLB loading failed
                const tempGroup = new THREE.Group();
                this.createFallbackModel(tempGroup);
                this.model = tempGroup;
            }
        }).catch(error => {
            // Create fallback model only if GLB loading failed
            const tempGroup = new THREE.Group();
            this.createFallbackModel(tempGroup);
            this.model = tempGroup;
        });
    }

    // Override the onEquip method to position the sword correctly
    onEquip() {
        if (this.model instanceof Promise) {
            this.model.then(model => {
                if (model instanceof THREE.Group) {
                    this.model = model;
                    this.attackAnimation.init(this.model);
                    this.attackAnimation.setOnSwingCallback(() => this.checkForEnemiesInRange());
                    this.equipToCamera(model);
                }
            });
        } else if (this.model instanceof THREE.Group) {
            this.attackAnimation.setOnSwingCallback(() => this.checkForEnemiesInRange());
            this.equipToCamera(this.model);
        }
    }

    // New method to equip the sword to the camera
    equipToCamera(model) {
        // Create a clone of the model for the equipped instance
        this.equippedModel = model.clone();
        
        // Position the sword in front of the camera
        this.equippedModel.position.set(0.2, -.5, -0.4);
        this.equippedModel.rotation.set(.5, 1.4, -1.7, 'YXZ');
        this.equippedModel.scale.set(1.9, 1.9, 1.9);

        // Make sure the sword casts and receives shadows
        this.equippedModel.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        // Initialize the animation system with the equipped model
        if (this.attackAnimation) {
            this.attackAnimation.init(this.equippedModel);
        }

        // Find the player's camera and add the sword to it
        const player = this.getOwner();
        if (player && player.camera) {
            player.camera.add(this.equippedModel);
        }
    }

    // Override onUnequip to clean up
    onUnequip() {
        if (this.equippedModel) {
            this.equippedModel.parent.remove(this.equippedModel);
            this.equippedModel = null;
        }
    }

    /**
     * Start the swing animation
     */
    startSwing() {
        if (this.equippedModel && this.attackAnimation) {
            this.attackAnimation.startAnimation();
            this.checkForEnemiesInRange();
            
            // Play slash sound if loaded
            if (this.slashSound) {
                this.slashSound.play();
            }
        }
    }
} 