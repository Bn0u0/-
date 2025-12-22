import Phaser from 'phaser';

export interface CombatStats {
    damage: number;
    range: number; // For Proj: LifeTime? For Beam: Length
    fireRate: number;
    speed: number; // Projectile Speed
    projectileCount: number;
    spreadMod: number;
    sizeMod?: number; // Visual scale
}

export interface WeaponContext {
    scene: Phaser.Scene;
    source: { x: number, y: number, rotation: number, id?: string, isSiege?: boolean };
    target?: { x: number, y: number };
    group: Phaser.GameObjects.Group; // Projectile Group
}

export interface WeaponStrategy {
    execute(context: WeaponContext, stats: CombatStats): void;
}
