import React, { useState, useEffect } from 'react';
import { TacticalLayout } from '../layout/TacticalLayout';
import { inventoryService } from '../../services/InventoryService';
import { ItemInstance, ItemRarity } from '../../types';
import { metaGame } from '../../services/MetaGameService';
import { languageService } from '../../services/LanguageService';

// [COLOR UTILS]
const getRarityColor = (rarity: ItemRarity) => {
    switch (rarity) {
        case ItemRarity.LEGENDARY: return 'text-glitch-pink border-glitch-pink';
        case ItemRarity.EPIC: return 'text-purple-400 border-purple-400';
        case ItemRarity.RARE: return 'text-glitch-cyan border-glitch-cyan';
        case ItemRarity.UNCOMMON: return 'text-green-400 border-green-400';
        default: return 'text-gray-400 border-gray-600';
    }
};

const ItemCard = ({ item, onClick }: { item: ItemInstance, onClick: () => void }) => (
    <div
        onClick={onClick}
        className={`relative p-2 border bg-black/40 hover:bg-white/5 cursor-pointer transition-all group ${getRarityColor(item.rarity)}`}
    >
        <div className="flex justify-between items-center">
            <span className="font-bold tracking-wider truncate">{item.displayName}</span>
            <span className="text-xs opacity-50">{item.rarity}</span>
        </div>
        <div className="text-xs mt-1 text-amber-dim group-hover:text-white truncate">
            DMG: {item.computedStats.damage} | SPD: {item.computedStats.fireRate}
        </div>
    </div>
);

const StatRow = ({ label, value, current, inverse = false }: { label: string, value: number, current?: number, inverse?: boolean }) => {
    let diff = 0;
    let diffStr = '';
    let diffColor = 'text-gray-500';

    if (current !== undefined) {
        diff = value - current;
        if (diff !== 0) {
            const isGood = inverse ? diff < 0 : diff > 0;
            // Round to 1 decimal
            const valView = Math.abs(diff) < 1 && Math.abs(diff) > 0 ? diff.toFixed(1) : Math.floor(diff);
            diffStr = diff > 0 ? `(+${valView})` : `(${valView})`;
            diffColor = isGood ? 'text-green-400' : 'text-red-400';
        }
    }

    return (
        <div className="flex justify-between border-b border-white/10 pb-1 text-sm">
            <span>{label}</span>
            <div className="font-mono flex gap-2">
                <span className="text-white">{value}</span>
                {diff !== 0 && (
                    <span className={`${diffColor} text-xs flex items-center`}>
                        {current} {'->'} {diffStr}
                    </span>
                )}
            </div>
        </div>
    );
};

