import * as THREE from 'three';
import { Tree } from './Tree';

export class TreeManager {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.trees = [];
        this.minDistanceFromCenter = options.minDistanceFromCenter || 40;
        this.maxDistanceFromCenter = options.maxDistanceFromCenter || 100;
        this.minTrees = options.minTrees || 20;
        this.maxTrees = options.maxTrees || 40;
        this.minDistanceBetweenTrees = options.minDistanceBetweenTrees || 5;
    }

    /**
     * Initialize the tree manager and spawn trees
     */
    async init() {
        try {
            const numTrees = Math.floor(Math.random() * (this.maxTrees - this.minTrees + 1)) + this.minTrees;
            console.log(`Spawning ${numTrees} trees...`);

            for (let i = 0; i < numTrees; i++) {
                const position = this.generateValidPosition();
                if (position) {
                    const tree = new Tree({
                        position: position,
                        height: Math.random() * 2 + 3, // Random height between 3-5 units
                        scale: Math.random() * 0.5 + 0.75, // Random scale between 0.75-1.25
                        rotation: new THREE.Vector3(0, Math.random() * Math.PI * 2, 0)
                    });

                    await tree.init();
                    this.scene.add(tree.mesh);
                    this.trees.push(tree);
                }
            }

            console.log(`Successfully spawned ${this.trees.length} trees`);
        } catch (error) {
            console.error('Error initializing tree manager:', error);
            throw error;
        }
    }

    /**
     * Generate a valid position for a new tree
     * @returns {THREE.Vector3|null} - The generated position or null if no valid position found
     */
    generateValidPosition() {
        const maxAttempts = 50;
        let attempts = 0;

        while (attempts < maxAttempts) {
            // Generate random angle and distance
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * (this.maxDistanceFromCenter - this.minDistanceFromCenter) + this.minDistanceFromCenter;

            // Calculate position
            const x = Math.cos(angle) * distance;
            const z = Math.sin(angle) * distance;
            const position = new THREE.Vector3(x, 0, z);

            // Check if position is valid (not too close to other trees)
            if (this.isValidPosition(position)) {
                return position;
            }

            attempts++;
        }

        return null;
    }

    /**
     * Check if a position is valid for a new tree
     * @param {THREE.Vector3} position - The position to check
     * @returns {boolean} - Whether the position is valid
     */
    isValidPosition(position) {
        // Check distance from center
        const distanceFromCenter = position.length();
        if (distanceFromCenter < this.minDistanceFromCenter || distanceFromCenter > this.maxDistanceFromCenter) {
            return false;
        }

        // Check distance from other trees
        for (const tree of this.trees) {
            const treePos = tree.getPosition();
            const distance = position.distanceTo(treePos);
            if (distance < this.minDistanceBetweenTrees) {
                return false;
            }
        }

        return true;
    }

    /**
     * Check if a point collides with any tree
     * @param {THREE.Vector3} point - The point to check
     * @returns {boolean} - Whether there is a collision
     */
    checkCollision(point) {
        return this.trees.some(tree => tree.checkCollision(point));
    }

    /**
     * Check if a line segment collides with any tree
     * @param {THREE.Vector3} start - Start point of the line segment
     * @param {THREE.Vector3} end - End point of the line segment
     * @returns {boolean} - Whether there is a collision
     */
    checkLineCollision(start, end) {
        return this.trees.some(tree => tree.checkLineCollision(start, end));
    }

    /**
     * Update all trees
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime) {
        this.trees.forEach(tree => tree.update(deltaTime));
    }
} 