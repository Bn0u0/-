export type Entity = number;

// Basic Component Class (Abstract)
export abstract class Component {
    static nextId = 0;
    static id = 0;
}

// Helper to register component types efficiently
// Accepts any class constructor (new ...args) that extends Component
export const registerComponent = <T extends { id: number; new(...args: any[]): Component }>(c: T) => {
    c.id = 1 << Component.nextId++;
    return c;
};

export interface ISystem {
    update(dt: number): void;
}

export class World {
    private nextEntityId = 1;
    private entities: Entity[] = [];
    private components: Map<number, Map<Entity, any>> = new Map(); // Map<ComponentID, Map<EntityID, ComponentInstance>>
    private systems: ISystem[] = [];

    // Component Masks (Which entities have which components)
    private entityMasks: Map<Entity, number> = new Map();

    createEntity(): Entity {
        const id = this.nextEntityId++;
        this.entities.push(id);
        this.entityMasks.set(id, 0);
        return id;
    }

    destroyEntity(entity: Entity) {
        this.entities = this.entities.filter(e => e !== entity);
        this.entityMasks.delete(entity);
        // Clean up components
        this.components.forEach(map => map.delete(entity));
        console.log(`[ECS] Destroyed Entity ${entity}`);
    }

    addComponent<T extends Component>(entity: Entity, componentClass: { new(...args: any[]): T; id: number }, ...args: any[]): T {
        if (!this.components.has(componentClass.id)) {
            this.components.set(componentClass.id, new Map());
        }

        const component = new componentClass(...args);
        this.components.get(componentClass.id)!.set(entity, component);

        // Update Mask
        const currentMask = this.entityMasks.get(entity) || 0;
        this.entityMasks.set(entity, currentMask | componentClass.id);

        return component;
    }

    getComponent<T>(entity: Entity, componentClass: { id: number }): T | undefined {
        const store = this.components.get(componentClass.id);
        if (!store) return undefined;
        return store.get(entity) as T;
    }

    removeComponent(entity: Entity, componentClass: { id: number }) {
        const store = this.components.get(componentClass.id);
        if (store) {
            store.delete(entity);
            const currentMask = this.entityMasks.get(entity) || 0;
            this.entityMasks.set(entity, currentMask & ~componentClass.id);
        }
    }

    addSystem(system: ISystem) {
        this.systems.push(system);
    }

    update(dt: number) {
        for (const system of this.systems) {
            system.update(dt);
        }
    }

    // Query: Get all entities with a specific set of components (mask)
    query(components: { id: number }[]): Entity[] {
        let mask = 0;
        components.forEach(c => mask |= c.id);

        return this.entities.filter(e => {
            const eMask = this.entityMasks.get(e) || 0;
            return (eMask & mask) === mask;
        });
    }
}
