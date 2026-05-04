import type {
  CutsceneScript,
  CutsceneCommand,
  PortraitPosition,
  Expression,
} from './CutsceneTypes';

export interface StageEntry {
  position: PortraitPosition;
  expression: Expression;
}

export interface CutscenePlayer {
  advance(): void;
  getCurrentFrame(): CutsceneCommand | null;
  getFrameIndex(): number;
  getFrameCount(): number;
  isComplete(): boolean;
  getStage(): ReadonlyMap<string, StageEntry>;
  getCurrentSpeakerId(): string | null;
  getCurrentBackground(): string | null;
}

export function createCutscenePlayer(script: CutsceneScript): CutscenePlayer {
  let frameIndex = 0;
  const stage = new Map<string, StageEntry>();
  let currentBackground: string | null = null;

  function applyCommand(cmd: CutsceneCommand): void {
    switch (cmd.type) {
      case 'enter':
        stage.set(cmd.characterId, {
          position: cmd.position,
          expression: cmd.expression ?? 'neutral',
        });
        break;
      case 'exit':
        stage.delete(cmd.characterId);
        break;
      case 'expression': {
        const entry = stage.get(cmd.characterId);
        if (entry) {
          entry.expression = cmd.expression;
        }
        break;
      }
      case 'background':
        currentBackground = cmd.backgroundKey;
        break;
      case 'end':
        break;
      case 'speak':
      case 'wait':
      case 'goto':
        break;
    }
  }

  function getCurrentFrame(): CutsceneCommand | null {
    if (frameIndex >= script.frames.length) {
      return null;
    }
    return script.frames[frameIndex];
  }

  function advance(): void {
    const current = getCurrentFrame();
    if (current === null) {
      return;
    }

    applyCommand(current);

    if (current.type === 'end') {
      frameIndex = script.frames.length;
      return;
    }

    if (current.type === 'goto') {
      // Search forward from the next frame; if not found, search from start
      let targetIndex = script.frames.findIndex(
        (f, i) =>
          i > frameIndex && (f as CutsceneCommand & { label?: string }).label === current.label,
      );
      if (targetIndex === -1) {
        targetIndex = script.frames.findIndex(
          (f) => (f as CutsceneCommand & { label?: string }).label === current.label,
        );
      }
      if (targetIndex !== -1 && targetIndex !== frameIndex) {
        frameIndex = targetIndex;
      } else {
        frameIndex++;
      }
      return;
    }

    frameIndex++;
  }

  return {
    advance,
    getCurrentFrame,
    getFrameIndex: () => frameIndex,
    getFrameCount: () => script.frames.length,
    isComplete: () => frameIndex >= script.frames.length,
    getStage: () => stage,
    getCurrentSpeakerId: () => {
      const frame = getCurrentFrame();
      return frame?.type === 'speak' ? frame.speakerId : null;
    },
    getCurrentBackground: () => currentBackground,
  };
}
