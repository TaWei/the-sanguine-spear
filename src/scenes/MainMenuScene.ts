import Phaser from 'phaser';
import { SaveManager, SaveMetadata } from '../game/save';
import { getLevel } from '../game/levels/LevelData';

export class MainMenuScene extends Phaser.Scene {
  private saveListContainer: Phaser.GameObjects.Container | null = null;
  private cutsceneActive = false;

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
      .text(cx, cy + 40, '[ New Campaign ]', {
        fontSize: '24px',
        color: '#ecf0f1',
        backgroundColor: '#2c3e50',
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    startBtn.on('pointerover', () => startBtn.setStyle({ color: '#f1c40f' }));
    startBtn.on('pointerout', () => startBtn.setStyle({ color: '#ecf0f1' }));
    startBtn.on(
      'pointerdown',
      (
        _pointer: unknown,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        if (this.cutsceneActive) return;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        event.stopPropagation();
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start('BattleScene', { levelId: 'level-1' });
        });
      },
    );

    // ── Level Select Grid (2 columns, all 13 levels) ──
    const levelIds = [
      'level-1',
      'level-2',
      'level-3',
      'level-4',
      'level-5',
      'level-6',
      'level-7',
      'level-8',
      'level-9',
      'level-10',
      'level-11',
      'level-12',
      'level-13',
    ];

    const levelColors: Record<string, string> = {
      'level-1': '#2c3e50',
      'level-2': '#8b2500',
      'level-3': '#1b4f72',
      'level-4': '#1e5e33',
      'level-5': '#2c3e50',
      'level-6': '#8b0000',
      'level-7': '#8b6914',
      'level-8': '#4a4a5a',
      'level-9': '#1b4f72',
      'level-10': '#1e5e33',
      'level-11': '#5d4037',
      'level-12': '#8b6914',
      'level-13': '#8b0000',
    };

    const gridStartY = cy + 95;
    const rowHeight = 42;
    const colX = [cx - 260, cx + 260];

    levelIds.forEach((levelId, index) => {
      const level = getLevel(levelId);
      const label = level ? `[ ${level.name} ]` : `[ ${levelId} ]`;
      const col = index % 2;
      const row = Math.floor(index / 2);
      const bx = colX[col];
      const by = gridStartY + row * rowHeight;

      const btn = this.add
        .text(bx, by, label, {
          fontSize: '18px',
          color: '#ecf0f1',
          backgroundColor: levelColors[levelId] ?? '#2c3e50',
          padding: { x: 12, y: 6 },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      btn.on('pointerover', () => btn.setStyle({ color: '#f1c40f' }));
      btn.on('pointerout', () => btn.setStyle({ color: '#ecf0f1' }));
      btn.on(
        'pointerdown',
        (
          _pointer: unknown,
          _localX: number,
          _localY: number,
          event: Phaser.Types.Input.EventData,
        ) => {
          if (this.cutsceneActive) return;
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          event.stopPropagation();
          this.cameras.main.fadeOut(500, 0, 0, 0);
          this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('BattleScene', { levelId });
          });
        },
      );
    });

    const gridBottomY = gridStartY + Math.ceil(levelIds.length / 2) * rowHeight;

    const prologueBtn = this.add
      .text(cx - 120, gridBottomY + 15, '[ Watch Prologue ]', {
        fontSize: '20px',
        color: '#bdc3c7',
        backgroundColor: '#1a1a2e',
        padding: { x: 16, y: 8 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    prologueBtn.on('pointerover', () => prologueBtn.setStyle({ color: '#f1c40f' }));
    prologueBtn.on('pointerout', () => prologueBtn.setStyle({ color: '#bdc3c7' }));
    prologueBtn.on(
      'pointerdown',
      (
        _pointer: unknown,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        if (this.cutsceneActive) return;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        event.stopPropagation();
        this.cutsceneActive = true;
        this.scene.launch('CutsceneScene', {
          cutsceneId: 'prologue_intro',
          onComplete: () => {
            this.cutsceneActive = false;
            this.scene.stop('CutsceneScene');
          },
        });
      },
    );

    const loadBtn = this.add
      .text(cx + 120, gridBottomY + 15, '[ Load Game ]', {
        fontSize: '20px',
        color: '#ecf0f1',
        backgroundColor: '#2c3e50',
        padding: { x: 16, y: 8 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    loadBtn.on('pointerover', () => loadBtn.setStyle({ color: '#f1c40f' }));
    loadBtn.on('pointerout', () => loadBtn.setStyle({ color: '#ecf0f1' }));
    loadBtn.on(
      'pointerdown',
      (
        _pointer: unknown,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        if (this.cutsceneActive) return;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        event.stopPropagation();
        this.showLoadMenu();
      },
    );
  }

  private showLoadMenu(): void {
    if (this.saveListContainer) {
      this.saveListContainer.destroy();
      this.saveListContainer = null;
      return;
    }

    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;

    const container = this.add.container(cx, cy).setDepth(100);
    this.saveListContainer = container;

    const panel = this.add.rectangle(0, 0, 500, 300, 0x1a1a2e).setStrokeStyle(2, 0xecf0f1);
    container.add(panel);

    const title = this.add
      .text(0, -120, 'Load Game', {
        fontSize: '28px',
        color: '#f1c40f',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    container.add(title);

    const saveManager = new SaveManager();
    const saves: SaveMetadata[] = saveManager.listSaves();

    if (saves.length === 0) {
      const noSaves = this.add
        .text(0, 0, 'No save files found.', {
          fontSize: '18px',
          color: '#bdc3c7',
        })
        .setOrigin(0.5);
      container.add(noSaves);
    } else {
      saves.forEach((save, index) => {
        const levelName = getLevel(save.meta.levelId)?.name ?? save.meta.levelId;
        const dateStr = new Date(save.meta.timestamp).toLocaleString();
        const label = `${String(index + 1)}. ${levelName} \u2014 Turn ${String(save.meta.turnNumber)} (${save.meta.currentPhase}) \u2014 ${dateStr}`;

        const row = this.add
          .text(0, -60 + index * 40, label, {
            fontSize: '16px',
            color: '#ecf0f1',
            backgroundColor: '#2c3e50',
            padding: { x: 10, y: 5 },
          })
          .setOrigin(0.5)
          .setInteractive({ useHandCursor: true });

        row.on('pointerover', () => row.setStyle({ color: '#f1c40f' }));
        row.on('pointerout', () => row.setStyle({ color: '#ecf0f1' }));
        row.on(
          'pointerdown',
          (
            _pointer: unknown,
            _localX: number,
            _localY: number,
            event: Phaser.Types.Input.EventData,
          ) => {
            if (this.cutsceneActive) return;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            event.stopPropagation();
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
              this.scene.start('BattleScene', {
                levelId: save.meta.levelId,
                saveSlot: save.slot,
              });
            });
          },
        );

        container.add(row);
      });
    }

    const closeBtn = this.add
      .text(0, 120, '[ Close ]', {
        fontSize: '20px',
        color: '#ecf0f1',
        backgroundColor: '#c0392b',
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    closeBtn.on('pointerover', () => closeBtn.setStyle({ color: '#f1c40f' }));
    closeBtn.on('pointerout', () => closeBtn.setStyle({ color: '#ecf0f1' }));
    closeBtn.on(
      'pointerdown',
      (
        _pointer: unknown,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        if (this.cutsceneActive) return;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        event.stopPropagation();
        container.destroy();
        this.saveListContainer = null;
      },
    );

    container.add(closeBtn);
  }
}
