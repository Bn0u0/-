import React from 'react';
import { CardDef } from '../game/systems/CardSystem';
import { cardSystem } from '../game/systems/CardSystem';
import { EventBus } from '../services/EventBus';

interface DraftOverlayProps {
    choices: CardDef[];
    onDraftComplete: () => void;
}

export const DraftOverlay: React.FC<DraftOverlayProps> = ({ choices, onDraftComplete }) => {
    const handleSelect = (card: CardDef) => {
        cardSystem.addCard(card.id);
        // HapticService.light(); // Optional if service available in UI
        EventBus.emit('DRAFT_COMPLETE');
        onDraftComplete();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="flex flex-col items-center w-full max-w-4xl px-4">
                <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 mb-8 tracking-widest drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]">
                    SYSTEM UPGRADE
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                    {choices.map((card) => (
                        <button
                            key={card.id}
                            onClick={() => handleSelect(card)}
                            className="group relative flex flex-col items-center p-6 bg-black/60 border border-purple-500/30 hover:border-cyan-400 hover:bg-cyan-900/10 transition-all duration-300 transform hover:scale-105 hover:shadow-[0_0_30px_rgba(0,255,255,0.2)]"
                        >
                            {/* Rarity Glow */}
                            <div className={`absolute top-0 left-0 w-full h-1 ${card.rarity === 'LEGENDARY' ? 'bg-yellow-400 shadow-[0_0_15px_gold]' :
                                    card.rarity === 'RARE' ? 'bg-purple-500 shadow-[0_0_10px_purple]' :
                                        'bg-cyan-500'
                                }`} />

                            {/* Card Content */}
                            <div className="mb-4 text-cyan-300 text-sm tracking-widest uppercase opacity-70">
                                {card.rarity} MODULE
                            </div>

                            <h3 className="text-2xl font-bold text-white mb-4 text-center group-hover:text-cyan-300 transition-colors">
                                {card.name}
                            </h3>

                            <p className="text-gray-300 text-center text-sm mb-6 leading-relaxed">
                                {card.description}
                            </p>

                            <div className="mt-auto px-6 py-2 border border-cyan-500/50 text-cyan-500 text-xs font-mono tracking-[0.2em] group-hover:bg-cyan-500 group-hover:text-black transition-all">
                                INSTALL
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
