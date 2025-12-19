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
        onPlayerDamaged: (amount: number) => void
    ) {
        // Projectile -> Enemy
        this.scene.physics.overlap(this.projectiles, enemyGroup, (proj: any, enemy: any) => {
            const projectile = proj as Projectile;
            const e = enemy as Enemy;

            const damage = projectile.damage;
            const kill = e.takeDamage(damage);

            // [JUICE] Hit Feedback
            EventBus.emit('SHOW_FLOATING_TEXT', {
                x: e.x, y: e.y,
                text: `${Math.floor(damage)}`,
                color: kill ? '#FFAA00' : '#FFFFFF'
            });

            // [CORE LOOP] Juice Injection
            // 1. Hit Stop
            const hitStopDuration = (projectile.damage > 20) ? 50 : 10;
            try {
                if (!this.scene.physics.world.isPaused) {
                    this.scene.physics.pause();
                    this.scene.time.delayedCall(hitStopDuration, () => {
                        this.scene.physics.resume();
                    });
                }
            } catch (err) {
                // Ignore
            }

            // 2. Flash
            e.setTintFill(0xFFFFFF);
            this.scene.time.delayedCall(50, () => {
                e.clearTint();
            });

            // 3. Knockback
            if (e.body && !kill) {
                // Fix: Type safe vector usage
                const projBody = projectile.body;
                const vx = projBody?.velocity?.x || 0;
                const vy = projBody?.velocity?.y || 0;

                const velocity = new Phaser.Math.Vector2(vx, vy).normalize();
                const force = 300;

                e.setMaxVelocity(1000);
                e.setVelocity(velocity.x * force, velocity.y * force);
            }

            if (kill) {
                this.scene.cameras.main.shake(50, 0.005);
            }

            projectile.destroy();
        });

        // Enemy -> Player (Melee)
        enemyGroup.getChildren().forEach((child: any) => {
            const enemy = child as Enemy;
            if (enemy.isDead) return;

            players.forEach(player => {
                if (!player) return;
                const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, player.x, player.y);
                if (dist < 30) {
                    const p = player as any;
                    if (!p.shielded) {
                        onPlayerDamaged(10);
                    }
                    enemy.die();
                }
            });
        });
    }

    public updateCombatAI(commander: Player, drone: Player | null, enemyGroup: Phaser.GameObjects.Group, projectileGroup: Phaser.GameObjects.Group) {
        commander.updateCombat(enemyGroup, projectileGroup);
        if (drone) drone.updateCombat(enemyGroup, projectileGroup);
    }
}
