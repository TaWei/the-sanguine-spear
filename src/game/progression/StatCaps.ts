import { UnitStats } from '../units/Stats';

export type StatCaps = Required<
  Pick<UnitStats, 'hp' | 'str' | 'mag' | 'skl' | 'spd' | 'luk' | 'def' | 'res' | 'mov'>
>;

export const CLASS_CAPS: Record<string, StatCaps> = {
  // --- Base classes ---
  lord: { hp: 60, str: 27, mag: 20, skl: 28, spd: 30, luk: 30, def: 22, res: 22, mov: 6 },
  mercenary: { hp: 60, str: 26, mag: 20, skl: 30, spd: 28, luk: 25, def: 24, res: 20, mov: 5 },
  mage: { hp: 55, str: 20, mag: 29, skl: 28, spd: 27, luk: 25, def: 15, res: 28, mov: 5 },
  archer: { hp: 60, str: 25, mag: 20, skl: 30, spd: 29, luk: 25, def: 20, res: 20, mov: 5 },
  cavalry: { hp: 60, str: 28, mag: 20, skl: 27, spd: 26, luk: 25, def: 26, res: 20, mov: 7 },
  pegasus_knight: { hp: 55, str: 24, mag: 22, skl: 28, spd: 32, luk: 30, def: 18, res: 26, mov: 7 },
  soldier: { hp: 60, str: 25, mag: 20, skl: 26, spd: 24, luk: 25, def: 25, res: 22, mov: 5 },
  brigand: { hp: 62, str: 30, mag: 15, skl: 22, spd: 25, luk: 20, def: 20, res: 15, mov: 5 },

  // --- Promoted classes ---
  paladin: { hp: 70, str: 30, mag: 22, skl: 30, spd: 28, luk: 30, def: 28, res: 25, mov: 8 },
  swordmaster: { hp: 65, str: 28, mag: 20, skl: 35, spd: 35, luk: 30, def: 24, res: 22, mov: 6 },
  sage: { hp: 60, str: 22, mag: 32, skl: 30, spd: 28, luk: 28, def: 20, res: 32, mov: 6 },
  sniper: { hp: 65, str: 28, mag: 20, skl: 35, spd: 30, luk: 28, def: 24, res: 22, mov: 6 },
  falcon_knight: { hp: 60, str: 26, mag: 25, skl: 30, spd: 35, luk: 32, def: 22, res: 30, mov: 8 },
  general: { hp: 75, str: 30, mag: 20, skl: 26, spd: 24, luk: 25, def: 35, res: 25, mov: 5 },
  berserker: { hp: 72, str: 35, mag: 18, skl: 26, spd: 28, luk: 22, def: 24, res: 18, mov: 6 },
};
