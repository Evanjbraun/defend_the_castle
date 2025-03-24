import * as THREE from 'three';
import { Cloud } from './Cloud.js';

/**
 * Sky environment with 3D skybox and cloud management
 */
export class Sky {
    /**
     * Create a new sky
     * @param {Object} config - Configuration options
     */
    constructor(config = {}) {
        // Sky properties
        this.width = config.width || 200; // Match ground width
        this.length = config.length || 200; // Match ground length
        this.height = config.height || 150; // Sky height
        this.skyColor = config.skyColor || 0x87CEEB; // Sky blue
        this.cloudCount = config.cloudCount || 20;
        
        // Cloud properties that can be overridden
        this.cloudProps = {
            color: config.cloudColor || 0xFFFFFF, // Default white
            minWidth: config.cloudMinWidth || 20,
            maxWidth: config.cloudMaxWidth || 50,
            minHeight: config.cloudMinHeight || 80,
            maxHeight: config.cloudMaxHeight || 140,
            minSpeed: config.cloudMinSpeed || 2,
            maxSpeed: config.cloudMaxSpeed || 6
        };
        
        // Cloud collection
        this.clouds = [];
        
        // Group to hold sky components
        this.group = new THREE.Group();
        this.group.name = 'sky';
        
        // Debug mode
        this.debug = config.debug || false;
    }
    
    /**
     * Build the sky
     */
    build() {
        // Create skybox
        this._createSkyBox();
        
        // Create clouds
        this._createClouds();
        
        if (this.debug) {
            console.log('Sky built with', this.cloudCount, 'clouds');
        }
        
        return this.group;
    }
    
    /**
     * Create a skybox that matches the world dimensions
     * @private
     */
    _createSkyBox() {
        // Create skybox geometry
        const halfWidth = this.width / 2;
        const halfLength = this.length / 2;
        const skyHeight = this.height;
        
        // Create the sky material
        const skyMaterial = new THREE.MeshBasicMaterial({
            color: this.skyColor,
            side: THREE.BackSide,
            depthWrite: false, // Prevent sky from affecting depth buffer
            fog: false // Sky doesn't get affected by fog
        });
        
        // Create a box geometry - make it slightly larger than the ground to prevent z-fighting
        const skyGeometry = new THREE.BoxGeometry(this.width * 1.2, skyHeight, this.length * 1.2);
        
        // Create the skybox mesh
        const skyBox = new THREE.Mesh(skyGeometry, skyMaterial);
        skyBox.position.y = skyHeight / 2;
        skyBox.name = 'sky_box';
        skyBox.renderOrder = -1; // Ensure sky renders before ground
        
        // Add to group
        this.group.add(skyBox);
        
        // Add a dome on top for better sky appearance
        const domeRadius = Math.max(halfWidth, halfLength) * 1.2;
        const domeGeometry = new THREE.SphereGeometry(domeRadius, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2);
        const domeMesh = new THREE.Mesh(domeGeometry, skyMaterial.clone());
        domeMesh.position.y = 0;
        domeMesh.name = 'sky_dome';
        domeMesh.renderOrder = -1; // Ensure dome renders before ground
        
        this.group.add(domeMesh);
        
        // Add distant mountains silhouette at the horizon for better depth perception
        this._createHorizon(domeRadius);
    }
    
