import Phaser from 'phaser';
import { EventBus } from '../../services/EventBus';

export type DirectorState = 'BUILDUP' | 'PEAK' | 'RELAX';

export class DirectorSystem {
    private scene: Phaser.Scene;

    // Pacing
    public state: DirectorState = 'BUILDUP';
    public difficulty: number = 1.0; // Global difficulty scalar
    public credits: number = 0;      // Current spending power

    // Timing
    private phaseTimer: number = 0;
    private spawnTimer: number = 0;

    // Config
    private readonly BUILDUP_DURATION = 20000; // 20s
    private readonly PEAK_DURATION = 10000; // 10s
    private readonly RELAX_DURATION = 5000;  // 5s

    private readonly BASE_CREDIT_RATE = 2; // Credits per second

    // Callbacks
    public onSpawnRequest: ((type: string, cost: number) => boolean) | null = null;
    public onSuddenDeath: (() => void) | null = null;

    private suddenDeathTriggered: boolean = false;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    public setDifficultyMultiplier(d: number) {
        this.difficulty = d;
    }

    update(time: number, delta: number) {
        const dt = delta / 1000; // Seconds

        // 1. Difficulty Scaling handled by WaveManager now
        // this.difficulty += (0.1 / 60) * dt;

        // V5.0: Infinite Mode - No Sudden Death
        // if (time > 180000 && !this.suddenDeathTriggered) { ... }

        // 2. State Machine
        this.phaseTimer -= delta;
        if (this.phaseTimer <= 0) {
            this.advanceState();
        }

        // 3. Credit Accumulation
        let rate = this.BASE_CREDIT_RATE * this.difficulty;
        if (this.state === 'PEAK') rate *= 3; // Fast spawn during peak
        if (this.state === 'RELAX') rate *= 0.1; // Slow/Stop during relax

        this.credits += rate * dt;

        // 4. Spending Loop
        this.attemptSpawn(dt);
    }

    private advanceState() {
        switch (this.state) {
            case 'BUILDUP':
                this.state = 'PEAK';
                this.phaseTimer = this.PEAK_DURATION;
                EventBus.emit('DIRECTOR_STATE_CHANGE', { state: 'PEAK', msg: 'SURGE DETECTED' });
                break;
            case 'PEAK':
                this.state = 'RELAX';
                this.phaseTimer = this.RELAX_DURATION;
                EventBus.emit('DIRECTOR_STATE_CHANGE', { state: 'RELAX', msg: 'SYSTEM STABILIZING' });
                break;
            case 'RELAX':
                this.state = 'BUILDUP';
                this.phaseTimer = this.BUILDUP_DURATION;
                // Difficulty jump per cycle
                this.difficulty += 0.2;
                EventBus.emit('DIRECTOR_STATE_CHANGE', { state: 'BUILDUP', msg: 'THREAT RISING' });
                break;
        }
    }

    private attemptSpawn(dt: number) {
        // Simple interval for checking spawns
        this.spawnTimer -= dt;
        if (this.spawnTimer > 0) return;

        this.spawnTimer = 0.5; // Check every 0.5s

        // Determine what to buy
        // Simple logic: Buy most expensive thing we can afford, or swarm cheap ones?
        // Let's bias towards cheap swarms in Buildup, and expensive elites in Peak.

        while (this.credits > 1) { // Min cost
            // Pick a candidate
            const cost = this.pickEnemyType();

            // Try to spawn
            if (this.onSpawnRequest) {
                const success = this.onSpawnRequest(cost.type, cost.cost);
                if (success) {
                    this.credits -= cost.cost;
                } else {
                    // Failed to spawn (e.g. pool empty or max count reached)
                    break;
                }
            } else {
                break;
            }
        }
    }

    private pickEnemyType(): { type: string, cost: number } {
        // Costs
        // Scout=1, Fast=2, Tank=5
        // Charger=8, Sentinel=30, Phalanx=40
        // Boss=500+

        const roll = Math.random();

        // 1. Boss / Super Heavy (Peak only, High Credits)
        if (this.state === 'PEAK' && this.credits >= 500) {
            // Only 1 boss usually, but Director just spends credits.
            // Frequency limited by high cost.
            if (roll < 0.2) return { type: 'boss', cost: 500 };
        }

        // 2. Peer/Elite (Peak/Buildup High)
        if (this.state === 'PEAK' || (this.state === 'BUILDUP' && this.credits > 100)) {
            if (this.credits >= 40 && roll < 0.3) return { type: 'phalanx', cost: 40 };
            if (this.credits >= 30 && roll < 0.5) return { type: 'sentinel', cost: 30 };
        }

        // 3. Medium (Standard)
        if (this.credits >= 8 && roll < 0.6) return { type: 'vanguard', cost: 8 };
        if (this.credits >= 5 && roll < 0.7) return { type: 'tank', cost: 5 };

        // 4. Fodder
        if (this.credits >= 2 && roll < 0.8) return { type: 'fast', cost: 2 };

        return { type: 'scout', cost: 1 };
    }

    private triggerSuddenDeath() {
        this.suddenDeathTriggered = true;
        this.state = 'PEAK'; // Force peak state
        this.difficulty = 999; // Maximum difficulty
        this.credits = 99999; // Infinite money for the director

        // Notify Scene
        EventBus.emit('DIRECTOR_STATE_CHANGE', { state: 'SUDDEN_DEATH', msg: 'WARNING: 3 MIN LIMIT REACHED // EXTERMINATION PROTOCOL' });

        if (this.onSuddenDeath) {
            this.onSuddenDeath();
        }

        // Force a massive wave
        // In a real implementation this might spawn specific "Reaper" units
        // For now, we rely on the inflated credits and difficulty to just flood everything
        console.log("💀 SUDDEN DEATH TRIGGERED 💀");
    }
}
