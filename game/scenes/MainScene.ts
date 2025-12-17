import Phaser from 'phaser';
import { Player } from '../classes/Player';
import { Enemy } from '../classes/Enemy';
import confetti from 'canvas-confetti';
import { COLORS, PHYSICS, FX } from '../../constants';
import { EventBus } from '../../services/EventBus';
import { UpgradeType } from '../../types';
import { network } from '../../services/NetworkService';
import { Vanguard } from '../classes/Vanguard';
import { Weaver } from '../classes/Weaver';
import { Spectre } from '../classes/Spectre';
import { Bastion } from '../classes/Bastion';
import { Catalyst } from '../classes/Catalyst';
import { Projectile } from '../classes/Projectile';
import { PowerupService, PowerupType } from '../../services/PowerupService';
import { LootService, LootItemDef } from '../../services/LootService';
import { inventoryService } from '../../services/InventoryService';

// Managers
import { WaveManager } from '../managers/WaveManager';
import { ExtractionManager } from '../managers/ExtractionManager';
import { CombatManager } from '../managers/CombatManager';
import { TerrainManager } from '../managers/TerrainManager';
import { PlayerFactory } from '../factories/PlayerFactory';
import { InputSystem } from '../systems/InputSystem';

type GameMode = 'SINGLE' | 'MULTI';

export class MainScene extends Phaser.Scene {
    declare public cameras: Phaser.Cameras.Scene2D.CameraManager;
    declare public add: Phaser.GameObjects.GameObjectFactory;
    declare public time: Phaser.Time.Clock;
    declare public events: Phaser.Events.EventEmitter;
    declare public physics: Phaser.Physics.Arcade.ArcadePhysics;
    declare public input: Phaser.Input.InputPlugin;
    declare public scale: Phaser.Scale.ScaleManager;

    // Entities
    private commander: Player | null = null;
    private drone: Player | null = null;
    private myUnit: Player | null = null;
    private otherUnit: Player | null = null;

    private enemyGroup: Phaser.GameObjects.Group | null = null;
    private projectileGroup: Phaser.GameObjects.Group | null = null;
    private graphics: Phaser.GameObjects.Graphics | null = null;
    private bgGrid: Phaser.GameObjects.Grid | null = null;

    // Lighting
    private lightLayer: Phaser.GameObjects.RenderTexture | null = null;
    private lightMask: Phaser.GameObjects.Graphics | null = null;

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

    // Time System
    private survivalTime: number = 0;
    private nextBossTime: number = 300;
    private pulsePhase: 'SCAVENGE' | 'WARNING' | 'PURGE' = 'SCAVENGE';

    // Services & Managers
    private powerupService!: PowerupService;
    private lootService!: LootService;
    private waveManager!: WaveManager;
    private extractionManager!: ExtractionManager;
    private combatManager!: CombatManager;
    private terrainManager!: TerrainManager;
    private playerFactory!: PlayerFactory;
    private inputSystem!: InputSystem;

    // Player Choice
    private myClass: string = 'Vanguard';

    private doubleScoreActive: boolean = false;

    // Network Inputs
    private lastSentTime: number = 0;
    private remoteInputVector = { x: 0, y: 0 };
    private statsModifiers = { tetherLength: 1.0, droneSpeed: 1.0, playerSpeed: 1.0 };

    public worldWidth: number = 4000;
    public worldHeight: number = 4000;

    constructor() {
        super('MainScene');
    }

    preload() {
        this.load.image('floor', 'assets/textures/floor_scifi.png');
        this.load.image('wall', 'assets/textures/wall_tech.png');
        this.load.image('hero_vanguard', 'assets/sprites/hero_vanguard.png');
        this.load.image('hero_spectre', 'assets/sprites/hero_spectre.png');
        this.load.image('hero_bastion', 'assets/sprites/hero_bastion.png');
        this.load.image('hero_weaver', 'assets/sprites/hero_weaver.png');
        this.load.image('hero_catalyst', 'assets/sprites/hero_catalyst.png');
    }

