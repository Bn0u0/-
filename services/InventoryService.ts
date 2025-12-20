import { Utils } from 'phaser';
import { ItemInstance, ItemDef, ItemRarity, ItemStats, Loadout, Backpack, PlayerProfile, TutorialStep } from '../types';
import { ItemLibrary } from '../game/data/library/items';

const STORAGE_KEY_V4 = 'SYNAPSE_NEO_INVENTORY_V5';

class InventoryService {
    private state: PlayerProfile;
    private listeners: ((state: PlayerProfile) => void)[] = [];

    constructor() {
        this.state = this.load();
    }

    private load(): PlayerProfile {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_V4);
            if (raw) {
                const data = JSON.parse(raw);
                // [HOTFIX] Check for Legacy Save (Missing V5 Schema)
                if (!data.loadout || data.loadout.head === undefined) {
                    console.warn("⚠️ [Inventory] Detected Legacy Save. Wiping for V5 Schema.");
                    return this.createDefaultProfile();
                }
                return data;
            }
        } catch (e) { console.error(e); }

        return this.createDefaultProfile();
    }

    private createDefaultProfile(): PlayerProfile {
        return {
            id: 'DEV_USER_V5', // [DEV] Force New ID
            credits: 9999,  // [DEV] Rich
            inventory: ['W_T1_PISTA_01'],
            stash: [],
            loadout: {
                mainWeapon: this.createItem('W_T1_PISTA_01'),
                head: null, // [CRITICAL] V5 Schema
                body: null,
                legs: null,
                feet: null
            },
            backpack: {
                slots: Array(6).fill(null),
                capacity: 6
            },

            // =========== [DEV MODE ACTIVE] ==========
            tutorialStep: 'COMPLETE', // Skip FTUE
            unlockedClasses: [
                'SCAVENGER', 'RANGER', 'WEAVER',
                'RONIN', 'SPECTRE', 'RAIDER',
                'GUNNER', 'HUNTER', 'TRAPPER',
                'ARCHITECT', 'WITCH', 'MEDIC'
            ],
            trialClassId: null
        };
    }

    public setTrialClass(classId: string) {
        this.state.tutorialStep = 'TRIAL';
        this.state.trialClassId = classId;
        this.save();
    }

    public confirmTrial() {
        if (this.state.trialClassId && !this.state.unlockedClasses.includes(this.state.trialClassId)) {
            this.state.unlockedClasses.push(this.state.trialClassId);
        }
        this.state.tutorialStep = 'COMPLETE';
        this.state.trialClassId = null;
        this.save();
    }

    public rejectTrial() {
        this.state.tutorialStep = 'VOID';
        this.state.trialClassId = null;
        this.save();
    }

    public isTutorialComplete(): boolean {
        return this.state.tutorialStep === 'COMPLETE';
    }

    public getTutorialStep(): TutorialStep {
        return this.state.tutorialStep;
    }

    public getTrialClass(): string | null {
        return this.state.trialClassId;
    }

    // --- Helpers ---

    public createItem(defId: string): ItemInstance {
        const def = ItemLibrary.get(defId);
        // Fallback or Normal creation logic
        const base = def || {
            name: 'Unknown',
            type: 'MATERIAL',
            tier: 0,
            baseStats: { damage: 0, range: 0, fireRate: 0, speed: 0, critChance: 0, defense: 0, hpMax: 0 },
            rarity: 'COMMON',
            slot: 'mainWeapon'
        };

        return {
            uid: Utils.String.UUID(),
            defId: defId,
            def: base, // [NEW] Link definition
            displayName: base.name,
            name: base.name,
            rarity: (base.rarity as ItemRarity) || ItemRarity.COMMON,
            computedStats: { ...base.baseStats } as any
        };
    }

    public getState() { return this.state; }

    // --- Logic Engine ---

    public calculateTotalStats(loadout: Loadout, classId: string): ItemStats {
        const total: ItemStats = {
            damage: 0, range: 0, fireRate: 0, speed: 0, critChance: 0, defense: 0, hpMax: 0
        };

        Object.values(loadout).forEach(item => {
            if (!item) return;

            // 1. Base + RNG (Computed)
            const stats = item.computedStats;
            total.damage += stats.damage || 0;
            total.range += stats.range || 0; // Range might not stack linearly? For now sum it.
            // FireRate: Usually lower is faster delay. Summing delays = bad. 
            // Logic: Take Main Weapon FireRate, ignore others? Or modifiers?
            // For now: Only Main Weapon contributes FL/Range/Dmg base? Armor gives stats?
            // Let's sum everything for stats like Def/HP/Speed. 
            // For Weapons stats, maybe we need to be smarter.

            if (item.def.type === 'WEAPON') {
                total.fireRate = stats.fireRate; // Weapons override FR
                total.range = stats.range; // Weapons override Range
                // Damage? 
                total.damage = Math.max(total.damage, stats.damage); // Take max damage? Or sum?
                // Actually, if we have only 1 weapon slot, this is easy.
            } else {
                // Armor grants bonuses
                total.damage += stats.damage || 0; // % bonus converted to flat in RNG?
            }

            total.speed += stats.speed || 0;
            total.critChance += stats.critChance || 0;
            total.defense += stats.defense || 0;
            total.hpMax += stats.hpMax || 0;

            // 2. Affinity Bonus
            if (item.def.affinity && item.def.affinity.classes.includes(classId as any)) {
                const bonus = item.def.affinity.bonusStats || {};
                if (bonus.damage) total.damage += bonus.damage;
                if (bonus.defense) total.defense += bonus.defense;
                if (bonus.hpMax) total.hpMax += bonus.hpMax;
                if (bonus.speed) total.speed += bonus.speed;
                if (bonus.critChance) total.critChance += bonus.critChance;
            }
        });

        return total;
    }

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

        console.log(`[Inventory] Uploading ${loot.length} items to Stash. New Stash Size: ${this.state.stash.length}`);

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
