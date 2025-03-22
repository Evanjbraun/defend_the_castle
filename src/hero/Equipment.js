import * as THREE from 'three';

export class Equipment {
    constructor() {
        // Define available equipment slots
        this.slots = {
            mainHand: null,
            offHand: null
        };

        // Track equipped items' meshes
        this.equippedMeshes = {
            mainHand: null,
            offHand: null
        };

        // Equipment stats from all equipped items
        this.totalStats = {
            attackPower: 0,
            attackSpeed: 0,
            criticalChance: 0,
            criticalDamage: 0,
            strength: 0,
            dexterity: 0,
            intelligence: 0,
            vitality: 0
        };

        // Reference to the hero's hand attachment points (to be set by hero)
        this.attachmentPoints = {
            mainHand: null,
            offHand: null
        };
    }

    // Initialize equipment system with hero's attachment points
    init(mainHandPoint, offHandPoint) {
        this.attachmentPoints.mainHand = mainHandPoint;
        this.attachmentPoints.offHand = offHandPoint;
    }

    // Equip an item to a specific slot
    equip(item, slot = 'mainHand') {
        if (!this.isValidSlot(slot)) {
            console.warn(`Invalid equipment slot: ${slot}`);
            return false;
        }

        if (!this.canEquipToSlot(item, slot)) {
            console.warn(`Cannot equip ${item.name} to ${slot}`);
            return false;
        }

        // Unequip current item in slot if any
        this.unequip(slot);

        // Assign item to slot
        this.slots[slot] = item;

        // If item has a model, attach it to the appropriate point
        if (item.model && this.attachmentPoints[slot]) {
            this.equippedMeshes[slot] = item.model;
            this.attachmentPoints[slot].add(item.model);
        }

        // Initialize item if needed
        if (item.initModel && item.model) {
            item.initModel(item.model);
        }

        // Update total stats
        this.updateStats();

        return true;
    }

    // Unequip item from a slot
    unequip(slot) {
        if (!this.isValidSlot(slot) || !this.slots[slot]) {
            return false;
        }

        // Remove model from attachment point if it exists
        if (this.equippedMeshes[slot] && this.attachmentPoints[slot]) {
            this.attachmentPoints[slot].remove(this.equippedMeshes[slot]);
            this.equippedMeshes[slot] = null;
        }

        // Clear slot
        this.slots[slot] = null;

        // Update total stats
        this.updateStats();

        return true;
    }

    // Check if slot is valid
    isValidSlot(slot) {
        return slot in this.slots;
    }

    // Check if item can be equipped to slot
    canEquipToSlot(item, slot) {
        if (!item || !item.equipSlot) return false;

        // Check if item's equipSlot matches the target slot
        switch (slot) {
            case 'mainHand':
                return item.equipSlot === 'MAINHAND';
            case 'offHand':
                return item.equipSlot === 'OFFHAND' || 
                       (item.equipSlot === 'MAINHAND' && !item.twoHanded); // Allow one-handed weapons in off-hand
            default:
                return false;
        }
    }

    // Get item in specific slot
    getEquippedItem(slot) {
        return this.isValidSlot(slot) ? this.slots[slot] : null;
    }

    // Update total stats from all equipped items
    updateStats() {
        // Reset total stats
        Object.keys(this.totalStats).forEach(stat => {
            this.totalStats[stat] = 0;
        });

        // Sum up stats from all equipped items
        Object.values(this.slots).forEach(item => {
            if (item && item.stats) {
                Object.keys(this.totalStats).forEach(stat => {
                    if (item.stats[stat]) {
                        this.totalStats[stat] += item.stats[stat];
                    }
                });
            }
        });
    }

    // Get total stats from equipped items
    getTotalStats() {
        return { ...this.totalStats };
    }

    // Handle attack input for equipped weapons
    onAttack(button = 'left') {
        const slot = button === 'left' ? 'mainHand' : 'offHand';
        const weapon = this.slots[slot];
        
        if (weapon && weapon.onAttack) {
            weapon.onAttack();
        }
    }

    // Update equipped items (for animations, etc.)
    update(deltaTime) {
        Object.values(this.slots).forEach(item => {
            if (item && item.update) {
                item.update(deltaTime);
            }
        });
    }
} 