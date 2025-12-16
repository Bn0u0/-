import Phaser from 'phaser';
import { EventBus } from '../../services/EventBus';
import { Enemy } from '../classes/Enemy';
import { EnemyFast } from '../classes/EnemyFast';
import { EnemyTank } from '../classes/EnemyTank';
import { EnemyBoss } from '../classes/EnemyBoss';
import { EnemyCharger } from '../classes/EnemyCharger';

export type WaveState = 'PREPARING' | 'SPAWNING' | 'COMBAT' | 'COMPLETE';

export class WaveManager {
    private scene: Phaser.Scene;
    private enemyGroup: Phaser.GameObjects.Group;

    public wave: number = 1;
    public waveState: WaveState = 'PREPARING';
    private enemiesToSpawn: number = 0;
    private spawnTimer: Phaser.Time.TimerEvent | null = null;
    private nextWaveTimer: Phaser.Time.TimerEvent | null = null;

    constructor(scene: Phaser.Scene, enemyGroup: Phaser.GameObjects.Group) {
        this.scene = scene;
        this.enemyGroup = enemyGroup;
    }

    public startWave(waveNumber: number, commanderPosition: { x: number, y: number }) {
        this.wave = waveNumber;
        this.waveState = 'SPAWNING';
        const isElite = this.wave % 5 === 0;
        this.enemiesToSpawn = 8 + (this.wave * 2);

        EventBus.emit('WAVE_START', { wave: this.wave, isElite });

        if (this.spawnTimer) this.spawnTimer.remove(false);
        this.spawnTimer = this.scene.time.addEvent({
            delay: isElite ? 400 : 800,
            callback: () => {
                if (this.enemiesToSpawn > 0) {
                    this.spawnEnemy(isElite, commanderPosition);
                    this.enemiesToSpawn--;
                } else {
                    this.waveState = 'COMBAT';
                    this.spawnTimer?.remove(false);
                }
            },
            loop: true
        });
    }

    private spawnEnemy(isElite: boolean, origin: { x: number, y: number }) {
        const radius = 800 + Math.random() * 400;
        const angle = Math.random() * Math.PI * 2;
        const x = origin.x + Math.cos(angle) * radius;
        const y = origin.y + Math.sin(angle) * radius;

        let enemy: Enemy;
        if (isElite) {
            // Boss or Charger swarm
            if (this.wave % 10 === 0) {
                enemy = new EnemyBoss(this.scene, x, y);
            } else {
                enemy = new EnemyCharger(this.scene, x, y);
            }
        } else {
            // Mix in chargers occasionally in later waves
            const roll = Math.random();
            if (this.wave > 3 && roll < 0.2) {
                enemy = new EnemyCharger(this.scene, x, y);
            } else {
                enemy = Phaser.Math.Between(0, 1) ? new EnemyFast(this.scene, x, y) : new EnemyTank(this.scene, x, y);
            }
        }
        enemy.setDifficulty(1 + (this.wave * 0.05), 1 + (this.wave * 0.1), isElite);
        this.enemyGroup.add(enemy);
    }

    public update() {
        if (this.waveState === 'COMBAT' && this.enemyGroup.countActive() === 0) {
            this.waveState = 'COMPLETE';
            EventBus.emit('WAVE_COMPLETE', this.wave);

            // Auto start next wave logic handled by callee or internal timer? 
            // Original MainScene called startWave(wave+1) after delay.
            // Let's fire event or handle it here if we pass a callback.
            // Be consistent: use callback or event.
            this.nextWaveTimer = this.scene.time.delayedCall(3000, () => {
                // We need new commander position. 
                // Using a callback pattern is safer for dependency injection.
                if (this.onNextWaveRequest) this.onNextWaveRequest(this.wave + 1);
            });
        }
    }

    public onNextWaveRequest: ((nextWave: number) => void) | null = null;

    public cleanup() {
        if (this.spawnTimer) this.spawnTimer.remove(false);
        if (this.nextWaveTimer) this.nextWaveTimer.remove(false);
        this.enemyGroup.clear(true, true);
    }

    public reset() {
        this.wave = 1;
        this.cleanup();
    }
}
