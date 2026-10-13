export function clamp(value: number, min: number, max: number): number {
  if (max < min) {
    [min, max] = [max, min];
  }
  return Math.max(min, Math.min(max, value));
}
