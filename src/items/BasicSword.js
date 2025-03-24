import { ItemSchema } from './ItemSchema.js';

/**
 * Basic sword item
 */
export class BasicSword extends ItemSchema {
    /**
     * Create a new basic sword
     * @param {Object} config - Configuration options
     */
    constructor(config = {}) {
        // Default sword configuration
        const defaultConfig = {
            id: 'basic_sword',
            name: 'Basic Sword',
            description: 'A simple but reliable steel sword.',
            type: 'WEAPON',
            subType: 'SWORD',
            rarity: 'COMMON',
            icon: 'sword_icon.png',
            model: 'sword_model.obj',
            
            // Gameplay properties
            value: 50,
            weight: 2.5,
            durability: 100,
            maxDurability: 100,
            requiredLevel: 1,
            isConsumable: false,
            isQuestItem: false,
            isEquippable: true,
            isStackable: false,
            maxStackSize: 1,
            
            // Equipment properties
            equipSlot: 'RIGHT_HAND',
            stats: {
                damage: 10,
                attackSpeed: 1.2,
                critChance: 0.05
            },
            
            // Visual properties
            scale: 1.0,
            color: 0xcccccc,  // Silver color
            attachmentPoint: 'RIGHT_HAND',
            attachmentOffset: { x: 0, y: 0, z: 0 },
            attachmentRotation: { x: 0, y: 0, z: 0 }
        };
        
        // Merge with custom config
        const mergedConfig = { ...defaultConfig, ...config };
        
        // Call parent constructor
        super(mergedConfig);
    }
    
    /**
     * Custom method for sword swing effect
     * @param {Object} character - The character using the sword
     */
    swing(character) {
        // This would trigger a swing animation
        this.dispatchEvent({
            type: 'swing',
            weapon: this,
            character
        });
    }
    
    /**
     * Calculate damage for an attack
     * @param {Object} attacker - The attacking character
     * @param {Object} target - The attack target
     * @returns {Object} Damage information
     */
    calculateDamage(attacker, target) {
        const baseDamage = this.stats.damage || 5;
        const attackerStrength = attacker.stats?.strength || 1;
        const critChance = this.stats.critChance || 0;
        
        // Calculate base damage with strength modifier
        let damage = baseDamage * (1 + (attackerStrength * 0.1));
        
        // Check for critical hit
        const isCritical = Math.random() < critChance;
        if (isCritical) {
            damage *= 2;
        }
        
        return {
            damage: Math.round(damage),
            isCritical,
            type: 'physical',
            source: this.id
        };
    }
    
    /**
     * Get a detailed description of the sword
     * @returns {string} The description
     */
    getDetailedDescription() {
        let desc = `${this.name} (${this.rarity})\n`;
        desc += `${this.description}\n\n`;
        desc += `Damage: ${this.stats.damage}\n`;
        desc += `Attack Speed: ${this.stats.attackSpeed}\n`;
        desc += `Critical Chance: ${(this.stats.critChance * 100).toFixed(1)}%\n\n`;
        
        if (this.durability !== null) {
            const durabilityPercent = (this.durability / this.maxDurability * 100).toFixed(0);
            desc += `Durability: ${this.durability}/${this.maxDurability} (${durabilityPercent}%)\n`;
        }
        
        desc += `Weight: ${this.weight} lbs\n`;
        desc += `Value: ${this.value} gold`;
        
        return desc;
    }
} 