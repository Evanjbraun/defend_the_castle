import * as THREE from 'three';

export class EquipmentSystem extends THREE.EventDispatcher {
    constructor(owner) {
        super();
        
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
        if (!item || !item.isEquippable) {
            return false;
        }
        if (!(slot in this.slots)) {
            return false;
        }

        // Unequip existing item if any
        this.unequip(slot);

        // If the item's model is a Promise, wait for it to resolve
        if (item.model instanceof Promise) {
            item.model.then(model => {
                if (model instanceof THREE.Group) {
                    item.model = model;
                    this.equipItem(item, slot);
                }
            }).catch(error => {
                // Use the fallback model if available
                if (item.model instanceof THREE.Group) {
                    this.equipItem(item, slot);
                }
            });
        } else if (item.model instanceof THREE.Group) {
            // If we already have a valid model, equip immediately
            this.equipItem(item, slot);
        } else {
            return false;
        }

        return true;
    }

    /**
     * Internal method to handle the actual equipping of an item
     * @private
     * @param {ItemSchema} item - The item to equip
     * @param {string} slot - The slot to equip to
     */
    equipItem(item, slot) {
        // Store the item in the slot
        this.slots[slot] = item;

        // Create a clone of the model for the equipment slot
        try {
            const modelClone = item.model.clone();

            // Get the attachment point for this slot
            const attachmentPoint = this.getAttachmentPoint(slot);

            // Get the transformation data from the owner if available
            if (this.owner && this.owner.itemTransformations && this.owner.itemTransformations[attachmentPoint]) {
                const transform = this.owner.itemTransformations[attachmentPoint];
                modelClone.position.set(transform.position.x, transform.position.y, transform.position.z);
                modelClone.rotation.set(transform.rotation.x, transform.rotation.y, transform.rotation.z);
                modelClone.scale.set(transform.scale.x, transform.scale.y, transform.scale.z);
            }

            // Add the model to the player's mesh
            if (this.owner && this.owner.mesh) {
                this.owner.mesh.add(modelClone);
            }

            // Call the item's onEquip method
            if (item.onEquip) {
                item.onEquip();
            }
        } catch (error) {
            // Handle any errors during equipping
        }
    }

    /**
     * Unequip an item from a specific slot
     * @param {string} slot - The slot to unequip from
     * @returns {ItemSchema|null} The unequipped item or null if slot was empty
     */
    unequip(slot) {
        const item = this.slots[slot];
        if (!item) {
            return null;
        }

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