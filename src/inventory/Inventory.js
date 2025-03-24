import * as THREE from 'three';
import { InventorySlot } from './InventorySlot.js';
import { InventoryGrid } from './InventoryGrid.js';

/**
 * Main inventory class for storing and managing items
 * Can be configured as a grid-based inventory or a simple slot list
 */
export class Inventory extends THREE.EventDispatcher {
    /**
     * Create a new inventory
     * @param {Object} config - Configuration options
     */
    constructor(config = {}) {
        super();
        
        this.id = config.id || `inventory_${Math.floor(Math.random() * 100000)}`;
        this.name = config.name || 'Inventory';
        this.owner = config.owner || null;
        
        // Inventory type and layout
        this.isGridBased = config.isGridBased !== undefined ? config.isGridBased : true;
        
        // If grid-based, these determine the dimensions
        this.width = config.width || 6;
        this.height = config.height || 4;
        this.cellSize = config.cellSize || 64;
        this.padding = config.padding || 4;
        
        // Slots can be grid-based or list-based
        this.slots = [];
        this.grid = null;
        
        // For non-grid inventories, this is the max number of slots
        this.maxSlots = config.maxSlots || 24;
        
        // Weight and space limitations
        this.maxWeight = config.maxWeight || 100;
        this.currentWeight = 0;
        
        // Item sorting configuration
        this.autoSort = config.autoSort || false;
        this.sortBy = config.sortBy || 'type';
        
        // Visual properties
        this.visible = config.visible !== undefined ? config.visible : true;
        this.position = config.position || { x: 0, y: 0, z: 0 };
        this.scale = config.scale || { x: 1, y: 1, z: 1 };
        
        // Events
        this.onItemAdded = config.onItemAdded || null;
        this.onItemRemoved = config.onItemRemoved || null;
        this.onInventoryFull = config.onInventoryFull || null;
        
        // Debug mode
        this.debug = config.debug || false;
        
        // Initialize the inventory
        this.initialize();
    }
    
    /**
     * Initialize the inventory structure
     */
    initialize() {
        if (this.isGridBased) {
            this._initializeGrid();
        } else {
            this._initializeSlots();
        }
        
        // Dispatch initialization event
        this.dispatchEvent({ type: 'inventory_initialized', inventory: this });
        
        if (this.debug) {
            console.log(`Inventory initialized: ${this.id} with ${this.getSlotCount()} slots`);
        }
    }
    
    /**
     * Initialize a grid-based inventory
     * @private
     */
    _initializeGrid() {
        // Create the grid
        this.grid = new InventoryGrid({
            width: this.width,
            height: this.height,
            cellSize: this.cellSize,
            padding: this.padding,
            owner: this
        });
        
        // Reference the slots from the grid
        this.slots = this.grid.getAllSlots();
    }
    
    /**
     * Initialize a slot-based inventory
     * @private
     */
    _initializeSlots() {
        // Create individual slots
        for (let i = 0; i < this.maxSlots; i++) {
            const slot = new InventorySlot({
                id: `${this.id}_slot_${i}`,
                index: i,
                inventory: this
            });
            
            this.slots.push(slot);
        }
    }
    
    /**
     * Connect this inventory to an owner
     * @param {Object} owner - The entity that owns this inventory
     */
    setOwner(owner) {
        this.owner = owner;
        
        // Update owner reference in slots
        this.slots.forEach(slot => {
            slot.inventory = this;
        });
        
        this.dispatchEvent({ type: 'inventory_owner_changed', owner });
    }
    
    /**
     * Get the total number of slots in the inventory
     * @returns {number} Total slot count
     */
    getSlotCount() {
        return this.slots.length;
    }
    
    /**
     * Get a specific slot by index
     * @param {number} index - The slot index
     * @returns {InventorySlot|null} The slot or null if not found
     */
    getSlot(index) {
        if (index < 0 || index >= this.slots.length) {
            return null;
        }
        
        return this.slots[index];
    }
    
    /**
     * Get all slots in the inventory
     * @returns {Array} Array of inventory slots
     */
    getAllSlots() {
        return [...this.slots];
    }
    
