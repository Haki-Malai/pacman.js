export interface RandomSource {
  next(): number;
  int(maxExclusive: number): number;
}

export function toRandomSource(source: (() => number) | RandomSource): RandomSource {
  if (typeof source === 'function') {
    return {
      next: source,
      int(maxExclusive: number): number {
        if (maxExclusive <= 0) {
          return 0;
        }
        return Math.floor(source() * maxExclusive);
      },
    };
  }
  return source;
}
