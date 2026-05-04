import { describe, it, expect } from 'vitest';
import { STAFF_DB } from '../Staves';

describe('STAFF_DB', () => {
  it('contains Heal staff with correct stats', () => {
    const heal = STAFF_DB['Heal'];
    expect(heal).toBeDefined();
    expect(heal.name).toBe('Heal');
    expect(heal.healAmount).toBe(10);
    expect(heal.minRange).toBe(1);
    expect(heal.maxRange).toBe(1);
  });
});
