import Phaser from 'phaser';
import { Player } from '../classes/Player';
import { Vanguard } from '../classes/Vanguard';
import { Weaver } from '../classes/Weaver';
import { Spectre } from '../classes/Spectre';
import { Bastion } from '../classes/Bastion';
import { Catalyst } from '../classes/Catalyst';

export class PlayerFactory {
    private scene: Phaser.Scene;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    createPlayer(id: string, x: number, y: number, pid: string, isLocal: boolean): Player {
        switch (id) {
            case 'Weaver': return new Weaver(this.scene, x, y, pid, isLocal);
            case 'Spectre': return new Spectre(this.scene, x, y, pid, isLocal);
            case 'Bastion': return new Bastion(this.scene, x, y, pid, isLocal);
            case 'Catalyst': return new Catalyst(this.scene, x, y, pid, isLocal);
            case 'Vanguard':
            default:
                return new Vanguard(this.scene, x, y, pid, isLocal);
        }
    }
}
