export class InputManager {
    constructor() {
        // Key bindings
        this.keyBindings = new Map();
        this.keyStates = new Map();
        
        // Mouse bindings
        this.mouseBindings = new Map();
        this.mouseStates = new Map();
        
        // Mouse movement
        this.mouseAxis = {
            X: 0,
            Y: 0
        };
        
        // Initialize event listeners
        this.initEventListeners();
    }
    
    /**
     * Initialize event listeners for keyboard and mouse input
     */
    initEventListeners() {
        // Keyboard events
        window.addEventListener('keydown', (event) => {
            const action = this.keyBindings.get(event.key.toLowerCase());
            if (action) {
                this.keyStates.set(action, true);
            }
        });
        
        window.addEventListener('keyup', (event) => {
            const action = this.keyBindings.get(event.key.toLowerCase());
            if (action) {
                this.keyStates.set(action, false);
            }
        });
        
        // Mouse button events
        window.addEventListener('mousedown', (event) => {
            const button = this.getMouseButtonName(event.button);
            const action = this.mouseBindings.get(button);
            if (action) {
                this.mouseStates.set(action, true);
            }
        });
        
        window.addEventListener('mouseup', (event) => {
            const button = this.getMouseButtonName(event.button);
            const action = this.mouseBindings.get(button);
            if (action) {
                this.mouseStates.set(action, false);
            }
        });
        
        // Mouse movement events
        window.addEventListener('mousemove', (event) => {
            this.mouseAxis.X = event.movementX;
            this.mouseAxis.Y = event.movementY;
        });
        
        // Lock pointer when clicking on the game window
        window.addEventListener('click', () => {
            if (document.pointerLockElement !== document.body) {
                document.body.requestPointerLock();
            }
        });
    }
    
    /**
     * Bind a key to an action
     * @param {string} key - The key to bind
     * @param {string} action - The action to bind to
     */
    bindKey(key, action) {
        this.keyBindings.set(key.toLowerCase(), action);
        this.keyStates.set(action, false);
    }
    
    /**
     * Bind a mouse button to an action
     * @param {string} button - The mouse button to bind ('LEFT', 'RIGHT', 'MIDDLE')
     * @param {string} action - The action to bind to
     */
    bindMouseButton(button, action) {
        this.mouseBindings.set(button, action);
        this.mouseStates.set(action, false);
    }
    
    /**
     * Bind a mouse axis to an action
     * @param {string} axis - The mouse axis to bind ('X' or 'Y')
     * @param {string} action - The action to bind to
     */
    bindMouseAxis(axis, action) {
        // Mouse axes are handled directly in the mousemove event
    }
    
    /**
     * Check if a key is currently pressed
     * @param {string} action - The action to check
     * @returns {boolean} Whether the key is pressed
     */
    isKeyPressed(action) {
        return this.keyStates.get(action) || false;
    }
    
    /**
     * Check if a mouse button is currently pressed
     * @param {string} action - The action to check
     * @returns {boolean} Whether the mouse button is pressed
     */
    isMouseButtonPressed(action) {
        return this.mouseStates.get(action) || false;
    }
    
    /**
     * Get the current value of a mouse axis
     * @param {string} axis - The axis to get ('X' or 'Y')
     * @returns {number} The current value of the axis
     */
    getMouseAxis(axis) {
        return this.mouseAxis[axis] || 0;
    }
    
    /**
     * Update the input state (reset mouse movement)
     */
    update() {
        // Reset mouse movement
        this.mouseAxis.X = 0;
        this.mouseAxis.Y = 0;
    }
    
    /**
     * Get the mouse button name from the button number
     * @param {number} button - The button number
     * @returns {string} The button name ('LEFT', 'RIGHT', or 'MIDDLE')
     */
    getMouseButtonName(button) {
        switch (button) {
            case 0: return 'LEFT';
            case 1: return 'MIDDLE';
            case 2: return 'RIGHT';
            default: return null;
        }
    }
} 