import Phaser from 'phaser';
import { WeaponStrategy, WeaponContext, CombatStats } from '../types';

export class ProjectileStrategy implements WeaponStrategy {
    execute(ctx: WeaponContext, stats: CombatStats): void {
        const { scene, source, group } = ctx;

        // Visual: Projectile Sprite
        // Determine texture based on some logic? Or generic orb.
        const texture = 'tex_orb';
        const projectile = scene.physics.add.sprite(source.x, source.y, texture);

        // Add to group (for auto-update if physics group)
        group.add(projectile);

        // Visual Props
        projectile.setScale(0.3 * (stats.sizeMod || 1));
        projectile.setTint(0xFF4444); // TODO: Parameterize color

        // Physics
        const speed = stats.speed || 1200;
        const vecX = Math.cos(source.rotation) * speed;
        const vecY = Math.sin(source.rotation) * speed;

        const body = projectile.body as Phaser.Physics.Arcade.Body;
        body.setVelocity(vecX, vecY);
        body.setCircle(10);

        // Logic
        (projectile as any).damage = stats.damage;

        // Lifetime
        // Convert range to duration? 
        // Range = Speed * Time -> Time = Range / Speed
        // Default Range 1200 -> 1s
        const duration = (stats.range / speed) * 1000 || 1000;

        scene.time.delayedCall(duration, () => {
            if (projectile.active) projectile.destroy();
        });
    }
}
