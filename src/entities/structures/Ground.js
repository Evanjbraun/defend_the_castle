import * as THREE from 'three';

/**
 * Ground plane for the game world with thickness
 */
export class Ground {
    /**
     * Create a ground plane
     * @param {Object} config - Configuration options
     */
    constructor(config = {}) {
        // Ground properties
        this.size = config.size || 50;
        this.thickness = config.thickness || 10; // Ground thickness
        this.color = config.color || 0x556633;
        this.sideColor = config.sideColor || 0x443322; // Darker color for sides
        this.roughness = config.roughness || 0.8;
        this.metalness = config.metalness || 0.2;
        
        // Create mesh
        this.mesh = null;
        
        // Debug mode
        this.debug = config.debug || false;
    }
    
    /**
     * Build the ground with thickness
     * @returns {THREE.Group} The ground mesh group
     */
    build() {
        // Create a group to hold our ground components
        const groundGroup = new THREE.Group();
        groundGroup.name = 'ground_group';
        
        // Create top surface with standard material
        const topGeometry = new THREE.BoxGeometry(this.size, this.thickness, this.size);
        const topMaterial = new THREE.MeshStandardMaterial({
            color: this.color,
            roughness: this.roughness,
            metalness: this.metalness,
            side: THREE.DoubleSide // Render both sides
        });
        
        this.mesh = new THREE.Mesh(topGeometry, topMaterial);
        this.mesh.position.y = -this.thickness / 2; // Place top surface at y=0 with thickness going down
        this.mesh.receiveShadow = true;
        this.mesh.name = 'ground_top';
        this.mesh.renderOrder = 1; // Ensure ground renders after sky
        
        // Create edge side to ensure visibility from distance
        const edgeGeometry = new THREE.BoxGeometry(this.size + 2, this.thickness + 2, this.size + 2);
        const edgeMaterial = new THREE.MeshStandardMaterial({
            color: this.sideColor,
            roughness: this.roughness + 0.1,
            metalness: this.metalness - 0.1,
            side: THREE.BackSide // Only render inside
        });
        
        const edgeMesh = new THREE.Mesh(edgeGeometry, edgeMaterial);
        edgeMesh.position.y = -this.thickness / 2;
        edgeMesh.receiveShadow = true;
        edgeMesh.name = 'ground_edge';
        
        // Add both meshes to the group
        groundGroup.add(this.mesh);
        groundGroup.add(edgeMesh);
        
        // Add subtle terrain features (bumps)
        const bumpCount = Math.floor(this.size / 20);
        if (bumpCount > 0) {
            for (let i = 0; i < bumpCount; i++) {
                const bumpSize = Math.random() * 3 + 1;
                const bumpHeight = Math.random() * 0.5 + 0.2;
                
                const bumpGeometry = new THREE.SphereGeometry(bumpSize, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
                const bumpMaterial = new THREE.MeshStandardMaterial({
                    color: this.color,
                    roughness: this.roughness,
                    metalness: this.metalness
                });
                
                const bump = new THREE.Mesh(bumpGeometry, bumpMaterial);
                
                // Random position on the ground
                const posX = (Math.random() - 0.5) * (this.size - bumpSize * 2);
                const posZ = (Math.random() - 0.5) * (this.size - bumpSize * 2);
                bump.position.set(posX, 0, posZ);
                bump.receiveShadow = true;
                bump.castShadow = true;
                
                this.mesh.add(bump);
            }
        }
        
        if (this.debug) {
            console.log('Ground created with thickness:', this.thickness);
        }
        
        return groundGroup;
    }
    
    /**
     * Get the ground mesh
     * @returns {THREE.Mesh} The ground mesh
     */
    getMesh() {
        return this.mesh;
    }
} 