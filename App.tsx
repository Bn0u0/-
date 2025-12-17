import React, { useState, useEffect } from 'react';
import './App.css';
import { PhaserGame } from './game/PhaserGame';
import { GameOverlay } from './components/GameOverlay';
import { VirtualJoystick } from './components/VirtualJoystick';
import { Hideout } from './components/Hideout';
import { BootScreen } from './components/BootScreen';
import { MainMenu } from './components/MainMenu';
import { metaGame, MetaGameState } from './services/MetaGameService';
import { persistence, UserProfile } from './services/PersistenceService';
import { EventBus } from './services/EventBus';

// Application State Machine
type AppState = 'BOOT' | 'MAIN_MENU' | 'HIDEOUT' | 'COMBAT' | 'GAME_OVER' | 'TUTORIAL_DEBRIEF';

const App: React.FC = () => {
    const [appState, setAppState] = useState<AppState>('BOOT');
    const [profile, setProfile] = useState<UserProfile>(persistence.getProfile());

    // Subscribe to MetaGame for Game Loop updates (Score, Waves, etc)
    const [metaState, setMetaState] = useState<MetaGameState>(metaGame.getState());

    useEffect(() => {
        const unsubscribe = metaGame.subscribe((newState: MetaGameState) => {
            setMetaState({ ...newState });
        });

        // Listen for Game Over / Extraction to return to Hideout
        const onMissionEnd = (data: any) => {
            const currentProfile = persistence.getProfile();

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

        return () => {
            unsubscribe();
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
        // Start Game
        metaGame.startMatch(); // Reset state
        setAppState('COMBAT');
        EventBus.emit('START_MATCH', { mode: 'SINGLE', hero: role });
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
            <div className={`noise-overlay ${appState === 'BOOT' ? 'opacity-10' : 'opacity-5'}`} />

            {/* State: BOOT */}
            {appState === 'BOOT' && (
                <BootScreen onStart={handleBootComplete} />
            )}

            {/* State: MAIN_MENU (Instant Challenge) */}
            {appState === 'MAIN_MENU' && (
                <MainMenu onStartGame={handleStartGame} />
            )}

            {/* State: HIDEOUT */}
            {appState === 'HIDEOUT' && (
                <div className="absolute inset-0 z-20 bg-[var(--hld-bg)]">
                    <Hideout profile={profile} onDeploy={handleDeploy} />
                </div>
            )}

            {/* State: COMBAT (Phaser Persistent) */}
            <div
                className={`absolute inset-0 transition-opacity duration-1000 ${appState === 'COMBAT' ? 'opacity-100 z-10' : 'opacity-0 -z-10'}`}
                style={{ visibility: appState === 'COMBAT' ? 'visible' : 'hidden' }}
            >
                <PhaserGame />
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
                    <button className="hero-button" onClick={handleReturnToBase}>
                        進入基地
                    </button>
                </div>
            )}

            {/* State: GAME_OVER (Veteran End / Death) */}
            {appState === 'GAME_OVER' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in">
                    <div className="relative flex flex-col items-center w-full max-w-lg p-8 border-y-4 border-[#FF0055] bg-[rgba(20,20,30,0.95)]">
                        {/* Background Glitch Effect */}
                        <div className="absolute inset-0 bg-[url('/assets/ui/noise.png')] opacity-10 pointer-events-none"></div>

                        <h2 className="text-6xl md:text-7xl font-black text-[#FF0055] mb-2 tracking-tighter glitch-text" data-text="業績未達標">
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
