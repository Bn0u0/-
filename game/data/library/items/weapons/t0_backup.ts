import { ItemDef } from '../../../../../types';

export const T0_WEAPONS: ItemDef[] = [
    {
        id: 'weapon_crowbar_t0',
        name: '幸運撬棍',
        type: 'WEAPON',
        slot: 'mainWeapon',
        tier: 0,
        rarity: 'COMMON',
        baseStats: { damage: 15, range: 60, fireRate: 400, speed: 1.0, critChance: 0.05, defense: 0, hpMax: 0 },
        description: '一把普通的撬棍',
        icon: 'icon_scrap_metal',
        behavior: 'MELEE_SWEEP',
        controlType: 'HYBRID', // Exceptions handling: Melee Hybrid = Slow Forward
        siegeBehavior: 'SLOW_CHARGE'
    },
    {
        id: 'weapon_pistol_t0',
        name: '老夥計',
        type: 'WEAPON',
        slot: 'mainWeapon',
        tier: 0,
        rarity: 'COMMON',
        baseStats: { damage: 12, range: 400, fireRate: 600, speed: 1.0, critChance: 0.05, defense: 0, hpMax: 0 },
        description: '生鏽的手槍',
        icon: 'ammo_pip',
        behavior: 'PISTOL_SHOT',
        controlType: 'HYBRID',
        siegeBehavior: 'MOONWALK_LASER'
    },
    {
        id: 'weapon_drone_t0',
        name: '浮游單元 Beta',
        type: 'WEAPON',
        slot: 'mainWeapon',
        tier: 0,
        rarity: 'COMMON',
        baseStats: { damage: 5, range: 300, fireRate: 200, speed: 1.0, critChance: 0.05, defense: 0, hpMax: 0 }, // 滋滋滋
        description: '老舊的無人機',
        icon: 'artifact_box',
        behavior: 'DRONE_BEAM',
        controlType: 'AUTO',
        siegeBehavior: 'FOCUS_FIRE'
    }
];
