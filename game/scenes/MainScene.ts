import Phaser from 'phaser';
import { Player } from '../classes/Player';
import { Enemy } from '../classes/Enemy';
import confetti from 'canvas-confetti';
import { COLORS, PHYSICS } from '../../constants';
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
import { InputRecorder } from '../systems/InputRecorder';
import { TextureManager } from '../managers/TextureManager';
import { SoundManager } from '../managers/SoundManager';

type GameMode = 'SINGLE' | 'MULTI';

// [STYLE] Amber-Glitch Palette Definitions
const AMBER_STYLE = {
    bg: 0x2D1B2E,          // 深紫色背景 (取代純黑)
    ambient: 0x665566,     // 暖灰色環境光 (提高亮度，防止畫面太暗)
    playerLight: 0xFFD1A9, // 鎢絲燈暖黃 (主角光環)
    shadow: 0x1B1020       // 陰影色
};

export class MainScene extends Phaser.Scene {
    // ... 宣告區 ...
    declare public cameras: Phaser.Cameras.Scene2D.CameraManager;
    declare public add: Phaser.GameObjects.GameObjectFactory;
    declare public time: Phaser.Time.Clock;
    declare public events: Phaser.Events.EventEmitter;
    declare public physics: Phaser.Physics.Arcade.ArcadePhysics;
    declare public input: Phaser.Input.InputPlugin;
    declare public scale: Phaser.Scale.ScaleManager;
    declare public renderer: Phaser.Renderer.WebGL.WebGLRenderer; // 明確宣告 renderer

    private commander: Player | null = null;
    private drone: Player | null = null;
    private myUnit: Player | null = null;
    private otherUnit: Player | null = null;
    private enemyGroup: Phaser.GameObjects.Group | null = null;
    private projectileGroup: Phaser.GameObjects.Group | null = null;
    private bgGrid: Phaser.GameObjects.Grid | null = null;

    // Glitch
    private glitchPipeline: GlitchPipeline | null = null;
    private glitchIntensity: number = 0.02; // 預設一點點 VHS 雜訊
    private glitchDuration: number = 0;
    private playerLight: Phaser.GameObjects.Light | null = null;

    // State
    private isGameActive: boolean = false;
    private currentMode: GameMode = 'SINGLE';
    private isPaused: boolean = false;
    private level: number = 1;
    private xp: number = 0;
    private xpToNextLevel: number = 10;
    private score: number = 0;
    private hp: number = 100;
    private maxHp: number = 100;
    private survivalTime: number = 0;
    private nextBossTime: number = 300;
    private pulsePhase: 'SCAVENGE' | 'WARNING' | 'PURGE' = 'SCAVENGE';

    // Systems
    public waveManager!: WaveManager;
    public extractionManager!: ExtractionManager;
    public combatManager!: CombatManager;
    public terrainManager!: TerrainManager;
    public effectManager!: EffectManager;
    public powerupService!: PowerupService;
    public lootService!: LootService;
    public weaponSystem!: WeaponSystem;
    public inputSystem!: InputSystem;
    public networkSyncSystem!: NetworkSyncSystem;
    public inputRecorder!: InputRecorder;
    public soundManager!: SoundManager;

    private myClass: string = 'BLADE';
    private doubleScoreActive: boolean = false;
    private statsModifiers = { tetherLength: 1.0, droneSpeed: 1.0, playerSpeed: 1.0 };
    public worldWidth: number = 4000;
    public worldHeight: number = 4000;
    private lastStatsTime: number = 0;
    private accumulator: number = 0;
    private readonly fixedTimeStep: number = 1000 / 60;

    constructor() {
        super('MainScene');
    }

    create() {
        console.log("🎨 [MainScene] Applying Amber-Glitch Style...");

        // 1. [STYLE] 設定背景色 (Amber-Glitch 深紫)
        this.cameras.main.setBackgroundColor(AMBER_STYLE.bg);

        // 設定世界邊界
        this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
        this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);

        // 2. Texture Generation
        const textureManager = new TextureManager(this);
        textureManager.generateAll();

        // 3. Register Resize (Fix Web Layout)
        this.scale.on('resize', this.handleResize, this);

        // 4. Initial Camera Center (Fix Invisible Start)
        this.cameras.main.scrollX = this.worldWidth / 2 - this.cameras.main.width / 2;
        this.cameras.main.scrollY = this.worldHeight / 2 - this.cameras.main.height / 2;

        // 5. Initialize Groups
        this.enemyGroup = this.add.group();
        this.projectileGroup = this.add.group(); // 確保這個也被初始化

        // 6. Initialize Systems
        this.powerupService = new PowerupService(this);
        this.lootService = new LootService(this);
        this.effectManager = new EffectManager(this);
        this.terrainManager = new TerrainManager(this);
        this.terrainManager.generateWorld(); // [Check] 確保地板有生成

