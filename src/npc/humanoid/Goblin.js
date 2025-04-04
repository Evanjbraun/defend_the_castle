import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { NPCSchema } from '../NPCSchema';
import { HealthBar } from '../../ui/HealthBar';

export class Goblin extends NPCSchema {
    constructor(config = {}) {
        // Call parent constructor with default goblin configuration
        super({
            id: config.id || 'goblin',
            name: config.name || 'Goblin',
            type: 'HUMANOID',
            level: config.level || 1,
            height: config.height || 0.5, // Goblins are shorter than humans
            scale: config.scale || 0.5,
            moveSpeed: config.moveSpeed || 0.15, // Goblins are quick
            rotationSpeed: config.rotationSpeed || 0.08,
            health: config.health || 40,
            maxHealth: config.maxHealth || 40,
            attackPower: config.attackPower || 15,
            attackRange: config.attackRange || 1.5,
            defense: config.defense || 5,
            detectionRange: config.detectionRange || 15,
            aggroRange: config.aggroRange || 8,
            stats: {
                strength: config.stats?.strength || 12,
                dexterity: config.stats?.dexterity || 14,
                vitality: config.stats?.vitality || 10,
                intelligence: config.stats?.intelligence || 8
            }
        });

        // Combat properties
        this.attackCooldown = config.attackCooldown || 1.0;
        this.lastAttackTime = config.lastAttackTime || 0;
        this.currentState = config.currentState || 'idle';

        // Goblin-specific properties
        this.modelPath = '/models/npc/goblin.glb';
        this.animations = {};
        this.currentAnimation = null;
        this.mixer = null;
        this.isDead = false;
        this.animationStates = {
            idle: 'CharacterArmature|Idle',
            walk: 'CharacterArmature|Walk',
            run: 'CharacterArmature|Run',
            attack: 'CharacterArmature|Punch',
            death: 'CharacterArmature|Death',
            hitReact: 'CharacterArmature|HitReact'
        };

        // Initialize health bar
        this.healthBar = new HealthBar();
        this.isInCombat = false;
        this.combatTimeout = null;
        this.lastHitTime = 0;
        this.hitReactionDuration = 0.5; // Duration of hit reaction in seconds

        // Set position and rotation from config
        if (config.position) {
            this.position.copy(config.position);
        }
        if (config.rotation) {
            this.rotation.copy(config.rotation);
        }
    }

    async init(scene) {
        try {
            // Create the model first
            const mesh = await this.createModel();
            
            if (!mesh) {
                return null;
            }
            
            // Add the mesh to the scene
            scene.add(mesh);
            
            // Preload death animation
            this.preloadDeathAnimation();
            
            // Create and add health bar sprite
            if (this.healthBar) {
                const healthBarSprite = this.healthBar.getSprite();
                if (healthBarSprite) {
                    scene.add(healthBarSprite);
                    
                    // Initialize health bar with current health
                    this.healthBar.update(this.health, this.maxHealth);
                    
                    // Position the health bar above the goblin's head
                    const position = this.mesh.position.clone();
                    position.y += this.height + 1.0; // Increased from 0.5 to 1.0
                    this.healthBar.updatePosition(position);
                }
            }
            
            // Set initial position
            if (this.position) {
                this.setPosition(this.position);
            }
            
            return mesh;
        } catch (error) {
            return null;
        }
    }

