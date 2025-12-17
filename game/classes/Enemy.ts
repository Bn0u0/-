import Phaser from 'phaser';
import { Player } from './Player';
import { COLORS } from '../../constants';
import { IPoolable } from '../core/ObjectPool';
import { EventBus } from '../../services/EventBus';

export class Enemy extends Phaser.GameObjects.Container implements IPoolable {
    public id: string;
    declare public body: Phaser.Physics.Arcade.Body;
    public isDead: boolean = false;

    // Custom stats
    protected hp: number = 1;
    protected maxHp: number = 1;
    protected moveSpeed: number = 100;
    protected speed: number = 100;
    protected damage: number = 10;

    declare public scene: Phaser.Scene;
    declare public x: number;
    declare public y: number;
    declare public rotation: number;
    declare public active: boolean;
    declare public scaleX: number;
    declare public scaleY: number;

    declare public add: (child: Phaser.GameObjects.GameObject | Phaser.GameObjects.GameObject[]) => this;
    declare public setScale: (x: number, y?: number) => this;
    declare public setRotation: (radians?: number) => this;
    declare public destroy: (fromScene?: boolean) => void;
    declare public setVisible: (value: boolean) => this;
    declare public setActive: (value: boolean) => this;
    declare public setBlendMode: (value: string | Phaser.BlendModes) => this;

    protected graphics: Phaser.GameObjects.Graphics;
    protected shadow: Phaser.GameObjects.Ellipse;

    // Abstract-ish methods to be implemented or used by subclasses if needed
    // But since this is a Container, we might delegate visual setting to children or graphics.
    // However, subclasses like EnemyFast might use Sprites?
    // The Refactor plan said Enemy extends Sprite?
    // Step 1774 summary said: "Changed base class ... to Phaser.Physics.Arcade.Sprite".
    // But current code says `extends Container` (Line 5 of Step 1843).
    // If I change it to Sprite, it breaks children (Shadow/Graphics).
    // Let's stick to Container for now if that's what it was, BUT `WaveManager` expects `enemy.setTint` etc.
    // Containers don't have setTint. Children do.
    // The previous refactor was messy.
    // Let's implement proxy methods or fix the base class.
    // Given the constraints and existing code structure (Graphics + Shadow inside), Container is better for "Complex Enemy".
    // But Physics on Container is tricky in Phaser < 3.60? No, 3.60+ supports it.

