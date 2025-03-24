import { Equipment } from './Equipment.js';
import { SlotFactory } from './slots/SlotFactory.js';

/**
 * Manages equipment systems across the game
 * Handles set bonuses, shared equipment, and specialized equipment functionality
 */
export class EquipmentManager {
    /**
     * Create a new equipment manager
     * @param {Object} config - Configuration options
     */
    constructor(config = {}) {
        // Debug mode
        this.debug = config.debug || false;
        
        // Track all equipment systems
        this.equipmentSystems = new Map();
        
        // Track equipment sets and their bonuses
        this.equipmentSets = new Map();
        
        // Track global equipment rules
        this.equipmentRules = {
            allowMixedArmorTypes: config.allowMixedArmorTypes !== undefined ? config.allowMixedArmorTypes : true,
            requireLevelForEquip: config.requireLevelForEquip !== undefined ? config.requireLevelForEquip : true,
            enableDurability: config.enableDurability !== undefined ? config.enableDurability : true,
            enableSetBonuses: config.enableSetBonuses !== undefined ? config.enableSetBonuses : true
        };
        
        // Item database reference
        this.itemDatabase = config.itemDatabase || null;
        
        // Initialize
        this._initialize();
    }
    
    /**
     * Initialize the equipment manager
     * @private
     */
    _initialize() {
        if (this.debug) {
            console.log('Initializing Equipment Manager');
        }
        
        // Load equipment sets if provided
        if (this.itemDatabase) {
            this._loadEquipmentSets();
        }
    }
    
    /**
     * Load equipment sets from the item database
     * @private
     */
    _loadEquipmentSets() {
        if (!this.itemDatabase || !this.itemDatabase.getEquipmentSets) {
            return;
        }
        
        const sets = this.itemDatabase.getEquipmentSets();
        
        sets.forEach(set => {
            this.registerEquipmentSet(set.id, set);
            
            if (this.debug) {
                console.log(`Registered equipment set: ${set.name}`);
            }
        });
    }
    
    /**
     * Create a new equipment system
     * @param {string} id - Unique identifier for the equipment system
     * @param {Object} config - Configuration for the equipment system
     * @returns {Equipment} The created equipment system
     */
    createEquipment(id, config = {}) {
        // Check if ID already exists
        if (this.equipmentSystems.has(id)) {
            console.warn(`Equipment system with ID ${id} already exists. Returning existing system.`);
            return this.equipmentSystems.get(id);
        }
        
        // Create new equipment system
        const equipment = new Equipment({
            ...config,
            debug: this.debug
        });
        
        // Register it
        this.equipmentSystems.set(id, equipment);
        
        if (this.debug) {
            console.log(`Created equipment system: ${id}`);
        }
        
        return equipment;
    }
    
    /**
     * Get an equipment system by ID
     * @param {string} id - The ID of the equipment system
     * @returns {Equipment|null} The equipment system or null if not found
     */
    getEquipment(id) {
        return this.equipmentSystems.get(id) || null;
    }
    
    /**
     * Register an equipment set and its bonuses
     * @param {string} setId - Unique identifier for the set
     * @param {Object} setData - Set data including pieces and bonuses
     */
    registerEquipmentSet(setId, setData) {
        this.equipmentSets.set(setId, {
            id: setId,
            name: setData.name || 'Unknown Set',
            description: setData.description || '',
            pieces: setData.pieces || [],
            bonuses: setData.bonuses || [],
            requiredPiecesForBonus: setData.requiredPiecesForBonus || []
        });
    }
    
    /**
     * Get all registered equipment sets
     * @returns {Array} Array of equipment sets
     */
    getAllEquipmentSets() {
        return Array.from(this.equipmentSets.values());
    }
    
    /**
     * Get a specific equipment set by ID
     * @param {string} setId - The ID of the set to get
     * @returns {Object|null} The equipment set or null if not found
     */
    getEquipmentSet(setId) {
        return this.equipmentSets.get(setId) || null;
    }
    
    /**
     * Check which set bonuses are active for an equipment system
     * @param {string} equipmentId - The ID of the equipment system to check
     * @returns {Array} Array of active set bonuses
     */
    getActiveSetBonuses(equipmentId) {
        const equipment = this.getEquipment(equipmentId);
        
        if (!equipment || !this.equipmentRules.enableSetBonuses) {
            return [];
        }
        
        const activeBonuses = [];
        
        // Check each registered set
        this.equipmentSets.forEach(set => {
            const equippedPieces = this._countEquippedSetPieces(equipment, set.id);
            
            // Check bonuses that match the equipped piece count
            set.bonuses.forEach((bonus, index) => {
                const requiredPieces = set.requiredPiecesForBonus[index] || 0;
                
                if (equippedPieces >= requiredPieces) {
                    activeBonuses.push({
                        setId: set.id,
                        setName: set.name,
                        bonus: { ...bonus },
                        equippedPieces,
                        requiredPieces
                    });
                }
            });
        });
        
        return activeBonuses;
    }
    
    /**
     * Count how many pieces of a set are equipped
     * @param {Equipment} equipment - The equipment system to check
     * @param {string} setId - The ID of the set to count
     * @returns {number} Number of equipped pieces from the set
     * @private
     */
    _countEquippedSetPieces(equipment, setId) {
        let count = 0;
        
        // Check each slot for items from this set
        Object.values(equipment.slots).forEach(item => {
            if (item && item.setId === setId) {
                count++;
            }
        });
        
        return count;
    }
    