    async createModel() {
        try {
            const loader = new GLTFLoader();
            
            // Add loading manager to track progress
            loader.manager.onProgress = (url, loaded, total) => {
                // Progress tracking without console.log
            };
            
            loader.manager.onError = (url) => {
                // Error handling without console.log
            };
            
            let gltf;
            try {
                gltf = await loader.loadAsync(this.modelPath);
            } catch (loadError) {
                const fallbackMesh = this.createFallbackModel();
                return fallbackMesh;
            }
            
            if (!gltf) {
                const fallbackMesh = this.createFallbackModel();
                return fallbackMesh;
            }
            
            if (!gltf.scene) {
                const fallbackMesh = this.createFallbackModel();
                return fallbackMesh;
            }
            
            if (!gltf.scene.children || gltf.scene.children.length === 0) {
                const fallbackMesh = this.createFallbackModel();
                return fallbackMesh;
            }
            
            // Get the main mesh
            this.mesh = gltf.scene.children[0];
            
            // Set up animations
            this.mixer = new THREE.AnimationMixer(this.mesh);
            
            // Store all animations
            if (gltf.animations) {
                gltf.animations.forEach(clip => {
                    const action = this.mixer.clipAction(clip);
                    this.animations[clip.name] = action;
                });
                
                // Check if death animation is loaded
                const deathAnimationName = this.animationStates.death;
                if (this.animations[deathAnimationName]) {
                    // Pre-initialize the death animation
                    const deathAnimation = this.animations[deathAnimationName];
                    deathAnimation.reset();
                    deathAnimation.setLoop(THREE.LoopOnce, 0);
                    deathAnimation.clampWhenFinished = true;
                    deathAnimation.timeScale = 1.0;
                    deathAnimation.weight = 1.0;
                    deathAnimation.enabled = true;
                }
            }

            // Set default animation (idle)
            if (this.animations[this.animationStates.idle]) {
                this.currentAnimation = this.animations[this.animationStates.idle];
                this.currentAnimation.play();
            } else {
                const firstAnimation = Object.values(this.animations)[0];
                if (firstAnimation) {
                    this.currentAnimation = firstAnimation;
                    this.currentAnimation.play();
                }
            }

            // Enable shadows
            this.mesh.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            // Apply initial transformations
            this.mesh.position.copy(this.position);
            this.mesh.rotation.copy(this.rotation);
            this.mesh.scale.set(this.scale, this.scale, this.scale);

            return this.mesh;
        } catch (error) {
            const fallbackMesh = this.createFallbackModel();
            return fallbackMesh;
        }
    }

    createFallbackModel() {
        // Create a simple cylinder for the body
        const bodyGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
        const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        
        // Create a sphere for the head
        const headGeometry = new THREE.SphereGeometry(0.4, 8, 8);
        const headMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1.2;
        
        // Create a group to hold both parts
        const group = new THREE.Group();
        group.add(body);
        group.add(head);
        
        // Enable shadows
        group.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        
        return group;
    }

    // Add method to add health bar to scene when game is ready
    addHealthBarToScene() {
        if (this.pendingHealthBarSprite && window.game && window.game.scene) {
            window.game.scene.add(this.pendingHealthBarSprite);
            this.pendingHealthBarSprite = null;
        }
    }

    updateAnimation(deltaTime) {
        if (this.mixer) {
            this.mixer.update(deltaTime);
        }
    }

    // Enhanced animation handling methods
    playAnimation(name, fadeIn = 0.5, fadeOut = 0.5) {
        const animationName = this.animationStates[name];
        
        if (!animationName || !this.animations[animationName]) {
            return;
        }

        // Don't interrupt death animation
        if (this.isDead && name !== 'death') {
            return;
        }

        // Don't play hit reaction if we're dead
        if (this.isDead && name === 'hitReact') {
            return;
        }

        if (this.currentAnimation && this.currentAnimation !== this.animations[animationName]) {
            this.currentAnimation.fadeOut(fadeOut);
            this.currentAnimation = this.animations[animationName];
            this.currentAnimation.reset().fadeIn(fadeIn).play();
        } else if (!this.currentAnimation) {
            this.currentAnimation = this.animations[animationName];
            this.currentAnimation.reset().fadeIn(fadeIn).play();
        }
    }

    // Override state handlers for goblin-specific behavior
    handleIdleState() {
        this.playAnimation('idle');
    }

    handleChaseState() {
        this.playAnimation('run');
    }

    handleAttackState() {
        this.playAnimation('attack');
    }

    handleFleeState() {
        this.playAnimation('run');
    }

    // Update the goblin's state
    update(deltaTime) {
        if (this.isDead) return;
        
        // Update animations
        this.updateAnimation(deltaTime);
        
        // Update health bar position
        if (this.healthBar && this.mesh) {
            const position = this.mesh.position.clone();
            // Position the health bar higher above the goblin's head
            position.y += this.height + 1.0; // Increased from 0.5 to 1.0
            this.healthBar.updatePosition(position);
            
            // Update health bar visibility based on health percentage
            if (this.health < this.maxHealth) {
                this.healthBar.show();
                this.healthBar.update(this.health, this.maxHealth);
            } else if (!this.isInCombat) {
                this.healthBar.hide();
            }
        }
        
        // If not in combat and not playing idle, play idle animation
        if (!this.isInCombat && this.currentAnimation !== this.animations[this.animationStates.idle]) {
            this.playAnimation('idle');
        }
    }

