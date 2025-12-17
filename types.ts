
export interface NetworkPacket {
  type: string;
  payload?: any;
}

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

export enum UpgradeType {
  TETHER_LENGTH = 'TETHER_LENGTH',
  DRONE_SPEED = 'DRONE_SPEED',
  PLAYER_SPEED = 'PLAYER_SPEED',
  REPAIR = 'REPAIR'
}

export interface UpgradeOption {
  type: UpgradeType;
  title: string;
  description: string;
  color: string;
}

// Pre-translate these for the main app usage
export const UPGRADE_POOL_DATA: UpgradeOption[] = [
  { type: UpgradeType.TETHER_LENGTH, title: '量子連結擴充', description: '連結長度 +30%', color: 'from-cyan-400 to-blue-500' },
  { type: UpgradeType.DRONE_SPEED, title: '無人機超頻', description: '無人機速度 +30%', color: 'from-pink-400 to-rose-500' },
  { type: UpgradeType.PLAYER_SPEED, title: '慣性阻尼器', description: '飛船推力 +25%', color: 'from-yellow-400 to-orange-500' },
  { type: UpgradeType.REPAIR, title: '奈米修復', description: '修復 40% 結構完整度', color: 'from-green-400 to-emerald-500' },
];