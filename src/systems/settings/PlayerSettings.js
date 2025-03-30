import { InputManager } from '../input/InputManager';

export class PlayerSettings {
    constructor() {
        this.inputManager = new InputManager();
        
        // Movement bindings
        this.inputManager.bindKey('w', 'MOVE_FORWARD');
        this.inputManager.bindKey('s', 'MOVE_BACKWARD');
        this.inputManager.bindKey('a', 'MOVE_LEFT');
        this.inputManager.bindKey('d', 'MOVE_RIGHT');
        
        // Mouse bindings
        this.inputManager.bindMouseButton('LEFT', 'ATTACK');
        this.inputManager.bindMouseButton('RIGHT', 'BLOCK');
        
        // Camera control
        this.inputManager.bindMouseAxis('X', 'LOOK_HORIZONTAL');
        this.inputManager.bindMouseAxis('Y', 'LOOK_VERTICAL');
        
        // Action bindings
        this.inputManager.bindKey('SPACE', 'JUMP');
        this.inputManager.bindKey('SHIFT', 'SPRINT');
        this.inputManager.bindKey('TAB', 'INVENTORY');
        this.inputManager.bindKey('ESC', 'PAUSE');
        
        // Combat settings
        this.attackCooldown = 0.5; // seconds between attacks
        this.lastAttackTime = 0;
        this.attackAnimationDuration = 0.3; // seconds for the swing animation
        this.attackAnimationProgress = 0;
        this.isAttacking = false;
        
        // Movement settings
        this.walkSpeed = 5;
        this.sprintSpeed = 8;
        this.jumpForce = 5;
        this.rotationSpeed = 0.002;
        
        // Camera settings
        this.cameraHeight = 1.6;
        this.cameraDistance = 0;
        this.minPitch = -Math.PI / 2;
        this.maxPitch = Math.PI / 2;
        
        // Default settings
        this.settings = {
            audio: {
                masterVolume: 1.0,
                musicVolume: 0.7,
                sfxVolume: 0.8
            },
            graphics: {
                quality: 'high',
                shadows: true,
                antiAliasing: true
            },
            controls: {
                mouseSensitivity: 1.0,
                invertY: false
            }
        };
        
        // Load settings from localStorage if available
        this.loadSettings();
        
        // Listeners for settings changes
        this.listeners = [];
    }
    
    /**
     * Check if the attack action is pressed and cooldown is ready
     * @returns {boolean} Whether attack should be triggered
     */
    shouldAttack() {
        const currentTime = performance.now() / 1000;
        if (this.inputManager.isMouseButtonPressed('LEFT') && 
            currentTime - this.lastAttackTime >= this.attackCooldown) {
            this.lastAttackTime = currentTime;
            this.isAttacking = true;
            this.attackAnimationProgress = 0;
            return true;
        }
        return false;
    }
    
    /**
     * Update attack animation progress
     * @param {number} deltaTime - Time since last update
     */
    updateAttackAnimation(deltaTime) {
        if (this.isAttacking) {
            this.attackAnimationProgress += deltaTime;
            if (this.attackAnimationProgress >= this.attackAnimationDuration) {
                this.isAttacking = false;
                this.attackAnimationProgress = 0;
            }
        }
    }
    
    /**
     * Get the current attack animation progress (0 to 1)
     * @returns {number} Animation progress
     */
    getAttackAnimationProgress() {
        return this.isAttacking ? 
            this.attackAnimationProgress / this.attackAnimationDuration : 0;
    }
    
    /**
     * Get the current movement direction based on input
     * @returns {Object} Movement direction vector
     */
    getMovementDirection() {
        const direction = { x: 0, z: 0 };
        
        if (this.inputManager.isKeyPressed('MOVE_FORWARD')) direction.z -= 1;
        if (this.inputManager.isKeyPressed('MOVE_BACKWARD')) direction.z += 1;
        if (this.inputManager.isKeyPressed('MOVE_LEFT')) direction.x -= 1;
        if (this.inputManager.isKeyPressed('MOVE_RIGHT')) direction.x += 1;
        
        // Normalize diagonal movement
        if (direction.x !== 0 && direction.z !== 0) {
            const length = Math.sqrt(direction.x * direction.x + direction.z * direction.z);
            direction.x /= length;
            direction.z /= length;
        }
        
        return direction;
    }
    
