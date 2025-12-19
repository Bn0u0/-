import { ItemDef } from '../../../../../types';

export const T0_WEAPONS: ItemDef[] = [
    {
        id: 'weapon_crowbar_t0',
        name: '幸運撬棍',
        type: 'WEAPON',
        tier: 0,
        baseStats: { damage: 15, range: 60, fireRate: 400, knockback: 300 },
        affinity: { classes: ['SCAVENGER', 'RONIN'], bonusStats: { critAdd: 0.1 } }, // 拾荒者系加成
        icon: 'icon_scrap_metal',
        behavior: 'MELEE_SWEEP'
    },
    {
        id: 'weapon_pistol_t0',
        name: '老夥計',
        type: 'WEAPON',
        tier: 0,
        baseStats: { damage: 12, range: 400, fireRate: 600 },
        affinity: { classes: ['RANGER', 'GUNNER'], bonusStats: { range: 100 } }, // 遊騎兵系加成
        icon: 'ammo_pip',
        behavior: 'PISTOL_SHOT'
    },
    {
        id: 'weapon_drone_t0',
        name: '浮游單元 Beta',
        type: 'WEAPON',
        tier: 0,
        baseStats: { damage: 5, range: 300, fireRate: 200 }, // 滋滋滋
        affinity: { classes: ['WEAVER', 'ARCHITECT'], bonusStats: {} },
        icon: 'artifact_box',
        behavior: 'DRONE_BEAM'
    }
];
