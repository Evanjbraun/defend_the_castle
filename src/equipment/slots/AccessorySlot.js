import { EquipmentSlot } from './EquipmentSlot.js';
import * as THREE from 'three';

/**
 * Specialized equipment slot for accessories like rings, amulets, etc.
 */
export class AccessorySlot extends EquipmentSlot {
    /**
     * Create a new accessory slot
     * @param {Object} config - Configuration object
     */
    constructor(config = {}) {
        // Set default accessory-specific properties
        const accessoryConfig = {
            ...config,
            type: 'ACCESSORY',
            acceptsOnly: ['ACCESSORY'],
            // Default to RING if not specified
            slotType: config.slotType || 'RING',
        };
        
        super(accessoryConfig);
        
        // Accessory-specific properties
        this.accessoryType = config.accessoryType || this.slotType;
        this.unique = config.unique !== undefined ? config.unique : false; // Whether only one of this type can be equipped
        this.index = config.index || 0; // For multiple slots of same type (e.g., ring1, ring2)
        
        // Visual properties
        this.effectParticles = null;
        this.glowColor = config.glowColor || null;
        this.pulseEffect = config.pulseEffect !== false;
        
        // For activation-based accessories
        this.cooldown = 0;
        this.maxCooldown = config.cooldown || 0;
        this.isActive = false;
    }
    
    /**
     * Override the canAccept method to handle accessory-specific requirements
     * @param {Object} item - The item to check
     * @returns {boolean} Whether the item can be equipped in this slot
     */
    canAccept(item) {
        // First check the basic acceptance using the parent method
        if (!super.canAccept(item)) {
            return false;
        }
        
        // Check if this is the right accessory slot type for this item
        if (item.accessoryType && item.accessoryType !== this.accessoryType) {
            return false;
        }
        
        // Check for unique restrictions
        if (this.unique && this.owner) {
            // Check if there's another slot with the same item equipped
            const equipment = this.owner.equipment;
            if (equipment) {
                const slots = equipment.getAllSlots();
                for (const slot of slots) {
                    if (slot !== this && slot.item && slot.item.id === item.id && slot.unique) {
                        return false; // Already equipped in another unique slot
                    }
                }
            }
        }
        
        return true;
    }
    
    /**
     * Handle special logic for setting an accessory in this slot
     * @param {Object} item - The accessory to equip
     * @param {number} quantity - The quantity to set (usually 1 for accessories)
     * @returns {boolean} Whether the item was successfully set
     */
    setItem(item, quantity = 1) {
        if (!this.canAccept(item)) {
            return false;
        }
        
        // Regular equip using parent method
        const success = super.setItem(item, quantity);
        
        if (success) {
            // Update the visual representation
            this.updateAccessoryVisual(item);
            
            // Initialize any special effects
            if (item.hasPassiveEffect) {
                this.initializePassiveEffect(item);
            }
            
            // Reset cooldown if it's an activatable item
            if (item.cooldown) {
                this.maxCooldown = item.cooldown;
                this.cooldown = 0;
            }
            
            // Notify character of accessory change
            this.dispatchEvent({ 
                type: 'accessory_equipped', 
                slot: this, 
                item
            });
        }
        
        return success;
    }
    
    /**
     * Handle special logic for clearing an accessory from this slot
     * @returns {boolean} Whether the accessory was successfully cleared
     */
    clearItem() {
        if (this.item && this.item.cursed) {
            // Cannot remove cursed items
            return false;
        }
        
        const hadItem = this.item !== null;
        const item = this.item;
        
        // Use parent method to clear the item
        const success = super.clearItem();
        
        if (success && hadItem) {
            // Stop any ongoing effects
            this.removeAccessoryVisual();
            this.clearPassiveEffect();
            
            // Reset cooldown and active state
            this.cooldown = 0;
            this.isActive = false;
            
            // Notify character of accessory removal
            this.dispatchEvent({ 
                type: 'accessory_removed', 
                slot: this, 
                item
            });
        }
        
        return success;
    }
    
    /**
     * Update the visual representation of the accessory
     * @param {Object} accessoryItem - The equipped accessory
     * @private
     */
    updateAccessoryVisual(accessoryItem) {
        if (!accessoryItem || !this.owner || !this.owner.model) {
            return;
        }
        
        // Remove any existing visual
        this.removeAccessoryVisual();
        
        // Get the attachment point for this accessory slot
        const attachmentPoint = this.getAttachmentPoint();
        if (!attachmentPoint) {
            return;
        }
        
        // Create accessory mesh
        const accessoryMesh = this.createAccessoryMesh(accessoryItem);
        if (!accessoryMesh) {
            return;
        }
        
        // Apply special effects for magical/rare items
        if (accessoryItem.rarity !== 'COMMON' || accessoryItem.isMagical) {
            this.applyMagicEffects(accessoryMesh, accessoryItem);
        }
        
        // Add the accessory mesh to the attachment point
        attachmentPoint.add(accessoryMesh);
    }
    