    /**
     * Get the current movement speed based on sprint state
     * @returns {number} Current movement speed
     */
    getMovementSpeed() {
        return this.inputManager.isKeyPressed('SPRINT') ? this.sprintSpeed : this.walkSpeed;
    }
    
    /**
     * Get the current camera rotation based on mouse movement
     * @returns {Object} Camera rotation values
     */
    getCameraRotation() {
        return {
            yaw: this.inputManager.getMouseAxis('LOOK_HORIZONTAL') * this.rotationSpeed,
            pitch: this.inputManager.getMouseAxis('LOOK_VERTICAL') * this.rotationSpeed
        };
    }
    
    /**
     * Check if jump should be triggered
     * @returns {boolean} Whether jump should be triggered
     */
    shouldJump() {
        return this.inputManager.isKeyPressed('JUMP');
    }
    
    /**
     * Check if inventory should be opened
     * @returns {boolean} Whether inventory should be opened
     */
    shouldOpenInventory() {
        return this.inputManager.isKeyPressed('INVENTORY');
    }
    
    /**
     * Check if game should be paused
     * @returns {boolean} Whether game should be paused
     */
    shouldPause() {
        return this.inputManager.isKeyPressed('PAUSE');
    }
    
    /**
     * Update input state
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime) {
        this.inputManager.update();
        this.updateAttackAnimation(deltaTime);
    }
    
    // Get a specific setting
    getSetting(category, setting) {
        if (setting) {
            // Get nested setting
            return this.settings[category]?.[setting];
        } else {
            // Get top level setting
            return this.settings[category];
        }
    }
    
    // Update a specific setting
    updateSetting(category, setting, value) {
        if (setting) {
            // Update nested setting
            if (!this.settings[category]) {
                this.settings[category] = {};
            }
            this.settings[category][setting] = value;
        } else {
            // Update top level setting
            this.settings[category] = value;
        }
        
        // Notify listeners of the change
        this.notifyListeners(category, setting, value);
        
        // Save settings to localStorage
        this.saveSettings();
        
        return true;
    }
    
    // Reset all settings to default
    resetToDefault() {
        this.settings = {
            audio: {
                masterVolume: 1.0,
                musicVolume: 0.7,
                sfxVolume: 0.8
            },
            graphics: {
                quality: 'high',
                shadows: true,
                antiAliasing: true
            },
            controls: {
                mouseSensitivity: 1.0,
                invertY: false
            }
        };
        this.saveSettings();
    }
    
    // Save settings to localStorage
    saveSettings() {
        try {
            localStorage.setItem('defendTheCastle_settings', JSON.stringify(this.settings));
        } catch (e) {
            console.error('Failed to save settings to localStorage', e);
        }
    }
    
    // Load settings from localStorage
    loadSettings() {
        try {
            const savedSettings = localStorage.getItem('defendTheCastle_settings');
            if (savedSettings) {
                const parsedSettings = JSON.parse(savedSettings);
                this.settings = { ...this.settings, ...parsedSettings };
            }
        } catch (e) {
            console.error('Failed to load settings from localStorage', e);
        }
    }
    
    // Add a listener for settings changes
    addListener(callback) {
        if (typeof callback === 'function') {
            this.listeners.push(callback);
            return this.listeners.length - 1; // Return listener index for removal
        }
        return -1;
    }
    
    // Remove a listener
    removeListener(index) {
        if (index >= 0 && index < this.listeners.length) {
            this.listeners.splice(index, 1);
            return true;
        }
        return false;
    }
    
    // Notify all listeners of a settings change
    notifyListeners(category, setting, value) {
        this.listeners.forEach(callback => {
            try {
                callback(category, setting, value);
            } catch (e) {
                console.error('Error in settings listener', e);
            }
        });
    }
} 