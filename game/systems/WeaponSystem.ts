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
        // Visual: Kinetic Arc (Swipe)
        const graphics = this.scene.add.graphics({ x: source.x, y: source.y });
        graphics.setDepth(20);
        graphics.setRotation(source.rotation);

        const radius = 90;
        const color = 0x00FFFF;

        // Draw Swoosh
        graphics.lineStyle(0, 0x000000, 0); // Fix: Provide dummy color/alpha
        graphics.fillStyle(color, 0.6);
        graphics.beginPath();
        graphics.arc(0, 0, radius, -Math.PI / 3, Math.PI / 3, false);
        graphics.arc(0, 0, radius - 20, Math.PI / 3, -Math.PI / 3, true);
        graphics.closePath();
        graphics.fillPath();

        this.scene.tweens.add({
            targets: graphics,
            alpha: 0,
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 150,
            onComplete: () => graphics.destroy()
        });
    }

    private fireHomingOrb(source: { x: number, y: number }, stats: any, target?: { x: number, y: number }) {
        // Use Baked Texture
        const scale = 0.5 * (stats.sizeMod || 1);
        const orb = this.scene.physics.add.sprite(source.x, source.y, 'tex_orb');
        orb.setScale(scale);
        orb.setTint(0xFF77BC);

        // Spin animation
        this.scene.tweens.add({
            targets: orb,
            angle: 360,
            duration: 1000,
            repeat: -1
        });

        const body = orb.body as Phaser.Physics.Arcade.Body;
        body.setCircle(24); // Hitbox based on 64x64 texture

        if (target) {
            this.scene.physics.moveTo(orb, target.x, target.y, 400);
        } else {
            body.setVelocity(Math.random() * 200 - 100, Math.random() * 200 - 100);
        }

        this.scene.time.delayedCall(2000, () => {
            if (orb.active) {
                // Fizzle out
                this.scene.tweens.add({ targets: orb, scale: 0, alpha: 0, duration: 200, onComplete: () => orb.destroy() });
            }
        });
    }

    private fireShockwave(source: { x: number, y: number }, stats: any) {
        const circle = this.scene.add.circle(source.x, source.y, 10, 0xFFD700);
        circle.setStrokeStyle(4, 0xFFD700);

        this.scene.tweens.add({
            targets: circle,
            radius: 120 * (stats.sizeMod || 1),
            alpha: 0,
            lineWidth: 0,
            duration: 350,
            ease: 'Quad.out',
            onComplete: () => circle.destroy()
        });
    }

    private fireLaser(source: { x: number, y: number, rotation: number }, stats: any) {
        const graphics = this.scene.add.graphics();
        const width = 8 * (stats.sizeMod || 1);

        // Pulse Effect (random width jitter)
        graphics.lineStyle(width, 0x9D00FF);

        const length = 800;
        const endX = source.x + Math.cos(source.rotation) * length;
        const endY = source.y + Math.sin(source.rotation) * length;

        graphics.lineBetween(source.x, source.y, endX, endY);

        // Core beam (White hot center)
        graphics.lineStyle(width * 0.4, 0xFFFFFF);
        graphics.lineBetween(source.x, source.y, endX, endY);

        this.scene.tweens.add({
            targets: graphics,
            scaleY: 0, // Shrink vertically? No, graphics scale applies to container usually.
            alpha: 0,
            duration: 150,
            onComplete: () => graphics.destroy()
        });
    }

    private fireBoomerang(source: { x: number, y: number, rotation: number }, stats: any) {
        const scale = 0.6 * (stats.sizeMod || 1);
        const projectile = this.scene.physics.add.sprite(source.x, source.y, 'tex_boomerang');
        projectile.setScale(scale);
        projectile.setTint(0x00FF00);

        // Fast Spin
        this.scene.tweens.add({
            targets: projectile,
            angle: 360,
            duration: 150,
            repeat: -1
        });

        const body = projectile.body as Phaser.Physics.Arcade.Body;
        body.setCircle(20);

        const speed = 600;
        const vecX = Math.cos(source.rotation) * speed;
        const vecY = Math.sin(source.rotation) * speed;

        body.setVelocity(vecX, vecY);

        // Return Logic
        this.scene.time.delayedCall(400, () => {
            if (projectile.active) {
                // Tween velocity back to source? Or Physics?
                // Simple physics return
                this.scene.physics.moveTo(projectile, source.x, source.y, speed);
            }
        });
        this.scene.time.delayedCall(1200, () => projectile.destroy());
    }
}