    /**
     * Remove the visual representation of the accessory
     * @private
     */
    removeAccessoryVisual() {
        if (!this.owner || !this.owner.model) {
            return;
        }
        
        const attachmentPoint = this.getAttachmentPoint();
        if (!attachmentPoint) {
            return;
        }
        
        // Remove accessory meshes
        for (let i = attachmentPoint.children.length - 1; i >= 0; i--) {
            const child = attachmentPoint.children[i];
            if (child.name.includes('accessory')) {
                attachmentPoint.remove(child);
            }
        }
        
        // Remove particle effects
        if (this.effectParticles) {
            this.owner.model.remove(this.effectParticles);
            this.effectParticles = null;
        }
    }
    
    /**
     * Get the attachment point for this accessory slot
     * @returns {THREE.Object3D|null} The attachment point object
     * @private
     */
    getAttachmentPoint() {
        if (!this.owner || !this.owner.model) {
            return null;
        }
        
        // Map slot types to bone names
        const boneMap = {
            RING: this.index === 0 ? 'finger_L' : 'finger_R',
            AMULET: 'neck',
            BRACELET: this.index === 0 ? 'wrist_L' : 'wrist_R',
            EARRING: this.index === 0 ? 'ear_L' : 'ear_R',
            BELT: 'waist',
            TRINKET: 'hip'
        };
        
        const boneName = boneMap[this.accessoryType] || 'spine1';
        return this.owner.model.getObjectByName(boneName) || null;
    }
    
    /**
     * Create a mesh for the accessory item
     * @param {Object} accessoryItem - The accessory item
     * @returns {THREE.Object3D|null} The created mesh
     * @private
     */
    createAccessoryMesh(accessoryItem) {
        if (!accessoryItem) {
            return null;
        }
        
        // This is a simplified version. In a real game, you would load the model from files
        let geometry, material;
        
        // Create a simple mesh based on accessory type
        switch (this.accessoryType) {
            case 'RING':
                geometry = new THREE.TorusGeometry(0.1, 0.02, 8, 16);
                break;
            case 'AMULET':
                geometry = new THREE.CylinderGeometry(0.1, 0.1, 0.01, 16);
                break;
            case 'BRACELET':
                geometry = new THREE.TorusGeometry(0.2, 0.02, 8, 16);
                break;
            case 'EARRING':
                geometry = new THREE.SphereGeometry(0.05, 8, 8);
                break;
            case 'BELT':
                geometry = new THREE.BoxGeometry(0.5, 0.05, 0.05);
                break;
            case 'TRINKET':
                geometry = new THREE.BoxGeometry(0.1, 0.1, 0.02);
                break;
            default:
                geometry = new THREE.SphereGeometry(0.05, 8, 8);
        }
        
        // Create material based on rarity and type
        material = this.getAccessoryMaterial(accessoryItem);
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = `accessory_${this.accessoryType}_${accessoryItem.id}`;
        
        return mesh;
    }
    
    /**
     * Get the material for an accessory based on its properties
     * @param {Object} accessoryItem - The accessory item
     * @returns {THREE.Material} The created material
     * @private
     */
    getAccessoryMaterial(accessoryItem) {
        let color = 0xcccccc; // Default silver
        let metalness = 0.8;
        let roughness = 0.2;
        
        // Adjust based on material type
        if (accessoryItem.materialType) {
            switch (accessoryItem.materialType.toUpperCase()) {
                case 'GOLD':
                    color = 0xffcc00;
                    metalness = 1.0;
                    roughness = 0.1;
                    break;
                case 'SILVER':
                    color = 0xeeeeee;
                    metalness = 0.9;
                    roughness = 0.15;
                    break;
                case 'COPPER':
                    color = 0xdd7744;
                    metalness = 0.8;
                    roughness = 0.2;
                    break;
                case 'IRON':
                    color = 0x999999;
                    metalness = 0.7;
                    roughness = 0.3;
                    break;
                case 'CRYSTAL':
                    color = 0x88ccff;
                    metalness = 0.3;
                    roughness = 0.0;
                    break;
                case 'GEM':
                    // Use color based on item's gem color
                    color = accessoryItem.gemColor || 0xff0000;
                    metalness = 0.2;
                    roughness = 0.1;
                    break;
            }
        }
        
        // Adjust based on rarity
        if (accessoryItem.rarity) {
            switch (accessoryItem.rarity) {
                case 'UNCOMMON':
                    color = this.blendColors(color, 0x00ff00, 0.2);
                    break;
                case 'RARE':
                    color = this.blendColors(color, 0x0088ff, 0.3);
                    break;
                case 'EPIC':
                    color = this.blendColors(color, 0xaa00ff, 0.4);
                    break;
                case 'LEGENDARY':
                    color = this.blendColors(color, 0xff8800, 0.5);
                    break;
            }
        }
        
        return new THREE.MeshStandardMaterial({
            color,
            metalness,
            roughness,
            name: `material_${accessoryItem.id}`
        });
    }
    
