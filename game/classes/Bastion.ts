import Phaser from 'phaser';
import { Player } from './Player';
import { COLORS } from '../../constants';
import { EventBus } from '../../services/EventBus';
import { Enemy } from './Enemy';

export class Bastion extends Player {
    private shield: Phaser.GameObjects.Graphics;
    private isShieldActive: boolean = false;
    private shieldTimer: number = 0;

    constructor(scene: Phaser.Scene, x: number, y: number, id: string, isLocal: boolean) {
        super(scene, x, y, id, isLocal);

        // Visual distinction: Code Only MVP (HLD Style)
        this.coreShape.visible = false;
        this.visualSprite = scene.add.container(0, 0);
        this.add(this.visualSprite);

        this.drawBastion();

        // 1. Mobile Shield Visuals
        this.shield = scene.add.graphics();
        this.add(this.shield);
        this.shield.alpha = 0;

        // 2. Cooldowns
        this.maxCooldowns['skill1'] = 8000;
        this.maxCooldowns['skill2'] = 5000;

        this.speedMultiplier = 0.8;
    }

    drawBastion() {
        const g = this.scene.make.graphics({ x: 0, y: 0 });

        // 1. Heavy Armor (Square Body)
        g.fillStyle(0x272933, 1); // Dark Metal
        g.fillRect(-18, -18, 36, 36);
        g.lineStyle(2, 0xffffff, 1);
        g.strokeRect(-18, -18, 36, 36);

        // 2. Shield Generator (Backpack)
        g.fillStyle(COLORS.secondary, 1); // Red accent
        g.fillRect(-10, -22, 20, 6);

        // 3. Front Plate (Gold/Yellow)
        g.fillStyle(COLORS.accent, 1);
        g.fillRect(-12, -10, 24, 20);

        (this.visualSprite as Phaser.GameObjects.Container).add(g);
    }

    // drawTortoise removed

    update() {
        super.update();

        if (this.isShieldActive) {
            this.shieldTimer -= 16.6;

            // Pulse effect
            const alpha = 0.1 + Math.abs(Math.sin(this.scene.time.now / 300)) * 0.1;
            this.shield.clear();
            this.shield.fillStyle(0x00FF00, alpha);
            this.shield.lineStyle(2, 0x00FF00, 0.5);
            this.shield.fillCircle(0, 0, 120); // Big 120px radius coverage
            this.shield.strokeCircle(0, 0, 120);

            if (this.shieldTimer <= 0) {
                this.deactivateShield();
            }
        }
    }

    // Skill 1: Mobile Dome
    triggerSkill1() {
        if ((this.cooldowns['skill1'] || 0) > 0) return;

        this.isShieldActive = true;
        this.shieldTimer = 4000; // 4 seconds active
        this.shield.alpha = 1;
        this.cooldowns['skill1'] = this.maxCooldowns['skill1'];

        this.showFloatText("SHIELD UP");
    }

    deactivateShield() {
        this.isShieldActive = false;
        this.shield.clear();
        this.shield.alpha = 0;
    }

    // Skill 2: Shockwave
    triggerSkill2() {
        if ((this.cooldowns['skill2'] || 0) > 0) return;

        this.cooldowns['skill2'] = this.maxCooldowns['skill2'];

        // Visual
        const wave = this.scene.add.graphics({ x: this.x, y: this.y });
        wave.lineStyle(4, 0xFFFFFF, 1);
        wave.strokeCircle(0, 0, 20);
        this.scene.tweens.add({
            targets: wave,
            scaleX: 8, // Expand to 160 radius
            scaleY: 8,
            alpha: 0,
            duration: 400,
            onComplete: () => wave.destroy()
        });

        // Physics logic (Need access to EnemyGroup from Scene or pass it in)
        // HACK: accessing scene data directly if possible, or emitting event
        const mainScene = this.scene as any;
        if (mainScene.enemyGroup) {
            mainScene.enemyGroup.getChildren().forEach((e: any) => {
                const enemy = e as Enemy;
                if (!enemy.active) return;
                const dist = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
                if (dist < 200) { // Hit range
                    // Knockback
                    const angle = Phaser.Math.Angle.Between(this.x, this.y, enemy.x, enemy.y);
                    // Manually push x/y? Or use body velocity?
                    // Enemy update loops seek player, so velocity might be overwritten.
                    // Best to modify position directly or stun them ideally.
                    enemy.x += Math.cos(angle) * 100;
                    enemy.y += Math.sin(angle) * 100;

                    // Stun or Damage?
                    // Stun or Damage?
                    const d = this.getDamage();
                    const finalDmg = Math.floor(d.dmg * 1.5); // 1.5x ATK for Shockwave
                    if (enemy.takeDamage) enemy.takeDamage(finalDmg);
                }
            });
        }
    }

    // Override takeDamage? No easy way unless we change Player.ts or checking in MainScene.
    // Ideally MainScene checks "if target is Bastion and shieldActive, reduce damage".
    public getMitigation(): number {
        return this.isShieldActive ? 0.8 : 0; // 80% reduction? Hardcore.
    }

    showFloatText(msg: string) {
        const txt = this.scene.add.text(this.x, this.y - 40, msg, { fontSize: '10px', color: '#0F0' }).setOrigin(0.5);
        this.scene.tweens.add({
            targets: txt,
            y: this.y - 60,
            alpha: 0,
            duration: 800,
            onComplete: () => txt.destroy()
        });
    }
}
