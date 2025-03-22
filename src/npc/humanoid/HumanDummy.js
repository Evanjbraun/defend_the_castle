import * as THREE from 'three';
import { NPCSchema } from '../NPCSchema';

export class HumanDummy extends NPCSchema {
    constructor(config = {}) {
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
        
        // Animation properties
        this.animationState = 'IDLE';
        this.swayAmount = 0.02;
        this.swaySpeed = 1.5;
        this.swayTime = 0;
    }

    // Override createModel to generate a human-like figure
    createModel() {
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

        this.mesh = group;
        return group;
    }

    // Override updateAnimation to add idle sway
    updateAnimation(deltaTime) {
        if (!this.mesh || this.state === 'DEAD') return;

        this.swayTime += deltaTime * this.swaySpeed;
        
        // Gentle swaying motion when idle
        if (this.state === 'IDLE') {
            const sway = Math.sin(this.swayTime) * this.swayAmount;
            this.mesh.rotation.z = sway;
            
        }
    }

    // Override takeDamage to include damage absorption
    takeDamage(amount) {
        const reducedDamage = amount * (1 - this.damageAbsorption);
        return super.takeDamage(reducedDamage);
    }

    // Override die to handle dummy death
    die() {
        super.die();
        if (this.mesh) {
            // Fall over animation
            this.mesh.rotation.x = Math.PI * 0.5;
        }
    }
} 