        this.weaponSystem = new WeaponSystem(this);
        this.inputSystem = new InputSystem(this);
        this.inputRecorder = new InputRecorder();
        this.networkSyncSystem = new NetworkSyncSystem(this);
        this.combatManager = new CombatManager(this);
        this.extractionManager = new ExtractionManager(this, this.worldWidth, this.worldHeight);
        this.waveManager = new WaveManager(this, this.enemyGroup);
        this.soundManager = new SoundManager();

        // 7. [STYLE] Lighting System (Amber-Glitch)
        // 啟用光照
        this.lights.enable();
        // 設定環境光 (暖灰，確保非發光物體也能被看見)
        this.lights.setAmbientColor(AMBER_STYLE.ambient);

        // 創建主角光環 (即使主角還沒生成，燈光先準備好)
        this.playerLight = this.lights.addLight(0, 0, 500)
            .setIntensity(1.5)
            .setColor(AMBER_STYLE.playerLight);

        // 8. [STYLE] Glitch Pipeline
        if (this.game.renderer.type === Phaser.WEBGL) {
            try {
                this.renderer.pipelines.addPostPipeline('GlitchPipeline', GlitchPipeline);
                this.cameras.main.setPostPipeline(GlitchPipeline);
                this.glitchPipeline = this.cameras.main.getPostPipeline(GlitchPipeline) as GlitchPipeline;
                this.glitchPipeline.intensity = this.glitchIntensity; // 預設一點雜訊
            } catch (e) {
                console.warn("⚠️ Shader Pipeline failed to load:", e);
            }
        }

        // 9. Input & Events
        EventBus.on('JOYSTICK_MOVE', (vec: { x: number, y: number }) => this.inputSystem.setVirtualAxis(vec.x, vec.y));
        EventBus.on('JOYSTICK_AIM', (data: { x: number, y: number, isFiring: boolean }) => this.inputSystem.setVirtualAim(data.x, data.y, data.isFiring));
        EventBus.on('JOYSTICK_SKILL', (skill: string) => this.inputSystem.triggerSkill(skill));

        // Game Flow Events
        EventBus.on('START_MATCH', this.handleStartMatch, this);
        EventBus.on('ENEMY_KILLED', (enemy: any) => this.handleEnemyKill(enemy));
        EventBus.on('GAME_OVER_SYNC', this.gameOver, this);

        // Physics Colliders
        this.physics.add.collider(this.projectileGroup, this.terrainManager.wallGroup, (proj: any) => proj.destroy());

