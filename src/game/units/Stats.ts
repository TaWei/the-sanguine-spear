export interface UnitStats {
  hp: number;
  maxHp: number;
  str: number;
  mag: number;
  skl: number;
  spd: number;
  luk: number;
  def: number;
  res: number;
  mov: number;
}

export interface UnitStatsInput {
  hp: number;
  maxHp?: number;
  str: number;
  mag: number;
  skl: number;
  spd: number;
  luk: number;
  def: number;
  res: number;
  mov: number;
}

export function createStats(input: UnitStatsInput): UnitStats {
  const maxHp = input.maxHp ?? input.hp;
  return {
    hp: Math.max(0, Math.min(input.hp, maxHp)),
    maxHp,
    str: input.str,
    mag: input.mag,
    skl: input.skl,
    spd: input.spd,
    luk: input.luk,
    def: input.def,
    res: input.res,
    mov: input.mov,
  };
}
