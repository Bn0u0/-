export enum ItemType {
    WEAPON = 'WEAPON',
    MATERIAL = 'MATERIAL',
    ARTIFACT = 'ARTIFACT' // Unidentified
}

export enum Rarity {
    COMMON = 'COMMON',
    UNCOMMON = 'UNCOMMON',
    RARE = 'RARE',
    LEGENDARY = 'LEGENDARY'
}

export interface BaseItem {
    id: string; // Unique Instance ID (UUID)
    defId: string; // Definition ID (e.g. 'pulse_rifle')
    type: ItemType;
    rarity: Rarity;
}

export interface WeaponItem extends BaseItem {
    type: ItemType.WEAPON;
    stats: {
        damage: number;
        fireRate: number;
        range: number;
    };
}

export interface MaterialItem extends BaseItem {
    type: ItemType.MATERIAL;
    quantity: number;
}

export interface ArtifactItem extends BaseItem {
    type: ItemType.ARTIFACT;
    encryptedLevel: number; // Higher level = better loot table
}

export type InventoryItem = WeaponItem | MaterialItem | ArtifactItem;

// --- Master Definitions (The Database) ---
export interface ItemDefinition {
    defId: string;
    name: string;
    description: string;
    type: ItemType;
    baseRarity: Rarity;
    icon: string; // Emoji for now
}

export const ITEM_DATABASE: Record<string, ItemDefinition> = {
    // Artifacts (The Gacha Boxes)
    'artifact_geo_c': { defId: 'artifact_geo_c', name: '幾何碎片 (C)', description: '未鑑定的低階訊號來源', type: ItemType.ARTIFACT, baseRarity: Rarity.COMMON, icon: '📦' },
    'artifact_geo_u': { defId: 'artifact_geo_u', name: '聚合幾何體 (U)', description: '含有微弱能量波動', type: ItemType.ARTIFACT, baseRarity: Rarity.UNCOMMON, icon: '🎁' },
    'artifact_geo_r': { defId: 'artifact_geo_r', name: '共鳴結構 (R)', description: '穩定的高維數據結構', type: ItemType.ARTIFACT, baseRarity: Rarity.RARE, icon: '💎' },
    'artifact_geo_l': { defId: 'artifact_geo_l', name: '奇異點遺物 (L)', description: '來自虛空的純粹能量', type: ItemType.ARTIFACT, baseRarity: Rarity.LEGENDARY, icon: '👑' },

    // Weapons (The Reward)
    'w_blaster': { defId: 'w_blaster', name: '制式爆能槍', description: '標準配發武器', type: ItemType.WEAPON, baseRarity: Rarity.COMMON, icon: '🔫' },
    'w_pulse': { defId: 'w_pulse', name: '脈衝步槍', description: '高射速能量武器', type: ItemType.WEAPON, baseRarity: Rarity.UNCOMMON, icon: '⚡' },
    'w_sniper': { defId: 'w_sniper', name: '相位狙擊槍', description: '高單發傷害', type: ItemType.WEAPON, baseRarity: Rarity.RARE, icon: '🎯' },

    // Materials
    'm_scrap': { defId: 'm_scrap', name: '金屬廢料', description: '基礎合成材料', type: ItemType.MATERIAL, baseRarity: Rarity.COMMON, icon: '🔩' },
};
