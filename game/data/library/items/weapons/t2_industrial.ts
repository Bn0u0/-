import { ItemDef } from '../../../../../types';

export const T2_WEAPONS: ItemDef[] = [
    {
        id: 'w_assault_rifle_t2',
        name: '制式步槍 (Assault Rifle)',
        type: 'WEAPON',
        slot: 'mainWeapon',
        tier: 2,
        rarity: 'RARE',
        behavior: 'PISTOL_SHOT',
        baseStats: { damage: 18, range: 500, fireRate: 150, speed: 1200, critChance: 0.1, defense: 0, hpMax: 0 },
        description: '舊時代的可靠夥伴。平衡性極佳。',
        icon: 'weapon_ar'
    },
    {
        id: 'w_sledgehammer_t2',
        name: '動力大錘 (Power Hammer)',
        type: 'WEAPON',
        slot: 'mainWeapon',
        tier: 2,
        rarity: 'RARE',
        behavior: 'SHOCKWAVE', // 震波攻擊
        baseStats: { damage: 80, range: 150, fireRate: 1500, speed: 1.0, critChance: 0.05, defense: 0, hpMax: 0 },
        description: '裝有液壓推進裝置的大錘。能引發地面震波。',
        icon: 'weapon_hammer'
    },
    {
        id: 'w_sawblade_t2',
        name: '圓鋸發射器 (Ripper)',
        type: 'WEAPON',
        slot: 'mainWeapon',
        tier: 2,
        rarity: 'RARE',
        behavior: 'BOOMERANG', // 迴旋鏢邏輯
        baseStats: { damage: 40, range: 400, fireRate: 800, speed: 500, critChance: 0.15, defense: 0, hpMax: 0 },
        description: '發射高速旋轉的圓鋸，會飛回使用者手中。',
        icon: 'weapon_sawblade'
    }
];
