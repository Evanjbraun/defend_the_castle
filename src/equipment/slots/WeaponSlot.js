import { EquipmentSlot } from './EquipmentSlot.js';
import * as THREE from 'three';

/**
 * Specialized equipment slot for weapons
 */
export class WeaponSlot extends EquipmentSlot {
    /**
     * Create a new weapon slot
     * @param {Object} config - Configuration object
     */
    constructor(config = {}) {
        // Set default weapon-specific properties
        const weaponConfig = {
            ...config,
            type: 'WEAPON',
            acceptsOnly: ['WEAPON'],
            slotType: config.slotType || 'MAINHAND',
        };
        
        super(weaponConfig);
        
        // Weapon-specific properties
        this.isMainHand = this.slotType === 'MAINHAND';
        this.isOffHand = this.slotType === 'OFFHAND';
        this.isTwoHanded = false; // Will be set to true if a two-handed weapon is equipped
        
        // Visual properties
        this.weaponTrail = null;
        this.attackAnimation = config.attackAnimation || 'slash';
        
        // Handle to paired weapon slot (main/off hand relationship)
        this.pairedSlot = null;
    }
    
    /**
     * Link this weapon slot with another (main hand with off hand)
     * @param {WeaponSlot} otherSlot - The other weapon slot to pair with
     */
    pairWith(otherSlot) {
        if (!(otherSlot instanceof WeaponSlot)) {
            console.warn('Can only pair weapon slots with other weapon slots');
            return;
        }
        
        this.pairedSlot = otherSlot;
        otherSlot.pairedSlot = this;
    }
    
    /**
     * Get the paired slot (main or off hand)
     * @returns {WeaponSlot|null} The paired weapon slot
     */
    getPairedSlot() {
        return this.pairedSlot;
    }
    
