export enum ItemType {
    WEAPON = 'WEAPON',
    ARMOR = 'ARMOR',
    ARTIFACT = 'ARTIFACT',
    SCRAP = 'SCRAP'
}

export enum ItemRarity {
    COMMON = 'COMMON',
    UNCOMMON = 'UNCOMMON',
    RARE = 'RARE',
    LEGENDARY = 'LEGENDARY'
}

export enum EquipmentSlot {
    HEAD = 'HEAD',
    BODY = 'BODY',
    LEGS = 'LEGS',
    FEET = 'FEET',
    MAIN_HAND = 'MAIN_HAND',
    OFF_HAND = 'OFF_HAND',
    NONE = 'NONE' // For scrap/consumables
}

export interface ItemStats {
    hp?: number;
    shield?: number;
    atk?: number;
    speed?: number; // percentage 0.1 = +10%
    cooldown?: number; // percentage reduction
    crit?: number; // percentage
}

export interface ItemDef {
    id: string; // e.g. 'wpn_vanguard_sword_mk1'
    name: string;
    type: ItemType;
    slot: EquipmentSlot;
    rarity: ItemRarity;
    classReq?: string[]; // If undefined, usable by all
    tier: number; // 1-10
    stats: ItemStats;
    icon: string; // CSS emoji or eventual path
    isTwoHanded?: boolean;
}

export interface InventoryItem {
    id: string; // Unique Instance ID (UUID)
    defId: string; // ref to ItemDef
    acquiredAt: number;
    isNew?: boolean;
}

// --- GENERATION LOGIC ---

const TIER_MULTIPLIER = 0.2; // +20% per Tier
const BASE_HP = 50;   // Player Base HP
const BASE_ATK = 10;  // Player Base ATK
const TWO_HAND_MULT = 1.8; // 2H Weapons are 1.8x stronger

// Base Templates
interface ItemTemplate {
    baseId: string;
    namePattern: string;
    type: ItemType;
    slot: EquipmentSlot;
    icon: string;
    classReq?: string[];
    baseStats: ItemStats;
    isTwoHanded?: boolean;
}

const TEMPLATES: ItemTemplate[] = [
    // WEAPONS
    {
        baseId: 'wpn_vanguard_sword', namePattern: 'Pulse Blade',
        type: ItemType.WEAPON, slot: EquipmentSlot.MAIN_HAND,
        icon: '⚔️', classReq: ['Vanguard'],
        baseStats: { atk: 10, speed: 0.05 }
    },
    {
        baseId: 'wpn_vanguard_shield', namePattern: 'Repulsor Buckler',
        type: ItemType.WEAPON, slot: EquipmentSlot.OFF_HAND,
        icon: '🛡️', classReq: ['Vanguard'],
        baseStats: { shield: 20, hp: 10 }
    },
    {
        baseId: 'wpn_bastion_hammer', namePattern: 'Impact Hammer',
        type: ItemType.WEAPON, slot: EquipmentSlot.MAIN_HAND,
        icon: '🔨', classReq: ['Bastion'],
        baseStats: { atk: 10 }, // Will be multiplied by 2H logic
        isTwoHanded: true
    },
    {
        baseId: 'wpn_bastion_wall', namePattern: 'Aegis Wall',
        type: ItemType.WEAPON, slot: EquipmentSlot.OFF_HAND,
        icon: '🧱', classReq: ['Bastion'],
        baseStats: { hp: 50, shield: 50 }
    },
    {
        baseId: 'wpn_spectre_rifle', namePattern: 'Phase Rifle',
        type: ItemType.WEAPON, slot: EquipmentSlot.MAIN_HAND,
        icon: '🔫', classReq: ['Spectre'],
        baseStats: { atk: 12, cooldown: 0.05 }, // Slightly higher base, 2H
        isTwoHanded: true
    },
    // ARMOR (Universal)
    {
        baseId: 'arm_head', namePattern: 'Visor',
        type: ItemType.ARMOR, slot: EquipmentSlot.HEAD,
        icon: '🥽', baseStats: { shield: 10 }
    },
    {
        baseId: 'arm_body', namePattern: 'Vest',
        type: ItemType.ARMOR, slot: EquipmentSlot.BODY,
        icon: '🦺', baseStats: { hp: 20 }
    },
    {
        baseId: 'arm_legs', namePattern: 'Pants',
        type: ItemType.ARMOR, slot: EquipmentSlot.LEGS,
        icon: '👖', baseStats: { speed: 0.02 }
    },
    {
        baseId: 'arm_feet', namePattern: 'Boots',
        type: ItemType.ARMOR, slot: EquipmentSlot.FEET,
        icon: '👢', baseStats: { speed: 0.05 }
    },
];

const RARITY_FLAGS: Record<ItemRarity, { mult: number, color: string, prefix: string, bonusStat?: Partial<ItemStats> }> = {
    [ItemRarity.COMMON]: { mult: 1.0, color: '⚪', prefix: 'Standard', bonusStat: {} },
    [ItemRarity.UNCOMMON]: { mult: 1.2, color: '🟢', prefix: 'Enhanced', bonusStat: { crit: 5 } },
    [ItemRarity.RARE]: { mult: 1.4, color: '🔵', prefix: 'Advanced', bonusStat: { cooldown: 0.05 } },
    [ItemRarity.LEGENDARY]: { mult: 1.6, color: '🟡', prefix: 'Elite', bonusStat: { atk: 5, hp: 20 } }
};

