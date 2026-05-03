import { Unit } from '../units/Unit';

export const GamePhase = {
  PLAYER: 'player',
  ENEMY: 'enemy',
  ALLY: 'ally',
} as const;

export type GamePhase = (typeof GamePhase)[keyof typeof GamePhase];

const PHASE_ORDER: GamePhase[] = [GamePhase.PLAYER, GamePhase.ENEMY, GamePhase.ALLY];

export class TurnManager {
  private phase: GamePhase = GamePhase.PLAYER;
  private turn = 1;

  get currentPhase(): GamePhase {
    return this.phase;
  }

  get turnNumber(): number {
    return this.turn;
  }

  advancePhase(units: Unit[] = []): void {
    const idx = PHASE_ORDER.indexOf(this.phase);
    const nextIdx = (idx + 1) % PHASE_ORDER.length;
    if (nextIdx === 0) {
      this.turn++;
    }
    this.phase = PHASE_ORDER[nextIdx];

    for (const unit of units) {
      unit.resetState();
    }
  }

  isPlayerPhase(): boolean {
    return this.phase === GamePhase.PLAYER;
  }

  isEnemyPhase(): boolean {
    return this.phase === GamePhase.ENEMY;
  }

  isAllyPhase(): boolean {
    return this.phase === GamePhase.ALLY;
  }
}
