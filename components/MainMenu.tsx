import React, { useEffect, useState } from 'react';

interface MainMenuProps {
    onStart: () => void;
    currentHero: string;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onStart, currentHero }) => {
    const [offsetY, setOffsetY] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            setOffsetY(window.scrollY);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Simple Parallax Effect simulation with mouse
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const handleMouseMove = (e: React.MouseEvent) => {
        setMousePos({
            x: (e.clientX - window.innerWidth / 2) / 50,
            y: (e.clientY - window.innerHeight / 2) / 50
        });
    };

    return (
        <div
            className="ui-container"
            style={{
                background: '#1a1a2e',
                overflow: 'hidden',
                perspective: '1000px'
            }}
            onMouseMove={handleMouseMove}
        >
            {/* Background Layers */}
            <div style={{
                position: 'absolute', top: 0, left: 0, width: '110%', height: '110%',
                background: 'radial-gradient(circle at 50% 50%, #2a2a4e 0%, #1a1a2e 100%)',
                transform: `translate(${-5 + mousePos.x}px, ${-5 + mousePos.y}px)`,
                zIndex: -2
            }} />

            {/* Geometric Floating Shapes */}
            <div style={{
                position: 'absolute', top: '20%', left: '10%',
                fontSize: '8rem', opacity: 0.1,
                transform: `translate(${mousePos.x * 2}px, ${mousePos.y * 2}px) rotate(15deg)`
            }}>🧊</div>
            <div style={{
                position: 'absolute', bottom: '20%', right: '10%',
                fontSize: '10rem', opacity: 0.1,
                transform: `translate(${mousePos.x * 3}px, ${mousePos.y * 3}px) rotate(-15deg)`
            }}>📐</div>

            {/* Menu Content */}
            <div style={{ textAlign: 'center', zIndex: 10 }}>
                <h1 className="title-text" style={{
                    fontSize: '6rem',
                    marginBottom: '0',
                    textShadow: '0 10px 30px rgba(0,0,0,0.5)',
                    transform: `translate(${mousePos.x}px, ${mousePos.y}px)`
                }}>
                    幾何戰爭
                </h1>
                <div className="subtitle-text" style={{ letterSpacing: '8px', marginBottom: '60px' }}>
                    GEOMETRIC WARFARE
                </div>

                <div className="glass-card" style={{ padding: '40px', display: 'inline-block' }}>
                    <div style={{ marginBottom: '20px', color: '#aaa' }}>
                        當前英雄: <span style={{ color: '#fff', fontWeight: 'bold' }}>{currentHero}</span>
                    </div>

                    <button
                        className="bubble-btn blue"
                        style={{ fontSize: '1.5rem', width: '300px', display: 'block', marginBottom: '15px' }}
                        onClick={onStart}
                    >
                        開始作戰
                    </button>

                    {/* Placeholder for settings etc */}
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                        <button className="bubble-btn" style={{ width: 'auto' }}>設定</button>
                        <button className="bubble-btn" style={{ width: 'auto' }}>製作人員</button>
                    </div>
                </div>
            </div>

            <div style={{
                position: 'absolute', bottom: '20px', width: '100%', textAlign: 'center',
                color: '#444', fontSize: '0.8rem'
            }}>
                PROJECT SYNAPSE V2.0 MVP - [PHASE 4]
            </div>
        </div>
    );
};
