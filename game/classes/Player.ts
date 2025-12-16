import Phaser from 'phaser';
import { COLORS, PHYSICS, FX } from '../../constants';
import { LootItemDef } from '../../services/LootService';

export enum Role {
    Vanguard = 'Vanguard',
    Weaver = 'Weaver',
}

export class Player extends Phaser.GameObjects.Container {
    public id: string;
    public isLocal: boolean;
    declare public body: Phaser.Physics.Arcade.Body;
    public speedMultiplier: number = 1.0;
    public shielded: boolean = false;

    declare public scene: Phaser.Scene;
    declare public x: number;
    declare public y: number;
    declare public rotation: number;
    declare public active: boolean;

    declare public add: (child: Phaser.GameObjects.GameObject | Phaser.GameObjects.GameObject[]) => this;
    declare public setScale: (x: number, y?: number) => this;
    declare public setRotation: (radians?: number) => this;
    declare public setDepth: (value: number) => this;

    private coreShape: Phaser.GameObjects.Graphics;
    private emitter: Phaser.GameObjects.Particles.ParticleEmitter;
    private shadow: Phaser.GameObjects.Ellipse; // 2.5D Anchor

    // 2.5D Coordinates
    public z: number = 0;
    public zVelocity: number = 0;

    // Dash
    private isDashing: boolean = false;
    private dashTimer: number = 0;
    private dashCooldown: number = 0;

    // Inventory
    public lootBag: LootItemDef[] = [];

    constructor(scene: Phaser.Scene, x: number, y: number, id: string, isLocal: boolean) {
        super(scene, x, y);
        this.id = id;
        this.isLocal = isLocal;
        // Role-specific override point


        // 0. Shadow (Ground anchor)
        this.shadow = scene.add.ellipse(0, 0, 40, 15, 0x000000, 0.4);
        this.shadow.setDepth(5); // Below players
        this.add(this.shadow); // NOTE: We might want shadow DETACHED to stay on ground if jumping. 
        // For simplicity, if z changes, we offset the CONTAINER content, not the container itself.
        // Actually, distinct shadow object is better if we want container to represent hitbox.
        // Let's keep physics body (hitbox) grounded. The SPRITE jumps.

        // ... But Player extends Container. The Container IS the physics body.
        // So: Container = Ground Position (Hitbox).
        // Visual Elements (coreShape, emitter) = Offset by -z.
        // Shadow = At Container (0,0).

        // 1. Particle Trail (The Wake)
        if (!scene.textures.exists('flare')) {
            const graphics = scene.make.graphics({ x: 0, y: 0 });
            graphics.fillStyle(0xffffff, 1);
            graphics.fillCircle(4, 4, 4);
            graphics.generateTexture('flare', 8, 8);
        }

        this.emitter = scene.add.particles(0, 0, 'flare', {
            speed: 10,
            scale: { start: 0.6, end: 0 },
            alpha: { start: 0.6, end: 0 },
            lifespan: FX.particles.lifespan,
            blendMode: 'ADD',
            frequency: FX.particles.interval,
            follow: this,
            tint: isLocal ? COLORS.primary : COLORS.secondary
        });
        this.emitter.setDepth(-1);

        // 2. Geometric Body (Hexagon)
        this.coreShape = scene.add.graphics();
        this.drawHexagon(isLocal ? COLORS.primary : COLORS.secondary);
        this.add(this.coreShape);

        // 3. Direction Indicator
        if (isLocal) {
            const arrow = scene.add.triangle(0, -22, 0, 0, 8, 12, -8, 12, 0xffffff);
            arrow.setOrigin(0.5, 0.5);
            arrow.setAlpha(0.6);
            this.add(arrow);
        }

        // 4. Physics Setup
        scene.add.existing(this);
        scene.physics.add.existing(this);

        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setCircle(16, -16, -16);
        body.setDrag(PHYSICS.drag);
        body.setDamping(false);
        body.setMaxVelocity(PHYSICS.maxVelocity);
        body.setCollideWorldBounds(false);
    }

