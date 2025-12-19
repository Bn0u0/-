import Phaser from 'phaser';
import { Player } from '../classes/Player';
import { PlayerFactory } from '../factories/PlayerFactory';
import { NetworkSyncSystem } from '../systems/NetworkSyncSystem';
import { WaveManager } from './WaveManager';
import { LootService } from '../../services/LootService';
import { EventBus } from '../../services/EventBus';

export class PlayerLifecycleManager {
    private scene: Phaser.Scene;
    public commander: Player | null = null;
    public myUnit: Player | null = null;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    public spawnPlayer(classId: string, width: number, height: number, syncSystem: NetworkSyncSystem, waveManager: WaveManager): Player {
        if (this.commander) this.commander.destroy();

        const cx = width / 2;
        const cy = height / 2;

        console.log(`[PlayerManager] Spawning Commander (${classId}) at ${cx}, ${cy}`);

        this.commander = PlayerFactory.create(this.scene, cx, cy, classId, 'COMMANDER', true);
        this.commander.setDepth(100);

        this.myUnit = this.commander;

        // Init Sync
        syncSystem.setTargets(this.commander, null, waveManager);

        // Run Poverty Protocol
        this.checkAndGrantEmergencyWeapon(classId);

        return this.commander;
    }

    private checkAndGrantEmergencyWeapon(classId: string) {
        if (!this.commander || this.commander.equippedWeapon) return;

        console.log("[PlayerManager] No weapon detected. Initiating Poverty Protocol...");

        // A. Determine T0 ID based on Class
        const t0Map: Record<string, string> = {
            'SCAVENGER': 'weapon_crowbar_t0',
            'RANGER': 'weapon_pistol_t0',
            'WEAVER': 'weapon_drone_t0'
        };
        const defId = t0Map[classId] || 'weapon_crowbar_t0';

        // B. Generate Loot
        const emergencyWeapon = LootService.generateLoot(0, defId);

        if (emergencyWeapon) {
            this.commander.equipWeapon(emergencyWeapon);
            console.log(`🎁 [PlayerManager] Granted: ${emergencyWeapon.displayName}`);

            // C. Visual Feedback
            (this.scene.physics.world as any).pause(); // Direct physics pause
            EventBus.emit('SHOW_ACQUISITION_MODAL', {
                title: 'EMERGENCY RATION // 緊急配給',
                subtitle: 'NO WEAPON DETECTED',
                item: emergencyWeapon,
                flavorText: '「在廢土上，有東西拿就不錯了，別挑。」'
            });
        }
    }

    public update() {
        if (this.commander && this.commander.active) {
            this.commander.update();
        }
    }
}
