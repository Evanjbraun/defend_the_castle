import { Inventory } from './Inventory.js';

/**
 * Manages all inventories across the game
 * Handles item transfers, shared access, and event handling
 */
export class InventoryManager {
    /**
     * Create a new inventory manager
     * @param {Object} config - Configuration options
     */
    constructor(config = {}) {
        // Track all inventories
        this.inventories = new Map();
        
        // Item database reference
        this.itemDatabase = config.itemDatabase || null;
        
        // Loot tables for generating items
        this.lootTables = new Map();
        
        // Global settings
        this.settings = {
            maxItemTransferDistance: config.maxItemTransferDistance || 5,
            enableWeightLimits: config.enableWeightLimits !== undefined ? config.enableWeightLimits : true,
            defaultMaxWeight: config.defaultMaxWeight || 100,
            defaultMaxSlots: config.defaultMaxSlots || 20
        };
        
        // Transaction history for debugging
        this.transactionHistory = [];
        this.maxTransactionHistory = config.maxTransactionHistory || 100;
        
        // Debug mode
        this.debug = config.debug || false;
        
        // Initialize
        this._initialize();
    }
    
    /**
     * Initialize the inventory manager
     * @private
     */
    _initialize() {
        if (this.debug) {
            console.log('Initializing Inventory Manager');
        }
        
        // Load loot tables if available
        if (this.itemDatabase && this.itemDatabase.getLootTables) {
            this._loadLootTables();
        }
    }
    
    /**
     * Load loot tables from the item database
     * @private
     */
    _loadLootTables() {
        const lootTables = this.itemDatabase.getLootTables();
        
        if (!lootTables) {
            return;
        }
        
        lootTables.forEach(table => {
            this.registerLootTable(table.id, table);
            
            if (this.debug) {
                console.log(`Registered loot table: ${table.name}`);
            }
        });
    }
    
    /**
     * Register a loot table for generating items
     * @param {string} tableId - Unique identifier for the loot table
     * @param {Object} tableData - Loot table data
     */
    registerLootTable(tableId, tableData) {
        this.lootTables.set(tableId, {
            id: tableId,
            name: tableData.name || 'Unknown Loot Table',
            entries: tableData.entries || [],
            minRolls: tableData.minRolls || 1,
            maxRolls: tableData.maxRolls || 1
        });
    }
    
    /**
     * Create a new inventory
     * @param {string} id - Unique identifier for the inventory
     * @param {Object} config - Configuration options
     * @returns {Inventory} The created inventory
     */
    createInventory(id, config = {}) {
        // Check if ID already exists
        if (this.inventories.has(id)) {
            console.warn(`Inventory with ID ${id} already exists. Returning existing inventory.`);
            return this.inventories.get(id);
        }
        
        // Create a new inventory with default settings
        const inventory = new Inventory({
            ...config,
            maxWeight: config.maxWeight !== undefined ? config.maxWeight : this.settings.defaultMaxWeight,
            maxSlots: config.maxSlots !== undefined ? config.maxSlots : this.settings.defaultMaxSlots,
            debug: this.debug
        });
        
        // Register it
        this.inventories.set(id, inventory);
        
        if (this.debug) {
            console.log(`Created inventory: ${id} with ${inventory.maxSlots} slots`);
        }
        
        return inventory;
    }
    
    /**
     * Get an inventory by ID
     * @param {string} id - The ID of the inventory to get
     * @returns {Inventory|null} The inventory or null if not found
     */
    getInventory(id) {
        return this.inventories.get(id) || null;
    }
    
    /**
     * Delete an inventory
     * @param {string} id - The ID of the inventory to delete
     * @returns {boolean} Whether the deletion was successful
     */
    deleteInventory(id) {
        if (!this.inventories.has(id)) {
            return false;
        }
        
        const inventory = this.inventories.get(id);
        
        // Call destroy method if available
        if (inventory.destroy) {
            inventory.destroy();
        }
        
        this.inventories.delete(id);
        
        if (this.debug) {
            console.log(`Deleted inventory: ${id}`);
        }
        
        return true;
    }
    
