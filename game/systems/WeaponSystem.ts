import Phaser from 'phaser';
import { COLORS } from '../../constants';
// import { EVENT_BUS } from ...

export type WeaponType = 'MELEE_SWEEP' | 'HOMING_ORB' | 'SHOCKWAVE' | 'LASER' | 'BOOMERANG';

export class WeaponSystem {
    private scene: Phaser.Scene;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    public fire(type: WeaponType, source: { x: number, y: number, rotation: number, id: string }, stats: any, target?: { x: number, y: number }) {
        const count = stats.projectileCount || 1;
        const spread = 0.2; // Radian spread

        for (let i = 0; i < count; i++) {
            // Calculate angle offset
            let angle = source.rotation;
            if (count > 1) {
                angle += (i - (count - 1) / 2) * spread;
            }

            // Create modified source
            const modifiedSource = { ...source, rotation: angle };

            switch (type) {
                case 'MELEE_SWEEP':
                    this.fireMelee(modifiedSource, stats);
                    break;
                case 'HOMING_ORB':
                    this.fireHomingOrb(modifiedSource, stats, target);
                    break;
                case 'SHOCKWAVE':
                    this.fireShockwave(modifiedSource, stats);
                    break;
                case 'LASER':
                    this.fireLaser(modifiedSource, stats);
                    break;
                case 'BOOMERANG':
                    this.fireBoomerang(modifiedSource, stats);
                    break;
            }
        }
    }

    private fireMelee(source: { x: number, y: number, rotation: number }, stats: any) {
        // Visual: Cyan Sweep
        const graphics = this.scene.add.graphics({ x: source.x, y: source.y });
        graphics.setScale(stats.sizeMod || 1);
        graphics.setDepth(10);
        graphics.lineStyle(4, 0x00FFFF, 1);

        // Arc
        const start = source.rotation - Math.PI / 3;
        const end = source.rotation + Math.PI / 3;
        graphics.beginPath();
        graphics.arc(0, 0, 80, start, end, false);
        graphics.strokePath();

        this.scene.tweens.add({
            targets: graphics,
            alpha: 0,
            duration: 200,
            onComplete: () => graphics.destroy()
        });

        // TODO: Hit logic (Circle Check)
    }

    private fireHomingOrb(source: { x: number, y: number }, stats: any, target?: { x: number, y: number }) {
        // Projectile Logic would go here
        // For now, visual placeholder
        const orb = this.scene.add.circle(source.x, source.y, 8 * (stats.sizeMod || 1), 0xFF77BC);
        this.scene.physics.add.existing(orb);
        const body = orb.body as Phaser.Physics.Arcade.Body;

        if (target) {
            this.scene.physics.moveTo(orb, target.x, target.y, 400);
        } else {
            body.setVelocity(Math.random() * 200, Math.random() * 200);
        }

        this.scene.time.delayedCall(1000, () => orb.destroy());
    }

    private fireShockwave(source: { x: number, y: number }, stats: any) {
        const circle = this.scene.add.circle(source.x, source.y, 10 * (stats.sizeMod || 1), 0xFFD700, 0.5);
        this.scene.tweens.add({
            targets: circle,
            scale: 10, // 100px radius
            alpha: 0,
            duration: 300,
            onComplete: () => circle.destroy()
        });
    }

    private fireLaser(source: { x: number, y: number, rotation: number }, stats: any) {
        const graphics = this.scene.add.graphics();
        graphics.lineStyle(6 * (stats.sizeMod || 1), 0x9D00FF);

        const endX = source.x + Math.cos(source.rotation) * 600;
        const endY = source.y + Math.sin(source.rotation) * 600;

        graphics.lineBetween(source.x, source.y, endX, endY);

        this.scene.tweens.add({
            targets: graphics,
            width: 0, // Doesn't work on graphics directly for line width visual
            alpha: 0,
            duration: 150,
            onComplete: () => graphics.destroy()
        });
    }

    private fireBoomerang(source: { x: number, y: number, rotation: number }, stats: any) {
        const projectile = this.scene.add.rectangle(source.x, source.y, 20 * (stats.sizeMod || 1), 5 * (stats.sizeMod || 1), 0x00FF00);
        this.scene.physics.add.existing(projectile);
        const body = projectile.body as Phaser.Physics.Arcade.Body;

        const speed = 500;
        body.setVelocity(Math.cos(source.rotation) * speed, Math.sin(source.rotation) * speed);

        // Simulated return logic (tween? or physics update)
        this.scene.time.delayedCall(500, () => {
            if (projectile.active) {
                this.scene.physics.moveTo(projectile, source.x, source.y, speed);
            }
        });
        this.scene.time.delayedCall(1500, () => projectile.destroy());
    }
}
