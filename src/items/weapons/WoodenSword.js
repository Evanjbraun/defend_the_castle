import { ItemSchema } from '../ItemSchema';
import { SwordAnimation } from './weaponAnimations/SwordAnimation';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

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
        this.woodenType = 'Oak';
        this.trainingWeapon = true;
        
        // Initialize animation system
        this.attackAnimation = new SwordAnimation();
        this.equippedModel = null;
        
        // Initialize model as a Promise
        this.model = this.createModel();
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
            console.log('WoodenSword: Attempting to load GLB model from:', '/models/weapons/ironSword.glb');
            loader.load(
                '/models/weapons/ironSword.glb',
                (gltf) => {
                    console.log('WoodenSword: GLB model loaded successfully');
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
                    const percent = (progress.loaded / progress.total * 100);
                    console.log('WoodenSword: Loading progress:', percent.toFixed(2) + '%');
                },
                // Error callback
                (error) => {
                    console.error('WoodenSword: Error loading GLB model:', error);
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
        console.log('WoodenSword: Starting GLB model loading process');
        this.createModel().then(model => {
            console.log('WoodenSword: Model promise resolved');
            if (model instanceof THREE.Group) {
                console.log('WoodenSword: Model is a valid THREE.Group');
                this.model = model;
                this.dispatchEvent({ type: 'modelReady', model: this.model });
            } else {
                console.error('WoodenSword: Model is not a valid THREE.Group:', model);
                // Create fallback model only if GLB loading failed
                const tempGroup = new THREE.Group();
                this.createFallbackModel(tempGroup);
                this.model = tempGroup;
            }
        }).catch(error => {
            console.error('WoodenSword: Error in loadGLBModel:', error);
            // Create fallback model only if GLB loading failed
            const tempGroup = new THREE.Group();
            this.createFallbackModel(tempGroup);
            this.model = tempGroup;
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
        }
    }
} 