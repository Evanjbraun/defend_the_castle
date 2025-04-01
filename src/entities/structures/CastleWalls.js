import * as THREE from 'three';

/**
 * Castle walls structure for the game
 */
export class CastleWalls {
    /**
     * Create a new castle walls structure
     * @param {Object} config - Configuration options
     */
    constructor(config = {}) {
        // Castle properties
        this.castleSize = config.size || 20;
        this.wallHeight = config.wallHeight || 8;
        this.color = config.color || 0x888888;
        this.roofColor = config.roofColor || 0x883333;
        
        // Group to hold all castle parts
        this.group = new THREE.Group();
        this.group.name = 'castle_walls';
        
        // Debug mode
        this.debug = config.debug || false;

        // Create collision boxes for walls
        this.collisionBoxes = [];
    }
    
    /**
     * Build the castle structure
     */
    build() {
        // Create walls
        this._createWalls();
        
        // Create towers
        this._createTowers();
        
        if (this.debug) {
            console.log('Castle walls built');
        }
        
        return this.group;
    }
    
    /**
     * Check if a position collides with any castle walls
     * @param {THREE.Vector3} position - The position to check
     * @param {number} playerRadius - The radius of the player's collision sphere
     * @returns {boolean} - Whether there is a collision
     */
    checkCollision(position, playerRadius) {
        // Create a sphere around the player position
        const playerSphere = new THREE.Sphere(position, playerRadius);
        
        // Check each collision box
        for (const box of this.collisionBoxes) {
            // Check if the sphere intersects with the box
            if (box.intersectsSphere(playerSphere)) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * Create castle walls
     * @private
     */
    _createWalls() {
        // Create walls
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: this.color,
            roughness: 0.7,
            metalness: 0.2
        });
        
        // North wall
        const northWallGeometry = new THREE.BoxGeometry(this.castleSize, this.wallHeight, 1);
        const northWall = new THREE.Mesh(northWallGeometry, wallMaterial);
        northWall.position.set(0, this.wallHeight / 2, -this.castleSize / 2);
        northWall.castShadow = true;
        northWall.receiveShadow = true;
        this.group.add(northWall);
        
        // Add collision box for north wall
        const northBox = new THREE.Box3().setFromObject(northWall);
        northBox.expandByScalar(0.5); // Add some padding
        this.collisionBoxes.push(northBox);
        
        // South wall
        const southWallGeometry = new THREE.BoxGeometry(this.castleSize, this.wallHeight, 1);
        const southWall = new THREE.Mesh(southWallGeometry, wallMaterial);
        southWall.position.set(0, this.wallHeight / 2, this.castleSize / 2);
        southWall.castShadow = true;
        southWall.receiveShadow = true;
        this.group.add(southWall);
        
        // Add collision box for south wall
        const southBox = new THREE.Box3().setFromObject(southWall);
        southBox.expandByScalar(0.5);
        this.collisionBoxes.push(southBox);
        
        // East wall
        const eastWallGeometry = new THREE.BoxGeometry(1, this.wallHeight, this.castleSize);
        const eastWall = new THREE.Mesh(eastWallGeometry, wallMaterial);
        eastWall.position.set(this.castleSize / 2, this.wallHeight / 2, 0);
        eastWall.castShadow = true;
        eastWall.receiveShadow = true;
        this.group.add(eastWall);
        
        // Add collision box for east wall
        const eastBox = new THREE.Box3().setFromObject(eastWall);
        eastBox.expandByScalar(0.5);
        this.collisionBoxes.push(eastBox);
        
        // West wall
        const westWallGeometry = new THREE.BoxGeometry(1, this.wallHeight, this.castleSize);
        const westWall = new THREE.Mesh(westWallGeometry, wallMaterial);
        westWall.position.set(-this.castleSize / 2, this.wallHeight / 2, 0);
        westWall.castShadow = true;
        westWall.receiveShadow = true;
        this.group.add(westWall);
        
        // Add collision box for west wall
        const westBox = new THREE.Box3().setFromObject(westWall);
        westBox.expandByScalar(0.5);
        this.collisionBoxes.push(westBox);
    }
    
    /**
     * Create castle towers
     * @private
     */
    _createTowers() {
        // Create towers at each corner
        this._createTower(this.castleSize / 2, this.castleSize / 2);
        this._createTower(-this.castleSize / 2, this.castleSize / 2);
        this._createTower(this.castleSize / 2, -this.castleSize / 2);
        this._createTower(-this.castleSize / 2, -this.castleSize / 2);
    }
    
    /**
     * Create a castle tower
     * @param {number} x - X position
     * @param {number} z - Z position
     * @private
     */
    _createTower(x, z) {
        const towerGeometry = new THREE.CylinderGeometry(2, 2.5, 15, 8);
        const towerMaterial = new THREE.MeshStandardMaterial({
            color: this.color,
            roughness: 0.8,
            metalness: 0.2
        });
        
        const tower = new THREE.Mesh(towerGeometry, towerMaterial);
        tower.position.set(x, 7.5, z);
        tower.castShadow = true;
        tower.receiveShadow = true;
        
        this.group.add(tower);
        
        // Add a simple roof
        const roofGeometry = new THREE.ConeGeometry(2.5, 3, 8);
        const roofMaterial = new THREE.MeshStandardMaterial({
            color: this.roofColor,
            roughness: 0.7,
            metalness: 0.3
        });
        
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.set(0, 9, 0); // Position relative to tower
        
        // Add roof to tower
        tower.add(roof);

        // Add collision box for tower
        const towerBox = new THREE.Box3().setFromObject(tower);
        towerBox.expandByScalar(0.5); // Add some padding
        this.collisionBoxes.push(towerBox);
    }
    
    /**
     * Get the castle walls mesh group
     * @returns {THREE.Group} The castle walls mesh group
     */
    getMesh() {
        return this.group;
    }
    
    /**
     * Update method for animation or state changes
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime) {
        // Add any castle animations or state updates here
    }
} 