/**
 * IconGenerator.ts
 * Procedurally generates 64x64 item icons as Base64 Data URIs.
 * Used for "Zero-Asset" UI rendering in React.
 */

export type IconType = 'CORE' | 'DRIVE' | 'PROTOCOL' | 'MATERIAL';
export type RarityColor = string;

export class IconGenerator {
    private static canvas: HTMLCanvasElement;
    private static ctx: CanvasRenderingContext2D;

    private static init() {
        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
            this.canvas.width = 64;
            this.canvas.height = 64;
            this.ctx = this.canvas.getContext('2d')!;
        }
    }

    public static generate(type: IconType, color: string): string {
        this.init();
        const ctx = this.ctx;
        const w = 64;
        const h = 64;

        // Clear
        ctx.clearRect(0, 0, w, h);

        // Background Glow
        const grad = ctx.createRadialGradient(32, 32, 10, 32, 32, 30);
        grad.addColorStop(0, color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.globalAlpha = 0.3;
        ctx.fillRect(0, 0, w, h);
        ctx.globalAlpha = 1.0;

        // Draw Shape based on Type
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 2;

        switch (type) {
            case 'CORE': // Shield / Circle
                ctx.beginPath();
                ctx.arc(32, 32, 20, 0, Math.PI * 2);
                ctx.stroke();
                // Inner Detail
                ctx.fillRect(28, 20, 8, 24);
                ctx.fillRect(20, 28, 24, 8);
                break;

            case 'DRIVE': // Arrow / Speed
                ctx.beginPath();
                ctx.moveTo(20, 20); ctx.lineTo(44, 32); ctx.lineTo(20, 44);
                ctx.closePath();
                ctx.stroke();
                // Speed lines
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(10, 20); ctx.lineTo(16, 24);
                ctx.moveTo(10, 44); ctx.lineTo(16, 40);
                ctx.stroke();
                break;

            case 'PROTOCOL': // Sword / Cross
                ctx.beginPath();
                ctx.moveTo(16, 48); ctx.lineTo(48, 16); // Blade
                ctx.moveTo(44, 12); ctx.lineTo(52, 20); // Handle
                ctx.moveTo(12, 44); ctx.lineTo(20, 52); // Tip area
                ctx.stroke();
                // Glow Tip
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(48, 16, 2, 0, Math.PI * 2);
                ctx.fill();
                break;

            case 'MATERIAL': // Chip / Square
                ctx.strokeRect(20, 20, 24, 24);
                // Pins
                ctx.fillStyle = color;
                ctx.fillRect(16, 22, 4, 2); ctx.fillRect(16, 28, 4, 2); ctx.fillRect(16, 34, 4, 2);
                ctx.fillRect(44, 22, 4, 2); ctx.fillRect(44, 28, 4, 2); ctx.fillRect(44, 34, 4, 2);
                break;
        }

        return this.canvas.toDataURL();
    }
}
