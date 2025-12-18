import Phaser from 'phaser';
import { network } from '../../services/NetworkService';
import { EventBus } from '../../services/EventBus';
import { Player } from '../classes/Player';
import { WaveManager } from '../managers/WaveManager';

export class NetworkSyncSystem {
    private scene: Phaser.Scene;
    private lastSentTime: number = 0;

    // References to sync targets
    private commander: Player | null = null;
    private drone: Player | null = null;
    private waveManager: WaveManager | null = null;

    // Remote Input State
    public remoteInputVector = { x: 0, y: 0 };

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.setupListeners();
    }

    private setupListeners() {
        EventBus.on('NETWORK_PACKET', this.handleNetworkPacket, this);
    }

    public setTargets(commander: Player, drone: Player, waveManager: WaveManager) {
        this.commander = commander;
        this.drone = drone;
        this.waveManager = waveManager;
    }

    public update(time: number, delta: number, currentMode: 'SINGLE' | 'MULTI', isHost: boolean) {
        if (currentMode === 'SINGLE') return;

        if (isHost) {
            this.broadcastGameState(time);
        } else {
            this.sendClientInput(time);
        }
    }

    private sendClientInput(time: number) {
        if (time - this.lastSentTime < 33) return;
        const pointer = this.scene.input.activePointer;
        let vecX = 0, vecY = 0;

        // Note: We need access to "myUnit" to calculate vector relative to player
        // For now, assuming "drone" is client unit if !isHost, or we can pass myUnit explicitly
        // But cleaner is to just calculate screen relative or pass "myUnit" in update
        // Let's refactor slightly to be robust:
        // We know: Host controls Commander, Client controls Drone usually.

        let myUnit = network.isHost ? this.commander : this.drone;
        if (!myUnit) return;

        if (pointer.isDown) {
            const worldPoint = pointer.positionToCamera(this.scene.cameras.main) as Phaser.Math.Vector2;
            const dx = worldPoint.x - myUnit.x;
            const dy = worldPoint.y - myUnit.y;
            const angle = Math.atan2(dy, dx);
            vecX = Math.cos(angle);
            vecY = Math.sin(angle);
        }

        network.broadcast({ type: 'INPUT', payload: { x: vecX, y: vecY } });
        this.lastSentTime = time;
    }

    private broadcastGameState(time: number) {
        if (time - this.lastSentTime < 45) return;
        if (!this.commander || !this.drone || !this.waveManager) return;

        // Accessing private Scene props via "any" is risky, ideally passed in
        // But for now we just sync positions and basic stats
        // We need HP/Score/Level from Scene. passed in?
        // Let's rely on scene reference for High Level stats if needed, or better:
        // Refactor update to accept a "Stats" object.

        // For MVP refactor, let's grab from scene as any (God Class dismantling step 1)
        const scene: any = this.scene;

        network.broadcast({
            type: 'STATE',
            payload: {
                c: { x: Math.round(this.commander.x), y: Math.round(this.commander.y), r: this.commander.rotation },
                d: { x: Math.round(this.drone.x), y: Math.round(this.drone.y), r: this.drone.rotation },
                s: { hp: scene.hp, sc: scene.score, w: this.waveManager.wave, l: scene.level }
            }
        });
        this.lastSentTime = time;
    }

    private handleNetworkPacket(data: any) {
        if (data.type === 'START_MATCH') {
            EventBus.emit('START_MATCH', 'MULTI');
        }
        else if (data.type === 'INPUT' && network.isHost) {
            this.remoteInputVector = data.payload;
        }
        else if (data.type === 'STATE' && !network.isHost) {
            const s = data.payload;
            if (this.commander) { this.commander.setPosition(s.c.x, s.c.y); this.commander.setRotation(s.c.r); }
            if (this.drone) { this.drone.setPosition(s.d.x, s.d.y); this.drone.setRotation(s.d.r); }

            // Sync Scene Stats
            const scene: any = this.scene;
            if (s.s) {
                scene.hp = s.s.hp;
                scene.score = s.s.sc;
                if (this.waveManager) this.waveManager.wave = s.s.w;
                scene.level = s.s.l;
                scene.emitStatsUpdate();
            }
        }
        else if (data.type === 'GAME_OVER') {
            // Scene handles game over via EventBus usually, but here we trigger directly?
            // Scene should listen to GAME_OVER if we emit it, or calls method
            // Existing logic called this.gameOver()
            // Let's emit generic event
            EventBus.emit('GAME_OVER_SYNC');
        }
    }

    public cleanup() {
        EventBus.off('NETWORK_PACKET', this.handleNetworkPacket, this);
    }
}
