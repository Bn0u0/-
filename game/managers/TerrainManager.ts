import Phaser from 'phaser';
import { MainScene } from '../scenes/MainScene';
import { COLORS } from '../../constants';
import { MapGenerator, TILE_FLOOR, TILE_WALL, TILE_VOID } from '../generators/MapGenerator';
import { GAME_LAYER } from '../constants/Depth';

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
    public clutterGroup: Phaser.GameObjects.Group;

    constructor(scene: MainScene) {
        this.scene = scene;
        this.wallGroup = scene.add.group();
        this.voidGroup = scene.add.group();
        this.clutterGroup = scene.add.group();
    }

    /**
     * Generates a "Pandora" map using WFC-lite.
     */
    generateWorld(cols: number = 50, rows: number = 50) {
        this.worldWidth = cols * this.tileSize;
        this.worldHeight = rows * this.tileSize;

        const seed = Date.now().toString(); // Or "Fort Knox" constant seed
        const generator = new MapGenerator(cols, rows, seed);
        const grid = generator.generate();

        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const val = grid[y][x];
                let type = TileType.VOID;

                if (val === TILE_FLOOR) type = TileType.GROUND;
                // else if (val === TILE_WALL) type = TileType.WALL; // REMOVED

                if (type === TileType.GROUND) {
                    this.createTile(x, y, type, 0);
                }
            }
        }

        this.scatterClutter();

        // Physics
        this.scene.time.delayedCall(100, () => {
            // Walls removed per user request
        });
    }

    createTile(gridX: number, gridY: number, type: TileType, height: number) {
        const key = `${gridX},${gridY}`;
        const worldX = gridX * this.tileSize;
        const worldY = gridY * this.tileSize;

        const tile: TileData = { x: gridX, y: gridY, type, height };
        const g = this.scene.add.graphics();
        this.scene.add.existing(g);

        // -- NEON GLITCH PALETTE --
        // -- NEON GLITCH PALETTE [REVISED] --
        const COL_GROUND = 0x111111; // Dark Asphalt (Not Purple)
        const COL_HEX = 0x00FFCC;    // Cyber Cyan Grid (High Contrast)
        const COL_WALL_SIDE = 0x0f0518; // Obsidian
        const COL_WALL_TOP = 0x222222;  // Dark Grey
        const COL_GLOW = 0x00ff9d;      // Cyber Green Glow
        const COL_DECOR = 0x555555;     // Industrial Grey


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

            // 3. TASK_VF_003: Decoration Scatter (Debris) - [FIX] Reduced Density
            if (Math.random() < 0.05) { // Reduced to 5%
                const shards = Math.floor(Math.random() * 2) + 1;
                g.fillStyle(COL_DECOR, 0.4);
                for (let i = 0; i < shards; i++) {
                    const sx = worldX + Math.random() * this.tileSize;
                    const sy = worldY + Math.random() * this.tileSize;
                    const size = Math.random() * 6 + 2;
                    g.fillRect(sx, sy, size, size); // Pixel shards
                }
            }

            // 4. Glitch Dots (Rare) - [FIX] Reduced Density
            if (Math.random() < 0.01) { // Reduced to 1%
                g.fillStyle(COL_GLOW, 0.6);
                g.fillRect(worldX + Math.random() * 60, worldY + Math.random() * 60, 4, 4);
            }

            g.setDepth(GAME_LAYER.GROUND);
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

    private scatterClutter() {
        const textures = ['clutter_can', 'clutter_wire', 'clutter_tire'];
        this.tiles.forEach(tile => {
            if (Math.random() < 0.005) { // [FIX] Reduced to 0.5% (Very Rare)
                const tex = textures[Math.floor(Math.random() * textures.length)];

                // Random offset within tile
                const x = tile.x * this.tileSize + Math.random() * 40 + 12;
                const y = tile.y * this.tileSize + Math.random() * 40 + 12;

                const clutter = this.scene.add.image(x, y, tex);
                clutter.setRotation(Math.random() * Math.PI * 2);
                clutter.setPipeline('Light2D'); // React to lights
                clutter.setDepth(GAME_LAYER.CLUTTER); // [FIX] Depth 1 ensure it is visually ON FLOOR

                this.clutterGroup.add(clutter);
            }
        });
    }
}
