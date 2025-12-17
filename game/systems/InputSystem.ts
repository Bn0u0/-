import Phaser from 'phaser';
import { Player } from '../classes/Player';

// ONE-THUMB REVOLUTION: INPUT CORE
// 1. Inputs come from EventBus 'JOYSTICK_MOVE' (from VirtualJoystick.tsx)
// 2. Keyboard support is DELETED.
// 3. Logic:
//    - Input Vector magnitude determines speed.
//    - "Flick" logic is handled here (if sudden high velocity change? Or handled by UI?)
//    - Actually, let's keep Flick logic here for consistency if UI sends raw movement.

export class InputSystem {
    private scene: Phaser.Scene;

    // Input States
    private moveVector = { x: 0, y: 0 };
    private lastMoveTime = 0;

    // Flick Detection (History Buffer)
    private vectorHistory: { x: number, y: number, time: number }[] = [];
    private readonly FLICK_VELOCITY_THRESHOLD = 2.5; // High change in short time
    private readonly FLICK_WINDOW = 150; // ms

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    public setVirtualAxis(x: number, y: number) {
        this.moveVector.x = x;
        this.moveVector.y = y;
        this.trackHistory(x, y);

        // Check Flick on every input update
        this.checkFlick();
    }

    // Unused but kept for interface compatibility if needed
    public setVirtualAim(x: number, y: number, firing: boolean) {
        // No-op in One-Thumb mode. Aiming is automatic.
    }

    public triggerSkill(skill: string) {
        this.scene.events.emit('TRIGGER_SKILL', skill);
    }

    private trackHistory(x: number, y: number) {
        const now = this.scene.time.now;
        this.vectorHistory.push({ x, y, time: now });

        // Prune old
        this.vectorHistory = this.vectorHistory.filter(h => now - h.time < this.FLICK_WINDOW);
    }

    private checkFlick() {
        if (this.vectorHistory.length < 3) return;

        // Simple Flick: Did we go from 0 to MAX in very short time?
        // Or did we release? 
        // Virtual Joystick resets to 0,0 on release.
        // If we were at high magnitude and suddenly went to 0 (Release)? -> Maybe Dash?
        // ONE-THUMB DESIGN DECISION:
        // Flick-to-Dash usually implies a quick swipe.
        // Let's detect: High Velocity Input -> Release (0,0).

        const latest = this.vectorHistory[this.vectorHistory.length - 1];
        const prev = this.vectorHistory[0]; // Oldest in window

        // Note: This logic might need tuning. 
        // Simpler approach: If 'JOYSTICK_MOVE' sends 0,0 (Release), check the LAST input magnitude.
        // If last magnitude was > 0.8, treat as Flick/Dash?
        // No, that's just unnecessary dashing when stopping.

        // Let's rely on explicit FLICK gesture?
        // Actually, the previous implementation had a decent "Time/Distance" check.
        // But that was based on Mouse Pointer. Now we rely on VirtualJoystick.tsx emitting events.
        // VirtualJoystick.tsx handles the "Touch" abstraction.

        // Let's trust the VirtualJoystick to drive movement, and if the user wants to DASH,
        // maybe we interpret a "Double Tap" or "Quick Swipe"?
        // Wait, the Requirement said: "If sliding speed > 400px/s -> Flick".

        // But valid "Input" comes as normalized -1 to 1.
        // We don't verify pixel speed here easily without screen coords.
        // Let's implement FLICK in `VirtualJoystick.tsx`? 
        // No, keeping logic in System is better.
        // Check `App.tsx` / `VirtualJoystick` integration.
        // VirtualJoystick emits raw normalized vector.

        // ALTERNATIVE: Player class handles Dash based on "JustDown" + Velocity?
        // Let's stay simple:
        // Use the default dash mechanic for now (Spacebar was removed).
        // Let's add a `tryFlick` method called by `processInput` if conditions met.
    }

    // Called every frame by MainScene
    processInput(
        input: Phaser.Input.InputPlugin,
        cameras: Phaser.Cameras.Scene2D.CameraManager,
        player: Player,
        modifiers: { playerSpeed: number }
    ): void {
        const body = player.body as Phaser.Physics.Arcade.Body;
        if (!body) return;

        // 1. Movement Logic (From Virtual Axis)
        // Smooth out input?
        const moveX = this.moveVector.x;
        const moveY = this.moveVector.y;
        const mag = Math.sqrt(moveX * moveX + moveY * moveY);

        // FLICK DETECTION (Pointer based fallback for "Real" flick feel?)
        // The user requirement specifically asked for "Touch Start -> Move -> End".
        // "If sliding speed > 400px/s -> Dash".
        // This requires tracking raw pointer in InputSystem again.
        // Let's re-implement Raw Pointer tracking for FLICK only.
        // While VirtualJoystick handles WALK.

        const pointer = input.activePointer;

        if (pointer.isDown) {
            // Tracking for flick
            if (!this.wasDown) {
                // Start Touch
                this.pointerDownTime = this.scene.time.now;
                this.pointerDownPos.set(pointer.x, pointer.y);
            }
        } else {
            if (this.wasDown) {
                // Released
                const duration = this.scene.time.now - this.pointerDownTime;
                const dist = this.pointerDownPos.distance(pointer.position);

                // Velocity = Dist / Time (px / ms)
                // Threshold: 400px/s = 0.4 px/ms
                const velocity = dist / duration;

                if (velocity > 0.4 && duration < 300 && dist > 30) {
                    // FLICK!
                    player.dash();
                    this.scene.events.emit('SHOW_FLOATING_TEXT', {
                        x: player.x, y: player.y - 50,
                        text: "FLICK!", color: "#00FFFF"
                    });
                }
            }
        }
        this.wasDown = pointer.isDown;

        // WALKING (Driven by Virtual Joystick UI which sets virtualMove)
        const accel = 1200 * modifiers.playerSpeed;

        if (player.isDashing) return; // Locked

        if (mag > 0.1) {
            body.setDrag(600);
            body.setAcceleration(moveX * accel, moveY * accel);

            // Rotation: Face movement
            const targetRotation = Math.atan2(moveY, moveX) + Math.PI / 2;
            player.setRotation(Phaser.Math.Angle.RotateTo(player.rotation, targetRotation, 0.15));

            // Tell player we are moving (for Auto-Aim toggle)
            player.isMoving = true;
        } else {
            body.setAcceleration(0, 0);
            player.isMoving = false;
        }
    }

    // Internal state for raw pointer tracking
    private wasDown = false;
    private pointerDownTime = 0;
    private pointerDownPos = new Phaser.Math.Vector2();
}

