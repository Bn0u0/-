import { COLORS } from '../../constants';

export interface EnemyConfig {
    id: string;
    name: string;
    stats: {
        hp: number;
        speed: number;
        damage: number;
        value: number; // XP
        color: number;
        radius: number;
    };
    // Placeholder for new AI config
    ai?: any;
}

export const BASE_ENEMY_CONFIG: EnemyConfig = {
    id: 'GENERIC_HOSTILE',
    name: 'Unknown Signature',
    stats: {
        hp: 10,
        speed: 50,
        damage: 5,
        value: 10,
        color: 0xFFFFFF,
        radius: 15
    }
};

export class EnemyFactory {
    static get(typeId: string): EnemyConfig {
        // Always return generic for now
        return { ...BASE_ENEMY_CONFIG };
    }

    static getRandom(difficulty: number): EnemyConfig {
        return { ...BASE_ENEMY_CONFIG };
    }
}
