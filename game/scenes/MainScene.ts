
import Phaser from 'phaser';
import { Player } from '../classes/Player';
import { Enemy } from '../classes/Enemy';
import { COLORS, PHYSICS, FX } from '../../constants';
import { EventBus } from '../../services/EventBus';
import { UpgradeType } from '../../types';
import { network } from '../../services/NetworkService';

type WaveState = 'PREPARING' | 'SPAWNING' | 'COMBAT' | 'COMPLETE';
type GameMode = 'SINGLE' | 'MULTI';

export class MainScene extends Phaser.Scene {
    declare public game: Phaser.Game;
    declare public cameras: Phaser.Cameras.Scene2D.CameraManager;
    declare public add: Phaser.GameObjects.GameObjectFactory;
    declare public time: Phaser.Time.Clock;
    declare public events: Phaser.Events.EventEmitter;
    declare public physics: Phaser.Physics.Arcade.ArcadePhysics;
    declare public input: Phaser.Input.InputPlugin;
    declare public scene: Phaser.Scenes.ScenePlugin;
    declare public scale: Phaser.Scale.ScaleManager;

    // Entities
    private commander: Player | null = null;
    private drone: Player | null = null;

    private myUnit: Player | null = null;
    private otherUnit: Player | null = null;

    private enemyGroup: Phaser.GameObjects.Group | null = null;
    private graphics: Phaser.GameObjects.Graphics | null = null;
    private bgGrid: Phaser.GameObjects.Grid | null = null;

    // Game Stats
    private isGameActive: boolean = false;
    private currentMode: GameMode = 'SINGLE';
    private isPaused: boolean = false;
    private level: number = 1;
    private xp: number = 0;
    private xpToNextLevel: number = 10;
    private score: number = 0;
    private hp: number = 100;
    private maxHp: number = 100;

    // Wave Manager
    private wave: number = 1;
    private waveState: WaveState = 'PREPARING';
    private enemiesToSpawn: number = 0;
    private spawnTimer: Phaser.Time.TimerEvent | null = null;
    private nextWaveTimer: Phaser.Time.TimerEvent | null = null;

    // Modifiers 
    private statsModifiers = {
        tetherLength: 1.0,
        droneSpeed: 1.0,
        playerSpeed: 1.0
    };

    // Network Inputs
    private lastSentTime: number = 0;
    private remoteInputVector = { x: 0, y: 0 };

    constructor() {
        super('MainScene');
    }

    create() {
        this.resetGame();

        this.cameras.main.setBackgroundColor(COLORS.bg);
        this.bgGrid = this.add.grid(0, 0, 4000, 4000, 100, 100, COLORS.bg, 0, COLORS.grid, 0.2);
        this.bgGrid.setDepth(-10);

        this.graphics = this.add.graphics();
        this.graphics.setDepth(50);

        this.enemyGroup = this.add.group({ classType: Enemy, runChildUpdate: true });

        // Listen for Mode Start
        EventBus.on('START_MATCH', this.handleStartMatch, this);
        EventBus.on('NETWORK_PACKET', this.handleNetworkPacket, this);
        EventBus.on('APPLY_UPGRADE', this.applyUpgrade, this);

        this.scale.on('resize', this.handleResize, this);
        this.events.on('shutdown', () => this.cleanup());

        // Initial setup for camera mostly
        this.updateCameraZoom();
        this.emitStatsUpdate();
    }

    handleResize() {
        this.updateCameraZoom();
    }

    updateCameraZoom() {
        const width = this.scale.width;
        let zoom = 0.85;
        if (width < 600) zoom = 0.55;
        else if (width < 1024) zoom = 0.70;
        this.cameras.main.zoomTo(zoom, 1000, 'Power2');
    }

    handleStartMatch(mode: GameMode) {
        // Defaults to MULTI if coming from direct network event without payload, 
        // but App.tsx sends payload now.
        const actualMode = mode || (network.isHost ? 'MULTI' : 'MULTI');
        this.currentMode = actualMode;
        this.isGameActive = true;
        console.log(`[MainScene] Match Started! Mode: ${this.currentMode}`);

        this.setupPlayers();

        // Single Player: Start immediate
        // Multi Host: Start immediate
        // Multi Client: Wait for packets
        if (this.currentMode === 'SINGLE' || network.isHost) {
            this.startWave(1);
        }

        if (this.myUnit) {
            this.cameras.main.startFollow(this.myUnit, true, 0.08, 0.08);
        }
    }

