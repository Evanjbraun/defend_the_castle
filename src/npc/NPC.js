import * as THREE from 'three';
import { CharacterInventory } from '../inventory/CharacterInventory.js';
import { Equipment } from '../equipment/Equipment.js';

/**
 * Basic NPC class that utilizes our inventory and equipment systems
 */
export class NPC extends THREE.EventDispatcher {
    /**
     * Create a new NPC
     * @param {Object} config - NPC configuration
     */
    constructor(config = {}) {
        super();
        
        // Basic properties
        this.id = config.id || `npc_${Date.now()}`;
        this.name = config.name || 'Unnamed NPC';
        this.type = config.type || 'generic';
        this.level = config.level || 1;
        
        // Visual representation
        this.mesh = null;
        this.model = config.model || null;
        this.scale = config.scale || 1.0;
        
        // Position
        this.position = config.position || { x: 0, y: 0, z: 0 };
        this.rotation = config.rotation || { x: 0, y: 0, z: 0 };
        
        // Equipment system
        this.equipment = new Equipment({
            owner: this,
            onItemEquipped: this._onItemEquipped.bind(this),
            onItemUnequipped: this._onItemUnequipped.bind(this)
        });
        
        // Inventory system
        this.inventory = new CharacterInventory({
            owner: this,
            maxSlots: config.inventorySize || 20,
            isGridBased: config.isGridInventory || false
        });
        
        // Connect inventory and equipment
        this.inventory.connectEquipment(this.equipment);
        
        // State
        this.state = config.state || 'idle';
        this.behaviors = config.behaviors || [];
        this.interactable = config.interactable !== false;
        this.dialogues = config.dialogues || [];
        
        // Initialize
        this._initialize(config);
    }
    
    /**
     * Initialize the NPC
     * @param {Object} config - Configuration options
     * @private
     */
    _initialize(config) {
        // Create visual representation
        this._createVisuals(config);
        
        // Initialize with equipment if provided
        if (config.equipment) {
            this._equipInitialItems(config.equipment);
        }
        
        // Initialize with inventory items if provided
        if (config.inventory) {
            this._addInitialItems(config.inventory);
        }
    }
    
    /**
     * Create visual representation of the NPC
     * @param {Object} config - Configuration options
     * @private
     */
    _createVisuals(config) {
        // This could load a model from a file, but for simplicity
        // we'll create a basic shape
        if (!config.noMesh) {
            // Create a group to hold the NPC mesh and equipment
            this.mesh = new THREE.Group();
            
            // Basic humanoid shape
            const bodyGeometry = new THREE.CapsuleGeometry(0.5, 1.5, 4, 8);
            const bodyMaterial = new THREE.MeshStandardMaterial({ 
                color: config.color || 0x6688aa
            });
            
            const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
            body.position.y = 1.0; // Stand on the ground
            
            // Add to group
            this.mesh.add(body);
            
            // Position the mesh
            this.mesh.position.set(
                this.position.x,
                this.position.y,
                this.position.z
            );
            
            this.mesh.rotation.set(
                this.rotation.x,
                this.rotation.y,
                this.rotation.z
            );
            
            this.mesh.scale.set(this.scale, this.scale, this.scale);
            
            // Add attachment points for equipment
            this._createAttachmentPoints();
        }
    }
    
