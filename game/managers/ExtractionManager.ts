import Phaser from 'phaser';
import { ExtractionZone } from '../classes/ExtractionZone';
import { Player } from '../classes/Player';

export class ExtractionManager {
    private scene: Phaser.Scene;
    private zones: Phaser.GameObjects.Group;
    public worldWidth: number;
    public worldHeight: number;

    constructor(scene: Phaser.Scene, worldWidth: number, worldHeight: number) {
        this.scene = scene;
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;
        this.zones = scene.add.group({ classType: ExtractionZone, runChildUpdate: false });
    }

    public spawnZones() {
        this.zones.clear(true, true);

        // Corner 1: Top Right (far)
        this.zones.add(new ExtractionZone(this.scene, this.worldWidth - 300, 300));

        // Corner 2: Bottom Left (far)
        this.zones.add(new ExtractionZone(this.scene, 300, this.worldHeight - 300));
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
