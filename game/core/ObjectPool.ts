
/**
 * Generic Object Pool to reduce Garbage Collection spikes in WebGL games.
 * Supports any class that implements IPoolable.
 */

export interface IPoolable {
    // Called when retrieving from pool
    onEnable(...args: any[]): void;
    // Called when returning to pool
    onDisable(): void;
    // Cleanup if pool is destroyed
    destroy(): void;
}

export class ObjectPool<T extends IPoolable> {
    private pool: T[] = [];
    private factory: () => T;
    private maxSize: number;

    constructor(factory: () => T, initialSize: number = 10, maxSize: number = 100) {
        this.factory = factory;
        this.maxSize = maxSize;

        // Pre-warm
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(this.create());
        }
    }

    private create(): T {
        const obj = this.factory();
        // Ensure it starts disabled if possible, but IPoolable logic handles the details
        obj.onDisable();
        return obj;
    }

    public get(...args: any[]): T {
        let item: T;
        if (this.pool.length > 0) {
            item = this.pool.pop()!;
        } else {
            item = this.create();
        }
        item.onEnable(...args);
        return item;
    }

    public release(item: T): void {
        if (this.pool.length < this.maxSize) {
            item.onDisable();
            this.pool.push(item);
        } else {
            item.destroy(); // Overflow protection
        }
    }

    public clear(): void {
        this.pool.forEach(item => item.destroy());
        this.pool = [];
    }

    public get size(): number {
        return this.pool.length;
    }
}
