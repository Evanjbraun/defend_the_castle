import * as THREE from 'three';
import { NPCSchema } from '../npc/NPCSchema';
import { EquipmentSystem } from '../equipment/EquipmentSystem';
import { NPCUtility } from '../npc/NPCUtility';

export class PlayerSchema extends NPCSchema {
    constructor(config = {}) {
        super({
            id: 'player',
            name: 'Player',
            type: 'PLAYER',
            level: 1,
            height: 1.8288, // 6 feet in meters
            
            // Combat properties
            health: 100,
            maxHealth: 100,
            attackPower: 10,
            attackRange: 1.5,
            defense: 10,
            
            // Movement properties
            moveSpeed: 0.1,
            rotationSpeed: 0.05,
            
            // Stats
            stats: {
                strength: 10,
                dexterity: 10,
                vitality: 10,
                intelligence: 10
            },
            ...config
        });

        // Player specific properties
        this.isPlayer = true;
        this.isFirstPerson = true; // Toggle between first and third person
        this.camera = null;
        this.controls = null;

        // Initialize equipment system
        this.equipment = new EquipmentSystem(this);

        // Listen for equipment events
        this.equipment.addEventListener('itemEquipped', (event) => NPCUtility.handleItemEquipped(event, this));
        this.equipment.addEventListener('itemUnequipped', (event) => NPCUtility.handleItemUnequipped(event, this));

        // Custom item transformations for equipment
        this.itemTransformations = {
            RIGHT_HAND: {
                position: { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 1, z: -Math.PI / 2 },
                scale: { x: 0.5, y: 0.5, z: 0.5 }
            },
            LEFT_HAND: {
                position: { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: Math.PI / 2 },
                scale: { x: 0.5, y: 0.5, z: 0.5 }
            }
        };
    }

    /**
     * Create the player's 3D model
     * @returns {THREE.Group} The player's model group
     */
    createModel() {
        console.log('=== Player: Creating Model ===');
        const group = new THREE.Group();

        // Create a basic humanoid model (we'll enhance this later)
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0x00ff00, // Temporary color
            roughness: 0.7,
            metalness: 0.2,
            transparent: true,
            opacity: 0 // Set opacity to 0 to make the player model invisible
        });

        // Head
        const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.2, 16, 16),
            bodyMaterial
        );
        head.position.y = 1.7;
        head.castShadow = true;

        // Body
        const body = new THREE.Mesh(
            new THREE.CylinderGeometry(0.2, 0.3, 0.8, 16),
            bodyMaterial
        );
        body.position.y = 1.1;
        body.castShadow = true;

        // Arms
        const armGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.6, 8);
        const leftArm = new THREE.Mesh(armGeometry, bodyMaterial);
        leftArm.position.set(0.3, 1.4, 0.3);
        leftArm.rotation.z = Math.PI * 0.1;
        leftArm.rotation.x = -Math.PI * 0.1;
        leftArm.castShadow = true;

        const rightArm = new THREE.Mesh(armGeometry, bodyMaterial);
        rightArm.position.set(-0.3, 1.4, 0.3);
        rightArm.rotation.z = -Math.PI * 0.1;
        rightArm.rotation.x = -Math.PI * 0.2;
        rightArm.castShadow = true;

        // Legs
        const legGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.8, 8);
        const leftLeg = new THREE.Mesh(legGeometry, bodyMaterial);
        leftLeg.position.set(0.15, 0.4, 0);
        leftLeg.castShadow = true;

        const rightLeg = new THREE.Mesh(legGeometry, bodyMaterial);
        rightLeg.position.set(-0.15, 0.4, 0);
        rightLeg.castShadow = true;

        // Add all parts to the group
        group.add(head);
        group.add(body);
        group.add(leftArm);
        group.add(rightArm);
        group.add(leftLeg);
        group.add(rightLeg);

        // Create attachment points for equipment
        console.log('Player: Creating attachment points');
        this.attachmentPoints = NPCUtility.createAttachmentPoints(group, {
            scale: 1.0,
            positions: {
                RIGHT_HAND: { x: 0, y: 1.7, z: 0 },
                LEFT_HAND: { x: 0, y: 1.7, z: 0 },
                HEAD: { x: 0, y: 1.9, z: 0 },
                CHEST: { x: 0, y: 1.5, z: 0 },
                LEGS: { x: 0, y: 0.8, z: 0 },
                FEET: { x: 0, y: 0.1, z: 0 }
            }
        });

        return group;
    }

    /**
     * Toggle between first and third person view
     */
    toggleView() {
        this.isFirstPerson = !this.isFirstPerson;
        if (this.cameraController) {
            this.cameraController.toggleView();
        }
    }

    /**
     * Update the player's state
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime) {
        super.update(deltaTime);
        
        // Update camera position if in first person
        if (this.isFirstPerson && this.cameraController) {
            this.cameraController.update();
        }
    }
} 