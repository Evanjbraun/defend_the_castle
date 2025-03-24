import { Inventory } from './Inventory.js';
import * as THREE from 'three';

/**
 * Character inventory that integrates with the equipment system
 * Handles both equipment slots and general inventory storage
 */
export class CharacterInventory extends Inventory {
    /**
     * Create a new character inventory
     * @param {Object} config - Configuration options
     */
    constructor(config = {}) {
        // Set character-specific defaults
        const characterConfig = {
            ...config,
            isGridBased: config.isGridBased !== undefined ? config.isGridBased : true,
            width: config.width || 5,
            height: config.height || 6,
            maxWeight: config.maxWeight || 150,
            name: config.name || 'Character Inventory'
        };
        
        super(characterConfig);
        
        // Reference to equipment system
        this.equipment = config.equipment || null;
        
        // Quick access slots (hotbar)
        this.quickSlots = [];
        this.maxQuickSlots = config.maxQuickSlots || 5;
        
        // Auto-equip settings
        this.autoEquipBetterItems = config.autoEquipBetterItems !== undefined ? config.autoEquipBetterItems : false;
        this.autoEquipNewItems = config.autoEquipNewItems !== undefined ? config.autoEquipNewItems : false;
        
        // Currency
        this.currencies = new Map();
        this.maxCurrencies = config.maxCurrencies || {};
        
        // Initialize character-specific functionality
        this._initializeCharacterInventory(config);
    }
    
    /**
     * Initialize character-specific inventory components
     * @param {Object} config - Configuration options
     * @private
     */
    _initializeCharacterInventory(config) {
        // Initialize quick slots
        this._initializeQuickSlots(config);
        
        // Initialize currencies
        this._initializeCurrencies(config);
        
        // Connect to equipment system if provided
        if (this.equipment) {
            this._connectEquipment(this.equipment);
        }
    }
    
    /**
     * Initialize quick slots
     * @param {Object} config - Configuration options
     * @private
     */
    _initializeQuickSlots(config) {
        // Use specified quick slots or create new ones
        if (config.quickSlots && Array.isArray(config.quickSlots)) {
            this.quickSlots = config.quickSlots;
        } else {
            for (let i = 0; i < this.maxQuickSlots; i++) {
                const quickSlot = this.createQuickSlot(i);
                this.quickSlots.push(quickSlot);
            }
        }
    }
    
    /**
     * Create a quick slot
     * @param {number} index - Slot index
     * @returns {Object} Quick slot object
     * @private
     */
    createQuickSlot(index) {
        return {
            index,
            item: null,
            quantity: 0,
            isEmpty: true,
            cooldown: 0,
            isSelected: false
        };
    }
    
    /**
     * Initialize currencies
     * @param {Object} config - Configuration options
     * @private
     */
    _initializeCurrencies(config) {
        // Initialize with default currencies
        const defaultCurrencies = {
            gold: { amount: 0, max: this.maxCurrencies.gold || 999999 },
            gems: { amount: 0, max: this.maxCurrencies.gems || 9999 }
        };
        
        // Override with provided currencies
        const currencies = config.currencies || defaultCurrencies;
        
        // Add each currency to the map
        Object.entries(currencies).forEach(([key, value]) => {
            this.currencies.set(key, {
                amount: value.amount || 0,
                max: value.max || this.maxCurrencies[key] || Number.MAX_SAFE_INTEGER
            });
        });
    }
    
    /**
     * Connect to an equipment system
     * @param {Object} equipment - The equipment system
     */
    connectEquipment(equipment) {
        if (!equipment) {
            return;
        }
        
        this.equipment = equipment;
        this._connectEquipment(equipment);
    }
    
    /**
     * Internal method to connect to equipment
     * @param {Object} equipment - The equipment system
     * @private
     */
    _connectEquipment(equipment) {
        // Link equipment to this inventory's owner
        if (this.owner && equipment.connectToOwner) {
            equipment.connectToOwner(this.owner);
        }
        
        // Listen for equipment events
        equipment.addEventListener('item_equipped', this._onItemEquipped.bind(this));
        equipment.addEventListener('item_unequipped', this._onItemUnequipped.bind(this));
        
        // Listen for inventory events that might affect equipment
        this.addEventListener('item_added', this._checkAutoEquip.bind(this));
    }
    
    /**
     * Set owner of the inventory
     * @param {Object} owner - The character that owns this inventory
     * @override
     */
    setOwner(owner) {
        super.setOwner(owner);
        
        // Connect equipment to the owner as well
        if (this.equipment && this.equipment.connectToOwner) {
            this.equipment.connectToOwner(owner);
        }
    }
    
