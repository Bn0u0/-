import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { Projectile } from './Projectile';

export class EnemySentinel extends Enemy {
    private aimTimer: number = 0;
    private fireInterval: number = 3000;
    private laserSight: Phaser.GameObjects.Graphics;
    private target: Phaser.GameObjects.Sprite | null = null;
    private isAiming: boolean = false;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y);

        // Visuals: Triangle/Pyramid
        this.graphics.clear();
        this.graphics.fillStyle(0x00FF00, 1); // Neon Green
        this.graphics.beginPath();
        this.graphics.moveTo(0, -15);
        this.graphics.lineTo(10, 10);
        this.graphics.lineTo(-10, 10);
        this.graphics.closePath();
        this.graphics.fillPath();

        // Eye (Red dot)
        this.graphics.fillStyle(0xFF0000, 1);
        this.graphics.fillCircle(0, -5, 3);

        this.laserSight = scene.add.graphics();
        this.add(this.laserSight);
        this.laserSight.setDepth(-1);

        this.hp = 30; // Low HP
        this.speed = 120; // Fast
        this.damage = 25; // High Dmg
    }

    update() {
        super.update();
        if (this.isDead || !this.active) {
            this.laserSight.clear();
            return;
        }

        const dt = 16.6;
        this.aimTimer += dt;

        // Behavior: Flee if too close, Aim if mid-range
        if (this.target && this.target.active) {
            const dist = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);

            // Aim Logic
            const angle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
            this.setRotation(angle + Math.PI / 2); // Adjust for sprite orientation

            this.drawLaser(dist);

            if (this.aimTimer > this.fireInterval) {
                this.fire(angle);
                this.aimTimer = 0;
            }

            // Flee Logic
            if (dist < 200) {
                const fleeAngle = angle + Math.PI;
                this.scene.physics.velocityFromRotation(fleeAngle, this.speed, (this.body as Phaser.Physics.Arcade.Body).velocity);
            } else {
                (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
            }
        } else {
            this.laserSight.clear();
        }
    }

    seekPlayer(players: any[]) {
        // Sentinel picks one target and sticks to it? Or nearest?
        // Let's just find nearest to lock on
        let closest: any = null;
        let dist = 9999;
        for (const p of players) {
            if (!p || !p.active) continue;
            const d = Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y);
            if (d < dist) {
                dist = d;
                closest = p;
            }
        }
        this.target = closest;
    }

    private drawLaser(dist: number) {
        this.laserSight.clear();
        const alpha = Math.min(1, this.aimTimer / this.fireInterval);

        // 2.5D height offset simulation? simplified here
        this.laserSight.lineStyle(2 * alpha, 0xFF0000, alpha * 0.5);
        this.laserSight.beginPath();
        this.laserSight.moveTo(0, 0);
        this.laserSight.lineTo(0, -dist); // Relative to local space
        this.laserSight.strokePath();
    }

    private fire(angle: number) {
        // Create Projectile
        // We need access to Projectile Group or Scene factory. 
        // Current architecture relies on independent Projectiles or Manager.
        // Let's create one independent for now or use scene event?
        // Since we refactored ObjectPool, we *should* use it.
        // But `this.scene` doesn't expose the pool directly unless we cast to MainScene.
        // For MVP, instantiation is okay if pool handles cleanup, OR we cast.

        // Using direct instantiation for now, assuming CombatManager picks it up via Group?
        // Wait, CombatManager creates the group. Projectiles *must* be in that group to collide.
        // Sentinel cannot easily add to CombatManager's group without reference.
        // Hack: Use `new Projectile` and assume it works? 
        // `CombatManager` adds `new Projectile(scene)` to its group? No, it adds in factory.
        // `new Projectile(scene)` adds ITSELF to scene.add, but NOT to physics group unless we explicitly do so.
        // MainScene exposes `projectileGroup`.

        const mainScene = this.scene as any;
        if (mainScene.projectileGroup) {
            const p = new Projectile(this.scene);
            mainScene.projectileGroup.add(p); // Important!

            // Railgun shot: Fast, pierces?
            p.fire(this.x, this.y, angle, 800, 2000, 0xFF0000, this.damage, 'enemy');

            // Kickback
            const body = this.body as Phaser.Physics.Arcade.Body;
            body.setVelocity(Math.cos(angle + Math.PI) * 200, Math.sin(angle + Math.PI) * 200);
        }
    }
}
