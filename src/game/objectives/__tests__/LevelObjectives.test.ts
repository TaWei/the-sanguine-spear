import { describe, it, expect } from 'vitest';
import { LevelObjectives, type LevelObjectivesConfig } from '../LevelObjectives';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';
import { SeizeObjective } from '../SeizeObjective';
import { DefendObjective } from '../DefendObjective';
import { EscapeObjective } from '../EscapeObjective';

describe('LevelObjectives', () => {
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

  describe('default rout behavior', () => {
    it('returns victory when no live enemies remain', () => {
      const player = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 0, 0);
      const enemy = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, stats, 1, 1);
      enemy.takeDamage(999);

      const objectives = new LevelObjectives([player, enemy]);
      expect(objectives.check().victory).toBe(true);
      expect(objectives.check().defeat).toBe(false);
    });

    it('returns defeat when no live players remain', () => {
      const player = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 0, 0);
      player.takeDamage(999);
      const enemy = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, stats, 1, 1);

      const objectives = new LevelObjectives([player, enemy]);
      expect(objectives.check().defeat).toBe(true);
      expect(objectives.check().victory).toBe(false);
    });

    it('returns ongoing when both sides have live units', () => {
      const player = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 0, 0);
      const enemy = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, stats, 1, 1);

      const objectives = new LevelObjectives([player, enemy]);
      const result = objectives.check();
      expect(result.victory).toBe(false);
      expect(result.defeat).toBe(false);
      expect(result.ongoing).toBe(true);
    });

    it('ignores allies for defeat condition', () => {
      const ally = new Unit('a1', 'Ally', Faction.ALLY, UnitClass.LORD, stats, 0, 0);
      const enemy = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, stats, 1, 1);

      const objectives = new LevelObjectives([ally, enemy]);
      expect(objectives.check().defeat).toBe(true);
    });

    it('ignores allies for victory condition', () => {
      const player = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 0, 0);
      const ally = new Unit('a1', 'Ally', Faction.ALLY, UnitClass.LORD, stats, 1, 1);

      const objectives = new LevelObjectives([player, ally]);
      expect(objectives.check().victory).toBe(true);
    });
  });

  describe('with multiple objectives', () => {
    it('returns victory if ANY objective reports victory (seize)', () => {
      const lord = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 5, 5);
      const enemy = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, stats, 1, 1);

      const config: LevelObjectivesConfig = {
        seize: new SeizeObjective([{ x: 5, y: 5 }]),
      };
      const objectives = new LevelObjectives([lord, enemy], config);

      // Lord moved onto seize tile
      const result = objectives.checkMoveObjective(lord);
      expect(result.victory).toBe(true);
    });

    it('returns defeat if ANY objective reports defeat (defend target dead)', () => {
      const player = new Unit('p1', 'Hero', Faction.PLAYER, UnitClass.LORD, stats, 0, 0);
      const npc = new Unit('npc1', 'NPC', Faction.ALLY, UnitClass.SOLDIER, stats, 1, 1);
      npc.takeDamage(999);
      const enemy = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, stats, 2, 2);

      const config: LevelObjectivesConfig = {
        defend: new DefendObjective('npc1', 7),
      };
      const objectives = new LevelObjectives([player, npc, enemy], config);

      const result = objectives.check(3);
      expect(result.defeat).toBe(true);
    });

    it('returns ongoing if all objectives report ongoing', () => {
      const player = new Unit('p1', 'Hero', Faction.PLAYER, UnitClass.LORD, stats, 0, 0);
      const enemy = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, stats, 1, 1);

      const config: LevelObjectivesConfig = {
        seize: new SeizeObjective([{ x: 5, y: 5 }]),
      };
      const objectives = new LevelObjectives([player, enemy], config);

      const result = objectives.check();
      expect(result.ongoing).toBe(true);
    });

    it('returns victory when the escape unit reaches the escape tile', () => {
      const player = new Unit('p1', 'Hero', Faction.PLAYER, UnitClass.LORD, stats, 2, 8);
      const enemy = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, stats, 1, 1);

      const config: LevelObjectivesConfig = {
        escape: new EscapeObjective('p1', [{ x: 2, y: 8 }]),
        routEnabled: false,
      };
      const objectives = new LevelObjectives([player, enemy], config);

      const result = objectives.checkMoveObjective(player);
      expect(result.victory).toBe(true);
      expect(result.message).toBe('Escaped with the secret report!');
    });

    it('returns ongoing when the wrong unit reaches the escape tile', () => {
      const player = new Unit('p1', 'Hero', Faction.PLAYER, UnitClass.LORD, stats, 2, 8);
      const mage = new Unit('p2', 'Mage', Faction.PLAYER, UnitClass.MAGE, stats, 1, 1);
      const enemy = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, stats, 3, 3);

      const config: LevelObjectivesConfig = {
        escape: new EscapeObjective('p1', [{ x: 2, y: 8 }]),
        routEnabled: false,
      };
      const objectives = new LevelObjectives([player, mage, enemy], config);

      const result = objectives.checkMoveObjective(mage);
      expect(result.victory).toBe(false);
      expect(result.ongoing).toBe(true);
    });

    it('does not return defend victory during player phase', () => {
      const player = new Unit('p1', 'Hero', Faction.PLAYER, UnitClass.LORD, stats, 0, 0);
      const npc = new Unit('npc1', 'NPC', Faction.ALLY, UnitClass.SOLDIER, stats, 1, 1);
      const enemy = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, stats, 2, 2);

      const config: LevelObjectivesConfig = {
        defend: new DefendObjective('npc1', 3),
        routEnabled: false,
      };
      const objectives = new LevelObjectives([player, npc, enemy], config);

      // Turn 3, player phase — defend victory should not trigger mid-turn
      const result = objectives.check(3, 'player');
      expect(result.victory).toBe(false);
      expect(result.ongoing).toBe(true);
    });

    it('returns defend victory during enemy phase', () => {
      const player = new Unit('p1', 'Hero', Faction.PLAYER, UnitClass.LORD, stats, 0, 0);
      const npc = new Unit('npc1', 'NPC', Faction.ALLY, UnitClass.SOLDIER, stats, 1, 1);
      const enemy = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, stats, 2, 2);

      const config: LevelObjectivesConfig = {
        defend: new DefendObjective('npc1', 3),
        routEnabled: false,
      };
      const objectives = new LevelObjectives([player, npc, enemy], config);

      const result = objectives.check(3, 'enemy');
      expect(result.victory).toBe(true);
    });

    it('returns victory with defend when surviving required turns (legacy no-phase)', () => {
      const player = new Unit('p1', 'Hero', Faction.PLAYER, UnitClass.LORD, stats, 0, 0);
      const npc = new Unit('npc1', 'NPC', Faction.ALLY, UnitClass.SOLDIER, stats, 1, 1);
      const enemy = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, stats, 2, 2);

      const config: LevelObjectivesConfig = {
        defend: new DefendObjective('npc1', 7),
        routEnabled: false,
      };
      const objectives = new LevelObjectives([player, npc, enemy], config);

      const result = objectives.check(8);
      expect(result.victory).toBe(true);
    });

    it('returns defeat when all allies die with allyMustSurvive', () => {
      const player = new Unit('p1', 'Hero', Faction.PLAYER, UnitClass.LORD, stats, 0, 0);
      const ally = new Unit('a1', 'Ally', Faction.ALLY, UnitClass.SOLDIER, stats, 1, 1);
      ally.takeDamage(999);
      const enemy = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, stats, 2, 2);

      const config: LevelObjectivesConfig = { allyMustSurvive: true };
      const objectives = new LevelObjectives([player, ally, enemy], config);

      const result = objectives.check();
      expect(result.defeat).toBe(true);
      expect(result.victory).toBe(false);
    });

    it('returns victory on rout when allies are alive with allyMustSurvive', () => {
      const player = new Unit('p1', 'Hero', Faction.PLAYER, UnitClass.LORD, stats, 0, 0);
      const ally = new Unit('a1', 'Ally', Faction.ALLY, UnitClass.SOLDIER, stats, 1, 1);
      const enemy = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, stats, 2, 2);
      enemy.takeDamage(999);

      const config: LevelObjectivesConfig = { allyMustSurvive: true };
      const objectives = new LevelObjectives([player, ally, enemy], config);

      const result = objectives.check();
      expect(result.victory).toBe(true);
      expect(result.defeat).toBe(false);
    });
  });
});