    /**
     * Handle item equipped event
     * @param {Object} event - Equipment event
     * @private
     */
    _onItemEquipped(event) {
        // Check if the item came from this inventory
        const { item, slot } = event;
        
        if (!item) {
            return;
        }
        
        // Remove the item from inventory if it came from here
        // We check with hasItem to avoid removing items that were equipped from elsewhere
        if (this.hasItem(item.id)) {
            this.removeItem(item.id, 1);
            
            this.dispatchEvent({
                type: 'item_equipped',
                item,
                slot
            });
        }
    }
    
    /**
     * Handle item unequipped event
     * @param {Object} event - Equipment event
     * @private
     */
    _onItemUnequipped(event) {
        const { item, slot } = event;
        
        if (!item) {
            return;
        }
        
        // Try to add the item back to inventory
        const added = this.addItem(item, 1);
        
        if (added === 0) {
            // Couldn't add to inventory (e.g., inventory full)
            // Dispatch item dropped event for the game to handle
            this.dispatchEvent({
                type: 'item_dropped',
                item,
                reason: 'inventory_full'
            });
        } else {
            this.dispatchEvent({
                type: 'item_unequipped',
                item,
                slot
            });
        }
    }
    
    /**
     * Check if a newly added item should be auto-equipped
     * @param {Object} event - Item added event
     * @private
     */
    _checkAutoEquip(event) {
        if (!this.equipment || !this.autoEquipBetterItems && !this.autoEquipNewItems) {
            return;
        }
        
        const { item } = event;
        
        // Check if the item is equippable
        if (!item.isEquippable) {
            return;
        }
        
        // Get the appropriate equipment slot for this item
        const equipSlotType = item.equipSlot;
        
        if (!equipSlotType) {
            return;
        }
        
        // Check for auto-equip new items
        if (this.autoEquipNewItems) {
            const equipSlot = this.equipment.getSlot(equipSlotType);
            
            // Auto-equip only if the slot is empty
            if (equipSlot && equipSlot.isEmpty()) {
                this.equipItem(item);
                return;
            }
        }
        
        // Check for auto-equip better items
        if (this.autoEquipBetterItems) {
            const equipSlot = this.equipment.getSlot(equipSlotType);
            
            if (!equipSlot) {
                return;
            }
            
            // Check if the new item is better than the currently equipped one
            const currentItem = equipSlot.item;
            
            if (!currentItem) {
                // Nothing equipped, equip the new item
                this.equipItem(item);
                return;
            }
            
            // Compare the items (higher score means better item)
            if (this._compareItems(item, currentItem) > 0) {
                this.equipItem(item);
            }
        }
    }
    
    /**
     * Compare two items to determine which is better
     * @param {Object} itemA - First item
     * @param {Object} itemB - Second item
     * @returns {number} Positive if A is better, negative if B is better, 0 if equal
     * @private
     */
    _compareItems(itemA, itemB) {
        // Simple implementation - can be expanded based on game needs
        
        // Compare by rarity first
        const rarityOrder = { 'LEGENDARY': 5, 'EPIC': 4, 'RARE': 3, 'UNCOMMON': 2, 'COMMON': 1, 'JUNK': 0 };
        const rarityA = rarityOrder[itemA.rarity] || 0;
        const rarityB = rarityOrder[itemB.rarity] || 0;
        
        if (rarityA !== rarityB) {
            return rarityA - rarityB;
        }
        
        // If same rarity, compare stats
        const statsA = this._calculateStatScore(itemA);
        const statsB = this._calculateStatScore(itemB);
        
        return statsA - statsB;
    }
    
    /**
     * Calculate a score for an item based on its stats
     * @param {Object} item - The item to score
     * @returns {number} The stat score
     * @private
     */
    _calculateStatScore(item) {
        if (!item.stats) {
            return 0;
        }
        
        // Calculate a weighted score based on the character's preferences
        // This can be customized based on character class, etc.
        let score = 0;
        const weightMap = this._getStatWeights();
        
        Object.entries(item.stats).forEach(([stat, value]) => {
            const weight = weightMap[stat] || 1;
            score += value * weight;
        });
        
        return score;
    }
    
