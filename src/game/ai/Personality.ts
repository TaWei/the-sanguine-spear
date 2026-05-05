import { CombatScore } from './CombatEvaluator';

export enum AiPersonality {
  /** Prioritizes kills and maximum damage; accepts high risk. FE GBA "boss" behavior. */
  AGGRESSIVE = 'aggressive',
  /** Avoids counterdamage; prefers safe trades. FE GBA archer/mage on fort behavior. */
  CAUTIOUS = 'cautious',
  /** Standard weighting. Most grunts use this. */
  BALANCED = 'balanced',
  /** Suicidal charge; only cares about damage dealt. FE GBA reinforcements. */
  BERSERKER = 'berserker',
}

/**
 * Convert a CombatScore into a single numeric action score based on personality.
 * Higher = better action.
 *
 * Inspired by FE GBA Target Points (TP) system:
 * - Base from damage dealt
 * - Kill bonus
 * - Penalty from expected counter damage / survival risk
 * - Personality modifies the weights
 */
export function scoreAction(combat: CombatScore, personality: AiPersonality): number {
  const weights = PERSONALITY_WEIGHTS[personality];

  let score = 0;

  // Base damage reward
  score += combat.attackerDamage * weights.damageWeight;

  // Kill bonus (massive spike)
  if (combat.canKill) {
    score += weights.killBonus;
  }

  // Net damage bonus (favors trades where we come out ahead)
  score += combat.netDamage * weights.netDamageWeight;

  // Survival penalty (FE GBA TP penalty = 20 - attackerHP, scaled)
  score -= combat.survivalRisk * weights.riskWeight;

  // Ensure score is never negative (matches FE GBA clamping behavior)
  return Math.max(0, score);
}

interface PersonalityWeights {
  damageWeight: number;
  killBonus: number;
  netDamageWeight: number;
  riskWeight: number;
}

const PERSONALITY_WEIGHTS: Record<AiPersonality, PersonalityWeights> = {
  [AiPersonality.AGGRESSIVE]: {
    damageWeight: 1.5,
    killBonus: 80,
    netDamageWeight: 1.0,
    riskWeight: 0.3,
  },
  [AiPersonality.CAUTIOUS]: {
    damageWeight: 1.0,
    killBonus: 30,
    netDamageWeight: 2.0,
    riskWeight: 2.0,
  },
  [AiPersonality.BALANCED]: {
    damageWeight: 1.0,
    killBonus: 50,
    netDamageWeight: 1.0,
    riskWeight: 1.0,
  },
  [AiPersonality.BERSERKER]: {
    damageWeight: 2.0,
    killBonus: 40,
    netDamageWeight: 0,
    riskWeight: 0,
  },
};
