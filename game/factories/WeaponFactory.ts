import Phaser from 'phaser';
import { WeaponInstance, WeaponModifier } from '../../types';

export class WeaponFactory {
    static generate(seed: string, level: number): WeaponInstance {
        const rng = new Phaser.Math.RandomDataGenerator([seed]);

        const types: WeaponInstance['baseType'][] = ['MELEE_SWEEP', 'HOMING_ORB', 'SHOCKWAVE', 'LASER', 'BOOMERANG'];
        const baseType = rng.pick(types);

        // Rarity Luck
        const rarities: WeaponInstance['rarity'][] = ['COMMON', 'RARE', 'LEGENDARY', 'MYTHIC'];
        const rarityRoll = rng.realInRange(0, 100);
        let rarity: WeaponInstance['rarity'] = 'COMMON';

        if (rarityRoll > 98) rarity = 'MYTHIC';
        else if (rarityRoll > 90) rarity = 'LEGENDARY';
        else if (rarityRoll > 70) rarity = 'RARE';

        // Name Generation
        const prefixes = ['Neo', 'Cyber', 'Void', 'Hyper', 'Omega', 'Amber', 'Glitch'];
        const suffixes = ['Striker', 'Emitter', 'Driver', 'Core', 'Edge', 'Phase'];
        const name = `${rng.pick(prefixes)} ${rng.pick(suffixes)} MK-${level}`;

        return {
            id: `wpn_${seed}_${Date.now()}`,
            name: name,
            baseType: baseType,
            rarity: rarity,
            modifiers: this.generateModifiers(rarity, level, rng),
            level: level
        };
    }

    private static generateModifiers(rarity: string, level: number, rng: Phaser.Math.RandomDataGenerator): WeaponModifier[] {
        const mods: WeaponModifier[] = [];
        if (rarity === 'COMMON') return mods;

        const modTypes: WeaponModifier['type'][] = ['SPEED', 'DAMAGE', 'PROJECTILE_COUNT'];
        const count = rarity === 'MYTHIC' ? 4 : (rarity === 'LEGENDARY' ? 2 : 1);

        for (let i = 0; i < count; i++) {
            const type = rng.pick(modTypes);
            let value = 1;

            if (type === 'PROJECTILE_COUNT') {
                value = rarity === 'MYTHIC' ? 2 : 1;
            } else {
                value = rng.realInRange(1.1, 1.5 + (level * 0.1));
            }

            mods.push({
                id: `mod_${i}_${Date.now()}`,
                type: type,
                value: value
            });
        }
        return mods;
    }
}
