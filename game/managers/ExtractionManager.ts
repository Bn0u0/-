import Phaser from 'phaser';
import { ExtractionZone } from '../classes/ExtractionZone';
import { Player } from '../classes/Player';
import { EventBus } from '../../services/EventBus';

export enum ExtractionState {
    CLOSED = 'CLOSED',
    WARNING = 'WARNING',
    OPEN = 'OPEN'
}

export class ExtractionManager {
    private scene: Phaser.Scene;
    private zones: Phaser.GameObjects.Group;
    public worldWidth: number;
    public worldHeight: number;
    private terrainManager?: any;

    // State Machine
    public isLocked: boolean = false;

    constructor(scene: Phaser.Scene, worldWidth: number, worldHeight: number) {
        this.scene = scene;
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;
        this.zones = scene.add.group({ classType: ExtractionZone, runChildUpdate: false });

        // V5.0: Always Open
        this.spawnZones();
    }

    public setTerrainManager(tm: any) {
        this.terrainManager = tm;
        // Refresh zones if terrain loaded late? 
        // For now, let's just stick to initial spawn.
    }

    public update(time: number, delta: number) {
        // No more timer cycle logic.
        // Visual updates for locked state?
    }

    public setLocked(locked: boolean) {
        this.isLocked = locked;
        this.zones.getChildren().forEach((z: any) => {
            (z as ExtractionZone).setLocked(locked);
        });
        EventBus.emit('EXTRACTION_STATE_CHANGE', locked ? 'LOCKED' : 'OPEN');
    }

    public spawnZones() {
        this.zones.clear(true, true);

        // Try to find 2 safe spots
        for (let i = 0; i < 2; i++) {
            let pos = { x: 0, y: 0 };
            if (this.terrainManager) {
                const tile = this.terrainManager.getRandomGroundTile();
                if (tile) pos = tile;
            } else {
                // Fallback
                pos = i === 0 ? { x: this.worldWidth - 300, y: 300 } : { x: 300, y: this.worldHeight - 300 };
            }

            const zone = new ExtractionZone(this.scene, pos.x, pos.y);
            this.zones.add(zone);

            // Spawn Effect
            this.scene.tweens.add({
                targets: zone, scale: { from: 0, to: 1 }, duration: 500, ease: 'Back.out'
            });
        }
    }

    public checkExtraction(player: Player): boolean {
        if (this.isLocked) return false;

        let extracted = false;
        this.zones.getChildren().forEach((z: any) => {
            const zone = z as ExtractionZone;
            const dist = Phaser.Math.Distance.Between(player.x, player.y, zone.x, zone.y);
            const inZone = dist < 100;

            if (zone.updateProgress(16.6, inZone)) {
                extracted = true;
            }
        });
        return extracted;
    }
}