    /**
     * Move an item between inventories
     * @param {string} sourceId - Source inventory ID
     * @param {string} targetId - Target inventory ID
     * @param {string} itemId - ID of the item to move
     * @param {number} count - Quantity to move
     * @param {Object} sourceSlot - Optional source slot information
     * @returns {boolean} Whether the move was successful
     */
    moveItem(sourceId, targetId, itemId, count = 1, sourceSlot = null) {
        const sourceInventory = this.getInventory(sourceId);
        const targetInventory = this.getInventory(targetId);
        
        if (!sourceInventory || !targetInventory) {
            return false;
        }
        
        // Check if source has the item
        if (sourceSlot) {
            // If specific slot provided, check that slot
            if (!sourceSlot.item || sourceSlot.item.id !== itemId || sourceSlot.count < count) {
                return false;
            }
        } else {
            // Otherwise check total count across inventory
            const availableCount = sourceInventory.getItemCount(itemId);
            if (availableCount < count) {
                return false;
            }
        }
        
        // Get item from database if needed to check properties
        let item = null;
        
        if (sourceSlot && sourceSlot.item) {
            item = sourceSlot.item;
        } else if (this.itemDatabase) {
            item = this.itemDatabase.getItemById(itemId);
        }
        
        if (!item) {
            return false;
        }
        
        // Check if target can accept the item
        if (!targetInventory.canAddItem(item, count)) {
            return false;
        }
        
        // Remove from source
        let removed;
        if (sourceSlot) {
            // Remove from specific slot
            removed = sourceInventory.removeItemFromSlot(sourceSlot, count);
        } else {
            // Remove from any slot
            removed = sourceInventory.removeItem(itemId, count);
        }
        
        if (removed < count) {
            // If didn't remove as many as requested, put back what we did remove
            if (removed > 0) {
                sourceInventory.addItem(item, removed);
            }
            return false;
        }
        
        // Add to target
        const added = targetInventory.addItem(item, count);
        
        // If didn't add everything, put back what we couldn't add
        if (added < count) {
            sourceInventory.addItem(item, count - added);
        }
        
        // Record transaction if debug mode
        if (this.debug) {
            this._recordTransaction({
                type: 'MOVE',
                sourceId,
                targetId,
                itemId,
                itemName: item.name,
                count: added,
                timestamp: Date.now()
            });
        }
        
        return added === count;
    }
    
    /**
     * Generate items from a loot table and add to an inventory
     * @param {string} inventoryId - Target inventory ID
     * @param {string} lootTableId - ID of the loot table to use
     * @returns {Array} Array of items generated and added
     */
    generateLoot(inventoryId, lootTableId) {
        const inventory = this.getInventory(inventoryId);
        const lootTable = this.lootTables.get(lootTableId);
        
        if (!inventory || !lootTable) {
            return [];
        }
        
        const addedItems = [];
        
        // Determine number of rolls
        const rolls = Math.floor(Math.random() * (lootTable.maxRolls - lootTable.minRolls + 1)) + lootTable.minRolls;
        
        for (let i = 0; i < rolls; i++) {
            // Select a random entry based on weight
            const totalWeight = lootTable.entries.reduce((sum, entry) => sum + (entry.weight || 1), 0);
            let randValue = Math.random() * totalWeight;
            
            let selectedEntry = null;
            for (const entry of lootTable.entries) {
                randValue -= (entry.weight || 1);
                
                if (randValue <= 0) {
                    selectedEntry = entry;
                    break;
                }
            }
            
            if (!selectedEntry) {
                continue;
            }
            
            // Get item from database
            if (!this.itemDatabase) {
                continue;
            }
            
            const item = this.itemDatabase.getItemById(selectedEntry.itemId);
            
            if (!item) {
                continue;
            }
            
            // Determine count
            const minCount = selectedEntry.minCount || 1;
            const maxCount = selectedEntry.maxCount || 1;
            const count = Math.floor(Math.random() * (maxCount - minCount + 1)) + minCount;
            
            // Add to inventory
            const added = inventory.addItem(item, count);
            
            if (added > 0) {
                addedItems.push({
                    item,
                    count: added
                });
                
                if (this.debug) {
                    this._recordTransaction({
                        type: 'LOOT_GENERATED',
                        targetId: inventoryId,
                        itemId: item.id,
                        itemName: item.name,
                        count: added,
                        lootTableId,
                        timestamp: Date.now()
                    });
                }
            }
        }
        
        return addedItems;
    }
    