    // Override takeDamage to update health bar and show hit reaction
    takeDamage(amount) {
        const actualDamage = super.takeDamage(amount);
        
        if (actualDamage > 0) {
            this.isInCombat = true;
            
            // Update health bar
            if (this.healthBar) {
                this.healthBar.update(this.health, this.maxHealth);
                this.healthBar.show();
            }

            // Check if goblin is dead after taking damage
            if (this.health <= 0 && !this.isDead) {
                this.die();
                return actualDamage;
            }
            
            // Only play hit reaction if not dead
            if (!this.isDead) {
                const currentTime = Date.now() / 1000;
                
                if (currentTime - this.lastHitTime >= this.hitReactionDuration) {
                    this.playAnimation('hitReact');
                    this.lastHitTime = currentTime;

                    // Return to idle after hit reaction
                    setTimeout(() => {
                        if (!this.isDead) {
                            this.playAnimation('idle');
                        }
                    }, this.hitReactionDuration * 1000);
                }

                // Clear any existing combat timeout
                if (this.combatTimeout) {
                    clearTimeout(this.combatTimeout);
                }

                // Set a new timeout to exit combat state after 5 seconds of no damage
                this.combatTimeout = setTimeout(() => {
                    this.isInCombat = false;
                    if (!this.isDead) {
                        this.playAnimation('idle');
                    }
                }, 5000);
            }
        }
        return actualDamage;
    }

    // Override die to handle death animation
    die() {
        if (this.isDead) return;
        
        this.isDead = true;
        
        // Disable physics and collisions
        if (this.body) {
            this.body.enable = false;
        }
        
        // Disable health bar updates
        if (this.healthBar) {
            this.healthBar.enabled = false;
        }
        
        // Notify the wave manager that this goblin has died
        if (this.waveManager) {
            this.waveManager.handleGoblinDeath(this);
        }
        
        // Try to play death animation using direct method
        this.playDeathAnimationDirect();
    }
    
    // Simple method to play death animation
    playDeathAnimationSimple() {
        // Check if mixer exists
        if (!this.mixer) {
            return;
        }
        
        // Get all available animations
        const allAnimations = Object.keys(this.animations);
        
        // Find death animation
        let deathAnimationName = null;
        for (const name of allAnimations) {
            if (name.toLowerCase().includes('death')) {
                deathAnimationName = name;
                break;
            }
        }
        
        // If not found by pattern, use the one from animationStates
        if (!deathAnimationName) {
            deathAnimationName = this.animationStates.death;
        }
        
        // If still not found, try the first animation
        if (!deathAnimationName || !this.animations[deathAnimationName]) {
            if (allAnimations.length > 0) {
                deathAnimationName = allAnimations[0];
            } else {
                return;
            }
        }
        
        // Get the animation
        const deathAnimation = this.animations[deathAnimationName];
        
        // Stop all other animations
        this.mixer.stopAllAction();
        
        // Configure the animation
        deathAnimation.reset();
        deathAnimation.setLoop(THREE.LoopOnce, 0);
        deathAnimation.clampWhenFinished = true;
        deathAnimation.timeScale = 1.0;
        deathAnimation.weight = 1.0;
        deathAnimation.enabled = true;
        
        // Play the animation
        deathAnimation.fadeIn(0.5);
        deathAnimation.play();
        
        // Set as current animation
        this.currentAnimation = deathAnimation;
        
        // Get the animation duration
        const deathDuration = deathAnimation.getClip().duration;
        
        // Add a delay before removing the goblin to ensure the animation is visible
        const removalDelay = Math.max(deathDuration * 1000, 3000); // At least 3 seconds
        
        // Remove the goblin after the animation completes
        setTimeout(() => {
            if (this.mesh && this.mesh.parent) {
                this.mesh.parent.remove(this.mesh);
            }
            if (this.healthBar && this.healthBar.sprite && this.healthBar.sprite.parent) {
                this.healthBar.sprite.parent.remove(this.healthBar.sprite);
            }
        }, removalDelay); // Use the longer delay
    }

    setPosition(position) {
        this.position.copy(position);
        if (this.mesh) {
            this.mesh.position.copy(position);
        }
    }

    // Method to preload death animation
    preloadDeathAnimation() {
        const deathAnimationName = this.animationStates.death;
        
        if (this.animations[deathAnimationName]) {
            // Create a hidden animation to preload
            const deathAnimation = this.animations[deathAnimationName];
            deathAnimation.reset();
            deathAnimation.setLoop(THREE.LoopOnce, 0);
            deathAnimation.clampWhenFinished = true;
            
            // Play it at 0 speed to preload
            deathAnimation.timeScale = 0;
            deathAnimation.play();
            
            // Reset it
            deathAnimation.timeScale = 1;
            deathAnimation.stop();
        }
    }

