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

    private virtualAxis = new Phaser.Math.Vector2();

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    public getVirtualAxis() {
        return this.virtualAxis;
    }

    public setVirtualAxis(x: number, y: number) {
        this.virtualAxis.set(x, y);
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
        // FLICK LOGIC: Detect "Pull and Release" or "Quick Swipe"
        // VirtualJoystick emits 0,0 on release.

        // 1. Check if we just released (Current is 0,0)
        const current = this.moveVector;
        if (current.x === 0 && current.y === 0) {
            // 2. Check history (Did we have high velocity recently?)
            if (this.vectorHistory.length > 0) {
                const lastInput = this.vectorHistory[this.vectorHistory.length - 1];
                const lastTime = lastInput.time;
                const now = this.scene.time.now;

                // Only if released VERY recently (within 100ms of last input)
                if (now - lastTime < 100) {
                    const magnitude = Math.sqrt(lastInput.x * lastInput.x + lastInput.y * lastInput.y);

                    // Threshold: Must be a deliberate strong pull (> 0.6)
                    if (magnitude > 0.6) {
                        // TRIGGER DASH
                        // We need access to player to dash? 
                        // Or emit event? Player listens to InputSystem?
                        // Currently processInput passes player. 
                        // But checkFlick is called from setVirtualAxis (event).
                        // We can't access player derived from processInput easily here.

                        // Solution: Emit Event
                        this.scene.events.emit('PLAYER_DASH', {
                            x: lastInput.x,
                            y: lastInput.y
                        });

                        // Clear history to prevent double trigger
                        this.vectorHistory = [];
                    }
                }
            }
        }
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

        // 1. Get Input State
        const moveX = this.moveVector.x;
        const moveY = this.moveVector.y;
        const force = Math.sqrt(moveX * moveX + moveY * moveY); // 0.0 - 1.0

        // 2. Define Siege State (Overdrive)
        // [SIEGE MODE] Triggered > 90% Force
        const isSiege = force > 0.9;
        const inputVector = new Phaser.Math.Vector2(moveX, moveY);

        // 3. Resolve Control Type
        let controlType = 'AUTO';
        // Check weapon type (Player has equippedWeapon)
        if (player.equippedWeapon && player.equippedWeapon.def) {
            controlType = player.equippedWeapon.def.controlType || 'AUTO';
        }

        // 4. Default Base Speed
        const baseSpeed = 1200 * modifiers.playerSpeed;

        // 5. Apply Movement Rule
        if (force > 0.1) {
            // [V5 SINGLE HANDED] ALWAYS AUTO
            // Move towards input, Face towards move direction

            // Siege Mode = Speed Boost (or just specific weapon behavior)
            const speedMult = isSiege ? 1.1 : 1.0;

            body.setDrag(600);
            body.setAcceleration(moveX * baseSpeed * speedMult, moveY * baseSpeed * speedMult);

            // Rotation: Face Move Direction
            const targetRotation = inputVector.angle() + Math.PI / 2;
            player.setRotation(Phaser.Math.Angle.RotateTo(player.rotation, targetRotation, 0.15));

            player.isMoving = true;
            (player as any).isSiegeMode = isSiege;

        } else {
            body.setAcceleration(0, 0);
            player.isMoving = false;
            (player as any).isSiegeMode = false;
        }

        // FLICK DETECTION handled by React VirtualJoystick (UI Layer)
    }

    // Internal state for raw pointer tracking
    private wasDown = false;
    private pointerDownTime = 0;
    private pointerDownPos = new Phaser.Math.Vector2();
}

