import { SAVE_VERSION } from './SaveData';
import type { SaveData } from './SaveData';

const PREFIX = 'tss_save_';

export interface SaveMetadata {
  slot: string;
  meta: {
    levelId: string;
    turnNumber: number;
    currentPhase: string;
    timestamp: number;
    playTimeMs?: number;
  };
}

export class SaveManager {
  private key(slot: string): string {
    return PREFIX + slot;
  }

  save(slot: string, data: SaveData): boolean {
    try {
      localStorage.setItem(this.key(slot), JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }

  load(slot: string): SaveData | null {
    let raw: string | null;
    try {
      raw = localStorage.getItem(this.key(slot));
    } catch {
      return null;
    }
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as SaveData;
      if (parsed.version !== SAVE_VERSION) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  delete(slot: string): boolean {
    try {
      localStorage.removeItem(this.key(slot));
      return true;
    } catch {
      return false;
    }
  }

  listSaves(): SaveMetadata[] {
    const results: SaveMetadata[] = [];
    let len: number;
    try {
      len = localStorage.length;
    } catch {
      return [];
    }
    for (let i = 0; i < len; i++) {
      let key: string | null;
      try {
        key = localStorage.key(i);
      } catch {
        continue;
      }
      if (!key || !key.startsWith(PREFIX)) continue;
      const slot = key.slice(PREFIX.length);
      const data = this.load(slot);
      if (!data) continue;
      results.push({
        slot,
        meta: {
          levelId: data.levelId,
          turnNumber: data.turnNumber,
          currentPhase: data.currentPhase,
          timestamp: data.timestamp,
          playTimeMs: data.playTimeMs,
        },
      });
    }
    results.sort((a, b) => a.slot.localeCompare(b.slot));
    return results;
  }
}
