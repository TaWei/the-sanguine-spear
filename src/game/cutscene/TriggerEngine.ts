import { CutsceneTrigger, TriggerCondition, TriggerContext } from './CutsceneTrigger';

export class CutsceneTriggerEngine {
  private triggers: CutsceneTrigger[] = [];
  private consumed = new Set<string>();
  private firstCombatOccurred = false;

  register(triggers: CutsceneTrigger[]): void {
    this.triggers = triggers;
  }

  evaluate(ctx: TriggerContext): CutsceneTrigger | null {
    for (const t of this.triggers) {
      if (t.oneShot && this.consumed.has(t.id)) {
        continue;
      }
      if (this.matches(t.condition, ctx)) {
        if (t.oneShot) {
          this.consumed.add(t.id);
        }
        return t;
      }
    }
    return null;
  }

  markFirstCombat(): void {
    this.firstCombatOccurred = true;
  }

  reset(): void {
    this.triggers = [];
    this.consumed.clear();
    this.firstCombatOccurred = false;
  }

  private matches(cond: TriggerCondition, ctx: TriggerContext): boolean {
    if (cond.type !== ctx.eventType) {
      return false;
    }
    switch (cond.type) {
      case 'on_level_start':
        return true;
      case 'on_attack':
        return (
          (!cond.attackerId || cond.attackerId === ctx.attackerId) &&
          (!cond.defenderId || cond.defenderId === ctx.defenderId)
        );
      case 'on_kill':
        return (
          (!cond.killerId || cond.killerId === ctx.killerId) &&
          (!cond.victimId || cond.victimId === ctx.victimId)
        );
      case 'on_death':
        return !cond.unitId || cond.unitId === ctx.unitId;
      case 'on_turn_start':
      case 'on_turn_end':
        return (
          (!cond.faction || cond.faction === ctx.faction) &&
          (!cond.turnNumber || cond.turnNumber === ctx.turnNumber)
        );
      case 'on_first_combat':
        return !this.firstCombatOccurred;
      case 'on_boss_encounter':
        return cond.bossId === ctx.bossId;
    }
  }
}
