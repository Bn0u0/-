import { createClient } from '@supabase/supabase-js';

// 請在 .env 檔案或這裡直接填入你的 Supabase 專案資訊
// 請在 .env 檔案或這裡直接填入你的 Supabase 專案資訊
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
    console.warn('⚠️ [Supabase] Missing Env Vars (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY). Cloud features will fail.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Helper to check current session
export const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
};

// 輔助函式：取得當前用戶 ID
export const getCurrentUserId = async () => {
    const user = await getCurrentUser();
    return user?.id;
};
