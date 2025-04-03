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
            console.log('Goblin: Starting initialization');
            // Create the model first
            const mesh = await this.createModel();
            
            if (!mesh) {
                console.error('Goblin: Failed to create model');
                return null;
            }
            
            console.log('Goblin: Model created, adding to scene');
            // Add the mesh to the scene
            scene.add(mesh);
            
            // Create and add health bar sprite
            if (this.healthBar) {
                const healthBarSprite = this.healthBar.getSprite();
                if (healthBarSprite) {
                    scene.add(healthBarSprite);
                    console.log('Goblin: Health bar added to scene');
                }
            }
            
            // Set initial position
            if (this.position) {
                this.setPosition(this.position);
                console.log('Goblin: Position set to:', this.position);
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
            console.log('Loading goblin model from:', this.modelPath);
            const loader = new GLTFLoader();
            
            // Add loading manager to track progress
            loader.manager.onProgress = (url, loaded, total) => {
                console.log(`Loading progress: ${(loaded / total * 100).toFixed(2)}%`);
            };
            
            loader.manager.onError = (url) => {
                console.error('Error loading model:', url);
            };
            
            let gltf;
            try {
                gltf = await loader.loadAsync(this.modelPath);
                console.log('Successfully loaded goblin model');
            } catch (loadError) {
                console.error('Failed to load goblin model, creating fallback:', loadError);
                const fallbackMesh = this.createFallbackModel();
                return fallbackMesh;
            }
            
            if (!gltf) {
                console.log('No GLTF data, creating fallback model');
                const fallbackMesh = this.createFallbackModel();
                return fallbackMesh;
            }
            
            if (!gltf.scene) {
                console.log('No scene in GLTF, creating fallback model');
                const fallbackMesh = this.createFallbackModel();
                return fallbackMesh;
            }
            
            if (!gltf.scene.children || gltf.scene.children.length === 0) {
                console.log('No meshes in GLTF scene, creating fallback model');
                const fallbackMesh = this.createFallbackModel();
                return fallbackMesh;
            }
            
            // Get the main mesh
            this.mesh = gltf.scene.children[0];
            console.log('Successfully created goblin mesh');
            
            // Set up animations
            this.mixer = new THREE.AnimationMixer(this.mesh);
            
            // Store all animations
            if (gltf.animations) {
                gltf.animations.forEach(clip => {
                    const action = this.mixer.clipAction(clip);
                    this.animations[clip.name] = action;
                });
                console.log('Loaded animations:', Object.keys(this.animations));
            }

            // Set default animation (idle)
            if (this.animations[this.animationStates.idle]) {
                this.currentAnimation = this.animations[this.animationStates.idle];
                this.currentAnimation.play();
                console.log('Playing idle animation');
            } else {
                const firstAnimation = Object.values(this.animations)[0];
                if (firstAnimation) {
                    this.currentAnimation = firstAnimation;
                    this.currentAnimation.play();
                    console.log('Playing first available animation');
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
            console.error('Error in createModel:', error);
            const fallbackMesh = this.createFallbackModel();
            return fallbackMesh;
        }
    }

    createFallbackModel() {
        console.log('Creating fallback goblin model');
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
            this.healthBar.update(this.health, this.maxHealth);

            // Play hit reaction animation
            const currentTime = performance.now() / 1000;
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
        return actualDamage;
    }

    // Override die to handle death animation
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
        
        // Notify wave manager if it exists
        if (this.waveManager) {
            this.waveManager.handleGoblinDeath(this);
        }
        
        // Play death animation
        const deathAnimationName = 'CharacterArmature|Death';
        
        if (this.animations[deathAnimationName]) {
            // Stop any current animation
            if (this.currentAnimation) {
                this.currentAnimation.fadeOut(0.2);
            }
            
            // Set up death animation
            this.currentAnimation = this.animations[deathAnimationName];
            this.currentAnimation.reset();
            this.currentAnimation.setLoop(THREE.LoopOnce, 0);
            this.currentAnimation.clampWhenFinished = true;
            this.currentAnimation.fadeIn(0.2);
            this.currentAnimation.play();
            
            // Get the animation duration
            const deathDuration = this.currentAnimation.getClip().duration;
            
            // Remove the goblin after the animation completes
            setTimeout(() => {
                if (this.mesh && this.mesh.parent) {
                    this.mesh.parent.remove(this.mesh);
                }
                if (this.healthBar && this.healthBar.sprite && this.healthBar.sprite.parent) {
                    this.healthBar.sprite.parent.remove(this.healthBar.sprite);
                }
            }, deathDuration * 1000); // Convert to milliseconds
        } else {
            // If no death animation, remove immediately
            if (this.mesh && this.mesh.parent) {
                this.mesh.parent.remove(this.mesh);
            }
            if (this.healthBar && this.healthBar.sprite && this.healthBar.sprite.parent) {
                this.healthBar.sprite.parent.remove(this.healthBar.sprite);
            }
        }
    }

    setPosition(position) {
        this.position.copy(position);
        if (this.mesh) {
            this.mesh.position.copy(position);
            console.log('Goblin: Mesh position set to:', position);
        }
    }
} 