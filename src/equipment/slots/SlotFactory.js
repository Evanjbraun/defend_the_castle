import { EquipmentSlot } from './EquipmentSlot.js';
import { WeaponSlot } from './WeaponSlot.js';
import { ArmorSlot } from './ArmorSlot.js';
import { AccessorySlot } from './AccessorySlot.js';

/**
 * Factory for creating equipment slots of different types
 */
export class SlotFactory {
    /**
     * Create a new slot of the specified type
     * @param {string} slotType - Type of slot to create
     * @param {Object} config - Configuration options
     * @returns {EquipmentSlot} The created equipment slot
     */
    static createSlot(slotType, config = {}) {
        switch (slotType) {
            case 'WEAPON':
                return new WeaponSlot(config);
            case 'ARMOR':
                return new ArmorSlot(config);
            case 'ACCESSORY':
                return new AccessorySlot(config);
            default:
                return new EquipmentSlot(config);
        }
    }
    
    /**
     * Create a main-hand weapon slot
     * @param {Object} config - Configuration options
     * @returns {WeaponSlot} The created weapon slot
     */
    static createMainHandSlot(config = {}) {
        return new WeaponSlot({
            ...config,
            id: 'mainHand',
            name: 'Main Hand',
            isMainHand: true
        });
    }
    
    /**
     * Create an off-hand weapon slot
     * @param {Object} config - Configuration options
     * @returns {WeaponSlot} The created weapon slot
     */
    static createOffHandSlot(config = {}) {
        return new WeaponSlot({
            ...config,
            id: 'offHand',
            name: 'Off Hand',
            isMainHand: false
        });
    }
    
    /**
     * Create a head armor slot
     * @param {Object} config - Configuration options
     * @returns {ArmorSlot} The created armor slot
     */
    static createHeadSlot(config = {}) {
        return new ArmorSlot({
            ...config,
            id: 'head',
            name: 'Head',
            bodyPart: 'HEAD'
        });
    }
    
    /**
     * Create a torso armor slot
     * @param {Object} config - Configuration options
     * @returns {ArmorSlot} The created armor slot
     */
    static createTorsoSlot(config = {}) {
        return new ArmorSlot({
            ...config,
            id: 'torso',
            name: 'Torso',
            bodyPart: 'TORSO'
        });
    }
    
    /**
     * Create legs armor slot
     * @param {Object} config - Configuration options
     * @returns {ArmorSlot} The created armor slot
     */
    static createLegsSlot(config = {}) {
        return new ArmorSlot({
            ...config,
            id: 'legs',
            name: 'Legs',
            bodyPart: 'LEGS'
        });
    }
    
    /**
     * Create feet armor slot
     * @param {Object} config - Configuration options
     * @returns {ArmorSlot} The created armor slot
     */
    static createFeetSlot(config = {}) {
        return new ArmorSlot({
            ...config,
            id: 'feet',
            name: 'Feet',
            bodyPart: 'FEET'
        });
    }
    
    /**
     * Create hands armor slot
     * @param {Object} config - Configuration options
     * @returns {ArmorSlot} The created armor slot
     */
    static createHandsSlot(config = {}) {
        return new ArmorSlot({
            ...config,
            id: 'hands',
            name: 'Hands',
            bodyPart: 'HANDS'
        });
    }
    
    /**
     * Create a back armor slot
     * @param {Object} config - Configuration options
     * @returns {ArmorSlot} The created armor slot
     */
    static createBackSlot(config = {}) {
        return new ArmorSlot({
            ...config,
            id: 'back',
            name: 'Back',
            bodyPart: 'BACK'
        });
    }
    
    /**
     * Create a ring accessory slot
     * @param {Object} config - Configuration options
     * @param {number} index - Ring index (0 for first, 1 for second)
     * @returns {AccessorySlot} The created accessory slot
     */
    static createRingSlot(config = {}, index = 0) {
        return new AccessorySlot({
            ...config,
            id: `ring${index + 1}`,
            name: `Ring ${index + 1}`,
            accessoryType: 'RING',
            index
        });
    }
    
    /**
     * Create an amulet accessory slot
     * @param {Object} config - Configuration options
     * @returns {AccessorySlot} The created accessory slot
     */
    static createAmuletSlot(config = {}) {
        return new AccessorySlot({
            ...config,
            id: 'neck',
            name: 'Amulet',
            accessoryType: 'AMULET'
        });
    }
    
    /**
     * Create a belt accessory slot
     * @param {Object} config - Configuration options
     * @returns {AccessorySlot} The created accessory slot
     */
    static createBeltSlot(config = {}) {
        return new AccessorySlot({
            ...config,
            id: 'belt',
            name: 'Belt',
            accessoryType: 'BELT'
        });
    }
    
    /**
     * Create a complete set of equipment slots
     * @param {Object} config - Configuration options
     * @returns {Object} Object containing all equipment slots
     */
    static createFullEquipmentSlots(config = {}) {
        return {
            // Weapons
            mainHand: this.createMainHandSlot(config),
            offHand: this.createOffHandSlot(config),
            
            // Armor
            head: this.createHeadSlot(config),
            torso: this.createTorsoSlot(config),
            legs: this.createLegsSlot(config),
            feet: this.createFeetSlot(config),
            hands: this.createHandsSlot(config),
            back: this.createBackSlot(config),
            
            // Accessories
            ring1: this.createRingSlot(config, 0),
            ring2: this.createRingSlot(config, 1),
            neck: this.createAmuletSlot(config),
            belt: this.createBeltSlot(config)
        };
    }
    
    /**
     * Create slots from a configuration object
     * @param {Object} slotsConfig - Configuration for slots
     * @returns {Object} Object containing created slots
     */
    static createSlotsFromConfig(slotsConfig) {
        const slots = {};
        
        // Process each slot in config
        Object.entries(slotsConfig).forEach(([slotId, slotConfig]) => {
            // Make sure the ID is in the config
            const config = {
                ...slotConfig,
                id: slotId
            };
            
            // Create the appropriate slot type
            slots[slotId] = this.createSlot(slotConfig.type || 'DEFAULT', config);
        });
        
        return slots;
    }
} 