    /**
     * Create attachment points for equipment
     * @private
     */
    _createAttachmentPoints() {
        if (!this.mesh) return;
        
        // Create empty objects for equipment attachment
        const attachmentPoints = {
            RIGHT_HAND: new THREE.Group(),
            LEFT_HAND: new THREE.Group(),
            HEAD: new THREE.Group(),
            CHEST: new THREE.Group(),
            LEGS: new THREE.Group(),
            FEET: new THREE.Group(),
            BACK: new THREE.Group(),
            NECK: new THREE.Group(),
            FINGER_L: new THREE.Group(),
            FINGER_R: new THREE.Group(),
            WRIST: new THREE.Group()
        };
        
        // Position attachment points
        attachmentPoints.RIGHT_HAND.position.set(0.6, 1.2, 0);
        attachmentPoints.LEFT_HAND.position.set(-0.6, 1.2, 0);
        attachmentPoints.HEAD.position.set(0, 2.1, 0);
        attachmentPoints.CHEST.position.set(0, 1.5, 0.1);
        attachmentPoints.LEGS.position.set(0, 0.8, 0);
        attachmentPoints.FEET.position.set(0, 0.1, 0);
        attachmentPoints.BACK.position.set(0, 1.5, -0.3);
        attachmentPoints.NECK.position.set(0, 1.8, 0);
        attachmentPoints.FINGER_L.position.set(-0.6, 1.2, 0.1);
        attachmentPoints.FINGER_R.position.set(0.6, 1.2, 0.1);
        attachmentPoints.WRIST.position.set(0, 1.2, 0.15);
        
        // Add attachment points to the mesh
        Object.entries(attachmentPoints).forEach(([key, point]) => {
            this.mesh.add(point);
            point.name = key;
        });
        
        this.attachmentPoints = attachmentPoints;
    }
    
    /**
     * Add to scene
     * @param {THREE.Scene} scene - The scene to add to
     */
    addToScene(scene) {
        if (this.mesh && scene) {
            scene.add(this.mesh);
        }
    }
    
    /**
     * Remove from scene
     * @param {THREE.Scene} scene - The scene to remove from
     */
    removeFromScene(scene) {
        if (this.mesh && scene) {
            scene.remove(this.mesh);
        }
    }
    
    /**
     * Handle item equipped event
     * @param {Object} event - Event object
     * @private
     */
    _onItemEquipped(event) {
        const { slot, item } = event;
        
        // Update visual if we have mesh and attachment points
        if (this.mesh && this.attachmentPoints) {
            // Get the attachment point for this slot
            const attachPoint = this.attachmentPoints[slot.slotType];
            
            if (attachPoint && item.model) {
                // This would be a method to create/load the item's visual model
                // For simplicity, we'll create a basic shape
                const itemMesh = this._createItemMesh(item);
                
                if (itemMesh) {
                    // Clear any existing item
                    while (attachPoint.children.length > 0) {
                        attachPoint.remove(attachPoint.children[0]);
                    }
                    
                    // Add the new item
                    attachPoint.add(itemMesh);
                }
            }
        }
    }
    
    /**
     * Handle item unequipped event
     * @param {Object} event - Event object
     * @private
     */
    _onItemUnequipped(event) {
        const { slot } = event;
        
        // Remove visual if we have mesh and attachment points
        if (this.mesh && this.attachmentPoints) {
            // Get the attachment point for this slot
            const attachPoint = this.attachmentPoints[slot.slotType];
            
            if (attachPoint) {
                // Remove all children
                while (attachPoint.children.length > 0) {
                    attachPoint.remove(attachPoint.children[0]);
                }
            }
        }
    }
    
