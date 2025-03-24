import * as THREE from 'three';
import { EquipmentSlot } from './slots/EquipmentSlot.js';

/**
 * Manages all equipment slots for a character
 * Handles equipping, unequipping, and stat calculations
 */
export class Equipment extends THREE.EventDispatcher {
    /**
     * Create a new equipment manager
     * @param {Object} config - Equipment configuration
     */
    constructor(config = {}) {
        super();
        
        this.id = config.id || `equipment_${Math.floor(Math.random() * 100000)}`;
        
        // The character/entity that owns this equipment
        this.owner = config.owner || null;
        
        // Equipment slots by type
        this.slots = {};
        
        // Visual model - parent object for attaching equipment models
        this.model = new THREE.Group();
        this.model.name = 'equipment';
        
        // Set breakdown - track set items for set bonuses
        this.sets = {};
        
        // Initialize default slots
        this._initializeDefaultSlots(config.slotConfig);
    }
    
    /**
     * Initialize the default equipment slots
     * @param {Object} slotConfig - Custom configuration for slots
     * @private
     */
    _initializeDefaultSlots(slotConfig = {}) {
        // Create standard equipment slots
        const defaultSlots = [
            { type: 'HEAD', displayName: 'Head' },
            { type: 'NECK', displayName: 'Neck' },
            { type: 'SHOULDERS', displayName: 'Shoulders' },
            { type: 'CHEST', displayName: 'Chest' },
            { type: 'BACK', displayName: 'Back' },
            { type: 'WRISTS', displayName: 'Wrists' },
            { type: 'HANDS', displayName: 'Hands' },
            { type: 'WAIST', displayName: 'Waist' },
            { type: 'LEGS', displayName: 'Legs' },
            { type: 'FEET', displayName: 'Feet' },
            { type: 'MAINHAND', displayName: 'Main Hand', acceptsOnly: ['WEAPON'] },
            { type: 'OFFHAND', displayName: 'Off Hand', acceptsOnly: ['WEAPON', 'ARMOR'] },
            { type: 'FINGER1', displayName: 'Ring 1', acceptsOnly: ['ACCESSORY'] },
            { type: 'FINGER2', displayName: 'Ring 2', acceptsOnly: ['ACCESSORY'] },
            { type: 'TRINKET1', displayName: 'Trinket 1', acceptsOnly: ['ACCESSORY'] },
            { type: 'TRINKET2', displayName: 'Trinket 2', acceptsOnly: ['ACCESSORY'] }
        ];
        
        // Create each slot
        for (const slotData of defaultSlots) {
            // Apply custom config if available
            const customConfig = slotConfig?.[slotData.type] || {};
            
            // Create the slot
            const slot = new EquipmentSlot({
                id: `${this.id}_${slotData.type.toLowerCase()}`,
                ...slotData,
                ...customConfig,
                inventory: this
            });
            
            // Store the slot
            this.slots[slotData.type] = slot;
            
            // Create a visual slot in the model
            const visualSlot = new THREE.Group();
            visualSlot.name = `slot_${slotData.type.toLowerCase()}`;
            this.model.add(visualSlot);
            
            // Link visual slot to equipment slot
            slot.visualSlot = visualSlot;
        }
    }
    
    /**
     * Connect this equipment to a character
     * @param {Object} owner - The character that owns this equipment
     */
    connectToOwner(owner) {
        if (!owner) {
            console.warn('Cannot connect equipment to null owner');
            return;
        }
        
        this.owner = owner;
        
        // If owner has a model, attach our equipment model
        if (owner.model) {
            owner.model.add(this.model);
        }
        
        // Dispatch event
        this.dispatchEvent({
            type: 'connected',
            owner: owner
        });
    }
    
    /**
     * Get a specific equipment slot
     * @param {string} slotType - The slot type
     * @returns {EquipmentSlot|null} The equipment slot or null if not found
     */
    getSlot(slotType) {
        return this.slots[slotType] || null;
    }
    
    /**
     * Get all equipment slots
     * @returns {Object} Map of all slots by type
     */
    getAllSlots() {
        return { ...this.slots };
    }
    
    /**
     * Get all equipped items
     * @returns {Array} Array of equipped items
     */
    getEquippedItems() {
        const items = [];
        
        for (const slotType in this.slots) {
            const slot = this.slots[slotType];
            if (slot && !slot.isEmpty()) {
                items.push(slot.item);
            }
        }
        
        return items;
    }
    
