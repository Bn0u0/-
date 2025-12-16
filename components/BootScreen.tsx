import React from 'react';

interface BootScreenProps {
    progress: number;
}

export const BootScreen: React.FC<BootScreenProps> = ({ progress }) => {
    return (
        <div className="ui-layer" style={{ background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '4rem', animation: 'float 2s infinite' }}>🐰</div>
                <div style={{ width: '200px', height: '10px', background: '#eee', borderRadius: '10px', margin: '20px auto', overflow: 'hidden' }}>
                    <div style={{ width: `${progress}%`, height: '100%', background: `var(--primary-1)`, transition: 'width 0.2s' }}></div>
                </div>
                <div style={{ color: 'var(--primary-1)', fontWeight: 'bold' }}>LOADING...</div>
            </div >
        </div >
    );
};