    /**
     * Get all non-empty slots
     * @returns {Array} Array of slots containing items
     */
    getOccupiedSlots() {
        return this.slots.filter(slot => !slot.isEmpty());
    }
    
    /**
     * Get all empty slots
     * @returns {Array} Array of empty slots
     */
    getEmptySlots() {
        return this.slots.filter(slot => slot.isEmpty());
    }
    
    /**
     * Check if the inventory has any empty slots
     * @returns {boolean} Whether the inventory has empty slots
     */
    hasEmptySlots() {
        return this.getEmptySlots().length > 0;
    }
    
    /**
     * Check if the inventory is completely full
     * @returns {boolean} Whether the inventory is full
     */
    isFull() {
        return this.getEmptySlots().length === 0;
    }
    
    /**
     * Add an item to the inventory
     * @param {Object} item - The item to add
     * @param {number} quantity - The quantity to add
     * @returns {number} The quantity that was actually added
     */
    addItem(item, quantity = 1) {
        if (!item || quantity <= 0) {
            return 0;
        }
        
        // Check weight limit
        if (this.maxWeight > 0) {
            const itemWeight = item.weight || 0;
            const totalAddedWeight = itemWeight * quantity;
            
            if (this.currentWeight + totalAddedWeight > this.maxWeight) {
                // Calculate how many we can add before hitting weight limit
                const maxAddable = Math.floor((this.maxWeight - this.currentWeight) / itemWeight);
                
                if (maxAddable <= 0) {
                    if (this.onInventoryFull) {
                        this.onInventoryFull(this, item, quantity, 'weight_limit');
                    }
                    
                    this.dispatchEvent({ 
                        type: 'inventory_weight_exceeded', 
                        item, 
                        quantity, 
                        currentWeight: this.currentWeight,
                        maxWeight: this.maxWeight
                    });
                    
                    return 0;
                }
                
                quantity = maxAddable;
            }
        }
        
        let addedQuantity = 0;
        
        // First, try to add to existing stacks if the item is stackable
        if (item.isStackable) {
            // Find slots with the same item type that aren't full
            const matchingSlots = this.slots.filter(slot => 
                !slot.isEmpty() && 
                slot.item.canStackWith(item) && 
                !slot.isFull()
            );
            
            // Add to existing stacks first
            for (const slot of matchingSlots) {
                const remainingQuantity = quantity - addedQuantity;
                
                if (remainingQuantity <= 0) {
                    break;
                }
                
                const spaceInSlot = slot.getRemainingSpace();
                const quantityToAdd = Math.min(spaceInSlot, remainingQuantity);
                
                if (quantityToAdd > 0) {
                    slot.addQuantity(quantityToAdd);
                    addedQuantity += quantityToAdd;
                }
            }
        }
        
        // If we couldn't add all items to existing stacks, find empty slots
        const remainingQuantity = quantity - addedQuantity;
        
        if (remainingQuantity > 0) {
            if (this.isGridBased) {
                // For grid-based inventory, use the grid placement logic
                const added = this.grid.autoPlaceItem(item, remainingQuantity);
                addedQuantity += added;
            } else {
                // For slot-based inventory, find first available empty slot
                const emptySlots = this.getEmptySlots();
                
                let remainingToAdd = remainingQuantity;
                let i = 0;
                
                while (remainingToAdd > 0 && i < emptySlots.length) {
                    const slot = emptySlots[i];
                    const maxStack = item.maxStackSize || 1;
                    const quantityForThisSlot = Math.min(remainingToAdd, maxStack);
                    
                    if (slot.setItem(item, quantityForThisSlot)) {
                        remainingToAdd -= quantityForThisSlot;
                        addedQuantity += quantityForThisSlot;
                    }
                    
                    i++;
                }
                
                // If we couldn't add all items, trigger inventory full event
                if (remainingToAdd > 0 && this.onInventoryFull) {
                    this.onInventoryFull(this, item, remainingToAdd, 'no_space');
                }
            }
        }
        
        // Update weight
        if (addedQuantity > 0) {
            this.currentWeight += (item.weight || 0) * addedQuantity;
            
            // Dispatch event
            this.dispatchEvent({ 
                type: 'item_added', 
                item, 
                quantity: addedQuantity
            });
            
            // Call callback if provided
            if (this.onItemAdded) {
                this.onItemAdded(this, item, addedQuantity);
            }
            
            // Auto sort if configured
            if (this.autoSort) {
                this.sortItems();
            }
        }
        
        return addedQuantity;
    }
    
