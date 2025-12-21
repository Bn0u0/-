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

    preload() {
        console.log("🚀 [MainScene] Preloading Assets...");
        // Generating 'flare' texture programmatically if missing
        if (!this.textures.exists('flare')) {
            const graphics = this.make.graphics({ x: 0, y: 0 });
            graphics.fillStyle(0xffffff, 1);
            graphics.fillCircle(16, 16, 16);
            graphics.generateTexture('flare', 32, 32);
        }
    }

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
        this.waypointManager = new WaypointManager(this); // [FIX] Initialize WaypointManager

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

        console.log("🔊 [MainScene] Registering START_MATCH Listener...");
        EventBus.on('START_MATCH', this.handleStartMatch, this);
        console.log(`🔊 [MainScene] Listener Registered. Count: ${EventBus.listenerCount('START_MATCH')}`);

        // [DEBUG] Check Instance Consistency
        (window as any).SceneEventBus = EventBus;

        EventBus.on('ENEMY_KILLED', (enemy: any) => this.handleEnemyKill(enemy));
        EventBus.on('GAME_OVER_SYNC', this.gameOver, this);
        EventBus.on('RESUME_GAME', () => { this.isPaused = false; this.physics.resume(); });

        this.physics.add.collider(this.projectileGroup, this.terrainManager.wallGroup, (proj: any) => proj.destroy());

        // [OPERATION PICKUP]
        // Register Overlap: Player vs Loot
        // Note: We need to ensure playerManager.myUnit is ready, but it's spawn dynamic. 
        // We can registers overlap on the Group vs Group (or Player Group if we had one).
        // Since myUnit is re-created, we might need to add this in startMatchWithClass or use a Group for players.
        // However, myUnit is a Container.
        // Quick Fix: Add overlap in fixedUpdate or when player spawns?
        // Better: Use a Player Group for physics.
        // Current Architecture: Player is just a class wrapping a Container.
        // Let's add it in fixedUpdate check (if (!collider) addCollider) OR just use overlap on the fly in update.
        // Actually, easiest is to add it in `fixedUpdate` via `this.physics.overlap`.

        this.setupDevTools();
        EventBus.emit('SCENE_READY');
    }

    // ...

    // [OPERATION PICKUP]
    private handleLootPickup(playerContainer: any, lootSprite: any) {
        if (!lootSprite.active) return;

        const itemvar = lootSprite.getData('itemInstance');
        if (!itemvar) return;

        // Try to add to backpack
        if (inventoryService.addToBackpack(itemvar)) {
            // Success
            EventBus.emit('PLAY_SFX', 'PICKUP'); // Need SFX
            EventBus.emit('SHOW_TOAST', `拾取: ${itemvar.displayName}`);

            // FX
            this.tweens.add({
                targets: lootSprite,
                y: lootSprite.y - 50,
                alpha: 0,
                scale: 1.5,
                duration: 300,
                onComplete: () => lootSprite.destroy()
            });
        } else {
            // Full
            // EventBus.emit('SHOW_TOAST', '背包已滿 (Backpack Full)');
            // Bounce effect?
        }
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

    // [NEW] 1. 統一的啟動入口 (強制重置)
    private handleStartMatch(data: { mode: string, hero: string }) {
        console.log(`[MainScene] 🟢 Received START_MATCH Command for: ${data.hero}`);

        // 無論當前狀態如何，強制執行「掃地協議」
        this.cleanStart();

        // 啟動新一局
        this.startMatchWithClass(data.hero);
    }

    // [NEW] 2. 掃地協議 (The Cleanup Protocol)
    private cleanStart() {
        console.log("[MainScene] 🧹 Cleaning up previous match state...");

        // A. 喚醒物理引擎 (關鍵修復！)
        if (this.physics.world.isPaused) {
            this.physics.resume();
        }
        this.isPaused = false;
        this.isGameActive = false; // 先設為 false，等生成完再開

        // B. 清理舊實體 (防止多重身/殘影)
        if (this.enemyGroup) this.enemyGroup.clear(true, true);
        if (this.projectileGroup) this.projectileGroup.clear(true, true);

        // 清除掉落物 (如果有)
        if (this.lootService && this.lootService['group']) {
            // @ts-ignore
            this.lootService['group'].clear(true, true);
        }

        // C. 銷毀舊玩家
        if (this.playerManager.myUnit) {
            this.playerManager.myUnit.destroy();
            this.playerManager.myUnit = null; // 強制設空
        }

        // D. 重置進度 (如果需要)
        // this.waveManager.reset(); 
    }

    // [MODIFIED] 3. 啟動邏輯
    private startMatchWithClass(classId: string) {
        console.log("[MainScene] ⚡ Initializing new match sequences...");

        // 1. 生成地圖 (重新生成或重置)
        this.terrainManager.generateWorld();

        // 2. 生成玩家
        // 確保座標是安全的出生點
        const startX = this.worldWidth / 2;
        const startY = this.worldHeight / 2;
        // Reset player light reference if unit destroyed
        if (this.playerLight) {
            this.playerLight.setPosition(startX, startY);
        }

        const player = this.playerManager.spawnPlayer(classId, startX, startY, this.networkSyncSystem, this.waveManager);

        // 3. 攝影機跟隨
        this.cameraDirector.setupFollow(player);

        // 4. 開始第一波
        this.waveManager.startWave(1);

        // 5. 標記遊戲活躍
        this.isGameActive = true;

        // [VISUAL] 開場特效
        this.triggerGlitch(0.5, 500);
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

        // [OPERATION PICKUP]
        // Check Loot Overlap
        if (this.lootService && this.lootService.group && myUnit) {
            this.physics.overlap(myUnit, this.lootService.group, (p, l) => this.handleLootPickup(p, l));
        }

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