    /**
     * Get stat weights for scoring items
     * @returns {Object} Map of stats to weights
     * @private
     */
    _getStatWeights() {
        // Default weights
        const defaultWeights = {
            attack: 1,
            defense: 1,
            health: 0.5,
            mana: 0.5,
            strength: 1,
            dexterity: 1,
            intelligence: 1,
            critChance: 2,
            critDamage: 1.5
        };
        
        // If we have an owner with class preferences, use those
        if (this.owner && this.owner.characterClass) {
            const classWeights = this._getClassStatWeights(this.owner.characterClass);
            return { ...defaultWeights, ...classWeights };
        }
        
        return defaultWeights;
    }
    
    /**
     * Get stat weights based on character class
     * @param {string} characterClass - The character's class
     * @returns {Object} Map of stats to weights
     * @private
     */
    _getClassStatWeights(characterClass) {
        switch (characterClass.toUpperCase()) {
            case 'WARRIOR':
                return {
                    strength: 2,
                    defense: 1.5,
                    health: 1,
                    intelligence: 0.5
                };
            case 'MAGE':
                return {
                    intelligence: 2,
                    mana: 1.5,
                    health: 0.7,
                    strength: 0.5,
                    defense: 0.8
                };
            case 'ROGUE':
                return {
                    dexterity: 2,
                    critChance: 2.5,
                    critDamage: 2,
                    attack: 1.5,
                    defense: 0.7
                };
            case 'CLERIC':
                return {
                    intelligence: 1.5,
                    strength: 1,
                    defense: 1.2,
                    health: 1.2,
                    mana: 1.5
                };
            default:
                return {};
        }
    }
    
    /**
     * Equip an item from the inventory
     * @param {Object} item - The item to equip
     * @returns {boolean} Whether the equip was successful
     */
    equipItem(item) {
        if (!this.equipment || !item || !item.isEquippable) {
            return false;
        }
        
        // Check if we have the item in inventory
        if (!this.hasItem(item.id)) {
            return false;
        }
        
        // Try to equip the item
        const success = this.equipment.equipItem(item);
        
        return success;
    }
    
    /**
     * Unequip an item from a specific slot
     * @param {string} slotType - The equipment slot type
     * @returns {boolean} Whether the unequip was successful
     */
    unequipSlot(slotType) {
        if (!this.equipment) {
            return false;
        }
        
        // Check if there's enough space in inventory first
        const equipSlot = this.equipment.getSlot(slotType);
        
        if (!equipSlot || !equipSlot.item) {
            return false;
        }
        
        // Make sure we can add the item to inventory
        if (!this.canAddItem(equipSlot.item, 1)) {
            return false;
        }
        
        // Unequip the item
        return this.equipment.unequipSlot(slotType);
    }
    
    /**
     * Add currency to the inventory
     * @param {string} currencyType - The type of currency
     * @param {number} amount - The amount to add
     * @returns {number} The amount that was actually added
     */
    addCurrency(currencyType, amount) {
        if (!currencyType || amount <= 0) {
            return 0;
        }
        
        // Get current currency data
        const currencyData = this.currencies.get(currencyType);
        
        if (!currencyData) {
            // Create new currency type if it doesn't exist
            this.currencies.set(currencyType, {
                amount,
                max: this.maxCurrencies[currencyType] || Number.MAX_SAFE_INTEGER
            });
            
            this.dispatchEvent({
                type: 'currency_added',
                currencyType,
                amount
            });
            
            return amount;
        }
        
        // Check max limit
        const currentAmount = currencyData.amount;
        const maxAmount = currencyData.max;
        
        const newAmount = Math.min(currentAmount + amount, maxAmount);
        const actualAdded = newAmount - currentAmount;
        
        if (actualAdded <= 0) {
            return 0;
        }
        
        // Update currency
        currencyData.amount = newAmount;
        
        this.dispatchEvent({
            type: 'currency_added',
            currencyType,
            amount: actualAdded
        });
        
        return actualAdded;
    }
    
    /**
     * Remove currency from the inventory
     * @param {string} currencyType - The type of currency
     * @param {number} amount - The amount to remove
     * @returns {boolean} Whether the removal was successful
     */
    removeCurrency(currencyType, amount) {
        if (!currencyType || amount <= 0) {
            return false;
        }
        
        // Get current currency data
        const currencyData = this.currencies.get(currencyType);
        
        if (!currencyData || currencyData.amount < amount) {
            return false;
        }
        
        // Update currency
        currencyData.amount -= amount;
        
        this.dispatchEvent({
            type: 'currency_removed',
            currencyType,
            amount
        });
        
        return true;
    }
    
