import Phaser from 'phaser';
import { COLORS } from '../../constants';

export type AIBehavior = 'CHASE' | 'SWARM' | 'DASH' | 'STRAFE' | 'FLEE' | 'STATIONARY' | 'ERRATIC';

export interface EnemyConfig {
    id: string;
    name: string;
    stats: {
        hp: number;
        speed: number;
        damage: number;
        value: number; // XP / Score
        color: number;
        radius: number;
    };
    ai: {
        type: AIBehavior;
        range?: number; // Detection or attack range
        interval?: number; // For dash windup etc
    };
}

export const ENEMY_TYPES: { [key: string]: EnemyConfig } = {
    JELLY: {
        id: 'JELLY',
        name: 'Jelly',
        stats: { hp: 20, speed: 80, damage: 10, value: 10, color: COLORS.secondary, radius: 12 },
        ai: { type: 'CHASE' }
    },
    TRI_DART: {
        id: 'TRI_DART',
        name: 'Tri-Dart',
        stats: { hp: 15, speed: 180, damage: 15, value: 20, color: 0x00FF88, radius: 10 }, // Green
        ai: { type: 'SWARM' }
    },
    CHARGER: {
        id: 'CHARGER',
        name: 'Charger',
        stats: { hp: 40, speed: 250, damage: 25, value: 30, color: 0xFF8800, radius: 18 }, // Orange
        ai: { type: 'DASH', interval: 2000 }
    },
    WISP: {
        id: 'WISP',
        name: 'Wisp',
        stats: { hp: 5, speed: 120, damage: 5, value: 5, color: 0xFFFFFF, radius: 6 },
        ai: { type: 'ERRATIC' }
    },
    CRAB: {
        id: 'CRAB',
        name: 'Void Crab',
        stats: { hp: 60, speed: 60, damage: 20, value: 40, color: 0xFF0044, radius: 20 }, // Red
        ai: { type: 'STRAFE', range: 200 }
    },
    SPLITTER: {
        id: 'SPLITTER',
        name: 'Splitter',
        stats: { hp: 30, speed: 90, damage: 15, value: 25, color: 0x9900FF, radius: 15 }, // Purple
        ai: { type: 'CHASE' }
    },
    SENTINEL: {
        id: 'SENTINEL',
        name: 'Sentinel',
        stats: { hp: 100, speed: 0, damage: 30, value: 50, color: 0xFFDD00, radius: 25 }, // Yellow
        ai: { type: 'STATIONARY', range: 400 }
    },
    GOLEM: {
        id: 'GOLEM',
        name: 'Golem',
        stats: { hp: 150, speed: 40, damage: 35, value: 80, color: 0x888888, radius: 30 }, // Grey
        ai: { type: 'CHASE' }
    },
    LOOT_BUNNY: {
        id: 'LOOT_BUNNY',
        name: 'Loot Bunny',
        stats: { hp: 30, speed: 200, damage: 0, value: 500, color: 0xFFD700, radius: 14 }, // Gold
        ai: { type: 'FLEE', range: 300 }
    },
    PHANTOM: {
        id: 'PHANTOM',
        name: 'Phantom',
        stats: { hp: 25, speed: 100, damage: 20, value: 35, color: 0x222222, radius: 12 }, // Dark
        ai: { type: 'CHASE' } // With special rendering logic in Enemy class
    }
};

export class EnemyFactory {
    static get(typeId: string): EnemyConfig {
        return ENEMY_TYPES[typeId] || ENEMY_TYPES.JELLY;
    }

    static getRandom(difficulty: number): EnemyConfig {
        const types = Object.values(ENEMY_TYPES);
        // Simple random for now, WaveManager handles weights
        return types[Math.floor(Math.random() * types.length)];
    }
}
