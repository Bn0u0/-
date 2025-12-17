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
     * Generates a "Fractured Sector" map.
     * Use a fixed size (e.g. 50x50 tiles = 3200x3200 world).
     * Algorithm: Cellular Automata or Room Growth.
     */
    generateWorld(cols: number = 50, rows: number = 50) {
        this.worldWidth = cols * this.tileSize;
        this.worldHeight = rows * this.tileSize;

        // 1. Initialize to VOID
        let grid: TileType[][] = [];
        for (let y = 0; y < rows; y++) {
            grid[y] = [];
            for (let x = 0; x < cols; x++) {
                grid[y][x] = TileType.VOID;
            }
        }

        // 2. Create "Data Islands" (Rooms)
        const rooms = 8;
        for (let i = 0; i < rooms; i++) {
            const w = Math.floor(6 + Math.random() * 8); // 6-14 width
            const h = Math.floor(6 + Math.random() * 8);
            const x = Math.floor(2 + Math.random() * (cols - w - 4));
            const y = Math.floor(2 + Math.random() * (rows - h - 4));

            this.carveRoom(grid, x, y, w, h);

            // Connect previous center to this center (Corridors/Bridges)
            if (i > 0) {
                // Simple L-shape corridor
                // We could make these "Bridges" later
            }
        }

        // 3. Simple Cellular Automata for "Ruins" shape in the middle
        // Fill center 60% with random ground/wall
        const centerPadding = 5;
        for (let y = centerPadding; y < rows - centerPadding; y++) {
            for (let x = centerPadding; x < cols - centerPadding; x++) {
                // If it's VOID, maybe spawn land
                if (grid[y][x] === TileType.VOID) {
                    if (Math.random() < 0.45) grid[y][x] = TileType.GROUND;
                }
            }
        }

        // 4. Smoothing (Connect islands)
        for (let k = 0; k < 4; k++) {
            grid = this.smoothMap(grid, cols, rows);
        }

        // 5. Border Walls (Safety rails) - ensure edges are VOID but buffered by WALL?
        // Actually, HLD lets you fall. So Voids are open.
        // But we want obstacles.

        // 6. Instantiate
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                // Determine actual type based on grid
                // If neighbor is ground and self is void -> Edge Logic?

                const type = grid[y][x];
                if (type !== TileType.VOID) {
                    // Random obstacles on Ground
                    let finalType = type;
                    if (type === TileType.GROUND && Math.random() < 0.1) {
                        finalType = TileType.WALL;
                    }
                    this.createTile(x, y, finalType, finalType === TileType.WALL ? 40 + Math.random() * 20 : 0);
                }
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

    private carveRoom(grid: TileType[][], x: number, y: number, w: number, h: number) {
        for (let iy = y; iy < y + h; iy++) {
            for (let ix = x; ix < x + w; ix++) {
                grid[iy][ix] = TileType.GROUND;
            }
        }
    }

    private smoothMap(grid: TileType[][], cols: number, rows: number): TileType[][] {
        const next = JSON.parse(JSON.stringify(grid));
        for (let y = 1; y < rows - 1; y++) {
            for (let x = 1; x < cols - 1; x++) {
                let neighbors = 0;
                for (let ny = y - 1; ny <= y + 1; ny++) {
                    for (let nx = x - 1; nx <= x + 1; nx++) {
                        if (grid[ny][nx] !== TileType.VOID) neighbors++;
                    }
                }
                // If grounded neighbors > 4, become ground
                if (neighbors > 4) next[y][x] = TileType.GROUND;
                else if (neighbors < 4) next[y][x] = TileType.VOID;
            }
        }
        return next;
    }

    createTile(gridX: number, gridY: number, type: TileType, height: number) {
        const key = `${gridX},${gridY}`;
        const worldX = gridX * this.tileSize;
        const worldY = gridY * this.tileSize;

        const tile: TileData = { x: gridX, y: gridY, type, height };
        const g = this.scene.add.graphics();
        this.scene.add.existing(g);

        if (type === TileType.GROUND) {
            // Floor
            g.fillStyle(0x1a1c24, 1);
            g.fillRect(worldX, worldY, this.tileSize, this.tileSize);

            // Tech Detail (Circuit Lines)
            if (Math.random() < 0.2) {
                g.lineStyle(2, 0x272933, 0.5);
                g.strokeRect(worldX + 10, worldY + 10, this.tileSize - 20, this.tileSize - 20);
            }
            // Scorch Marks (10%)
            if (Math.random() < 0.1) {
                g.fillStyle(0x000000, 0.4);
                g.fillCircle(worldX + 32, worldY + 32, 10 + Math.random() * 10);
            }

            g.setDepth(-10);
        } else if (type === TileType.WALL) {
            // 2.5D Tech Block
            // Side
            g.fillStyle(0x0e0d16, 1);
            g.fillRect(worldX, worldY + this.tileSize, this.tileSize, height); // Fake depth

            // Top
            g.fillStyle(0x272933, 1);
            g.fillRect(worldX, worldY - height, this.tileSize, this.tileSize + height);

            // Highlight Edge
            g.lineStyle(2, 0x54fcfc, 0.3); // Cyan glow edge
            g.strokeRect(worldX, worldY - height, this.tileSize, this.tileSize + height);

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

    getRandomGroundTile(): { x: number, y: number } | null {
        const candidates: { x: number, y: number }[] = [];
        this.tiles.forEach(t => {
            if (t.type === TileType.GROUND) candidates.push({ x: t.x * this.tileSize + 32, y: t.y * this.tileSize + 32 });
        });
        if (candidates.length === 0) return null;
        return candidates[Math.floor(Math.random() * candidates.length)];
    }
}
