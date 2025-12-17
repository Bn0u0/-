
import React, { useEffect, useState } from 'react';
import { EventBus } from '../services/EventBus';
import { SkillsHUD } from './SkillsHUD';
import { VirtualJoystick } from './VirtualJoystick';
import { GameStats } from '../types';



export const GameOverlay: React.FC = () => {
    const [stats, setStats] = useState<GameStats>({
        hp: 100, maxHp: 100, level: 1, xp: 0, xpToNextLevel: 10, score: 0, wave: 1, enemiesAlive: 0
    });

    const [waveAlert, setWaveAlert] = useState<{ show: boolean, text: string, subtext: string } | null>(null);

    useEffect(() => {
        const handleUpdate = (newStats: GameStats) => setStats(newStats);

        const handleWaveStart = (data: { wave: number, isElite: boolean }) => {
            setWaveAlert({
                show: true,
                text: data.isElite ? 'ELITE THREAT' : `CYCLE ${data.wave.toString().padStart(2, '0')}`,
                subtext: data.isElite ? 'SEEK // DESTROY' : 'ENTITIES DETECTED'
            });
            setTimeout(() => setWaveAlert(null), 3000);
        };

        const handleWaveComplete = () => {
            setWaveAlert({ show: true, text: 'ZONE CLEARED', subtext: 'SYSTEM STABILIZED' });
            setTimeout(() => setWaveAlert(null), 2500);
        };

        EventBus.on('STATS_UPDATE', handleUpdate);
        EventBus.on('WAVE_START', handleWaveStart);
        EventBus.on('WAVE_COMPLETE', handleWaveComplete);

        // Inject font
        const link = document.createElement('link');
        link.href = 'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap';
        link.rel = 'stylesheet';
        document.head.appendChild(link);

        return () => {
            EventBus.off('STATS_UPDATE', handleUpdate);
            EventBus.off('WAVE_START', handleWaveStart);
            EventBus.off('WAVE_COMPLETE', handleWaveComplete);
        };
    }, []);

    // Health Logic: 1 Diamond = 20 HP
    const chunks = 5;
    const hpPerChunk = stats.maxHp / chunks;
    const currentChunks = Math.ceil(stats.hp / hpPerChunk);

    return (
        <div className="absolute inset-0 pointer-events-none z-40 p-4 font-['Press_Start_2P'] flex flex-col justify-between text-white selection:bg-pink-500 selection:text-black">

            {/* Top Bar: Minimalist with Diamonds */}
            <div className="flex justify-between items-start opacity-80 hover:opacity-100 transition-opacity duration-500">

                {/* Top Left: Health & Ammo */}
                <div className="flex flex-col gap-2">
                    {/* Health Diamonds (Smaller) */}
                    <div className="flex gap-1">
                        {Array.from({ length: chunks }).map((_, i) => (
                            <img
                                key={i}
                                src={i < currentChunks ? "/assets/ui/diamond_full.png" : "/assets/ui/diamond_empty.png"}
                                className={`w-4 h-4 rendering-pixelated ${i < currentChunks ? 'drop-shadow-[0_0_4px_rgba(255,0,85,0.8)]' : 'opacity-20'}`}
                                alt=""
                            />
                        ))}
                    </div>
                </div>

                {/* Top Right: Currency / Score (Minimal) */}
                <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2">
                        <span className="text-yellow-400 text-[10px] tracking-widest">{stats.score}</span>
                    </div>
                </div>
            </div>

            {/* System Uptime (Central Bragging Rights) */}
            <div className="absolute top-8 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none">
                <div className="text-[10px] text-cyan-400 opacity-60 tracking-[0.3em] mb-1">SYSTEM UPTIME</div>
                <div className="text-3xl font-bold tracking-widest text-[#eddbda] drop-shadow-[0_0_10px_rgba(84,252,252,0.4)]">
                    {(() => {
                        const sec = Math.floor(stats.survivalTime || 0);
                        const min = Math.floor(sec / 60);
                        const s = sec % 60;
                        return `${min.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                    })()}
                </div>
            </div>

            {/* Alert Overlay */}
            <div className="absolute top-1/4 left-0 w-full flex justify-center pointer-events-none">
                {waveAlert && (
                    <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300 gap-4">
                        <div className="h-px w-64 bg-cyan-500/50"></div>
                        <h2 className="text-xl text-cyan-400 tracking-widest uppercase drop-shadow-[0_0_10px_rgba(84,252,252,0.8)]">
                            {waveAlert.text}
                        </h2>
                        <div className="h-px w-64 bg-pink-500/50"></div>
                    </div>
                )}
            </div>

            {/* Bottom: Skills & Input Hint */}
            <div className="w-full flex justify-between items-end opacity-60 hover:opacity-100 transition-opacity">
                <SkillsHUD />
            </div>

            {/* Input Overlay */}
            <VirtualJoystick
                onMove={(x, y) => EventBus.emit('JOYSTICK_MOVE', { x, y })}
                onAim={(x, y, isFiring) => EventBus.emit('JOYSTICK_AIM', { x, y, isFiring })}
                onSkill={(skill) => EventBus.emit('JOYSTICK_SKILL', skill)}
            />
        </div>
    );
};
