import { AssetStore } from '../../../engine/assets';
import { WorldMapData } from '../../domain/world/WorldState';
import { parseTiledMap, TiledMap } from './TiledParser';

export class TiledMapRepository {
  private readonly assets = new AssetStore();

  async loadMap(src: string): Promise<WorldMapData> {
    const mapData = await this.assets.loadJSON<TiledMap>('maze', src);
    return parseTiledMap(mapData);
  }
}
