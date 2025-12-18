export enum ItemType {
    CORE = 'CORE',       // HP / Defense / Passive
    DRIVE = 'DRIVE',     // Speed / Utility / CDR
    PROTOCOL = 'PROTOCOL', // Attack / Crit / Special
    MATERIAL = 'MATERIAL', // Crafting / Currency
    ARTIFACT = 'ARTIFACT', // Special
    SCRAP = 'SCRAP' // Junk? Or is SCRAP MATERIAL?
}

export enum ItemRarity {
    COMMON = 'COMMON',
    UNCOMMON = 'UNCOMMON', // Added missing rarity
    RARE = 'RARE',
    EPIC = 'EPIC',
    LEGENDARY = 'LEGENDARY',
    GLITCH = 'GLITCH' // Special anomaly tier
}

export interface ItemStats {
    hp?: number;
    shield?: number;
    atk?: number;
    speed?: number; // 0.1 = +10%
    cdr?: number;   // 0.1 = 10% cooldown reduction
    crit?: number;  // 5 = 5% chance
    range?: number; // Range multiplier
    luck?: number;  // Drop rate
}

export interface ItemDef {
    id: string;
    name: string;
    type: ItemType;
    rarity: ItemRarity;
    description: string;
    stats: ItemStats;
    icon: string; // Emoji or asset key
    color: string; // Hex string for UI
}

export interface InventoryItem {
    id: string; // UUID
    defId: string;
    acquiredAt: number;
    isNew?: boolean;
}

// --- CONSTANTS ---

const RARITY_CONFIG: Record<ItemRarity, { color: string, mult: number }> = {
    [ItemRarity.COMMON]: { color: '#ffffff', mult: 1.0 },
    [ItemRarity.UNCOMMON]: { color: '#00ff00', mult: 1.25 }, // Green
    [ItemRarity.RARE]: { color: '#00ffff', mult: 1.5 },
    [ItemRarity.EPIC]: { color: '#ff00ff', mult: 2.5 },
    [ItemRarity.LEGENDARY]: { color: '#ffd700', mult: 4.0 },
    [ItemRarity.GLITCH]: { color: '#ff0000', mult: 6.66 }
};

// --- DEFINITIONS ---

const BASE_DEFS: Partial<ItemDef>[] = [
    // --- CORES (Defense) ---
    {
        id: 'core_fusion', name: 'Fusion Core', type: ItemType.CORE,
        icon: '⚛️', description: 'Standard issue power unit.',
        stats: { hp: 50, shield: 10 }
    },
    {
        id: 'core_void', name: 'Void Core', type: ItemType.CORE,
        icon: '⚫', description: 'Absorbs incoming energy.',
        stats: { hp: 20, shield: 80 }
    },
    {
        id: 'core_titan', name: 'Titan Core', type: ItemType.CORE,
        icon: '🛡️', description: 'Massive durability increase.',
        stats: { hp: 150 }
    },

    // --- DRIVES (Utility) ---
    {
        id: 'drive_kinetic', name: 'Kinetic Drive', type: ItemType.DRIVE,
        icon: '⏩', description: 'Boosts reaction time.',
        stats: { speed: 0.1, cdr: 0.05 }
    },
    {
        id: 'drive_warp', name: 'Warp Drive', type: ItemType.DRIVE,
        icon: '🌀', description: 'Experimental phase engine.',
        stats: { speed: 0.2, luck: 10 }
    },
    {
        id: 'drive_chrono', name: 'Chrono Drive', type: ItemType.DRIVE,
        icon: '⏳', description: 'Manipulates local flow.',
        stats: { cdr: 0.20 }
    },

    // --- PROTOCOLS (Offense) ---
    {
        id: 'proto_strike', name: 'Strike Protocol', type: ItemType.PROTOCOL,
        icon: '⚔️', description: 'Combat subroutines.',
        stats: { atk: 15 }
    },
    {
        id: 'proto_precision', name: 'Precision Protocol', type: ItemType.PROTOCOL,
        icon: '🎯', description: 'Targeting enhancement.',
        stats: { atk: 5, crit: 15 }
    },
    {
        id: 'proto_havoc', name: 'Havoc Protocol', type: ItemType.PROTOCOL,
        icon: '💥', description: 'Unstable output.',
        stats: { atk: 30, crit: 5 }
    }
];

// --- GENERATOR ---

import { IconGenerator } from '../../services/IconGenerator';

function generateDatabase(): Record<string, ItemDef> {
    const db: Record<string, ItemDef> = {};

    BASE_DEFS.forEach(base => {
        Object.values(ItemRarity).forEach(rarity => {
            const config = RARITY_CONFIG[rarity];
            const newId = `${base.id}_${rarity.toLowerCase()}`;

            // Scale Stats
            const newStats: ItemStats = {};
            for (const key in base.stats) {
                const val = base.stats[key as keyof ItemStats];
                if (val) {
                    const isFlat = ['hp', 'shield', 'atk', 'luck', 'crit'].includes(key);
                    let newVal = val * config.mult;
                    if (isFlat) newVal = Math.floor(newVal);
                    else newVal = parseFloat(newVal.toFixed(2));
                    newStats[key as keyof ItemStats] = newVal;
                }
            }

            // GENERATE ICON (Zero-Asset)
            // Map ItemType to IconGenerator Type
            let iconType = base.type === 'CORE' ? 'CORE' :
                base.type === 'DRIVE' ? 'DRIVE' :
                    base.type === 'PROTOCOL' ? 'PROTOCOL' : 'MATERIAL';

            const iconDataURI = IconGenerator.generate(iconType as any, config.color);

            db[newId] = {
                id: newId,
                name: `${base.name} [${rarity}]`, // e.g. Fusion Core [RARE]
                type: base.type!,
                rarity: rarity,
                description: base.description!,
                stats: newStats,
                icon: iconDataURI, // Injected Base64
                color: config.color
            };
        });
    });

    // Material
    db['mat_data'] = {
        id: 'mat_data', name: 'Encrypted Data', type: ItemType.MATERIAL,
        rarity: ItemRarity.COMMON, description: 'Currency for upgrades.',
        stats: {},
        icon: IconGenerator.generate('MATERIAL', '#00FFFF'),
        color: '#ffffff'
    };

    return db;
}

export const ITEM_DATABASE = generateDatabase();

export function getItemDef(defId: string): ItemDef | null {
    return ITEM_DATABASE[defId] || null;
}
