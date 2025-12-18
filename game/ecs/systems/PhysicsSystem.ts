import { ISystem, World } from "../ECS";
import { Position, Velocity } from "../Components";

export class PhysicsSystem implements ISystem {
    constructor(private world: World) { }

    update(dt: number): void {
        const dtSec = dt / 1000;

        // Query all entities with Position AND Velocity
        const entities = this.world.query([Position, Velocity]);

        for (const id of entities) {
            const pos = this.world.getComponent<Position>(id, Position)!;
            const vel = this.world.getComponent<Velocity>(id, Velocity)!;

            // Euler Integration
            pos.x += vel.x * dtSec;
            pos.y += vel.y * dtSec;
        }
    }
}
