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
            className="fixed inset-0 bg-black flex flex-col items-center justify-center z-[100] cursor-pointer"
            onClick={() => loaded && onStart()}
        >
            <div className="text-6xl mb-8 animate-pulse">🐰</div>
            <div className="w-64 h-2 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
                <div 
                    className="h-full bg-[#00FFFF] transition-all duration-75 ease-out shadow-[0_0_10px_#00FFFF]"
                    style={{ width: `${progress}%` }}
                />
            </div>
            <div className="mt-4 font-mono text-[#00FFFF] tracking-widest text-sm">
                {loaded ? '>> TAP TO INITIALIZE <<' : `SYSTEM LOADING... ${progress}%`}
            </div>
            <div className="absolute inset-0 pointer-events-none opacity-5 bg-[url('/assets/textures/floor_scifi.png')] bg-repeat"></div>
        </div>
    );
};
