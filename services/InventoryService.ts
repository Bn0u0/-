import { InventoryItem, ItemType, ITEM_DATABASE, getItemDef, ItemStats, ItemRarity } from '../game/data/Items';

// Define Slots for the Modular System
export enum ModuleSlot {
    CORE = 'CORE',
    DRIVE_1 = 'DRIVE_1',
    DRIVE_2 = 'DRIVE_2',
    PROTOCOL_1 = 'PROTOCOL_1',
    PROTOCOL_2 = 'PROTOCOL_2'
}

export interface InventoryState {
    credits: number;
    stash: InventoryItem[];
    // Single Loadout for "The Unit"
    loadout: Record<ModuleSlot, InventoryItem | null>;
}

const STORAGE_KEY_V3 = 'SYNAPSE_NEO_INVENTORY_V1';

class InventoryService {
    private state: InventoryState;
    private listeners: ((state: InventoryState) => void)[] = [];

    constructor() {
        this.state = this.load();
    }

    private load(): InventoryState {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_V3);
            if (raw) return JSON.parse(raw);
        } catch (e) { console.error(e); }

        // Default / Wipe
        const initial: InventoryState = {
            credits: 100,
            stash: [],
            loadout: {
                [ModuleSlot.CORE]: null,
                [ModuleSlot.DRIVE_1]: null,
                [ModuleSlot.DRIVE_2]: null,
                [ModuleSlot.PROTOCOL_1]: null,
                [ModuleSlot.PROTOCOL_2]: null
            }
        };

        // Starter Kit
        initial.stash.push(this.createItem('core_fusion_common'));
        initial.stash.push(this.createItem('proto_strike_common'));
        initial.stash.push(this.createItem('drive_kinetic_common'));

        return initial;
    }

    // --- Helpers ---

    private createItem(defId: string): InventoryItem {
        return {
            id: Math.random().toString(36).substr(2, 9),
            defId: defId,
            acquiredAt: Date.now(),
            isNew: true
        };
    }

    public getState() { return this.state; }

    // --- V4.0 VIRAL ECONOMY ---

    /**
     * V4.0 "The Lowball":
     * System pays absolute garbage for items.
     * Legendary worth 50,000? System pays 100.
     * Force player to gift it.
     */
    public getSellPrice(item: InventoryItem): number {
        const def = getItemDef(item.defId);
        if (!def) return 0;
        if (def.type === ItemType.MATERIAL) return 10; // Scrap/Currency is standard

        // Lowball Logic
        switch (def.rarity) {
            case ItemRarity.COMMON: return 10;
            case ItemRarity.RARE: return 25;
            case ItemRarity.EPIC: return 50;
            case ItemRarity.LEGENDARY: return 100; // The insult
            case ItemRarity.GLITCH: return 666;
        }
        return 1;
    }

    /**
     * V4.0 "Forced Recruitment":
     * Generates a link to send to a friend.
     * Removes item from stash immediately (placed in "Pending Gift" void).
     */
    public generateGiftLink(item: InventoryItem): string {
        // Remove from stash
        this.state.stash = this.state.stash.filter(i => i.id !== item.id);
        this.save();

        // Mock Link Generation
        // In real backend, this would create a claimable token.
        const code = Math.random().toString(36).substr(2, 6).toUpperCase();
        return `https://synapse.game/gift/${code}?item=${item.defId}`;
    }

    public sellItem(itemId: string) {
        const idx = this.state.stash.findIndex(i => i.id === itemId);
        if (idx === -1) return;

        const item = this.state.stash[idx];
        const val = this.getSellPrice(item);

        this.state.stash.splice(idx, 1);
        this.addCredits(val);
        this.save();
    }


    // --- Actions ---

    public addItemToStash(defId: string) {
        if (!getItemDef(defId)) {
            console.warn(`Attempted to add invalid item: ${defId}`);
            return;
        }
        this.state.stash.push(this.createItem(defId));
        this.save();
    }

    public equipItem(item: InventoryItem, slot: ModuleSlot): boolean {
        const def = getItemDef(item.defId);
        if (!def) return false;

        // Validation: Slot Compatibility
        let valid = false;
        if (def.type === ItemType.CORE && slot === ModuleSlot.CORE) valid = true;
        if (def.type === ItemType.DRIVE && (slot === ModuleSlot.DRIVE_1 || slot === ModuleSlot.DRIVE_2)) valid = true;
        if (def.type === ItemType.PROTOCOL && (slot === ModuleSlot.PROTOCOL_1 || slot === ModuleSlot.PROTOCOL_2)) valid = true;

        if (!valid) return false;

        // Remove from Stash
        this.state.stash = this.state.stash.filter(i => i.id !== item.id);

        // Unequip current
        const current = this.state.loadout[slot];
        if (current) this.state.stash.push(current);

        // Equip
        this.state.loadout[slot] = item;
        this.save();
        return true;
    }

    public unequipItem(slot: ModuleSlot) {
        const item = this.state.loadout[slot];
        if (item) {
            this.state.stash.push(item);
            this.state.loadout[slot] = null;
            this.save();
        }
    }

    // Process Loot (e.g. from Loot Bunny)
    public processLootBag(lootDefIds: string[]) {
        lootDefIds.forEach(id => this.addItemToStash(id));
    }

    public processExtractionLoot(lootDefIds: string[]) {
        this.processLootBag(lootDefIds);
    }

    // Death Penalty: Lose a random item from Stash? Or just return message?
    // User spec: "Loss of all loot". This implies loot carried in run.
    // Loot carried is in MainScene Logic, not persist logic until extraction.
    // So punishDeath might just be for flavor or checking if we lose 'persistent' items (Roguelite).
    // V4.0 spec said "Loot Loss".
    // I will implement it to remove a random item from stash to simulate "Degradation" or just return null for now if logic isn't fully spec'd.
    // Spec says "Social Extraction Loop... penalties for death (loss of all loot)".
    // Usually "Loot" is what you picked up.
    // If punishment operates on *Saved* inventory, that's harsh.
    // I'll make it return null (no persistent loss) but handle the call.
    public punishDeath(classId: string): string | null {
        // Implementation: Just return null for now unless we want to delete stash items.
        // Let's delete one random item from stash to be mean (V5.0).
        if (this.state.stash.length > 0) {
            const idx = Math.floor(Math.random() * this.state.stash.length);
            const item = this.state.stash[idx];
            const name = getItemDef(item.defId)?.name || "Unknown Item";
            this.state.stash.splice(idx, 1);
            this.save();
            return name;
        }
        return null;
    }

    // --- Stats Calculation ---

    public getPlayerStats(): ItemStats {
        const total: ItemStats = { hp: 0, shield: 0, atk: 0, speed: 0, cdr: 0, crit: 0, luck: 0 };

        Object.values(this.state.loadout).forEach(item => {
            if (!item) return;
            const def = getItemDef(item.defId);
            if (!def) return;

            if (def.stats.hp) total.hp = (total.hp || 0) + def.stats.hp;
            if (def.stats.shield) total.shield = (total.shield || 0) + def.stats.shield;
            if (def.stats.atk) total.atk = (total.atk || 0) + def.stats.atk;
            if (def.stats.speed) total.speed = (total.speed || 0) + def.stats.speed;
            if (def.stats.cdr) total.cdr = (total.cdr || 0) + def.stats.cdr;
            if (def.stats.crit) total.crit = (total.crit || 0) + def.stats.crit;
            if (def.stats.luck) total.luck = (total.luck || 0) + def.stats.luck;
        });
        return total;
    }

    public addCredits(amount: number) {
        this.state.credits += Math.floor(amount);
        this.save();
    }

    private save() {
        localStorage.setItem(STORAGE_KEY_V3, JSON.stringify(this.state));
        this.notify();
    }

    public subscribe(cb: (s: InventoryState) => void) {
        this.listeners.push(cb);
        return () => { this.listeners = this.listeners.filter(l => l !== cb); };
    }

    private notify() {
        this.listeners.forEach(cb => cb(this.state));
    }
}

export const inventoryService = new InventoryService();