    /**
     * Override the canAccept method to handle two-handed weapons
     * @param {Object} item - The item to check
     * @returns {boolean} Whether the item can be equipped in this slot
     */
    canAccept(item) {
        // First check the basic acceptance using the parent method
        if (!super.canAccept(item)) {
            return false;
        }
        
        // Additional weapon-specific checks
        if (this.isMainHand && item.isTwoHanded) {
            // For two-handed weapons, check if the off-hand is empty or can be emptied
            if (this.pairedSlot && this.pairedSlot.item) {
                // Off-hand has an item, might not be able to equip
                return !this.pairedSlot.locked;
            }
        } else if (this.isOffHand) {
            // Cannot equip anything in off-hand if main hand has a two-handed weapon
            if (this.pairedSlot && this.pairedSlot.item && this.pairedSlot.item.isTwoHanded) {
                return false;
            }
            
            // Only accept off-hand items or one-handed weapons for dual wielding
            if (item.slot === 'OFFHAND' || item.isDualWieldable) {
                return true;
            } else {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Handle special logic for setting a weapon in this slot
     * @param {Object} item - The weapon to equip
     * @param {number} quantity - The quantity to set (usually 1 for weapons)
     * @returns {boolean} Whether the item was successfully set
     */
    setItem(item, quantity = 1) {
        if (!this.canAccept(item)) {
            return false;
        }
        
        // Handle two-handed weapons
        if (item.isTwoHanded && this.isMainHand && this.pairedSlot) {
            // Clear off-hand slot if needed
            if (this.pairedSlot.item) {
                const offHandItem = this.pairedSlot.item;
                const success = this.pairedSlot.clearItem();
                
                if (!success) {
                    return false; // Failed to clear off-hand
                }
                
                // Make sure the offhand item gets moved to inventory
                if (this.inventory && typeof this.inventory.addItem === 'function') {
                    this.inventory.addItem(offHandItem);
                }
            }
            
            // Mark that we have a two-handed weapon equipped
            this.isTwoHanded = true;
            
            // Also mark the paired slot as affected by a two-handed weapon
            if (this.pairedSlot) {
                this.pairedSlot.isTwoHanded = true;
            }
        }
        
        // Regular equip using parent method
        const success = super.setItem(item, quantity);
        
        if (success) {
            // Update attack animation based on weapon type
            this.updateAttackAnimation(item);
            
            // Create weapon trail effect if appropriate
            this.createWeaponTrail(item);
            
            // Notify character of weapon change
            this.dispatchEvent({ 
                type: 'weapon_equipped', 
                slot: this, 
                item, 
                isTwoHanded: this.isTwoHanded 
            });
        }
        
        return success;
    }
    
    /**
     * Handle special logic for clearing a weapon from this slot
     * @returns {boolean} Whether the weapon was successfully cleared
     */
    clearItem() {
        const hadItem = this.item !== null;
        const item = this.item;
        const wasTwoHanded = this.isTwoHanded;
        
        // Use parent method to clear the item
        const success = super.clearItem();
        
        if (success && hadItem) {
            // Reset two-handed flags
            this.isTwoHanded = false;
            
            if (wasTwoHanded && this.pairedSlot) {
                this.pairedSlot.isTwoHanded = false;
            }
            
            // Remove weapon trail
            this.removeWeaponTrail();
            
            // Reset to default attack animation
            this.attackAnimation = this.isMainHand ? 'slash' : 'offhand_slash';
            
            // Notify character of weapon removal
            this.dispatchEvent({ 
                type: 'weapon_removed', 
                slot: this, 
                item, 
                wasTwoHanded 
            });
        }
        
        return success;
    }
    
    /**
     * Update the attack animation based on weapon type
     * @param {Object} weapon - The equipped weapon
     * @private
     */
    updateAttackAnimation(weapon) {
        if (!weapon || !weapon.subtype) {
            return;
        }
        
        // Set appropriate animation based on weapon type and hand
        const prefix = this.isOffHand ? 'offhand_' : '';
        
        switch (weapon.subtype) {
            case 'SWORD':
                this.attackAnimation = `${prefix}slash`;
                break;
            case 'AXE':
                this.attackAnimation = `${prefix}chop`;
                break;
            case 'MACE':
                this.attackAnimation = `${prefix}crush`;
                break;
            case 'DAGGER':
                this.attackAnimation = `${prefix}stab`;
                break;
            case 'STAFF':
                this.attackAnimation = 'staff_swing';
                break;
            case 'WAND':
                this.attackAnimation = 'cast';
                break;
            case 'BOW':
                this.attackAnimation = 'shoot_arrow';
                break;
            case 'CROSSBOW':
                this.attackAnimation = 'shoot_bolt';
                break;
            case 'GUN':
                this.attackAnimation = 'shoot';
                break;
            case 'SPEAR':
                this.attackAnimation = 'thrust';
                break;
            default:
                this.attackAnimation = `${prefix}slash`;
        }
    }
    
    /**
     * Create a weapon trail effect for swinging weapons
     * @param {Object} weapon - The equipped weapon
     * @private
     */
    createWeaponTrail(weapon) {
        if (!weapon || !this.owner || !this.owner.model) {
            return;
        }
        
        // Remove any existing trail
        this.removeWeaponTrail();
        
        // Only create trails for melee weapons
        const meleeTypes = ['SWORD', 'AXE', 'MACE', 'DAGGER', 'STAFF', 'SPEAR'];
        if (!meleeTypes.includes(weapon.subtype)) {
            return;
        }
        
        // Find the weapon model in the character
        const weaponObject = this.getWeaponObject();
        if (!weaponObject) {
            return;
        }
        
        // Create a trail mesh
        const trailMaterial = new THREE.MeshBasicMaterial({
            color: this.getTrailColor(weapon),
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });
        
        const trailGeometry = new THREE.BufferGeometry();
        const trailMesh = new THREE.Mesh(trailGeometry, trailMaterial);
        trailMesh.name = `weapon_trail_${this.id}`;
        trailMesh.visible = false; // Hide until attack
        
        this.owner.model.add(trailMesh);
        this.weaponTrail = trailMesh;
    }
    
    /**
     * Remove the weapon trail effect
     * @private
     */
    removeWeaponTrail() {
        if (!this.weaponTrail || !this.owner || !this.owner.model) {
            return;
        }
        
        this.owner.model.remove(this.weaponTrail);
        this.weaponTrail = null;
    }
    
    /**
     * Get the appropriate color for the weapon trail based on weapon properties
     * @param {Object} weapon - The equipped weapon
     * @returns {number} The trail color
     * @private
     */
    getTrailColor(weapon) {
        if (!weapon) {
            return 0xffffff;
        }
        
        // Check for special weapon effects
        if (weapon.elementalType) {
            switch (weapon.elementalType) {
                case 'FIRE': return 0xff4400;
                case 'ICE': return 0x44aaff;
                case 'LIGHTNING': return 0xffff00;
                case 'POISON': return 0x00ff00;
                case 'SHADOW': return 0x800080;
                case 'HOLY': return 0xffffaa;
            }
        }
        
        // Default based on rarity
        switch (weapon.rarity) {
            case 'LEGENDARY': return 0xff8800;
            case 'EPIC': return 0xaa00ff;
            case 'RARE': return 0x0088ff;
            case 'UNCOMMON': return 0x00cc00;
            default: return 0xffffff;
        }
    }
    
    /**
     * Get the 3D object representing the weapon
     * @returns {THREE.Object3D|null} The weapon object
     * @private
     */
    getWeaponObject() {
        if (!this.owner || !this.owner.model || !this.item) {
            return null;
        }
        
        // Try to find the weapon object in the character model
        const boneName = this.isMainHand ? 'right_hand' : 'left_hand';
        const bone = this.owner.model.getObjectByName(boneName);
        
        if (bone) {
            // Find the first child that is the weapon
            for (const child of bone.children) {
                if (child.name.includes('weapon') || child.name.includes(this.item.id)) {
                    return child;
                }
            }
        }
        
        return null;
    }
    
    /**
     * Get the damage bonuses provided by this weapon
     * @returns {Object} Damage bonuses
     */
    getDamageBonus() {
        if (!this.item) {
            return { min: 0, max: 0 };
        }
        
        return {
            min: this.item.damageMin || 0,
            max: this.item.damageMax || 0,
            elemental: this.item.elementalDamage || 0,
            elementalType: this.item.elementalType || null,
            critChance: this.item.critChance || 0,
            critMultiplier: this.item.critMultiplier || 1.5
        };
    }
    
    /**
     * Activate the weapon trail effect during an attack
     * @param {number} duration - Duration of the trail effect in ms
     */
    activateTrail(duration = 500) {
        if (!this.weaponTrail || !this.item) {
            return;
        }
        
        this.weaponTrail.visible = true;
        
        // Create dynamic trail based on weapon swing
        this.updateTrailGeometry();
        
        // Hide after duration
        setTimeout(() => {
            if (this.weaponTrail) {
                this.weaponTrail.visible = false;
            }
        }, duration);
    }
    
    /**
     * Update the weapon trail geometry during swing animation
     * @private
     */
    updateTrailGeometry() {
        // This would be implemented with actual animation data in a real game
        // For this example, we'll just create a simple arc
        
        if (!this.weaponTrail || !this.getWeaponObject()) {
            return;
        }
        
        const weaponObj = this.getWeaponObject();
        const trailLength = 10; // Number of points in the trail
        const vertices = [];
        const indices = [];
        
        // Create a simple arc trail
        // In a real implementation, this would follow the actual weapon animation path
        const radius = 1.0;
        const weaponLength = 1.0;
        
        for (let i = 0; i < trailLength; i++) {
            const angle = (i / (trailLength - 1)) * Math.PI;
            
            // Top and bottom points of trail
            vertices.push(
                Math.cos(angle) * radius, 
                Math.sin(angle) * radius, 
                0
            );
            
            vertices.push(
                Math.cos(angle) * radius, 
                Math.sin(angle) * radius, 
                weaponLength
            );
            
            // Create triangles (except for the last iteration)
            if (i < trailLength - 1) {
                const bottomLeft = i * 2;
                const bottomRight = (i + 1) * 2;
                const topLeft = bottomLeft + 1;
                const topRight = bottomRight + 1;
                
                indices.push(bottomLeft, bottomRight, topLeft);
                indices.push(bottomRight, topRight, topLeft);
            }
        }
        
        // Update the trail geometry
        const geometry = this.weaponTrail.geometry;
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        
        // Position the trail relative to the weapon
        this.weaponTrail.position.copy(weaponObj.position);
        this.weaponTrail.rotation.copy(weaponObj.rotation);
    }
    
    /**
     * Get a detailed description of the weapon
     * @returns {string} Weapon description
     */
    getWeaponDescription() {
        if (!this.item) {
            return 'No weapon equipped';
        }
        
        let desc = `${this.item.name} (${this.item.rarity})\n`;
        
        // Damage information
        desc += `Damage: ${this.item.damageMin || 0}-${this.item.damageMax || 0}\n`;
        
        if (this.item.elementalDamage && this.item.elementalType) {
            desc += `+${this.item.elementalDamage} ${this.item.elementalType} damage\n`;
        }
        
        if (this.item.critChance) {
            desc += `${this.item.critChance * 100}% critical chance\n`;
        }
        
        if (this.item.isTwoHanded) {
            desc += 'Two-handed\n';
        }
        
        // Add weapon speed
        if (this.item.attackSpeed) {
            desc += `Attack speed: ${this.item.attackSpeed}\n`;
        }
        
        return desc;
    }
} 