import { describe, expect, it } from 'vitest';

const modules = import.meta.glob<{ default: Array<{ name: string }> }>('/content/accounts.json', { eager: true });
const accounts = Object.values(modules)[0].default;

describe('勘定科目のマスタ（content/accounts.json）', () => {
	it('科目名が重複していない', () => {
		const names = accounts.map((a) => a.name);
		const dup = names.filter((n, i) => names.indexOf(n) !== i);
		expect(dup).toEqual([]);
	});
});
