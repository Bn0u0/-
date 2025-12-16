export interface GameSaveData {
    highScore: number;
    totalGamesPlayed: number;
    lootStash?: string[]; // Optional for backward compatibility
}

const STORAGE_KEY = 'SYNAPSE_SAVE_DATA_V1';

export class PersistenceService {
    private data: GameSaveData;

    constructor() {
        this.data = this.load();
    }

    public load(): GameSaveData {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                return JSON.parse(raw);
            }
        } catch (e) {
            console.error('Failed to load save data', e);
        }
        return { highScore: 0, totalGamesPlayed: 0, lootStash: [] };
    }

    public save(newData: Partial<GameSaveData>) {
        this.data = { ...this.data, ...newData };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    }

    public getData(): GameSaveData {
        return this.data;
    }

    public exportSaveCode(): string {
        // Simple Base64 encoding for "Save Code" feel
        // In reality: JSON -> String -> Base64
        const json = JSON.stringify(this.data);
        return btoa(json);
    }

    public importSaveCode(code: string): boolean {
        try {
            const json = atob(code);
            const data = JSON.parse(json);

            // Basic validation
            if (typeof data.highScore === 'number') {
                this.data = data;
                this.save(data); // Persist immediately
                return true;
            }
        } catch (e) {
            console.error('Invalid Save Code', e);
        }
        return false;
    }
}

export const persistence = new PersistenceService();
