import * as THREE from 'three';

/**
 * Represents a single slot in an inventory that can hold an item
 */
export class InventorySlot extends THREE.EventDispatcher {
    /**
     * Create a new inventory slot
     * @param {Object} config - Slot configuration
     */
    constructor(config = {}) {
        super();
        
        this.id = config.id || `slot_${Math.floor(Math.random() * 100000)}`;
        this.index = config.index !== undefined ? config.index : -1;
        this.type = config.type || 'GENERIC'; // GENERIC, WEAPON, ARMOR, etc.
        this.x = config.x !== undefined ? config.x : 0;
        this.y = config.y !== undefined ? config.y : 0;
        this.width = config.width || 1;
        this.height = config.height || 1;
        
        // The inventory this slot belongs to
        this.inventory = config.inventory || null;
        
        // Item storage
        this.item = null;
        this.quantity = 0;
        this.maxQuantity = config.maxQuantity || 99;
        
        // Special properties
        this.locked = config.locked || false;
        this.hidden = config.hidden || false;
        this.acceptsOnly = config.acceptsOnly || []; // Item types this slot can accept
        this.rejectsTypes = config.rejectsTypes || []; // Item types this slot cannot accept
        
        // Visual properties for UI rendering
        this.highlighted = false;
        this.selected = false;
        
        // For equipment slots, optional reference to the bone it attaches to
        this.attachmentBone = config.attachmentBone || null;
        this.attachmentOffset = config.attachmentOffset || { x: 0, y: 0, z: 0 };
        this.attachmentRotation = config.attachmentRotation || { x: 0, y: 0, z: 0 };
    }
    
    /**
     * Initialize the slot
     */
    init() {
        // Setup any event listeners or additional initialization
        // This is called after the slot is added to an inventory
        
        if (this.inventory) {
            console.debug(`Slot ${this.id} initialized in inventory ${this.inventory.id}`);
        }
    }
    
    /**
     * Check if the slot can accept a given item
     * @param {Object} item - The item to check
     * @returns {boolean} Whether the item can be accepted
     */
    canAccept(item) {
        if (!item) {
            return false;
        }
        
        // Check if slot is locked
        if (this.locked) {
            return false;
        }
        
        // If slot is typed and doesn't accept this item type
        if (this.acceptsOnly.length > 0 && !this.acceptsOnly.includes(item.type)) {
            return false;
        }
        
        // If slot rejects this item type
        if (this.rejectsTypes.includes(item.type)) {
            return false;
        }
        
        // For equipment slots, make sure it's the right equipment type
        if (this.type !== 'GENERIC' && this.type !== item.equipSlot) {
            return false;
        }
        
        // For two-handed weapons in weapon slots
        if (this.type === 'MAINHAND' && item.isTwoHanded) {
            // Make sure offhand is empty in the inventory
            if (this.inventory) {
                const offhandSlot = this.inventory.getSlotByType('OFFHAND');
                if (offhandSlot && offhandSlot.item) {
                    return false;
                }
            }
        }
        
        // For offhand items when a two-handed weapon is equipped
        if (this.type === 'OFFHAND') {
            if (this.inventory) {
                const mainhandSlot = this.inventory.getSlotByType('MAINHAND');
                if (mainhandSlot && mainhandSlot.item && mainhandSlot.item.isTwoHanded) {
                    return false;
                }
            }
        }
        
        return true;
    }
    
    /**
     * Set an item in this slot
     * @param {Object} item - The item to set
     * @param {number} quantity - Quantity of the item
     * @returns {boolean} Whether the item was set successfully
     */
    setItem(item, quantity = 1) {
        if (!this.canAccept(item)) {
            console.warn(`Slot ${this.id} cannot accept item ${item ? item.name : 'null'}`);
            return false;
        }
        
        this.item = item;
        this.quantity = Math.min(quantity, item ? (item.maxStackSize || 1) : 1);
        
        // Dispatch an event
        this.dispatchEvent({
            type: 'item_changed',
            slot: this
        });
        
        return true;
    }
    
