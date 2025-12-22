import Phaser from 'phaser';
import { BaseMechanic } from './ClassMechanic';
import { Player } from '../classes/Player';
import { EventBus } from '../../services/EventBus';
// import { SentryTurret } from '../entities/SentryTurret'; // Future

export class WeaverLogic extends BaseMechanic {
    private stationaryTime: number = 0;
    private deployCooldown: number = 0;
    private maxTurrets: number = 1; // Level up to increase?
    private activeTurrets: any[] = []; // Placeholder for IDs

    // Config
    private readonly DEPLOY_TIME_MS = 500; // 0.5s stop to deploy
    private readonly COOLDOWN_MS = 4000;

    constructor(player: Player) {
        super(player);
    }

    update(dt: number): void {
        if (this.deployCooldown > 0) {
            this.deployCooldown -= dt;
        }

        const body = this.player.body as Phaser.Physics.Arcade.Body;
        const speed = body.velocity.length();

        if (speed < 10) {
            // Stopped
            if (this.deployCooldown <= 0) {
                this.stationaryTime += dt;

                if (this.stationaryTime >= this.DEPLOY_TIME_MS) {
                    this.deployTurret();
                }
            }
        } else {
            // Moving: Reset timer
            this.stationaryTime = 0;
        }
    }

    private deployTurret() {
        this.stationaryTime = 0;
        this.deployCooldown = this.COOLDOWN_MS;

        // Logic to spawn Turret
        // For now, emit event for Scene to handle, or TODO: SentryTurret class
        EventBus.emit('SPAWN_ALLY', {
            type: 'SENTRY_TURRET',
            x: this.player.x,
            y: this.player.y,
            ownerId: this.player.id
        });

        EventBus.emit('SHOW_FLOATING_TEXT', {
            x: this.player.x, y: this.player.y - 50,
            text: "DEPLOYING!", color: "#00FFFF"
        });
    }

    draw(g: Phaser.GameObjects.Graphics): void {
        // Draw Deployment Progress
        if (this.stationaryTime > 0 && this.deployCooldown <= 0) {
            const pct = Math.min(1, this.stationaryTime / this.DEPLOY_TIME_MS);

            g.lineStyle(2, 0x00FFFF, 1);
            g.beginPath();
            g.arc(0, 0, 20, 0, Math.PI * 2 * pct);
            g.strokePath();
        }
    }
}
