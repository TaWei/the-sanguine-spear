import { describe, it, expect } from 'vitest';
import { EnemyPreview } from '../EnemyPreview';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';

describe('EnemyPreview', () => {
  const stats = createStats({
    hp: 20,
    str: 5,
    mag: 5,
    skl: 5,
    spd: 5,
    luk: 5,
    def: 5,
    res: 5,
    mov: 5,
  });
  const enemy = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, stats, 6, 5);

  it('starts inactive', () => {
    const preview = new EnemyPreview();
    expect(preview.isActive).toBe(false);
    expect(preview.unit).toBeNull();
  });

  it('shows an enemy unit and becomes active', () => {
    const preview = new EnemyPreview();
    preview.show(enemy);
    expect(preview.isActive).toBe(true);
    expect(preview.unit).toBe(enemy);
  });

  it('clears the preview and becomes inactive', () => {
    const preview = new EnemyPreview();
    preview.show(enemy);
    preview.clear();
    expect(preview.isActive).toBe(false);
    expect(preview.unit).toBeNull();
  });
});
