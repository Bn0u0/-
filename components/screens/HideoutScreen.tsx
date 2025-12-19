import React, { useState, useEffect } from 'react';
import { metaGame } from '../../services/MetaGameService';
import { inventoryService } from '../../services/InventoryService';
import { languageService } from '../../services/LanguageService';
import { CLASSES, PlayerFactory } from '../../game/factories/PlayerFactory';
import { PlayerClassID, TutorialStep } from '../../types';

export const HideoutScreen: React.FC = () => {
    // 1. Character Selection State
    const classKeys = Object.keys(CLASSES) as PlayerClassID[];
    const [selectedClass, setSelectedClass] = useState<PlayerClassID>('SCAVENGER');

    // 2. State Headers
    const [hasWeapon, setHasWeapon] = useState(true);
    const [isArsenalUnlocked, setIsArsenalUnlocked] = useState(false);
    // tutorialStep is used implicitly for logic, but we track it
    const [tutorialStep, setTutorialStep] = useState<TutorialStep>('VOID');

    useEffect(() => {
        const checkState = () => {
            const profile = inventoryService.getState();
            setHasWeapon(!!profile.loadout.mainWeapon);
            setIsArsenalUnlocked(profile.tutorialStep === 'COMPLETE');
            setTutorialStep(profile.tutorialStep);
        };
        // Initial check
        if (inventoryService.getState()) {
            checkState();
        }

        const unsub = inventoryService.subscribe(checkState);
        metaGame.selectHero(selectedClass as any);
        return unsub;
    }, [selectedClass]);

    // Handlers
    const rotateClass = (direction: 1 | -1) => {
        const currentIndex = classKeys.indexOf(selectedClass);
        let newIndex = (currentIndex + direction + classKeys.length) % classKeys.length;
        const newClass = classKeys[newIndex];
        setSelectedClass(newClass);
        metaGame.selectHero(newClass);
    };

    const handleDeploy = () => {
        // Always start match. MainScene manages the tutorial flow (Void -> Select -> Trial).
        metaGame.startMatch();
    };

    return (
        <div className="absolute inset-0 bg-black text-amber-500 font-mono flex flex-col items-center justify-center pointer-events-auto">

            {/* --- TOP BAR (Only visible if unlocked?) --- */}
            {isArsenalUnlocked && (
                <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start z-10">
                    <div className="flex flex-col">
                        <h1 className="text-4xl font-bold tracking-widest animate-pulse">
                            {languageService.t('HIDEOUT_HEADER')}
                        </h1>
                        <span className="text-xs opacity-50">UNIT_ID: 8842-ALPHA</span>
                    </div>
                </div>
            )}

            {/* --- MAIN CONTENT AREA --- */}
            <div className="relative w-full max-w-6xl h-full flex flex-col items-center justify-center">

                {/* --- CENTER: CHARACTER DISPLAY (Only if Unlocked) --- */}
                {isArsenalUnlocked ? (
                    <div className="flex flex-col items-center z-10 mb-8">
                        {/* CAROUSEL */}
                        <div className="flex items-center gap-8 mb-6">
                            <button
                                onClick={() => rotateClass(-1)}
                                className="text-4xl opacity-50 hover:opacity-100 hover:scale-125 transition-all"
                            >
                                &lt;
                            </button>

                            <div className="relative group w-64 h-96 border-2 border-amber-900 bg-amber-950/20 p-2 flex flex-col items-center justify-between hover:border-amber-400 transition-colors cursor-pointer">
                                {/* ASCII ART / PORTRAIT */}
                                <div className="flex-1 w-full flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity whitespace-pre font-mono text-xs leading-[10px] overflow-hidden">
                                    {/* Placeholder for Character ASCII */}
                                    {CLASSES[selectedClass as PlayerClassID].role === 'MELEE' &&
                                        `  O  
 /|\\ 
 / \ `}
                                    {CLASSES[selectedClass as PlayerClassID].role === 'RANGED' &&
                                        `  O_ 
 /| 
 / \\ `}
                                    {CLASSES[selectedClass as PlayerClassID].role === 'SUMMONER' &&
                                        `  O  
 /M\\ 
 / \\ `}
                                </div>

                                <div className="w-full border-t border-amber-900/50 pt-2 text-center">
                                    <h2 className="text-2xl font-bold text-amber-400">{selectedClass}</h2>
                                    <p className="text-xs text-amber-600">{CLASSES[selectedClass as PlayerClassID].role}</p>
                                </div>
                            </div>

                            <button
                                onClick={() => rotateClass(1)}
                                className="text-4xl opacity-50 hover:opacity-100 hover:scale-125 transition-all"
                            >
                                &gt;
                            </button>
                        </div>
                    </div>
                ) : (
                    /* --- ROOKIE MODE: THE VOID UI --- */
                    <div className="flex flex-col items-center justify-center z-10 mb-16 animate-pulse">
                        <div className="text-6xl font-black text-amber-500 tracking-[0.5em] mb-4 blur-[1px]">
                            SYNAPSE
                        </div>
                        <div className="text-sm text-amber-700 tracking-widest">
                            SYSTEM ONLINE // CONNECTING...
                        </div>
                    </div>
                )}

                {/* --- BOTTOM: DEPLOY BUTTON --- */}
                <button
                    onClick={handleDeploy}
                    className="group relative px-12 py-6 bg-amber-900/10 border-2 border-amber-500 hover:bg-amber-500 hover:text-black transition-all duration-100 overflow-hidden"
                >
                    <div className="absolute inset-0 bg-amber-500/0 group-hover:bg-amber-500/10 animate-scanline pointer-events-none" />
                    <span className="relative text-4xl font-black tracking-widest z-10">
                        {isArsenalUnlocked ? languageService.t('DEPLOY_BUTTON') : "INITIATE LINK"}
                    </span>
                    {/* DECO LINES */}
                    <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-amber-500" />
                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-amber-500" />
                </button>

                {/* --- BOTTOM RIGHT: ARSENAL (Locked for Rookies) --- */}
                {isArsenalUnlocked && (
                    <div className="absolute bottom-8 right-8">
                        <button
                            onClick={() => metaGame.navigateTo('ARSENAL')}
                            className="bg-black border border-amber-800 px-4 py-2 text-sm text-amber-700 hover:text-amber-400 hover:border-amber-400 transition-colors flex items-center gap-2"
                        >
                            <span>[ {languageService.t('HOME_BTN_ARSENAL')} ]</span>
                        </button>
                    </div>
                )}

            </div>

            {/* Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(180,83,9,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(180,83,9,0.1)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none opacity-20" />
        </div>
    );
};
