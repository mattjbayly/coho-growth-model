/**
 * Generates a random number from a normal distribution using Box-Muller transform.
 */
export function randomNormal(mean: number, sd: number): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * sd + mean;
}

/**
 * Generates a random number from a truncated normal distribution.
 */
export function randomTruncatedNormal(mean: number, sd: number, lower: number = -Infinity, upper: number = Infinity): number {
  let val: number;
  let attempts = 0;
  do {
    val = randomNormal(mean, sd);
    attempts++;
    // Fallback to avoid infinite loop if bounds are extremely tight
    if (attempts > 1000) return Math.max(lower, Math.min(upper, mean));
  } while (val < lower || val > upper);
  return val;
}

/**
 * Generates a random number from a uniform distribution.
 */
export function randomUniform(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * Calculates quantiles for an array of numbers.
 */
export function calculateQuantiles(data: number[], quantiles: number[]): number[] {
  const sorted = [...data].sort((a, b) => a - b);
  return quantiles.map(q => {
    const pos = (sorted.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (sorted[base + 1] !== undefined) {
      return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
    } else {
      return sorted[base];
    }
  });
}

/**
 * Seedable random number generator (simple LCG)
 */
export class Random {
  private seed: number;
  constructor(seed: number) {
    this.seed = seed;
  }
  next() {
    this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
    return this.seed / 4294967296;
  }
}
