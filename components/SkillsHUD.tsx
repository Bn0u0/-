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
        <div style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            display: 'flex',
            gap: '15px',
            zIndex: 100
        }}>
            {skills.map(skill => {
                const percent = (skill.cooldown / skill.maxCooldown) * 100;
                const isReady = skill.cooldown <= 0;

                return (
                    <div key={skill.id} style={{
                        width: '60px', height: '60px',
                        background: 'rgba(0,0,0,0.6)',
                        borderRadius: '12px',
                        border: isReady ? '2px solid #00FF00' : '2px solid #555',
                        position: 'relative',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px',
                        boxShadow: isReady ? '0 0 10px #00FF00' : 'none',
                        transition: 'all 0.1s'
                    }}>
                        {/* Cooldown Mask */}
                        <div style={{
                            position: 'absolute',
                            bottom: 0, left: 0, right: 0,
                            height: `${percent}%`,
                            background: 'rgba(255, 255, 255, 0.3)',
                            transition: 'height 0.1s linear'
                        }} />

                        {/* Icon */}
                        <div style={{ zIndex: 2, opacity: isReady ? 1 : 0.5 }}>
                            {skill.icon}
                        </div>

                        {/* Key bind hint */}
                        <div style={{
                            position: 'absolute', top: 2, left: 4,
                            fontSize: '10px', color: '#AAA'
                        }}>
                            {skill.id === 'dash' ? 'SPC' : skill.id === 'skill1' ? 'Q' : 'E'}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
