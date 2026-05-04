export interface StaffData {
  name: string;
  healAmount: number;
  minRange: number;
  maxRange: number;
}

export const STAFF_DB: Record<string, StaffData> = {
  Heal: {
    name: 'Heal',
    healAmount: 10,
    minRange: 1,
    maxRange: 1,
  },
};
