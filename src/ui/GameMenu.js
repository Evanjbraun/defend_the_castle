import { PlayerSettings } from '../systems/settings/PlayerSettings';

export class GameMenu {
    constructor(game) {
        this.game = game;
        this.isVisible = false;
        this.currentMenuSection = 'main'; // main, settings, controls
        this.menuElement = null;
        this.settingsInstance = null;
        this.activeElement = null;
    }
    
    init(settingsInstance) {
        // Store reference to settings instance
        this.settingsInstance = settingsInstance || new PlayerSettings();
        
        // Create menu elements
        this.createMenuElements();
        
        console.log('Game menu initialized');
    }
    
    createMenuElements() {
        // Create main menu container
        this.menuElement = document.createElement('div');
        this.menuElement.className = 'game-menu';
        this.menuElement.style.display = 'none';
        this.menuElement.style.position = 'absolute';
        this.menuElement.style.top = '0';
        this.menuElement.style.left = '0';
        this.menuElement.style.width = '100%';
        this.menuElement.style.height = '100%';
        this.menuElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.menuElement.style.zIndex = '1000';
        this.menuElement.style.display = 'flex';
        this.menuElement.style.justifyContent = 'center';
        this.menuElement.style.alignItems = 'center';
        this.menuElement.style.flexDirection = 'column';
        this.menuElement.style.color = 'white';
        this.menuElement.style.fontFamily = 'Arial, sans-serif';
        
        // Create menu content container
        const menuContent = document.createElement('div');
        menuContent.className = 'menu-content';
        menuContent.style.width = '400px';
        menuContent.style.backgroundColor = '#222';
        menuContent.style.borderRadius = '5px';
        menuContent.style.padding = '20px';
        menuContent.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
        
        // Create menu title
        const menuTitle = document.createElement('h2');
        menuTitle.textContent = 'Game Menu';
        menuTitle.style.textAlign = 'center';
        menuTitle.style.marginBottom = '20px';
        menuTitle.style.borderBottom = '1px solid #444';
        menuTitle.style.paddingBottom = '10px';
        menuContent.appendChild(menuTitle);
        
        // Create menu section container (will be populated based on current section)
        const menuSection = document.createElement('div');
        menuSection.className = 'menu-section';
        menuContent.appendChild(menuSection);
        
        this.menuElement.appendChild(menuContent);
        document.body.appendChild(this.menuElement);
        
        // Store references for easy access
        this.menuContent = menuContent;
        this.menuTitle = menuTitle;
        this.menuSection = menuSection;
        
        // Initially hide the menu
        this.hide();
    }
    
    // Load the main menu options
    loadMainMenu() {
        this.currentMenuSection = 'main';
        this.menuTitle.textContent = 'Game Menu';
        this.menuSection.innerHTML = '';
        
        const options = [
            { label: 'Resume Game', action: () => this.hide() },
            { label: 'Settings', action: () => this.loadSettingsMenu() },
            { label: 'Controls', action: () => this.loadControlsMenu() },
            { label: 'Reset Character Position', action: () => this.resetPlayerPosition() },
            { label: 'Exit to Main Menu', action: () => this.exitToMainMenu() }
        ];
        
        this.createMenuButtons(options);
    }
    
