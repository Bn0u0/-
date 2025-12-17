import Phaser from 'phaser';
import { IPoolable } from '../core/ObjectPool';

// Physics is handled by the group/manager
export class Projectile extends Phaser.GameObjects.Arc implements IPoolable {
    public damage: number;
    public duration: number;
    public speed: number;
    public heading: Phaser.Math.Vector2;
    public ownerId: string;
    public isHoming: boolean = false;
    public target?: any; // Enemy

    constructor(scene: Phaser.Scene) {
        super(scene, 0, 0, 6, 0, 360, false, 0xffffff, 1);
        // Stats initialized in onEnable
        this.damage = 0;
        this.ownerId = '';
        this.heading = new Phaser.Math.Vector2(1, 0);
        this.speed = 0;
        this.duration = 0;

        // Physics added by Manager/Pool usually if added to group,
        // but if we manage it here:
        scene.add.existing(this);
        scene.physics.add.existing(this);
    }

    onEnable(x: number, y: number, angle: number, speed: number, duration: number, color: number, damage: number, ownerId: string) {
        this.setPosition(x, y);
        this.setActive(true);
        this.setVisible(true);

        this.heading.set(Math.cos(angle), Math.sin(angle));
        this.speed = speed;
        this.duration = duration;
        this.damage = damage;
        this.ownerId = ownerId;
        this.setFillStyle(color, 1);

        const body = this.body as Phaser.Physics.Arcade.Body;
        body.enable = true;
        body.setVelocity(this.heading.x * this.speed, this.heading.y * this.speed);
    }

    onDisable() {
        this.setActive(false);
        this.setVisible(false);
        const body = this.body as Phaser.Physics.Arcade.Body;
        if (body) body.enable = false;
    }

    // Compat method for existing code that might call fire()
    fire(x: number, y: number, angle: number, speed: number, duration: number, color: number, damage?: number, ownerId?: string) {
        // Assume context provides damage/owner via other set methods or just default
        // This is a legacy hook. Ideally code calls pool.get() which calls onEnable.
        // If we reuse this instance manually:
        const finalDamage = damage !== undefined ? damage : this.damage;
        const finalOwner = ownerId !== undefined ? ownerId : this.ownerId;
        this.onEnable(x, y, angle, speed, duration, color, finalDamage, finalOwner);
    }

    update(time: number, delta: number) {
        if (!this.active) return;

        this.duration -= delta;

        if (this.isHoming && this.target && this.target.active) {
            const angle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
            const currentAngle = Math.atan2(this.heading.y, this.heading.x);
            const nextAngle = Phaser.Math.Angle.RotateTo(currentAngle, angle, 0.1);

            this.heading.set(Math.cos(nextAngle), Math.sin(nextAngle));
            const body = this.body as Phaser.Physics.Arcade.Body;
            body.setVelocity(this.heading.x * this.speed, this.heading.y * this.speed);
        }

        if (this.duration <= 0) {
            // Self-release logic is tricky without reference to pool.
            // For now, just disable. Manager loop should find it/reuse it if it scans.
            // OR use event to tell manager to release me.
            this.setActive(false);
            this.setVisible(false);
            if (this.body) (this.body as Phaser.Physics.Arcade.Body).enable = false;
        }
    }
}
