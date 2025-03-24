import * as THREE from 'three';
import { EquipmentSet } from './EquipmentSet.js';

/**
 * Manager for all equipment sets in the game
 */
export class EquipmentSetManager extends THREE.EventDispatcher {
    /**
     * Create a new equipment set manager
     */
    constructor() {
        super();
        
        // Map of set ID to set instance
        this.sets = new Map();
        
        // Map of item ID to set ID for quick lookups
        this.itemSetMap = new Map();
    }
    
    /**
     * Register a new equipment set
     * @param {Object|EquipmentSet} setData - Set configuration or set instance
     * @returns {EquipmentSet} The registered set
     */
    registerSet(setData) {
        if (!setData) {
            return null;
        }
        
        // If setData is already an EquipmentSet instance, use it directly
        const set = setData instanceof EquipmentSet
            ? setData
            : new EquipmentSet(setData);
            
        this.sets.set(set.id, set);
        
        // Register all set pieces for quick lookups
        for (const piece of set.pieces) {
            if (piece.id) {
                this.itemSetMap.set(piece.id, set.id);
            }
        }
        
        this.dispatchEvent({ type: 'set_registered', set });
        
        return set;
    }
    
    /**
     * Register multiple sets at once
     * @param {Array} setsData - Array of set configurations or instances
     * @returns {Array} Array of registered sets
     */
    registerSets(setsData) {
        if (!Array.isArray(setsData)) {
            return [];
        }
        
        return setsData.map(setData => this.registerSet(setData));
    }
    
    /**
     * Get a set by its ID
     * @param {string} setId - The set ID
     * @returns {EquipmentSet|null} The set or null if not found
     */
    getSet(setId) {
        return this.sets.get(setId) || null;
    }
    
    /**
     * Get all registered sets
     * @returns {Array} Array of all sets
     */
    getAllSets() {
        return Array.from(this.sets.values());
    }
    
    /**
     * Get sets filtered by rarity
     * @param {string} rarity - Rarity to filter by
     * @returns {Array} Array of matching sets
     */
    getSetsByRarity(rarity) {
        return this.getAllSets().filter(set => set.rarity === rarity);
    }
    
    /**
     * Find the set an item belongs to
     * @param {Object} item - The item to check
     * @returns {EquipmentSet|null} The set or null if not found
     */
    findSetForItem(item) {
        if (!item) {
            return null;
        }
        
        // Use the direct mapping if available
        if (item.setId) {
            return this.getSet(item.setId);
        }
        
        // Use the lookup map
        const setId = this.itemSetMap.get(item.id);
        if (setId) {
            return this.getSet(setId);
        }
        
        // Fall back to manual search
        for (const set of this.sets.values()) {
            if (set.itemBelongsToSet(item)) {
                return set;
            }
        }
        
        return null;
    }
    
    /**
     * Find all sets that have at least one piece equipped
     * @param {Object} equipment - The character's equipment
     * @returns {Array} Array of active sets
     */
    findActiveSets(equipment) {
        if (!equipment) {
            return [];
        }
        
        return this.getAllSets().filter(set => set.hasAnyPiecesEquipped(equipment));
    }
    
    /**
     * Get detailed information about all active sets for a character
     * @param {Object} equipment - The character's equipment
     * @returns {Array} Array of objects with set and piece count information
     */
    getActiveSetDetails(equipment) {
        if (!equipment) {
            return [];
        }
        
        const activeSets = this.findActiveSets(equipment);
        
        return activeSets.map(set => {
            const { count, items } = set.getEquippedPieceCount(equipment);
            const threshold = set.getHighestActiveThreshold(equipment);
            const bonus = set.getBonusForPieceCount(count);
            
            return {
                set,
                count,
                equippedItems: items,
                activeThreshold: threshold,
                activeBonus: bonus,
                maxPossible: set.getUniqueSlotCount(),
                isComplete: count >= set.getUniqueSlotCount()
            };
        });
    }
    
    /**
     * Apply all active set bonuses to a character
     * @param {Object} character - The character to apply bonuses to
     * @param {Object} equipment - The character's equipment
     */
    applyAllSetBonuses(character, equipment) {
        if (!character || !equipment) {
            return;
        }
        
        const activeSets = this.findActiveSets(equipment);
        
        for (const set of activeSets) {
            set.applyBonusesToCharacter(character, equipment);
        }
    }
    