    /**
     * Equip an item to the appropriate slot
     * @param {Object} item - The item to equip
     * @returns {boolean} Whether the item was equipped successfully
     */
    equipItem(item) {
        if (!item || !item.isEquippable || !item.equipSlot) {
            console.warn(`Cannot equip ${item ? item.name : 'null'}: not equippable or no equipSlot specified`);
            return false;
        }
        
        const slot = this.getSlot(item.equipSlot);
        if (!slot) {
            console.warn(`Cannot equip ${item.name}: no matching slot found for ${item.equipSlot}`);
            return false;
        }
        
        // Check if we can accept this item
        if (!slot.canAccept(item)) {
            console.warn(`Cannot equip ${item.name}: slot ${item.equipSlot} cannot accept this item`);
            return false;
        }
        
        // Handle two-handed weapons special case
        if (item.isTwoHanded && item.equipSlot === 'MAINHAND') {
            // Unequip offhand if there's something there
            const offhandSlot = this.getSlot('OFFHAND');
            if (offhandSlot && !offhandSlot.isEmpty()) {
                offhandSlot.clearItem();
            }
        }
        
        // Equip the item
        const success = slot.setItem(item, 1);
        
        if (success) {
            // Update set tracking
            this._updateSetTracking();
            
            // Dispatch equipped event
            this.dispatchEvent({
                type: 'item_equipped',
                item: item,
                slot: slot
            });
        }
        
        return success;
    }
    
    /**
     * Unequip an item from a specific slot
     * @param {string} slotType - The slot type to unequip from
     * @returns {Object|null} The unequipped item or null if none
     */
    unequipSlot(slotType) {
        const slot = this.getSlot(slotType);
        if (!slot || slot.isEmpty()) {
            return null;
        }
        
        const item = slot.item;
        const result = slot.clearItem();
        
        if (result.item) {
            // Update set tracking
            this._updateSetTracking();
            
            // Dispatch unequipped event
            this.dispatchEvent({
                type: 'item_unequipped',
                item: result.item,
                slot: slot
            });
            
            return result.item;
        }
        
        return null;
    }
    
    /**
     * Unequip a specific item
     * @param {Object} item - The item to unequip
     * @returns {boolean} Whether the item was unequipped
     */
    unequipItem(item) {
        if (!item) {
            return false;
        }
        
        for (const slotType in this.slots) {
            const slot = this.slots[slotType];
            if (slot && slot.item === item) {
                const result = slot.clearItem();
                
                if (result.item) {
                    // Update set tracking
                    this._updateSetTracking();
                    
                    // Dispatch unequipped event
                    this.dispatchEvent({
                        type: 'item_unequipped',
                        item: result.item,
                        slot: slot
                    });
                    
                    return true;
                }
            }
        }
        
        return false;
    }
    
    /**
     * Unequip all items
     * @returns {Array} Array of unequipped items
     */
    unequipAll() {
        const unequippedItems = [];
        
        for (const slotType in this.slots) {
            const unequippedItem = this.unequipSlot(slotType);
            if (unequippedItem) {
                unequippedItems.push(unequippedItem);
            }
        }
        
        return unequippedItems;
    }
    
