import { describe, it, expect } from 'vitest';
import { WorldMap, type ChapterNode } from '../WorldMap';

const nodes: ChapterNode[] = [
  { id: 'chapter-1', name: 'The Sanguine Plains', x: 100, y: 100, unlockedBy: [] },
  { id: 'chapter-2', name: 'The Molten Pass', x: 200, y: 150, unlockedBy: ['chapter-1'] },
  { id: 'chapter-3', name: 'The Sunken Temple', x: 300, y: 100, unlockedBy: ['chapter-2'] },
];

describe('WorldMap', () => {
  it('chapter 1 is always available', () => {
    const map = new WorldMap(nodes);
    expect(map.canSelectChapter('chapter-1')).toBe(true);
  });

  it('unlocks next chapter after clearing current', () => {
    const map = new WorldMap(nodes);
    expect(map.getChapterStatus('chapter-2')).toBe('LOCKED');

    map.clearChapter('chapter-1');
    expect(map.getChapterStatus('chapter-1')).toBe('CLEARED');
    expect(map.getChapterStatus('chapter-2')).toBe('AVAILABLE');
  });

  it('locks future chapters until prerequisites are met', () => {
    const map = new WorldMap(nodes);
    expect(map.getChapterStatus('chapter-3')).toBe('LOCKED');
  });

  it('allows replaying cleared chapters', () => {
    const map = new WorldMap(nodes);
    map.clearChapter('chapter-1');
    expect(map.canSelectChapter('chapter-1')).toBe(true);
  });

  it('tracks chapter clear status', () => {
    const map = new WorldMap(nodes);
    map.clearChapter('chapter-1');
    map.clearChapter('chapter-2');
    expect(map.getChapterStatus('chapter-1')).toBe('CLEARED');
    expect(map.getChapterStatus('chapter-2')).toBe('CLEARED');
    expect(map.getChapterStatus('chapter-3')).toBe('AVAILABLE');
  });

  it('getAvailableChapters returns available and cleared chapters', () => {
    const map = new WorldMap(nodes);
    map.clearChapter('chapter-1');
    const available = map.getAvailableChapters();
    expect(available).toContain('chapter-1');
    expect(available).toContain('chapter-2');
  });
});
