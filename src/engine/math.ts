export const clamp = (value: number, min: number, max: number): number => {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
};

export const lerp = (start: number, end: number, amount: number): number => start + (end - start) * amount;
