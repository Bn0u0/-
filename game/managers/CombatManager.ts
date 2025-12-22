import Phaser from 'phaser';
import { Player } from '../classes/Player';
import { Enemy } from '../classes/Enemy';
import { Projectile } from '../classes/Projectile';
import { EventBus } from '../../services/EventBus';
import { MainScene } from '../scenes/MainScene';
import { ObjectPool } from '../core/ObjectPool';

export class CombatManager {
    private scene: MainScene;
    private projectilePool: ObjectPool<Projectile>;
    private projectiles: Phaser.GameObjects.Group;

    constructor(scene: MainScene) {
        this.scene = scene;
        this.projectiles = scene.physics.add.group({
            classType: Projectile,
            runChildUpdate: true
        });

        // Initialize Projectile Pool
        this.projectilePool = new ObjectPool<Projectile>(
            () => {
                const p = new Projectile(scene);
                this.projectiles.add(p); // Add to the group for physics and updates
                return p;
            },
            50, // Initial pool size
            200 // Max pool size
        );

        // [NEW] Event Listeners for Strategy Interactions
        EventBus.on('COMBAT_HIT_SCAN', this.handleHitScan, this);
        EventBus.on('COMBAT_AREA_ATTACK', this.handleAreaAttack, this);
    }

    // [NEW] Hit Scan Logic
    private handleHitScan(data: { x1: number, y1: number, x2: number, y2: number, damage: number, ownerId: string }) {
        // Simple Line Intersection Check against all Enemies
        // Note: This is O(N) where N is enemy count. Acceptable for now.
        if (!this.scene['enemyGroup']) return; // Access unsafe?

        const line = new Phaser.Geom.Line(data.x1, data.y1, data.x2, data.y2);
        const enemies = (this.scene as any).enemyGroup.getChildren() as Enemy[];

        enemies.forEach(enemy => {
            if (!enemy.active) return;
            const body = enemy.body as Phaser.Physics.Arcade.Body;
            if (body) {
                // Check if line intersects circle (Body is circle roughly)
                // Or simplified: Shortest distance from center to line < radius
                // Phaser Geom Intersects can do Line vs Rectangle (Body)
                const rect = new Phaser.Geom.Rectangle(body.x, body.y, body.width, body.height);
                if (Phaser.Geom.Intersects.LineToRectangle(line, rect)) {
                    // HIT!
                    this.applyDamage(enemy, data.damage, false);

                    // VFX: Spark at intersection?
                    // Simplify: Spark at center
                    EventBus.emit('SHOW_FLOATING_TEXT', { x: enemy.x, y: enemy.y, text: "HIT", color: "#FF00FF" });
                }
            }
        });
    }

    // [NEW] Area Attack Logic
    private handleAreaAttack(data: { x: number, y: number, radius: number, angle: number, arc: number, damage: number, ownerId: string }) {
        if (!this.scene['enemyGroup']) return;
        const enemies = (this.scene as any).enemyGroup.getChildren() as Enemy[];

        enemies.forEach(enemy => {
            if (!enemy.active) return;

            // 1. Distance Check
            const dist = Phaser.Math.Distance.Between(data.x, data.y, enemy.x, enemy.y);
            if (dist > data.radius) return;

            // 2. Angle Check (if Cone)
            if (data.arc < Math.PI * 2) {
                const angleToEnemy = Phaser.Math.Angle.Between(data.x, data.y, enemy.x, enemy.y);
                const angleDiff = Phaser.Math.Angle.Wrap(angleToEnemy - data.angle);
                if (Math.abs(angleDiff) > data.arc / 2) return;
            }

            // HIT!
            this.applyDamage(enemy, data.damage, true);
        });
    }

