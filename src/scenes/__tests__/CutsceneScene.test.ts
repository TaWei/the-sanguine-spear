import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Phaser before importing anything that depends on it
vi.mock('phaser', () => {
  class MockScene {
    constructor(public config: { key: string }) {}
  }

  return {
    default: {
      Scene: MockScene,
      GameObjects: {
        Rectangle: class {},
        Text: class {},
        Container: class {},
      },
      Time: {
        TimerEvent: class {},
      },
    },
    Scene: MockScene,
  };
});

import { CutsceneScene } from '../CutsceneScene';
import { registerCutscene, clearCutscenes } from '../../game/cutscene/CutsceneRegistry';
import type { CutsceneScript } from '../../game/cutscene/CutsceneTypes';

function makeScript(frames: CutsceneScript['frames']): CutsceneScript {
  return { id: 'test_cs', title: 'Test', frames };
}

function createMockText() {
  return {
    setOrigin: vi.fn().mockReturnThis(),
    setDepth: vi.fn().mockReturnThis(),
    setVisible: vi.fn().mockReturnThis(),
    setText: vi.fn().mockReturnThis(),
    setAlpha: vi.fn().mockReturnThis(),
    setStyle: vi.fn().mockReturnThis(),
    setInteractive: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
    text: '',
    alpha: 1,
  };
}

function createMockRect() {
  return {
    setDepth: vi.fn().mockReturnThis(),
    setFillStyle: vi.fn().mockReturnThis(),
    setStrokeStyle: vi.fn().mockReturnThis(),
    setAlpha: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
  };
}

function createMockContainer() {
  return {
    add: vi.fn().mockReturnThis(),
    setDepth: vi.fn().mockReturnThis(),
    setAlpha: vi.fn().mockReturnThis(),
    setVisible: vi.fn().mockReturnThis(),
    setScale: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
  };
}

function createMockScene(): CutsceneScene {
  const scene = new CutsceneScene();

  const fadeOutCallback = { fn: null as ((camera: unknown, progress: number) => void) | null };

  (scene as any).cameras = {
    main: {
      fadeIn: vi.fn(),
      fadeOut: vi.fn((duration: number, r: number, g: number, b: number, callback?: (camera: unknown, progress: number) => void) => {
        fadeOutCallback.fn = callback ?? null;
      }),
      width: 1024,
      height: 768,
      centerX: 512,
      centerY: 384,
    },
  };

  (scene as any).add = {
    rectangle: vi.fn(() => createMockRect()),
    text: vi.fn(() => createMockText()),
    container: vi.fn(() => createMockContainer()),
  };

  (scene as any).input = {
    keyboard: {
      on: vi.fn(),
      off: vi.fn(),
    },
    on: vi.fn(),
    enabled: true,
  };

  (scene as any).tweens = {
    add: vi.fn(),
  };

  (scene as any).time = {
    addEvent: vi.fn(() => ({ destroy: vi.fn() })),
    delayedCall: vi.fn(() => ({ destroy: vi.fn() })),
  };

  // Attach callback helper for fadeOut tests
  (scene as any).__fadeOutCallback = fadeOutCallback;

  // scene.stop() for overlay cutscene cleanup
  (scene as any).scene = {
    stop: vi.fn(),
  };

  return scene;
}

