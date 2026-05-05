import type { Item } from '../items/ItemTypes';

export interface ShopItem {
  item: Item;
  price: number;
  stock?: number; // undefined = infinite
}
