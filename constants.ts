export const COLORS = {
  // 60% Base: Warm Apocalypse (Eastward)
  bg: 0x2D1B2E,          // World BG (Deep Purple)
  ambient: 0x665566,     // Warm Grey Ambient
  heroLight: 0xFFD1A9,   // 3500K Tungsten
  shadow: 0x1B1020,      // Deep Shadow (Not pure black)

  // 30% Core: Tactical Chibi (Cult of the Lamb)
  primary: 0x00FFFF,     // Cyan (Main Player Color)
  secondary: 0xFF00FF,   // Magenta (Enemy Color)
  accent: 0xFFD700,      // Gold (UI/Loot)

  // 10% Glitch: Pop (Atomicrops)
  glitchCyan: 0x00FFFF,
  glitchMagenta: 0xFF00FF,

  // Legacy mapping
  white: 0xFFFFFF,
  black: 0x000000,
  text: '#eddbda'
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