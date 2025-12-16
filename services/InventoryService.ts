import { InventoryItem, ItemType, Rarity, ITEM_DATABASE, WeaponItem, ArtifactItem } from '../game/data/Items';
import { v4 as uuidv4 } from 'uuid';

export interface InventoryState {
    credits: number;
    stash: InventoryItem[]; // Items in safe storage
    loadout: {
        primaryWeapon: string | null; // UUID of equipped weapon
    };
}

const STORAGE_KEY_V2 = 'SYNAPSE_INVENTORY_V2';

export class InventoryService {
    private state: InventoryState;

    constructor() {
        this.state = this.load();
    }

    // --- Core Operations ---

    public getState() {
        return this.state;
    }

    public addCredits(amount: number) {
        this.state.credits += amount;
        this.save();
    }

    /**
     * Called when extraction is successful.
     * Takes raw loot IDs (strings) and converts them into persistent InventoryItems (mostly Artifacts).
     */
    public processExtractionLoot(lootIds: string[]) {
        const newItems: InventoryItem[] = [];

        lootIds.forEach(originalId => {
            // Map old simple IDs to new Artifacts for now to simulate the "Twist"
            // Old system dropped 'scrap_metal', 'neuro_core'.
            // We map these to Artifacts to force the "Appraisal" loop.

            let artifactDefId = 'artifact_geo_c';
            if (originalId.includes('crypto')) artifactDefId = 'artifact_geo_u';
            if (originalId.includes('neuro')) artifactDefId = 'artifact_geo_l';

            newItems.push(this.createItem(artifactDefId));
        });

        this.state.stash.push(...newItems);
        this.save();
        return newItems;
    }

    public createItem(defId: string): InventoryItem {
        const def = ITEM_DATABASE[defId];
        if (!def) throw new Error(`Unknown item def: ${defId}`);

        const base = {
            id: uuidv4(),
            defId: defId,
            rarity: def.baseRarity,
            type: def.type
        };

        if (def.type === ItemType.WEAPON) {
            // Generate Random Stats? Phase 8 task.
            return {
                ...base,
                type: ItemType.WEAPON,
                stats: { damage: 10, fireRate: 1, range: 100 }
            } as WeaponItem;
        } else if (def.type === ItemType.ARTIFACT) {
            return {
                ...base,
                type: ItemType.ARTIFACT,
                encryptedLevel: 1
            } as ArtifactItem;
        }

        return base as any;
    }

    /**
     * THE GACHA MECHANIC: Decrypt an artifact to get loot.
     */
    public decryptArtifact(itemId: string): InventoryItem | null {
        const index = this.state.stash.findIndex(i => i.id === itemId);
        if (index === -1) return null;

        const artifact = this.state.stash[index];
        if (artifact.type !== ItemType.ARTIFACT) return null;

        // Remove artifact
        this.state.stash.splice(index, 1);

        // Roll for reward (Simple Logic for MVP2)
        // 80% Weapon, 20% Credits (Material)
        const roll = Math.random();
        let newItem: InventoryItem;

        if (roll > 0.2) {
            const weapons = ['w_blaster', 'w_pulse', 'w_sniper'];
            const pick = weapons[Math.floor(Math.random() * weapons.length)];
            newItem = this.createItem(pick);
        } else {
            newItem = this.createItem('m_scrap');
        }

        this.state.stash.push(newItem);
        this.save();
        return newItem;
    }

    public sellItem(itemId: string) {
        const index = this.state.stash.findIndex(i => i.id === itemId);
        if (index === -1) return;

        // Simple value calculation
        const item = this.state.stash[index];
        let value = 100;
        if (item.rarity === Rarity.LEGENDARY) value = 1000;

        this.state.stash.splice(index, 1);
        this.state.credits += value;
        this.save();
    }

    // --- Persistence ---
    private load(): InventoryState {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_V2);
            if (raw) return JSON.parse(raw);
        } catch (e) {
            console.error('Failed to load inventory', e);
        }
        return { credits: 0, stash: [], loadout: { primaryWeapon: null } };
    }

    private save() {
        localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(this.state));
    }
}

export const inventoryService = new InventoryService();