    /**
     * Get the amount of a specific currency
     * @param {string} currencyType - The type of currency
     * @returns {number} The amount of currency
     */
    getCurrency(currencyType) {
        const currencyData = this.currencies.get(currencyType);
        return currencyData ? currencyData.amount : 0;
    }
    
    /**
     * Set an item in a quick slot
     * @param {number} slotIndex - The quick slot index
     * @param {Object} item - The item to set
     * @returns {boolean} Whether the operation was successful
     */
    setQuickSlot(slotIndex, item) {
        if (slotIndex < 0 || slotIndex >= this.quickSlots.length) {
            return false;
        }
        
        // Check if we have the item in inventory
        if (!this.hasItem(item.id)) {
            return false;
        }
        
        const quickSlot = this.quickSlots[slotIndex];
        
        // Clear existing item if any
        if (quickSlot.item) {
            quickSlot.item = null;
            quickSlot.quantity = 0;
            quickSlot.isEmpty = true;
        }
        
        // Set new item
        quickSlot.item = item;
        quickSlot.quantity = this.getItemCount(item.id);
        quickSlot.isEmpty = false;
        
        this.dispatchEvent({
            type: 'quick_slot_set',
            slotIndex,
            item
        });
        
        return true;
    }
    
    /**
     * Clear a quick slot
     * @param {number} slotIndex - The quick slot index
     * @returns {boolean} Whether the operation was successful
     */
    clearQuickSlot(slotIndex) {
        if (slotIndex < 0 || slotIndex >= this.quickSlots.length) {
            return false;
        }
        
        const quickSlot = this.quickSlots[slotIndex];
        
        if (quickSlot.isEmpty) {
            return false;
        }
        
        const oldItem = quickSlot.item;
        
        quickSlot.item = null;
        quickSlot.quantity = 0;
        quickSlot.isEmpty = true;
        quickSlot.cooldown = 0;
        
        this.dispatchEvent({
            type: 'quick_slot_cleared',
            slotIndex,
            oldItem
        });
        
        return true;
    }
    
    /**
     * Use an item from a quick slot
     * @param {number} slotIndex - The quick slot index
     * @returns {boolean} Whether the item was used successfully
     */
    useQuickSlot(slotIndex) {
        if (slotIndex < 0 || slotIndex >= this.quickSlots.length) {
            return false;
        }
        
        const quickSlot = this.quickSlots[slotIndex];
        
        if (quickSlot.isEmpty) {
            return false;
        }
        
        const item = quickSlot.item;
        
        // Check if the item is on cooldown
        if (quickSlot.cooldown > 0) {
            return false;
        }
        
        // Check if we still have the item in inventory
        if (!this.hasItem(item.id)) {
            // Update quick slot to reflect current state
            this.clearQuickSlot(slotIndex);
            return false;
        }
        
        // Try to use the item
        if (!item.use || typeof item.use !== 'function') {
            return false;
        }
        
        const success = item.use(this.owner);
        
        if (success) {
            // Remove one instance of the item if it's consumed
            if (item.isConsumable) {
                this.removeItem(item.id, 1);
                
                // Update quick slot quantity
                quickSlot.quantity = this.getItemCount(item.id);
                
                // If quantity is now 0, clear the slot
                if (quickSlot.quantity <= 0) {
                    this.clearQuickSlot(slotIndex);
                }
            }
            
            // Set cooldown if applicable
            if (item.cooldown) {
                quickSlot.cooldown = item.cooldown;
            }
            
            this.dispatchEvent({
                type: 'quick_slot_used',
                slotIndex,
                item
            });
        }
        
        return success;
    }
    
    /**
     * Select a quick slot
     * @param {number} slotIndex - The quick slot index
     */
    selectQuickSlot(slotIndex) {
        if (slotIndex < 0 || slotIndex >= this.quickSlots.length) {
            return;
        }
        
        // Deselect currently selected slot if any
        for (const slot of this.quickSlots) {
            if (slot.isSelected) {
                slot.isSelected = false;
            }
        }
        
        // Select the new slot
        this.quickSlots[slotIndex].isSelected = true;
        
        this.dispatchEvent({
            type: 'quick_slot_selected',
            slotIndex
        });
    }
    
