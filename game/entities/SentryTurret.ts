import Phaser from 'phaser';
import { EventBus } from '../../services/EventBus';
import { WeaponSystem } from '../systems/WeaponSystem';

export class SentryTurret extends Phaser.GameObjects.Container {
    private head: Phaser.GameObjects.Graphics;
    private base: Phaser.GameObjects.Graphics;
    private shadow: Phaser.GameObjects.Ellipse;

    // Logic
    private range: number = 250;
    private fireRate: number = 800; // ms
    private lastFireTime: number = 0;
    private lifespan: number = 10000;
    private maxLifespan: number = 10000;
    private weaponSystem: WeaponSystem;

    // State
    public hp: number = 50;
    private target: Phaser.GameObjects.GameObject | null = null;
    private isDead: boolean = false;

    constructor(scene: Phaser.Scene, x: number, y: number, weaponSystem: WeaponSystem) {
        super(scene, x, y);
        this.weaponSystem = weaponSystem;
        this.scene = scene;

        // Physics (Hard Collision)
        this.scene.physics.add.existing(this);
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setCircle(20, -20, -20);
        body.setImmovable(true); // Wall-like

        // Visuals
        this.createVisuals();

        // Intro Juice
        this.playDeployAnimation();

        // Add to scene
        scene.add.existing(this);
    }

    private createVisuals() {
        // Shadow
        this.shadow = this.scene.add.ellipse(0, 5, 40, 15, 0x000000, 0.4);
        this.add(this.shadow);

        // Base (Tripod)
        this.base = this.scene.add.graphics();
        this.base.fillStyle(0x333333);
        this.base.fillTriangle(0, -10, 15, 10, -15, 10);
        this.base.lineStyle(2, 0xFFFFFF);
        this.base.strokeTriangle(0, -10, 15, 10, -15, 10);
        this.add(this.base);

        // Head (Rotating Part)
        this.head = this.scene.add.graphics();
        this.head.fillStyle(0x0088FF); // Weaver Blue
        this.head.fillCircle(0, 0, 12);
        this.head.strokeCircle(0, 0, 12);

        // Barrel
        this.head.fillStyle(0x222222);
        this.head.fillRect(0, -4, 20, 8); // Gun barrel sticking out

        this.add(this.head);
    }

    private playDeployAnimation() {
        // Slam down
        this.y -= 50;
        this.alpha = 0;

        this.scene.tweens.add({
            targets: this,
            y: '+=50',
            alpha: 1,
            duration: 300,
            ease: 'Bounce.out',
            onComplete: () => {
                this.scene.cameras.main.shake(100, 0.005); // Impact Shake
                EventBus.emit('PLAY_SFX', 'TURRET_DEPLOY');
                // Dust particles would go here
            }
        });
    }

    update(time: number, delta: number, enemies: Phaser.GameObjects.Group) {
        if (this.isDead) return;

        // Lifecycle
        this.lifespan -= delta;
        if (this.lifespan <= 0) {
            this.die();
            return;
        }

        // Decay Visual (Flash Red when low)
        if (this.lifespan < 2000) {
            if (Math.floor(time / 200) % 2 === 0) {
                this.head.setAlpha(0.5);
            } else {
                this.head.setAlpha(1);
            }
        }

        // AI
        this.target = this.findTarget(enemies);
        if (this.target) {
            // Face Target
            const angle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, (this.target as any).y);
            this.head.rotation = angle;

            // Shoot
            if (time > this.lastFireTime + this.fireRate) {
                this.fire(angle);
                this.lastFireTime = time;
            }
        }
    }

    private findTarget(enemies: Phaser.GameObjects.Group): Phaser.GameObjects.GameObject | null {
        let closest = null;
        let minDist = this.range;

        enemies.getChildren().forEach((e: any) => {
            if (!e.active) return;
            const d = Phaser.Math.Distance.Between(this.x, this.y, e.x, e.y);
            if (d < minDist) {
                minDist = d;
                closest = e;
            }
        });

        return closest;
    }

    private fire(angle: number) {
        // Recoil
        this.scene.tweens.add({
            targets: this.head,
            x: -5 * Math.cos(angle),
            y: -5 * Math.sin(angle),
            duration: 50,
            yoyo: true
        });

        // Fire Projectile
        // We simulate a weapon instance
        const turretWeapon = {
            defId: 'turret_gun',
            computedStats: {
                damage: 5,
                range: this.range,
                speed: 600,
                projectileCount: 1
            }
        };

        const source = {
            x: this.x + Math.cos(angle) * 20,
            y: this.y + Math.sin(angle) * 20,
            rotation: angle,
            id: 'turret'
        };

        this.weaponSystem.fire(turretWeapon as any, source, {});
    }

    public takeDamage(amount: number) {
        this.hp -= amount;

        // Flash White
        this.base.setTintFill(0xFFFFFF);
        this.scene.time.delayedCall(50, () => this.base.clearTint());

        if (this.hp <= 0) {
            this.die();
        }
    }

    private die() {
        if (this.isDead) return;
        this.isDead = true;

        // Explosion
        // EventBus.emit('SPAWN_EFFECT', 'EXPLOSION', {x: this.x, y: this.y});

        // Visual Death
        this.scene.tweens.add({
            targets: this,
            scale: 0,
            alpha: 0,
            duration: 300,
            onComplete: () => this.destroy()
        });
    }
}
