import * as THREE from 'three';

/**
 * Utility class for common NPC functionalities
 */
export class NPCUtility {
    /**
     * Create attachment points for equipment
     * @param {THREE.Group} group - The NPC's mesh group
     * @param {Object} config - Configuration for attachment points
     * @param {Object} config.positions - Custom positions for attachment points
     * @param {Object} config.scale - Scale factor for the NPC (default: 1)
     * @returns {Object} The attachment points object
     */
    static createAttachmentPoints(group, config = {}) {
        console.log('=== NPCUtility: Creating Attachment Points ===');
        
        const scale = config.scale || 1;
        const positions = config.positions || {
            RIGHT_HAND: { x: 0.6, y: 1.2, z: 0 },
            LEFT_HAND: { x: -0.6, y: 1.2, z: 0 },
            HEAD: { x: 0, y: 2.1, z: 0 },
            CHEST: { x: 0, y: 1.5, z: 0.1 },
            LEGS: { x: 0, y: 0.8, z: 0 },
            FEET: { x: 0, y: 0.1, z: 0 }
        };

        // Create empty objects for equipment attachment
        const attachmentPoints = {
            RIGHT_HAND: new THREE.Group(),
            LEFT_HAND: new THREE.Group(),
            HEAD: new THREE.Group(),
            CHEST: new THREE.Group(),
            LEGS: new THREE.Group(),
            FEET: new THREE.Group()
        };
        
        // Position attachment points
        Object.entries(positions).forEach(([key, pos]) => {
            attachmentPoints[key].position.set(
                pos.x * scale,
                pos.y * scale,
                pos.z * scale
            );
        });
        
        // Add attachment points to the group
        Object.entries(attachmentPoints).forEach(([key, point]) => {
            group.add(point);
            point.name = key;
            console.log('NPCUtility: Added attachment point:', key);
        });
        
        console.log('NPCUtility: All attachment points created:', Object.keys(attachmentPoints));
        console.log('=== NPCUtility: Attachment Points Creation Complete ===');
        
        return attachmentPoints;
    }

    /**
     * Handle item equipped event
     * @param {Object} event - Event object
     * @param {Object} npc - The NPC instance
     * @private
     */
    static handleItemEquipped(event, npc) {
        const { slot, item } = event;
        
        // Update visual if we have mesh and attachment points
        if (npc.mesh && npc.attachmentPoints) {
            // Get the attachment point for this slot
            const attachPoint = npc.attachmentPoints[slot.slotType];
            
            if (attachPoint && item.model) {
                // Clone the item's model
                const itemModel = item.model.clone();
                
                if (itemModel) {
                    // Clear any existing item
                    while (attachPoint.children.length > 0) {
                        attachPoint.remove(attachPoint.children[0]);
                    }
                    
                    // Default transformations for different slots
                    const defaultTransformations = {
                        RIGHT_HAND: {
                            position: { x: 0, y: 0, z: 0 },
                            rotation: { x: 0, y: 1, z: -Math.PI / 2 },
                            scale: { x: 0.5, y: 0.5, z: 0.5 }
                        },
                        LEFT_HAND: {
                            position: { x: 0, y: 0, z: 0 },
                            rotation: { x: 0, y: 0, z: Math.PI / 2 },
                            scale: { x: 0.5, y: 0.5, z: 0.5 }
                        }
                    };

                    // Use custom transformations if provided by NPC, otherwise use defaults
                    const transformations = npc.itemTransformations?.[slot.slotType] || defaultTransformations[slot.slotType];
                    
                    if (transformations) {
                        // Apply position
                        itemModel.position.set(
                            transformations.position.x,
                            transformations.position.y,
                            transformations.position.z
                        );
                        
                        // Apply rotation
                        itemModel.rotation.set(
                            transformations.rotation.x,
                            transformations.rotation.y,
                            transformations.rotation.z
                        );
                        
                        // Apply scale
                        itemModel.scale.set(
                            transformations.scale.x,
                            transformations.scale.y,
                            transformations.scale.z
                        );
                    }
                    
                    // Add the new item
                    attachPoint.add(itemModel);
                }
            }
        }
    }

    /**
     * Handle item unequipped event
     * @param {Object} event - Event object
     * @param {Object} npc - The NPC instance
     * @private
     */
    static handleItemUnequipped(event, npc) {
        const { slot } = event;
        if (npc.attachmentPoints && npc.attachmentPoints[slot.slotType]) {
            const attachPoint = npc.attachmentPoints[slot.slotType];
            while (attachPoint.children.length > 0) {
                attachPoint.remove(attachPoint.children[0]);
            }
        }
    }
} 