import { RandomSource } from './RandomSource';

export class SeededRandom implements RandomSource {
  private value: number;

  constructor(seed: number) {
    this.value = seed >>> 0;
  }

  next(): number {
    this.value += 0x6d2b79f5;
    let t = Math.imul(this.value ^ (this.value >>> 15), 1 | this.value);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  int(maxExclusive: number): number {
    if (maxExclusive <= 0) {
      return 0;
    }
    return Math.floor(this.next() * maxExclusive);
  }
}
