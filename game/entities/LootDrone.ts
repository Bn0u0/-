import Phaser from 'phaser';
import { Player } from '../classes/Player';
import { inventoryService } from '../../services/InventoryService';
import { EventBus } from '../../services/EventBus';

export enum DroneState {
    SPAWNING,
    IDLE,
    CHARGING,
    UPLOADING,
    DEPART
}

export class LootDrone extends Phaser.GameObjects.Container {
    private droneState: DroneState = DroneState.SPAWNING; // Renamed from state to avoid conflict
    private radius: number = 100;
    private chargeTimer: number = 0;
    private maxCharge: number = 5000; // 5 seconds

    // Components
    private sprite: Phaser.GameObjects.Graphics;
    private zone: Phaser.GameObjects.Graphics;
    private progressBar: Phaser.GameObjects.Graphics;
    private light!: Phaser.GameObjects.Light; // Definite assignment

    private _scene: Phaser.Scene;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y);
        this._scene = scene;

        // Visuals
        this.sprite = scene.add.graphics();
        this.sprite.fillStyle(0x00FF00, 1);
        this.sprite.fillRect(-15, -15, 30, 30); // Placeholder Box
        this.add(this.sprite);

        // Zone Visual (Hologram)
        this.zone = scene.add.graphics();
        this.zone.lineStyle(2, 0x00FF00, 0.5);
        this.zone.strokeCircle(0, 0, this.radius);
        this.add(this.zone);

        // Progress Bar
        this.progressBar = scene.add.graphics();
        this.add(this.progressBar);

        // Physics
        scene.add.existing(this);
        scene.physics.world.enable(this);
        (this.body as Phaser.Physics.Arcade.Body).setImmovable(true);

        // Light (Optional, might crash if no LightPipeline)
        // this.light = scene.lights.addLight(0, 0, 200).setColor(0x00FF00).setIntensity(2);
        // Container doesn't support lights easily on children unless pipeline set.
        // Skipping light for now to stay safe.

        this.startSpawnAnim();
    }

    startSpawnAnim() {
        this.y -= 500;
        this.alpha = 0;
        this._scene.tweens.add({
            targets: this,
            y: this.y + 500,
            alpha: 1,
            duration: 2000,
            ease: 'Bounce.Out',
            onComplete: () => {
                this.droneState = DroneState.IDLE;
                EventBus.emit('SHOW_TOAST', '物資無人機已抵達 (Supply Drone Arrived)');
            }
        });
    }

    // Renamed to avoid TS conflict with GameObject.update(...args: any[])
    tick(time: number, delta: number, player: Player) {
        if (this.droneState === DroneState.SPAWNING || this.droneState === DroneState.DEPART) return;

        // Detection
        const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

        if (dist < this.radius) {
            if (this.droneState === DroneState.IDLE) {
                // Hint
                // EventBus.emit('SHOW_HINT', 'HOLD POSITION TO UPLOAD');
                this.droneState = DroneState.CHARGING;
            } else if (this.droneState === DroneState.CHARGING) {
                this.charging(delta);
            }
        } else {
            if (this.droneState === DroneState.CHARGING) {
                // Cancel
                this.droneState = DroneState.IDLE;
                this.chargeTimer = 0;
                this.drawProgress(0);
                EventBus.emit('SHOW_TOAST', '上傳中斷 (Upload Aborted)');
            }
        }
    }

    charging(delta: number) {
        this.chargeTimer += delta;
        const progress = this.chargeTimer / this.maxCharge;
        this.drawProgress(progress);

        // Flicker effect
        this.sprite.alpha = 0.5 + Math.random() * 0.5;

        if (this.chargeTimer >= this.maxCharge) {
            this.upload();
        }
    }

    upload() {
        this.droneState = DroneState.UPLOADING;
        this.chargeTimer = 0;
        this.drawProgress(1);

        // [LOGIC] Secure Loot
        // Ensure inventoryService has secureBackpack
        const count = inventoryService.secureBackpack();
        EventBus.emit('SHOW_TOAST', `上傳成功: ${count} 物品 (Upload Complete)`);
        EventBus.emit('PLAY_SFX', 'UPLOAD_DONE');

        this.depart();
    }

    depart() {
        this.droneState = DroneState.DEPART;
        this._scene.tweens.add({
            targets: this,
            y: this.y - 600,
            alpha: 0,
            duration: 1500,
            ease: 'Back.In',
            onComplete: () => this.destroy()
        });
    }

    drawProgress(pct: number) {
        this.progressBar.clear();
        if (pct <= 0) return;

        const w = 60;
        const h = 8;
        const x = -w / 2;
        const y = -40;

        this.progressBar.fillStyle(0x000000, 1);
        this.progressBar.fillRect(x, y, w, h);

        this.progressBar.fillStyle(0x00FF00, 1);
        this.progressBar.fillRect(x + 1, y + 1, (w - 2) * pct, h - 2);
    }
}
