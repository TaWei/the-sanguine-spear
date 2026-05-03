import { describe, it, expect } from 'vitest';
import { Commander, scoreTarget, pickBestTarget } from '../index';

describe('AI barrel export', () => {
  it('exports Commander', () => {
    expect(Commander).toBeDefined();
  });

  it('exports scoreTarget', () => {
    expect(scoreTarget).toBeDefined();
  });

  it('exports pickBestTarget', () => {
    expect(pickBestTarget).toBeDefined();
  });
});
