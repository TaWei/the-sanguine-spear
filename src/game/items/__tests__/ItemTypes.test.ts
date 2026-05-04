import { describe, it, expect } from 'vitest';
import { createStaffItem } from '../ItemTypes';

describe('createStaffItem', () => {
  it('creates a Heal staff with correct defaults', () => {
    const staff = createStaffItem('Heal', 10, 1, 1);
    expect(staff.kind).toBe('staff');
    expect(staff.name).toBe('Heal');
    expect(staff.healAmount).toBe(10);
    expect(staff.minRange).toBe(1);
    expect(staff.maxRange).toBe(1);
    expect(staff.uses).toBe(20);
  });
});
