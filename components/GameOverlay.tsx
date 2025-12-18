import React, { useEffect, useState } from 'react';
import { EventBus } from '../services/EventBus';

/**
 * GameOverlay: The main HUD during combat.
 * Displays HP, XP, Timer, Score, and active cooldowns.
 */
export const GameOverlay: React.FC = () => {
    const [stats, setStats] = useState({
        hp: 100,
        maxHp: 100,
        xp: 0,
        xpToNextLevel: 10,
        level: 1,
        score: 0,
        survivalTime: 0,
        enemiesAlive: 0,
        wave: 1
    });

    useEffect(() => {
        const handleUpdate = (data: any) => {
            setStats(data);
        };

        EventBus.on('STATS_UPDATE', handleUpdate);

        return () => {
            EventBus.off('STATS_UPDATE', handleUpdate);
        };
    }, []);

    // Format Time: MM:SS
    const minutes = Math.floor(stats.survivalTime / 60);
    const seconds = Math.floor(stats.survivalTime % 60);
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    // Bar Widths
    const hpPercent = Math.max(0, Math.min(100, (stats.hp / stats.maxHp) * 100));
    const xpPercent = Math.max(0, Math.min(100, (stats.xp / stats.xpToNextLevel) * 100));

    return (
        <div className="absolute inset-0 pointer-events-none z-[100] select-none font-mono">
            {/* Vignette Effect */}
            <div className="absolute inset-0 z-[-1]" style={{
                background: 'radial-gradient(circle at center, transparent 60%, rgba(10, 5, 20, 0.85) 100%)'
            }} />

            {/* Top Bar: Score & Timer */}
            <div className="absolute top-4 left-0 right-0 flex justify-between px-6 items-start">
                {/* Score */}
                <div className="flex flex-col">
                    <span className="text-xs text-gray-400 tracking-widest">SCORE</span>
                    <span className="text-2xl font-black text-white">{stats.score.toLocaleString()}</span>
                </div>

                {/* Timer */}
                <div className="flex flex-col items-center">
                    <div className="bg-black/50 border border-white/20 px-4 py-1 backdrop-blur-sm rounded">
                        <span className="text-2xl font-bold text-[#00FFFF] tracking-widest">{timeString}</span>
                    </div>
                    <span className="text-[10px] text-gray-500 mt-1">WAVE {stats.wave}</span>
                </div>

                {/* Enemies / Misc */}
                <div className="flex flex-col items-end">
                    <span className="text-xs text-gray-400 tracking-widest">HOSTILES</span>
                    <span className="text-2xl font-bold text-[#FF0055]">{stats.enemiesAlive}</span>
                </div>
            </div>

            {/* Bottom Bar: HP & XP */}
            <div className="absolute bottom-8 left-6 right-6 flex flex-col gap-2">
                {/* Level Badge */}
                <div className="absolute -top-10 left-0 bg-white/10 p-2 rounded backdrop-blur-md">
                    <span className="text-sm font-bold text-white">LVL {stats.level}</span>
                </div>

                {/* HP Bar */}
                <div className="w-full h-4 bg-gray-900/80 border border-gray-700 rounded overflow-hidden relative">
                    <div
                        className="h-full bg-[#FF0055] transition-all duration-200 ease-out"
                        style={{ width: `${hpPercent}%`, boxShadow: '0 0 10px #FF0055' }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white/80 tracking-wider">
                        HP {Math.ceil(stats.hp)} / {stats.maxHp}
                    </span>
                </div>

                {/* XP Bar */}
                <div className="w-full h-2 bg-gray-900/80 border border-gray-700 rounded overflow-hidden">
                    <div
                        className="h-full bg-[#00FFFF] transition-all duration-200"
                        style={{ width: `${xpPercent}%` }}
                    />
                </div>
            </div>
        </div>
    );
};
