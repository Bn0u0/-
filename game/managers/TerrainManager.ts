import Phaser from 'phaser';
import { MainScene } from '../scenes/MainScene';
import { COLORS } from '../../constants';

// 2.5D Tiling System
export enum TileType {
    VOID = 0,   // Pit (Fall and die)
    GROUND = 1, // Walkable
    WALL = 2,   // Blocker
    BRIDGE = 3  // Hard Light Bridge
}

export interface TileData {
    x: number; // Grid X
    y: number; // Grid Y
    type: TileType;
    height: number; // Visual height for 2.5D
    instance?: Phaser.GameObjects.Graphics;
    body?: Phaser.Physics.Arcade.Body;
}

export class TerrainManager {
    private scene: MainScene;
    private tileSize: number = 64;
    private worldWidth: number = 0;
    private worldHeight: number = 0;
    private tiles: Map<string, TileData> = new Map();
    public wallGroup: Phaser.GameObjects.Group;
    public voidGroup: Phaser.GameObjects.Group; // For falling logic

    constructor(scene: MainScene) {
        this.scene = scene;
        this.wallGroup = scene.add.group();
        this.voidGroup = scene.add.group();
    }

    /**
     * Generates a "Flat Arena" map.
     * Simple 50x50 grid with boundary walls.
     */
    generateWorld(cols: number = 50, rows: number = 50) {
        this.worldWidth = cols * this.tileSize;
        this.worldHeight = rows * this.tileSize;

        // Simple nested loop
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                // Determine Type
                let type = TileType.GROUND;

                // Boundary Walls
                if (x === 0 || x === cols - 1 || y === 0 || y === rows - 1) {
                    type = TileType.WALL;
                }

                // Create
                this.createTile(x, y, type, type === TileType.WALL ? 64 : 0);
            }
        }

        // Physics
        this.scene.time.delayedCall(100, () => {
            if (this.scene['myUnit']) this.scene.physics.add.collider(this.scene['myUnit'], this.wallGroup);
            // Enemies collide with walls
            if (this.scene['enemyGroup']) this.scene.physics.add.collider(this.scene['enemyGroup'], this.wallGroup);
            // Projectiles destroy on walls
            if (this.scene['projectileGroup']) {
                this.scene.physics.add.collider(this.scene['projectileGroup'], this.wallGroup, (p: any) => p.destroy());
            }
        });
    }

    // Removed: carveRoom, smoothMap (Simplified for V5.3)

    createTile(gridX: number, gridY: number, type: TileType, height: number) {
        const key = `${gridX},${gridY}`;
        const worldX = gridX * this.tileSize;
        const worldY = gridY * this.tileSize;

        const tile: TileData = { x: gridX, y: gridY, type, height };
        const g = this.scene.add.graphics();
        this.scene.add.existing(g);

        // -- NEON GLITCH PALETTE --
        const COL_GROUND = 0x1a0b2e; // Deep Void Purple
        const COL_HEX = 0x432c7a;    // Neon Violet Grid
        const COL_WALL_SIDE = 0x0f0518; // Obsidian
        const COL_WALL_TOP = 0x2d1b4e;  // Dark Crystal
        const COL_GLOW = 0x00ff9d;      // Cyber Green Glow
        const COL_DECOR = 0x5d2c7a;     // Debris Color

        if (type === TileType.GROUND) {
            // 1. Base Ground
            g.fillStyle(COL_GROUND, 1);
            g.fillRect(worldX, worldY, this.tileSize, this.tileSize);

            // 2. Soft Hexagon Pattern (Grid)
            g.lineStyle(2, COL_HEX, 0.15); // Faint
            const cx = worldX + this.tileSize / 2;
            const cy = worldY + this.tileSize / 2;
            const r = this.tileSize / 2.5;
            this.drawHex(g, cx, cy, r);

            // 3. TASK_VF_003: Decoration Scatter (Debris)
            if (Math.random() < 0.25) { // 25% chance
                const shards = Math.floor(Math.random() * 3) + 1;
                g.fillStyle(COL_DECOR, 0.4);
                for (let i = 0; i < shards; i++) {
                    const sx = worldX + Math.random() * this.tileSize;
                    const sy = worldY + Math.random() * this.tileSize;
                    const size = Math.random() * 6 + 2;
                    g.fillRect(sx, sy, size, size); // Pixel shards
                }
            }

            // 4. Glitch Dots (Rare)
            if (Math.random() < 0.05) {
                g.fillStyle(COL_GLOW, 0.6);
                g.fillRect(worldX + Math.random() * 60, worldY + Math.random() * 60, 4, 4);
            }

            g.setDepth(-10);
        } else if (type === TileType.WALL) {
            // "Digital Monolith" Style

            // Side (Darkness)
            g.fillStyle(COL_WALL_SIDE, 1);
            g.fillRect(worldX, worldY + this.tileSize, this.tileSize, height);

            // Top (Matte)
            g.fillStyle(COL_WALL_TOP, 1);
            g.fillRect(worldX, worldY - height, this.tileSize, this.tileSize + height);

            // Neon Edge (Top Highlight)
            g.fillStyle(COL_HEX, 1);
            g.fillRect(worldX, worldY - height, this.tileSize, 4); // Top strip

            // Glitch Lines on Wall
            if (Math.random() < 0.3) {
                g.fillStyle(COL_GLOW, 0.3);
                g.fillRect(worldX + 10, worldY - height + 20 + Math.random() * 20, 2, 10);
                g.fillRect(worldX + 20, worldY - height + 40, 20, 2);
            }

            // Physics Body
            const zone = this.scene.add.zone(worldX + 32, worldY + 32, this.tileSize, this.tileSize);
            this.scene.physics.add.existing(zone, true);
            this.wallGroup.add(zone);
            tile.body = zone.body as Phaser.Physics.Arcade.Body;

            g.setDepth(worldY + this.tileSize); // Y-Sort
        }

        tile.instance = g;
        this.tiles.set(key, tile);
    }

    private drawHex(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number) {
        const points: { x: number, y: number }[] = [];
        for (let i = 0; i < 6; i++) {
            const rad = (60 * i) * (Math.PI / 180);
            points.push({ x: x + r * Math.cos(rad), y: y + r * Math.sin(rad) });
        }
        g.beginPath();
        g.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < 6; i++) g.lineTo(points[i].x, points[i].y);
        g.closePath();
        g.strokePath();
    }

    getRandomGroundTile(): { x: number, y: number } | null {
        const candidates: { x: number, y: number }[] = [];
        this.tiles.forEach(t => {
            if (t.type === TileType.GROUND) candidates.push({ x: t.x * this.tileSize + 32, y: t.y * this.tileSize + 32 });
        });
        if (candidates.length === 0) return null;
        return candidates[Math.floor(Math.random() * candidates.length)];
    }
}
