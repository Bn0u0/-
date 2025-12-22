import Phaser from 'phaser';
import { EventBus } from '../../services/EventBus';
import { ItemInstance } from '../../types';
import { ItemLibrary } from '../data/library/items';
import { STRATEGIES, WeaponPipeline } from './weapons/WeaponRegistry';

export class WeaponSystem {
    private scene: Phaser.Scene;
    public projectiles: Phaser.GameObjects.Group;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.projectiles = scene.add.group();
    }

    public fire(weapon: ItemInstance, source: { x: number, y: number, rotation: number, id: string, isSiege?: boolean }, playerStats: any, target?: { x: number, y: number }) {
        let def = ItemLibrary.get(weapon.defId);

        // [FALLBACK] Support ad-hoc weapons (e.g., Sentry Turret)
        if (!def && weapon.defId === 'turret_gun') {
            def = {
                id: 'turret_gun',
                name: 'Turret Gun',
                type: 'WEAPON',
                slot: 'mainWeapon',
                tier: 0,
                rarity: 'COMMON',
                baseStats: { damage: 5, range: 250, fireRate: 800, speed: 600 },
                description: 'Auto Sentry',
                icon: 'tex_orb',
                behavior: 'PISTOL_SHOT'
            };
        }

        if (!def || !def.behavior) return;

        // 1. Pipeline: Calculate Final Stats
        const stats = WeaponPipeline.resolveStats(weapon, playerStats, source);

        // 2. Juice: Trigger generic effects
        this.playFireJuice(source, def.behavior);

        // 3. Strategy: Execute Behavior
        const strategy = STRATEGIES[def.behavior];
        if (strategy) {
            // Support Multi-shot (Spread)
            const count = stats.projectileCount || 1;
            const spread = 0.2 * (stats.spreadMod || 1);

            for (let i = 0; i < count; i++) {
                let angle = source.rotation;
                if (count > 1) {
                    angle += (i - (count - 1) / 2) * spread;
                }

                strategy.execute({
                    scene: this.scene,
                    source: { ...source, rotation: angle },
                    target: target,
                    group: this.projectiles
                }, stats);
            }
        } else {
            console.warn(`[WeaponSystem] Unknown behavior: ${def.behavior}`);
        }
    }

    private playFireJuice(source: any, behavior: string) {
        EventBus.emit('PLAY_SFX', 'SHOOT');

        // Muzzle Flash
        const flash = this.scene.add.circle(
            source.x + Math.cos(source.rotation) * 40,
            source.y + Math.sin(source.rotation) * 40,
            12,
            0xFFFF00
        );
        flash.setBlendMode(Phaser.BlendModes.ADD);
        this.scene.tweens.add({
            targets: flash,
            scale: 0,
            alpha: 0,
            duration: 50,
            onComplete: () => flash.destroy()
        });

        // Recoil
        if (source.id === 'player') {
            EventBus.emit('PLAYER_RECOIL', { force: 200, angle: source.rotation });
        }
    }
}
