import { ItemDef } from '../../../../../types';

export const T4_WEAPONS: ItemDef[] = [
    {
        id: 'w_railgun_t4',
        name: '磁軌砲 (Railgun)',
        type: 'WEAPON',
        slot: 'mainWeapon',
        tier: 4,
        rarity: 'LEGENDARY',
        behavior: 'LASER',
        baseStats: { damage: 400, range: 1500, fireRate: 2500, speed: 9999, critChance: 0.5, defense: 0, hpMax: 0 },
        description: '以電磁力加速彈丸至 8 馬赫。無視任何護甲。',
        icon: 'weapon_railgun',
        controlType: 'MANUAL',
        siegeBehavior: 'PENETRATING_BEAM'
    },
    {
        id: 'w_funnels_t4',
        name: '浮游砲陣列 (Funnel System)',
        type: 'WEAPON',
        slot: 'mainWeapon',
        tier: 4,
        rarity: 'LEGENDARY',
        behavior: 'HOMING_ORB', // 追蹤法球
        baseStats: { damage: 60, range: 800, fireRate: 300, speed: 600, critChance: 0.1, defense: 0, hpMax: 0 },
        // removed projectileCount bonus for now as it's not in ItemStats
        affinity: { classes: ['WEAVER', 'ARCHITECT'], bonusStats: { fireRate: -50 } },
        description: '精神感應控制的無人攻擊單元。自動索敵。',
        icon: 'weapon_funnels',
        controlType: 'AUTO',
        siegeBehavior: 'ALL_RANGE_ATTACK'
    }
];
