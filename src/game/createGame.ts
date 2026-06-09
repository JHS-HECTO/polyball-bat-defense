import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from './config';
import { BootScene } from './scenes/BootScene';
import { MainScene } from './scenes/MainScene';

export const createGame = (parent: HTMLElement): Phaser.Game => {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: PALETTE.surfaceBase,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: 'arcade',
      arcade: { gravity: { x: 0, y: 0 }, debug: false },
    },
    fps: { target: 60, forceSetTimeOut: true },
    render: {
      antialias: true,
      pixelArt: false,
      roundPixels: false,
      preserveDrawingBuffer: true,
    },
    input: { activePointers: 2 },
    scene: [BootScene, MainScene],
    audio: { disableWebAudio: false, noAudio: false },
  };
  return new Phaser.Game(config);
};
