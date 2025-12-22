import Phaser from 'phaser';
import { BaseMechanic } from './ClassMechanic';
import { Player } from '../classes/Player';
import { EventBus } from '../../services/EventBus';

export class SkirmisherLogic extends BaseMechanic {
    private momentum: number = 0;
    private maxMomentum: number = 100;
    private isCharged: boolean = false;

    // Config
    private readonly CHARGE_PER_SEC = 20; // 5 seconds to charge by running
    private readonly DECAY_PER_SEC = 10;

    constructor(player: Player) {
        super(player);
    }

    update(dt: number): void {
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        const speed = body.velocity.length();

        if (speed > 10) {
            // Running: Build Momentum
            this.momentum = Math.min(this.maxMomentum, this.momentum + (this.CHARGE_PER_SEC * (dt / 1000)));
        } else {
            // Stopped: Decay
            this.momentum = Math.max(0, this.momentum - (this.DECAY_PER_SEC * (dt / 1000)));
        }

        // Check Threshold
        if (this.momentum >= this.maxMomentum && !this.isCharged) {
            this.isCharged = true;
            this.player.stats.crit += 100; // Guaranteed Crit

            // Visual
            EventBus.emit('SHOW_FLOATING_TEXT', {
                x: this.player.x, y: this.player.y - 50,
                text: "CHARGED!", color: "#FF0055"
            });
        }
        else if (this.momentum < this.maxMomentum && this.isCharged) {
            this.discharge();
        }
    }

    private discharge() {
        if (this.isCharged) {
            this.isCharged = false;
            this.player.stats.crit -= 100; // Remove bonus
        }
    }

    onDash(): void {
        // Flick Reward: Instant Charge
        this.momentum = this.maxMomentum;
    }

    // Called externally when weapon fires? 
    // We need to hook into WeaponSystem to consume charge.
    // For now, let's assume charge is consumed on 'Time' or keep it simple: 
    // "Next shot is crit" -> weapon consumes it?
    // Let's implement CONSUME_CHARGE event listener or public method?
    public consumeCharge(): boolean {
        if (this.isCharged) {
            this.momentum = 0;
            this.discharge();
            return true;
        }
        return false;
    }

    draw(g: Phaser.GameObjects.Graphics): void {
        // Draw Momentum Bar
        const pct = this.momentum / this.maxMomentum;

        if (this.isCharged) {
            // Glowing Aura
            g.lineStyle(2, 0xFF0055, 1);
            g.strokeCircle(0, 0, 25);
        }

        // Mini bar under player
        g.fillStyle(0x333333, 0.8);
        g.fillRect(-15, 20, 30, 4);
        g.fillStyle(this.isCharged ? 0xFFFFFF : 0xFF0055, 1);
        g.fillRect(-15, 20, 30 * pct, 4);
    }
}
