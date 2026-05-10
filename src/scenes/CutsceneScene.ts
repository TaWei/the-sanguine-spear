import Phaser from 'phaser';
import { createCutscenePlayer, getCutscene, getCharacter } from '../game/cutscene';

const GAME_WIDTH = 1024;
const GAME_HEIGHT = 768;

// Layout constants
const DIALOG_BOX_HEIGHT = 180;
const DIALOG_BOX_Y = GAME_HEIGHT - DIALOG_BOX_HEIGHT;
const DIALOG_PADDING = 20;
const NAME_LABEL_HEIGHT = 30;
const TYPEWRITER_SPEED = 25; // ms per character
const PORTRAIT_Y = GAME_HEIGHT - DIALOG_BOX_HEIGHT - 20;
const PORTRAIT_LEFT_X = 80;
const PORTRAIT_RIGHT_X = GAME_WIDTH - 80;

// Colors (Fire Emblem GBA-inspired)
const DIALOG_BG_COLOR = 0x1a1a2e;
const DIALOG_BORDER_COLOR = 0x4a4a6e;
const NAME_BG_COLOR = 0x2c3e50;
const TEXT_COLOR = '#ecf0f1';
const DIM_ALPHA = 0.4;

export class CutsceneScene extends Phaser.Scene {
  private player!: ReturnType<typeof createCutscenePlayer>;
  private cutsceneId!: string;
  private onComplete!: () => void;
  private isOverlay = false;

  // Visual elements
  private bgRect!: Phaser.GameObjects.Rectangle;
  private nameLabel!: Phaser.GameObjects.Container;
  private nameText!: Phaser.GameObjects.Text;
  private dialogText!: Phaser.GameObjects.Text;
  private advanceIndicator!: Phaser.GameObjects.Text;
  private portraits = new Map<string, Phaser.GameObjects.Container>();

  // Typewriter state
  private fullText = '';
  private displayedLength = 0;
  private typewriterTimer: Phaser.Time.TimerEvent | null = null;
  private isTyping = false;
  private waitingForInput = false;
  private waitTimer: Phaser.Time.TimerEvent | null = null;

  // Input debounce
  private lastAdvanceTime = 0;
  private static readonly ADVANCE_COOLDOWN_MS = 150;

  // Finish guard
  private isFinishing = false;

  constructor() {
    super({ key: 'CutsceneScene' });
  }

  init(data: { cutsceneId: string; overlay?: boolean; onComplete?: () => void }): void {
    this.cutsceneId = data.cutsceneId;
    this.isOverlay = data.overlay ?? false;
    this.onComplete = data.onComplete ?? (() => undefined);
    this.isFinishing = false;
    this.lastAdvanceTime = 0;
  }

  create(): void {
    this.input.enabled = true;
    if (!this.isOverlay) {
      this.cameras.main.fadeIn(300, 0, 0, 0);
    }

    const script = getCutscene(this.cutsceneId);
    if (!script) {
      console.error(`Cutscene not found: ${this.cutsceneId}`);
      this.finishCutscene();
      return;
    }

    this.player = createCutscenePlayer(script);

    this.createBackground();
    this.createDialogBox();
    this.setupInput();
    this.processCurrentFrame();
  }

