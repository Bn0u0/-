import { ItemRarity } from './Items';

export interface LootEntry {
    itemId: string; // The base Def ID (e.g. 'wpn_vanguard_sword') or exact ID
    weight: number;
}

export class LootTable {
    private entries: LootEntry[] = [];
    private totalWeight: number = 0;

    constructor(entries: LootEntry[]) {
        this.entries = entries;
        this.totalWeight = entries.reduce((sum, e) => sum + e.weight, 0);
    }

    public roll(): string | null {
        if (this.entries.length === 0) return null;

        const roll = Math.random() * this.totalWeight;
        let cumulative = 0;

        for (const entry of this.entries) {
            cumulative += entry.weight;
            if (roll < cumulative) {
                return entry.itemId;
            }
        }
        return this.entries[0].itemId; // Fallback
    }
}

// Global Rarity Weights
// Common: 60%, Uncommon: 30%, Rare: 9%, Legendary: 1%
export const RARITY_WEIGHTS = {
    [ItemRarity.COMMON]: 600,
    [ItemRarity.UNCOMMON]: 300,
    [ItemRarity.RARE]: 90,
    [ItemRarity.LEGENDARY]: 10
};

// Define specific tables
// For MVP, we might just roll Rarity then pick a random item of that rarity?
// Or we have specific tables for "Weapon Chest", "Armor Chest".

export const LOOT_TABLES = {
    // A generic "Artifact" decrypt result table
    ARTIFACT_DECRYPT: new LootTable([
        // This is a placeholder. 
        // In a real system, we'd dynamically build this from the Item Database 
        // catering to the specific Artifact Tier.
        // For now, we hardcode some "Good" items.
        { itemId: 'wpn_vanguard_sword', weight: 100 },
        { itemId: 'wpn_bastion_hammer', weight: 50 },
        { itemId: 'wpn_spectre_rifle', weight: 50 },
        { itemId: 'arm_body', weight: 80 },
        { itemId: 'arm_head', weight: 80 },
        { itemId: 'arm_legs', weight: 80 },
    ])
};

// Helper: Roll Rarity
export function rollRarity(): ItemRarity {
    const total = 1000;
    const roll = Math.random() * total;

    if (roll < RARITY_WEIGHTS[ItemRarity.COMMON]) return ItemRarity.COMMON;
    if (roll < RARITY_WEIGHTS[ItemRarity.COMMON] + RARITY_WEIGHTS[ItemRarity.UNCOMMON]) return ItemRarity.UNCOMMON;
    if (roll < RARITY_WEIGHTS[ItemRarity.COMMON] + RARITY_WEIGHTS[ItemRarity.UNCOMMON] + RARITY_WEIGHTS[ItemRarity.RARE]) return ItemRarity.RARE;
    return ItemRarity.LEGENDARY;
}
