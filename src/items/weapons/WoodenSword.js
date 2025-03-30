import { ItemSchema } from '../ItemSchema';
import { SwordAnimation } from './weaponAnimations/SwordAnimation';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

export class WoodenSword extends ItemSchema {
    constructor() {
        console.log('=== WoodenSword: Starting Constructor ===');
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
                attackPower: 3,
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
            range: 1.5, // 1.5 units reach
            areaOfEffect: 0,

            // Requirements
            requirements: {
                level: 1,
                strength: 2 // Requires 2 strength to wield
            }
        });

        // Additional wooden sword specific properties
        this.woodType = 'Oak';
        this.trainingWeapon = true;
        this.attackAnimation = new SwordAnimation();
        this.equippedModel = null;
        
        console.log('WoodenSword: Creating temporary model');
        // Create a temporary model immediately
        const tempGroup = new THREE.Group();
        this.createFallbackModel(tempGroup);
        this.model = tempGroup;
        
        console.log('WoodenSword: Loading GLB model');
        // Then try to load the GLB model
        this.loadGLBModel();
        console.log('=== WoodenSword: Constructor Complete ===');

        // Animation properties
        this.swingAnimation = {
            duration: 0.3,
            progress: 0,
            isSwinging: false,
            startRotation: new THREE.Euler(0, 0, 0),
            endRotation: new THREE.Euler(-Math.PI / 4, 0, 0), // 45-degree swing
            currentRotation: new THREE.Euler(0, 0, 0)
        };
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
        this.attackAnimation.init(this.model);
    }

    // Handle attack input
    onAttack() {
        if (!this.attackAnimation.isPlaying()) {
            this.attackAnimation.startAnimation();
        }
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
                    
                    // Initialize the attack animation with the loaded model
                    this.attackAnimation.init(swordGroup);
                    resolve(swordGroup);
                },
                // Progress callback
                (progress) => {
                    const percent = (progress.loaded / progress.total * 100);
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

        // Initialize the attack animation with the fallback model
        this.attackAnimation.init(swordGroup);
    }

    // Load the GLB model
    loadGLBModel() {
        this.createModel().then(model => {
            if (model instanceof THREE.Group) {
                this.model = model;
                this.attackAnimation.init(this.model);
                this.dispatchEvent({ type: 'modelReady', model: this.model });
            }
        }).catch(error => {
            // Keep fallback model
        });
    }

    // Override the onEquip method to position the sword correctly
    onEquip() {
        console.log('WoodenSword: onEquip called');
        if (this.model instanceof Promise) {
            console.log('WoodenSword: Model is a Promise, waiting for resolution');
            this.model.then(model => {
                if (model instanceof THREE.Group) {
                    console.log('WoodenSword: Promise resolved with valid model');
                    this.model = model;
                    this.attackAnimation.init(this.model);
                    this.equipToCamera(model);
                } else {
                    console.error('WoodenSword: Promise resolved with invalid model type:', model);
                }
            });
        } else if (this.model instanceof THREE.Group) {
            console.log('WoodenSword: Model is already a Group, equipping directly');
            this.equipToCamera(this.model);
        } else {
            console.error('WoodenSword: Invalid model type:', this.model);
        }
    }

    // New method to equip the sword to the camera
    equipToCamera(model) {
        console.log('WoodenSword: equipToCamera called');
        // Create a clone of the model for the equipped instance
        this.equippedModel = model.clone();
        
        // Position the sword in front of the camera
        this.equippedModel.position.set(0.5, -0.3, -0.5);
        this.equippedModel.rotation.set(0, Math.PI / 4, 0, 'YXZ');
        this.equippedModel.scale.set(0.5, 0.5, 0.5);

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
        console.log('WoodenSword: Owner:', player);
        if (player && player.camera) {
            console.log('WoodenSword: Found player camera, adding sword');
            player.camera.add(this.equippedModel);
            console.log('WoodenSword: Sword added to camera');
        } else {
            console.error('WoodenSword: Could not find player camera to equip sword');
            console.error('Player:', player);
            console.error('Camera:', player ? player.camera : 'No camera');
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
        if (this.equippedModel) {
            this.attackAnimation.init(this.equippedModel);
            this.attackAnimation.startAnimation();
        } else {
            console.warn('WoodenSword: Cannot start swing - no equipped model');
        }
    }

    /**
     * Update the swing animation
     * @param {number} deltaTime - Time since last update
     */
    updateSwing(deltaTime) {
        if (!this.swingAnimation.isSwinging) return;

        this.swingAnimation.progress += deltaTime;
        const progress = Math.min(this.swingAnimation.progress / this.swingAnimation.duration, 1);

        // Use smooth easing function
        const easedProgress = this.easeOutCubic(progress);

        // Interpolate between start and end rotation
        this.equippedModel.rotation.x = THREE.MathUtils.lerp(
            this.swingAnimation.startRotation.x,
            this.swingAnimation.endRotation.x,
            easedProgress
        );

        // Reset when animation is complete
        if (progress >= 1) {
            this.swingAnimation.isSwinging = false;
            this.swingAnimation.progress = 0;
            this.equippedModel.rotation.copy(this.swingAnimation.startRotation);
        }
    }

    /**
     * Easing function for smooth animation
     * @param {number} t - Progress value (0 to 1)
     * @returns {number} Eased progress value
     */
    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }
} 