    /**
     * Clear this slot (remove the item)
     * @returns {Object} The removed item and quantity
     */
    clearItem() {
        if (!this.item) {
            return { item: null, quantity: 0 };
        }
        
        if (this.locked) {
            console.warn(`Cannot clear locked slot ${this.id}`);
            return { item: null, quantity: 0 };
        }
        
        const removedItem = this.item;
        const removedQuantity = this.quantity;
        
        this.item = null;
        this.quantity = 0;
        
        // Dispatch an event
        this.dispatchEvent({
            type: 'item_changed',
            slot: this
        });
        
        return { item: removedItem, quantity: removedQuantity };
    }
    
    /**
     * Add quantity to the current item
     * @param {number} amount - Amount to add
     * @returns {number} Amount that couldn't be added
     */
    addQuantity(amount) {
        if (!this.item || amount <= 0) {
            return amount;
        }
        
        const maxStack = this.item.maxStackSize || 1;
        const canAdd = Math.min(amount, maxStack - this.quantity);
        
        if (canAdd <= 0) {
            return amount;
        }
        
        this.quantity += canAdd;
        
        // Dispatch an event
        this.dispatchEvent({
            type: 'item_changed',
            slot: this
        });
        
        return amount - canAdd;
    }
    
    /**
     * Remove quantity from the current item
     * @param {number} amount - Amount to remove
     * @returns {number} Amount actually removed
     */
    removeQuantity(amount) {
        if (!this.item || amount <= 0) {
            return 0;
        }
        
        const amountToRemove = Math.min(amount, this.quantity);
        this.quantity -= amountToRemove;
        
        // If quantity is now 0, remove the item
        if (this.quantity <= 0) {
            this.item = null;
            this.quantity = 0;
        }
        
        // Dispatch an event
        this.dispatchEvent({
            type: 'item_changed',
            slot: this
        });
        
        return amountToRemove;
    }
    
    /**
     * Check if this slot is empty
     * @returns {boolean} Whether the slot is empty
     */
    isEmpty() {
        return this.item === null || this.quantity <= 0;
    }
    
    /**
     * Check if this slot is full (at max stack)
     * @returns {boolean} Whether the slot is full
     */
    isFull() {
        if (!this.item) {
            return false;
        }
        
        const maxStack = this.item.maxStackSize || 1;
        return this.quantity >= maxStack;
    }
    
    /**
     * Check how many more of this item can be added
     * @returns {number} Space remaining
     */
    getRemainingSpace() {
        if (!this.item) {
            return 0; // Empty slots are handled by inventory, not by the slot
        }
        
        const maxStack = this.item.maxStackSize || 1;
        return maxStack - this.quantity;
    }
    