    /**
     * Remove an item from the inventory
     * @param {string|Object} itemIdOrInstance - The item ID or instance to remove
     * @param {number} quantity - The quantity to remove
     * @returns {number} The quantity that was actually removed
     */
    removeItem(itemIdOrInstance, quantity = 1) {
        if (!itemIdOrInstance || quantity <= 0) {
            return 0;
        }
        
        // Handle both item instance and item ID
        const itemId = typeof itemIdOrInstance === 'string' 
            ? itemIdOrInstance 
            : itemIdOrInstance.id;
            
        if (!itemId) {
            return 0;
        }
        
        // Find slots with this item
        const slotsWithItem = this.slots.filter(slot => 
            !slot.isEmpty() && slot.item.id === itemId
        );
        
        if (slotsWithItem.length === 0) {
            return 0;
        }
        
        let removedQuantity = 0;
        
        // Sort by quantity (smallest first) to avoid breaking stacks unnecessarily
        slotsWithItem.sort((a, b) => a.quantity - b.quantity);
        
        // Remove from slots
        for (const slot of slotsWithItem) {
            const remainingToRemove = quantity - removedQuantity;
            
            if (remainingToRemove <= 0) {
                break;
            }
            
            const quantityInSlot = slot.quantity;
            const quantityToRemove = Math.min(quantityInSlot, remainingToRemove);
            
            if (quantityToRemove >= quantityInSlot) {
                // Remove entire stack
                const removedItem = slot.item;
                slot.clearItem();
                removedQuantity += quantityInSlot;
                
                // Update weight
                this.currentWeight = Math.max(0, this.currentWeight - (removedItem.weight || 0) * quantityInSlot);
            } else {
                // Remove partial stack
                slot.removeQuantity(quantityToRemove);
                removedQuantity += quantityToRemove;
                
                // Update weight
                this.currentWeight = Math.max(0, this.currentWeight - (slot.item.weight || 0) * quantityToRemove);
            }
        }
        
        if (removedQuantity > 0) {
            // Get the item for the event
            const item = slotsWithItem[0].item;
            
            // Dispatch event
            this.dispatchEvent({ 
                type: 'item_removed', 
                itemId, 
                quantity: removedQuantity
            });
            
            // Call callback if provided
            if (this.onItemRemoved) {
                this.onItemRemoved(this, item, removedQuantity);
            }
        }
        
        return removedQuantity;
    }
    
    /**
     * Check if the inventory contains a specific item
     * @param {string|Object} itemIdOrInstance - The item ID or instance to check for
     * @param {number} quantity - The minimum quantity required
     * @returns {boolean} Whether the inventory contains the item
     */
    hasItem(itemIdOrInstance, quantity = 1) {
        return this.getItemCount(itemIdOrInstance) >= quantity;
    }
    
    /**
     * Get the count of a specific item in the inventory
     * @param {string|Object} itemIdOrInstance - The item ID or instance to count
     * @returns {number} The total quantity of the item
     */
    getItemCount(itemIdOrInstance) {
        if (!itemIdOrInstance) {
            return 0;
        }
        
        // Handle both item instance and item ID
        const itemId = typeof itemIdOrInstance === 'string' 
            ? itemIdOrInstance 
            : itemIdOrInstance.id;
            
        if (!itemId) {
            return 0;
        }
        
        // Count items across all slots
        return this.slots.reduce((total, slot) => {
            if (!slot.isEmpty() && slot.item.id === itemId) {
                return total + slot.quantity;
            }
            return total;
        }, 0);
    }
    
