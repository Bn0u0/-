import Phaser from 'phaser';
import { COLORS, PHYSICS } from '../../constants';
// import { ItemDef } from '../data/Items'; // [VOID]
import { ItemInstance, ItemDef, ItemRarity } from '../../types';
import { ItemLibrary } from '../data/library/items';
import { ClassConfig } from '../factories/PlayerFactory';
import { WeaponSystem } from '../systems/WeaponSystem';
import { inventoryService } from '../../services/InventoryService'; // [NEW]
import { EventBus } from '../../services/EventBus';
// import { cardSystem } from '../systems/CardSystem'; // [VOID]
// import { WeaponInstance } from '../../types'; // [VOID]

import { ClassMechanic } from '../mechanics/ClassMechanic';
import { ScavengerLogic } from '../mechanics/ScavengerLogic';
import { SkirmisherLogic } from '../mechanics/SkirmisherLogic';
import { WeaverLogic } from '../mechanics/WeaverLogic';

export class Player extends Phaser.GameObjects.Container {
    public id: string;
    public isLocal: boolean;
    declare public body: Phaser.Physics.Arcade.Body;

    // Logic
    public mechanic: ClassMechanic | null = null;

    // Class Config
    public classConfig: ClassConfig | null = null;
    public equippedWeapon: ItemInstance | null = null;

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
    public isSiegeMode: boolean = false; // [SIEGE MODE]
    private dashTimer: number = 0;
    private dashCooldown: number = 0;

    // Visuals
    public classId: string = 'SCAVENGER'; // Default
    protected graphics: Phaser.GameObjects.Graphics;
    protected coreShape: Phaser.GameObjects.Graphics;
    protected mechanicGraphics: Phaser.GameObjects.Graphics; // [NEW]
    private emitter: Phaser.GameObjects.Particles.ParticleEmitter;
    private shadow: Phaser.GameObjects.Ellipse;
    public z: number = 0;
    public zVelocity: number = 0;

