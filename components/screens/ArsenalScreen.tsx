import React, { useState, useEffect } from 'react';
import { TacticalLayout } from '../layout/TacticalLayout';
import { inventoryService } from '../../services/InventoryService';
import { ItemInstance, ItemRarity, Loadout, EquipmentSlot } from '../../types';
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

const ItemCard = ({ item, onClick, isSelected }: { item: ItemInstance, onClick: () => void, isSelected?: boolean }) => (
    <div
        onClick={onClick}
        className={`relative p-2 border bg-black/40 hover:bg-white/5 cursor-pointer transition-all group 
        ${getRarityColor(item.rarity)} ${isSelected ? 'bg-white/10 ring-1 ring-white' : ''}`}
    >
        <div className="flex justify-between items-center">
            <span className="font-bold tracking-wider truncate text-sm">{item.displayName}</span>
            <span className="text-[10px] opacity-70 uppercase">{item.def?.slot || 'ITEM'}</span>
        </div>
        <div className="text-xs mt-1 text-amber-dim group-hover:text-white truncate flex gap-2">
            {item.computedStats.damage > 0 && <span>DMG: {item.computedStats.damage}</span>}
            {item.computedStats.defense > 0 && <span>DEF: {item.computedStats.defense}</span>}
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
            const valView = Math.abs(diff) < 1 && Math.abs(diff) > 0 ? diff.toFixed(1) : Math.floor(diff);
            diffStr = diff > 0 ? `(+${valView})` : `(${valView})`;
            diffColor = isGood ? 'text-green-400' : 'text-red-400';
        }
    }

    // Only show if relevant (has value or diff)
    if (value === 0 && (current === 0 || current === undefined)) return null;

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

// Slot Config
const SLOTS: { id: keyof Loadout, label: string, icon: string }[] = [
    { id: 'head', label: 'SLOT_HEAD', icon: '🪖' }, // Keys for trans
    { id: 'body', label: 'SLOT_BODY', icon: '🦺' },
    { id: 'legs', label: 'SLOT_LEGS', icon: '👖' },
    { id: 'feet', label: 'SLOT_FEET', icon: '🥾' },
    { id: 'mainWeapon', label: 'SLOT_MAIN_WEAPON', icon: '🔫' },
];

