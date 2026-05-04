import type { CutsceneScript } from './CutsceneTypes';

export const prologueCutscene: CutsceneScript = {
  id: 'prologue_intro',
  title: 'Prologue: The Sanguine Spear',
  frames: [
    { type: 'background', backgroundKey: 'throne_room' },
    { type: 'enter', characterId: 'rowan', position: 'left', expression: 'neutral' },
    { type: 'speak', speakerId: 'rowan', text: 'The bandits have taken the eastern fort.' },
    { type: 'enter', characterId: 'elara', position: 'right', expression: 'surprised' },
    { type: 'speak', speakerId: 'elara', text: 'What? When did this happen?' },
    { type: 'expression', characterId: 'rowan', expression: 'angry' },
    {
      type: 'speak',
      speakerId: 'rowan',
      text: 'Last night. They struck while the garrison slept.',
    },
    { type: 'expression', characterId: 'elara', expression: 'sad' },
    { type: 'speak', speakerId: 'elara', text: 'How many casualties?' },
    {
      type: 'speak',
      speakerId: 'rowan',
      text: "We don't know yet. But we must act quickly — before they fortify their position.",
    },
    { type: 'expression', characterId: 'elara', expression: 'neutral' },
    { type: 'speak', speakerId: 'elara', text: 'Agreed. I will ready my tome. We march at dawn.' },
    { type: 'end' },
  ],
};
