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
        // Visual: The Bee
        this.drawBee(0xFFDD00); // Yellow
        this.speedMultiplier = 1.2; // Faster
    }

    drawBee(color: number) {
        const shape = (this as any).coreShape as Phaser.GameObjects.Graphics;
        shape.clear();

        // Wings (Draw first to be under body)
        shape.fillStyle(0xFFFFFF, 0.5);
        shape.fillEllipse(-15, -5, 12, 8); // Left Wing
        shape.fillEllipse(15, -5, 12, 8);  // Right Wing

        // Body (Oval)
        shape.fillStyle(color, 1);
        shape.fillEllipse(0, 0, 14, 18);
        shape.lineStyle(1, 0x000000, 1);
        shape.strokeEllipse(0, 0, 14, 18);

        // Stripes
        shape.fillStyle(0x000000, 1);
        shape.fillRect(-10, -3, 20, 3);
        shape.fillRect(-8, 5, 16, 3);

        // Eyes
        shape.fillStyle(0x000000, 1);
        shape.fillCircle(-4, -5, 2);
        shape.fillCircle(4, -5, 2);

        // Stinger
        shape.beginPath();
        shape.moveTo(0, 18);
        shape.lineTo(-2, 22);
        shape.lineTo(2, 22);
        shape.fillStyle(0x000000, 1);
        shape.fillPath();
    }

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