    /**
     * Apply special effects to magical accessories
     * @param {THREE.Object3D} mesh - The accessory mesh
     * @param {Object} item - The accessory item
     * @private
     */
    applyMagicEffects(mesh, item) {
        if (!mesh || !item) {
            return;
        }
        
        // Add emissive glow
        let glowColor;
        
        if (item.elementalType) {
            // Element-based color
            switch (item.elementalType.toUpperCase()) {
                case 'FIRE': glowColor = 0xff4400; break;
                case 'ICE': glowColor = 0x44aaff; break;
                case 'LIGHTNING': glowColor = 0xffff00; break;
                case 'POISON': glowColor = 0x00ff00; break;
                case 'SHADOW': glowColor = 0x800080; break;
                case 'HOLY': glowColor = 0xffffaa; break;
                default: glowColor = 0xffffff;
            }
        } else {
            // Rarity-based color
            switch (item.rarity) {
                case 'UNCOMMON': glowColor = 0x00cc00; break;
                case 'RARE': glowColor = 0x0088ff; break;
                case 'EPIC': glowColor = 0xaa00ff; break;
                case 'LEGENDARY': glowColor = 0xff8800; break;
                default: glowColor = 0xffffff;
            }
        }
        
        // Apply emissive glow
        mesh.traverse(child => {
            if (child.material) {
                const material = child.material;
                
                if (Array.isArray(material)) {
                    material.forEach(mat => {
                        mat.emissive = new THREE.Color(glowColor);
                        mat.emissiveIntensity = 0.3;
                    });
                } else {
                    material.emissive = new THREE.Color(glowColor);
                    material.emissiveIntensity = 0.3;
                }
            }
        });
        
        // Create particle effect if item has special properties
        if (item.hasMagicAura || item.hasPassiveEffect) {
            this.createParticleEffect(glowColor);
        }
        
        // Store the glow color for later use
        this.glowColor = glowColor;
    }
    
    /**
     * Create a particle effect around the accessory
     * @param {number} color - Color of the particles
     * @private
     */
    createParticleEffect(color) {
        if (!this.owner || !this.owner.model) {
            return;
        }
        
        // Simple particle system - in a real game, this would be more sophisticated
        const particleCount = 20;
        const positions = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            positions[i3] = (Math.random() - 0.5) * 0.3;
            positions[i3 + 1] = (Math.random() - 0.5) * 0.3;
            positions[i3 + 2] = (Math.random() - 0.5) * 0.3;
        }
        
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        
        const material = new THREE.PointsMaterial({
            color,
            size: 0.02,
            transparent: true,
            opacity: 0.6
        });
        
        const particles = new THREE.Points(geometry, material);
        particles.name = `effect_${this.id}`;
        
