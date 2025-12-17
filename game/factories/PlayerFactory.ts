import { Player } from '../classes/Player';
import { WeaponType } from '../systems/WeaponSystem';

export type ClassType = 'BLADE' | 'WEAVER' | 'IMPACT' | 'PRISM' | 'PHANTOM';

export interface ClassConfig {
    name: string;
    weapon: WeaponType;
    stats: {
        hp: number;
        speed: number;
        markColor: number;
        atk: number;
    };
}

export const CLASSES: Record<ClassType, ClassConfig> = {
    BLADE: {
        name: '光刃',
        weapon: 'MELEE_SWEEP',
        stats: { hp: 120, speed: 1.2, markColor: 0x00FFFF, atk: 12 } // High Atk
    },
    WEAVER: {
        name: '星織',
        weapon: 'HOMING_ORB',
        stats: { hp: 100, speed: 1.0, markColor: 0xFF77BC, atk: 10 }
    },
    IMPACT: {
        name: '重錘',
        weapon: 'SHOCKWAVE',
        stats: { hp: 150, speed: 0.8, markColor: 0xFFD700, atk: 15 } // Tank
    },
    PRISM: {
        name: '稜鏡',
        weapon: 'LASER',
        stats: { hp: 80, speed: 0.9, markColor: 0x9D00FF, atk: 8 } // Low HP High Dps maybe?
    },
    PHANTOM: {
        name: '魅影',
        weapon: 'BOOMERANG',
        stats: { hp: 60, speed: 1.4, markColor: 0x00FF00, atk: 11 }
    }
};

export class PlayerFactory {
    static create(scene: Phaser.Scene, x: number, y: number, classId: ClassType, id: string, isLocal: boolean): Player {
        // Default to BLADE if unknown
        const config = CLASSES[classId] || CLASSES.BLADE;

        const player = new Player(scene, x, y, id, isLocal);
        player.configure(config);
        return player;
    }
}
