export const ITEM_PRICES: Record<string, number> = {
  'Iron Sword': 460,
  'Iron Lance': 360,
  'Iron Axe': 270,
  'Iron Bow': 540,
  Fire: 560,
  'Killer Sword': 1200,
  'Killer Axe': 1000,
  Heal: 600,
  Vulnerary: 300,
  Elixir: 900,
  'Door Key': 50,
  'Chest Key': 150,
  Speedwing: 2500,
  'Goddess Icon': 2500,
  'Master Seal': 2500,
};

export function getSellPrice(itemName: string): number {
  const buy = ITEM_PRICES[itemName];
  if (buy === undefined) return 0;
  return Math.floor(buy / 2);
}
