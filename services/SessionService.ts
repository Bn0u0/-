import { persistence, UserProfile } from './PersistenceService';
import { inventoryService } from './InventoryService';
import { metaGame, MetaGameState } from './MetaGameService';
import { EventBus } from './EventBus';

export type AppState = 'BOOT' | 'MAIN_MENU' | 'HIDEOUT' | 'COMBAT' | 'GAME_OVER' | 'TUTORIAL_DEBRIEF';

// [NEW] Workbench Focus State
export type WorkbenchView = 'NONE' | 'CRATE' | 'HERO' | 'DEPLOY' | 'BLUEPRINTS';

interface SessionState {
    appState: AppState;
    profile: UserProfile;
    metaState: MetaGameState;
    workbenchView: WorkbenchView; // [NEW] Bridge to Phaser Camera
}

class SessionService {
    private state: SessionState;
    private listeners: ((state: SessionState) => void)[] = [];

    constructor() {
        this.state = {
            appState: 'BOOT',
            profile: persistence.getProfile(),
            metaState: metaGame.getState(),
            workbenchView: 'NONE'
        };

        // Bind Context
        this.handleMetaUpdate = this.handleMetaUpdate.bind(this);
        this.handleMissionEnd = this.handleMissionEnd.bind(this);
        this.handleExtraction = this.handleExtraction.bind(this);
    }

    // --- Initialization ---
    public async init() {
        // [SYSTEM] 1. Auth Callback
        const restored = await persistence.handleAuthCallback();
        if (restored) {
            console.log("🔗 [Session] Neural Link Restored.");
            this.refreshProfile();
        }

        // [SYSTEM] 2. Inventory Schema Check
        const inv = inventoryService.getState();
        if (inv.loadout?.head === undefined) {
            console.warn("⚠️ [Session] Schema Mismatch, force saving...");
            persistence.save(inv as any);
        }

        // [SYSTEM] 3. MetaGame Subscription
        metaGame.subscribe(this.handleMetaUpdate);

        // [SYSTEM] 4. Gift Code Protocol
        this.checkGiftCode();

        // [SYSTEM] 5. Event Listeners
        EventBus.on('GAME_OVER', this.handleMissionEnd);
        EventBus.on('EXTRACTION_SUCCESS', this.handleExtraction);

        // [FIX] Listen for FTUE triggers
        EventBus.on('SHOW_CLASS_SELECTION', () => { /* Handled elsewhere? */ });

        // [NEW] Boot Sequence Listener
        EventBus.on('BOOT_COMPLETE', () => {
            console.log("🔥 [Session] BOOT_COMPLETE received! Transitioning to MAIN_MENU.");
            this.updateState({ appState: 'MAIN_MENU' });
        });
    }

    private checkGiftCode() {
        const query = new URLSearchParams(window.location.search);
        const giftCode = query.get('gift');
        if (giftCode) {
            try {
                const weapon = JSON.parse(atob(giftCode));
                if (weapon && weapon.baseType) {
                    persistence.addInventory(weapon);
                    alert(`🎁 [System] Received: ${weapon.name}`);
                } else {
                    const res = persistence.importSaveString(giftCode);
                    alert(res.msg);
                }
                window.history.replaceState({}, document.title, window.location.pathname);
                this.refreshProfile();
            } catch (e) {
                console.error("Link Corrupted");
            }
        }
    }

    // --- State Updates ---
    private handleMetaUpdate(newState: MetaGameState) {
        // Sync Logic
        let nextAppState = this.state.appState;

        if (newState.currentScreen === 'GAME_LOOP') {
            if (this.state.appState !== 'COMBAT') {
                this.transitionToCombat(newState.selectedHeroId || 'SCAVENGER');
            }
            nextAppState = 'COMBAT';
        } else if (newState.currentScreen === 'HIDEOUT' || newState.currentScreen === 'ARSENAL') {
            nextAppState = 'HIDEOUT';
        } else if (newState.currentScreen === 'GAME_OVER') {
            nextAppState = 'GAME_OVER';
        }

        this.updateState({ metaState: newState, appState: nextAppState });
    }

    private transitionToCombat(heroId: string) {
        console.log("⚡ [Session] Combat Sequence Initiated.");
        setTimeout(() => {
            EventBus.emit('START_MATCH', { mode: 'SINGLE', hero: heroId });
            // Double tap
            setTimeout(() => EventBus.emit('START_MATCH', { mode: 'SINGLE', hero: heroId }), 300);
        }, 100);
    }

    private handleMissionEnd(data: any) {
        console.log("🏁 [Session] Mission Complete.", data);
        const currentProfile = persistence.getProfile();

        if (data && data.score !== undefined) {
            persistence.uploadScore(data.score, data.wave || 1, 0);
            persistence.save({
                credits: currentProfile.credits + Math.floor(data.score / 10),
                level: Math.max(currentProfile.level, data.level || 1)
            });
        }

        // Death Penalty
        inventoryService.punishDeath('SCAVENGER');

        // FTUE Check
        if (!currentProfile.hasPlayedOnce) {
            persistence.save({ hasPlayedOnce: true });
            this.updateState({ appState: 'TUTORIAL_DEBRIEF' });
        } else {
            this.updateState({ appState: 'GAME_OVER' });
        }

        this.refreshProfile();
    }

    private handleExtraction(loot: any[]) {
        this.updateState({ appState: 'GAME_OVER' });
    }

    // --- Actions (Called by UI) ---
    public setBootComplete() {
        this.updateState({ appState: 'MAIN_MENU' });
    }

    public enterHideout() {
        this.updateState({ appState: 'HIDEOUT' });
        this.refreshProfile();
    }

    public startMatch(role: string) {
        const step = inventoryService.getTutorialStep();
        metaGame.startMatch(); // Determines state -> 'GAME_LOOP'

        // FTUE Intercept
        setTimeout(() => {
            if (step === 'VOID') {
                EventBus.emit('SHOW_CLASS_SELECTION');
            } else if (step === 'TRIAL') {
                const trialClass = inventoryService.getTrialClass();
                EventBus.emit('START_MATCH', { mode: 'SINGLE', hero: trialClass || role });
            } else {
                EventBus.emit('START_MATCH', { mode: 'SINGLE', hero: role });
            }
        }, 100);
    }

    public dispose() {
        this.listeners = [];
        EventBus.off('GAME_OVER', this.handleMissionEnd);
        EventBus.off('EXTRACTION_SUCCESS', this.handleExtraction);
        // metagame unsubscribe?
    }

    // --- Store Pattern ---
    public subscribe(cb: (s: SessionState) => void) {
        this.listeners.push(cb);
        cb(this.state); // Immediate trigger
        return () => { this.listeners = this.listeners.filter(l => l !== cb); };
    }

    public getState() { return this.state; }

    private refreshProfile() {
        this.updateState({ profile: persistence.getProfile() });
    }

    private updateState(partial: Partial<SessionState>) {
        this.state = { ...this.state, ...partial };
        this.listeners.forEach(cb => cb(this.state));
    }
}

export const sessionService = new SessionService();
