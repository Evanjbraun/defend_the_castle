import * as THREE from 'three';
import { PlayerSettings } from '../settings/PlayerSettings';

export class PlayerCamera {
    constructor() {
        this.camera = null;
        this.moveSpeed = 0.15;
        this.mouseSensitivity = 0.002;
        this.isInitialized = false;
        this.eyeHeight = 1.6; // Fixed eye height above ground
        this.game = null;
        
        // Map boundaries
        this.mapBounds = {
            minX: -100,
            maxX: 100,
            minZ: -100,
            maxZ: 100
        };
        
        // Movement state
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        
        // Camera rotation
        this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        
        // Settings
        this.settings = new PlayerSettings();
        this.settingsListener = null;
    }

    init(camera, game) {
        this.camera = camera;
        this.game = game;
        
        // Set initial camera position and rotation
        this.camera.position.set(0, this.eyeHeight, 0); // Eye height of 1.6 units
        this.camera.rotation.set(0, 0, 0);

        // Update settings from PlayerSettings
        this.updateFromSettings();
        
        // Listen for settings changes
        this.settingsListener = this.settings.addListener((category, setting, value) => {
            this.updateFromSettings();
        });

        // Set up controls
        this.setupMouseControls();
        this.setupKeyboardControls();

        this.isInitialized = true;
    }
    
    // Update camera settings from PlayerSettings
    updateFromSettings() {
        // Convert UI sensitivity (0.05-1.0) to camera sensitivity (0.0005-0.01)
        this.mouseSensitivity = this.settings.getSetting('mouseSensitivity') * 0.01;
        this.moveSpeed = this.settings.getSetting('movementSpeed');
    }

    setupMouseControls() {
        // Lock pointer when clicking on the game window
        document.addEventListener('click', () => {
            // Only request pointer lock if game is not paused
            if (this.game && !this.game.isPaused) {
                document.body.requestPointerLock();
            }
        });

        // Handle mouse movement
        document.addEventListener('mousemove', (event) => {
            // Only process mouse movement if pointer is locked and game is not paused
            if (document.pointerLockElement === document.body && (!this.game || !this.game.isPaused)) {
                // Get the player mesh (camera's parent)
                const playerMesh = this.camera.parent;
                
                // Get current rotation of the player mesh
                this.euler.setFromQuaternion(playerMesh.quaternion);
                
                let movementX = event.movementX;
                let movementY = event.movementY;
                
                // Handle inverted controls if enabled
                if (this.settings.getSetting('invertMouseX')) {
                    movementX = -movementX;
                }
                
                if (this.settings.getSetting('invertMouseY')) {
                    movementY = -movementY;
                }
                
                // Update both X and Y rotation
                this.euler.y -= movementX * this.mouseSensitivity;
                this.euler.x -= movementY * this.mouseSensitivity;
                
                // Limit vertical rotation (between looking straight down and straight up)
                this.euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.euler.x));
                
                // Apply the full rotation to the player mesh
                playerMesh.quaternion.setFromEuler(this.euler);
                
                // Reset camera's local rotation since it's a child of the player mesh
                this.camera.rotation.set(0, 0, 0);
            }
        });
    }

    setupKeyboardControls() {
        // Key down events
        document.addEventListener('keydown', (event) => {
            // Don't process movement keys if game is paused
            if (this.game && this.game.isPaused) return;
            
            const controls = this.settings.getSetting('controls');
            
            switch (event.code) {
                case controls.moveForward:
                    this.moveForward = true;
                    break;
                case controls.moveBackward:
                    this.moveBackward = true;
                    break;
                case controls.moveLeft:
                    this.moveLeft = true;
                    break;
                case controls.moveRight:
                    this.moveRight = true;
                    break;
            }
        });

        // Key up events
        document.addEventListener('keyup', (event) => {
            const controls = this.settings.getSetting('controls');
            
            // Always process key up events to avoid stuck keys
            switch (event.code) {
                case controls.moveForward:
                    this.moveForward = false;
                    break;
                case controls.moveBackward:
                    this.moveBackward = false;
                    break;
                case controls.moveLeft:
                    this.moveLeft = false;
                    break;
                case controls.moveRight:
                    this.moveRight = false;
                    break;
            }
        });
    }

    // Check if a position is within map bounds
    isWithinBounds(position) {
        return position.x >= this.mapBounds.minX &&
               position.x <= this.mapBounds.maxX &&
               position.z >= this.mapBounds.minZ &&
               position.z <= this.mapBounds.maxZ;
    }

    // Clamp position to map bounds
    clampToBounds(position) {
        position.x = Math.max(this.mapBounds.minX, Math.min(this.mapBounds.maxX, position.x));
        position.z = Math.max(this.mapBounds.minZ, Math.min(this.mapBounds.maxZ, position.z));
        return position;
    }

    update() {
        if (!this.isInitialized) return;
        
        // Don't update camera movement if game is paused
        if (this.game && this.game.isPaused) return;

        // Calculate movement direction
        this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
        this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
        this.direction.normalize();

        // Get the player mesh (camera's parent)
        const playerMesh = this.camera.parent;

        // Get forward and right vectors based on player mesh rotation
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(playerMesh.quaternion);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(playerMesh.quaternion);

        // Remove any vertical component from movement vectors
        forward.y = 0;
        right.y = 0;
        forward.normalize();
        right.normalize();

        // Store current position of the player mesh
        const newPosition = playerMesh.position.clone();

        // Calculate new position
        if (this.moveForward || this.moveBackward) {
            newPosition.addScaledVector(forward, this.direction.z * this.moveSpeed);
        }
        if (this.moveLeft || this.moveRight) {
            newPosition.addScaledVector(right, this.direction.x * this.moveSpeed);
        }

        // Check if new position is within bounds
        if (this.isWithinBounds(newPosition)) {
            // Update position if within bounds
            playerMesh.position.copy(newPosition);
        } else {
            // Clamp position to bounds if outside
            playerMesh.position.copy(this.clampToBounds(newPosition));
        }

        // Keep the player mesh at ground level
        playerMesh.position.y = 0;
        
        // Set camera's world position to maintain eye height
        const worldPosition = this.camera.getWorldPosition(new THREE.Vector3());
        worldPosition.y = this.eyeHeight;
        this.camera.position.copy(this.camera.parent.worldToLocal(worldPosition));
    }

    getCamera() {
        return this.camera;
    }

    getPosition() {
        return this.camera.position;
    }

    getDirection() {
        const direction = new THREE.Vector3(0, 0, -1);
        return direction.applyQuaternion(this.camera.quaternion);
    }

    // Method to set custom map boundaries
    setMapBounds(bounds) {
        this.mapBounds = {
            ...this.mapBounds,
            ...bounds
        };
    }

    // Reset position to origin
    reset() {
        if (this.camera) {
            this.camera.position.set(0, this.eyeHeight, 0);
            this.camera.rotation.set(0, 0, 0);
            this.euler.set(0, 0, 0, 'YXZ');
        }
    }

    // Clean up resources
    dispose() {
        if (this.settingsListener !== null) {
            this.settings.removeListener(this.settingsListener);
        }
    }
}