    /**
     * Create distant mountains at the horizon
     * @private
     * @param {number} radius - Radius of the horizon circle
     */
    _createHorizon(radius) {
        // Create a ring of distant "mountains" at the horizon
        const mountainMaterial = new THREE.MeshBasicMaterial({
            color: 0x556677, // Bluish gray for distant mountains
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.7,
            fog: true // Affected by fog for better distance effect
        });
        
        // Number of mountain segments around the horizon
        const segments = 16;
        
        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const nextAngle = ((i + 1) / segments) * Math.PI * 2;
            
            // Create a custom mountain shape
            const geometry = new THREE.BufferGeometry();
            
            // Calculate positions for the mountain peaks
            const x1 = Math.cos(angle) * radius * 0.95;
            const z1 = Math.sin(angle) * radius * 0.95;
            const x2 = Math.cos(nextAngle) * radius * 0.95;
            const z2 = Math.sin(nextAngle) * radius * 0.95;
            
            // Generate random height for mountain peaks
            const maxHeight = radius * 0.15;
            const peakCount = 3 + Math.floor(Math.random() * 3);
            const vertices = [];
            const indices = [];
            
            // Add base points (at ground level)
            vertices.push(x1, 0, z1);  // 0
            vertices.push(x2, 0, z2);  // 1
            
            // Add mountain peaks between the base points
            for (let p = 0; p < peakCount; p++) {
                const t = (p + 1) / (peakCount + 1);
                const x = x1 + (x2 - x1) * t;
                const z = z1 + (z2 - z1) * t;
                const height = maxHeight * (0.5 + Math.random() * 0.5);
                
                vertices.push(x, height, z);  // 2 + p
                
                // Create triangles
                if (p === 0) {
                    indices.push(0, 2, 1);
                } else {
                    indices.push(0, 2 + p, 2 + p - 1);
                    indices.push(1, 2 + p - 1, 2 + p);
                }
            }
            
            geometry.setIndex(indices);
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            geometry.computeVertexNormals();
            
            const mountain = new THREE.Mesh(geometry, mountainMaterial);
            mountain.renderOrder = -1;
            this.group.add(mountain);
        }
    }
    
    /**
     * Create clouds distributed throughout the sky volume
     * @private
     */
    _createClouds() {
        // Full map dimensions with small margin
        const marginX = this.width * 0.1;
        const marginZ = this.length * 0.1;
        const travelDistance = this.width + 100; // Extra distance for travel
        
        // Divide the sky into sections to ensure good distribution
        const sections = 5;
        const sectionWidth = this.width / sections;
        const sectionLength = this.length / sections;
        
        // Create clouds in each section
        const cloudsPerSection = Math.ceil(this.cloudCount / (sections * sections));
        let cloudIndex = 0;
        
        for (let sectionX = 0; sectionX < sections; sectionX++) {
            for (let sectionZ = 0; sectionZ < sections; sectionZ++) {
                // Determine section boundaries
                const minX = -this.width/2 + sectionX * sectionWidth;
                const maxX = minX + sectionWidth;
                const minZ = -this.length/2 + sectionZ * sectionLength;
                const maxZ = minZ + sectionLength;
                
                // Add clouds to this section
                for (let i = 0; i < cloudsPerSection; i++) {
                    if (cloudIndex >= this.cloudCount) break;
                    
                    // Random position within section
                    const centerX = this._randomBetween(minX, maxX);
                    const centerZ = this._randomBetween(minZ, maxZ);
                    const y = this._randomBetween(this.cloudProps.minHeight, this.cloudProps.maxHeight);
                    
                    // Randomize travel direction (mostly west to east)
                    const westToEast = Math.random() > 0.3; // 70% chance of west to east
                    
                    // Set travel path
                    let startX, endX;
                    if (westToEast) {
                        startX = -this.width/2 - marginX - (Math.random() * 50);
                        endX = this.width/2 + marginX + (Math.random() * 50);
                    } else {
                        startX = this.width/2 + marginX + (Math.random() * 50);
                        endX = -this.width/2 - marginX - (Math.random() * 50);
                    }
                    
                    // Create the cloud with custom properties
                    const cloud = new Cloud({
                        width: this._randomBetween(this.cloudProps.minWidth, this.cloudProps.maxWidth),
                        color: this.cloudProps.color,
                        startX: startX,
                        endX: endX,
                        y: y,
                        z: centerZ,
                        speed: this._randomBetween(this.cloudProps.minSpeed, this.cloudProps.maxSpeed),
                        progress: Math.random(), // Random starting position
                        debug: this.debug
                    });
                    
                    this.clouds.push(cloud);
                    this.group.add(cloud.getMesh());
                    cloudIndex++;
                }
            }
        }
        
        if (this.debug) {
            console.log(`Created ${this.clouds.length} clouds distributed across the map`);
        }
    }
    
    /**
     * Set global cloud properties and update all clouds
     * @param {Object} props - Properties to apply to all clouds
     */
    setCloudProperties(props = {}) {
        // Update stored cloud properties
        if (props.color !== undefined) this.cloudProps.color = props.color;
        if (props.minWidth !== undefined) this.cloudProps.minWidth = props.minWidth;
        if (props.maxWidth !== undefined) this.cloudProps.maxWidth = props.maxWidth;
        
        // Apply to existing clouds if needed
        if (props.color !== undefined) {
            this.clouds.forEach(cloud => {
                cloud.setColor(props.color);
            });
        }
    }
    
    /**
     * Generate a random number between min and max
     * @private
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Random number
     */
    _randomBetween(min, max) {
        return min + Math.random() * (max - min);
    }
    
    /**
     * Get the sky mesh group
     * @returns {THREE.Group} The sky mesh group
     */
    getMesh() {
        return this.group;
    }
    
    /**
     * Update method for animation
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime) {
        // Update all clouds
        for (const cloud of this.clouds) {
            cloud.update(deltaTime);
        }
    }
} 