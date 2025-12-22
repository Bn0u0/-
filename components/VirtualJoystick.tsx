import React, { useEffect, useRef, useState } from 'react';

interface VirtualJoystickProps {
    onMove: (x: number, y: number) => void;
    onAim: (x: number, y: number, firing: boolean) => void;
    onSkill: (skill: 'DASH' | 'Q' | 'E') => void;
}

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({ onMove, onSkill }) => {
    // Dynamic Joystick State
    const [isVisible, setIsVisible] = useState(false);
    const originRef = useRef({ x: 0, y: 0 }); // [FIX] Use Ref for synchronous access
    const [visualOrigin, setVisualOrigin] = useState({ x: 0, y: 0 }); // For Render only
    const [visualCurrent, setVisualCurrent] = useState({ x: 0, y: 0 }); // For Render only

    // Siege Mode State
    const [isSiege, setIsSiege] = useState(false);

    // Config
    const RADIUS = 75; // Max drag radius

    // Flick Detection State
    const startTimeRef = useRef(0);
    const maxMagRef = useRef(0);

    // Unified Pointer Handlers (Mouse + Touch)
    const handlePointerDown = (e: React.PointerEvent) => {
        const clientX = e.clientX;
        const clientY = e.clientY;

        e.currentTarget.setPointerCapture(e.pointerId);

        originRef.current = { x: clientX, y: clientY };
        setVisualOrigin({ x: clientX, y: clientY });
        setVisualCurrent({ x: clientX, y: clientY });

        setIsVisible(true);
        setIsSiege(false); // Reset
        onMove(0, 0);

        // Flick Init
        startTimeRef.current = Date.now();
        maxMagRef.current = 0;
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isVisible) return;
        const clientX = e.clientX;
        const clientY = e.clientY;

        // Use Ref for calculation to ensure freshness
        const originX = originRef.current.x;
        const originY = originRef.current.y;

        let dx = clientX - originX;
        let dy = clientY - originY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > maxMagRef.current) maxMagRef.current = dist;

        // Force Calculation (0.0 to 1.0+)
        const force = dist / RADIUS;

        // [SIEGE MODE] Visual Feedback
        if (force > 0.9) {
            if (!isSiege) {
                setIsSiege(true);
                if (navigator.vibrate) navigator.vibrate(30);
            }
        } else {
            if (isSiege) setIsSiege(false);
        }

        if (dist > RADIUS) {
            const ratio = RADIUS / dist;
            dx *= ratio; // Clamp Vector
            dy *= ratio;
        }

        // Update Visuals
        setVisualCurrent({ x: originX + dx, y: originY + dy });

        // Emit Normalized Vector
        onMove(dx / RADIUS, dy / RADIUS);
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        setIsVisible(false);
        setIsSiege(false);
        onMove(0, 0);

        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
        }

        // Flick Check
        const duration = Date.now() - startTimeRef.current;
        // [V5 TUNING] Snappier Dash (Must be fast < 200ms, and significant movement > 40px)
        if (duration < 200 && maxMagRef.current > 40) {
            onSkill('DASH');
        }
    };

    return (
        <div
            className="absolute bottom-0 left-0 w-full h-[40%] z-[9999] touch-none pointer-events-auto"
            style={{ touchAction: 'none' }} // [FIX] Force no-scroll
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={handlePointerUp}
        >
            {isVisible && (
                <div
                    className="pointer-events-none"
                    style={{
                        position: 'absolute',
                        left: visualOrigin.x,
                        top: visualOrigin.y,
                        width: '0px', height: '0px',
                        overflow: 'visible'
                    }}
                >
                    {/* Base Circle */}
                    <div style={{
                        position: 'absolute',
                        top: -RADIUS, left: -RADIUS,
                        width: RADIUS * 2, height: RADIUS * 2,
                        borderRadius: '50%',
                        border: '2px solid rgba(255, 255, 255, 0.1)',
                        background: 'rgba(0, 0, 0, 0.2)',
                        backdropFilter: 'blur(2px)'
                    }} />

                    {/* Stick - Dynamic Color */}
                    <div style={{
                        position: 'absolute',
                        top: visualCurrent.y - visualOrigin.y - 25,
                        left: visualCurrent.x - visualOrigin.x - 25,
                        width: 50, height: 50,
                        borderRadius: '50%',
                        background: isSiege ? 'rgba(0, 255, 255, 0.8)' : 'rgba(255, 0, 85, 0.8)',
                        boxShadow: isSiege ? '0 0 20px #00FFFF' : '0 0 15px #FF0055',
                        border: '2px solid rgba(255, 255, 255, 0.5)',
                        transition: 'background 0.1s, box-shadow 0.1s'
                    }} />
                </div>
            )}

            {/* Visual Hint for New Users */}
            {!isVisible && (
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-white/20 text-sm tracking-widest animate-pulse font-mono pointer-events-none text-center">
                    TOUCH ANYWHERE TO MOVE<br />
                    <span className="text-xs opacity-50">(WASD ENABLED)</span>
                </div>
            )}
        </div>
    );
};
