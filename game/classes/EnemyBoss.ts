import { Enemy } from './Enemy';
import { COLORS } from '../../constants';

// Boss enemy – larger, multi‑phase, spawns minions
export class EnemyBoss extends Enemy {
    private phase: number = 0;
    private phaseTimer?: Phaser.Time.TimerEvent;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y);
        // Visual: larger and distinct color
        this.graphics.clear();
        this.graphics.fillStyle(COLORS.primary, 1);
        this.graphics.fillRect(-20, -20, 40, 40);
        this.graphics.fillStyle(0x000000, 0.5);
        this.graphics.fillRect(-10, -10, 20, 20);
        // Stats for boss
        this.setDifficulty(1, 10, false);
        this.startPhases();
    }

    private startPhases() {
        // Switch phases every 5 seconds
        this.phaseTimer = this.scene.time.addEvent({
            delay: 5000,
            callback: this.nextPhase,
            callbackScope: this,
            loop: true,
        });
    }

    private nextPhase() {
        this.phase = (this.phase + 1) % 3;
        // Change speed / behavior per phase
        switch (this.phase) {
            case 0:
                this.moveSpeed = 80;
                break;
            case 1:
                this.moveSpeed = 120;
                break;
            case 2:
                this.moveSpeed = 60;
                // Spawn minions
                this.spawnMinions();
                break;
        }
    }

    private spawnMinions() {
        // Simple minion spawn around boss
        for (let i = 0; i < 3; i++) {
            const angle = (i / 3) * Math.PI * 2;
            const radius = 60;
            const x = this.x + Math.cos(angle) * radius;
            const y = this.y + Math.sin(angle) * radius;
            const minion = new Enemy(this.scene, x, y);
            minion.setDifficulty(1, 1, false);
            (this.scene as any).enemyGroup?.add(minion);
        }
    }

    // Override kill to clean up timer
    kill() {
        if (this.phaseTimer) this.phaseTimer.remove(false);
        super.kill();
    }
}
