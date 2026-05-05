import { describe, it, expect } from 'vitest';
import { Unit, Faction, UnitClass } from '../Unit';
import { createStats } from '../Stats';
import { AiBehavior } from '../../ai/Behavior';
import { AiPersonality } from '../../ai/Personality';

describe('Unit AI fields', () => {
  const stats = createStats({
    hp: 20, str: 5, mag: 0, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5,
  });

  it('defaults aiBehavior and aiPersonality to undefined', () => {
    const unit = new Unit('u1', 'Test', Faction.ENEMY, UnitClass.BRIGAND, stats, 0, 0);
    expect(unit.aiBehavior).toBeUndefined();
    expect(unit.aiPersonality).toBeUndefined();
  });

  it('stores aiBehavior and aiPersonality from options', () => {
    const unit = new Unit('u1', 'Test', Faction.ENEMY, UnitClass.BRIGAND, stats, 0, 0, {
      aiBehavior: AiBehavior.GUARD,
      aiPersonality: AiPersonality.AGGRESSIVE,
    });
    expect(unit.aiBehavior).toBe(AiBehavior.GUARD);
    expect(unit.aiPersonality).toBe(AiPersonality.AGGRESSIVE);
  });
});
