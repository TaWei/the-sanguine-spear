import { describe, it, expect } from 'vitest';
import { getCharacter, getAllCharacters, isCharacterDefined } from '../CutsceneCharacters';

describe('CutsceneCharacters', () => {
  it('returns a character by ID', () => {
    const char = getCharacter('rowan');
    expect(char).toBeDefined();
    expect(char!.id).toBe('rowan');
    expect(char!.name).toBe('Rowan');
    expect(char!.portraitKey).toBe('portrait_rowan');
  });

  it('returns undefined for unknown character', () => {
    expect(getCharacter('nonexistent')).toBeUndefined();
  });

  it('checks if a character is defined', () => {
    expect(isCharacterDefined('rowan')).toBe(true);
    expect(isCharacterDefined('nobody')).toBe(false);
  });

  it('returns all characters', () => {
    const all = getAllCharacters();
    expect(all.length).toBeGreaterThan(0);
    expect(all.some((c) => c.id === 'rowan')).toBe(true);
    expect(all.some((c) => c.id === 'elara')).toBe(true);
  });
});
