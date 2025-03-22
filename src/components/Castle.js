import * as THREE from 'three';

export class Castle {
    constructor() {
        this.mesh = null;
        this.maxHealth = 100;
        this.currentHealth = this.maxHealth;
        this.isInitialized = false;
    }

    init() {
        // Create castle geometry
        const castleGeometry = new THREE.BoxGeometry(10, 15, 10);
        const castleMaterial = new THREE.MeshStandardMaterial({
            color: 0x808080,
            roughness: 0.7,
            metalness: 0.3
        });
        this.mesh = new THREE.Mesh(castleGeometry, castleMaterial);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;

        // Add towers
        this.addTowers();

        // Position the castle
        this.mesh.position.set(0, 7.5, 0);

        this.isInitialized = true;
    }

    addTowers() {
        // Add corner towers
        const towerGeometry = new THREE.CylinderGeometry(1, 1, 5, 8);
        const towerMaterial = new THREE.MeshStandardMaterial({
            color: 0x666666,
            roughness: 0.8,
            metalness: 0.2
        });

        const positions = [
            { x: 6, z: 6 },
            { x: -6, z: 6 },
            { x: 6, z: -6 },
            { x: -6, z: -6 }
        ];

        positions.forEach(pos => {
            const tower = new THREE.Mesh(towerGeometry, towerMaterial);
            tower.position.set(pos.x, 10, pos.z);
            tower.castShadow = true;
            tower.receiveShadow = true;
            this.mesh.add(tower);
        });
    }

    update() {
        if (!this.isInitialized) return;

        // Update castle state
        // This will be implemented when we have game state management
    }

    takeDamage(amount) {
        this.currentHealth = Math.max(0, this.currentHealth - amount);
        return this.currentHealth <= 0;
    }

    heal(amount) {
        this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);
    }

    getHealthPercentage() {
        return (this.currentHealth / this.maxHealth) * 100;
    }

    getMesh() {
        return this.mesh;
    }
} 