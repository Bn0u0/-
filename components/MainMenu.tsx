import React, { useState } from 'react';
import { CyberModal } from './CyberModal';
import { HapticService } from '../services/HapticService';

interface MainMenuProps {
    onStartGame: (role: string) => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onStartGame }) => {
    const [modal, setModal] = useState({ isOpen: false, title: '', msg: '' });

    const showModal = (title: string, msg: string) => {
        setModal({ isOpen: true, title, msg });
    };

    return (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm z-50 animate-in fade-in duration-500">
            <CyberModal
                title={modal.title}
                message={modal.msg}
                isOpen={modal.isOpen}
                onClose={() => setModal({ ...modal, isOpen: false })}
            />

            <div className="absolute inset-0 pointer-events-none opacity-40 bg-[url('/assets/ui/bg_hld_ruins.png')] bg-cover bg-center filter contrast-125" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black"></div>

            <div className="relative z-10 flex flex-col items-center w-full max-w-md px-6">
                <div className="mb-12 text-center transform transition-transform duration-300">
                    {/* Pastel Title */}
                    <h1 className="text-6xl md:text-8xl font-black text-[#00FFFF] tracking-tight drop-shadow-[0_4px_0_rgba(255,119,188,0.5)]" style={{ fontFamily: '"Varela Round", sans-serif' }}>
                        割草派對
                    </h1>
                    <div className="relative inline-block">
                        <h2 className="text-2xl md:text-3xl text-[#241e3b] bg-[#FF77BC] px-6 py-2 rounded-full transform -rotate-2 border-4 border-white shadow-[0_4px_15px_rgba(255,119,188,0.6)] font-bold mt-4" style={{ fontFamily: '"Varela Round", sans-serif' }}>
                            別貪！快撤 ✨
                        </h2>
                    </div>
                </div>

                <button
                    className="group relative w-full py-6 mb-6 overflow-hidden rounded-3xl bg-transparent border-none cursor-pointer active:scale-95 transition-transform"
                    onClick={() => {
                        HapticService.medium();
                        onStartGame('Vanguard');
                    }}
                >
                    <div className="absolute inset-0 bg-[#FFD700] rounded-3xl border-4 border-white transition-colors shadow-[0_8px_0_#d4b200]"></div>
                    <span className="relative z-10 text-3xl font-black text-[#241e3b] tracking-widest block" style={{ fontFamily: '"Varela Round", sans-serif' }}>
                        立即出擊! 🚀
                    </span>
                </button>

                <div className="flex flex-col gap-3 w-full">
                    <button
                        className="w-full py-4 rounded-full bg-white/10 hover:bg-white/20 border-2 border-[#00FFFF] text-[#00FFFF] font-bold tracking-widest active:scale-95 transition-all text-sm"
                        onClick={() => showModal("SQUAD LINK", "目前伺服器充滿了愛與和平。\n\n功能開發中... 💖")}
                        style={{ fontFamily: '"Varela Round", sans-serif' }}
                    >
                        SQUAD LINK (BETA)
                    </button>

                    <button
                        className="w-full py-4 rounded-full bg-white/10 hover:bg-white/20 border-2 border-[#FF77BC] text-[#FF77BC] font-bold tracking-widest active:scale-95 transition-all text-sm"
                        onClick={() => showModal("創始股東 ✨", "感謝每一位支持這場派對的傳奇！\n\n(名單募集中)")}
                        style={{ fontFamily: '"Varela Round", sans-serif' }}
                    >
                        ★ 創始股東 ★
                    </button>
                </div>
            </div>

            <div className="absolute bottom-6 text-[12px] text-[#00FFFF]/60 tracking-widest font-mono">
                VER 3.0.0 // NEON_POP_PLATINUM
            </div>
        </div>
    );
};