    /**
     * Check if an item is equipped
     * @param {Object} item - The item to check
     * @returns {boolean} Whether the item is equipped
     */
    isItemEquipped(item) {
        if (!item) {
            return false;
        }
        
        for (const slotType in this.slots) {
            const slot = this.slots[slotType];
            if (slot && slot.item === item) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Get the slot where an item is equipped
     * @param {Object} item - The item to find
     * @returns {EquipmentSlot|null} The slot where the item is equipped, or null
     */
    getSlotForItem(item) {
        if (!item) {
            return null;
        }
        
        for (const slotType in this.slots) {
            const slot = this.slots[slotType];
            if (slot && slot.item === item) {
                return slot;
            }
        }
        
        return null;
    }
    
    /**
     * Update tracking of equipment sets
     * @private
     */
    _updateSetTracking() {
        // Clear existing set tracking
        this.sets = {};
        
        // Find all items with set IDs
        for (const slotType in this.slots) {
            const slot = this.slots[slotType];
            if (slot && !slot.isEmpty() && slot.item.setId) {
                const setId = slot.item.setId;
                
                // Initialize set if not exists
                if (!this.sets[setId]) {
                    this.sets[setId] = {
                        name: slot.item.setName || setId,
                        items: [],
                        count: 0
                    };
                }
                
                // Add item to set
                this.sets[setId].items.push(slot.item);
                this.sets[setId].count++;
            }
        }
        
        // Dispatch set update event
        this.dispatchEvent({
            type: 'set_updated',
            sets: this.sets
        });
    }
    
    /**
     * Get all active equipment sets
     * @returns {Object} Map of active sets and their items
     */
    getActiveSets() {
        return { ...this.sets };
    }
    
    /**
     * Calculate the total stat bonuses from all equipped items
     * @returns {Object} Total stat bonuses
     */
    calculateStatBonuses() {
        const bonuses = {};
        
        // Add stats from each equipped item
        for (const slotType in this.slots) {
            const slot = this.slots[slotType];
            if (slot && !slot.isEmpty() && slot.item.stats) {
                for (const [stat, value] of Object.entries(slot.item.stats)) {
                    bonuses[stat] = (bonuses[stat] || 0) + value;
                }
            }
        }
        
        // Add set bonuses if applicable
        for (const setId in this.sets) {
            const set = this.sets[setId];
            
            // Check for set bonuses at different thresholds
            // This assumes set bonuses are defined on the items themselves
            // in a format like setBonus: { 2: {...stats}, 4: {...stats}, etc. }
            if (set.count >= 2 && set.items[0].setBonus?.[2]) {
                const bonusStats = set.items[0].setBonus[2];
                for (const [stat, value] of Object.entries(bonusStats)) {
                    bonuses[stat] = (bonuses[stat] || 0) + value;
                }
            }
            
            if (set.count >= 4 && set.items[0].setBonus?.[4]) {
                const bonusStats = set.items[0].setBonus[4];
                for (const [stat, value] of Object.entries(bonusStats)) {
                    bonuses[stat] = (bonuses[stat] || 0) + value;
                }
            }
            
            // Additional thresholds could be checked here
        }
        
        return bonuses;
    }
    
    /**
     * Apply equipment stats to the owner
     */
    applyStatBonuses() {
        if (!this.owner || typeof this.owner.applyEquipmentStats !== 'function') {
            return;
        }
        
        const statBonuses = this.calculateStatBonuses();
        this.owner.applyEquipmentStats(statBonuses);
    }
    
    /**
     * Get the total equipment weight
     * @returns {number} Total weight
     */
    getTotalWeight() {
        let totalWeight = 0;
        
        for (const slotType in this.slots) {
            const slot = this.slots[slotType];
            if (slot && !slot.isEmpty() && slot.item.weight) {
                totalWeight += slot.item.weight;
            }
        }
        
        return totalWeight;
    }
    
    /**
     * Get total equipment value
     * @returns {number} Total value
     */
    getTotalValue() {
        let totalValue = 0;
        
        for (const slotType in this.slots) {
            const slot = this.slots[slotType];
            if (slot && !slot.isEmpty() && slot.item.value) {
                totalValue += slot.item.value;
            }
        }
        
        return totalValue;
    }
    
    /**
     * Check if the owner meets the requirements for all equipped items
     * @returns {Object} Results showing which items have requirements not met
     */
    checkRequirements() {
        if (!this.owner) {
            return { valid: false, invalidItems: [] };
        }
        
        const invalidItems = [];
        
        for (const slotType in this.slots) {
            const slot = this.slots[slotType];
            if (slot && !slot.isEmpty()) {
                const item = slot.item;
                
                // Check if owner meets requirements
                if (typeof item.meetsRequirements === 'function') {
                    if (!item.meetsRequirements(this.owner.stats)) {
                        invalidItems.push({ item, slot: slotType });
                    }
                }
            }
        }
        
        return {
            valid: invalidItems.length === 0,
            invalidItems
        };
    }
    
    /**
     * Unequip any items that the owner no longer meets requirements for
     * @returns {Array} Array of unequipped items
     */
    unequipInvalidItems() {
        const { invalidItems } = this.checkRequirements();
        const unequippedItems = [];
        
        for (const { item, slot } of invalidItems) {
            const unequippedItem = this.unequipSlot(slot);
            if (unequippedItem) {
                unequippedItems.push(unequippedItem);
            }
        }
        
        return unequippedItems;
    }
    
    /**
     * Update the visuals for all equipment slots
     */
    updateVisuals() {
        for (const slotType in this.slots) {
            const slot = this.slots[slotType];
            if (slot) {
                slot.updateVisual();
            }
        }
    }
    
    /**
     * Clone this equipment setup
     * @returns {Equipment} A new equipment instance with the same setup
     */
    clone() {
        const newEquipment = new Equipment({
            id: `${this.id}_clone`
        });
        
        // Clone all equipped items
        for (const slotType in this.slots) {
            const slot = this.slots[slotType];
            if (slot && !slot.isEmpty() && typeof slot.item.clone === 'function') {
                const itemClone = slot.item.clone();
                newEquipment.equipItem(itemClone);
            }
        }
        
        return newEquipment;
    }
    
    /**
     * Attach equipment visual model to a character model
     * @param {THREE.Object3D} characterModel - The character model
     */
    attachToCharacterModel(characterModel) {
        if (!characterModel) {
            return;
        }
        
        // Remove from current parent if attached
        if (this.model.parent) {
            this.model.parent.remove(this.model);
        }
        
        // Add to character model
        characterModel.add(this.model);
        
        // Update visuals
        this.updateVisuals();
    }
    
    /**
     * Create a string representation of equipped items
     * @returns {string} Description of equipped items
     */
    toString() {
        let result = 'Equipment:\n';
        
        for (const slotType in this.slots) {
            const slot = this.slots[slotType];
            if (slot) {
                result += `  ${slot.toString()}\n`;
            }
        }
        
        return result;
    }
} 