  private createBackground(): void {
    if (this.isOverlay) {
      this.add
        .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6)
        .setDepth(0);
    } else {
      this.bgRect = this.add
        .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0a0a1a)
        .setDepth(0);
    }
  }

  private createDialogBox(): void {
    // Dialog box background
    this.add
      .rectangle(
        GAME_WIDTH / 2,
        DIALOG_BOX_Y + DIALOG_BOX_HEIGHT / 2,
        GAME_WIDTH - 40,
        DIALOG_BOX_HEIGHT,
        DIALOG_BG_COLOR,
      )
      .setDepth(10)
      .setStrokeStyle(2, DIALOG_BORDER_COLOR);

    // Name label container (positioned at top-left of dialog box)
    const nameBg = this.add
      .rectangle(0, 0, 120, NAME_LABEL_HEIGHT, NAME_BG_COLOR)
      .setStrokeStyle(1, DIALOG_BORDER_COLOR);
    this.nameText = this.add.text(6, 4, '', {
      fontSize: '16px',
      color: '#ecf0f1',
      fontStyle: 'bold',
    });
    this.nameLabel = this.add
      .container(DIALOG_PADDING, DIALOG_BOX_Y - NAME_LABEL_HEIGHT / 2, [nameBg, this.nameText])
      .setDepth(11)
      .setVisible(false);

    // Dialog text
    this.dialogText = this.add
      .text(DIALOG_PADDING + 10, DIALOG_BOX_Y + DIALOG_PADDING, '', {
        fontSize: '18px',
        color: TEXT_COLOR,
        wordWrap: { width: GAME_WIDTH - 60 },
        lineSpacing: 6,
      })
      .setDepth(11);

    // Advance indicator (blinking triangle) — bottom right of dialog box
    this.advanceIndicator = this.add
      .text(GAME_WIDTH - 60, DIALOG_BOX_Y + DIALOG_BOX_HEIGHT - 30, '▶', {
        fontSize: '16px',
        color: '#f1c40f',
      })
      .setDepth(11)
      .setVisible(false);

    // Blink the advance indicator
    this.tweens.add({
      targets: this.advanceIndicator,
      alpha: 0.3,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });
  }

  private setupInput(): void {
    const keyboard = this.input.keyboard;
    if (keyboard) {
      keyboard.on('keydown-SPACE', () => {
        this.handleAdvance();
      });
      keyboard.on('keydown-ENTER', () => {
        this.handleAdvance();
      });
      keyboard.on('keydown-ESC', () => {
        this.handleAdvance();
      });
    }
    this.input.on('pointerdown', () => {
      this.handleAdvance();
    });
  }

  private handleAdvance(): void {
    if (this.isFinishing) {
      return;
    }

    const now = Date.now();
    if (now - this.lastAdvanceTime < CutsceneScene.ADVANCE_COOLDOWN_MS) {
      return;
    }
    this.lastAdvanceTime = now;

    if (this.player.isComplete()) {
      this.finishCutscene();
      return;
    }

    const frame = this.player.getCurrentFrame();
    if (!frame) {
      return;
    }

    // If wait frame: skip waiting
    if (frame.type === 'wait' && this.waitTimer) {
      this.waitTimer.destroy();
      this.waitTimer = null;
      this.player.advance();
      this.processCurrentFrame();
      return;
    }

    // If currently typing: complete the text instantly
    if (this.isTyping) {
      this.completeText();
      return;
    }

    // If waiting for input: advance
    if (this.waitingForInput) {
      this.player.advance();
      this.processCurrentFrame();
    }
  }

  private processCurrentFrame(): void {
    const frame = this.player.getCurrentFrame();
    if (!frame || frame.type === 'end') {
      this.finishCutscene();
      return;
    }

    this.waitingForInput = false;
    this.advanceIndicator.setVisible(false);

    switch (frame.type) {
      case 'speak':
        this.handleSpeak(frame);
        break;
      case 'enter':
        this.handleEnter(frame);
        this.player.advance();
        this.processCurrentFrame();
        break;
      case 'exit':
        this.handleExit(frame);
        this.player.advance();
        this.processCurrentFrame();
        break;
      case 'expression':
        this.handleExpression(frame);
        this.player.advance();
        this.processCurrentFrame();
        break;
      case 'background':
        this.handleBackground(frame);
        this.player.advance();
        this.processCurrentFrame();
        break;
      case 'wait':
        this.handleWait(frame);
        break;
      case 'goto':
        // goto is handled automatically by CutscenePlayer
        this.player.advance();
        this.processCurrentFrame();
        break;
    }
  }

  private handleSpeak(frame: { speakerId: string; text: string }): void {
    const char = getCharacter(frame.speakerId);
    const name = char?.name ?? frame.speakerId;

    // Show name label
    this.nameText.setText(name);
    this.nameLabel.setVisible(true);

    // Update portrait brightness
    this.updatePortraitBrightness(frame.speakerId);

    // Start typewriter
    this.fullText = frame.text;
    this.displayedLength = 0;
    this.isTyping = true;
    this.startTypewriter();
  }

  private startTypewriter(): void {
    if (this.typewriterTimer) {
      this.typewriterTimer.destroy();
    }

    this.typewriterTimer = this.time.addEvent({
      delay: TYPEWRITER_SPEED,
      callback: () => {
        this.displayedLength++;
        this.dialogText.setText(this.fullText.slice(0, this.displayedLength));
        if (this.displayedLength >= this.fullText.length) {
          this.completeText();
        }
      },
      repeat: this.fullText.length - 1,
    });
  }

  private completeText(): void {
    if (this.typewriterTimer) {
      this.typewriterTimer.destroy();
      this.typewriterTimer = null;
    }
    this.displayedLength = this.fullText.length;
    this.dialogText.setText(this.fullText);
    this.isTyping = false;
    this.waitingForInput = true;
    this.advanceIndicator.setVisible(true);
  }

  private handleEnter(frame: { characterId: string; position: string; expression?: string }): void {
    const char = getCharacter(frame.characterId);
    if (!char) {
      return;
    }

    const xPos = frame.position === 'left' ? PORTRAIT_LEFT_X : PORTRAIT_RIGHT_X;

    // Placeholder portrait (colored rectangle with name) — replace with sprite when assets exist
    const portraitWidth = 140;
    const portraitHeight = 160;
    const bg = this.add
      .rectangle(0, 0, portraitWidth, portraitHeight, 0x34495e)
      .setStrokeStyle(2, 0x5a6a7e);

    const label = this.add
      .text(0, portraitHeight / 2 + 16, char.name.slice(0, 6), {
        fontSize: '14px',
        color: '#ecf0f1',
        stroke: '#000000',
        strokeThickness: 2,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const container = this.add.container(xPos, PORTRAIT_Y, [bg, label]).setDepth(5).setAlpha(0);

    this.portraits.set(frame.characterId, container);

    // Fade in
    this.tweens.add({
      targets: container,
      alpha: 1,
      duration: 300,
      ease: 'Power2',
    });
  }

  private handleExit(frame: { characterId: string }): void {
    const container = this.portraits.get(frame.characterId);
    if (container) {
      this.tweens.add({
        targets: container,
        alpha: 0,
        duration: 300,
        onComplete: () => {
          container.destroy();
          this.portraits.delete(frame.characterId);
        },
      });
    }
  }

  private handleExpression(frame: { characterId: string; expression: string }): void {
    const container = this.portraits.get(frame.characterId);
    if (container) {
      // Brief flash to indicate expression change
      this.tweens.add({
        targets: container,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 100,
        yoyo: true,
      });
    }
  }

  private handleBackground(frame: { backgroundKey: string }): void {
    const bgColors: Record<string, number> = {
      throne_room: 0x2c1810,
      castle: 0x1a2a1a,
      field: 0x2a3a1a,
      forest: 0x0a1a0a,
      default: 0x0a0a1a,
    };
    this.bgRect.setFillStyle(bgColors[frame.backgroundKey] ?? bgColors.default);
  }

  private handleWait(frame: { duration: number }): void {
    this.waitTimer = this.time.delayedCall(frame.duration, () => {
      this.waitTimer = null;
      this.player.advance();
      this.processCurrentFrame();
    });
    // Click/space will skip via handleAdvance
  }

  private updatePortraitBrightness(speakerId: string): void {
    for (const [id, container] of this.portraits) {
      if (id === speakerId) {
        container.setAlpha(1);
        // Slight scale-up for speaker
        this.tweens.add({
          targets: container,
          scaleX: 1.05,
          scaleY: 1.05,
          duration: 150,
        });
      } else {
        container.setAlpha(DIM_ALPHA);
        container.setScale(1);
      }
    }
  }

  private finishCutscene(): void {
    if (this.isFinishing) {
      return;
    }
    this.isFinishing = true;
    this.input.enabled = false;

    if (this.isOverlay) {
      this.cleanupScene();
      this.onComplete();
      this.scene.stop();
      return;
    }

    this.cameras.main.fadeOut(300, 0, 0, 0, (_camera: unknown, progress: number) => {
      if (progress === 1) {
        this.cleanupScene();
        this.onComplete();
      }
    });
  }

  private cleanupScene(): void {
    if (this.typewriterTimer) {
      this.typewriterTimer.destroy();
      this.typewriterTimer = null;
    }
    if (this.waitTimer) {
      this.waitTimer.destroy();
      this.waitTimer = null;
    }
    for (const container of this.portraits.values()) {
      container.destroy();
    }
    this.portraits.clear();
  }
}
