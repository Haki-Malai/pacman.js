import Phaser from 'phaser';
import './style.css';
import GameScene from './scenes/GameScene';
import PreloadScene from './scenes/PreloadScene';
import UIScene from './scenes/UIScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#2d2d2d',
  parent: 'phaser-example',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
    },
  },
  fps: {
    target: 60,
    forceSetTimeOut: true,
  },
  pixelArt: true,
  scene: [PreloadScene, GameScene, UIScene],
};

new Phaser.Game(config);
