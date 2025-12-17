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

    // Visuals
    protected graphics: Phaser.GameObjects.Graphics;
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

        // Visuals
        this.graphics = scene.add.graphics();
        this.add(this.graphics);

        // Physics
        scene.add.existing(this);
        scene.physics.add.existing(this);
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setCircle(12);
        body.setBounce(0.5); // Soft collision between enemies
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
        this.drawEnemy(config.stats.color, config.stats.radius);

        // Physics Body Size
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setCircle(config.stats.radius);
    }

    drawEnemy(color: number, radius: number) {
        this.graphics.clear();
        this.graphics.fillStyle(color, 1);
        this.graphics.lineStyle(2, 0xffffff, 0.8);

        // Shape based on ID or just generic abstract shapes
        switch (this.config?.id) {
            case 'TRI_DART':
                this.graphics.fillTriangle(-radius, radius, radius, radius, 0, -radius * 1.5);
                break;
            case 'CRAB':
                this.graphics.fillRect(-radius, -radius / 2, radius * 2, radius);
                break;
            case 'SENTINEL':
                this.graphics.strokeCircle(0, 0, radius);
                this.graphics.fillCircle(0, 0, radius * 0.6);
                break;
            default:
                // Diamond / Rhombus Standard
                this.graphics.beginPath();
                this.graphics.moveTo(0, -radius);
                this.graphics.lineTo(radius, 0);
                this.graphics.lineTo(0, radius);
                this.graphics.lineTo(-radius, 0);
                this.graphics.closePath();
                this.graphics.fillPath();
                this.graphics.strokePath();
        }
    }

    // Called by MainScene update loop
    update(time: number, delta: number, player: Player) {
        if (this.isDead || !this.body) return;
        if (!this.config) return;

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

    public takeDamage(amount: number) {
        this.hp -= amount;
        this.graphics.alpha = 0.2;
        this.scene.tweens.add({ targets: this.graphics, alpha: 1, duration: 100 });
        if (this.hp <= 0) {
            this.die();
        }
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