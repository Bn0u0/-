import React, { useState, useEffect } from 'react';
import './App.css';
import { PhaserGame } from './game/PhaserGame';
import { GameOverlay } from './components/GameOverlay';
import { VirtualJoystick } from './components/VirtualJoystick';
import { BootScreen } from './components/BootScreen';
import { HideoutScreen } from './components/screens/HideoutScreen';
import { ArsenalScreen } from './components/screens/ArsenalScreen'; // Legacy?
import { ArsenalOverlay } from './components/workbench/ArsenalOverlay'; // [NEW]
import { GameOverScreen } from './components/screens/GameOverScreen';
import { HTML_LAYER } from './game/constants/Depth';
import { EventBus } from './services/EventBus';

// [ARCHITECTURE] The Brain
import { sessionService, AppState } from './services/SessionService';

const App: React.FC = () => {
    // Single Source of Truth
    const [session, setSession] = useState(sessionService.getState());

    useEffect(() => {
        // 1. Initialize System
        sessionService.init();

        // 2. Subscribe to State Changes
        const unsubscribe = sessionService.subscribe((newState) => {
            console.log("🔄 [App] State Update:", newState.appState);
            setSession({ ...newState });
        });

        // 3. Global Schema Check (Critical Fail State UI)
        // Handled inside SessionService logs usually, but UI overlay can be here if needed.

        return () => {
            unsubscribe();
            sessionService.dispose();
        };
    }, []);

    const appState = session.appState;
    const metaState = session.metaState;

    // --- Handlers (Proxy to Service) ---
    const handleBootComplete = () => sessionService.setBootComplete();
    const handleReturnToBase = () => sessionService.enterHideout();

    // Note: VirtualJoystick events are emitted directly to EventBus, 
    // managing Game Logic bypassing App.tsx (Correct Pattern for Input).

    return (
        // [V4] The Universal Mobile Frame (Desktop Center / Mobile Full)
        // [FIX] Changed bg-black to bg-transparent to allow Phaser (z-0) to show through.
        // If we want "Letterboxing" for desktop, we need a different strategy (e.g. side bars).
        // For now, let's reveal the game.
        <div className="w-full h-screen bg-transparent flex justify-center items-center overflow-hidden">

            {/* The Virtual Device */}
            {/* [FIX] Removed bg-[#0e0d16] so we can see the game behind the UI */}
            <div className="relative w-full h-full max-w-[430px] bg-transparent shadow-2xl overflow-hidden pointer-events-none">
                {/* Added pointer-events-none to container so clicks pass to game, but children need pointer-events-auto */}

                {/* Background Effects */}
                {/* Re-enabled pointer-events-auto for children in CSS or inline if needed, but App.css handles .app-container children */}
                <div className="scanlines" />
                <div className={`noise-overlay ${appState === 'BOOT' ? 'opacity-10' : 'opacity-5'} `} />

                {/* State: MAIN_MENU / HIDEOUT (Unified) */}
                {
                    (appState === 'MAIN_MENU' || appState === 'HIDEOUT') && (
                        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: HTML_LAYER.HUD }}>
                            {session.workbenchView === 'CRATE' && (
                                <ArsenalOverlay
                                    currentWeapon={session.profile.loadout.mainWeapon}
                                    inventory={session.profile.inventory}
                                />
                            )}
                        </div>
                    )
                }

                {/* State: BOOT SCREEN (React Overlay) */}
                {
                    appState === 'BOOT' && (
                        <BootScreen onStart={() => {
                            // On Click: Skip Phaser Boot Sequence force enter
                            EventBus.emit('BOOT_COMPLETE');
                        }} />
                    )
                }

                {/* State: COMBAT & BOOT & MAIN_MENU (Phaser Persistent) */}
                <div
                    className={`absolute inset-0 transition-opacity duration-1000 ${['BOOT', 'MAIN_MENU', 'HIDEOUT', 'COMBAT'].includes(appState) ? 'opacity-100' : 'opacity-0'} `}
                    style={{ visibility: ['BOOT', 'MAIN_MENU', 'HIDEOUT', 'COMBAT'].includes(appState) ? 'visible' : 'hidden', zIndex: HTML_LAYER.PHASER_DOM }}
                >
                    <PhaserGame />

                    {appState === 'COMBAT' && (
                        <>
                            <div className="absolute inset-0 pointer-events-none" style={{ zIndex: HTML_LAYER.HUD }}>
                                <GameOverlay />
                            </div>

                            <div className="absolute inset-0" style={{ zIndex: HTML_LAYER.JOYSTICK }}>
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

                {/* State: TUTORIAL DEBRIEF */}
                {
                    appState === 'TUTORIAL_DEBRIEF' && (
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
                    )
                }

                {/* State: GAME_OVER */}
                {
                    appState === 'GAME_OVER' && (
                        <GameOverScreen />
                    )
                }

            </div >
        </div >
    );
};

export default App;
