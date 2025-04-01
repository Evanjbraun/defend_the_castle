import * as THREE from 'three';
import { CastleWalls } from '../entities/structures/CastleWalls';

export class Castle {
    constructor() {
        this.mesh = null;
        this.health = 100;
        this.maxHealth = 100;
        this.isDestroyed = false;
        this.castleWalls = null;
    }

    async init() {
        try {
            // Create castle walls
            this.castleWalls = new CastleWalls({
                size: 20,
                wallHeight: 8,
                debug: false
            });
            
            // Get the mesh from castle walls
            this.mesh = this.castleWalls.build();
            this.mesh.position.set(0, 0, 0);
        } catch (error) {
            console.error('Error initializing castle:', error);
            // Create a simple fallback castle
            const geometry = new THREE.BoxGeometry(10, 15, 10);
            const material = new THREE.MeshStandardMaterial({ color: 0x808080 });
            this.mesh = new THREE.Mesh(geometry, material);
            this.mesh.position.set(0, 7.5, 0);
            this.mesh.castShadow = true;
            this.mesh.receiveShadow = true;
        }
    }

    getMesh() {
        return this.mesh;
    }

    getPosition() {
        return this.mesh.position;
    }

    takeDamage(amount) {
        if (this.isDestroyed) return 0;
        
        this.health = Math.max(0, this.health - amount);
        
        if (this.health <= 0) {
            this.health = 0;
            this.isDestroyed = true;
            this.onDestroyed();
        }
        
        return amount;
    }

    heal(amount) {
        if (this.isDestroyed) return 0;
        
        this.health = Math.min(this.maxHealth, this.health + amount);
        return amount;
    }

    getHealth() {
        return this.health;
    }

    getMaxHealth() {
        return this.maxHealth;
    }

    isAlive() {
        return !this.isDestroyed;
    }

    onDestroyed() {
        // Dispatch event when castle is destroyed
        const event = new CustomEvent('castleDestroyed', {
            detail: { castle: this }
        });
        window.dispatchEvent(event);
    }

    update() {
        // Update castle state if needed
        // For now, this is empty as the castle doesn't need any per-frame updates
    }

    checkCollision(position, radius) {
        if (this.castleWalls) {
            return this.castleWalls.checkCollision(position, radius);
        }
        return false;
    }
} 