export class ItemSchema {
    constructor(config = {}) {
        // Basic item properties
        this.id = config.id || '';
        this.name = config.name || '';
        this.description = config.description || '';
        this.type = config.type || 'MISC'; // WEAPON, ARMOR, CONSUMABLE, MISC
        this.rarity = config.rarity || 'COMMON'; // COMMON, UNCOMMON, RARE, EPIC, LEGENDARY
        this.level = config.level || 1;
        this.value = config.value || 0; // Gold value
        
        // Visual properties
        this.model = config.model || null; // 3D model reference
        this.icon = config.icon || null; // UI icon reference
        this.texture = config.texture || null;
        
        // Inventory properties
        this.stackable = config.stackable || false;
        this.maxStack = config.maxStack || 1;
        this.weight = config.weight || 1.0;
        
        // Combat properties
        this.equipSlot = config.equipSlot || null; // MAINHAND, OFFHAND, HEAD, CHEST, etc.
        this.durability = {
            current: config.durability?.current || 100,
            max: config.durability?.max || 100
        };
        
        // Stats modifications when equipped/used
        this.stats = {
            // Offensive stats
            attackPower: config.stats?.attackPower || 0,
            attackSpeed: config.stats?.attackSpeed || 1.0,
            criticalChance: config.stats?.criticalChance || 0,
            criticalDamage: config.stats?.criticalDamage || 0,
            
            // Defensive stats
            armor: config.stats?.armor || 0,
            magicResist: config.stats?.magicResist || 0,
            blockChance: config.stats?.blockChance || 0,
            
            // Attribute bonuses
            strength: config.stats?.strength || 0,
            dexterity: config.stats?.dexterity || 0,
            intelligence: config.stats?.intelligence || 0,
            vitality: config.stats?.vitality || 0,
            
            // Elemental damage/resistance
            fire: config.stats?.fire || 0,
            ice: config.stats?.ice || 0,
            lightning: config.stats?.lightning || 0,
            poison: config.stats?.poison || 0
        };
        
        // Combat mechanics
        this.attackType = config.attackType || 'NONE'; // SLASH, STAB, BLUNT, RANGED
        this.damageType = config.damageType || 'PHYSICAL'; // PHYSICAL, MAGICAL, TRUE
        this.range = config.range || 1.0; // Attack range in units
        this.areaOfEffect = config.areaOfEffect || 0; // AoE radius if applicable
        
        // Requirements to use/equip
        this.requirements = {
            level: config.requirements?.level || 1,
            strength: config.requirements?.strength || 0,
            dexterity: config.requirements?.dexterity || 0,
            intelligence: config.requirements?.intelligence || 0
        };
        
        // Special properties
        this.effects = config.effects || []; // Special effects when used/equipped
        this.skills = config.skills || []; // Skills granted when equipped
        this.setBonus = config.setBonus || null; // Part of equipment set
        this.unique = config.unique || false; // Only one can be equipped
        this.soulbound = config.soulbound || false; // Cannot be traded
    }

    // Utility methods
    isEquippable() {
        return this.equipSlot !== null;
    }

    isWeapon() {
        return this.type === 'WEAPON';
    }

    isArmor() {
        return this.type === 'ARMOR';
    }

    isConsumable() {
        return this.type === 'CONSUMABLE';
    }

    canStack() {
        return this.stackable;
    }

    isBroken() {
        return this.durability.current <= 0;
    }

    repair() {
        this.durability.current = this.durability.max;
    }

    damage(amount) {
        this.durability.current = Math.max(0, this.durability.current - amount);
    }

    meetsRequirements(playerStats) {
        return (
            playerStats.level >= this.requirements.level &&
            playerStats.strength >= this.requirements.strength &&
            playerStats.dexterity >= this.requirements.dexterity &&
            playerStats.intelligence >= this.requirements.intelligence
        );
    }

    clone() {
        return new ItemSchema({ ...this });
    }
} 