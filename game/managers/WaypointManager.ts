import Phaser from 'phaser';

export interface WaypointTarget {
    x: number;
    y: number;
    label?: string;
    color: number;
    icon?: string; // Optional icon texture key
}

export class WaypointManager {
    private scene: Phaser.Scene;
    private targets: WaypointTarget[] = [];
    private indicators: Phaser.GameObjects.Container[] = [];
    private padding: number = 50; // Padding from screen edge

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    public addTarget(target: WaypointTarget) {
        this.targets.push(target);
        this.createIndicator(target);
    }

    public clearTargets() {
        this.targets = [];
        this.indicators.forEach(i => i.destroy());
        this.indicators = [];
    }

    private createIndicator(target: WaypointTarget) {
        const container = this.scene.add.container(0, 0);
        container.setScrollFactor(0); // FIXED to screen
        container.setDepth(1000);     // UI Top Layer

        // Arrow Graphics
        const arrow = this.scene.add.graphics();
        arrow.fillStyle(target.color, 1);
        arrow.fillTriangle(0, -10, 10, 10, -10, 10); // Pointing UP (Rotated later)
        container.add(arrow);

        // Optional Label
        if (target.label) {
            const text = this.scene.add.text(0, 20, target.label, {
                fontSize: '10px',
                color: '#' + target.color.toString(16).padStart(6, '0'),
                fontStyle: 'bold'
            }).setOrigin(0.5);
            container.add(text);
        }

        this.indicators.push(container);
    }

    public update() {
        if (!this.scene.cameras.main) return;
        const camera = this.scene.cameras.main;
        const bounds = new Phaser.Geom.Rectangle(
            this.padding,
            this.padding,
            camera.width - this.padding * 2,
            camera.height - this.padding * 2
        );

        this.targets.forEach((target, index) => {
            const indicator = this.indicators[index];

            // Check visibility using world coordinates
            // Simple check: Is point inside camera view?
            // Actually, we want indicators ONLY when OFF-SCREEN, or ALWAYS?
            // Usually Always, pointing to it.

            // 1. Get relative position to camera center
            const camCenterX = camera.midPoint.x;
            const camCenterY = camera.midPoint.y;

            const dx = target.x - camCenterX;
            const dy = target.y - camCenterY;
            const angle = Math.atan2(dy, dx);

            // 2. Project to Screen Coordinates
            // worldToScreen is not standard in Phaser 3 Camera directly? 
            // Actually it is 'worldView' or we project manually.
            // camera.worldToScreen is available in some versions, but let's be safe.
            const screenPos = new Phaser.Math.Vector2();
            camera.getWorldPoint(target.x, target.y); // Wait, we want World -> Screen

            // Correct Phaser 3 method:
            // The camera transform matrix can be used.
            // Or simply:
            screenPos.x = (target.x - camera.scrollX) * camera.zoom;
            screenPos.y = (target.y - camera.scrollY) * camera.zoom;

            // Check if on screen (with some margin)
            const isOnScreen =
                screenPos.x > 0 &&
                screenPos.x < camera.width &&
                screenPos.y > 0 &&
                screenPos.y < camera.height;

            if (isOnScreen) {
                indicator.setVisible(false);
            } else {
                indicator.setVisible(true);

                // 3. Clamp to Screen Edge
                // We raycast from center to edge at 'angle'
                // Line from (w/2, h/2) with slope tan(angle)

                const cx = camera.width / 2;
                const cy = camera.height / 2;

                // Intersect line (cx, cy) -> (cos, sin) with Bounds
                // Simplified Logic: 
                // Find t such that cx + t*cos hits a wall

                let tx = 99999;
                let ty = 99999;

                // Check Vertical Walls (Left/Right)
                if (Math.abs(Math.cos(angle)) > 0.01) {
                    const targetX = Math.cos(angle) > 0 ? bounds.right : bounds.left;
                    tx = (targetX - cx) / Math.cos(angle);
                }

                // Check Horizontal Walls (Top/Bottom)
                if (Math.abs(Math.sin(angle)) > 0.01) {
                    const targetY = Math.sin(angle) > 0 ? bounds.bottom : bounds.top;
                    ty = (targetY - cy) / Math.sin(angle);
                }

                // Use smallest positive t
                const t = Math.min(Math.abs(tx), Math.abs(ty));

                const showX = cx + t * Math.cos(angle);
                const showY = cy + t * Math.sin(angle);

                indicator.setPosition(showX, showY);
                indicator.setRotation(angle + Math.PI / 2); // graphic points UP, angle is Right-based

                // Pulse effect
                indicator.setScale(1 + Math.sin(this.scene.time.now / 100) * 0.1);
            }
        });
    }
}