    create() {
        this.cameras.main.setBackgroundColor(COLORS.bg);
        this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);

        // Background handled by TerrainManager

        this.graphics = this.add.graphics();
        this.graphics.setDepth(50);

        // LIGHTING SETUP
        const width = this.worldWidth;
        const height = this.worldHeight;
        // Optimization: Don't make RT full world size if huge. But we have camera pan.
        // For MVP, RT matches Camera size and is pinned? Or World size?
        // World size 4000x4000 is too big for RT usually.
        // Better: RT matches Screen size, scrolls with camera = 0, but content moves?
        // Let's stick to a big RT for simplicity or use a dark overlay Mesh?
        // Easiest: A dark Rectangle covering the screen (ScrollFactor 0) with a mask?
        // Phaser GeometryMask is expensive for many dynamic lights.

        // Approach: RenderTexture covering the VIEWPORT (Screen).
        // On update: Clear RT to Black (0.9 alpha).
        // Draw "Light Circles" at relative positions of entities.
        // Use blending to punch holes.

        this.lightLayer = this.add.renderTexture(0, 0, this.scale.width, this.scale.height);
        this.lightLayer.setScrollFactor(0);

        // Groups
        this.enemyGroup = this.add.group({ classType: Enemy, runChildUpdate: true });
        this.projectileGroup = this.add.group({ classType: Projectile, runChildUpdate: true });

        // Services
        this.powerupService = new PowerupService(this);
        this.lootService = new LootService(this);

        // Managers & Systems
        this.inputSystem = new InputSystem(this);
        this.waveManager = new WaveManager(this, this.enemyGroup);
        this.extractionManager = new ExtractionManager(this, this.worldWidth, this.worldHeight);
        this.combatManager = new CombatManager(this);
        this.terrainManager = new TerrainManager(this);
        this.playerFactory = new PlayerFactory(this);

        this.extractionManager.setTerrainManager(this.terrainManager);

        this.terrainManager.generateWorld(30, 30);

        // Check Projectile <-> Wall collision
        this.physics.add.collider(this.projectileGroup!, this.terrainManager.wallGroup, (proj: any) => {
            proj.destroy();
        });

        // Wiring
        this.waveManager.onNextWaveRequest = (nextWave) => this.startNewWave(nextWave);
        this.extractionManager.spawnZones();

        // Events
        EventBus.on('START_MATCH', this.handleStartMatch, this);
        EventBus.on('NETWORK_PACKET', this.handleNetworkPacket, this);
        EventBus.on('APPLY_UPGRADE', this.applyUpgrade, this);
        EventBus.on('ENEMY_KILLED', (score: number) => this.awardScore(score));

        // Input Events
        EventBus.on('JOYSTICK_MOVE', (vec: { x: number, y: number }) => this.inputSystem.setVirtualAxis(vec.x, vec.y));
        EventBus.on('JOYSTICK_AIM', (data: { x: number, y: number, isFiring: boolean }) => this.inputSystem.setVirtualAim(data.x, data.y, data.isFiring));
        EventBus.on('JOYSTICK_SKILL', (skill: string) => this.inputSystem.triggerSkill(skill));

        // Skill Trigger from InputSystem
        this.events.on('TRIGGER_SKILL', (skill: string) => {
            if (!this.myUnit) return;
            if (skill === 'DASH') this.myUnit.dash();
            if (skill === 'Q') this.myUnit.triggerSkill1();
            if (skill === 'E') this.myUnit.triggerSkill2();
        });

        this.scale.on('resize', this.handleResize, this);
        this.events.on('shutdown', () => this.cleanup());

        this.resetGame();
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

    handleStartMatch(data: any) {
        // Handle both string (legacy) and object payload
        const mode = (typeof data === 'string') ? data : data.mode;
        if (typeof data === 'object' && data.hero) {
            this.myClass = data.hero;
        }

        const actualMode = mode || (network.isHost ? 'MULTI' : 'MULTI');
        this.currentMode = actualMode as GameMode;
        this.isGameActive = true;
        this.setupPlayers();

        if (this.currentMode === 'SINGLE' || network.isHost) {
            this.startNewWave(1);
        }

        if (this.myUnit) {
            this.cameras.main.startFollow(this.myUnit, true, 0.08, 0.08);
            this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
        }
    }

