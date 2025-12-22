// [REFACTORED] Tier 1 & Tier 2 Class Structure
export type PlayerClassID = 'SCAVENGER' | 'SKIRMISHER' | 'WEAVER';

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
export type EquipmentSlot = 'mainWeapon' | 'head' | 'body' | 'legs' | 'feet';
export type ItemType = 'WEAPON' | 'ARMOR' | 'MATERIAL' | 'ARTIFACT';

export interface ItemAffinity {
  classes: PlayerClassID[];        // 適用職業列表
  bonusStats?: Partial<ItemStats>; // 相性加成 (綠字屬性)
  exclusive?: boolean;             // T5 專屬鎖 (若為 true，非名單職業不可裝備)
}

export interface ItemDef {
  id: string;
  name: string;
  tier: 0 | 1 | 2 | 3 | 4 | 5;
  type: ItemType;
  slot: EquipmentSlot;      // 明確指定槽位

  // [NEW] Behavior for WeaponSystem
  behavior?: 'MELEE_SWEEP' | 'HOMING_ORB' | 'SHOCKWAVE' | 'LASER' | 'BOOMERANG' | 'PISTOL_SHOT' | 'DRONE_BEAM';

  // [NEW] Siege Mode
  controlType?: 'AUTO' | 'HYBRID' | 'MANUAL';
  siegeBehavior?: string; // Optional description of siege effect

  projectileId?: string;

  // 基礎數值
  baseStats: ItemStats;     // 白字屬性

  // [NEW] 共生相性 (Symbiosis)
  affinity?: ItemAffinity;

  // [NEW] 裝備需求
  requirements?: {
    minLevel?: number;
    minLicense?: LicenseRank; // [NEW] License Restriction
  };

  icon?: string;
  description?: string; // Added description for UI
  rarity: string;
  color?: string; // Compat
}

// ----------------------
// 3. 物品實體 (Dynamic Instance)
// ----------------------
export type LicenseRank = 'D' | 'C' | 'B' | 'A' | 'S'; // [NEW]

export interface ItemInstance {
  uid: string;       // 唯一識別碼 (UUID)
  defId: string;     // 原始定義 ID
  def: ItemDef;      // [NEW] Direct reference for easier calculations

  // 隨機骰出的詞條
  prefix?: ItemModifier;
  suffix?: ItemModifier;

  // 最終計算數值 (Base * Modifiers)
  computedStats: ItemStats;

  displayName: string; // "生鏽的 鐵管步槍 之 故障"
  name: string; // "鐵管步槍" (Original Name)
  rarity: ItemRarity;
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
  // 攻擊系
  damage: number;
  range: number;
  fireRate: number; // ms delay
  critChance: number; // 0.0 ~ 1.0
  // 防禦系
  defense: number; // 減傷值
  hpMax: number;   // 血量上限加成
  // 機動系
  speed: number;   // 移動速度修正 (e.g., 1.1 = +10%)

  // Legacy / Generic compat
  knockback?: number;
}

// [OPERATION TITAN ARMORY] 5-Slot Loadout
export interface Loadout {
  mainWeapon: ItemInstance | null;
  head: ItemInstance | null;
  body: ItemInstance | null;
  legs: ItemInstance | null;
  feet: ItemInstance | null;
}

export interface Backpack {
  slots: (ItemInstance | null)[]; // Fixed size array (e.g. 6)
  capacity: number;
}

export type TutorialStep = 'VOID' | 'TRIAL' | 'COMPLETE';

export interface PlayerProfile {
  id: string; // [RESTORED]
  credits: number;
  inventory: string[]; // Item IDs
  stash: ItemInstance[]; // [RESTORED]
  loadout: Loadout;
  backpack: Backpack; // [RESTORED]
  tutorialStep: TutorialStep;
  trialClassId: string | null;
  unlockedClasses: string[]; // Class IDs
}

// ----------------------
// 5. Enemy System
// ----------------------
export type EnemyBehavior = 'CHASER' | 'SHOOTER' | 'TELEPORTER';

export interface EnemyDef {
  id: string;
  name: string;
  faction: 'RUSTED' | 'OVERGROWN' | 'GLITCHED';
  tier: 1 | 2 | 3; // 1=Grunt, 2=Elite, 3=Boss
  stats: {
    hp: number;
    speed: number;
    damage: number;
    attackRange: number; // Trigger attack at this distance
  };
  behavior: EnemyBehavior;
  visuals: {
    color: number; // 0xFF9900
    scale: number;
    effect?: string; // 'GLITCH_TRAIL'
  };
  // Drop rates could go here
}