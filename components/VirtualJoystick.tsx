import React, { useEffect, useRef, useState } from 'react';

interface VirtualJoystickProps {
    onMove: (x: number, y: number) => void;
    onAim: (x: number, y: number, firing: boolean) => void;
    onSkill: (skill: 'DASH' | 'Q' | 'E') => void;
}

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({ onMove, onSkill }) => {
    // Dynamic Joystick State
    const [isVisible, setIsVisible] = useState(false);
    const [origin, setOrigin] = useState({ x: 0, y: 0 }); // Where touch started
    const [current, setCurrent] = useState({ x: 0, y: 0 }); // Current touch pos

    // Config
    const RADIUS = 75; // Max drag radius

    // Flick Detection State
    const startTimeRef = useRef(0);
    const maxMagRef = useRef(0);

    const handleTouchStart = (e: React.TouchEvent) => {
        const touch = e.changedTouches[0];
        setOrigin({ x: touch.clientX, y: touch.clientY });
        setCurrent({ x: touch.clientX, y: touch.clientY });
        setIsVisible(true);
        onMove(0, 0); // Reset

        // Flick Init
        startTimeRef.current = Date.now();
        maxMagRef.current = 0;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isVisible) return;
        const touch = e.changedTouches[0];

        let dx = touch.clientX - origin.x;
        let dy = touch.clientY - origin.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Track Max Magnitude for Flick
        if (dist > maxMagRef.current) maxMagRef.current = dist;

        // Clamp
        if (dist > RADIUS) {
            const ratio = RADIUS / dist;
            dx *= ratio;
            dy *= ratio;
        }

        setCurrent({ x: origin.x + dx, y: origin.y + dy });

        // Output normalized vector
        onMove(dx / RADIUS, dy / RADIUS);
    };

    const handleTouchEnd = () => {
        setIsVisible(false);
        onMove(0, 0);

        // Flick Check
        const duration = Date.now() - startTimeRef.current;
        if (duration < 250 && maxMagRef.current > 30) {
            // Short duration, decent movement -> FLICK
            onSkill('DASH');
        }
    };

    // Mouse Start (for consistency)
    const handleMouseDown = (e: React.MouseEvent) => {
        setOrigin({ x: e.clientX, y: e.clientY });
        setCurrent({ x: e.clientX, y: e.clientY });
        setIsVisible(true);
        onMove(0, 0);
        startTimeRef.current = Date.now();
        maxMagRef.current = 0;
    };

    // Global prevent default for smooth touch
    useEffect(() => {
        const prevent = (e: TouchEvent) => e.preventDefault();
        document.body.addEventListener('touchmove', prevent, { passive: false });
        return () => document.body.removeEventListener('touchmove', prevent);
    }, []);

    return (
        <div
            className="absolute inset-0 z-[9999] touch-none pointer-events-auto"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}

            // Mouse Support
            onMouseDown={handleMouseDown}
            onMouseMove={(e) => {
                if (!isVisible) return;
                let dx = e.clientX - origin.x;
                let dy = e.clientY - origin.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist > maxMagRef.current) maxMagRef.current = dist;

                if (dist > RADIUS) {
                    const ratio = RADIUS / dist;
                    dx *= ratio; dy *= ratio;
                }
                setCurrent({ x: origin.x + dx, y: origin.y + dy });
                onMove(dx / RADIUS, dy / RADIUS);
            }}
            onMouseUp={handleTouchEnd}
            onMouseLeave={() => {
                setIsVisible(false);
                onMove(0, 0);
            }}
        >
            {isVisible && (
                <div
                    className="pointer-events-none"
                    style={{
                        position: 'absolute',
                        left: origin.x,
                        top: origin.y,
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

                    {/* Stick */}
                    <div style={{
                        position: 'absolute',
                        top: current.y - origin.y - 25,
                        left: current.x - origin.x - 25,
                        width: 50, height: 50,
                        borderRadius: '50%',
                        background: 'rgba(255, 0, 85, 0.8)',
                        boxShadow: '0 0 15px #FF0055',
                        border: '2px solid rgba(255, 255, 255, 0.5)'
                    }} />
                </div>
            )}

            {/* Visual Hint for New Users */}
            {!isVisible && (
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-white/20 text-sm tracking-widest animate-pulse font-mono pointer-events-none">
                    TOUCH ANYWHERE TO MOVE
                </div>
            )}
        </div>
    );
};
