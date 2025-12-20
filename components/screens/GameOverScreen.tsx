import React from 'react';
import { metaGame } from '../../services/MetaGameService';

// 未來可以在這裡加入：
// - 戰利品結算清單 (Lost Items)
// - 存活時間統計
// - 殺敵數統計
export const GameOverScreen: React.FC = () => {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-black/95 flex-col relative overflow-hidden">

            {/* 背景特效 (可選) */}
            <div className="absolute inset-0 bg-[url('/assets/ui/noise.png')] opacity-10 animate-pulse pointer-events-none"></div>

            {/* 核心文字 */}
            <div className="z-10 text-center space-y-6">
                <h1 className="text-6xl md:text-8xl font-black text-red-600 tracking-[0.2em] glitch-text" data-text="KILLED">
                    KILLED
                </h1>
                <div className="text-xl md:text-2xl text-red-800 font-mono tracking-widest animate-pulse">
                    // SIGNAL LOST //
                </div>
            </div>

            {/* 操作區 */}
            <div className="z-10 mt-12">
                <button
                    onClick={() => metaGame.navigateTo('HIDEOUT')}
                    className="group relative px-8 py-4 bg-transparent border-2 border-red-900/50 text-red-600 font-bold tracking-widest hover:bg-red-900 hover:text-black hover:border-red-600 transition-all duration-300"
                >
                    <span className="absolute inset-0 w-full h-full bg-red-600/10 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
                    <span className="relative">REBOOT SYSTEM (返回基地)</span>
                </button>
            </div>
        </div>
    );
};
