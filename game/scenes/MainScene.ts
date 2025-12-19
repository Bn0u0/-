import Phaser from 'phaser';
import { Player } from '../classes/Player';
import { Enemy } from '../classes/Enemy';
import confetti from 'canvas-confetti';
import { COLORS, PHYSICS } from '../../constants';
import { EventBus } from '../../services/EventBus';
// import { UpgradeType } from '../../types'; // [VOID]
import { network } from '../../services/NetworkService';
import { PowerupService, PowerupType } from '../../services/PowerupService';
import { LootService } from '../../services/LootService';
import { inventoryService } from '../../services/InventoryService';
import { persistence } from '../../services/PersistenceService';
// import { cardSystem } from '../systems/CardSystem'; // [VOID]
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
import { World } from '../ecs/ECS';
import { PhysicsSystem } from '../ecs/systems/PhysicsSystem';
import { RenderSystem } from '../ecs/systems/RenderSystem';
import { Position, Velocity, Renderable } from '../ecs/Components';

type GameMode = 'SINGLE' | 'MULTI';

// [STYLE] Amber-Glitch Visual Constitution (代碼：Neon-Candy Wasteland)
const AMBER_STYLE = {
    bg: 0x2D1B2E,          // 深紫色背景
    ambient: 0x665566,     // 暖灰色環境光
    playerLight: 0xFFD1A9, // 鎢絲燈暖黃 (3500K)
    shadow: 0x1B1020,      // 陰影色
    glitchBase: 0.02,      // VHS 雜訊質感
    glitchPeak: 0.5        // 撞擊/暴擊強度
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
    private matchTimer: number = 180; // 3 Minutes Countdown
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
    public ecsWorld!: World;

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

        // [PHASE II] ECS Initialization 🧠
        this.ecsWorld = new World();
        this.ecsWorld.addSystem(new PhysicsSystem(this.ecsWorld));
        this.ecsWorld.addSystem(new RenderSystem(this.ecsWorld));

        // TEST: Create a Ghost Entity (Now Visible!)
        const ghost = this.ecsWorld.createEntity();
        this.ecsWorld.addComponent(ghost, Position, 2000, 2000); // Start at center
        this.ecsWorld.addComponent(ghost, Velocity, 100, 100);   // Move diagonally

        // Give it a body! (Simple White Circle)
        const ghostGfx = this.add.circle(0, 0, 15, 0xFFFFFF);
        this.ecsWorld.addComponent(ghost, Renderable, ghostGfx);

        console.log(`🧠 [ECS] Ghost Entity Created: ID ${ghost}`);

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

        // [PROTOCOL] React UI Resume Game
        EventBus.on('RESUME_GAME', () => {
            console.log("▶️ [MainScene] Game Resumed from UI.");
            this.isPaused = false;
            this.physics.resume();
        });
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
        console.log("🚀 [MainScene] Starting Match... (V0.3.1 Debug)");

        // 1. Set State
        const mode = (typeof data === 'string') ? data : data.mode;
        if (typeof data === 'object' && data.hero) this.myClass = data.hero;
        this.currentMode = 'SINGLE';
        this.isGameActive = true;
        console.log("✅ [MainScene] isGameActive set to TRUE");

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
        // [REMOVED] Legacy Drone (User Request)
        // this.drone = PlayerFactory.create(this, cx + 50, cy, 'WEAVER', 'DRONE', false);

        this.myUnit = this.commander;
        this.otherUnit = null; // No drone

        this.commander.setDepth(100);

        // [STYLE] 讓主角受光照影響
        // this.commander.setPipeline('Light2D'); 

        this.networkSyncSystem.setTargets(this.commander!, null, this.waveManager);

        // [PROTOCOL] Operation Gacha Link: Poverty RNG
        // this.weaponSystem.ensurePlayerWeapon(this.commander); // [DEPRECATED]

        if (!this.commander.equippedWeapon) {
            // A. Determine T0 ID based on Class
            const t0Map: Record<string, string> = {
                'SCAVENGER': 'weapon_crowbar_t0',
                'RANGER': 'weapon_pistol_t0',
                'WEAVER': 'weapon_drone_t0'
            };
            // Default to crowbar if classId map fails (Safety)
            const defId = t0Map[this.myClass] || 'weapon_crowbar_t0';

            // B. Call LootService for RNG stats (The Soul!)
            const emergencyWeapon = LootService.generateLoot(0, defId);

            if (emergencyWeapon) {
                this.commander.equipWeapon(emergencyWeapon);
                console.log(`🎁 [MainScene] Poverty Gacha Result: ${emergencyWeapon.displayName} (${emergencyWeapon.rarity})`);

                // [PROTOCOL] Operation First Contact: Visual Feedback
                // 暫停遊戲，等待玩家確認
                this.isPaused = true;
                this.physics.pause();

                EventBus.emit('SHOW_ACQUISITION_MODAL', {
                    title: 'EMERGENCY RATION // 緊急配給',
                    subtitle: 'NO WEAPON DETECTED',
                    item: emergencyWeapon,
                    flavorText: '「在廢土上，有東西拿就不錯了，別挑。」'
                });
            } else {
                console.error("❌ [MainScene] Failed to generate T0 weapon!");
            }
        }
    }

    update(time: number, delta: number) {
        if (!this.myUnit) {
            if (time % 1000 < 20) console.log("⚠️ [MainScene] Update: No MyUnit");
            return;
        }

        // [STYLE] Lighting Follow & Flicker (模擬老舊燈泡)
        if (this.playerLight) {
            this.playerLight.setPosition(this.myUnit.x, this.myUnit.y);
            this.playerLight.intensity = 1.2 + Math.sin(time / 200) * 0.1;
        }

        // [STYLE] Glitch Decay (VHS Style)
        if (this.glitchDuration > 0) {
            this.glitchDuration -= delta;
        } else {
            if (this.glitchIntensity > AMBER_STYLE.glitchBase) {
                this.glitchIntensity *= 0.85; // Faster fade to base
            } else {
                this.glitchIntensity = AMBER_STYLE.glitchBase;
            }
        }
        if (this.glitchPipeline) {
            this.glitchPipeline.intensity = this.glitchIntensity;
        }

        // [JUICE] Low HP Vignette Pulse
        if (this.hp < this.maxHp * 0.3) {
            const alpha = 0.3 + Math.sin(time / 200) * 0.2;
            this.cameras.main.flash(50, 255, 0, 0, false, undefined); // Too aggressive?
            // Better: Draw a red rectangle overlay via UI or just tint camera?
            // Camera tint affects everything.
            // Let's rely on GameOverlay React UI for red borders, or send event.
            // Actually MainScene can't easily draw "Screen Space" overlay without scrollfactor 0.
            // Let's emit stats and let React handle the "Red Border".
            // React already handles HP bar.

            // Just shake more often?
            if (Math.random() < 0.05) this.cameras.main.shake(100, 0.005);
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

        if (this.isGameActive && !this.isPaused) {
            this.survivalTime += delta / 1000;
        }

        // [OPERATION DUAL-TRACK]
        // Timer Logic Purged.
        // Game now runs indefinitely until Extraction or Death.

        this.processLocalInput(time);

        // AI & Logic
        // this.updateDroneAI(); // REMOVED Legacy
        this.waveManager.update(time, delta);

        // [PHASE II] ECS Logic 🧠
        this.ecsWorld.update(delta);
        // Debug: Log Ghost Position occasionally
        if (time % 2000 < 20) {
            // Query Test
            const ghosts = this.ecsWorld.query([Position, Velocity]);
            if (ghosts.length > 0) {
                const pos = this.ecsWorld.getComponent<Position>(ghosts[0], Position);
                console.log(`👻 [ECS] Ghost Pos: ${Math.round(pos?.x || 0)}, ${Math.round(pos?.y || 0)}`);
            }
        }

        this.enemyGroup?.getChildren().forEach((child) => {
            if (child.active) (child as Enemy).update(time, delta, this.commander!);
        });

        this.runCombatLogic();
        this.extractionManager.update(time, delta);
        this.handleExtraction();

        // V0.3.1 Debug: Force UI Update every 10 frames (approx 160ms) to ensure timer moves
        if (time % 10 < 1) {
            this.emitStatsUpdate();
        }
    }

    processLocalInput(time: number) {
        if (this.commander) {
            this.inputSystem.processInput(this.input, this.cameras, this.commander, this.statsModifiers);

            // [JUICE] Camera Lookahead (Input-driven)
            const pad = this.inputSystem.getVirtualAxis();
            // If dragging joystick, peak ahead
            if (Math.abs(pad.x) > 0.1 || Math.abs(pad.y) > 0.1) {
                const lookX = this.commander.x + pad.x * 200; // Look 200px ahead
                const lookY = this.commander.y + pad.y * 200;

                // Soft lerp camera follow offset? 
                // Phaser's startFollow doesn't easily support offset lerp without manual update.
                // Let's manually lerp scroll logic or use setLerp.

                // HACK: Tweaking follow offset is tricky. 
                // Simpler: Just rely on mouse pointer logic for PC, but this is joystick.
                // Let's use camera.followOffset

                this.cameras.main.followOffset.x = Phaser.Math.Linear(this.cameras.main.followOffset.x, -pad.x * 100, 0.05);
                this.cameras.main.followOffset.y = Phaser.Math.Linear(this.cameras.main.followOffset.y, -pad.y * 100, 0.05); // Negative to look ahead
            } else {
                // Return to center
                this.cameras.main.followOffset.x = Phaser.Math.Linear(this.cameras.main.followOffset.x, 0, 0.05);
                this.cameras.main.followOffset.y = Phaser.Math.Linear(this.cameras.main.followOffset.y, 0, 0.05);
            }

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
        // Only verify commander collision (Drone removed)
        const players = [this.commander!].filter(p => !!p);
        this.combatManager.checkCollisions(
            this.enemyGroup!,
            players,
            (amt) => this.takeDamage(amt)
        );
    }

    takeDamage(amt: number) {
        this.cameras.main.shake(200, 0.01);
        this.triggerGlitch(AMBER_STYLE.glitchPeak, 150);
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
            matchTimer: Math.ceil(this.matchTimer),
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
            inventoryService.processLootBag(this.myUnit.lootBag.map(i => i.uid));
        }
    }

    public hitStop(duration: number = 50) {
        this.physics.pause();
        this.isPaused = true;
        this.time.delayedCall(duration, () => {
            this.physics.resume();
            this.isPaused = false;
        });
    }

    // [JUICE] Wave 10: Level Up Shockwave
    levelUp() {
        this.level++;
        this.xp = 0;
        this.xpToNextLevel = Math.floor(this.xpToNextLevel * 1.5);

        EventBus.emit('PLAY_SFX', 'LEVEL_UP');
        // Wait, SFX not bounded yet? Add to sound manager locally later. Using COLLECT for now.

        // Visual: Shockwave Ring
        const ring = this.add.circle(this.myUnit!.x, this.myUnit!.y, 10, 0x00FFFF);
        ring.setStrokeStyle(4, 0x00FFFF);
        ring.setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({
            targets: ring,
            radius: 500,
            alpha: 0,
            duration: 800,
            onComplete: () => ring.destroy()
        });

        // Logic: Knockback Enemies
        const range = 500;
        this.enemyGroup?.getChildren().forEach((child) => {
            const e = child as Enemy;
            const dist = Phaser.Math.Distance.Between(this.myUnit!.x, this.myUnit!.y, e.x, e.y);
            if (dist < range && e.body) {
                const angle = Phaser.Math.Angle.Between(this.myUnit!.x, this.myUnit!.y, e.x, e.y);
                const force = 400; // Strong Push
                e.body.velocity.x += Math.cos(angle) * force;
                e.body.velocity.y += Math.sin(angle) * force;
                // Stun?
                e.takeDamage(5); // Minor damage
            }
        });

        // [VOID PROTOCOL] Upgrade System Purged. No pausing.
        EventBus.emit('SHOW_FLOATING_TEXT', {
            x: this.myUnit!.x,
            y: this.myUnit!.y - 50,
            text: "LEVEL UP!",
            color: '#FFFF00'
        });

        // Future: Evolution Check
    }
    onResume() { this.isPaused = false; this.physics.resume(); }
    cleanup() {
        this.scale.off('resize', this.handleResize, this);
        EventBus.off('START_MATCH', this.handleStartMatch, this);
    }
    updateBackground(time: number) { }
    updateLighting() { } // 已由 Light System 接管
}
