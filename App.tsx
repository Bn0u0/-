import React, { useState, useEffect } from 'react';
import './App.css';
import { PhaserGame } from './game/PhaserGame';
import { GameOverlay } from './components/GameOverlay';
import { VirtualJoystick } from './components/VirtualJoystick';
import { Hideout } from './components/Hideout';
import { BootScreen } from './components/BootScreen';
// import { MainMenu } from './components/MainMenu'; // [REPLACED]
import { HideoutScreen } from './components/screens/HideoutScreen';
import { ArsenalScreen } from './components/screens/ArsenalScreen';
import { AcquisitionModal } from './components/AcquisitionModal';
import { metaGame, MetaGameState } from './services/MetaGameService';
import { persistence, UserProfile } from './services/PersistenceService';
import { inventoryService } from './services/InventoryService'; // [NEW] Import
import { EventBus } from './services/EventBus';


// Application State Machine
type AppState = 'BOOT' | 'MAIN_MENU' | 'HIDEOUT' | 'COMBAT' | 'GAME_OVER' | 'TUTORIAL_DEBRIEF';

const App: React.FC = () => {
    const [appState, setAppState] = useState<AppState>('BOOT');
    const [profile, setProfile] = useState<UserProfile>(persistence.getProfile());

    // Subscribe to MetaGame for Game Loop updates (Score, Waves, etc)
    const [metaState, setMetaState] = useState<MetaGameState>(metaGame.getState());

    // Draft Logic
    const [showDraft, setShowDraft] = useState(false);
    // const [draftChoices, setDraftChoices] = useState<any[]>([]); // Deprecated

    useEffect(() => {
        // [SYSTEM] 1. Check for Magic Link return
        persistence.handleAuthCallback().then((restored) => {
            if (restored) {
                alert("神經連結已建立。記憶同步完成。");
                setProfile(persistence.getProfile());
            }
        });

        const unsubscribe = metaGame.subscribe((newState: MetaGameState) => {
            setMetaState({ ...newState });

            // [FIX] Sync AppState with MetaGame Navigation
            if (newState.currentScreen === 'GAME_LOOP') {
                setAppState('COMBAT');
            } else if (newState.currentScreen === 'HIDEOUT' || newState.currentScreen === 'ARSENAL') {
                setAppState('HIDEOUT'); // Arsenal is a sub-screen of Hideout in App structure
            } else if (newState.currentScreen === 'GAME_OVER') {
                setAppState('GAME_OVER');
            }
        });

        const onShowDraft = (data: { choices: any[] }) => {
            // setDraftChoices(data.choices);
            setShowDraft(true);
        };

        EventBus.on('SHOW_DRAFT', onShowDraft);

        // ZERO-BACKEND: Gifting Protocol
        const query = new URLSearchParams(window.location.search);
        const giftCode = query.get('gift');
        if (giftCode) {
            // New Protocol: Weapon Gift Only
            try {
                // Try JSON decode first (WeaponInstance)
                const weapon = JSON.parse(atob(giftCode));
                if (weapon && weapon.baseType) {
                    persistence.addInventory(weapon);
                    alert(`🎁 已接收武器傳輸: ${weapon.name} [${weapon.rarity}]!`);
                } else {
                    // Fallback to legacy full-save import
                    const result = persistence.importSaveString(giftCode);
                    alert(result.success ? `存檔導入: ${result.msg} ` : `導入失敗: ${result.msg} `);
                }
                // Clean URL
                window.history.replaceState({}, document.title, window.location.pathname);
                setProfile(persistence.getProfile());
            } catch (e) {
                alert("無法解析傳輸代碼 (Corrupted Signal)");
            }
        }

        // Listen for Game Over / Extraction to return to Hideout
        const onMissionEnd = (data: any) => {
            const currentProfile = persistence.getProfile();
            console.log("🏁 [App] Mission End Received:", data);

            // [SYNC] 將戰鬥中的成就同步到雲端
            if (data && data.score !== undefined) {
                persistence.uploadScore(data.score, data.wave || 1, 0); // survivalTime logic can be added later

                // 增加經驗值或等級 (簡單邏輯：過一關升一公分... 不對，是升一級)
                // 這裡可以根據 data.score 或 data.level 進行更複雜的存檔更新
                persistence.save({
                    credits: currentProfile.credits + Math.floor(data.score / 10),
                    level: Math.max(currentProfile.level, data.level || 1)
                });
            }

            // FTUE Logic: If rookie, go to Tutorial Debrief
            if (!currentProfile.hasPlayedOnce) {
                persistence.save({ hasPlayedOnce: true });
                setAppState('TUTORIAL_DEBRIEF');
            } else {
                setAppState('GAME_OVER');
            }
        };

        const onExtraction = (loot: any[]) => {
            setAppState('GAME_OVER');
        };

        EventBus.on('GAME_OVER', onMissionEnd);
        EventBus.on('EXTRACTION_SUCCESS', onExtraction);

        // [DEBUG] Expose for Console Testing
        (window as any).metaGame = metaGame;
        (window as any).inventoryService = inventoryService;
        (window as any).EventBus = EventBus;

        return () => {
            unsubscribe();
            // Clean up debug
            delete (window as any).metaGame;
            delete (window as any).inventoryService;
            delete (window as any).EventBus;

            EventBus.off('SHOW_DRAFT', onShowDraft);
            EventBus.off('GAME_OVER', onMissionEnd);
            EventBus.off('EXTRACTION_SUCCESS', onExtraction);
        };
    }, []);

    // Actions
    const handleBootComplete = () => {
        // Go to Main Menu instead of Hideout
        setAppState('MAIN_MENU');
    };

    // Called from MainMenu
    const handleStartGame = (role: string) => {
        console.log("🚀 [App] COMMAND: START_MATCH");

        // 1. 重置 Meta 狀態
        metaGame.startMatch();

        // 2. 切換 UI 狀態
        setAppState('COMBAT');

        // 3. [FIX] 暴力啟動指令
        // 不再監聽 SCENE_READY。假設 Phaser 已經在背景跑了。
        // 給 100ms 讓 DOM 切換完成 (隱藏 Menu -> 顯示 GameDiv)
        setTimeout(() => {
            EventBus.emit('START_MATCH', { mode: 'SINGLE', hero: role });
            // 強制送一個 resize 事件給 Phaser，確保它知道現在視窗變大了
            window.dispatchEvent(new Event('resize'));
        }, 100);
    };

    // Called from Hideout -> Deploy
    const handleDeploy = () => {
        handleStartGame(profile.loadout.weapon);
    };

    const handleReturnToBase = () => {
        // Reload profile in case it changed
        setProfile(persistence.getProfile());
        setAppState('HIDEOUT');
    };

    return (
        <div className="app-container relative w-full h-full overflow-hidden">
            {/* Background Effects */}
            <div className="scanlines" />
            <div className={`noise - overlay ${appState === 'BOOT' ? 'opacity-10' : 'opacity-5'} `} />

            {/* State: BOOT */}
            {appState === 'BOOT' && (
                <BootScreen onStart={handleBootComplete} />
            )}

            {/* State: MAIN_MENU / HIDEOUT (Unified) */}
            {(appState === 'MAIN_MENU' || appState === 'HIDEOUT') && (
                <div className="absolute inset-0 z-20 bg-amber-bg">
                    {metaState.currentScreen === 'ARSENAL' ? (
                        <ArsenalScreen />
                    ) : (
                        <HideoutScreen />
                    )}
                </div>
            )}

            {/* Draft Overlay */}

            {/* State: COMBAT (Phaser Persistent) */}
            <div
                className={`absolute inset - 0 transition - opacity duration - 1000 ${appState === 'COMBAT' ? 'opacity-100 z-10' : 'opacity-0 -z-10'} `}
                style={{ visibility: appState === 'COMBAT' ? 'visible' : 'hidden' }}
            >
                <PhaserGame />
                <GameOverlay />

                {appState === 'COMBAT' && (
                    <>
                        <GameOverlay />
                        <div className="absolute inset-0 z-50 pointer-events-none data-[joystick]:pointer-events-auto">
                            {/* Joystick Layer - needs to be high z-index but allow clicks through to GameOverlay if needed? */}
                            {/* Actually Joystick is standard HTML over canvas. */}
                            <VirtualJoystick
                                onMove={(x, y) => EventBus.emit('JOYSTICK_MOVE', { x, y })}
                                onAim={(x, y, firing) => { /* Auto-aim handling */ }}
                                onSkill={(skill) => {
                                    if (skill === 'DASH') EventBus.emit('TRIGGER_SKILL', 'dash');
                                    if (skill === 'Q') EventBus.emit('TRIGGER_SKILL', 'skill1');
                                    if (skill === 'E') EventBus.emit('TRIGGER_SKILL', 'skill2');
                                }}
                            />
                        </div>
                    </>
                )}
            </div>

            {/* State: TUTORIAL DEBRIEF (Rookie End) */}
            {appState === 'TUTORIAL_DEBRIEF' && (
                <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in p-8 text-center">
                    <h2 className="text-4xl md:text-6xl font-black text-[#00FFFF] mb-6">SIGNAL ESTABLISHED</h2>
                    <p className="text-gray-300 max-w-md mb-12 leading-relaxed tracking-wider">
                        戰鬥數據已上傳。<br />
                        指揮官權限已解鎖。<br />
                        歡迎來到 SYNAPSE 神經網絡。
                    </p>
                    <button
                        className="px-8 py-4 bg-[#00FFFF] text-black font-black tracking-widest text-xl uppercase skew-x-[-10deg] hover:bg-white hover:scale-105 transition-transform"
                        onClick={handleReturnToBase}
                    >
                        進入基地
                    </button>
                </div>
            )}

            {/* State: GAME_OVER (Veteran End / Death) */}
            {appState === 'GAME_OVER' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-hld-bg/95 backdrop-blur-md animate-in fade-in">
                    <div className="relative flex flex-col items-center w-full max-w-lg p-8 border-y-4 border-hld-magenta bg-[rgba(30,20,40,0.95)]">
                        {/* Background Glitch Effect */}
                        <div className="absolute inset-0 bg-[url('/assets/ui/noise.png')] opacity-10 pointer-events-none"></div>

                        <h2 className="text-6xl md:text-7xl font-black text-hld-magenta mb-2 tracking-tighter glitch-text" data-text="業績未達標">
                            業績未達標
                        </h2>
                        <h3 className="text-xl md:text-2xl text-gray-500 font-mono tracking-[0.5em] mb-8">
                            QUOTA FAILED
                        </h3>

                        <div className="flex flex-col gap-4 w-full">
                            <button
                                onClick={() => handleStartGame(profile.loadout.weapon)}
                                className="group relative w-full py-4 bg-[#FF0055] hover:bg-[#ff3377] transition-all clip-path-polygon"
                            >
                                <span className="text-2xl font-black text-white italic tracking-widest group-hover:scale-105 block transition-transform">
                                    再試一次 (RETRY)
                                </span>
                            </button>

                            <button
                                onClick={handleReturnToBase}
                                className="w-full py-4 border border-gray-600 hover:border-white hover:bg-white/5 transition-all text-gray-400 hover:text-white tracking-widest font-bold"
                            >
                                回到總部 (RETURN TO HQ)
                            </button>
                        </div>

                        <div className="mt-8 text-xs text-[#FF0055] font-mono opacity-60">
                            ERR_CONNECTION_TERMINATED // 0xDEADBEEF
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;
