import Phaser from 'phaser';
import { EventBus } from '../../services/EventBus';
import { CameraDirector } from '../utils/CameraDirector';
import { sessionService } from '../../services/SessionService';

export class WorkbenchScene extends Phaser.Scene {
    private cameraDirector: CameraDirector;

    // Interactive Zones
    private weaponCrate: Phaser.GameObjects.Container;
    private heroStand: Phaser.GameObjects.Container;
    private deployTerminal: Phaser.GameObjects.Container;
    private blueprints: Phaser.GameObjects.Container;

    // State
    private currentFocus: 'NONE' | 'CRATE' | 'HERO' | 'DEPLOY' | 'BLUEPRINTS' = 'NONE';

    constructor() {
        super('WorkbenchScene');
    }

    create() {
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
        // Background: Concrete/Metal Desk Mat
        const bg = this.add.rectangle(0, 0, 1920, 1080, 0x2a2a2a);
        bg.setInteractive(); // Capture clicks for background reset

        // Grid lines (Cutting Mat style)
        const grid = this.add.grid(0, 0, 1920, 1080, 100, 100, 0x000000, 0, 0x444444, 0.2);

        // Lighting: Fake Lamp reflection
        const lampGlow = this.add.circle(400, -300, 600, 0xFFFFCC, 0.1);
        lampGlow.setBlendMode(Phaser.BlendModes.ADD);
    }

    private createHeroStand() {
        // [CENTER] The Hero
        this.heroStand = this.add.container(0, 0);

        // Base
        const base = this.add.circle(0, 150, 80, 0x111111);
        base.setStrokeStyle(2, 0x444444);

        // Hero Sprite (Placeholder Paper Doll)
        const hero = this.add.rectangle(0, 0, 100, 180, 0x00FFFF);
        this.add.text(-30, -20, "HERO", { color: '#000' });

        this.heroStand.add([base, hero]);
        this.heroStand.setSize(200, 400);
        this.heroStand.setInteractive(new Phaser.Geom.Rectangle(-100, -200, 200, 400), Phaser.Geom.Rectangle.Contains);

        this.heroStand.on('pointerdown', (pointer) => {
            this.focusOn(this.heroStand, 'HERO', 2.0);
            pointer.event.stopPropagation();
        });
    }

    private createWeaponCrate() {
        // [LEFT] Weapon Crate
        this.weaponCrate = this.add.container(-500, 100);

        // Box
        const box = this.add.rectangle(0, 0, 300, 200, 0x553311); // Rusty Metal Color
        const label = this.add.text(-100, -30, "ARSENAL", { fontSize: '24px', color: '#DDDDDD', fontStyle: 'bold' });

        this.weaponCrate.add([box, label]);
        this.weaponCrate.setSize(300, 200);
        this.weaponCrate.setInteractive();

        this.weaponCrate.on('pointerdown', (pointer) => {
            this.focusOn(this.weaponCrate, 'CRATE', 2.5);
            pointer.event.stopPropagation();
        });
    }

    private createDeployTerminal() {
        // [RIGHT] Terminal
        this.deployTerminal = this.add.container(500, 100);

        // Screen
        const screen = this.add.rectangle(0, 0, 250, 180, 0x003300);
        const text = this.add.text(-80, -20, "DEPLOY", { fontSize: '32px', color: '#00FF00', fontStyle: 'bold' });

        // Blink effect
        this.tweens.add({
            targets: text,
            alpha: 0.5,
            duration: 800,
            yoyo: true,
            repeat: -1
        });

        this.deployTerminal.add([screen, text]);
        this.deployTerminal.setSize(250, 180);
        this.deployTerminal.setInteractive();

        this.deployTerminal.on('pointerdown', (pointer) => {
            // Deploy Logic
            this.playDeploySequence();
            pointer.event.stopPropagation();
        });
    }

    private createBlueprints() {
        // [BOTTOM] Blueprints
        this.blueprints = this.add.container(0, 400);

        // Rolled papers
        const paper = this.add.rectangle(-100, 0, 200, 40, 0xDDDDDD);
        const text = this.add.text(-80, -10, "BLUEPRINTS", { color: '#000' });

        this.blueprints.add([paper, text]);
        this.blueprints.setSize(200, 50);
        this.blueprints.setInteractive();

        this.blueprints.on('pointerdown', (pointer) => {
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
