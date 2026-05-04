import Phaser from 'phaser';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create(): void {
    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;

    this.add
      .text(cx, cy - 80, 'The Sanguine Spear', {
        fontSize: '48px',
        color: '#c0392b',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(cx, cy, 'Fire Emblem-inspired Tactical RPG', {
        fontSize: '18px',
        color: '#bdc3c7',
      })
      .setOrigin(0.5);

    const startBtn = this.add
      .text(cx, cy + 60, '[ New Campaign ]', {
        fontSize: '24px',
        color: '#ecf0f1',
        backgroundColor: '#2c3e50',
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    startBtn.on('pointerover', () => startBtn.setStyle({ color: '#f1c40f' }));
    startBtn.on('pointerout', () => startBtn.setStyle({ color: '#ecf0f1' }));
    startBtn.on('pointerdown', (_pointer: unknown, _localX: number, _localY: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('BattleScene', { levelId: 'level-1' });
      });
    });

    const level2Btn = this.add
      .text(cx, cy + 120, '[ Level 2: The Molten Pass ]', {
        fontSize: '24px',
        color: '#ecf0f1',
        backgroundColor: '#8b2500',
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    level2Btn.on('pointerover', () => level2Btn.setStyle({ color: '#f1c40f' }));
    level2Btn.on('pointerout', () => level2Btn.setStyle({ color: '#ecf0f1' }));
    level2Btn.on('pointerdown', (_pointer: unknown, _localX: number, _localY: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('BattleScene', { levelId: 'level-2' });
      });
    });

    const prologueBtn = this.add
      .text(cx, cy + 180, '[ Watch Prologue ]', {
        fontSize: '24px',
        color: '#bdc3c7',
        backgroundColor: '#1a1a2e',
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    prologueBtn.on('pointerover', () => prologueBtn.setStyle({ color: '#f1c40f' }));
    prologueBtn.on('pointerout', () => prologueBtn.setStyle({ color: '#bdc3c7' }));
    prologueBtn.on('pointerdown', (_pointer: unknown, _localX: number, _localY: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      this.scene.launch('CutsceneScene', {
        cutsceneId: 'prologue_intro',
        onComplete: () => {
          this.scene.stop('CutsceneScene');
        },
      });
    });
  }
}
