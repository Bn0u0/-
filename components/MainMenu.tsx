import React, { useState } from 'react';
import { CyberModal } from './CyberModal';
import { HapticService } from '../services/HapticService';
import { CLASSES, ClassType } from '../game/factories/PlayerFactory';
import { persistence } from '../services/PersistenceService';

interface MainMenuProps {
    onStartGame: (role: string) => void;
    onOpenHideout: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onStartGame, onOpenHideout }) => {
    const [modal, setModal] = useState({ isOpen: false, title: '', msg: '' });

    // Character Selection State
    const classKeys = Object.keys(CLASSES) as ClassType[];
    const [selectedIdx, setSelectedIdx] = useState(0);
    const currentClass = CLASSES[classKeys[selectedIdx]];

    const showModal = (title: string, msg: string) => {
        setModal({ isOpen: true, title, msg });
    };

    const nextClass = () => {
        setSelectedIdx((prev) => (prev + 1) % classKeys.length);
        HapticService.light();
    };

    const prevClass = () => {
        setSelectedIdx((prev) => (prev - 1 + classKeys.length) % classKeys.length);
        HapticService.light();
    };

    // Digital Asset Logic
    const [backupCode, setBackupCode] = useState('');
    const [importCode, setImportCode] = useState('');

    const handleBackup = () => {
        const code = persistence.exportSaveString();
        setBackupCode(code);
        showModal('DIGITAL ASSET', 'COPY THIS CODE TO SAFE KEEPING.');
    };

    const handleRestore = () => {
        if (!importCode) return;
        const result = persistence.importSaveString(importCode);
        showModal(result.success ? 'SYSTEM RESTORED' : 'ERROR', result.msg);
        if (result.success) {
            // Force reload to apply state
            setTimeout(() => window.location.reload(), 1500);
        }
    };

    // Modal Content Override for Digital Asset
    const renderModalContent = () => {
        if (modal.title === 'DIGITAL ASSET') {
            return (
                <div className="flex flex-col gap-4">
                    <p className="text-gray-300 text-sm">此代碼包含您的所有裝備與進度。</p>
                    <textarea
                        readOnly
                        value={backupCode}
                        className="bg-black/50 border border-[#00FFFF] text-[#00FFFF] p-2 text-xs font-mono h-32 w-full break-all"
                        onClick={(e) => e.currentTarget.select()}
                    />
                    <button
                        onClick={() => { navigator.clipboard.writeText(backupCode); showModal('COPIED', 'CODE COPIED TO CLIPBOARD'); }}
                        className="bg-[#00FFFF] text-black font-bold py-2 rounded hover:bg-white"
                    >
                        COPY TO CLIPBOARD
                    </button>
                    <div className="border-t border-white/20 my-2"></div>
                    <p className="text-gray-300 text-sm">RESTORE FROM CODE:</p>
                    <textarea
                        value={importCode}
                        onChange={(e) => setImportCode(e.target.value)}
                        placeholder="PASTE CODE HERE..."
                        className="bg-black/50 border border-[#FF00FF] text-[#FF00FF] p-2 text-xs font-mono h-24 w-full break-all"
                    />
                    <button
                        onClick={handleRestore}
                        className="bg-[#FF00FF] text-white font-bold py-2 rounded hover:bg-pink-400"
                    >
                        RESTORE DATA
                    </button>
                </div>
            );
        }
        return <p className="text-center text-xl font-bold text-[#00FFFF] my-8">{modal.msg}</p>;
    };

    return (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm z-50 animate-in fade-in duration-500">
            {/* Custom Modal with Dynamic Content support */}
            <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm transition-opacity ${modal.isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <div className="bg-[#0f0418] border-2 border-[#00FFFF] p-1 w-full max-w-sm m-4 shadow-[0_0_50px_rgba(0,255,255,0.3)] transform transition-transform scale-100">
                    <div className="border border-[#00FFFF]/30 p-6 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00FFFF] to-transparent animate-scan" />
                        <h2 className="text-3xl font-black text-center text-white mb-2 tracking-widest">{modal.title}</h2>

                        {/* Dynamic Content or Simple Msg */}
                        {modal.title === 'DIGITAL ASSET' ? renderModalContent() : <p className="text-center text-xl font-bold text-[#00FFFF] my-8">{modal.msg}</p>}

                        <button
                            onClick={() => setModal({ ...modal, isOpen: false })}
                            className="w-full py-4 mt-4 bg-[#00FFFF]/10 border border-[#00FFFF] text-[#00FFFF] font-bold tracking-widest hover:bg-[#00FFFF] hover:text-black transition-colors"
                        >
                            ACKNOWLEDGE
                        </button>
                    </div>
                </div>
            </div>

            {/* Amber-Glitch Background (No PNGs) */}
            <div className="absolute inset-0 pointer-events-none -z-10 bg-[#0e0d16]" />
            <div className="absolute inset-0 pointer-events-none -z-10 opacity-20" style={{
                background: 'radial-gradient(circle at 50% 50%, #2a213a 0%, #0e0d16 100%)'
            }} />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black"></div>

            <div className="relative z-10 flex flex-col items-center w-full max-w-md px-6">
                <div className="mb-8 text-center transform transition-transform duration-300">
                    {/* Pastel Title */}
                    <h1 className="text-5xl md:text-6xl font-black text-[#00FFFF] tracking-tighter drop-shadow-[2px_2px_0px_#FF00FF]" style={{ fontFamily: 'sans-serif' }}>
                        這才較割草
                    </h1>
                    <p className="text-[#FF00FF] font-black tracking-widest mt-2">就3分鐘 別貪!快撤</p>
                </div>

                {/* Character Selector */}
                <div className="w-full mb-8 flex items-center justify-between bg-black/40 backdrop-blur-md rounded-2xl p-4 border-2 border-white/10">
                    <button onClick={prevClass} className="p-4 text-[#00FFFF] text-2xl hover:scale-125 transition-transform">
                        ◀
                    </button>

                    <div className="flex flex-col items-center text-center">
                        <h2 className="text-3xl font-black text-white tracking-widest mb-1" style={{ textShadow: `0 0 10px #${currentClass.stats.markColor.toString(16)}` }}>
                            {currentClass.name}
                        </h2>
                        <div className="text-xs text-gray-400 font-mono tracking-widest mb-2">
                            {currentClass.weapon}
                        </div>
                        {/* Simple Stats Display */}
                        <div className="flex gap-2 text-[10px] text-gray-300">
                            <span className="bg-white/10 px-2 py-1 rounded">HP {currentClass.stats.hp}</span>
                            <span className="bg-white/10 px-2 py-1 rounded">ATK {currentClass.stats.atk}</span>
                            <span className="bg-white/10 px-2 py-1 rounded">SPD {currentClass.stats.speed}</span>
                        </div>
                    </div>

                    <button onClick={nextClass} className="p-4 text-[#00FFFF] text-2xl hover:scale-125 transition-transform">
                        ▶
                    </button>
                </div>

                <button
                    className="group relative w-full py-6 mb-6 overflow-hidden rounded-3xl bg-transparent border-none cursor-pointer active:scale-95 transition-transform"
                    onClick={() => {
                        HapticService.medium();
                        onStartGame(classKeys[selectedIdx]);
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
                        onClick={() => {
                            HapticService.light();
                            onOpenHideout();
                        }}
                        style={{ fontFamily: '"Varela Round", sans-serif' }}
                    >
                        HIDEOUT (倉庫) 📦
                    </button>

                    <button
                        className="w-full py-4 rounded-full bg-white/10 hover:bg-white/20 border-2 border-[#FF77BC] text-[#FF77BC] font-bold tracking-widest active:scale-95 transition-all text-sm"
                        onClick={() => showModal("創始股東 ✨", "感謝每一位支持這場派對的傳奇！\n\n(名單募集中)")}
                        style={{ fontFamily: '"Varela Round", sans-serif' }}
                    >
                        武器庫 / HIDEOUT
                    </button>

                    <button
                        className="w-full py-4 rounded-full bg-white/5 hover:bg-white/10 border-2 border-[#FF00FF] text-[#FF00FF] font-bold tracking-widest active:scale-95 transition-all text-sm"
                        onClick={() => {
                            HapticService.light();
                            handleBackup();
                        }}
                        style={{ fontFamily: '"Varela Round", sans-serif' }}
                    >
                        數位資產 / BACKUP
                    </button>
                </div>

                <div className="mt-8 text-[10px] text-gray-500 font-mono">
                    <p>PROTOCOL: ZERO-BACKEND ENABLED</p>
                    <p>VER: 0.12.0 // MOUSE_SUPPORTED</p>
                </div>
            </div>

            <div className="absolute bottom-6 text-[12px] text-[#00FFFF]/60 tracking-widest font-mono">
                VER 3.0.0 // NEON_POP_PLATINUM
            </div>
        </div >
    );
};
