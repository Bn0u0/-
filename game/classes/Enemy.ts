import Phaser from 'phaser';
import { Player } from './Player';
import { IPoolable } from '../core/ObjectPool';
import { EnemyConfig } from '../factories/EnemyFactory';

export class Enemy extends Phaser.GameObjects.Container implements IPoolable {
    public id: string;
    declare public body: Phaser.Physics.Arcade.Body;
    public isDead: boolean = false;

    // Core Stats
    public hp: number = 10;
    public maxHp: number = 10;
    public speed: number = 100;
    public damage: number = 10;
    public value: number = 10;

    // Operation Extinction: New Meta
    public faction: string = 'NONE'; // 'RUSTED' | 'GLITCHED' | 'OVERGROWN'
    public tier: number = 0;

    // Components
    protected graphics: Phaser.GameObjects.Graphics;
    protected shadow: Phaser.GameObjects.Ellipse;

    // Context
    private _scene: Phaser.Scene;
    private target: Player | null = null;

    constructor(scene: Phaser.Scene, x: number, y: number, faction: string = 'RUSTED') {
        super(scene, x, y);
        this._scene = scene;
        this.id = Phaser.Utils.String.UUID();
        this.faction = faction;

        // 1. Shadow
        this.shadow = scene.add.ellipse(0, 0, 30, 10, 0x000000, 0.4);
        this.add(this.shadow);

        // 2. Main Visual Body (Placeholder Graphics)
        this.graphics = scene.add.graphics();
        this.add(this.graphics);

        scene.add.existing(this);
        scene.physics.world.enable(this);

        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setCircle(20);
        body.setBounce(0.5);
        body.setDrag(200);
        body.setCollideWorldBounds(true);
    }

    configure(config: EnemyConfig) {
        // Basic Stat Injection
        this.hp = config.stats.hp;
        this.maxHp = config.stats.hp;
        this.speed = config.stats.speed;
        this.damage = config.stats.damage;
        this.value = config.stats.value;

        // Visual Reset
        this.graphics.clear();
        this.graphics.fillStyle(config.stats.color, 1);
        this.graphics.fillCircle(0, 0, config.stats.radius);

        // Physics Reset
        const body = this.body as Phaser.Physics.Arcade.Body;
        if (body) {
            body.setCircle(config.stats.radius, -config.stats.radius, -config.stats.radius);
        }
    }

    update(time: number, delta: number, player: Player) {
        if (this.isDead || !this.body) return;
        this.target = player;

        // [OPERATION EXTINCTION]
        // Legacy AI is purged. 
        // Entities are temporarily lobotomized.

        // Basic physics damping
        this.setDepth(this.y);
    }

    public takeDamage(amount: number): boolean {
        this.hp -= amount;

        // Basic Feedback
        this.alpha = 0.5;
        this._scene.tweens.add({
            targets: this,
            alpha: 1,
            duration: 100
        });

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
        (this._scene as any).events.emit('ENEMY_KILLED', this);
    }

    // [PROXY] Physics & Visuals Compat for CombatManager
    public setTintFill(color: number) {
        this.alpha = 0.5; // Fallback for Container
    }

    public clearTint() {
        this.alpha = 1;
    }

    public setMaxVelocity(v: number) {
        if (this.body) this.body.setMaxVelocity(v);
    }

    public setVelocity(x: number, y: number) {
        if (this.body) this.body.setVelocity(x, y);
    }

    public onEnable() {
        this.setActive(true);
        this.setVisible(true);
        this.isDead = false;
        if (this.body) this.body.enable = true;
        this.alpha = 1;
        this.setScale(1);
    }

    public onDisable() {
        this.setActive(false);
        this.setVisible(false);
        this.body.enable = false;
    }
}