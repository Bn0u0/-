import Phaser from 'phaser';

export class CameraDirector {
    private scene: Phaser.Scene;
    private camera: Phaser.Cameras.Scene2D.Camera;
    private defaultZoom: number = 1;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.camera = scene.cameras.main;
    }

    public setup(zoom: number = 1) {
        this.defaultZoom = zoom;
        this.camera.setZoom(zoom);
        this.camera.centerOn(0, 0); // Assuming 0,0 is center of workbench
    }

    public zoomTo(target: Phaser.GameObjects.Components.Transform, zoomLevel: number, duration: number = 1000) {
        this.scene.tweens.add({
            targets: this.camera,
            zoom: zoomLevel,
            scrollX: target.x - (this.camera.width / 2),
            scrollY: target.y - (this.camera.height / 2),
            duration: duration,
            ease: 'Power2' // Smooth ease-out
        });
    }

    public reset(duration: number = 1000) {
        this.scene.tweens.add({
            targets: this.camera,
            zoom: this.defaultZoom,
            scrollX: - (this.camera.width / 2), // Re-center if 0,0 is origin
            // Actually, let's consistency check coordinate space. 
            // If BG is centered at 0,0.
            scrollX: - (this.camera.width / 2),
            scrollY: - (this.camera.height / 2),
            duration: duration,
            ease: 'Power2'
        });
    }

    // Advanced: Parallax effect based on pointer
    public updateParallax(pointerX: number, pointerY: number) {
        // Subtle drift
        const xOffset = (pointerX - this.camera.width / 2) * 0.05;
        const yOffset = (pointerY - this.camera.height / 2) * 0.05;
        this.camera.scrollX += (xOffset - this.camera.scrollX) * 0.1; // Lerp
        this.camera.scrollY += (yOffset - this.camera.scrollY) * 0.1;
    }
}
