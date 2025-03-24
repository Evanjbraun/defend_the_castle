import { EquipmentSlot } from './EquipmentSlot.js';
import * as THREE from 'three';

/**
 * Specialized equipment slot for armor pieces
 */
export class ArmorSlot extends EquipmentSlot {
    /**
     * Create a new armor slot
     * @param {Object} config - Configuration object
     */
    constructor(config = {}) {
        // Set default armor-specific properties
        const armorConfig = {
            ...config,
            type: 'ARMOR',
            acceptsOnly: ['ARMOR'],
            // Default to CHEST if not specified
            slotType: config.slotType || 'CHEST',
        };
        
        super(armorConfig);
        
        // Armor-specific properties
        this.armorType = config.armorType || 'ANY'; // LIGHT, MEDIUM, HEAVY
        this.materialType = config.materialType || null; // Optional material type restriction
        
        // Visual properties
        this.meshes = new Map(); // Map of visual meshes for this slot
        this.defaultMesh = null; // Default visual for when nothing is equipped
        this.currentVisual = null; // Current visual representation
        
        // Coloring options
        this.allowDyeing = config.allowDyeing !== false;
        this.dyeColor = null;
    }
    
    /**
     * Override the canAccept method to handle armor-specific requirements
     * @param {Object} item - The item to check
     * @returns {boolean} Whether the item can be equipped in this slot
     */
    canAccept(item) {
        // First check the basic acceptance using the parent method
        if (!super.canAccept(item)) {
            return false;
        }
        
        // Check if the item is armor but not for this slot type
        if (item.type === 'ARMOR' && item.equipSlot !== this.slotType) {
            return false;
        }
        
        // Check armor type restriction
        if (this.armorType !== 'ANY' && item.armorType && item.armorType !== this.armorType) {
            return false;
        }
        
        // Check material restriction
        if (this.materialType && item.materialType && item.materialType !== this.materialType) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Handle special logic for setting armor in this slot
     * @param {Object} item - The armor to equip
     * @param {number} quantity - The quantity to set (usually 1 for armor)
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
            this.updateArmorVisual(item);
            
            // Notify character of armor change
            this.dispatchEvent({ 
                type: 'armor_equipped', 
                slot: this, 
                item
            });
        }
        
