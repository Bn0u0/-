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

        // Create Visual
        const loot = this.scene.add.container(x, y);

        // Visuals based on Item Type
        let color = 0xffffff;
        if (def.rarity === ItemRarity.UNCOMMON) color = 0x00ff00;
        if (def.rarity === ItemRarity.RARE) color = 0x00ffff;
        if (def.rarity === ItemRarity.LEGENDARY) color = 0xffff00;
        if (def.type === ItemType.SCRAP) color = 0x888888;
        if (def.type === ItemType.ARTIFACT) color = 0x0088ff;

        // Base Shape
        const box = this.scene.add.rectangle(0, 0, 24, 24, 0x111111);
        box.setStrokeStyle(2, color);

        // Icon/Text
        const text = this.scene.add.text(0, 0, def.icon, { fontSize: '16px' }).setOrigin(0.5);

        // Effects
        if (def.type === ItemType.ARTIFACT) {
            const glow = this.scene.add.star(0, 0, 4, 8, 16, color, 0.5);
            this.scene.tweens.add({
                targets: glow, angle: 360, duration: 3000, repeat: -1
            });
            loot.add(glow);
        }

        loot.add([box, text]);
        loot.setSize(24, 24);

        this.scene.physics.add.existing(loot);
        (loot.body as Phaser.Physics.Arcade.Body).setBounce(0.5).setDrag(100).setVelocity(
            Phaser.Math.Between(-50, 50),
            Phaser.Math.Between(-50, 50)
        );

        // Store Definition Data for Pickup
        loot.setData('itemDef', def);

        this.group.add(loot);
    }
}