        // Emit Ready
        EventBus.emit('SCENE_READY');
    }

    handleResize(gameSize: Phaser.Structs.Size) {
        // [FIX] Web 適配核心邏輯
        this.cameras.main.setViewport(0, 0, gameSize.width, gameSize.height);
        this.updateCameraZoom();

        if (this.myUnit) {
            this.cameras.main.startFollow(this.myUnit, true, 0.1, 0.1);
            this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
        }
    }

    updateCameraZoom() {
        const width = this.scale.width;
        let zoom = 1.0;
        if (width < 600) zoom = 0.8; // Mobile
        else zoom = 1.0; // Desktop
        this.cameras.main.zoomTo(zoom, 500, 'Power2');
    }

    handleStartMatch(data: any) {
        console.log("🚀 [MainScene] Starting Match...");

        // 1. Set State
        const mode = (typeof data === 'string') ? data : data.mode;
        if (typeof data === 'object' && data.hero) this.myClass = data.hero;
        this.currentMode = 'SINGLE';
        this.isGameActive = true;

        // 2. Setup Players
        this.setupPlayers();

        // 3. Start Wave
        this.startNewWave(1);

        // 4. [FIX] Camera Lock & Lighting Sync
        if (this.myUnit) {
            console.log(`🎥 [MainScene] Camera locking to ${this.myUnit.x}, ${this.myUnit.y}`);

            // 強制鏡頭跳轉
            this.cameras.main.centerOn(this.myUnit.x, this.myUnit.y);
            this.cameras.main.startFollow(this.myUnit, true, 0.1, 0.1);

            // 同步燈光
            if (this.playerLight) {
                this.playerLight.setPosition(this.myUnit.x, this.myUnit.y);
            }
        } else {
            console.error("❌ [MainScene] CRITICAL: Player not created!");
        }
    }

    setupPlayers() {
        if (this.commander) this.commander.destroy();
        if (this.drone) this.drone.destroy();

        const cx = this.worldWidth / 2;
        const cy = this.worldHeight / 2;

        // [Check] 確保 PlayerFactory 正常運作，且 Texture 已生成
        this.commander = PlayerFactory.create(this, cx, cy, this.myClass as any, 'COMMANDER', true);
        this.drone = PlayerFactory.create(this, cx + 50, cy, 'WEAVER', 'DRONE', false);

        this.myUnit = this.commander;
        this.otherUnit = this.drone;

        this.commander.setDepth(100);
        this.drone.setDepth(100);

        // [STYLE] 讓主角受光照影響 (如果你的貼圖支援 normal map 效果會更好)
        // this.commander.setPipeline('Light2D'); 

        this.networkSyncSystem.setTargets(this.commander!, this.drone, this.waveManager);
    }

    update(time: number, delta: number) {
        if (!this.myUnit) return;

        // [STYLE] Lighting Follow
        if (this.playerLight) {
            this.playerLight.setPosition(this.myUnit.x, this.myUnit.y);
            // 呼吸燈效果
            this.playerLight.intensity = 1.5 + Math.sin(time / 200) * 0.1;
        }

        // Glitch Decay
        if (this.glitchDuration > 0) {
            this.glitchDuration -= delta;
        } else {
            // 回復到預設微量雜訊 (VHS style)
            if (this.glitchIntensity > 0.02) this.glitchIntensity *= 0.9;
        }
        if (this.glitchPipeline) {
            this.glitchPipeline.intensity = this.glitchIntensity;
        }

        // Standard Updates
        this.commander?.update();
        this.drone?.update();

        // Fixed Step Logic
        this.accumulator += delta;
        while (this.accumulator >= this.fixedTimeStep) {
            this.fixedUpdate(time, this.fixedTimeStep);
            this.accumulator -= this.fixedTimeStep;
        }
    }

    fixedUpdate(time: number, delta: number) {
        if (!this.isGameActive || this.isPaused) return;

        this.survivalTime += delta / 1000;
        this.processLocalInput(time);

        // AI & Logic
        this.updateDroneAI();
        this.waveManager.update(time, delta);

        this.enemyGroup?.getChildren().forEach((child) => {
            if (child.active) (child as Enemy).update(time, delta, this.commander!);
        });

        this.runCombatLogic();
        this.extractionManager.update(time, delta);
        this.handleExtraction();
    }

    processLocalInput(time: number) {
        if (this.commander) {
            this.inputSystem.processInput(this.input, this.cameras, this.commander, this.statsModifiers);
            if (this.enemyGroup) this.commander.autoFire(time, this.enemyGroup);
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

    runCombatLogic() {
        const players = [this.commander!, this.drone!].filter(p => !!p);
        this.combatManager.checkCollisions(
            this.enemyGroup!,
            players,
            (amt) => this.takeDamage(amt)
        );
    }

    takeDamage(amt: number) {
        this.cameras.main.shake(200, 0.01);
        this.triggerGlitch(0.5, 200);
        EventBus.emit('PLAY_SFX', 'HIT');
        this.hp -= amt;
        if (this.hp <= 0) {
            this.hp = 0;
            this.gameOver();
        }
        this.emitStatsUpdate();
    }

    startNewWave(wave: number) {
        if (!this.commander) return;
        this.waveManager.startWave(wave);
    }

    handleEnemyKill(enemy: any) {
        const score = enemy.value || 10;
        this.awardScore(score);
        this.lootService.trySpawnLoot(enemy.x, enemy.y);
    }

    awardScore(base: number) {
        this.score += this.doubleScoreActive ? base * 2 : base;
    }

    gameOver() {
        EventBus.emit('GAME_OVER', { score: this.score, wave: this.waveManager.wave, level: this.level });
        this.isPaused = true;
        this.isGameActive = false;
        this.physics.pause();
    }

    triggerGlitch(intensity: number, duration: number) {
        this.glitchIntensity = intensity;
        this.glitchDuration = duration;
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
            survivalTime: this.survivalTime,
            cooldowns: this.myUnit ? this.myUnit.cooldowns : {},
            maxCooldowns: this.myUnit ? this.myUnit.maxCooldowns : {},
        });
    }

    handleExtraction() {
        if (!this.myUnit) return;
        if (this.extractionManager.checkExtraction(this.myUnit)) {
            // Extraction Success Logic
            this.physics.pause();
            this.isGameActive = false;
            EventBus.emit('EXTRACTION_SUCCESS', this.myUnit.lootBag);
            inventoryService.processLootBag(this.myUnit.lootBag.map(i => i.id));
        }
    }

    applyUpgrade(type: UpgradeType) { this.isPaused = false; }
    onResume() { this.isPaused = false; this.physics.resume(); }
    cleanup() {
        this.scale.off('resize', this.handleResize, this);
        EventBus.off('START_MATCH', this.handleStartMatch, this);
    }
    updateBackground(time: number) { }
    updateLighting() { } // 已由 Light System 接管
}
