import React from 'react';
import { TechPanel } from './TechPanel';
import { UserProfile, persistence } from '../services/PersistenceService';

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

                        {/* Neural Bind (Supabase) */}
                        <div className="pt-4 border-t border-[#ffffff10]">
                            <p className="text-[10px] text-gray-500 mb-2 uppercase tracking-widest">
                                神經頻段狀態: {profile.username === 'Guest' ? '未綁定' : '已同步 (' + profile.username + ')'}
                            </p>
                            <div className="flex gap-2">
                                <input
                                    type="email"
                                    placeholder="輸入 Email 綁定"
                                    className="bg-black/40 border border-[#00FFFF30] text-[#00FFFF] text-xs px-2 py-1 flex-1 focus:outline-none focus:border-[#00FFFF]"
                                    id="neural-email"
                                />
                                <button
                                    onClick={async () => {
                                        const email = (document.getElementById('neural-email') as HTMLInputElement).value;
                                        if (!email) return;
                                        const res = await persistence.bindEmail(email);
                                        alert(res.msg);
                                    }}
                                    className="bg-[#00FFFF20] border border-[#00FFFF] text-[#00FFFF] text-[10px] px-3 py-1 font-bold hover:bg-[#00FFFF] hover:text-black transition-colors"
                                >
                                    綁定神經連結
                                </button>
                            </div>
                        </div>
                    </div>
                </TechPanel>

                {/* RIGHT: Inventory / Stash */}
                <TechPanel title="軍械庫 (點擊以送禮)" className="overflow-y-auto">
                    <div className="grid grid-cols-4 gap-3">
                        {/* Display up to 20 slots */}
                        {Array.from({ length: 20 }).map((_, i) => {
                            const item = profile.inventory[i];
                            // Determine Rarity Color
                            let borderColor = '#ffffff20';
                            let bgColor = 'transparent';
                            if (item && item.rarity) {
                                if (item.rarity === 'COMMON') borderColor = '#ffffff';
                                if (item.rarity === 'RARE') { borderColor = '#00FF00'; bgColor = '#00FF0010'; }
                                if (item.rarity === 'LEGENDARY') { borderColor = '#FFAA00'; bgColor = '#FFAA0010'; }
                                if (item.rarity === 'MYTHIC') { borderColor = '#FF00FF'; bgColor = '#FF00FF10'; }
                            }

                            return (
                                <div
                                    key={i}
                                    className={`relative aspect-square border flex flex-col items-center justify-center cursor-pointer hover:bg-[#ffffff10] transition-colors`}
                                    style={{ borderColor: borderColor, backgroundColor: bgColor }}
                                    onClick={() => {
                                        if (item) {
                                            const code = persistence.generateGiftCode(item);
                                            alert(`🎁 武器禮物碼已生成！\n將此代碼分享給您的戰友：\n\n${code}`);
                                            navigator.clipboard.writeText(window.location.origin + '?gift=' + code);
                                        }
                                    }}
                                >
                                    {item ? (
                                        <>
                                            <div className="text-[10px] font-bold text-center leading-tight px-1">{item.name}</div>
                                            <div className="text-[8px] opacity-60 mt-1">{item.rarity}</div>
                                        </>
                                    ) : (
                                        <span className="text-[#ffffff10] text-xs">{i + 1}</span>
                                    )}
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
