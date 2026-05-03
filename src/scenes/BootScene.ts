import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    this.add
      .text(this.cameras.main.centerX, this.cameras.main.centerY, 'Loading...', {
        fontSize: '24px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    // TODO: Load spritesheets, tilemaps, audio
    // this.load.image('tiles', 'assets/tiles.png');
    // this.load.spritesheet('units', 'assets/units.png', { frameWidth: 32, frameHeight: 32 });
  }

  create(): void {
    this.scene.start('MainMenuScene');
  }
}
