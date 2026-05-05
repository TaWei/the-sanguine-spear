import type { CutsceneScript } from './CutsceneTypes';

export const firstBattleWarningCutscene: CutsceneScript = {
  id: 'first_battle_warning',
  title: 'First Blood',
  frames: [
    { type: 'enter', characterId: 'elara', position: 'left', expression: 'neutral' },
    { type: 'speak', speakerId: 'elara', text: 'Careful! These bandits are no pushovers.' },
    { type: 'end' },
  ],
};

export const bossDefeatedCutscene: CutsceneScript = {
  id: 'boss_defeated',
  title: 'Victory in Reach',
  frames: [
    { type: 'enter', characterId: 'rowan', position: 'left', expression: 'happy' },
    { type: 'speak', speakerId: 'rowan', text: 'The bandit leader has fallen! Finish the rest!' },
    { type: 'end' },
  ],
};
