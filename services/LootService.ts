import Phaser from 'phaser';
import { Utils } from 'phaser';
import { ItemDef, ItemRarity, ItemType, ItemInstance, ItemModifier } from '../types';
import { ItemLibrary } from '../game/data/library/items';
import { PREFIXES } from '../game/data/library/affixes/prefixes';
import { SUFFIXES } from '../game/data/library/affixes/suffixes';

export class LootService {
    private scene: Phaser.Scene;
    public group: Phaser.GameObjects.Group;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.group = scene.add.group();
    }

    /**
     * 生成物品實體
     * @param tier 物品階級
     * @param defId (可選) 指定物品 ID，若無則從 Tier 隨機
     */
    static generateLoot(tier: number, defId?: string): ItemInstance | null {
        // 1. 獲取定義 (Definition)
        let def: ItemDef | undefined | null;
        if (defId) {
            def = ItemLibrary.get(defId);
        } else {
            def = ItemLibrary.getRandomDef(tier);
        }

        if (!def) {
            console.warn(`❌ No item definition found for Tier ${tier}`);
            // Fallback to T0 if T1 fail
            if (tier > 0) return this.generateLoot(0);
            return null;
        }

        // 2. 隨機骰詞條 (RNG Roll)
        let prefix: ItemModifier | undefined;
        let suffix: ItemModifier | undefined;

        // T0 規則：必帶負面/描述性前綴
        if (tier === 0) {
            // Check if we have T0 prefixes
            const t0Prefixes = PREFIXES.filter(p => p.tier === 0);
            if (t0Prefixes.length > 0) {
                prefix = Phaser.Utils.Array.GetRandom(t0Prefixes);
            }
        }
        // T1+ 規則：30% 機率有前綴，10% 機率有後綴
        else {
            const highTierPrefixes = PREFIXES.filter(p => p.tier > 0);
            if (Math.random() < 0.3 && highTierPrefixes.length > 0) {
                prefix = Phaser.Utils.Array.GetRandom(highTierPrefixes);
            }

            if (Math.random() < 0.1 && SUFFIXES.length > 0) {
                suffix = Phaser.Utils.Array.GetRandom(SUFFIXES);
            }
        }

        // 3. 計算最終數值 (Compute Stats)
        const base = def.baseStats;
        let dmgMult = 1;
        let speedMult = 1;
        let fireRateMult = 1;

        if (prefix?.stats) {
            if (prefix.stats.damageMult) dmgMult *= prefix.stats.damageMult;
            if (prefix.stats.speedMult) speedMult *= prefix.stats.speedMult;
            if (prefix.stats.fireRateMult) fireRateMult *= prefix.stats.fireRateMult;
        }
        if (suffix?.stats) {
            if (suffix.stats.damageMult) dmgMult *= suffix.stats.damageMult;
        }

        const computedStats = {
            damage: Math.ceil(base.damage * dmgMult),
            range: base.range,
            fireRate: Math.ceil(base.fireRate * (1 / fireRateMult)), // 攻速越快間隔越短. fireRate here implies 'delay' not 'rpm'
            critChance: base.critChance || 0,
            speed: base.speed || 0,
            defense: base.defense || 0,
            hpMax: base.hpMax || 0
        };

        if (prefix?.stats.critAdd) computedStats.critChance += prefix.stats.critAdd;

        // 4. 組合名稱
        let displayName = def.name;
        if (prefix) displayName = `${prefix.name}${displayName}`; // Chinese logic: Prefix + Name
        if (suffix) displayName = `${displayName}${suffix.name}`;

        // 5. 返回實體
        return {
            uid: Phaser.Utils.String.UUID(),
            defId: def.id,
            def: def, // [NEW] Link definition
            prefix,
            suffix,
            computedStats,
            displayName,
            name: def.name,
            rarity: (def.rarity as ItemRarity) || ItemRarity.COMMON
        };
    }

    public trySpawnLoot(x: number, y: number, chanceMod: number = 1.0) {
        const roll = Math.random();

        // 15% Chance for Random Weapon (Tier 0-1 for now)
        if (roll < 0.15 * chanceMod) {
            // 50/50 Chance for T0 or T1
            const tier = Math.random() > 0.5 ? 1 : 0;
            this.spawnWeapon(x, y, tier);
            return;
        }
    }

    private spawnItem(x: number, y: number, itemDefId: string) {
        // TODO: Implement Material Spawning
    }

    private spawnWeapon(x: number, y: number, tier: number) {
        const lootInstance = LootService.generateLoot(tier);
        if (!lootInstance) return;

        const def = ItemLibrary.get(lootInstance.defId);
        if (!def) return;

        // Visual
        // For T0, we don't have separate sprites yet, use generic crate or orb
        const loot = this.scene.add.sprite(x, y, def.icon || 'icon_weapon_crate');
        if (!this.scene.textures.exists(def.icon || 'icon_weapon_crate')) {
            loot.setTexture('icon_scrap_metal'); // Fallback
            loot.setTint(0xFFAA00);
        }

        loot.setDisplaySize(48, 48);
        loot.setScale(0);

        // Physics
        this.scene.physics.add.existing(loot);
        (loot.body as Phaser.Physics.Arcade.Body).setBounce(0.5).setDrag(100).setVelocity(
            Phaser.Math.Between(-50, 50),
            Phaser.Math.Between(-50, 50)
        );

        // Pop
        this.scene.tweens.add({ targets: loot, scale: { from: 0, to: 0.8 }, duration: 400, ease: 'Back.out' });

        // Float
        this.scene.tweens.add({ targets: loot, y: '+=5', duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

        // Store Pickup Data
        loot.setData('itemInstance', lootInstance);

        this.group.add(loot);
    }

    update(time: number, delta: number, player: Phaser.GameObjects.Container) {
        // [JUICE] Wave 11: Magnetic XP
        const magnetRange = 150; // Base range
        const magnetSpeed = 400;

        this.group.getChildren().forEach((child) => {
            const loot = child as Phaser.GameObjects.Sprite;
            if (!loot.active) return;

            const dist = Phaser.Math.Distance.Between(loot.x, loot.y, player.x, player.y);

            if (dist < magnetRange) {
                // Accelerate towards player
                this.scene.physics.moveToObject(loot, player, magnetSpeed);
            } else {
                // Drift stop?
                if (loot.body) (loot.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
            }
        });
    }
}