    setupPlayers() {
        if (this.commander) this.commander.destroy();
        if (this.drone) this.drone.destroy();

        if (this.currentMode === 'SINGLE') {
            this.commander = this.playerFactory.createPlayer(this.myClass, 0, 0, 'COMMANDER', true);
            this.drone = new Weaver(this, 200, 0, 'DRONE', false);
            this.myUnit = this.commander;
            this.otherUnit = this.drone;
        } else {
            const isHost = network.isHost;
            // For Multiplayer, we need to know other player's class. 
            // Phase 4 MVP: Defaults to Vanguard for remote, or sync it via Network Handshake (Not implemented yet).
            // Let's assume Remote is Vanguard for now until we add handshake.

            if (isHost) {
                this.commander = this.playerFactory.createPlayer(this.myClass, 0, 0, 'COMMANDER', true);
                this.drone = new Vanguard(this, 200, 0, 'DRONE', false); // Remote
            } else {
                this.commander = new Vanguard(this, 0, 0, 'COMMANDER', false); // Remote
                this.drone = this.playerFactory.createPlayer(this.myClass, 200, 0, 'DRONE', true);
            }

            this.myUnit = isHost ? this.commander : this.drone;
            this.otherUnit = isHost ? this.drone : this.commander;
        }

        this.commander.setDepth(100);
        this.drone.setDepth(100);
    }

    // createPlayerClass removed - logic moved to PlayerFactory

    startNewWave(wave: number) {
        if (!this.commander) return;
        this.waveManager.startWave(wave, { x: this.commander.x, y: this.commander.y });
    }

    cleanup() {
        EventBus.off('NETWORK_PACKET', this.handleNetworkPacket, this);
        EventBus.off('APPLY_UPGRADE', this.applyUpgrade, this);
        EventBus.off('START_MATCH', this.handleStartMatch, this);
        this.scale.off('resize', this.handleResize, this);

        this.waveManager.cleanup();
        this.enemyGroup?.clear(true, true);
        this.projectileGroup?.clear(true, true);

        if (this.powerupService && (this.powerupService as any).timer) {
            (this.powerupService as any).timer.remove(false);
        }
    }

    resetGame() {
        this.isGameActive = false;
        this.level = 1;
        this.xp = 0;
        this.score = 0;
        this.hp = 100;
        this.isPaused = false;
        this.physics.resume();
        this.waveManager.reset();
        if (this.enemyGroup) this.enemyGroup.clear(true, true);
    }

    update(time: number, delta: number) {
        if (!this.myUnit) return; // Guard clause from other update

        // 1. Update Time (Merged)
        if (this.isGameActive && !this.isPaused) {
            this.survivalTime += delta / 1000;
        }

        // 2. Pulse Logic (Merged)
        if (this.survivalTime >= this.nextBossTime && this.pulsePhase !== 'PURGE') {
            this.triggerPurge();
        }

        this.updateBackground(time);

        // Lighting Update (Fog of War)
        this.updateLighting();

        if (!this.isGameActive || this.isPaused) return;

        // ... Rest of update ...
        super.update(time, delta);

        // 1. Inputs
        this.processLocalInput();

        // 2. Drone Logic
        if (this.currentMode === 'SINGLE') {
            this.updateDroneAI();
        } else if (network.isHost) {
            this.processDroneMovementAsHost();
        }

        // 3. Logic (Host/Single)
        if (this.currentMode === 'SINGLE' || network.isHost) {
            this.enemyGroup?.getChildren().forEach((child) => {
                (child as Enemy).seekPlayer([this.commander!, this.drone!], 100);
            });
            this.runCombatLogic();
            this.waveManager.update();

            if (this.currentMode === 'MULTI') {
                this.broadcastGameState(time);
            }
        } else {
            this.sendClientInput(time);
        }

        // 4. Shared Mechanics
        this.combatManager.updateCombatAI(this.commander!, this.drone, this.enemyGroup!, this.projectileGroup!);
        this.handlePowerupCollisions();
        this.handleLootCollection();
        this.handleExtraction(); // Check Zone overlap

        // 5. Visuals
        this.commander?.update();
        this.drone?.update();
    }

