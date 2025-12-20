import { ItemDef } from '../../../../../types';

export const T3_WEAPONS: ItemDef[] = [
    {
        id: 'w_sniper_t3',
        name: '維和者 (Peacekeeper)',
        type: 'WEAPON',
        slot: 'mainWeapon',
        tier: 3,
        rarity: 'EPIC',
        behavior: 'LASER', // 瞬間雷射/軌道砲
        baseStats: { damage: 250, range: 1200, fireRate: 2000, critChance: 0.3, speed: 2000, defense: 0, hpMax: 0 },
        description: '反器材狙擊步槍。一擊必殺。',
        icon: 'weapon_sniper',
        controlType: 'MANUAL',
        siegeBehavior: 'INFINITE_RANGE_SNIPE'
    },
    {
        id: 'w_katana_t3',
        name: '熱能太刀 (Thermal Katana)',
        type: 'WEAPON',
        slot: 'mainWeapon',
        tier: 3,
        rarity: 'EPIC',
        behavior: 'MELEE_SWEEP',
        baseStats: { damage: 120, range: 120, fireRate: 400, critChance: 0.25, defense: 0, hpMax: 0, speed: 1.0 },
        affinity: { classes: ['RONIN'], bonusStats: { damage: 60 } }, // +50% base dmg (120+60=180) to replace damageMult
        description: '刀鋒加熱至 3000 度的單分子刀。切開金屬如切奶油。',
        icon: 'weapon_katana',
        controlType: 'MANUAL',
        siegeBehavior: 'IAI_DASH_SLASH'
    },
    {
        id: 'w_vector_t3',
        name: '死亡風暴 (Deathstorm)',
        type: 'WEAPON',
        slot: 'mainWeapon',
        tier: 3,
        rarity: 'EPIC',
        behavior: 'PISTOL_SHOT',
        baseStats: { damage: 12, range: 350, fireRate: 50, critChance: 0.15, speed: 1500, defense: 0, hpMax: 0 },
        description: '射速極快的衝鋒槍，彈藥傾瀉如風暴。',
        icon: 'weapon_smg',
        controlType: 'MANUAL',
        siegeBehavior: 'RAPID_FIRE_BURST'
    }
];