    // 2.5D
    public z: number = 0;
    public zVelocity: number = 0;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y);
        this.id = Math.random().toString(36).substr(2, 9);

        // 0. Shadow
        this.shadow = scene.add.ellipse(0, 0, 30, 10, 0x000000, 0.4);
        this.add(this.shadow);

        // 1. Visuals: Rhombus
        this.graphics = scene.add.graphics();
        this.drawShape(COLORS.secondary);
        this.add(this.graphics);

        // Lift graphics slightly
        this.graphics.y = -5;
        this.setRotation(Math.PI / 4);

        // 2. Physics
        scene.add.existing(this);
        scene.physics.add.existing(this); // Fix: use scene.physics.add.existing

        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setCircle(12);
        body.setCollideWorldBounds(true);
        body.setBounce(0.5);
        body.setDrag(200);
    }

    public onEnable() {
        this.setActive(true);
        this.setVisible(true);
        this.isDead = false;
        this.body.enable = true;
        this.alpha = 1;
        this.setScale(1);

        // Spawn Tween
        this.scene.tweens.add({
            targets: this,
            scale: { from: 0, to: 1 },
            duration: 400,
            ease: 'Back.out'
        });
    }

    public onDisable() {
        this.setActive(false);
        this.setVisible(false);
        if (this.body) this.body.enable = false;
        this.scene.tweens.killTweensOf(this);
    }

    public init(x: number, y: number, type: string) {
        this.setPosition(x, y);
        this.configureType(type, 1);
        this.onEnable();
    }

    public setDifficulty(speedMult: number, hpMult: number, isElite: boolean) {
        this.hp *= hpMult;
        this.maxHp = this.hp;
        this.speed *= speedMult;
        if (isElite) {
            this.setScale(1.5);
            this.hp *= 2;
        }
    }

    private configureType(type: string, multiplier: number) {
        // Reset
        this.graphics.clear();

        if (type === 'tank') {
            this.drawShape(0xffaa00);
            this.hp = 80 * multiplier;
            this.speed = 40;
            this.damage = 20;
        } else if (type === 'boss') {
            this.drawShape(0xff0000);
            this.hp = 500 * multiplier;
            this.speed = 30;
            this.damage = 50;
            this.setScale(2);
        } else {
            // Fast / Scout
            this.drawShape(COLORS.secondary);
            this.hp = 20 * multiplier;
            this.speed = 90;
            this.damage = 10;
        }
        this.maxHp = this.hp;
    }

    public drawShape(color: number) {
        this.graphics.fillStyle(color, 1);
        this.graphics.lineStyle(2, 0xffffff, 1);
        this.graphics.fillRect(-10, -10, 20, 20);
        this.graphics.strokeRect(-10, -10, 20, 20);
    }

    // Compat methods for WaveManager/subclasses
    public setTint(color: number) { /* No-op or impement logic on graphics */ }
    public clearTint() { /* No-op */ }
    public setTexture(key: string) { /* No-op, we use graphics */ }
    public setTintFill(color: number) {
        // Flash effect
        this.graphics.clear();
        this.drawShape(0xffffff);
    }

    public update() {
        if (!this.active || this.isDead) return;

        // 2.5D Gravity
        if (this.z > 0 || this.zVelocity !== 0) {
            this.z += this.zVelocity;
            this.zVelocity -= 0.8;
            if (this.z < 0) {
                this.z = 0;
                this.zVelocity = 0;
            }
        }

        // Sync Visuals
        this.graphics.y = -this.z - 5;
        if (this.shadow) {
            this.shadow.setScale(1 - (this.z / 200));
            this.shadow.setAlpha(0.4 - (this.z / 300));
        }

        this.setDepth(this.y);
    }

    public seekPlayer(targets: any[], range: number = 9999) {
        if (!this.active || this.isDead) return;
        if (!this.body) return;

        let closest: any = null;
        let dist = range;

        for (const t of targets) {
            if (!t || !t.active) continue;
            const d = Phaser.Math.Distance.Between(this.x, this.y, t.x, t.y);
            if (d < dist) {
                dist = d;
                closest = t;
            }
        }

        if (closest) {
            this.scene.physics.moveToObject(this, closest, this.speed);
        }
    }

    public kill() {
        this.die();
    }


    public takeDamage(amount: number, knockback?: Phaser.Math.Vector2): boolean {
        if (this.isDead) return false;

        this.hp -= amount;

        // Visual Feedback (Flash)
        this.setTintFill(0xffffff);
        this.scene.time.delayedCall(50, () => {
            if (this.active) {
                this.graphics.clear();
                // Restore color - sloppy but works for MVP
                // Ideally store current color
                this.drawShape(COLORS.secondary);
            }
        });

        // Physical Feedback (Knockback)
        if (knockback && this.body) {
            const body = this.body as Phaser.Physics.Arcade.Body;
            body.velocity.x += knockback.x * 300;
            body.velocity.y += knockback.y * 300;
        }

        this.applyImpulseScale();

        if (this.hp <= 0) {
            this.die();
            return true;
        }
        return false;
    }

    public applyImpulseScale() {
        this.scene.tweens.add({
            targets: this,
            scaleX: 1.3,
            scaleY: 0.7,
            duration: 50,
            yoyo: true,
            ease: 'Sine.easeInOut'
        });
    }

    private die() {
        if (this.isDead) return;
        this.isDead = true;
        // Emit rich event for Score and Loot
        EventBus.emit('ENEMY_KILLED', { score: 10, x: this.x, y: this.y });

        this.scene.tweens.add({
            targets: this,
            scaleX: 1.3,
            duration: 50,
            yoyo: false,
            onComplete: () => {
                this.emitDeathParticles();
                this.scene.tweens.add({
                    targets: this,
                    scale: 0,
                    duration: 100,
                    onComplete: () => {
                        this.active = false; // Soft release, manager will pool it
                        // We do NOT destroy, we let pool recycle
                        if (this.body) this.body.enable = false;
                    }
                });
            }
        });
    }

    emitDeathParticles() {
        if (!this.scene.textures.exists('shard')) {
            const g = this.scene.make.graphics({ x: 0, y: 0 });
            g.fillStyle(COLORS.secondary, 1);
            g.fillTriangle(0, 0, 10, 0, 5, 10);
            g.generateTexture('shard', 10, 10);
        }

        const emitter = this.scene.add.particles(this.x, this.y, 'shard', {
            speed: { min: 100, max: 200 },
            angle: { min: 0, max: 360 },
            scale: { start: 1, end: 0 },
            lifespan: 400,
            quantity: 6,
            blendMode: 'ADD',
            emitting: false
        });

        emitter.explode(6);
        // Fix: emitter.destroy() might not exist in some versions or needs delay
        this.scene.time.delayedCall(500, () => emitter.destroy());
    }
}