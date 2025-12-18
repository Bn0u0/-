import Phaser from 'phaser';
import { COLORS, PHYSICS } from '../../constants';
import { ItemDef } from '../data/Items';
import { ClassConfig } from '../factories/PlayerFactory';
import { WeaponSystem } from '../systems/WeaponSystem';
import { cardSystem } from '../systems/CardSystem';
import { WeaponInstance } from '../../types';

export class Player extends Phaser.GameObjects.Container {
    public id: string;
    public isLocal: boolean;
    declare public body: Phaser.Physics.Arcade.Body;

    // Class Config
    public classConfig: ClassConfig | null = null;
    public equippedWeapon: WeaponInstance | null = null;

    // Stats
    public stats = {
        hp: 100, maxHp: 100,
        speed: 1.0,
        atk: 10,
        crit: 5,
        cooldown: 0
    };

    // State
    public isDashing: boolean = false;
    public isInvulnerable: boolean = false;
    public isMoving: boolean = false;
    private dashTimer: number = 0;
    private dashCooldown: number = 0;

    // Visuals
    // public sprite: Phaser.GameObjects.Sprite; // DEPRECATED
    public classId: string = 'BLADE'; // Default
    protected graphics: Phaser.GameObjects.Graphics;
    protected coreShape: Phaser.GameObjects.Graphics;
    private emitter: Phaser.GameObjects.Particles.ParticleEmitter;
    private shadow: Phaser.GameObjects.Ellipse;
    public z: number = 0;
    public zVelocity: number = 0;

    // Inventory / Legacy Props
    public lootBag: ItemDef[] = [];
    public lootWeight: number = 0; // V4.0: Encumbrance
    public cooldowns: { [key: string]: number } = {};
    public maxCooldowns: { [key: string]: number } = {};
    public speedMultiplier: number = 1.0;
    public shielded: boolean = false;

    // Derived Stats (calculated from Base + Cards + Loot)
    public currentStats = {
        hp: 100, maxHp: 100,
        speed: 1.0,
        atk: 10,
        crit: 5,
        cooldown: 0,
        sizeMod: 1.0,
        projectileCount: 1,
        dodge: 0
    };

    // Systems
    // We assume Scene has weaponSystem. We can access via (scene as any).weaponSystem

    constructor(scene: Phaser.Scene, x: number, y: number, id: string, isLocal: boolean) {
        super(scene, x, y);
        this.id = id;
        this.isLocal = isLocal;

        // Shadow
        this.shadow = scene.add.ellipse(0, 0, 40, 15, 0x000000, 0.4);
        this.shadow.setDepth(5);
        this.add(this.shadow);

        // Particle Trail
        if (!scene.textures.exists('flare')) {
            // Fallback handled in MainScene now
        }
        this.emitter = scene.add.particles(0, 0, 'flare', {
            speed: 10, scale: { start: 0.6, end: 0 }, alpha: { start: 0.5, end: 0 },
            lifespan: 800, blendMode: 'ADD', frequency: 50, follow: this,
            tint: COLORS.primary
        });
        this.emitter.setDepth(-1);

        // Sprite REMOVED. Using Graphics Container.

        // 1. Base Structure (The "Skeleton")
        this.graphics = scene.add.graphics();
        this.add(this.graphics);

        // 2. Core Shape (Hitbox visualizer / shielding)
        this.coreShape = scene.add.graphics();
        this.add(this.coreShape);

        // Direction Arrow
        if (isLocal) {
            const arrow = scene.add.triangle(0, -28, 0, 0, 6, 10, -6, 10, 0xffffff);
            arrow.setOrigin(0.5, 0.5);
            arrow.setAlpha(0.8);
            this.add(arrow);
        }

        // Physics
        scene.add.existing(this);
        scene.physics.add.existing(this);
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setCircle(16, -16, -16);
        body.setDrag(2000); // Was 800. Make it snappy.
        body.setDamping(false);
        body.setMaxVelocity(PHYSICS.maxVelocity);
        body.setCollideWorldBounds(false);
    }

    public configure(config: ClassConfig, classId: string) {
        this.classConfig = config;
        this.classId = classId;

        // [Weapon 2.0] Default Weapon based on Class
        this.equippedWeapon = {
            id: `init_${classId}_${Date.now()}`,
            name: `${config.name}標配`,
            baseType: config.weapon as any,
            rarity: 'COMMON',
            modifiers: [],
            level: 1
        };

        // Apply Base Stats
        this.stats.hp = config.stats.hp;
        this.stats.maxHp = config.stats.hp;
        this.stats.speed = config.stats.speed;

        // Redraw with Class Color
        this.drawGuardian(config.stats.markColor);
    }

    drawGuardian(color: number) {
        // Redirect to new Architecture
        this.drawArchitecture(this.classId, color);

        // Clear legacy graphics if any
        this.coreShape.clear();
    }

