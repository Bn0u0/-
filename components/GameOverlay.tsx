import React, { useEffect, useState } from 'react';
import { Utils } from 'phaser';
import { metaGame } from '../services/MetaGameService';
import { EventBus } from '../services/EventBus';
import { inventoryService } from '../services/InventoryService';
import { languageService } from '../services/LanguageService';
import { PlayerClassID, ItemInstance } from '../types';
import { AcquisitionModal } from './AcquisitionModal';

export const GameOverlay: React.FC = () => {
    // --- STATE ---
    const [stats, setStats] = useState({ hp: 100, maxHp: 100, level: 1, xp: 0, xpToNextLevel: 100, score: 0, survivalTime: 0, enemiesAlive: 0 });

    // Modals
    const [showClassSelection, setShowClassSelection] = useState(false);
    const [showTrialEnd, setShowTrialEnd] = useState(false);

    const [acquisitionData, setAcquisitionData] = useState<{
        item: ItemInstance;
        title?: string;
        subtitle?: string;
        flavorText?: string;
    } | null>(null);

    // --- EFFECTS ---
    useEffect(() => {
        // Stats
        const handleStats = (newStats: any) => setStats(newStats);

        // Modals
        const handleShowClassSelection = () => setShowClassSelection(true);
        const handleShowTrialEnd = () => setShowTrialEnd(true);
        const handleAcquisition = (data: any) => setAcquisitionData(data);

        EventBus.on('STATS_UPDATE', handleStats);
        EventBus.on('SHOW_CLASS_SELECTION', handleShowClassSelection);
        EventBus.on('SHOW_TRIAL_END', handleShowTrialEnd);
        EventBus.on('SHOW_ACQUISITION_MODAL', handleAcquisition);

        return () => {
            EventBus.off('STATS_UPDATE', handleStats);
            EventBus.off('SHOW_CLASS_SELECTION', handleShowClassSelection);
            EventBus.off('SHOW_TRIAL_END', handleShowTrialEnd);
            EventBus.off('SHOW_ACQUISITION_MODAL', handleAcquisition);
        };
    }, []);

    // --- HANDLERS ---
    const handleSelectClass = (classId: PlayerClassID) => {
        setShowClassSelection(false);
        inventoryService.setTrialClass(classId);
        EventBus.emit('CLASS_SELECTED', classId);
    };

    const handleConfirmTrial = () => {
        setShowTrialEnd(false);
        inventoryService.confirmTrial();
        metaGame.navigateTo('HIDEOUT');
    };

    const handleRejectTrial = () => {
        setShowTrialEnd(false);
        inventoryService.rejectTrial();
        metaGame.navigateTo('HIDEOUT');
    };

    const handleAcceptLoot = () => {
        setAcquisitionData(null);
        EventBus.emit('RESUME_GAME');
    };

    // Format Time for HUD
    const minutes = Math.floor(stats.survivalTime / 60);
    const seconds = Math.floor(stats.survivalTime % 60);
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    return (
        <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between overflow-hidden font-mono select-none">

            {/* --- HUD: TOP BAR --- */}
            <div className="flex justify-between items-start z-10">
                {/* HP BAR */}
                <div className="flex flex-col gap-1">
                    <div className="w-64 bg-black/50 border border-amber-900 h-8 relative skew-x-[-15deg]">
                        <div
                            className="absolute top-0 left-0 h-full bg-amber-600 transition-all duration-200"
                            style={{ width: `${(stats.hp / stats.maxHp) * 100}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center text-xs font-mono text-white skew-x-[15deg]">
                            HP: {Math.floor(stats.hp)} / {stats.maxHp}
                        </div>
                    </div>
                </div>

                {/* TIMER & SCORE */}
                <div className="flex flex-col items-center">
                    <div className="bg-black/50 border border-white/20 px-4 py-1 backdrop-blur-sm rounded mb-1">
                        <span className="text-2xl font-bold text-amber-400 tracking-widest">{timeString}</span>
                    </div>
                    <span className="text-[10px] text-gray-500">SURVIVED</span>
                </div>

                {/* LEVEL Info */}
                <div className="text-right">
                    <div className="text-2xl font-black text-amber-500 italic">LV. {stats.level}</div>
                    <div className="w-32 h-1 bg-gray-800 mt-1 ml-auto">
                        <div
                            className="h-full bg-amber-400"
                            style={{ width: `${(stats.xp / stats.xpToNextLevel) * 100}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* --- MODALS (Pointer Events Auto) --- */}

            {/* 1. ACQUISITION MODAL */}
            {acquisitionData && (
                <div className="absolute inset-0 z-[200] pointer-events-auto flex items-center justify-center bg-black/80">
                    <AcquisitionModal
                        item={acquisitionData.item}
                        title={acquisitionData.title}
                        subtitle={acquisitionData.subtitle}
                        flavorText={acquisitionData.flavorText}
                        onAccept={handleAcceptLoot}
                    />
                </div>
            )}

            {/* 2. CLASS SELECTION MODAL (The Choice) */}
            {showClassSelection && (
                <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center pointer-events-auto z-[300]">
                    <div className="text-6xl font-black text-amber-500 tracking-[0.5em] mb-4 blur-[1px] animate-pulse">
                        INITIATE LINK
                    </div>
                    <h2 className="text-lg text-amber-700 font-bold mb-12 tracking-widest">SELECT COMBAT PROTOCOL</h2>

                    <div className="flex gap-4 md:gap-8 flex-wrap justify-center">
                        {/* MELEE */}
                        <button onClick={() => handleSelectClass('SCAVENGER')} className="group flex flex-col items-center p-8 border-2 border-amber-900 bg-black hover:border-amber-400 hover:bg-amber-900/20 transition-all w-64">
                            <span className="text-6xl mb-6 group-hover:scale-125 transition-transform duration-300 shadow-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]">🔧</span>
                            <span className="text-3xl font-black text-amber-500 mb-2">SMASH</span>
                            <span className="text-xs text-amber-300/50 tracking-widest mb-4">MELEE / TANK</span>
                            <p className="text-xs text-amber-600 text-center leading-relaxed">
                                "I don't plan. I hit."<br />High durability. Close quarters dominance.
                            </p>
                        </button>
                        {/* RANGED */}
                        <button onClick={() => handleSelectClass('RANGER')} className="group flex flex-col items-center p-8 border-2 border-amber-900 bg-black hover:border-amber-400 hover:bg-amber-900/20 transition-all w-64">
                            <span className="text-6xl mb-6 group-hover:scale-125 transition-transform duration-300 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]">🔫</span>
                            <span className="text-3xl font-black text-amber-500 mb-2">SHOOT</span>
                            <span className="text-xs text-amber-300/50 tracking-widest mb-4">RANGED / DPS</span>
                            <p className="text-xs text-amber-600 text-center leading-relaxed">
                                "Keep them away."<br />Precision strikes. High damage output.
                            </p>
                        </button>
                        {/* SUMMONER */}
                        <button onClick={() => handleSelectClass('WEAVER')} className="group flex flex-col items-center p-8 border-2 border-amber-900 bg-black hover:border-amber-400 hover:bg-amber-900/20 transition-all w-64">
                            <span className="text-6xl mb-6 group-hover:scale-125 transition-transform duration-300 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]">💠</span>
                            <span className="text-3xl font-black text-amber-500 mb-2">COMMAND</span>
                            <span className="text-xs text-amber-300/50 tracking-widest mb-4">SUMMONER / TECH</span>
                            <p className="text-xs text-amber-600 text-center leading-relaxed">
                                "Fight for me."<br />Automated turrets. Area control.
                            </p>
                        </button>
                    </div>
                </div>
            )}

            {/* 3. TRIAL END MODAL (The Verdict) */}
            {showTrialEnd && (
                <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center pointer-events-auto z-[300]">
                    <h2 className="text-4xl text-amber-500 font-black mb-4 tracking-widest">NEURAL LINK SEVERED</h2>
                    <p className="text-amber-700 mb-12 max-w-lg text-center leading-relaxed">
                        Synchronization complete. Analyze performance data.<br />
                        <span className="text-white mt-4 block">Do you wish to permanently bond with this class?</span>
                    </p>

                    <div className="flex gap-8">
                        <button
                            onClick={handleRejectTrial}
                            className="px-8 py-4 border border-red-900 text-red-700 hover:bg-red-900/20 hover:text-red-500 hover:border-red-500 transition-all flex flex-col items-center gap-1 group"
                        >
                            <span className="text-xl font-bold group-hover:scale-105 transition-transform">[ REJECT ]</span>
                            <span className="text-[10px] opacity-70">TRY ANOTHER PROTOCOL</span>
                        </button>

                        <button
                            onClick={handleConfirmTrial}
                            className="relative px-12 py-4 bg-amber-600 text-black font-bold hover:bg-amber-400 transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_40px_rgba(245,158,11,0.6)] flex flex-col items-center gap-1 group overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none" />
                            <span className="text-2xl font-black group-hover:scale-105 transition-transform">[ BOND CONFIRMED ]</span>
                            <span className="text-[10px] font-mono opacity-80">LOCK IN CLASS PERMANENTLY</span>
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
};
