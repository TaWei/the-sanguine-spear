import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { BattleScene } from './scenes/BattleScene';
import { CutsceneScene } from './scenes/CutsceneScene';
import { GAME_WIDTH, GAME_HEIGHT } from './constants';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#1a1a2e',
  parent: document.body,
  scene: [BootScene, MainMenuScene, BattleScene, CutsceneScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  pixelArt: true,
};

window.addEventListener('DOMContentLoaded', () => {
  new Phaser.Game(config);
});
