import Phaser from 'phaser';

export class ExtractionZone extends Phaser.GameObjects.Container {
    private gfx: Phaser.GameObjects.Graphics;
    private radius: number = 100;
    public extractTime: number = 3000;
    private currentTimer: number = 0;
    private zoneActive: boolean = true;

    // Label
    private label: Phaser.GameObjects.Text;
    private timerText: Phaser.GameObjects.Text;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y);

        this.gfx = scene.add.graphics();
        this.add(this.gfx);

        // Visual Ring
        this.drawZone(0x00FF00); // Green for Extract

        // Label
        this.label = scene.add.text(0, -120, 'EXTRACTION', {
            fontSize: '18px',
            color: '#00FF00',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        this.add(this.label);

        // Timer
        this.timerText = scene.add.text(0, 0, '', {
            fontSize: '32px',
            color: '#FFFFFF',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        this.add(this.timerText);

        scene.physics.add.existing(this);
        (this.body as Phaser.Physics.Arcade.Body).setCircle(this.radius, -this.radius, -this.radius);
    }

    private drawZone(color: number) {
        this.gfx.clear();
        this.gfx.lineStyle(4, color, 1);
        this.gfx.strokeCircle(0, 0, this.radius);
        this.gfx.fillStyle(color, 0.1);
        this.gfx.fillCircle(0, 0, this.radius);
    }

    // Called by MainScene when player overlaps
    public updateProgress(delta: number, isOverlapping: boolean) {
        if (!this.zoneActive) return false;

        if (isOverlapping) {
            this.currentTimer += delta;
            this.drawZone(0x00FF00); // Pulse?
            this.gfx.alpha = 1;

            const remaining = Math.ceil((this.extractTime - this.currentTimer) / 1000);
            this.timerText.setText(`${remaining}`);

            if (this.currentTimer >= this.extractTime) {
                return true; // EXTRACTED!
            }
        } else {
            if (this.currentTimer > 0) {
                this.currentTimer -= delta * 2; // Decay
                if (this.currentTimer < 0) this.currentTimer = 0;
            }
            this.timerText.setText(this.currentTimer > 0 ? '...' : '');
            this.gfx.alpha = 0.6;
        }
        return false;
    }
}
