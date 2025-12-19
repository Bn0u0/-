import { EventBus } from './EventBus';

export type Language = 'EN' | 'ZH';

const DICTIONARY = {
    EN: {
        // Layout
        PROJECT_TITLE: 'PROJECT_PRISM // V.0.4',
        CREDITS: 'CREDITS',
        SHARDS: 'SHARDS',

        HIDEOUT_HEADER: 'HIDEOUT',
        DEPLOY_BUTTON: 'DEPLOY LINK',
        HOME_BTN_ARSENAL: 'ARSENAL',

        // Hideout
        ROOT_ACCESS: '// ROOT_ACCESS',
        NEURO_LINK_STATUS: 'NEURO-LINK STATUS: STABLE',
        ONLINE: 'ONLINE',
        CMD_DEPLOY: 'INITIALIZE_DEPLOY',
        SUB_DEPLOY: 'START NEW OPERATION',
        CMD_ARSENAL: 'ACCESS_ARSENAL',
        CMD_BLACK_MARKET: 'BLACK_MARKET',
        LOCKED: '[LOCKED]',
        CONFIRM_LINK: 'CONFIRM NEURO-LINK?',
        INSURANCE: 'BUY INSURANCE (-500C)',
        EXECUTE: 'EXECUTE',
        CANCEL: '[ CANCEL ]',

        // Arsenal
        STASH_HEADER: 'STASH',
        NO_ITEMS: 'NO ITEMS IN STASH',
        LOADOUT_HEADER: 'AGENT LOADOUT',
        SLOT_MAIN_WEAPON: 'MAIN_WEAPON',
        NO_WEAPON: 'NO WEAPON',
        EMERGENCY_PROTOCOL: 'EMERGENCY PROTOCOL ACTIVE',
        UNEQUIP: '[ UNEQUIP ]',
        INSPECTOR_HEADER: 'INSPECTOR',
        SELECT_ITEM: 'SELECT ITEM TO INSPECT',
        BTN_EQUIP: 'EQUIP',
        BTN_SELL: 'SELL',
        BTN_BACK: '[ ESC ] BACK',

        // Stats
        STAT_DAMAGE: 'DAMAGE',
        STAT_FIRE_RATE: 'FIRE RATE',
        STAT_RANGE: 'RANGE',
        STAT_SPEED: 'SPEED'
    },
    ZH: {
        // Layout
        PROJECT_TITLE: '稜鏡計畫 // V.0.4',
        CREDITS: '信用點',
        SHARDS: '碎片',

        HIDEOUT_HEADER: '藏身處',
        DEPLOY_BUTTON: '啟動連結',
        HOME_BTN_ARSENAL: '軍械庫',

        // Hideout
        ROOT_ACCESS: '// 根目錄權限',
        NEURO_LINK_STATUS: '神經連結狀態: 穩定',
        ONLINE: '連線中',
        CMD_DEPLOY: '初始化_出擊',
        SUB_DEPLOY: '開始新行動',
        CMD_ARSENAL: '進入_軍械庫',
        CMD_BLACK_MARKET: '黑市_交易',
        LOCKED: '[未解鎖]',
        CONFIRM_LINK: '確認神經連結?',
        INSURANCE: '購買保險 (-500C)',
        EXECUTE: '執行',
        CANCEL: '[ 取消 ]',

        // Arsenal
        STASH_HEADER: '倉庫',
        NO_ITEMS: '倉庫空無一物',
        LOADOUT_HEADER: '特工裝備',
        SLOT_MAIN_WEAPON: '主武器',
        NO_WEAPON: '無武器',
        EMERGENCY_PROTOCOL: '緊急協定已啟動',
        UNEQUIP: '[ 卸除 ]',
        INSPECTOR_HEADER: '詳細資訊',
        SELECT_ITEM: '選擇物品以檢視',
        BTN_EQUIP: '裝備',
        BTN_SELL: '販賣',
        BTN_BACK: '[ ESC ] 返回',

        // Stats
        STAT_DAMAGE: '傷害',
        STAT_FIRE_RATE: '射速',
        STAT_RANGE: '射程',
        STAT_SPEED: '彈速'
    }
};

class LanguageServiceImpl {
    private currentLang: Language = 'ZH'; // Default to Chinese as requested
    private listeners: ((lang: Language) => void)[] = [];

    public get current() {
        return this.currentLang;
    }

    public setLang(lang: Language) {
        this.currentLang = lang;
        this.emitChange();
    }

    public toggle() {
        this.currentLang = this.currentLang === 'EN' ? 'ZH' : 'EN';
        this.emitChange();
    }

    public t(key: keyof typeof DICTIONARY['EN']): string {
        return DICTIONARY[this.currentLang][key] || key;
    }

    public subscribe(callback: (lang: Language) => void) {
        this.listeners.push(callback);
        // callbacks should likely handle state sync, but standard pattern is just notify on change
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    private emitChange() {
        this.listeners.forEach(l => l(this.currentLang));
    }
}

export const languageService = new LanguageServiceImpl();
