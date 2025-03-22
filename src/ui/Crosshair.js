export class Crosshair {
    constructor(config = {}) {
        // Default configuration
        this.config = {
            type: 'cross', // 'cross', 'dot', 'circle', 'crosshair'
            size: 16, // Overall size of the crosshair
            thickness: 2, // Thickness of the lines
            gap: 4, // Gap in the center
            color: '#ffffff', // Main color
            borderColor: '#000000', // Border color
            borderThickness: 1, // Border thickness
            opacity: 1, // Opacity of the crosshair
            dot: {
                show: true, // Show center dot
                size: 2, // Size of center dot
            },
            ...config // Override defaults with provided config
        };

        this.element = null;
        this.isInitialized = false;
    }

    init() {
        // Create container for crosshair
        this.element = document.createElement('div');
        this.element.style.position = 'fixed';
        this.element.style.top = '50%';
        this.element.style.left = '50%';
        this.element.style.transform = 'translate(-50%, -50%)';
        this.element.style.width = `${this.config.size}px`;
        this.element.style.height = `${this.config.size}px`;
        this.element.style.pointerEvents = 'none'; // Make sure it doesn't interfere with clicking
        
        // Create the crosshair parts
        this.createCrosshair();

        // Add to DOM
        document.body.appendChild(this.element);
        
        this.isInitialized = true;
    }

    createCrosshair() {
        // Create center dot if enabled
        if (this.config.dot.show) {
            const dot = document.createElement('div');
            dot.style.position = 'absolute';
            dot.style.left = '50%';
            dot.style.top = '50%';
            dot.style.width = `${this.config.dot.size}px`;
            dot.style.height = `${this.config.dot.size}px`;
            dot.style.backgroundColor = this.config.color;
            dot.style.transform = 'translate(-50%, -50%)';
            dot.style.borderRadius = '50%';
            dot.style.border = `${this.config.borderThickness}px solid ${this.config.borderColor}`;
            this.element.appendChild(dot);
        }

        // Create the lines
        const lines = ['vertical', 'horizontal'];
        lines.forEach(direction => {
            // Create line with border by using multiple elements
            const line = document.createElement('div');
            line.style.position = 'absolute';
            line.style.backgroundColor = this.config.color;
            line.style.border = `${this.config.borderThickness}px solid ${this.config.borderColor}`;
            
            if (direction === 'vertical') {
                line.style.width = `${this.config.thickness}px`;
                line.style.height = `${(this.config.size - this.config.gap) / 2}px`;
                line.style.left = '50%';
                line.style.transform = 'translateX(-50%)';
                
                // Top line
                const topLine = line.cloneNode();
                topLine.style.top = '0';
                this.element.appendChild(topLine);
                
                // Bottom line
                const bottomLine = line.cloneNode();
                bottomLine.style.bottom = '0';
                this.element.appendChild(bottomLine);
            } else {
                line.style.height = `${this.config.thickness}px`;
                line.style.width = `${(this.config.size - this.config.gap) / 2}px`;
                line.style.top = '50%';
                line.style.transform = 'translateY(-50%)';
                
                // Left line
                const leftLine = line.cloneNode();
                leftLine.style.left = '0';
                this.element.appendChild(leftLine);
                
                // Right line
                const rightLine = line.cloneNode();
                rightLine.style.right = '0';
                this.element.appendChild(rightLine);
            }
        });
    }

    updateConfig(newConfig) {
        this.config = {
            ...this.config,
            ...newConfig
        };

        // Remove old crosshair
        if (this.element) {
            this.element.innerHTML = '';
            this.createCrosshair();
        }
    }

    setOpacity(opacity) {
        if (this.element) {
            this.element.style.opacity = opacity;
        }
    }

    show() {
        if (this.element) {
            this.element.style.display = 'block';
        }
    }

    hide() {
        if (this.element) {
            this.element.style.display = 'none';
        }
    }

    getElement() {
        return this.element;
    }
} 