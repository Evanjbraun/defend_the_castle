import * as THREE from 'three';
import { NPCSchema } from '../NPCSchema';
import { EquipmentSystem } from '../../equipment/EquipmentSystem';
import { WoodenSword } from '../../items/weapons/WoodenSword';
import { NPCUtility } from '../NPCUtility';

export class HumanDummy extends NPCSchema {
    constructor(config = {}) {
        console.log('=== HumanDummy: Initializing ===');
        super({
            id: 'npc_human_dummy',
            name: 'Training Dummy',
            type: 'HUMANOID',
            level: 1,
            height: 1.8288, // 6 feet in meters
            
            // Combat properties
            health: 150,
            maxHealth: 150,
            attackPower: 15,
            attackRange: 1.5,
            defense: 15,
            
            // Movement properties
            moveSpeed: 0.08, // Slower than player
            rotationSpeed: 0.03,
            
            // AI properties
            detectionRange: 8,
            aggroRange: 4,
            
            // Stats
            stats: {
                strength: 12,
                dexterity: 8,
                vitality: 15,
                intelligence: 5
            },
            ...config
        });

        // Dummy specific properties
        this.isTrainingDummy = true;
        this.damageAbsorption = 0.2; // Reduces damage by 20%
        
        // Custom item transformations for equipment
        this.itemTransformations = {
            RIGHT_HAND: {
                position: { x: 0.4, y: 0.7, z: 0 },
                rotation: { x: -2, y: 1.4, z: 1.5 },
                scale: { x: 1, y: 1, z: 1 }
            },
            LEFT_HAND: {
                position: { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: Math.PI / 2 },
                scale: { x: 0.2, y: 0.2, z: 0.2 }
            }
        };
        
        // Animation properties
        this.animationState = 'IDLE';
        this.swayAmount = 0.02;
        this.swaySpeed = 1.5;
        this.swayTime = 0;

        // Create the model first
        this.mesh = this.createModel();
        
        // Initialize equipment system after model is created
        console.log('HumanDummy: Creating equipment system');
        this.equipment = new EquipmentSystem(this);

        // Listen for equipment events
        this.equipment.addEventListener('itemEquipped', (event) => NPCUtility.handleItemEquipped(event, this));
        this.equipment.addEventListener('itemUnequipped', (event) => NPCUtility.handleItemUnequipped(event, this));


        const woodenSword = new WoodenSword();

        
        // Create the 3D model for the sword
        woodenSword.model = woodenSword.createModel();
        console.log('HumanDummy: Sword model created:', woodenSword.model);
        

        this.equipment.equip(woodenSword, 'MAINHAND');
    }

    

