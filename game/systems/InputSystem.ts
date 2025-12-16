import Phaser from 'phaser';
import { Player } from '../classes/Player';

export class InputSystem {
    private scene: Phaser.Scene;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    processInput(
        input: Phaser.Input.InputPlugin,
        cameras: Phaser.Cameras.Scene2D.CameraManager,
        player: Player,
        modifiers: { playerSpeed: number }
    ): void {
        const body = player.body as Phaser.Physics.Arcade.Body;
        const pointer = input.activePointer;

        // Skills
        if (input.keyboard) {
            if (input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE).isDown) {
                player.dash();
            }
            if (input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q).isDown) {
                player.triggerSkill1();
            }
            if (input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E).isDown) {
                player.triggerSkill2();
            }
        }

        // Movement
        if (pointer.isDown) {
            const worldPoint = pointer.positionToCamera(cameras.main) as Phaser.Math.Vector2;
            const dx = worldPoint.x - player.x;
            const dy = worldPoint.y - player.y;
            const angle = Math.atan2(dy, dx);
            const inputVecX = Math.cos(angle);
            const inputVecY = Math.sin(angle);

            // Re-use constants matching original file if possible, or import them.
            // For now hardcoding or we should import PHYSICS from constants
            // Assuming 800 * mod speed for now to match MainScene logic logic approximately 
            // Better to pass acceleration/drag as params or import constants.
            const accel = 800 * modifiers.playerSpeed;

            body.setDrag(600);
            body.setAcceleration(inputVecX * accel, inputVecY * accel);

            const targetRotation = angle + Math.PI / 2;
            const nextRotation = Phaser.Math.Angle.RotateTo(player.rotation, targetRotation, 0.1);
            player.setRotation(nextRotation);
        } else {
            body.setAcceleration(0, 0);
        }
    }
}
