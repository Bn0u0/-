import Phaser from 'phaser';

export class TextureManager {
    private scene: Phaser.Scene;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    public generateAll() {
        this.createFlare();
        this.createParticle();
        this.createCircle();
        this.createIconPlaceholders();
        console.log("🎨 [TextureManager] Procedural Textures Generated.");
    }

    private createFlare() {
        if (this.scene.textures.exists('flare')) return;
        const canvas = this.scene.textures.createCanvas('flare', 32, 32);
        if (!canvas) return;

        const ctx = canvas.getContext();
        const grd = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        grd.addColorStop(0, 'rgba(255, 255, 255, 1)');
        grd.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)');
        grd.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, 32, 32);
        canvas.refresh();
    }

    private createParticle() {
        if (this.scene.textures.exists('particle')) return;
        const graphics = this.scene.make.graphics({ x: 0, y: 0 });
        graphics.fillStyle(0xffffff, 1);
        graphics.fillCircle(4, 4, 4);
        graphics.generateTexture('particle', 8, 8);
    }

    private createCircle() {
        if (this.scene.textures.exists('circle')) return;
        const graphics = this.scene.make.graphics({ x: 0, y: 0 });
        graphics.fillStyle(0xffffff, 1);
        graphics.fillCircle(16, 16, 16);
        graphics.generateTexture('circle', 32, 32);
    }

    private createIconPlaceholders() {
        const types = ['icon_weapon_crate', 'icon_scrap_metal'];
        types.forEach(type => {
            if (this.scene.textures.exists(type)) return;
            const size = 64;
            const graphics = this.scene.make.graphics({ x: 0, y: 0 });

            // Frame
            graphics.lineStyle(2, 0xffffff, 1);
            graphics.strokeRect(0, 0, size, size);

            // Content
            graphics.fillStyle(type.includes('weapon') ? 0xff0000 : 0xaaaaaa, 0.5);
            graphics.fillRect(4, 4, size - 8, size - 8);

            graphics.generateTexture(type, size, size);
        });
    }
}
