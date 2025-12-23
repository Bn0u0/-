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
    const [sellingMode, setSellingMode] = useState(false); // [NEW] Sell Mode Toggle

    // --- Logic ---
    const handleItemClick = (item: ItemInstance) => {
        if (sellingMode) {
            // Sell Logic
            if (confirm(`Sell ${item.name} for credits?`)) {
                // We need to import inventoryService or use EventBus?
                // Ideally EventBus to decouple, but direct service is faster for prototype
                const val = sessionService.sellItem(item.uid); // Need to expose sell via Session or import Inventory
                // Force Update? React might not know inventory changed unless props update.
                // SessionService emits change, parent updates props.
            }
        } else {
            // Equip Logic
            console.log("Equipping:", item.name);
            EventBus.emit('EQUIP_ITEM', item.uid);
        }
    };

    const handleBack = () => {
        setIsClosing(true);
        setTimeout(() => {
            EventBus.emit('WORKBENCH_ACTION', 'BACK');
        }, 200); // Wait for exit animation
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
            {/* ... (Zone A) ... */}

            <div className={classNames(/* ... */)}>
                {/* Drag Handle */}
                <div className="w-full flex justify-center mb-4 pt-2" onClick={handleBack}>
                    <div className="w-12 h-1 bg-white/20 rounded-full" />
                </div>

                <div className="flex justify-between items-end mb-4 px-2 border-b border-[#FFAA00]/20 pb-2">
                    <h2 className="text-[#FFAA00] font-black text-xl italic tracking-tighter drop-shadow-md">
                        ARSENAL STORAGE
                    </h2>

                    {/* [NEW] SELL TOGGLE */}
                    <button
                        onClick={() => setSellingMode(!sellingMode)}
                        className={classNames(
                            "px-3 py-1 text-xs font-bold border rounded transition-all pointer-events-auto",
                            sellingMode ? "bg-red-500 text-white border-red-500 animate-pulse" : "bg-transparent text-[#FFAA00] border-[#FFAA00]"
                        )}
                    >
                        {sellingMode ? "SELL MODE ACTIVE" : "SELL ITEMS"}
                    </button>
                </div>

                {/* Grid Container */}
                <div className="grid grid-cols-3 gap-3 overflow-y-auto custom-scrollbar pb-8 max-h-[300px] pointer-events-auto">
                    {[...inventory, ...MOCK_ITEMS].map((item, idx) => (
                        <div
                            key={idx}
                            onClick={() => handleItemClick(item)}
                            className={classNames(
                                "aspect-square border p-2 flex flex-col justify-between active:scale-95 transition-all cursor-pointer relative group overflow-hidden",
                                sellingMode ? "bg-red-900/20 border-red-500/50 hover:bg-red-500/20" : "bg-[#FFAA00]/5 border-[#FFAA00]/20 hover:bg-[#FFAA00]/20"
                            )}
                        >
                            <div className="text-[10px] opacity-70 leading-none tracking-wider text-inherit">
                                {item.rarity.substring(0, 3)}
                            </div>
                            <div className="font-bold text-xs leading-none break-words z-10 drop-shadow-sm text-inherit">
                                {item.name}
                            </div>

                            {/* Cost Preview in Sell Mode */}
                            {sellingMode && (
                                <div className="absolute top-1 right-1 text-[10px] text-red-300 font-mono">$</div>
                            )}

                            {/* Background Noise */}
                            <div className="absolute inset-0 opacity-10 bg-[url('/assets/ui/noise.png')] mix-blend-overlay pointer-events-none" />
                        </div>
                    ))}

                    {/* Empty Slots */}
                    {[...Array(6)].map((_, i) => <EmptySlot key={`empty-${i}`} />)}
                </div>
            </div>
        </div>
    );
};
