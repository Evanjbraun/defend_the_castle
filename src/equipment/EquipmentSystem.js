import * as THREE from 'three';

export class EquipmentSystem extends THREE.EventDispatcher {
    constructor(owner) {
        super();
        console.log('=== EquipmentSystem: Initializing ===');
        console.log('Owner:', owner.name);
        
        // Reference to the NPC/character that owns this equipment
        this.owner = owner;

        // Equipment slots (similar to RuneScape)
        this.slots = {
            HEAD: null,
            CAPE: null,
            NECK: null,
            AMMO: null,
            MAINHAND: null,
            OFFHAND: null,
            BODY: null,
            LEGS: null,
            HANDS: null,
            FEET: null,
            RING: null
        };

        // Map equipment slots to attachment points
        this.slotToAttachment = {
            MAINHAND: 'RIGHT_HAND',
            OFFHAND: 'LEFT_HAND',
            HEAD: 'HEAD',
            BODY: 'CHEST',
            LEGS: 'LEGS',
            FEET: 'FEET'
        };

        // Track equipped items for stat calculation
        this.equippedItems = new Map();

        console.log('EquipmentSystem initialized with slots:', Object.keys(this.slots));
    }

    /**
     * Get the attachment point name for a slot
     * @param {string} slot - The equipment slot
     * @returns {string} The attachment point name
     */
    getAttachmentPoint(slot) {
        return this.slotToAttachment[slot] || slot;
    }

    /**
     * Equip an item to a specific slot
     * @param {ItemSchema} item - The item to equip
     * @param {string} slot - The slot to equip to
     * @returns {boolean} Whether the equip was successful
     */
    equip(item, slot) {
        console.log('=== EquipmentSystem: Equipping Item ===');
        console.log('Item:', item.name);
        console.log('Slot:', slot);
        
        if (!item || !item.isEquippable) {
            console.warn('EquipmentSystem: Item is not equippable:', item);
            return false;
        }
        if (!(slot in this.slots)) {
            console.warn('EquipmentSystem: Invalid slot:', slot);
            return false;
        }

        // Unequip existing item if any
        this.unequip(slot);

        // Equip the new item
        this.slots[slot] = item;
        this.equippedItems.set(slot, item);
        item.onEquip();

        // Apply item stats to owner
        this.applyItemStats(item);

        // Get the attachment point for this slot
        const attachmentPoint = this.getAttachmentPoint(slot);

        // Dispatch equipped event for visual handling
        this.dispatchEvent({
            type: 'itemEquipped',
            slot: { slotType: attachmentPoint },
            item: item
        });

        console.log('=== EquipmentSystem: Equip Complete ===');
        return true;
    }

    /**
     * Unequip an item from a specific slot
     * @param {string} slot - The slot to unequip from
     * @returns {ItemSchema|null} The unequipped item or null if slot was empty
     */
    unequip(slot) {
        console.log('=== EquipmentSystem: Unequipping Item ===');
        console.log('Slot:', slot);
        
        const item = this.slots[slot];
        if (!item) {
            console.log('EquipmentSystem: No item to unequip in slot:', slot);
            return null;
        }

        console.log('EquipmentSystem: Unequipping item:', item.name);

        // Remove item stats from owner
        this.removeItemStats(item);

        // Remove item from equipped items
        this.equippedItems.delete(slot);
        this.slots[slot] = null;

        // Get the attachment point for this slot
        const attachmentPoint = this.getAttachmentPoint(slot);

        // Dispatch unequipped event for visual handling
        this.dispatchEvent({
            type: 'itemUnequipped',
            slot: { slotType: attachmentPoint },
            item: item
        });

        item.onUnequip();
        console.log('=== EquipmentSystem: Unequip Complete ===');
        return item;
    }

    /**
     * Apply an item's stats to the owner
     * @param {ItemSchema} item - The item whose stats to apply
     */
    applyItemStats(item) {
        if (!this.owner) return;

        // Apply each stat from the item
        Object.entries(item.stats).forEach(([stat, value]) => {
            if (this.owner[stat] !== undefined) {
                this.owner[stat] += value;
            }
        });
    }

    /**
     * Remove an item's stats from the owner
     * @param {ItemSchema} item - The item whose stats to remove
     */
    removeItemStats(item) {
        if (!this.owner) return;

        // Remove each stat from the item
        Object.entries(item.stats).forEach(([stat, value]) => {
            if (this.owner[stat] !== undefined) {
                this.owner[stat] -= value;
            }
        });
    }

    /**
     * Get the total stats from all equipped items
     * @returns {Object} Combined stats from all equipped items
     */
    getTotalStats() {
        const totalStats = {};

        this.equippedItems.forEach(item => {
            if (item.stats) {
                Object.entries(item.stats).forEach(([stat, value]) => {
                    totalStats[stat] = (totalStats[stat] || 0) + value;
                });
            }
        });

        return totalStats;
    }

    /**
     * Get an item from a specific slot
     * @param {string} slot - The slot to check
     * @returns {ItemSchema|null} The equipped item or null if slot is empty
     */
    getItem(slot) {
        return this.slots[slot] || null;
    }

    /**
     * Check if a slot is empty
     * @param {string} slot - The slot to check
     * @returns {boolean} Whether the slot is empty
     */
    isSlotEmpty(slot) {
        return !this.slots[slot];
    }

    /**
     * Get all equipped items
     * @returns {Map<string, ItemSchema>} Map of slot names to equipped items
     */
    getEquippedItems() {
        return this.equippedItems;
    }
} 