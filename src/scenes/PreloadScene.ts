import Phaser from 'phaser';

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Preload' });
  }

  preload(): void {
    this.load.image('tiles', 'assets/sprites/Tileset.png');
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
    this.load.tilemapTiledJSON('maze', 'assets/mazes/default/pacman.json');
  }

  create(): void {
    this.scene.start('Game');
    this.scene.launch('UI');
    this.scene.bringToTop('UI');
  }
}
