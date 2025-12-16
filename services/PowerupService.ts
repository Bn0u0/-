import Phaser from 'phaser';
import { COLORS } from '../constants';

export enum PowerupType {
    Speed = 'Speed',
    Shield = 'Shield',
    DoubleScore = 'DoubleScore',
}

interface PowerupConfig {
    type: PowerupType;
    duration: number; // seconds
    color: number;
}

const POWERUP_CONFIGS: Record<PowerupType, PowerupConfig> = {
    [PowerupType.Speed]: { type: PowerupType.Speed, duration: 10, color: 0x00ff00 },
    [PowerupType.Shield]: { type: PowerupType.Shield, duration: 10, color: 0x0000ff },
    [PowerupType.DoubleScore]: { type: PowerupType.DoubleScore, duration: 10, color: 0xffd700 },
};

export class PowerupService {
    private scene: Phaser.Scene;
    public group: Phaser.GameObjects.Group;
    private timer?: Phaser.Time.TimerEvent;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.group = this.scene.add.group({ classType: Phaser.GameObjects.Ellipse, runChildUpdate: true });
        this.startSpawning();
    }

    private startSpawning() {
        // spawn a powerup every 15-25 seconds
        this.timer = this.scene.time.addEvent({
            delay: Phaser.Math.Between(15000, 25000),
            callback: this.spawnPowerup,
            callbackScope: this,
            loop: true,
        });
    }

    private spawnPowerup() {
        const types = Object.values(PowerupType);
        const type = Phaser.Utils.Array.GetRandom(types);
        const cfg = POWERUP_CONFIGS[type];
        const x = Phaser.Math.Between(100, this.scene.scale.width - 100);
        const y = Phaser.Math.Between(100, this.scene.scale.height - 100);
        const powerup = this.scene.add.ellipse(x, y, 20, 20, cfg.color);
        powerup.setData('type', type);
        powerup.setData('duration', cfg.duration);
        this.group.add(powerup);
        // simple tween to pulse
        this.scene.tweens.add({
            targets: powerup,
            scale: { from: 1, to: 1.3 },
            yoyo: true,
            repeat: -1,
            duration: 800,
        });
        // auto remove after 12 seconds if not collected
        this.scene.time.delayedCall(12000, () => {
            if (powerup.active) {
                powerup.destroy();
            }
        });
    }

    // Called from MainScene when player overlaps a powerup
    public collectPowerup(powerup: Phaser.GameObjects.Ellipse) {
        const type: PowerupType = powerup.getData('type');
        const duration: number = powerup.getData('duration');
        powerup.destroy();
        return { type, duration };
    }
}
