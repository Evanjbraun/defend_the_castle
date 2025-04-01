import * as THREE from 'three';

export class NPCSchema {
    constructor(config = {}) {
        // Basic properties
        this.id = config.id || 'npc_default';
        this.name = config.name || 'Unknown NPC';
        this.type = config.type || 'HUMANOID';
        this.level = config.level || 1;

        // Visual properties
        this.mesh = null;
        this.height = config.height || 1.8288; // Default 6 feet in meters
        this.scale = config.scale || 1.0;

        // Movement properties
        this.position = new THREE.Vector3();
        this.rotation = new THREE.Euler();
        this.moveSpeed = config.moveSpeed || 0.1;
        this.rotationSpeed = config.rotationSpeed || 0.05;
        this.isInitialized = false;

        // Combat properties
        this.health = config.health || 100;
        this.maxHealth = config.maxHealth || 100;
        this.attackPower = config.attackPower || 20;
        this.attackRange = config.attackRange || 2;
        this.defense = config.defense || 10;
        this.isAlive = true;

        // AI properties
        this.state = 'IDLE';
        this.targetEntity = null;
        this.detectionRange = config.detectionRange || 10;
        this.aggroRange = config.aggroRange || 5;

        // Stats
        this.stats = {
            strength: config.stats?.strength || 10,
            dexterity: config.stats?.dexterity || 10,
            vitality: config.stats?.vitality || 10,
            intelligence: config.stats?.intelligence || 10
        };

        // Equipment
        this.equipment = {
            mainHand: null,
            offHand: null,
            head: null,
            body: null,
            legs: null,
            feet: null
        };
    }

    // Initialize the NPC
    async init(scene) {
        if (this.isInitialized) return;
        
        try {
            await this.createModel();
            if (this.mesh && scene) {
                scene.add(this.mesh);
            }
            this.isInitialized = true;
            return this.mesh;
        } catch (error) {
            return null;
        }
    }

    // Create the NPC's 3D model - to be overridden by specific NPC types
    createModel() {
        // Method to be implemented by child classes
    }

    // Update method called every frame
    update(deltaTime) {
        if (this.isDead) return;

        // Update animations
        if (this.currentAnimation) {
            this.currentAnimation.update(deltaTime);
        }

        // Update health bar position
        if (this.healthBar) {
            this.healthBar.updatePosition(this.mesh.position);
        }

        // Update combat state
        if (this.isInCombat) {
            this.combatTimer += deltaTime;
            if (this.combatTimer >= this.combatTimeout) {
                this.exitCombat();
            }
        }
    }

    // Update NPC animations
    updateAnimation(deltaTime) {
        // To be implemented by specific NPC types
    }

    // Update AI behavior
    updateAI(deltaTime) {
        switch(this.state) {
            case 'IDLE':
                this.handleIdleState();
                break;
            case 'CHASE':
                this.handleChaseState();
                break;
            case 'ATTACK':
                this.handleAttackState();
                break;
            case 'FLEE':
                this.handleFleeState();
                break;
        }
    }

    // State handlers
    handleIdleState() {
        // Default idle behavior
    }

    handleChaseState() {
        // Default chase behavior
    }

    handleAttackState() {
        // Default attack behavior
    }

    handleFleeState() {
        // Default flee behavior
    }

    // Combat methods
    takeDamage(amount) {
        console.log(`NPCSchema: Taking damage: ${amount}`);
        const actualDamage = Math.max(0, amount - this.defense);
        this.health = Math.max(0, this.health - actualDamage);
        console.log(`NPCSchema: Health after damage: ${this.health}/${this.maxHealth}`);
        
        if (this.health <= 0 && !this.isDead) {
            console.log('NPCSchema: Health reached zero, calling die()');
            this.die();
        }
        
        return actualDamage;
    }

    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
    }

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
    }

    // Utility methods
    setPosition(x, y, z) {
        this.position.set(x, y, z);
        if (this.mesh) {
            this.mesh.position.copy(this.position);
        }
    }

    setRotation(x, y, z) {
        this.rotation.set(x, y, z);
        if (this.mesh) {
            this.mesh.rotation.copy(this.rotation);
        }
    }

    distanceTo(entity) {
        return this.position.distanceTo(entity.position);
    }

    lookAt(target) {
        if (this.mesh) {
            this.mesh.lookAt(target);
            this.rotation.copy(this.mesh.rotation);
        }
    }
} 