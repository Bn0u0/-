import { ItemRarity, ItemType } from './Items';

export interface LootEntry {
    itemId: string; // Base ID
    weight: number;
}

export class LootTable {
    private entries: LootEntry[];
    private totalWeight: number;

    constructor(entries: LootEntry[]) {
        this.entries = entries;
        this.totalWeight = entries.reduce((s, e) => s + e.weight, 0);
    }

    public roll(): string {
        const r = Math.random() * this.totalWeight;
        let c = 0;
        for (const e of this.entries) {
            c += e.weight;
            if (r < c) return e.itemId;
        }
        return this.entries[0].itemId;
    }
}

export const RARITY_WEIGHTS = {
    [ItemRarity.COMMON]: 600,
    [ItemRarity.RARE]: 300,
    [ItemRarity.EPIC]: 90,
    [ItemRarity.LEGENDARY]: 10,
    [ItemRarity.GLITCH]: 1
};

export function rollRarity(): ItemRarity {
    const total = 1001;
    const r = Math.random() * total;

    if (r < 600) return ItemRarity.COMMON;
    if (r < 900) return ItemRarity.RARE;
    if (r < 990) return ItemRarity.EPIC;
    if (r < 1000) return ItemRarity.LEGENDARY;
    return ItemRarity.GLITCH;
}

// Simple Base Tables
export const LOOT_TABLES = {
    // Basic drop 
    BASIC: new LootTable([
        { itemId: 'mat_data', weight: 50 },
        { itemId: 'core_fusion', weight: 10 },
        { itemId: 'drive_kinetic', weight: 10 },
        { itemId: 'proto_strike', weight: 10 }
    ]),
    // Elite / Boss
    ELITE: new LootTable([
        { itemId: 'core_void', weight: 20 },
        { itemId: 'drive_warp', weight: 20 },
        { itemId: 'proto_precision', weight: 20 },
        { itemId: 'core_titan', weight: 10 }
    ])
};