    private applyDamage(enemy: Enemy, damage: number, isKnockback: boolean) {
        if (damage <= 0) return;
        const kill = enemy.takeDamage(damage);

        EventBus.emit('SHOW_FLOATING_TEXT', {
            x: enemy.x, y: enemy.y,
            text: `${Math.floor(damage)}`,
            color: kill ? '#FFAA00' : '#FFFFFF'
        });

        if (kill) this.scene.cameras.main.shake(50, 0.005);

        if (isKnockback && !kill && enemy.body) {
            // Simple push away from player? Or center of blast?
            // Not enough info in args, assume push back slightly?
            // Skip for now.
        }
    }

    public spawnProjectile(x: number, y: number, angle: number, ownerId: string, damage: number) {
        const color = ownerId === 'player' ? 0x00ffff : 0xff0000;
        const speed = 600;
        const duration = 2000;

        const p = this.projectilePool.get(x, y, angle, speed, duration, color, damage, ownerId);
    }

    public update(time: number, delta: number) {
        // Cleanup dead projectiles
        const children = this.projectiles.getChildren() as Projectile[];
        for (let i = children.length - 1; i >= 0; i--) {
            const p = children[i];
            if (!p.active) {
                this.projectilePool.release(p);
            }
        }
    }

    public checkCollisions(
        enemyGroup: Phaser.GameObjects.Group,
        players: Player[],
        onPlayerDamaged: (amount: number) => void,
        externalProjectiles?: Phaser.GameObjects.Group // [FIX] Support WeaponSystem
    ) {
        // 1. Internal Pool -> Enemy
        this.scene.physics.overlap(this.projectiles, enemyGroup, (proj: any, enemy: any) => {
            this.handleHit(proj, enemy);
        });

        // 2. External Group -> Enemy (WeaponSystem)
        if (externalProjectiles) {
            this.scene.physics.overlap(externalProjectiles, enemyGroup, (proj: any, enemy: any) => {
                this.handleHit(proj, enemy);
            });
        }
    }

    private handleHit(projectile: any, enemy: any) {
        const e = enemy as Enemy;
        const damage = projectile.damage || 0;
        if (damage <= 0) return;

        const kill = e.takeDamage(damage);

        // [JUICE] Hit Feedback
        EventBus.emit('SHOW_FLOATING_TEXT', {
            x: e.x, y: e.y,
            text: `${Math.floor(damage)}`,
            color: kill ? '#FFAA00' : '#FFFFFF'
        });

        // [CORE LOOP] Juice Injection
        // 1. Hit Stop
        const hitStopDuration = (damage > 20) ? 50 : 10;
        try {
            if (!this.scene.physics.world.isPaused) {
                this.scene.physics.pause();
                this.scene.time.delayedCall(hitStopDuration, () => {
                    this.scene.physics.resume();
                });
            }
        } catch (err) { }

        // 2. Flash
        e.setTintFill(0xFFFFFF);
        this.scene.time.delayedCall(50, () => {
            e.clearTint();
        });

        // 3. Knockback
        if (e.body && !kill) {
            const projBody = projectile.body;
            let vx = 0;
            let vy = 0;
            if (projBody) {
                vx = projBody.velocity.x;
                vy = projBody.velocity.y;
            }

            // Fallback for non-physics projectiles (e.g. Laser)
            if (vx === 0 && vy === 0) {
                vx = e.x - projectile.x;
                vy = e.y - projectile.y;
            }

            const velocity = new Phaser.Math.Vector2(vx, vy).normalize();
            const force = 300;

            e.setMaxVelocity(1000);
            e.setVelocity(velocity.x * force, velocity.y * force);
        }

        if (kill) {
            this.scene.cameras.main.shake(50, 0.005);
        }

        projectile.destroy();
    }

    public updateCombatAI(commander: Player, drone: Player | null, enemyGroup: Phaser.GameObjects.Group, projectileGroup: Phaser.GameObjects.Group) {
        commander.updateCombat(enemyGroup, projectileGroup);
        if (drone) drone.updateCombat(enemyGroup, projectileGroup);
    }
}