    /**
     * Get all items in the inventory (with quantities)
     * @returns {Array} Array of {item, quantity} objects
     */
    getAllItems() {
        const items = [];
        const itemMap = new Map();
        
        // Count items
        for (const slot of this.slots) {
            if (slot.isEmpty()) {
                continue;
            }
            
            const item = slot.item;
            const quantity = slot.quantity;
            
            if (itemMap.has(item.id)) {
                itemMap.set(item.id, {
                    item,
                    quantity: itemMap.get(item.id).quantity + quantity
                });
            } else {
                itemMap.set(item.id, { item, quantity });
            }
        }
        
        // Convert to array
        for (const itemData of itemMap.values()) {
            items.push(itemData);
        }
        
        return items;
    }
    
    /**
     * Get all unique items in the inventory (ignoring quantities)
     * @returns {Array} Array of unique items
     */
    getUniqueItems() {
        const uniqueItems = [];
        const seenIds = new Set();
        
        for (const slot of this.slots) {
            if (slot.isEmpty()) {
                continue;
            }
            
            const item = slot.item;
            
            if (!seenIds.has(item.id)) {
                uniqueItems.push(item);
                seenIds.add(item.id);
            }
        }
        
        return uniqueItems;
    }
    
    /**
     * Sort the inventory according to a sorting function
     * @param {Function} sortFn - Custom sorting function
     */
    sortItems(sortFn) {
        if (this.isGridBased && this.grid) {
            this.grid.sortItems(sortFn);
            return;
        }
        
        // Default sort function if none provided
        const defaultSortFn = (a, b) => {
            // First sort by type
            if (a.item.type !== b.item.type) {
                return a.item.type.localeCompare(b.item.type);
            }
            
            // Then by rarity (higher rarity first)
            const rarityOrder = { 'LEGENDARY': 5, 'EPIC': 4, 'RARE': 3, 'UNCOMMON': 2, 'COMMON': 1, 'JUNK': 0 };
            const aRarity = rarityOrder[a.item.rarity] || 0;
            const bRarity = rarityOrder[b.item.rarity] || 0;
            
            if (aRarity !== bRarity) {
                return bRarity - aRarity;
            }
            
            // Then by name
            return a.item.name.localeCompare(b.item.name);
        };
        
        // Get all non-empty slots and their content
        const occupiedSlots = this.getOccupiedSlots();
        const slotContents = occupiedSlots.map(slot => ({
            item: slot.item,
            quantity: slot.quantity
        }));
        
        // Clear all slots
        occupiedSlots.forEach(slot => slot.clearItem());
        
        // Sort items
        slotContents.sort(sortFn || defaultSortFn);
        
        // Place back in sorted order
        for (const content of slotContents) {
            this.addItem(content.item, content.quantity);
        }
        
        this.dispatchEvent({ type: 'inventory_sorted' });
    }
    
    /**
     * Check if an item can be added to the inventory
     * @param {Object} item - The item to check
     * @param {number} quantity - The quantity to check
     * @returns {boolean} Whether the item can be added
     */
    canAddItem(item, quantity = 1) {
        if (!item || quantity <= 0) {
            return false;
        }
        
        // Check weight limit
        if (this.maxWeight > 0) {
            const itemWeight = item.weight || 0;
            const totalAddedWeight = itemWeight * quantity;
            
            if (this.currentWeight + totalAddedWeight > this.maxWeight) {
                return false;
            }
        }
        
        // For grid-based inventory, use the grid check
        if (this.isGridBased && this.grid) {
            return this.grid.canAcceptItem(item, quantity);
        }
        
        // For slot-based, check available space in existing stacks
        let remainingQuantity = quantity;
        
        if (item.isStackable) {
            // Check space in existing stacks
            const matchingSlots = this.slots.filter(slot => 
                !slot.isEmpty() && 
                slot.item.canStackWith(item) && 
                !slot.isFull()
            );
            
            for (const slot of matchingSlots) {
                const spaceInSlot = slot.getRemainingSpace();
                remainingQuantity -= spaceInSlot;
                
                if (remainingQuantity <= 0) {
                    return true;
                }
            }
        }
        
        // Check if we have enough empty slots for the remaining quantity
        const emptySlots = this.getEmptySlots().length;
        const slotsNeeded = Math.ceil(remainingQuantity / (item.maxStackSize || 1));
        
        return slotsNeeded <= emptySlots;
    }
    
