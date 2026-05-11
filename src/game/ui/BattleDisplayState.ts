import { CombatLogEntry } from '../combat/Engine';
import { Unit } from '../units/Unit';

export const BattlePhase = {
  INTRO: 'intro',
  STRIKE: 'strike',
  RECOIL: 'recoil',
  DONE: 'done',
} as const;
export type BattlePhase = (typeof BattlePhase)[keyof typeof BattlePhase];

export class BattleDisplayState {
  readonly attackerInitialHp: number;
  readonly defenderInitialHp: number;
  attackerCurrentHp: number;
  defenderCurrentHp: number;
  private log: CombatLogEntry[];
  private index = 0;
  private appliedEntries = new Set<number>();
  private phases: BattlePhase[];

  constructor(
    public readonly attacker: Unit,
    public readonly defender: Unit,
    log: CombatLogEntry[],
    attackerInitialHp?: number,
    defenderInitialHp?: number,
  ) {
    this.attackerInitialHp = attackerInitialHp ?? attacker.stats.hp;
    this.defenderInitialHp = defenderInitialHp ?? defender.stats.hp;
    this.attackerCurrentHp = this.attackerInitialHp;
    this.defenderCurrentHp = this.defenderInitialHp;
    this.log = log;

    this.phases = [BattlePhase.INTRO];
    for (let i = 0; i < log.length; i++) {
      this.phases.push(BattlePhase.STRIKE);
      this.phases.push(BattlePhase.RECOIL);
    }
    this.phases.push(BattlePhase.DONE);
  }

  applyLogEntry(entry: CombatLogEntry): void {
    const idx = this.log.findIndex((e) => e === entry);
    if (idx < 0 || this.appliedEntries.has(idx)) {
      return;
    }
    this.appliedEntries.add(idx);
    if (!entry.hit) {
      return;
    }
    if (entry.defender.id === this.attacker.id) {
      this.attackerCurrentHp = Math.max(0, this.attackerCurrentHp - entry.damage);
    } else if (entry.defender.id === this.defender.id) {
      this.defenderCurrentHp = Math.max(0, this.defenderCurrentHp - entry.damage);
    }
  }

  get phase(): BattlePhase {
    return this.phases[this.index];
  }

  get currentLogEntry(): CombatLogEntry | null {
    if (this.phase === BattlePhase.STRIKE || this.phase === BattlePhase.RECOIL) {
      const logIndex = Math.floor((this.index - 1) / 2);
      return this.log[logIndex] ?? null;
    }
    return null;
  }

  canAdvance(): boolean {
    return this.index < this.phases.length - 1;
  }

  advance(): void {
    if (!this.canAdvance()) {
      return;
    }
    this.index++;
  }
}
