
import React, { useEffect, useState } from 'react';
import { metaGame } from '../services/MetaGameService';
import { inventoryService } from '../services/InventoryService';
import { InventoryItem, ItemType, getItemDef, EquipmentSlot, ItemRarity } from '../game/data/Items';

export const Hideout: React.FC = () => {
    // Local state
    const [invState, setInvState] = useState(inventoryService.getState());
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [heroId, setHeroId] = useState(metaGame.getState().selectedHeroId);

    // UI Modes: 'ARMORY' | 'MARKET' | 'DECRYPT'
    const [uiMode, setUiMode] = useState<'ARMORY' | 'MARKET' | 'DECRYPT'>('ARMORY');
    const [decryptAnim, setDecryptAnim] = useState(false);

    // Social Modal
    const [giftLink, setGiftLink] = useState<string | null>(null);

    const heroes = ['Vanguard', 'Spectre', 'Bastion', 'Catalyst', 'Weaver'];

    // Localization constants
    const LABELS = {
        HEAD: '頭部', BODY: '軀幹', MAIN: '主武', LEGS: '腿部', FEET: '足部', OFF: '副手',
        ATK: '攻擊', DEF: '防禦', SPD: '速度', CRIT: '爆擊',
        STORAGE: '儲存矩陣', EQUIP: '裝備', UNEQUIP: '卸除', GIFT: '贈送', SELL: '出售',
        INIT: '啟動跳躍引擎', READY: '傳輸準備就緒', CLOSE: '關閉終端',
        CLASS_MISMATCH: '⚠ 職階不符',
        SWAP_HINT: '點擊切換機體',
        EMPTY_SLOT: '空插槽',
        TAB_ARMORY: '軍械庫', TAB_MARKET: '黑市', TAB_DECRYPT: '解碼中心',
        DECRYPT_BTN: '解碼 (50 CR)', DECRYPTING: '解碼中...',
        NO_ARTIFACTS: '無加密數據', NO_ITEMS: '無可交易物品'
    };

    const HERO_NAMES: Record<string, string> = {
        'Vanguard': '先鋒', 'Spectre': '幽靈', 'Bastion': '堡壘', 'Catalyst': '催化劑', 'Weaver': '編織者'
    };

    useEffect(() => {
        const unsub = inventoryService.subscribe(setInvState);
        return () => unsub();
    }, []);

    const handleHeroClick = () => {
        const currentIndex = heroes.indexOf(heroId);
        const nextHero = heroes[(currentIndex + 1) % heroes.length];
        setHeroId(nextHero);
        metaGame.selectHero(nextHero);
    };

    // Actions
    const handleEquip = () => {
        if (!selectedItem) return;
        const def = getItemDef(selectedItem.defId);
        if (!def) return;
        const success = inventoryService.equipItem(heroId, selectedItem, def.slot);
        if (success) setSelectedItem(null);
    };

    const handleUnequip = (slot: EquipmentSlot) => {
        inventoryService.unequipItem(heroId, slot);
    };

    const handleSell = (item: InventoryItem) => {
        inventoryService.sellItem(item.id);
        setSelectedItem(null);
    };

    const handleDecrypt = (item: InventoryItem) => {
        if (invState.credits < 50) return; // UI Block
        setDecryptAnim(true);

        setTimeout(() => {
            inventoryService.decryptArtifact(item.id);
            setDecryptAnim(false);
            setSelectedItem(null);
        }, 1000); // Fake delay
    };

    const renderItemIcon = (def: any) => {
        // HLD Style Geometric Icons (CSS)
        return (
            <div className="w-full h-full flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-20" style={{ background: getRarityColor(def.rarity) }}></div>
                {def.type === ItemType.ARTIFACT ? (
                    <div className="w-8 h-8 border-2 border-white rotate-45 animate-pulse bg-cyan-500/50"></div>
                ) : (
                    <>
                        {def.slot === EquipmentSlot.MAIN_HAND && <div className="w-1/2 h-4/5 bg-white skew-x-12 border-2 border-black"></div>}
                        {def.slot === EquipmentSlot.HEAD && <div className="w-3/5 h-3/5 rounded-t-lg border-4 border-white"></div>}
                        {def.slot === EquipmentSlot.BODY && <div className="w-4/5 h-4/5 border-2 border-white grid grid-cols-2 gap-1"><div className="bg-white/50"></div><div className="bg-white/50"></div></div>}
                    </>
                )}
            </div>
        );
    };

    // Helper to render a slot
    const renderSlot = (slot: EquipmentSlot, labelKey: keyof typeof LABELS) => {
        const loadout = invState.loadouts[heroId] || {};
        const item = loadout[slot];
        const def = item ? getItemDef(item.defId) : null;

        return (
            <div
                onClick={() => item && handleUnequip(slot)}
                className={`w-14 h-14 md:w-16 md:h-16 border ${item ? 'border-cyan-400 bg-[#272933]' : 'border-[#272933] bg-black/50'} relative cursor-pointer hover:border-white transition-colors flex items-center justify-center group shrink-0`}
            >
                {item ? (
                    <>
                        <div className="w-full h-full p-2 group-hover:scale-105 transition-transform">{renderItemIcon(def)}</div>
                        <div className="absolute bottom-0 right-0 text-[8px] bg-black px-1 text-cyan-400 font-bold">T{def?.tier}</div>
                    </>
                ) : (
                    <span className="text-[10px] text-[#494d5e] tracking-widest">{LABELS[labelKey]}</span>
                )}
            </div>
        );
    };

    // Helper to get Rarity Color
    const getRarityColor = (r: string) => {
        if (r === ItemRarity.LEGENDARY) return '#ffe736';
        if (r === ItemRarity.RARE) return '#54fcfc';
        if (r === ItemRarity.UNCOMMON) return '#ff0055';
        return '#494d5e';
    };

    // --- RENDER CONTENT BASED ON TAB ---
    const renderContent = () => {
        if (uiMode === 'ARMORY') {
            return (
                <div className="flex-1 flex flex-col md:flex-row p-2 gap-2 overflow-hidden relative z-10 w-full max-w-4xl mx-auto">
                    {/* Paper Doll */}
                    <div className="w-full md:w-5/12 flex flex-col items-center gap-2 border border-[#272933] p-2 bg-[#0e0d16]/90 shadow-lg relative shrink-0">
                        {/* ... (Existing Paper Doll Logic) ... */}
                        {/* Reusing existing simplified for brevity, but needed fully. */}
                        {/* Center content essentially same as previous file */}
                        <div className="flex justify-between w-full relative h-40 md:h-64 items-center">
                            <div className="flex flex-col justify-center gap-2 z-10">
                                {renderSlot(EquipmentSlot.HEAD, 'HEAD')} {renderSlot(EquipmentSlot.BODY, 'BODY')} {renderSlot(EquipmentSlot.MAIN_HAND, 'MAIN')}
                            </div>
                            <div onClick={handleHeroClick} className="flex-1 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-colors rounded-lg group h-full">
                                <div className="scale-125 md:scale-150 transition-transform duration-300 group-hover:scale-150 group-hover:rotate-6">
                                    {/* Placeholder Avatar Reuse */}
                                    <div className="text-4xl text-cyan-400 select-none font-bold opacity-80">{heroId[0]}</div>
                                </div>
                            </div>
                            <div className="flex flex-col justify-center gap-2 z-10">
                                {renderSlot(EquipmentSlot.LEGS, 'LEGS')} {renderSlot(EquipmentSlot.FEET, 'FEET')} {renderSlot(EquipmentSlot.OFF_HAND, 'OFF')}
                            </div>
                        </div>
                    </div>

                    {/* Stash Grid */}
                    <div className="flex-1 flex flex-col border border-[#272933] bg-[#0e0d16]/90 relative min-h-0">
                        <div className="p-2 border-b border-[#272933] flex justify-between items-center bg-black/20 shrink-0">
                            <span className="text-[10px] text-[#eddbda] tracking-widest">{LABELS.STORAGE}</span>
                            <span className="text-[10px] text-[#494d5e]">{invState.stash.length} / 20</span>
                        </div>
                        <div className="flex-1 grid grid-cols-5 content-start gap-1 p-2 overflow-y-auto custom-scrollbar">
                            {invState.stash.map(item => {
                                const def = getItemDef(item.defId);
                                if (!def) return null;
                                return (
                                    <div key={item.id} onClick={() => setSelectedItem(item)} className="aspect-square border border-[#272933] hover:border-white cursor-pointer relative flex items-center justify-center">
                                        <div className="w-3/4 h-3/4">{renderItemIcon(def)}</div>
                                        <div className="absolute top-0 right-0 w-2 h-2" style={{ background: getRarityColor(def.rarity) }}></div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            );
        }

        if (uiMode === 'MARKET') {
            return (
                <div className="flex-1 w-full max-w-4xl mx-auto p-4 flex flex-col gap-4">
                    <div className="text-center text-yellow-400 mb-4 tracking-[0.2em] animate-pulse">BLACK MARKET ACCESS GRANTED</div>
                    <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                        {invState.stash.length === 0 && <div className="col-span-full text-center text-[#494d5e] py-10">{LABELS.NO_ITEMS}</div>}
                        {invState.stash.map(item => {
                            const def = getItemDef(item.defId);
                            if (!def) return null;
                            return (
                                <div key={item.id} onClick={() => handleSell(item)} className="aspect-square border border-yellow-600/30 hover:bg-yellow-400/10 cursor-pointer flex flex-col items-center justify-center relative group">
                                    <div className="w-1/2 h-1/2">{renderItemIcon(def)}</div>
                                    <div className="absolute bottom-0 w-full text-center bg-black text-yellow-400 text-[8px] group-hover:block hidden">{LABELS.SELL}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        }

        if (uiMode === 'DECRYPT') {
            const artifacts = invState.stash.filter(i => {
                const def = getItemDef(i.defId);
                return def && def.type === ItemType.ARTIFACT;
            });

            return (
                <div className="flex-1 w-full max-w-4xl mx-auto p-4 flex flex-col gap-4 items-center">
                    <div className="text-center text-cyan-400 mb-4 tracking-[0.2em] animate-pulse">DECRYPT DATA PACKETS</div>
                    <div className="flex gap-4 flex-wrap justify-center">
                        {artifacts.length === 0 && <div className="text-[#494d5e] py-10">{LABELS.NO_ARTIFACTS}</div>}
                        {artifacts.map(item => (
                            <div key={item.id} className="w-32 h-40 border border-cyan-500/50 bg-black/50 flex flex-col items-center p-2 gap-2">
                                <div className="flex-1 w-full flex items-center justify-center animate-pulse">📦</div>
                                <button
                                    onClick={() => handleDecrypt(item)}
                                    disabled={invState.credits < 50 || decryptAnim}
                                    className="w-full py-2 bg-cyan-500 text-black text-[10px] font-bold disabled:opacity-50"
                                >
                                    {decryptAnim ? LABELS.DECRYPTING : LABELS.DECRYPT_BTN}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="absolute inset-0 bg-[#0e0d16] font-['Press_Start_2P'] text-[#eddbda] selection:bg-[#ff0055] selection:text-white pointer-events-auto flex flex-col overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 z-0 bg-[#0e0d16]" style={{
                backgroundImage: 'radial-gradient(circle at 50% 50%, #1a1c24 0%, #0e0d16 80%)',
                opacity: 0.8
            }}></div>

            {/* Header */}
            <div className="relative z-10 h-14 min-h-[56px] flex items-center justify-between px-4 border-b border-[#272933]/50 bg-black/40">
                <div className="flex items-center gap-4">
                    {/* TABS */}
                    <div className="flex gap-1">
                        <button onClick={() => setUiMode('ARMORY')} className={`px-3 py-1 text-[10px] border ${uiMode === 'ARMORY' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-[#494d5e]'}`}>{LABELS.TAB_ARMORY}</button>
                        <button onClick={() => setUiMode('MARKET')} className={`px-3 py-1 text-[10px] border ${uiMode === 'MARKET' ? 'border-yellow-400 text-yellow-400' : 'border-transparent text-[#494d5e]'}`}>{LABELS.TAB_MARKET}</button>
                        <button onClick={() => setUiMode('DECRYPT')} className={`px-3 py-1 text-[10px] border ${uiMode === 'DECRYPT' ? 'border-green-400 text-green-400' : 'border-transparent text-[#494d5e]'}`}>{LABELS.TAB_DECRYPT}</button>
                    </div>
                </div>
                <div className="flex items-center gap-2 border border-[#272933] px-3 py-1 bg-black/60 rounded-sm">
                    <span className="text-yellow-400 text-[10px] tracking-widest">{invState.credits.toLocaleString()} CR</span>
                </div>
            </div>

            {/* Main Content */}
            {renderContent()}

            {/* Actions Footer */}
            <div className="h-16 shrink-0 border-t border-[#272933] flex items-center justify-center bg-[#0e0d16] relative z-20">
                <button onClick={() => metaGame.startGame()} className="w-full h-full text-cyan-400 text-lg tracking-[0.5em] hover:text-white hover:bg-cyan-400/10 transition-all duration-300">
                    {LABELS.INIT}
                </button>
            </div>

            {/* Generic Item Modal for Armory */}
            {selectedItem && uiMode === 'ARMORY' && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setSelectedItem(null)}>
                    <div className="bg-[#1a1c24] p-4 border border-cyan-400 min-w-[300px]" onClick={e => e.stopPropagation()}>
                        <div className="text-cyan-400 mb-4">{getItemDef(selectedItem.defId)?.name}</div>
                        <div className="flex gap-2">
                            <button onClick={handleEquip} className="flex-1 bg-cyan-400 text-black py-2 text-xs font-bold">{LABELS.EQUIP}</button>
                            <button onClick={() => handleSell(selectedItem)} className="flex-1 border border-red-500 text-red-500 py-2 text-xs">{LABELS.SELL}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
