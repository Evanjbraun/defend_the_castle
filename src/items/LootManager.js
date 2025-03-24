import * as THREE from 'three';

/**
 * Manager for generating and distributing loot
 */
export class LootManager extends THREE.EventDispatcher {
    /**
     * Create a new loot manager
     * @param {Object} config - Configuration options
     */
    constructor(config = {}) {
        super();
        
        this.itemFactory = config.itemFactory || null;
        this.debug = config.debug || false;
        
        // Level scaling factor for quality chance
        this.levelScaling = config.levelScaling || 0.05;
        
        // Global drop chance modifiers
        this.globalDropChanceModifier = config.globalDropChanceModifier || 1.0;
        
        // Loot quality chance tables (default values)
        this.qualityChances = config.qualityChances || {
            'JUNK': 0.2,
            'COMMON': 0.5,
            'UNCOMMON': 0.2,
            'RARE': 0.08,
            'EPIC': 0.015,
            'LEGENDARY': 0.005
        };
        
        // Special condition modifiers
        this.specialConditionModifiers = config.specialConditionModifiers || {
            boss: 2.0,                // Boss enemies drop better loot
            eliteEnemy: 1.5,          // Elite enemies drop better loot
            playerLuck: 0.01,         // Per point of player luck stat
            treasureChest: 1.3,       // Treasure chests have better loot
            questReward: 1.5,         // Quest rewards have better quality
            hardMode: 1.25            // Hard mode increases quality
        };
        
        // Enemy level to player level difference modifier
        this.levelDifferenceModifier = config.levelDifferenceModifier || 0.1;
        
        if (this.debug) {
            console.log('LootManager initialized');
        }
    }
    
    /**
     * Set the item factory
     * @param {Object} itemFactory - The item factory
     */
    setItemFactory(itemFactory) {
        this.itemFactory = itemFactory;
    }
    
    /**
     * Generate loot from an enemy
     * @param {Object} enemy - The enemy object
     * @param {Object} player - The player who defeated the enemy
     * @param {Object} options - Additional options
     * @returns {Array} Array of generated item objects
     */
    generateEnemyLoot(enemy, player, options = {}) {
        if (!this.itemFactory) {
            console.error('LootManager requires an itemFactory to generate loot');
            return [];
        }
        
        // Calculate the base drop chance
        let dropChance = (enemy.dropRate || 0.3) * this.globalDropChanceModifier;
        
        // Apply level difference modifier
        const levelDifference = (enemy.level || 1) - (player.level || 1);
        dropChance *= (1 + (levelDifference * this.levelDifferenceModifier));
        
        // Apply special conditions
        if (enemy.isBoss) {
            dropChance *= this.specialConditionModifiers.boss;
        }
        
        if (enemy.isElite) {
            dropChance *= this.specialConditionModifiers.eliteEnemy;
        }
        
        // Apply player luck stat
        if (player.stats && player.stats.luck) {
            dropChance *= (1 + (player.stats.luck * this.specialConditionModifiers.playerLuck));
        }
        
        // Apply options modifiers
        if (options.hardMode) {
            dropChance *= this.specialConditionModifiers.hardMode;
        }
        
        if (options.dropChanceModifier) {
            dropChance *= options.dropChanceModifier;
        }
        
        // Check if any loot drops
        if (Math.random() > dropChance) {
            return [];
        }
        
        // Determine number of items to drop
        const baseItemCount = enemy.isBoss ? 3 : (enemy.isElite ? 2 : 1);
        const extraItemChance = enemy.isBoss ? 0.7 : (enemy.isElite ? 0.4 : 0.1);
        
        let itemCount = baseItemCount;
        
        // Chance for extra items
        for (let i = 0; i < 3; i++) {
            if (Math.random() < extraItemChance) {
                itemCount++;
            } else {
                break;
            }
        }
        
        // Generate the loot
        const loot = [];
        
        for (let i = 0; i < itemCount; i++) {
            // Determine item quality
            const quality = this._determineItemQuality(enemy.level || 1, player, options);
            
            // Choose a category based on enemy type
            const category = this._chooseLootCategory(enemy);
            
            // Create the item
            const item = this.itemFactory.createRandomItem(category, {
                randomize: true,
                randomizeLevel: Math.max(1, Math.min(10, enemy.level / 5)),
                quality
            });
            
            if (item) {
                // Determine quantity for stackable items
                let quantity = 1;
                if (item.isStackable) {
                    const baseQuantity = item.type === 'MATERIAL' ? 3 : 1;
                    quantity = baseQuantity + Math.floor(Math.random() * (enemy.level || 1));
                }
                
                loot.push({
                    item,
                    quantity
                });
            }
        }
        
        // Add guaranteed loot if any
        if (enemy.guaranteedLoot && Array.isArray(enemy.guaranteedLoot)) {
            enemy.guaranteedLoot.forEach(lootEntry => {
                if (lootEntry.itemId) {
                    const guaranteedItem = this.itemFactory.createItem(lootEntry.itemId, {
                        quantity: lootEntry.quantity || 1,
                        randomize: lootEntry.randomize || false
                    });
                    
                    if (guaranteedItem) {
                        loot.push({
                            item: guaranteedItem,
                            quantity: guaranteedItem.quantity
                        });
                    }
                } else if (lootEntry.lootTable) {
                    // Generate from loot table
                    const tableLoot = this.itemFactory.createLoot(lootEntry.lootTable);
                    loot.push(...tableLoot);
                }
            });
        }
        
        if (this.debug) {
            console.log(`Generated ${loot.length} items from enemy loot`);
        }
        
        this.dispatchEvent({
            type: 'loot_generated',
            source: 'enemy',
            enemy,
            loot
        });
        
        return loot;
    }
    
