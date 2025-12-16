import Phaser from 'phaser';
import { Player, Role } from './Player';
import { COLORS } from '../../constants';
import { Enemy } from './Enemy';
import { Projectile } from './Projectile';

export class Weaver extends Player {
    private fireTimer: number = 0;
    private fireInterval: number = 400; // Attack speed

    constructor(scene: Phaser.Scene, x: number, y: number, id: string, isLocal: boolean) {
        super(scene, x, y, id, isLocal);
        // Visual: Sprite
        this.coreShape.visible = false;

        this.visualSprite = scene.add.sprite(0, 0, 'hero_weaver');
        this.visualSprite.setDisplaySize(60, 60);
        this.add(this.visualSprite);

        this.speedMultiplier = 1.2; // Faster
    }

    // drawBee removed

    updateCombat(enemies: Phaser.GameObjects.Group, projectiles: Phaser.GameObjects.Group) {
        this.fireTimer += 16.6;
        if (this.fireTimer > this.fireInterval) {
            // Find target
            const target = this.findNearestEnemy(enemies);
            if (target) {
                this.fire(target, projectiles);
            }
            this.fireTimer = 0;
        }
    }

    private findNearestEnemy(enemies: Phaser.GameObjects.Group): Enemy | null {
        let nearest: Enemy | null = null;
        let minDist = 600; // Range

        enemies.getChildren().forEach((e: any) => {
            const enemy = e as Enemy;
            if (!enemy.active) return;
            const dist = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
            if (dist < minDist) {
                minDist = dist;
                nearest = enemy;
            }
        });
        return nearest;
    }

    private fire(target: Enemy, projectiles: Phaser.GameObjects.Group) {
        // Create projectile
        const p = new Projectile(this.scene, this.x, this.y, 50, this.id);
        const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);

        // Homing behavior
        p.isHoming = true;
        p.target = target;

        p.fire(this.x, this.y, angle, 500, 1500, 0x00FFFF);
        projectiles.add(p);

        // Visual kick
        this.scene.tweens.add({
            targets: this,
            scale: { from: 1.2, to: 1 },
            duration: 100
        });
    }
}
