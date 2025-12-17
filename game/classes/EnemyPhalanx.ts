import Phaser from 'phaser';
import { Enemy } from './Enemy';

export class EnemyPhalanx extends Enemy {
    private shieldHp: number = 30;
    private maxShieldHp: number = 30;
    private shieldGraphics: Phaser.GameObjects.Graphics;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y);

        // Visuals: Trapezoid (Tank)
        this.graphics.clear();
        this.graphics.fillStyle(0x0055FF, 1); // Neon Blue
        this.graphics.beginPath();
        this.graphics.moveTo(-15, -15);
        this.graphics.lineTo(15, -15);
        this.graphics.lineTo(20, 15);
        this.graphics.lineTo(-20, 15);
        this.graphics.closePath();
        this.graphics.fillPath();

        // Shield (Frontal Arc)
        this.shieldGraphics = scene.add.graphics();
        this.add(this.shieldGraphics);
        this.drawShield();

        this.hp = 60; // Tanky
        this.speed = 50; // Slow
        this.damage = 15;
    }

    private drawShield() {
        this.shieldGraphics.clear();
        if (this.shieldHp > 0) {
            const alpha = this.shieldHp / this.maxShieldHp;
            this.shieldGraphics.lineStyle(4, 0x00FFFF, alpha);
            this.shieldGraphics.beginPath();
            this.shieldGraphics.arc(0, 0, 30, Phaser.Math.DegToRad(220), Phaser.Math.DegToRad(320));
            this.shieldGraphics.strokePath();
        }
    }

    public takeDamage(amount: number, knockback?: Phaser.Math.Vector2): boolean {
        // Directional Blocking?
        // For MVP, if shield is up, it takes damage first.
        // Ideally should check angle.

        if (this.shieldHp > 0) {
            this.shieldHp -= amount;
            this.scene.sound.play('shield_hit', { volume: 0.2 }); // Audio placeholder?
            // Flash shield
            this.drawShield();
            if (this.shieldHp <= 0) {
                // Break effect
                this.scene.cameras.main.shake(10, 0.001);
            }
            return false; // Absorbed
        }

        return super.takeDamage(amount, knockback);
    }
}
