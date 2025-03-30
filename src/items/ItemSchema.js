import * as THREE from 'three';

/**
 * Item schema defining all properties and behaviors of a game item
 */
export class ItemSchema extends THREE.EventDispatcher {
    /**
     * Create a new item schema
     * @param {Object} data - Item configuration data
     */
    constructor(data = {}) {
        super();
        
        // Basic properties
        this.id = data.id || '';
        this.name = data.name || 'Unknown Item';
        this.description = data.description || '';
        this.type = data.type || 'MISC';
        this.subType = data.subType || '';
        this.rarity = data.rarity || 'COMMON';
        this.icon = data.icon || 'defaultIcon.png';
        this.model = data.model || null;
        
        // Owner reference
        this.owner = null;
        
        // Gameplay properties
        this.value = data.value || 0;
        this.weight = data.weight || 0.1;
        this.durability = data.durability || null;
        this.maxDurability = data.maxDurability || null;
        this.requiredLevel = data.requiredLevel || 0;
        this.isConsumable = data.isConsumable || false;
        this.isQuestItem = data.isQuestItem || false;
        this.isEquippable = data.isEquippable || false;
        this.isStackable = data.isStackable !== undefined ? data.isStackable : true;
        this.maxStackSize = data.maxStackSize || 99;
        
        // Equipment properties (if equippable)
        this.equipSlot = data.equipSlot || '';
        this.stats = data.stats || {};
        this.effects = data.effects || [];
        this.setId = data.setId || null;  // Reference to equipment set
        
        // Visual properties
        this.scale = data.scale || 1.0;
        this.color = data.color || null;
        this.attachmentPoint = data.attachmentPoint || null;
        this.attachmentOffset = data.attachmentOffset || { x: 0, y: 0, z: 0 };
        this.attachmentRotation = data.attachmentRotation || { x: 0, y: 0, z: 0 };
        
        // Status
        this.isEquipped = false;
        this.quantity = data.quantity || 1;
        this.metadata = data.metadata || {};
        this.tags = data.tags || [];
        
        // Tooltip/UI
        this.tooltipColor = data.tooltipColor || null;
        this.customTooltip = data.customTooltip || null;
        
        // Initialize any extra properties from data
        Object.entries(data).forEach(([key, value]) => {
            if (this[key] === undefined) {
                this[key] = value;
            }
        });
    }
    
    /**
     * Check if the item can be equipped
     * @returns {boolean} Whether the item can be equipped
     */
    canEquip() {
        return this.isEquippable && !this.isEquipped;
    }
    
    /**
     * Mark the item as equipped
     */
    onEquip() {
        this.isEquipped = true;
        this.dispatchEvent({ type: 'equipped' });
    }
    
    /**
     * Mark the item as unequipped
     */
    onUnequip() {
        this.isEquipped = false;
        this.dispatchEvent({ type: 'unequipped' });
    }
    
    /**
     * Get the stat value for a specific stat
     * @param {string} statName - The name of the stat
     * @returns {number} The stat value or 0 if not found
     */
    getStat(statName) {
        return this.stats[statName] || 0;
    }
    
    /**
     * Check if the item has a specific tag
     * @param {string} tag - The tag to check
     * @returns {boolean} Whether the item has the tag
     */
    hasTag(tag) {
        return this.tags.includes(tag);
    }
    
    /**
     * Use the item (for consumables)
     * @param {Object} target - The target to use the item on
     * @returns {boolean} Whether the use was successful
     */
    use(target) {
        if (!this.isConsumable || this.quantity <= 0) {
            return false;
        }
        
        this.quantity--;
        
        // Apply effects if defined
        this.effects.forEach(effect => {
            if (typeof effect.apply === 'function') {
                effect.apply(target, this);
            }
        });
        
        this.dispatchEvent({ 
            type: 'used',
            target,
            remainingUses: this.quantity
        });
        
        return true;
    }
    
    /**
     * Get the current level requirement
     * @returns {number} The required level
     */
    getRequiredLevel() {
        return this.requiredLevel;
    }
    
