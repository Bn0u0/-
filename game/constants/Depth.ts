/**
 * THE DEPTH CONSTITUTION (Z-Index & Render Order)
 * 
 * Rules:
 * 1. HTML_LAYER: Defines CSS z-index for UI overlay.
 * 2. GAME_LAYER: Defines Phaser setDepth() for in-game objects.
 * 3. Never use magic numbers. Import from here.
 */

export const HTML_LAYER = {
    // Top to Bottom
    DEBUG: 9999,
    MODAL: 200,      // Popups, Alerts, Game Over
    HUD: 50,         // Health, Ammo, Pause Button
    ABOVE_JOYSTICK: 45, // Reserved
    JOYSTICK: 40,    // Virtual Stick (Must catch clicks below HUD)
    MENU: 20,        // Main Menu / Hideout (Non-Combat UI)
    PHASER_DOM: 0,   // The Game Container
    BODY_BG: -1      // CSS Background
};

export const GAME_LAYER = {
    // Top to Bottom (Phaser Depth)
    UI_TEXT: 999999, // Damage Numbers, Floating Text
    VFX_TOP: 5000,   // Explosion, Flash
    OVERLAY_PANIC: 2000, // Red screen flash

    // Dynamic Entity Layer (Y-Sort Range)
    // Units should set depth = y.
    // Flying units = y + 1000.
    FLYING_UNIT_OFFSET: 1000,

    // Fixed Layers
    PROJECTILE: 0,   // Usually dynamic, or above clutter? Maybe Y-sort too?
    LOOT: 0,         // Dynamic Y-Sort required.

    // Floor
    CLUTTER: 1,      // Debris ON the floor (above tiles)
    WALL_BASE: 1,    // Base of wall

    // Underground
    GROUND: -10,     // Floor Tiles
    BELOW_GROUND: -20
};
