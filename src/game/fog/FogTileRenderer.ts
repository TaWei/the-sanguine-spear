import { FogOfWar } from './FogOfWar';
import { FogTileState } from './FogTileState';
import { Faction } from '../units/Unit';

export const FOG_ALPHA = {
  VISIBLE: 1.0,
  DIMMED: 0.45,
  UNSEEN: 0.1,
} as const;

export class FogTileRenderer {
  constructor(private fog: FogOfWar) {}

  getTileAlpha(x: number, y: number): number {
    const state = this.fog.getTileState(x, y, Faction.PLAYER);
    switch (state) {
      case FogTileState.VISIBLE:
        return FOG_ALPHA.VISIBLE;
      case FogTileState.DIMMED:
        return FOG_ALPHA.DIMMED;
      case FogTileState.UNSEEN:
        return FOG_ALPHA.UNSEEN;
    }
  }
}
