import { Enemy } from './Enemy';
import { COLORS } from '../../constants';

// Tank enemy – slower speed, higher health
export class EnemyTank extends Enemy {
    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y);
        // Visual: larger and different color
        this.graphics.clear();
        this.graphics.fillStyle(COLORS.secondary, 1);
        this.graphics.fillRect(-14, -14, 28, 28);
        this.graphics.fillStyle(0x000000, 0.5);
        this.graphics.fillRect(-7, -7, 14, 14);
        // Set specific stats: slower but tanky
        this.setDifficulty(0.7, 2.5, false);
    }
}
