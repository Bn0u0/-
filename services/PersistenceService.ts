import { supabase } from './SupabaseClient';
import { ItemInstance } from '../types';

export interface UserProfile {
    username: string;
    level: number;
    xp: number; // Added to sync with GameStats
    credits: number;
    inventory: ItemInstance[]; // Updated Type
    loadout: any;     // 你的 Loadout 定義
    hasPlayedOnce: boolean;
    stats: {
        totalKills: number;
        runsCompleted: number;
    };
}

const DEFAULT_PROFILE: UserProfile = {
    username: 'Guest',
    level: 1,
    xp: 0,
    credits: 0,
    inventory: [],
    loadout: {
        mainWeapon: {
            uid: 'default_weapon',
            defId: 'W_T1_PISTA_01',
            def: null,
            name: 'Pistol',
            rarity: 'COMMON',
            computedStats: { damage: 10 }
        },
        head: null,
        body: null,
        legs: null,
        feet: null
    },
    hasPlayedOnce: false,
    stats: { totalKills: 0, runsCompleted: 0 }
};

// [CRITICAL] ALIGN WITH InventoryService
const STORAGE_KEY = 'SYNAPSE_NEO_INVENTORY_V5';

class PersistenceService {
    private profile: UserProfile;

    constructor() {
        // 1. 先從 LocalStorage 載入 (快速啟動)
        const saved = localStorage.getItem(STORAGE_KEY);
        this.profile = saved ? JSON.parse(saved) : { ...DEFAULT_PROFILE };

        // 2. 嘗試背景登入並同步雲端
        this.initCloudSync();
    }

    // 自動匿名登入
    async initCloudSync() {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            // 如果沒登入，就匿名登入 (降低玩家門檻)
            console.log("☁️ [Cloud] Signing in anonymously...");
            const { error } = await supabase.auth.signInAnonymously();
            if (error) console.error("Cloud Error:", error);
        }

        this.syncDown();
    }

    // 取得檔案
    getProfile(): UserProfile {
        return this.profile;
    }

    // 導出存檔字串 (Backwards Compatibility for LZString / Manual Backup)
    exportSaveString(): string {
        return btoa(JSON.stringify(this.profile));
    }

    // 導入存檔字串
    importSaveString(str: string): { success: boolean, msg: string } {
        try {
            const data = JSON.parse(atob(str));
            this.profile = { ...this.profile, ...data };
            this.save({});
            return { success: true, msg: 'Profile Imported Successfully' };
        } catch (e) {
            return { success: false, msg: 'Invalid Save String' };
        }
    }

    // 存檔 (同時寫入本地與雲端)
    async save(updates: Partial<UserProfile>) {
        // A. 更新記憶體與本地
        this.profile = { ...this.profile, ...updates };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.profile));

        // B. 同步上雲 (Debounce 建議：不要每秒都傳，可在結算時呼叫)
        const user = await supabase.auth.getUser();
        if (user.data.user) {
            const { error } = await supabase
                .from('profiles')
                .upsert({
                    id: user.data.user.id,
                    updated_at: new Date(),
                    credits: this.profile.credits,
                    inventory: this.profile.inventory,
                    loadout: this.profile.loadout,
                    stats: this.profile.stats,
                    username: this.profile.username // Ensure username is synced
                });

            if (error) console.error("☁️ [Cloud] Save Failed:", error);
            else console.log("☁️ [Cloud] Saved.");
        }
    }

    // 從雲端下載最新進度
    async syncDown() {
        const user = await supabase.auth.getUser();
        if (!user.data.user) return;

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.data.user.id)
            .single();

        if (data) {
            console.log("☁️ [Cloud] Profile Synced Down");
            // 合併邏輯：通常以雲端為準，或者取 credits 較高者 (防回溯)
            this.profile = {
                ...this.profile,
                level: data.level || this.profile.level,
                credits: data.credits,
                // inventory: data.inventory, // Keep local for now? Or overwrite? 
                // Let's trust cloud for now
                inventory: data.inventory || [],
                loadout: data.loadout || this.profile.loadout,
                stats: data.stats || this.profile.stats
            };
            if (data.username) this.profile.username = data.username;

            // 更新本地快取
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.profile));
        }
    }

    // 上傳分數到排行榜 (在 GAME_OVER 時呼叫)
    async uploadScore(score: number, wave: number, survivalTime: number) {
        const user = await supabase.auth.getUser();
        if (!user.data.user) return;

        // 簡單防作弊：如果分數太誇張就不上傳 (後端還可以做更多)
        if (score > 999999) return;

        await supabase.from('leaderboard').upsert({
            id: user.data.user.id,
            username: this.profile.username,
            score: score,
            wave: wave,
            survival_time: survivalTime
        });
        console.log(`🏆 [Cloud] Score Uploaded: ${score}`);
    }

    /**
     * [LOOT] 新增物品到背包
     */
    addInventory(item: any) {
        // Simple append for now
        this.profile.inventory.push(item);
        this.save({});
        console.log("📦 [Persistence] Item Added:", item.name);
    }

    /**
     * [ACTION] 綁定神經頻段 (Bind Email)
     */
    async bindEmail(email: string) {
        const { error } = await supabase.auth.updateUser({ email: email });
        if (error) {
            console.error("❌ Bind Failed:", error.message);
            return { success: false, msg: error.message };
        }
        return { success: true, msg: '驗證頻段信號已發送，請檢查您的通訊終端 (Email) 以完成連結。' };
    }

    /**
     * [ACTION] 恢復神經連結 (Login)
     */
    async loginWithEmail(email: string) {
        const { error } = await supabase.auth.signInWithOtp({
            email: email,
            options: {
                emailRedirectTo: window.location.origin
            }
        });
        if (error) {
            console.error("❌ Login Failed:", error.message);
            return { success: false, msg: error.message };
        }
        return { success: true, msg: '神經連結密鑰已發送！請前往信箱點擊連結以同步記憶。' };
    }

    /**
     * [SYSTEM] 檢查並處理 Magic Link 回調
     */
    async handleAuthCallback() {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            console.log("🟢 [Cloud] Session Restored:", session.user.email);
            await this.syncDown();
            return true;
        }
        return false;
    }

    /**
     * [SOCIAL] 產生武器禮物碼 (Serialization)
     * 將武器物件序列化為 Base64 字串，供朋友輸入。
     */
    generateGiftCode(weapon: any): string {
        // Simple Base64 encoding for now. 
        // In production, we should sign this with a server secret to prevent cheating.
        return btoa(JSON.stringify(weapon));
    }
}

export const persistence = new PersistenceService();
