import { UnitStats } from '../units/Stats';

export type StatCaps = Required<
  Pick<UnitStats, 'hp' | 'str' | 'mag' | 'skl' | 'spd' | 'luk' | 'def' | 'res' | 'mov'>
>;

export const CLASS_CAPS: Record<string, StatCaps> = {
  lord: { hp: 60, str: 27, mag: 20, skl: 28, spd: 30, luk: 30, def: 22, res: 22, mov: 6 },
  mercenary: { hp: 60, str: 26, mag: 20, skl: 30, spd: 28, luk: 25, def: 24, res: 20, mov: 5 },
  mage: { hp: 55, str: 20, mag: 29, skl: 28, spd: 27, luk: 25, def: 15, res: 28, mov: 5 },
  archer: { hp: 60, str: 25, mag: 20, skl: 30, spd: 29, luk: 25, def: 20, res: 20, mov: 5 },
  cavalry: { hp: 60, str: 28, mag: 20, skl: 27, spd: 26, luk: 25, def: 26, res: 20, mov: 7 },
  pegasus_knight: { hp: 55, str: 24, mag: 22, skl: 28, spd: 32, luk: 30, def: 18, res: 26, mov: 7 },
  soldier: { hp: 60, str: 25, mag: 20, skl: 26, spd: 24, luk: 25, def: 25, res: 22, mov: 5 },
  brigand: { hp: 62, str: 30, mag: 15, skl: 22, spd: 25, luk: 20, def: 20, res: 15, mov: 5 },
};
