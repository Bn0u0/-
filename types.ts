// [REFACTORED] Tier 1 & Tier 2 Class Structure
export type PlayerClassID =
  // Tier 1 (Base)
  | 'SCAVENGER' | 'RANGER' | 'WEAVER'
  // Tier 2 (Advanced)
  | 'RONIN' | 'SPECTRE' | 'RAIDER'
  | 'GUNNER' | 'HUNTER' | 'TRAPPER'
  | 'ARCHITECT' | 'WITCH' | 'MEDIC';

// ----------------------
// 1. 詞條系統 (Affix System)
// ----------------------
export type ModifierType = 'PREFIX' | 'SUFFIX';

export interface ItemModifier {
  id: string;
  name: string;      // 顯示名稱 (e.g. "生鏽的")
  type: ModifierType;
  tier: number;      // 詞條等級 (T0 詞條只會出現在 T0 武器上)

  // 數值修正
  stats: {
    damageMult?: number;   // 1.1 = +10%
    speedMult?: number;
    fireRateMult?: number; // 0.8 = +20% faster (delay * 0.8)
    critAdd?: number;      // 0.05 = +5%
    rangeAdd?: number;
  };

  // 視覺修正 (Amber-Glitch Style)
  visuals?: {
    textColor?: string;    // 詞條名稱顏色
    glowColor?: number;    // 武器發光色
    effectTag?: string;    // 特效標籤 (e.g. "BURN", "GLITCH")
  };
}

// ----------------------
// 2. 物品定義 (Static Definition)
// ----------------------
export type ItemType = 'WEAPON' | 'ARMOR' | 'MATERIAL' | 'ARTIFACT';
export interface ItemDef {
  id: string;
  name: string;
  tier: 0 | 1 | 2 | 3 | 4 | 5;
  type: ItemType;

  // [NEW] Behavior for WeaponSystem
  behavior?: 'MELEE_SWEEP' | 'HOMING_ORB' | 'SHOCKWAVE' | 'LASER' | 'BOOMERANG' | 'PISTOL_SHOT' | 'DRONE_BEAM';

  // 基礎數值
  baseStats: {
    damage: number;
    range: number;
    fireRate: number;
    critChance?: number;
    speed?: number; // Added speed for projectile weapons
    knockback?: number; // [NEW] Impact force
  };

  // [NEW] 共生相性 (Symbiosis)
  affinity?: {
    classes: string[]; // 支援的職業 ID
    bonusStats: any;
  };

  // [NEW] 裝備需求
  requirements?: {
    requiredClass?: string[]; // PlayerClassID[]
    minLevel?: number;
  };

  icon?: string;
  description?: string; // Added description for UI
  rarity?: string; // Compat
  color?: string; // Compat
  stats?: any; // Compat for legacy code transition if needed, but trying to move away
}

// ----------------------
// 3. 物品實體 (Dynamic Instance)
// ----------------------
export interface ItemInstance {
  uid: string;       // 唯一識別碼 (UUID)
  defId: string;     // 原始定義 ID

  // 隨機骰出的詞條
  prefix?: ItemModifier;
  suffix?: ItemModifier;

  // 最終計算數值 (Base * Modifiers)
  computedStats: {
    damage: number;
    range: number;
    fireRate: number;
    critChance: number;
    speed?: number;
  };

  displayName: string; // "生鏽的 鐵管步槍 之 故障"
  name: string; // "鐵管步槍" (Original Name)
  rarity: ItemRarity; // Cached for UI ease
}

export type NetworkPacket =
  | { type: 'START_MATCH', payload: { mode: string, hero: string } }
  | { type: 'INPUT', payload: { x: number, y: number } }
  | { type: 'STATE', payload: any }
  | { type: 'GAME_OVER', payload: any };

export interface JoystickData {
  x: number;
  y: number;
  angle: number;
  force: number;
}

export interface GameStats {
  hp: number;
  maxHp: number;
  level: number;
  xp: number;
  xpToNextLevel: number;
  score: number;
  wave: number;     // Current Wave number
  enemiesAlive: number; // For clearing condition
  survivalTime?: number; // Total seconds survived
}

// ----------------------
// 4. Enums & Helpers
// ----------------------
export enum ItemRarity {
  COMMON = 'COMMON',
  UNCOMMON = 'UNCOMMON',
  RARE = 'RARE',
  EPIC = 'EPIC',
  LEGENDARY = 'LEGENDARY',
  GLITCH = 'GLITCH',
  MYTHIC = 'MYTHIC' // Compat
}

export interface ItemStats {
  hp?: number;
  shield?: number;
  atk?: number;
  speed?: number;
  cdr?: number;
  crit?: number;
  luck?: number;
}

// [OPERATION DUAL-TRACK] Economy Definitions
export interface Loadout {
  mainWeapon: ItemInstance | null; // Primary Weapon (Growable)
  module_1: ItemInstance | null;   // Active Skill / Passive
  module_2: ItemInstance | null;
}

export interface Backpack {
  slots: (ItemInstance | null)[]; // Fixed size array (e.g. 6)
  capacity: number;
}

export interface PlayerProfile {
  id: string;
  credits: number;
  loadout: Loadout;   // Risk: Damaged on Death
  backpack: Backpack; // Risk: Lost on Death
  stash: ItemInstance[]; // Safe: Banked
}