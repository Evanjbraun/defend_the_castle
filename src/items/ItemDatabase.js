import * as THREE from 'three';
import { ItemSchema } from './ItemSchema.js';

/**
 * Database for managing game items and loot tables
 */
export class ItemDatabase extends THREE.EventDispatcher {
    /**
     * Create a new item database
     * @param {Object} config - Configuration options
     */
    constructor(config = {}) {
        super();
        
        // Store all registered items
        this.items = new Map();
        
        // Store item prototypes by type
        this.itemPrototypes = new Map();
        
        // Store item categories
        this.categories = new Map();
        
        // Store loot tables
        this.lootTables = new Map();
        
        // Item sets
        this.equipmentSets = new Map();
        
        // Debug mode
        this.debug = config.debug || false;
        
        // Initialize
        this._initialize(config);
    }
    
    /**
     * Initialize the item database
     * @param {Object} config - Configuration options
     * @private
     */
    _initialize(config) {
        // Register default item types
        this._registerDefaultItemTypes();
        
        // Load items from config if provided
        if (config.items) {
            this.registerItems(config.items);
        }
        
        // Load loot tables from config if provided
        if (config.lootTables) {
            this.registerLootTables(config.lootTables);
        }
        
        // Load equipment sets if provided
        if (config.equipmentSets) {
            this.registerEquipmentSets(config.equipmentSets);
        }
        
        if (this.debug) {
            console.log(`ItemDatabase initialized with ${this.items.size} items`);
        }
    }
    
    /**
     * Register default item types and categories
     * @private
     */
    _registerDefaultItemTypes() {
        // Register basic item types
        this.registerItemType('WEAPON', {
            isEquippable: true,
            isStackable: false,
            maxStackSize: 1,
            defaultWeight: 3
        });
        
        this.registerItemType('ARMOR', {
            isEquippable: true,
            isStackable: false,
            maxStackSize: 1,
            defaultWeight: 5
        });
        
        this.registerItemType('ACCESSORY', {
            isEquippable: true,
            isStackable: false,
            maxStackSize: 1,
            defaultWeight: 0.5
        });
        
        this.registerItemType('CONSUMABLE', {
            isEquippable: false,
            isStackable: true,
            maxStackSize: 20,
            defaultWeight: 0.2,
            isConsumable: true
        });
        
        this.registerItemType('MATERIAL', {
            isEquippable: false,
            isStackable: true,
            maxStackSize: 100,
            defaultWeight: 0.1
        });
        
        this.registerItemType('MISC', {
            isEquippable: false,
            isStackable: true,
            maxStackSize: 50,
            defaultWeight: 0.5
        });
        
        // Register categories
        this.registerCategory('weapons', ['WEAPON']);
        this.registerCategory('armor', ['ARMOR']);
        this.registerCategory('accessories', ['ACCESSORY']);
        this.registerCategory('consumables', ['CONSUMABLE']);
        this.registerCategory('materials', ['MATERIAL']);
        this.registerCategory('equipment', ['WEAPON', 'ARMOR', 'ACCESSORY']);
        this.registerCategory('usable', ['CONSUMABLE', 'MATERIAL']);
    }
    
    /**
     * Register a new item type with default properties
     * @param {string} type - The item type identifier
     * @param {Object} defaults - Default properties for this item type
     */
    registerItemType(type, defaults) {
        this.itemPrototypes.set(type, defaults);
    }
    
    /**
     * Register a category of items
     * @param {string} categoryName - The category name
     * @param {Array} itemTypes - Array of item types in this category
     */
    registerCategory(categoryName, itemTypes) {
        this.categories.set(categoryName, itemTypes);
    }
    
    /**
     * Register an item in the database
     * @param {Object} itemData - Item data or ItemSchema instance
     * @returns {ItemSchema} The registered item
     */
    registerItem(itemData) {
        if (!itemData || !itemData.id) {
            console.error('Cannot register item without an ID');
            return null;
        }
        
        // Check if item already exists
        if (this.items.has(itemData.id)) {
            if (this.debug) {
                console.warn(`Item with ID ${itemData.id} already exists. Overwriting.`);
            }
        }
        
        let item;
        
        // If it's already an ItemSchema instance, use it directly
        if (itemData instanceof ItemSchema) {
            item = itemData;
        } else {
            // Otherwise, create a new instance
            // Apply defaults based on item type
            const typeDefaults = this.itemPrototypes.get(itemData.type) || {};
            const mergedData = { ...typeDefaults, ...itemData };
            
            item = new ItemSchema(mergedData);
        }
        
        // Store the item
        this.items.set(item.id, item);
        
        this.dispatchEvent({
            type: 'item_registered',
            item
        });
        
        return item;
    }
    
