import { InventorySlot } from '../../inventory/InventorySlot.js';

/**
 * Specialized slot for equipment items
 * Extends the base InventorySlot with equipment-specific functionality
 */
export class EquipmentSlot extends InventorySlot {
    /**
     * Create a new equipment slot
     * @param {Object} config - Slot configuration
     */
    constructor(config = {}) {
        // Set equipment-specific defaults before calling super
        config.type = config.type || 'NONE'; // Equipment type (MAINHAND, OFFHAND, HEAD, CHEST, etc.)
        config.acceptsOnly = config.acceptsOnly || ['WEAPON', 'ARMOR', 'ACCESSORY'];
        
        // Call parent constructor
        super(config);
        
        // Equipment-specific properties
        this.slotType = config.slotType || this.type; // Duplicate for clarity
        this.displayName = config.displayName || this.getDefaultDisplayName();
        this.icon = config.icon || null;
        this.requiredLevel = config.requiredLevel || 1;
        this.priority = config.priority || 0; // For rendering order
        
        // Visual properties
        this.visualSlot = config.visualSlot || null; // Reference to visual slot in the character model
        this.iconSize = config.iconSize || { width: 32, height: 32 };
        this.iconOffset = config.iconOffset || { x: 0, y: 0 };
        
        // Set the default attachment data
        if (!this.attachmentBone) {
            this.attachmentBone = this.getDefaultAttachmentBone();
        }
    }
    
    /**
     * Get the default display name based on slot type
     * @returns {string} The display name
     * @private
     */
    getDefaultDisplayName() {
        switch (this.type) {
            case 'HEAD': return 'Head';
            case 'NECK': return 'Neck';
            case 'SHOULDERS': return 'Shoulders';
            case 'CHEST': return 'Chest';
            case 'BACK': return 'Back';
            case 'WRISTS': return 'Wrists';
            case 'HANDS': return 'Hands';
            case 'WAIST': return 'Waist';
            case 'LEGS': return 'Legs';
            case 'FEET': return 'Feet';
            case 'MAINHAND': return 'Main Hand';
            case 'OFFHAND': return 'Off Hand';
            case 'FINGER1': return 'Ring 1';
            case 'FINGER2': return 'Ring 2';
            case 'TRINKET1': return 'Trinket 1';
            case 'TRINKET2': return 'Trinket 2';
            default: return this.type.charAt(0).toUpperCase() + this.type.slice(1).toLowerCase();
        }
    }
    
    /**
     * Get the default attachment bone based on slot type
     * @returns {string|null} The attachment bone name
     * @private
     */
    getDefaultAttachmentBone() {
        switch (this.type) {
            case 'HEAD': return 'head';
            case 'NECK': return 'neck';
            case 'SHOULDERS': return 'shoulders';
            case 'CHEST': return 'spine2';
            case 'BACK': return 'spine1';
            case 'WRISTS': return 'forearm.L';
            case 'HANDS': return 'hand.R';
            case 'WAIST': return 'hips';
            case 'LEGS': return 'thigh.R';
            case 'FEET': return 'foot.R';
            case 'MAINHAND': return 'hand.R';
            case 'OFFHAND': return 'hand.L';
            case 'FINGER1': return 'finger1.L';
            case 'FINGER2': return 'finger1.R';
            default: return null;
        }
    }
    
    /**
     * Check if this slot can accept a given item
     * @param {Object} item - The item to check
     * @returns {boolean} Whether the item can be accepted
     * @override
     */
    canAccept(item) {
        if (!super.canAccept(item)) {
            return false;
        }
        
        // Additional equipment-specific checks
        if (!item.isEquippable) {
            return false;
        }
        
        // Check if this is the right equipment slot for this item
        if (item.equipSlot !== this.type) {
            return false;
        }
        
        // Check level requirement
        if (this.inventory && this.inventory.owner) {
            const owner = this.inventory.owner;
            if (owner.level < item.requiredLevel) {
                return false;
            }
            
            // Check other requirements (if the item implements meetsRequirements)
            if (typeof item.meetsRequirements === 'function') {
                if (!item.meetsRequirements(owner.stats)) {
                    return false;
                }
            }
        }
        
        return true;
    }
    
    /**
     * Set an item in this slot
     * @param {Object} item - The item to set
     * @param {number} quantity - Quantity of the item (usually 1)
     * @returns {boolean} Whether the item was set successfully
     * @override
     */
    setItem(item, quantity = 1) {
        // For equipment slots, we only allow one item
        if (item && quantity !== 1) {
            quantity = 1;
        }
        
        const oldItem = this.item;
        
        // Call parent method
        const success = super.setItem(item, quantity);
        
        if (success) {
            // Notify the item it was equipped
            if (item && typeof item.onEquip === 'function') {
                item.onEquip(this.inventory?.owner || null);
            }
            
            // Notify the old item it was unequipped
            if (oldItem && oldItem !== item && typeof oldItem.onUnequip === 'function') {
                oldItem.onUnequip(this.inventory?.owner || null);
            }
            
            // Update character stats if needed
            if (this.inventory && this.inventory.owner) {
                // Assuming owner has an updateStats method
                if (typeof this.inventory.owner.updateStats === 'function') {
                    this.inventory.owner.updateStats();
                }
            }
            
            // Update character model
            this.updateVisual();
        }
        
        return success;
    }
    
    /**
     * Clear this slot (remove the item)
     * @returns {Object} The removed item and quantity
     * @override
     */
    clearItem() {
        const oldItem = this.item;
        const result = super.clearItem();
        
        if (oldItem && typeof oldItem.onUnequip === 'function') {
            oldItem.onUnequip(this.inventory?.owner || null);
        }
        
        // Update character stats if needed
        if (this.inventory && this.inventory.owner) {
            // Assuming owner has an updateStats method
            if (typeof this.inventory.owner.updateStats === 'function') {
                this.inventory.owner.updateStats();
            }
        }
        
        // Update character model
        this.updateVisual();
        
        return result;
    }
    
    /**
     * Update the visual representation of the equipment
     */
    updateVisual() {
        if (!this.visualSlot) {
            return;
        }
        
        // Remove any existing visual
        while (this.visualSlot.children.length > 0) {
            this.visualSlot.remove(this.visualSlot.children[0]);
        }
        
        // If we have an item, add its model
        if (this.item) {
            const model = this.getItemModel();
            if (model) {
                this.visualSlot.add(model);
                
                // Apply attachment data
                const attachData = this.getAttachmentData();
                model.position.set(
                    attachData.offset.x,
                    attachData.offset.y,
                    attachData.offset.z
                );
                model.rotation.set(
                    attachData.rotation.x,
                    attachData.rotation.y,
                    attachData.rotation.z
                );
            }
        }
    }
    
    /**
     * Get the stat bonuses from this equipment slot
     * @returns {Object} Stat bonuses
     */
    getStatBonuses() {
        if (!this.item) {
            return {};
        }
        
        return this.item.stats || {};
    }
    
    /**
     * Check if this equipment slot is valid for a given character
     * @param {Object} character - The character
     * @returns {boolean} Whether the slot is valid
     */
    isValidForCharacter(character) {
        if (!character) {
            return true; // Default to true if no character
        }
        
        // Check character level against required level
        if (character.level < this.requiredLevel) {
            return false;
        }
        
        // Additional checks could be added here (e.g., class restrictions)
        
        return true;
    }
    
    /**
     * Get string representation of this equipment slot
     * @returns {string} String representation
     * @override
     */
    toString() {
        if (this.item) {
            return `${this.displayName}: ${this.item.name}`;
        }
        return `${this.displayName}: Empty`;
    }
} 