import { PlayerSchema } from './PlayerSchema';
import { PlayerCamera } from '../systems/camera/PlayerCamera';
import { WoodenSword } from '../items/weapons/WoodenSword';
import { EquipmentSystem } from '../equipment/EquipmentSystem';
import { PlayerSettings } from '../systems/settings/PlayerSettings';
import * as THREE from 'three';

export class Player extends PlayerSchema {
    constructor(config = {}) {
        console.log('=== Player: Starting Constructor ===');
        super(config);


        this.settings = new PlayerSettings();


        this.equipmentSystem = new EquipmentSystem(this);


        this.mesh = this.createModel();


   
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
        this.woodenSword = new WoodenSword();
        console.log('Player: Created wooden sword:', this.woodenSword);
        
        // Set the owner of the sword
        this.woodenSword.setOwner(this);
        
        // Wait for the model to be ready before equipping
        if (this.woodenSword.model instanceof Promise) {
            console.log('Player: Waiting for sword model to load...');
            this.woodenSword.model.then(model => {
                console.log('Player: Sword model loaded:', model);
                if (model instanceof THREE.Group) {
                    this.woodenSword.model = model;
                    this.equipSword();
                } else {
                    console.error('Player: Invalid sword model type:', model);
                }
            }).catch(error => {
                console.error('Player: Error loading sword model:', error);
                // Try to equip with fallback model if available
                if (this.woodenSword.model instanceof THREE.Group) {
                    console.log('Player: Using fallback sword model');
                    this.equipSword();
                }
            });
        } else if (this.woodenSword.model instanceof THREE.Group) {
            // If we already have a valid model, equip immediately
            console.log('Player: Using existing sword model');
            this.equipSword();
        } else {
            console.error('Player: No valid sword model available');
        }
        
        console.log('=== Player: Constructor Complete ===');
    }

    // New method to handle sword equipping
    equipSword() {
        console.log('Player: Equipping sword');
        if (this.camera && this.woodenSword) {
            this.equipmentSystem.equip(this.woodenSword, 'MAINHAND');
            console.log('Player: Sword equipped successfully');
        } else {
            console.error('Player: Cannot equip sword - camera or sword not ready');
            console.error('Camera:', this.camera);
            console.error('Sword:', this.woodenSword);
        }
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
        // Update input state
        this.settings.update(deltaTime);
        
        // Handle attack input
        if (this.settings.shouldAttack() && this.woodenSword) {
            this.woodenSword.startSwing();
        }
        
        // Update sword animation
        if (this.woodenSword) {
            this.woodenSword.update(deltaTime);
        }
        
        // Update camera controller (handles movement and rotation)
        if (this.cameraController) {
            this.cameraController.update();
        }
        
        // Update jump
        if (this.settings.shouldJump() && this.isGrounded) {
            this.velocity.y = this.settings.jumpForce;
            this.isGrounded = false;
        }
    }

    /**
     * Set the game instance reference
     * @param {Game} game - The game instance
     */
    setGame(game) {
        console.log('Player: Setting game instance:', game);
        this.game = game;
    }

    /**
     * Get the game instance
     * @returns {Game} The game instance
     */
    getGame() {
        return this.game;
    }
} 