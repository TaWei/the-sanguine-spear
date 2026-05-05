import { describe, it, expect } from 'vitest';
import { GameEngine } from '../GameEngine';
import { Faction, UnitClass } from '../units/Unit';
import { createStats } from '../units/Stats';
import { ActionType } from '../state/ActionQueue';
import { AiBehavior } from '../ai/Behavior';
import { AiPersonality } from '../ai/Personality';

describe('GameEngine AI integration', () => {
  it('endTurn builds AI config map from unit fields for enemy phase', () => {
    const engine = new GameEngine(10, 10);

    const playerStats = createStats({ hp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
    engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, playerStats, 6, 5);

    const enemyStats = createStats({ hp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 5 });
    const enemy = engine.addUnit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, enemyStats, 5, 5, {
      aiBehavior: AiBehavior.PURSUE,
      aiPersonality: AiPersonality.AGGRESSIVE,
    });

    expect(enemy.aiBehavior).toBe(AiBehavior.PURSUE);
    expect(enemy.aiPersonality).toBe(AiPersonality.AGGRESSIVE);

    // Default phase is PLAYER; endTurn() advances to ENEMY and generates actions
    const hazardReport = engine.endTurn();
    expect(hazardReport).toBeDefined();

    const actions = engine.getPendingActions();
    expect(actions.length).toBeGreaterThan(0);
    const attackAction = actions.find((a) => a.type === ActionType.ATTACK);
    expect(attackAction).toBeDefined();
    expect(attackAction!.targetX).toBe(6);
    expect(attackAction!.targetY).toBe(5);
  });

  it('ATTACK_IN_RANGE enemy does not pursue during enemy phase', () => {
    const engine = new GameEngine(10, 10);

    const playerStats = createStats({ hp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
    engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, playerStats, 9, 9);

    const enemyStats = createStats({ hp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 2 });
    engine.addUnit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, enemyStats, 0, 0, {
      aiBehavior: AiBehavior.ATTACK_IN_RANGE,
      aiPersonality: AiPersonality.BALANCED,
    });

    engine.turnManager.advancePhase(engine.getLiveUnits());
    // After one advance, phase is ENEMY; endTurn() will advance to ALLY and check
    // Actually we need phase to be PLAYER before endTurn so it advances to ENEMY.
    // Default is PLAYER, so just call endTurn directly.
    engine.turnManager.advancePhase(engine.getLiveUnits());
    engine.turnManager.advancePhase(engine.getLiveUnits());
    // Now back to PLAYER

    engine.endTurn();
    const actions = engine.getPendingActions();
    expect(actions).toHaveLength(0);
  });
});
