import { inventoryService } from './InventoryService';
import { persistence } from './PersistenceService';
import { EventBus } from './EventBus';
import { PlayerProfile } from '../types';

export type GameScreen = 'HIDEOUT' | 'GAME_LOOP' | 'GAME_OVER' | 'ARSENAL';

export interface MetaGameState {
    currentScreen: GameScreen;
    selectedHeroId: string;
    isMobile: boolean;
    profile: PlayerProfile; // [NEW] Synced Profile
}

class MetaGameService {
    private state: MetaGameState;

    constructor() {
        this.state = {
            currentScreen: 'HIDEOUT',
            selectedHeroId: 'Vanguard',
            isMobile: window.innerWidth < 768,
            profile: inventoryService.getState()
        };
        this.init();
    }

    private init() {
        // Sync Inventory State
        inventoryService.subscribe((newProfile) => {
            this.state.profile = newProfile;
            this.emitChange();
        });

        // Mobile Check binding
        window.addEventListener('resize', () => {
            this.state.isMobile = window.innerWidth < 768;
            this.emitChange();
        });
    }

    // --- State Access ---
    public getState() {
        return this.state;
    }

    // --- Navigation Actions ---
    public navigateTo(screen: GameScreen) {
        console.log(`[MetaGame] Navigating to ${screen}`);
        this.state.currentScreen = screen;
        this.emitChange();
    }

    public selectHero(heroId: string) {
        this.state.selectedHeroId = heroId;
        this.emitChange();
    }

    // --- Game Logic Hooks ---
    public startMatch() {
        // [DUAL-TRACK] Loadout Check
        const mainWep = this.state.profile.loadout.mainWeapon;
        if (!mainWep) {
            console.warn("[MetaGame] Warning: No weapon equipped!");
            // Allowed, poverty logic in MainScene will catch this
        }

        this.navigateTo('GAME_LOOP');
        // Delay to allow React to mount Phaser
        setTimeout(() => {
            EventBus.emit('START_MATCH', {
                mode: 'SINGLE',
                hero: this.state.selectedHeroId,
            });
        }, 100);
    }

    public handleGameOver(score: number) {
        // [DUAL-TRACK] Death Penalty
        const lostItemName = inventoryService.punishDeath(this.state.selectedHeroId);

        if (lostItemName) {
            console.log(`[DEATH PENALTY] Hero died. Lost Item: ${lostItemName}`);
        } else {
            console.log(`[DEATH PENALTY] Hero died. Backpack lost (Empty).`);
        }

        this.navigateTo('GAME_OVER');
    }

    public handleExtractionSuccess(lootIds: string[]) {
        // 1. Convert loot to artifacts (Legacy / Compat)
        // In Dual-Track, ExtractionGate calls extractionManager, which emits EXTRACTION_SUCCESS
        // MainScene handles it and calls InventoryService.
        // If this is called from UI or Scene, we ensure InventoryService handles it.
        inventoryService.processExtractionLoot(lootIds);

        // 2. Return to Hideout to show loot
        this.navigateTo('HIDEOUT');
    }

    // --- React Subscription Helper ---
    private listeners: Function[] = [];

    public subscribe(listener: Function) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private emitChange() {
        this.listeners.forEach(l => l(this.state));
    }
}

export const metaGame = new MetaGameService();