export const ArsenalScreen: React.FC = () => {
    const [profile, setProfile] = useState(inventoryService.getState());
    const [selectedItem, setSelectedItem] = useState<ItemInstance | null>(null);
    const [lang, setLang] = useState(languageService.current);

    // Sync Profile
    useEffect(() => {
        const unsubInv = inventoryService.subscribe(setProfile);
        const unsubLang = languageService.subscribe(setLang);
        return () => {
            unsubInv();
            unsubLang(); // Unsubscribe language
        };
    }, []);

    const t = (key: any) => languageService.t(key);

    const handleEquip = (item: ItemInstance) => {
        // Simple swap logic for MVP
        inventoryService.equipFromStash(item.uid, 'mainWeapon');
    };

    const handleUnequip = () => {
        inventoryService.unequipToStash('mainWeapon');
    };

    return (
        <TacticalLayout>
            <div className="w-full h-full grid grid-cols-12 gap-6 p-4">

                {/* 1. STASH (Left - 3 Cols) */}
                <div className="col-span-3 flex flex-col gap-4 border-r border-amber-dim/30 pr-4">
                    <div className="text-xl font-bold tracking-widest text-amber-neon mb-2">
                        {t('STASH_HEADER')} // {profile.stash.length}
                    </div>
                    <div className="flex-1 overflow-y-auto flex flex-col gap-2 custom-scrollbar">
                        {profile.stash.map(item => (
                            <ItemCard key={item.uid} item={item} onClick={() => setSelectedItem(item)} />
                        ))}
                        {profile.stash.length === 0 && (
                            <div className="text-amber-dim text-center py-10 italic">{t('NO_ITEMS')}</div>
                        )}
                    </div>
                </div>

                {/* 2. LOADOUT (Center - 5 Cols) */}
                <div className="col-span-5 flex flex-col items-center justify-center relative">
                    {/* Header */}
                    <div className="absolute top-0 w-full text-center border-b border-amber-dim/20 pb-2">
                        <span className="text-2xl font-black tracking-[0.5em] text-white/20">{t('LOADOUT_HEADER')}</span>
                    </div>

                    {/* Main Weapon Slot */}
                    <div className="relative group">
                        <div className={`w-64 h-64 border-2 flex flex-col items-center justify-center bg-black/60 relative overflow-hidden transition-all ${profile.loadout.mainWeapon ? getRarityColor(profile.loadout.mainWeapon.rarity) : 'border-amber-dim/30 border-dashed'}`}>
                            {profile.loadout.mainWeapon ? (
                                <>
                                    <div className="text-4xl mb-4">🔫</div>
                                    <div className="font-bold tracking-widest text-center px-4">
                                        {profile.loadout.mainWeapon.displayName}
                                    </div>
                                    <button
                                        onClick={handleUnequip}
                                        className="absolute bottom-4 text-xs px-2 py-1 bg-red-900/50 hover:bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        {t('UNEQUIP')}
                                    </button>
                                </>
                            ) : (
                                <div className="text-amber-dim text-center animate-pulse">
                                    <div className="text-4xl mb-2">⚠️</div>
                                    <div>{t('NO_WEAPON')}</div>
                                    <div className="text-xs mt-1">{t('EMERGENCY_PROTOCOL')}</div>
                                </div>
                            )}
                        </div>
                        {/* Label */}
                        <div className="absolute -left-8 top-1/2 -rotate-90 text-xs tracking-widest text-amber-dim">
                            {t('SLOT_MAIN_WEAPON')}
                        </div>
                    </div>
                </div>

                {/* 3. INSPECTOR (Right - 4 Cols) */}
                <div className="col-span-4 bg-amber-dark/50 border border-amber-dim/20 p-6 flex flex-col gap-6">
                    <div className="text-xl font-bold tracking-widest text-amber-neon border-b border-amber-dim/30 pb-2">
                        {t('INSPECTOR_HEADER')}
                    </div>

                    {selectedItem ? (
                        <>
                            <div className="text-3xl font-black tracking-tighter text-white">
                                {selectedItem.displayName}
                            </div>
                            <div className={`text-sm tracking-widest font-bold ${getRarityColor(selectedItem.rarity)}`}>
                                // {selectedItem.rarity}_CLASS
                            </div>

                            <div className="flex flex-col gap-2 mt-4 text-amber-dim">
                                <StatRow
                                    label={t('STAT_DAMAGE')}
                                    value={selectedItem.computedStats.damage}
                                    current={profile.loadout.mainWeapon?.computedStats.damage}
                                />
                                <StatRow
                                    label={t('STAT_FIRE_RATE')}
                                    value={selectedItem.computedStats.fireRate}
                                    current={profile.loadout.mainWeapon?.computedStats.fireRate}
                                    inverse={true}
                                />
                                <StatRow
                                    label={t('STAT_RANGE')}
                                    value={selectedItem.computedStats.range}
                                    current={profile.loadout.mainWeapon?.computedStats.range}
                                />
                            </div>

                            {/* Actions */}
                            <div className="mt-auto flex gap-2">
                                <button
                                    onClick={() => handleEquip(selectedItem)}
                                    className="flex-1 py-3 bg-glitch-cyan/20 border border-glitch-cyan hover:bg-glitch-cyan hover:text-black font-bold tracking-widest transition-all"
                                >
                                    {t('BTN_EQUIP')}
                                </button>
                                <button className="flex-1 py-3 border border-red-500/50 text-red-400 hover:bg-red-500 hover:text-black font-bold tracking-widest transition-all">
                                    {t('BTN_SELL')}
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="text-amber-dim italic h-full flex items-center justify-center">
                            {t('SELECT_ITEM')}
                        </div>
                    )}
                </div>

                {/* Back Button */}
                <button
                    onClick={() => metaGame.navigateTo('HIDEOUT')}
                    className="absolute top-4 right-6 px-4 py-2 border border-amber-dim hover:border-amber-neon text-amber-dim hover:text-amber-neon transition-all"
                >
                    {t('BTN_BACK')}
                </button>
            </div>
        </TacticalLayout>
    );
};
