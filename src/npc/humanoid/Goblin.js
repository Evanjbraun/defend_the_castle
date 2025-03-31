import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { NPCSchema } from '../NPCSchema';
import { HealthBar } from '../../ui/HealthBar';
import { FloatingText } from '../../ui/FloatingText';

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

        // Goblin-specific properties
        this.modelPath = '/models/npc/goblin.glb';
        this.animations = {};
        this.currentAnimation = null;
        this.mixer = null;
        this.isDead = false; // Add flag to track death state
        this.animationStates = {
            idle: 'CharacterArmature|Idle',
            walk: 'CharacterArmature|Walk',
            run: 'CharacterArmature|Run',
            attack: 'CharacterArmature|Punch',
            death: 'CharacterArmature|Death',
            hitReact: 'CharacterArmature|HitReact'
        };

        // Initialize health bar and floating text
        this.healthBar = new HealthBar();
        this.isInCombat = false;
        this.floatingTexts = [];
        this.lastDamageTime = 0;
        this.damageTextCooldown = 0.5; // Minimum time between damage texts
        this.combatTimeout = null; // For tracking when to exit combat state

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
            console.log('Goblin: Starting initialization');
            
            // Create the model first
            console.log('Goblin: Calling createModel()');
            const mesh = await this.createModel();
            console.log('Goblin: createModel() returned:', mesh);
            
            if (!mesh) {
                console.error('Goblin: Failed to create model');
                return null;
            }
            
            // Add the mesh to the scene
            console.log('Goblin: Adding mesh to scene');
            scene.add(mesh);
            console.log('Goblin: Mesh added to scene');
            
            // Create and add health bar sprite
            if (this.healthBar) {
                console.log('Goblin: Creating health bar sprite');
                const healthBarSprite = this.healthBar.getSprite();
                if (healthBarSprite) {
                    console.log('Goblin: Adding health bar sprite to scene');
                    scene.add(healthBarSprite);
                    console.log('Goblin: Health bar sprite added to scene');
                } else {
                    console.error('Goblin: Failed to create health bar sprite');
                }
            }
            
            // Set initial position
            if (this.position) {
                console.log('Goblin: Setting initial position:', this.position);
                this.setPosition(this.position);
            }
            
            // Set initial rotation
            if (this.rotation) {
                console.log('Goblin: Setting initial rotation:', this.rotation);
                this.setRotation(this.rotation);
            }
            
            console.log('Goblin: Initialization complete');
            return mesh;
        } catch (error) {
            console.error('Goblin: Error during initialization:', error);
            return null;
        }
    }

    async createModel() {
        try {
            console.log('Goblin: Loading model from:', this.modelPath);
            const loader = new GLTFLoader();
            
            // Add loading manager to track progress
            loader.manager.onProgress = (url, loaded, total) => {
                console.log(`Goblin: Loading progress: ${(loaded / total * 100).toFixed(2)}%`);
            };
            
            loader.manager.onError = (url) => {
                console.error('Goblin: Error loading:', url);
            };
            
            console.log('Goblin: Starting model load...');
            let gltf;
            try {
                gltf = await loader.loadAsync(this.modelPath);
                console.log('Goblin: Raw GLTF response:', gltf);
            } catch (loadError) {
                console.error('Goblin: Error during model loading:', loadError);
                // Create a fallback model
                console.log('Goblin: Creating fallback model');
                const fallbackMesh = this.createFallbackModel();
                console.log('Goblin: Fallback model created:', fallbackMesh);
                return fallbackMesh;
            }
            
            if (!gltf) {
                console.error('Goblin: GLTF model is undefined after loading');
                const fallbackMesh = this.createFallbackModel();
                console.log('Goblin: Fallback model created:', fallbackMesh);
                return fallbackMesh;
            }
            
            if (!gltf.scene) {
                console.error('Goblin: GLTF scene is undefined');
                const fallbackMesh = this.createFallbackModel();
                console.log('Goblin: Fallback model created:', fallbackMesh);
                return fallbackMesh;
            }
            
            if (!gltf.scene.children || gltf.scene.children.length === 0) {
                console.error('Goblin: GLTF scene has no children');
                const fallbackMesh = this.createFallbackModel();
                console.log('Goblin: Fallback model created:', fallbackMesh);
                return fallbackMesh;
            }
            
            // Get the main mesh
            this.mesh = gltf.scene.children[0];
            console.log('Goblin: Main mesh:', this.mesh);
            
            // Set up animations
            this.mixer = new THREE.AnimationMixer(this.mesh);
            
            // Log available animations with more detail
            console.log('Goblin: Available animations:', gltf.animations?.length || 0);
            if (gltf.animations) {
                gltf.animations.forEach((clip, index) => {
                    console.log(`Goblin: Animation ${index}:`, {
                        name: clip.name,
                        duration: clip.duration,
                        tracks: clip.tracks.length
                    });
                });
            }
            
            // Store all animations
            if (gltf.animations) {
                gltf.animations.forEach(clip => {
                    const action = this.mixer.clipAction(clip);
                    this.animations[clip.name] = action;
                });
            }

            // Set default animation (idle)
            if (this.animations[this.animationStates.idle]) {
                this.currentAnimation = this.animations[this.animationStates.idle];
                this.currentAnimation.play();
                console.log('Goblin: Playing idle animation');
            } else {
                console.warn('Goblin: No idle animation found, using first available animation');
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
            console.log('Goblin: Setting initial transformations');
            this.mesh.position.copy(this.position);
            this.mesh.rotation.copy(this.rotation);
            this.mesh.scale.set(this.scale, this.scale, this.scale);
            console.log('Goblin: Initial transformations applied');

            console.log('Goblin: Model loaded successfully');
            return this.mesh;
        } catch (error) {
            console.error('Goblin: Error loading model:', error);
            const fallbackMesh = this.createFallbackModel();
            console.log('Goblin: Fallback model created:', fallbackMesh);
            return fallbackMesh;
        }
    }

    createFallbackModel() {
        console.log('Goblin: Creating fallback model');
        // Create a simple humanoid shape as fallback
        const geometry = new THREE.BoxGeometry(1, 2, 1);
        const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
    }

    // Add method to add health bar to scene when game is ready
    addHealthBarToScene() {
        if (this.pendingHealthBarSprite && window.game && window.game.scene) {
            console.log('Goblin: Adding pending health bar to scene');
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
            console.warn(`Animation "${name}" not found. Available animations:`, Object.keys(this.animations));
            return;
        }

        if (this.currentAnimation && this.currentAnimation !== this.animations[animationName]) {
            this.currentAnimation.fadeOut(fadeOut);
            this.currentAnimation = this.animations[animationName];
            this.currentAnimation.reset().fadeIn(fadeIn).play();
            console.log(`Playing animation: ${animationName}`);
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
            position.y += 2; // Position above the goblin
            this.healthBar.updatePosition(position);
            
            // Update health bar visibility based on combat state
            if (this.isInCombat) {
                this.healthBar.show();
            } else {
                this.healthBar.hide();
            }
        }
        
        // Update floating texts
        this.floatingTexts = this.floatingTexts.filter(text => {
            if (text && text.mesh) {
                text.update(deltaTime);
            }
            return !text.isComplete;
        });

        // Update combat state
        if (this.isInCombat) {
            // Clear existing timeout
            if (this.combatTimeout) {
                clearTimeout(this.combatTimeout);
            }
            
            // Set new timeout to exit combat state after 5 seconds of no damage
            this.combatTimeout = setTimeout(() => {
                this.isInCombat = false;
                if (this.healthBar) {
                    this.healthBar.hide();
                }
                console.log('Goblin: Exiting combat state');
            }, 5000);
        }
        
  
    }

    // Override takeDamage to update health bar and show floating text
    takeDamage(amount) {
        console.log(`Goblin: Taking damage: ${amount}`);
        const actualDamage = super.takeDamage(amount);
        console.log(`Goblin: Actual damage after defense: ${actualDamage}`);
        
        if (actualDamage > 0) {
            console.log('Goblin: Damage taken, entering combat state');
            this.isInCombat = true;
            this.healthBar.update(this.health, this.maxHealth);
            console.log(`Goblin: Health updated to ${this.health}/${this.maxHealth}`);
            this.playAnimation('hitReact');

            // Clear any existing combat timeout
            if (this.combatTimeout) {
                clearTimeout(this.combatTimeout);
            }

            // Set a new timeout to exit combat state after 5 seconds of no damage
            this.combatTimeout = setTimeout(() => {
                console.log('Goblin: No damage for 5 seconds, exiting combat state');
                this.isInCombat = false;
            }, 5000);

            // Show floating damage text
            const currentTime = performance.now() / 1000;
            if (currentTime - this.lastDamageTime >= this.damageTextCooldown) {
                console.log('Goblin: Showing floating damage text');
                this.showDamageText(actualDamage);
                this.lastDamageTime = currentTime;
            }
        } else {
            console.log('Goblin: No damage taken, staying out of combat');
        }
        return actualDamage;
    }

    // Add method to show floating damage text
    showDamageText(amount) {
        if (!window.game || !window.game.scene) {
            console.warn('Goblin: Cannot show damage text - game scene not available');
            return;
        }

        console.log(`Goblin: Creating floating text for damage: ${amount}`);
        const position = this.mesh.position.clone();
        const text = new FloatingText(amount.toString(), position);
        this.floatingTexts.push(text);
        window.game.scene.add(text.getSprite());
        console.log('Goblin: Floating text added to scene');
    }

    // Override die to clean up floating texts and combat state
    die() {
        if (this.isDead) return;
        
        this.isDead = true;
        this.isInCombat = false;
        
        // Clear combat timeout
        if (this.combatTimeout) {
            clearTimeout(this.combatTimeout);
            this.combatTimeout = null;
        }
        
        // Hide health bar
        if (this.healthBar) {
            this.healthBar.hide();
        }
        
        // Remove all floating texts
        if (this.floatingTexts) {
            this.floatingTexts.forEach(text => {
                if (text && text.mesh) {
                    text.remove();
                }
            });
            this.floatingTexts = [];
        }
        
        // Play death animation if available
        if (this.animations[this.animationStates.death]) {
            console.log('Goblin: Playing death animation');
            this.currentAnimation = this.animations[this.animationStates.death];
            this.currentAnimation.play();
            
            // Remove the goblin from the scene after the animation completes
            this.currentAnimation.clampWhenFinished = true;
            this.currentAnimation.loop = false;
            
            // Get the animation duration
            const deathDuration = this.currentAnimation.getClip().duration;
            
            // Remove the goblin after the animation completes
            setTimeout(() => {
                if (this.mesh && this.mesh.parent) {
                    console.log('Goblin: Removing from scene');
                    this.mesh.parent.remove(this.mesh);
                }
                if (this.healthBar && this.healthBar.sprite && this.healthBar.sprite.parent) {
                    this.healthBar.sprite.parent.remove(this.healthBar.sprite);
                }
            }, deathDuration * 1000); // Convert to milliseconds
        } else {
            // If no death animation, remove immediately
            if (this.mesh && this.mesh.parent) {
                console.log('Goblin: No death animation, removing immediately');
                this.mesh.parent.remove(this.mesh);
            }
            if (this.healthBar && this.healthBar.sprite && this.healthBar.sprite.parent) {
                this.healthBar.sprite.parent.remove(this.healthBar.sprite);
            }
        }
    }
} 