        // Find the attachment point for positioning
        const attachmentPoint = this.getAttachmentPoint();
        if (attachmentPoint) {
            // Position the particles at the attachment point's world position
            attachmentPoint.updateWorldMatrix(true, false);
            const worldPosition = new THREE.Vector3();
            attachmentPoint.getWorldPosition(worldPosition);
            
            particles.position.copy(worldPosition);
            this.owner.model.add(particles);
            this.effectParticles = particles;
            
            // Animate the particles
            this.animateParticles(particles);
        }
    }
    
    /**
     * Animate the particle effect
     * @param {THREE.Points} particles - The particle system
     * @private
     */
    animateParticles(particles) {
        if (!particles) {
            return;
        }
        
        // Simple animation - in a real game, this would use the game's animation system
        let time = 0;
        const animate = () => {
            time += 0.01;
            
            const positions = particles.geometry.attributes.position.array;
            for (let i = 0; i < positions.length; i += 3) {
                // Circle around center
                const angle = time + i * 0.1;
                const radius = 0.1 + Math.sin(time * 0.5 + i * 0.2) * 0.05;
                positions[i] = Math.sin(angle) * radius * (1 + i * 0.01);
                positions[i + 1] = Math.cos(angle) * radius * (1 + i * 0.01);
                positions[i + 2] = Math.sin(time + i) * 0.05;
            }
            particles.geometry.attributes.position.needsUpdate = true;
            
            // Pulse opacity
            particles.material.opacity = 0.4 + Math.sin(time * 2) * 0.2;
            
            requestAnimationFrame(animate);
        };
        
        animate();
    }
    
    /**
     * Initialize passive effects for this accessory
     * @param {Object} item - The accessory item
     * @private
     */
    initializePassiveEffect(item) {
        if (!item || !item.passiveEffect || !this.owner) {
            return;
        }
        
        // Apply passive effect to owner
        if (this.owner.applyPassiveEffect && typeof this.owner.applyPassiveEffect === 'function') {
            this.owner.applyPassiveEffect(item.passiveEffect, this);
        }
    }
    
    /**
     * Clear passive effects from this accessory
     * @private
     */
    clearPassiveEffect() {
        if (!this.item || !this.item.passiveEffect || !this.owner) {
            return;
        }
        
        // Remove passive effect from owner
        if (this.owner.removePassiveEffect && typeof this.owner.removePassiveEffect === 'function') {
            this.owner.removePassiveEffect(this.item.passiveEffect, this);
        }
    }
    
    /**
     * Activate the accessory's special ability
     * @returns {boolean} Whether the activation was successful
     */
    activate() {
        if (!this.item || !this.item.onActivate || this.cooldown > 0) {
            return false;
        }
        
        // Check if the item has charges
        if (this.item.usesCharges) {
            if (!this.item.charges || this.item.charges <= 0) {
                return false;
            }
            
            // Use a charge
            this.item.charges--;
        }
        
        // Mark as active
        this.isActive = true;
        
        // Set cooldown
        this.cooldown = this.maxCooldown;
        
        // Call the item's activation function
        const success = this.item.onActivate(this.owner);
        
        // Create activation effect
        if (success) {
            this.createActivationEffect();
            
            // Notify listeners
            this.dispatchEvent({
                type: 'accessory_activated',
                slot: this,
                item: this.item
            });
        }
        
        return success;
    }
    
    /**
     * Create a visual effect when the accessory is activated
     * @private
     */
    createActivationEffect() {
        if (!this.owner || !this.owner.model) {
            return;
        }
        
        // Flash the particles brighter
        if (this.effectParticles) {
            const originalSize = this.effectParticles.material.size;
            const originalOpacity = this.effectParticles.material.opacity;
            
            // Increase size and opacity temporarily
            this.effectParticles.material.size = originalSize * 3;
            this.effectParticles.material.opacity = 1.0;
            
            // Create a burst of extra particles
            this.createBurstEffect();
            
            // Reset after a short delay
            setTimeout(() => {
                if (this.effectParticles) {
                    this.effectParticles.material.size = originalSize;
                    this.effectParticles.material.opacity = originalOpacity;
                }
            }, 500);
        }
    }
    
    /**
     * Create a burst effect when activated
     * @private
     */
    createBurstEffect() {
        if (!this.owner || !this.owner.model || !this.glowColor) {
            return;
        }
        
        const attachmentPoint = this.getAttachmentPoint();
        if (!attachmentPoint) {
            return;
        }
        
        // Get world position
        attachmentPoint.updateWorldMatrix(true, false);
        const worldPosition = new THREE.Vector3();
        attachmentPoint.getWorldPosition(worldPosition);
        
        // Create burst geometry
        const burstGeometry = new THREE.BufferGeometry();
        const particleCount = 50;
        const positions = new Float32Array(particleCount * 3);
        
        // Initialize particles in a sphere
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            const radius = 0.05;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            
            positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i3 + 2] = radius * Math.cos(phi);
        }
        
        burstGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        
        const burstMaterial = new THREE.PointsMaterial({
            color: this.glowColor,
            size: 0.03,
            transparent: true,
            opacity: 1.0,
            blending: THREE.AdditiveBlending
        });
        
        const burst = new THREE.Points(burstGeometry, burstMaterial);
        burst.position.copy(worldPosition);
        burst.name = `burst_${this.id}_${Date.now()}`;
        
        this.owner.model.add(burst);
        
        // Animate the burst
        let elapsed = 0;
        const duration = 1.0; // seconds
        
        const animate = () => {
            elapsed += 0.016; // Approximately 60fps
            
            if (elapsed >= duration) {
                this.owner.model.remove(burst);
                return;
            }
            
            const progress = elapsed / duration;
            
            // Expand the particles
            const positions = burst.geometry.attributes.position.array;
            for (let i = 0; i < positions.length; i += 3) {
                const i3 = i;
                const initialPos = new THREE.Vector3(
                    positions[i3] / progress,
                    positions[i3 + 1] / progress,
                    positions[i3 + 2] / progress
                );
                
                positions[i3] = initialPos.x * progress * 10;
                positions[i3 + 1] = initialPos.y * progress * 10;
                positions[i3 + 2] = initialPos.z * progress * 10;
            }
            
            burst.geometry.attributes.position.needsUpdate = true;
            
            // Fade out
            burst.material.opacity = 1.0 - progress;
            
            requestAnimationFrame(animate);
        };
        
        animate();
    }
    
    /**
     * Update the accessory - handle cooldowns, etc.
     * @param {number} deltaTime - Time elapsed since last update
     */
    update(deltaTime) {
        // Update cooldown if active
        if (this.cooldown > 0) {
            this.cooldown = Math.max(0, this.cooldown - deltaTime);
            
            // If cooldown just ended, notify
            if (this.cooldown === 0 && this.isActive) {
                this.isActive = false;
                
                this.dispatchEvent({
                    type: 'accessory_cooldown_complete',
                    slot: this,
                    item: this.item
                });
            }
        }
        
        // Update any visual effects
        this.updateEffects(deltaTime);
    }
    
    /**
     * Update visual effects
     * @param {number} deltaTime - Time elapsed since last update
     * @private
     */
    updateEffects(deltaTime) {
        // Pulse the particle effect if active
        if (this.effectParticles && this.pulseEffect) {
            const time = Date.now() * 0.001; // Convert to seconds
            this.effectParticles.material.opacity = 0.4 + Math.sin(time * 2) * 0.2;
        }
    }
    
    /**
     * Blend two colors
     * @param {number} color1 - First color (hex)
     * @param {number} color2 - Second color (hex)
     * @param {number} ratio - Blend ratio (0-1)
     * @returns {number} Blended color (hex)
     * @private
     */
    blendColors(color1, color2, ratio) {
        const c1 = new THREE.Color(color1);
        const c2 = new THREE.Color(color2);
        
        c1.lerp(c2, ratio);
        
        return c1.getHex();
    }
    
    /**
     * Get the accessory's charges
     * @returns {Object|null} Charge information or null if not applicable
     */
    getCharges() {
        if (!this.item || !this.item.usesCharges) {
            return null;
        }
        
        return {
            current: this.item.charges || 0,
            max: this.item.maxCharges || 0
        };
    }
    
    /**
     * Get cooldown information
     * @returns {Object} Cooldown information
     */
    getCooldownInfo() {
        return {
            current: this.cooldown,
            max: this.maxCooldown,
            ratio: this.maxCooldown > 0 ? this.cooldown / this.maxCooldown : 0,
            isReady: this.cooldown <= 0
        };
    }
    
    /**
     * Get a detailed description of the accessory
     * @returns {string} Accessory description
     */
    getAccessoryDescription() {
        if (!this.item) {
            return 'No accessory equipped';
        }
        
        let desc = `${this.item.name} (${this.item.rarity})\n`;
        
        // Material type
        if (this.item.materialType) {
            desc += `${this.item.materialType}\n`;
        }
        
        // Stat bonuses
        if (this.item.stats) {
            desc += 'Bonuses:\n';
            for (const [stat, value] of Object.entries(this.item.stats)) {
                if (value > 0) {
                    desc += `- ${stat}: +${value}\n`;
                }
            }
        }
        
        // Passive effect
        if (this.item.passiveEffect) {
            desc += `Passive: ${this.item.passiveEffect.description}\n`;
        }
        
        // Active effect
        if (this.item.activeAbility) {
            desc += `Active: ${this.item.activeAbility}\n`;
            
            if (this.item.cooldown) {
                desc += `Cooldown: ${this.item.cooldown}s\n`;
            }
            
            if (this.item.usesCharges) {
                desc += `Charges: ${this.item.charges || 0}/${this.item.maxCharges || 0}\n`;
            }
        }
        
        return desc;
    }
} 