    /**
     * Transfer an item from this inventory to another
     * @param {Inventory} targetInventory - The inventory to transfer to
     * @param {string|Object} itemIdOrInstance - The item to transfer
     * @param {number} quantity - The quantity to transfer
     * @returns {boolean} Whether the transfer was successful
     */
    transferItem(targetInventory, itemIdOrInstance, quantity = 1) {
        if (!targetInventory || !itemIdOrInstance || quantity <= 0) {
            return false;
        }
        
        // Get the actual item instance
        const itemId = typeof itemIdOrInstance === 'string'
            ? itemIdOrInstance
            : itemIdOrInstance.id;
            
        // Check if we have enough of this item
        if (!this.hasItem(itemId, quantity)) {
            return false;
        }
        
        // Get an actual item instance for the transfer
        const itemInstance = this.getItemInstance(itemId);
        if (!itemInstance) {
            return false;
        }
        
        // Check if target inventory can accept this item
        if (!targetInventory.canAddItem(itemInstance, quantity)) {
            return false;
        }
        
        // Remove from this inventory
        const removed = this.removeItem(itemId, quantity);
        
        if (removed === 0) {
            return false;
        }
        
        // Add to target inventory
        const added = targetInventory.addItem(itemInstance, removed);
        
        // If we couldn't add all items, put them back
        if (added < removed) {
            this.addItem(itemInstance, removed - added);
        }
        
        // Dispatch transfer event
        this.dispatchEvent({
            type: 'item_transferred',
            itemId,
            quantity: added,
            sourceInventory: this,
            targetInventory
        });
        
        return added === quantity;
    }
    
    /**
     * Get an instance of an item by ID
     * @param {string} itemId - The ID of the item to get
     * @returns {Object|null} The item instance or null
     * @private
     */
    getItemInstance(itemId) {
        if (!itemId) {
            return null;
        }
        
        // Find the first slot with this item
        const slot = this.slots.find(slot => 
            !slot.isEmpty() && slot.item.id === itemId
        );
        
        return slot ? slot.item : null;
    }
    
    /**
     * Update the inventory
     * @param {number} deltaTime - Time elapsed since last update
     */
    update(deltaTime) {
        // Update all slots
        for (const slot of this.slots) {
            if (typeof slot.update === 'function') {
                slot.update(deltaTime);
            }
        }
        
        // Update grid if applicable
        if (this.isGridBased && this.grid && typeof this.grid.update === 'function') {
            this.grid.update(deltaTime);
        }
    }
    
    /**
     * Resize the inventory (only applies to grid-based inventories)
     * @param {number} newWidth - New grid width
     * @param {number} newHeight - New grid height
     * @returns {boolean} Whether the resize was successful
     */
    resize(newWidth, newHeight) {
        if (!this.isGridBased || !this.grid) {
            return false;
        }
        
        return this.grid.resize(newWidth, newHeight);
    }
    
    /**
     * Find slots containing a specific item
     * @param {string|Object} itemIdOrInstance - The item to find
     * @returns {Array} Array of slots containing the item
     */
    findItemSlots(itemIdOrInstance) {
        if (!itemIdOrInstance) {
            return [];
        }
        
        const itemId = typeof itemIdOrInstance === 'string'
            ? itemIdOrInstance
            : itemIdOrInstance.id;
            
        return this.slots.filter(slot => 
            !slot.isEmpty() && slot.item.id === itemId
        );
    }
    
    /**
     * Check if the inventory contains items of a specific type
     * @param {string} itemType - The type of item to check for
     * @returns {boolean} Whether the inventory contains items of this type
     */
    hasItemType(itemType) {
        if (!itemType) {
            return false;
        }
        
        return this.slots.some(slot => 
            !slot.isEmpty() && slot.item.type === itemType
        );
    }
    
    /**
     * Get all items of a specific type
     * @param {string} itemType - The type of items to get
     * @returns {Array} Array of items of the specified type
     */
    getItemsByType(itemType) {
        if (!itemType) {
            return [];
        }
        
        const items = [];
        
        for (const slot of this.slots) {
            if (!slot.isEmpty() && slot.item.type === itemType) {
                items.push(slot.item);
            }
        }
        
        return items;
    }
    
