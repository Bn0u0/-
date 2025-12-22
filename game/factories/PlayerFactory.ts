import { Player } from '../classes/Player';
import { PlayerClassID } from '../../types';

export interface ClassConfig {
    name: string;
    role: string; // [NEW] For UI
    stats: {
        hp: number;
        speed: number;
        markColor: number;
        atk: number;
    };
}

export const CLASSES: Record<PlayerClassID, ClassConfig> = {
    // 1. SCAVENGER (Survival)
    SCAVENGER: {
        name: '拾荒者',
        role: 'SURVIVAL',
        stats: { hp: 120, speed: 1.1, markColor: 0xFFFF00, atk: 12 }
    },
    // 2. SKIRMISHER (Mobility/Crit) - Formally RANGER
    SKIRMISHER: {
        name: '游擊者',
        role: 'DUELIST',
        stats: { hp: 100, speed: 1.25, markColor: 0xFF4444, atk: 14 }
    },
    // 3. WEAVER (Tactics)
    WEAVER: {
        name: '織命者',
        role: 'TACTICIAN',
        stats: { hp: 80, speed: 1.0, markColor: 0x0088FF, atk: 8 }
    }
};

export class PlayerFactory {
    static create(scene: Phaser.Scene, x: number, y: number, classId: string, id: string, isLocal: boolean): Player {
        // Safe Cast or Default
        const validClass = (CLASSES[classId as PlayerClassID]) ? classId as PlayerClassID : 'SCAVENGER';
        const config = CLASSES[validClass];

        const player = new Player(scene, x, y, id, isLocal);
        player.configure(config, validClass);

        // [VISUAL] Operation Genesis: Class Differentiation
        // [VISUAL] Operation Genesis: Class Differentiation
        // TODO: Implement proper visual differentiation on Player class
        /*
        switch (validClass) {
            case 'SCAVENGER':
                player.setTint(config.stats.markColor); 
                break;
            case 'SKIRMISHER':
                player.setTint(config.stats.markColor);
                break;
            case 'WEAVER':
                player.setTint(config.stats.markColor); 
                break;
        }
        */

        return player;
    }
}