    /**
     * High-Fidelity Procedural Avatar Generator
     * Draws complex, multi-layered vector art based on class identity.
     */
    private drawArchitecture(classId: string, color: number) {
        const g = this.graphics;
        g.clear();

        // AMBER-GLITCH STYLE: 1px Dark Outline (#1B1020)
        g.lineStyle(1, COLORS.shadow, 1);

        // Palette
        const primary = color;
        const dark = Phaser.Display.Color.IntegerToColor(color).darken(40).color;
        const bright = Phaser.Display.Color.IntegerToColor(color).lighten(40).color;
        const white = 0xffffff;

        // "Cult of the Lamb" Ratios: 
        // Bobblehead (Head > Body). Cute but menacing.

        switch (classId) {
            case 'IMPACT':
                // "THE TANK" - Chunky Square Robot
                // Legs (Tiny)
                g.fillStyle(dark, 1);
                g.fillRoundedRect(-15, 10, 10, 15, 2);
                g.fillRoundedRect(5, 10, 10, 15, 2);
                g.strokeRoundedRect(-15, 10, 10, 15, 2);
                g.strokeRoundedRect(5, 10, 10, 15, 2);

                // Body (Small)
                g.fillStyle(dark, 1);
                g.fillRect(-10, -5, 20, 20);
                g.strokeRect(-10, -5, 20, 20);

                // Head (Huge)
                g.fillStyle(primary, 1);
                g.fillRoundedRect(-20, -35, 40, 30, 8);
                g.strokeRoundedRect(-20, -35, 40, 30, 8);

                // Face (One Eye)
                g.fillStyle(0xffffff, 1);
                g.fillCircle(0, -20, 8);
                break;

            case 'BLADE':
                // "THE SPEEDSTER" - Ninja Hood
                // Cape/Body
                g.fillStyle(dark, 1);
                g.beginPath();
                g.moveTo(0, -10); g.lineTo(15, 15); g.lineTo(-15, 15);
                g.closePath();
                g.fillPath();
                g.strokePath();

                // Head (Hood)
                g.fillStyle(primary, 1);
                g.fillCircle(0, -15, 16);
                g.strokeCircle(0, -15, 16);

                // Eyes (Determined)
                g.fillStyle(white, 1);
                g.fillRect(-10, -18, 8, 4);
                g.fillRect(2, -18, 8, 4);
                break;

            default:
                // Fallback Cute Blob
                g.fillStyle(primary, 1);
                g.fillCircle(0, -10, 20); // Big Head
                g.strokeCircle(0, -10, 20);
                g.fillStyle(dark, 1);
                g.fillCircle(0, 15, 10); // Small Body
                g.strokeCircle(0, 15, 10);
                break;
        }
    }

    public recalculateStats() {
        if (!this.classConfig) return;

        // 1. Base Stats
        const base = {
            hpMaxMod: 1,
            sizeMod: 1,
            dmgMod: 1,
            projectileCount: 1,
            dodge: 0,
            speed: this.classConfig.stats.speed,
            atk: this.classConfig.stats.atk
        };

        // 2. Apply Cards (Dynamic)
        const modified = cardSystem.applyStats(base);

        // 3. Apply Loot Weight (Encumbrance)
        const weightPenalty = Math.pow(0.95, this.lootBag.length);

        // 4. Finalize
        this.currentStats.maxHp = Math.floor(this.classConfig.stats.hp * modified.hpMaxMod);
        this.currentStats.atk = Math.floor(base.atk * modified.dmgMod);
        this.currentStats.speed = base.speed * weightPenalty;
        this.currentStats.sizeMod = modified.sizeMod;
        this.currentStats.projectileCount = modified.projectileCount;
        this.currentStats.dodge = modified.dodge;

        this.setScale(this.currentStats.sizeMod);
        this.drawLootStack();
    }

    private drawLootStack() {
        // Simple visual: Boxes stacked on back
        if (!this.coreShape) return;
        // Optimization: Don't redraw every frame, only on change? 
        // For now, Player.recalculateStats is only called on change, so this is fine.

        this.coreShape.clear(); // Clear strictly here now

        // We need a separate container for Loot if we want it "on back"?
        // Just cheat and draw rectangles in coreShape for now
        this.coreShape.lineStyle(2, 0xFFD700, 1);
        for (let i = 0; i < this.lootBag.length; i++) {
            this.coreShape.strokeRect(-10, -30 - (i * 6), 20, 6);
        }
    }

