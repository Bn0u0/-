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

        // The projectile is already added to this.projectiles group when created by the pool factory.
        // The pool's get method will call onEnable, which sets active/visible.
    }

    public update(time: number, delta: number) {
        // Cleanup dead projectiles
        const children = this.projectiles.getChildren() as Projectile[];
        for (let i = children.length - 1; i >= 0; i--) {
            const p = children[i];

            // Projectile.update() sets active=false when its lifespan runs out.
            // We check for inactive projectiles that are still in the group
            // and release them back to the pool.
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

            if (e.takeDamage(projectile.damage)) {
                // Killed handled by Enemy event
                this.scene.cameras.main.shake(50, 0.002);
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
                    // Simple melee hit check
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
