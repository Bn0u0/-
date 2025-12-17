import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { Player } from './Player';

enum BehaviorState {
    SEEKING,
    PREPARING,
    CHARGING,
    TIRED
}

export class EnemyCharger extends Enemy {
    private behaviorState: BehaviorState = BehaviorState.SEEKING;
    private stateTimer: number = 0;
    private chargeDir: Phaser.Math.Vector2 = new Phaser.Math.Vector2();

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y);

        // Visuals: Spiky or bulky? Let's go Bulky Red
        this.graphics.clear();
        this.graphics.fillStyle(0xFF4444, 1);
        this.graphics.beginPath();
        this.graphics.moveTo(15, 0); // Nose
        this.graphics.lineTo(-10, 15);
        this.graphics.lineTo(-10, -15);
        this.graphics.closePath();
        this.graphics.fillPath();

        // Armor
        this.graphics.lineStyle(2, 0x000000, 1);
        this.graphics.strokePath();

        this.hp = 50; // Tanky
        this.moveSpeed = 80;
    }

    update() {
        super.update(); // 2.5D logic
        if (this.isDead) return;

        const dt = 16.6;
        this.stateTimer -= dt;

        switch (this.behaviorState) {
            case BehaviorState.SEEKING:
                this.handleSeeking();
                break;
            case BehaviorState.PREPARING:
                this.handlePreparing();
                break;
            case BehaviorState.CHARGING:
                this.handleCharging();
                break;
            case BehaviorState.TIRED:
                this.handleTired();
                break;
        }
    }

    private handleSeeking() {
        if (Math.random() < 0.005) { // ~Every 3s approx
            this.behaviorState = BehaviorState.PREPARING;
            this.stateTimer = 1000; // 1s warning

            // Stop
            const body = this.body as Phaser.Physics.Arcade.Body;
            if (body) body.setVelocity(0, 0);

            // Jump up to signal
            this.zVelocity = 8;

            // Flash Red
            this.graphics.fillStyle(0xFF0000, 1);
            this.graphics.fillPath(); // Redder
        }
    }

    private handlePreparing() {
        // Flash or shake
        this.graphics.x = (Math.random() - 0.5) * 4;

        if (this.stateTimer <= 0) {
            this.behaviorState = BehaviorState.CHARGING;
            this.stateTimer = 600; // 0.6s dash

            const angle = this.rotation; // Assuming we face target
            this.chargeDir.set(Math.cos(angle), Math.sin(angle));

            // Launch
            const body = this.body as Phaser.Physics.Arcade.Body;
            if (body) {
                body.maxVelocity.set(600); // Fast!
                body.setVelocity(this.chargeDir.x * 600, this.chargeDir.y * 600);
            }
        }
    }

    private handleCharging() {
        // Trail effect?
        if (this.stateTimer <= 0) {
            this.behaviorState = BehaviorState.TIRED;
            this.stateTimer = 2000; // 2s vulnerablity

            // Stop
            const body = this.body as Phaser.Physics.Arcade.Body;
            if (body) {
                body.drag.set(600);
                body.setVelocity(0, 0);
            }

            // Pants color (Blueish)
            this.graphics.clear();
            this.graphics.fillStyle(0x8888AA, 1); // Grey/Blue
            this.graphics.beginPath();
            this.graphics.moveTo(15, 0);
            this.graphics.lineTo(-10, 15);
            this.graphics.lineTo(-10, -15);
            this.graphics.closePath();
            this.graphics.fillPath();
        }
    }

    private handleTired() {
        if (this.stateTimer <= 0) {
            this.behaviorState = BehaviorState.SEEKING;
            const body = this.body as Phaser.Physics.Arcade.Body;
            if (body) body.maxVelocity.set(100); // Reset

            // Reset Color
            this.graphics.clear();
            this.graphics.fillStyle(0xFF4444, 1);
            this.graphics.beginPath();
            this.graphics.moveTo(15, 0);
            this.graphics.lineTo(-10, 15);
            this.graphics.lineTo(-10, -15);
            this.graphics.closePath();
            this.graphics.fillPath();
            this.graphics.lineStyle(2, 0x000000, 1);
            this.graphics.strokePath();
        }
    }

    public takeDamage(damage: number): boolean {
        if (this.behaviorState === BehaviorState.TIRED) {
            damage *= 2;
            this.scene.cameras.main.shake(20, 0.005);
        }
        return super.takeDamage(damage);
    }

    seekPlayer(players: any[]) {
        if (this.behaviorState !== BehaviorState.SEEKING) {
            if (players.length > 0 && this.behaviorState === BehaviorState.PREPARING) {
                const p = players[0];
                const angle = Phaser.Math.Angle.Between(this.x, this.y, p.x, p.y);
                this.setRotation(angle);
            }
            return;
        }
        super.seekPlayer(players);
    }
}
