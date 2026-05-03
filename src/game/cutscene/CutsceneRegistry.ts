import type { CutsceneScript } from './CutsceneTypes';

const registry = new Map<string, CutsceneScript>();

export function registerCutscene(script: CutsceneScript): void {
  registry.set(script.id, script);
}

export function getCutscene(id: string): CutsceneScript | undefined {
  return registry.get(id);
}

export function hasCutscene(id: string): boolean {
  return registry.has(id);
}

export function listCutscenes(): string[] {
  return Array.from(registry.keys());
}

export function clearCutscenes(): void {
  registry.clear();
}
