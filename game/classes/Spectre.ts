import Phaser from 'phaser';
import { Player } from './Player';
import { COLORS } from '../../constants';
import { Enemy } from './Enemy';
import { Projectile } from './Projectile';

export class Spectre extends Player {
    private isStealthed: boolean = false;
    private snipeLine: Phaser.GameObjects.Graphics;

    constructor(scene: Phaser.Scene, x: number, y: number, id: string, isLocal: boolean) {
        super(scene, x, y, id, isLocal);

        // Visual distinction: Sprite
        this.coreShape.visible = false;

        this.visualSprite = scene.add.sprite(0, 0, 'hero_spectre');
        this.visualSprite.setDisplaySize(60, 60);
        this.add(this.visualSprite);

        // 1. Snipe Aim Line
        this.snipeLine = scene.add.graphics();
        this.add(this.snipeLine);

        // 2. Cooldowns
        this.maxCooldowns['skill1'] = 4000; // Vanish
        this.maxCooldowns['skill2'] = 1500; // Snipe (short cd, ammo?) lets say 1.5s is fine for main weapon feel if strong
    }

    // drawOrigamiGhost removed

    update() {
        super.update();

        if (this.isStealthed) {
            this.alpha = 0.3; // Ghostly
            // Maybe speed boost?
        } else {
            this.alpha = 1;
        }
    }

    // Skill 1: Vanish (Stealth)
    triggerSkill1() {
        if ((this.cooldowns['skill1'] || 0) > 0) return;

        this.isStealthed = true;
        this.cooldowns['skill1'] = this.maxCooldowns['skill1'];

        // Drop aggro logic would need to be in Enemy AI check
        // Duration 2s
        this.scene.time.delayedCall(2000, () => {
            this.isStealthed = false;
        });

        // Visual text
        this.showFloatText("VANISH");
    }

    // Skill 2: Snipe (Piercing Shot)
    triggerSkill2() {
        if ((this.cooldowns['skill2'] || 0) > 0) return;

        // Fire logic
        // We need the Projectile Group. Since triggerSkill is generic, we might need access to scene level groups.
        // OR we just spawn it and let scene handle it.
        // Let's emit an event or accessing scene.
        const mainScene = this.scene as any; // Quick access
        if (mainScene.fireProjectile) {
            // angle correction
            const angle = this.rotation - Math.PI / 2;
            const vecX = Math.cos(angle);
            const vecY = Math.sin(angle);

            mainScene.fireProjectile(this.x + vecX * 30, this.y + vecY * 30, angle, 2000, 50, 'piercing'); // speed 2000, dmg 50

            // Recoil
            const body = this.body as Phaser.Physics.Arcade.Body;
            body.setVelocity(-vecX * 500, -vecY * 500);
        }

        this.isStealthed = false; // Break stealth
        this.cooldowns['skill2'] = this.maxCooldowns['skill2'];
    }

    showFloatText(msg: string) {
        const txt = this.scene.add.text(this.x, this.y - 40, msg, { fontSize: '10px', color: '#FFF' }).setOrigin(0.5);
        this.scene.tweens.add({
            targets: txt,
            y: this.y - 60,
            alpha: 0,
            duration: 800,
            onComplete: () => txt.destroy()
        });
    }
}
