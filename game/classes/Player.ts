import Phaser from 'phaser';
import { COLORS, PHYSICS, FX } from '../../constants';
import { ItemDef } from '../data/Items';

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

    protected coreShape: Phaser.GameObjects.Graphics;
    public visualSprite?: Phaser.GameObjects.Sprite | Phaser.GameObjects.Container;
    private emitter: Phaser.GameObjects.Particles.ParticleEmitter;
    private shadow: Phaser.GameObjects.Ellipse; // 2.5D Anchor

    // 2.5D Coordinates (Simulated Height for Jumps/FX only - Pure 2D)
    public z: number = 0;
    public zVelocity: number = 0;

    // Dash State
    public isDashing: boolean = false;
    public isInvulnerable: boolean = false; // i-frame flag
    private dashTimer: number = 0;
    private dashCooldown: number = 0;

    // Inventory
    public lootBag: ItemDef[] = [];

    // Skills
    public cooldowns: { [key: string]: number } = {};
    public maxCooldowns: { [key: string]: number } = {};

    constructor(scene: Phaser.Scene, x: number, y: number, id: string, isLocal: boolean) {
        super(scene, x, y);
        this.id = id;
        this.isLocal = isLocal;

        // 0. Shadow (Ground anchor)
        this.shadow = scene.add.ellipse(0, 0, 40, 15, 0x000000, 0.4);
        this.shadow.setDepth(5);
        this.add(this.shadow);

        // 1. Particle Trail (The Wake - Softened)
        if (!scene.textures.exists('flare')) {
            const graphics = scene.make.graphics({ x: 0, y: 0 });
            graphics.fillStyle(0xffffff, 1);
            graphics.fillCircle(4, 4, 4);
            graphics.generateTexture('flare', 8, 8);
        }

        this.emitter = scene.add.particles(0, 0, 'flare', {
            speed: 10,
            scale: { start: 0.6, end: 0 },
            alpha: { start: 0.5, end: 0 },
            lifespan: 800, // Longer, floaty trails
            blendMode: 'ADD',
            frequency: 50,
            follow: this,
            tint: COLORS.primary
        });
        this.emitter.setDepth(-1);

        // 2. The Guardian (Soft Round Body)
        this.coreShape = scene.add.graphics();
        this.drawGuardian(isLocal ? COLORS.primary : COLORS.secondary);
        this.add(this.coreShape);

        // 3. Direction Indicator (Soft Triangle)
        if (isLocal) {
            const arrow = scene.add.triangle(0, -28, 0, 0, 6, 10, -6, 10, 0xffffff);
            arrow.setOrigin(0.5, 0.5);
            arrow.setAlpha(0.8);
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

    drawGuardian(color: number) {
        this.coreShape.clear();

        // Soft Glow
        this.coreShape.fillStyle(color, 0.2);
        this.coreShape.fillCircle(0, 0, 28);

        // Outer Ring
        this.coreShape.lineStyle(3, color, 1);
        this.coreShape.strokeCircle(0, 0, 20);

        // Inner Core (Pearl)
        this.coreShape.fillStyle(0xffffff, 1);
        this.coreShape.fillCircle(0, 0, 12);
        this.coreShape.fillStyle(color, 0.5);
        this.coreShape.fillCircle(0, 0, 8);
    }

    // Stats Container
    public stats = {
        atk: 10,
        crit: 0,
        cooldown: 0,
        speed: 0
    };

    update() {
        const body = this.body as Phaser.Physics.Arcade.Body;
        const dt = 16.6;

        // ... Cooldowns ...
        for (const key in this.cooldowns) {
            if (this.cooldowns[key] > 0) {
                this.cooldowns[key] -= dt;
            }
        }

        // Squash & Stretch Logic (Juice)
        const speed = body.velocity.length();
        const maxSpeed = body.maxVelocity.x || 500;

        // Base bounce (Idle breathing)
        let scaleX = 1 + Math.sin(this.scene.time.now / 300) * 0.05;
        let scaleY = 1 + Math.cos(this.scene.time.now / 300) * 0.05;

        // Movement Stretch
        if (speed > 50) {
            const stretchFactor = Math.min(speed / maxSpeed, 1) * 0.3; // Max 30% stretch
            scaleY += stretchFactor; // Elongate visuals? Actually usually X stretch Y squash or vice versa based on direction
            // Since we rotate the container, we can just stretch Y (forward axis)
            scaleX -= stretchFactor * 0.5; // Conservation of volume
        }

        // Apply Scale
        this.setScale(scaleX, scaleY);

        // Z-Height Logic
        if (this.z > 0 || this.zVelocity !== 0) {
            this.z += this.zVelocity;
            this.zVelocity -= 0.8;
            if (this.z < 0) {
                this.z = 0;
                this.zVelocity = 0;
                // Landing Squash
                this.scene.tweens.add({
                    targets: this,
                    scaleX: 1.4,
                    scaleY: 0.6,
                    duration: 100,
                    yoyo: true
                });
            }
        }
        this.coreShape.y = -this.z;
        if (this.visualSprite) this.visualSprite.y = -this.z;
        this.shadow.setScale((1 - (this.z / 200)) * scaleX); // Shadow matches squash
        this.shadow.setAlpha(0.4 - (this.z / 300));

        // Dash Logic
        if (this.dashCooldown > 0) this.dashCooldown -= dt;
        if (this.isDashing) {
            this.dashTimer -= dt;
            if (this.dashTimer <= 0) {
                this.isDashing = false;
                this.isInvulnerable = false;
                body.drag.set(PHYSICS.drag);
                this.updateMaxSpeed();
            }
            return;
        }

        this.updateMaxSpeed();

        // Particles
        if (speed > 50) {
            this.emitter.active = true;
            // Particles trail from behind
            const angle = this.rotation + Math.PI / 2; // Forward
            this.emitter.followOffset.set(-Math.cos(angle) * 10, -Math.sin(angle) * 10);
        } else {
            this.emitter.active = false;
        }
    }

    private updateMaxSpeed() {
        const body = this.body as Phaser.Physics.Arcade.Body;
        if (!body) return;
        const base = PHYSICS.maxVelocity;
        const bonus = base * (this.stats.speed || 0);
        body.setMaxVelocity(base + bonus);
    }

    public dash(direction?: Phaser.Math.Vector2) {
        if (this.dashCooldown > 0) return;

        // Calculate Cooldown with CDR
        const baseCd = 1200;
        const cdr = Math.min(0.5, this.stats.cooldown || 0);
        const finalCd = baseCd * (1 - cdr);

        this.isDashing = true;
        this.isInvulnerable = true;
        this.dashTimer = 250;
        this.dashCooldown = finalCd;

        // Physics push
        const body = this.body as Phaser.Physics.Arcade.Body;
        const speed = 1100 * (1 + (this.stats.speed || 0) * 0.5);

        body.drag.set(0);
        body.maxVelocity.set(1200);

        // Direction
        let vx = 0;
        let vy = 0;
        if (direction && (direction.x !== 0 || direction.y !== 0)) {
            vx = direction.x;
            vy = direction.y;
            this.rotation = Math.atan2(vy, vx) - Math.PI / 2;
        } else {
            const angle = this.rotation - Math.PI / 2;
            vx = Math.cos(angle);
            vy = Math.sin(angle);
        }

        body.setVelocity(vx * speed, vy * speed);
        this.zVelocity = 12;

        // JUICY DASH SQUASH
        // Stretch long in direction of movement
        this.scene.tweens.add({
            targets: this,
            scaleY: 1.6,
            scaleX: 0.6,
            duration: 150,
            yoyo: true,
            ease: 'Sine.easeInOut'
        });

        // Camera Shake (Soft)
        this.scene.cameras.main.shake(100, 0.002); // Reduced from 0.005
    }

    // Auto-Fire System (Stop & Shoot)
    private lastFireTime: number = 0;
    private fireRate: number = 200; // ms

    public autoFire(time: number, enemies: Phaser.GameObjects.Group, projectiles: Phaser.GameObjects.Group) {
        if (this.isDashing) return;

        const body = this.body as Phaser.Physics.Arcade.Body;
        const speed = body.velocity.length();

        // Stance Logic: If nearly stopped, Auto-Fire
        if (speed < 50) {
            // Find Target
            const target = this.scanForTarget(enemies);
            if (target) {
                const t = target as any; // Cast to access x,y
                // Rotate towards target
                const angle = Phaser.Math.Angle.Between(this.x, this.y, t.x, t.y);
                this.rotation = Phaser.Math.Angle.RotateTo(this.rotation, angle + Math.PI / 2, 0.2);

                // Fire
                if (time > this.lastFireTime + this.fireRate) {
                    this.fireProjectile(projectiles, angle);
                    this.lastFireTime = time;
                }
            }
        }
    }

    private scanForTarget(enemies: Phaser.GameObjects.Group): Phaser.GameObjects.GameObject | null {
        let closest: Phaser.GameObjects.GameObject | null = null;
        let minDist = 600; // Range

        enemies.children.each((child) => {
            const e = child as any; // Cast to access properties
            if (!e.active || e.isDead) return true; // continue
            const dist = Phaser.Math.Distance.Between(this.x, this.y, e.x, e.y);
            if (dist < minDist) {
                minDist = dist;
                closest = e;
            }
            return true;
        });
        return closest;
    }

    private fireProjectile(projectiles: Phaser.GameObjects.Group, angle: number) {
        // Get projectile from pool (simplified here, in reality ProjectileGroup manages this)
        // Since we don't have direct access to Group methods without casting, 
        // we'll assume MainScene handles the actual creation if we emit event OR we assume projectiles group has `get()`.
        const bullet = projectiles.get(this.x, this.y) as any; // Projectile type
        if (bullet) {
            bullet.onEnable(
                this.x + Math.cos(angle) * 20,
                this.y + Math.sin(angle) * 20,
                angle,
                800, // Speed
                1000, // Duration
                COLORS.primary,
                this.stats.atk,
                this.id
            );
            // Recoil
            const body = this.body as Phaser.Physics.Arcade.Body;
            body.setVelocity(body.velocity.x - Math.cos(angle) * 20, body.velocity.y - Math.sin(angle) * 20);
        }
    }

    public getDamage(): { dmg: number, isCrit: boolean } {
        const isCrit = Math.random() < (this.stats.crit / 100);
        let dmg = this.stats.atk;
        if (isCrit) dmg *= 1.5;
        return { dmg, isCrit };
    }

    destroy(fromScene?: boolean) {
        this.emitter.destroy();
        super.destroy(fromScene);
    }

    // Virtual metods for subclasses
    public updateCombat(enemies: Phaser.GameObjects.Group, projectiles: Phaser.GameObjects.Group) { }

    // Generic Skill Hooks
    public triggerSkill1() { }
    public triggerSkill2() { }
}