    // Load the settings menu
    loadSettingsMenu() {
        this.currentMenuSection = 'settings';
        this.menuTitle.textContent = 'Settings';
        this.menuSection.innerHTML = '';
        
        // Create back button
        const backButton = this.createButton('Back', () => this.loadMainMenu());
        backButton.style.marginBottom = '20px';
        this.menuSection.appendChild(backButton);
        
        // Create settings options
        const settingsContainer = document.createElement('div');
        settingsContainer.className = 'settings-container';
        
        // Mouse Sensitivity slider
        const sensitivityContainer = document.createElement('div');
        sensitivityContainer.className = 'setting-item';
        sensitivityContainer.style.marginBottom = '15px';
        
        const sensitivityLabel = document.createElement('label');
        sensitivityLabel.textContent = 'Mouse Sensitivity: ';
        sensitivityLabel.style.display = 'block';
        sensitivityLabel.style.marginBottom = '5px';
        
        const sensitivityValue = document.createElement('span');
        sensitivityValue.textContent = this.settingsInstance.getSetting('mouseSensitivity');
        sensitivityValue.style.marginLeft = '10px';
        
        const sensitivitySlider = document.createElement('input');
        sensitivitySlider.type = 'range';
        sensitivitySlider.min = '0.05';
        sensitivitySlider.max = '1';
        sensitivitySlider.step = '0.05';
        sensitivitySlider.value = this.settingsInstance.getSetting('mouseSensitivity');
        sensitivitySlider.style.width = '100%';
        
        sensitivitySlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            sensitivityValue.textContent = value.toFixed(2);
            this.settingsInstance.updateSetting('mouseSensitivity', null, value);
        });
        
        sensitivityContainer.appendChild(sensitivityLabel);
        sensitivityContainer.appendChild(sensitivitySlider);
        sensitivityContainer.appendChild(sensitivityValue);
        
        // Movement Speed slider
        const movementContainer = document.createElement('div');
        movementContainer.className = 'setting-item';
        movementContainer.style.marginBottom = '15px';
        
        const movementLabel = document.createElement('label');
        movementLabel.textContent = 'Movement Speed: ';
        movementLabel.style.display = 'block';
        movementLabel.style.marginBottom = '5px';
        
        const movementValue = document.createElement('span');
        movementValue.textContent = this.settingsInstance.getSetting('movementSpeed');
        movementValue.style.marginLeft = '10px';
        
        const movementSlider = document.createElement('input');
        movementSlider.type = 'range';
        movementSlider.min = '0.02';
        movementSlider.max = '0.2';
        movementSlider.step = '0.01';
        movementSlider.value = this.settingsInstance.getSetting('movementSpeed');
        movementSlider.style.width = '100%';
        
        movementSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            movementValue.textContent = value.toFixed(2);
            this.settingsInstance.updateSetting('movementSpeed', null, value);
        });
        
        movementContainer.appendChild(movementLabel);
        movementContainer.appendChild(movementSlider);
        movementContainer.appendChild(movementValue);
        
        // Invert Mouse Y checkbox
        const invertYContainer = document.createElement('div');
        invertYContainer.className = 'setting-item';
        invertYContainer.style.marginBottom = '15px';
        
        const invertYLabel = document.createElement('label');
        invertYLabel.style.display = 'flex';
        invertYLabel.style.alignItems = 'center';
        
        const invertYCheckbox = document.createElement('input');
        invertYCheckbox.type = 'checkbox';
        invertYCheckbox.checked = this.settingsInstance.getSetting('invertMouseY');
        invertYCheckbox.style.marginRight = '10px';
        
        invertYCheckbox.addEventListener('change', (e) => {
            this.settingsInstance.updateSetting('invertMouseY', null, e.target.checked);
        });
        
        invertYLabel.appendChild(invertYCheckbox);
        invertYLabel.appendChild(document.createTextNode('Invert Mouse Y'));
        invertYContainer.appendChild(invertYLabel);
        
        // Difficulty level select
        const difficultyContainer = document.createElement('div');
        difficultyContainer.className = 'setting-item';
        difficultyContainer.style.marginBottom = '15px';
        
        const difficultyLabel = document.createElement('label');
        difficultyLabel.textContent = 'Difficulty Level: ';
        difficultyLabel.style.display = 'block';
        difficultyLabel.style.marginBottom = '5px';
        
        const difficultySelect = document.createElement('select');
        difficultySelect.style.width = '100%';
        difficultySelect.style.padding = '5px';
        difficultySelect.style.backgroundColor = '#333';
        difficultySelect.style.color = 'white';
        difficultySelect.style.border = '1px solid #555';
        
        const difficulties = ['easy', 'normal', 'hard'];
        difficulties.forEach(difficulty => {
            const option = document.createElement('option');
            option.value = difficulty;
            option.textContent = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
            if (difficulty === this.settingsInstance.getSetting('difficultyLevel')) {
                option.selected = true;
            }
            difficultySelect.appendChild(option);
        });
        
        difficultySelect.addEventListener('change', (e) => {
            this.settingsInstance.updateSetting('difficultyLevel', null, e.target.value);
        });
        
        difficultyContainer.appendChild(difficultyLabel);
        difficultyContainer.appendChild(difficultySelect);
        
        // Add all settings to container
        settingsContainer.appendChild(sensitivityContainer);
        settingsContainer.appendChild(movementContainer);
        settingsContainer.appendChild(invertYContainer);
        settingsContainer.appendChild(difficultyContainer);
        
        // Reset to defaults button
        const resetButton = this.createButton('Reset to Defaults', () => {
            this.settingsInstance.resetToDefault();
            this.loadSettingsMenu(); // Reload the menu to update values
        });
        resetButton.style.marginTop = '20px';
        
        settingsContainer.appendChild(resetButton);
        this.menuSection.appendChild(settingsContainer);
    }
    
    // Load the controls menu
    loadControlsMenu() {
        this.currentMenuSection = 'controls';
        this.menuTitle.textContent = 'Controls';
        this.menuSection.innerHTML = '';
        
        // Create back button
        const backButton = this.createButton('Back', () => this.loadMainMenu());
        backButton.style.marginBottom = '20px';
        this.menuSection.appendChild(backButton);
        
        // Create controls display
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'controls-container';
        
        const controls = this.settingsInstance.getSetting('controls');
        const controlsList = [
            { key: 'moveForward', label: 'Move Forward' },
            { key: 'moveBackward', label: 'Move Backward' },
            { key: 'moveLeft', label: 'Move Left' },
            { key: 'moveRight', label: 'Move Right' },
            { key: 'sprint', label: 'Sprint' },
            { key: 'jump', label: 'Jump' },
            { key: 'interact', label: 'Interact' },
            { key: 'openInventory', label: 'Open Inventory' },
            { key: 'attack', label: 'Attack' },
            { key: 'block', label: 'Block' },
            { key: 'openMenu', label: 'Open Menu' }
        ];
        
        controlsList.forEach(control => {
            const controlItem = document.createElement('div');
            controlItem.className = 'control-item';
            controlItem.style.display = 'flex';
            controlItem.style.justifyContent = 'space-between';
            controlItem.style.margin = '10px 0';
            controlItem.style.padding = '5px 0';
            controlItem.style.borderBottom = '1px solid #444';
            
            const controlLabel = document.createElement('span');
            controlLabel.textContent = control.label;
            
            const controlKey = document.createElement('span');
            controlKey.textContent = this.formatKeyCode(controls[control.key]);
            controlKey.style.padding = '2px 8px';
            controlKey.style.backgroundColor = '#333';
            controlKey.style.borderRadius = '3px';
            
            controlItem.appendChild(controlLabel);
            controlItem.appendChild(controlKey);
            controlsContainer.appendChild(controlItem);
        });
        
        this.menuSection.appendChild(controlsContainer);
        
        // Note: We're not implementing control remapping in this version
        const remapNote = document.createElement('p');
        remapNote.textContent = 'Control remapping functionality will be available in a future update.';
        remapNote.style.marginTop = '20px';
        remapNote.style.fontStyle = 'italic';
        remapNote.style.opacity = '0.7';
        this.menuSection.appendChild(remapNote);
    }
    
    // Helper function to create menu buttons
    createMenuButtons(options) {
        options.forEach((option, index) => {
            const button = this.createButton(option.label, option.action);
            
            // Highlight the first button
            if (index === 0) {
                button.classList.add('active');
                this.activeElement = button;
            }
            
            this.menuSection.appendChild(button);
        });
    }
    
    // Create a button element with styles
    createButton(text, clickHandler) {
        const button = document.createElement('button');
        button.textContent = text;
        button.className = 'menu-button';
        button.style.display = 'block';
        button.style.width = '100%';
        button.style.padding = '12px';
        button.style.margin = '8px 0';
        button.style.backgroundColor = '#444';
        button.style.color = 'white';
        button.style.border = 'none';
        button.style.borderRadius = '4px';
        button.style.fontSize = '16px';
        button.style.cursor = 'pointer';
        button.style.transition = 'background-color 0.2s';
        
        button.addEventListener('mouseover', () => {
            button.style.backgroundColor = '#666';
        });
        
        button.addEventListener('mouseout', () => {
            if (button !== this.activeElement) {
                button.style.backgroundColor = '#444';
            }
        });
        
        button.addEventListener('click', clickHandler);
        
        return button;
    }
    
    // Format key code for display
    formatKeyCode(code) {
        if (!code) return 'Unassigned';
        
        switch(code) {
            case 'KeyW': return 'W';
            case 'KeyA': return 'A';
            case 'KeyS': return 'S';
            case 'KeyD': return 'D';
            case 'KeyE': return 'E';
            case 'ShiftLeft': return 'Shift';
            case 'Space': return 'Space';
            case 'Tab': return 'Tab';
            case 'Escape': return 'Esc';
            case 'Mouse0': return 'Left Click';
            case 'Mouse1': return 'Right Click';
            default: return code;
        }
    }
    
    // Handle keyboard navigation within the menu
    // This doesn't handle Escape key anymore as Game.js handles that
    // Other menu navigation keys can be added here if needed
    
    // Show the menu
    show() {
        this.menuElement.style.display = 'flex';
        this.isVisible = true;
        this.loadMainMenu();
    }
    
    // Hide the menu
    hide() {
        this.menuElement.style.display = 'none';
        this.isVisible = false;
    }
    
    // Reset player position
    resetPlayerPosition() {
        if (this.game && this.game.playerCamera) {
            this.game.playerCamera.reset();
            this.hide();
        }
    }
    
    // Exit to main menu (placeholder)
    exitToMainMenu() {
        // This would typically reset the game state and show the main title screen
        console.log("Exit to main menu - not implemented");
        
        // For now, just hide the menu
        this.hide();
    }
    
    // Update method to be called from game loop
    update() {
        // We could add animations or other dynamic elements here
    }
} 