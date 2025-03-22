import { ItemSchema } from '../ItemSchema';
import { SwordAnimation } from './weaponAnimations/SwordAnimation';
import * as THREE from 'three';

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

            // Combat properties
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
        this.trainingWeapon = true; // Indicates this is a training weapon
        this.attackAnimation = new SwordAnimation();
        
        // Create and set the 3D model
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
        this.attackAnimation.update(deltaTime);
    }

    // Create the 3D model of the wooden sword
    createModel() {
        // Create a group to hold all parts of the sword
        const swordGroup = new THREE.Group();

        // Blade dimensions
        const bladeLength = 2.5;
        const bladeWidth = 0.15;
        const bladeHeight = 0.4;
        const bladeGeometry = new THREE.BoxGeometry(bladeWidth, bladeLength, bladeHeight);
        
        // Handle dimensions
        const handleLength = 0.8;
        const handleWidth = 0.1;
        const handleGeometry = new THREE.BoxGeometry(handleWidth, handleLength, handleWidth);
        
        // Guard dimensions
        const guardWidth = 0.5;
        const guardHeight = 0.15;
        const guardDepth = 0.25;
        const guardGeometry = new THREE.BoxGeometry(guardWidth, guardHeight, guardDepth);

        // Materials
        const bladeMaterial = new THREE.MeshStandardMaterial({
            color: 0xcd7f32, // Bronze color
            metalness: 0.7,
            roughness: 0.3
        });

        const handleMaterial = new THREE.MeshStandardMaterial({
            color: 0xffd700, // Gold color
            metalness: 0.8,
            roughness: 0.2
        });

        // Create mesh components
        const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
        const handle = new THREE.Mesh(handleGeometry, handleMaterial);
        const guard = new THREE.Mesh(guardGeometry, handleMaterial);

        // Position components
        blade.position.y = handleLength / 2 + bladeLength / 2;
        guard.position.y = handleLength;
        
        // Add components to group
        swordGroup.add(blade);
        swordGroup.add(handle);
        swordGroup.add(guard);

        // Rotate the sword to be horizontal
        swordGroup.rotation.z = Math.PI / 2;

        // Add some edge beveling to the blade
        const bevelGeometry = new THREE.BoxGeometry(bladeWidth * 0.8, bladeLength, bladeHeight * 0.8);
        const bevelMesh = new THREE.Mesh(bevelGeometry, bladeMaterial);
        bevelMesh.position.y = handleLength / 2 + bladeLength / 2;
        swordGroup.add(bevelMesh);

        // Set the pivot point to the handle end
        swordGroup.position.y = -handleLength / 2;

        return swordGroup;
    }
} 