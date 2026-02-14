import Phaser from 'phaser';

const TILE_IMAGES = [
  'tile-00.png',
  'tile-01.png',
  'tile-02.png',
  'tile-05.png',
  'tile-06.png',
  'tile-07.png',
  'tile-10.png',
  'tile-14.png',
  'tile-15.png',
  'tile-16.png',
  'tile-17.png',
  'tile-18.png',
  'tile-19.png',
  'tile-20.png',
  'tile-21.png',
  'tile-23.png',
] as const;

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Preload' });
  }

  preload(): void {
    TILE_IMAGES.forEach((file) => {
      const key = `source/tiles/${file}`;
      this.load.image(key, `assets/mazes/default/source/tiles/${file}`);
    });
    this.load.image('point', 'assets/sprites/Point.png');
    this.load.image('banana', 'assets/sprites/Banana.png');
    this.load.image('cherry', 'assets/sprites/Cherry.png');
    this.load.image('heart', 'assets/sprites/Heart.png');
    this.load.image('pear', 'assets/sprites/Pear.png');
    this.load.image('strawberry', 'assets/sprites/Strawberry.png');
    this.load.spritesheet('pacman', 'assets/sprites/PacMan.png', { frameWidth: 85, frameHeight: 91 });
    this.load.spritesheet('blinky', 'assets/sprites/Blinky.png', { frameWidth: 85, frameHeight: 91 });
    this.load.spritesheet('clyde', 'assets/sprites/Clyde.png', { frameWidth: 85, frameHeight: 91 });
    this.load.spritesheet('pinky', 'assets/sprites/Pinky.png', { frameWidth: 85, frameHeight: 91 });
    this.load.spritesheet('inky', 'assets/sprites/Inky.png', { frameWidth: 85, frameHeight: 91 });
    this.load.spritesheet('scared', 'assets/sprites/Scared.png', { frameWidth: 85, frameHeight: 91 });
    this.load.tilemapTiledJSON('maze', 'assets/mazes/default/maze.json');
  }

  create(): void {
    this.scene.start('Game');
    this.scene.launch('UI');
    this.scene.bringToTop('UI');
  }
}
