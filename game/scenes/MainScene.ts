import Phaser from 'phaser';
import { Player } from '../classes/Player';
import { Enemy } from '../classes/Enemy';
import { COLORS, PHYSICS } from '../../constants';
import { EventBus } from '../../services/EventBus';
import { LootService } from '../../services/LootService';
import { inventoryService } from '../../services/InventoryService';
import { WeaponSystem } from '../systems/WeaponSystem';
import { WaveManager } from '../managers/WaveManager';
import { ExtractionManager } from '../managers/ExtractionManager';
import { CombatManager } from '../managers/CombatManager';
import { TerrainManager } from '../managers/TerrainManager';
import { InputSystem } from '../systems/InputSystem';
import { EffectManager } from '../managers/EffectManager';
import { NetworkSyncSystem } from '../systems/NetworkSyncSystem';
import { GlitchPipeline } from '../pipelines/GlitchPipeline';
import { InputRecorder } from '../systems/InputRecorder';
import { SoundManager } from '../managers/SoundManager';
import { World } from '../ecs/ECS';
import { PhysicsSystem } from '../ecs/systems/PhysicsSystem';
import { RenderSystem } from '../ecs/systems/RenderSystem';
import { Position, Velocity, Renderable } from '../ecs/Components';

// [NEW MANAGERS]
import { CameraDirector } from '../managers/CameraDirector';
import { PlayerLifecycleManager } from '../managers/PlayerLifecycleManager';
import { ProgressionManager } from '../managers/ProgressionManager';
import { WaypointManager } from '../managers/WaypointManager';
import { AllyManager } from '../managers/AllyManager'; // [NEW]

type GameMode = 'SINGLE' | 'MULTI';

const AMBER_STYLE = {
    bg: 0x2D1B2E,
    ambient: 0x665566,
    playerLight: 0xFFD1A9,
    glitchBase: 0.02,
    glitchPeak: 0.5
};

export class MainScene extends Phaser.Scene {
    declare public cameras: Phaser.Cameras.Scene2D.CameraManager;
    declare public add: Phaser.GameObjects.GameObjectFactory;
    declare public time: Phaser.Time.Clock;
    declare public events: Phaser.Events.EventEmitter;
    declare public physics: Phaser.Physics.Arcade.ArcadePhysics;
    declare public input: Phaser.Input.InputPlugin;
    declare public scale: Phaser.Scale.ScaleManager;
    declare public renderer: Phaser.Renderer.WebGL.WebGLRenderer;

    // Managers (Refactored)
    public cameraDirector!: CameraDirector;
    public playerManager!: PlayerLifecycleManager;
    public progression!: ProgressionManager;
    public waypointManager!: WaypointManager;
    public allyManager!: AllyManager; // [NEW]

    private enemyGroup!: Phaser.GameObjects.Group;
    private projectileGroup!: Phaser.GameObjects.Group;
    // allyGroup removed (Moved to Manager)

    // ... (Lines 60-118 skipped) ...

    create() {
        console.log("🚀 [MainScene] Creating Scene...");
        this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);

        // Groups
        this.enemyGroup = this.add.group();
        this.projectileGroup = this.add.group();

        // Init Managers
        this.cameraDirector = new CameraDirector(this, this.worldWidth, this.worldHeight);
        this.playerManager = new PlayerLifecycleManager(this);
        this.progression = new ProgressionManager(this);
        this.waypointManager = new WaypointManager(this);
        this.allyManager = new AllyManager(this); // [NEW]

        // Init Systems
        this.lootService = new LootService(this);
        this.effectManager = new EffectManager(this);
        this.terrainManager = new TerrainManager(this);
        this.terrainManager.generateWorld();

        this.weaponSystem = new WeaponSystem(this);
        this.inputSystem = new InputSystem(this);
        this.inputRecorder = new InputRecorder();
        this.networkSyncSystem = new NetworkSyncSystem(this);
        this.combatManager = new CombatManager(this);
        this.extractionManager = new ExtractionManager(this, this.worldWidth, this.worldHeight);

        // [NEW] Register Waypoints
        this.extractionManager.getZones().forEach((z: any) => {
            this.waypointManager.addTarget({
                x: z.x,
                y: z.y,
                label: 'EXIT',
                color: 0x00FF00
            });
        });