    drawHexagon(color: number) {
        this.coreShape.clear();

        // Outer Glow Ring
        this.coreShape.lineStyle(2, color, 0.4);
        this.coreShape.strokeCircle(0, 0, 24);

        // Inner Hexagon
        this.coreShape.fillStyle(COLORS.bg, 1);
        this.coreShape.lineStyle(2, 0xffffff, 1);

        const radius = 12;
        const points: { x: number, y: number }[] = [];
        for (let i = 0; i < 6; i++) {
            const angle_deg = 60 * i - 30;
            const angle_rad = Math.PI / 180 * angle_deg;
            points.push({
                x: radius * Math.cos(angle_rad),
                y: radius * Math.sin(angle_rad)
            });
        }

        this.coreShape.beginPath();
        this.coreShape.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            this.coreShape.lineTo(points[i].x, points[i].y);
        }
        this.coreShape.closePath();
        this.coreShape.fillPath();
        this.coreShape.strokePath();

        // Central Core
        this.coreShape.fillStyle(color, 1);
        this.coreShape.fillCircle(0, 0, 5);
    }

    update() {
        const body = this.body as Phaser.Physics.Arcade.Body;
        const dt = 16.6;

        // 2.5D Height Physics (Simple Gravity)
        if (this.z > 0 || this.zVelocity !== 0) {
            this.z += this.zVelocity;
            this.zVelocity -= 0.8; // Gravity
            if (this.z < 0) {
                this.z = 0;
                this.zVelocity = 0;
                // Land visuals?
            }
        }

        // Apply Z offset to visuals
        this.coreShape.y = -this.z;
        this.shadow.setScale(1 - (this.z / 200)); // Shadow shrinks
        this.shadow.setAlpha(0.4 - (this.z / 300));

        // Dash Logic
        if (this.dashCooldown > 0) this.dashCooldown -= dt;
        if (this.isDashing) {
            this.dashTimer -= dt;
            if (this.dashTimer <= 0) {
                this.isDashing = false;
                body.drag.set(PHYSICS.drag); // Restore drag
                body.maxVelocity.set(PHYSICS.maxVelocity);
            }
            return; // Skip normal movement updates during dash if we strictly lock it
        }

        // Visual: Breathing Pulse based on speed
        const speedRatio = body.velocity.length() / PHYSICS.maxVelocity;
        const scalePulse = 1 + Math.sin(this.scene.time.now / 200) * 0.05 + (speedRatio * 0.1);
        this.setScale(scalePulse);

        // Visual: Inner Rotate
        this.coreShape.rotation += 0.02 + (speedRatio * 0.1);
        this.coreShape.y = -this.z; // Ensure it sticks

        // Update Particles
        if (body.velocity.length() > 50) {
            this.emitter.active = true;
            // Offset particles to rear
            const angle = this.rotation + Math.PI / 2;
            const lift = -this.z; // Particles float with player? Or stay on ground? 
            // Let's keep them on ground for wake effect.
            this.emitter.followOffset.set(
                Math.cos(angle) * 15,
                Math.sin(angle) * 15
            );
        } else {
            this.emitter.active = false;
        }
    }

    public dash() {
        if (this.dashCooldown > 0) return;

        this.isDashing = true;
        this.dashTimer = 200; // 200ms dash
        this.dashCooldown = 1500; // 1.5s cd

        // Physics push
        const body = this.body as Phaser.Physics.Arcade.Body;
        const speed = 800; // Dash speed
        const angle = this.rotation - Math.PI / 2; // Current facing

        body.drag.set(0);
        body.maxVelocity.set(1000);
        body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

        // Visual jump
        this.zVelocity = 10; // Hop

        // Visual flash
        this.scene.tweens.add({
            targets: this.coreShape,
            scale: { from: 1.5, to: 1 },
            duration: 200
        });
    }

    destroy(fromScene?: boolean) {
        this.emitter.destroy();
        super.destroy(fromScene);
    }

    // Virtual metods for subclasses
    public updateCombat(enemies: Phaser.GameObjects.Group, projectiles: Phaser.GameObjects.Group) { }
}