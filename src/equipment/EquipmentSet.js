import * as THREE from 'three';

/**
 * Represents an equipment set with bonuses for wearing multiple pieces
 */
export class EquipmentSet extends THREE.EventDispatcher {
    /**
     * Create a new equipment set
     * @param {Object} config - Set configuration
     */
    constructor(config = {}) {
        super();
        
        this.id = config.id || `set_${Math.floor(Math.random() * 100000)}`;
        this.name = config.name || 'Unknown Set';
        this.description = config.description || '';
        this.pieces = config.pieces || [];
        this.rarity = config.rarity || 'COMMON';
        
        // Set bonuses at different thresholds (2, 3, 4, 5+ pieces)
        this.bonuses = config.bonuses || {
            2: { stats: {}, description: '2-piece bonus: None' },
            3: { stats: {}, description: '3-piece bonus: None' },
            4: { stats: {}, description: '4-piece bonus: None' },
            5: { stats: {}, description: '5-piece bonus: None' }
        };
        
        // Special effects that activate at different thresholds
        this.effects = config.effects || {
            2: null,
            3: null,
            4: null,
            5: null
        };
        
        // Visual properties for the set
        this.icon = config.icon || null;
        this.aura = config.aura || null; // Visual effect when wearing the full set
    }
    
    /**
     * Get the bonus for wearing a specific number of set pieces
     * @param {number} pieceCount - Number of pieces worn
     * @returns {Object} The set bonus for that threshold
     */
    getBonusForPieceCount(pieceCount) {
        // Find the highest threshold that is less than or equal to pieceCount
        const thresholds = Object.keys(this.bonuses)
            .map(Number)
            .filter(threshold => threshold <= pieceCount)
            .sort((a, b) => b - a);
            
        if (thresholds.length === 0) {
            return { stats: {}, description: 'No bonus active' };
        }
        
        return this.bonuses[thresholds[0]];
    }
    
    /**
     * Get the effect for wearing a specific number of set pieces
     * @param {number} pieceCount - Number of pieces worn
     * @returns {Function|null} The effect function or null
     */
    getEffectForPieceCount(pieceCount) {
        // Find the highest threshold that is less than or equal to pieceCount
        const thresholds = Object.keys(this.effects)
            .map(Number)
            .filter(threshold => threshold <= pieceCount && this.effects[threshold])
            .sort((a, b) => b - a);
            
        if (thresholds.length === 0) {
            return null;
        }
        
        return this.effects[thresholds[0]];
    }
    
    /**
     * Check if an item belongs to this set
     * @param {Object} item - The item to check
     * @returns {boolean} Whether the item belongs to this set
     */
    itemBelongsToSet(item) {
        if (!item) {
            return false;
        }
        
        return item.setId === this.id;
    }
    
    /**
     * Get all the pieces in this set
     * @returns {Array} Array of set pieces
     */
    getAllPieces() {
        return [...this.pieces];
    }
    
    /**
     * Get the count of unique slot types in this set
     * @returns {number} The number of unique slot types
     */
    getUniqueSlotCount() {
        const uniqueSlots = new Set();
        
        for (const piece of this.pieces) {
            if (piece.equipSlot) {
                uniqueSlots.add(piece.equipSlot);
            }
        }
        
        return uniqueSlots.size;
    }
    
    /**
     * Check if a character has any pieces from this set equipped
     * @param {Object} equipment - The character's equipment
     * @returns {boolean} Whether any set piece is equipped
     */
    hasAnyPiecesEquipped(equipment) {
        if (!equipment) {
            return false;
        }
        
        const equippedItems = equipment.getEquippedItems();
        
        return equippedItems.some(item => this.itemBelongsToSet(item));
    }
    
    /**
     * Get the number of pieces from this set that are equipped
     * @param {Object} equipment - The character's equipment
     * @returns {Object} Object with count and items array
     */
    getEquippedPieceCount(equipment) {
        if (!equipment) {
            return { count: 0, items: [] };
        }
        
        const equippedItems = equipment.getEquippedItems();
        const setPieces = equippedItems.filter(item => this.itemBelongsToSet(item));
        
        return {
            count: setPieces.length,
            items: setPieces
        };
    }
    
    /**
     * Apply set bonuses to a character
     * @param {Object} character - The character to apply bonuses to
     * @param {Object} equipment - The character's equipment
     */
    applyBonusesToCharacter(character, equipment) {
        if (!character || !equipment) {
            return;
        }
        
        const { count, items } = this.getEquippedPieceCount(equipment);
        
        if (count <= 0) {
            return;
        }
        
        // Get bonus for the current piece count
        const bonus = this.getBonusForPieceCount(count);
        
        // Apply stat bonuses
        if (bonus.stats && typeof character.applySetBonus === 'function') {
            character.applySetBonus(this.id, bonus.stats);
        }
        
        // Apply effects if available
        const effect = this.getEffectForPieceCount(count);
        if (effect && typeof effect === 'function') {
            effect(character, items);
        }
        
        // Apply aura for full set
        if (this.aura && count >= this.getUniqueSlotCount()) {
            this.applySetAura(character);
        }
    }
    