    /**
     * Apply set bonuses to an entity
     * @param {string} equipmentId - The ID of the equipment system
     * @param {Object} entity - The entity to apply bonuses to
     */
    applySetBonuses(equipmentId, entity) {
        if (!entity || !this.equipmentRules.enableSetBonuses) {
            return;
        }
        
        const activeBonuses = this.getActiveSetBonuses(equipmentId);
        
        // Apply each active bonus
        activeBonuses.forEach(bonusData => {
            const { bonus } = bonusData;
            
            // Apply stats bonuses
            if (bonus.stats && entity.stats) {
                Object.entries(bonus.stats).forEach(([stat, value]) => {
                    if (entity.stats[stat] !== undefined) {
                        entity.stats[stat] += value;
                    }
                });
            }
            
            // Apply special bonuses if the entity has a method for it
            if (bonus.special && entity.applySpecialBonus) {
                entity.applySpecialBonus(bonus.special);
            }
        });
        
        if (this.debug && activeBonuses.length > 0) {
            console.log(`Applied ${activeBonuses.length} set bonuses to ${entity.name}`);
        }
    }
    
    /**
     * Check if an item meets requirements for an entity
     * @param {Object} item - The item to check
     * @param {Object} entity - The entity to check against
     * @returns {boolean} Whether the item meets requirements
     */
    itemMeetsRequirements(item, entity) {
        if (!item || !entity) {
            return false;
        }
        
        // Skip requirements check if disabled
        if (!this.equipmentRules.requireLevelForEquip) {
            return true;
        }
        
        // Check level requirement
        if (item.requiredLevel !== undefined && entity.level !== undefined) {
            if (entity.level < item.requiredLevel) {
                return false;
            }
        }
        
        // Check stat requirements
        if (item.requiredStats && entity.stats) {
            for (const [stat, value] of Object.entries(item.requiredStats)) {
                if (!entity.stats[stat] || entity.stats[stat] < value) {
                    return false;
                }
            }
        }
        
        // Check class requirements
        if (item.requiredClasses && item.requiredClasses.length > 0) {
            if (!entity.class || !item.requiredClasses.includes(entity.class)) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Update durability for equipped items
     * @param {string} equipmentId - The ID of the equipment system
     * @param {Object} durabilityChanges - Map of slot IDs to durability changes
     */
    updateItemDurability(equipmentId, durabilityChanges) {
        if (!this.equipmentRules.enableDurability) {
            return;
        }
        
        const equipment = this.getEquipment(equipmentId);
        
        if (!equipment) {
            return;
        }
        
        // Apply durability changes
        Object.entries(durabilityChanges).forEach(([slotId, change]) => {
            const item = equipment.slots[slotId];
            
            if (item && item.currentDurability !== undefined) {
                item.currentDurability = Math.max(0, Math.min(item.maxDurability, item.currentDurability + change));
                
                // Item breaks if durability reaches 0
                if (item.currentDurability === 0) {
                    if (this.debug) {
                        console.log(`Item ${item.name} in slot ${slotId} broke due to 0 durability`);
                    }
                    
                    // Call onBreak if available
                    if (item.onBreak) {
                        item.onBreak();
                    }
                    
                    // Unequip broken item
                    equipment.unequip(slotId);
                }
            }
        });
    }
    
    /**
     * Check for compatible equipment
     * @param {Object} item - The item to check
     * @param {string} equipmentId - The ID of the equipment system
     * @returns {boolean} Whether the item is compatible
     */
    isCompatible(item, equipmentId) {
        if (!item) {
            return false;
        }
        
        const equipment = this.getEquipment(equipmentId);
        
        if (!equipment) {
            return false;
        }
        
        // If mixed armor types are allowed, always return true for armor
        if (this.equipmentRules.allowMixedArmorTypes && item.type === 'ARMOR') {
            return true;
        }
        
        // Otherwise, check for specific compatibility
        // For armor sets, check if it matches current armor type
        if (item.type === 'ARMOR') {
            let hasArmorEquipped = false;
            let currentArmorType = null;
            
            // Find current armor type
            Object.values(equipment.slots).forEach(equippedItem => {
                if (equippedItem && equippedItem.type === 'ARMOR' && equippedItem.armorClass) {
                    hasArmorEquipped = true;
                    currentArmorType = equippedItem.armorClass;
                }
            });
            
            // If no armor equipped, anything is compatible
            if (!hasArmorEquipped) {
                return true;
            }
            
            // Otherwise, must match current armor type
            return item.armorClass === currentArmorType;
        }
        
        return true;
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
     * Equip an item by ID to a specific slot
     * @param {string} equipmentId - The ID of the equipment system
     * @param {string} itemId - The ID of the item to equip
     * @param {string} slotId - The ID of the slot to equip to
     * @returns {boolean} Whether the equip was successful
     */
    equipItemById(equipmentId, itemId, slotId) {
        const equipment = this.getEquipment(equipmentId);
        const item = this.findItemById(itemId);
        
        if (!equipment || !item) {
            return false;
        }
        
        return equipment.equip(item, slotId);
    }
    
    /**
     * Update all equipment systems
     * @param {number} deltaTime - Time elapsed since last update
     */
    update(deltaTime) {
        // Update each equipment system
        this.equipmentSystems.forEach(equipment => {
            equipment.update(deltaTime);
        });
    }
    
    /**
     * Destroy all equipment systems and clean up
     */
    destroy() {
        this.equipmentSystems.clear();
        this.equipmentSets.clear();
        
        if (this.debug) {
            console.log('Equipment Manager destroyed');
        }
    }
} 