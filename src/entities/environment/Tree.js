import * as THREE from 'three';

export class Tree {
    constructor(options = {}) {
        // Default parameters with randomization
        this.height = options.height || (Math.random() * 3 + 8); // Random height between 8-11 units
        this.scale = options.scale || (Math.random() * 0.5 + 1.5); // Random scale between 1.5-2.0
        this.position = options.position || new THREE.Vector3(0, 0, 0);
        this.rotation = options.rotation || new THREE.Euler(0, Math.random() * Math.PI * 2, 0, 'YXZ'); // Random rotation around Y axis with explicit order
        
        // Initialize properties
        this.mesh = null;
        this.collider = null;
        this.isLoaded = false;

        // Random animation parameters
        this.windSpeed = (Math.random() * 0.3 + 0.4); // Random speed between 0.4-0.7
        this.windFrequency = (Math.random() * 0.5 + 1.8); // Random frequency between 1.8-2.3
        this.phaseOffset = Math.random() * Math.PI * 2; // Random phase offset between 0-2π
        this.layerOffsets = []; // Store phase offsets for each foliage layer
    }

    async init() {
        try {
            // Create materials
            const trunkMaterial = new THREE.MeshStandardMaterial({
                color: 0x4a2f1d, // Brown color for trunk
                roughness: 0.8,
                metalness: 0.2
            });

            const foliageMaterial = new THREE.MeshStandardMaterial({
                color: 0x2d5a27, // Green color for foliage
                roughness: 0.7,
                metalness: 0.1
            });

            // Create trunk (cylinder)
            const trunkGeometry = new THREE.CylinderGeometry(0.4, 0.8, this.height, 12);
            const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
            trunk.castShadow = true;
            trunk.receiveShadow = true;

            // Create a group to hold all parts
            this.mesh = new THREE.Group();
            this.mesh.add(trunk);

            // Create three layers of foliage with adjusted positions to ensure connection
            const foliageLayers = [
                { radius: 3.0, height: 4.0, yOffset: this.height - 0.5 }, // Bottom layer - slightly lower to connect
                { radius: 2.5, height: 3.5, yOffset: this.height + 1.0 }, // Middle layer
                { radius: 2.0, height: 3.0, yOffset: this.height + 2.5 }  // Top layer
            ];

            // Add each foliage layer with random phase offsets
            foliageLayers.forEach((layer, index) => {
                const foliageGeometry = new THREE.ConeGeometry(layer.radius, layer.height, 12);
                const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
                foliage.position.y = layer.yOffset;
                foliage.castShadow = true;
                foliage.receiveShadow = true;
                this.mesh.add(foliage);
                
                // Store random phase offset for this layer
                this.layerOffsets[index] = Math.random() * Math.PI * 2;
            });

            // Apply transformations
            this.mesh.position.copy(this.position);
            this.mesh.rotation.copy(this.rotation);
            this.mesh.scale.set(this.scale, this.scale, this.scale);

            // Create collision box
            const box = new THREE.Box3().setFromObject(this.mesh);
            const size = box.getSize(new THREE.Vector3());
            
            // Create a slightly smaller collider to prevent getting stuck
            const colliderSize = new THREE.Vector3(
                size.x * 0.8,
                size.y * 0.8,
                size.z * 0.8
            );
            
            this.collider = new THREE.Box3(
                new THREE.Vector3().subVectors(this.position, colliderSize.multiplyScalar(0.5)),
                new THREE.Vector3().addVectors(this.position, colliderSize.multiplyScalar(0.5))
            );
            
            this.isLoaded = true;
            return this.mesh;
        } catch (error) {
            console.error('Error creating tree model:', error);
            throw error;
        }
    }

    /**
     * Check if a point collides with the tree
     * @param {THREE.Vector3} point - The point to check for collision
     * @returns {boolean} - Whether there is a collision
     */
    checkCollision(point) {
        if (!this.collider) return false;
        return this.collider.containsPoint(point);
    }

    /**
     * Check if a line segment collides with the tree
     * @param {THREE.Vector3} start - Start point of the line segment
     * @param {THREE.Vector3} end - End point of the line segment
     * @returns {boolean} - Whether there is a collision
     */
    checkLineCollision(start, end) {
        if (!this.collider) return false;
        return this.collider.clampPoint(start, new THREE.Vector3()).distanceTo(start) < 0.1 ||
               this.collider.clampPoint(end, new THREE.Vector3()).distanceTo(end) < 0.1;
    }

    /**
     * Get the tree's position
     * @returns {THREE.Vector3} - The tree's position
     */
    getPosition() {
        return this.position;
    }

    /**
     * Get the tree's collider
     * @returns {THREE.Box3} - The tree's collision box
     */
    getCollider() {
        return this.collider;
    }

    /**
     * Update the tree's state
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime) {
        // Add wind animation
        if (this.mesh) {
            const time = Date.now() * 0.001; // Convert to seconds
            
            // Apply a gentle swaying motion to all foliage layers
            // Skip the first child (trunk) and animate the foliage layers
            for (let i = 1; i < this.mesh.children.length; i++) {
                const foliage = this.mesh.children[i];
                // Reduce the sway effect for higher layers and add phase offsets
                const layerFactor = 1 - (i - 1) * 0.2;
                const layerOffset = this.layerOffsets[i - 1];
                
                // Combine tree phase offset with layer phase offset
                const totalPhase = this.phaseOffset + layerOffset;
                
                foliage.rotation.x = Math.sin(time * this.windFrequency + totalPhase) * this.windSpeed * 0.1 * layerFactor;
                foliage.rotation.z = Math.cos(time * this.windFrequency + totalPhase) * this.windSpeed * 0.1 * layerFactor;
            }
        }
    }
} 