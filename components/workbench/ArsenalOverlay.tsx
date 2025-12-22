import React, { useState, useRef } from 'react';
import { ItemInstance } from '../../types';
import { sessionService } from '../../services/SessionService';
import { EventBus } from '../../services/EventBus';
import classNames from 'classnames';

// Mock Data for UI Dev (Simulating "Loading" state possibility)
const MOCK_ITEMS: ItemInstance[] = [
    { uid: '1', defId: 'W_PISTOL', name: 'P-99 Sidewinder', rarity: 'COMMON', computedStats: { damage: 10 } } as any,
    { uid: '2', defId: 'W_SMG', name: 'Vector .45', rarity: 'RARE', computedStats: { damage: 8, fireRate: 100 } } as any,
];

interface Props {
    currentWeapon: ItemInstance | null;
    inventory: ItemInstance[];
}

export const ArsenalOverlay: React.FC<Props> = ({ currentWeapon, inventory }) => {
    const [isClosing, setIsClosing] = useState(false);
    const touchStartY = useRef<number | null>(null);

    // --- Logic ---
    const handleEquip = (item: ItemInstance) => {
        console.log("Equipping:", item.name);
        // EventBus.emit('EQUIP_ITEM', item.uid); 
    };

    const handleBack = () => {
        setIsClosing(true);
        setTimeout(() => {
            EventBus.emit('WORKBENCH_ACTION', 'BACK');
        }, 200); // Wait for exit animation
    };

    // --- Gestures (Swipe Down to Close) ---
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!touchStartY.current) return;
        const diffY = e.changedTouches[0].clientY - touchStartY.current;
        if (diffY > 50) { // Should be positive for DOWN swipe
            handleBack();
        }
        touchStartY.current = null;
    };

    // --- Render Components ---
    const EmptySlot = () => (
        <div className="aspect-square border border-[#FFAA00]/10 bg-black/40 flex items-center justify-center opacity-50">
            {/* Wireframe Silhouette (Diagonal Lines) */}
            <div className="w-full h-full relative overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_45%,rgba(255,170,0,0.1)_50%,transparent_55%)]" />
                <div className="absolute inset-0 flex items-center justify-center text-[#FFAA00]/20 text-[10px] font-mono">EMPTY</div>
            </div>
        </div>
    );

    return (
        <div className="absolute inset-0 z-50 flex flex-col pointer-events-none overflow-hidden">

            {/* [ZONE A] THE STAGE (Top 60%) */}
            {/* Pure Display. No Touching. */}
            <div className="flex-[6] w-full p-6 pt-12 flex flex-col justify-end pointer-events-none bg-gradient-to-b from-black/20 to-transparent">
                {currentWeapon && (
                    <div className={classNames("transition-all duration-500 transform", isClosing ? "opacity-0 translate-y-[-20px]" : "translate-y-0 opacity-100")}>
                        <div className="text-[#00FFFF] border-l-4 border-[#00FFFF] pl-4 drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]">
                            <h3 className="text-[10px] font-bold opacity-70 tracking-[0.2em] mb-1">EQUIPPED SYSTEM</h3>
                            <h1 className="text-4xl font-black uppercase mb-1">{currentWeapon.name}</h1>
                            <div className="flex space-x-6 font-mono text-xs text-cyan-200 mt-2">
                                <div className="flex flex-col">
                                    <span className="opacity-50 text-[10px]">PWR</span>
                                    <span className="text-xl text-white">{currentWeapon.computedStats?.damage || '-'}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="opacity-50 text-[10px]">RPM</span>
                                    <span className="text-xl text-white">{currentWeapon.computedStats?.fireRate || '-'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* [ZONE B] THE COCKPIT (Bottom 40%) */}
            {/* High Interaction. */}
            <div
                className={classNames(
                    "flex-[4] w-full pointer-events-auto bg-gradient-to-t from-black via-black/95 to-transparent flex flex-col justify-end pb-8 px-4 rounded-t-3xl border-t border-white/10 backdrop-blur-md",
                    isClosing ? "translate-y-full transition-transform duration-200 ease-in" : "animate-slide-up"
                )}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                {/* Drag Handle (Visual Cue for Swipe) */}
                <div className="w-full flex justify-center mb-4 pt-2" onClick={handleBack}>
                    <div className="w-12 h-1 bg-white/20 rounded-full" />
                </div>

                <div className="flex justify-between items-end mb-4 px-2 border-b border-[#FFAA00]/20 pb-2">
                    <h2 className="text-[#FFAA00] font-black text-xl italic tracking-tighter drop-shadow-md">
                        ARSENAL STORAGE
                    </h2>
                    <span className="text-[#FFAA00]/50 text-[10px] font-mono animate-pulse">
                        ONLINE
                    </span>
                </div>

                {/* Grid Container - Scrollable */}
                <div className="grid grid-cols-3 gap-3 overflow-y-auto custom-scrollbar pb-8 max-h-[300px]">
                    {/* Real Inventory (+ Mocks) */}
                    {[...inventory, ...MOCK_ITEMS].map((item, idx) => (
                        <div
                            key={idx}
                            onClick={() => handleEquip(item)}
                            className="aspect-square bg-[#FFAA00]/5 border border-[#FFAA00]/20 p-2 flex flex-col justify-between active:bg-[#FFAA00]/30 active:scale-95 transition-all cursor-pointer relative group overflow-hidden"
                        >
                            <div className="text-[10px] text-[#FFAA00]/70 leading-none tracking-wider">{item.rarity.substring(0, 3)}</div>
                            <div className="font-bold text-[#FFAA00] text-xs leading-none break-words z-10 drop-shadow-sm">{item.name}</div>

                            {/* Selection Highlight */}
                            <div className="absolute inset-0 border-2 border-[#FFAA00] opacity-0 group-hover:opacity-100 transition-opacity" />
                            {/* Background Noise/Texture */}
                            <div className="absolute inset-0 opacity-10 bg-[url('/assets/noise.png')] mix-blend-overlay pointer-events-none" />
                        </div>
                    ))}

                    {/* Empty Slots */}
                    {[...Array(6)].map((_, i) => <EmptySlot key={`empty-${i}`} />)}
                </div>
            </div>
        </div>
    );
};
