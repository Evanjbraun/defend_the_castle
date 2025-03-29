import { PlayerSchema } from './PlayerSchema';
import { PlayerCamera } from '../systems/camera/PlayerCamera';
import { WoodenSword } from '../items/weapons/WoodenSword';
import { EquipmentSystem } from '../equipment/EquipmentSystem';
import * as THREE from 'three';

export class Player extends PlayerSchema {
    constructor(config = {}) {
        console.log('=== Player: Starting Constructor ===');
        super(config);

        // Initialize equipment system
        console.log('Player: Initializing equipment system');
        this.equipmentSystem = new EquipmentSystem(this);
        console.log('Player: Equipment system initialized:', this.equipmentSystem);

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

        // Create and equip the wooden sword
        const woodenSword = new WoodenSword();
        console.log('Player: Created wooden sword:', woodenSword);
        
        // Wait for the model to be ready before equipping
        if (woodenSword.model instanceof Promise) {
            console.log('Player: Waiting for sword model to load...');
            woodenSword.model.then(model => {
                console.log('Player: Sword model loaded:', model);
                if (model instanceof THREE.Group) {
                    woodenSword.model = model;
                    this.equipmentSystem.equip(woodenSword, 'MAINHAND');
                } else {
                    console.error('Player: Invalid sword model type:', model);
                }
            }).catch(error => {
                console.error('Player: Error loading sword model:', error);
                // Try to equip with fallback model if available
                if (woodenSword.model instanceof THREE.Group) {
                    console.log('Player: Using fallback sword model');
                    this.equipmentSystem.equip(woodenSword, 'MAINHAND');
                }
            });
        } else if (woodenSword.model instanceof THREE.Group) {
            // If we already have a valid model, equip immediately
            console.log('Player: Using existing sword model');
            this.equipmentSystem.equip(woodenSword, 'MAINHAND');
        } else {
            console.error('Player: No valid sword model available');
        }
        
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