    setupPlayers() {
        // Re-create Players
        if (this.commander) this.commander.destroy();
        if (this.drone) this.drone.destroy();

        if (this.currentMode === 'SINGLE') {
            this.commander = new Player(this, 0, 0, 'COMMANDER', true);
            this.drone = new Player(this, 200, 0, 'DRONE', false);
            this.myUnit = this.commander;
            this.otherUnit = this.drone;
        } else {
            const isHost = network.isHost;
            this.commander = new Player(this, 0, 0, 'COMMANDER', isHost);
            this.drone = new Player(this, 200, 0, 'DRONE', !isHost);
            this.myUnit = isHost ? this.commander : this.drone;
            this.otherUnit = isHost ? this.drone : this.commander;
        }

        this.commander.setDepth(100);
        this.drone.setDepth(100);
    }

    cleanup() {
        EventBus.off('NETWORK_PACKET', this.handleNetworkPacket, this);
        EventBus.off('APPLY_UPGRADE', this.applyUpgrade, this);
        EventBus.off('START_MATCH', this.handleStartMatch, this);
        this.scale.off('resize', this.handleResize, this);
        if (this.spawnTimer) this.spawnTimer.remove(false);
        if (this.nextWaveTimer) this.nextWaveTimer.remove(false);
        if (this.enemyGroup) this.enemyGroup.clear(true, true);
    }

    resetGame() {
        this.isGameActive = false;
        this.level = 1;
        this.xp = 0;
        this.score = 0;
        this.hp = 100;
        this.wave = 1;
        this.isPaused = false;
        this.physics.resume();
        if (this.enemyGroup) this.enemyGroup.clear(true, true);
    }

    update(time: number, delta: number) {
        this.updateBackground(time);

        if (!this.isGameActive || this.isPaused) return;

        // 1. Inputs
        this.processLocalInput();

        // 2. Second Unit Movement
        if (this.currentMode === 'SINGLE') {
            this.updateDroneAI();
        } else if (network.isHost) {
            this.processDroneMovementAsHost();
        }

        // 3. Game Logic (Host/Single Authoritative)
        if (this.currentMode === 'SINGLE' || network.isHost) {
            this.enemyGroup?.getChildren().forEach((child) => {
                (child as Enemy).seekPlayer([this.commander!, this.drone!], 100);
            });
            this.checkCollisions();
            this.checkWaveStatus();

            if (this.currentMode === 'MULTI') {
                this.broadcastGameState(time);
            }
        } else {
            this.sendClientInput(time);
        }

        // 4. Visuals
        this.renderTethers(time);
        this.commander?.update();
        this.drone?.update();
    }

    updateDroneAI() {
        if (!this.drone || !this.commander) return;
        const orbitSpeed = 0.02;
        const desiredDist = 180;

        // Simple Orbit Logic
        const angle = Phaser.Math.Angle.Between(this.commander.x, this.commander.y, this.drone.x, this.drone.y);
        const targetAngle = angle + orbitSpeed;
        const targetX = this.commander.x + Math.cos(targetAngle) * desiredDist;
        const targetY = this.commander.y + Math.sin(targetAngle) * desiredDist;

        const dx = targetX - this.drone.x;
        const dy = targetY - this.drone.y;

        const body = this.drone.body as Phaser.Physics.Arcade.Body;
        body.setVelocity(dx * 4, dy * 4);
        this.drone.rotation += 0.05;
    }

