import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { MainScene } from './scenes/MainScene';
import { COLORS } from '../constants';

export const PhaserGame: React.FC = () => {
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    // We target the external 'game-container' div defined in index.html
    const container = document.getElementById('game-container');
    if (!container) return;

    // Ensure we don't pass 0 dimensions to config
    const initialWidth = Math.max(window.innerWidth, 320);
    const initialHeight = Math.max(window.innerHeight, 240);

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: 'game-container', // Direct ID reference to the z-0 container
      backgroundColor: COLORS.bg,
      width: '100%',
      height: '100%',
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      render: {
        powerPreference: 'high-performance',
        antialias: false,
        pixelArt: true,
        roundPixels: true,
        maxLights: 20 // Module A: Deferred Lighting Prerequisite
      },
      physics: {
        default: 'arcade',
        arcade: {
          debug: false,
        },
      },
      scene: [MainScene],
      input: {
        activePointers: 3, // Support Multitouch
      }
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  // Render nothing, as the game is attached to #game-container outside the React tree
  return null;
};