import Phaser from 'phaser';
import { MainScene } from '../scenes/MainScene';
import { COLORS } from '../../constants';

// 2.5D Tiling System
// Instead of standard Tiled, we procedurally generate a grid of "Blocks".
// Each Block has a height (z-index) and a type (Ground, Wall, Pit).

export enum TileType {
    GROUND = 0,
    WALL = 1,
    PIT = 2,
    EXTRACT = 9
}

export interface TileData {
    x: number; // Grid X
    y: number; // Grid Y
    type: TileType;
    height: number; // Visual height for 2.5D
    instance?: Phaser.GameObjects.Graphics; // Visual reference
    body?: Phaser.Physics.Arcade.Body; // Physics reference if wall
}

export class TerrainManager {
    private scene: MainScene;
    private tileSize: number = 64;
    private worldWidth: number = 0;
    private worldHeight: number = 0;
    private tiles: Map<string, TileData> = new Map();
    public wallGroup: Phaser.GameObjects.Group;

    constructor(scene: MainScene) {
        this.scene = scene;
        this.wallGroup = scene.add.group();
    }

    // Initialize world grid
    generateWorld(cols: number, rows: number) {
        this.worldWidth = cols * this.tileSize;
        this.worldHeight = rows * this.tileSize;

        // Use Simplex noise or Cellular Automata for "Toys" (Walls) layout
        // For MVP, randomly scatter "Toy Blocks" (Walls) and some "Floor Mats" (Safe zones)

        // Cellular Automata for "Geometric Cavern"
        // 1. Random Fill
        let grid: number[][] = [];
        for (let y = 0; y < rows; y++) {
            grid[y] = [];
            for (let x = 0; x < cols; x++) {
                // Edges are walls
                if (x === 0 || x === cols - 1 || y === 0 || y === rows - 1) {
                    grid[y][x] = 1;
                } else {
                    // 40% chance of wall initially
                    grid[y][x] = (Math.random() < 0.4) ? 1 : 0;
                }
            }
        }

        // 2. Smooth (5 iterations)
        for (let i = 0; i < 5; i++) {
            const nextGrid = JSON.parse(JSON.stringify(grid));
            for (let y = 1; y < rows - 1; y++) {
                for (let x = 1; x < cols - 1; x++) {
                    let neighbors = 0;
                    for (let ny = y - 1; ny <= y + 1; ny++) {
                        for (let nx = x - 1; nx <= x + 1; nx++) {
                            if (nx !== x || ny !== y) neighbors += grid[ny][nx];
                        }
                    }
                    if (neighbors > 4) nextGrid[y][x] = 1;
                    else if (neighbors < 4) nextGrid[y][x] = 0;
                }
            }
            grid = nextGrid;
        }

        // 3. Instantiate
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                if (grid[y][x] === 1) {
                    this.createTile(x, y, TileType.WALL, 40 + Math.random() * 20);
                } else {
                    this.createTile(x, y, TileType.GROUND, 0);
                }
            }
        }

        // Add physics interaction
        this.scene.time.delayedCall(100, () => {
            if (this.scene['commander']) {
                this.scene.physics.add.collider(this.scene['commander'], this.wallGroup);
            }
            if (this.scene['drone']) {
                this.scene.physics.add.collider(this.scene['drone'], this.wallGroup);
            }
            if (this.scene['enemyGroup']) {
                this.scene.physics.add.collider(this.scene['enemyGroup'], this.wallGroup);
            }
        });
    }

    createTile(gridX: number, gridY: number, type: TileType, height: number) {
        const key = `${gridX},${gridY}`;
        const worldX = gridX * this.tileSize;
        const worldY = gridY * this.tileSize;

        const tile: TileData = { x: gridX, y: gridY, type, height };

        // Visuals
        const g = this.scene.add.graphics();
        this.scene.add.existing(g);
        tile.instance = g;

        if (type === TileType.GROUND) {
            // Textured Floor
            this.scene.add.image(worldX + this.tileSize / 2, worldY + this.tileSize / 2, 'floor')
                .setDisplaySize(this.tileSize, this.tileSize)
                .setDepth(-1);
        }
        else if (type === TileType.WALL) {
            // 2.5D Block
            // Top face
            // We draw the block slightly offset up by 'height'
            const topY = worldY - height;

            // Side face (Front)
            g.fillStyle(0x555555, 1);
            g.fillRect(worldX, topY + this.tileSize, this.tileSize, height); // Fake front face

            // Top Face
            g.fillStyle(COLORS.primary, 1); // Neon edges
            g.fillRect(worldX, topY, this.tileSize, this.tileSize);
            g.fillStyle(0x111111, 1); // Inner top
            g.fillRect(worldX + 2, topY + 2, this.tileSize - 4, this.tileSize - 4);

            // Physics Body -> needs to be at GROUND level (worldY)
            const zone = this.scene.add.zone(worldX + this.tileSize / 2, worldY + this.tileSize / 2, this.tileSize, this.tileSize);
            this.scene.physics.add.existing(zone, true); // Static
            this.wallGroup.add(zone);
            tile.body = zone.body as Phaser.Physics.Arcade.Body;

            g.setDepth(worldY + this.tileSize); // Y-sort
        }

        this.tiles.set(key, tile);
    }

    // Pathfinding helper? 
    // Line of sight helper for 2.5D? (High walls block Projectiles)
    checkCollision(x: number, y: number): boolean {
        // Simple grid lookup
        const gridX = Math.floor(x / this.tileSize);
        const gridY = Math.floor(y / this.tileSize);
        const key = `${gridX},${gridY}`;
        const tile = this.tiles.get(key);
        if (tile && tile.type === TileType.WALL) return true;
        return false;
    }

    // Helper: Find a random safe spot
    getRandomGroundTile(): { x: number, y: number } | null {
        const groundTiles: TileData[] = [];
        this.tiles.forEach(tile => {
            if (tile.type === TileType.GROUND) groundTiles.push(tile);
        });

        if (groundTiles.length === 0) return null;
        const randomTile = groundTiles[Math.floor(Math.random() * groundTiles.length)];
        return {
            x: randomTile.x * this.tileSize + this.tileSize / 2,
            y: randomTile.y * this.tileSize + this.tileSize / 2
        };
    }
}
