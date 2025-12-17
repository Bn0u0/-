
import React, { useEffect, useState } from 'react';
import { EventBus } from '../services/EventBus';
import { SkillsHUD } from './SkillsHUD';
import { VirtualJoystick } from './VirtualJoystick';
import { GameStats } from '../types';

export const GameOverlay: React.FC = () => {
    const [stats, setStats] = useState<GameStats>({
        hp: 100, maxHp: 100, level: 1, xp: 0, xpToNextLevel: 10, score: 0, wave: 1, enemiesAlive: 0, survivalTime: 0
    });

    const [waveAlert, setWaveAlert] = useState<{ show: boolean, text: string, subtext: string } | null>(null);

    useEffect(() => {
        const handleUpdate = (newStats: GameStats) => setStats(newStats);

        const handleWaveStart = (data: { wave: number, isElite: boolean }) => {
            setWaveAlert({
                show: true,
                text: data.isElite ? '⚠️ 高威脅異常 ⚠️' : `週期循環 ${data.wave.toString().padStart(2, '0')}`,
                subtext: data.isElite ? '極度危險 // 建議撤離' : '偵測到敵意實體'
            });
            setTimeout(() => setWaveAlert(null), 3000);
        };

        const handleWaveComplete = () => {
            setWaveAlert({ show: true, text: '區域淨化完成', subtext: '系統暫時穩定' });
            setTimeout(() => setWaveAlert(null), 2500);
        };

        EventBus.on('STATS_UPDATE', handleUpdate);
        EventBus.on('WAVE_START', handleWaveStart);
        EventBus.on('WAVE_COMPLETE', handleWaveComplete);

        // Inject font if not exists
        if (!document.getElementById('font-press-start')) {
            const link = document.createElement('link');
            link.id = 'font-press-start';
            link.href = 'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap';
            link.rel = 'stylesheet';
            document.head.appendChild(link);
        }

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
        <div className="absolute inset-0 pointer-events-none z-40 font-['Press_Start_2P'] text-white select-none overflow-hidden">

            {/* --- TOP LEFT: STATUS (HP / EXP / LVL) --- */}
            <div className="absolute top-4 left-4 flex flex-col gap-2">
                {/* Health Bar (Diamonds) */}
                <div className="flex gap-1 filter drop-shadow-[0_0_5px_rgba(255,0,85,0.8)]">
                    {Array.from({ length: chunks }).map((_, i) => (
                        <div
                            key={i}
                            className={`w-4 h-4 transform rotate-45 border-2 transition-all duration-300 ${i < currentChunks
                                    ? 'bg-[#ff0055] border-[#ff0055]'
                                    : 'bg-transparent border-[#494d5e]'
                                }`}
                        />
                    ))}
                </div>

                {/* Level & XP */}
                <div className="flex items-center gap-2 mt-1">
                    <div className="text-xs text-yellow-400">LV.{stats.level}</div>
                    <div className="w-24 h-2 bg-[#272933] border border-[#494d5e] skew-x-[-15deg]">
                        <div
                            className="h-full bg-yellow-400"
                            style={{ width: `${Math.min(100, (stats.xp / stats.xpToNextLevel) * 100)}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* --- TOP RIGHT: SYSTEM UPTIME / MAP (Placeholder) --- */}
            <div className="absolute top-4 right-4 flex flex-col items-end gap-1">
                <div className="text-[10px] text-cyan-400 tracking-widest opacity-80">系統運作時間</div>
                <div className="text-2xl text-[#eddbda] drop-shadow-[0_0_8px_rgba(84,252,252,0.8)] tabular-nums">
                    {(() => {
                        const sec = Math.floor(stats.survivalTime || 0);
                        const min = Math.floor(sec / 60);
                        const s = sec % 60;
                        return `${min.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                    })()}
                </div>
                <div className="text-[10px] text-yellow-400 tracking-widest mt-1">積分: {stats.score}</div>
            </div>

            {/* --- CENTER: ALERTS --- */}
            <div className="absolute top-[20%] left-0 w-full flex justify-center pointer-events-none">
                {waveAlert && (
                    <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300 gap-4 bg-black/60 backdrop-blur-sm p-6 border-y border-cyan-500/50 w-full">
                        <h2 className="text-xl text-cyan-400 tracking-[0.2em] uppercase drop-shadow-[0_0_10px_rgba(84,252,252,1)]">
                            {waveAlert.text}
                        </h2>
                        <div className="text-xs text-[#eddbda] tracking-widest typewriter">
                            {waveAlert.subtext}
                        </div>
                    </div>
                )}
            </div>

            {/* --- BOTTOM LEFT: JOYSTICK (Handled by component, just placeholder area) --- */}
            {/* VirtualJoystick is absolute positioned by itself, usually bottom-left */}

            {/* --- BOTTOM RIGHT: SKILLS --- */}
            <div className="absolute bottom-8 right-8 flex flex-col items-end pointer-events-auto">
                <SkillsHUD />
            </div>

            {/* Input Layer */}
            <VirtualJoystick
                onMove={(x, y) => EventBus.emit('JOYSTICK_MOVE', { x, y })}
                onAim={(x, y, isFiring) => EventBus.emit('JOYSTICK_AIM', { x, y, isFiring })}
                onSkill={(skill) => EventBus.emit('JOYSTICK_SKILL', skill)}
            />
        </div>
    );
};
