
import React, { useEffect, useState } from 'react';
import { EventBus } from '../services/EventBus';
import { SkillsHUD } from './SkillsHUD';
import { GameStats } from '../types';

export const GameOverlay: React.FC = () => {
    const [stats, setStats] = useState<GameStats>({
        hp: 100, maxHp: 100, level: 1, xp: 0, xpToNextLevel: 10, score: 0, wave: 1, enemiesAlive: 0
    });

    const [waveAlert, setWaveAlert] = useState<{ show: boolean, text: string, subtext: string } | null>(null);

    useEffect(() => {
        const handleUpdate = (newStats: GameStats) => setStats(newStats);

        const handleWaveStart = (data: { wave: number, isElite: boolean }) => {
            const text = data.isElite ? 'ELITE SIGNAL' : `WAVE ${data.wave.toString().padStart(2, '0')}`;
            const subtext = data.isElite ? 'EXTREME DANGER DETECTED' : 'HOSTILES INBOUND';
            setWaveAlert({ show: true, text, subtext });
            setTimeout(() => setWaveAlert(null), 3000);
        };

        const handleWaveComplete = () => {
            setWaveAlert({ show: true, text: 'AREA CLEAR', subtext: 'SYSTEM COOLING DOWN' });
            setTimeout(() => setWaveAlert(null), 2500);
        };

        EventBus.on('STATS_UPDATE', handleUpdate);
        EventBus.on('WAVE_START', handleWaveStart);
        EventBus.on('WAVE_COMPLETE', handleWaveComplete);

        return () => {
            EventBus.off('STATS_UPDATE', handleUpdate);
            EventBus.off('WAVE_START', handleWaveStart);
            EventBus.off('WAVE_COMPLETE', handleWaveComplete);
        };
    }, []);

    const hpPercent = Math.max(0, (stats.hp / stats.maxHp) * 100);
    const xpPercent = (stats.xp / stats.xpToNextLevel) * 100;
    const isLowHp = hpPercent < 30;

    return (
        <div className="absolute inset-0 pointer-events-none z-40 p-6 font-['Rajdhani'] flex flex-col justify-between">

            {/* Top Bar Container */}
            <div className="flex justify-between items-start">

                {/* Left: Level & XP */}
                <div className="flex flex-col w-48">
                    <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-cyan-400 font-bold text-sm tracking-widest">SYNC LVL</span>
                        <span className="text-3xl font-['Share_Tech_Mono'] text-white leading-none">{stats.level}</span>
                    </div>
                    {/* XP Bar using SVG for slanted look */}
                    <div className="w-full h-2 relative">
                        <svg className="w-full h-full overflow-visible">
                            <rect x="0" y="0" width="100%" height="6" fill="#1a202c" transform="skewX(-20)" />
                            <rect x="0" y="0" width={`${xpPercent}%`} height="6" fill="#00F0FF" transform="skewX(-20)" className="transition-all duration-300 drop-shadow-[0_0_4px_rgba(0,240,255,0.8)]" />
                        </svg>
                    </div>
                    <div className="text-right text-[10px] text-cyan-500/60 font-mono mt-1">{stats.xp} / {stats.xpToNextLevel}</div>
                </div>

                {/* Center: Wave Counter */}
                <div className="absolute left-1/2 -translate-x-1/2 top-4">
                    <div className="relative border-x border-white/10 px-6 py-2 bg-black/40 backdrop-blur-sm">
                        <div className="absolute top-0 left-0 w-2 h-0.5 bg-white/50"></div>
                        <div className="absolute top-0 right-0 w-2 h-0.5 bg-white/50"></div>

                        <div className="text-center">
                            <div className="text-[10px] text-gray-400 tracking-[0.4em] uppercase mb-1">Wave Cycle</div>
                            <div className="text-4xl font-['Share_Tech_Mono'] text-white tracking-widest drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
                                {stats.wave.toString().padStart(2, '0')}
                            </div>
                        </div>

                        {/* Enemy Counter */}
                        <div className="mt-1 flex items-center justify-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${stats.enemiesAlive > 0 ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
                            <span className="text-xs text-red-400 font-mono tracking-wider">{stats.enemiesAlive} HOSTILES</span>
                        </div>
                    </div>
                </div>

                {/* Right: HP & Score */}
                <div className="flex flex-col items-end w-56">
                    <div className="flex items-baseline gap-2 mb-1">
                        <span className={`text-[10px] tracking-[0.2em] font-bold ${isLowHp ? 'text-red-500 animate-pulse' : 'text-white/60'}`}>INTEGRITY</span>
                        <span className={`text-3xl font-['Share_Tech_Mono'] leading-none ${isLowHp ? 'text-red-500' : 'text-white'}`}>
                            {Math.ceil(hpPercent)}%
                        </span>
                    </div>
                    {/* HP Bar SVG */}
                    <div className="w-full h-3 relative">
                        <svg className="w-full h-full overflow-visible">
                            <defs>
                                <linearGradient id="hpGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor={isLowHp ? "#991b1b" : "#ffffff"} />
                                    <stop offset="100%" stopColor={isLowHp ? "#ef4444" : "#22d3ee"} />
                                </linearGradient>
                            </defs>
                            {/* Background Track */}
                            <path d="M0 0 L100% 0 Lcalc(100% - 8px) 100% L-8px 100% Z" fill="#1a202c" stroke="#334155" strokeWidth="1" className="w-full h-full block" />

                            {/* Foreground Fill */}
                            <rect x="0" y="0" width={`${hpPercent}%`} height="100%" fill="url(#hpGradient)" transform="skewX(-20)" className="transition-all duration-300" />
                        </svg>
                    </div>
                    <div className="mt-3 text-right">
                        <div className="text-[10px] text-yellow-500/60 uppercase tracking-widest">Score</div>
                        <div className="text-xl font-['Share_Tech_Mono'] text-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.4)]">
                            {stats.score.toLocaleString()}
                        </div>
                    </div>
                </div>
            </div>

            {/* Alert Overlay */}
            <div className="absolute top-1/4 left-0 w-full flex justify-center pointer-events-none">
                {waveAlert && (
                    <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
                        <div className="border-y border-cyan-500/50 bg-black/80 backdrop-blur-md px-12 py-4">
                            <h2 className="text-5xl font-black italic text-transparent bg-clip-text bg-gradient-to-t from-cyan-500 to-white tracking-widest drop-shadow-[0_0_15px_rgba(0,240,255,0.6)] uppercase">
                                {waveAlert.text}
                            </h2>
                        </div>
                        <p className="text-black bg-cyan-400 px-4 py-1 text-xs font-bold tracking-[0.5em] mt-2 uppercase shadow-[0_0_10px_rgba(34,211,238,0.8)]">
                            {waveAlert.subtext}
                        </p>
                    </div>
                )}
            </div>

            {/* Footer / Controls Hint */}
            <div className="w-full flex justify-between items-end opacity-40">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 border border-white/20 rounded-full flex items-center justify-center relative">
                        <div className="w-2 h-2 bg-white/50 rounded-full"></div>
                        <div className="absolute w-full h-full border-t border-l border-cyan-400/50 rounded-full animate-spin-slow"></div>
                    </div>
                    <div className="flex flex-col text-[10px] tracking-widest uppercase">
                        <span className="text-cyan-400">Movement System</span>
                        <span>Touch & Drag</span>
                    </div>
                </div>

                <div className="text-[10px] tracking-[0.2em] font-mono">
                    SYS_OP: ONLINE
                </div>
            </div>
        </div>
    );
};
