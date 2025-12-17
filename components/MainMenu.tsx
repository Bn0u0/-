import React from 'react';

interface MainMenuProps {
    onStartGame: (role: string) => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onStartGame }) => {
    return (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm z-50 animate-in fade-in duration-500">
            <div className="absolute inset-0 pointer-events-none opacity-40 bg-[url('/assets/ui/bg_hld_ruins.png')] bg-cover bg-center filter contrast-125" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black"></div>

            <div className="relative z-10 flex flex-col items-center w-full max-w-md px-6">
                <div className="mb-12 text-center transform hover:scale-105 transition-transform duration-300">
                    <h1 className="text-6xl md:text-8xl font-black italic text-[#00FFFF] tracking-tighter drop-shadow-[0_0_15px_rgba(0,255,255,0.8)]" style={{ fontFamily: 'Impact, sans-serif' }}>
                        這才叫割草
                    </h1>
                    <div className="relative inline-block">
                        <h2 className="text-2xl md:text-3xl text-white bg-[#FF0055] px-4 py-1 transform -rotate-2 border-2 border-white shadow-[0_0_20px_rgba(255,0,85,0.8)] font-bold mt-2">
                            別貪！快撤
                        </h2>
                    </div>
                </div>

                <button
                    className="group relative w-full py-6 mb-6 overflow-hidden bg-transparent border-none cursor-pointer"
                    onClick={() => onStartGame('Vanguard')}
                >
                    <div className="absolute inset-0 bg-[#FF0055] transform skew-x-[-10deg] border-2 border-white group-hover:bg-[#ff3377] transition-colors shadow-[0_0_30px_rgba(255,0,85,0.5)]"></div>
                    <span className="relative z-10 text-3xl font-black text-white italic tracking-widest group-hover:scale-110 transition-transform block">
                        立即出擊
                    </span>
                </button>

                <div className="flex flex-col gap-3 w-full">
                    <button
                        className="w-full py-3 border border-[#00FFFF]/30 bg-black/50 hover:bg-[#00FFFF]/10 hover:border-[#00FFFF] transition-all text-[#00FFFF] tracking-widest text-sm font-bold uppercase"
                        onClick={() => alert("SQUAD LINK [OFFLINE]\nSERVER MAINTENANCE")}
                    >
                        SQUAD LINK (BETA)
                    </button>

                    <button
                        className="w-full py-3 border border-[#FFD700]/30 bg-black/50 hover:bg-[#FFD700]/10 hover:border-[#FFD700] transition-all text-[#FFD700] tracking-widest text-sm font-bold uppercase group relative overflow-hidden"
                        onClick={() => alert("創始股東名單 (Founding Shareholders):\n\nWaiting for the first legend...")}
                    >
                        <span className="relative z-10">★ 創始股東 ★</span>
                    </button>
                </div>
            </div>

            <div className="absolute bottom-4 text-[10px] text-gray-500 tracking-widest font-mono">
                VER 1.0.0 // NOBODY_SURVIVES_3MIN
            </div>
        </div>
    );
};
