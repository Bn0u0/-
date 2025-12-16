import React, { useState, useEffect } from 'react';
import './App.css';
import { PhaserGame } from './game/PhaserGame';
import { GameOverlay } from './components/GameOverlay';
import { Hideout } from './components/Hideout';
import { metaGame, MetaGameState, GameScreen } from './services/MetaGameService';
import { EventBus } from './services/EventBus';

const App: React.FC = () => {
    // Single Source of Truth: MetaGameService
    const [state, setState] = useState<MetaGameState>(metaGame.getState());

    useEffect(() => {
        // Subscribe to state changes
        const unsubscribe = metaGame.subscribe((newState: MetaGameState) => {
            // Force re-render with new state (shallow copy to ensure React sees change if needed, though reference usually fine if we stick to immutable patterns. Here we spread just to be safe)
            setState({ ...newState });
        });

        // Global Event Listeners (Bridge between Phaser and React/MetaGame)
        const onGameOver = (data: any) => {
            metaGame.handleGameOver(data.score);
        };

        const onExtraction = (lootBag: any[]) => {
            const ids = lootBag.map(i => i.id || i.defId || 'm_scrap'); // Fallback
            metaGame.handleExtractionSuccess(ids);
        };

        EventBus.on('GAME_OVER', onGameOver);
        EventBus.on('EXTRACTION_SUCCESS', onExtraction);

        return () => {
            unsubscribe();
            EventBus.off('GAME_OVER', onGameOver);
            EventBus.off('EXTRACTION_SUCCESS', onExtraction);
        };
    }, []);

    // --- Router ---
    return (
        <>
            {/* The Game Layer - Persistent but hidden when not in loop to save resources? 
                Actually, we want to destroy Phaser when in Menu to save battery? 
                For "Pocket" feel, keeping it hot is faster, but for simple MVP let's mount/unmount.
                Re-mounting Phaser is heavy. Let's keep it but hide it via CSS.
            */}

            <div className={`ui-layer ${state.currentScreen === 'GAME_LOOP' ? 'z-0' : '-z-10'}`}
                style={{ visibility: state.currentScreen === 'GAME_LOOP' ? 'visible' : 'hidden' }}>
                <PhaserGame />
            </div>

            {/* UI Layers */}
            {state.currentScreen === 'GAME_LOOP' && <GameOverlay />}

            {state.currentScreen === 'HIDEOUT' && <Hideout />}

            {state.currentScreen === 'GAME_OVER' && (
                <div className="ui-container">
                    <div className="glass-card" style={{ textAlign: 'center' }}>
                        <h2>MISSION ENDED</h2>
                        <button className="bubble-btn" onClick={() => metaGame.navigateTo('HIDEOUT')}>
                            RETURN TO BASE
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default App;
