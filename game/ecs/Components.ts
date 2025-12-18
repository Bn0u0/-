import { Component, registerComponent } from "./ECS";

// 1. Position: Where is it?
export class Position extends Component {
    constructor(public x: number = 0, public y: number = 0) { super(); }
}
registerComponent(Position);

// 2. Velocity: How fast is it moving?
export class Velocity extends Component {
    constructor(public x: number = 0, public y: number = 0) { super(); }
}
registerComponent(Velocity);

// 3. Renderable: What Phaser Node represents this?
// Decouples Logic from View. Logic sets Position -> RenderSystem updates PhaserObject.
export class Renderable extends Component {
    constructor(public phaserObject: Phaser.GameObjects.GameObject) { super(); }
}
registerComponent(Renderable);

// 4. Input: Is it controlled by the player?
export class Input extends Component {
    constructor(public role: 'COMMANDER' | 'DRONE') { super(); }
}
registerComponent(Input);

// 5. Health
export class Health extends Component {
    constructor(public current: number, public max: number) { super(); }
}
registerComponent(Health);
