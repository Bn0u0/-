import { ISystem, World } from "../ECS";
import { Position, Renderable } from "../Components";

export class RenderSystem implements ISystem {
    constructor(private world: World) { }

    update(dt: number): void {
        // Query entities that have a Position AND a Phaser Object
        const entities = this.world.query([Position, Renderable]);

        for (const id of entities) {
            const pos = this.world.getComponent<Position>(id, Position)!;
            const render = this.world.getComponent<Renderable>(id, Renderable)!;

            if (render.phaserObject.active) {
                (render.phaserObject as Phaser.GameObjects.Sprite | Phaser.GameObjects.Image).setPosition(pos.x, pos.y);

                // Optional: Sync Rotation if we had a Rotation component
                // const rot = this.world.getComponent<Rotation>(id, Rotation);
                // if (rot) render.phaserObject.setRotation(rot.radians);
            }
        }
    }
}
