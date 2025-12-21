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
import { GameOverScreen } from './components/screens/GameOverScreen'; // [NEW] Component structure


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

        // [SYNC FIX] 強制將 InventoryService 的新數據寫入 Persistence
        // 這樣下次 persistence.getProfile() 就能拿到正確的 V5 結構
        const currentInv = inventoryService.getState();
        if (currentInv.loadout.head === null) {
            persistence.save(currentInv as any);
        }

        const unsubscribe = metaGame.subscribe((newState: MetaGameState) => {
            setMetaState({ ...newState });

            // [FIX] Sync AppState with MetaGame Navigation
            console.log(`[App] State Transition: ${newState.currentScreen}`);
            if (newState.currentScreen === 'GAME_LOOP') {
                setAppState('COMBAT');

                // [CRITICAL FIX] 戰鬥啟動握手協議 (Handshake Protocol)
                // 當 UI 切換到 COMBAT 時，明確通知 Phaser 引擎開始運作
                setTimeout(() => {
                    console.log("⚡ [App] Igniting Game Engine...");
                    EventBus.emit('START_MATCH', {
                        mode: 'SINGLE',
                        hero: newState.selectedHeroId || 'Vanguard'
                    });

                    // [FIX] 雙重信號發射，確保 MainScene 收到 (Brain Strategy)
                    // 第二次：延遲 300ms (給予 Canvas 渲染緩衝)
                    setTimeout(() => {
                        console.log("⚡ [App] Re-transmitting Start Signal...");
                        EventBus.emit('START_MATCH', {
                            mode: 'SINGLE',
                            hero: newState.selectedHeroId || 'Vanguard',
                        });
                    }, 300);
                }, 100);

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

            // [OPERATION ESCALATION] Step 1: Death Penalty
            const lostItems = inventoryService.punishDeath('SCAVENGER');
            console.log("💀 [App] Player Died. Lost Items:", lostItems);

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
        console.log("🚀 [App] COMMAND: START_MATCH_REQUEST");

        // [FTUE LOGIC MOVED HERE]
        const step = inventoryService.getTutorialStep();

        // 1. Reset Meta State
        metaGame.startMatch();

        // 2. Switch UI State
        setAppState('COMBAT');

        // 3. Decide Flow
        setTimeout(() => {
            if (step === 'VOID') {
                console.log("🚀 [App] FTUE: VOID -> SHOW_CLASS_SELECTION");
                EventBus.emit('SHOW_CLASS_SELECTION');
            } else if (step === 'TRIAL') {
                console.log("🚀 [App] FTUE: TRIAL -> RESUME");
                const trialClass = inventoryService.getTrialClass();
                EventBus.emit('START_MATCH', { mode: 'SINGLE', hero: trialClass || role });
                window.dispatchEvent(new Event('resize'));
            } else {
                console.log("🚀 [App] FTUE: NORMAL -> START");
                EventBus.emit('START_MATCH', { mode: 'SINGLE', hero: role });
                window.dispatchEvent(new Event('resize'));
            }
        }, 100);
    };

    const handleClassSelected = (classId: string) => {
        console.log("🚀 [App] CLASS_SELECTED:", classId);
        // Note: GameOverlay calls inventoryService.setTrialClass(classId) already
        // We just need to start the match now
        setTimeout(() => {
            EventBus.emit('START_MATCH', { mode: 'SINGLE', hero: classId });
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

    // [REVISED HOTFIX] Use inventoryService as the Source of Truth
    const invState = inventoryService.getState();

    // 檢查 InventoryService 的數據 (它已經有自動修復機制了)，而不是 persistence
    if (!invState || !invState.loadout || invState.loadout.head === undefined) {
        return (
            <div className="flex h-screen items-center justify-center bg-black text-red-500 font-mono flex-col p-8 text-center">
                <h1 className="text-4xl mb-4 font-black">SYSTEM CORRUPTED</h1>
                <p className="text-gray-400 mb-8 max-w-md">
                    Critical Schema Mismatch detected.
                </p>
                <button
                    onClick={() => {
                        // 強制清除所有舊數據
                        localStorage.clear();
                        window.location.reload();
                    }}
                    className="px-8 py-4 border-2 border-red-500 hover:bg-red-900 transition-colors uppercase tracking-widest font-bold"
                >
                    HARD RESET (清除存檔)
                </button>
            </div>
        );
    }

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


                {appState === 'COMBAT' && (
                    <>
                        <GameOverlay />
                        <div className="absolute inset-0 z-50 pointer-events-none">
                            {/* Joystick Layer - Child has pointer-events-auto */}
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

            {/* State: GAME_OVER */}
            {appState === 'GAME_OVER' && (
                <GameOverScreen />
            )}
        </div>
    );
};

export default App;
