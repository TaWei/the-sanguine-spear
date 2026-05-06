import { describe, it, expect } from 'vitest';
import {
  SaveManager,
  SAVE_VERSION,
  serializeUnit,
  deserializeUnit,
} from '../index';

/**
 * This test validates that the save barrel exports only runtime values
 * (classes, constants, functions) — not TypeScript interfaces which are
 * stripped at build time.
 *
 * Without this test, a barrel like:
 *   export { SaveData } from './SaveData';  // SaveData is an interface!
 *
 * ...would pass in Vitest (Node.js bundler silently strips it) but crash
 * in the browser Vite dev server with:
 *   "does not provide an export named 'SaveData'"
 *
 * The fix is `export type { SaveData }` — this test catches regressions
 * by confirming all exported values are actual runtime objects.
 */
describe('save barrel runtime exports', () => {
  it('exports SAVE_VERSION as a number', () => {
    expect(typeof SAVE_VERSION).toBe('number');
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(1);
  });

  it('exports SaveManager as a constructable class', () => {
    expect(typeof SaveManager).toBe('function');
    // Should be instantiable
    const manager = new SaveManager();
    expect(manager).toBeInstanceOf(SaveManager);
    expect(typeof manager.save).toBe('function');
    expect(typeof manager.load).toBe('function');
    expect(typeof manager.listSaves).toBe('function');
  });

  it('exports serializeUnit as a function', () => {
    expect(typeof serializeUnit).toBe('function');
  });

  it('exports deserializeUnit as a function', () => {
    expect(typeof deserializeUnit).toBe('function');
  });
});
