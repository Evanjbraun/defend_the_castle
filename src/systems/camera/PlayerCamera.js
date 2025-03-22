import * as THREE from 'three';

export class PlayerCamera {
    constructor() {
        this.camera = null;
        this.moveSpeed = 0.15;
        this.mouseSensitivity = 0.002;
        this.isInitialized = false;
        this.eyeHeight = 1.6; // Fixed eye height above ground
        
        // Map boundaries
        this.mapBounds = {
            minX: -50,
            maxX: 50,
            minZ: -50,
            maxZ: 50
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
    }

    init(camera) {
        this.camera = camera;
        
        // Set initial camera position and rotation
        this.camera.position.set(0, this.eyeHeight, 0); // Eye height of 1.6 units
        this.camera.rotation.set(0, 0, 0);

        // Set up controls
        this.setupMouseControls();
        this.setupKeyboardControls();

        this.isInitialized = true;
    }

    setupMouseControls() {
        // Lock pointer when clicking on the game window
        document.addEventListener('click', () => {
            document.body.requestPointerLock();
        });

        // Handle mouse movement
        document.addEventListener('mousemove', (event) => {
            if (document.pointerLockElement === document.body) {
                // Update camera rotation
                this.euler.setFromQuaternion(this.camera.quaternion);
                
                this.euler.y -= event.movementX * this.mouseSensitivity;
                this.euler.x -= event.movementY * this.mouseSensitivity;
                
                // Limit vertical rotation (between looking straight down and straight up)
                this.euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.euler.x));
                
                this.camera.quaternion.setFromEuler(this.euler);
            }
        });
    }

    setupKeyboardControls() {
        // Key down events
        document.addEventListener('keydown', (event) => {
            switch (event.code) {
                case 'KeyW':
                    this.moveForward = true;
                    break;
                case 'KeyS':
                    this.moveBackward = true;
                    break;
                case 'KeyA':
                    this.moveLeft = true;
                    break;
                case 'KeyD':
                    this.moveRight = true;
                    break;
            }
        });

        // Key up events
        document.addEventListener('keyup', (event) => {
            switch (event.code) {
                case 'KeyW':
                    this.moveForward = false;
                    break;
                case 'KeyS':
                    this.moveBackward = false;
                    break;
                case 'KeyA':
                    this.moveLeft = false;
                    break;
                case 'KeyD':
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

        // Calculate movement direction
        this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
        this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
        this.direction.normalize();

        // Get camera's forward and right vectors
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);

        // Remove any vertical component from movement vectors
        forward.y = 0;
        right.y = 0;
        forward.normalize();
        right.normalize();

        // Store current position
        const newPosition = this.camera.position.clone();

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
            this.camera.position.copy(newPosition);
        } else {
            // Clamp position to bounds if outside
            this.camera.position.copy(this.clampToBounds(newPosition));
        }

        // Keep the camera at fixed height
        this.camera.position.y = this.eyeHeight;
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
}
