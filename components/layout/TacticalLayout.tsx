import React, { ReactNode, useEffect, useState } from 'react';
import { inventoryService } from '../../services/InventoryService';
import { languageService, Language } from '../../services/LanguageService';

interface TacticalLayoutProps {
    children: ReactNode;
}

export const TacticalLayout: React.FC<TacticalLayoutProps> = ({ children }) => {
    const [profile, setProfile] = useState(inventoryService.getState());
    const [lang, setLang] = useState<Language>(languageService.current);

    useEffect(() => {
        // Subscribe to Inventory
        const unsubInv = inventoryService.subscribe((p) => setProfile({ ...p }));
        // Subscribe to Language
        const unsubLang = languageService.subscribe((l) => setLang(l));

        return () => {
            unsubInv();
            unsubLang();
        };
    }, []);

    // Helper
    const t = (key: any) => languageService.t(key);

    return (
        <div className="w-full h-screen bg-amber-bg font-mono text-amber-neon overflow-hidden relative selection:bg-glitch-pink selection:text-white">
            {/* CRT Scanline Overlay */}
            <div className="absolute inset-0 z-50 crt-overlay pointer-events-none opacity-20 animate-scanline"></div>

            {/* Top Status Bar */}
            <header className="h-16 border-b-2 border-amber-dim/50 flex justify-between items-center px-6 bg-amber-dark/80 backdrop-blur z-40 relative">
                <div className="flex items-center gap-4">
                    <div className="w-3 h-3 bg-glitch-cyan animate-pulse rounded-full"></div>
                    <div className="text-2xl tracking-[0.2em] font-bold glitch-text">{t('PROJECT_TITLE')}</div>
                </div>

                <div className="flex gap-8 text-xl tracking-widest items-center">
                    {/* Language Switcher */}
                    <button
                        onClick={() => languageService.toggle()}
                        className="px-3 py-1 border border-amber-dim/50 text-sm hover:border-amber-neon hover:text-amber-neon transition-colors"
                    >
                        [{lang}]
                    </button>

                    <div className="flex items-center gap-2">
                        <span className="text-amber-dim text-sm">OPERATOR:</span>
                        <span className="font-bold">{profile.id}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-amber-dim text-sm">{t('CREDITS')}:</span>
                        <span className="text-glitch-cyan drop-shadow-[0_0_5px_rgba(0,255,255,0.5)]">
                            {profile.credits.toLocaleString()}
                        </span>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="relative z-30 w-full h-[calc(100vh-4rem)]">
                {children}
            </main>

            {/* Ambient Noise / Vignette */}
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,#000000_100%)] opacity-40 z-20"></div>
        </div>
    );
};
