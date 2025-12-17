import React, { useEffect, useState } from 'react';
import { EventBus } from '../services/EventBus';

interface SkillState {
    id: string;
    icon: string;
    cooldown: number;
    maxCooldown: number;
}

export const SkillsHUD: React.FC = () => {
    // We would need to sync cooldowns from Phaser loop to React
    // This can be expensive if done every frame.
    // Better approach: Listen for "SKILL_USED" event to start CSS animation?
    // Or just simple polling every 100ms.

    // Mock data for UI visual check
    const [skills, setSkills] = useState<SkillState[]>([
        { id: 'dash', icon: '⚡', cooldown: 0, maxCooldown: 1500 },
        { id: 'skill1', icon: '★', cooldown: 0, maxCooldown: 5000 },
        { id: 'skill2', icon: '★★', cooldown: 0, maxCooldown: 10000 },
    ]);

    useEffect(() => {
        // Listen for updates from Phaser
        const onUpdate = (data: any) => {
            // Data = { 'dash': 0, 'skill1': 2000, ... }
            if (data.cooldowns) {
                setSkills(prev => prev.map(s => ({
                    ...s,
                    cooldown: data.cooldowns[s.id] || 0,
                    maxCooldown: data.maxCooldowns[s.id] || s.maxCooldown
                })));
            }
        };

        EventBus.on('STATS_UPDATE', onUpdate);
        return () => {
            EventBus.off('STATS_UPDATE', onUpdate);
        };
    }, []);

    return (
        <div className="absolute bottom-5 right-5 flex gap-4 z-50 font-['Press_Start_2P']">
            {skills.map(skill => {
                const percent = (skill.cooldown / skill.maxCooldown) * 100;
                const isReady = skill.cooldown <= 0;

                return (
                    <div key={skill.id} className="relative w-14 h-14 bg-slate-900 border-2 border-slate-600 flex items-center justify-center">
                        {/* Cooldown Overlay (Top-down wipe) */}
                        <div
                            className="absolute bottom-0 left-0 w-full bg-slate-800/90 z-20 pointer-events-none"
                            style={{ height: `${percent}%`, transition: 'height 0.1s linear' }}
                        />

                        {/* Border Glow if Ready */}
                        <div className={`absolute inset-0 border-2 z-30 transition-colors ${isReady ? 'border-cyan-400 drop-shadow-[0_0_5px_rgba(84,252,252,0.8)]' : 'border-transparent'}`} />

                        {/* Icon (Geometric CSS Shapes) */}
                        <div className={`relative z-10 w-full h-full flex items-center justify-center ${isReady ? 'opacity-100' : 'opacity-40 grayscale'}`}>
                            {skill.id === 'dash' && (
                                // Lightning Bolt / Flash
                                <div className="w-4 h-8 bg-yellow-400 rotate-12 skew-x-12 shadow-[0_0_10px_yellow]"></div>
                            )}
                            {skill.id === 'skill1' && (
                                // Diamond
                                <div className="w-6 h-6 bg-cyan-400 rotate-45 shadow-[0_0_10px_cyan]"></div>
                            )}
                            {skill.id === 'skill2' && (
                                // Hexagon / Circle Core
                                <div className="w-8 h-8 rounded-full border-4 border-[#ff0055] flex items-center justify-center shadow-[0_0_10px_magenta]">
                                    <div className="w-2 h-2 bg-white rounded-full"></div>
                                </div>
                            )}
                        </div>

                        {/* Key Hint (Pixel Tag) */}
                        <div className="absolute -top-3 -left-2 bg-black px-1 border border-slate-600">
                            <span className="text-[8px] text-gray-400">
                                {skill.id === 'dash' ? 'SPC' : skill.id === 'skill1' ? 'Q' : 'E'}
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
