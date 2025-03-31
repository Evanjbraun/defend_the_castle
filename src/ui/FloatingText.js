import * as THREE from 'three';

export class FloatingText {
    constructor(text, position, color = '#ff0000') {
        // Create canvas for text
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;

        // Set up text style
        context.font = 'bold 32px Arial';
        context.fillStyle = color;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, canvas.width / 2, canvas.height / 2);

        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;

        // Create sprite material
        const material = new THREE.SpriteMaterial({ map: texture });
        material.transparent = true;

        // Create sprite
        this.sprite = new THREE.Sprite(material);
        this.sprite.position.copy(position);
        this.sprite.position.y += 1.5; // Position above the target
        this.sprite.scale.set(1, 0.25, 1);

        // Animation properties
        this.lifetime = 1.0; // Total lifetime in seconds
        this.currentTime = 0;
        this.velocity = new THREE.Vector3(0, 0.5, 0); // Move upward
        this.fadeStart = 0.7; // When to start fading out
    }

    update(deltaTime) {
        this.currentTime += deltaTime;
        
        // Update position
        this.sprite.position.add(this.velocity.clone().multiplyScalar(deltaTime));

        // Fade out
        if (this.currentTime > this.fadeStart) {
            const fadeProgress = (this.currentTime - this.fadeStart) / (this.lifetime - this.fadeStart);
            this.sprite.material.opacity = 1 - fadeProgress;
        }

        // Check if expired
        return this.currentTime < this.lifetime;
    }

    getSprite() {
        return this.sprite;
    }
} 