    /**
     * Register multiple items at once
     * @param {Array} itemsData - Array of item data objects
     * @returns {Array} Array of registered items
     */
    registerItems(itemsData) {
        if (!Array.isArray(itemsData)) {
            return [];
        }
        
        return itemsData.map(itemData => this.registerItem(itemData));
    }
    
    /**
     * Register a loot table
     * @param {string} tableId - Unique identifier for the loot table
     * @param {Object} tableData - Loot table configuration
     */
    registerLootTable(tableId, tableData) {
        if (!tableId || !tableData) {
            return;
        }
        
        this.lootTables.set(tableId, {
            id: tableId,
            name: tableData.name || tableId,
            entries: tableData.entries || [],
            minRolls: tableData.minRolls || 1,
            maxRolls: tableData.maxRolls || 1
        });
        
        if (this.debug) {
            console.log(`Registered loot table: ${tableId}`);
        }
    }
    
    /**
     * Register multiple loot tables
     * @param {Object} lootTablesData - Map of loot table ID to table data
     */
    registerLootTables(lootTablesData) {
        Object.entries(lootTablesData).forEach(([tableId, tableData]) => {
            this.registerLootTable(tableId, tableData);
        });
    }
    
    /**
     * Register an equipment set
     * @param {string} setId - Unique identifier for the set
     * @param {Object} setData - Set configuration
     */
    registerEquipmentSet(setId, setData) {
        if (!setId || !setData) {
            return;
        }
        
        this.equipmentSets.set(setId, {
            id: setId,
            name: setData.name || setId,
            description: setData.description || '',
            pieces: setData.pieces || [],
            bonuses: setData.bonuses || {},
            rarity: setData.rarity || 'COMMON'
        });
        
        // Update set references in the items
        if (setData.pieces && Array.isArray(setData.pieces)) {
            setData.pieces.forEach(pieceId => {
                const item = this.getItemById(pieceId);
                if (item) {
                    item.setId = setId;
                }
            });
        }
        
        if (this.debug) {
            console.log(`Registered equipment set: ${setId}`);
        }
    }
    
    /**
     * Register multiple equipment sets
     * @param {Object} setsData - Map of set ID to set data
     */
    registerEquipmentSets(setsData) {
        Object.entries(setsData).forEach(([setId, setData]) => {
            this.registerEquipmentSet(setId, setData);
        });
    }
    
    /**
     * Get an item by its ID
     * @param {string} itemId - The item ID
     * @returns {ItemSchema|null} The item or null if not found
     */
    getItemById(itemId) {
        return this.items.get(itemId) || null;
    }
    
    /**
     * Create a new instance of an item by ID
     * @param {string} itemId - The item ID
     * @returns {ItemSchema|null} A new instance of the item
     */
    createItem(itemId) {
        const item = this.getItemById(itemId);
        
        if (!item) {
            return null;
        }
        
        // Create a clone of the item
        return item.clone();
    }
    
    /**
     * Get all items in the database
     * @returns {Array} Array of all items
     */
    getAllItems() {
        return Array.from(this.items.values());
    }
    
    /**
     * Get items by type
     * @param {string} type - The item type
     * @returns {Array} Array of items of the specified type
     */
    getItemsByType(type) {
        return this.getAllItems().filter(item => item.type === type);
    }
    
    /**
     * Get items by category
     * @param {string} category - The category name
     * @returns {Array} Array of items in the category
     */
    getItemsByCategory(category) {
        const categoryTypes = this.categories.get(category);
        
        if (!categoryTypes) {
            return [];
        }
        
        return this.getAllItems().filter(item => categoryTypes.includes(item.type));
    }
    
    /**
     * Get a loot table by its ID
     * @param {string} tableId - The loot table ID
     * @returns {Object|null} The loot table or null if not found
     */
    getLootTable(tableId) {
        return this.lootTables.get(tableId) || null;
    }
    
    /**
     * Get all loot tables
     * @returns {Array} Array of all loot tables
     */
    getLootTables() {
        return Array.from(this.lootTables.values());
    }
    
    /**
     * Get an equipment set by its ID
     * @param {string} setId - The set ID
     * @returns {Object|null} The equipment set or null if not found
     */
    getEquipmentSet(setId) {
        return this.equipmentSets.get(setId) || null;
    }
    
    /**
     * Get all equipment sets
     * @returns {Array} Array of all equipment sets
     */
    getEquipmentSets() {
        return Array.from(this.equipmentSets.values());
    }
    
