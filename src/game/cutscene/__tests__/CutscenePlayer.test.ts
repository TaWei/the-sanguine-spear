import { describe, it, expect, beforeEach } from 'vitest';
import { createCutscenePlayer } from '../CutscenePlayer';
import type { CutsceneCommand, CutsceneScript } from '../CutsceneTypes';

function makeScript(frames: CutsceneCommand[]): CutsceneScript {
  return { id: 'test', title: 'Test', frames };
}

function speakFrame(speakerId: string, text: string): CutsceneCommand {
  return { type: 'speak', speakerId, text };
}

function enterFrame(characterId: string, position: 'left' | 'right'): CutsceneCommand {
  return { type: 'enter', characterId, position };
}

function endFrame(): CutsceneCommand {
  return { type: 'end' };
}

describe('CutscenePlayer', () => {
  let player: ReturnType<typeof createCutscenePlayer>;

  describe('basic lifecycle', () => {
    beforeEach(() => {
      const script = makeScript([
        speakFrame('rowan', 'Hello, Elara.'),
        speakFrame('elara', 'Rowan! You made it.'),
        endFrame(),
      ]);
      player = createCutscenePlayer(script);
    });

    it('starts at frame 0 with isComplete=false', () => {
      expect(player.isComplete()).toBe(false);
      expect(player.getCurrentFrame()).toEqual(speakFrame('rowan', 'Hello, Elara.'));
    });

    it('advances through frames', () => {
      player.advance();
      expect(player.getCurrentFrame()).toEqual(speakFrame('elara', 'Rowan! You made it.'));

      player.advance();
      expect(player.getCurrentFrame()).toEqual(endFrame());

      player.advance();
      expect(player.isComplete()).toBe(true);
    });

    it('returns null for current frame when complete', () => {
      player.advance();
      player.advance();
      player.advance();
      player.advance(); // extra advance past end
      expect(player.getCurrentFrame()).toBeNull();
    });

    it('advance is a no-op when already complete', () => {
      player.advance();
      player.advance();
      player.advance(); // extra advance past end
      expect(player.isComplete()).toBe(true);
    });

    it('returns frame index', () => {
      expect(player.getFrameIndex()).toBe(0);
      player.advance();
      expect(player.getFrameIndex()).toBe(1);
    });

    it('returns total frame count', () => {
      expect(player.getFrameCount()).toBe(3);
    });
  });

  describe('stage management — enter/exit', () => {
    beforeEach(() => {
      const script = makeScript([
        enterFrame('rowan', 'left'),
        enterFrame('elara', 'right'),
        speakFrame('rowan', 'On my mark.'),
        { type: 'exit', characterId: 'elara' },
        endFrame(),
      ]);
      player = createCutscenePlayer(script);
    });

    it('tracks characters on stage after enter commands', () => {
      // Frame 0 is enter rowan. The player starts at frame 0.
      // When we call advance(), we process frame 0 and move to frame 1.
      player.advance(); // process enter rowan, now on frame 1
      const stage = player.getStage();
      expect(stage.get('rowan')).toEqual({ position: 'left', expression: 'neutral' });
    });

    it('removes character from stage on exit', () => {
      player.advance(); // enter rowan
      player.advance(); // enter elara
      player.advance(); // speak
      player.advance(); // exit elara
      const stage = player.getStage();
      expect(stage.has('elara')).toBe(false);
      expect(stage.has('rowan')).toBe(true);
    });
  });

  describe('expressions', () => {
    it('sets expression from enter command', () => {
      const script = makeScript([
        { type: 'enter', characterId: 'rowan', position: 'left', expression: 'happy' },
        endFrame(),
      ]);
      const p = createCutscenePlayer(script);
      p.advance();
      expect(p.getStage().get('rowan')!.expression).toBe('happy');
    });

    it('changes expression mid-cutscene', () => {
      const script = makeScript([
        enterFrame('rowan', 'left'),
        { type: 'expression', characterId: 'rowan', expression: 'angry' },
        endFrame(),
      ]);
      const p = createCutscenePlayer(script);
      p.advance(); // enter
      p.advance(); // expression change
      expect(p.getStage().get('rowan')!.expression).toBe('angry');
    });
  });

  describe('speak command', () => {
    it('exposes speaker ID from current speak frame', () => {
      const script = makeScript([
        speakFrame('rowan', 'Attack!'),
        endFrame(),
      ]);
      const p = createCutscenePlayer(script);
      expect(p.getCurrentSpeakerId()).toBe('rowan');
    });

    it('returns null for speaker when current frame is not speak', () => {
      const script = makeScript([
        { type: 'background', backgroundKey: 'castle' },
        endFrame(),
      ]);
      const p = createCutscenePlayer(script);
      expect(p.getCurrentSpeakerId()).toBeNull();
    });
  });

  describe('goto command', () => {
    it('jumps to a labeled frame', () => {
      const script: CutsceneScript = {
        id: 'goto_test',
        title: 'Goto Test',
        frames: [
          speakFrame('rowan', 'line 1'),
          { type: 'goto', label: 'later' },
          speakFrame('rowan', 'this should be skipped'),
          { type: 'speak', speakerId: 'rowan', text: 'you found me', label: 'later' },
          endFrame(),
        ],
      };
      const p = createCutscenePlayer(script);
      p.advance(); // speak line 1
      p.advance(); // goto later — should jump
      const frame = p.getCurrentFrame();
      expect(frame).toMatchObject({ type: 'speak', text: 'you found me' });
    });
  });

  describe('background tracking', () => {
    it('tracks current background', () => {
      const script = makeScript([
        { type: 'background', backgroundKey: 'castle' },
        speakFrame('rowan', 'nice castle'),
        { type: 'background', backgroundKey: 'field' },
        endFrame(),
      ]);
      const p = createCutscenePlayer(script);
      expect(p.getCurrentBackground()).toBeNull();
      p.advance(); // background set
      expect(p.getCurrentBackground()).toBe('castle');
      p.advance(); // speak
      p.advance(); // background change
      expect(p.getCurrentBackground()).toBe('field');
    });
  });

  describe('wait command', () => {
    it('exposes wait duration', () => {
      const script = makeScript([
        { type: 'wait', duration: 1500 },
        speakFrame('rowan', 'after pause'),
        endFrame(),
      ]);
      const p = createCutscenePlayer(script);
      const frame = p.getCurrentFrame();
      expect(frame).toMatchObject({ type: 'wait', duration: 1500 });
    });
  });

  describe('integration: full cutscene playthrough', () => {
    it('plays through a multi-character cutscene correctly', () => {
      const script: CutsceneScript = {
        id: 'prologue_intro',
        title: 'Prologue: The Sanguine Spear',
        frames: [
          { type: 'background', backgroundKey: 'throne_room' },
          { type: 'enter', characterId: 'rowan', position: 'left', expression: 'neutral' },
          { type: 'speak', speakerId: 'rowan', text: 'The bandits have taken the eastern fort.' },
          { type: 'enter', characterId: 'elara', position: 'right', expression: 'surprised' },
          { type: 'speak', speakerId: 'elara', text: 'What? When did this happen?' },
          { type: 'expression', characterId: 'rowan', expression: 'angry' },
          { type: 'speak', speakerId: 'rowan', text: 'Last night. We march at dawn.' },
          { type: 'end' },
        ],
      };

      const player = createCutscenePlayer(script);

      expect(player.getCurrentFrame()).toMatchObject({ type: 'background' });
      player.advance();

      expect(player.getCurrentFrame()).toMatchObject({ type: 'enter', characterId: 'rowan' });
      player.advance();

      expect(player.getCurrentSpeakerId()).toBe('rowan');
      expect(player.getCurrentFrame()).toMatchObject({ type: 'speak', text: 'The bandits have taken the eastern fort.' });
      expect(player.getStage().get('rowan')!.expression).toBe('neutral');
      player.advance();

      expect(player.getCurrentFrame()).toMatchObject({ type: 'enter', characterId: 'elara' });
      player.advance();

      expect(player.getCurrentSpeakerId()).toBe('elara');
      expect(player.getStage().get('elara')!.expression).toBe('surprised');
      player.advance();

      expect(player.getCurrentFrame()).toMatchObject({ type: 'expression', characterId: 'rowan', expression: 'angry' });
      player.advance();

      expect(player.getCurrentSpeakerId()).toBe('rowan');
      expect(player.getStage().get('rowan')!.expression).toBe('angry');
      player.advance();

      expect(player.getCurrentFrame()).toEqual(endFrame());
      player.advance();

      expect(player.isComplete()).toBe(true);
      expect(player.getCurrentBackground()).toBe('throne_room');
      expect(player.getStage().size).toBe(2);
    });
  });
});