    /**
     * Check if the item can stack with another item
     * @param {ItemSchema} otherItem - The other item to check
     * @returns {boolean} Whether the items can stack
     */
    canStackWith(otherItem) {
        if (!this.isStackable || !otherItem.isStackable) {
            return false;
        }
        
        // Items must have the same ID to stack
        if (this.id !== otherItem.id) {
            return false;
        }
        
        // Special case: don't stack equipped items
        if (this.isEquipped || otherItem.isEquipped) {
            return false;
        }
        
        // Durability items might not stack if durability differs
        if (this.durability !== null && otherItem.durability !== null && 
            this.durability !== otherItem.durability) {
            return false;
        }
        
        // Check metadata for any custom stack rules
        if (this.metadata.noStack || otherItem.metadata.noStack) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Add quantity to this item
     * @param {number} amount - Amount to add
     * @returns {number} Overflow amount if stack exceeds max size
     */
    add(amount) {
        if (!this.isStackable) {
            return amount;
        }
        
        const newQuantity = this.quantity + amount;
        
        if (newQuantity <= this.maxStackSize) {
            this.quantity = newQuantity;
            this.dispatchEvent({ type: 'quantity_changed', quantity: this.quantity });
            return 0;
        } else {
            const overflow = newQuantity - this.maxStackSize;
            this.quantity = this.maxStackSize;
            this.dispatchEvent({ type: 'quantity_changed', quantity: this.quantity });
            return overflow;
        }
    }
    
    /**
     * Remove quantity from this item
     * @param {number} amount - Amount to remove
     * @returns {number} The actual amount removed
     */
    remove(amount) {
        const amountToRemove = Math.min(this.quantity, amount);
        this.quantity -= amountToRemove;
        
        this.dispatchEvent({ 
            type: 'quantity_changed', 
            quantity: this.quantity,
            removed: amountToRemove
        });
        
        return amountToRemove;
    }
    
    /**
     * Check if the item stack is empty
     * @returns {boolean} Whether the item has zero quantity
     */
    isEmpty() {
        return this.quantity <= 0;
    }
    
    /**
     * Split this stack into two stacks
     * @param {number} amount - Amount to split off
     * @returns {ItemSchema|null} The new split stack or null if split fails
     */
    split(amount) {
        if (amount <= 0 || amount >= this.quantity) {
            return null;
        }
        
        const newStack = this.clone();
        newStack.quantity = amount;
        
        this.quantity -= amount;
        
        this.dispatchEvent({ type: 'quantity_changed', quantity: this.quantity });
        
        return newStack;
    }
    
    /**
     * Damage the item (reduce durability)
     * @param {number} amount - Amount of durability to reduce
     * @returns {boolean} Whether the item is broken
     */
    damage(amount) {
        if (this.durability === null || this.maxDurability === null) {
            return false;
        }
        
        this.durability = Math.max(0, this.durability - amount);
        
        this.dispatchEvent({ 
            type: 'durability_changed', 
            durability: this.durability,
            maxDurability: this.maxDurability
        });
        
        if (this.durability <= 0) {
            this.dispatchEvent({ type: 'broken' });
            return true;
        }
        
        return false;
    }
    
    /**
     * Repair the item (restore durability)
     * @param {number} amount - Amount of durability to restore
     * @returns {boolean} Whether repair was applied
     */
    repair(amount) {
        if (this.durability === null || this.maxDurability === null) {
            return false;
        }
        
        if (this.durability >= this.maxDurability) {
            return false;
        }
        
        this.durability = Math.min(this.maxDurability, this.durability + amount);
        
        this.dispatchEvent({ 
            type: 'durability_changed', 
            durability: this.durability,
            maxDurability: this.maxDurability
        });
        
        return true;
    }
    
    /**
     * Get a descriptive text for the item
     * @returns {string} Item description text
     */
    getDescription() {
        let desc = `${this.name} (${this.rarity})`;
        
        if (this.description) {
            desc += `\n${this.description}`;
        }
        
        if (this.isEquippable) {
            desc += `\nEquip: ${this.equipSlot}`;
            
            if (Object.keys(this.stats).length > 0) {
                desc += '\nStats:';
                Object.entries(this.stats).forEach(([stat, value]) => {
                    desc += `\n  ${stat}: ${value > 0 ? '+' : ''}${value}`;
                });
            }
            
            if (this.requiredLevel > 0) {
                desc += `\nRequires Level: ${this.requiredLevel}`;
            }
            
            if (this.setId) {
                desc += `\nPart of set: ${this.setId}`;
            }
        }
        
        if (this.isConsumable) {
            desc += '\nConsumable';
            
            if (this.effects.length > 0) {
                desc += '\nEffects:';
                this.effects.forEach(effect => {
                    if (effect.description) {
                        desc += `\n  ${effect.description}`;
                    }
                });
            }
        }
        
        if (this.durability !== null && this.maxDurability !== null) {
            desc += `\nDurability: ${this.durability}/${this.maxDurability}`;
        }
        
        if (this.value > 0) {
            desc += `\nValue: ${this.value} gold`;
        }
        
        if (this.weight > 0) {
            desc += `\nWeight: ${this.weight} lbs`;
        }
        
        return desc;
    }
    
    /**
     * Create a clone of this item
     * @returns {ItemSchema} A new item with the same properties
     */
    clone() {
        const clonedData = {};
        
        // Copy all properties
        Object.entries(this).forEach(([key, value]) => {
            // Skip EventDispatcher properties
            if (key === '_listeners') {
                return;
            }
            
            // Deep copy objects
            if (value !== null && typeof value === 'object') {
                if (Array.isArray(value)) {
                    clonedData[key] = [...value];
                } else {
                    clonedData[key] = { ...value };
                }
            } else {
                clonedData[key] = value;
            }
        });
        
        // Create new instance
        return new ItemSchema(clonedData);
    }
    
    /**
     * Convert to JSON-compatible object
     * @returns {Object} JSON representation
     */
    toJSON() {
        const json = {};
        
        // Copy relevant properties
        Object.entries(this).forEach(([key, value]) => {
            // Skip internal properties and functions
            if (key.startsWith('_') || typeof value === 'function') {
                return;
            }
            
            json[key] = value;
        });
        
        return json;
    }
    
    /**
     * Create an item from JSON data
     * @param {Object} json - JSON data
     * @returns {ItemSchema} New item instance
     */
    static fromJSON(json) {
        return new ItemSchema(json);
    }
    
    /**
     * Set the owner of this item
     * @param {Object} owner - The owner object (usually a Player or NPC)
     */
    setOwner(owner) {
        this.owner = owner;
        this.dispatchEvent({ type: 'owner_changed', owner });
    }
    
    /**
     * Get the owner of this item
     * @returns {Object|null} The owner object or null if no owner
     */
    getOwner() {
        return this.owner;
    }
} 