    /**
     * Create a mesh for an item
     * @param {ItemSchema} item - The item
     * @returns {THREE.Object3D} The created mesh
     * @private
     */
    _createItemMesh(item) {
        // This would typically load a model from a file
        // For simplicity, we'll create basic shapes
        
        let geometry, material, mesh;
        
        switch (item.type) {
            case 'WEAPON':
                if (item.subType === 'SWORD') {
                    // Create a simple sword
                    const swordGroup = new THREE.Group();
                    
                    // Blade
                    geometry = new THREE.BoxGeometry(0.1, 1.0, 0.02);
                    material = new THREE.MeshStandardMaterial({ 
                        color: 0xcccccc,
                        metalness: 0.7,
                        roughness: 0.3
                    });
                    mesh = new THREE.Mesh(geometry, material);
                    mesh.position.y = 0.5;
                    swordGroup.add(mesh);
                    
                    // Guard
                    geometry = new THREE.BoxGeometry(0.3, 0.08, 0.08);
                    material = new THREE.MeshStandardMaterial({ 
                        color: 0x8c7853,
                        metalness: 0.5,
                        roughness: 0.6
                    });
                    mesh = new THREE.Mesh(geometry, material);
                    mesh.position.y = 0.05;
                    swordGroup.add(mesh);
                    
                    // Handle
                    geometry = new THREE.CylinderGeometry(0.03, 0.03, 0.3, 8);
                    material = new THREE.MeshStandardMaterial({ 
                        color: 0x4c3a24,
                        metalness: 0.1,
                        roughness: 0.8
                    });
                    mesh = new THREE.Mesh(geometry, material);
                    mesh.position.y = -0.15;
                    swordGroup.add(mesh);
                    
                    // Apply any custom color
                    if (item.color) {
                        swordGroup.children[0].material.color.set(item.color);
                    }
                    
                    return swordGroup;
                }
                break;
                
            case 'ARMOR':
                // Basic armor representation
                geometry = new THREE.BoxGeometry(0.6, 0.8, 0.2);
                material = new THREE.MeshStandardMaterial({ 
                    color: item.color || 0x8c8c8c,
                    metalness: 0.5,
                    roughness: 0.5
                });
                return new THREE.Mesh(geometry, material);
                
            case 'ACCESSORY':
                // Basic accessory representation
                geometry = new THREE.SphereGeometry(0.1, 8, 8);
                material = new THREE.MeshStandardMaterial({ 
                    color: item.color || 0xffcc00,
                    metalness: 0.8,
                    roughness: 0.2,
                    emissive: item.glowColor || 0x000000,
                    emissiveIntensity: 0.5
                });
                return new THREE.Mesh(geometry, material);
                
            default:
                // Generic item representation
                geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
                material = new THREE.MeshStandardMaterial({ 
                    color: item.color || 0xaaaaaa
                });
                return new THREE.Mesh(geometry, material);
        }
        
        // Fallback to simple cube
        geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
        material = new THREE.MeshStandardMaterial({ 
            color: 0xaaaaaa
        });
        return new THREE.Mesh(geometry, material);
    }
    
    /**
     * Equip initial items from configuration
     * @param {Object} equipmentConfig - Equipment configuration
     * @private
     */
    _equipInitialItems(equipmentConfig) {
        if (!equipmentConfig || !this.equipment) return;
        
        Object.entries(equipmentConfig).forEach(([slotType, itemId]) => {
            if (itemId) {
                // This assumes we have access to ItemFactory through some global or passed in
                // In a real implementation, you would inject the ItemFactory
                if (window.itemFactory) {
                    const item = window.itemFactory.createItem(itemId);
                    if (item) {
                        const slot = this.equipment.getSlot(slotType);
                        if (slot) {
                            slot.setItem(item);
                        }
                    }
                }
            }
        });
    }
    
    /**
     * Add initial items to inventory
     * @param {Array} items - Array of items to add
     * @private
     */
    _addInitialItems(items) {
        if (!Array.isArray(items) || !this.inventory) return;
        
        items.forEach(itemConfig => {
            if (itemConfig.id) {
                // This assumes we have access to ItemFactory through some global or passed in
                if (window.itemFactory) {
                    const item = window.itemFactory.createItem(itemConfig.id, {
                        quantity: itemConfig.quantity || 1
                    });
                    
                    if (item) {
                        this.inventory.addItem(item, item.quantity);
                    }
                }
            }
        });
    }
    
