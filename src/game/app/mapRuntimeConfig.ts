export type MapVariant = 'default' | 'demo';

export interface MapRuntimePaths {
  mapJsonPath: string;
  tileBasePath: string;
}

const DEFAULT_MAP_PATHS: MapRuntimePaths = {
  mapJsonPath: 'assets/mazes/default/maze.json',
  tileBasePath: 'assets/mazes/default',
};

const DEMO_MAP_PATHS: MapRuntimePaths = {
  mapJsonPath: 'assets/mazes/default/demo.json',
  tileBasePath: 'assets/mazes/default',
};

export function resolveMapVariantFromEnv(gameEnv: string | undefined): MapVariant {
  return gameEnv === 'DEMO' ? 'demo' : 'default';
}

export function resolveMapPathsForVariant(mapVariant: MapVariant): MapRuntimePaths {
  if (mapVariant === 'demo') {
    return { ...DEMO_MAP_PATHS };
  }

  return { ...DEFAULT_MAP_PATHS };
}
