import * as THREE from 'three';

export class SwordAnimation {
    constructor() {
        this.isAnimating = false;
        this.startRotation = new THREE.Euler();
        this.endRotation = new THREE.Euler(0, 0, -Math.PI); // Changed from -Math.PI/2 to -Math.PI for a full 180-degree slash
        this.duration = 0.3; // Animation duration in seconds
        this.elapsedTime = 0;
        this.weapon = null;
        this.originalRotation = new THREE.Euler();
    }

    init(weaponMesh) {
        this.weapon = weaponMesh;
        // Store the original rotation
        this.originalRotation.copy(this.weapon.rotation);
    }

    startAnimation() {
        if (!this.isAnimating) {
            this.isAnimating = true;
            this.elapsedTime = 0;
            // Store current rotation as start
            this.startRotation.copy(this.weapon.rotation);
        }
    }

    update(deltaTime) {
        if (!this.isAnimating || !this.weapon) return;

        this.elapsedTime += deltaTime;
        const progress = Math.min(this.elapsedTime / this.duration, 1);

        // Swing forward
        if (progress <= 0.5) {
            // First half of animation - swing forward
            const swingProgress = progress * 2; // Scale to 0-1 for first half
            this.weapon.rotation.z = THREE.MathUtils.lerp(
                this.startRotation.z,
                this.endRotation.z,
                this.easeOutQuad(swingProgress)
            );
        } else {
            // Second half of animation - return to original position
            const returnProgress = (progress - 0.5) * 2; // Scale to 0-1 for second half
            this.weapon.rotation.z = THREE.MathUtils.lerp(
                this.endRotation.z,
                this.originalRotation.z,
                this.easeInQuad(returnProgress)
            );
        }

        // Animation complete
        if (progress >= 1) {
            this.isAnimating = false;
            this.weapon.rotation.copy(this.originalRotation);
        }
    }

    // Easing functions for smooth animation
    easeOutQuad(t) {
        return t * (2 - t);
    }

    easeInQuad(t) {
        return t * t;
    }

    isPlaying() {
        return this.isAnimating;
    }

    reset() {
        this.isAnimating = false;
        if (this.weapon) {
            this.weapon.rotation.copy(this.originalRotation);
        }
    }
} 