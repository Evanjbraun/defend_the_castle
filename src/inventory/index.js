// Core inventory classes
export { Inventory } from './Inventory.js';
export { InventoryManager } from './InventoryManager.js';
export { InventorySlot } from './InventorySlot.js';
export { InventoryGrid } from './InventoryGrid.js';

/**
 * Inventory system for Defend the Castle
 * 
 * This module provides inventory management functionality:
 * - Item stacking and organization
 * - Weight and capacity limits
 * - Grid-based inventory layouts
 * - Transfer between inventories
 * - Loot generation
 * 
 * Usage example:
 * 
 * ```js
 * import { InventoryManager } from './inventory';
 * 
 * // Create an inventory manager
 * const inventoryManager = new InventoryManager({
 *   debug: true,
 *   itemDatabase: myItemDatabase
 * });
 * 
 * // Create an inventory for the player
 * const playerInventory = inventoryManager.createInventory('player', {
 *   maxSlots: 20,
 *   maxWeight: 100
 * });
 * 
 * // Add an item to the inventory
 * playerInventory.addItem(woodenSword, 1);
 * ```
 */