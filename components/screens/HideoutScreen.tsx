import React, { useState } from 'react';
import { TacticalLayout } from '../layout/TacticalLayout';
import { metaGame } from '../../services/MetaGameService';
import { GameScreen } from '../../services/MetaGameService';

// [PLACEHOLDER] Commander Avatar
const AvatarPlaceholder = () => (
    <div className="w-64 h-96 border-2 border-amber-dim bg-black/50 relative overflow-hidden group">
        <div className="absolute inset-0 flex items-center justify-center text-amber-dim/20 text-6xl font-black rotate-90">
            COMMANDER
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-amber-bg to-transparent opacity-50"></div>
        {/* Scanning Effect */}
        <div className="absolute top-0 left-0 w-full h-2 bg-glitch-cyan/50 shadow-[0_0_10px_#00FFFF] animate-scanline opacity-0 group-hover:opacity-100 transition-opacity"></div>
    </div>
);

export const HideoutScreen: React.FC = () => {
    const [deployConfirm, setDeployConfirm] = useState(false);
    const [insurance, setInsurance] = useState(false);

    const handleDeploy = () => {
        if (!deployConfirm) {
            setDeployConfirm(true);
            return;
        }
        // Proceed
        metaGame.startMatch();
    };

    const handleNav = (screen: GameScreen) => {
        // TODO: Handle 'ARSENAL' routing in MetaGameService if added
        console.log(`Navigating to ${screen}`);
        // For now, Arsenal might just be a simulated screen or a real one.
        // Let's assume we will add ARSENAL to GameScreen type soon.
    };

    return (
        <TacticalLayout>
            <div className="w-full h-full flex items-center justify-center gap-20">

                {/* 1. Visual Center: Commander */}
                <div className="flex flex-col items-center gap-4 animate-up">
                    <div className="text-amber-dim tracking-widest text-xs">NEURO-LINK STATUS: STABLE</div>
                    <AvatarPlaceholder />
                    <div className="text-glitch-cyan font-bold tracking-widest text-xl animate-pulse">
                        ONLINE
                    </div>
                </div>

                {/* 2. Command Menu */}
                <div className="flex flex-col gap-6 w-96">
                    <div className="text-amber-dim text-sm tracking-widest mb-4 border-b border-amber-dim/30 pb-2">
                        // ROOT_ACCESS
                    </div>

                    {/* Deploy Button / Logic */}
                    {!deployConfirm ? (
                        <button
                            onClick={handleDeploy}
                            className="group relative px-8 py-4 bg-amber-dark/80 border border-amber-neon text-left hover:bg-amber-neon/10 transition-all overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-amber-neon/20 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300"></div>
                            <div className="relative text-2xl font-bold tracking-widest group-hover:text-glitch-cyan transition-colors">
                                {'>'} INITIALIZE_DEPLOY
                            </div>
                            <div className="relative text-xs text-amber-dim mt-1 group-hover:text-amber-neon">
                                START NEW OPERATION
                            </div>
                        </button>
                    ) : (
                        <div className="flex flex-col gap-4 border border-glitch-pink/50 p-4 bg-black/40 animate-flicker">
                            <div className="text-glitch-pink font-bold tracking-widest text-lg">
                                CONFIRM NEURO-LINK?
                            </div>
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={insurance}
                                    onChange={(e) => setInsurance(e.target.checked)}
                                    className="accent-glitch-cyan w-5 h-5 bg-transparent border border-amber-dim"
                                />
                                <span className={`text-sm tracking-wider ${insurance ? 'text-glitch-cyan' : 'text-amber-dim'} group-hover:text-white transition-colors`}>
                                    BUY INSURANCE (-500C)
                                </span>
                            </label>
                            <button
                                onClick={handleDeploy}
                                className="w-full py-3 bg-glitch-pink/20 border border-glitch-pink hover:bg-glitch-pink hover:text-black font-bold tracking-widest transition-all"
                            >
                                EXECUTE
                            </button>
                            <button
                                onClick={() => setDeployConfirm(false)}
                                className="text-xs text-amber-dim hover:text-white text-center mt-1"
                            >
                                [ CANCEL ]
                            </button>
                        </div>
                    )}

                    {/* Arsenal */}
                    <button
                        onClick={() => metaGame.navigateTo('ARSENAL')}
                        className="px-8 py-3 border border-amber-dim/50 text-left hover:border-amber-neon hover:text-amber-neon text-amber-dim transition-all"
                    >
                        {'>'} ACCESS_ARSENAL
                    </button>

                    {/* Black Market */}
                    <button
                        disabled
                        className="px-8 py-3 border border-amber-dim/20 text-left text-amber-dim/30 cursor-not-allowed flex justify-between"
                    >
                        <span>{'>'} BLACK_MARKET</span>
                        <span className="text-[10px] mt-1">[LOCKED]</span>
                    </button>
                </div>
            </div>
        </TacticalLayout>
    );
};
