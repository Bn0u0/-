import Phaser from 'phaser';
import { MainScene } from '../scenes/MainScene';
import { SentryTurret } from '../entities/SentryTurret';
import { EventBus } from '../../services/EventBus';

export class AllyManager {
    private scene: MainScene;
    public allyGroup: Phaser.GameObjects.Group;

    constructor(scene: MainScene) {
        this.scene = scene;
        this.allyGroup = scene.add.group();

        // Listeners
        EventBus.on('SPAWN_ALLY', this.handleSpawnAlly, this);
    }

    private handleSpawnAlly(data: any) {
        console.log(`[AllyManager] Spawning: ${data.type}`);

        if (data.type === 'SENTRY_TURRET') {
            const turret = new SentryTurret(this.scene, data.x, data.y, this.scene.weaponSystem);
            this.allyGroup.add(turret);
        }
    }

    public update(time: number, delta: number, enemyGroup: Phaser.GameObjects.Group) {
        // Update all allies (Turrets will have their own update method called)
        // Note: Phaser Groups run update() on children automatically if runChildUpdate is set, 
        // but often we want manual control or arguments.

        this.allyGroup.getChildren().forEach((child: any) => {
            if (child.active && child.update) {
                child.update(time, delta, enemyGroup);
            }
        });
    }

    public checkCollisions(enemyGroup: Phaser.GameObjects.Group) {
        // Hard Collision: Enemy vs Turret
        this.scene.physics.collide(enemyGroup, this.allyGroup, (enemy, turret) => {
            // Turret is Immovable, Enemy stops.
            // Logic: Turret takes contact damage?
            if ((turret as any).takeDamage) {
                (turret as any).takeDamage(0.5); // Contact Damage tick
            }
        });
    }

    public clear() {
        this.allyGroup.clear(true, true);
    }

    public destroy() {
        EventBus.off('SPAWN_ALLY', this.handleSpawnAlly, this);
        this.clear();
    }
}