    // Override createModel to generate a human-like figure
    createModel() {
        console.log('=== HumanDummy: Creating Model ===');
        const group = new THREE.Group();

        // Material for the dummy with full opacity
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0xffd1ad, // Saddle brown for training dummy
            roughness: 0.7,
            metalness: 0.2,
            transparent: false,
            opacity: 1.0,
            side: THREE.DoubleSide // Render both sides of the geometry
        });

        const jointMaterial = new THREE.MeshStandardMaterial({
            color: 0xffbd8a, // Darker brown for joints
            roughness: 0.6,
            metalness: 0.3,
            transparent: false,
            opacity: 1.0,
            side: THREE.DoubleSide
        });

        // Head
        const headRadius = this.height * 0.1;
        const head = new THREE.Mesh(
            new THREE.SphereGeometry(headRadius, 12, 12),
            bodyMaterial
        );
        head.position.y = this.height * 0.8;
        head.castShadow = true;

        // Add eyes to the head
        const eyeRadius = headRadius * 0.2;
        const eyeDistance = headRadius * 0.4;
        const eyeDepth = headRadius * 0.75;
        
        // Eye material (white sclera)
        const eyeMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFFFF,
            roughness: 0.3,
            metalness: 0.1
        });
        
        // Pupil material (black)
        const pupilMaterial = new THREE.MeshStandardMaterial({
            color: 0x000000,
            roughness: 0.2,
            metalness: 0.1
        });
        
        // Create left eye
        const leftEye = new THREE.Mesh(
            new THREE.SphereGeometry(eyeRadius, 8, 8),
            eyeMaterial
        );
        leftEye.position.set(eyeDistance, 0, eyeDepth);
        head.add(leftEye);
        
        // Create right eye
        const rightEye = new THREE.Mesh(
            new THREE.SphereGeometry(eyeRadius, 8, 8),
            eyeMaterial
        );
        rightEye.position.set(-eyeDistance, 0, eyeDepth);
        head.add(rightEye);
        
        // Add pupils
        const pupilRadius = eyeRadius * 0.6;
        const pupilDepth = eyeRadius * 0.6;
        
        const leftPupil = new THREE.Mesh(
            new THREE.SphereGeometry(pupilRadius, 8, 8),
            pupilMaterial
        );
        leftPupil.position.set(0, 0, pupilDepth);
        leftEye.add(leftPupil);
        
        const rightPupil = new THREE.Mesh(
            new THREE.SphereGeometry(pupilRadius, 8, 8),
            pupilMaterial
        );
        rightPupil.position.set(0, 0, pupilDepth);
        rightEye.add(rightPupil);
        
        // Store reference to eyes for animation
        this.eyes = {
            left: leftEye,
            right: rightEye,
            leftPupil: leftPupil,
            rightPupil: rightPupil
        };

        // Torso
        const torsoHeight = this.height * 0.35;
        const torsoWidth = this.height * 0.18;
        const torso = new THREE.Mesh(
            new THREE.CylinderGeometry(torsoWidth * 0.7, torsoWidth * 0.8, torsoHeight, 12),
            bodyMaterial
        );
        torso.position.y = this.height * 0.5;
        torso.castShadow = true;

        // Arms
        const armLength = this.height * 0.3;
        const armWidth = this.height * 0.035;
        
        // Left Arm
        const leftArm = new THREE.Mesh(
            new THREE.CylinderGeometry(armWidth, armWidth, armLength, 10),
            bodyMaterial
        );
        leftArm.position.set(torsoWidth * 1, this.height * 0.5, 0);
        leftArm.rotation.z = Math.PI * 0.1;
        leftArm.castShadow = true;

        // Right Arm
        const rightArm = new THREE.Mesh(
            new THREE.CylinderGeometry(armWidth, armWidth, armLength, 10),
            bodyMaterial
        );
        
        rightArm.position.set(-torsoWidth * 1, this.height * 0.5, 0);
        rightArm.rotation.z = -Math.PI * 0.1;
        rightArm.castShadow = true;

        // Legs
        const legLength = this.height * 0.4;
        const legWidth = this.height * 0.045;
        
        // Left Leg
        const leftLeg = new THREE.Mesh(
            new THREE.CylinderGeometry(legWidth, legWidth, legLength, 10),
            bodyMaterial
        );
        leftLeg.position.set(torsoWidth * 0.3, this.height * 0.2, 0);
        leftLeg.castShadow = true;

        // Right Leg
        const rightLeg = new THREE.Mesh(
            new THREE.CylinderGeometry(legWidth, legWidth, legLength, 10),
            bodyMaterial
        );
        rightLeg.position.set(-torsoWidth * 0.3, this.height * 0.2, 0);
        rightLeg.castShadow = true;

        // Joints
        const createJoint = (radius) => {
            return new THREE.Mesh(
                new THREE.SphereGeometry(radius, 12, 12),
                jointMaterial
            );
        };

        // Add joints at shoulders, hips, neck
        const shoulderRadius = this.height * 0.04;
        const leftShoulder = createJoint(shoulderRadius);
        leftShoulder.position.copy(leftArm.position);
        leftShoulder.castShadow = true;

        const rightShoulder = createJoint(shoulderRadius);
        rightShoulder.position.copy(rightArm.position);
        rightShoulder.castShadow = true;

        const hipRadius = this.height * 0.045;
        const leftHip = createJoint(hipRadius);
        leftHip.position.copy(leftLeg.position);
        leftHip.position.y += legLength * 0.5;
        leftHip.castShadow = true;

        const rightHip = createJoint(hipRadius);
        rightHip.position.copy(rightLeg.position);
        rightHip.position.y += legLength * 0.5;
        rightHip.castShadow = true;

        const neck = createJoint(shoulderRadius);
        neck.position.y = this.height * 0.75;
        neck.castShadow = true;

        // Add all parts to the group
        group.add(head);
        group.add(torso);
        group.add(leftArm);
        group.add(rightArm);
        group.add(leftLeg);
        group.add(rightLeg);
        group.add(leftShoulder);
        group.add(rightShoulder);
        group.add(leftHip);
        group.add(rightHip);
        group.add(neck);

        // Center the model at its feet
        group.position.y = this.height * 0.5;


        console.log('HumanDummy: Creating attachment points');
        this.attachmentPoints = NPCUtility.createAttachmentPoints(group, {
            scale: 1.0, // Use default scale
            positions: {
                // Custom positions for the dummy if needed
                RIGHT_HAND: { x: 0, y: 0, z: 0 },
                LEFT_HAND: { x: -0.6, y: 0, z: 0 },
                HEAD: { x: 0, y: 2.1, z: 0 },
                CHEST: { x: 0, y: 1.5, z: 0.1 },
                LEGS: { x: 0, y: 0.8, z: 0 },
                FEET: { x: 0, y: 0.1, z: 0 }
            }
        });

        return group;
    }

} 