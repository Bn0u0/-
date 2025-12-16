import React, { useState } from 'react';

interface HeroSelectProps {
    onSelect: (role: string) => void;
    onBack: () => void;
}

const HEROES = [
    { id: 'Vanguard', name: '甲蟲 (The Beetle)', desc: '坦克 / 衝撞', color: '#3366FF', icon: '🛡️' },
    { id: 'Weaver', name: '蜜蜂 (The Bee)', desc: '召喚 / 搜刮', color: '#FFDD00', icon: '🐝' },
    { id: 'Spectre', name: '摺紙鬼 (The Ghost)', desc: '隱身 / 狙擊', color: '#A388EE', icon: '👻' },
    { id: 'Bastion', name: '烏龜 (The Tortoise)', desc: '移動 / 掩體', color: '#44AA44', icon: '🐢' },
    { id: 'Catalyst', name: '史萊姆 (The Slime)', desc: '控場 / 黏液', color: '#FF22AA', icon: '🍮' },
];

export const HeroSelection: React.FC<HeroSelectProps> = ({ onSelect, onBack }) => {
    const [selectedId, setSelectedId] = useState<string | null>(null);

    return (
        <div className="ui-container" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>
            <div style={{ position: 'absolute', top: 20, left: 20 }}>
                <button className="bubble-btn" onClick={onBack}>← 返回</button>
            </div>

            <h1 style={{ color: 'white', fontFamily: 'Fredoka', fontSize: '3rem', marginBottom: '40px', textAlign: 'center' }}>
                選擇你的幾何體
            </h1>

            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '1000px' }}>
                {HEROES.map(hero => (
                    <div
                        key={hero.id}
                        className={`glass-card ${selectedId === hero.id ? 'active-hero' : ''}`}
                        style={{
                            width: '160px',
                            height: '240px',
                            cursor: 'pointer',
                            border: selectedId === hero.id ? `4px solid ${hero.color}` : '2px solid rgba(255,255,255,0.1)',
                            transform: selectedId === hero.id ? 'scale(1.1)' : 'scale(1)',
                            transition: 'all 0.2s'
                        }}
                        onClick={() => setSelectedId(hero.id)}
                    >
                        <div style={{ fontSize: '4rem', textAlign: 'center', margin: '20px 0' }}>{hero.icon}</div>
                        <div style={{ color: hero.color, fontSize: '1.2rem', fontWeight: 'bold', textAlign: 'center' }}>{hero.name}</div>
                        <div style={{ color: '#aaa', fontSize: '0.8rem', textAlign: 'center', marginTop: '10px' }}>{hero.desc}</div>
                    </div>
                ))}
            </div>

            <div style={{ marginTop: '40px', height: '60px' }}>
                {selectedId && (
                    <button
                        className="bubble-btn green"
                        style={{ fontSize: '1.5rem', padding: '15px 50px' }}
                        onClick={() => onSelect(selectedId)}
                    >
                        確認出擊
                    </button>
                )}
            </div>
        </div>
    );
};
