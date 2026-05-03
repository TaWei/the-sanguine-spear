import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerCutscene,
  getCutscene,
  hasCutscene,
  listCutscenes,
  clearCutscenes,
} from '../CutsceneRegistry';
import type { CutsceneScript } from '../CutsceneTypes';

function makeScript(id: string): CutsceneScript {
  return {
    id,
    title: `Cutscene: ${id}`,
    frames: [
      { type: 'speak', speakerId: 'rowan', text: 'Hello.' },
      { type: 'end' },
    ],
  };
}

describe('CutsceneRegistry', () => {
  beforeEach(() => {
    clearCutscenes();
  });

  it('registers and retrieves a cutscene by ID', () => {
    const script = makeScript('prologue');
    registerCutscene(script);
    expect(getCutscene('prologue')).toBe(script);
  });

  it('returns undefined for unregistered cutscene', () => {
    expect(getCutscene('nonexistent')).toBeUndefined();
  });

  it('checks if a cutscene exists', () => {
    expect(hasCutscene('prologue')).toBe(false);
    registerCutscene(makeScript('prologue'));
    expect(hasCutscene('prologue')).toBe(true);
  });

  it('lists all registered cutscene IDs', () => {
    registerCutscene(makeScript('a'));
    registerCutscene(makeScript('b'));
    const ids = listCutscenes();
    expect(ids).toContain('a');
    expect(ids).toContain('b');
    expect(ids).toHaveLength(2);
  });

  it('overwrites an existing cutscene', () => {
    const v1 = makeScript('prologue');
    const v2 = { ...makeScript('prologue'), title: 'Prologue v2' };
    registerCutscene(v1);
    registerCutscene(v2);
    expect(getCutscene('prologue')!.title).toBe('Prologue v2');
  });
});
