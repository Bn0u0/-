import React, { useEffect, useRef, useState } from 'react';

// Simple Dual Stick implementation with Touch Events
interface VirtualJoystickProps {
    onMove: (x: number, y: number) => void;
    onAim: (x: number, y: number, firing: boolean) => void;
    onSkill: (skill: 'DASH' | 'Q' | 'E') => void;
}

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({ onMove, onAim, onSkill }) => {
    const moveRef = useRef<HTMLDivElement>(null);
    const aimRef = useRef<HTMLDivElement>(null);

    // State to track touches
    const [movePos, setMovePos] = useState({ x: 0, y: 0 });
    const [aimPos, setAimPos] = useState({ x: 0, y: 0 });
    const [isFiring, setIsFiring] = useState(false);

    // Helpers
    const handleTouch = (e: React.TouchEvent, type: 'MOVE' | 'AIM') => {
        // e.preventDefault(); // Stop scrolling usually done in CSS touch-action
        const touch = e.changedTouches[0];
        const rect = (type === 'MOVE' ? moveRef : aimRef).current?.getBoundingClientRect();
        if (!rect) return;

        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        let dx = touch.clientX - centerX;
        let dy = touch.clientY - centerY;

        // Normalize
        const maxDist = rect.width / 2;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > maxDist) {
            const ratio = maxDist / dist;
            dx *= ratio;
            dy *= ratio;
        }

        // Normalized Output (-1 to 1)
        const nx = dx / maxDist;
        const ny = dy / maxDist;

        if (type === 'MOVE') {
            setMovePos({ x: dx, y: dy });
            onMove(nx, ny);
        } else {
            setAimPos({ x: dx, y: dy });
            onAim(nx, ny, true);
            setIsFiring(true);
        }
    };

    const handleEnd = (type: 'MOVE' | 'AIM') => {
        if (type === 'MOVE') {
            setMovePos({ x: 0, y: 0 });
            onMove(0, 0);
        } else {
            setAimPos({ x: 0, y: 0 });
            onAim(0, 0, false);
            setIsFiring(false);
        }
    };

    // Prevent default scroll
    useEffect(() => {
        const prevent = (e: TouchEvent) => e.preventDefault();
        document.body.addEventListener('touchmove', prevent, { passive: false });
        return () => document.body.removeEventListener('touchmove', prevent);
    }, []);

    return (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 200 }}>
            {/* Left Stick (Move) */}
            <div
                ref={moveRef}
                style={{
                    position: 'absolute', bottom: '20px', left: '20px', width: '150px', height: '150px',
                    background: 'rgba(255, 255, 255, 0.1)', borderRadius: '50%',
                    pointerEvents: 'auto', border: '2px solid rgba(255,255,255,0.2)'
                }}
                onTouchStart={e => handleTouch(e, 'MOVE')}
                onTouchMove={e => handleTouch(e, 'MOVE')}
                onTouchEnd={() => handleEnd('MOVE')}
            >
                <div style={{
                    position: 'absolute', top: '50%', left: '50%', width: '60px', height: '60px',
                    background: 'rgba(255, 255, 255, 0.5)', borderRadius: '50%',
                    transform: `translate(calc(-50% + ${movePos.x}px), calc(-50% + ${movePos.y}px))`
                }} />
            </div>

            {/* Right Stick (Aim) */}
            <div
                ref={aimRef}
                style={{
                    position: 'absolute', bottom: '20px', right: '20px', width: '150px', height: '150px',
                    background: 'rgba(255, 255, 255, 0.1)', borderRadius: '50%',
                    pointerEvents: 'auto', border: '2px solid rgba(255,255,255,0.2)'
                }}
                onTouchStart={e => handleTouch(e, 'AIM')}
                onTouchMove={e => handleTouch(e, 'AIM')}
                onTouchEnd={() => handleEnd('AIM')}
            >
                <div style={{
                    position: 'absolute', top: '50%', left: '50%', width: '60px', height: '60px',
                    background: isFiring ? 'rgba(255, 50, 50, 0.5)' : 'rgba(255, 255, 255, 0.5)', borderRadius: '50%',
                    transform: `translate(calc(-50% + ${aimPos.x}px), calc(-50% + ${aimPos.y}px))`
                }} />
            </div>

            {/* Skill Buttons */}
            <div style={{ position: 'absolute', bottom: '180px', right: '30px', display: 'flex', flexDirection: 'column', gap: '15px', pointerEvents: 'auto' }}>
                <div className="btn-circle" onClick={() => onSkill('DASH')} style={{ background: '#AAFF00' }}>⚡</div>
                <div className="btn-circle" onClick={() => onSkill('Q')} style={{ background: '#00AAFF' }}>★</div>
                <div className="btn-circle" onClick={() => onSkill('E')} style={{ background: '#FF00AA' }}>★★</div>
            </div>

            <style>{`
                .btn-circle {
                    width: 50px; height: 50px; border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 20px; font-weight: bold; color: white;
                    box-shadow: 0 4px 10px rgba(0,0,0,0.3);
                }
                .btn-circle:active { transform: scale(0.9); }
            `}</style>
        </div>
    );
};
