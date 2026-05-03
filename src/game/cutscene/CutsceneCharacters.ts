import type { CutsceneCharacter } from './CutsceneTypes';

/** Master character registry — all characters available for cutscenes */
const CHARACTER_DB: Record<string, CutsceneCharacter> = {
  rowan: {
    id: 'rowan',
    name: 'Rowan',
    portraitKey: 'portrait_rowan',
  },
  elara: {
    id: 'elara',
    name: 'Elara',
    portraitKey: 'portrait_elara',
  },
  bandit: {
    id: 'bandit',
    name: 'Bandit',
    portraitKey: 'portrait_bandit',
  },
  soldier: {
    id: 'soldier',
    name: 'Soldier',
    portraitKey: 'portrait_soldier',
  },
};

export function getCharacter(id: string): CutsceneCharacter | undefined {
  return CHARACTER_DB[id];
}

export function isCharacterDefined(id: string): boolean {
  return id in CHARACTER_DB;
}

export function getAllCharacters(): CutsceneCharacter[] {
  return Object.values(CHARACTER_DB);
}
