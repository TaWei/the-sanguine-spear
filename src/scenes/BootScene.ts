import Phaser from 'phaser';
import {
  registerCutscene,
  prologueCutscene,
  firstBattleWarningCutscene,
  bossDefeatedCutscene,
} from '../game/cutscene';
import atlasData from '../../public/assets/sprites/atlas.json';

interface AtlasEntry {
  frameWidth: number;
  frameHeight: number;
  states: { name: string; frames: number }[];
}

const typedAtlas = atlasData as Record<string, AtlasEntry>;

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

    // Load generated placeholder spritesheets
    for (const [key, data] of Object.entries(typedAtlas)) {
      this.load.spritesheet(key, `assets/sprites/${key}.png`, {
        frameWidth: data.frameWidth,
        frameHeight: data.frameHeight,
      });
    }
  }

  create(): void {
    // Create animations from loaded spritesheets
    for (const [textureKey, data] of Object.entries(typedAtlas)) {
      let frameCursor = 0;
      for (const state of data.states) {
        const animKey = `${textureKey}-${state.name}`;
        if (this.anims.exists(animKey)) continue;

        const frameArray: Phaser.Types.Animations.AnimationFrame[] = [];
        for (let i = 0; i < state.frames; i++) {
          frameArray.push({ key: textureKey, frame: frameCursor + i });
        }
        frameCursor += state.frames;

        this.anims.create({
          key: animKey,
          frames: frameArray,
          frameRate: state.name === 'crit' ? 12 : state.name === 'death' ? 6 : 8,
          repeat: state.name === 'idle' ? -1 : 0,
        });
      }
    }

    registerCutscene(prologueCutscene);
    registerCutscene(firstBattleWarningCutscene);
    registerCutscene(bossDefeatedCutscene);
    this.scene.start('MainMenuScene');
  }
}
