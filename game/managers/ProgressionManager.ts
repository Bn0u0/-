import Phaser from 'phaser';
import { EventBus } from '../../services/EventBus';
import { Enemy } from '../classes/Enemy';
import { Player } from '../classes/Player';

export class ProgressionManager {
    private scene: Phaser.Scene;

    // Stats
    public level: number = 1;
    public xp: number = 0;
    public xpToNextLevel: number = 10;
    public score: number = 0;
    public survivalTime: number = 0;
    public doubleScoreActive: boolean = false;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    public update(delta: number) {
        this.survivalTime += delta / 1000;
    }

    public addScore(amount: number) {
        this.score += this.doubleScoreActive ? amount * 2 : amount;
    }

    public handleEnemyKill(enemy: Enemy) {
        const val = enemy.value || 10;
        this.addScore(val);
        // Add XP logic if needed, currently only Level Up via specific events?
        // Wait, original MainScene didn't seem to add XP on kill? 
        // Checking original: `handleEnemyKill` only called `awardScore`. 
        // `levelUp` was called... where? 
        // Original code had `levelUp()` method but I don't see it being called in `handleEnemyKill`.
        // Maybe it was called by XP gems? `LootService` spawns loot.
        // Assuming XP collection handles `levelUp`. 
        // For now, I'll allow `levelUp` to be called externally.
    }

    public levelUp(player: Player, enemies: Phaser.GameObjects.Group) {
        this.level++;
        this.xp = 0;
        this.xpToNextLevel = Math.floor(this.xpToNextLevel * 1.5);

        EventBus.emit('PLAY_SFX', 'LEVEL_UP');

        // Visual: Shockwave
        const ring = this.scene.add.circle(player.x, player.y, 10, 0x00FFFF);
        ring.setStrokeStyle(4, 0x00FFFF);
        ring.setBlendMode(Phaser.BlendModes.ADD);
        this.scene.tweens.add({
            targets: ring,
            radius: 500,
            alpha: 0,
            duration: 800,
            onComplete: () => ring.destroy()
        });

        // Logic: Knockback
        const range = 500;
        enemies.getChildren().forEach((child) => {
            const e = child as Enemy;
            if (!e.active || !e.body) return;

            const dist = Phaser.Math.Distance.Between(player.x, player.y, e.x, e.y);
            if (dist < range) {
                const angle = Phaser.Math.Angle.Between(player.x, player.y, e.x, e.y);
                const force = 400;
                e.body.velocity.x += Math.cos(angle) * force;
                e.body.velocity.y += Math.sin(angle) * force;
                e.takeDamage(5);
            }
        });

        EventBus.emit('SHOW_FLOATING_TEXT', {
            x: player.x,
            y: player.y - 50,
            text: "LEVEL UP!",
            color: '#FFFF00'
        });
    }

    public emitStats(hp: number, maxHp: number, wave: number, enemiesCount: number, player: Player) {
        EventBus.emit('STATS_UPDATE', {
            hp: hp,
            maxHp: maxHp,
            level: this.level,
            xp: this.xp,
            xpToNextLevel: this.xpToNextLevel,
            score: this.score,
            wave: wave,
            enemiesAlive: enemiesCount,
            survivalTime: this.survivalTime,
            matchTimer: 0,
            cooldowns: player ? player.cooldowns : {},
            maxCooldowns: player ? player.maxCooldowns : {},
        });
    }
}
