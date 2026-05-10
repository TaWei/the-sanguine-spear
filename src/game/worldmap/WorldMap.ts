export interface ChapterNode {
  id: string;
  name: string;
  x: number;
  y: number;
  unlockedBy: string[]; // Chapter IDs that must be cleared to unlock this
}

export type ChapterStatus = 'LOCKED' | 'AVAILABLE' | 'CLEARED';

export interface WorldMapState {
  chapters: Record<string, ChapterStatus>;
  currentNodeId: string | null;
}

export class WorldMap {
  private nodes: ChapterNode[];
  private state: WorldMapState;

  constructor(nodes: ChapterNode[], state?: WorldMapState) {
    this.nodes = nodes;
    this.state = state ?? {
      chapters: {},
      currentNodeId: null,
    };
    // Initialize all nodes as LOCKED
    for (const node of this.nodes) {
      if (!this.state.chapters[node.id]) {
        this.state.chapters[node.id] = 'LOCKED';
      }
    }
    // Chapter 1 is always available
    this.state.chapters['chapter-1'] = 'AVAILABLE';
  }

  getAvailableChapters(): string[] {
    return Object.entries(this.state.chapters)
      .filter(([, status]) => status === 'AVAILABLE' || status === 'CLEARED')
      .map(([id]) => id);
  }

  getChapterStatus(id: string): ChapterStatus {
    return this.state.chapters[id] ?? 'LOCKED';
  }

  clearChapter(id: string): void {
    this.state.chapters[id] = 'CLEARED';
    this.state.currentNodeId = id;

    // Unlock next chapters
    for (const node of this.nodes) {
      if (this.state.chapters[node.id] === 'LOCKED') {
        if (node.unlockedBy.length === 0) {
          // Starting chapter with no prerequisites — always available
          this.state.chapters[node.id] = 'AVAILABLE';
          continue;
        }
        const allUnlocked = node.unlockedBy.every(
          prereqId => this.state.chapters[prereqId] === 'CLEARED',
        );
        if (allUnlocked) {
          this.state.chapters[node.id] = 'AVAILABLE';
        }
      }
    }
  }

  canSelectChapter(id: string): boolean {
    const status = this.getChapterStatus(id);
    return status === 'AVAILABLE' || status === 'CLEARED';
  }

  getState(): WorldMapState {
    return this.state;
  }

  getNodes(): ChapterNode[] {
    return this.nodes;
  }
}