    processLocalInput() {
        if (!this.myUnit) return;
        const body = this.myUnit.body as Phaser.Physics.Arcade.Body;
        const pointer = this.input.activePointer;

        if (pointer.isDown) {
            const worldPoint = pointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
            const dx = worldPoint.x - this.myUnit.x;
            const dy = worldPoint.y - this.myUnit.y;
            const angle = Math.atan2(dy, dx);
            const inputVecX = Math.cos(angle);
            const inputVecY = Math.sin(angle);

            const accel = PHYSICS.acceleration * this.statsModifiers.playerSpeed;
            body.setDrag(PHYSICS.drag);
            body.setAcceleration(inputVecX * accel, inputVecY * accel);

            // Rotate towards movement
            const targetRotation = angle + Math.PI / 2;
            const nextRotation = Phaser.Math.Angle.RotateTo(this.myUnit.rotation, targetRotation, PHYSICS.rotationLerp);
            this.myUnit.setRotation(nextRotation);
        } else {
            body.setAcceleration(0, 0);
        }
    }

    processDroneMovementAsHost() {
        if (!this.drone) return;
        const body = this.drone.body as Phaser.Physics.Arcade.Body;

        if (this.remoteInputVector.x !== 0 || this.remoteInputVector.y !== 0) {
            const accel = PHYSICS.acceleration * this.statsModifiers.droneSpeed;
            body.setDrag(PHYSICS.drag);
            body.setAcceleration(this.remoteInputVector.x * accel, this.remoteInputVector.y * accel);

            const angle = Math.atan2(this.remoteInputVector.y, this.remoteInputVector.x);
            const targetRotation = angle + Math.PI / 2;
            this.drone.setRotation(Phaser.Math.Angle.RotateTo(this.drone.rotation, targetRotation, PHYSICS.rotationLerp));
        } else {
            body.setAcceleration(0, 0);
        }
    }

    sendClientInput(time: number) {
        if (time - this.lastSentTime < 33) return;
        const pointer = this.input.activePointer;
        let vecX = 0, vecY = 0;

        if (pointer.isDown && this.myUnit) {
            const worldPoint = pointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
            const dx = worldPoint.x - this.myUnit.x;
            const dy = worldPoint.y - this.myUnit.y;
            const angle = Math.atan2(dy, dx);
            vecX = Math.cos(angle);
            vecY = Math.sin(angle);
        }
        network.broadcast({ type: 'INPUT', payload: { x: vecX, y: vecY } });
        this.lastSentTime = time;
    }

    broadcastGameState(time: number) {
        if (time - this.lastSentTime < 45) return;
        network.broadcast({
            type: 'STATE',
            payload: {
                c: { x: Math.round(this.commander!.x), y: Math.round(this.commander!.y), r: this.commander!.rotation },
                d: { x: Math.round(this.drone!.x), y: Math.round(this.drone!.y), r: this.drone!.rotation },
                s: { hp: this.hp, sc: this.score, w: this.wave, l: this.level }
            }
        });
        this.lastSentTime = time;
    }

