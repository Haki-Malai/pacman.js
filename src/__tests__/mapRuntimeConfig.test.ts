import { describe, expect, it } from 'vitest';
import { resolveMapPathsForVariant, resolveMapVariantFromEnv } from '../game/app/mapRuntimeConfig';

describe('mapRuntimeConfig', () => {
  it('resolves DEMO env to demo map variant', () => {
    expect(resolveMapVariantFromEnv('DEMO')).toBe('demo');
  });

  it('resolves non-DEMO env values to default map variant', () => {
    expect(resolveMapVariantFromEnv(undefined)).toBe('default');
    expect(resolveMapVariantFromEnv('demo')).toBe('default');
    expect(resolveMapVariantFromEnv('PROD')).toBe('default');
  });

  it('resolves runtime paths for default variant', () => {
    expect(resolveMapPathsForVariant('default')).toEqual({
      mapJsonPath: 'assets/mazes/default/maze.json',
      tileBasePath: 'assets/mazes/default',
    });
  });

  it('resolves runtime paths for demo variant', () => {
    expect(resolveMapPathsForVariant('demo')).toEqual({
      mapJsonPath: 'assets/mazes/default/demo.json',
      tileBasePath: 'assets/mazes/default',
    });
  });
});
