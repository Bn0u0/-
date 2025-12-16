import Phaser from 'phaser';
import { ExtractionZone } from '../classes/ExtractionZone';
import { Player } from '../classes/Player';

export class ExtractionManager {
    private scene: Phaser.Scene;
    private zones: Phaser.GameObjects.Group;
    public worldWidth: number;
    public worldHeight: number;
    private terrainManager?: any; // Weak ref to avoid circular dep if importing concrete class

    constructor(scene: Phaser.Scene, worldWidth: number, worldHeight: number) {
        this.scene = scene;
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;
        this.zones = scene.add.group({ classType: ExtractionZone, runChildUpdate: false });
    }

    public setTerrainManager(tm: any) {
        this.terrainManager = tm;
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

            this.zones.add(new ExtractionZone(this.scene, pos.x, pos.y));
        }
    }

    public checkExtraction(player: Player): boolean {
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
