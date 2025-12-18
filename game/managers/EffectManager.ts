import Phaser from 'phaser';
import { EventBus } from '../../services/EventBus';
import confetti from 'canvas-confetti';

export class EffectManager {
    private scene: Phaser.Scene;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.setupListeners();
    }

    private setupListeners() {
        EventBus.on('SHOW_FLOATING_TEXT', (data: any) => this.showFloatingText(data));
        EventBus.on('DIRECTOR_STATE_CHANGE', (data: any) => this.showDirectorToast(data));
        EventBus.on('EXTRACTION_STATE_CHANGE', (state: string) => this.showExtractionAlert(state));
        EventBus.on('LOOT_PICKUP_VISUAL', (data: any) => this.showLootText(data));

        // Listen for internal visual triggers from scene if needed, 
        // or just rely on EventBus which is global.

        // Cleanup on shutdown?
        this.scene.events.on('shutdown', () => this.cleanup());
    }

    private cleanup() {
        EventBus.off('SHOW_FLOATING_TEXT');
        EventBus.off('DIRECTOR_STATE_CHANGE');
        EventBus.off('EXTRACTION_STATE_CHANGE');
        EventBus.off('LOOT_PICKUP_VISUAL');
    }

    private showFloatingText(data: { x: number, y: number, text: string, color: string }) {
        const txt = this.scene.add.text(data.x, data.y, data.text, {
            fontSize: '20px', color: data.color, fontStyle: 'bold', stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5).setDepth(2000);

        this.scene.tweens.add({
            targets: txt,
            y: data.y - 50,
            alpha: 0,
            duration: 1000,
            onComplete: () => txt.destroy()
        });
    }

    private showDirectorToast(data: { msg: string }) {
        const txt = this.scene.add.text(this.scene.cameras.main.width / 2, 100, `WARNING: ${data.msg}`, {
            fontSize: '32px', color: '#ff00ff', stroke: '#000', strokeThickness: 4, fontStyle: 'bold'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2000);

        this.scene.tweens.add({
            targets: txt,
            alpha: 0,
            duration: 4000,
            onComplete: () => txt.destroy()
        });
    }

    private showExtractionAlert(state: string) {
        let msg = '';
        let color = '#ffffff';

        if (state === 'WARNING') {
            msg = '⚠️ EXTRACTION SIGNAL DETECTED ⚠️';
            color = '#FFFF00';
        } else if (state === 'OPEN') {
            msg = '>>> EXTRACTION POINTS ACTIVE <<<';
            color = '#00FF00';
        } else if (state === 'CLOSED') {
            msg = 'SIGNAL LOST... RECALIBRATING';
            color = '#FF0000';
        }

        if (msg) {
            const txt = this.scene.add.text(this.scene.cameras.main.width / 2, 200, msg, {
                fontSize: '24px', color: color, stroke: '#000', strokeThickness: 4, fontStyle: 'bold'
            }).setOrigin(0.5).setScrollFactor(0).setDepth(2000);

            this.scene.tweens.add({
                targets: txt, alpha: 0, duration: 5000, onComplete: () => txt.destroy()
            });
        }
    }

    private showLootText(data: { x: number, y: number, text: string, color: string }) {
        const txt = this.scene.add.text(data.x, data.y, data.text, {
            fontSize: '16px', color: data.color, stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5);

        this.scene.tweens.add({
            targets: txt, y: data.y - 100, alpha: 0, duration: 1000, onComplete: () => txt.destroy()
        });
    }

    public triggerConfetti() {
        // JUICE: Confetti Explosion
        const count = 200;
        const defaults = { origin: { y: 0.7 } };

        function fire(particleRatio: number, opts: any) {
            confetti(Object.assign({}, defaults, opts, {
                particleCount: Math.floor(count * particleRatio)
            }));
        }

        fire(0.25, { spread: 26, startVelocity: 55 });
        fire(0.2, { spread: 60 });
        fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
        fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
        fire(0.1, { spread: 120, startVelocity: 45 });
    }

    public showPanicOverlay() {
        // Create a persistent or temporary overlay for boss encounters
        const overlay = this.scene.add.rectangle(0, 0, this.scene.cameras.main.width, this.scene.cameras.main.height, 0xFF0000, 0);
        overlay.setScrollFactor(0).setDepth(1999);

        this.scene.tweens.add({
            targets: overlay,
            alpha: { from: 0.1, to: 0.3 },
            duration: 500,
            yoyo: true,
            repeat: 8, // 4 seconds roughly
            onComplete: () => overlay.destroy()
        });

        const txt = this.scene.add.text(this.scene.cameras.main.width / 2, 200, "WARNING: SECTOR LOCKED\nKILL THE GUARDIAN", {
            fontSize: '40px', color: '#FF0000', fontStyle: 'bold', align: 'center', stroke: '#000', strokeThickness: 6
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);

        this.scene.tweens.add({ targets: txt, alpha: 0, duration: 5000, delay: 1000, onComplete: () => txt.destroy() });
    }
}
