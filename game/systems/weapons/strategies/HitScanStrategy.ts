import Phaser from 'phaser';
import { WeaponStrategy, WeaponContext, CombatStats } from '../types';
import { EventBus } from '../../../../services/EventBus';

export class HitScanStrategy implements WeaponStrategy {
    execute(ctx: WeaponContext, stats: CombatStats): void {
        const { scene, source } = ctx;

        // Visual: Laser Beam
        const graphics = scene.add.graphics();
        // ctx.group.add(graphics); // Graphics in Group? Works partially in Phaser, careful with physics.

        const width = 4 * (stats.sizeMod || 1);
        const color = 0x9D00FF; // TODO: Parameterize

        graphics.lineStyle(width, color);

        const length = stats.range || 800;
        const endX = source.x + Math.cos(source.rotation) * length;
        const endY = source.y + Math.sin(source.rotation) * length;

        graphics.lineBetween(source.x, source.y, endX, endY);

        // Core White
        graphics.lineStyle(width * 0.4, 0xFFFFFF);
        graphics.lineBetween(source.x, source.y, endX, endY);

        // Fade Out
        scene.tweens.add({
            targets: graphics,
            scaleY: 0,
            alpha: 0,
            duration: 150,
            onComplete: () => graphics.destroy()
        });

        // Logic: Raycast Hit
        // In Phaser Arcade Physics, we don't have true Raycast.
        // We simulate it by creating a Line Body or using a fast invisible projectile?
        // Or strictly checking overlap with a Line?
        // For simplicity in Phase 3.5: We create a temporary "Beam Hitbox" Line.

        // Actually, simplest is:
        // Get all enemies. Check if they intersect the line.
        // This is expensive if many enemies.
        // Optimization: Use a physics body that is a long rectangle (Rotated).

        const beamBody = scene.add.rectangle(
            source.x + (endX - source.x) / 2,
            source.y + (endY - source.y) / 2,
            length,
            10,
            0x000000,
            0
        );
        scene.physics.add.existing(beamBody);
        const body = beamBody.body as Phaser.Physics.Arcade.Body;
        body.setRotation(source.rotation * (180 / Math.PI)); // Body rotation is degrees usually? Check Phaser docs. 
        // Actually, Phaser Arcade Bodies (AABB) don't rotate well. 
        // This is the classic "Laser Hit" problem in Arcade Physics.

        // Alternative: Instant Projectile (Speed 10000)
        // Or Line-Circle Intersect manually.

        // Manual Line Check (Good for < 100 enemies)
        // Is passed in context? No, but we can emit event or require Scene to have EnemyGroup access?
        // Context only has 'group' (projectiles).
        // Strategy shouldn't know about EnemyGroup directly to keep decoupled?

        // Option B: Just make a super fast small projectile.
        // It travels 'length' in 1 frame.
        // Or use the "Invisible Projectile" method we used in DroneBeam.

        // Let's iterate: Manual Line Intersection is cleanest for "Instant Hit".
        // But we need access to targets.
        // Let's emit an event 'WEAPON_HIT_SCAN' with the line, and let CombatManager handle it?
        // That fits the Architecture: WeaponSystem calculates SHAPE, CombatManager calculates HIT.

        EventBus.emit('COMBAT_HIT_SCAN', {
            x1: source.x, y1: source.y,
            x2: endX, y2: endY,
            damage: stats.damage,
            ownerId: source.id
        });

        // Also destroy the dummy body if we made one (we didn't).
    }
}
