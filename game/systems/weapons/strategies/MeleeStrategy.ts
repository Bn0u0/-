import Phaser from 'phaser';
import { WeaponStrategy, WeaponContext, CombatStats } from '../types';
import { EventBus } from '../../../../services/EventBus';

export class MeleeStrategy implements WeaponStrategy {
    execute(ctx: WeaponContext, stats: CombatStats): void {
        const { scene, source } = ctx;

        // Visual: Kinetic Arc
        const graphics = scene.add.graphics({ x: source.x, y: source.y });
        graphics.setDepth(20); // Above players
        graphics.setRotation(source.rotation);

        const radius = stats.range || 90;
        const color = 0x00FFFF;

        // Draw Swoosh
        graphics.fillStyle(color, 0.6);
        graphics.beginPath();
        graphics.arc(0, 0, radius, -Math.PI / 3, Math.PI / 3, false);
        graphics.arc(0, 0, radius - 20, Math.PI / 3, -Math.PI / 3, true);
        graphics.closePath();
        graphics.fillPath();

        // Animation
        scene.tweens.add({
            targets: graphics,
            alpha: 0,
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 150,
            onComplete: () => graphics.destroy()
        });

        // Logic: Area Check
        // Emit event for CombatManager to check Circle/Cone overlap
        EventBus.emit('COMBAT_AREA_ATTACK', {
            x: source.x,
            y: source.y,
            radius: radius,
            angle: source.rotation,
            arc: Math.PI / 1.5, // 120 degrees
            damage: stats.damage,
            ownerId: source.id
        });
    }
}
