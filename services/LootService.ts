import Phaser from 'phaser';
import { ItemDef, getItemDef, ItemRarity, ItemType } from '../game/data/Items';

export class LootService {
    private scene: Phaser.Scene;
    public group: Phaser.GameObjects.Group;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.group = scene.add.group();
    }

    public trySpawnLoot(x: number, y: number, chanceMod: number = 1.0) {
        const roll = Math.random();

        // 15% Chance for Artifact
        if (roll < 0.15 * chanceMod) {
            this.spawnItem(x, y, 'art_box_mk1');
            return;
        }

        // 25% Chance for Scrap (if not artifact)
        if (roll < 0.40 * chanceMod) {
            this.spawnItem(x, y, 'm_scrap');
            return;
        }
    }

    private spawnItem(x: number, y: number, itemDefId: string) {
        const def = getItemDef(itemDefId);
        if (!def) return;

        // Visuals: Use Sprite Icon
        let texture = 'icon_scrap_metal';
        if (def.type === ItemType.ARTIFACT) texture = 'icon_artifact_box';

        const loot = this.scene.add.sprite(x, y, texture);
        loot.setDisplaySize(48, 48); // Standard Size
        loot.setScale(0); // Pop in start

        // Physics
        this.scene.physics.add.existing(loot);
        (loot.body as Phaser.Physics.Arcade.Body).setBounce(0.5).setDrag(100).setVelocity(
            Phaser.Math.Between(-50, 50),
            Phaser.Math.Between(-50, 50)
        );

        // Pop & Bounce Animation
        this.scene.tweens.add({
            targets: loot,
            scale: { from: 0, to: 0.6 }, // 0.6 relative to original texture size
            y: y - 20,
            duration: 400,
            ease: 'Back.out',
        });

        // Floating Animation
        this.scene.tweens.add({
            targets: loot,
            y: '+=5',
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.inOut',
            delay: 400
        });

        // Store Definition Data for Pickup
        loot.setData('itemDef', def);

        this.group.add(loot);
    }


}
