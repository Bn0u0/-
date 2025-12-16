import Phaser from 'phaser';

export enum LootRarity {
    COMMON = 0,
    UNCOMMON = 1,
    RARE = 2,
    LEGENDARY = 3
}

export interface LootItemDef {
    id: string;
    name: string;
    rarity: LootRarity;
    value: number;
    color: number;
}

export const LOOT_TABLE: LootItemDef[] = [
    { id: 'scrap_metal', name: 'Scrap Metal', rarity: LootRarity.COMMON, value: 50, color: 0x888888 },
    { id: 'energy_cell', name: 'Energy Cell', rarity: LootRarity.UNCOMMON, value: 150, color: 0x00FF00 },
    { id: 'data_chip', name: 'Encrypted Chip', rarity: LootRarity.RARE, value: 500, color: 0x0088FF },
    { id: 'neuro_core', name: 'Neuro Core', rarity: LootRarity.LEGENDARY, value: 2000, color: 0xFFD700 },
];

export class LootService {
    private scene: Phaser.Scene;
    public group: Phaser.GameObjects.Group;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.group = scene.add.group();
    }

    spawnLoot(x: number, y: number, rarityBias: number = 0) {
        // Roll rarity
        const roll = Math.random() + rarityBias;
        let rarity = LootRarity.COMMON;

        if (roll > 0.95) rarity = LootRarity.LEGENDARY;
        else if (roll > 0.8) rarity = LootRarity.RARE;
        else if (roll > 0.6) rarity = LootRarity.UNCOMMON;

        // Filter table
        const candidates = LOOT_TABLE.filter(i => i.rarity === rarity);
        const itemDef = candidates[Math.floor(Math.random() * candidates.length)] || LOOT_TABLE[0];

        // Create Visual
        const loot = this.scene.add.container(x, y);

        // Box shape
        const box = this.scene.add.rectangle(0, 0, 24, 24, 0x333333);
        box.setStrokeStyle(2, itemDef.color);

        // Glow
        const glow = this.scene.add.star(0, 0, 4, 6, 12, itemDef.color);
        this.scene.tweens.add({
            targets: glow,
            angle: 360,
            duration: 2000,
            repeat: -1
        });

        loot.add([box, glow]);
        loot.setSize(24, 24);
        this.scene.physics.add.existing(loot);
        (loot.body as Phaser.Physics.Arcade.Body).setBounce(0.5).setDrag(100);

        // Store data
        loot.setData('item', itemDef);
        this.group.add(loot);

        return loot;
    }
}
