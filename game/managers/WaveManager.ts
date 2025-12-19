import Phaser from 'phaser';
import { EventBus } from '../../services/EventBus';
import { Enemy } from '../classes/Enemy';
import { EnemyFactory } from '../factories/EnemyFactory';
import { ObjectPool } from '../core/ObjectPool';
import { LootDrone } from '../entities/LootDrone';

export class WaveManager {
    private scene: Phaser.Scene;
    private enemyGroup: Phaser.GameObjects.Group;
    private pool: ObjectPool<Enemy>;

    public wave: number = 1;

    constructor(scene: Phaser.Scene, enemyGroup: Phaser.GameObjects.Group) {
        this.scene = scene;
        this.enemyGroup = enemyGroup;

        // Initialize Pool
        this.pool = new ObjectPool<Enemy>(
            () => {
                const enemy = new Enemy(scene, 0, 0, 'RUSTED'); // Default Faction
                this.enemyGroup.add(enemy);
                enemy.setActive(false).setVisible(false);
                return enemy;
            },
            50, 200
        );
    }

    public startWave(waveNumber: number) {
        this.wave = waveNumber;
        EventBus.emit('WAVE_START', { wave: this.wave });

        // [OPERATION EXTINCTION]
        // Spawning protocols suspended.
        console.log(`[WaveManager] Wave ${waveNumber} Initialized. No hostiles detected.`);

        // [OPERATION DUAL-TRACK]
        // Schedule Supply Drones
        this.scheduleNextDrone();
    }

    private scheduleNextDrone() {
        // 3~5 Minutes (180s ~ 300s) -> Converted to ms
        const delay = Phaser.Math.Between(180000, 300000);
        this.scene.time.delayedCall(delay, () => {
            this.spawnLootDrone();
            this.scheduleNextDrone(); // Loop
        });
    }

    private spawnLootDrone() {
        const x = Phaser.Math.Between(500, 3500); // Inner bounds
        const y = Phaser.Math.Between(500, 3500);

        // Create Drone
        const drone = new LootDrone(this.scene, x, y);

        // [FIX] Self-cleaning Update Listener to prevent Memory Leak
        const updateListener = (time: number, delta: number) => {
            if (drone.scene && drone.active) {
                drone.tick(time, delta, (this.scene as any).commander);
            } else {
                // Drone destroyed or scene changed, remove listener
                this.scene.events.off('update', updateListener);
                // console.log("[WaveManager] Drone Listener Cleaned Up");
            }
        };
        this.scene.events.on('update', updateListener);

        console.log(`🚁 [WaveManager] Supply Drone deployed at ${x},${y}`);
    }

    public update(time: number, delta: number) {
        // [OPERATION EXTINCTION]
        // Loop inactive.

        // Return dead enemies to pool
        const children = this.enemyGroup.getChildren() as Enemy[];
        for (let i = children.length - 1; i >= 0; i--) {
            const enemy = children[i];
            if (!enemy.active) {
                this.pool.release(enemy);
            }
        }
    }

    public cleanup() {
        this.enemyGroup.clear(true, true);
    }
}