    runCombatLogic() {
        const players = [this.commander!, this.drone!].filter(p => !!p);
        this.combatManager.checkCollisions(
            this.projectileGroup!,
            this.enemyGroup!,
            players,
            (amt) => this.takeDamage(amt),
            (enemy) => {
                this.awardScore(10);
                this.xp += 1;
                if (this.xp >= this.xpToNextLevel) this.levelUp();
            }
        );
    }

    handleExtraction() {
        if (!this.myUnit) return;
        if (this.extractionManager.checkExtraction(this.myUnit)) {
            this.handleSearchExtractSuccess();
        }
    }

    handleSearchExtractSuccess() {
        this.physics.pause();
        this.isGameActive = false;

        // Overlay
        this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.8)
            .setScrollFactor(0).setDepth(1000);

        this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 3, 'EXTRACTION SUCCESSFUL', {
            fontSize: '48px', color: '#00FF00', fontStyle: 'bold'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);

        // Emit Persistence
        if (this.myUnit) {
            EventBus.emit('EXTRACTION_SUCCESS', this.myUnit.lootBag);

            // JUICE: Confetti Explosion
            const count = 200;
            const defaults = {
                origin: { y: 0.7 }
            };

            function fire(particleRatio: number, opts: any) {
                confetti(Object.assign({}, defaults, opts, {
                    particleCount: Math.floor(count * particleRatio)
                }));
            }

            fire(0.25, { spread: 26, startVelocity: 55 });
            fire(0.2, { spread: 60 });
            fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
            fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
            fire(0.1, { spread: 120, startVelocity: 45 });
        }

        // Loot List
        let lootList = "LOOT SECURED:\n";
        if (this.myUnit) {
            this.myUnit.lootBag.forEach(item => lootList += `> ${item.name}\n`);
        }

