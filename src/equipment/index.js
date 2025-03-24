// Core equipment classes
export { Equipment } from './Equipment.js';
export { EquipmentManager } from './EquipmentManager.js';

// Slot classes
export { EquipmentSlot } from './slots/EquipmentSlot.js';
export { WeaponSlot } from './slots/WeaponSlot.js';
export { ArmorSlot } from './slots/ArmorSlot.js';
export { AccessorySlot } from './slots/AccessorySlot.js';
export { SlotFactory } from './slots/SlotFactory.js';

/**
 * Equipment system for Defend the Castle
 * 
 * This module provides equipment management functionality:
 * - Equipment slots for different item types
 * - Equipment attachment to 3D models
 * - Set bonus tracking and application
 * - Item requirements checking
 * - Durability management
 * 
 * Usage example:
 * 
 * ```js
 * import { EquipmentManager } from './equipment';
 * 
 * // Create an equipment manager
 * const equipmentManager = new EquipmentManager({
 *   debug: true,
 *   itemDatabase: myItemDatabase
 * });
 * 
 * // Create an equipment system for the player
 * const playerEquipment = equipmentManager.createEquipment('player', {
 *   isPlayerEquipment: true
 * });
 * 
 * // Connect to the player
 * playerEquipment.setOwner(player);
 * 
 * // Equip an item
 * playerEquipment.equip(woodenSword, 'mainHand');
 * ```
 */ 