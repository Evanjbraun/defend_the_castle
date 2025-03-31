import * as THREE from 'three';

export class HealthBar {
    constructor() {
        // Create a canvas for the health bar
        this.canvas = document.createElement('canvas');
        this.canvas.width = 100;
        this.canvas.height = 10;
        this.ctx = this.canvas.getContext('2d');

        // Create a texture from the canvas
        this.texture = new THREE.CanvasTexture(this.canvas);
        this.texture.needsUpdate = true;

        // Create a sprite material
        this.material = new THREE.SpriteMaterial({
            map: this.texture,
            transparent: true,
            depthTest: false
        });

        // Create a sprite
        this.sprite = new THREE.Sprite(this.material);
        this.sprite.scale.set(1, 0.1, 1); // Make it wider than tall
        this.sprite.visible = false; // Hide by default
    }

    /**
     * Update the health bar with current and max health
     * @param {number} currentHealth - Current health value
     * @param {number} maxHealth - Maximum health value
     */
    update(currentHealth, maxHealth) {
        const healthPercent = currentHealth / maxHealth;
        
        // Clear the canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw background (red)
        this.ctx.fillStyle = '#ff0000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw health (green)
        this.ctx.fillStyle = '#00ff00';
        this.ctx.fillRect(0, 0, this.canvas.width * healthPercent, this.canvas.height);

        // Draw border
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(0, 0, this.canvas.width, this.canvas.height);

        // Update the texture
        this.texture.needsUpdate = true;
    }

    /**
     * Show the health bar
     */
    show() {
        this.sprite.visible = true;
    }

    /**
     * Hide the health bar
     */
    hide() {
        this.sprite.visible = false;
    }

    /**
     * Update the position of the health bar
     * @param {THREE.Vector3} position - Position to place the health bar
     */
    updatePosition(position) {
        this.sprite.position.copy(position);
        // Position slightly above the entity
        this.sprite.position.y += 0.5;
    }

    /**
     * Get the sprite for adding to the scene
     * @returns {THREE.Sprite} The health bar sprite
     */
    getSprite() {
        return this.sprite;
    }
} 