import { describe, it, expect } from 'vitest';
import { scoreAction, AiPersonality } from '../Personality';
import { CombatScore } from '../CombatEvaluator';

describe('Personality scoring', () => {
  const baseScore: CombatScore = {
    attackerDamage: 15,
    counterDamage: 5,
    netDamage: 10,
    canKill: false,
    survivalRisk: 20,
  };

  it('AGGRESSIVE values canKill extremely highly', () => {
    const killScore: CombatScore = { ...baseScore, canKill: true, attackerDamage: 22 };
    const aggressive = scoreAction(killScore, AiPersonality.AGGRESSIVE);
    const balanced = scoreAction(killScore, AiPersonality.BALANCED);
    expect(aggressive).toBeGreaterThan(balanced);
  });

  it('CAUTIOUS penalizes survivalRisk heavily', () => {
    const risky: CombatScore = { ...baseScore, counterDamage: 8, survivalRisk: 22 };
    const cautious = scoreAction(risky, AiPersonality.CAUTIOUS);
    const balanced = scoreAction(risky, AiPersonality.BALANCED);
    expect(cautious).toBeLessThan(balanced);
  });

  it('BERSERKER ignores survivalRisk completely', () => {
    const risky: CombatScore = { ...baseScore, counterDamage: 25, survivalRisk: 100 };
    const berserk = scoreAction(risky, AiPersonality.BERSERKER);
    const safe: CombatScore = { ...baseScore, counterDamage: 0, survivalRisk: 0 };
    const berserkSafe = scoreAction(safe, AiPersonality.BERSERKER);
    // Berserker only cares about damage dealt; both have same attackerDamage
    expect(berserk).toBe(berserkSafe);
  });

  it('BALANCED is the default moderate weighting', () => {
    const score = scoreAction(baseScore, AiPersonality.BALANCED);
    expect(score).toBeGreaterThan(0);
  });

  it('returns higher score for higher netDamage', () => {
    const lowNet: CombatScore = { ...baseScore, netDamage: 2 };
    const highNet: CombatScore = { ...baseScore, netDamage: 18 };
    expect(scoreAction(highNet, AiPersonality.BALANCED))
      .toBeGreaterThan(scoreAction(lowNet, AiPersonality.BALANCED));
  });
});
