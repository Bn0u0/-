import Phaser from 'phaser';
import { EventBus } from '../../services/EventBus';
import { Enemy } from '../classes/Enemy';
import { EnemyFast } from '../classes/EnemyFast';
import { EnemyTank } from '../classes/EnemyTank';
import { EnemyBoss } from '../classes/EnemyBoss';
import { EnemyCharger } from '../classes/EnemyCharger';
import { EnemySentinel } from '../classes/EnemySentinel';
import { EnemyPhalanx } from '../classes/EnemyPhalanx';
import { EnemyDefragmenter } from '../classes/EnemyDefragmenter';
import { ObjectPool } from '../core/ObjectPool';
import { DirectorSystem } from '../systems/DirectorSystem';

export type WaveState = 'PREPARING' | 'SPAWNING' | 'COMBAT' | 'COMPLETE';

export class WaveManager {
    private scene: Phaser.Scene;
    private enemyGroup: Phaser.GameObjects.Group;
    private pools: Map<string, ObjectPool<Enemy>>;

    public wave: number = 1;
    public waveState: WaveState = 'SPAWNING';
    private spawnTimer: Phaser.Time.TimerEvent | null = null;

    // Director
    private director: DirectorSystem;

    constructor(scene: Phaser.Scene, enemyGroup: Phaser.GameObjects.Group) {
        this.scene = scene;
        this.enemyGroup = enemyGroup;
        this.pools = new Map();

        // Initialize Pools
        this.createPool('fast', () => new EnemyFast(scene, 0, 0));
        this.createPool('tank', () => new EnemyTank(scene, 0, 0));
        this.createPool('scout', () => new EnemyFast(scene, 0, 0)); // Scout = Fast for now
        this.createPool('vanguard', () => new EnemyCharger(scene, 0, 0)); // Map 'vanguard' to Charger or whatever

        // New Anomalies
        this.createPool('sentinel', () => new EnemySentinel(scene, 0, 0));
        this.createPool('phalanx', () => new EnemyPhalanx(scene, 0, 0));
        this.createPool('boss', () => new EnemyDefragmenter(scene, 0, 0));

        // Initialize Director
        this.director = new DirectorSystem(scene);
        this.director.onSpawnRequest = (type, cost) => this.trySpawnEnemy(type);
    }

    private createPool(type: string, factory: () => Enemy) {
        this.pools.set(type, new ObjectPool<Enemy>(
            () => {
                const enemy = factory();
                this.enemyGroup.add(enemy);
                enemy.setActive(false).setVisible(false);
                return enemy;
            },
            10, 50 // Size
        ));
    }

    public startWave(waveNumber: number, commanderPosition: { x: number, y: number }) {
        this.wave = waveNumber;
        EventBus.emit('WAVE_START', { wave: this.wave, isElite: false });
    }

    private trySpawnEnemy(type: string): boolean {
        // Resolve type alias if needed
        let poolKey = type;
        if (type === 'scout') poolKey = 'fast';

        const pool = this.pools.get(poolKey);
        if (!pool) {
            console.warn(`No pool for enemy type: ${type}`);
            return false;
        }

        const mainScene = this.scene as any;
        let finalX = 0, finalY = 0;

        if (mainScene.terrainManager) {
            const spawnParams = mainScene.terrainManager.getRandomGroundTile();
            if (spawnParams) {
                finalX = spawnParams.x;
                finalY = spawnParams.y;
            } else {
                return false;
            }
        } else {
            return false;
        }

        const enemy = pool.get();
        if (!enemy) return false;

        enemy.init(finalX, finalY, type);

        // Apply Difficulty
        const diffMult = this.director.difficulty;
        enemy.setDifficulty(diffMult, diffMult, type === 'boss');

        if (!this.enemyGroup.contains(enemy)) this.enemyGroup.add(enemy);

        return true;
    }

    public update(time: number, delta: number) {
        this.director.update(time, delta);

        // Check for Dead Enemies and Release
        const children = this.enemyGroup.getChildren() as Enemy[];
        for (let i = children.length - 1; i >= 0; i--) {
            const enemy = children[i];

            if (!enemy.active) {
                // Determine which pool it belongs to?
                // Ideally enemy has a 'type' property or we deduce from constructor name.
                // Simple hack: release to all pools until one accepts? 
                // ObjectPool.release checks identity usually? 
                // Our ObjectPool.release just pushes to stack. 
                // IF we push Sentinel to Fast pool, next 'Fast' spawn is broken.

                // We need to know the type.
                // Let's check constructor name or store type on Enemy.
                // For MVP, checking instance is reliable.

                if (enemy instanceof EnemySentinel) this.pools.get('sentinel')?.release(enemy);
                else if (enemy instanceof EnemyPhalanx) this.pools.get('phalanx')?.release(enemy);
                else if (enemy instanceof EnemyDefragmenter) this.pools.get('boss')?.release(enemy);
                else if (enemy instanceof EnemyBoss) this.pools.get('boss')?.release(enemy); // Fallback
                else if (enemy instanceof EnemyTank) this.pools.get('tank')?.release(enemy);
                else this.pools.get('fast')?.release(enemy); // Default
            }
        }
    }

    public cleanup() {
        if (this.spawnTimer) this.spawnTimer.remove(false);
        this.enemyGroup.clear(true, true);
        // Clear pools not strictly necessary if scene restarts
    }

    public reset() {
        this.wave = 1;
        this.director.difficulty = 1.0;
        this.director.credits = 0;
        this.cleanup();
    }
}
