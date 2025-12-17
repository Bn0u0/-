import React from 'react';

/**
 * Visual Fraud Overlay
 * Adds Vignette and Scanlines to hide low-poly edges.
 */
export const GameOverlay: React.FC = () => {
    return (
        <div className="absolute inset-0 pointer-events-none z-[100]"
            style={{
                // Vignette: Dark corners
                background: 'radial-gradient(circle at center, transparent 50%, rgba(10, 5, 20, 0.85) 100%)',
                // Subtle noisy texture feeling (optional, maybe too heavy)
            }}
        >
            {/* Optional Top/Bottom Cinematic Bars? Nah, obstruction. */}
        </div>
    );
};
