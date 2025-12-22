import Phaser from 'phaser';
import { EventBus } from '../../services/EventBus';
import { COLORS } from '../../constants';

export class BootScene extends Phaser.Scene {
    private terminalText!: Phaser.GameObjects.Text;
    private scanline!: Phaser.GameObjects.Rectangle;
    private progressFill!: Phaser.GameObjects.Rectangle; // [NEW]
    private bootLines: string[] = [
        "SYNAPSE OS v4.0.1 (c) 2142",
        "INITIALIZING CORE SYSTEMS...",
        "[OK] MEMORY INTEGRITY CHECK",
        "[OK] NEURAL LINK ESTABLISHED",
        "[OK] WEAPON SYSTEMS ONLINE",
        "[WARN] UNREGISTERED USER DETECTED",
        "LOADING PROFILE...",
        "...",
        "READY."
    ];
    private lineIndex: number = 0;
    private charIndex: number = 0;

    constructor() {
        super('BootScene');
    }

    create() {
        // 1. CRT Background
        this.cameras.main.setBackgroundColor('#001100');

        // 2. Terminal Text
        this.terminalText = this.add.text(40, 40, '', {
            fontFamily: 'Courier New, monospace',
            fontSize: '16px',
            color: '#00FF41',
            wordWrap: { width: this.scale.width - 80 }
        });

        // 3. Scanline Effect
        this.scanline = this.add.rectangle(0, 0, this.scale.width, 2, 0x00FF41, 0.3);
        this.scanline.setOrigin(0);

        this.tweens.add({
            targets: this.scanline,
            y: this.scale.height,
            duration: 3000,
            repeat: -1,
            ease: 'Linear'
        });

        // [NEW] Progress Bar
        const barWidth = 300;
        const barHeight = 20;
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height - 100;

        // Bar Outline
        const barOutline = this.add.rectangle(centerX, centerY, barWidth, barHeight);
        barOutline.setStrokeStyle(2, 0x00FF41);

        // Bar Fill (Starts empty)
        this.progressFill = this.add.rectangle(centerX - barWidth / 2, centerY, 0, barHeight - 4, 0x00FF41);
        this.progressFill.setOrigin(0, 0.5);

        // Loading Label
        this.add.text(centerX, centerY - 30, "SYSTEM LOADING...", {
            fontFamily: 'Courier New',
            fontSize: '14px',
            color: '#00FF41'
        }).setOrigin(0.5);


        // 4. CRT Vignette (Overlay)
        // Simulated with a large semi-transparent texture or graphics?
        // Let's use a subtle Radial Gradient
        const vignette = this.add.graphics();
        vignette.fillStyle(0x000000, 0); // Center clear
        // Actually, graphics gradients are tricky.
        // Let's just draw a border.
        vignette.lineStyle(100, 0x000000, 0.5);
        // vignette.strokeRect(0, 0, this.scale.width, this.scale.height); 
        // Simple dark overlay

        // 5. Start Boot Sequence
        this.time.addEvent({
            delay: 50,
            callback: this.typeNextChar,
            callbackScope: this,
            loop: true
        });

        // 6. Input to Skip (and Unlock Audio)
        this.input.on('pointerdown', () => {
            const soundManager = this.sound as Phaser.Sound.WebAudioSoundManager;
            if (soundManager.context && soundManager.context.state === 'suspended') {
                soundManager.context.resume();
            }
            this.completeBoot();
        });
    }

    private typeNextChar() {
        if (this.lineIndex >= this.bootLines.length) return;

        const line = this.bootLines[this.lineIndex];
        const text = line.substring(0, this.charIndex + 1);

        // Update display: All previous lines + current line partial
        const previousLines = this.bootLines.slice(0, this.lineIndex).join('\n');
        this.terminalText.setText(previousLines + '\n' + text);

        this.charIndex++;

        // Update Progress Bar
        const totalChars = this.bootLines.join('').length;
        // Estimate current progress based on lines
        // A bit rough, but sufficient for visual feedback
        const progress = (this.lineIndex / this.bootLines.length) + (this.charIndex / line.length) * (1 / this.bootLines.length);
        const barWidth = 300;
        this.progressFill.width = Math.min(progress * barWidth, barWidth);

        // Line Complete
        if (this.charIndex >= line.length) {
            this.charIndex = 0;
            this.lineIndex++;
            this.time.delayedCall(200, () => { }); // Small pause between lines? 
            // The loop continues immediately, so pause needs to delay the *next* call.
            // Simplified: just type fast.

            // Speed up or pause based on line content?
            // "..." lines could be slower.

            if (this.lineIndex >= this.bootLines.length) {
                this.progressFill.width = barWidth; // Force full
                this.time.delayedCall(500, () => this.completeBoot());
            }
        }

        // Sound Effect
        // EventBus.emit('PLAY_SFX', 'KEYBOARD_CLACK');
    }

    private isBootComplete: boolean = false;

    private completeBoot() {
        // Prevent double calling
        if (this.isBootComplete || this.scene.isActive('MainScene')) return;
        this.isBootComplete = true;

        // CRT Turn Off Effect
        this.cameras.main.pan(this.scale.width / 2, this.scale.height / 2, 200, 'Power2');
        this.cameras.main.zoomTo(0.01, 200, 'Power2', true, (camera, progress) => {
            if (progress === 1) {
                // Transition to Workbench
                this.scene.start('WorkbenchScene'); // [NEW] Phaser Switch

                // Notify React App (to keep state in sync)
                EventBus.emit('BOOT_COMPLETE');
            }
        });
    }
}