export const ArsenalScreen: React.FC = () => {
    const [profile, setProfile] = useState(inventoryService.getState());
    const [selectedItem, setSelectedItem] = useState<ItemInstance | null>(null);
    const [activeSlot, setActiveSlot] = useState<keyof Loadout>('mainWeapon');
    const [lang, setLang] = useState(languageService.current);

    // Sync Profile & Language
    useEffect(() => {
        const unsubInv = inventoryService.subscribe(setProfile);
        const unsubLang = languageService.subscribe(setLang);
        return () => {
            unsubInv();
            unsubLang();
        };
    }, []);

    const t = (key: any) => languageService.t(key);

    const handleEquip = (item: ItemInstance) => {
        // Equip to the slot defined by the item, or fallback to activeSlot if matches
        const targetSlot = item.def?.slot || activeSlot;

        // Safety check: Don't equip a helmet to mainWeapon
        // Cast as any because TS might complain about dynamic key access logic safety, but at runtime it's safe if slots match
        if (targetSlot !== activeSlot) {
            console.warn(`Mismatch slot: Item is ${targetSlot}, active is ${activeSlot}`);
            // Auto-switch slot? Or just reject?
            // For better UX, let's auto-equip to correct slot
            inventoryService.equipFromStash(item.uid, targetSlot as any);
            setActiveSlot(targetSlot as any);
        } else {
            inventoryService.equipFromStash(item.uid, activeSlot);
        }
        setSelectedItem(null);
    };

    const handleUnequip = (slot: keyof Loadout) => {
        inventoryService.unequipToStash(slot);
    };

    // Filter Stash by Active Slot
    const filteredStash = profile.stash.filter(item => {
        // If item.def.slot matches activeSlot
        if (!item.def?.slot) return false; // Invalid item
        return item.def.slot === activeSlot;
    });

    const currentEquipped = profile.loadout[activeSlot];

    return (
        <TacticalLayout>
            <div className="w-full h-full flex flex-col md:grid md:grid-cols-12 gap-4 md:gap-6 p-2 md:p-4 overflow-y-auto md:overflow-hidden">

                {/* 1. STASH (Mobile: Bottom Order 2 | Desktop: Left Order 1) */}
                {/* On Mobile, maybe put Stash at bottom? Or keep Top? Let's keep visually 1st for flow. 
                    Actually, usually you see Character -> Items. 
                    Let's use Order classes. Mobile: Character (1), Stash (2), Inspector (3).
                    Desktop: Stash (1), Character (2), Inspector (3).
                */}
                <div className="order-2 md:order-1 col-span-3 flex flex-col gap-4 border-b md:border-b-0 md:border-r border-amber-dim/30 pb-4 md:pb-0 md:pr-4 h-64 md:h-full shrink-0">
                    <div className="text-xl font-bold tracking-widest text-amber-neon mb-2 flex justify-between">
                        <span>{t('STASH_HEADER')} // {t(`SLOT_${activeSlot.toUpperCase()}`)}</span>
                        <span className="text-sm self-end opacity-50">{filteredStash.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto flex flex-col gap-2 custom-scrollbar bg-black/20 p-2">
                        {filteredStash.map(item => (
                            <ItemCard
                                key={item.uid}
                                item={item}
                                isSelected={selectedItem?.uid === item.uid}
                                onClick={() => setSelectedItem(item)}
                            />
                        ))}
                        {filteredStash.length === 0 && (
                            <div className="text-amber-dim text-center py-10 italic">
                                {t('NO_ITEMS')} <br /> <span className="text-xs opacity-50">{t('FOR')} {t(`SLOT_${activeSlot.toUpperCase()}`)}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. PAPER DOLL (Mobile: Top Order 1 | Desktop: Center Order 2) */}
                <div className="order-1 md:order-2 col-span-5 flex flex-col items-center relative min-h-[400px]">
                    {/* Header */}
                    <div className="w-full text-center border-b border-amber-dim/20 pb-2 mb-4 md:mb-8">
                        <span className="text-xl md:text-2xl font-black tracking-[0.5em] text-white/20">{t('LOADOUT_HEADER')}</span>
                    </div>

                    {/* Doll Layout */}
                    <div className="relative w-full h-full flex items-center justify-center">
                        {/* Humanoid Outline (Abstract) */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                            {/* Placeholder for SVG Body Outline */}
                            <div className="w-48 md:w-64 h-[80%] border border-amber-dim/30 rounded-full"></div>
                        </div>

                        {/* Slots - Compact Grid on Mobile */}
                        <div className="grid grid-cols-2 gap-x-12 gap-y-6 md:gap-x-20 md:gap-y-8 relative z-10 transform scale-90 md:scale-100">
                            {/* Head (Top Center) - Absolute positioning hack or grid tweak */}
                            <div className="col-span-2 flex justify-center pb-4 md:pb-8">
                                <SlotNode
                                    slot={t('SLOT_HEAD')}
                                    item={profile.loadout.head}
                                    icon="🪖"
                                    isActive={activeSlot === 'head'}
                                    onClick={() => setActiveSlot('head')}
                                    onUnequip={() => handleUnequip('head')}
                                />
                            </div>

                            {/* Body (Left) */}
                            <SlotNode
                                slot={t('SLOT_BODY')}
                                item={profile.loadout.body}
                                icon="🦺"
                                isActive={activeSlot === 'body'}
                                onClick={() => setActiveSlot('body')}
                                onUnequip={() => handleUnequip('body')}
                            />

                            {/* Main Weapon (Right) */}
                            <SlotNode
                                slot={t('SLOT_MAIN_WEAPON')}
                                item={profile.loadout.mainWeapon}
                                icon="🔫"
                                isActive={activeSlot === 'mainWeapon'}
                                onClick={() => setActiveSlot('mainWeapon')}
                                onUnequip={() => handleUnequip('mainWeapon')}
                            />

                            {/* Legs (Left) */}
                            <SlotNode
                                slot={t('SLOT_LEGS')}
                                item={profile.loadout.legs}
                                icon="👖"
                                isActive={activeSlot === 'legs'}
                                onClick={() => setActiveSlot('legs')}
                                onUnequip={() => handleUnequip('legs')}
                            />

                            {/* Feet (Right) */}
                            <SlotNode
                                slot={t('SLOT_FEET')}
                                item={profile.loadout.feet}
                                icon="🥾"
                                isActive={activeSlot === 'feet'}
                                onClick={() => setActiveSlot('feet')}
                                onUnequip={() => handleUnequip('feet')}
                            />
                        </div>
                    </div>
                </div>

                {/* 3. INSPECTOR (Mobile: Order 3 | Desktop: Right Order 3) */}
                <div className="order-3 col-span-4 bg-amber-dark/50 border border-amber-dim/20 p-4 md:p-6 flex flex-col gap-4 md:gap-6 min-h-[300px]">
                    <div className="text-xl font-bold tracking-widest text-amber-neon border-b border-amber-dim/30 pb-2">
                        {t('INSPECTOR_HEADER')}
                    </div>

                    {selectedItem ? (
                        <>
                            <div className="text-3xl font-black tracking-tighter text-white">
                                {selectedItem.displayName}
                            </div>
                            <div className={`text-sm tracking-widest font-bold ${getRarityColor(selectedItem.rarity)}`}>
                                // {selectedItem.rarity}_{selectedItem.def?.type}
                            </div>
                            <div className="text-xs text-justify opacity-80 font-mono my-2 text-amber-dim/80">
                                {selectedItem.def?.description}
                            </div>

                            <div className="flex flex-col gap-2 mt-4 text-amber-dim">
                                <StatRow
                                    label={t('STAT_DAMAGE')}
                                    value={selectedItem.computedStats.damage}
                                    current={currentEquipped?.computedStats.damage}
                                />
                                <StatRow
                                    label={t('STAT_DEFENSE')}
                                    value={selectedItem.computedStats.defense}
                                    current={currentEquipped?.computedStats.defense}
                                />
                                <StatRow
                                    label={t('STAT_HP_MAX')}
                                    value={selectedItem.computedStats.hpMax}
                                    current={currentEquipped?.computedStats.hpMax}
                                />
                                <StatRow
                                    label={t('STAT_CRIT')}
                                    value={(selectedItem.computedStats.critChance || 0) * 100}
                                    current={(currentEquipped?.computedStats.critChance || 0) * 100}
                                />
                                <StatRow
                                    label={t('STAT_SPEED')}
                                    value={selectedItem.computedStats.speed || 0}
                                    current={currentEquipped?.computedStats.speed || 0}
                                />
                                <StatRow
                                    label={t('STAT_FIRE_RATE')}
                                    value={selectedItem.computedStats.fireRate}
                                    current={currentEquipped?.computedStats.fireRate}
                                    inverse={true}
                                />
                            </div>

                            {/* Actions */}
                            <div className="mt-auto flex gap-2">
                                <button
                                    onClick={() => handleEquip(selectedItem)}
                                    className="flex-1 py-3 bg-glitch-cyan/20 border border-glitch-cyan hover:bg-glitch-cyan hover:text-black font-bold tracking-widest transition-all"
                                >
                                    {t('BTN_EQUIP')} {t('TO')} {t(`SLOT_${selectedItem.def?.slot?.toUpperCase()}`)}
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="text-amber-dim italic h-full flex flex-col items-center justify-center opacity-50">
                            <div className="text-4xl mb-4">🔍</div>
                            <div>{t('SELECT_ITEM')}</div>
                            <div className="text-xs mt-2">{t('FILTER_LOCKED')} {t(`SLOT_${activeSlot.toUpperCase()}`)}</div>
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

const SlotNode = ({ slot, item, icon, isActive, onClick, onUnequip }: any) => {
    return (
        <div className="flex flex-col items-center gap-2 group cursor-pointer" onClick={onClick}>
            <div className={`w-24 h-24 border-2 flex items-center justify-center bg-black/80 relative transition-all
                ${isActive ? 'border-amber-neon shadow-[0_0_15px_rgba(255,166,0,0.5)] scale-105' : 'border-amber-dim/30 hover:border-amber-dim'}
                ${item ? getRarityColor(item.rarity) : ''}
             `}>
                {item ? (
                    <div className="flex flex-col items-center">
                        <div className="text-2xl">{icon}</div> {/* Fallback Icon */}
                        <div className="text-[10px] text-center px-1 truncate w-20 leading-tight mt-1">{item.displayName}</div>
                    </div>
                ) : (
                    <div className="text-amber-dim/20 text-4xl grayscale opacity-50">{icon}</div>
                )}

                {/* Unequip Hover (Only if has item) */}
                {item && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onUnequip(); }}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-900 border border-red-500 rounded-full text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 hover:scale-110 transition-all z-20"
                    >
                        ✕
                    </button>
                )}
            </div>
            <div className={`text-xs tracking-widest font-mono ${isActive ? 'text-amber-neon' : 'text-amber-dim/50'}`}>
                {slot.toUpperCase()}
            </div>
        </div>
    );
};