    handleNetworkPacket(data: any) {
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
            if (s.s) {
                this.hp = s.s.hp;
                this.score = s.s.sc;
                this.wave = s.s.w;
                this.level = s.s.l;
                this.emitStatsUpdate();
            }
        }
        else if (data.type === 'GAME_OVER') {
            this.gameOver();
        }
    }

    startWave(waveNumber: number) {
        this.wave = waveNumber;
        this.waveState = 'SPAWNING';
        const isElite = this.wave % 5 === 0;
        this.enemiesToSpawn = 8 + (this.wave * 2);

        EventBus.emit('WAVE_START', { wave: this.wave, isElite });

        if (this.spawnTimer) this.spawnTimer.remove(false);
        this.spawnTimer = this.time.addEvent({
            delay: isElite ? 400 : 800,
            callback: () => {
                if (this.enemiesToSpawn > 0) {
                    this.spawnEnemy(isElite);
                    this.enemiesToSpawn--;
                } else {
                    this.waveState = 'COMBAT';
                    this.spawnTimer?.remove(false);
                }
            },
            loop: true
        });
    }

    spawnEnemy(isElite: boolean) {
        if (!this.commander) return;
        const radius = 800 + Math.random() * 400;
        const angle = Math.random() * Math.PI * 2;
        const x = this.commander.x + Math.cos(angle) * radius;
        const y = this.commander.y + Math.sin(angle) * radius;

        const enemy = new Enemy(this, x, y);
        enemy.setDifficulty(1 + (this.wave * 0.05), 1 + (this.wave * 0.1), isElite);
        this.enemyGroup?.add(enemy);
    }

    checkCollisions() {
        if (!this.commander || !this.drone) return;

        // Tether Kill
        const dist = Phaser.Math.Distance.Between(this.commander.x, this.commander.y, this.drone.x, this.drone.y);
        const maxLen = PHYSICS.tetherDistance * 2.2 * this.statsModifiers.tetherLength;

        if (dist < maxLen) {
            const line = new Phaser.Geom.Line(this.commander.x, this.commander.y, this.drone.x, this.drone.y);
            const enemies = this.enemyGroup?.getChildren() as Enemy[];

            enemies.forEach(enemy => {
                if (enemy.isDead) return;
                if (Phaser.Geom.Intersects.LineToCircle(line, new Phaser.Geom.Circle(enemy.x, enemy.y, 15))) {
                    enemy.kill();
                    this.score += 10;
                    this.xp += 1;
                    if (this.xp >= this.xpToNextLevel) this.levelUp();
                    this.emitStatsUpdate();
                }
            });
        }

        // Player Damage
        const enemies = this.enemyGroup?.getChildren() as Enemy[];
        enemies.forEach(enemy => {
            if (enemy.isDead) return;
            if (Phaser.Math.Distance.Between(enemy.x, enemy.y, this.commander!.x, this.commander!.y) < 30) {
                this.takeDamage(10);
                enemy.kill();
            }
        });
    }

    takeDamage(amt: number) {
        this.hp -= amt;
        if (this.hp <= 0) {
            this.hp = 0;
            if (this.currentMode === 'MULTI' && network.isHost) {
                network.broadcast({ type: 'GAME_OVER', payload: { score: this.score } });
            }
            this.gameOver();
        }
        this.emitStatsUpdate();
    }

    gameOver() {
        EventBus.emit('GAME_OVER', { score: this.score, wave: this.wave, level: this.level });
        this.isPaused = true;
        this.isGameActive = false;
        this.physics.pause();
    }

    checkWaveStatus() {
        if (this.waveState === 'COMBAT' && this.enemyGroup?.countActive() === 0) {
            this.waveState = 'COMPLETE';
            EventBus.emit('WAVE_COMPLETE', this.wave);
            this.nextWaveTimer = this.time.delayedCall(3000, () => this.startWave(this.wave + 1));
        }
    }

    levelUp() {
        this.level++;
        this.xp = 0;
        this.xpToNextLevel = Math.floor(this.xpToNextLevel * 1.5);
        this.isPaused = true;
        EventBus.emit('LEVEL_UP', this.level);
    }

    applyUpgrade(type: UpgradeType) {
        this.isPaused = false;
    }

    updateBackground(time: number) {
        if (this.bgGrid) {
            this.bgGrid.setAlpha(0.15 + Math.sin(time / 3000) * 0.05);
            (this.bgGrid as any).tilePositionX = this.cameras.main.scrollX * 0.5;
            (this.bgGrid as any).tilePositionY = this.cameras.main.scrollY * 0.5;
        }
    }

    emitStatsUpdate() {
        EventBus.emit('STATS_UPDATE', {
            hp: this.hp,
            maxHp: this.maxHp,
            level: this.level,
            xp: this.xp,
            xpToNextLevel: this.xpToNextLevel,
            score: this.score,
            wave: this.wave,
            enemiesAlive: this.enemyGroup?.countActive() || 0
        });
    }

    renderTethers(time: number) {
        if (!this.graphics || !this.commander || !this.drone) return;
        this.graphics.clear();
        const p1 = this.commander;
        const p2 = this.drone;
        const dist = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);
        const maxLen = PHYSICS.tetherDistance * 2.2 * this.statsModifiers.tetherLength;

        if (dist < maxLen) {
            this.graphics.lineStyle(4, COLORS.primary, 0.6);
            this.graphics.strokeLineShape(new Phaser.Geom.Line(p1.x, p1.y, p2.x, p2.y));
        }
    }
}
