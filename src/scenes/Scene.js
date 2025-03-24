import * as THREE from 'three';
import { CastleWalls } from '../entities/structures/CastleWalls.js';
import { Ground } from '../entities/structures/Ground.js';
import { Sky } from '../entities/environment/Sky.js';

/**
 * Main game scene
 */
export class Scene {
    /**
     * Create a new game scene
     * @param {Object} config - Configuration options
     */
    constructor(config = {}) {
        // Create scene
        this.scene = new THREE.Scene();
        
        // Components
        this.castle = null;
        this.ground = null;
        this.sky = null;
        
        // Debug mode
        this.debug = config.debug || false;
    }
    
    /**
     * Initialize the scene
     */
    init() {
        // Set scene background color
        this.scene.background = new THREE.Color(0x87CEEB);
        
        // Add fog to create distance fade effect
        this.scene.fog = new THREE.FogExp2(0x87CEEB, 0.0025);
        
        // Create sky (must be first to be in the background)
        this._createSky();
        
        // Setup lights
        this._setupLights();
        
        // Create ground
        this._createGround();
        
        // Create castle
        this._createCastle();
        
        // Handle window resize
        window.addEventListener('resize', this._onWindowResize.bind(this));
        
        if (this.debug) {
            console.log('Game scene initialized');
        }
    }
    
    /**
     * Get the THREE.Scene object
     * @returns {THREE.Scene} The scene object
     */
    getScene() {
        return this.scene;
    }
    
    /**
     * Setup scene lighting
     * @private
     */
    _setupLights() {
        // Add ambient light (brighter for outdoor scene)
        const ambientLight = new THREE.AmbientLight(0x87ceeb, 0.7); // Sky blue ambient with higher intensity
        this.scene.add(ambientLight);
        
        // Add directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffcc, 1.5);
        directionalLight.position.set(50, 200, 100);
        directionalLight.castShadow = true;
        
        // Set up shadow properties for larger world
        directionalLight.shadow.mapSize.width = 4096;
        directionalLight.shadow.mapSize.height = 4096;
        directionalLight.shadow.camera.near = 1;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.left = -200;
        directionalLight.shadow.camera.right = 200;
        directionalLight.shadow.camera.top = 200;
        directionalLight.shadow.camera.bottom = -200;
        
        this.scene.add(directionalLight);
        
        // Add a secondary light to provide more fill for clouds
        const fillLight = new THREE.DirectionalLight(0xf5f5ff, 0.6);
        fillLight.position.set(-100, 150, -50);
        this.scene.add(fillLight);
        
        // Add point lights around castle with extended range
        const pointLight1 = new THREE.PointLight(0xff9900, 1, 25);
        pointLight1.position.set(-10, 5, -10);
        this.scene.add(pointLight1);
        
        const pointLight2 = new THREE.PointLight(0xff9900, 1, 25);
        pointLight2.position.set(10, 5, -10);
        this.scene.add(pointLight2);
        
        const pointLight3 = new THREE.PointLight(0xff9900, 1, 25);
        pointLight3.position.set(0, 5, 10);
        this.scene.add(pointLight3);
    }
    
    /**
     * Create ground plane
     * @private
     */
    _createGround() {
        this.ground = new Ground({
            size: 200,
            thickness: 15,
            color: 0x556633,
            sideColor: 0x443322,
            debug: this.debug
        });
        
        const groundMesh = this.ground.build();
        this.scene.add(groundMesh);
        
        if (this.debug) {
            console.log('Ground created with size 200x200 and thickness 15');
        }
    }
    
    /**
     * Create castle
     * @private
     */
    _createCastle() {
        this.castle = new CastleWalls({
            size: 20,
            wallHeight: 8,
            debug: this.debug
        });
        
        const castleMesh = this.castle.build();
        this.scene.add(castleMesh);
    }
    
    /**
     * Handle window resize
     * @private
     */
    _onWindowResize() {
        // This is now handled by Game.js
    }
    
    /**
     * Add an object to the scene
     * @param {THREE.Object3D} object - The object to add
     */
    add(object) {
        this.scene.add(object);
    }
    
    /**
     * Remove an object from the scene
     * @param {THREE.Object3D} object - The object to remove
     */
    remove(object) {
        this.scene.remove(object);
    }
    
    /**
     * Update the scene
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
        // Update components
        if (this.castle) {
            this.castle.update(deltaTime);
        }
        
        // Update sky and clouds
        if (this.sky) {
            this.sky.update(deltaTime);
        }
    }
    
    /**
     * Clean up resources
     */
    destroy() {
        // Remove event listeners
        window.removeEventListener('resize', this._onWindowResize);
        
        // Dispose of geometries and materials
        this.scene.traverse(object => {
            if (object.geometry) {
                object.geometry.dispose();
            }
            
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });
        
        // Clear scene
        while (this.scene.children.length > 0) {
            this.scene.remove(this.scene.children[0]);
        }
        
        if (this.debug) {
            console.log('Game scene destroyed');
        }
    }
    
    /**
     * Create sky with clouds
     * @private
     */
    _createSky() {
        // Get ground size to match sky dimensions
        const groundSize = 200; // Same as in _createGround
        
        this.sky = new Sky({
            width: groundSize,
            length: groundSize,
            height: 150,
            skyColor: 0x87CEEB, // Bright sky blue
            cloudCount: 30, // More clouds
            cloudColor: 0xFFFFFF,
            cloudMinHeight: 60, // Lower minimum height
            cloudMaxHeight: 140,
            cloudMinWidth: 25, // Larger clouds
            cloudMaxWidth: 60,
            debug: this.debug
        });
        
        const skyMesh = this.sky.build();
        this.scene.add(skyMesh);
        
        if (this.debug) {
            console.log('Sky created with dimensions matching ground');
        }
    }
} 