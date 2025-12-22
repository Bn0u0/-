import Phaser from 'phaser';
import { WeaponStrategy, CombatStats } from './types';
import { ProjectileStrategy } from './strategies/ProjectileStrategy';
import { HitScanStrategy } from './strategies/HitScanStrategy';
import { MeleeStrategy } from './strategies/MeleeStrategy';
// import { HomingStrategy } from './strategies/HomingStrategy'; // Phase 4

export const STRATEGIES: Record<string, WeaponStrategy> = {
    'PISTOL_SHOT': new ProjectileStrategy(),
    'LASER': new HitScanStrategy(),
    'MELEE_SWEEP': new MeleeStrategy(),
    'DRONE_BEAM': new ProjectileStrategy(), // Fallback for now to simple projectile
    'HOMING_ORB': new ProjectileStrategy(), // Placeholder (Standard Projectile for now)
    'SHOCKWAVE': new MeleeStrategy(), // Placeholder (Area Attack)
    'BOOMERANG': new ProjectileStrategy(), // Placeholder
};

export class WeaponPipeline {
    static resolveStats(weapon: any, playerStats: any, source: any): CombatStats {
        // [PIPELINE]
        // 1. Base Stats (From ItemDef or Computed)
        let dmg = weapon.computedStats.damage || 1;
        let rng = weapon.computedStats.range || 500;
        let spd = weapon.computedStats.speed || 600;

        // 2. Modifiers (Siege Mode)
        if (source.isSiege) {
            dmg *= 1.25;
            rng *= 1.5;
        }

        // 3. Player Stats (Global Buffs)
        // dmg *= playerStats.damageMult || 1;

        return {
            damage: dmg,
            range: rng,
            fireRate: weapon.computedStats.fireRate,
            speed: spd,
            projectileCount: 1, // Default
            spreadMod: source.isSiege ? 0.5 : 1.0
        };
    }
}
