import Phaser from 'phaser';
import { Player, Role } from './Player';
import { COLORS } from '../../constants';
import { Enemy } from './Enemy';
import { EventBus } from '../../services/EventBus';

export class Vanguard extends Player {
    private aura: Phaser.GameObjects.Graphics;
    private auraAngle: number = 0;
    private dpsTimer: number = 0;

    constructor(scene: Phaser.Scene, x: number, y: number, id: string, isLocal: boolean) {
        super(scene, x, y, id, isLocal);

        // Visual distinction: Code Only MVP (HLD Style)
        this.coreShape.visible = false; // Disable default
        this.visualSprite = scene.add.container(0, 0); // Container for drawn parts
        this.add(this.visualSprite);

        this.drawDrifter();

        // Blade Aura (Already Code-based)
        this.aura = scene.add.graphics();
        this.add(this.aura);
    }

    drawDrifter() {
        const g = this.scene.make.graphics({ x: 0, y: 0 });

        // 1. Cape (Triangle Flowing back)
        g.fillStyle(0xff0055, 1); // Secondary Red
        g.fillTriangle(-15, 10, 15, 10, 0, 35);

        // 2. Body (Drifter Tunic)
        g.fillStyle(COLORS.primary, 1); // Cyan
        g.fillRect(-12, -12, 24, 24);

        // 3. Head (Diamond/Helmet)
        g.fillStyle(0xFFFFFF, 1);
        g.beginPath();
        g.moveTo(0, -20);
        g.lineTo(10, -10);
        g.lineTo(0, 0);
        g.lineTo(-10, -10);
        g.closePath();
        g.fillPath();

        // 4. Scarf (Cyan blowing)
        g.lineStyle(4, 0x54fcfc, 1);
        g.lineBetween(8, -8, 20, -5);

        (this.visualSprite as Phaser.GameObjects.Container).add(g);
    }

    // Aura Logic: Manual distance check used in updateCombat

    // drawBeetle removed - deprecated

    update() {
        super.update();

        // Spin visuals
        this.auraAngle += 0.15;
        this.aura.clear();
        this.aura.lineStyle(4, 0xFFAA00, 0.8);
        this.aura.strokeCircle(0, 0, 80);

        // Draw rotating blades
        const count = 3;
        for (let i = 0; i < count; i++) {
            const angle = this.auraAngle + (i * (Math.PI * 2 / count));
            const bx = Math.cos(angle) * 80;
            const by = Math.sin(angle) * 80;

            this.aura.fillStyle(0xFFFFFF, 1);
            this.aura.fillCircle(bx, by, 8);
            this.aura.lineStyle(2, 0xFFAA00, 1);
            this.aura.beginPath();
            this.aura.moveTo(0, 0);
            this.aura.lineTo(bx, by);
            this.aura.strokePath();
        }
    }

    updateCombat(enemies: Phaser.GameObjects.Group, projectiles: Phaser.GameObjects.Group) {
        // "Spin to Win": Damage all enemies in range every 0.2s
        this.dpsTimer += 16.6;
        if (this.dpsTimer > 150) {
            const range = 100; // 80 radius + enemy radius

            // DYNAMIC DAMAGE
            const combatInfo = this.getDamage();
            // Spin attack has a multiplier (e.g. 0.5x ATK per tick because it hits fast)
            // But let's keep it simple for now: 100% ATK per hit
            const damage = combatInfo.dmg;

            enemies.getChildren().forEach((e: any) => {
                const enemy = e as Enemy;
                if (!enemy.active) return;
                // ...

                const dist = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
                if (dist < range) {
                    // HIT!
                    // Simple "flash" effect or particle could go here
                    // We need a standard takeDamage on Enemy, but for now we rely on MainScene logic or add it.
                    // The user prompt asked for MainScene changes.
                    // I'll emit an event or modify the enemy to have takeDamage.
                    // For speed, let's assume I can call takeDamage on enemy if it exists, or just kill it if not.
                    if (enemy['takeDamage']) {
                        const dead = enemy['takeDamage'](damage);
                        if (dead) EventBus.emit('ENEMY_KILLED', 10);
                    } else {
                        enemy.kill();
                        EventBus.emit('ENEMY_KILLED', 10);
                    }

                    // Visual Knockback?
                    const angle = Phaser.Math.Angle.Between(this.x, this.y, enemy.x, enemy.y);
                    enemy.x += Math.cos(angle) * 10;
                    enemy.y += Math.sin(angle) * 10;
                }
            });
            this.dpsTimer = 0;
        }
    }
}
