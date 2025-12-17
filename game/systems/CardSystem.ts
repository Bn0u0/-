import { Player } from '../classes/Player';

export type CardType = 'GENERAL' | 'CLASS' | 'CHAOS';
export type HookType = 'ON_KILL' | 'ON_DASH' | 'ON_HIT' | 'PASSIVE';

export interface CardDef {
    id: string;
    name: string;
    description: string;
    type: CardType;
    rarity: 'COMMON' | 'RARE' | 'LEGENDARY';
    // Logic Hooks
    onAcquire?: (player: Player, stack: number) => void;
    onUpdate?: (player: Player, stack: number, delta: number) => void;
    statMod?: (stats: any, stack: number) => void;
}

export const CARD_DATABASE: Record<string, CardDef> = {
    // --- GENERAL (Uncapped Modifiers) ---
    'multi_shadow': {
        id: 'multi_shadow', name: 'Shadow Clone', type: 'GENERAL', rarity: 'LEGENDARY',
        description: 'Projectiles +1 (Stack Infinite)',
        statMod: (s, k) => s.projectileCount += k
    },
    'giant_growth': {
        id: 'giant_growth', name: 'Gigantification', type: 'GENERAL', rarity: 'RARE',
        description: 'Size +20%, HP +20% per stack',
        statMod: (s, k) => { s.hpMaxMod += 0.2 * k; s.sizeMod += 0.2 * k; }
    },
    'shrink_ray': {
        id: 'shrink_ray', name: 'Shrink Ray', type: 'GENERAL', rarity: 'RARE',
        description: 'Size -10%, Dodge +10% per stack',
        statMod: (s, k) => { s.sizeMod -= 0.1 * k; s.dodge += 10 * k; }
    },
    'glass_cannon': {
        id: 'glass_cannon', name: 'Glass Cannon', type: 'GENERAL', rarity: 'COMMON',
        description: 'Dmg +50%, MaxHP -30%',
        statMod: (s, k) => { s.dmgMod += 0.5 * k; s.hpMaxMod -= 0.3 * k; }
    },

    // --- CLASS (Specifics) ---
    'blade_wave': {
        id: 'blade_wave', name: 'Sword Wave', type: 'CLASS', rarity: 'RARE',
        description: 'Melee attacks launch a wave.',
        // Logic handled in WeaponSystem via tag check
    },

    // --- CHAOS (Visual/Logic Breakers) ---
    'confetti_gore': {
        id: 'confetti_gore', name: 'Party Time', type: 'CHAOS', rarity: 'LEGENDARY',
        description: 'Enemies explode into damaging confetti.',
        // Logic handled in Enemy.die()
    },
    'screen_shake': {
        id: 'screen_shake', name: 'Seismic Impact', type: 'CHAOS', rarity: 'COMMON',
        description: 'Dmg +100%, Extreme Screen Shake',
        statMod: (s, k) => s.dmgMod += 1.0 * k
    }
};

export class CardSystem {
    private inventory: Record<string, number> = {};

    public addCard(id: string) {
        if (!this.inventory[id]) this.inventory[id] = 0;
        this.inventory[id]++;
        console.log(`[CardSystem] Added ${id}, Stack: ${this.inventory[id]}`);
    }

    public getStack(id: string): number {
        return this.inventory[id] || 0;
    }

    public applyStats(baseStats: any): any {
        const result = { ...baseStats };
        // Default Mods
        result.projectileCount = result.projectileCount || 1;
        result.hpMaxMod = 1;
        result.sizeMod = 1;
        result.dmgMod = 1;
        result.dodge = 0;

        for (const id in this.inventory) {
            const count = this.inventory[id];
            const def = CARD_DATABASE[id];
            if (def && def.statMod) {
                def.statMod(result, count);
            }
        }
        return result;
    }

    public getRandomDraft(count: number = 3): CardDef[] {
        const keys = Object.keys(CARD_DATABASE);
        const result: CardDef[] = [];
        for (let i = 0; i < count; i++) {
            const key = keys[Math.floor(Math.random() * keys.length)];
            result.push(CARD_DATABASE[key]);
        }
        return result;
    }
}

export const cardSystem = new CardSystem();