    /**
     * Apply the set aura to a character (visual effect for complete set)
     * @param {Object} character - The character to apply aura to
     */
    applySetAura(character) {
        if (!character || !character.model || !this.aura) {
            return;
        }
        
        // Check if aura is already applied
        let auraEffect = character.model.getObjectByName(`set_aura_${this.id}`);
        
        if (!auraEffect) {
            // Create aura effect based on set properties
            // This is just a placeholder - actual implementation would depend on your game's visuals
            auraEffect = new THREE.Mesh(
                new THREE.SphereGeometry(1.2, 16, 16),
                new THREE.MeshBasicMaterial({
                    color: this.getAuraColor(),
                    transparent: true,
                    opacity: 0.3,
                    wireframe: true
                })
            );
            
            auraEffect.name = `set_aura_${this.id}`;
            character.model.add(auraEffect);
            
            // Animate the aura
            this.animateAura(auraEffect);
        }
    }
    
    /**
     * Get the color for the set aura based on rarity
     * @returns {number} Hex color value
     * @private
     */
    getAuraColor() {
        switch (this.rarity) {
            case 'LEGENDARY': return 0xff8800;
            case 'EPIC': return 0xaa00ff;
            case 'RARE': return 0x0088ff;
            case 'UNCOMMON': return 0x00cc00;
            default: return 0xcccccc;
        }
    }
    
    /**
     * Animate the aura effect
     * @param {THREE.Object3D} auraObject - The aura object to animate
     * @private
     */
    animateAura(auraObject) {
        if (!auraObject) {
            return;
        }
        
        // Example animation logic (would normally use your game's animation system)
        let time = 0;
        const animate = () => {
            time += 0.01;
            
            auraObject.scale.x = 1.0 + Math.sin(time) * 0.1;
            auraObject.scale.y = 1.0 + Math.sin(time) * 0.1;
            auraObject.scale.z = 1.0 + Math.sin(time) * 0.1;
            
            auraObject.rotation.y = time * 0.2;
            
            requestAnimationFrame(animate);
        };
        
        animate();
    }
    
    /**
     * Remove set aura from a character
     * @param {Object} character - The character to remove aura from
     */
    removeSetAura(character) {
        if (!character || !character.model) {
            return;
        }
        
        const auraEffect = character.model.getObjectByName(`set_aura_${this.id}`);
        
        if (auraEffect) {
            character.model.remove(auraEffect);
        }
    }
    
    /**
     * Get a description of the set and its bonuses
     * @returns {string} Set description
     */
    getDescription() {
        let desc = `${this.name} (${this.rarity})\n`;
        desc += `${this.description}\n\n`;
        
        // Add all piece names
        desc += 'Set Pieces:\n';
        for (const piece of this.pieces) {
            desc += `- ${piece.name} (${piece.equipSlot})\n`;
        }
        
        desc += '\nSet Bonuses:\n';
        
        // Add bonus descriptions
        for (const [threshold, bonus] of Object.entries(this.bonuses)) {
            if (bonus.description) {
                desc += `${bonus.description}\n`;
            }
        }
        
        return desc;
    }
    
    /**
     * Get the highest active bonus threshold for a given equipment setup
     * @param {Object} equipment - The character's equipment
     * @returns {number} The highest active threshold
     */
    getHighestActiveThreshold(equipment) {
        const { count } = this.getEquippedPieceCount(equipment);
        
        const thresholds = Object.keys(this.bonuses)
            .map(Number)
            .filter(threshold => threshold <= count)
            .sort((a, b) => b - a);
            
        return thresholds.length > 0 ? thresholds[0] : 0;
    }
    
    /**
     * Create item links for this set in the game world
     * @param {Object} itemFactory - Factory that can create items
     * @param {Object} scene - The scene to add items to
     * @param {Object} position - The position to place items
     * @returns {Array} Array of created items
     */
    createSetItems(itemFactory, scene, position) {
        if (!itemFactory || !scene) {
            return [];
        }
        
        const items = [];
        const basePosition = position || { x: 0, y: 0, z: 0 };
        
        // Layout in a circle
        const radius = 2;
        const angleStep = (2 * Math.PI) / this.pieces.length;
        
        for (let i = 0; i < this.pieces.length; i++) {
            const piece = this.pieces[i];
            const angle = i * angleStep;
            
            // Calculate position in circle
            const itemPosition = {
                x: basePosition.x + Math.cos(angle) * radius,
                y: basePosition.y,
                z: basePosition.z + Math.sin(angle) * radius
            };
            
            // Create the item
            const item = itemFactory.createItem(piece.id, itemPosition);
            
            if (item) {
                items.push(item);
                scene.add(item.model);
            }
        }
        
        return items;
    }
} 