    /**
     * Check if two inventories are close enough for item transfer
     * @param {string} inventoryId1 - First inventory ID
     * @param {string} inventoryId2 - Second inventory ID
     * @returns {boolean} Whether the inventories are close enough
     */
    areInventoriesInRange(inventoryId1, inventoryId2) {
        const inventory1 = this.getInventory(inventoryId1);
        const inventory2 = this.getInventory(inventoryId2);
        
        if (!inventory1 || !inventory2) {
            return false;
        }
        
        // If either inventory doesn't have an owner with a position, assume they're in range
        if (!inventory1.owner || !inventory1.owner.position || !inventory2.owner || !inventory2.owner.position) {
            return true;
        }
        
        // Calculate distance between owners
        const dx = inventory1.owner.position.x - inventory2.owner.position.x;
        const dy = inventory1.owner.position.y - inventory2.owner.position.y;
        const dz = inventory1.owner.position.z - inventory2.owner.position.z;
        
        const distanceSquared = dx * dx + dy * dy + dz * dz;
        
        return distanceSquared <= this.settings.maxItemTransferDistance * this.settings.maxItemTransferDistance;
    }
    
    /**
     * Record a transaction in the history
     * @param {Object} transaction - The transaction to record
     * @private
     */
    _recordTransaction(transaction) {
        this.transactionHistory.push(transaction);
        
        // Trim history if it exceeds the maximum size
        if (this.transactionHistory.length > this.maxTransactionHistory) {
            this.transactionHistory.shift();
        }
    }
    
    /**
     * Get the transaction history
     * @returns {Array} The transaction history
     */
    getTransactionHistory() {
        return [...this.transactionHistory];
    }
    
    /**
     * Clear the transaction history
     */
    clearTransactionHistory() {
        this.transactionHistory = [];
    }
    
    /**
     * Find an item by ID in the database
     * @param {string} itemId - The ID of the item to find
     * @returns {Object|null} The item or null if not found
     */
    findItemById(itemId) {
        if (!this.itemDatabase || !this.itemDatabase.getItemById) {
            return null;
        }
        
        return this.itemDatabase.getItemById(itemId);
    }
    
    /**
     * Find inventories containing a specific item
     * @param {string} itemId - The ID of the item to find
     * @returns {Array} Array of inventory IDs containing the item
     */
    findInventoriesWithItem(itemId) {
        if (!itemId) {
            return [];
        }
        
        const results = [];
        
        for (const [id, inventory] of this.inventories.entries()) {
            if (inventory.getItemCount(itemId) > 0) {
                results.push(id);
            }
        }
        
        return results;
    }
    
    /**
     * Update all inventories
     * @param {number} deltaTime - Time elapsed since last update
     */
    update(deltaTime) {
        // Update each inventory
        for (const inventory of this.inventories.values()) {
            if (inventory.update) {
                inventory.update(deltaTime);
            }
        }
    }
    
    /**
     * Destroy all inventories and clean up
     */
    destroy() {
        // Destroy each inventory
        for (const inventory of this.inventories.values()) {
            if (inventory.destroy) {
                inventory.destroy();
            }
        }
        
        this.inventories.clear();
        this.lootTables.clear();
        this.transactionHistory = [];
        
        if (this.debug) {
            console.log('Inventory Manager destroyed');
        }
    }
} 