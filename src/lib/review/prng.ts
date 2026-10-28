export type Rng = () => number;

/**
 * mulberry32。復習エンジンの決定性（同一 seed → 同一結果）を保証するための、
 * Math.random に依存しない注入可能な擬似乱数生成器。
 */
export function createSeededRng(seed: number): Rng {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) | 0;
		let t = Math.imul(state ^ (state >>> 15), 1 | state);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
