import Phaser from 'phaser';

export class ExtractionGate extends Phaser.GameObjects.Zone {
    private graphics: Phaser.GameObjects.Graphics;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 100, 100);

        // Register in Scene
        scene.add.existing(this);
        scene.physics.add.existing(this, true); // Static body

        // Visuals
        this.graphics = scene.add.graphics();
        this.drawGate();
        this.graphics.setDepth(10); // Floor level but visible
    }

    drawGate() {
        this.graphics.clear();

        // Pillar of Light Base
        this.graphics.fillStyle(0xFFFFFF, 0.2);
        this.graphics.fillCircle(this.x, this.y, 50);

        // Rotating Rings (Static draw, animate in update if needed)
        this.graphics.lineStyle(2, 0xFFFFFF, 0.8);
        this.graphics.strokeCircle(this.x, this.y, 45);

        // Particles would be handled by EffectManager ideally
    }

    update(time: number, delta: number) {
        // Pulse Effect
        const alpha = 0.2 + Math.sin(time / 500) * 0.1;
        this.graphics.clear();
        this.graphics.fillStyle(0xFFFFFF, alpha);
        this.graphics.fillCircle(this.x, this.y, 50);
        this.graphics.lineStyle(2, 0xFFFFFF, 0.8);
        this.graphics.strokeCircle(this.x, this.y, 45 + Math.sin(time / 200) * 2);
    }
}
