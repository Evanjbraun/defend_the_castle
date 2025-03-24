import * as THREE from 'three';
import { InventorySlot } from './InventorySlot.js';

/**
 * Manages a grid-based inventory layout
 * Allows for multi-cell items and grid operations
 */
export class InventoryGrid extends THREE.EventDispatcher {
    /**
     * Create a new inventory grid
     * @param {Object} config - Grid configuration
     */
    constructor(config = {}) {
        super();
        
        this.id = config.id || `grid_${Math.floor(Math.random() * 100000)}`;
        this.width = config.width || 10;
        this.height = config.height || 6;
        this.cellSize = config.cellSize || 32;
        this.padding = config.padding || 2;
        
        // Grid data
        this.slots = [];
        this.grid = []; // 2D array of slot references
        
        // Owner (inventory or UI container)
        this.owner = config.owner || null;
        
        // Initialize the grid
        this._initGrid();
    }
    
    /**
     * Initialize the grid structure
     * @private
     */
    _initGrid() {
        // Create empty 2D grid array
        this.grid = Array(this.height).fill(null).map(() => Array(this.width).fill(null));
        
        // Create slots for each cell
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const slot = new InventorySlot({
                    id: `${this.id}_slot_${x}_${y}`,
                    inventory: this.owner,
                    x: x,
                    y: y,
                    width: 1,
                    height: 1
                });
                
                this.slots.push(slot);
                this.grid[y][x] = slot;
            }
        }
        
        this.dispatchEvent({
            type: 'grid_initialized',
            grid: this
        });
    }
    
    /**
     * Get slot at specific grid coordinates
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {InventorySlot|null} The slot at those coordinates or null if out of bounds
     */
    getSlotAt(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return null;
        }
        
        return this.grid[y][x];
    }
    
    /**
     * Get all slots in the grid
     * @returns {Array<InventorySlot>} Array of all slots
     */
    getAllSlots() {
        return this.slots;
    }
    
    /**
     * Get slots occupied by an item (for multi-cell items)
     * @param {Object} item - The item to check
     * @returns {Array<InventorySlot>} Array of slots occupied by the item
     */
    getSlotsForItem(item) {
        if (!item) {
            return [];
        }
        
        return this.slots.filter(slot => slot.item === item);
    }
    
    /**
     * Get slots in a rectangular region
     * @param {number} x - Starting X coordinate
     * @param {number} y - Starting Y coordinate
     * @param {number} width - Width of region
     * @param {number} height - Height of region
     * @returns {Array<InventorySlot>} Array of slots in the region
     */
    getRegion(x, y, width, height) {
        const slots = [];
        
        for (let yPos = y; yPos < y + height; yPos++) {
            for (let xPos = x; xPos < x + width; xPos++) {
                const slot = this.getSlotAt(xPos, yPos);
                if (slot) {
                    slots.push(slot);
                }
            }
        }
        
        return slots;
    }
    
    /**
     * Check if a region in the grid is empty
     * @param {number} x - Starting X coordinate
     * @param {number} y - Starting Y coordinate
     * @param {number} width - Width of region
     * @param {number} height - Height of region
     * @returns {boolean} Whether the region is empty
     */
    isRegionEmpty(x, y, width, height) {
        // Check bounds
        if (x < 0 || y < 0 || x + width > this.width || y + height > this.height) {
            return false;
        }
        
        // Check if all slots in the region are empty
        for (let yPos = y; yPos < y + height; yPos++) {
            for (let xPos = x; xPos < x + width; xPos++) {
                const slot = this.getSlotAt(xPos, yPos);
                if (slot && !slot.isEmpty()) {
                    return false;
                }
            }
        }
        
        return true;
    }
    
    /**
     * Find the first empty slot
     * @returns {InventorySlot|null} The first empty slot or null if none found
     */
    findFirstEmptySlot() {
        return this.slots.find(slot => slot.isEmpty());
    }
    
    /**
     * Find the first empty region of a given size
     * @param {number} width - Width needed
     * @param {number} height - Height needed
     * @returns {Object|null} The top-left coordinates of the region or null if none found
     */
    findEmptyRegion(width, height) {
        // Optimize for common case of 1x1 items
        if (width === 1 && height === 1) {
            const slot = this.findFirstEmptySlot();
            return slot ? { x: slot.x, y: slot.y } : null;
        }
        
        // For larger items, scan the grid for an empty region
        for (let y = 0; y <= this.height - height; y++) {
            for (let x = 0; x <= this.width - width; x++) {
                if (this.isRegionEmpty(x, y, width, height)) {
                    return { x, y };
                }
            }
        }
        
        return null;
    }
    
    /**
     * Place an item at specific coordinates
     * @param {Object} item - The item to place
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} width - Width of the item
     * @param {number} height - Height of the item
     * @returns {boolean} Whether the placement was successful
     */
    placeItem(item, x, y, width = 1, height = 1) {
        if (!item) {
            return false;
        }
        
        // Check if the region is empty
        if (!this.isRegionEmpty(x, y, width, height)) {
            return false;
        }
        
        // Get the anchor slot (top-left)
        const anchorSlot = this.getSlotAt(x, y);
        if (!anchorSlot) {
            return false;
        }
        
        // Check if the anchor slot can accept this item
        if (!anchorSlot.canAccept(item)) {
            return false;
        }
        
        // Set the item in the anchor slot
        anchorSlot.setItem(item, 1);
        
        // For multi-cell items, mark other slots as occupied
        if (width > 1 || height > 1) {
            // TODO: Add support for multi-cell items
            // This would involve creating a special marker to indicate cells
            // that are part of a larger item
        }
        
        this.dispatchEvent({
            type: 'item_placed',
            item: item,
            x: x,
            y: y,
            width: width,
            height: height
        });
        
        return true;
    }
    
    /**
     * Remove an item from the grid
     * @param {Object} item - The item to remove
     * @returns {boolean} Whether the removal was successful
     */
    removeItem(item) {
        if (!item) {
            return false;
        }
        
        // Find all slots containing this item
        const slots = this.getSlotsForItem(item);
        if (slots.length === 0) {
            return false;
        }
        
        // Clear each slot
        slots.forEach(slot => slot.clearItem());
        
        this.dispatchEvent({
            type: 'item_removed',
            item: item
        });
        
        return true;
    }
    
    /**
     * Move an item to a new position in the grid
     * @param {Object} item - The item to move
     * @param {number} newX - New X coordinate
     * @param {number} newY - New Y coordinate
     * @returns {boolean} Whether the move was successful
     */
    moveItem(item, newX, newY) {
        if (!item) {
            return false;
        }
        
        // Find the current position of the item
        const slots = this.getSlotsForItem(item);
        if (slots.length === 0) {
            return false;
        }
        
        // For now, assume it's a 1x1 item
        const oldSlot = slots[0];
        const oldX = oldSlot.x;
        const oldY = oldSlot.y;
        
        // We can't move to the same position
        if (oldX === newX && oldY === newY) {
            return true; // Already there
        }
        
        // Check if the new position is valid
        const newSlot = this.getSlotAt(newX, newY);
        if (!newSlot || !newSlot.isEmpty() || !newSlot.canAccept(item)) {
            return false;
        }
        
        // Move the item
        const itemQuantity = oldSlot.quantity;
        oldSlot.clearItem();
        newSlot.setItem(item, itemQuantity);
        
        this.dispatchEvent({
            type: 'item_moved',
            item: item,
            fromX: oldX,
            fromY: oldY,
            toX: newX,
            toY: newY
        });
        
        return true;
    }
    
    /**
     * Find the position of an item in the grid
     * @param {Object} item - The item to find
     * @returns {Object|null} The coordinates of the item or null if not found
     */
    findItemPosition(item) {
        if (!item) {
            return null;
        }
        
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const slot = this.getSlotAt(x, y);
                if (slot && slot.item === item) {
                    return { x, y };
                }
            }
        }
        
        return null;
    }
    
    /**
     * Check if the grid contains a specific item
     * @param {Object} item - The item to check for
     * @returns {boolean} Whether the grid contains the item
     */
    containsItem(item) {
        return this.findItemPosition(item) !== null;
    }
    
    /**
     * Clear all items from the grid
     */
    clear() {
        this.slots.forEach(slot => slot.clearItem());
        
        this.dispatchEvent({
            type: 'grid_cleared',
            grid: this
        });
    }
    
    /**
     * Get the world coordinates of a grid position
     * @param {number} x - Grid X coordinate
     * @param {number} y - Grid Y coordinate
     * @returns {Object} World coordinates {x, y}
     */
    gridToWorld(x, y) {
        return {
            x: x * (this.cellSize + this.padding),
            y: y * (this.cellSize + this.padding)
        };
    }
    
    /**
     * Convert world coordinates to grid coordinates
     * @param {number} worldX - World X coordinate
     * @param {number} worldY - World Y coordinate
     * @returns {Object} Grid coordinates {x, y}
     */
    worldToGrid(worldX, worldY) {
        const x = Math.floor(worldX / (this.cellSize + this.padding));
        const y = Math.floor(worldY / (this.cellSize + this.padding));
        
        // Check bounds
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return null;
        }
        
        return { x, y };
    }
    
    /**
     * Get all non-empty slots in the grid
     * @returns {Array<InventorySlot>} Array of non-empty slots
     */
    getOccupiedSlots() {
        return this.slots.filter(slot => !slot.isEmpty());
    }
    
    /**
     * Get all empty slots in the grid
     * @returns {Array<InventorySlot>} Array of empty slots
     */
    getEmptySlots() {
        return this.slots.filter(slot => slot.isEmpty());
    }
    
    /**
     * Get the total number of empty slots
     * @returns {number} Number of empty slots
     */
    getEmptySlotsCount() {
        return this.getEmptySlots().length;
    }
    
    /**
     * Check if the grid is full
     * @returns {boolean} Whether the grid is full
     */
    isFull() {
        return this.getEmptySlotsCount() === 0;
    }
    
    /**
     * Get the total weight of all items in the grid
     * @returns {number} Total weight
     */
    getTotalWeight() {
        return this.getOccupiedSlots().reduce((total, slot) => {
            return total + (slot.item.weight * slot.quantity);
        }, 0);
    }
    
    /**
     * Attempt to place an item in the first available position
     * @param {Object} item - The item to place
     * @param {number} quantity - Quantity of the item
     * @returns {boolean} Whether the placement was successful
     */
    autoPlaceItem(item, quantity = 1) {
        if (!item) {
            return false;
        }
        
        // If item is stackable, try to stack with existing items
        if (item.stackable && quantity > 0) {
            // Find slots with the same item that aren't full
            const sameItemSlots = this.slots.filter(slot => 
                !slot.isEmpty() && 
                slot.item.canStackWith(item) && 
                !slot.isFull()
            );
            
            // Try to add to each slot
            let remainingQuantity = quantity;
            for (const slot of sameItemSlots) {
                const spaceLeft = slot.getRemainingSpace();
                if (spaceLeft > 0) {
                    const amountToAdd = Math.min(remainingQuantity, spaceLeft);
                    slot.addQuantity(amountToAdd);
                    remainingQuantity -= amountToAdd;
                    
                    if (remainingQuantity <= 0) {
                        return true; // All items placed
                    }
                }
            }
            
            // If we still have items to place, find empty slots
            if (remainingQuantity > 0) {
                const emptySlot = this.findFirstEmptySlot();
                if (emptySlot) {
                    emptySlot.setItem(item, remainingQuantity);
                    return true;
                }
            } else {
                return true; // All items were stacked
            }
        } else {
            // Non-stackable item, find empty slot
            const emptySlot = this.findFirstEmptySlot();
            if (emptySlot) {
                emptySlot.setItem(item, 1);
                return true;
            }
        }
        
        return false; // No space available
    }
    
    /**
     * Check if the grid can accept an item
     * @param {Object} item - The item to check
     * @param {number} quantity - Quantity of the item
     * @returns {boolean} Whether the item can be accepted
     */
    canAcceptItem(item, quantity = 1) {
        if (!item) {
            return false;
        }
        
        // If item is stackable, check if it can stack with existing items
        if (item.stackable && quantity > 0) {
            // Find slots with the same item that aren't full
            const sameItemSlots = this.slots.filter(slot => 
                !slot.isEmpty() && 
                slot.item.canStackWith(item) && 
                !slot.isFull()
            );
            
            // Calculate total available space in existing stacks
            let availableSpace = sameItemSlots.reduce((total, slot) => {
                return total + slot.getRemainingSpace();
            }, 0);
            
            // If we have enough space in existing stacks, we can accept the item
            if (availableSpace >= quantity) {
                return true;
            }
            
            // If not, we need quantity - availableSpace empty slots
            const neededEmptySlots = Math.ceil((quantity - availableSpace) / item.maxStackSize);
            return this.getEmptySlotsCount() >= neededEmptySlots;
        } else {
            // Non-stackable item, need one empty slot per item
            return this.getEmptySlotsCount() >= quantity;
        }
    }
    
    /**
     * Resize the grid
     * @param {number} newWidth - New width
     * @param {number} newHeight - New height
     * @returns {boolean} Whether the resize was successful
     */
    resize(newWidth, newHeight) {
        // Cannot resize to smaller than the items already placed
        const occupiedSlots = this.getOccupiedSlots();
        for (const slot of occupiedSlots) {
            if (slot.x >= newWidth || slot.y >= newHeight) {
                return false; // Can't resize, would lose items
            }
        }
        
        // Create new grid with new dimensions
        const oldWidth = this.width;
        const oldHeight = this.height;
        
        this.width = newWidth;
        this.height = newHeight;
        
        // Recreate the grid array
        const newGrid = Array(newHeight).fill(null).map(() => Array(newWidth).fill(null));
        
        // Copy existing slots
        for (let y = 0; y < Math.min(oldHeight, newHeight); y++) {
            for (let x = 0; x < Math.min(oldWidth, newWidth); x++) {
                newGrid[y][x] = this.grid[y][x];
            }
        }
        
        // Create new slots for new cells
        let newSlots = [...this.slots];
        
        // Add new slots for expanded areas
        for (let y = 0; y < newHeight; y++) {
            for (let x = 0; x < newWidth; x++) {
                if (x >= oldWidth || y >= oldHeight) {
                    const slot = new InventorySlot({
                        id: `${this.id}_slot_${x}_${y}`,
                        inventory: this.owner,
                        x: x,
                        y: y,
                        width: 1,
                        height: 1
                    });
                    
                    newSlots.push(slot);
                    newGrid[y][x] = slot;
                }
            }
        }
        
        // Remove slots that are beyond the new dimensions
        newSlots = newSlots.filter(slot => slot.x < newWidth && slot.y < newHeight);
        
        // Update grid and slots
        this.grid = newGrid;
        this.slots = newSlots;
        
        this.dispatchEvent({
            type: 'grid_resized',
            oldWidth: oldWidth,
            oldHeight: oldHeight,
            newWidth: newWidth,
            newHeight: newHeight
        });
        
        return true;
    }
    
    /**
     * Sort items in the grid
     * @param {Function} sortFn - Sort function (default sorts by item type, rarity, name)
     */
    sortItems(sortFn) {
        // Default sort function if none provided
        const defaultSortFn = (a, b) => {
            if (!a.item && !b.item) return 0;
            if (!a.item) return 1;
            if (!b.item) return -1;
            
            // Use the item's compareTo method if available
            if (typeof a.item.compareTo === 'function') {
                return a.item.compareTo(b.item);
            }
            
            // Default sort by type, then rarity, then name
            if (a.item.type !== b.item.type) {
                return a.item.type.localeCompare(b.item.type);
            }
            
            if (a.item.rarity !== b.item.rarity) {
                const rarityOrder = {
                    'LEGENDARY': 1,
                    'EPIC': 2,
                    'RARE': 3,
                    'UNCOMMON': 4,
                    'COMMON': 5
                };
                
                return (rarityOrder[a.item.rarity] || 99) - (rarityOrder[b.item.rarity] || 99);
            }
            
            return a.item.name.localeCompare(b.item.name);
        };
        
        // Get all items
        const occupiedSlots = this.getOccupiedSlots();
        
        // Sort slots based on their items
        const sortedSlots = [...occupiedSlots].sort(sortFn || defaultSortFn);
        
        // Extract items from sorted slots
        const sortedItems = sortedSlots.map(slot => ({
            item: slot.item,
            quantity: slot.quantity
        }));
        
        // Clear the grid
        this.clear();
        
        // Place items back in sorted order
        for (const { item, quantity } of sortedItems) {
            this.autoPlaceItem(item, quantity);
        }
        
        this.dispatchEvent({
            type: 'grid_sorted'
        });
    }
} 