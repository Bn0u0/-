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
        this.enemyVariant = type; // Store type for rendering

        if (type === 'tank') {
            // "Giant Geometric Golem"
            this.drawGolem(0xffd700); // Gold
            this.hp = 80 * multiplier;
            this.speed = 40;
            this.damage = 20;
        } else if (type === 'boss') {
            this.drawGolem(0xff77bc); // Boss Pink
            this.hp = 500 * multiplier;
            this.speed = 30;
            this.damage = 50;
            this.setScale(2);
        } else if (type === 'charger') {
            // "Bouncy Slime Block"
            this.drawSlime(0x00ffff); // Cyan
            this.hp = 30 * multiplier;
            this.speed = 120;
            this.damage = 15;
        } else {
            // Fast / Scout -> "Floating Neon Jellyfish"
            this.drawJellyfish(0xff77bc); // Hot Pink
            this.hp = 20 * multiplier;
            this.speed = 90;
            this.damage = 10;
        }
        this.maxHp = this.hp;
    }

    private enemyVariant: string = 'scout';

    // 1. Jellyfish (Sentinel)
    public drawJellyfish(color: number) {
        this.graphics.fillStyle(color, 0.3);
        // Head
        this.graphics.fillCircle(0, -5, 12);
        this.graphics.lineStyle(2, color, 1);
        this.graphics.strokeCircle(0, -5, 12);
        // Tentacles
        this.graphics.beginPath();
        this.graphics.moveTo(-5, 5); this.graphics.lineTo(-8, 15);
        this.graphics.moveTo(0, 5); this.graphics.lineTo(0, 18);
        this.graphics.moveTo(5, 5); this.graphics.lineTo(8, 15);
        this.graphics.strokePath();
    }

    // 2. Slime (Charger)
    public drawSlime(color: number) {
        this.graphics.fillStyle(color, 0.4);
        // Soft blob
        this.graphics.fillRoundedRect(-12, -8, 24, 20, 8);
        this.graphics.lineStyle(2, 0xffffff, 0.8);
        this.graphics.strokeRoundedRect(-12, -8, 24, 20, 8);
        // Eyes
        this.graphics.fillStyle(0xffffff, 1);
        this.graphics.fillCircle(-5, 0, 3);
        this.graphics.fillCircle(5, 0, 3);
    }

    // 3. Golem (Tank)
    public drawGolem(color: number) {
        this.graphics.fillStyle(color, 1);
        // Core Block
        this.graphics.fillRoundedRect(-15, -15, 30, 30, 4);
        // Hover Rings
        this.graphics.lineStyle(2, 0xffffff, 0.5);
        this.graphics.strokeCircle(0, 0, 22);
    }

    public drawShape(color: number) {
        // Fallback or generic usage
        this.drawJellyfish(color);
    }

    // Compat methods for WaveManager/subclasses
    public setTint(color: number) { /* No-op or impement logic on graphics */ }
    public clearTint() { /* No-op */ }
    public setTexture(key: string) { /* No-op, we use graphics */ }
    public setTintFill(color: number) {
        // Flash effect
        this.graphics.clear();
        this.graphics.fillStyle(0xffffff, 1);
        this.graphics.fillCircle(0, 0, 15); // Simple White flash
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
                // Bounce on landing
                this.scene.tweens.add({
                    targets: this,
                    scaleX: 1.2,
                    scaleY: 0.8,
                    duration: 100,
                    yoyo: true
                });
            }
        }

        // Jellyfish Hover Animation
        if (this.enemyVariant === 'scout' || this.enemyVariant === 'jelly') {
            this.z = 5 + Math.sin(this.scene.time.now / 300) * 3;
        }

        // Sync Visuals
        this.graphics.y = -this.z;
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
                // Restore logic
                if (this.enemyVariant === 'tank' || this.enemyVariant === 'boss') this.drawGolem(this.enemyVariant === 'boss' ? 0xff77bc : 0xffd700);
                else if (this.enemyVariant === 'charger') this.drawSlime(0x00ffff);
                else this.drawJellyfish(0xff77bc);
            }
        });

        // POP! Scale
        this.scene.tweens.add({
            targets: this,
            scale: 1.3,
            duration: 50,
            yoyo: true,
            ease: 'Back.out'
        });

        if (knockback && this.body) {
            const body = this.body as Phaser.Physics.Arcade.Body;
            body.velocity.x += knockback.x * 300;
            body.velocity.y += knockback.y * 300;
        }

        if (this.hp <= 0) {
            this.die();
            return true;
        }
        return false;
    }

    // ... applyImpulseScale ...

    private die() {
        if (this.isDead) return;
        this.isDead = true;
        // Emit rich event for Score and Loot
        EventBus.emit('ENEMY_KILLED', { score: 10, x: this.x, y: this.y });

        // POP Effect
        this.scene.tweens.add({
            targets: this,
            scaleX: 1.5,
            scaleY: 1.5,
            alpha: 0,
            duration: 100,
            yoyo: false,
            onComplete: () => {
                this.emitConfetti();
                this.active = false;
                if (this.body) this.body.enable = false;
            }
        });
    }

    emitConfetti() {
        if (!this.scene.textures.exists('confetti')) {
            const g = this.scene.make.graphics({ x: 0, y: 0 });
            g.fillStyle(0xffffff, 1);
            g.fillCircle(4, 4, 4);
            g.generateTexture('confetti', 8, 8);
        }

        // Multicolored Confetti
        const colors = [0x00FFFF, 0xFF77BC, 0xFFD700, 0xFFFFFF];

        const emitter = this.scene.add.particles(this.x, this.y, 'confetti', {
            speed: { min: 100, max: 250 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.8, end: 0 },
            lifespan: 600,
            quantity: 12,
            gravityY: 200, // Gravity for falling paper feel
            tint: colors,
            blendMode: 'NORMAL', // Opaque for paper look
            emitting: false
        });

        emitter.explode(12);
        this.scene.time.delayedCall(1000, () => emitter.destroy());
    }
}