    /**
     * Find the equipment set for an item
     * @param {string|ItemSchema} itemIdOrInstance - The item ID or instance
     * @returns {Object|null} The equipment set or null if not found
     */
    findSetForItem(itemIdOrInstance) {
        const itemId = itemIdOrInstance instanceof ItemSchema
            ? itemIdOrInstance.id
            : itemIdOrInstance;
            
        if (!itemId) {
            return null;
        }
        
        // Find a set that contains this item as a piece
        for (const set of this.equipmentSets.values()) {
            if (set.pieces.includes(itemId)) {
                return set;
            }
        }
        
        return null;
    }
    
    /**
     * Generate items from a loot table
     * @param {string} tableId - The loot table ID
     * @returns {Array} Array of {item, quantity} objects
     */
    generateLoot(tableId) {
        const table = this.getLootTable(tableId);
        
        if (!table || !table.entries || table.entries.length === 0) {
            return [];
        }
        
        const loot = [];
        
        // Determine number of rolls
        const rolls = Math.floor(Math.random() * (table.maxRolls - table.minRolls + 1)) + table.minRolls;
        
        for (let i = 0; i < rolls; i++) {
            // Select a random entry based on weight
            const totalWeight = table.entries.reduce((sum, entry) => sum + (entry.weight || 1), 0);
            let randValue = Math.random() * totalWeight;
            
            let selectedEntry = null;
            for (const entry of table.entries) {
                randValue -= (entry.weight || 1);
                
                if (randValue <= 0) {
                    selectedEntry = entry;
                    break;
                }
            }
            
            if (!selectedEntry) {
                continue;
            }
            
            // Get the item
            const item = this.createItem(selectedEntry.itemId);
            
            if (!item) {
                continue;
            }
            
            // Determine quantity
            const minCount = selectedEntry.minCount || 1;
            const maxCount = selectedEntry.maxCount || 1;
            const quantity = Math.floor(Math.random() * (maxCount - minCount + 1)) + minCount;
            
            loot.push({
                item,
                quantity
            });
        }
        
        return loot;
    }
    
    /**
     * Find items matching a search query
     * @param {Object} query - Search parameters
     * @returns {Array} Array of matching items
     */
    findItems(query = {}) {
        let results = this.getAllItems();
        
        // Filter by type if specified
        if (query.type) {
            results = results.filter(item => item.type === query.type);
        }
        
        // Filter by category if specified
        if (query.category) {
            const categoryTypes = this.categories.get(query.category);
            if (categoryTypes) {
                results = results.filter(item => categoryTypes.includes(item.type));
            }
        }
        
        // Filter by rarity if specified
        if (query.rarity) {
            results = results.filter(item => item.rarity === query.rarity);
        }
        
        // Filter by level range if specified
        if (query.minLevel !== undefined) {
            results = results.filter(item => !item.requiredLevel || item.requiredLevel >= query.minLevel);
        }
        
        if (query.maxLevel !== undefined) {
            results = results.filter(item => !item.requiredLevel || item.requiredLevel <= query.maxLevel);
        }
        
        // Filter by name search if specified
        if (query.nameSearch) {
            const searchTerm = query.nameSearch.toLowerCase();
            results = results.filter(item => 
                item.name.toLowerCase().includes(searchTerm) || 
                (item.description && item.description.toLowerCase().includes(searchTerm))
            );
        }
        
        // Sort results if specified
        if (query.sortBy) {
            results.sort((a, b) => {
                switch (query.sortBy) {
                    case 'name':
                        return a.name.localeCompare(b.name);
                    case 'level':
                        return (a.requiredLevel || 0) - (b.requiredLevel || 0);
                    case 'rarity':
                        const rarityOrder = { 'LEGENDARY': 5, 'EPIC': 4, 'RARE': 3, 'UNCOMMON': 2, 'COMMON': 1, 'JUNK': 0 };
                        return rarityOrder[b.rarity] - rarityOrder[a.rarity];
                    case 'value':
                        return (b.value || 0) - (a.value || 0);
                    default:
                        return 0;
                }
            });
        }
        
        return results;
    }
    
    /**
     * Load items from a JSON file or object
     * @param {Object|string} jsonData - JSON data or path to JSON file
     * @returns {Promise<Array>} Promise resolving to array of loaded items
     */
    async loadItemsFromJson(jsonData) {
        let data;
        
        if (typeof jsonData === 'string') {
            try {
                const response = await fetch(jsonData);
                data = await response.json();
            } catch (error) {
                console.error('Error loading items:', error);
                return [];
            }
        } else {
            data = jsonData;
        }
        
        if (!data || !Array.isArray(data.items)) {
            return [];
        }
        
        return this.registerItems(data.items);
    }
    
    /**
     * Clear all items from the database
     */
    clear() {
        this.items.clear();
        this.lootTables.clear();
        this.equipmentSets.clear();
        
        this.dispatchEvent({ type: 'database_cleared' });
        
        if (this.debug) {
            console.log('Item database cleared');
        }
    }
} 