    update() {
        // ... (Keep Squash & Stretch Logic mostly same, simplified) ...
        const dt = 16.6;
        const body = this.body as Phaser.Physics.Arcade.Body;
        const speed = body.velocity.length();

        // Dash Logic
        if (this.dashCooldown > 0) this.dashCooldown -= dt;
        if (this.isDashing) {
            this.dashTimer -= dt;
            if (this.dashTimer <= 0) {
                this.isDashing = false;
                this.isInvulnerable = false;
                this.updateMaxSpeed(); // Reset speed cap
            }
            return;
        }

        // Z-height (Jump/Bob)
        if (this.z > 0 || this.zVelocity !== 0) {
            this.z += this.zVelocity;
            this.zVelocity -= 0.8;
            if (this.z < 0) { this.z = 0; this.zVelocity = 0; }
        }

        // Update Sprite Y for jump effect (and other attached visuals)
        // this.sprite.y = -this.z; // Deprecated
        this.graphics.y = -this.z + Math.sin(this.scene.time.now / 300) * 2; // Idle Breathing
        this.coreShape.y = -this.z;

        // Emitter
        if (speed > 50) {
            this.emitter.active = true;
            const angle = this.rotation + Math.PI / 2;
            this.emitter.followOffset.set(-Math.cos(angle) * 10, -Math.sin(angle) * 10);
        } else {
            this.emitter.active = false;
        }

        this.updateMaxSpeed();
    }

    private updateMaxSpeed() {
        const body = this.body as Phaser.Physics.Arcade.Body;
        const base = PHYSICS.maxVelocity;
        const multiplier = this.stats.speed || 1.0;
        body.setMaxVelocity(base * multiplier);
    }

    public dash() {
        if (this.dashCooldown > 0) return;
        this.isDashing = true;
        this.isInvulnerable = true;
        this.dashTimer = 250;
        this.dashCooldown = 1200; // Base CD

        const body = this.body as Phaser.Physics.Arcade.Body;
        body.drag.set(0);
        body.maxVelocity.set(1200);

        const angle = this.rotation - Math.PI / 2;
        const speed = 1100 * (this.stats.speed || 1);
        body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

        this.zVelocity = 12;
        this.scene.cameras.main.shake(100, 0.002);
    }

    // Auto-Fire System (WeaponSystem Hook)
    private lastFireTime: number = 0;
    private fireRate: number = 400; // Base fire rate

    public autoFire(time: number, enemies: Phaser.GameObjects.Group) {
        if (this.isDashing || !this.classConfig) return;

        // Stop to Shoot Rule
        const speed = (this.body as Phaser.Physics.Arcade.Body).velocity.length();
        if (!this.isMoving && speed < 50) {
            const target = this.scanForTarget(enemies) as any;
            if (target) {
                // Face target
                const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
                this.rotation = Phaser.Math.Angle.RotateTo(this.rotation, angle + Math.PI / 2, 0.2);

                if (time > this.lastFireTime + this.fireRate) {
                    // Fire via WeaponSystem
                    const ws = (this.scene as any).weaponSystem as WeaponSystem;
                    if (ws && this.equippedWeapon) {
                        ws.fire(this.equippedWeapon, {
                            x: this.x, y: this.y, rotation: angle, id: this.id
                        }, this.currentStats, target);
                    }
                    this.lastFireTime = time;

                    // Recoil
                    const body = this.body as Phaser.Physics.Arcade.Body;
                    body.setVelocity(
                        body.velocity.x - Math.cos(angle) * 50,
                        body.velocity.y - Math.sin(angle) * 50
                    );
                }
            }
        }
    }

    private scanForTarget(enemies: Phaser.GameObjects.Group): Phaser.GameObjects.GameObject | null {
        let closest = null;
        let minDist = 400;
        enemies.getChildren().forEach((e: any) => {
            if (!e.active) return; // e.isDead check might be custom, rely on active
            // Cast to Enemy to check isDead if needed, or assume active means alive
            const d = Phaser.Math.Distance.Between(this.x, this.y, e.x, e.y);
            if (d < minDist) { minDist = d; closest = e; }
        });
        return closest;
    }

    public getDamage(): { dmg: number, isCrit: boolean } {
        const isCrit = Math.random() < (this.stats.crit / 100);
        let dmg = this.stats.atk;
        if (isCrit) dmg *= 1.5;
        return { dmg, isCrit };
    }

    public triggerSkill1() { /* TODO: Class Spec Skill */ }
    public triggerSkill2() { /* TODO: Class Spec Skill */ }

    destroy(fromScene?: boolean) {
        this.emitter.destroy();
        super.destroy(fromScene);
    }

    public updateCombat(enemies: Phaser.GameObjects.Group, projectiles: Phaser.GameObjects.Group) {
        // Core Logic for Auto-Fire moved here?
        // Or just keep it as hook.
        // For now, implementing empty to pass build, logic is handled in MainScene update -> commander.autoFire().
        this.autoFire(this.scene.time.now, enemies);
    }
}