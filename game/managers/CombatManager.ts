import Phaser from 'phaser';
import { Player } from '../classes/Player';
import { Enemy } from '../classes/Enemy';
import { Projectile } from '../classes/Projectile';
import { EventBus } from '../../services/EventBus';

export class CombatManager {
    private scene: Phaser.Scene;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    public checkCollisions(
        projectileGroup: Phaser.GameObjects.Group,
        enemyGroup: Phaser.GameObjects.Group,
        players: Player[],
        onPlayerDamaged: (amount: number) => void,
        onEnemyKilled: (enemy: Enemy) => void
    ) {
        // Projectile -> Enemy
        this.scene.physics.overlap(projectileGroup, enemyGroup, (proj: any, enemy: any) => {
            const projectile = proj as Projectile;
            const e = enemy as Enemy;

            if (e.takeDamage(projectile.damage)) {
                onEnemyKilled(e);
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
                    enemy.kill();
                }
            });
        });
    }

    public updateCombatAI(commander: Player, drone: Player | null, enemyGroup: Phaser.GameObjects.Group, projectileGroup: Phaser.GameObjects.Group) {
        commander.updateCombat(enemyGroup, projectileGroup);
        if (drone) drone.updateCombat(enemyGroup, projectileGroup);
    }
}
