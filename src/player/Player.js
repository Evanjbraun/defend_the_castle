import { PlayerSchema } from './PlayerSchema';
import { PlayerCamera } from '../systems/camera/PlayerCamera';
import { WoodenSword } from '../items/weapons/WoodenSword';
import * as THREE from 'three';

export class Player extends PlayerSchema {
    constructor(config = {}) {
        console.log('=== Player: Starting Constructor ===');
        super(config);

        // Create the player's model
        console.log('Player: Creating model');
        this.mesh = this.createModel();
        console.log('Player: Model created:', this.mesh);

        // Initialize camera
        console.log('Player: Creating camera');
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            2000
        );
        console.log('Player: Camera created:', this.camera);

        // Position camera at head level and make it a child of the player mesh
        this.camera.position.set(0, 1.6, 0);
        this.mesh.add(this.camera);

        this.cameraController = new PlayerCamera();
        this.cameraController.init(this.camera, this);


        // Create and equip wooden sword
        console.log('Player: Creating wooden sword');
        const woodenSword = new WoodenSword();
        console.log('Player: Wooden sword created:', woodenSword);
        
        // Create the 3D model for the sword
        console.log('Player: Creating sword model');
        woodenSword.model = woodenSword.createModel();
        console.log('Player: Sword model created:', woodenSword.model);
        
        // Equip the sword
        console.log('Player: Equipping wooden sword');
        this.equipment.equip(woodenSword, 'MAINHAND');
        console.log('=== Player: Constructor Complete ===');
    }

    /**
     * Get the camera instance
     * @returns {THREE.PerspectiveCamera} The player's camera
     */
    getCamera() {
        return this.camera;
    }

    /**
     * Initialize player controls and input handling
     */
    initControls() {

        // We'll implement this later with proper input handling
    }

    /**
     * Handle player input
     * @param {number} deltaTime - Time since last update
     */
    handleInput(deltaTime) {
        // We'll implement this later with proper input handling
        if (this.controls) {
            this.controls.update(deltaTime);
        }
    }

    /**
     * Update the player's state
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime) {
  
        super.update(deltaTime);
        
        // Handle input
        this.handleInput(deltaTime);
        
        // Update camera controller
        if (this.cameraController) {
         
            this.cameraController.update();
        }
       
    }
} 