        this.waveManager = new WaveManager(this, this.enemyGroup);
        this.soundManager = new SoundManager();

        // ECS
        this.ecsWorld = new World();
        this.ecsWorld.addSystem(new PhysicsSystem(this.ecsWorld));
        this.ecsWorld.addSystem(new RenderSystem(this.ecsWorld));

        // ... (Skipping Test Entity & Lighting & Glitch & Events) ...

        EventBus.on('JOYSTICK_MOVE', (vec: { x: number, y: number }) => this.inputSystem.setVirtualAxis(vec.x, vec.y));
        EventBus.on('JOYSTICK_AIM', (data: { x: number, y: number, isFiring: boolean }) => this.inputSystem.setVirtualAim(data.x, data.y, data.isFiring));
        EventBus.on('JOYSTICK_SKILL', (skill: string) => this.inputSystem.triggerSkill(skill));

        console.log("🔊 [MainScene] Registering START_MATCH Listener...");
        EventBus.on('START_MATCH', this.handleStartMatch, this);
        console.log(`🔊 [MainScene] Listener Registered. Count: ${EventBus.listenerCount('START_MATCH')}`);

        (window as any).SceneEventBus = EventBus;

        EventBus.on('ENEMY_KILLED', (enemy: any) => this.handleEnemyKill(enemy));
        EventBus.on('GAME_OVER_SYNC', this.gameOver, this);
        EventBus.on('RESUME_GAME', () => { this.isPaused = false; this.physics.resume(); });

        this.physics.add.collider(this.projectileGroup, this.terrainManager.wallGroup, (proj: any) => proj.destroy());

        this.setupDevTools();
        EventBus.emit('SCENE_READY');
    }

    // ... (Handles & CleanStart) ...

    private cleanStart() {
        console.log("[MainScene] 🧹 Cleaning up previous match state...");

        if (this.physics.world.isPaused) {
            this.physics.resume();
        }
        this.isPaused = false;
        this.isGameActive = false;

        if (this.enemyGroup) this.enemyGroup.clear(true, true);
        if (this.projectileGroup) this.projectileGroup.clear(true, true);

        // [NEW] Clean Allies
        if (this.allyManager) this.allyManager.clear();

        if (this.lootService && this.lootService['group']) {
            // @ts-ignore
            this.lootService['group'].clear(true, true);
        }

        if (this.playerManager.myUnit) {
            this.playerManager.myUnit.destroy();
            this.playerManager.myUnit = null;
        }
    }

    // ... (StartMatch) ...

    fixedUpdate(time: number, delta: number) {
        if (!this.isGameActive || this.isPaused) return;

        this.progression.update(delta);
        const myUnit = this.playerManager.myUnit;

        if (myUnit) {
            this.inputSystem.processInput(this.input, this.cameras, myUnit, this.statsModifiers);
            this.cameraDirector.updateLookahead(this.inputSystem.getVirtualAxis().x, this.inputSystem.getVirtualAxis().y);
            if (this.enemyGroup) myUnit.autoFire(time, this.enemyGroup);
        }

        this.waveManager.update(time, delta);
        this.ecsWorld.update(delta);

        this.enemyGroup?.getChildren().forEach((child) => {
            if (child.active) (child as Enemy).update(time, delta, myUnit!);
        });

        // [NEW] Ally Manager Update
        this.allyManager.update(time, delta, this.enemyGroup);
        this.allyManager.checkCollisions(this.enemyGroup);

        this.runCombatLogic();
        this.extractionManager.update(time, delta);
        this.waypointManager.update();
        this.handleExtraction();

        if (this.lootService && this.lootService.group && myUnit) {
            this.physics.overlap(myUnit, this.lootService.group, (p, l) => this.handleLootPickup(p, l));
        }

        if (time % 10 < 1) this.emitStatsUpdate();
    }

    // ... (Rest of file) ...

    cleanup() {
        this.scale.off('resize', this.handleResize, this);
        EventBus.off('START_MATCH', this.handleStartMatch, this);
        if (this.allyManager) this.allyManager.destroy(); // [NEW]
    }
}
