
import Phaser from 'phaser';
import { EnemyBoss } from './EnemyBoss';
import { Projectile } from './Projectile';

export class EnemyDefragmenter extends EnemyBoss {
    private stateTimer: number = 0;
    private attackState: 'IDLE' | 'MINES' | 'BEAM' = 'IDLE';
    private beamGraphics: Phaser.GameObjects.Graphics;
    private beamAngle: number = 0;
    private target: any = null;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y);

        // Visuals: Complex Golem (Multiple Rotating Blocks)
        this.graphics.clear();
        this.graphics.fillStyle(0xFF00FF, 1); // Magenta
        this.graphics.fillRect(-30, -30, 60, 60); // Core

        // Floating Bits (Simulated via graphics for now, could be separate containers)
        this.graphics.fillStyle(0x00FFFF, 1);
        this.graphics.fillRect(-50, -10, 20, 20);
        this.graphics.fillRect(30, -10, 20, 20);
        this.graphics.fillRect(-10, -50, 20, 20);
        this.graphics.fillRect(-10, 30, 20, 20);

        this.beamGraphics = scene.add.graphics();
        this.add(this.beamGraphics);

        this.hp = 1000;
        this.maxHp = 1000;
        this.speed = 30; // Very Slow
        this.name = 'The Defragmenter';
    }

    public seekPlayer(targets: any[]) {
        let closest: any = null;
        let dist = 9999;
        for (const t of targets) {
            if (!t || !t.active) continue;
            const d = Phaser.Math.Distance.Between(this.x, this.y, t.x, t.y);
            if (d < dist) {
                dist = d;
                closest = t;
            }
        }
        this.target = closest;
        super.seekPlayer(targets);
    }

    update() {
        super.update();
        if (this.isDead || !this.active) {
            this.beamGraphics.clear();
            return;
        }

        const dt = 16.6;
        this.stateTimer += dt;

        switch (this.attackState) {
            case 'IDLE':
                if (this.stateTimer > 3000) {
                    this.pickAttack();
                }
                break;
            case 'MINES':
                if (this.stateTimer > 1000) { // Quick cast
                    this.spawnMines();
                    this.attackState = 'IDLE';
                    this.stateTimer = 0;
                }
                break;
            case 'BEAM':
                this.updateBeam(dt);
                if (this.stateTimer > 5000) { // 5s spin
                    this.attackState = 'IDLE';
                    this.stateTimer = 0;
                    this.beamGraphics.clear();
                }
                break;
        }

        // Rotate visuals
        this.graphics.rotation += 0.01;
    }

    private pickAttack() {
        this.stateTimer = 0;
        if (Math.random() > 0.5) {
            this.attackState = 'MINES';
            // Telegrah
            this.setTint(0x00FF00);
        } else {
            this.attackState = 'BEAM';
            this.setTint(0xFF0000);
            this.beamAngle = 0;
        }
    }

    private spawnMines() {
        this.clearTint();
        // Spawn 3 static projectiles around player? Or random?
        // Using main scene projectile group
        const mainScene = this.scene as any;
        if (mainScene.projectileGroup && this.target) {
            for (let i = 0; i < 3; i++) {
                const offsetX = (Math.random() - 0.5) * 400;
                const offsetY = (Math.random() - 0.5) * 400;
                const p = new Projectile(this.scene);
                mainScene.projectileGroup.add(p);

                // Mine: Stationary, explodes later? 
                // For MVP, just a slow moving projectile aimed at predicted pos
                const angle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x + offsetX, this.target.y + offsetY);
                p.fire(this.x, this.y, angle, 200, 5000, 0x00FF00, 40, 'enemy');
            }
        }
    }

    private updateBeam(dt: number) {
        this.beamGraphics.clear();
        this.beamAngle += 0.05; // Spin speed

        // 2 Beams
        for (let i = 0; i < 2; i++) {
            const angle = this.beamAngle + (i * Math.PI);
            const reach = 400;
            const endX = Math.cos(angle) * reach;
            const endY = Math.sin(angle) * reach;

            this.beamGraphics.lineStyle(10, 0xFF00FF, 1);
            this.beamGraphics.beginPath();
            this.beamGraphics.moveTo(0, 0);
            this.beamGraphics.lineTo(endX, endY);
            this.beamGraphics.strokePath();

            // Collision Check?
            // Heavy calculation for MVP update loop. 
            // Ideally use physics bodies (Arcade Physics bodies can't easily be lines).
            // Distance check to player?
            if (this.target) {
                // Line to Point distance
                // Simplified: If player is roughly in angle range? 
                // Or just assume visual for now and rely on regular hitbox collision?
                // The prompt asked for "Behavior". Let's instantiate invisible projectiles along the beam line every N frames?
                // Or leave it visual + slight large hit box.

                // Let's create a temporary projectile at end of beam to ensure it hits things?
                // No, that's messy.
                // Let's manually check distance to target if close enough.
                const distToPlayer = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
                if (distToPlayer < reach) {
                    const angleToPlayer = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
                    const diff = Phaser.Math.Angle.Wrap(angleToPlayer - angle);
                    if (Math.abs(diff) < 0.2) { // Hit cone
                        const p = this.target as any; // Player
                        // Apply damage
                        if (p.takeDamage) p.takeDamage(1); // Rapid tick
                    }
                }
            }
        }
    }
}