    /**
     * Clear the entire inventory
     */
    clear() {
        for (const slot of this.slots) {
            slot.clearItem();
        }
        
        this.currentWeight = 0;
        
        this.dispatchEvent({ type: 'inventory_cleared' });
        
        if (this.debug) {
            console.log(`Inventory cleared: ${this.id}`);
        }
    }
    
    /**
     * Get the total value of all items in the inventory
     * @returns {number} Total value
     */
    getTotalValue() {
        return this.slots.reduce((total, slot) => {
            if (slot.isEmpty()) {
                return total;
            }
            
            const itemValue = slot.item.value || 0;
            return total + (itemValue * slot.quantity);
        }, 0);
    }
    
    /**
     * Get a representation of the inventory as a string
     * @returns {string} String representation
     */
    toString() {
        const items = this.getAllItems();
        
        if (items.length === 0) {
            return `${this.name} (Empty)`;
        }
        
        let result = `${this.name} (${items.length} items):\n`;
        
        for (const { item, quantity } of items) {
            result += `- ${item.name} x${quantity}\n`;
        }
        
        return result;
    }
    
    /**
     * Serialize the inventory to JSON
     * @returns {Object} JSON representation
     */
    toJSON() {
        const itemsData = [];
        
        // Collect data from all slots
        for (const slot of this.slots) {
            if (!slot.isEmpty()) {
                itemsData.push({
                    itemId: slot.item.id,
                    quantity: slot.quantity,
                    slotIndex: slot.index
                });
            }
        }
        
        return {
            id: this.id,
            name: this.name,
            isGridBased: this.isGridBased,
            width: this.width,
            height: this.height,
            maxWeight: this.maxWeight,
            currentWeight: this.currentWeight,
            items: itemsData
        };
    }
    
    /**
     * Load inventory from JSON data
     * @param {Object} jsonData - JSON data to load
     * @param {Function} itemLoader - Function to load items by ID
     * @returns {boolean} Whether the load was successful
     */
    fromJSON(jsonData, itemLoader) {
        if (!jsonData || !itemLoader) {
            return false;
        }
        
        // Clear current inventory
        this.clear();
        
        // Update properties
        this.id = jsonData.id || this.id;
        this.name = jsonData.name || this.name;
        this.maxWeight = jsonData.maxWeight || this.maxWeight;
        
        // If grid dimensions changed, resize
        if (this.isGridBased && 
            (this.width !== jsonData.width || this.height !== jsonData.height)) {
            this.resize(jsonData.width, jsonData.height);
        }
        
        // Load items
        const loadPromises = [];
        
        for (const itemData of jsonData.items) {
            const loadPromise = Promise.resolve(itemLoader(itemData.itemId))
                .then(item => {
                    if (!item) {
                        console.warn(`Failed to load item: ${itemData.itemId}`);
                        return false;
                    }
                    
                    if (itemData.slotIndex !== undefined) {
                        // Put in specific slot
                        const slot = this.getSlot(itemData.slotIndex);
                        if (slot) {
                            return slot.setItem(item, itemData.quantity);
                        }
                    }
                    
                    // Otherwise just add to inventory
                    return this.addItem(item, itemData.quantity) === itemData.quantity;
                });
                
            loadPromises.push(loadPromise);
        }
        
        // Wait for all items to load
        return Promise.all(loadPromises)
            .then(results => {
                const success = results.every(Boolean);
                
                if (success) {
                    this.dispatchEvent({ type: 'inventory_loaded', jsonData });
                }
                
                return success;
            });
    }
    
    /**
     * Destroy the inventory and clean up
     */
    destroy() {
        // Clear all items
        this.clear();
        
        // Remove references
        this.owner = null;
        this.slots = [];
        this.grid = null;
        
        this.dispatchEvent({ type: 'inventory_destroyed' });
        
        if (this.debug) {
            console.log(`Inventory destroyed: ${this.id}`);
        }
    }
} 