import Phaser from 'phaser';
import { BaseMechanic } from './ClassMechanic';
import { Player } from '../classes/Player';
import { EventBus } from '../../services/EventBus';

export class ScavengerLogic extends BaseMechanic {
    private shieldHp: number = 0;
    private maxShieldHp: number = 0;
    private shieldCooldown: number = 0;
    private shieldActive: boolean = false;

    // Config
    private readonly COOLDOWN_MS = 20000;
    private readonly TRIGGER_HP_PERCENT = 0.3;
    private readonly SHIELD_PERCENT = 0.4;
    private readonly LOOT_HEAL = 2;

    constructor(player: Player) {
        super(player);
    }

    update(dt: number): void {
        if (this.shieldCooldown > 0) {
            this.shieldCooldown -= dt;
        }

        // Auto-Trigger Check
        if (!this.shieldActive && this.shieldCooldown <= 0) {
            const hpPercent = this.player.stats.hp / this.player.stats.maxHp;
            if (hpPercent < this.TRIGGER_HP_PERCENT) {
                this.activateShield();
            }
        }
    }

    private activateShield() {
        this.shieldActive = true;
        this.maxShieldHp = Math.floor(this.player.stats.maxHp * this.SHIELD_PERCENT);
        this.shieldHp = this.maxShieldHp;
        this.shieldCooldown = this.COOLDOWN_MS;

        // Visual
        EventBus.emit('SHOW_FLOATING_TEXT', {
            x: this.player.x, y: this.player.y - 50,
            text: "SCRAP SHIELD!", color: "#FFFF00"
        });

        // Sound could go here
    }

    onHit(damage: number): number {
        if (this.shieldActive && this.shieldHp > 0) {
            // Shield absorbs damage
            const absorbed = Math.min(this.shieldHp, damage);
            this.shieldHp -= absorbed;
            damage -= absorbed;

            // Visual Feedback for Block
            EventBus.emit('SHOW_FLOATING_TEXT', {
                x: this.player.x, y: this.player.y - 30,
                text: `(-${Math.floor(absorbed)})`, color: "#CCCCCC"
            });

            if (this.shieldHp <= 0) {
                this.shieldActive = false;
                EventBus.emit('SHOW_FLOATING_TEXT', {
                    x: this.player.x, y: this.player.y - 50,
                    text: "SHIELD BROKEN", color: "#FF0000"
                });
            }
            return damage;
        }

        // Auto-Trigger on Big Hit? 
        // If damage > 20% max HP, maybe trigger shield NEXT frame?
        // Current logic handles on update check for low HP.
        return damage;
    }

    onLoot(amount: number): void {
        // Vigor: Heal on loot
        if (this.player.stats.hp < this.player.stats.maxHp) {
            this.player.stats.hp = Math.min(this.player.stats.maxHp, this.player.stats.hp + this.LOOT_HEAL);
            // Subtle visual
        }
    }

    draw(g: Phaser.GameObjects.Graphics): void {
        if (this.shieldActive && this.shieldHp > 0) {
            // Draw Scrappy Shield
            g.lineStyle(4, 0xFFFF00, 0.7);
            const radius = 30 + Math.sin(this.scene.time.now / 100) * 2;

            // Draw a broken circle (scrap pieces)
            g.beginPath();
            g.arc(0, 0, radius, 0, Math.PI * 1.8);
            g.strokePath();

            // Shield Bar
            g.fillStyle(0xFFFF00, 1);
            const barWidth = 40;
            const pct = this.shieldHp / this.maxShieldHp;
            g.fillRect(-20, -50, barWidth * pct, 4);
        }
    }
}
