import * as THREE from 'three';
import { ItemSchema } from './ItemSchema.js';

/**
 * Factory for creating and customizing items
 */
export class ItemFactory extends THREE.EventDispatcher {
    /**
     * Create a new item factory
     * @param {Object} config - Configuration options
     */
    constructor(config = {}) {
        super();
        
        this.database = config.database || null;
        this.scene = config.scene || null;
        this.debug = config.debug || false;
        
        // Quality modifiers
        this.qualityModifiers = {
            'JUNK': 0.7,
            'COMMON': 1.0,
            'UNCOMMON': 1.2,
            'RARE': 1.5,
            'EPIC': 2.0,
            'LEGENDARY': 3.0
        };
        
        // Prefix and suffix options for random items
        this.prefixes = config.prefixes || [];
        this.suffixes = config.suffixes || [];
        
        // Initialize any custom property modifiers
        this.propertyModifiers = config.propertyModifiers || {};
        
        if (this.debug) {
            console.log('ItemFactory initialized');
        }
    }
    
    /**
     * Set the item database
     * @param {Object} database - The item database
     */
    setDatabase(database) {
        this.database = database;
    }
    
    /**
     * Create an item from a template ID
     * @param {string} templateId - The template item ID
     * @param {Object} options - Options for customizing the item
     * @returns {ItemSchema|null} The created item or null on failure
     */
    createItem(templateId, options = {}) {
        if (!this.database) {
            console.error('ItemFactory requires a database to create items');
            return null;
        }
        
        const template = this.database.getItemById(templateId);
        
        if (!template) {
            console.error(`Template item not found: ${templateId}`);
            return null;
        }
        
        // Clone the template
        const item = template.clone();
        
        // If we want a unique ID for this instance
        if (options.generateUniqueId) {
            item.id = `${item.id}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        }
        
        // Apply custom options
        this._applyCustomOptions(item, options);
        
        // Apply randomization if requested
        if (options.randomize) {
            this._randomizeItem(item, options.randomizeLevel || 1);
        }
        
        // Set quantity if specified
        if (options.quantity !== undefined) {
            item.quantity = options.quantity;
        }
        
        // Apply quality modifier if specified
        if (options.quality) {
            this._applyQualityModifier(item, options.quality);
        }
        
        this.dispatchEvent({
            type: 'item_created',
            item
        });
        
        return item;
    }
    
    /**
     * Apply custom options to an item
     * @param {ItemSchema} item - The item to modify
     * @param {Object} options - The options to apply
     * @private
     */
    _applyCustomOptions(item, options) {
        // Apply direct property overrides
        if (options.properties) {
            Object.entries(options.properties).forEach(([key, value]) => {
                if (item[key] !== undefined) {
                    item[key] = value;
                }
            });
        }
        
        // Apply stat modifiers
        if (options.stats) {
            item.stats = item.stats || {};
            Object.entries(options.stats).forEach(([stat, value]) => {
                if (typeof value === 'number') {
                    item.stats[stat] = (item.stats[stat] || 0) + value;
                } else {
                    item.stats[stat] = value;
                }
            });
        }
        
        // Apply additional effects
        if (options.effects && Array.isArray(options.effects)) {
            item.effects = [...(item.effects || []), ...options.effects];
        }
        
        // Apply tags
        if (options.tags && Array.isArray(options.tags)) {
            item.tags = [...new Set([...(item.tags || []), ...options.tags])];
        }
        
        // Apply metadata
        if (options.metadata) {
            item.metadata = { ...(item.metadata || {}), ...options.metadata };
        }
    }
    
    /**
     * Randomize item properties
     * @param {ItemSchema} item - The item to randomize
     * @param {number} level - The randomization level (1-10)
     * @private
     */
    _randomizeItem(item, level) {
        // Determine rarity based on level
        if (level >= 9) {
            item.rarity = 'LEGENDARY';
        } else if (level >= 7) {
            item.rarity = 'EPIC';
        } else if (level >= 5) {
            item.rarity = 'RARE';
        } else if (level >= 3) {
            item.rarity = 'UNCOMMON';
        } else {
            item.rarity = 'COMMON';
        }
        
        // Randomize stats
        if (item.isEquippable && item.stats) {
            const statMultiplier = 0.8 + (level * 0.05) + (Math.random() * 0.4);
            
            Object.keys(item.stats).forEach(stat => {
                if (typeof item.stats[stat] === 'number') {
                    item.stats[stat] = Math.round(item.stats[stat] * statMultiplier);
                }
            });
        }
        
        // Random name modification (for epic and legendary items)
        if (['EPIC', 'LEGENDARY'].includes(item.rarity)) {
            this._randomizeName(item);
        }
        
        // Random color variation
        if (item.color && typeof item.color === 'object') {
            const variance = 0.1 + (level * 0.02);
            
            if (item.color.r !== undefined) {
                item.color.r = Math.min(1, Math.max(0, item.color.r + (Math.random() * variance * 2 - variance)));
                item.color.g = Math.min(1, Math.max(0, item.color.g + (Math.random() * variance * 2 - variance)));
                item.color.b = Math.min(1, Math.max(0, item.color.b + (Math.random() * variance * 2 - variance)));
            } else if (item.color.h !== undefined) {
                item.color.h = (item.color.h + Math.random() * 20 - 10) % 360;
                item.color.s = Math.min(1, Math.max(0, item.color.s + (Math.random() * 0.2 - 0.1)));
                item.color.l = Math.min(1, Math.max(0, item.color.l + (Math.random() * 0.2 - 0.1)));
            }
        }
        
        // Adjust value
        item.value = Math.round(item.value * (1 + (level * 0.2)));
        
        // Add random effects for higher level items
        if (level >= 6 && item.isEquippable) {
            const randomEffect = this._generateRandomEffect(level);
            if (randomEffect) {
                item.effects = item.effects || [];
                item.effects.push(randomEffect);
            }
        }
    }
    
    /**
     * Apply a quality modifier to an item
     * @param {ItemSchema} item - The item to modify
     * @param {string} quality - The quality level
     * @private
     */
    _applyQualityModifier(item, quality) {
        const modifier = this.qualityModifiers[quality] || 1.0;
        
        // Adjust stats based on quality
        if (item.isEquippable && item.stats) {
            Object.keys(item.stats).forEach(stat => {
                if (typeof item.stats[stat] === 'number') {
                    item.stats[stat] = Math.round(item.stats[stat] * modifier);
                }
            });
        }
        
        // Adjust value
        item.value = Math.round(item.value * modifier);
        
        // Set the rarity if it's higher
        const rarityLevels = ['JUNK', 'COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'];
        const currentIndex = rarityLevels.indexOf(item.rarity);
        const qualityIndex = rarityLevels.indexOf(quality);
        
        if (qualityIndex > currentIndex) {
            item.rarity = quality;
        }
        
        // Add tooltip color based on quality
        const qualityColors = {
            'JUNK': '#9d9d9d',
            'COMMON': '#ffffff',
            'UNCOMMON': '#1eff00',
            'RARE': '#0070dd',
            'EPIC': '#a335ee',
            'LEGENDARY': '#ff8000'
        };
        
        item.tooltipColor = qualityColors[item.rarity] || qualityColors['COMMON'];
    }
    
    /**
     * Randomize an item's name with prefixes or suffixes
     * @param {ItemSchema} item - The item to modify
     * @private
     */
    _randomizeName(item) {
        if (this.prefixes.length === 0 && this.suffixes.length === 0) {
            return;
        }
        
        let newName = item.name;
        
        // Add prefix 50% of the time
        if (this.prefixes.length > 0 && Math.random() > 0.5) {
            const prefix = this.prefixes[Math.floor(Math.random() * this.prefixes.length)];
            newName = `${prefix} ${newName}`;
        }
        
        // Add suffix 50% of the time
        if (this.suffixes.length > 0 && Math.random() > 0.5) {
            const suffix = this.suffixes[Math.floor(Math.random() * this.suffixes.length)];
            newName = `${newName} of ${suffix}`;
        }
        
        item.name = newName;
    }
    
    /**
     * Generate a random effect based on level
     * @param {number} level - The randomization level
     * @returns {Object|null} A random effect or null
     * @private
     */
    _generateRandomEffect(level) {
        const effectTypes = [
            'damageBoost',
            'criticalChance',
            'healthRegen',
            'moveSpeed',
            'elementalDamage',
            'thorns',
            'lifeSteal'
        ];
        
        const type = effectTypes[Math.floor(Math.random() * effectTypes.length)];
        const power = Math.round(level * (0.5 + Math.random() * 0.5));
        
        let description;
        let effectData;
        
        switch (type) {
            case 'damageBoost':
                description = `Increases damage by ${power}%`;
                effectData = { damageMultiplier: 1 + (power / 100) };
                break;
            case 'criticalChance':
                description = `Increases critical hit chance by ${power}%`;
                effectData = { critChance: power };
                break;
            case 'healthRegen':
                description = `Regenerates ${power} health per second`;
                effectData = { healthRegen: power };
                break;
            case 'moveSpeed':
                description = `Increases movement speed by ${power}%`;
                effectData = { moveSpeedBonus: power / 100 };
                break;
            case 'elementalDamage':
                const elements = ['fire', 'ice', 'lightning', 'poison'];
                const element = elements[Math.floor(Math.random() * elements.length)];
                description = `Adds ${power} ${element} damage`;
                effectData = { elementalDamage: { type: element, amount: power } };
                break;
            case 'thorns':
                description = `Returns ${power} damage to attackers`;
                effectData = { thorns: power };
                break;
            case 'lifeSteal':
                const percent = Math.max(1, Math.round(power / 2));
                description = `${percent}% of damage dealt is converted to health`;
                effectData = { lifeSteal: percent / 100 };
                break;
            default:
                return null;
        }
        
        return {
            id: `random_${type}_${Date.now()}`,
            name: `Random ${type}`,
            description,
            data: effectData,
            apply: function(target) {
                // This would be implemented in the game's effect system
                // We're just providing a placeholder
                if (target && target.applyEffect) {
                    target.applyEffect(this);
                }
            }
        };
    }
    
    /**
     * Create multiple items from a template
     * @param {string} templateId - The template item ID
     * @param {number} count - Number of items to create
     * @param {Object} options - Options for customizing the items
     * @returns {Array} Array of created items
     */
    createMultiple(templateId, count, options = {}) {
        const items = [];
        
        for (let i = 0; i < count; i++) {
            const item = this.createItem(templateId, options);
            if (item) {
                items.push(item);
            }
        }
        
        return items;
    }
    
    /**
     * Create a random item from a category
     * @param {string} category - The category of items
     * @param {Object} options - Options for customizing the item
     * @returns {ItemSchema|null} The created item or null on failure
     */
    createRandomItem(category, options = {}) {
        if (!this.database) {
            console.error('ItemFactory requires a database to create items');
            return null;
        }
        
        const categoryItems = this.database.getItemsByCategory(category);
        
        if (!categoryItems || categoryItems.length === 0) {
            console.error(`No items found in category: ${category}`);
            return null;
        }
        
        const randomTemplate = categoryItems[Math.floor(Math.random() * categoryItems.length)];
        
        // Always randomize random items unless explicitly set to false
        if (options.randomize !== false) {
            options.randomize = true;
        }
        
        return this.createItem(randomTemplate.id, options);
    }
    
    /**
     * Create items from a loot table
     * @param {string} tableId - The loot table ID
     * @param {Object} options - Options for customizing the items
     * @returns {Array} Array of {item, quantity} objects
     */
    createLoot(tableId, options = {}) {
        if (!this.database) {
            console.error('ItemFactory requires a database to create loot');
            return [];
        }
        
        const loot = this.database.generateLoot(tableId);
        
        // Apply additional customization to each item
        loot.forEach(entry => {
            this._applyCustomOptions(entry.item, options);
            
            if (options.randomize) {
                this._randomizeItem(entry.item, options.randomizeLevel || 1);
            }
        });
        
        return loot;
    }
    
    /**
     * Create a 3D model for an item
     * @param {ItemSchema} item - The item to create a model for
     * @returns {THREE.Object3D|null} The created model or null on failure
     */
    createItemModel(item) {
        if (!this.scene) {
            console.error('ItemFactory requires a scene to create item models');
            return null;
        }
        
        if (!item.model) {
            return null;
        }
        
        // This would typically load a 3D model from a file or create a basic shape
        // For this example, we'll create a simple placeholder mesh
        
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial({ 
            color: item.color || 0xffffff 
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.scale.set(
            item.scale || 1, 
            item.scale || 1, 
            item.scale || 1
        );
        
        mesh.userData.item = item;
        
        return mesh;
    }
    
    /**
     * Create items from an equipment set
     * @param {string} setId - The equipment set ID
     * @param {Object} options - Options for customizing the items
     * @returns {Array} Array of created items
     */
    createSetItems(setId, options = {}) {
        if (!this.database) {
            console.error('ItemFactory requires a database to create set items');
            return [];
        }
        
        const set = this.database.getEquipmentSet(setId);
        
        if (!set || !set.pieces || set.pieces.length === 0) {
            console.error(`Equipment set not found or has no pieces: ${setId}`);
            return [];
        }
        
        // Ensure all items have the same quality/rarity as the set
        const itemOptions = {
            ...options,
            quality: set.rarity,
            metadata: {
                ...(options.metadata || {}),
                setId: setId
            }
        };
        
        return set.pieces.map(pieceId => this.createItem(pieceId, itemOptions))
                         .filter(item => item !== null);
    }
} 