    // Inventory / Legacy Props
    public lootBag: ItemInstance[] = [];
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
        dodge: 0,
        defense: 0,
        fireRate: 400,
        range: 300
    };

    // Systems
    // We assume Scene has weaponSystem. We can access via (scene as any).weaponSystem

    constructor(scene: Phaser.Scene, x: number, y: number, id: string, isLocal: boolean) {
        super(scene, x, y);
        this.id = id;
        this.isLocal = isLocal;

        // Shadow
        this.shadow = scene.add.ellipse(0, 0, 40, 15, 0x000000, 0.4);
        this.shadow.setDepth(-1); // [FIX] Behind Character
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
        // 2. Core Shape (Hitbox visualizer / shielding)
        this.coreShape = scene.add.graphics();
        this.add(this.coreShape);

        // 3. Mechanic Visuals (Overlay)
        this.mechanicGraphics = scene.add.graphics();
        this.add(this.mechanicGraphics);

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

        // Input Listener
        // Note: Ideally in constructor, but configure is safe place for logic reset
        this.scene.events.off('PLAYER_DASH'); // Clean up old
        this.scene.events.on('PLAYER_DASH', (vector: { x: number, y: number }) => {
            if (this.scene) { // Alive check
                this.dash();
            }
        });

        // [NEW] Recoil Listener
        EventBus.off('PLAYER_RECOIL'); // Prevent dupes
        EventBus.on('PLAYER_RECOIL', (data: { force: number, angle: number }) => {
            if (this.scene && this.body) {
                const body = this.body as Phaser.Physics.Arcade.Body;
                // Apply force opposite to shooting angle
                body.velocity.x -= Math.cos(data.angle) * data.force;
                body.velocity.y -= Math.sin(data.angle) * data.force;
            }
        });

        // [Weapon 2.0] Trinity Weapon Mapping
        const T0_MAPPING: Partial<Record<string, string>> = {
            'SCAVENGER': 'weapon_crowbar_t0',
            'SKIRMISHER': 'weapon_pistol_t0',
            'WEAVER': 'weapon_drone_t0'
        };

        const defId = T0_MAPPING[classId] || 'weapon_pistol_t0';
        const def = ItemLibrary.get(defId);

        if (def) {
            this.equipWeapon(def);
        } else {
            console.warn(`[Player] Default weapon def not found for ${defId}`);
        }

        // Apply Base Stats
        this.stats.hp = config.stats.hp;
        this.stats.maxHp = config.stats.hp;
        this.stats.speed = config.stats.speed;

        // Redraw with Class Color
        // Initialize Mechanic
        if (this.mechanic) this.mechanic.destroy();

        switch (classId) {
            case 'SCAVENGER': this.mechanic = new ScavengerLogic(this); break;
            case 'SKIRMISHER': this.mechanic = new SkirmisherLogic(this); break;
            case 'WEAVER': this.mechanic = new WeaverLogic(this); break;
            default: this.mechanic = new ScavengerLogic(this); break;
        }

        this.drawGuardian(config.stats.markColor);
    }

    public equipWeapon(item: ItemDef | ItemInstance) {
        // Method Overload Implementation
        if ('uid' in item) {
            // Already an Instance (RNG Applied)
            this.equippedWeapon = item as ItemInstance;
        } else {
            // Raw Definition (Fallback Construction)
            const def = item as ItemDef;
            this.equippedWeapon = {
                uid: Phaser.Utils.String.UUID(),
                defId: def.id,
                def: def, // [NEW] Link definition
                displayName: def.name,
                name: def.name,
                rarity: (def.rarity as ItemRarity) || ItemRarity.COMMON,
                computedStats: {
                    damage: def.baseStats.damage,
                    range: def.baseStats.range,
                    fireRate: def.baseStats.fireRate,
                    critChance: def.baseStats.critChance || 0,
                    speed: def.baseStats.speed || 0,
                    defense: def.baseStats.defense || 0,
                    hpMax: def.baseStats.hpMax || 0
                }
            };
        }
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
            case 'SCAVENGER':
                // "THE SURVIVOR" - Chunky, Armored
                // Body
                g.fillStyle(dark, 1);
                g.fillRoundedRect(-12, -5, 24, 25, 4);
                g.strokeRoundedRect(-12, -5, 24, 25, 4);
                // Head (Helmet)
                g.fillStyle(primary, 1);
                g.fillRoundedRect(-15, -20, 30, 20, 6);
                g.strokeRoundedRect(-15, -20, 30, 20, 6);
                // Visor
                g.fillStyle(0x00FFFF, 0.8);
                g.fillRect(-10, -15, 20, 6);
                break;

            case 'SKIRMISHER':
                // "THE DUELIST" - Sleek, Hooded
                // Cape/Body (Triangle)
                g.fillStyle(dark, 1);
                g.beginPath();
                g.moveTo(0, -10); g.lineTo(15, 20); g.lineTo(-15, 20);
                g.closePath();
                g.fillPath();
                g.strokePath();

                // Head (Hood)
                g.fillStyle(primary, 1);
                g.fillCircle(0, -12, 14);
                g.strokeCircle(0, -12, 14);
                // Eye (Mono)
                g.fillStyle(white, 1);
                g.fillCircle(4, -12, 3);
                break;

            case 'WEAVER':
                // "THE ENGINEER" - Tech, Floating Bits
                // Body (Orb-like)
                g.fillStyle(dark, 1);
                g.fillCircle(0, 5, 12);
                g.strokeCircle(0, 5, 12);

                // Head (Floating)
                g.fillStyle(primary, 1);
                g.fillCircle(0, -15, 10);
                g.strokeCircle(0, -15, 10);

                // Antenna
                g.lineStyle(2, primary, 1);
                g.lineBetween(0, -25, 0, -32);
                g.fillCircle(0, -34, 2);
                break;

            default:
                // Fallback
                g.fillStyle(primary, 1);
                g.fillCircle(0, 0, 15);
                break;
        }
    }

    public level: number = 1; // [OPERATION ESCALATION] Step 3: Stat Scaling

    // ... (lines 40-272)

    public updateLevelStats(newLevel: number) {
        this.level = newLevel;
        this.recalculateStats();

        // Heal on Level Up?
        this.stats.hp = this.stats.maxHp;
        EventBus.emit('SHOW_FLOATING_TEXT', { x: this.x, y: this.y - 60, text: "FULL HEAL", color: "#00FF00" });
    }

    public recalculateStats() {
        if (!this.classConfig) return;

        // 1. Get Loadout Stats from Inventory Service
        const loadout = inventoryService.getState().loadout;
        const totalStats = inventoryService.calculateTotalStats(loadout, this.classId);

        // 2. Base Config
        const baseHp = this.classConfig.stats.hp;
        const baseSpeed = this.classConfig.stats.speed;

        // [OPERATION ESCALATION] Level Scaling
        // HP: +10% per Level
        // DMG: +5% per Level
        const levelMultHp = 1 + ((this.level - 1) * 0.1);
        const levelMultDmg = 1 + ((this.level - 1) * 0.05);

        // 3. Apply
        this.currentStats.maxHp = Math.floor((baseHp + totalStats.hpMax) * levelMultHp);

        // Apply to current maxHp logic (update stats.maxHp)
        this.stats.maxHp = this.currentStats.maxHp;

        this.currentStats.atk = Math.max(1, totalStats.damage) * levelMultDmg;

        // Speed: Base * (1 + speed/1000?) or Base + Speed?
        // Let's say 100 speed = +1.0 base speed.
        this.currentStats.speed = baseSpeed + (totalStats.speed / 200);
        this.currentStats.atk = Math.floor(this.classConfig.stats.atk + totalStats.damage); // Add item damage to base atk? Or replace? 
        // WeaponSystem uses 'currentStats.damage' usually? 
        // Let's assume WEAPON DAMAGE is the main source, and we add Class ATK as bonus?
        // Actually, logic: Weapon Base + Stats.
        // If totalStats.damage includes Weapon Damage, then we use that.
        this.currentStats.atk = Math.max(1, totalStats.damage);

        // Speed: Base * (1 + speed/1000?) or Base + Speed?
        // Let's treat item speed as flat addition for now or multiplier?
        // T3 legs gives "30". Base speed is 1.0 (approx 200px/s).
        // Let's say 100 speed = +1.0 base speed.
        this.currentStats.speed = baseSpeed + (totalStats.speed / 200);

        this.currentStats.defense = totalStats.defense;
        this.currentStats.crit = ((this.classConfig.stats as any).crit || 5) + (totalStats.critChance * 100);
        this.currentStats.fireRate = totalStats.fireRate;
        this.currentStats.range = totalStats.range;

        // 4. Update Physics
        this.updateMaxSpeed();
        this.drawLootStack();

        // Update Fire Rate
        this.fireRate = this.currentStats.fireRate > 0 ? this.currentStats.fireRate : 400;

        // Visual Scale
        this.setScale(this.currentStats.sizeMod);
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

        // Mechanic Update
        if (this.mechanic) {
            this.mechanic.update(dt);
            this.mechanicGraphics.clear();
            this.mechanic.draw(this.mechanicGraphics);
        }
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

        if (this.mechanic) this.mechanic.onDash();
    }

    // Auto-Fire System (WeaponSystem Hook)
    private lastFireTime: number = 0;
    private fireRate: number = 400; // Base fire rate

    public autoFire(time: number, enemies: Phaser.GameObjects.Group) {
        if (this.isDashing || !this.classConfig) return;

        // [SIEGE MODE] Logic
        const isSiege = this.isSiegeMode;

        // Stop to Shoot Rule (Relaxed in Siege)
        const speed = (this.body as Phaser.Physics.Arcade.Body).velocity.length();

        // Allow fire if: Stopped OR Siege Mode (Run & Gun / Moonwalk)
        const canFire = (!this.isMoving && speed < 50) || isSiege;

        if (canFire) {
            const target = this.scanForTarget(enemies) as any;
            // If Hybrid/Manual Siege, aim is fixed by InputSystem usually? 
            // InputSystem sets rotation. 
            // Whatever, we scan for target to Lock On or just fire forward if no target?
            // Existing logic scans for target. If found, ROTATES player to target.

            // [CONFLICT]: InputSystem processes rotation based on Joystick in Siege.
            // If we rotate to target here, we override InputSystem's aiming.
            // For AUTO: Auto-aim is fine.
            // For HYBRID/MANUAL: InputSystem controls aim.
            // We should ONLY rotate if NOT in Siege (or if Auto).

            // Actually, if a target is found:
            if (target) {
                // Only rotate if NOT Siege (Siege = Manual Aim usually, except AUTO)
                // But AUTO Siege is "Run and Gun", maybe we still want Auto Aim?
                // HYBRID/MANUAL Siege is "Fixed Aim" from Joystick.

                const controlType = this.equippedWeapon?.def?.controlType || 'AUTO';
                if (!isSiege || controlType === 'AUTO') {
                    const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
                    this.rotation = Phaser.Math.Angle.RotateTo(this.rotation, angle + Math.PI / 2, 0.2);
                }

                // Fire Rate Logic
                let effectiveFireRate = this.fireRate;
                if (isSiege && controlType === 'AUTO') {
                    effectiveFireRate *= 0.7; // [Overdrive] Rapid Fire
                }

                if (time > this.lastFireTime + effectiveFireRate) {
                    // Fire via WeaponSystem
                    const ws = (this.scene as any).weaponSystem as WeaponSystem;
                    if (ws && this.equippedWeapon) {
                        ws.fire(this.equippedWeapon, {
                            x: this.x, y: this.y, rotation: this.rotation - Math.PI / 2, id: this.id, // Fix rotation for fire
                            isSiege: isSiege
                        } as any, this.currentStats, target);
                    }
                    this.lastFireTime = time;

                    // Recoil (Apply inverse of shooting direction)
                    const shootAngle = this.rotation - Math.PI / 2;
                    const body = this.body as Phaser.Physics.Arcade.Body;
                    body.setVelocity(
                        body.velocity.x - Math.cos(shootAngle) * 50,
                        body.velocity.y - Math.sin(shootAngle) * 50
                    );
                }
            } else if (isSiege) {
                // [SIEGE] Fire even without target? (Manual Aim)
                // If MANUAL/HYBRID, we aim with joystick. We should fire if button held?
                // But autoFire is "Auto".
                // For now, let's keep it Target-Required to save ammo/logic, 
                // UNLESS it's Manual Siege which usually implies manual firing. 
                // But we don't have a "Fire Button". It's Joystick-based.
                // So "Auto Fire" is the only fire.
                // So we MUST fire if Siege is active, even without target, IF we want "Manual Fire feeling".
                // Let's assume for MVP -> Must have Target. 
                // Wait, "Moonwalk" is for Kiting. You want to shoot at the enemy chasing you.
                // So ScanForTarget is correct.
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

    public takeDamage(amount: number) {
        if (this.isInvulnerable || this.shielded) return; // Legacy shield check?

        // Mechanic Hook
        if (this.mechanic) {
            amount = this.mechanic.onHit(amount);
        }

        if (amount > 0) {
            this.stats.hp -= amount;
            // Standard Take Damage Visuals
            this.scene.cameras.main.shake(50, 0.001);
            EventBus.emit('SHOW_FLOATING_TEXT', { x: this.x, y: this.y, text: `-${Math.floor(amount)}`, color: '#FF0000' });

            if (this.stats.hp <= 0) {
                // Die Logic (Handled in Scene normally)
            }
        }
    }

    public getDamage(): { dmg: number, isCrit: boolean } {
        const isCrit = Math.random() < (this.stats.crit / 100);
        let dmg = this.stats.atk;
        if (isCrit) dmg *= 1.5;
        return { dmg, isCrit };
    }

    // Zero-Button System: Active skills removed.
    // Logic handled in update() or by InputSystem flick detection.

    destroy(fromScene?: boolean) {
        this.emitter.destroy();
        EventBus.off('PLAYER_RECOIL');
        super.destroy(fromScene);
    }

    public updateCombat(enemies: Phaser.GameObjects.Group, projectiles: Phaser.GameObjects.Group) {
        // Core Logic for Auto-Fire moved here?
        // Or just keep it as hook.
        // For now, implementing empty to pass build, logic is handled in MainScene update -> commander.autoFire().
        this.autoFire(this.scene.time.now, enemies);
    }
}