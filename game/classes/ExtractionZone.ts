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

    public setLocked(locked: boolean) {
        this.zoneActive = !locked;
        const color = locked ? 0xFF0000 : 0x00FF00;
        this.drawZone(color);
        this.label.setColor(locked ? '#FF0000' : '#00FF00');
        this.label.setText(locked ? 'SEALED' : 'EXTRACTION');
        if (locked) this.timerText.setText('');
    }

    private drawZone(color: number) {
        this.gfx.clear();

        // 1. Base Ring (Static)
        this.gfx.lineStyle(2, color, 0.3);
        this.gfx.strokeCircle(0, 0, this.radius);

        // ... (Keep existing ring logic but pass color) ...
        // To simplify, I will just rewrite the draw logic briefly here to ensure consistency or rely on partial replacement if I was sure about the content.
        // Actually, let's just make drawZone take the color dynamically which it already does.

        // 2. Spinning Data Ring (Dashed)
        const time = this.scene.time.now;

        // Ring A (Clockwise)
        this.gfx.lineStyle(4, color, 0.8);
        const startA = (time / 1000) % (Math.PI * 2);
        this.gfx.beginPath();
        this.gfx.arc(0, 0, this.radius * 0.9, startA, startA + Math.PI / 2);
        this.gfx.strokePath();

        // Ring B (Counter-Clockwise - Inner)
        this.gfx.lineStyle(2, 0xFFFFFF, 0.5);
        const startB = -(time / 800) % (Math.PI * 2);
        this.gfx.beginPath();
        this.gfx.arc(0, 0, this.radius * 0.6, startB, startB + Math.PI * 1.5);
        this.gfx.strokePath();

        // 3. Core Pulse
        const pulse = 0.8 + Math.sin(time / 200) * 0.2;
        this.gfx.fillStyle(color, 0.2 * pulse);
        this.gfx.fillCircle(0, 0, this.radius * 0.4);
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
