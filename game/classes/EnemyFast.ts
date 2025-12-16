import { Enemy } from './Enemy';
import { COLORS } from '../../constants';

// Fast enemy – higher speed, low health
export class EnemyFast extends Enemy {
    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y);
        // Override visual if desired (e.g., different color)
        this.graphics.clear();
        this.graphics.fillStyle(COLORS.primary, 1);
        this.graphics.fillRect(-10, -10, 20, 20);
        this.graphics.fillStyle(0x000000, 0.5);
        this.graphics.fillRect(-5, -5, 10, 10);
        // Set specific stats
        this.setDifficulty(1.5, 0.5, false); // faster, less hp
    }
}