describe('CutsceneScene', () => {
  beforeEach(() => {
    clearCutscenes();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    clearCutscenes();
    vi.useRealTimers();
  });

  describe('init()', () => {
    it('stores data correctly', () => {
      const scene = createMockScene();
      const onComplete = vi.fn();

      scene.init({ cutsceneId: 'test_cs', overlay: true, onComplete });

      expect((scene as any).cutsceneId).toBe('test_cs');
      expect((scene as any).isOverlay).toBe(true);
      expect((scene as any).onComplete).toBe(onComplete);
    });

    it('defaults overlay to false and onComplete to no-op', () => {
      const scene = createMockScene();
      scene.init({ cutsceneId: 'test_cs' });

      expect((scene as any).isOverlay).toBe(false);
      expect(typeof (scene as any).onComplete).toBe('function');
    });
  });

  describe('create()', () => {
    it('calls onComplete immediately if cutscene not found', () => {
      const scene = createMockScene();
      const onComplete = vi.fn();
      scene.init({ cutsceneId: 'missing_cs', overlay: true, onComplete });
      scene.create();

      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('sets up typewriter for speak frames', () => {
      registerCutscene(
        makeScript([
          { type: 'speak', speakerId: 'rowan', text: 'Hello world' },
          { type: 'end' },
        ]),
      );

      const scene = createMockScene();
      scene.init({ cutsceneId: 'test_cs' });
      scene.create();

      expect((scene as any).isTyping).toBe(true);
      expect((scene as any).fullText).toBe('Hello world');
      expect((scene as any).displayedLength).toBe(0);
    });

    it('creates background and dialog box elements', () => {
      registerCutscene(
        makeScript([
          { type: 'speak', speakerId: 'rowan', text: 'Hi' },
          { type: 'end' },
        ]),
      );

      const scene = createMockScene();
      scene.init({ cutsceneId: 'test_cs' });
      scene.create();

      const add = (scene as any).add;
      expect(add.rectangle).toHaveBeenCalled();
      expect(add.text).toHaveBeenCalled();
      expect(add.container).toHaveBeenCalled();
    });

    it('sets up keyboard and pointer input', () => {
      registerCutscene(
        makeScript([
          { type: 'speak', speakerId: 'rowan', text: 'Hi' },
          { type: 'end' },
        ]),
      );

      const scene = createMockScene();
      scene.init({ cutsceneId: 'test_cs' });
      scene.create();

      const keyboard = (scene as any).input.keyboard;
      expect(keyboard.on).toHaveBeenCalledWith('keydown-SPACE', expect.any(Function));
      expect(keyboard.on).toHaveBeenCalledWith('keydown-ENTER', expect.any(Function));
      expect(keyboard.on).toHaveBeenCalledWith('keydown-ESC', expect.any(Function));
      expect((scene as any).input.on).toHaveBeenCalledWith('pointerdown', expect.any(Function));
    });

    it('fades in camera when not overlay', () => {
      registerCutscene(
        makeScript([
          { type: 'speak', speakerId: 'rowan', text: 'Hi' },
          { type: 'end' },
        ]),
      );

      const scene = createMockScene();
      scene.init({ cutsceneId: 'test_cs', overlay: false });
      scene.create();

      expect((scene as any).cameras.main.fadeIn).toHaveBeenCalledWith(300, 0, 0, 0);
    });

    it('does not fade in camera when overlay', () => {
      registerCutscene(
        makeScript([
          { type: 'speak', speakerId: 'rowan', text: 'Hi' },
          { type: 'end' },
        ]),
      );

      const scene = createMockScene();
      scene.init({ cutsceneId: 'test_cs', overlay: true });
      scene.create();

      expect((scene as any).cameras.main.fadeIn).not.toHaveBeenCalled();
    });
  });

  describe('handleAdvance()', () => {
    it('completes typing instantly when called during typewriter', () => {
      registerCutscene(
        makeScript([
          { type: 'speak', speakerId: 'rowan', text: 'Hello world' },
          { type: 'end' },
        ]),
      );

      const scene = createMockScene();
      scene.init({ cutsceneId: 'test_cs' });
      scene.create();

      expect((scene as any).isTyping).toBe(true);

      const completeTextSpy = vi.spyOn(scene as any, 'completeText');

      (scene as any).handleAdvance();

      expect(completeTextSpy).toHaveBeenCalledTimes(1);
    });

    it('advances to next frame after typing complete', () => {
      registerCutscene(
        makeScript([
          { type: 'speak', speakerId: 'rowan', text: 'Hello' },
          { type: 'speak', speakerId: 'elara', text: 'Hi' },
          { type: 'end' },
        ]),
      );

      const scene = createMockScene();
      scene.init({ cutsceneId: 'test_cs' });
      scene.create();

      // Complete first speak frame
      (scene as any).completeText();
      expect((scene as any).waitingForInput).toBe(true);

      // Advance to next frame
      (scene as any).handleAdvance();

      expect((scene as any).player.getCurrentFrame()).toMatchObject({
        type: 'speak',
        speakerId: 'elara',
        text: 'Hi',
      });
    });

    it('skips wait frames', () => {
      registerCutscene(
        makeScript([
          { type: 'speak', speakerId: 'rowan', text: 'Before wait' },
          { type: 'wait', duration: 5000 },
          { type: 'speak', speakerId: 'rowan', text: 'After wait' },
          { type: 'end' },
        ]),
      );

      const scene = createMockScene();
      scene.init({ cutsceneId: 'test_cs' });
      scene.create();

      // Complete first speak and advance to wait frame
      (scene as any).completeText();
      vi.advanceTimersByTime(200);
      (scene as any).handleAdvance();

      // Now on wait frame
      expect((scene as any).player.getCurrentFrame()).toMatchObject({ type: 'wait', duration: 5000 });
      expect((scene as any).waitTimer).not.toBeNull();

      const waitTimer = (scene as any).waitTimer;
      const destroySpy = vi.spyOn(waitTimer, 'destroy');

      // Advance past debounce and skip wait
      vi.advanceTimersByTime(200);
      (scene as any).handleAdvance();

      expect(destroySpy).toHaveBeenCalledTimes(1);
      expect((scene as any).player.getCurrentFrame()).toMatchObject({
        type: 'speak',
        text: 'After wait',
      });
    });

    it('ignores rapid calls due to debounce', () => {
      registerCutscene(
        makeScript([
          { type: 'speak', speakerId: 'rowan', text: 'Hello' },
          { type: 'end' },
        ]),
      );

      const scene = createMockScene();
      scene.init({ cutsceneId: 'test_cs' });
      scene.create();

      const finishSpy = vi.spyOn(scene as any, 'finishCutscene');

      // First call
      (scene as any).handleAdvance();
      // Immediate second call should be ignored
      (scene as any).handleAdvance();
      (scene as any).handleAdvance();

      expect(finishSpy).not.toHaveBeenCalled();
    });

    it('calls finishCutscene when player is complete', () => {
      registerCutscene(
        makeScript([
          { type: 'speak', speakerId: 'rowan', text: 'Hello' },
          { type: 'end' },
        ]),
      );

      const scene = createMockScene();
      scene.init({ cutsceneId: 'test_cs' });
      scene.create();

      const finishSpy = vi.spyOn(scene as any, 'finishCutscene');

      // Complete text
      (scene as any).completeText();
      // Move time forward past debounce
      vi.advanceTimersByTime(200);
      // Advance past end frame
      (scene as any).handleAdvance();

      expect(finishSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('finishCutscene()', () => {
    it('calls onComplete and cleans up immediately in overlay mode', () => {
      registerCutscene(
        makeScript([
          { type: 'speak', speakerId: 'rowan', text: 'Hello' },
          { type: 'end' },
        ]),
      );

      const scene = createMockScene();
      const onComplete = vi.fn();
      scene.init({ cutsceneId: 'test_cs', overlay: true, onComplete });
      scene.create();

      const cleanupSpy = vi.spyOn(scene as any, 'cleanupScene');

      (scene as any).finishCutscene();

      expect(cleanupSpy).toHaveBeenCalledTimes(1);
      expect(onComplete).toHaveBeenCalledTimes(1);
      expect((scene as any).isFinishing).toBe(true);
      expect((scene as any).input.enabled).toBe(false);
    });

    it('calls onComplete after fade out in non-overlay mode', () => {
      registerCutscene(
        makeScript([
          { type: 'speak', speakerId: 'rowan', text: 'Hello' },
          { type: 'end' },
        ]),
      );

      const scene = createMockScene();
      const onComplete = vi.fn();
      scene.init({ cutsceneId: 'test_cs', overlay: false, onComplete });
      scene.create();

      const cleanupSpy = vi.spyOn(scene as any, 'cleanupScene');

      (scene as any).finishCutscene();

      // Should not have completed yet
      expect(onComplete).not.toHaveBeenCalled();
      expect(cleanupSpy).not.toHaveBeenCalled();

      // Trigger fade out completion via callback
      const fadeOutCb = (scene as any).__fadeOutCallback.fn;
      expect(fadeOutCb).toBeDefined();
      fadeOutCb!({}, 1);

      expect(cleanupSpy).toHaveBeenCalledTimes(1);
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('isFinishing guard prevents double finish', () => {
      registerCutscene(
        makeScript([
          { type: 'speak', speakerId: 'rowan', text: 'Hello' },
          { type: 'end' },
        ]),
      );

      const scene = createMockScene();
      const onComplete = vi.fn();
      scene.init({ cutsceneId: 'test_cs', overlay: true, onComplete });
      scene.create();

      (scene as any).finishCutscene();
      expect(onComplete).toHaveBeenCalledTimes(1);

      // Second call should be a no-op
      (scene as any).finishCutscene();
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('isFinishing guard in handleAdvance prevents finish after already finishing', () => {
      registerCutscene(
        makeScript([
          { type: 'speak', speakerId: 'rowan', text: 'Hello' },
          { type: 'end' },
        ]),
      );

      const scene = createMockScene();
      const onComplete = vi.fn();
      scene.init({ cutsceneId: 'test_cs', overlay: true, onComplete });
      scene.create();

      (scene as any).finishCutscene();
      expect((scene as any).isFinishing).toBe(true);

      // handleAdvance should return early
      const finishSpy = vi.spyOn(scene as any, 'finishCutscene');
      (scene as any).handleAdvance();

      expect(finishSpy).not.toHaveBeenCalled();
    });
  });

  describe('typewriter behavior', () => {
    it('completes text and shows advance indicator', () => {
      registerCutscene(
        makeScript([
          { type: 'speak', speakerId: 'rowan', text: 'Test' },
          { type: 'end' },
        ]),
      );

      const scene = createMockScene();
      scene.init({ cutsceneId: 'test_cs' });
      scene.create();

      const advanceIndicator = (scene as any).advanceIndicator;

      (scene as any).completeText();

      expect((scene as any).isTyping).toBe(false);
      expect((scene as any).waitingForInput).toBe(true);
      expect(advanceIndicator.setVisible).toHaveBeenCalledWith(true);
    });

    it('sets up typewriter timer on create', () => {
      registerCutscene(
        makeScript([
          { type: 'speak', speakerId: 'rowan', text: 'AB' },
          { type: 'end' },
        ]),
      );

      const scene = createMockScene();
      scene.init({ cutsceneId: 'test_cs' });
      scene.create();

      expect((scene as any).time.addEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          delay: 25,
          repeat: 1,
        }),
      );
    });
  });

  describe('wait frame handling', () => {
    it('creates delayedCall for wait frame', () => {
      registerCutscene(
        makeScript([
          { type: 'wait', duration: 1500 },
          { type: 'end' },
        ]),
      );

      const scene = createMockScene();
      scene.init({ cutsceneId: 'test_cs' });
      scene.create();

      expect((scene as any).time.delayedCall).toHaveBeenCalledWith(1500, expect.any(Function));
    });
  });

  describe('input debounce', () => {
    it('ignores calls within ADVANCE_COOLDOWN_MS', () => {
      registerCutscene(
        makeScript([
          { type: 'speak', speakerId: 'rowan', text: 'Hello' },
          { type: 'end' },
        ]),
      );

      const scene = createMockScene();
      scene.init({ cutsceneId: 'test_cs' });
      scene.create();

      // Mock Date.now to control time
      const baseTime = 1000;
      let currentTime = baseTime;
      vi.spyOn(Date, 'now').mockImplementation(() => currentTime);

      const finishSpy = vi.spyOn(scene as any, 'finishCutscene');

      // First call completes typing
      (scene as any).handleAdvance();
      expect((scene as any).isTyping).toBe(false);
      expect((scene as any).waitingForInput).toBe(true);
      expect(finishSpy).not.toHaveBeenCalled();

      // Second call is within debounce — should not advance player
      currentTime = baseTime + 100;
      (scene as any).handleAdvance();
      expect(finishSpy).not.toHaveBeenCalled();
      expect((scene as any).waitingForInput).toBe(true);

      // Third call is past debounce — should advance and finish
      currentTime = baseTime + 200;
      (scene as any).handleAdvance();
      expect(finishSpy).toHaveBeenCalledTimes(1);
    });
  });
});