    /**
     * Generate loot from a container (chest, crate, etc.)
     * @param {Object} container - The container object
     * @param {Object} player - The player opening the container
     * @param {Object} options - Additional options
     * @returns {Array} Array of generated item objects
     */
    generateContainerLoot(container, player, options = {}) {
        if (!this.itemFactory) {
            console.error('LootManager requires an itemFactory to generate loot');
            return [];
        }
        
        // Determine container quality
        const containerLevel = container.level || (player ? player.level : 1);
        const isTreasureChest = container.isTreasureChest || false;
        
        // Calculate number of items
        const baseItemCount = isTreasureChest ? 3 : 1;
        const extraItemChance = isTreasureChest ? 0.5 : 0.2;
        
        let itemCount = baseItemCount;
        
        // Chance for extra items
        for (let i = 0; i < 4; i++) {
            if (Math.random() < extraItemChance) {
                itemCount++;
            } else {
                break;
            }
        }
        
        // Generate the loot
        const loot = [];
        
        // Generate from specific loot table if provided
        if (container.lootTable) {
            const tableOptions = {
                ...options,
                randomizeLevel: Math.max(1, Math.min(10, containerLevel / 5))
            };
            
            if (isTreasureChest) {
                tableOptions.dropChanceModifier = this.specialConditionModifiers.treasureChest;
            }
            
            const tableLoot = this.itemFactory.createLoot(container.lootTable, tableOptions);
            loot.push(...tableLoot);
        } else {
            // Generate random loot
            for (let i = 0; i < itemCount; i++) {
                // Determine item quality
                const qualityOptions = { ...options };
                if (isTreasureChest) {
                    qualityOptions.qualityModifier = this.specialConditionModifiers.treasureChest;
                }
                
                const quality = this._determineItemQuality(containerLevel, player, qualityOptions);
                
                // Choose a random category with weighted probabilities
                const categoryWeights = {
                    'equipment': 0.4,
                    'consumables': 0.3,
                    'materials': 0.2,
                    'weapons': 0.1
                };
                
                const category = this._weightedRandomSelection(categoryWeights);
                
                // Create the item
                const item = this.itemFactory.createRandomItem(category, {
                    randomize: true,
                    randomizeLevel: Math.max(1, Math.min(10, containerLevel / 5)),
                    quality
                });
                
                if (item) {
                    // Determine quantity for stackable items
                    let quantity = 1;
                    if (item.isStackable) {
                        const baseQuantity = item.type === 'MATERIAL' ? 3 : 1;
                        quantity = baseQuantity + Math.floor(Math.random() * containerLevel);
                    }
                    
                    loot.push({
                        item,
                        quantity
                    });
                }
            }
        }
        
        // Add guaranteed loot if any
        if (container.guaranteedLoot && Array.isArray(container.guaranteedLoot)) {
            container.guaranteedLoot.forEach(lootEntry => {
                if (lootEntry.itemId) {
                    const guaranteedItem = this.itemFactory.createItem(lootEntry.itemId, {
                        quantity: lootEntry.quantity || 1,
                        randomize: lootEntry.randomize || false
                    });
                    
                    if (guaranteedItem) {
                        loot.push({
                            item: guaranteedItem,
                            quantity: guaranteedItem.quantity
                        });
                    }
                } else if (lootEntry.lootTable) {
                    // Generate from loot table
                    const tableLoot = this.itemFactory.createLoot(lootEntry.lootTable);
                    loot.push(...tableLoot);
                }
            });
        }
        
        if (this.debug) {
            console.log(`Generated ${loot.length} items from container loot`);
        }
        
        this.dispatchEvent({
            type: 'loot_generated',
            source: 'container',
            container,
            loot
        });
        
        return loot;
    }
    
