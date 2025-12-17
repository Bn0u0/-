import Phaser from 'phaser';
import { EventBus } from '../../services/EventBus';
import { Enemy } from '../classes/Enemy';
import { EnemyFactory } from '../factories/EnemyFactory';
import { ObjectPool } from '../core/ObjectPool';
import { DirectorSystem } from '../systems/DirectorSystem';

export class WaveManager {
    private scene: Phaser.Scene;
    private enemyGroup: Phaser.GameObjects.Group;
    private pool: ObjectPool<Enemy>;

    public wave: number = 1;
    public waveState: 'SPAWNING' | 'COMBAT' | 'COMPLETE' = 'SPAWNING';
    private spawnTimer: Phaser.Time.TimerEvent | null = null;
    private director: DirectorSystem;

    // Weighted Spawn Tables per Wave Range
    // [EnemyID, Weight]
    private spawnTables: { [range: string]: [string, number][] } = {
        '1-3': [['JELLY', 10], ['WISP', 5], ['CHARGER', 1]],
        '4-6': [['JELLY', 5], ['TRI_DART', 5], ['CHARGER', 3], ['SENTINEL', 1]],
        '7-9': [['TRI_DART', 8], ['CRAB', 5], ['SPLITTER', 3], ['GOLEM', 1]],
        '10+': [['PHANTOM', 5], ['GOLEM', 4], ['LOOT_BUNNY', 1], ['SPLITTER', 5]]
    };

    constructor(scene: Phaser.Scene, enemyGroup: Phaser.GameObjects.Group) {
        this.scene = scene;
        this.enemyGroup = enemyGroup;

        // Single Generic Pool
        this.pool = new ObjectPool<Enemy>(
            () => {
                const enemy = new Enemy(scene, 0, 0);
                this.enemyGroup.add(enemy);
                enemy.setActive(false).setVisible(false);
                return enemy;
            },
            50, 200 // Initial, Max
        );

        this.director = new DirectorSystem(scene);
        this.director.onSpawnRequest = (type, cost) => this.trySpawnEnemy(type);
    }

    public startWave(waveNumber: number) {
        this.wave = waveNumber;
        EventBus.emit('WAVE_START', { wave: this.wave });

        // Start Spawning Loop handled by Director or Timer
        // DirectorSystem usually drives the pacing
    }

    public update(time: number, delta: number) {
        this.director.update(time, delta);

        // V5.0: Infinite Scaling Difficulty
        const minutes = time / 60000;
        const difficulty = 1 + (minutes * 0.2); // +20% per minute
        this.director.setDifficultyMultiplier(difficulty);

        // V5.0: Random Boss Spawn (>150s)
        if (time > 150000 && !this.bossActive) {
            // 1% check per second (approx run every 60 frames)
            if (Math.random() < 0.0002 * delta) {
                this.spawnBoss();
            }
        }

        // Return dead enemies to pool
        const children = this.enemyGroup.getChildren() as Enemy[];
        for (let i = children.length - 1; i >= 0; i--) {
            const enemy = children[i];
            if (!enemy.active) {
                this.pool.release(enemy);
            }
        }
    }

    // Track Boss State
    public bossActive: boolean = false;

    private spawnBoss() {
        this.bossActive = true;
        EventBus.emit('BOSS_SPAWN');

        // Spawn GOLEM as Boss
        const config = EnemyFactory.get('GOLEM'); // Or dedicated Boss type
        // Scale Boss Stats massively
        const mainScene = this.scene as any;
        const player = mainScene.commander;

        const boss = this.pool.get();
        if (boss && player) {
            const angle = Math.random() * Math.PI * 2;
            boss.setPosition(player.x + Math.cos(angle) * 400, player.y + Math.sin(angle) * 400);

            // Boss Modifiers
            config.stats.hp *= 5;
            config.stats.radius *= 1.5;
            config.id = 'BOSS_GOLEM'; // Mark as boss

            boss.configure(config);
            boss.onEnable();

            // Listen for death to unlock
            boss.once('destroy', () => {
                this.bossActive = false;
                // Don't emit here, let MainScene handle ENEMY_KILLED -> check if Boss
            });
        }
    }

    private trySpawnEnemy(requestedType?: string): boolean {
        // Pick type based on Wave if not requested
        const typeId = requestedType || this.pickRandomEnemyType();
        const config = EnemyFactory.get(typeId);

        // Position Logic (Simple Radial or Terrain based)
        // Assume TerrainManager exists on Scene
        const mainScene = this.scene as any;
        let x = 0, y = 0;

        if (mainScene.terrainManager) {
            const ground = mainScene.terrainManager.getRandomGroundTile();
            if (!ground) return false;
            x = ground.x;
            y = ground.y;
        } else {
            // Fallback: Circle around player
            const player = mainScene.commander;
            if (!player) return false;
            const angle = Math.random() * Math.PI * 2;
            const radius = 600;
            x = player.x + Math.cos(angle) * radius;
            y = player.y + Math.sin(angle) * radius;
        }

        const enemy = this.pool.get();
        if (!enemy) return false;

        enemy.setPosition(x, y);
        enemy.configure(config);
        enemy.onEnable();

        return true;
    }

    private pickRandomEnemyType(): string {
        let table = this.spawnTables['10+'];
        if (this.wave <= 3) table = this.spawnTables['1-3'];
        else if (this.wave <= 6) table = this.spawnTables['4-6'];
        else if (this.wave <= 9) table = this.spawnTables['7-9'];

        const totalWeight = table.reduce((sum, item) => sum + item[1], 0);
        let roll = Math.random() * totalWeight;

        for (const [id, weight] of table) {
            roll -= weight;
            if (roll <= 0) return id;
        }
        return 'JELLY';
    }

    public cleanup() {
        this.enemyGroup.clear(true, true);
    }
}
