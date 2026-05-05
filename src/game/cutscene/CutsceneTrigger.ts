export type TriggerCondition =
  | { type: 'on_level_start' }
  | { type: 'on_attack'; attackerId?: string; defenderId?: string }
  | { type: 'on_kill'; killerId?: string; victimId?: string }
  | { type: 'on_death'; unitId?: string }
  | { type: 'on_turn_start'; faction?: 'player' | 'enemy' | 'ally'; turnNumber?: number }
  | { type: 'on_turn_end'; faction?: 'player' | 'enemy' | 'ally'; turnNumber?: number }
  | { type: 'on_first_combat' }
  | { type: 'on_boss_encounter'; bossId: string };

export interface CutsceneTrigger {
  id: string;
  cutsceneId: string;
  condition: TriggerCondition;
  oneShot: boolean;
}

export interface TriggerContext {
  eventType: TriggerCondition['type'];
  attackerId?: string;
  defenderId?: string;
  killerId?: string;
  victimId?: string;
  unitId?: string;
  faction?: 'player' | 'enemy' | 'ally';
  turnNumber?: number;
  bossId?: string;
}