    /**
     * Generate loot as a quest reward
     * @param {Object} quest - The quest object
     * @param {Object} player - The player completing the quest
     * @param {Object} options - Additional options
     * @returns {Array} Array of generated item objects
     */
    generateQuestReward(quest, player, options = {}) {
        if (!this.itemFactory) {
            console.error('LootManager requires an itemFactory to generate quest rewards');
            return [];
        }
        
        const loot = [];
        
        // Apply quest reward quality modifier
        const questOptions = {
            ...options,
            qualityModifier: this.specialConditionModifiers.questReward
        };
        
        // Generate from specific loot table if provided
        if (quest.rewardTable) {
            const tableLoot = this.itemFactory.createLoot(quest.rewardTable, questOptions);
            loot.push(...tableLoot);
        }
        
        // Add specific rewards if any
        if (quest.itemRewards && Array.isArray(quest.itemRewards)) {
            quest.itemRewards.forEach(rewardEntry => {
                if (rewardEntry.itemId) {
                    const rewardItem = this.itemFactory.createItem(rewardEntry.itemId, {
                        quantity: rewardEntry.quantity || 1,
                        randomize: rewardEntry.randomize || false,
                        quality: rewardEntry.quality || null
                    });
                    
                    if (rewardItem) {
                        loot.push({
                            item: rewardItem,
                            quantity: rewardItem.quantity
                        });
                    }
                }
            });
        }
        
        // Generate a random reward based on quest level if no specific rewards
        if (loot.length === 0) {
            const questLevel = quest.level || (player ? player.level : 1);
            const quality = this._determineItemQuality(questLevel, player, questOptions);
            
            // Quest rewards are more likely to be equipment
            const categoryWeights = {
                'weapons': 0.3,
                'armor': 0.3,
                'accessories': 0.2,
                'consumables': 0.1,
                'materials': 0.1
            };
            
            const category = this._weightedRandomSelection(categoryWeights);
            
            const item = this.itemFactory.createRandomItem(category, {
                randomize: true,
                randomizeLevel: Math.max(1, Math.min(10, questLevel / 3)),
                quality
            });
            
            if (item) {
                loot.push({
                    item,
                    quantity: 1
                });
            }
        }
        
        if (this.debug) {
            console.log(`Generated ${loot.length} items as quest rewards`);
        }
        
        this.dispatchEvent({
            type: 'loot_generated',
            source: 'quest',
            quest,
            loot
        });
        
        return loot;
    }
    