    /**
     * Get a formatted report of all active sets
     * @param {Object} equipment - The character's equipment
     * @returns {string} Formatted report
     */
    getActiveSetReport(equipment) {
        if (!equipment) {
            return 'No equipment data available.';
        }
        
        const details = this.getActiveSetDetails(equipment);
        
        if (details.length === 0) {
            return 'No active equipment sets.';
        }
        
        let report = 'Active Equipment Sets:\n';
        
        for (const detail of details) {
            report += `\n${detail.set.name} (${detail.count}/${detail.maxPossible})\n`;
            
            if (detail.activeThreshold > 0) {
                report += `Active Bonus: ${detail.activeBonus.description}\n`;
            }
            
            report += 'Equipped Pieces:\n';
            for (const item of detail.equippedItems) {
                report += `- ${item.name} (${item.equipSlot})\n`;
            }
            
            report += 'Missing Pieces:\n';
            const missingPieces = detail.set.getAllPieces()
                .filter(piece => !detail.equippedItems.some(item => item.id === piece.id));
                
            for (const piece of missingPieces) {
                report += `- ${piece.name} (${piece.equipSlot})\n`;
            }
        }
        
        return report;
    }
    
    /**
     * Remove a set from the manager
     * @param {string} setId - The ID of the set to remove
     * @returns {boolean} Whether the set was removed
     */
    removeSet(setId) {
        const set = this.getSet(setId);
        
        if (!set) {
            return false;
        }
        
        // Remove all item mappings for this set
        for (const piece of set.pieces) {
            if (piece.id && this.itemSetMap.get(piece.id) === setId) {
                this.itemSetMap.delete(piece.id);
            }
        }
        
        this.sets.delete(setId);
        this.dispatchEvent({ type: 'set_removed', setId });
        
        return true;
    }
    
    /**
     * Load equipment sets from JSON data
     * @param {Object|string} jsonData - JSON data or path to JSON file
     * @returns {Promise<Array>} Promise resolving to array of loaded sets
     */
    async loadSetsFromJson(jsonData) {
        let data;
        
        if (typeof jsonData === 'string') {
            try {
                const response = await fetch(jsonData);
                data = await response.json();
            } catch (error) {
                console.error('Error loading equipment sets:', error);
                return [];
            }
        } else {
            data = jsonData;
        }
        
        if (!data || !Array.isArray(data.sets)) {
            return [];
        }
        
        return this.registerSets(data.sets);
    }
    
    /**
     * Create a recommended sets list for a character
     * @param {Object} character - The character to get recommendations for
     * @returns {Array} Array of recommended sets
     */
    getRecommendedSets(character) {
        if (!character) {
            return [];
        }
        
        // Get all sets matching the character's level and class
        const characterLevel = character.level || 1;
        const characterClass = character.characterClass || '';
        
        const allSets = this.getAllSets();
        
        // Filter and sort sets by relevance
        return allSets
            .filter(set => {
                // Check if set has any level requirements
                const hasLevelRequirement = set.pieces.some(piece => piece.requiredLevel);
                if (hasLevelRequirement) {
                    // Check if any pieces are too high level
                    const anyTooHighLevel = set.pieces.some(piece => 
                        piece.requiredLevel > characterLevel);
                    if (anyTooHighLevel) {
                        return false;
                    }
                }
                
                // Check class restrictions
                const hasClassRestriction = set.pieces.some(piece => 
                    piece.classRestrictions && piece.classRestrictions.length > 0);
                    
                if (hasClassRestriction) {
                    // Check if any pieces can't be used by this class
                    const anyWrongClass = set.pieces.some(piece => 
                        piece.classRestrictions && 
                        piece.classRestrictions.length > 0 && 
                        !piece.classRestrictions.includes(characterClass));
                        
                    if (anyWrongClass) {
                        return false;
                    }
                }
                
                return true;
            })
            .sort((a, b) => {
                // Sort by level appropriateness first
                const aMaxLevel = Math.max(...a.pieces.map(p => p.requiredLevel || 0));
                const bMaxLevel = Math.max(...b.pieces.map(p => p.requiredLevel || 0));
                
                const aLevelDiff = aMaxLevel <= characterLevel ? characterLevel - aMaxLevel : 999;
                const bLevelDiff = bMaxLevel <= characterLevel ? characterLevel - bMaxLevel : 999;
                
                if (aLevelDiff !== bLevelDiff) {
                    return aLevelDiff - bLevelDiff;
                }
                
                // Then sort by rarity (higher rarity first)
                const rarityOrder = { 'LEGENDARY': 4, 'EPIC': 3, 'RARE': 2, 'UNCOMMON': 1, 'COMMON': 0 };
                return rarityOrder[b.rarity] - rarityOrder[a.rarity];
            })
            .slice(0, 5); // Return top 5 recommendations
    }
    
    /**
     * Clear all registered sets
     */
    clear() {
        this.sets.clear();
        this.itemSetMap.clear();
        this.dispatchEvent({ type: 'sets_cleared' });
    }
} 