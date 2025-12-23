import Phaser from 'phaser';
import { EventBus } from '../../services/EventBus';
import { CameraDirector } from '../utils/CameraDirector';
import { sessionService } from '../../services/SessionService';
import { SafeArea } from '../utils/SafeArea';

export class WorkbenchScene extends Phaser.Scene {
    private cameraDirector!: CameraDirector;

    // Interactive Zones
    private weaponCrate!: Phaser.GameObjects.Container;
    private heroStand!: Phaser.GameObjects.Container;
    private deployTerminal!: Phaser.GameObjects.Container;
    private blueprints!: Phaser.GameObjects.Container;

    // State
    private currentFocus: 'NONE' | 'CRATE' | 'HERO' | 'DEPLOY' | 'BLUEPRINTS' = 'NONE';

    constructor() {
        super('WorkbenchScene');
    }

    create() {
        console.log("🛠️ [WorkbenchScene] STARTING...");
        this.cameraDirector = new CameraDirector(this);

        // 1. Setup Environment (The Desk)
        this.createEnvironment();

        // 2. Setup Zones
        this.createHeroStand();
        this.createWeaponCrate();
        this.createDeployTerminal();
        this.createBlueprints();

        // 3. Input Setup
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer, gameObjects: any[]) => {
            if (gameObjects.length === 0 && this.currentFocus !== 'NONE') {
                // Clicked empty space -> Back
                this.resetView();
            }
        });

        // 4. Initial Camera (Zoom out to In)
        this.cameras.main.setZoom(0.5);
        this.cameraDirector.reset(1500); // Intro Pan

        // 5. Listen for External Events (UI Overlay interactions)
        EventBus.on('WORKBENCH_ACTION', (action: string) => {
            if (action === 'BACK') this.resetView();
        });
    }

    private createEnvironment() {
        // [BACKGROUND] Solid Dark Environment
        this.add.rectangle(0, 0, this.scale.width * 2, this.scale.height * 2, 0x1a1a1a).setDepth(-10);

        // [ATMOSPHERE]
        // Maybe some floating dust particles?
        const particles = this.add.particles(0, 0, 'flare', {
            x: { min: 0, max: this.scale.width },
            y: { min: 0, max: this.scale.height },
            lifespan: 4000,
            speedY: { min: -10, max: -30 },
            scale: { start: 0.2, end: 0 },
            quantity: 1,
            blendMode: 'ADD'
        });
    }

    private createHeroStand() {
        // [CENTER] The Hero (Paper Doll)
        this.heroStand = this.add.container(0, 50); // Moved up slightly

        // Base
        const base = this.add.circle(0, 150, 60, 0x111111);
        base.setStrokeStyle(3, 0xFFFFFF);

        // Hero Sprite (Placeholder Paper Doll)
        const hero = this.add.rectangle(0, 60, 80, 140, 0x00FFFF);

        // [DEBUG] Add bright outline
        const outline = this.add.rectangle(0, 60, 82, 142);
        outline.setStrokeStyle(4, 0xFF00FF);

        const label = this.add.text(0, -40, "HERO", {
            fontSize: '20px',
            color: '#000',
            backgroundColor: '#FFF',
            padding: { x: 4, y: 2 }
        }).setOrigin(0.5);

        this.heroStand.add([base, hero, outline, label]);
        this.heroStand.setSize(120, 200);
        this.heroStand.setInteractive();

        this.heroStand.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            this.focusOn(this.heroStand, 'HERO', 2.0);
            pointer.event.stopPropagation();
        });
    }

    private createWeaponCrate() {
        // [LEFT] Weapon Crate (Tucked in)
        // Mobile Width is ~400. Center is 0. Left edge is -200.
        this.weaponCrate = this.add.container(-140, 150);

        // Box
        const box = this.add.rectangle(0, 0, 100, 80, 0x8B4513); // Brown Paper
        box.setStrokeStyle(2, 0xFFD700);
        const label = this.add.text(0, -30, "GEAR", { fontSize: '16px', color: '#FFF', fontStyle: 'bold' }).setOrigin(0.5);

        // [DEBUG] Outline
        const debugBox = this.add.rectangle(0, 0, 104, 84);
        debugBox.setStrokeStyle(2, 0x00FF00);

        this.weaponCrate.add([box, label, debugBox]);
        this.weaponCrate.setSize(100, 80);
        this.weaponCrate.setInteractive();

        this.weaponCrate.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            this.focusOn(this.weaponCrate, 'CRATE', 2.5);
            pointer.event.stopPropagation();
        });
    }

    private createDeployTerminal() {
        // [RIGHT] Terminal
        this.deployTerminal = this.add.container(140, 150);

        // Screen
        const screen = this.add.rectangle(0, 0, 100, 80, 0x004400);
        screen.setStrokeStyle(2, 0x00FF00);
        const text = this.add.text(0, 0, "GO", { fontSize: '32px', color: '#00FF00', fontStyle: 'bold' }).setOrigin(0.5);

        // [DEBUG] Outline
        const debugBox = this.add.rectangle(0, 0, 104, 84);
        debugBox.setStrokeStyle(2, 0x00FF00);

        // Blink effect
        this.tweens.add({
            targets: text,
            alpha: 0.5,
            duration: 800,
            yoyo: true,
            repeat: -1
        });

        this.deployTerminal.add([screen, text, debugBox]);

        this.deployTerminal.setSize(100, 80);
        this.deployTerminal.setInteractive();

        this.deployTerminal.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            // Deploy Logic
            this.playDeploySequence();
            pointer.event.stopPropagation();
        });
    }

    private createBlueprints() {
        // [BOTTOM] Blueprints - Character Switch
        // [AUTO-ADAPT] Place relative to bottom Safe Area
        const bottomY = (this.cameras.main.height / 2) - 80 - SafeArea.bottom;

        // If no safe area (Desktop), just stick to 300? 
        // 300 is usually fine, but lets be robust.
        // Wait, camera (0,0) is center. Height is usually ~800. Half-height ~400.
        // So bottom edge is y=400.
        // We want it at y=320 (ish).
        // Let's use dynamic calculation.

        const viewHeight = this.cameras.main.height;
        const bottomEdge = viewHeight / 2;
        const safeY = bottomEdge - 50 - Math.max(SafeArea.bottom, 20); // 20px padding minimum

        this.blueprints = this.add.container(0, safeY);

        // Rolled papers
        const paper = this.add.rectangle(0, 0, 200, 40, 0xEEEEEE);
        paper.setStrokeStyle(1, 0x999999);
        const text = this.add.text(0, 0, "CLASS SELECT", { color: '#000', fontSize: '14px' }).setOrigin(0.5);

        this.blueprints.add([paper, text]);
        this.blueprints.setSize(200, 50);
        this.blueprints.setInteractive();

        this.blueprints.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            this.focusOn(this.blueprints, 'BLUEPRINTS', 1.5);
            pointer.event.stopPropagation();
        });
    }

    // --- Interaction Logic ---

    private focusOn(target: Phaser.GameObjects.Container, state: typeof this.currentFocus, zoom: number) {
        if (this.currentFocus === state) return;

        // 1. Play Sound
        // this.sound.play('click_mechanical');

        // 2. Camera Move
        this.cameraDirector.zoomTo(target, zoom, 800);
        this.currentFocus = state;

        // 3. Emit UI Event (To React layer if needed, or internal UI)
        EventBus.emit('WORKBENCH_FOCUS', state);
    }

    private resetView() {
        if (this.currentFocus === 'NONE') return;

        this.cameraDirector.reset(800);
        this.currentFocus = 'NONE';
        EventBus.emit('WORKBENCH_FOCUS', 'NONE');
    }

    private playDeploySequence() {
        // Simulating the "Enter Matrix" effect
        this.cameras.main.pan(500, 100, 1000, 'Power2');
        this.cameras.main.zoomTo(10, 1000, 'Expo.In', true, (camera, progress) => {
            if (progress === 1) {
                // Trigger Actual Start
                sessionService.startMatch('SCAVENGER');
            }
        });
    }
}
