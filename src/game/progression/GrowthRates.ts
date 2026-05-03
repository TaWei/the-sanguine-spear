export interface GrowthRates {
  hp: number;
  str: number;
  mag: number;
  skl: number;
  spd: number;
  luk: number;
  def: number;
  res: number;
  mov: number;
}

export function createGrowthRates(partial: Partial<GrowthRates> = {}): GrowthRates {
  const clamp = (n: number) => Math.max(0, Math.min(100, n));
  return {
    hp: clamp(partial.hp ?? 0),
    str: clamp(partial.str ?? 0),
    mag: clamp(partial.mag ?? 0),
    skl: clamp(partial.skl ?? 0),
    spd: clamp(partial.spd ?? 0),
    luk: clamp(partial.luk ?? 0),
    def: clamp(partial.def ?? 0),
    res: clamp(partial.res ?? 0),
    mov: clamp(partial.mov ?? 0),
  };
}
