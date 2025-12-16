// Cute Theme Colors
export const COLORS = {
  bg: 0xFFF0F5, // Lavender Blush / Light Pink
  primary: 0xFF69B4, // Hot Pink
  secondary: 0x87CEEB, // Sky Blue
  accent: 0xFFD700, // Gold
  white: 0xFFFFFF,

  // Grid/UI
  grid: 0xE6E6FA, // Lavender
  text: 0x555555
};

export const PHYSICS = {
  drag: 1200, // High drag for precise stopping
  acceleration: 2200, // High acceleration for snappy response
  maxVelocity: 550,
  tetherDistance: 300,
  rotationLerp: 0.15, // Smooth turning speed
};

export const FX = {
  bloom: {
    intensity: 1.5,
    strength: 1.2,
    blur: 0.8,
  },
  particles: {
    lifespan: 500,
    interval: 30,
  }
};

export const GAME_CONFIG = {
  width: window.innerWidth,
  height: window.innerHeight,
};