        this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2, lootList, {
            fontSize: '24px', color: '#FFFFFF'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);
    }

    // --- Inputs & Movement ---
    processLocalInput() {
        if (!this.myUnit) return;
        this.inputSystem.processInput(this.input, this.cameras, this.myUnit, this.statsModifiers);
    }

    updateDroneAI() {
        if (!this.drone || !this.commander) return;
        const orbitSpeed = 0.02;
        const desiredDist = 180;
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

    // --- Services & State ---
    private handlePowerupCollisions() {
        if (!this.myUnit) return;
        this.physics.overlap(this.myUnit, (this.powerupService as any).group, (playerObj: any, powerupObj: any) => {
            const { type, duration } = this.powerupService.collectPowerup(powerupObj);
            const player = playerObj as any;
            switch (type) {
                case PowerupType.Speed:
                    player.speedMultiplier = 2;
                    this.time.delayedCall(duration * 1000, () => { player.speedMultiplier = 1; });
                    break;
                case PowerupType.Shield:
                    player.shielded = true;
                    this.time.delayedCall(duration * 1000, () => { player.shielded = false; });
                    break;
                case PowerupType.DoubleScore:
                    this.doubleScoreActive = true;
                    this.time.delayedCall(duration * 1000, () => { this.doubleScoreActive = false; });
                    break;
            }
        });
    }

    private handleLootCollection() {
        if (!this.myUnit) return;
        this.physics.overlap(this.myUnit, this.lootService.group, (p: any, l: any) => {
            const player = p as Player;
            const loot = l as Phaser.GameObjects.Container;
            const item = loot.getData('item') as LootItemDef;

            if (player.lootBag.length < 5) {
                player.lootBag.push(item);
                loot.destroy();
                this.events.emit('LOOT_PICKUP', item);
                const txt = this.add.text(player.x, player.y - 50, `+${item.name}`, {
                    fontSize: '16px', color: '#ffffff', stroke: '#000', strokeThickness: 2
                }).setOrigin(0.5);
                this.tweens.add({
                    targets: txt, y: player.y - 100, alpha: 0, duration: 1000, onComplete: () => txt.destroy()
                });
            }
        });
    }

    // --- Combat Polishing ---
    public hitStop(duration: number) {
        if (this.isPaused) return; // Don't double pause

        // Slowmo effect
        this.physics.world.timeScale = 0; // Freeze physics
        // this.anims.pauseAll(); // Optional: pause animations

        this.time.delayedCall(duration, () => {
            if (!this.isPaused) {
                this.physics.world.timeScale = 1; // Resume
                // this.anims.resumeAll();
            }
        });
    }

    takeDamage(amt: number) {
        this.cameras.main.shake(200, 0.01);
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

    awardScore(base: number) {
        const amount = this.doubleScoreActive ? base * 2 : base;
        this.score += amount;
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

    gameOver() {
        EventBus.emit('GAME_OVER', { score: this.score, wave: this.waveManager.wave, level: this.level });
        this.isPaused = true;
        this.isGameActive = false;
        this.physics.pause();
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
            wave: this.waveManager ? this.waveManager.wave : 1,
            enemiesAlive: this.enemyGroup ? this.enemyGroup.getLength() : 0,
            survivalTime: this.survivalTime, // Passed to UI
            cooldowns: this.myUnit ? this.myUnit.cooldowns : {},
            maxCooldowns: this.myUnit ? this.myUnit.maxCooldowns : {},
        });
    }

    private triggerPurge() {
        this.pulsePhase = 'PURGE';
        EventBus.emit('WAVE_START', { wave: 666, isElite: true }); // Special alert

        // Spawn Boss (Conceptual)
        // this.waveManager.spawnBoss();

        // Loop reset after boss death... for now just keep counting
        this.nextBossTime += 300;
    }

    // --- Network (Keep as is mostly, tightly coupled to state) ---
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
                s: { hp: this.hp, sc: this.score, w: this.waveManager.wave, l: this.level }
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
                this.waveManager.wave = s.s.w;
                this.level = s.s.l;
                this.emitStatsUpdate();
            }
        }
        else if (data.type === 'GAME_OVER') {
            this.gameOver();
        }
    }

    private updateLighting() {
        if (this.lightLayer && this.lightMask) {
            // 1. Reset Darkness
            this.lightLayer.camera.scrollX = 0;
            this.lightLayer.camera.scrollY = 0;
            this.lightLayer.clear();
            this.lightLayer.fill(0x0e0d16, 0.9);

            // 2. Punch Holes (Lights)
            this.lightMask.clear();
            this.lightMask.fillStyle(0xffffff, 1);

            const drawLight = (worldX: number, worldY: number, radius: number, flicker: boolean) => {
                const screenX = worldX - this.cameras.main.scrollX;
                const screenY = worldY - this.cameras.main.scrollY;

                if (screenX < -radius || screenX > this.scale.width + radius) return;
                if (screenY < -radius || screenY > this.scale.height + radius) return;

                const r = flicker ? radius * (0.95 + Math.random() * 0.05) : radius;
                this.lightMask!.fillCircle(screenX, screenY, r);
            };

            // Player Light
            if (this.myUnit && this.myUnit.active) drawLight(this.myUnit.x, this.myUnit.y, 300, true);
            if (this.otherUnit && this.otherUnit.active) drawLight(this.otherUnit.x, this.otherUnit.y, 300, true);

            // Projectile Lights
            if (this.projectileGroup) {
                this.projectileGroup.getChildren().forEach((p: any) => {
                    if (p.active) drawLight(p.x, p.y, 60, true);
                });
            }

            // Enemy Lights (Eyes)
            if (this.enemyGroup) {
                this.enemyGroup.getChildren().forEach((e: any) => {
                    if (e.active) drawLight(e.x, e.y, 40, false);
                });
            }

            // Erase lights from darkness
            this.lightLayer.erase(this.lightMask);
        }
    }
}
