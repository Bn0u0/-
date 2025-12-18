import Phaser from 'phaser';
import { Player } from '../classes/Player';
import { Enemy } from '../classes/Enemy';
import confetti from 'canvas-confetti';
import { COLORS, PHYSICS, FX } from '../../constants';
import { EventBus } from '../../services/EventBus';
import { UpgradeType } from '../../types';
import { network } from '../../services/NetworkService';
import { PowerupService, PowerupType } from '../../services/PowerupService';
import { LootService } from '../../services/LootService';
import { inventoryService } from '../../services/InventoryService';
import { persistence } from '../../services/PersistenceService';
import { cardSystem } from '../systems/CardSystem';

import { WeaponSystem } from '../systems/WeaponSystem';
import { WaveManager } from '../managers/WaveManager';
import { ExtractionManager } from '../managers/ExtractionManager';
import { CombatManager } from '../managers/CombatManager';
import { TerrainManager } from '../managers/TerrainManager';
import { PlayerFactory } from '../factories/PlayerFactory';
import { InputSystem } from '../systems/InputSystem';
import { EffectManager } from '../managers/EffectManager';
import { NetworkSyncSystem } from '../systems/NetworkSyncSystem';
import { GlitchPipeline } from '../pipelines/GlitchPipeline';
import { InputRecorder } from '../systems/InputRecorder'; // Module D: SecurityMode = 'SINGLE' | 'MULTI';
import { TextureManager } from '../managers/TextureManager'; // Zero-Asset Polish

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

    // V4.0: Glitch Pipeline
    private glitchPipeline: GlitchPipeline | null = null;
    private glitchIntensity: number = 0;
    private glitchDuration: number = 0;

    // Lighting Interactables
    private playerLight: Phaser.GameObjects.Light | null = null;

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

    // Managers
    public waveManager!: WaveManager;
    public extractionManager!: ExtractionManager; // Module B: Public for AI
    public combatManager!: CombatManager;
    public terrainManager!: TerrainManager;
    public effectManager!: EffectManager;

    // Services
    public powerupService!: PowerupService;
    public lootService!: LootService; // Module B: Public for AI
    public weaponSystem!: WeaponSystem;
    public inputSystem!: InputSystem;
    public networkSyncSystem!: NetworkSyncSystem;
    public inputRecorder!: InputRecorder; // Module D

    // Player Choice
    private myClass: string = 'BLADE'; // Default to new class ID

    private doubleScoreActive: boolean = false;

    // Network Inputs
    // private lastSentTime: number = 0; // Moved to System
    // private remoteInputVector = { x: 0, y: 0 }; // Moved to System
    private statsModifiers = { tetherLength: 1.0, droneSpeed: 1.0, playerSpeed: 1.0 };

    public worldWidth: number = 4000;
    public worldHeight: number = 4000;

    private lastStatsTime: number = 0;

    constructor() {
        super('MainScene');
    }

    preload() {
        // PROTOCOL ZERO-ASSET: No external files loaded.
        // Pure code generation only.
    }

    create() {
        this.cameras.main.setBackgroundColor(COLORS.bg);
        this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);

        // Initial Camera Bounds
        this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);

        // Zero-Asset Texture Generation
        const textureManager = new TextureManager(this);
        textureManager.generateAll();

        // Register Resize
        this.scale.on('resize', this.handleResize, this);

        // Initial Center
        this.cameras.main.scrollX = this.worldWidth / 2 - this.cameras.main.width / 2;
        this.cameras.main.scrollY = this.worldHeight / 2 - this.cameras.main.height / 2;

        // ... (Textures) ...

        // Services
        this.powerupService = new PowerupService(this);
        this.lootService = new LootService(this);

        this.effectManager = new EffectManager(this); // Init First
        this.terrainManager = new TerrainManager(this);
        this.terrainManager.generateWorld();

        this.weaponSystem = new WeaponSystem(this);
        this.inputSystem = new InputSystem(this);
        this.inputRecorder = new InputRecorder(); // Module D
        this.networkSyncSystem = new NetworkSyncSystem(this); // V12.0


        this.combatManager = new CombatManager(this);
        this.extractionManager = new ExtractionManager(this, this.worldWidth, this.worldHeight);

        this.powerupService = new PowerupService(this);
        this.lootService = new LootService(this);

        // Note: enemyGroup is usually initialized by WaveManager? 
        // Checking WaveManager: it takes enemyGroup. 
        // But MainScene decl has it as `private enemyGroup: Group | null = null`.
        // Let's create it here if null to be safe, or let WaveManager create it?
        // WaveManager.ts: "private enemyGroup: Group;", constructor(scene, enemyGroup) { this.enemyGroup = enemyGroup ... }
        // So we must pass a group.
        if (!this.enemyGroup) this.enemyGroup = this.add.group();
        this.waveManager = new WaveManager(this, this.enemyGroup);

        // Re-implement Boss Panic via EventBus
        EventBus.on('BOSS_SPAWN', () => {
            this.effectManager.showPanicOverlay();
            this.triggerGlitch(2.0, 1000); // Boss Glitch
        });

        // Module A: Lighting
        this.lights.enable().setAmbientColor(0x808080); // Dim ambient
        this.playerLight = this.lights.addLight(0, 0, 400).setIntensity(1.0).setColor(0x00ffff);

        // V4.0: Glitch Pipeline Init
        if (this.game.renderer.type === Phaser.WEBGL) {
            (this.renderer as Phaser.Renderer.WebGL.WebGLRenderer).pipelines.addPostPipeline('GlitchPipeline', GlitchPipeline);
            this.cameras.main.setPostPipeline(GlitchPipeline);
            this.glitchPipeline = this.cameras.main.getPostPipeline(GlitchPipeline) as GlitchPipeline;
        }

        // Input Events
        EventBus.on('JOYSTICK_MOVE', (vec: { x: number, y: number }) => this.inputSystem.setVirtualAxis(vec.x, vec.y));
        EventBus.on('JOYSTICK_AIM', (data: { x: number, y: number, isFiring: boolean }) => this.inputSystem.setVirtualAim(data.x, data.y, data.isFiring));
        EventBus.on('JOYSTICK_SKILL', (skill: string) => this.inputSystem.triggerSkill(skill));

        this.extractionManager.setTerrainManager(this.terrainManager);

        this.terrainManager.generateWorld(50, 50);

        // Check Projectile <-> Wall collision
        this.physics.add.collider(this.projectileGroup!, this.terrainManager.wallGroup, (proj: any) => {
            proj.destroy();
        });

        // Wiring
        // onNextWaveRequest removed - Director handles flow
        // this.waveManager.onNextWaveRequest = ... legacy code removed // Events
        EventBus.on('START_MATCH', this.handleStartMatch, this);
        // Network logic moved to System
        // EventBus.on('NETWORK_PACKET', this.handleNetworkPacket, this);
        EventBus.on('APPLY_UPGRADE', this.applyUpgrade, this);
        EventBus.on('ENEMY_KILLED', (enemy: any) => {
            // Fix: Enemy emits itself, so use enemy.value and enemy.x/y
            const score = enemy.value || 10;
            this.awardScore(score);
            this.lootService.trySpawnLoot(enemy.x, enemy.y);

            // TASK_STITCH_003: XP Orbs Visuals (Revised)
            // Use 'flare' texture and additive blending for glow
            const orbCount = Phaser.Math.Between(3, 5);
            for (let i = 0; i < orbCount; i++) {
                const orb = this.add.sprite(enemy.x, enemy.y, 'flare');
                orb.setScale(0.5);
                orb.setTint(0xFFFF00); // Gold
                orb.setBlendMode(Phaser.BlendModes.ADD);
                orb.setDepth(120);

                this.physics.add.existing(orb);
                const body = orb.body as Phaser.Physics.Arcade.Body;

                // 1. Burst Out (Explocive)
                const angle = Phaser.Math.Between(0, 360);
                const speed = Phaser.Math.Between(200, 400);
                body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
                body.setDrag(800); // Quick slow down

                // 2. Magnet to Player after delay
                this.time.delayedCall(400 + i * 50, () => {
                    if (!orb.scene) return;

                    // Tween to player instead of physics for smoother "Zoom"
                    const magnetEvent = this.time.addEvent({
                        delay: 16,
                        loop: true,
                        callback: () => {
                            if (!this.myUnit || !orb.scene) { magnetEvent.remove(); if (orb.scene) orb.destroy(); return; }

                            this.physics.moveToObject(orb, this.myUnit, 900);

                            // Check distance
                            const dist = Phaser.Math.Distance.Between(orb.x, orb.y, this.myUnit.x, this.myUnit.y);
                            if (dist < 50) {
                                // Collected
                                orb.destroy();
                                magnetEvent.remove();
                                // Add XP logic
                                persistence.addXp(10); // 10 XP per orb
                            }
                        }
                    });
                });
            }

            // V5.0 Boss Lockdown Logic
            if (enemy.config?.id === 'BOSS_GOLEM') {
                this.extractionManager.setLocked(false);
                // Visual Toast
                const txt = this.add.text(this.cameras.main.width / 2, 200, "BOSS DEFEATED - EXTRACTION OPEN", { fontSize: '40px', color: '#00FF00', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0);
                this.tweens.add({ targets: txt, alpha: 0, duration: 4000, delay: 1000, onComplete: () => txt.destroy() });
            }

            // V4.0 Infinite Joy: Confetti Gore
            if (cardSystem.getStack('confetti_gore') > 0) {
                confetti({
                    particleCount: 30,
                    spread: 60,
                    origin: { x: enemy.x / this.scale.width, y: enemy.y / this.scale.height },
                    colors: ['#FF0000', '#880000', '#FFFFFF']
                });
            }
        });


        // Skill Trigger from InputSystem
        this.events.on('TRIGGER_SKILL', (skill: string) => {
            if (!this.myUnit) return;
            if (skill === 'DASH') this.myUnit.dash();
            if (skill === 'Q') this.myUnit.triggerSkill1();
            if (skill === 'E') this.myUnit.triggerSkill2();
        });

        this.scale.on('resize', this.handleResize, this);
        this.events.on('shutdown', () => this.cleanup());
        this.events.on('shutdown', () => this.cleanup());
        EventBus.on('RESUME', this.onResume, this);
        EventBus.on('GAME_OVER_SYNC', this.gameOver, this);

        this.resetGame();
        this.updateCameraZoom();
        this.emitStatsUpdate();

        // D. Input Recording (Module D)


        // --- HOTFIX CAMERA END ---

        // === HOTFIX: Camera Forced Lock ===
        if (this.myUnit) {
            // 1. Move to center
            this.myUnit.setPosition(2000, 2000);

            // 2. Lock Camera
            this.cameras.main.startFollow(this.myUnit, true);
            this.cameras.main.setZoom(1.5);

            console.log("🔥 HOTFIX APPLIED: Player moved to center & Camera locked.");
        } else {
            // Note: Player might not be created yet if waiting for START_MATCH.
            // But user requested this logic in create().
            // If setupPlayers() hasn't run, this will log "Factory failed" or similar if we strictly follow user logic.
            // However, this.myUnit is setup in handleStartMatch usually.
            // If create() -> handleStartMatch is NOT immediate, this block might fail or run too early.
            // But we have the delayedCall below.
        }

        // BUT, for now, let's cheat and force start if we know we are in Game Mode.
        EventBus.emit('SCENE_READY');
    }

    handleResize(gameSize: Phaser.Structs.Size) {
        // 1. Reset Viewport
        this.cameras.main.setViewport(0, 0, gameSize.width, gameSize.height);

        // 2. Recalculate Zoom
        this.updateCameraZoom();

        // 3. Re-lock
        if (this.myUnit) {
            this.cameras.main.startFollow(this.myUnit, true, 0.1, 0.1);
            this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
        }
    }

    updateCameraZoom() {
        const width = this.scale.width;
        let zoom = 1.0;

        // Mobile (Zoom in for detail)
        if (width < 600) zoom = 0.8;
        // Desktop (Wide view)
        else zoom = 1.0;

        this.cameras.main.zoomTo(zoom, 500, 'Power2');
    }

    handleStartMatch(data: any) {
        console.log("🚀 [MainScene] handleStartMatch triggered:", data);
        // Handle both string (legacy) and object payload
        const mode = (typeof data === 'string') ? data : data.mode;
        if (typeof data === 'object' && data.hero) {
            this.myClass = data.hero;
        }

        const actualMode = mode || (network.isHost ? 'MULTI' : 'MULTI');
        this.currentMode = actualMode as GameMode;
        this.isGameActive = true;

        console.log("🛠️ [MainScene] Setup Players...");
        this.setupPlayers();

        if (this.currentMode === 'SINGLE' || network.isHost) {
            console.log("🌊 [MainScene] Starting Wave 1...");
            const profile = persistence.getProfile();
            if (!profile.hasPlayedOnce) {
                // Tutorial logic removed
            } else {
                this.startNewWave(1);
            }

            if (this.myUnit) {
                console.log("🎥 [MainScene] Camera Locked on Unit.");

                // Force Lock
                this.cameras.main.startFollow(this.myUnit, true, 0.1, 0.1);
                this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
                this.cameras.main.centerOn(this.myUnit.x, this.myUnit.y);
                this.updateCameraZoom();
            } else {
                console.error("❌ [MainScene] myUnit is NULL after setupPlayers!");
            }
        }
    }

    setupPlayers() {
        if (this.commander) this.commander.destroy();
        if (this.drone) this.drone.destroy();

        console.log(`🔧 [MainScene] Creating Player Class: ${this.myClass}`);

        const cx = this.worldWidth / 2;
        const cy = this.worldHeight / 2;

        if (this.currentMode === 'SINGLE') {
            this.commander = PlayerFactory.create(this, cx, cy, this.myClass as any, 'COMMANDER', true);
            this.drone = PlayerFactory.create(this, cx + 200, cy, 'WEAVER', 'DRONE', false);
            this.myUnit = this.commander;
            this.otherUnit = this.drone;
        } else {
            // ... keys ...
            const isHost = network.isHost;
            if (isHost) {
                this.commander = PlayerFactory.create(this, cx, cy, this.myClass as any, 'COMMANDER', true);
                this.drone = PlayerFactory.create(this, cx + 200, cy, 'BLADE', 'DRONE', false);
            } else {
                this.commander = PlayerFactory.create(this, cx, cy, 'BLADE', 'COMMANDER', false);
                this.drone = PlayerFactory.create(this, cx + 200, cy, this.myClass as any, 'DRONE', true);
            }

            this.myUnit = isHost ? this.commander : this.drone;
            this.otherUnit = isHost ? this.drone : this.commander;
        }

        if (this.commander) {
            this.commander.setDepth(100);
            console.log("✅ [MainScene] Commander Created at depth 100");
        } else {
            console.error("❌ [MainScene] Commander Creation Failed!");
        }
        this.drone.setDepth(100);

        // V12.0: Register Sync Targets
        this.networkSyncSystem.setTargets(this.commander!, this.drone, this.waveManager);
    }

    // createPlayerClass removed - logic moved to PlayerFactory

    startNewWave(wave: number) {
        if (!this.commander) return;
        this.waveManager.startWave(wave);
    }

    cleanup() {
        // EventBus.off('NETWORK_PACKET', this.handleNetworkPacket, this); // Handled in System
        EventBus.off('APPLY_UPGRADE', this.applyUpgrade, this);
        EventBus.off('START_MATCH', this.handleStartMatch, this);
        EventBus.off('RESUME', this.onResume, this);
        EventBus.off('GAME_OVER_SYNC', this.gameOver, this);
        this.scale.off('resize', this.handleResize, this);

        this.networkSyncSystem.cleanup();

        this.waveManager.cleanup();
        this.enemyGroup?.clear(true, true);
        this.projectileGroup?.clear(true, true);

        // ...
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
        // this.waveManager.reset(); // Method removed in V5.0?
        if (this.enemyGroup) this.enemyGroup.clear(true, true);
    }

    update(time: number, delta: number) {
        if (!this.myUnit) return; // Guard clause from other update

        // 1. Update Time (Merged)
        if (this.isGameActive && !this.isPaused) {
            this.survivalTime += delta / 1000;
            // 2. Pulse Logic (Merged)
            // V5.0: Extraction is always open, managed by ExtractionManager state.
            // if (this.survivalTime >= 180 && !this.extractionManager.isActive) {
            //     this.extractionManager.spawnZones();
            // }
        }

        if (this.survivalTime >= this.nextBossTime && this.pulsePhase !== 'PURGE') {
            this.triggerPurge();
        }

        this.updateBackground(time);

        // V4.0: Glitch Decay
        if (this.glitchDuration > 0) {
            this.glitchDuration -= delta;
        } else if (this.glitchIntensity > 0) {
            this.glitchIntensity *= 0.9;
            if (this.glitchIntensity < 0.01) this.glitchIntensity = 0;
        }
        if (this.glitchPipeline) {
            this.glitchPipeline.intensity = this.glitchIntensity;
        }

        // Lighting Update (Fog of War)
        this.updateLighting();

        // Sync Player Light
        if (this.myUnit && this.playerLight) {
            this.playerLight.setPosition(this.myUnit.x, this.myUnit.y);
            // Flicker effect
            this.playerLight.intensity = 1.0 + Math.sin(time / 100) * 0.1;
        }

        if (!this.isGameActive || this.isPaused) return;

        // ... Rest of update ...
        super.update(time, delta);

        // V12.0: Network Sync Update
        this.networkSyncSystem.update(time, delta, this.currentMode, network.isHost);

        if (this.isGameActive) {
            this.processLocalInput(time);
        } // 2. Drone Logic
        // D. Input Recording (Module D)
        if (this.myUnit) {
            this.inputRecorder.record(time, this.myUnit.x, this.myUnit.y, this.input.activePointer.isDown, false);
        }

        if (this.currentMode === 'SINGLE') {
            this.updateDroneAI();
        } else if (network.isHost) {
            this.processDroneMovementAsHost();
        }

        // 3. Logic (Host/Single)
        if (this.currentMode === 'SINGLE' || network.isHost) {
            this.enemyGroup?.getChildren().forEach((child) => {
                if (child.active) {
                    (child as Enemy).update(time, delta, this.commander!);
                }
            });
            this.runCombatLogic();
            this.waveManager.update(time, delta);

            // Note: broadcastGameState removed, handled in NetworkSyncSystem
        } else {
            // Note: sendClientInput removed, handled in NetworkSyncSystem
        }

        // 4. Shared Mechanics
        this.combatManager.updateCombatAI(this.commander!, this.drone, this.enemyGroup!, this.projectileGroup!);
        this.handlePowerupCollisions();
        this.handleLootCollection();
        this.extractionManager.update(time, delta);
        this.handleExtraction(); // Check Zone overlap

        // 5. Visuals
        this.commander?.update();
        this.drone?.update();

        // 6. UI Update (Throttled to 10fps / 100ms)
        if (time - this.lastStatsTime > 100) {
            this.emitStatsUpdate();
            this.lastStatsTime = time;
        }
    }

    runCombatLogic() {
        const players = [this.commander!, this.drone!].filter(p => !!p);
        this.combatManager.checkCollisions(
            this.enemyGroup!,
            players,
            (amt) => this.takeDamage(amt)
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

        this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 3, '撤離成功', {
            fontSize: '48px', color: '#00FF00', fontStyle: 'bold'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);

        // Emit Persistence
        if (this.myUnit) {
            EventBus.emit('EXTRACTION_SUCCESS', this.myUnit.lootBag);
            inventoryService.processLootBag(this.myUnit.lootBag.map(i => i.id)); // Save Loot

            // JUICE: Confetti Explosion
            this.effectManager.triggerConfetti();
        }

        // Loot List
        let lootList = "戰利品確認:\n";
        if (this.myUnit) {
            this.myUnit.lootBag.forEach(item => lootList += `> ${item.name}\n`);
        }

        this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2, lootList, {
            fontSize: '24px', color: '#FFFFFF'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);
    }

    // --- Inputs & Movement ---
    processLocalInput(time: number) {
        if (this.commander) {
            this.inputSystem.processInput(this.input, this.cameras, this.commander, this.statsModifiers);
            // Auto-Fire (Stop & Shoot mechanic)
            if (this.enemyGroup) {
                this.commander.autoFire(time, this.enemyGroup);
            }
        }
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
        // Use System Input Store
        const input = this.networkSyncSystem.remoteInputVector;

        if (input.x !== 0 || input.y !== 0) {
            const accel = PHYSICS.acceleration * this.statsModifiers.droneSpeed;
            body.setDrag(PHYSICS.drag);
            body.setAcceleration(input.x * accel, input.y * accel);
            const angle = Math.atan2(input.y, input.x);
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
            const def = loot.getData('itemDef'); // Updated key

            if (!def) return;

            // Handle Scrap (Instant Credit)
            if (def.type === 'MATERIAL') { // String check
                inventoryService.addCredits(10); // 10 Credits per scrap
                loot.destroy();

                EventBus.emit('LOOT_PICKUP_VISUAL', { x: player.x, y: player.y, text: '+10 CR', color: '#ffff00' });
                return;
            }

            // Handle Artifacts (Bag)
            if (player.lootBag.length < 5) {
                player.lootBag.push(def);
                loot.destroy();
                player.recalculateStats(); // V4.0
                this.events.emit('LOOT_PICKUP', def);

                EventBus.emit('LOOT_PICKUP_VISUAL', { x: player.x, y: player.y, text: `+${def.name}`, color: '#00ffff' });
            } else {
                // Bag Full Feedback
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
        this.triggerGlitch(0.5, 200); // Damage Glitch
        this.triggerGlitch(0.5, 200); // Damage Glitch
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
        this.physics.pause();

        // V12.0: Emit to React Overlay
        const choices = cardSystem.getRandomDraft(3);
        EventBus.emit('SHOW_DRAFT', { choices });
        EventBus.emit('LEVEL_UP', this.level);
    }

    // showDraftScreen removed in favor of React Overlay

    onResume() {
        this.isPaused = false;
        this.physics.resume();
        this.myUnit?.recalculateStats();
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

    // --- Network Logic moved to NetworkSyncSystem ---

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


    // --- FTUE: INVISIBLE TUTORIAL ---
    private tutorialWall: Phaser.GameObjects.Rectangle | null = null;
    private tutorialText: Phaser.GameObjects.Text | null = null;

    startTutorialMode() {
        // 1. Spawn Glass Wall (Visual + Physics)
        const wallY = -400;
        this.tutorialWall = this.add.rectangle(0, wallY, 800, 50, 0x00FFFF, 0.3);
        this.physics.add.existing(this.tutorialWall);
        const body = this.tutorialWall.body as Phaser.Physics.Arcade.Body;
        body.setImmovable(true);

        // 2. Add "FLICK TO BREACH" Text
        this.tutorialText = this.add.text(0, 200, "快速滑動以衝刺\nFLICK TO DASH", {
            fontSize: '40px', color: '#00FFFF', align: 'center', stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5);

        // 3. Collision Logic: Dash breaks wall
        // Note: Needs to be checked in update() or add collider here involving myUnit
        // But myUnit might be recreated in setupPlayers?
        // Let's add collider in update() or just strictly here if myUnit exists
        if (this.myUnit) {
            this.physics.add.collider(this.myUnit, this.tutorialWall, () => {
                if (this.myUnit?.isDashing) {
                    this.breakTutorialWall();
                }
            });
        }
    }

    breakTutorialWall() {
        if (!this.tutorialWall) return;

        // FX
        this.cameras.main.shake(300, 0.02);

        // Destroy Wall
        this.tutorialWall.destroy();
        this.tutorialWall = null;
        if (this.tutorialText) this.tutorialText.destroy();

        // Start Game
        this.time.delayedCall(1000, () => {
            this.startNewWave(1);
        });
    }

    triggerGlitch(intensity: number, duration: number) {
        this.glitchIntensity = intensity;
        this.glitchDuration = duration;
    }
}