function generateDatabase(): Record<string, ItemDef> {
    const db: Record<string, ItemDef> = {};

    // 1. Generate Gear (T1-T10)
    TEMPLATES.forEach(tmpl => {
        for (let tier = 1; tier <= 10; tier++) {
            // For now, let's just generate COMMON items for basic progression data
            // But to support the random drops, we should ideally support all rarities if needed. 
            // For MVP, we stick to Common definitions in DB, and handle Rarity dynamic scaling...
            // OR we pre-generate specific named items.
            // Let's generate [Base Item] (Common) for each Tier.

            // To make "Rarity" real, we usually instanced items have a rarity modifier, 
            // but our Def system has Rarity in the definition.
            // So we will generate 'wpn_vanguard_sword_mk1' (Common)
            // And maybe 'wpn_vanguard_sword_mk1_rare' etc if we want specific definitions.
            // SIMPLIFICATION: We only generate COMMON defs here for the "Store" / Check.
            // The `InventoryItem` instance might carry Rarity, OR we define definitions for all rarities.
            // Let's define definitions for ALL rarities to be safe and explicit.

            Object.values(ItemRarity).forEach(rarity => {
                const rConfig = RARITY_FLAGS[rarity];

                // Naming: "Standard Pulse Blade Mk.I"
                // Id: wpn_vanguard_sword_mk1_common
                const id = `${tmpl.baseId}_mk${tier}_${rarity.toLowerCase()}`;
                const name = `${rarity === ItemRarity.COMMON ? '' : rConfig.prefix + ' '}${tmpl.namePattern} Mk.${tier}`;

                // Stats Calculation
                // Linear Growth: Base * (1 + (Tier-1)*0.2)
                const tierScale = 1 + (tier - 1) * TIER_MULTIPLIER;
                const finalMult = tierScale * rConfig.mult;

                const stats: ItemStats = {};

                // Apply Base Stats
                if (tmpl.baseStats.atk) stats.atk = Math.floor(tmpl.baseStats.atk * finalMult * (tmpl.isTwoHanded ? TWO_HAND_MULT : 1));
                if (tmpl.baseStats.hp) stats.hp = Math.floor(tmpl.baseStats.hp * finalMult);
                if (tmpl.baseStats.shield) stats.shield = Math.floor(tmpl.baseStats.shield * finalMult);

                // Percentage stats usually don't scale linearly with Tier to avoid 1000% speed.
                // They scale slowly.
                if (tmpl.baseStats.speed) stats.speed = tmpl.baseStats.speed + (tier * 0.005);
                if (tmpl.baseStats.cooldown) stats.cooldown = tmpl.baseStats.cooldown; // Fixed usually
                if (tmpl.baseStats.crit) stats.crit = tmpl.baseStats.crit;

                // Rarity Bonus Stats
                if (rConfig.bonusStat) {
                    if (rConfig.bonusStat.crit) stats.crit = (stats.crit || 0) + rConfig.bonusStat.crit;
                    if (rConfig.bonusStat.cooldown) stats.cooldown = (stats.cooldown || 0) + rConfig.bonusStat.cooldown;
                    if (rConfig.bonusStat.atk) stats.atk = (stats.atk || 0) + rConfig.bonusStat.atk;
                }

                db[id] = {
                    id,
                    name,
                    type: tmpl.type,
                    slot: tmpl.slot,
                    rarity: rarity,
                    classReq: tmpl.classReq,
                    tier,
                    stats,
                    icon: tmpl.icon,
                    isTwoHanded: tmpl.isTwoHanded
                };
            });
        }
    });

    // 2. Add Misc Items (Artifacts, Scrap) - Non Scaling for now
    db['art_box_mk1'] = {
        id: 'art_box_mk1', name: 'Encrypted Cache',
        type: ItemType.ARTIFACT, slot: EquipmentSlot.NONE,
        rarity: ItemRarity.COMMON, tier: 1, stats: {}, icon: '📦'
    };
    db['m_scrap'] = {
        id: 'm_scrap', name: 'Scrap Metal',
        type: ItemType.SCRAP, slot: EquipmentSlot.NONE,
        rarity: ItemRarity.COMMON, tier: 0, stats: {}, icon: '⚙️'
    };

    return db;
}

export const ITEM_DATABASE = generateDatabase();

// Backwards compatibility helper for exact keys if referenced elsewhere manually
// (The helper 'getItemDef' handles looking up by the ID string)
export function getItemDef(defId: string): ItemDef | null {
    // Attempt exact match
    if (ITEM_DATABASE[defId]) return ITEM_DATABASE[defId];

    // Fallback: The old code might ask for 'wpn_vanguard_sword_mk1' which implied Common.
    // Try appending '_common'
    if (ITEM_DATABASE[`${defId}_common`]) return ITEM_DATABASE[`${defId}_common`];

    return null;
}