    /**
     * Update NPC
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
        // Update equipment visualizations if needed
        if (this.equipment) {
            this.equipment.update(deltaTime);
        }
        
        // Update inventory
        if (this.inventory) {
            this.inventory.update(deltaTime);
        }
        
        // Update behaviors
        this._updateBehaviors(deltaTime);
    }
    
    /**
     * Update NPC behaviors
     * @param {number} deltaTime - Time since last update in seconds
     * @private
     */
    _updateBehaviors(deltaTime) {
        // Process active behaviors
        this.behaviors.forEach(behavior => {
            if (behavior.isActive && typeof behavior.update === 'function') {
                behavior.update(this, deltaTime);
            }
        });
    }
    
    /**
     * Interact with the NPC
     * @param {Object} player - The player interacting with the NPC
     * @returns {Object} Interaction result
     */
    interact(player) {
        if (!this.interactable) {
            return { 
                success: false, 
                message: `${this.name} cannot be interacted with.` 
            };
        }
        
        this.dispatchEvent({
            type: 'interaction',
            player,
            npc: this
        });
        
        return {
            success: true,
            message: `Interacting with ${this.name}`,
            dialogues: this.dialogues
        };
    }
    
    /**
     * Set NPC state
     * @param {string} newState - The new state
     */
    setState(newState) {
        const oldState = this.state;
        this.state = newState;
        
        this.dispatchEvent({
            type: 'state_changed',
            oldState,
            newState
        });
    }
    
    /**
     * Equip an item in a specific slot
     * @param {string} itemId - ID of the item to equip
     * @param {string} slotType - Type of slot to equip in
     * @returns {boolean} Success of the operation
     */
    equipItem(itemId, slotType) {
        if (!this.equipment) return false;
        
        // Get item from inventory or create it
        let item;
        
        if (this.inventory) {
            item = this.inventory.getAllItems().find(i => i.id === itemId);
        }
        
        if (!item && window.itemFactory) {
            item = window.itemFactory.createItem(itemId);
        }
        
        if (!item) return false;
        
        // Equip item
        const slot = this.equipment.getSlot(slotType);
        if (slot) {
            return slot.setItem(item);
        }
        
        return false;
    }
    
    /**
     * Unequip an item from a specific slot
     * @param {string} slotType - Type of slot to unequip
     * @returns {boolean} Success of the operation
     */
    unequipItem(slotType) {
        if (!this.equipment) return false;
        
        const slot = this.equipment.getSlot(slotType);
        if (slot && slot.hasItem()) {
            slot.clearItem();
            return true;
        }
        
        return false;
    }
    
    /**
     * Get all equipped items
     * @returns {Array} Array of equipped items
     */
    getEquippedItems() {
        if (!this.equipment) return [];
        
        return this.equipment.getAllEquippedItems();
    }
    
    /**
     * Get all inventory items
     * @returns {Array} Array of inventory items
     */
    getInventoryItems() {
        if (!this.inventory) return [];
        
        return this.inventory.getAllItems();
    }
    
    /**
     * Convert to JSON for saving
     * @returns {Object} JSON representation
     */
    toJSON() {
        const json = {
            id: this.id,
            name: this.name,
            type: this.type,
            level: this.level,
            position: { ...this.position },
            rotation: { ...this.rotation },
            scale: this.scale,
            state: this.state,
            interactable: this.interactable
        };
        
        // Include equipment
        if (this.equipment) {
            json.equipment = this.equipment.toJSON();
        }
        
        // Include inventory
        if (this.inventory) {
            json.inventory = this.inventory.toJSON();
        }
        
        return json;
    }
    
    /**
     * Clean up resources
     */
    destroy() {
        // Clean up equipment
        if (this.equipment) {
            this.equipment.destroy();
        }
        
        // Clean up inventory
        if (this.inventory) {
            this.inventory.destroy();
        }
        
        // Clean up mesh
        if (this.mesh) {
            // Remove from parent if attached
            if (this.mesh.parent) {
                this.mesh.parent.remove(this.mesh);
            }
            
            // Dispose geometries and materials
            this.mesh.traverse(child => {
                if (child.geometry) {
                    child.geometry.dispose();
                }
                
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(material => material.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
        }
    }
} 