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

    private enemyGroup!: Phaser.GameObjects.Group;
    private projectileGroup!: Phaser.GameObjects.Group;



    // Glitch
    private glitchPipeline: GlitchPipeline | null = null;
    private glitchIntensity: number = 0.02;
    private glitchDuration: number = 0;
    private playerLight: Phaser.GameObjects.Light | null = null;

    // State
    private isGameActive: boolean = false;
    private isPaused: boolean = false;
    private hp: number = 100;
    private maxHp: number = 100;

    // Systems
    public waveManager!: WaveManager;
    public extractionManager!: ExtractionManager;
    public combatManager!: CombatManager;
    public terrainManager!: TerrainManager;
    public effectManager!: EffectManager;
    public lootService!: LootService;
    public weaponSystem!: WeaponSystem;
    public inputSystem!: InputSystem;
    public networkSyncSystem!: NetworkSyncSystem;
    public inputRecorder!: InputRecorder;
    public soundManager!: SoundManager;
    public ecsWorld!: World;

    private myClass: string = 'SCAVENGER';
    private statsModifiers = { tetherLength: 1.0, droneSpeed: 1.0, playerSpeed: 1.0 };
    public worldWidth: number = 4000;
    public worldHeight: number = 4000;
    private accumulator: number = 0;
    private readonly fixedTimeStep: number = 1000 / 60;

    constructor() {
        super('MainScene');
    }

    create() {
        this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);

        // Groups
        this.enemyGroup = this.add.group();
        this.projectileGroup = this.add.group();

        // Init Managers
        this.cameraDirector = new CameraDirector(this, this.worldWidth, this.worldHeight);
        this.playerManager = new PlayerLifecycleManager(this);
        this.progression = new ProgressionManager(this);

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

        // Test Entity
        const ghost = this.ecsWorld.createEntity();
        this.ecsWorld.addComponent(ghost, Position, 2000, 2000);
        this.ecsWorld.addComponent(ghost, Velocity, 100, 100);
        const ghostGfx = this.add.circle(0, 0, 15, 0xFFFFFF);
        this.ecsWorld.addComponent(ghost, Renderable, ghostGfx);

        // Lighting
        this.lights.enable();
        this.lights.setAmbientColor(AMBER_STYLE.ambient);
        this.playerLight = this.lights.addLight(0, 0, 500).setIntensity(1.5).setColor(AMBER_STYLE.playerLight);

        // Glitch
        if (this.game.renderer.type === Phaser.WEBGL) {
            try {
                this.renderer.pipelines.addPostPipeline('GlitchPipeline', GlitchPipeline);
                this.cameras.main.setPostPipeline(GlitchPipeline);
                this.glitchPipeline = this.cameras.main.getPostPipeline(GlitchPipeline) as GlitchPipeline;
                this.glitchPipeline.intensity = this.glitchIntensity;
            } catch (e) { console.warn("Shader Pipeline failed", e); }
        }

        // Events
        EventBus.on('JOYSTICK_MOVE', (vec: { x: number, y: number }) => this.inputSystem.setVirtualAxis(vec.x, vec.y));
        EventBus.on('JOYSTICK_AIM', (data: { x: number, y: number, isFiring: boolean }) => this.inputSystem.setVirtualAim(data.x, data.y, data.isFiring));
        EventBus.on('JOYSTICK_SKILL', (skill: string) => this.inputSystem.triggerSkill(skill));

        EventBus.on('START_MATCH', this.handleStartMatch, this);
        EventBus.on('ENEMY_KILLED', (enemy: any) => this.handleEnemyKill(enemy));
        EventBus.on('GAME_OVER_SYNC', this.gameOver, this);
        EventBus.on('RESUME_GAME', () => { this.isPaused = false; this.physics.resume(); });

        this.physics.add.collider(this.projectileGroup, this.terrainManager.wallGroup, (proj: any) => proj.destroy());
        this.setupDevTools();
        EventBus.emit('SCENE_READY');
    }

    handleResize(gameSize: Phaser.Structs.Size) {
        this.cameraDirector.handleResize(gameSize);
    }

    // [DEV TOOL] Reset Profile
    private setupDevTools() {
        this.input.keyboard?.on('keydown-R', () => {
            console.log("🔄 [DEV] Resetting Profile to Rookie...");
            localStorage.clear();
            window.location.reload();
        });
    }

    private handleStartMatch(data: { mode: string, hero: string }) {
        if (this.isGameActive) return;

        console.log(`[MainScene] Starting Match with Hero: ${data.hero}`);
        this.startMatchWithClass(data.hero);
    }

    private startMatchWithClass(classId: string) {
        this.isGameActive = true;
        this.isPaused = false;

        // ... (Original logic moved here)
        // 1. Map Setup
        // Note: mapManager is not defined in the provided context.
        // Assuming terrainManager.generateWorld() is the equivalent of mapManager.generateMap() for this context.
        this.terrainManager.generateWorld();

        // 2. Player Spawn
        // Note: mapManager.getPlayerSpawnPoint() is not defined.
        // Using existing worldWidth/Height for spawn point.
        const player = this.playerManager.spawnPlayer(classId, this.worldWidth / 2, this.worldHeight / 2, this.networkSyncSystem, this.waveManager);

        // 3. Camera
        this.cameraDirector.setupFollow(player);

        // 4. Wave Start
        this.waveManager.startWave(1);

        // 5. FX
        // Note: cameraDirector.triggerFlash is not defined.
        // this.cameraDirector.triggerFlash(1000);
    }

    update(time: number, delta: number) {
        if (!this.playerManager.myUnit) return;

        // Lighting Follow
        const myUnit = this.playerManager.myUnit;
        if (this.playerLight) {
            this.playerLight.setPosition(myUnit.x, myUnit.y);
            this.playerLight.intensity = 1.2 + Math.sin(time / 200) * 0.1;
        }

        // Glitch Decay
        if (this.glitchDuration > 0) {
            this.glitchDuration -= delta;
        } else {
            this.glitchIntensity = Math.max(AMBER_STYLE.glitchBase, this.glitchIntensity * 0.85);
        }
        if (this.glitchPipeline) this.glitchPipeline.intensity = this.glitchIntensity;

        // Low HP Effect
        if (this.hp < this.maxHp * 0.3) {
            if (Math.random() < 0.05) this.cameraDirector.shake(0.005, 100);
        }

        // Managers Update
        this.playerManager.update();

        // Fixed Step
        this.accumulator += delta;
        while (this.accumulator >= this.fixedTimeStep) {
            this.fixedUpdate(time, this.fixedTimeStep);
            this.accumulator -= this.fixedTimeStep;
        }
    }

    fixedUpdate(time: number, delta: number) {
        if (!this.isGameActive || this.isPaused) return;

        this.progression.update(delta);
        const myUnit = this.playerManager.myUnit;

        // Input
        if (myUnit) {
            this.inputSystem.processInput(this.input, this.cameras, myUnit, this.statsModifiers); // Compat: Camera still passed for ScreenToWorld, keep?
            // Input System uses camera for mouse conversion.
            this.cameraDirector.updateLookahead(this.inputSystem.getVirtualAxis().x, this.inputSystem.getVirtualAxis().y);
            if (this.enemyGroup) myUnit.autoFire(time, this.enemyGroup);
        }

        this.waveManager.update(time, delta);
        this.ecsWorld.update(delta);

        this.enemyGroup?.getChildren().forEach((child) => {
            if (child.active) (child as Enemy).update(time, delta, myUnit!);
        });

        this.runCombatLogic();
        this.extractionManager.update(time, delta);
        this.waypointManager.update(); // [NEW] Update HUD
        this.handleExtraction();

        if (time % 10 < 1) this.emitStatsUpdate();
    }

    runCombatLogic() {
        const players = [this.playerManager.commander!].filter(p => !!p);
        this.combatManager.checkCollisions(
            this.enemyGroup!,
            players,
            (amt) => this.takeDamage(amt),
            this.weaponSystem.projectiles
        );
    }

    takeDamage(amt: number) {
        this.cameraDirector.shake(0.01, 200);
        this.triggerGlitch(AMBER_STYLE.glitchPeak, 150);
        EventBus.emit('PLAY_SFX', 'HIT');
        this.hp -= amt;
        if (this.hp <= 0) {
            this.hp = 0;
            this.gameOver();
        }
        this.emitStatsUpdate();
    }

    handleEnemyKill(enemy: any) {
        this.progression.handleEnemyKill(enemy);
        this.lootService.trySpawnLoot(enemy.x, enemy.y);
    }

    gameOver() {
        EventBus.emit('GAME_OVER', { score: this.progression.score, wave: this.waveManager.wave, level: this.progression.level });
        this.isPaused = true;
        this.isGameActive = false;
        this.physics.pause();
    }

    triggerGlitch(intensity: number, duration: number) {
        this.glitchIntensity = intensity;
        this.glitchDuration = duration;
    }

    emitStatsUpdate() {
        if (this.playerManager.myUnit) {
            this.progression.emitStats(this.hp, this.maxHp, this.waveManager.wave, this.enemyGroup ? this.enemyGroup.getLength() : 0, this.playerManager.myUnit);
        }
    }

    handleExtraction() {
        const myUnit = this.playerManager.myUnit;
        if (!myUnit) return;
        if (this.extractionManager.checkExtraction(myUnit)) {
            this.physics.pause();
            this.isGameActive = false;
            EventBus.emit('EXTRACTION_SUCCESS', myUnit.lootBag);
            inventoryService.processLootBag(myUnit.lootBag.map(i => i.uid));
        }
    }

    levelUp() {
        this.progression.levelUp(this.playerManager.myUnit!, this.enemyGroup!);
    }

    cleanup() {
        this.scale.off('resize', this.handleResize, this);
        EventBus.off('START_MATCH', this.handleStartMatch, this);
    }
}