    /**
     * Update quick slots (e.g., cooldowns)
     * @param {number} deltaTime - Time elapsed since last update
     */
    updateQuickSlots(deltaTime) {
        for (const quickSlot of this.quickSlots) {
            if (quickSlot.cooldown > 0) {
                quickSlot.cooldown = Math.max(0, quickSlot.cooldown - deltaTime);
                
                if (quickSlot.cooldown === 0) {
                    this.dispatchEvent({
                        type: 'quick_slot_cooldown_complete',
                        slotIndex: quickSlot.index,
                        item: quickSlot.item
                    });
                }
            }
            
            // Update quantity to match inventory
            if (!quickSlot.isEmpty) {
                const currentQuantity = this.getItemCount(quickSlot.item.id);
                
                if (currentQuantity !== quickSlot.quantity) {
                    quickSlot.quantity = currentQuantity;
                    
                    // If quantity is now 0, clear the slot
                    if (currentQuantity <= 0) {
                        this.clearQuickSlot(quickSlot.index);
                    }
                }
            }
        }
    }
    
    /**
     * Update the inventory
     * @param {number} deltaTime - Time elapsed since last update
     * @override
     */
    update(deltaTime) {
        super.update(deltaTime);
        
        // Update quick slots
        this.updateQuickSlots(deltaTime);
        
        // Update equipment if available
        if (this.equipment && typeof this.equipment.update === 'function') {
            this.equipment.update(deltaTime);
        }
    }
    
    /**
     * Get both inventory and equipment items
     * @returns {Array} Array of all items from inventory and equipment
     */
    getAllCharacterItems() {
        const items = this.getAllItems();
        
        // Add equipped items if equipment is available
        if (this.equipment) {
            const equippedItems = this.equipment.getEquippedItems().map(item => ({
                item,
                quantity: 1,
                equipped: true
            }));
            
            items.push(...equippedItems);
        }
        
        return items;
    }
    
    /**
     * Serialize the character inventory to JSON
     * @returns {Object} JSON representation
     * @override
     */
    toJSON() {
        const baseJSON = super.toJSON();
        
        // Add character-specific properties
        const currencies = {};
        this.currencies.forEach((data, type) => {
            currencies[type] = {
                amount: data.amount,
                max: data.max
            };
        });
        
        const quickSlots = this.quickSlots.map(slot => {
            if (slot.isEmpty) {
                return { index: slot.index, isEmpty: true };
            }
            
            return {
                index: slot.index,
                itemId: slot.item.id,
                isEmpty: false
            };
        });
        
        return {
            ...baseJSON,
            currencies,
            quickSlots,
            autoEquipBetterItems: this.autoEquipBetterItems,
            autoEquipNewItems: this.autoEquipNewItems
        };
    }
    
    /**
     * Load character inventory from JSON data
     * @param {Object} jsonData - JSON data to load
     * @param {Function} itemLoader - Function to load items by ID
     * @returns {Promise<boolean>} Promise resolving to whether the load was successful
     * @override
     */
    async fromJSON(jsonData, itemLoader) {
        const success = await super.fromJSON(jsonData, itemLoader);
        
        if (!success) {
            return false;
        }
        
        // Load currencies
        if (jsonData.currencies) {
            this.currencies.clear();
            
            Object.entries(jsonData.currencies).forEach(([type, data]) => {
                this.currencies.set(type, {
                    amount: data.amount,
                    max: data.max
                });
            });
        }
        
        // Load quick slots
        if (jsonData.quickSlots && Array.isArray(jsonData.quickSlots)) {
            for (const slotData of jsonData.quickSlots) {
                if (slotData.isEmpty) {
                    continue;
                }
                
                const item = await Promise.resolve(itemLoader(slotData.itemId));
                
                if (item) {
                    this.setQuickSlot(slotData.index, item);
                }
            }
        }
        
        // Load settings
        if (jsonData.autoEquipBetterItems !== undefined) {
            this.autoEquipBetterItems = jsonData.autoEquipBetterItems;
        }
        
        if (jsonData.autoEquipNewItems !== undefined) {
            this.autoEquipNewItems = jsonData.autoEquipNewItems;
        }
        
        return true;
    }
    
    /**
     * Destroy the character inventory and clean up
     * @override
     */
    destroy() {
        // Clean up equipment references and listeners
        if (this.equipment) {
            this.equipment.removeEventListener('item_equipped', this._onItemEquipped);
            this.equipment.removeEventListener('item_unequipped', this._onItemUnequipped);
            this.equipment = null;
        }
        
        // Clear quick slots
        this.quickSlots = [];
        
        // Clear currencies
        this.currencies.clear();
        
        // Call parent destroy
        super.destroy();
    }
} 