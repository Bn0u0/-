import Phaser from 'phaser';
import { EventBus } from '../../services/EventBus';
import { ItemInstance, ItemDef, ItemRarity } from '../../types';
import { ItemLibrary } from '../data/library/items';

export type WeaponBehavior = 'MELEE_SWEEP' | 'HOMING_ORB' | 'SHOCKWAVE' | 'LASER' | 'BOOMERANG' | 'PISTOL_SHOT' | 'DRONE_BEAM';

export class WeaponSystem {
    private scene: Phaser.Scene;
    public projectiles: Phaser.GameObjects.Group;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.projectiles = scene.add.group();
    }

    public fire(weapon: ItemInstance, source: { x: number, y: number, rotation: number, id: string }, playerStats: any, target?: { x: number, y: number }) {
        const def = ItemLibrary.get(weapon.defId);
        if (!def || !def.behavior) return;

        // Combine Stats (Item Computed + Player)
        // For now, simplicity:
        const stats = {
            damage: weapon.computedStats.damage,
            speed: weapon.computedStats.speed || 400,
            range: weapon.computedStats.range,
            projectileCount: 1, // TODO: Add to ItemStats?
            spreadMod: 0
        };

        EventBus.emit('PLAY_SFX', 'SHOOT');

        // [JUICE] Wave 6: Recoil (Physics Pushback)
        const player = this.scene instanceof Phaser.Scene ? (this.scene as any).myUnit : null; // HACK to access player
        if (player && player.body) {
            const recoilForce = 200;
            player.body.velocity.x -= Math.cos(source.rotation) * recoilForce;
            player.body.velocity.y -= Math.sin(source.rotation) * recoilForce;
        }

        // [JUICE] Wave 8: Muzzle Flash
        const flash = this.scene.add.circle(
            source.x + Math.cos(source.rotation) * 40,
            source.y + Math.sin(source.rotation) * 40,
            15,
            0xFFFF00
        );
        flash.setBlendMode(Phaser.BlendModes.ADD);
        this.scene.tweens.add({
            targets: flash,
            scale: { from: 1, to: 0 },
            alpha: { from: 1, to: 0 },
            duration: 50,
            onComplete: () => flash.destroy()
        });

        // Apply Modifiers from weapon instance
        // let finalStats = { ...stats };
        // weapon.modifiers.forEach((mod: WeaponModifier) => {
        //     if (mod.type === 'PROJECTILE_COUNT') finalStats.projectileCount += mod.value;
        //     if (mod.type === 'SPREAD') finalStats.spreadMod = (finalStats.spreadMod || 1) + mod.value;
        //     // ... other mods
        // });

        // For now, simplified projectile count and spread
        const finalProjectileCount = stats.projectileCount; // Use the simplified stats
        const spread = 0.2; // Radian spread (hardcoded for now)

        for (let i = 0; i < finalProjectileCount; i++) {
            // Calculate angle offset
            let angle = source.rotation;
            if (finalProjectileCount > 1) {
                angle += (i - (finalProjectileCount - 1) / 2) * spread;
            }

            // Create modified source
            const modifiedSource = { ...source, rotation: angle };

            switch (def.behavior) {
                case 'MELEE_SWEEP':
                    this.fireMelee(modifiedSource, stats);
                    break;
                case 'HOMING_ORB':
                    this.fireHomingOrb(modifiedSource, stats, target);
                    break;
                case 'SHOCKWAVE':
                    this.fireShockwave(modifiedSource, stats);
                    break;
                case 'LASER':
                    this.fireLaser(modifiedSource, stats);
                    break;
                case 'BOOMERANG':
                    this.fireBoomerang(modifiedSource, stats);
                    break;
                case 'PISTOL_SHOT':
                    this.firePistol(modifiedSource, stats, target);
                    break;
                case 'DRONE_BEAM':
                    this.fireDroneBeam(modifiedSource, stats, target);
                    break;
            }
        }
    }

    private firePistol(source: { x: number, y: number, rotation: number }, stats: any, target?: any) {
        // Tier 0 Ranger Ability: Fast, Hitscan-like projectile
        const projectile = this.scene.physics.add.sprite(source.x, source.y, 'tex_orb'); // Use basic shape

        // Visual: Thin bullet
        projectile.setScale(0.3, 0.3);
        projectile.setTint(0xFF4444);

        const speed = stats.speed || 1200; // Very fast
        const vecX = Math.cos(source.rotation) * speed;
        const vecY = Math.sin(source.rotation) * speed;

        const body = projectile.body as Phaser.Physics.Arcade.Body;
        body.setVelocity(vecX, vecY);
        body.setCircle(10);

        // [LOGIC] Attach Damage for CombatManager
        (projectile as any).damage = stats.damage;

        // Trail effect?
        // Simple expire
        this.scene.time.delayedCall(1000, () => projectile.destroy());
    }

    private fireDroneBeam(source: { x: number, y: number, rotation: number }, stats: any, target?: any) {
        // Tier 0 Weaver Ability: Auto-lock beam if target exists, else weak projectile
        if (target) {
            // Beam to target
            const graphics = this.scene.add.graphics();
            graphics.lineStyle(2, 0x00FFFF, 0.8);
            graphics.lineBetween(source.x, source.y, target.x, target.y);

            this.scene.tweens.add({
                targets: graphics,
                alpha: 0,
                duration: 100,
                onComplete: () => graphics.destroy()
            });

            // Instant hit logic needs to be handled by combat manager or here?
            // For now, let's spawn an invisible projectile at target to trigger collision logic
            // Or just make a homing particle
            const proj = this.scene.physics.add.sprite(source.x, source.y, 'tex_orb');

            // [FIX] Attach Damage or it deals 0
            (proj as any).damage = stats.damage;

            proj.setVisible(false);
            proj.body.setSize(10, 10);
            this.scene.physics.moveToObject(proj, target, 2000);
            // It will hit next frame
        } else {
            // Dumb fire
            const args = { ...source }; // clone
            // Add some jitter
            args.rotation += (Math.random() - 0.5) * 0.5;
            this.firePistol(args, { ...stats, speed: 600 }); // Reuse pistol logic but weak
        }
    }

    private fireMelee(source: { x: number, y: number, rotation: number }, stats: any) {
        // Visual: Kinetic Arc (Swipe)
        const graphics = this.scene.add.graphics({ x: source.x, y: source.y });
        graphics.setDepth(20);
        graphics.setRotation(source.rotation);

        const radius = stats.range || 90;
        const color = 0x00FFFF;

        // Draw Swoosh
        graphics.lineStyle(0, 0x000000, 0); // Fix: Provide dummy color/alpha
        graphics.fillStyle(color, 0.6);
        graphics.beginPath();
        graphics.arc(0, 0, radius, -Math.PI / 3, Math.PI / 3, false);
        graphics.arc(0, 0, radius - 20, Math.PI / 3, -Math.PI / 3, true);
        graphics.closePath();
        graphics.fillPath();

        this.scene.tweens.add({
            targets: graphics,
            alpha: 0,
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 150,
            onComplete: () => graphics.destroy()
        });
    }

    private fireHomingOrb(source: { x: number, y: number }, stats: any, target?: { x: number, y: number }) {
        // Use Baked Texture
        const scale = 0.5; // (stats.sizeMod || 1);
        const orb = this.scene.physics.add.sprite(source.x, source.y, 'tex_orb');
        orb.setScale(scale);
        orb.setTint(0xFF77BC);

        // Spin animation
        this.scene.tweens.add({
            targets: orb,
            angle: 360,
            duration: 1000,
            repeat: -1
        });

        const body = orb.body as Phaser.Physics.Arcade.Body;
        body.setCircle(24); // Hitbox based on 64x64 texture

        if (target) {
            this.scene.physics.moveTo(orb, target.x, target.y, stats.speed || 400);
        } else {
            body.setVelocity(Math.random() * 200 - 100, Math.random() * 200 - 100);
        }

        this.scene.time.delayedCall(2000, () => {
            if (orb.active) {
                // Fizzle out
                this.scene.tweens.add({ targets: orb, scale: 0, alpha: 0, duration: 200, onComplete: () => orb.destroy() });
            }
        });
    }

    private fireShockwave(source: { x: number, y: number }, stats: any) {
        const circle = this.scene.add.circle(source.x, source.y, 10, 0xFFD700);
        circle.setStrokeStyle(4, 0xFFD700);

        this.scene.tweens.add({
            targets: circle,
            radius: stats.range || 120, // * (stats.sizeMod || 1),
            alpha: 0,
            lineWidth: 0,
            duration: 350,
            ease: 'Quad.out',
            onComplete: () => circle.destroy()
        });
    }

    private fireLaser(source: { x: number, y: number, rotation: number }, stats: any) {
        // Create Graphics for Laser
        const graphics = this.scene.add.graphics();
        this.projectiles.add(graphics as any); // Add to group to manage depth/cleanup if needed (hack)

        const width = 4 * (stats.sizeMod || 1);
        graphics.lineStyle(width, 0x9D00FF);

        const length = 800; // Laser length
        const endX = source.x + Math.cos(source.rotation) * length;
        const endY = source.y + Math.sin(source.rotation) * length;

        graphics.lineBetween(source.x, source.y, endX, endY);

        // Core beam (White hot center)
        graphics.lineStyle(width * 0.4, 0xFFFFFF);
        graphics.lineBetween(source.x, source.y, endX, endY);

        this.scene.tweens.add({
            targets: graphics,
            scaleY: 0,
            alpha: 0,
            duration: 150,
            onComplete: () => graphics.destroy()
        });

        // Debug Hit
        // In a real system, we'd do a raycast (line intersection) against enemies here.
        // For now, this is visual only.
    }

    private fireBoomerang(source: { x: number, y: number, rotation: number }, stats: any) {
        const scale = 0.6 * (stats.sizeMod || 1);
        const projectile = this.scene.physics.add.sprite(source.x, source.y, 'tex_boomerang');

        if (!this.scene.textures.exists('tex_boomerang')) {
            projectile.setTexture('icon_scrap_metal'); // Fallback
            projectile.setTint(0x00FF00);
        }

        projectile.setScale(scale);
        this.projectiles.add(projectile);

        // Fast Spin
        this.scene.tweens.add({
            targets: projectile,
            angle: 360,
            duration: 150,
            repeat: -1
        });

        const body = projectile.body as Phaser.Physics.Arcade.Body;
        if (body) {
            body.setCircle(16);
            const speed = 600;
            const vecX = Math.cos(source.rotation) * speed;
            const vecY = Math.sin(source.rotation) * speed;
            body.setVelocity(vecX, vecY);
        }

        // Return Logic
        this.scene.time.delayedCall(400, () => {
            if (projectile.active && body) {
                this.scene.physics.moveTo(projectile, source.x, source.y, 600);
            }
        });
        this.scene.time.delayedCall(1200, () => projectile.destroy());
    }


}
