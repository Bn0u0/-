import React from 'react';
import { TechPanel } from './TechPanel';
import { UserProfile } from '../services/PersistenceService';

interface HideoutProps {
    profile: UserProfile;
    onDeploy: () => void;
    onBack: () => void;
}

export const Hideout: React.FC<HideoutProps> = ({ profile, onDeploy, onBack }) => {
    return (
        <div className="w-full h-full p-4 md:p-8 flex flex-col gap-4">

            {/* Header / Stats Bar */}
            <div className="flex justify-between items-center text-[#00FFFF] tracking-widest text-sm uppercase">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="hover:text-white transition-colors">
                        ◀ BACK
                    </button>
                    <div>指揮官: COMMANDER</div>
                </div>
                <div className="flex gap-4">
                    <span>等級.{profile.level}</span>
                    <span className="text-[#FFD700]">{profile.credits} 信用點</span>
                </div>
            </div>

            {/* Main Grid: 2 Columns */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0">

                {/* LEFT: Profile / Loadout */}
                <TechPanel title="幹員狀態" className="flex flex-col gap-6">
                    <div className="flex-1 flex items-center justify-center border border-[#ffffff10] bg-[#00000030]">
                        {/* Placeholder for Character Art */}
                        <div className="text-[#00FFFF] opacity-50 text-6xl">
                            {/* Insert SVG or Image here */}
                            [影像]
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <div className="text-xs text-gray-400 mb-1">職業</div>
                            <div className="text-2xl font-bold">{profile.loadout.weapon}</div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-400 mb-1">遺物</div>
                            <div className="text-xl text-[#FFD700]">{profile.loadout.artifact}</div>
                        </div>
                    </div>
                </TechPanel>

                {/* RIGHT: Inventory / Stash */}
                <TechPanel title="軍械庫" className="overflow-y-auto">
                    <div className="grid grid-cols-4 gap-3">
                        {/* Generate some fake slots if inventory empty */}
                        {Array.from({ length: 16 }).map((_, i) => {
                            const item = profile.inventory[i];
                            return (
                                <div
                                    key={i}
                                    className={`aspect-square border border-[#ffffff20] flex items-center justify-center cursor-pointer hover:bg-[#ffffff10] transition-colors ${item ? 'bg-[#00FFFF20] border-[#00FFFF]' : ''}`}
                                >
                                    {item || <span className="text-[#ffffff10] text-xs">{i + 1}</span>}
                                </div>
                            );
                        })}
                    </div>
                </TechPanel>
            </div>

            {/* Bottom: DEPLOY Button */}
            <div className="flex justify-center pb-4">
                <button
                    className="tech-btn w-full max-w-md h-16 text-xl tracking-[0.2em] hover:bg-[#00FFFF20]"
                    onClick={onDeploy}
                >
                    開始作戰部署
                </button>
            </div>
        </div>
    );
};