    // Method to check if death animation exists
    checkDeathAnimation() {
        const deathAnimationName = this.animationStates.death;
        
        if (this.animations[deathAnimationName]) {
            return true;
        } else {
            return false;
        }
    }

    // Method to force play death animation
    forcePlayDeathAnimation() {
        // Check if mixer exists
        if (!this.mixer) {
            return;
        }
        
        // Get all available animations
        const allAnimations = Object.keys(this.animations);
        
        // Try to find death animation by name pattern
        let deathAnimationName = null;
        for (const name of allAnimations) {
            if (name.toLowerCase().includes('death')) {
                deathAnimationName = name;
                break;
            }
        }
        
        // If not found by pattern, use the one from animationStates
        if (!deathAnimationName) {
            deathAnimationName = this.animationStates.death;
        }
        
        // If still not found, try the first animation
        if (!deathAnimationName || !this.animations[deathAnimationName]) {
            if (allAnimations.length > 0) {
                deathAnimationName = allAnimations[0];
            } else {
                return;
            }
        }
        
        // Get the animation
        const deathAnimation = this.animations[deathAnimationName];
        
        // Stop all other animations
        this.mixer.stopAllAction();
        
        // Configure the animation
        deathAnimation.reset();
        deathAnimation.setLoop(THREE.LoopOnce, 0);
        deathAnimation.clampWhenFinished = true;
        deathAnimation.timeScale = 1.0;
        deathAnimation.weight = 1.0;
        deathAnimation.enabled = true;
        
        // Play the animation
        deathAnimation.fadeIn(0.5);
        deathAnimation.play();
        
        // Set as current animation
        this.currentAnimation = deathAnimation;
        
        // Get the animation duration
        const deathDuration = deathAnimation.getClip().duration;
        
        // Add a delay before removing the goblin to ensure the animation is visible
        const removalDelay = Math.max(deathDuration * 1000, 3000); // At least 3 seconds
        
        // Remove the goblin after the animation completes
        setTimeout(() => {
            if (this.mesh && this.mesh.parent) {
                this.mesh.parent.remove(this.mesh);
            }
            if (this.healthBar && this.healthBar.sprite && this.healthBar.sprite.parent) {
                this.healthBar.sprite.parent.remove(this.healthBar.sprite);
            }
        }, removalDelay); // Use the longer delay
    }

    // Method to directly manipulate the animation mixer
    playDeathAnimationDirect() {
        // Check if mixer exists
        if (!this.mixer) {
            return;
        }
        
        // Get all available animations
        const allAnimations = Object.keys(this.animations);
        
        // Find death animation
        let deathAnimationName = null;
        for (const name of allAnimations) {
            if (name.toLowerCase().includes('death')) {
                deathAnimationName = name;
                break;
            }
        }
        
        // If not found by pattern, use the one from animationStates
        if (!deathAnimationName) {
            deathAnimationName = this.animationStates.death;
        }
        
        // If still not found, try the first animation
        if (!deathAnimationName || !this.animations[deathAnimationName]) {
            if (allAnimations.length > 0) {
                deathAnimationName = allAnimations[0];
            } else {
                return;
            }
        }
        
        // Get the animation
        const deathAnimation = this.animations[deathAnimationName];
        
        // Stop all other animations
        this.mixer.stopAllAction();
        
        // Configure the animation
        deathAnimation.reset();
        deathAnimation.setLoop(THREE.LoopOnce, 0);
        deathAnimation.clampWhenFinished = true;
        deathAnimation.timeScale = 1.0;
        deathAnimation.weight = 1.0;
        deathAnimation.enabled = true;
        
        // Play the animation
        deathAnimation.fadeIn(0.5);
        deathAnimation.play();
        
        // Set as current animation
        this.currentAnimation = deathAnimation;
        
        // Get the animation duration
        const deathDuration = deathAnimation.getClip().duration;
        
        // Add a delay before removing the goblin to ensure the animation is visible
        const removalDelay = Math.max(deathDuration * 1000, 3000); // At least 3 seconds
        
        // Remove the goblin after the animation completes
        setTimeout(() => {
            // Only remove the health bar, the goblin itself will be removed by the WaveManager
            if (this.healthBar && this.healthBar.sprite && this.healthBar.sprite.parent) {
                this.healthBar.sprite.parent.remove(this.healthBar.sprite);
            }
        }, removalDelay); // Use the longer delay
    }
} 