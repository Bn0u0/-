import { InventoryItem, ItemType, ITEM_DATABASE, getItemDef, EquipmentSlot, ItemStats, ItemRarity } from '../game/data/Items';
import { LOOT_TABLES, rollRarity } from '../game/data/LootTables';

// Simple UUID generator
function genId() { return Math.random().toString(36).substr(2, 9); }

export interface InventoryState {
    credits: number;
    stash: InventoryItem[]; // Un-equipped items (Safe at Home)
    // Loadouts: HeroClass -> { Slot: Item }
    loadouts: Record<string, Record<string, InventoryItem | null>>;
}

const STORAGE_KEY_V2 = 'SYNAPSE_INVENTORY_V3_FULL';

class InventoryService {
    private state: InventoryState;
    private listeners: ((state: InventoryState) => void)[] = [];

    constructor() {
        this.state = this.load();
    }

    private load(): InventoryState {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_V2);
            if (raw) return JSON.parse(raw);
        } catch (e) { console.error(e); }

        // Default / Wipe
        const initial = {
            credits: 100,
            stash: [] as InventoryItem[],
            loadouts: {
                'Vanguard': this.createEmptyLoadout(),
                'Bastion': this.createEmptyLoadout(),
                'Spectre': this.createEmptyLoadout(),
                'Weaver': this.createEmptyLoadout(),
                'Catalyst': this.createEmptyLoadout(),
            }
        };

        // Starter Kit
        initial.stash.push(this.createItem('wpn_vanguard_sword_mk1'));
        initial.stash.push(this.createItem('arm_body_mk1'));

        return initial;
    }

    private createEmptyLoadout() {
        return {
            [EquipmentSlot.HEAD]: null,
            [EquipmentSlot.BODY]: null,
            [EquipmentSlot.LEGS]: null,
            [EquipmentSlot.FEET]: null,
            [EquipmentSlot.MAIN_HAND]: null,
            [EquipmentSlot.OFF_HAND]: null,
        };
    }

    public createItem(defId: string): InventoryItem {
        return {
            id: genId(),
            defId: defId,
            acquiredAt: Date.now(),
            isNew: true
        };
    }

    public getState() { return this.state; }

    // --- Actions ---

    public addItemToStash(defId: string) {
        this.state.stash.push(this.createItem(defId));
        this.save();
    }

    /**
     * Called when extraction is successful.
     */
    public processExtractionLoot(lootIds: string[]) {
        const newItems: InventoryItem[] = [];
        lootIds.forEach(originalId => {
            // Map logic
            let artifactDefId = 'art_box_mk1';
            newItems.push(this.createItem(artifactDefId));
        });
        this.state.stash.push(...newItems);
        this.save();
        return newItems;
    }

    /**
     * DEATH PENALTY:
     * 1. All "Backpack" loot is already lost (because we never called processExtractionLoot).
     * 2. LOSE 1 RANDOM EQUIPPED ITEM from the current hero.
     */
    public punishDeath(heroId: string): string | null {
        const loadout = this.state.loadouts[heroId];
        if (!loadout) return null;

        // Find all equipped slots (non-null)
        const equippedSlots = Object.keys(loadout).filter(slot => loadout[slot] !== null) as EquipmentSlot[];

        if (equippedSlots.length === 0) return null;

        // Pick one to destroy
        const victimSlot = equippedSlots[Math.floor(Math.random() * equippedSlots.length)];
        const victimItem = loadout[victimSlot];

        if (victimItem) {
            // Check if it's a 2H weapon? If so, we might need to clear Offhand too if strictly linked,
            // but our current logic just deletes the Item object.

            // Delete it
            loadout[victimSlot] = null;

            this.state.loadouts[heroId] = loadout;
            this.save();

            const def = getItemDef(victimItem.defId);
            return def ? def.name : 'Unknown Item';
        }
        return null;
    }

    public equipItem(heroClass: string, item: InventoryItem, slot: EquipmentSlot) {
        const def = getItemDef(item.defId);
        if (!def) return false;

        // Class Check
        if (def.classReq && !def.classReq.includes(heroClass)) {
            return false;
        }

        // Slot Check
        if (def.slot !== slot) return false;

        // Remove from Stash
        this.state.stash = this.state.stash.filter(i => i.id !== item.id);

        const loadout = this.state.loadouts[heroClass] || this.createEmptyLoadout();

        // 2-Handed Logic
        // If equipping a 2H weapon, Main Hand takes slot, Off Hand must be unequipped.
        // For MVP, we'll assume standard slot mapping first.
        // Implementation: If Item Name contains "Hammer" or "Rifle" -> Assume 2H for now if not explicit in DB.
        // Better: Check define.
        if (slot === EquipmentSlot.MAIN_HAND && def.isTwoHanded) { // Assuming `isTwoHanded` property exists on ItemDef
            const offHandItem = loadout[EquipmentSlot.OFF_HAND];
            if (offHandItem) {
                this.state.stash.push(offHandItem);
                loadout[EquipmentSlot.OFF_HAND] = null;
            }
        }

        // Unequip target slot
        const current = loadout[slot];
        if (current) this.state.stash.push(current);

        // Equip new
        loadout[slot] = item;
        this.state.loadouts[heroClass] = loadout;

        this.save();
        return true;
    }

    public unequipItem(heroClass: string, slot: EquipmentSlot) {
        const loadout = this.state.loadouts[heroClass];
        if (!loadout) return;

        const item = loadout[slot];
        if (item) {
            this.state.stash.push(item);
            loadout[slot] = null;
            this.save();
        }
    }

    public getHeroStats(heroClass: string): ItemStats {
        const loadout = this.state.loadouts[heroClass];
        if (!loadout) return {};

        const total: ItemStats = { hp: 0, shield: 0, atk: 0, speed: 0, cooldown: 0, crit: 0 };

        Object.values(loadout).forEach(item => {
            if (!item) return;
            const def = getItemDef(item.defId);
            if (!def) return;

            if (def.stats.hp) total.hp = (total.hp || 0) + def.stats.hp;
            if (def.stats.shield) total.shield = (total.shield || 0) + def.stats.shield;
            if (def.stats.atk) total.atk = (total.atk || 0) + def.stats.atk;
            if (def.stats.speed) total.speed = (total.speed || 0) + def.stats.speed;
            if (def.stats.cooldown) total.cooldown = (total.cooldown || 0) + def.stats.cooldown;
            if (def.stats.crit) total.crit = (total.crit || 0) + def.stats.crit;
        });
        return total;
    }

    public generateGiftLink(item: InventoryItem): string {
        this.state.stash = this.state.stash.filter(i => i.id !== item.id);
        this.save();

        // Mock Link
        return `https://synapse.game/gift/${item.defId}/${genId()}`;
    }

    public addCredits(amount: number) {
        this.state.credits += Math.floor(amount);
        this.save();
    }

    public removeCredits(amount: number): boolean {
        if (this.state.credits >= amount) {
            this.state.credits -= Math.floor(amount);
            this.save();
            return true;
        }
        return false;
    }

    public decryptArtifact(itemId: string) {
        const idx = this.state.stash.findIndex(i => i.id === itemId);
        if (idx === -1) return null;

        const COST = 50; // Decrypt Cost
        if (this.state.credits < COST) return null; // Logic check, UI should prevent too

        this.removeCredits(COST);
        this.state.stash.splice(idx, 1);

        // 1. Roll Rarity
        const rarity = rollRarity();

        // 2. Roll Base Item
        // We use the generic table, or filter DB by type?
        // Let's us LOOT_TABLES.ARTIFACT_DECRYPT for base ID
        const baseId = LOOT_TABLES.ARTIFACT_DECRYPT.roll() || 'wpn_vanguard_sword';

        // 3. Construct Full Def ID
        // e.g. wpn_vanguard_sword_mk1_rare
        // Currently DB keys are formatted as: `${baseId}_mk${tier}_${rarity}`
        // We assume Tier 1 for basic artifacts. Later artifacts could be Tier 2.
        const tier = 1;
        const fullDefId = `${baseId}_mk${tier}_${rarity.toLowerCase()}`;

        // Verify it exists (fallback to common if not)
        let finalDefId = fullDefId;
        if (!getItemDef(finalDefId)) {
            console.warn(`Def ID not found: ${finalDefId}, falling back to common`);
            finalDefId = `${baseId}_mk${tier}_common`;
        }

        const newItem = this.createItem(finalDefId);
        this.state.stash.push(newItem);
        this.save();
        return newItem;
    }

    public sellItem(itemId: string) {
        const idx = this.state.stash.findIndex(i => i.id === itemId);
        if (idx === -1) return;

        const item = this.state.stash[idx];
        const def = getItemDef(item.defId);

        let val = 10;
        if (def) {
            // Dynamic Price
            switch (def.rarity) {
                case ItemRarity.COMMON: val = 10; break;
                case ItemRarity.UNCOMMON: val = 25; break;
                case ItemRarity.RARE: val = 100; break;
                case ItemRarity.LEGENDARY: val = 500; break;
            }
            // Artifacts
            if (def.type === ItemType.ARTIFACT) val = 5;
            if (def.type === ItemType.SCRAP) val = 1;
        }

        this.state.stash.splice(idx, 1);
        this.addCredits(val);
        this.save();
    }

    // --- Events ---

    private save() {
        localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(this.state));
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
