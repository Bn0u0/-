import Phaser from 'phaser';
import { Player } from './Player';
import { COLORS } from '../../constants';
import { IPoolable } from '../core/ObjectPool';
import { EnemyConfig } from '../factories/EnemyFactory';

export class Enemy extends Phaser.GameObjects.Container implements IPoolable {
    public id: string;
    declare public body: Phaser.Physics.Arcade.Body;
    public isDead: boolean = false;

    // Config & Stats
    public config: EnemyConfig | null = null;
    public hp: number = 10;
    public maxHp: number = 10;
    public speed: number = 100;
    public damage: number = 10;
    public value: number = 10;

    // AI State
    private aiState: 'IDLE' | 'CHASE' | 'WINDUP' | 'DASH' | 'RECOVER' = 'CHASE';
    private aiTimer: number = 0;
    private target: Player | null = null;

    // Visuals (Hierarchical)
    protected graphics: Phaser.GameObjects.Graphics; // Main Body
    protected subPart: Phaser.GameObjects.Graphics;  // Moving Part (Ring, Legs)
    protected shadow: Phaser.GameObjects.Ellipse;

    // 2.5D
    public z: number = 0;
    public zVelocity: number = 0;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y);
        this.id = Math.random().toString(36).substr(2, 9);

        // Shadow
        this.shadow = scene.add.ellipse(0, 0, 30, 10, 0x000000, 0.4);
        this.add(this.shadow);

        // Sub Part (Behind or scalable)
        this.subPart = scene.add.graphics();
        this.add(this.subPart);

        // Main Body
        this.graphics = scene.add.graphics();
        this.add(this.graphics);

        // Physics
        scene.add.existing(this);
        scene.physics.add.existing(this);
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setCircle(12);
        body.setBounce(0.5);
        body.setDrag(200);
        body.setCollideWorldBounds(true);
    }

    configure(config: EnemyConfig) {
        this.config = config;
        this.hp = config.stats.hp;
        this.maxHp = config.stats.hp;
        this.speed = config.stats.speed;
        this.damage = config.stats.damage;
        this.value = config.stats.value;

        // Reset AI
        this.aiState = 'CHASE';
        this.aiTimer = 0;

        // Visuals
        this.drawAlienArchitecture(config.id, config.stats.color, config.stats.radius);

        // Physics Body
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setCircle(config.stats.radius, -config.stats.radius + 12, -config.stats.radius + 12);
        // Note: Offset simplified, usually handled by container center. 
        // Container (0,0) is center. Circle center is top-left of circle.
        // setCircle(radius, offsetX, offsetY).
        body.setCircle(config.stats.radius, -config.stats.radius, -config.stats.radius);
    }

    private drawAlienArchitecture(id: string, color: number, radius: number) {
        const g = this.graphics;
        const sub = this.subPart;
        g.clear();
        sub.clear(); // Reset sub parts

        const dark = Phaser.Display.Color.IntegerToColor(color).darken(30).color;
        const light = Phaser.Display.Color.IntegerToColor(color).lighten(30).color;

        switch (id) {
            case 'JELLY': // Blob
                // Core
                g.fillStyle(color, 1);
                g.fillCircle(0, 0, radius * 0.6);
                // Outer Shell (Translucent)
                g.fillStyle(color, 0.3);
                g.fillCircle(0, 0, radius);
                // Shine
                g.fillStyle(0xffffff, 0.8);
                g.fillEllipse(-radius * 0.3, -radius * 0.3, radius * 0.4, radius * 0.2);
                break;

            case 'TRI_DART': // Rotating Pyramid
                // We'll rotate the main graphics in update logic if needed, or subPart
                g.fillStyle(color, 1);
                g.fillTriangle(0, -radius, radius, radius, -radius, radius);
                g.lineStyle(2, light, 1);
                g.strokeTriangle(0, -radius, radius, radius, -radius, radius);
                // Center Detail
                g.fillStyle(0x000000, 1);
                g.fillCircle(0, 0, 4);
                break;

            case 'SENTINEL': // Eye + Ring
                // Ring (SubPart) - Handled in update for rotation
                sub.lineStyle(3, color, 1);
                sub.strokeCircle(0, 0, radius + 4);
                sub.lineStyle(1, light, 0.5);
                sub.strokeCircle(0, 0, radius + 8);
                // Eye (Main)
                g.fillStyle(0x111111, 1);
                g.fillCircle(0, 0, radius);
                g.lineStyle(2, color, 1);
                g.strokeCircle(0, 0, radius);
                // Pupil
                g.fillStyle(0xff0000, 1);
                g.fillRect(-4, -2, 8, 4);
                break;

            case 'CRAB': // Heavy Block
                // Legs (SubPart)
                sub.lineStyle(4, dark, 1);
                // Static legs pose, animated in update?
                // Let's just draw fixed legs for now, maybe twitch them
                sub.beginPath();
                sub.moveTo(-radius, 0); sub.lineTo(-radius * 1.5, radius);
                sub.moveTo(radius, 0); sub.lineTo(radius * 1.5, radius);
                sub.strokePath();

                // Body
                g.fillStyle(dark, 1);
                g.fillRoundedRect(-radius, -radius * 0.8, radius * 2, radius * 1.6, 4);
                // Top Plate
                g.fillStyle(color, 1);
                g.fillRoundedRect(-radius + 2, -radius * 0.8 + 2, radius * 2 - 4, radius * 1.6 - 4, 4);
                break;

            default:
                g.fillStyle(color, 1);
                g.fillCircle(0, 0, radius);
                break;
        }
    }

    // Called by MainScene update loop
    update(time: number, delta: number, player: Player) {
        if (this.isDead || !this.body) return;
        if (!this.config) return;

        // --- ANIMATION UPDATES ---
        if (this.config.id === 'TRI_DART') {
            this.rotation += 0.05; // Spin entire body
        }
        else if (this.config.id === 'SENTINEL') {
            this.subPart.rotation -= 0.02; // Spin ring counter-clockwise
            // Face player logic overrides body rotation?
            // Sentinel usually faces player. The body rotation will be set by behavior.
            // But subPart is a child, so it rotates relative to body. 
            // If body rotates to face player, ring rotates relative to that.
        }
        else if (this.config.id === 'JELLY') {
            // Squish effect
            const scale = 1 + Math.sin(time / 150) * 0.1;
            this.setScale(scale, 1 / scale);
        }

        this.target = player;

        const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

        // AI Behavior Switch
        switch (this.config.ai.type) {
            case 'CHASE':
                this.behaviorChase(delta);
                break;
            case 'SWARM':
                this.behaviorSwarm(delta, time);
                break;
            case 'DASH':
                this.behaviorDash(delta, time, dist);
                break;
            case 'STRAFE':
                this.behaviorStrafe(delta, time, dist);
                break;
            case 'FLEE':
                this.behaviorFlee(delta, player);
                break;
            case 'STATIONARY':
                this.body.setVelocity(0, 0);
                this.rotation = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y) + Math.PI / 2;
                break;
            case 'ERRATIC':
                this.behaviorErratic(delta, time);
                break;
        }

        // Depth Sort
        this.setDepth(this.y);
    }

    // --- Behaviors ---

    private behaviorChase(delta: number) {
        if (!this.target) return;
        this.scene.physics.moveToObject(this, this.target, this.speed);
        this.rotation = this.body.velocity.angle() + Math.PI / 2;
    }

    private behaviorSwarm(delta: number, time: number) {
        if (!this.target) return;
        const angle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
        const wobble = Math.sin(time * 0.005 + (this.x % 10)) * 0.5; // Simple hash for wobble

        const velocity = new Phaser.Math.Vector2();
        velocity.setToPolar(angle + wobble, this.speed);

        this.body.setVelocity(velocity.x, velocity.y);
        this.rotation = velocity.angle() + Math.PI / 2;
    }

    private behaviorDash(delta: number, time: number, dist: number) {
        if (!this.target) return;
        const interval = this.config?.ai.interval || 2000;

        switch (this.aiState) {
            case 'CHASE':
                this.behaviorChase(delta);
                this.aiTimer += delta;
                if (this.aiTimer > interval && dist < 300) {
                    this.aiState = 'WINDUP';
                    this.aiTimer = 0;
                    this.body.setVelocity(0, 0);
                    this.scene.tweens.add({ targets: this, scale: 1.3, duration: 400, yoyo: true });
                }
                break;
            case 'WINDUP':
                this.aiTimer += delta;
                this.rotation = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y) + Math.PI / 2;
                if (this.aiTimer > 500) {
                    this.aiState = 'DASH';
                    this.aiTimer = 0;
                    this.scene.physics.moveToObject(this, this.target, this.speed * 3);
                }
                break;
            case 'DASH':
                this.aiTimer += delta;
                if (this.aiTimer > 300) {
                    this.aiState = 'RECOVER';
                    this.aiTimer = 0;
                    this.body.setVelocity(0, 0);
                }
                break;
            case 'RECOVER':
                this.aiTimer += delta;
                if (this.aiTimer > 1000) {
                    this.aiState = 'CHASE';
                    this.aiTimer = 0;
                }
                break;
        }
    }

    private behaviorStrafe(delta: number, time: number, dist: number) {
        if (!this.target) return;
        const range = this.config?.ai.range || 200;

        const angleToPlayer = Phaser.Math.Angle.Between(this.target.x, this.target.y, this.x, this.y);
        const newAngle = angleToPlayer + (this.speed * 0.02 * delta / range);

        const targetX = this.target.x + Math.cos(newAngle) * range;
        const targetY = this.target.y + Math.sin(newAngle) * range;

        this.scene.physics.moveTo(this, targetX, targetY, this.speed);
        this.rotation = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y) + Math.PI / 2;
    }

    private behaviorFlee(delta: number, player: Player) {
        const angle = Phaser.Math.Angle.Between(player.x, player.y, this.x, this.y);
        const velocity = new Phaser.Math.Vector2();
        velocity.setToPolar(angle + Math.PI, this.speed); // Variable name was inconsistent
        this.body.setVelocity(velocity.x, velocity.y);
        this.rotation = velocity.angle() + Math.PI / 2;
    }

    private behaviorErratic(delta: number, time: number) {
        this.aiTimer += delta;
        if (this.aiTimer > 500) {
            this.aiTimer = 0;
            const angle = Math.random() * Math.PI * 2;
            const velocity = new Phaser.Math.Vector2();
            velocity.setToPolar(angle, this.speed);
            this.body.setVelocity(velocity.x, velocity.y);
        }
        this.rotation += 0.1;
    }

    public takeDamage(amount: number): boolean {
        this.hp -= amount;
        this.graphics.alpha = 0.2;
        this.scene.tweens.add({ targets: this.graphics, alpha: 1, duration: 100 });
        if (this.hp <= 0) {
            this.die();
            return true;
        }
        return false;
    }

    public die() {
        this.isDead = true;
        this.setActive(false);
        this.setVisible(false);
        this.body.enable = false;
        (this.scene as any).events.emit('ENEMY_KILLED', this);
    }

    public onEnable() {
        this.setActive(true);
        this.setVisible(true);
        this.isDead = false;
        this.body.enable = true;
        this.alpha = 1;
        this.setScale(0);
        this.scene.tweens.add({ targets: this, scaleX: 1, scaleY: 1, duration: 300, ease: 'Back.out' });
    }

    public onDisable() {
        this.setActive(false);
        this.setVisible(false);
        this.body.enable = false;
    }
}