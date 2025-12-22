import { Player } from '../classes/Player';

export interface ClassMechanic {
    /**
     * Called every frame from Player.update()
     */
    update(dt: number): void;

    /**
     * Called when Player takes damage
     * @returns modified damage (if shield absorbs it)
     */
    onHit(damage: number): number;

    /**
     * Called when Player picks up loot
     */
    onLoot(amount: number): void;

    /**
     * Called when Player dashes
     */
    onDash(): void;

    /**
     * Optional: Render debug visuals or UI overlay
     */
    draw(graphics: Phaser.GameObjects.Graphics): void;

    destroy(): void;
}

export abstract class BaseMechanic implements ClassMechanic {
    protected player: Player;
    protected scene: Phaser.Scene;

    constructor(player: Player) {
        this.player = player;
        this.scene = player.scene;
    }

    abstract update(dt: number): void;

    onHit(damage: number): number { return damage; }
    onLoot(amount: number): void { }
    onDash(): void { }
    draw(graphics: Phaser.GameObjects.Graphics): void { }
    destroy(): void { }
}
