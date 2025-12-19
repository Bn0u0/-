import Phaser from 'phaser';

export class CameraDirector {
    private scene: Phaser.Scene;
    private camera: Phaser.Cameras.Scene2D.Camera;
    private worldWidth: number;
    private worldHeight: number;
    private defaultZoom: number = 1.0;

    constructor(scene: Phaser.Scene, width: number, height: number) {
        this.scene = scene;
        this.camera = scene.cameras.main;
        this.worldWidth = width;
        this.worldHeight = height;

        // Init
        this.updateZoomBasedOnScreen();
    }

    public setupFollow(target: Phaser.GameObjects.GameObject) {
        this.camera.startFollow(target, true, 0.1, 0.1);
        this.camera.setBounds(0, 0, this.worldWidth, this.worldHeight);
        console.log(`🎥 [CameraDirector] Following target at ${target.body?.position.x}, ${target.body?.position.y}`);
    }

    public handleResize(gameSize: Phaser.Structs.Size) {
        this.camera.setViewport(0, 0, gameSize.width, gameSize.height);
        this.updateZoomBasedOnScreen();
    }

    private updateZoomBasedOnScreen() {
        const width = this.scene.scale.width;
        let zoom = 1.0;
        if (width < 600) zoom = 0.8; // Mobile
        else zoom = 1.0; // Desktop

        this.defaultZoom = zoom;
        this.camera.zoomTo(zoom, 500, 'Power2');
    }

    public updateLookahead(inputX: number, inputY: number) {
        // [JUICE] Camera Lookahead
        if (Math.abs(inputX) > 0.1 || Math.abs(inputY) > 0.1) {
            // Negative because offset is "camera offset from center", so "push camera left" allows "see more right"?
            // Actually followOffset: The amount of horizontal/vertical offset the camera has from the target.
            // If target moves right, camera moves right.
            // If we want to look AHEAD right, we need camera to be FURTHER right? 
            // Experimentation says: followOffset is subtracted? 
            // Let's stick to the verified logic from MainScene: -pad * 100

            this.camera.followOffset.x = Phaser.Math.Linear(this.camera.followOffset.x, -inputX * 100, 0.05);
            this.camera.followOffset.y = Phaser.Math.Linear(this.camera.followOffset.y, -inputY * 100, 0.05);
        } else {
            // Return to center
            this.camera.followOffset.x = Phaser.Math.Linear(this.camera.followOffset.x, 0, 0.05);
            this.camera.followOffset.y = Phaser.Math.Linear(this.camera.followOffset.y, 0, 0.05);
        }
    }

    public shake(intensity: number = 0.01, duration: number = 200) {
        this.camera.shake(duration, intensity);
    }

    public flash(duration: number = 50, r: number = 255, g: number = 0, b: number = 0) {
        this.camera.flash(duration, r, g, b, false, undefined);
    }
}
