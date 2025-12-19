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
    // TIER 1
    SCAVENGER: {
        name: '拾荒者',
        role: 'SURVIVAL',
        stats: { hp: 120, speed: 1.1, markColor: 0xFFFF00, atk: 12 }
    },
    RANGER: {
        name: '遊俠',
        role: 'DPS',
        stats: { hp: 100, speed: 1.2, markColor: 0xFF0000, atk: 10 }
    },
    WEAVER: {
        name: '織命者',
        role: 'CONTROL',
        stats: { hp: 80, speed: 1.0, markColor: 0x0000FF, atk: 8 }
    },

    // TIER 2 (Placeholder for now)
    RONIN: { name: '浪人', role: 'MELEE', stats: { hp: 140, speed: 1.3, markColor: 0xFFFFFF, atk: 15 } },
    SPECTRE: { name: '幽靈', role: 'STEALTH', stats: { hp: 80, speed: 1.5, markColor: 0xCCCCCC, atk: 18 } },
    RAIDER: { name: '掠奪者', role: 'TANK', stats: { hp: 150, speed: 0.9, markColor: 0x880000, atk: 14 } },

    GUNNER: { name: '機槍手', role: 'SUSTAIN', stats: { hp: 110, speed: 1.0, markColor: 0xFF4400, atk: 12 } },
    HUNTER: { name: '獵人', role: 'SNIPER', stats: { hp: 90, speed: 1.3, markColor: 0x00AA00, atk: 14 } },
    TRAPPER: { name: '陷阱師', role: 'TACTIC', stats: { hp: 100, speed: 1.1, markColor: 0xAA6600, atk: 10 } },

    ARCHITECT: { name: '建築師', role: 'BUILDER', stats: { hp: 90, speed: 1.0, markColor: 0x0088FF, atk: 9 } },
    WITCH: { name: '魔女', role: 'MAGE', stats: { hp: 70, speed: 1.1, markColor: 0xCC00FF, atk: 16 } },
    MEDIC: { name: '醫官', role: 'SUPPORT', stats: { hp: 100, speed: 1.1, markColor: 0x00FF88, atk: 6 } }
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
                player.setTint(0xFFFF00); // Yellow
                break;
            case 'RANGER':
                player.setTint(0xFF4444); // Red
                break;
            case 'WEAVER':
                player.setTint(0x00FFFF); // Cyan
                player.alpha = 0.9;
                break;
            default:
                player.setTint(0xFFFFFF);
        }
        */

        return player;
    }
}

