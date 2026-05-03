export type {
  Expression,
  PortraitPosition,
  CutsceneCharacter,
  CutsceneCommand,
  CutsceneScript,
} from './CutsceneTypes';

export { createCutscenePlayer } from './CutscenePlayer';
export type { CutscenePlayer, StageEntry } from './CutscenePlayer';

export {
  registerCutscene,
  getCutscene,
  hasCutscene,
  listCutscenes,
  clearCutscenes,
} from './CutsceneRegistry';

export { getCharacter, isCharacterDefined, getAllCharacters } from './CutsceneCharacters';

// Example cutscenes
export { prologueCutscene } from './examples';
