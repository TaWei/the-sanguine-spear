import { SaveData, SAVE_VERSION } from './SaveData';

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

  save(slot: string, data: SaveData): void {
    localStorage.setItem(this.key(slot), JSON.stringify(data));
  }

  load(slot: string): SaveData | null {
    const raw = localStorage.getItem(this.key(slot));
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as SaveData;
      if (parsed.version !== SAVE_VERSION) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  delete(slot: string): void {
    localStorage.removeItem(this.key(slot));
  }

  listSaves(): SaveMetadata[] {
    const results: SaveMetadata[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
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
