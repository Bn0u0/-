import Phaser from 'phaser';

export class Projectile extends Phaser.GameObjects.Arc {
    public damage: number;
    public duration: number;
    public speed: number;
    public heading: Phaser.Math.Vector2;
    public ownerId: string;
    public isHoming: boolean = false;
    public target?: any; // Enemy

    constructor(scene: Phaser.Scene, x: number, y: number, damage: number, ownerId: string) {
        super(scene, x, y, 6, 0, 360, false, 0xffffff, 1);
        this.damage = damage;
        this.ownerId = ownerId;
        this.heading = new Phaser.Math.Vector2(1, 0);
        this.speed = 400;
        this.duration = 2000;

        scene.add.existing(this);
        scene.physics.add.existing(this);
    }

    fire(x: number, y: number, angle: number, speed: number, duration: number, color: number) {
        this.setPosition(x, y);
        this.setActive(true);
        this.setVisible(true);
        this.heading.set(Math.cos(angle), Math.sin(angle));
        this.speed = speed;
        this.duration = duration;
        this.setFillStyle(color, 1);

        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setVelocity(this.heading.x * this.speed, this.heading.y * this.speed);
    }

    update(time: number, delta: number) {
        this.duration -= delta;

        if (this.isHoming && this.target && this.target.active) {
            const angle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
            // Lerp angle for smooth homing
            const currentAngle = Math.atan2(this.heading.y, this.heading.x);
            const nextAngle = Phaser.Math.Angle.RotateTo(currentAngle, angle, 0.1);

            this.heading.set(Math.cos(nextAngle), Math.sin(nextAngle));
            const body = this.body as Phaser.Physics.Arcade.Body;
            body.setVelocity(this.heading.x * this.speed, this.heading.y * this.speed);
        }

        if (this.duration <= 0) {
            this.destroy();
        }
    }
}
