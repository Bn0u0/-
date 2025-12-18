import React, { useEffect, useState } from 'react';

interface BootScreenProps {
    onStart: () => void;
}

export const BootScreen: React.FC<BootScreenProps> = ({ onStart }) => {
    const [loaded, setLoaded] = useState(false);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    setLoaded(true);
                    return 100;
                }
                return prev + 5;
            });
        }, 50);
        return () => clearInterval(interval);
    }, []);

    return (
        <div
            className="fixed inset-0 bg-black flex flex-col items-center justify-center z-[99999] cursor-pointer"
            onClick={() => {
                console.log("BootScreen Clicked. Loaded:", loaded);
                if (loaded) onStart();
            }}
        >
            {/* <div className="text-6xl mb-8 animate-pulse">🐰</div> - REMOVED LEGACY RABBIT */}
            <h1 className="text-6xl mb-8 font-black text-[#00FFFF] tracking-tighter animate-pulse drop-shadow-[0_0_10px_#00FFFF]">
                SYNAPSE<br />
                <span className="text-2xl text-[#FF00FF] tracking-[0.5em]">PROTOCOL</span>
            </h1>

            <div className="w-64 h-2 bg-black rounded-none overflow-hidden border border-[#00FFFF]">
                <div
                    className="h-full bg-[#00FFFF] transition-all duration-75 ease-out shadow-[0_0_10px_#00FFFF]"
                    style={{ width: `${progress}%` }}
                />
            </div>
            <div className="mt-4 font-mono text-[#00FFFF] tracking-widest text-xs">
                {loaded ? '>> CLICK TO INITIALIZE <<' : `LOADING NEURAL LINK... ${progress}%`}
            </div>

            {/* Amber Glitch Grid Background */}
            <div className="absolute inset-0 pointer-events-none -z-10" style={{
                background: `
                    linear-gradient(rgba(18, 16, 35, 0.9), rgba(18, 16, 35, 0.9)),
                    repeating-linear-gradient(0deg, transparent, transparent 19px, #00FFFF 20px),
                    repeating-linear-gradient(90deg, transparent, transparent 19px, #FF00FF 20px)
                `,
                backgroundSize: '100% 100%, 40px 40px, 40px 40px',
                opacity: 0.1
            }}></div>
        </div>
    );
};
