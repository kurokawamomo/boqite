import { createSeededRng, type Rng } from '$lib/review/prng';

/** seed から取り出す乱数の道具。生成器の sample はここだけを通して選ぶ */
export function pick<T>(rng: Rng, items: readonly T[]): T {
	return items[Math.floor(rng() * items.length)];
}

/** lo 以上 hi 以下の整数 */
export function intBetween(rng: Rng, lo: number, hi: number): number {
	return lo + Math.floor(rng() * (hi - lo + 1));
}

export function rngFor(seed: number): Rng {
	return createSeededRng(seed);
}
