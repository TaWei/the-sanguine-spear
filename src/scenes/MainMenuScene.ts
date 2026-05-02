import Phaser from 'phaser';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create(): void {
    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;

    this.add.text(cx, cy - 80, 'The Sanguine Spear', {
      fontSize: '48px',
      color: '#c0392b',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(cx, cy, 'Fire Emblem-inspired Tactical RPG', {
      fontSize: '18px',
      color: '#bdc3c7',
    }).setOrigin(0.5);

    const startBtn = this.add.text(cx, cy + 80, '[ Start Game ]', {
      fontSize: '24px',
      color: '#ecf0f1',
      backgroundColor: '#2c3e50',
      padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    startBtn.on('pointerover', () => startBtn.setStyle({ color: '#f1c40f' }));
    startBtn.on('pointerout', () => startBtn.setStyle({ color: '#ecf0f1' }));
    startBtn.on('pointerdown', () => {
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('BattleScene');
      });
    });
  }
}
