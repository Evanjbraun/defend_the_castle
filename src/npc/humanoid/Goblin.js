import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { NPCSchema } from '../NPCSchema';

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

        // Set position and rotation from config
        if (config.position) {
            this.position.copy(config.position);
        }
        if (config.rotation) {
            this.rotation.copy(config.rotation);
        }
    }

    async createModel() {
        try {
            console.log('Loading goblin model from:', this.modelPath);
            const loader = new GLTFLoader();
            const gltf = await loader.loadAsync(this.modelPath);
            
            // Get the main mesh
            this.mesh = gltf.scene.children[0];
            
            // Set up animations
            this.mixer = new THREE.AnimationMixer(this.mesh);
            
            // Log available animations with more detail
            console.log('=== Goblin Animations ===');
            console.log('Total animations:', gltf.animations.length);
            gltf.animations.forEach((clip, index) => {
                console.log(`Animation ${index}:`, {
                    name: clip.name,
                    duration: clip.duration,
                    tracks: clip.tracks.length
                });
            });
            
            // Store all animations
            gltf.animations.forEach(clip => {
                const action = this.mixer.clipAction(clip);
                this.animations[clip.name] = action;
            });

            // Set default animation (idle)
            if (this.animations[this.animationStates.idle]) {
                this.currentAnimation = this.animations[this.animationStates.idle];
                this.currentAnimation.play();
                console.log('Playing idle animation');
            } else {
                console.warn('No idle animation found, using first available animation');
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

            console.log('Goblin model loaded successfully');
            return this.mesh;
        } catch (error) {
            console.error('Error loading goblin model:', error);
            throw error;
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

    die() {
        if (this.isDead) return; // Prevent multiple death calls
        
        this.isDead = true;
        super.die();
        
        // Only play death animation if it exists
        if (this.animations[this.animationStates.death]) {
            this.playAnimation('death');
            // Set up a one-time callback when death animation finishes
            this.currentAnimation.clampWhenFinished = true;
            this.currentAnimation.loop = THREE.LoopOnce;
            this.currentAnimation.play();
        } else {
            console.warn('Death animation not found, falling back to idle');
            this.playAnimation('idle');
        }
    }

    // Add method to handle hit reactions
    takeDamage(amount) {
        const actualDamage = super.takeDamage(amount);
        if (actualDamage > 0 && !this.isDead) {
            this.playAnimation('hitReact');
        }
        return actualDamage;
    }
} 