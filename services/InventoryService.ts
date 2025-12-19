import { Utils } from 'phaser';
import { ItemInstance, ItemDef, ItemRarity, ItemStats, Loadout, Backpack, PlayerProfile } from '../types';
import { ItemLibrary } from '../game/data/library/items';

const STORAGE_KEY_V4 = 'SYNAPSE_NEO_INVENTORY_V4';

class InventoryService {
    private state: PlayerProfile;
    private listeners: ((state: PlayerProfile) => void)[] = [];

    constructor() {
        this.state = this.load();
    }

    private load(): PlayerProfile {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_V4);
            if (raw) return JSON.parse(raw);
        } catch (e) { console.error(e); }

        return this.createDefaultProfile();
    }

    private createDefaultProfile(): PlayerProfile {
        return {
            id: 'USER_01',
            credits: 100,
            stash: [],
            loadout: {
                mainWeapon: this.createItem('weapon_crowbar_t0'), // Freebie
                module_1: null,
                module_2: null
            },
            backpack: {
                slots: Array(6).fill(null),
                capacity: 6
            }
        };
    }

    // --- Helpers ---

    public createItem(defId: string): ItemInstance {
        const def = ItemLibrary.get(defId);
        // Fallback or Normal creation logic
        const base = def || {
            name: 'Unknown',
            type: 'MATERIAL',
            tier: 0,
            baseStats: { damage: 0, range: 0, fireRate: 0 },
            rarity: 'COMMON'
        };

        return {
            uid: Utils.String.UUID(),
            defId: defId,
            displayName: base.name,
            name: base.name,
            rarity: (base.rarity as ItemRarity) || ItemRarity.COMMON,
            computedStats: { ...base.baseStats } as any
        };
    }

    public getState() { return this.state; }

    // --- Core Loop Items ---

    // [ACTION] Pick up item -> Backpack
    // Returns success (true) or full (false)
    public addToBackpack(item: ItemInstance): boolean {
        const idx = this.state.backpack.slots.findIndex(s => s === null);
        if (idx === -1) return false; // Full

        this.state.backpack.slots[idx] = item;
        this.save();
        return true;
    }

    // [ACTION] Upload / Extract -> Stash
    public secureBackpack() {
        // Move all non-null items to stash
        const loot = this.state.backpack.slots.filter(i => i !== null) as ItemInstance[];
        this.state.stash.push(...loot);

        // Clear Backpack
        this.state.backpack.slots.fill(null);
        this.save();
        return loot.length;
    }

    // [ACTION] Death -> Lose Backpack
    public clearBackpack() {
        const lostCount = this.state.backpack.slots.filter(i => i !== null).length;
        this.state.backpack.slots.fill(null);
        this.save();
        return lostCount;
    }

    // --- Management ---

    public equipFromStash(itemUid: string, slot: keyof Loadout) {
        const itemIdx = this.state.stash.findIndex(i => i.uid === itemUid);
        if (itemIdx === -1) return;

        const item = this.state.stash[itemIdx];

        // Swap
        const current = this.state.loadout[slot];
        if (current) {
            this.state.stash[itemIdx] = current; // Return old to stash
        } else {
            this.state.stash.splice(itemIdx, 1); // Just remove
        }

        this.state.loadout[slot] = item;
        this.save();
    }

    public unequipToStash(slot: keyof Loadout) {
        const current = this.state.loadout[slot];
        if (!current) return;

        this.state.stash.push(current);
        this.state.loadout[slot] = null;
        this.save();
    }

    // [COMPAT] Legacy Logic Support
    public processLootBag(lootDefIds: string[]) {
        lootDefIds.forEach(id => this.addItemToStash(id));
    }

    public processExtractionLoot(lootDefIds: string[]) {
        this.processLootBag(lootDefIds);
    }

    // [COMPAT] Wrapper for old direct add
    public addItemToStash(defId: string) {
        this.state.stash.push(this.createItem(defId));
        this.save();
    }

    public punishDeath(classId: string): string | null {
        // [OPERATION DUAL-TRACK]
        // Death penalty: Lose Backpack + Random Stash Item?
        // Current logic: Random stash item loss (Legacy) + Backpack clear (New)
        this.clearBackpack();

        if (this.state.stash.length > 0) {
            const idx = Math.floor(Math.random() * this.state.stash.length);
            const item = this.state.stash[idx];
            const name = item.displayName || "Unknown Item";
            this.state.stash.splice(idx, 1);
            this.save();
            return name;
        }
        return null;
    }

    // --- Persistence ---

    private save() {
        localStorage.setItem(STORAGE_KEY_V4, JSON.stringify(this.state));
        this.notify();
    }

    public subscribe(cb: (s: PlayerProfile) => void) {
        this.listeners.push(cb);
        return () => { this.listeners = this.listeners.filter(l => l !== cb); };
    }

    private notify() {
        this.listeners.forEach(cb => cb(this.state));
    }
}

export const inventoryService = new InventoryService();