        return success;
    }
    
    /**
     * Handle special logic for clearing armor from this slot
     * @returns {boolean} Whether the armor was successfully cleared
     */
    clearItem() {
        const hadItem = this.item !== null;
        const item = this.item;
        
        // Use parent method to clear the item
        const success = super.clearItem();
        
        if (success && hadItem) {
            // Restore default visual or hide the armor part
            this.resetArmorVisual();
            
            // Notify character of armor removal
            this.dispatchEvent({ 
                type: 'armor_removed', 
                slot: this, 
                item
            });
        }
        
        return success;
    }
    
    /**
     * Get the defensive bonuses provided by this armor
     * @returns {Object} Armor bonuses
     */
    getDefenseBonus() {
        if (!this.item) {
            return {
                armor: 0,
                resistances: {}
            };
        }
        
        return {
            armor: this.item.armorValue || 0,
            resistances: this.item.resistances || {},
            dodge: this.item.dodgeBonus || 0,
            block: this.item.blockBonus || 0
        };
    }
    
    /**
     * Update the visual representation of the armor
     * @param {Object} armorItem - The equipped armor
     * @private
     */
    updateArmorVisual(armorItem) {
        if (!armorItem || !this.owner || !this.owner.model) {
            return;
        }
        
        // Reset current visual
        this.resetArmorVisual();
        
        // Get the bone/attachment point for this armor slot
        const attachmentPoint = this.getAttachmentPoint();
        if (!attachmentPoint) {
            return;
        }
        
        // Create or get the armor mesh
        let armorMesh;
        
        // Check if we already have a cached version of this armor mesh
        if (this.meshes.has(armorItem.id)) {
            armorMesh = this.meshes.get(armorItem.id).clone();
        } else {
            // Create a new armor mesh based on the item model
            armorMesh = this.createArmorMesh(armorItem);
            
            // Cache it for future use
            if (armorMesh) {
                this.meshes.set(armorItem.id, armorMesh.clone());
            }
        }
        
        if (!armorMesh) {
            return;
        }
        
        // Apply any dye color if set
        if (this.dyeColor && this.allowDyeing) {
            this.applyDyeColor(armorMesh);
        }
        
        // Add the armor mesh to the attachment point
        attachmentPoint.add(armorMesh);
        this.currentVisual = armorMesh;
        
        // Apply any special effects (like glowing for magic items)
        if (armorItem.rarity !== 'COMMON') {
            this.applyItemEffects(armorMesh, armorItem);
        }
    }
    
    /**
     * Reset the visual representation back to default
     * @private
     */
    resetArmorVisual() {
        if (!this.owner || !this.owner.model) {
            return;
        }
        
        const attachmentPoint = this.getAttachmentPoint();
        if (!attachmentPoint) {
            return;
        }
        
        // Remove the current armor mesh if present
        if (this.currentVisual) {
            attachmentPoint.remove(this.currentVisual);
            this.currentVisual = null;
        }
        
        // Add back the default mesh if available
        if (this.defaultMesh) {
            attachmentPoint.add(this.defaultMesh.clone());
            this.currentVisual = this.defaultMesh;
        }
    }
    
    /**
     * Get the attachment point for this armor slot
     * @returns {THREE.Object3D|null} The attachment point object
     * @private
     */
    getAttachmentPoint() {
        if (!this.owner || !this.owner.model) {
            return null;
        }
        
        // Map slot types to bone names
        const boneMap = {
            HEAD: 'head',
            CHEST: 'chest',
            SHOULDERS: 'shoulders',
            ARMS: 'arms',
            HANDS: 'hands',
            WAIST: 'waist',
            LEGS: 'legs',
            FEET: 'feet',
            BACK: 'back'
        };
        
        const boneName = boneMap[this.slotType] || this.slotType.toLowerCase();
        return this.owner.model.getObjectByName(boneName) || null;
    }
    
    /**
     * Create a mesh for the armor item
     * @param {Object} armorItem - The armor item
     * @returns {THREE.Object3D|null} The created mesh
     * @private
     */
    createArmorMesh(armorItem) {
        if (!armorItem) {
            return null;
        }
        
        // This is a simplified version. In a real game, you would load the model from files.
        let geometry, material;
        
        // Create a simple mesh based on slot type if no model is available
        switch (this.slotType) {
            case 'HEAD':
                geometry = new THREE.SphereGeometry(0.5, 16, 16);
                break;
            case 'CHEST':
                geometry = new THREE.BoxGeometry(0.8, 1, 0.4);
                break;
            case 'SHOULDERS':
                geometry = new THREE.CylinderGeometry(0.2, 0.3, 0.4, 16);
                break;
            case 'ARMS':
                geometry = new THREE.CylinderGeometry(0.15, 0.15, 0.6, 16);
                break;
            case 'HANDS':
                geometry = new THREE.BoxGeometry(0.2, 0.2, 0.3);
                break;
            case 'WAIST':
                geometry = new THREE.BoxGeometry(0.6, 0.2, 0.3);
                break;
            case 'LEGS':
                geometry = new THREE.CylinderGeometry(0.2, 0.15, 1, 16);
                break;
            case 'FEET':
                geometry = new THREE.BoxGeometry(0.25, 0.15, 0.4);
                break;
            case 'BACK':
                geometry = new THREE.PlaneGeometry(0.8, 1);
                break;
            default:
                geometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
        }
        
        // Create material based on armor type and rarity
        material = this.getArmorMaterial(armorItem);
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = `armor_${this.slotType}_${armorItem.id}`;
        
        return mesh;
    }
    
    /**
     * Get the material for an armor item based on its properties
     * @param {Object} armorItem - The armor item
     * @returns {THREE.Material} The created material
     * @private
     */
    getArmorMaterial(armorItem) {
        let color = 0x999999; // Default color
        let metalness = 0.0;
        let roughness = 1.0;
        
        // Get color based on armor type
        switch (armorItem.armorType) {
            case 'LIGHT':
                color = 0xdddddd;
                metalness = 0.0;
                roughness = 0.9;
                break;
            case 'MEDIUM':
                color = 0xaaaaaa;
                metalness = 0.3;
                roughness = 0.7;
                break;
            case 'HEAVY':
                color = 0x777777;
                metalness = 0.7;
                roughness = 0.3;
                break;
        }
        
        // Adjust based on material type
        if (armorItem.materialType) {
            switch (armorItem.materialType) {
                case 'CLOTH':
                    color = 0xefefef;
                    metalness = 0.0;
                    roughness = 1.0;
                    break;
                case 'LEATHER':
                    color = 0x8B4513;
                    metalness = 0.0;
                    roughness = 0.9;
                    break;
                case 'MAIL':
                    color = 0xcccccc;
                    metalness = 0.5;
                    roughness = 0.5;
                    break;
                case 'PLATE':
                    color = 0x999999;
                    metalness = 0.8;
                    roughness = 0.2;
                    break;
            }
        }
        
        // Adjust color based on rarity
        if (armorItem.rarity) {
            // Make more rare items shinier
            switch (armorItem.rarity) {
                case 'UNCOMMON':
                    metalness += 0.1;
                    roughness -= 0.1;
                    break;
                case 'RARE':
                    metalness += 0.2;
                    roughness -= 0.2;
                    break;
                case 'EPIC':
                    metalness += 0.3;
                    roughness -= 0.3;
                    break;
                case 'LEGENDARY':
                    metalness += 0.4;
                    roughness -= 0.4;
                    break;
            }
        }
        
        // Ensure values are in valid range
        metalness = Math.max(0, Math.min(1, metalness));
        roughness = Math.max(0, Math.min(1, roughness));
        
        return new THREE.MeshStandardMaterial({
            color,
            metalness,
            roughness,
            name: `material_${armorItem.id}`
        });
    }
    
    /**
     * Apply a dye color to the armor mesh
     * @param {THREE.Object3D} mesh - The armor mesh
     * @private
     */
    applyDyeColor(mesh) {
        if (!mesh || !this.dyeColor) {
            return;
        }
        
        if (mesh.material) {
            // If it's a single material
            this.applyColorToMaterial(mesh.material, this.dyeColor);
        } else if (mesh.children) {
            // If it has child objects with materials
            mesh.traverse(child => {
                if (child.material) {
                    this.applyColorToMaterial(child.material, this.dyeColor);
                }
            });
        }
    }
    
    /**
     * Apply color to a material
     * @param {THREE.Material} material - The material to modify
     * @param {THREE.Color|number} color - The color to apply
     * @private
     */
    applyColorToMaterial(material, color) {
        if (!material) {
            return;
        }
        
        const threeColor = color instanceof THREE.Color 
            ? color 
            : new THREE.Color(color);
            
        if (Array.isArray(material)) {
            // Handle material arrays
            material.forEach(mat => {
                if (mat.color) {
                    mat.color.set(threeColor);
                }
            });
        } else if (material.color) {
            // Handle single material
            material.color.set(threeColor);
        }
    }
    
    /**
     * Apply special effects to an item based on its properties
     * @param {THREE.Object3D} mesh - The item mesh
     * @param {Object} item - The item with properties
     * @private
     */
    applyItemEffects(mesh, item) {
        if (!mesh || !item) {
            return;
        }
        
        // Add glow for magical items
        if (item.isMagical || item.rarity !== 'COMMON') {
            this.addGlowEffect(mesh, item);
        }
        
        // Add elemental effects
        if (item.elementalType) {
            this.addElementalEffect(mesh, item.elementalType);
        }
    }
    
    /**
     * Add a glow effect to an item
     * @param {THREE.Object3D} mesh - The item mesh
     * @param {Object} item - The item with properties
     * @private
     */
    addGlowEffect(mesh, item) {
        if (!mesh) {
            return;
        }
        
        // Determine glow color based on rarity
        let glowColor;
        switch (item.rarity) {
            case 'UNCOMMON': glowColor = 0x00cc00; break;
            case 'RARE': glowColor = 0x0088ff; break;
            case 'EPIC': glowColor = 0xaa00ff; break;
            case 'LEGENDARY': glowColor = 0xff8800; break;
            default: glowColor = 0xffffff;
        }
        
        // Create a simple glow effect with an emissive material
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
    }
    
    /**
     * Add an elemental effect to an item
     * @param {THREE.Object3D} mesh - The item mesh
     * @param {string} elementType - The elemental type
     * @private
     */
    addElementalEffect(mesh, elementType) {
        if (!mesh || !elementType) {
            return;
        }
        
        // Create particle effects based on element type
        let particleColor;
        
        switch (elementType.toUpperCase()) {
            case 'FIRE': particleColor = 0xff4400; break;
            case 'ICE': particleColor = 0x44aaff; break;
            case 'LIGHTNING': particleColor = 0xffff00; break;
            case 'POISON': particleColor = 0x00ff00; break;
            case 'SHADOW': particleColor = 0x800080; break;
            case 'HOLY': particleColor = 0xffffaa; break;
            default: return; // Unknown element
        }
        
        // Create a simple particle effect
        // In a real game, this would be replaced with a more sophisticated particle system
        const particles = new THREE.Points(
            new THREE.BufferGeometry(),
            new THREE.PointsMaterial({
                color: particleColor,
                size: 0.1,
                transparent: true,
                opacity: 0.7
            })
        );
        
        particles.name = `elemental_effect_${elementType}`;
        mesh.add(particles);
    }
    
    /**
     * Set a dye color for the armor
     * @param {number|string|THREE.Color} color - The color to apply
     * @returns {boolean} Whether the dye was successfully applied
     */
    dyeArmor(color) {
        if (!this.allowDyeing || !this.item) {
            return false;
        }
        
        // Convert color to THREE.Color
        let threeColor;
        try {
            threeColor = color instanceof THREE.Color 
                ? color 
                : new THREE.Color(color);
        } catch (e) {
            console.warn('Invalid color for dyeing:', color);
            return false;
        }
        
        this.dyeColor = threeColor;
        
        // Apply the dye to the current visual if it exists
        if (this.currentVisual) {
            this.applyDyeColor(this.currentVisual);
        }
        
        return true;
    }
    
    /**
     * Remove dye from the armor
     * @returns {boolean} Whether the dye was successfully removed
     */
    removeDye() {
        if (!this.dyeColor || !this.item) {
            return false;
        }
        
        this.dyeColor = null;
        
        // Reapply the original item to update visuals
        const item = this.item;
        this.clearItem();
        this.setItem(item);
        
        return true;
    }
    
    /**
     * Set the default mesh for this slot when nothing is equipped
     * @param {THREE.Object3D} mesh - The mesh to use
     */
    setDefaultMesh(mesh) {
        this.defaultMesh = mesh;
        
        // If nothing is currently equipped, show the default
        if (!this.item && !this.currentVisual) {
            this.resetArmorVisual();
        }
    }
    
    /**
     * Get a detailed description of the armor
     * @returns {string} Armor description
     */
    getArmorDescription() {
        if (!this.item) {
            return 'No armor equipped';
        }
        
        let desc = `${this.item.name} (${this.item.rarity})\n`;
        
        // Armor value
        desc += `Armor: ${this.item.armorValue || 0}\n`;
        
        // Resistances
        if (this.item.resistances) {
            desc += 'Resistances:\n';
            for (const [type, value] of Object.entries(this.item.resistances)) {
                if (value > 0) {
                    desc += `- ${type}: ${value}\n`;
                }
            }
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
        
        // Material and type
        if (this.item.materialType && this.item.armorType) {
            desc += `${this.item.materialType} ${this.item.armorType}\n`;
        }
        
        return {
            current: this.item.currentDurability,
            max: this.item.maxDurability
        };
    }
} 