import { describe, it, expect } from 'vitest';
import { StatCaps, CLASS_CAPS } from '../StatCaps';

describe('StatCaps', () => {
  it('lord class has defined caps', () => {
    const caps: StatCaps = CLASS_CAPS.lord;
    expect(caps.hp).toBeGreaterThan(0);
    expect(caps.str).toBeGreaterThan(0);
    expect(caps.mov).toBeGreaterThan(0);
  });

  it('every unit class has caps defined', () => {
    const classes = [
      'lord',
      'mercenary',
      'mage',
      'archer',
      'cavalry',
      'pegasus_knight',
      'soldier',
      'brigand',
    ];
    for (const cls of classes) {
      expect(CLASS_CAPS[cls]).toBeDefined();
    }
  });
});
