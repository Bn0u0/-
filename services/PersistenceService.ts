// PersistenceService.ts - Driver's License
export interface UserProfile {
    level: number;
    xp: number;
    credits: number;
    inventory: string[]; // List of Item IDs
    loadout: {
        weapon: string; // 'Vanguard' etc
        artifact: string;
    };
    unlocks: ['Vanguard'],
    hasPlayedOnce: boolean;
    lockedClass: string | null; // V4.0: One Life, One Class
}

const STORAGE_KEY = 'SYNAPSE_PROFILE_V2';

export class PersistenceService {
    private data: UserProfile;

    constructor() {
        this.data = this.load();
    }

    public load(): UserProfile {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const loaded = JSON.parse(raw);
                // Schema migration could go here
                return { ...this.defaultProfile(), ...loaded };
            }
        } catch (e) {
            console.error('Failed to load profile', e);
        }
        return this.defaultProfile();
    }

    private defaultProfile(): UserProfile {
        return {
            level: 1,
            xp: 0,
            credits: 0,
            inventory: [],
            loadout: {
                weapon: 'Vanguard', // Default Class
                artifact: 'None'
            },
            unlocks: ['Vanguard'],
            hasPlayedOnce: false,
            lockedClass: null
        };
    }

    public save(newData: Partial<UserProfile>) {
        this.data = { ...this.data, ...newData };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    }

    public getProfile(): UserProfile {
        return this.data;
    }

    // Legacy method support if needed, or just break it. 
    // User asked for "Execute Immediately", let's keep it clean.

    public addXp(amount: number) {
        this.data.xp += amount;
        // Simple leveling curve: 100 * level
        const nextLevel = this.data.level * 100;
        if (this.data.xp >= nextLevel) {
            this.data.level++;
            this.data.xp -= nextLevel;
        }
        this.save({});
    }

    public addCredits(amount: number) {
        this.data.credits += amount;
        this.save({});
    }
}

export const persistence = new PersistenceService();
