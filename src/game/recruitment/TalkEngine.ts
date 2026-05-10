import type { Unit } from '../units/Unit';
import { Faction } from '../units/Unit';

export interface TalkConfig {
  recruiterId: string;
  recruitId: string;
  recruitItems?: { name: string }[];
  oneShot: boolean;
}

export class TalkEngine {
  private consumedTalks = new Set<string>();

  canTalk(initiator: Unit, target: Unit, configs: TalkConfig[]): boolean {
    // Find a matching config
    const config = configs.find(
      c => c.recruiterId === initiator.id && c.recruitId === target.id,
    );
    if (!config) return false;

    // Already consumed?
    const key = `${initiator.id}-${target.id}`;
    if (this.consumedTalks.has(key)) return false;

    // Target must be enemy
    if (target.faction !== Faction.ENEMY) return false;

    // Both must be alive
    if (!initiator.isAlive || !target.isAlive) return false;

    return true;
  }

  talk(initiator: Unit, target: Unit, configs: TalkConfig[]): {
    success: boolean;
    reason?: string;
    recruitItems?: { name: string }[];
  } {
    if (!this.canTalk(initiator, target, configs)) {
      return { success: false, reason: 'Cannot talk to this unit' };
    }

    const key = `${initiator.id}-${target.id}`;
    this.consumedTalks.add(key);

    // Recruit the target
    target.setFaction(Faction.PLAYER);

    const config = configs.find(
      c => c.recruiterId === initiator.id && c.recruitId === target.id,
    );

    return {
      success: true,
      recruitItems: config?.recruitItems,
    };
  }

  isConsumed(initiatorId: string, recruitId: string): boolean {
    return this.consumedTalks.has(`${initiatorId}-${recruitId}`);
  }

  getConsumedTalks(): string[] {
    return Array.from(this.consumedTalks);
  }

  loadConsumedTalks(keys: string[]): void {
    this.consumedTalks = new Set(keys);
  }

  reset(): void {
    this.consumedTalks.clear();
  }
}
