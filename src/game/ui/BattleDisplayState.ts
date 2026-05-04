import { CombatLogEntry } from '../combat/Engine';
import { Unit } from '../units/Unit';

export const BattlePhase = {
  INTRO: 'intro',
  ATTACKER_STRIKE: 'attacker_strike',
  DEFENDER_RECOIL: 'defender_recoil',
  DEFENDER_COUNTER: 'defender_counter',
  ATTACKER_RECOIL: 'attacker_recoil',
  DONE: 'done',
} as const;
export type BattlePhase = (typeof BattlePhase)[keyof typeof BattlePhase];

const PHASE_ORDER: BattlePhase[] = [
  BattlePhase.INTRO,
  BattlePhase.ATTACKER_STRIKE,
  BattlePhase.DEFENDER_RECOIL,
  BattlePhase.DEFENDER_COUNTER,
  BattlePhase.ATTACKER_RECOIL,
  BattlePhase.DONE,
];

export class BattleDisplayState {
  readonly attackerInitialHp: number;
  readonly defenderInitialHp: number;
  private log: CombatLogEntry[];
  private index = 0;

  constructor(
    public readonly attacker: Unit,
    public readonly defender: Unit,
    log: CombatLogEntry[],
  ) {
    this.attackerInitialHp = attacker.stats.hp;
    this.defenderInitialHp = defender.stats.hp;
    this.log = log;
  }

  get phase(): BattlePhase {
    return PHASE_ORDER[this.index];
  }

  get currentLogEntry(): CombatLogEntry | null {
    if (this.phase === BattlePhase.ATTACKER_STRIKE || this.phase === BattlePhase.DEFENDER_RECOIL) {
      return this.log[0] ?? null;
    }
    if (this.phase === BattlePhase.DEFENDER_COUNTER || this.phase === BattlePhase.ATTACKER_RECOIL) {
      return this.log[1] ?? null;
    }
    return null;
  }

  canAdvance(): boolean {
    return this.index < PHASE_ORDER.length - 1;
  }

  advance(): void {
    if (!this.canAdvance()) {
      return;
    }

    // Skip counter phases if there is no counterattack log entry
    const next = PHASE_ORDER[this.index + 1];
    if (next === BattlePhase.DEFENDER_COUNTER && this.log.length < 2) {
      this.index = PHASE_ORDER.length - 1; // jump to DONE
      return;
    }

    this.index++;
  }
}