    /**
     * Transfer all or part of this slot's contents to another slot
     * @param {InventorySlot} targetSlot - The slot to transfer to
     * @param {number} amount - Amount to transfer (or all if not specified)
     * @returns {boolean} Whether the transfer was successful
     */
    transferTo(targetSlot, amount) {
        if (!this.item || !targetSlot || this.locked || targetSlot.locked) {
            return false;
        }
        
        // Default to all
        if (amount === undefined) {
            amount = this.quantity;
        }
        
        // Check if the target can accept this item
        if (!targetSlot.canAccept(this.item)) {
            return false;
        }
        
        // If target slot is empty, simply move the item
        if (targetSlot.isEmpty()) {
            targetSlot.setItem(this.item, amount);
            this.removeQuantity(amount);
            return true;
        }
        
        // If target slot has the same item, stack if possible
        if (targetSlot.item && this.item.canStackWith(targetSlot.item)) {
            const amountTransferred = amount - targetSlot.addQuantity(amount);
            if (amountTransferred > 0) {
                this.removeQuantity(amountTransferred);
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Swap contents with another slot
     * @param {InventorySlot} otherSlot - The slot to swap with
     * @returns {boolean} Whether the swap was successful
     */
    swapWith(otherSlot) {
        if (!otherSlot || this.locked || otherSlot.locked) {
            return false;
        }
        
        // Check if each slot accepts the other's item
        if (this.item && !otherSlot.canAccept(this.item)) {
            return false;
        }
        
        if (otherSlot.item && !this.canAccept(otherSlot.item)) {
            return false;
        }
        
        // Perform the swap
        const tempItem = this.item;
        const tempQuantity = this.quantity;
        
        this.item = otherSlot.item;
        this.quantity = otherSlot.quantity;
        
        otherSlot.item = tempItem;
        otherSlot.quantity = tempQuantity;
        
        // Dispatch events
        this.dispatchEvent({
            type: 'item_changed',
            slot: this
        });
        
        otherSlot.dispatchEvent({
            type: 'item_changed',
            slot: otherSlot
        });
        
        return true;
    }
    
    /**
     * Lock this slot to prevent modifications
     * @param {boolean} locked - Whether to lock or unlock
     */
    setLocked(locked) {
        this.locked = locked;
        
        this.dispatchEvent({
            type: 'slot_state_changed',
            slot: this
        });
    }
    
    /**
     * Set whether this slot is hidden
     * @param {boolean} hidden - Whether to hide or show
     */
    setHidden(hidden) {
        this.hidden = hidden;
        
        this.dispatchEvent({
            type: 'slot_state_changed',
            slot: this
        });
    }
    
    /**
     * Set slot highlight state
     * @param {boolean} highlighted - Whether to highlight
     */
    setHighlighted(highlighted) {
        this.highlighted = highlighted;
        
        this.dispatchEvent({
            type: 'slot_state_changed',
            slot: this
        });
    }
    
    /**
     * Set slot selection state
     * @param {boolean} selected - Whether to select
     */
    setSelected(selected) {
        this.selected = selected;
        
        this.dispatchEvent({
            type: 'slot_state_changed',
            slot: this
        });
    }
    
    /**
     * Get reference to the attached 3D model of the item in this slot
     * @returns {THREE.Object3D|null} The 3D model or null
     */
    getItemModel() {
        if (!this.item) {
            return null;
        }
        
        // Create/get item model
        return this.item.createModel();
    }
    
    /**
     * Get the slot position in grid coordinates
     * @returns {Object} The x, y coordinates
     */
    getPosition() {
        return { x: this.x, y: this.y };
    }
    
    /**
     * Set the slot position in grid coordinates
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }
    
    /**
     * Get attachment data for equipment slots
     * @returns {Object} Attachment data including bone, offset and rotation
     */
    getAttachmentData() {
        return {
            bone: this.attachmentBone,
            offset: { ...this.attachmentOffset },
            rotation: { ...this.attachmentRotation }
        };
    }
    
    /**
     * Set attachment data for equipment slots
     * @param {Object} data - Attachment data
     */
    setAttachmentData(data) {
        if (data.bone) this.attachmentBone = data.bone;
        if (data.offset) this.attachmentOffset = { ...data.offset };
        if (data.rotation) this.attachmentRotation = { ...data.rotation };
    }
    
    /**
     * Clone this slot (without item)
     * @returns {InventorySlot} A new slot with the same properties
     */
    clone() {
        return new InventorySlot({
            id: `${this.id}_clone`,
            index: this.index,
            type: this.type,
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
            maxQuantity: this.maxQuantity,
            locked: this.locked,
            hidden: this.hidden,
            acceptsOnly: [...this.acceptsOnly],
            rejectsTypes: [...this.rejectsTypes],
            attachmentBone: this.attachmentBone,
            attachmentOffset: { ...this.attachmentOffset },
            attachmentRotation: { ...this.attachmentRotation }
        });
    }
    
    /**
     * Get string representation of this slot
     * @returns {string} String representation
     */
    toString() {
        if (this.item) {
            return `${this.id}: ${this.item.name} x${this.quantity}`;
        }
        return `${this.id}: Empty`;
    }
}