    /**
     * Spawn loot items in the game world
     * @param {Array} loot - Array of loot items
     * @param {Object} position - Position to spawn loot
     * @param {Object} options - Spawn options
     */
    spawnLootInWorld(loot, position, options = {}) {
        if (!this.itemFactory.scene) {
            console.error('LootManager requires a scene to spawn loot');
            return;
        }
        
        if (!loot || loot.length === 0) {
            return;
        }
        
        const radius = options.radius || 1;
        const yOffset = options.yOffset || 0.5;
        
        loot.forEach((lootEntry, index) => {
            // Calculate position in a circle around the center
            const angle = (index / loot.length) * Math.PI * 2;
            const x = position.x + Math.cos(angle) * radius * Math.random();
            const z = position.z + Math.sin(angle) * radius * Math.random();
            const y = position.y + yOffset;
            
            // Create visual representation of the item
            const itemModel = this.itemFactory.createItemModel(lootEntry.item);
            
            if (itemModel) {
                itemModel.position.set(x, y, z);
                
                // Add some random rotation
                itemModel.rotation.y = Math.random() * Math.PI * 2;
                
                // Store loot data in the model
                itemModel.userData.loot = lootEntry;
                
                // Add the model to the scene
                this.itemFactory.scene.add(itemModel);
                
                // Add a small animation to make it visually appealing
                if (options.animateSpawn) {
                    itemModel.position.y += 1;
                    itemModel.scale.set(0.1, 0.1, 0.1);
                    
                    // Simple animation
                    const startTime = Date.now();
                    const animate = () => {
                        const elapsed = (Date.now() - startTime) / 1000;
                        if (elapsed < 1) {
                            itemModel.position.y = y + 1 - elapsed;
                            itemModel.scale.set(
                                0.1 + elapsed * 0.9,
                                0.1 + elapsed * 0.9,
                                0.1 + elapsed * 0.9
                            );
                            requestAnimationFrame(animate);
                        } else {
                            itemModel.position.y = y;
                            itemModel.scale.set(1, 1, 1);
                        }
                    };
                    
                    animate();
                }
            }
        });
        
        this.dispatchEvent({
            type: 'loot_spawned',
            position,
            loot
        });
    }
    
    /**
     * Determine item quality based on level
     * @param {number} level - The level to base quality on
     * @param {Object} player - The player object
     * @param {Object} options - Additional options
     * @returns {string} The determined quality
     * @private
     */
    _determineItemQuality(level, player, options = {}) {
        // Start with base quality chances
        const qualityChances = { ...this.qualityChances };
        
        // Apply level scaling
        // As level increases, the chance for better quality items increases
        if (level > 1) {
            const levelFactor = (level - 1) * this.levelScaling;
            
            qualityChances.JUNK = Math.max(0.05, qualityChances.JUNK - levelFactor * 0.5);
            qualityChances.COMMON = Math.max(0.2, qualityChances.COMMON - levelFactor * 0.5);
            qualityChances.UNCOMMON = Math.min(0.4, qualityChances.UNCOMMON + levelFactor * 0.2);
            qualityChances.RARE = Math.min(0.25, qualityChances.RARE + levelFactor * 0.15);
            qualityChances.EPIC = Math.min(0.15, qualityChances.EPIC + levelFactor * 0.1);
            qualityChances.LEGENDARY = Math.min(0.05, qualityChances.LEGENDARY + levelFactor * 0.05);
        }
        
        // Apply player luck if available
        if (player && player.stats && player.stats.luck) {
            const luckFactor = player.stats.luck * this.specialConditionModifiers.playerLuck;
            
            qualityChances.JUNK = Math.max(0, qualityChances.JUNK - luckFactor * 0.5);
            qualityChances.COMMON = Math.max(0.1, qualityChances.COMMON - luckFactor * 0.3);
            qualityChances.UNCOMMON = Math.min(0.5, qualityChances.UNCOMMON + luckFactor * 0.1);
            qualityChances.RARE = Math.min(0.3, qualityChances.RARE + luckFactor * 0.3);
            qualityChances.EPIC = Math.min(0.2, qualityChances.EPIC + luckFactor * 0.2);
            qualityChances.LEGENDARY = Math.min(0.1, qualityChances.LEGENDARY + luckFactor * 0.2);
        }
        
        // Apply quality modifier from options
        if (options.qualityModifier) {
            const qMod = options.qualityModifier - 1;
            
            qualityChances.JUNK = Math.max(0, qualityChances.JUNK - qMod * 0.3);
            qualityChances.COMMON = Math.max(0.1, qualityChances.COMMON - qMod * 0.2);
            qualityChances.UNCOMMON = qualityChances.UNCOMMON;
            qualityChances.RARE = Math.min(0.3, qualityChances.RARE + qMod * 0.2);
            qualityChances.EPIC = Math.min(0.2, qualityChances.EPIC + qMod * 0.2);
            qualityChances.LEGENDARY = Math.min(0.1, qualityChances.LEGENDARY + qMod * 0.1);
        }
        
        // Normalize probabilities
        const total = Object.values(qualityChances).reduce((sum, val) => sum + val, 0);
        Object.keys(qualityChances).forEach(key => {
            qualityChances[key] = qualityChances[key] / total;
        });
        
        // Select a quality based on the chances
        return this._weightedRandomSelection(qualityChances);
    }
    
