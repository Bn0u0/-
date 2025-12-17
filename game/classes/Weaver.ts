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
        // Visual distinction: Code Only MVP (HLD Style)
        this.coreShape.visible = false;
        this.visualSprite = scene.add.container(0, 0);
        this.add(this.visualSprite);

        this.drawWeaver();

        this.speedMultiplier = 1.2;
    }

    drawWeaver() {
        const g = this.scene.make.graphics({ x: 0, y: 0 });

        // 1. Central Hub (Small Octagon)
        g.fillStyle(COLORS.primary, 1);
        g.fillCircle(0, 0, 10);

        // 2. Floating Orbitals (Drones)
        const radius = 20;
        for (let i = 0; i < 3; i++) {
            const angle = i * (Math.PI * 2 / 3);
            const ox = Math.cos(angle) * radius;
            const oy = Math.sin(angle) * radius;
            g.fillStyle(COLORS.accent, 1); // Gold bits
            g.fillCircle(ox, oy, 4);
            g.lineStyle(1, 0xFFFFFF, 0.3);
            g.lineBetween(0, 0, ox, oy);
        }

        (this.visualSprite as Phaser.GameObjects.Container).add(g);

        // Animate rotation in update?
        // Simple tween for the sprite container
        this.scene.tweens.add({
            targets: this.visualSprite,
            angle: 360,
            duration: 2000,
            repeat: -1
        });
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
        // Create projectile (Non-pooled for now, should use pool in future if Weaver becomes common)
        const d = this.getDamage();
        const p = new Projectile(this.scene);
        const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);

        // Homing behavior
        p.isHoming = true;
        p.target = target;

        p.fire(this.x, this.y, angle, 500, 1500, 0x00FFFF, d.dmg, this.id);
        projectiles.add(p);

        // Visual kick
        this.scene.tweens.add({
            targets: this,
            scale: { from: 1.2, to: 1 },
            duration: 100
        });
    }
}
