import { describe, expect, it } from 'bun:test';

import { clamp } from './clamp.js';

describe('clamp', () => {
  it('clamps to the lower range', () => {
    expect(clamp(-1, /* min= */ 0, /* max= */ 10)).toBe(0);
  });

  it('clamps to the upper range', () => {
    expect(clamp(11, /* min= */ 0, /* max= */ 10)).toBe(10);
  });

  it('returns the input if in range', () => {
    expect(clamp(5, /* min= */ 0, /* max= */ 10)).toBe(5);
  });

  it('works with descending ranges', () => {
    expect(clamp(0, /* min= */ 10, /* max= */ 5)).toBe(5);
    expect(clamp(20, /* min= */ 10, /* max= */ 5)).toBe(10);
  });
});