    /**
     * Choose a loot category based on enemy type
     * @param {Object} enemy - The enemy object
     * @returns {string} The selected category
     * @private
     */
    _chooseLootCategory(enemy) {
        let categoryWeights;
        
        // Different enemy types have different loot probabilities
        if (enemy.type === 'humanoid') {
            categoryWeights = {
                'weapons': 0.25,
                'armor': 0.25,
                'consumables': 0.2,
                'accessories': 0.1,
                'materials': 0.1,
                'misc': 0.1
            };
        } else if (enemy.type === 'beast') {
            categoryWeights = {
                'materials': 0.4,
                'consumables': 0.3,
                'accessories': 0.15,
                'misc': 0.15
            };
        } else if (enemy.type === 'undead') {
            categoryWeights = {
                'weapons': 0.2,
                'armor': 0.15,
                'accessories': 0.25,
                'consumables': 0.2,
                'materials': 0.1,
                'misc': 0.1
            };
        } else if (enemy.type === 'elemental') {
            categoryWeights = {
                'accessories': 0.3,
                'materials': 0.35,
                'consumables': 0.2,
                'misc': 0.15
            };
        } else if (enemy.type === 'magical') {
            categoryWeights = {
                'accessories': 0.35,
                'consumables': 0.25,
                'materials': 0.2,
                'weapons': 0.1,
                'armor': 0.1
            };
        } else {
            // Default weights
            categoryWeights = {
                'weapons': 0.2,
                'armor': 0.2,
                'accessories': 0.15,
                'consumables': 0.2,
                'materials': 0.15,
                'misc': 0.1
            };
        }
        
        // If the enemy has custom loot weights, use those instead
        if (enemy.lootCategoryWeights) {
            categoryWeights = enemy.lootCategoryWeights;
        }
        
        return this._weightedRandomSelection(categoryWeights);
    }
    
    /**
     * Select a random value from weighted options
     * @param {Object} weights - Object mapping options to weights
     * @returns {string} The selected option
     * @private
     */
    _weightedRandomSelection(weights) {
        const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const [option, weight] of Object.entries(weights)) {
            random -= weight;
            if (random <= 0) {
                return option;
            }
        }
        
        // Fallback: return the first option
        return Object.keys(weights)[0];
    }
    
    /**
     * Set global drop chance modifier
     * @param {number} modifier - The new global modifier
     */
    setGlobalDropChanceModifier(modifier) {
        this.globalDropChanceModifier = modifier;
    }
    
    /**
     * Update a specific quality chance
     * @param {string} quality - The quality level
     * @param {number} chance - The new chance
     */
    setQualityChance(quality, chance) {
        if (this.qualityChances[quality] !== undefined) {
            this.qualityChances[quality] = chance;
        }
    }
    
    /**
     * Set all quality chances
     * @param {Object} chances - Object mapping qualities to chances
     */
    setQualityChances(chances) {
        this.qualityChances = { ...this.qualityChances, ...chances };
    }
    
    /**
     * Update a special condition modifier
     * @param {string} condition - The condition name
     * @param {number} value - The new modifier value
     */
    setSpecialConditionModifier(condition, value) {
        if (this.specialConditionModifiers[condition] !== undefined) {
            this.specialConditionModifiers[condition] = value;
        }
    }
} 