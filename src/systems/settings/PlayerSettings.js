export class PlayerSettings {
    constructor() {
        // Default settings
        this.settings = {
            // Camera/Mouse settings
            mouseSensitivity: 0.2,
            invertMouseY: false,
            invertMouseX: false,
            
            // Movement settings
            movementSpeed: 0.08,
            sprintMultiplier: 1.5,
            
            // Controls - Key mapping using keyboard codes
            controls: {
                moveForward: 'KeyW',
                moveBackward: 'KeyS',
                moveLeft: 'KeyA',
                moveRight: 'KeyD',
                sprint: 'ShiftLeft',
                jump: 'Space',
                openInventory: 'Tab',
                openMenu: 'Escape',
                interact: 'KeyE',
                attack: 'Mouse0', // Left mouse button
                block: 'Mouse1',  // Right mouse button
            },
            
            // Visual settings
            showCrosshair: true,
            showHUD: true,
            
            // Game settings
            difficultyLevel: 'normal', // 'easy', 'normal', 'hard'
            enableTutorialTips: true
        };
        
        // Load settings from localStorage if available
        this.loadSettings();
        
        // Listeners for settings changes
        this.listeners = [];
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
            mouseSensitivity: 0.2,
            invertMouseY: false,
            invertMouseX: false,
            movementSpeed: 0.08,
            sprintMultiplier: 1.5,
            controls: {
                moveForward: 'KeyW',
                moveBackward: 'KeyS',
                moveLeft: 'KeyA',
                moveRight: 'KeyD',
                sprint: 'ShiftLeft',
                jump: 'Space',
                openInventory: 'Tab',
                openMenu: 'Escape',
                interact: 'KeyE',
                attack: 'Mouse0',
                block: 'Mouse1',
            },
            showCrosshair: true,
            showHUD: true,
            difficultyLevel: 'normal',
            enableTutorialTips: true
        };
        
        // Notify listeners of reset
        this.notifyListeners('all', null, null);
        
        // Save settings to localStorage
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