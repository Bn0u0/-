import Phaser from 'phaser';
import { Player } from '../classes/Player';

export class InputSystem {
    private scene: Phaser.Scene;

    // Virtual Input State
    private virtualMove = { x: 0, y: 0 };
    private virtualAim = { x: 0, y: 0, isFiring: false };
    private targetMovePosition: Phaser.Math.Vector2 | null = null;

    // Flick Logic
    private pointerDownPos = new Phaser.Math.Vector2();
    private pointerDownTime = 0;
    private wasDown = false;
    private readonly FLICK_THRESHOLD = 0.20; // Seconds max for a flick
    private readonly FLICK_DIST_MIN = 30;    // Pixels min for a flick

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    public setVirtualAxis(x: number, y: number) {
        this.virtualMove.x = x;
        this.virtualMove.y = y;
        if (x !== 0 || y !== 0) this.targetMovePosition = null;
    }

    public setVirtualAim(x: number, y: number, firing: boolean) {
        this.virtualAim.x = x;
        this.virtualAim.y = y;
        this.virtualAim.isFiring = firing;
    }

    public triggerSkill(skill: string) {
        this.scene.events.emit('TRIGGER_SKILL', skill);
    }

    processInput(
        input: Phaser.Input.InputPlugin,
        cameras: Phaser.Cameras.Scene2D.CameraManager,
        player: Player,
        modifiers: { playerSpeed: number }
    ): void {
        // CRITICAL: Lock input during dash to preserve momentum
        if (player.isDashing) return;

        const body = player.body as Phaser.Physics.Arcade.Body;
        const pointer = input.activePointer;
        const accel = 1200 * modifiers.playerSpeed;

        let moveX = this.virtualMove.x;
        let moveY = this.virtualMove.y;

        // Pointer Logic (Mouse/Touch)
        const isDown = pointer.isDown;
        const justDown = isDown && !this.wasDown;
        const justUp = !isDown && this.wasDown;

        if (isDown) {
            if (justDown) {
                this.pointerDownPos.set(pointer.x, pointer.y);
                this.pointerDownTime = this.scene.time.now;
            }

            // Standard Click-to-Move logic
            // Only if no virtual joystick input
            if (moveX === 0 && moveY === 0) {
                const worldPoint = pointer.positionToCamera(cameras.main) as Phaser.Math.Vector2;
                this.targetMovePosition = new Phaser.Math.Vector2(worldPoint.x, worldPoint.y);
            }
        }

        if (justUp) {
            // Check for Flick
            const duration = (this.scene.time.now - this.pointerDownTime) / 1000;
            const dist = this.pointerDownPos.distance(pointer.position);

            if (duration < this.FLICK_THRESHOLD && dist > this.FLICK_DIST_MIN) {
                // FLICK DETECTED -> DASH
                player.dash();

                // Visual Text
                this.scene.events.emit('SHOW_FLOATING_TEXT', {
                    x: player.x, y: player.y - 50,
                    text: "FLICK!", color: "#00FFFF"
                });

                // Clear target move so we don't walk back after dashing
                this.targetMovePosition = null;
            }
        }

        // Update State
        this.wasDown = isDown;

        // Apply Movement from Virtual Joystick Only
        // Legacy "Click-to-Move" removed for Mobile Purity. 
        // Movement should be driven by Virtual Joystick (to be implemented) or Flick Dash.
        // Currently, Flick = Dash. We might need a Virtual Joystick for standard movement if required,
        // but for now we rely on pure Dash mechanics or Auto-move?
        // Wait, "Click-to-Move" is actually okay for mobile (Tap to Move), but WASD is not.
        // Let's keep Tap-to-Move for fallback but remove WASD.

        // Apply Click Movement (Tap-to-Move)
        if (this.targetMovePosition) {
            const dist = Phaser.Math.Distance.Between(player.x, player.y, this.targetMovePosition.x, this.targetMovePosition.y);
            if (dist < 10) {
                this.targetMovePosition = null; // Arrived
            } else {
                const angle = Math.atan2(this.targetMovePosition.y - player.y, this.targetMovePosition.x - player.x);
                // Only move if not overridden by virtual joystick
                if (moveX === 0 && moveY === 0) {
                    moveX = Math.cos(angle);
                    moveY = Math.sin(angle);
                }
            }
        }

        // Apply Movement
        if (moveX !== 0 || moveY !== 0) {
            body.setDrag(600);
            body.setAcceleration(moveX * accel, moveY * accel);

            const targetRotation = Math.atan2(moveY, moveX) + Math.PI / 2;
            player.setRotation(Phaser.Math.Angle.RotateTo(player.rotation, targetRotation, 0.15));
        } else {
            body.setAcceleration(0, 0);
        }

        // NO KEYBOARD SUPPORT - MOBILE ONLY
    }
}
