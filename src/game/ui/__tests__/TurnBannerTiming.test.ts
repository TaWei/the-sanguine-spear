import { describe, it, expect } from 'vitest';
import { TurnBannerTiming, BANNER_PHASE } from '../TurnBannerTiming';

describe('TurnBannerTiming', () => {
  const FADE_IN = 300;
  const HOLD = 2000;
  const FADE_OUT = 300;

  it('starts in FADE_IN phase', () => {
    const t = new TurnBannerTiming();
    expect(t.phase).toBe(BANNER_PHASE.FADE_IN);
    expect(t.isComplete()).toBe(false);
  });

  it('advances from FADE_IN to HOLD after fade duration', () => {
    const t = new TurnBannerTiming();
    t.update(FADE_IN + 1);
    expect(t.phase).toBe(BANNER_PHASE.HOLD);
  });

  it('advances from HOLD to FADE_OUT after hold duration', () => {
    const t = new TurnBannerTiming();
    t.update(FADE_IN + HOLD + 1);
    expect(t.phase).toBe(BANNER_PHASE.FADE_OUT);
  });

  it('advances from FADE_OUT to DONE after fade out duration', () => {
    const t = new TurnBannerTiming();
    t.update(FADE_IN + HOLD + FADE_OUT + 1);
    expect(t.phase).toBe(BANNER_PHASE.DONE);
    expect(t.isComplete()).toBe(true);
  });

  it('textAlpha ramps from 0 to 1 during FADE_IN', () => {
    const t = new TurnBannerTiming();
    t.update(0);
    expect(t.textAlpha).toBe(0);
    t.update(150); // halfway
    expect(t.textAlpha).toBeCloseTo(0.5, 1);
    t.update(300);
    expect(t.textAlpha).toBe(1);
  });

  it('textAlpha stays at 1 during HOLD', () => {
    const t = new TurnBannerTiming();
    t.update(FADE_IN + 500);
    expect(t.phase).toBe(BANNER_PHASE.HOLD);
    expect(t.textAlpha).toBe(1);
  });

  it('overlayAlpha stays at 1 during HOLD, fades during FADE_OUT', () => {
    const t = new TurnBannerTiming();
    t.update(FADE_IN + HOLD + 1);
    expect(t.phase).toBe(BANNER_PHASE.FADE_OUT);
    expect(t.overlayAlpha).toBeCloseTo(1, 1);
    t.update(150); // halfway through fade out
    expect(t.overlayAlpha).toBeCloseTo(0.5, 1);
    t.update(FADE_OUT - 150); // finish fade out
    expect(t.overlayAlpha).toBe(0);
  });

  it('bannerProgress returns 0→1 during FADE_IN for slide animation', () => {
    const t = new TurnBannerTiming();
    t.update(0);
    expect(t.bannerProgress).toBe(0);
    t.update(300);
    expect(t.bannerProgress).toBe(1);
  });

  it('does not advance beyond DONE', () => {
    const t = new TurnBannerTiming();
    t.update(10000);
    expect(t.phase).toBe(BANNER_PHASE.DONE);
    expect(t.isComplete()).toBe(true);
    expect(t.overlayAlpha).toBe(0);
  });
});
