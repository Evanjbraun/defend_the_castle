import * as THREE from 'three';

export class Hero {
    constructor() {
        this.mesh = null;
        this.camera = null;
        this.moveSpeed = 0.1;
        this.rotationSpeed = 0.05;
        this.isInitialized = false;
        this.health = 100;
        this.maxHealth = 100;
        this.attackPower = 20;
        this.attackRange = 2;
    }

    init() {
        // Create hero geometry (temporary placeholder)
        const heroGeometry = new THREE.BoxGeometry(1, 2, 1);
        const heroMaterial = new THREE.MeshStandardMaterial({
            color: 0x4169E1,
            roughness: 0.5,
            metalness: 0.5
        });
        this.mesh = new THREE.Mesh(heroGeometry, heroMaterial);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;

        // Position the hero
        this.mesh.position.set(0, 1, 5);

        this.isInitialized = true;
    }

    moveForward(speed, rotation) {
        if (this.mesh) {
            this.mesh.position.x += Math.sin(rotation) * speed;
            this.mesh.position.z += Math.cos(rotation) * speed;
            this.mesh.rotation.y = rotation;
        }
    }

    moveBackward(speed, rotation) {
        if (this.mesh) {
            this.mesh.position.x -= Math.sin(rotation) * speed;
            this.mesh.position.z -= Math.cos(rotation) * speed;
            this.mesh.rotation.y = rotation;
        }
    }

    moveLeft(speed, rotation) {
        if (this.mesh) {
            this.mesh.position.x -= Math.cos(rotation) * speed;
            this.mesh.position.z += Math.sin(rotation) * speed;
            this.mesh.rotation.y = rotation;
        }
    }

    moveRight(speed, rotation) {
        if (this.mesh) {
            this.mesh.position.x += Math.cos(rotation) * speed;
            this.mesh.position.z -= Math.sin(rotation) * speed;
            this.mesh.rotation.y = rotation;
        }
    }

    attack() {
        // This will be implemented when we have combat mechanics
        console.log('Hero attacks!');
    }

    update() {
        if (!this.isInitialized) return;

        // Update hero state
        // This will be implemented when we have game state management
    }

    takeDamage(amount) {
        this.health = Math.max(0, this.health - amount);
        return this.health <= 0;
    }

    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
    }

    getHealthPercentage() {
        return (this.health / this.maxHealth) * 100;
    }

    getMesh() {
        return this.mesh;
    }

    getPosition() {
        return this.mesh ? this.mesh.position : null;
    }
} 