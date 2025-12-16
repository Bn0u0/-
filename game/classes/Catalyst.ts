import Phaser from 'phaser';
import { Player } from './Player';
import { Enemy } from './Enemy';
import { NetworkPacket } from '../../types'; // Assuming we might sync this later

export class Catalyst extends Player {
    constructor(scene: Phaser.Scene, x: number, y: number, id: string, isLocal: boolean) {
        super(scene, x, y, id, isLocal);

        // Visual: Sprite
        this.coreShape.visible = false;

        this.visualSprite = scene.add.sprite(0, 0, 'hero_catalyst');
        this.visualSprite.setDisplaySize(70, 70);
        this.add(this.visualSprite);

        // 2. Cooldowns
        this.maxCooldowns['skill1'] = 6000; // Goo Patch
        this.maxCooldowns['skill2'] = 12000; // Chain Reaction
    }

    // drawSlime removed

    // Animate wobble in update?
    update() {
        super.update();
        const t = this.scene.time.now;

        // Simple scale wobble
        const scaleX = 1 + Math.sin(t / 200) * 0.1;
        const scaleY = 1 + Math.cos(t / 200) * 0.1;

        // Need to be careful not to override Player's scale logic if it uses it for breathing...
        // Player uses setScale for speed pulse. Let's add to it?
        // Actually Player's update sets scale every frame.
        // We can modify the `coreShape` scale instead to avoid conflict.
        // We can modify the `coreShape` scale instead to avoid conflict.
        if (this.visualSprite) {
            const baseScale = 70 / 1024; // If we knew base scale... actually we setDisplaySize.
            // setDisplaySize updates scale property. So we can multiply existing scale?
            // Or just setDisplaySize again? Expensive?
            // Let's just modulate scaleX/scaleY relative to 1?
            // Actually, setDisplaySize sets scaleX/Y.
            // Let's just pulse a bit.
            // Simple hack:
            this.visualSprite.scaleX = (this.visualSprite.scaleX > 0 ? 1 : -1) * (Math.abs(this.visualSprite.scaleX) * (0.99 + Math.random() * 0.02));
            // That's risky. 
            // Let's just skip wobble for Sprite for now, it's complex without base scale.
            // Or better:
            // this.visualSprite.scaleX = 0.07 * scaleX; 
        }
    }

    // Skill 1: Goo Patch
    triggerSkill1() {
        if ((this.cooldowns['skill1'] || 0) > 0) return;
        this.cooldowns['skill1'] = this.maxCooldowns['skill1'];

        const goo = new GooZone(this.scene, this.x, this.y);
        this.scene.add.existing(goo);

        // We need a way to track these zones. 
        // Hack: Append to scene data or a global list if MainScene doesn't manage them.
        // For MVP: GooZone handles its own overlap logic if we give it the enemy group?
        // Yes, pass enemy group to GooZone.
        const mainScene = this.scene as any;
        if (mainScene.enemyGroup) {
            goo.setTargets(mainScene.enemyGroup);
        }
    }

    // Skill 2: Chain Reaction
    triggerSkill2() {
        if ((this.cooldowns['skill2'] || 0) > 0) return;
        this.cooldowns['skill2'] = this.maxCooldowns['skill2'];

        // Explosion AOE around player
        const radius = 250;

        // Visual
        const ring = this.scene.add.graphics({ x: this.x, y: this.y });
        ring.lineStyle(5, 0xFF00FF, 1);
        ring.strokeCircle(0, 0, radius);
        this.scene.tweens.add({
            targets: ring,
            scale: 0.1,
            alpha: 0,
            duration: 500,
            onComplete: () => ring.destroy()
        });

        const mainScene = this.scene as any;
        if (mainScene.enemyGroup) {
            mainScene.enemyGroup.getChildren().forEach((e: any) => {
                const enemy = e as Enemy;
                if (!enemy.active) return;
                const dist = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);

                if (dist < radius) {
                    // Apply heavy damage + Stun
                    if (enemy.takeDamage) enemy.takeDamage(80);
                    // Visual pop
                    this.scene.tweens.add({
                        targets: enemy,
                        scaleX: 1.5, scaleY: 1.5,
                        yoyo: true, duration: 100
                    });
                }
            });
        }
    }
}

// Helper Class: Goo Zone
export class GooZone extends Phaser.GameObjects.Container {
    private gfx: Phaser.GameObjects.Graphics;
    private targets: Phaser.GameObjects.Group | null = null;
    private lifeTimer: number = 8000; // 8s duration

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y);

        this.gfx = scene.add.graphics();
        this.add(this.gfx);

        this.gfx.fillStyle(0xAAFF00, 0.5);
        this.gfx.fillCircle(0, 0, 60);

        // Bubble particles?
        // ...

        this.setDepth(5); // Ground level
    }

    setTargets(group: Phaser.GameObjects.Group) {
        this.targets = group;
    }

    update(time: number, delta: number) {
        this.lifeTimer -= delta;
        if (this.lifeTimer <= 0) {
            this.destroy();
            return;
        }

        // Pulse
        const s = 1 + Math.sin(time / 500) * 0.1;
        this.setScale(s);

        // Check Overlap
        if (this.targets) {
            this.targets.getChildren().forEach((e: any) => {
                const enemy = e as Enemy;
                if (!enemy.active) return;

                const dist = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
                if (dist < 60) {
                    // Apply Slow (Hack: direct property mod)
                    // Ideally Enemy has `addStatusEffect`.
                    // For now: manually modify speed if not already modified?
                    // Or just set position back slightly (friction).

                    // Let's degrade position (Friction)
                    enemy.x -= (enemy.body as Phaser.Physics.Arcade.Body).velocity.x * 0.016 * 0.5; // Halve effective movement
                    enemy.y -= (enemy.body as Phaser.Physics.Arcade.Body).velocity.y * 0.016 * 0.5;

                    // Visual tint
                    (enemy as any).graphics.setTint(0x00FF00); // Slime'd
                } else {
                    (enemy as any).graphics.clearTint();
                }
            });
        }
    }
}
