import * as THREE from 'three';

/**
 * 3D Cloud entity that drifts across the sky
 */
export class Cloud {
    /**
     * Create a new cloud
     * @param {Object} config - Configuration options
     */
    constructor(config = {}) {
        // Cloud properties
        this.width = config.width || 30;
        this.height = this.width * 0.6;
        this.depth = this.width * 0.8;
        this.color = config.color || 0xFFFFFF;
        
        // Position and animation properties
        this.startX = config.startX || 100;
        this.endX = config.endX || -100;
        this.y = config.y || 100;
        this.z = config.z || -100;
        this.speed = config.speed || 5;
        this.progress = config.progress || 0; // 0-1 value for position along path
        
        // Create the cloud group
        this.group = new THREE.Group();
        
        // Debug mode
        this.debug = config.debug || false;
        
        // Calculate total distance to travel
        this.totalDistance = Math.abs(this.endX - this.startX);
        
        // Create the 3D cloud
        this._createCloudMesh();
        
        // Update position based on initial progress
        this._updatePosition();
    }
    
    /**
     * Create a 3D puffy cloud using multiple spheres
     * @private
     */
    _createCloudMesh() {
        // Create cloud material with soft edges
        const cloudMaterial = new THREE.MeshStandardMaterial({
            color: this.color,
            emissive: this.color,
            emissiveIntensity: 0.2, // Increased for better visibility
            transparent: true,
            opacity: 0.9,
            roughness: 1.0,
            metalness: 0.0,
            fog: true // Clouds are affected by fog
        });
        
        // Number of puffs based on cloud size
        const puffCount = Math.max(5, Math.floor(this.width / 6));
        
        // Create main central puff
        const mainPuffSize = this.width * 0.3;
        const mainPuff = new THREE.Mesh(
            new THREE.SphereGeometry(mainPuffSize, 8, 8),
            cloudMaterial.clone()
        );
        this.group.add(mainPuff);
        
        // Add random smaller puffs around the main one
        for (let i = 0; i < puffCount; i++) {
            // Random size between 40% and 90% of main puff
            const puffSize = mainPuffSize * (0.4 + Math.random() * 0.5);
            
            // Position around the main puff in 3D space
            const angle = Math.random() * Math.PI * 2;
            const heightVar = Math.random() * puffSize - puffSize/2;
            const distance = mainPuffSize * 0.5 + puffSize * 0.5;
            
            const puff = new THREE.Mesh(
                new THREE.SphereGeometry(puffSize, 6, 6),
                cloudMaterial.clone()
            );
            
            // Position the puff
            puff.position.set(
                Math.cos(angle) * distance,
                heightVar,
                Math.sin(angle) * distance
            );
            
            // Add subtle random rotation
            puff.rotation.x = Math.random() * 0.2;
            puff.rotation.y = Math.random() * 0.2;
            puff.rotation.z = Math.random() * 0.2;
            
            this.group.add(puff);
        }
        
        // Add a few puffs on top to create height
        for (let i = 0; i < puffCount/2; i++) {
            const topPuffSize = mainPuffSize * (0.5 + Math.random() * 0.4);
            const angle = Math.random() * Math.PI * 2;
            const distance = mainPuffSize * 0.3;
            
            const puff = new THREE.Mesh(
                new THREE.SphereGeometry(topPuffSize, 6, 6),
                cloudMaterial.clone()
            );
            
            puff.position.set(
                Math.cos(angle) * distance,
                mainPuffSize * 0.5 + topPuffSize * 0.3,
                Math.sin(angle) * distance
            );
            
            this.group.add(puff);
        }
        
        // Random slight rotation for the whole cloud
        this.group.rotation.y = Math.random() * Math.PI;
        
        // Apply shadow casting to all parts
        this.group.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
            }
        });
    }
    
    /**
     * Update cloud position based on progress
     * @private
     */
    _updatePosition() {
        // Linear interpolation between start and end positions
        this.group.position.x = this.startX + (this.endX - this.startX) * this.progress;
        this.group.position.y = this.y;
        this.group.position.z = this.z;
        
        // Calculate opacity based on position (fade in/out at edges)
        const fadeZone = 0.15; // 15% of path at each end will fade
        
        let opacity = 0.9; // Default cloud opacity
        
        // Fade in at start
        if (this.progress < fadeZone) {
            opacity = 0.9 * (this.progress / fadeZone);
        }
        // Fade out at end
        else if (this.progress > (1 - fadeZone)) {
            opacity = 0.9 * ((1 - this.progress) / fadeZone);
        }
        
        // Apply opacity to all child meshes
        this.group.traverse(child => {
            if (child.isMesh) {
                child.material.opacity = opacity;
            }
        });
    }
    
    /**
     * Set the cloud color
     * @param {number} color - Hexadecimal color value
     */
    setColor(color) {
        this.color = color;
        
        // Update all child meshes
        this.group.traverse(child => {
            if (child.isMesh && child.material) {
                child.material.color.set(color);
                child.material.emissive.set(color);
            }
        });
    }
    
    /**
     * Get the cloud mesh
     * @returns {THREE.Group} The cloud mesh group
     */
    getMesh() {
        return this.group;
    }
    
    /**
     * Update method for animation
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
        // Move cloud based on speed and elapsed time
        this.progress += (this.speed * deltaTime) / this.totalDistance;
        
        // Add slight bobbing motion
        const floatAmount = Math.sin(performance.now() * 0.0005 * this.speed) * 0.5;
        this.group.position.y += floatAmount * 0.05;
        
        // Reset when we reach the end
        if (this.progress >= 1) {
            // Reset to start with slight randomness
            this.progress = 0;
            
            // Randomize properties slightly for variety
            this.y = this.y + (Math.random() * 10 - 5);
            this.z = this.z + (Math.random() * 10 - 5);
            this.speed = this.speed * (0.8 + Math.random() * 0.4); // 80-120% of original speed
            
            // Re-randomize the cloud rotation for variety
            this.group.rotation.y = Math.random() * Math.PI;
            
            if (this.debug) {
                console.log('Cloud reset to start position');
            }
        }
        
        // Update position and opacity
        this._updatePosition();
    }
} 