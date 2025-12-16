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

        // 0. Visuals: "The Origami Ghost" - Sharp, thin diamond shape
        this.drawOrigamiGhost(0xA388EE); // Lavender/Purple

        // 1. Snipe Aim Line
        this.snipeLine = scene.add.graphics();
        this.add(this.snipeLine);

        // 2. Cooldowns
        this.maxCooldowns['skill1'] = 4000; // Vanish
        this.maxCooldowns['skill2'] = 1500; // Snipe (short cd, ammo?) lets say 1.5s is fine for main weapon feel if strong
    }

    drawOrigamiGhost(color: number) {
        // Clear base shape drawing from Player (if any) or overwrite it
        // We need to access the protected coreShape preferably, but it's private in Player.
        // Wait, Player.ts has private coreShape. I should make it protected in Player.ts or just draw over it?
        // Let's assume I fixed Player.ts to be protected or just use `this.add` for new shape and hide the old one?
        // Actually, Player constructor calls drawHexagon. 
        // Best approach: Change Player `coreShape` to protected in previous step? 
        // I missed that. I will shadow it for now or assume I can access it if I update Player.ts next.
        // Let's assume I update Player.ts to protected coreShape in next step or use 'any' cast.
        const shape = (this as any).coreShape as Phaser.GameObjects.Graphics;
        shape.clear();

        shape.lineStyle(2, 0xFFFFFF, 0.8);
        shape.fillStyle(color, 0.8);

        // Diamond / Kite shape
        const path = new Phaser.Geom.Polygon([
            0, -25,  // Top
            15, 0,   // Right
            0, 35,   // Bottom (Long tail)
            -15, 0   // Left
        ]);

        shape.fillPoints(path.points, true);
        shape.strokePoints(path.points, true);

        // "Fold" line
        shape.lineStyle(1, 0x000000, 0.3);
        shape.beginPath();
        shape.moveTo(0, -25);
        shape.lineTo(0, 35);
        shape.strokePath();
    }

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
